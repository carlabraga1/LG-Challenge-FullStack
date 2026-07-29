import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  dictionaries,
  type Language,
  type TranslationKey,
} from "@/i18n/translations";

const STORAGE_KEY = "movielens.language.v1";

export type Translate = (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string;

export interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  toggle: () => void;
  t: Translate;
  /** BCP-47 tag for Intl formatting (`en-US` / `pt-BR`). */
  localeTag: string;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

function initialLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "pt-BR") return stored;
  // Any Portuguese variant (pt, pt-PT, pt-BR) gets the Portuguese copy.
  return navigator.language.toLowerCase().startsWith("pt") ? "pt-BR" : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    // Keeps the document in sync for screen readers, hyphenation and
    // `:lang()` styling.
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => {
    const dictionary = dictionaries[language];

    const t: Translate = (key, params) => {
      const template = dictionary[key];
      if (!params) return template;
      return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in params ? String(params[name]) : match,
      );
    };

    return {
      language,
      setLanguage,
      toggle: () => setLanguage(language === "en" ? "pt-BR" : "en"),
      t,
      localeTag: dictionary["locale.tag"],
    };
  }, [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
