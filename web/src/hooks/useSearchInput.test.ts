import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSearchInput } from "./useSearchInput";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useSearchInput", () => {
  it("commits once after typing settles, not per keystroke", () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useSearchInput("", commit));

    for (const value of ["m", "ma", "mat", "matr", "matri", "matrix"]) {
      act(() => result.current[1](value));
    }

    // Mid-flight: the input reflects every keystroke, the network sees none.
    expect(result.current[0]).toBe("matrix");
    expect(commit).not.toHaveBeenCalled();

    act(() => void vi.advanceTimersByTime(300));

    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith("matrix");
  });

  it("commits an empty string so clearing the box resets the search", () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useSearchInput("matrix", commit));

    act(() => result.current[1](""));
    act(() => void vi.advanceTimersByTime(300));

    expect(commit).toHaveBeenCalledWith("");
  });

  it("adopts an external change (shared link, Back button, other input)", () => {
    const commit = vi.fn();
    const { result, rerender } = renderHook(
      ({ external }) => useSearchInput(external, commit),
      { initialProps: { external: "" } },
    );

    rerender({ external: "godfather" });

    expect(result.current[0]).toBe("godfather");
  });

  it("does not echo an external change back as a commit", () => {
    const commit = vi.fn();
    const { rerender } = renderHook(
      ({ external }) => useSearchInput(external, commit),
      { initialProps: { external: "" } },
    );

    rerender({ external: "godfather" });
    act(() => void vi.advanceTimersByTime(300));

    expect(commit).not.toHaveBeenCalled();
  });
});
