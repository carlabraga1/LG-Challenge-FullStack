import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";

// TMDB must be explicitly disabled — if the developer running the tests
// happens to have TMDB_API_KEY exported in their shell, we'd otherwise hit
// the real network from a test.
delete process.env.TMDB_API_KEY;
delete process.env.TMDB_BEARER_TOKEN;

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

async function get(url: string) {
  const res = await app.inject({ method: "GET", url });
  return { status: res.statusCode, body: res.json() as Record<string, unknown> };
}

describe("GET /health", () => {
  it("returns ok", async () => {
    const { status, body } = await get("/health");
    expect(status).toBe(200);
    expect(body).toEqual({ status: "ok" });
  });
});

describe("GET /movies/by-title", () => {
  it("finds movies containing the substring (case-insensitive)", async () => {
    const { status, body } = await get("/movies/by-title?title=star");
    expect(status).toBe(200);
    const items = body.items as Array<{ title: string }>;
    expect(items.map((m) => m.title)).toEqual(["Star Wars"]);
    expect(body.total).toBe(1);
  });

  it("returns empty when nothing matches", async () => {
    const { body } = await get("/movies/by-title?title=xyzzynomatch");
    expect(body.total).toBe(0);
    expect(body.items).toEqual([]);
  });

  it("rejects missing title with 400", async () => {
    const { status } = await get("/movies/by-title");
    expect(status).toBe(400);
  });

  it("respects limit and offset", async () => {
    // "j" hits "Jumanji"; "toy" hits "Toy Story". Use a broader term.
    const { body } = await get("/movies/by-title?title=e&limit=1&offset=0");
    expect((body.items as unknown[]).length).toBe(1);
    expect(body.limit).toBe(1);
  });
});

describe("GET /movies/by-year-genre", () => {
  it("filters by exact year and genre (case-insensitive)", async () => {
    const { status, body } = await get(
      "/movies/by-year-genre?year=1995&genre=adventure",
    );
    expect(status).toBe(200);
    const titles = (body.items as Array<{ title: string }>).map((m) => m.title);
    expect(titles.sort()).toEqual(["Jumanji", "Toy Story"]);
  });

  it("returns empty for unknown genre", async () => {
    const { body } = await get("/movies/by-year-genre?year=1995&genre=Nonsense");
    expect(body.total).toBe(0);
  });

  it("returns empty for year with no matches", async () => {
    // Year is inside the accepted range but no fixture movie has it.
    const { body } = await get("/movies/by-year-genre?year=2030&genre=Drama");
    expect(body.total).toBe(0);
  });

  it("browses a whole genre when year is omitted", async () => {
    // Adventure spans 1995 (Toy Story, Jumanji) and 1977 (Star Wars), so a
    // genre-only query must reach across years.
    const { status, body } = await get("/movies/by-year-genre?genre=Adventure");
    expect(status).toBe(200);
    const titles = (body.items as Array<{ title: string }>).map((m) => m.title);
    expect(titles.sort()).toEqual(["Jumanji", "Star Wars", "Toy Story"]);
  });

  it("browses a whole year when genre is omitted", async () => {
    const { status, body } = await get("/movies/by-year-genre?year=1995");
    expect(status).toBe(200);
    const titles = (body.items as Array<{ title: string }>).map((m) => m.title);
    expect(titles.sort()).toEqual(["Heat", "Jumanji", "Toy Story"]);
  });

  it("lists the whole catalog when neither filter is given", async () => {
    const { status, body } = await get("/movies/by-year-genre");
    expect(status).toBe(200);
    expect(body.total).toBe(5);
  });

  it("still rejects a malformed year", async () => {
    const { status } = await get("/movies/by-year-genre?genre=Action&year=abc");
    expect(status).toBe(400);
  });
});

describe("GET /movies/top", () => {
  it("returns k movies ordered by raw avg rating", async () => {
    const { status, body } = await get("/movies/top?k=3");
    expect(status).toBe(200);
    const items = body as unknown as Array<{ title: string; stats: { avgRating: number } }>;
    expect(items.length).toBe(3);
    // Star Wars has 5.0 avg — should top a naive ranking.
    expect(items[0]!.title).toBe("Star Wars");
    // Descending order.
    const ratings = items.map((m) => m.stats.avgRating);
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
  });

  it("rejects k=0 with 400", async () => {
    const { status } = await get("/movies/top?k=0");
    expect(status).toBe(400);
  });
});

