import { useEffect, useState } from "react";

/**
 * Returns a value that only updates after `value` has been stable for `delay`
 * milliseconds. Keeps the API from being hit on every keystroke.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
