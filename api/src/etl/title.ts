/**
 * MovieLens stores titles with the release year in parentheses at the end,
 * e.g. "Toy Story (1995)". Some rows have no year, and a small number have
 * junk trailing whitespace or double-year variants like "Frankenweenie (2012)".
 *
 * We extract the trailing 4-digit year and return the "clean" title without
 * it. Keeping the original around lets the UI display exactly what MovieLens
 * ships, without losing our ability to filter by year.
 */
export function parseTitle(raw: string): { clean: string; year: number | null } {
  const match = raw.match(/^(.*)\s*\((\d{4})\)\s*$/);
  if (!match) {
    return { clean: raw.trim(), year: null };
  }
  return { clean: match[1]!.trim(), year: Number(match[2]) };
}
