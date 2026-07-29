/**
 * IMPORTANT: this block runs BEFORE PrismaClient is imported below, so the
 * value takes effect when the client picks up DATABASE_URL from process.env.
 * vitest's `test.env` config does NOT apply to globalSetup, only to test
 * files — hence the explicit assignment here.
 */
process.env.DATABASE_URL = "file:./test.db";

import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, "..", "prisma", "test.db");
const MIGRATIONS_DIR = resolve(__dirname, "..", "prisma", "migrations");

function migrationSqlFiles(): string[] {
  // Migrations are prefixed with a sortable timestamp — reading in name order
  // reproduces the intended apply sequence.
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name !== "migration_lock.toml")
    .sort()
    .map((name) => resolve(MIGRATIONS_DIR, name, "migration.sql"));
}

/**
 * Global test bootstrap:
 *  1. Delete any leftover test.db so each run starts fresh.
 *  2. Apply the init migration by running the SQL statements against a fresh
 *     Prisma connection. No `prisma` CLI spawn — keeps the loop fast.
 *  3. Seed a fixed 5-movie fixture with hand-picked stats so the popularity
 *     heuristic has a distinguishable answer from the raw-avg ranking.
 */
export default async function setup() {
  if (existsSync(DB_PATH)) rmSync(DB_PATH);
  if (existsSync(`${DB_PATH}-journal`)) rmSync(`${DB_PATH}-journal`);

  const prisma = new PrismaClient();
  try {
    for (const file of migrationSqlFiles()) {
      const sql = readFileSync(file, "utf8");
      for (const stmt of sql.split(";").map((s) => s.trim()).filter(Boolean)) {
        await prisma.$executeRawUnsafe(stmt);
      }
    }
    await seed(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

async function seed(prisma: PrismaClient) {
  const genreNames = ["Action", "Adventure", "Animation", "Crime", "Drama", "Sci-Fi"];
  await prisma.genre.createMany({ data: genreNames.map((name) => ({ name })) });
  const genreIds = new Map(
    (await prisma.genre.findMany()).map((g) => [g.name, g.id]),
  );

  const movies = [
    {
      id: 1, title: "Toy Story", originalTitle: "Toy Story (1995)", year: 1995,
      genres: ["Adventure", "Animation"],
      stats: { numRatings: 250, avgRating: 4.2 },
    },
    {
      id: 2, title: "Jumanji", originalTitle: "Jumanji (1995)", year: 1995,
      genres: ["Adventure"],
      stats: { numRatings: 100, avgRating: 3.5 },
    },
    {
      id: 3, title: "Heat", originalTitle: "Heat (1995)", year: 1995,
      genres: ["Action", "Crime"],
      stats: { numRatings: 120, avgRating: 4.0 },
    },
    {
      id: 4, title: "Pulp Fiction", originalTitle: "Pulp Fiction (1994)", year: 1994,
      genres: ["Crime", "Drama"],
      stats: { numRatings: 300, avgRating: 4.5 },
    },
    {
      id: 5, title: "Star Wars", originalTitle: "Star Wars (1977)", year: 1977,
      genres: ["Action", "Adventure", "Sci-Fi"],
      // Perfect score but only 2 votes — should top /movies/top but be
      // dragged toward the mean by /movies/popular.
      stats: { numRatings: 2, avgRating: 5.0 },
    },
  ];

  await prisma.movie.createMany({
    data: movies.map((m) => ({
      id: m.id, title: m.title, originalTitle: m.originalTitle, year: m.year,
      // ImdbId matters for the imdbUrl derivation; tmdbId matters for the
      // enrichment path. We only need enough for the assertions in tests.
      imdbId: `tt0000${m.id.toString().padStart(3, "0")}`,
      tmdbId: `${1000 + m.id}`,
    })),
  });

  await prisma.movieGenre.createMany({
    data: movies.flatMap((m) =>
      m.genres.map((name) => ({ movieId: m.id, genreId: genreIds.get(name)! })),
    ),
  });

  const meanVote =
    movies.reduce((s, m) => s + m.stats.avgRating, 0) / movies.length;
  const sortedCounts = movies.map((m) => m.stats.numRatings).sort((a, b) => a - b);
  const minVotes = sortedCounts[Math.floor(0.75 * sortedCounts.length)]!;

  await prisma.movieStats.createMany({
    data: movies.map((m) => {
      const v = m.stats.numRatings;
      const R = m.stats.avgRating;
      const wr = (v / (v + minVotes)) * R + (minVotes / (v + minVotes)) * meanVote;
      return {
        movieId: m.id,
        numRatings: v,
        avgRating: R,
        weightedRating: wr,
      };
    }),
  });

  // Seed one TMDB cache row so we can test the "already enriched" path in
  // GET /movies/:id without touching the network.
  await prisma.tmdbCache.create({
    data: {
      movieId: 4, // Pulp Fiction
      posterPath: "/pulp-poster.jpg",
      backdropPath: "/pulp-backdrop.jpg",
      overview: "A pair of hitmen, a boxer and a couple of robbers.",
      runtimeMinutes: 154,
      originalLanguage: "en",
      tmdbPopularity: 32.1,
      director: "Quentin Tarantino",
      castJson: JSON.stringify([
        { name: "John Travolta", character: "Vincent Vega", profilePath: "/jt.jpg" },
        { name: "Uma Thurman", character: "Mia Wallace", profilePath: "/ut.jpg" },
      ]),
      trailerKey: "s7EdQ4FqbhY",
    },
  });
}
