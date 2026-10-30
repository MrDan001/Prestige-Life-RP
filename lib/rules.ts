import { db } from "@/lib/db";

/**
 * Create only the new rules storage when an authorized manager opens the Rules Manager.
 * This makes the additive schema change safe to roll out without db-pushing unrelated
 * models. The matching Prisma migration remains the canonical deployment migration.
 */
export async function ensureRuleStorage() {
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS public."Rule" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
  )`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Rule_sortOrder_createdAt_idx"
    ON public."Rule"("sortOrder", "createdAt")`);
}
