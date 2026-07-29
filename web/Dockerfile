# ---------- builder ----------
FROM node:22-slim AS builder
WORKDIR /app

COPY web/package.json ./
RUN npm install --no-audit --no-fund

COPY web/tsconfig.json web/tsconfig.node.json web/vite.config.ts web/index.html ./
COPY web/src ./src

RUN npm run build

# ---------- runtime ----------
FROM nginx:1.27-alpine AS runner

COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
