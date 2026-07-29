// MUST stay first: populates process.env (DATABASE_URL in particular) before
// any module below constructs a PrismaClient at load time.
import "./env.js";
import { buildApp } from "./app.js";
import { runEtl } from "./etl/import.js";
import { MovieService } from "./services/movies.service.js";
import { isTmdbConfigured } from "./services/tmdb.service.js";
import { getPrisma } from "./db.js";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

async function main() {
  // Boot-time ETL. Idempotent — a no-op after the first successful load.
  // Kept here (rather than in a separate init container) so `docker compose
  // up api` is a single command that always yields a ready-to-query API.
  if (process.env.SKIP_ETL !== "1") {
    try {
      await runEtl();
    } catch (err) {
      console.error("[boot] ETL failed:", err);
      process.exit(1);
    }
  }

  const app = await buildApp();
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Swagger UI at http://localhost:${PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Kick off TMDB warm-up in the background — pre-enriches the top popular
  // titles so the Discover page shows posters on first visit. Never blocks
  // startup, never crashes on failure. Skip when TMDB is disabled.
  if (isTmdbConfigured() && process.env.SKIP_TMDB_WARMUP !== "1") {
    const warmupSize = Number(process.env.TMDB_WARMUP_SIZE ?? 500);
    void warmTmdb(app.log, warmupSize).catch((err) =>
      app.log.warn({ err }, "[tmdb] warm-up failed"),
    );
  }
}

async function warmTmdb(log: { info: (o: object | string, m?: string) => void }, size: number) {
  const service = new MovieService(getPrisma());
  const ids = await service.popularIds(size);
  log.info(`[tmdb] warming cache for top ${ids.length} popular movies (background)`);
  const started = Date.now();
  const { enriched, skipped } = await service.warmTmdbCache(ids);
  log.info(
    `[tmdb] warm-up done in ${Math.round((Date.now() - started) / 1000)}s — ` +
      `enriched ${enriched}, already cached ${skipped}`,
  );
}

main();
