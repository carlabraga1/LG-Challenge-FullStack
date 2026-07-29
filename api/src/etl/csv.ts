import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

/**
 * Minimal RFC-4180-ish CSV field splitter.
 *
 * MovieLens CSVs quote fields only when they contain a comma (e.g. titles
 * like `"Godfather, The (1972)"`). A naïve `split(",")` corrupts those, so
 * we walk the line respecting double-quote wrapping. Doubled quotes ("")
 * inside a quoted field are treated as a literal quote — the spec-compliant
 * escape.
 *
 * We only handle single-line records; ml-latest-small has no fields with
 * embedded newlines, so a full streaming CSV parser would be overkill.
 */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out;
}

export async function* readCsvRows(
  filePath: string,
): AsyncGenerator<Record<string, string>> {
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let header: string[] | null = null;
  for await (const line of rl) {
    if (!line) continue;
    const cells = splitCsvLine(line);
    if (!header) {
      header = cells;
      continue;
    }
    const row: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) {
      row[header[i]!] = cells[i] ?? "";
    }
    yield row;
  }
}
