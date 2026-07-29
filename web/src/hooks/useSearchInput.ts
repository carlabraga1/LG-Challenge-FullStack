import { useEffect, useState } from "react";
import { useDebounce } from "./useDebounce";

/**
 * Bridges a text input and the committed search term.
 *
 * The input is local state so typing is never gated on a round trip, and only
 * the debounced value is committed (to the URL, which is what triggers the
 * query) — writing straight through would fire one request per keystroke.
 * `external` flows the other way: when the term changes without the user
 * typing — a shared link, the Back button, a cleared filter — the input
 * follows.
 */
export function useSearchInput(
  external: string,
  commit: (value: string) => void,
  delay = 300,
) {
  const [input, setInput] = useState(external);
  const debounced = useDebounce(input, delay);

  useEffect(() => {
    if (debounced !== external) commit(debounced);
    // Fires on the debounced value only. Including `external` or `commit`
    // would re-run it on every URL change and fight the sync below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => {
    setInput((current) => (current === external ? current : external));
  }, [external]);

  return [input, setInput] as const;
}
