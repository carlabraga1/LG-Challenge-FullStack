import { describe, it, expect } from "vitest";
import { resolveListMode } from "./useMovies";
import type { MovieFilters } from "@/types";

const base: MovieFilters = { search: "", genre: "", year: "", page: 1 };

describe("resolveListMode", () => {
  it("defaults to the discover grid with no filters", () => {
    expect(resolveListMode(base)).toBe("discover");
  });

  it("prefers title search whenever there is search text", () => {
    expect(resolveListMode({ ...base, search: "matrix" })).toBe("search");
    // Search wins even with filters set — the API has no combined endpoint.
    expect(resolveListMode({ ...base, search: "matrix", genre: "Comedy" })).toBe("search");
  });

  it("treats whitespace-only search as no search", () => {
    expect(resolveListMode({ ...base, search: "   " })).toBe("discover");
  });

  it("browses on genre alone, year alone, or both", () => {
    expect(resolveListMode({ ...base, genre: "Comedy" })).toBe("browse");
    expect(resolveListMode({ ...base, year: "1995" })).toBe("browse");
    expect(resolveListMode({ ...base, genre: "Comedy", year: "1995" })).toBe("browse");
  });
});
