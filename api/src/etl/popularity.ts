/**
 * IMDB-style Bayesian weighted rating.
 *
 *   WR = (v / (v + m)) * R  +  (m / (v + m)) * C
 *
 * where:
 *   v = number of ratings the movie received
 *   R = the movie's mean rating
 *   m = a "prior weight" — minimum votes to trust R at face value
 *   C = the global mean rating across all movies
 *
 * The idea: a movie with 2 five-star ratings should NOT out-rank a movie with
 * 500 ratings averaging 4.5. As `v` grows past `m`, WR converges to R; as `v`
 * shrinks, WR is pulled toward the global mean C. This is the same formula
 * IMDB Top 250 uses.
 *
 * We pick `m` as the 75th percentile of rating counts — a common heuristic
 * that makes "well-rated" movies compete only with peers that have comparable
 * evidence.
 */

export interface WeightedRatingParams {
  meanVote: number; // C
  minVotes: number; // m
}

export function weightedRating(
  numRatings: number,
  avgRating: number,
  params: WeightedRatingParams,
): number {
  const { meanVote: C, minVotes: m } = params;
  const v = numRatings;
  if (v + m === 0) return 0;
  return (v / (v + m)) * avgRating + (m / (v + m)) * C;
}

export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.max(0, Math.floor(p * sortedAsc.length)),
  );
  return sortedAsc[idx]!;
}
