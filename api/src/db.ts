import { PrismaClient } from "@prisma/client";

/**
 * A single Prisma instance shared across the process.
 *
 * Tests replace this with an in-memory-backed client via `setPrismaForTests`
 * so the whole test file can share one connection and reset it between cases.
 */
let client: PrismaClient = new PrismaClient();

export function getPrisma(): PrismaClient {
  return client;
}

export function setPrismaForTests(next: PrismaClient) {
  client = next;
}
