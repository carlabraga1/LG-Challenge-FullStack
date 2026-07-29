import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement, ReactNode } from "react";
import { LanguageProvider } from "@/context/LanguageContext";
import type { Language } from "@/i18n/translations";

interface Options extends Omit<RenderOptions, "wrapper"> {
  /** Seeds the stored language before the provider reads it. */
  language?: Language;
  /** Initial history entry for components that use router hooks. */
  route?: string;
}

/**
 * Renders inside the providers every component in this app assumes: the router
 * (for <Link>) and the language context (for `t`).
 */
export function renderWithProviders(
  ui: ReactElement,
  { language = "en", route = "/", ...options }: Options = {},
) {
  localStorage.setItem("movielens.language.v1", language);

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <LanguageProvider>{children}</LanguageProvider>
      </MemoryRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
