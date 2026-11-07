// PATH: lib/db.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";

const { Pool } = pkg;

/**
 * Do not create the database pool at module-import time.
 *
 * Next.js imports route modules while collecting build/page data. Preview
 * deployments may intentionally have no database credentials, and importing
 * a route must not fail the entire build before a request is made. The
 * database is initialized on first actual Prisma access instead.
 *
 * Vercel runs many short-lived serverless instances. Keep one pool/client per
 * warm instance and cap each local pool at one connection. Production
 * DATABASE_URL should use the Supabase transaction pooler (port 6543).
 */
type PrismaGlobal = typeof globalThis & {
  prestigePgPool?: InstanceType<typeof Pool>;
  prestigePrisma?: PrismaClient;
};

const globalForPrisma = globalThis as PrismaGlobal;

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prestigePrisma) {
    return globalForPrisma.prestigePrisma;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required for database-backed Prestige Life RP requests. Configure it for this Vercel environment."
    );
  }

  const pool =
    globalForPrisma.prestigePgPool ??
    new Pool({
      connectionString,
      max: 1,
      min: 0,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      allowExitOnIdle: true,
    });

  if (!globalForPrisma.prestigePgPool) {
    globalForPrisma.prestigePgPool = pool;
  }

  const client = new PrismaClient({ adapter: new PrismaPg(pool) });
  globalForPrisma.prestigePrisma = client;
  return client;
}

/**
 * Preserve existing db.model.method() call sites while deferring environment
 * validation and connection setup until a query is actually used.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
