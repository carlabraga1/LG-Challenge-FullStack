export interface Movie {
  id: number;
  title: string;
  originalTitle: string;
  year: number | null;
  genres: string[];
  imdbId: string | null;
  imdbUrl: string | null;
  tmdbId: string | null;
  posterUrl: string | null;
  stats: MovieStats | null;
}

export interface MovieStats {
  numRatings: number;
  avgRating: number;
  weightedRating: number;
}

export interface CastMember {
  name: string;
  character: string;
  profileUrl: string | null;
}

export interface TmdbDetails {
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string | null;
  runtimeMinutes: number | null;
  originalLanguage: string | null;
  tmdbPopularity: number | null;
  director: string | null;
  cast: CastMember[];
  trailerUrl: string | null;
  fetchedAt: string;
}

export interface MovieDetails extends Movie {
  tmdb: TmdbDetails | null;
}

export interface Paginated<T> {
  total: number;
  limit: number;
  offset: number;
  items: T[];
}

export interface Stats {
  totalMovies: number;
  totalGenres: number;
  totalRatings: number;
  moviesWithRatings: number;
  moviesEnrichedByTmdb: number;
  yearRange: { min: number | null; max: number | null };
  averageRating: number | null;
  tmdbEnabled: boolean;
}

/** Filter state shared by the search box, the filter bar and the URL. */
export interface MovieFilters {
  search: string;
  genre: string;
  year: string;
  page: number;
}
