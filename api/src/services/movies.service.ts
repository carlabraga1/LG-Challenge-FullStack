import type { PrismaClient, TmdbCache } from "@prisma/client";
import { TmdbService, isTmdbConfigured } from "./tmdb.service.js";
import { backdropUrl, posterUrl, profileUrl, trailerUrl } from "./tmdb.image.js";

/**
 * All movie queries live here so routes stay thin (parse-validate-respond).
 * Prisma is injected — this makes the service trivially testable against an
 * in-memory SQLite without spinning up Fastify.
 */

export interface CastMember {
  name: string;
  character: string;
  profileUrl: string | null;
}

export interface MovieDto {
  id: number;
  title: string;
  originalTitle: string;
  year: number | null;
  genres: string[];
  imdbId: string | null;
  imdbUrl: string | null;
  tmdbId: string | null;
  posterUrl: string | null; // small poster (w342) — populated when TMDB cache exists
  stats: {
    numRatings: number;
    avgRating: number;
    weightedRating: number;
  } | null;
}

export interface MovieDetailsDto extends MovieDto {
  tmdb: {
    posterUrl: string | null; // large poster (w500)
    backdropUrl: string | null;
    overview: string | null;
    runtimeMinutes: number | null;
    originalLanguage: string | null;
    tmdbPopularity: number | null;
    director: string | null;
    cast: CastMember[];
    trailerUrl: string | null;
    fetchedAt: string;
  } | null;
}

export interface Paginated<T> {
  total: number;
  limit: number;
  offset: number;
  items: T[];
}

export interface StatsDto {
  totalMovies: number;
  totalGenres: number;
  totalRatings: number;
  moviesWithRatings: number;
  moviesEnrichedByTmdb: number;
  yearRange: { min: number | null; max: number | null };
  averageRating: number | null;
}

type MovieWithRelations = {
  id: number;
  title: string;
  originalTitle: string;
  year: number | null;
  imdbId: string | null;
  tmdbId: string | null;
  genres: { genre: { name: string } }[];
  stats: {
    numRatings: number;
    avgRating: number;
    weightedRating: number;
  } | null;
  tmdb: TmdbCache | null;
};

const INCLUDE = {
  genres: { include: { genre: true } },
  stats: true,
  tmdb: true,
} as const;

function toDto(m: MovieWithRelations): MovieDto {
  return {
    id: m.id,
    title: m.title,
    originalTitle: m.originalTitle,
    year: m.year,
    genres: m.genres.map((g) => g.genre.name).sort(),
    imdbId: m.imdbId,
    imdbUrl: m.imdbId ? `https://www.imdb.com/title/${m.imdbId}/` : null,
    tmdbId: m.tmdbId,
    posterUrl: posterUrl(m.tmdb?.posterPath, "w342"),
    stats: m.stats,
  };
}

function toDetailsDto(m: MovieWithRelations): MovieDetailsDto {
  const base = toDto(m);
  if (!m.tmdb) return { ...base, tmdb: null };
  const cast: CastMember[] = m.tmdb.castJson
    ? (JSON.parse(m.tmdb.castJson) as Array<{
        name: string;
        character: string;
        profilePath: string | null;
      }>).map((c) => ({
        name: c.name,
        character: c.character,
        profileUrl: profileUrl(c.profilePath),
      }))
    : [];
  return {
    ...base,
    tmdb: {
      posterUrl: posterUrl(m.tmdb.posterPath, "w500"),
      backdropUrl: backdropUrl(m.tmdb.backdropPath, "w1280"),
      overview: m.tmdb.overview,
      runtimeMinutes: m.tmdb.runtimeMinutes,
      originalLanguage: m.tmdb.originalLanguage,
      tmdbPopularity: m.tmdb.tmdbPopularity,
      director: m.tmdb.director,
      cast,
      trailerUrl: trailerUrl(m.tmdb.trailerKey),
      fetchedAt: m.tmdb.fetchedAt.toISOString(),
    },
  };
}

/**
 * How long a list request will wait for TMDB before answering with whatever
 * artwork has landed. Anything still in flight keeps going and lands in the
 * cache for the next request.
 */
const POSTER_WARM_BUDGET_MS = 4_000;

export class MovieService {
  private readonly tmdb: TmdbService;

  constructor(private readonly prisma: PrismaClient) {
    this.tmdb = new TmdbService(prisma);
  }

  /**
   * Maps rows to DTOs, filling in posters that aren't cached yet.
   *
   * Enrichment is on-demand, so any list the user hasn't opened before has no
   * cached artwork. Warming it fire-and-forget only helps the *next* request,
   * which reads to the user as "the images never load" — the search and browse
   * grids showed placeholders for every result. So we wait, but only up to a
   * budget: a slow or unreachable TMDB degrades to placeholders instead of
   * hanging the response.
   *
   * No-ops when TMDB is disabled or every row is already cached, which is the
   * common case once a page has been visited.
   */
  private async toDtosWithPosters(rows: MovieWithRelations[]): Promise<MovieDto[]> {
    const missing = rows.filter((r) => !r.tmdb).map((r) => r.id);
    if (!isTmdbConfigured() || missing.length === 0) return rows.map(toDto);

    let timer: NodeJS.Timeout | undefined;
    await Promise.race([
      this.tmdb.warmCache(missing),
      new Promise((resolve) => {
        timer = setTimeout(resolve, POSTER_WARM_BUDGET_MS);
      }),
    ]).finally(() => {
      if (timer) clearTimeout(timer);
    });

    const fetched = await this.prisma.tmdbCache.findMany({
      where: { movieId: { in: missing } },
    });
    const byId = new Map(fetched.map((c) => [c.movieId, c]));

    return rows.map((row) => (row.tmdb ? toDto(row) : toDto({ ...row, tmdb: byId.get(row.id) ?? null })));
  }

