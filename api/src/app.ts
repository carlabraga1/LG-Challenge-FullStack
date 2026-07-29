import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { movieRoutes } from "./routes/movies.js";

/**
 * Fastify app factory. Kept separate from `server.ts` so tests can spin up
 * an app instance without binding a port.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      transport:
        process.env.NODE_ENV === "production"
          ? undefined
          : {
              target: "pino-pretty",
              options: { colorize: true, translateTime: "HH:MM:ss" },
            },
    },
  });

  await app.register(cors, { origin: true });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "MovieLens Challenge API",
        version: "1.0.0",
        description:
          "REST API exposing search, top-rated, and popularity queries over the MovieLens ml-latest-small dataset.",
      },
      tags: [
        { name: "movies", description: "Movie queries" },
        { name: "metadata", description: "Reference data (genres, health)" },
      ],
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.get(
    "/health",
    { schema: { tags: ["metadata"], summary: "Liveness check" } },
    async () => ({ status: "ok" }),
  );

  await app.register(movieRoutes);

  return app;
}
