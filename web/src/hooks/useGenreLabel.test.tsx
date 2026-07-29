import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { LanguageProvider } from "@/context/LanguageContext";
import { useGenreLabel } from "./useGenreLabel";
import { genreLabels } from "@/i18n/translations";

function wrapperFor(language: string) {
  localStorage.setItem("movielens.language.v1", language);
  return function Wrapper({ children }: { children: ReactNode }) {
    return <LanguageProvider>{children}</LanguageProvider>;
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("useGenreLabel", () => {
  it("returns the MovieLens name unchanged in English", () => {
    const { result } = renderHook(() => useGenreLabel(), { wrapper: wrapperFor("en") });
    expect(result.current("Sci-Fi")).toBe("Sci-Fi");
    expect(result.current("Children")).toBe("Children");
  });

  it("translates the vocabulary in Portuguese", () => {
    const { result } = renderHook(() => useGenreLabel(), { wrapper: wrapperFor("pt-BR") });
    expect(result.current("Sci-Fi")).toBe("Ficção Científica");
    expect(result.current("Thriller")).toBe("Suspense");
    expect(result.current("Children")).toBe("Infantil");
    expect(result.current("Western")).toBe("Faroeste");
  });

  it("falls back to the raw name for a genre outside the vocabulary", () => {
    // Better a visible English label than a blank chip if MovieLens ever adds
    // a genre we haven't mapped.
    const { result } = renderHook(() => useGenreLabel(), { wrapper: wrapperFor("pt-BR") });
    expect(result.current("Cyberpunk")).toBe("Cyberpunk");
  });

  it("covers every genre MovieLens ships", () => {
    const vocabulary = [
      "Action", "Adventure", "Animation", "Children", "Comedy", "Crime",
      "Documentary", "Drama", "Fantasy", "Film-Noir", "Horror", "IMAX",
      "Musical", "Mystery", "Romance", "Sci-Fi", "Thriller", "War", "Western",
      "(no genres listed)",
    ];
    for (const genre of vocabulary) {
      expect(genreLabels["pt-BR"][genre], `missing pt-BR label for "${genre}"`).toBeTruthy();
    }
  });
});
