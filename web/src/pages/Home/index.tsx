import { useCallback, useMemo } from "react";
import { Sparkles, TrendingUp, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchBar } from "@/components/movie/SearchBar";
import { Filters } from "@/components/movie/Filters";
import { MovieGrid } from "@/components/movie/MovieGrid";
import { MovieGridSkeleton } from "@/components/movie/MovieCardSkeleton";
import { TopRatedCard } from "@/components/movie/TopRatedCard";
import { Pagination } from "@/components/movie/Pagination";
import { EmptyState, ErrorState } from "@/components/StateViews";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { cn } from "@/lib/utils";
import { useMovieFilters } from "@/hooks/useMovieFilters";
import { useSearchInput } from "@/hooks/useSearchInput";
import { useTranslation } from "@/hooks/useTranslation";
import { useGenreLabel } from "@/hooks/useGenreLabel";
import { PAGE_SIZE, useGenres, useMovieList, usePopular, useStats, useTopRated } from "@/hooks/useMovies";
import { toErrorMessage } from "@/services/api";
import { formatCount } from "@/utils/format";

/** Genres promoted to one-click chips, in the order we'd like them shown. */
const PREFERRED_TAGS = ["Drama", "Action", "Comedy", "Thriller", "Animation", "Romance"];

export default function Home() {
  const { t, localeTag } = useTranslation();
  const genreLabel = useGenreLabel();
  const { filters, update, clear, hasFilters } = useMovieFilters();

  const commitSearch = useCallback((search: string) => update({ search }), [update]);
  const [searchInput, setSearchInput] = useSearchInput(filters.search, commitSearch);

  const list = useMovieList(filters);
  const genres = useGenres();
  const stats = useStats();
  const topRated = useTopRated(6);
  const popular = usePopular(8);

  const years = useMemo(() => {
    const min = stats.data?.yearRange.min;
    const max = stats.data?.yearRange.max;
    if (!min || !max) return [];
    return Array.from({ length: max - min + 1 }, (_, i) => max - i);
  }, [stats.data]);

  const quickTags = useMemo(() => {
    const available = new Set(genres.data ?? []);
    return PREFERRED_TAGS.filter((tag) => available.has(tag));
  }, [genres.data]);

  const heading =
    list.mode === "search"
      ? t("results.search", { query: filters.search })
      : list.mode === "browse"
        ? t("results.browse")
        : t("results.discover");

  const total = list.data?.total ?? 0;

  // The 300 ms debounce window is dead time the user can see: they typed, and
  // nothing has happened yet. Count it as busy so feedback starts on the first
  // keystroke rather than after the request finally goes out.
  const isSettling = searchInput.trim() !== filters.search.trim();
  const isBusy = list.isFetching || isSettling;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="pt-4">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {t("hero.title.before")}{" "}
            <span className="text-primary">{t("hero.title.highlight")}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {stats.data
              ? t("hero.subtitle", {
                  movies: formatCount(stats.data.totalMovies, localeTag),
                  ratings: formatCount(stats.data.totalRatings, localeTag),
                })
              : t("hero.subtitle.fallback")}
          </p>
        </div>

        <div className="mx-auto mb-5 max-w-2xl">
          <SearchBar
            id="hero-search"
            value={searchInput}
            onChange={setSearchInput}
          />
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {quickTags.map((tag) => {
            const active = filters.genre === tag;
            return (
              <Button
                key={tag}
                size="sm"
                variant={active ? "default" : "outline"}
                aria-pressed={active}
                onClick={() => update({ genre: active ? "" : tag })}
                className={active ? "rounded-full" : "rounded-full bg-card"}
              >
                {genreLabel(tag)}
              </Button>
            );
          })}
        </div>
      </section>

      {/* ── Dataset stats ────────────────────────────────────── */}
      <section aria-label={t("stats.movies")} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.isPending
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="mb-2 h-6 w-20" />
                <Skeleton className="h-3 w-14" />
              </Card>
            ))
          : stats.data && (
              <>
                <Stat
                  label={t("stats.movies")}
                  value={formatCount(stats.data.totalMovies, localeTag)}
                />
                <Stat
                  label={t("stats.ratings")}
                  value={formatCount(stats.data.totalRatings, localeTag)}
                />
                <Stat label={t("stats.genres")} value={String(stats.data.totalGenres)} />
                <Stat
                  label={t("stats.years")}
                  value={
                    stats.data.yearRange.min && stats.data.yearRange.max
                      ? `${stats.data.yearRange.min}–${stats.data.yearRange.max}`
                      : "—"
                  }
                />
              </>
            )}
      </section>

      <div className="h-px w-full bg-border" />

      {/* ── Filters ──────────────────────────────────────────── */}
      <Filters
        genre={filters.genre}
        year={filters.year}
        genres={genres.data ?? []}
        years={years}
        onGenreChange={(genre) => update({ genre })}
        onYearChange={(year) => update({ year })}
        onClear={() => {
          setSearchInput("");
          clear();
        }}
        hasFilters={hasFilters}
        resultLabel={
          isBusy
            ? t("filters.searching")
            : list.isSuccess && list.mode !== "discover"
              ? t(total === 1 ? "filters.results.one" : "filters.results", {
                  count: formatCount(total, localeTag),
                })
              : undefined
        }
      />

      {/* ── Results ──────────────────────────────────────────── */}
      <section aria-busy={isBusy} aria-live="polite">
        <div className="mb-5 flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">{heading}</h2>
          {/* Only over existing results — the first load already announces
              itself with the skeleton grid. */}
          {isBusy && !list.isPending && <LoadingIndicator label={t("results.updating")} />}
        </div>

        {list.isPending ? (
          <MovieGridSkeleton count={8} />
        ) : list.isError ? (
          <ErrorState message={toErrorMessage(list.error)} onRetry={() => void list.refetch()} />
        ) : list.data && list.data.items.length === 0 ? (
          <EmptyState
            onReset={() => {
              setSearchInput("");
              clear();
            }}
          />
        ) : (
          <>
            <div
              className={cn(
                "transition-opacity duration-200",
                // Dim and lock the stale grid so it reads as "being replaced"
                // and nobody clicks a card that is about to disappear.
                isBusy && "pointer-events-none select-none opacity-50",
              )}
            >
              <MovieGrid
                movies={list.data?.items ?? []}
                scoreField={list.mode === "discover" ? "weightedRating" : "avgRating"}
              />
            </div>
            <Pagination
              total={total}
              pageSize={PAGE_SIZE}
              page={filters.page}
              onPageChange={(page) => {
                update({ page });
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </>
        )}
      </section>

      <div className="h-px w-full bg-border" />

      {/* ── Top rated ────────────────────────────────────────── */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <Trophy size={18} className="text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">{t("section.topRated")}</h2>
          <Badge variant="outline">{t("section.topRated.badge")}</Badge>
        </div>

        {topRated.isPending ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 min-w-[260px] rounded-xl" />
            ))}
          </div>
        ) : topRated.isError ? (
          <ErrorState message={toErrorMessage(topRated.error)} />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {(topRated.data ?? []).map((movie, i) => (
              <TopRatedCard key={movie.id} movie={movie} rank={i + 1} />
            ))}
          </div>
        )}
      </section>

      <div className="h-px w-full bg-border" />

      {/* ── Most popular ─────────────────────────────────────── */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <TrendingUp size={18} className="text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">{t("section.popular")}</h2>
          <Badge variant="trending">{t("section.popular.badge")}</Badge>
        </div>

        {popular.isPending ? (
          <MovieGridSkeleton count={4} />
        ) : popular.isError ? (
          <ErrorState message={toErrorMessage(popular.error)} />
        ) : (
          <MovieGrid movies={popular.data ?? []} scoreField="weightedRating" startRank={1} />
        )}
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-xl font-bold tabular-nums text-card-foreground">{value}</div>
      <div className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    </Card>
  );
}
