import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock, ExternalLink, Play, Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Poster } from "@/components/movie/Poster";
import { FavoriteButton } from "@/components/movie/FavoriteButton";
import { ErrorState } from "@/components/StateViews";
import { useMovieDetails } from "@/hooks/useMovies";
import { useTranslation } from "@/hooks/useTranslation";
import { useGenreLabel } from "@/hooks/useGenreLabel";
import { toErrorMessage } from "@/services/api";
import { formatCount, formatRating } from "@/utils/format";
import type { MovieDetails as MovieDetailsType } from "@/types";

/** `https://www.youtube.com/watch?v=ID` -> embeddable player URL. */
function toEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const id = parsed.searchParams.get("v") ?? parsed.pathname.split("/").pop();
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

export default function MovieDetails() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const movieId = Number(id);
  const { data, isPending, isError, error, refetch } = useMovieDetails(movieId);

  if (!Number.isFinite(movieId)) {
    return <ErrorState message={t("details.invalidId", { id: id ?? "" })} />;
  }
  if (isPending) return <DetailsSkeleton />;
  if (isError) {
    return <ErrorState message={toErrorMessage(error)} onRetry={() => void refetch()} />;
  }

  return <DetailsView movie={data} />;
}

function DetailsView({ movie }: { movie: MovieDetailsType }) {
  const { t, localeTag } = useTranslation();
  const genreLabel = useGenreLabel();
  const tmdb = movie.tmdb;
  const embedUrl = tmdb?.trailerUrl ? toEmbedUrl(tmdb.trailerUrl) : null;

  return (
    <article className="relative">
      {tmdb?.backdropUrl && (
        <div className="pointer-events-none absolute inset-x-0 -top-8 h-[340px] overflow-hidden">
          <img
            src={tmdb.backdropUrl}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover object-[center_20%] opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        </div>
      )}

      <div className="relative">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft size={14} />
            {t("details.back")}
          </Link>
        </Button>

        <div className="grid gap-8 md:grid-cols-[260px_1fr]">
          <div className="mx-auto w-full max-w-[220px] md:max-w-none">
            <div className="aspect-[2/3] overflow-hidden rounded-xl border border-border bg-muted shadow-lg">
              <Poster src={tmdb?.posterUrl ?? movie.posterUrl} alt={movie.title} iconSize={40} />
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-3 flex items-start gap-4">
              <h1 className="flex-1 text-2xl font-bold tracking-tight sm:text-3xl">
                {movie.title}
                {movie.year && (
                  <span className="font-normal text-muted-foreground"> ({movie.year})</span>
                )}
              </h1>
              <FavoriteButton
                movieId={movie.id}
                size={20}
                className="h-10 w-10 border border-border bg-card text-muted-foreground hover:text-rose-500"
              />
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {/* `accent` is solid crimson in this palette — a row of six of
                  them would shout over the title. Genres stay neutral. */}
              {movie.genres.map((genre) => (
                <Badge key={genre}>{genreLabel(genre)}</Badge>
              ))}
              {tmdb?.runtimeMinutes && (
                <Badge variant="outline">
                  <Clock size={11} />
                  {t("details.minutes", { count: tmdb.runtimeMinutes })}
                </Badge>
              )}
              {tmdb?.originalLanguage && (
                <Badge variant="outline">{tmdb.originalLanguage.toUpperCase()}</Badge>
              )}
            </div>

            {movie.stats ? (
              <Card className="mb-6 flex flex-wrap gap-8 p-5">
                <Metric
                  icon={<Star size={14} className="fill-amber-400 text-amber-400" />}
                  label={t("details.avgRating")}
                  value={formatRating(movie.stats.avgRating)}
                  suffix={t("card.outOfFive")}
                />
                <Metric
                  label={t("details.weighted")}
                  value={formatRating(movie.stats.weightedRating)}
                  suffix={t("card.outOfFive")}
                />
                <Metric
                  icon={<Users size={14} className="text-muted-foreground" />}
                  label={t("details.votes")}
                  value={formatCount(movie.stats.numRatings, localeTag)}
                />
              </Card>
            ) : (
              <p className="mb-6 text-sm text-muted-foreground">{t("details.noStats")}</p>
            )}

            {tmdb?.overview && (
              <section className="mb-6">
                <h2 className="mb-2 text-lg font-semibold tracking-tight">
                  {t("details.overview")}
                </h2>
                <p className="text-sm leading-relaxed text-foreground/90">{tmdb.overview}</p>
              </section>
            )}

            {tmdb?.director && (
              <section className="mb-6">
                <h2 className="mb-2 text-lg font-semibold tracking-tight">
                  {t("details.director")}
                </h2>
                <p className="text-sm text-foreground/90">{tmdb.director}</p>
              </section>
            )}

            {tmdb && tmdb.cast.length > 0 && (
              <section className="mb-6">
                <h2 className="mb-3 text-lg font-semibold tracking-tight">{t("details.cast")}</h2>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {tmdb.cast.map((member) => (
                    <Card
                      key={`${member.name}-${member.character}`}
                      asChild
                      className="rounded-lg shadow-none"
                    >
                      <li className="flex items-center gap-3 p-2.5">
                        <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                          <Poster src={member.profileUrl} alt={member.name} iconSize={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{member.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {member.character}
                          </div>
                        </div>
                      </li>
                    </Card>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex flex-wrap gap-3 border-t border-border pt-5">
              {embedUrl && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Play size={14} className="fill-current" />
                      {t("details.trailer")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl p-4" closeLabel={t("details.closeTrailer")}>
                    <DialogTitle className="mb-3 pr-8">
                      {t("details.trailerTitle", { title: movie.title })}
                    </DialogTitle>
                    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                      <iframe
                        src={embedUrl}
                        title={`${movie.title} trailer`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full border-0"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {movie.imdbUrl && (
                <Button variant="outline" asChild>
                  <a href={movie.imdbUrl} target="_blank" rel="noreferrer">
                    {t("details.imdb")}
                    <ExternalLink size={13} />
                  </a>
                </Button>
              )}
            </div>

            {!tmdb && (
              <p className="mt-4 text-xs text-muted-foreground">{t("details.noTmdb")}</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function Metric({
  icon,
  label,
  value,
  suffix,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xl font-bold tabular-nums">
        {icon}
        {value}
        {suffix && <span className="text-sm font-normal text-muted-foreground">{suffix}</span>}
      </div>
      <div className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="grid gap-8 md:grid-cols-[260px_1fr]" aria-hidden="true">
      <Skeleton className="mx-auto aspect-[2/3] w-full max-w-[220px] rounded-xl md:max-w-none" />
      <div className="space-y-4">
        <Skeleton className="h-9 w-2/3" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
