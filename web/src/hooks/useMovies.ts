import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { moviesService } from "@/services/api";
import type { Movie, MovieFilters, Paginated } from "@/types";

export const PAGE_SIZE = 20;

/**
 * Query keys live in one place so a cache entry is never invented twice with a
 * slightly different shape.
 */
export const movieKeys = {
  all: ["movies"] as const,
  list: (filters: MovieFilters) => [...movieKeys.all, "list", filters] as const,
  top: (k: number) => [...movieKeys.all, "top", k] as const,
  popular: (k: number) => [...movieKeys.all, "popular", k] as const,
  detail: (id: number) => [...movieKeys.all, "detail", id] as const,
  genres: () => ["genres"] as const,
  stats: () => ["stats"] as const,
};

/**
 * Which endpoint answers the current filter state.
 *
 * The API exposes narrow endpoints rather than one polymorphic `/movies`, so
 * the client picks:
 *  - any search text        -> /movies/by-title
 *  - a genre and/or a year  -> /movies/by-year-genre
 *  - nothing                -> /movies/popular (the default discovery grid)
 */
export type ListMode = "search" | "browse" | "discover";

export function resolveListMode(filters: MovieFilters): ListMode {
  if (filters.search.trim() !== "") return "search";
  if (filters.genre !== "" || filters.year !== "") return "browse";
  return "discover";
}

export function useMovieList(filters: MovieFilters) {
  const mode = resolveListMode(filters);
  const offset = (filters.page - 1) * PAGE_SIZE;

  const query = useQuery({
    queryKey: movieKeys.list(filters),
    // Keeps the previous page on screen while the next one loads, so paging
    // doesn't flash an empty grid.
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Paginated<Movie>> => {
      if (mode === "search") {
        return moviesService.searchByTitle(filters.search.trim(), PAGE_SIZE, offset);
      }
      if (mode === "browse") {
        return moviesService.browse(
          {
            genre: filters.genre || undefined,
            year: filters.year === "" ? undefined : Number(filters.year),
          },
          PAGE_SIZE,
          offset,
        );
      }
      // Discover: the popular endpoint returns a plain array, so wrap it in
      // the same envelope the paginated endpoints use and let the grid stay
      // agnostic about where its data came from.
      const items = await moviesService.popular(PAGE_SIZE);
      return { total: items.length, limit: PAGE_SIZE, offset: 0, items };
    },
  });

  return { ...query, mode };
}

export function useTopRated(k = 6) {
  return useQuery({
    queryKey: movieKeys.top(k),
    queryFn: () => moviesService.topRated(k),
  });
}

export function usePopular(k = 8) {
  return useQuery({
    queryKey: movieKeys.popular(k),
    queryFn: () => moviesService.popular(k),
  });
}

export function useMovieDetails(id: number) {
  return useQuery({
    queryKey: movieKeys.detail(id),
    // Guards against `/movies/abc` firing a request for NaN.
    enabled: Number.isFinite(id),
    queryFn: () => moviesService.byId(id),
  });
}

export function useGenres() {
  return useQuery({
    queryKey: movieKeys.genres(),
    queryFn: () => moviesService.genres(),
    staleTime: Infinity, // the genre list never changes at runtime
  });
}

export function useStats() {
  return useQuery({
    queryKey: movieKeys.stats(),
    queryFn: () => moviesService.stats(),
    staleTime: 5 * 60 * 1000,
  });
}