  async getById(id: number): Promise<MovieDetailsDto | null> {
    // Trigger enrichment on demand. `enrich` no-ops if already cached or
    // TMDB is disabled, so this is safe and cheap on cache hits.
    await this.tmdb.enrich(id);

    const movie = await this.prisma.movie.findUnique({
      where: { id },
      include: INCLUDE,
    });
    return movie ? toDetailsDto(movie) : null;
  }

  async searchByTitle(
    title: string,
    limit: number,
    offset: number,
  ): Promise<Paginated<MovieDto>> {
    // SQLite LIKE is case-insensitive for ASCII by default, which covers the
    // vast majority of MovieLens titles. `contains` maps to `LIKE %x%`.
    const where = { title: { contains: title } };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.movie.count({ where }),
      this.prisma.movie.findMany({
        where,
        include: INCLUDE,
        orderBy: [{ year: "desc" }, { title: "asc" }],
        take: limit,
        skip: offset,
      }),
    ]);
    return { total, limit, offset, items: await this.toDtosWithPosters(rows) };
  }

  async searchByYearAndGenre(
    year: number | null,
    genre: string | null,
    limit: number,
    offset: number,
  ): Promise<Paginated<MovieDto>> {
    // Both filters are optional so the UI can browse by genre alone, by year
    // alone, or by both. Supplying neither lists the whole catalog by title.
    let genreFilter = {};
    if (genre !== null) {
      // Prisma+SQLite has no `mode: "insensitive"`, so we resolve the genre id
      // up-front with a case-insensitive raw query, then filter movies by that
      // id via the indexed join. MovieLens uses a fixed genre vocabulary
      // (~20 rows), so this lookup is negligible.
      const g = await this.findGenreCaseInsensitive(genre);
      if (!g) return { total: 0, limit, offset, items: [] };
      genreFilter = { genres: { some: { genreId: g.id } } };
    }

    const where = {
      ...(year === null ? {} : { year }),
      ...genreFilter,
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.movie.count({ where }),
      this.prisma.movie.findMany({
        where,
        include: INCLUDE,
        orderBy: [{ title: "asc" }],
        take: limit,
        skip: offset,
      }),
    ]);
    return { total, limit, offset, items: await this.toDtosWithPosters(rows) };
  }

  async topRated(k: number): Promise<MovieDto[]> {
    // "Best" ordered by raw average would surface 5-star flukes with 1 vote.
    // The bonus asks about exactly that behavior — this endpoint keeps the
    // naive interpretation, /popular exposes the weighted one.
    const rows = await this.prisma.movie.findMany({
      where: { stats: { isNot: null } },
      include: INCLUDE,
      orderBy: [
        { stats: { avgRating: "desc" } },
        { stats: { numRatings: "desc" } },
        { title: "asc" },
      ],
      take: k,
    });
    return this.toDtosWithPosters(rows);
  }

  async popular(k: number): Promise<MovieDto[]> {
    const rows = await this.prisma.movie.findMany({
      where: { stats: { isNot: null } },
      include: INCLUDE,
      orderBy: [
        { stats: { weightedRating: "desc" } },
        { stats: { numRatings: "desc" } },
      ],
      take: k,
    });
    return this.toDtosWithPosters(rows);
  }

  /**
   * List the top-N popular movie IDs. Used by the boot-time warm-up so the
   * Discover page shows posters on first visit.
   */
  async popularIds(n: number): Promise<number[]> {
    const rows = await this.prisma.movie.findMany({
      where: { stats: { isNot: null } },
      select: { id: true },
      orderBy: [{ stats: { weightedRating: "desc" } }],
      take: n,
    });
    return rows.map((r) => r.id);
  }

  async warmTmdbCache(ids: number[]) {
    return this.tmdb.warmCache(ids);
  }

  async listGenres(): Promise<string[]> {
    const rows = await this.prisma.genre.findMany({ orderBy: { name: "asc" } });
    return rows.map((r) => r.name);
  }

  async stats(): Promise<StatsDto> {
    const [totalMovies, totalGenres, moviesWithRatings, moviesEnrichedByTmdb, yearAgg, ratingAgg, ratingsSum] =
      await this.prisma.$transaction([
        this.prisma.movie.count(),
        this.prisma.genre.count(),
        this.prisma.movieStats.count(),
        this.prisma.tmdbCache.count(),
        this.prisma.movie.aggregate({ _min: { year: true }, _max: { year: true } }),
        this.prisma.movieStats.aggregate({ _avg: { avgRating: true } }),
        this.prisma.movieStats.aggregate({ _sum: { numRatings: true } }),
      ]);
    return {
      totalMovies,
      totalGenres,
      totalRatings: ratingsSum._sum.numRatings ?? 0,
      moviesWithRatings,
      moviesEnrichedByTmdb,
      yearRange: { min: yearAgg._min.year, max: yearAgg._max.year },
      averageRating: ratingAgg._avg.avgRating,
    };
  }

  private async findGenreCaseInsensitive(name: string) {
    const rows = await this.prisma.$queryRawUnsafe<{ id: number; name: string }[]>(
      `SELECT id, name FROM "Genre" WHERE LOWER(name) = LOWER(?) LIMIT 1`,
      name,
    );
    return rows[0] ?? null;
  }
}
