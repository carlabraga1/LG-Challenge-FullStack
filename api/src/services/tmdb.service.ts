import type { PrismaClient, TmdbCache } from "@prisma/client";

/**
 * Thin TMDB integration. On-demand fetch + persistent cache in SQLite.
 *
 * Never throws for TMDB-side problems — a missing key, an offline network, a
 * rate-limit, or a 404 all collapse into "returns null and the caller shows
 * whatever we already have." The MovieLens dataset must remain browsable
 * even with TMDB completely disabled.
 */

const TMDB_BASE = "https://api.themoviedb.org/3";
const REQUEST_TIMEOUT_MS = 8_000;

interface TmdbCredits {
  cast?: Array<{ name: string; character: string; profile_path: string | null; order: number }>;
  crew?: Array<{ job: string; name: string }>;
}
interface TmdbVideos {
  results?: Array<{ site: string; type: string; key: string; official: boolean }>;
}
interface TmdbMovieResponse {
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string | null;
  runtime?: number | null;
  original_language?: string | null;
  popularity?: number | null;
  credits?: TmdbCredits;
  videos?: TmdbVideos;
}

function readAuth(): { header: string; queryKey?: string } | null {
  const bearer = process.env.TMDB_BEARER_TOKEN?.trim();
  if (bearer) return { header: `Bearer ${bearer}` };
  const key = process.env.TMDB_API_KEY?.trim();
  if (key) return { header: "", queryKey: key };
  return null;
}

export function isTmdbConfigured(): boolean {
  return readAuth() !== null;
}

export class TmdbService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Warm the cache for the given movie IDs in parallel with a concurrency
   * limit. Used on boot to pre-enrich popular titles so the Discover page
   * shows posters instantly, and fired fire-and-forget from list endpoints
   * so anything the user browses becomes cached for the next visit.
   *
   * Never throws. Individual failures are silent — `enrich` already handles
   * the null-on-error path.
   */
  async warmCache(movieIds: number[], concurrency = 4): Promise<{ enriched: number; skipped: number }> {
    if (!isTmdbConfigured() || movieIds.length === 0) {
      return { enriched: 0, skipped: 0 };
    }

    // Only touch IDs not already in cache — reading first is cheap and keeps
    // us polite to TMDB on repeated warm-up runs.
    const cached = new Set(
      (await this.prisma.tmdbCache.findMany({
        where: { movieId: { in: movieIds } },
        select: { movieId: true },
      })).map((r) => r.movieId),
    );
    const todo = movieIds.filter((id) => !cached.has(id));
    if (todo.length === 0) return { enriched: 0, skipped: movieIds.length };

    let enriched = 0;
    const queue = todo.slice();
    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length > 0) {
        const id = queue.shift()!;
        const result = await this.enrich(id);
        if (result) enriched++;
      }
    });
    await Promise.all(workers);
    return { enriched, skipped: cached.size };
  }

  /**
   * Returns the cached row if we already have it, otherwise fetches from
   * TMDB, persists, and returns. Returns null if TMDB is disabled or the
   * fetch fails.
   */
  async enrich(movieId: number): Promise<TmdbCache | null> {
    const cached = await this.prisma.tmdbCache.findUnique({ where: { movieId } });
    if (cached) return cached;

    const auth = readAuth();
    if (!auth) return null;

    const movie = await this.prisma.movie.findUnique({
      where: { id: movieId },
      select: { tmdbId: true },
    });
    if (!movie?.tmdbId) return null;

    const data = await this.fetchMovie(movie.tmdbId, auth);
    if (!data) return null;

    const director = data.credits?.crew?.find((c) => c.job === "Director")?.name ?? null;
    const cast = (data.credits?.cast ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .slice(0, 10)
      .map((c) => ({ name: c.name, character: c.character, profilePath: c.profile_path }));
    const trailerKey = pickTrailerKey(data.videos?.results ?? []);

    return this.prisma.tmdbCache.upsert({
      where: { movieId },
      create: {
        movieId,
        posterPath: data.poster_path ?? null,
        backdropPath: data.backdrop_path ?? null,
        overview: data.overview ?? null,
        runtimeMinutes: data.runtime ?? null,
        originalLanguage: data.original_language ?? null,
        tmdbPopularity: data.popularity ?? null,
        director,
        castJson: JSON.stringify(cast),
        trailerKey,
      },
      // Full upsert semantics — if we ever add a "refresh" endpoint, the same
      // path re-populates every field.
      update: {
        posterPath: data.poster_path ?? null,
        backdropPath: data.backdrop_path ?? null,
        overview: data.overview ?? null,
        runtimeMinutes: data.runtime ?? null,
        originalLanguage: data.original_language ?? null,
        tmdbPopularity: data.popularity ?? null,
        director,
        castJson: JSON.stringify(cast),
        trailerKey,
        fetchedAt: new Date(),
      },
    });
  }

  private async fetchMovie(
    tmdbId: string,
    auth: { header: string; queryKey?: string },
  ): Promise<TmdbMovieResponse | null> {
    const url = new URL(`${TMDB_BASE}/movie/${tmdbId}`);
    url.searchParams.set("append_to_response", "credits,videos");
    if (auth.queryKey) url.searchParams.set("api_key", auth.queryKey);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: auth.header ? { Authorization: auth.header } : {},
      });
      if (!res.ok) return null;
      return (await res.json()) as TmdbMovieResponse;
    } catch {
      // Timeout, network error, JSON parse error — swallow, log context.
      // We deliberately don't surface these to the client. A background
      // job could add retries; on-demand path stays snappy.
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

function pickTrailerKey(videos: NonNullable<TmdbVideos["results"]>): string | null {
  // Preference order: official YouTube trailer → any YouTube trailer →
  // any YouTube teaser → any YouTube video. TMDB commonly returns dozens;
  // we only surface one to keep the details page clean.
  const yt = videos.filter((v) => v.site === "YouTube");
  return (
    yt.find((v) => v.type === "Trailer" && v.official)?.key ??
    yt.find((v) => v.type === "Trailer")?.key ??
    yt.find((v) => v.type === "Teaser")?.key ??
    yt[0]?.key ??
    null
  );
}
