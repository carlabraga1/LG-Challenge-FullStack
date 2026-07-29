#!/usr/bin/env node
// Downloads and extracts the MovieLens ml-latest-small dataset.
// Cross-platform (Windows/Linux/macOS), zero non-stdlib deps.

import { createWriteStream, existsSync, mkdirSync, rmSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
// OUT_DIR lets the Dockerfile drop the dataset in an absolute path without
// depending on the script's location in the image filesystem.
const DATA_DIR = process.env.OUT_DIR
  ? resolve(process.env.OUT_DIR)
  : join(ROOT, "data");
const ZIP_PATH = join(DATA_DIR, "ml-latest-small.zip");
const EXTRACT_DIR = join(DATA_DIR, "ml-latest-small");
const URL = "https://files.grouplens.org/datasets/movielens/ml-latest-small.zip";

// Sentinel file that proves the extraction completed. Checking for the
// directory alone would misfire if a previous run crashed mid-extract.
const SENTINEL = join(EXTRACT_DIR, "movies.csv");

async function download(url, dest) {
  console.log(`[dataset] downloading ${url}`);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`download failed: ${res.status} ${res.statusText}`);
  await pipeline(res.body, createWriteStream(dest));
  console.log(`[dataset] saved to ${dest}`);
}

function extractZip(zipPath, outDir) {
  console.log(`[dataset] extracting to ${outDir}`);
  // Node has no built-in unzip. Rather than pulling a dep, shell out to what's
  // already on the box: PowerShell on Windows, unzip on Linux/macOS.
  const isWindows = process.platform === "win32";
  const result = isWindows
    ? spawnSync(
        "powershell",
        [
          "-NoProfile",
          "-Command",
          `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${DATA_DIR}' -Force`,
        ],
        { stdio: "inherit" },
      )
    : spawnSync("unzip", ["-o", zipPath, "-d", DATA_DIR], { stdio: "inherit" });

  if (result.status !== 0) {
    throw new Error(`extraction failed (exit ${result.status}). On Linux, install 'unzip'.`);
  }
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  if (existsSync(SENTINEL)) {
    console.log(`[dataset] already present at ${EXTRACT_DIR} — skipping`);
    return;
  }

  if (!existsSync(ZIP_PATH)) {
    await download(URL, ZIP_PATH);
  } else {
    console.log(`[dataset] zip already downloaded, reusing ${ZIP_PATH}`);
  }

  extractZip(ZIP_PATH, DATA_DIR);

  if (!existsSync(SENTINEL)) {
    throw new Error(`extraction finished but ${SENTINEL} is missing`);
  }
  console.log("[dataset] ready");
}

main().catch((err) => {
  console.error("[dataset] ERROR:", err.message);
  process.exit(1);
});
