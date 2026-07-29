import { useEffect, useState } from "react";

const STORAGE_KEY = "movielens.theme.v1";
type Theme = "dark" | "light";

function initialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Persists the theme and toggles the `dark` class on <html> — the class the
 * token block in index.css and Tailwind's `dark:` variant both key off.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return {
    theme,
    isDark: theme === "dark",
    toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
  };
}
