import { describe, it, expect } from "vitest";
import { parseTitle } from "../src/etl/title.js";
import { weightedRating, percentile } from "../src/etl/popularity.js";
import { splitCsvLine } from "../src/etl/csv.js";

describe("parseTitle", () => {
  it("extracts trailing year", () => {
    expect(parseTitle("Toy Story (1995)")).toEqual({ clean: "Toy Story", year: 1995 });
  });

  it("preserves inner parentheses (only trailing year is stripped)", () => {
    expect(parseTitle("Léon (The Professional) (1994)")).toEqual({
      clean: "Léon (The Professional)",
      year: 1994,
    });
  });

  it("returns null year when the pattern doesn't match", () => {
    expect(parseTitle("Untitled Documentary")).toEqual({
      clean: "Untitled Documentary",
      year: null,
    });
  });
});

describe("weightedRating", () => {
  const params = { meanVote: 3.5, minVotes: 100 };

  it("pulls low-vote movies toward the global mean", () => {
    // 5.0 avg with only 2 votes should be dragged sharply toward 3.5.
    const wr = weightedRating(2, 5.0, params);
    expect(wr).toBeGreaterThan(3.5);
    expect(wr).toBeLessThan(3.7);
  });

  it("leaves high-vote movies close to their average", () => {
    const wr = weightedRating(10_000, 4.5, params);
    expect(wr).toBeCloseTo(4.5, 1);
  });

  it("is monotonic in avgRating for equal vote counts", () => {
    const a = weightedRating(100, 4.0, params);
    const b = weightedRating(100, 4.5, params);
    expect(b).toBeGreaterThan(a);
  });
});

describe("percentile", () => {
  it("returns the value at the requested position", () => {
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.75)).toBe(8);
  });
  it("clamps for empty input", () => {
    expect(percentile([], 0.5)).toBe(0);
  });
});

describe("splitCsvLine", () => {
  it("handles unquoted fields", () => {
    expect(splitCsvLine("1,Toy Story,Adventure|Animation")).toEqual([
      "1", "Toy Story", "Adventure|Animation",
    ]);
  });

  it("respects quoted fields with commas", () => {
    expect(splitCsvLine('1,"Godfather, The (1972)",Crime|Drama')).toEqual([
      "1", "Godfather, The (1972)", "Crime|Drama",
    ]);
  });

  it("unescapes doubled quotes inside a quoted field", () => {
    expect(splitCsvLine('1,"He said ""hi""",Drama')).toEqual([
      "1", 'He said "hi"', "Drama",
    ]);
  });
});
