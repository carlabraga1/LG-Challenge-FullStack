import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, renderHook, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { LanguageProvider } from "./LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";
import { en, ptBR } from "@/i18n/translations";

function wrapper({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  // The navigator.language spies below are getters — without restoring, the
  // first test that fakes "pt-BR" leaves every later test in Portuguese.
  vi.restoreAllMocks();
});

describe("translations", () => {
  it("defines the same keys in both locales", () => {
    // The type system already enforces this; the test guards against a key
    // being present but left as an untranslated empty string.
    expect(Object.keys(ptBR).sort()).toEqual(Object.keys(en).sort());
    for (const [key, value] of Object.entries(ptBR)) {
      expect(value, `pt-BR value for "${key}"`).not.toBe("");
    }
  });
});

describe("LanguageProvider", () => {
  it("defaults to Portuguese when the browser prefers it", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("pt-BR");
    const { result } = renderHook(() => useTranslation(), { wrapper });
    expect(result.current.language).toBe("pt-BR");
  });

  it("defaults to English for any other browser language", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("fr-FR");
    const { result } = renderHook(() => useTranslation(), { wrapper });
    expect(result.current.language).toBe("en");
  });

  it("prefers a previously stored choice over the browser language", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("pt-BR");
    localStorage.setItem("movielens.language.v1", "en");
    const { result } = renderHook(() => useTranslation(), { wrapper });
    expect(result.current.language).toBe("en");
  });

  it("persists the choice and updates the document language", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });

    act(() => result.current.toggle());

    expect(result.current.language).toBe("pt-BR");
    expect(localStorage.getItem("movielens.language.v1")).toBe("pt-BR");
    expect(document.documentElement.lang).toBe("pt-BR");
  });

  it("interpolates named parameters", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });
    expect(result.current.t("pagination.page", { page: 2, total: 5 })).toBe("Page 2 of 5");
  });

  it("leaves unknown placeholders untouched instead of printing undefined", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });
    expect(result.current.t("pagination.page", { page: 2 })).toBe("Page 2 of {total}");
  });

  it("swaps the whole UI when toggled", async () => {
    const user = userEvent.setup();

    function Probe() {
      const { t, toggle } = useTranslation();
      return (
        <>
          <p>{t("filters.title")}</p>
          <button onClick={toggle}>switch</button>
        </>
      );
    }

    render(<Probe />, { wrapper });
    expect(screen.getByText("Filters")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "switch" }));
    expect(screen.getByText("Filtros")).toBeInTheDocument();
  });

  it("throws when used outside the provider rather than silently defaulting", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useTranslation())).toThrow(/LanguageProvider/);
    spy.mockRestore();
  });
});
