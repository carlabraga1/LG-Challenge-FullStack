import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "movielens.favorites.v1";

/**
 * Favorites live in localStorage — anonymous browsing, no user table, and they
 * survive reloads. Every consumer subscribes to the same module-level listener
 * set, so toggling in one component updates the nav counter instantly.
 */

type Listener = (ids: Set<number>) => void;
const listeners = new Set<Listener>();

function load(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is number => typeof x === "number"));
  } catch {
    return new Set();
  }
}

function persist(ids: Set<number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  for (const listener of listeners) listener(new Set(ids));
}

export function useFavorites() {
  const [ids, setIds] = useState<Set<number>>(load);

  useEffect(() => {
    const listener: Listener = (next) => setIds(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const toggle = useCallback((id: number) => {
    // Read from the store rather than closing over `ids`, so the callback is
    // stable and two rapid toggles can't clobber each other.
    const next = load();
    if (next.has(id)) next.delete(id);
    else next.add(id);
    persist(next);
  }, []);

  const has = useCallback((id: number) => ids.has(id), [ids]);

  return { ids, toggle, has, count: ids.size };
}
