import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { MovieFilters } from "@/types";

/**
 * Filter state lives in the query string, not in component state. That makes
 * every result view shareable and deep-linkable, and lets the browser Back
 * button step through searches and pages instead of leaving the app.
 */
export function useMovieFilters() {
  const [params, setParams] = useSearchParams();

  const filters: MovieFilters = useMemo(() => {
    const page = Number(params.get("page") ?? "1");
    return {
      search: params.get("search") ?? "",
      genre: params.get("genre") ?? "",
      year: params.get("year") ?? "",
      page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    };
  }, [params]);

  const update = useCallback(
    (patch: Partial<MovieFilters>) => {
      const next = new URLSearchParams(params);

      for (const [key, value] of Object.entries(patch)) {
        const empty = value === "" || value === undefined || value === null;
        if (empty) next.delete(key);
        else next.set(key, String(value));
      }

      // Any filter change invalidates the current page — reset unless the
      // caller is explicitly paging.
      if (patch.page === undefined) next.delete("page");
      else if (patch.page <= 1) next.delete("page");

      // `replace` for typing so a search doesn't push one history entry per
      // keystroke; paging pushes so Back returns to the previous page.
      setParams(next, { replace: patch.page === undefined });
    },
    [params, setParams],
  );

  const clear = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams]);

  const hasFilters = filters.search !== "" || filters.genre !== "" || filters.year !== "";

  return { filters, update, clear, hasFilters };
}
