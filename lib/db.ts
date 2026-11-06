// PATH: lib/db.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";

const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to connect to the Prestige Life RP database.");
}

/**
 * Vercel runs many short-lived serverless instances. A default pg Pool can
 * open up to 10 connections per instance, quickly exhausting Supabase's
 * session-pooler client cap. Reuse one pool/client per warm instance and keep
 * each instance to one connection. Production DATABASE_URL should use the
 * Supabase transaction pooler (port 6543), not session mode (port 5432).
 */
type PrismaGlobal = typeof globalThis & {
  prestigePgPool?: InstanceType<typeof Pool>;
  prestigePrisma?: PrismaClient;
};

const globalForPrisma = globalThis as PrismaGlobal;

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

const adapter = new PrismaPg(pool);

export const db =
  globalForPrisma.prestigePrisma ?? new PrismaClient({ adapter });

// Cache in production too: Vercel reuses warm function instances between requests.
if (!globalForPrisma.prestigePrisma) {
  globalForPrisma.prestigePrisma = db;
}
