# ---------- builder ----------
FROM node:22-slim AS builder
WORKDIR /app

# openssl for Prisma engines, unzip for the dataset script, ca-certificates for TLS.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates unzip \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies (leverages Docker layer cache).
COPY api/package.json ./
RUN npm install --no-audit --no-fund

# Prisma client depends on the schema, so copy it before generating.
COPY api/prisma ./prisma
RUN npx prisma generate

# Compile TypeScript.
COPY api/tsconfig.json api/tsconfig.build.json ./
COPY api/src ./src
RUN npm run build

# Bake the dataset into the image so the container is self-contained.
COPY scripts/download-dataset.mjs /tmp/download-dataset.mjs
RUN OUT_DIR=/data node /tmp/download-dataset.mjs

# ---------- runtime ----------
FROM node:22-slim AS runner
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    DATABASE_URL="file:/data/db/dev.db" \
    DATASET_DIR="/data/ml-latest-small" \
    PORT=3000 \
    HOST=0.0.0.0

# Prisma needs the schema at runtime for `migrate deploy` to apply migrations
# against the target database, so we carry `prisma/` into the runner.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /data /data

# Directory for the SQLite file. Kept outside /app so a bind-mounted volume
# can persist it without shadowing application code.
RUN mkdir -p /data/db

EXPOSE 3000

# migrate deploy is idempotent; ETL is idempotent — safe to run every boot.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
