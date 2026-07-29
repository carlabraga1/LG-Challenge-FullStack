import type { FastifyInstance } from "fastify";
import { MovieService } from "../services/movies.service.js";
import { getPrisma } from "../db.js";
import { isTmdbConfigured } from "../services/tmdb.service.js";

const MovieSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    title: { type: "string" },
    originalTitle: { type: "string" },
    year: { type: ["integer", "null"] },
    genres: { type: "array", items: { type: "string" } },
    imdbId: { type: ["string", "null"] },
    imdbUrl: { type: ["string", "null"] },
    tmdbId: { type: ["string", "null"] },
    posterUrl: { type: ["string", "null"] },
    stats: {
      type: ["object", "null"],
      properties: {
        numRatings: { type: "integer" },
        avgRating: { type: "number" },
        weightedRating: { type: "number" },
      },
    },
  },
} as const;

const MovieDetailsSchema = {
  type: "object",
  properties: {
    ...MovieSchema.properties,
    tmdb: {
      type: ["object", "null"],
      properties: {
        posterUrl: { type: ["string", "null"] },
        backdropUrl: { type: ["string", "null"] },
        overview: { type: ["string", "null"] },
        runtimeMinutes: { type: ["integer", "null"] },
        originalLanguage: { type: ["string", "null"] },
        tmdbPopularity: { type: ["number", "null"] },
        director: { type: ["string", "null"] },
        cast: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              character: { type: "string" },
              profileUrl: { type: ["string", "null"] },
            },
          },
        },
        trailerUrl: { type: ["string", "null"] },
        fetchedAt: { type: "string" },
      },
    },
  },
} as const;

const PaginatedMovies = {
  type: "object",
  properties: {
    total: { type: "integer" },
    limit: { type: "integer" },
    offset: { type: "integer" },
    items: { type: "array", items: MovieSchema },
  },
} as const;

export async function movieRoutes(app: FastifyInstance) {
  const service = new MovieService(getPrisma());

  app.get(
    "/movies/by-title",
    {
      schema: {
        summary: "List movies whose title contains the given text",
        tags: ["movies"],
        querystring: {
          type: "object",
          required: ["title"],
          properties: {
            title: { type: "string", minLength: 1 },
            limit: { type: "integer", minimum: 1, maximum: 200, default: 20 },
            offset: { type: "integer", minimum: 0, default: 0 },
          },
        },
        response: { 200: PaginatedMovies },
      },
    },
    async (req) => {
      const q = req.query as { title: string; limit: number; offset: number };
      return service.searchByTitle(q.title, q.limit, q.offset);
    },
  );

  app.get(
    "/movies/by-year-genre",
    {
      schema: {
        summary: "Browse movies filtered by genre and/or year",
        tags: ["movies"],
        querystring: {
          type: "object",
          properties: {
            year: { type: "integer", minimum: 1874, maximum: 2100 },
            genre: { type: "string", minLength: 1 },
            limit: { type: "integer", minimum: 1, maximum: 200, default: 20 },
            offset: { type: "integer", minimum: 0, default: 0 },
          },
        },
        response: { 200: PaginatedMovies },
      },
    },
    async (req) => {
      const q = req.query as {
        year?: number;
        genre?: string;
        limit: number;
        offset: number;
      };
      return service.searchByYearAndGenre(q.year ?? null, q.genre ?? null, q.limit, q.offset);
    },
  );

  app.get(
    "/movies/top",
    {
      schema: {
        summary:
          "Top K movies by average rating (descending). See /movies/popular for a heuristic that penalizes low vote counts.",
        tags: ["movies"],
        querystring: {
          type: "object",
          required: ["k"],
          properties: {
            k: { type: "integer", minimum: 1, maximum: 500 },
          },
        },
        response: {
          200: { type: "array", items: MovieSchema },
        },
      },
    },
    async (req) => {
      const q = req.query as { k: number };
      return service.topRated(q.k);
    },
  );

  app.get(
    "/movies/popular",
    {
      schema: {
        summary:
          "Top K movies by IMDB-style weighted rating — a Bayesian heuristic that combines average rating with vote count.",
        description:
          "WR = (v/(v+m))·R + (m/(v+m))·C, where v=numRatings, R=avgRating, C=global mean, m=75th percentile of vote counts (computed at ETL time).",
        tags: ["movies"],
        querystring: {
          type: "object",
          required: ["k"],
          properties: {
            k: { type: "integer", minimum: 1, maximum: 500 },
          },
        },
        response: {
          200: { type: "array", items: MovieSchema },
        },
      },
    },
    async (req) => {
      const q = req.query as { k: number };
      return service.popular(q.k);
    },
  );

  app.get(
    "/movies/:id",
    {
      schema: {
        summary:
          "Full movie details, enriched with TMDB data (poster, overview, cast, director, trailer) on first access.",
        tags: ["movies"],
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "integer" } },
        },
        response: {
          200: MovieDetailsSchema,
          404: {
            type: "object",
            properties: { message: { type: "string" } },
          },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: number };
      const movie = await service.getById(id);
      if (!movie) return reply.code(404).send({ message: "Movie not found" });
      return movie;
    },
  );

  app.get(
    "/genres",
    {
      schema: {
        summary: "List all genres — useful for populating the client dropdown.",
        tags: ["metadata"],
        response: {
          200: { type: "array", items: { type: "string" } },
        },
      },
    },
    async () => service.listGenres(),
  );

  app.get(
    "/stats",
    {
      schema: {
        summary: "General dataset statistics (counts, year range, TMDB coverage).",
        tags: ["metadata"],
        response: {
          200: {
            type: "object",
            properties: {
              totalMovies: { type: "integer" },
              totalGenres: { type: "integer" },
              totalRatings: { type: "integer" },
              moviesWithRatings: { type: "integer" },
              moviesEnrichedByTmdb: { type: "integer" },
              yearRange: {
                type: "object",
                properties: {
                  min: { type: ["integer", "null"] },
                  max: { type: ["integer", "null"] },
                },
              },
              averageRating: { type: ["number", "null"] },
              tmdbEnabled: { type: "boolean" },
            },
          },
        },
      },
    },
    async () => {
      const s = await service.stats();
      return { ...s, tmdbEnabled: isTmdbConfigured() };
    },
  );
}
