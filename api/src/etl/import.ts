/**
 * ETL: MovieLens CSVs -> SQLite (via Prisma).
 *
 * Idempotent — if the DB already has movies, exits without doing work.
 * Called on API cold start by the Docker entrypoint, and can be run manually
 * via `npm run etl` during development.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";
import { readCsvRows } from "./csv.js";
import { parseTitle } from "./title.js";
import { percentile, weightedRating } from "./popularity.js";

const DATASET_DIR = resolve(
  process.env.DATASET_DIR ?? "../data/ml-latest-small",
);

const prisma = new PrismaClient();

// Batch size for createMany. SQLite has a bind-var limit (~999 by default);
// keep batches comfortably below that when multiplied by fields per row.
const BATCH = 500;

async function chunked<T>(items: T[], size: number, fn: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += size) {
    await fn(items.slice(i, i + size));
  }
}

async function loadMovies() {
  const path = resolve(DATASET_DIR, "movies.csv");
  if (!existsSync(path)) throw new Error(`movies.csv not found at ${path}`);

  const movies: Array<{
    id: number;
    title: string;
    originalTitle: string;
    year: number | null;
  }> = [];
  const genresSet = new Set<string>();
  const movieGenres: Array<{ movieId: number; genreName: string }> = [];

  for await (const row of readCsvRows(path)) {
    const id = Number(row["movieId"]);
    const rawTitle = row["title"] ?? "";
    const { clean, year } = parseTitle(rawTitle);
    movies.push({ id, title: clean, originalTitle: rawTitle, year });

    const genreField = row["genres"] ?? "";
    if (genreField && genreField !== "(no genres listed)") {
      for (const g of genreField.split("|")) {
        const name = g.trim();
        if (!name) continue;
        genresSet.add(name);
        movieGenres.push({ movieId: id, genreName: name });
      }
    }
  }

  console.log(`[etl] parsed ${movies.length} movies, ${genresSet.size} genres`);

  await chunked(movies, BATCH, (chunk) =>
    prisma.movie.createMany({ data: chunk }),
  );

  const genreRows = [...genresSet].map((name) => ({ name }));
  await prisma.genre.createMany({ data: genreRows });

  const allGenres = await prisma.genre.findMany();
  const genreIdByName = new Map(allGenres.map((g) => [g.name, g.id]));

  const links = movieGenres.map((mg) => ({
    movieId: mg.movieId,
    genreId: genreIdByName.get(mg.genreName)!,
  }));
  await chunked(links, BATCH, (chunk) =>
    prisma.movieGenre.createMany({ data: chunk }),
  );

  console.log(`[etl] inserted ${links.length} movie-genre links`);
}

async function loadLinks() {
  const path = resolve(DATASET_DIR, "links.csv");
  if (!existsSync(path)) {
    console.log("[etl] links.csv not found, skipping");
    return;
  }

  // Small enough to hold in memory and update in bulk.
  const updates: Array<{ id: number; imdbId: string | null; tmdbId: string | null }> = [];
  for await (const row of readCsvRows(path)) {
    updates.push({
      id: Number(row["movieId"]),
      imdbId: row["imdbId"] ? `tt${row["imdbId"]}` : null,
      tmdbId: row["tmdbId"] || null,
    });
  }

  // Prisma has no bulk-update. For 9k rows we transact one-by-one — takes
  // <2s on SQLite because everything is a single fsync at commit time.
  await prisma.$transaction(
    updates.map((u) =>
      prisma.movie.update({
        where: { id: u.id },
        data: { imdbId: u.imdbId, tmdbId: u.tmdbId },
      }),
    ),
  );
  console.log(`[etl] enriched ${updates.length} movies with links`);
}

async function loadRatingsAndStats() {
  const path = resolve(DATASET_DIR, "ratings.csv");
  if (!existsSync(path)) throw new Error(`ratings.csv not found at ${path}`);

  // Stream to keep memory flat regardless of dataset size.
  const counts = new Map<number, number>();
  const sums = new Map<number, number>();

  for await (const row of readCsvRows(path)) {
    const movieId = Number(row["movieId"]);
    const rating = Number(row["rating"]);
    counts.set(movieId, (counts.get(movieId) ?? 0) + 1);
    sums.set(movieId, (sums.get(movieId) ?? 0) + rating);
  }

  const stats = [...counts.entries()].map(([movieId, count]) => {
    const avg = sums.get(movieId)! / count;
    return { movieId, numRatings: count, avgRating: avg };
  });

  // Popularity params — computed from the actual distribution so the
  // heuristic self-tunes to whatever dataset the ETL was pointed at.
  const meanVote =
    stats.reduce((s, m) => s + m.avgRating, 0) / (stats.length || 1);
  const sortedCounts = stats.map((s) => s.numRatings).sort((a, b) => a - b);
  const minVotes = percentile(sortedCounts, 0.75);
  console.log(
    `[etl] popularity params — meanVote (C)=${meanVote.toFixed(3)}, ` +
      `minVotes (m)=${minVotes} (75th percentile of rating counts)`,
  );

  const withWr = stats.map((s) => ({
    ...s,
    weightedRating: weightedRating(s.numRatings, s.avgRating, { meanVote, minVotes }),
  }));

  await chunked(withWr, BATCH, (chunk) =>
    prisma.movieStats.createMany({ data: chunk }),
  );
  console.log(`[etl] inserted ${withWr.length} MovieStats rows`);
}

export async function runEtl(): Promise<{ loaded: boolean; movies: number }> {
  // Check for stats too — a previous interrupted run may have loaded movies
  // but bailed before writing MovieStats. Treat that as "not done".
  const [movieCount, statsCount] = await Promise.all([
    prisma.movie.count(),
    prisma.movieStats.count(),
  ]);
  if (movieCount > 0 && statsCount > 0) {
    console.log(
      `[etl] DB already has ${movieCount} movies and ${statsCount} stats — skipping`,
    );
    return { loaded: false, movies: movieCount };
  }
  if (movieCount > 0 && statsCount === 0) {
    console.log(
      `[etl] DB has ${movieCount} movies but no stats — likely a partial load. Wiping and reloading.`,
    );
    // Deleting movies cascades to genres-join and stats via FK.
    await prisma.$transaction([
      prisma.movieStats.deleteMany(),
      prisma.movieGenre.deleteMany(),
      prisma.movie.deleteMany(),
      prisma.genre.deleteMany(),
    ]);
  }

  console.log(`[etl] loading MovieLens data from ${DATASET_DIR}`);
  const start = Date.now();
  await loadMovies();
  await loadLinks();
  await loadRatingsAndStats();
  const total = await prisma.movie.count();
  console.log(`[etl] done in ${Date.now() - start}ms — ${total} movies`);
  return { loaded: true, movies: total };
}

// When executed directly (`npm run etl`), run and exit. Skipped when
// imported by server.ts. `pathToFileURL` normalizes across POSIX/Windows —
// hand-rolling the comparison drops the third slash on Windows and misfires.
const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  runEtl()
    .catch((err) => {
      console.error("[etl] failed:", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
