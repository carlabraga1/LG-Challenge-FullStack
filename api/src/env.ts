/**
 * Runtime environment bootstrap.
 *
 * Solves two problems a fresh clone hits, both of which kill the API at boot:
 *
 * 1. `@prisma/client` only resolves `env("DATABASE_URL")` from a `.env` file
 *    that existed when the client was *generated*. On a fresh clone `npm
 *    install` triggers `prisma generate` before anyone has copied
 *    `.env.example`, so the generated client comes up with no datasource URL
 *    and the process dies with "Environment variable not found: DATABASE_URL"
 *    — even though `.env` is sitting right there by the time you run it.
 * 2. A reviewer who never copies `.env.example` at all should still get a
 *    working API rather than a stack trace.
 *
 * So we read `api/.env` ourselves when it exists, filling only keys that are
 * not already set (so real environment variables and Docker Compose always
 * win), then apply defaults matching `.env.example`.
 *
 * Imported purely for its side effect, and it must be the FIRST import in any
 * entrypoint that touches Prisma: `new PrismaClient()` runs at module-load
 * time, so anything later is too late.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// api/src/env.ts in dev (tsx) and api/dist/env.js in prod — ".." is the api
// root either way.
const API_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadDotenv(file: string): void {
  if (!existsSync(file)) return;

  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    if (key === "" || process.env[key] !== undefined) continue;

    let value = line.slice(eq + 1).trim();
    const quoted =
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")));
    if (quoted) value = value.slice(1, -1);

    process.env[key] = value;
  }
}

loadDotenv(resolve(API_ROOT, ".env"));

// Defaults mirror .env.example. Prisma resolves a relative `file:` URL against
// the schema directory (api/prisma), which is why this is "./dev.db" and not
// "./prisma/dev.db".
if (process.env.DATABASE_URL === undefined) {
  process.env.DATABASE_URL = "file:./dev.db";
}

// Absolute, so the ETL finds the dataset regardless of the working directory
// the API was started from.
if (process.env.DATASET_DIR === undefined) {
  process.env.DATASET_DIR = resolve(API_ROOT, "../data/ml-latest-small");
}
