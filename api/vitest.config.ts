import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    // globalSetup wipes/reseeds the SQLite test DB once per run. Because
    // `test.env.DATABASE_URL` is injected before any test file is imported,
    // Prisma picks up the test DB even though it's instantiated at module
    // load time.
    globalSetup: ["./tests/globalSetup.ts"],
    env: {
      // SQLite URLs in Prisma are resolved relative to the schema.prisma
      // file (i.e. `api/prisma/`), NOT the process cwd.
      DATABASE_URL: "file:./test.db",
      NODE_ENV: "test",
      SKIP_ETL: "1",
      LOG_LEVEL: "silent",
    },
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
