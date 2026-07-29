import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { LoadingIndicator } from "./LoadingIndicator";
import { renderWithProviders } from "@/test/renderWithProviders";

beforeEach(() => {
  localStorage.clear();
});

describe("LoadingIndicator", () => {
  it("exposes itself as a status region so screen readers announce it", () => {
    renderWithProviders(<LoadingIndicator />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("accepts a caller-supplied label", () => {
    renderWithProviders(<LoadingIndicator label="Updating…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Updating…");
  });

  it("falls back to the translated default", () => {
    renderWithProviders(<LoadingIndicator />, { language: "pt-BR" });
    expect(screen.getByRole("status")).toHaveTextContent("Carregando…");
  });

  it("carries its meaning in text, not only in the spinner", () => {
    // Under prefers-reduced-motion the spin is frozen, so the label has to be
    // the thing that communicates.
    const { container } = renderWithProviders(<LoadingIndicator label="Searching…" />);
    expect(container.textContent).toContain("Searching…");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
