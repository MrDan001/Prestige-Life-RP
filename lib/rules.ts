import { db } from "@/lib/db";

/** Create/upgrade only the public rules storage; safe to call repeatedly. */
export async function ensureRuleStorage() {
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS public."Rule" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(32),
    "title" VARCHAR(120) NOT NULL,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
  )`);
  await db.$executeRawUnsafe(`ALTER TABLE public."Rule" ADD COLUMN IF NOT EXISTS "code" VARCHAR(32)`);
  await db.$executeRawUnsafe(`WITH missing_codes AS (
    SELECT "id",
      'RULE-' || LPAD(ROW_NUMBER() OVER (ORDER BY "sortOrder", "createdAt", "id")::TEXT, 3, '0') AS generated_code
    FROM public."Rule"
    WHERE "code" IS NULL OR BTRIM("code") = ''
  )
  UPDATE public."Rule" AS rule
  SET "code" = missing_codes.generated_code
  FROM missing_codes
  WHERE rule."id" = missing_codes."id"`);
  await db.$executeRawUnsafe(`ALTER TABLE public."Rule" ALTER COLUMN "code" SET NOT NULL`);
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Rule_code_key" ON public."Rule"("code")`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Rule_sortOrder_createdAt_idx" ON public."Rule"("sortOrder", "createdAt")`);
}
