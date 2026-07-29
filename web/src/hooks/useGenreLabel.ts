import { useCallback } from "react";
import { genreLabels } from "@/i18n/translations";
import { useTranslation } from "./useTranslation";

/**
 * Maps a canonical MovieLens genre to its display name in the active language.
 *
 * Label only — never use the result as a filter value or a query param. The
 * API and the URL both speak the canonical English name.
 */
export function useGenreLabel() {
  const { language } = useTranslation();

  return useCallback(
    (genre: string) => genreLabels[language][genre] ?? genre,
    [language],
  );
}
