import { useQueries } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { MovieGrid } from "@/components/movie/MovieGrid";
import { MovieGridSkeleton } from "@/components/movie/MovieCardSkeleton";
import { EmptyState, ErrorState } from "@/components/StateViews";
import { useFavorites } from "@/hooks/useFavorites";
import { movieKeys } from "@/hooks/useMovies";
import { useTranslation } from "@/hooks/useTranslation";
import { moviesService, toErrorMessage } from "@/services/api";

/**
 * Favorites are just a set of ids in localStorage, so the page fetches each
 * one. `useQueries` gives every movie its own cache entry, which means a title
 * already visited renders from cache instead of refetching.
 */
export default function Favorites() {
  const { t } = useTranslation();
  const { ids } = useFavorites();
  const idList = [...ids];

  const results = useQueries({
    queries: idList.map((id) => ({
      queryKey: movieKeys.detail(id),
      queryFn: () => moviesService.byId(id),
    })),
  });

  const isPending = results.some((r) => r.isPending);
  const firstError = results.find((r) => r.isError);
  const movies = results.flatMap((r) => (r.data ? [r.data] : []));

  return (
    <section>
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2">
          <Heart size={18} className="fill-rose-500 text-rose-500" />
          <h1 className="text-2xl font-bold tracking-tight">{t("favorites.title")}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{t("favorites.subtitle")}</p>
      </div>

      {idList.length === 0 ? (
        <EmptyState title={t("favorites.empty.title")} message={t("favorites.empty.message")} />
      ) : isPending ? (
        <MovieGridSkeleton count={Math.min(idList.length, 8)} />
      ) : firstError ? (
        <ErrorState message={toErrorMessage(firstError.error)} />
      ) : (
        <MovieGrid movies={movies} />
      )}
    </section>
  );
}
