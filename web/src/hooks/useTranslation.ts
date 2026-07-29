import { useContext } from "react";
import { LanguageContext, type LanguageContextValue } from "@/context/LanguageContext";

/**
 * Access to the current language and the `t()` helper.
 *
 * Throws rather than falling back to a default locale: a component rendering
 * outside the provider is a wiring mistake, and silently serving English would
 * hide it until someone noticed half a screen in the wrong language.
 */
export function useTranslation(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used inside a <LanguageProvider>");
  }
  return context;
}
