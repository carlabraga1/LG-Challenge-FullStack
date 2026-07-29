import axios from "axios";
import type { Movie, MovieDetails, Paginated, Stats } from "@/types";

/**
 * Same-origin by default: `/api` is proxied to the API by Vite in dev and by
 * nginx in production, which keeps the browser on one origin and avoids CORS
 * entirely. `VITE_API_URL` overrides it when the API lives elsewhere (e.g. the
 * client deployed to Vercel against a hosted API).
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  timeout: 30_000,
});

/**
 * Fastify returns validation problems as `{ message }`. Surface that instead
 * of axios's generic "Request failed with status code 400" so the UI can show
 * something a human can act on.
 */
export function toErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiMessage = (error.response?.data as { message?: unknown } | undefined)?.message;
    if (typeof apiMessage === "string" && apiMessage !== "") return apiMessage;
    if (error.response) return `${error.response.status} ${error.response.statusText}`;
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

export const moviesService = {
  searchByTitle: async (title: string, limit = 20, offset = 0) => {
    const { data } = await api.get<Paginated<Movie>>("/movies/by-title", {
      params: { title, limit, offset },
    });
    return data;
  },

  /**
   * Genre and year are both optional — axios omits `undefined` params, so a
   * genre-only or year-only browse sends only what the user actually chose.
   */
  browse: async (
    filters: { genre?: string; year?: number },
    limit = 20,
    offset = 0,
  ) => {
    const { data } = await api.get<Paginated<Movie>>("/movies/by-year-genre", {
      params: {
        genre: filters.genre || undefined,
        year: filters.year ?? undefined,
        limit,
        offset,
      },
    });
    return data;
  },

  topRated: async (k: number) => {
    const { data } = await api.get<Movie[]>("/movies/top", { params: { k } });
    return data;
  },

  popular: async (k: number) => {
    const { data } = await api.get<Movie[]>("/movies/popular", { params: { k } });
    return data;
  },

  byId: async (id: number) => {
    const { data } = await api.get<MovieDetails>(`/movies/${id}`);
    return data;
  },

  genres: async () => {
    const { data } = await api.get<string[]>("/genres");
    return data;
  },

  stats: async () => {
    const { data } = await api.get<Stats>("/stats");
    return data;
  },
};
