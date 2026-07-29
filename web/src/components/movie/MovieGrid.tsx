import { MovieCard } from "./MovieCard";
import type { Movie } from "@/types";

interface Props {
  movies: Movie[];
  scoreField?: "avgRating" | "weightedRating";
  /** When set, cards render a #N badge starting at this rank. */
  startRank?: number;
}

export function MovieGrid({ movies, scoreField, startRank }: Props) {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {movies.map((movie, i) => (
        <MovieCard
          key={movie.id}
          movie={movie}
          scoreField={scoreField}
          rank={startRank === undefined ? undefined : startRank + i}
        />
      ))}
    </div>
  );
}
