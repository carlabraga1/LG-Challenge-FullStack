import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Poster } from "./Poster";
import { FavoriteButton } from "./FavoriteButton";
import { useTranslation } from "@/hooks/useTranslation";
import { useGenreLabel } from "@/hooks/useGenreLabel";
import { formatRating, formatVotes } from "@/utils/format";
import type { Movie } from "@/types";

interface Props {
  movie: Movie;
  /** Renders a #N badge — used by the ranked lists. */
  rank?: number;
  scoreField?: "avgRating" | "weightedRating";
}

export function MovieCard({ movie, rank, scoreField = "avgRating" }: Props) {
  const { t } = useTranslation();
  const genreLabel = useGenreLabel();
  const score = movie.stats ? movie.stats[scoreField] : null;
  const votes = movie.stats?.numRatings;

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus-within:ring-2 focus-within:ring-ring">
      {/* The favourite button sits outside the link on purpose: nesting a
          button inside an anchor is invalid HTML and confuses screen readers
          and keyboard users. */}
      <FavoriteButton
        movieId={movie.id}
        className="absolute right-2.5 top-2.5 z-10 h-7 w-7 bg-black/45 hover:bg-black/60"
      />

      <Link to={`/movies/${movie.id}`} className="block focus:outline-none">
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
          <Poster
            src={movie.posterUrl}
            alt={movie.title}
            className="transition-transform duration-500 group-hover:scale-105"
            iconSize={34}
          />

          {/* Darkens the poster foot on hover so the rating pill stays legible. */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {rank !== undefined && (
            <span className="absolute left-2.5 top-2.5 inline-flex items-center rounded-full bg-black/65 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
              #{rank}
            </span>
          )}

          {score !== null && (
            <div className="absolute bottom-3 left-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <Star size={11} className="fill-amber-400 text-amber-400" />
                {formatRating(score)}
              </span>
            </div>
          )}
        </div>

        <CardContent className="space-y-2.5 p-4">
          <div>
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-card-foreground">
              {movie.title}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{movie.year ?? "—"}</p>
          </div>

          <div className="flex flex-wrap gap-1">
            {movie.genres.slice(0, 2).map((genre) => (
              <Badge key={genre}>{genreLabel(genre)}</Badge>
            ))}
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              {score !== null ? formatRating(score) : "—"}
              <span className="text-muted-foreground">{t("card.outOfFive")}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              {votes === undefined
                ? t("card.noVotes")
                : t(votes === 1 ? "card.votes.one" : "card.votes", {
                    count: formatVotes(votes),
                  })}
            </span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
