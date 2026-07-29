/** `621000` -> `621K`, `940` -> `940`. */
export function formatVotes(votes: number): string {
  if (votes >= 1_000_000) return `${(votes / 1_000_000).toFixed(1)}M`;
  if (votes >= 1_000) return `${Math.round(votes / 1_000)}K`;
  return String(votes);
}

/** MovieLens ratings are on a 0–5 scale, so keep two decimals. */
export function formatRating(rating: number): string {
  return rating.toFixed(2);
}

/**
 * Thousands separators follow the active locale — `9,742` in English and
 * `9.742` in Portuguese. Passing the tag explicitly (rather than letting
 * `toLocaleString` read the browser default) keeps numbers consistent with the
 * language the user picked in the app.
 */
export function formatCount(value: number, localeTag = "en-US"): string {
  return value.toLocaleString(localeTag);
}
