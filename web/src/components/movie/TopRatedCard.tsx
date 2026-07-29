import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Poster } from "./Poster";
import { useTranslation } from "@/hooks/useTranslation";
import { formatRating } from "@/utils/format";
import type { Movie } from "@/types";

export function TopRatedCard({ movie, rank }: { movie: Movie; rank: number }) {
  const { t } = useTranslation();
  const score = movie.stats?.avgRating ?? null;

  return (
    <Card className="min-w-[260px] max-w-[280px] flex-shrink-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-ring">
      <Link
        to={`/movies/${movie.id}`}
        className="flex items-start gap-3 p-4 focus:outline-none"
      >
        <div className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
          <Poster src={movie.posterUrl} alt={movie.title} iconSize={18} />
        </div>

        <div className="min-w-0 flex-1">
          <span className="text-xl font-bold leading-none text-muted-foreground">#{rank}</span>
          <h4 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-card-foreground">
            {movie.title}
          </h4>
          <p className="mt-0.5 text-xs text-muted-foreground">{movie.year ?? "—"}</p>
          <div className="mt-1.5 flex items-center gap-1">
            <Star size={11} className="fill-amber-400 text-amber-400" />
            <span className="text-xs font-semibold">
              {score !== null ? formatRating(score) : "—"}
            </span>
            <span className="text-xs text-muted-foreground">{t("card.outOfFive")}</span>
          </div>
        </div>
      </Link>
    </Card>
  );
}