describe("GET /movies/popular", () => {
  it("penalizes low-vote outliers via the Bayesian score", async () => {
    const { status, body } = await get("/movies/popular?k=5");
    expect(status).toBe(200);
    const items = body as unknown as Array<{ title: string }>;
    // Star Wars had the top raw avg but only 2 votes. The weighted score
    // pulls it below Pulp Fiction (4.5 avg, 300 votes) and Toy Story
    // (4.2, 250) — the whole point of the heuristic.
    const starWarsIdx = items.findIndex((m) => m.title === "Star Wars");
    const pulpIdx = items.findIndex((m) => m.title === "Pulp Fiction");
    expect(pulpIdx).toBeLessThan(starWarsIdx);
  });
});

describe("GET /genres", () => {
  it("returns all seeded genres alphabetically", async () => {
    const { status, body } = await get("/genres");
    expect(status).toBe(200);
    const genres = body as unknown as string[];
    expect(genres).toEqual([...genres].sort());
    expect(genres).toContain("Action");
    expect(genres).toContain("Sci-Fi");
  });
});

describe("GET /movies/:id", () => {
  it("returns full details including cached TMDB enrichment", async () => {
    const { status, body } = await get("/movies/4");
    expect(status).toBe(200);
    const m = body as unknown as {
      id: number;
      title: string;
      posterUrl: string;
      imdbUrl: string;
      tmdb: {
        overview: string;
        director: string;
        cast: Array<{ name: string; profileUrl: string }>;
        trailerUrl: string;
        backdropUrl: string;
      };
    };
    expect(m.id).toBe(4);
    expect(m.title).toBe("Pulp Fiction");
    // Poster URL is composed on the server from the cached path.
    expect(m.posterUrl).toContain("https://image.tmdb.org/t/p/");
    expect(m.posterUrl).toContain("/pulp-poster.jpg");
    // IMDB URL is derived from the imdbId column, no TMDB dependency.
    expect(m.imdbUrl).toBe("https://www.imdb.com/title/tt0000004/");
    expect(m.tmdb.director).toBe("Quentin Tarantino");
    expect(m.tmdb.cast).toHaveLength(2);
    expect(m.tmdb.cast[0]!.profileUrl).toContain("/jt.jpg");
    expect(m.tmdb.trailerUrl).toBe("https://www.youtube.com/watch?v=s7EdQ4FqbhY");
    expect(m.tmdb.backdropUrl).toContain("/pulp-backdrop.jpg");
  });

  it("returns MovieLens data with tmdb=null when no cache exists and TMDB is disabled", async () => {
    const { status, body } = await get("/movies/1");
    expect(status).toBe(200);
    const m = body as unknown as { id: number; posterUrl: string | null; tmdb: null };
    expect(m.id).toBe(1);
    expect(m.posterUrl).toBeNull();
    expect(m.tmdb).toBeNull();
  });

  it("returns 404 for unknown movie id", async () => {
    const { status, body } = await get("/movies/9999999");
    expect(status).toBe(404);
    expect((body as { message: string }).message).toMatch(/not found/i);
  });
});

describe("GET /stats", () => {
  it("returns dataset counts and year range", async () => {
    const { status, body } = await get("/stats");
    expect(status).toBe(200);
    const s = body as unknown as {
      totalMovies: number;
      totalGenres: number;
      totalRatings: number;
      moviesEnrichedByTmdb: number;
      yearRange: { min: number; max: number };
      tmdbEnabled: boolean;
    };
    expect(s.totalMovies).toBe(5);
    expect(s.totalGenres).toBe(6);
    expect(s.moviesEnrichedByTmdb).toBe(1); // Only Pulp Fiction is seeded in cache.
    expect(s.yearRange.min).toBe(1977);
    expect(s.yearRange.max).toBe(1995);
    // Tests explicitly unset the env — TMDB must report disabled.
    expect(s.tmdbEnabled).toBe(false);
  });
});
