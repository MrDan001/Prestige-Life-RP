-- Add the public community rules collection. No existing tables or data are changed.
CREATE TABLE IF NOT EXISTS public."Rule" (
  "id" TEXT NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "content" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Rule_sortOrder_createdAt_idx"
  ON public."Rule"("sortOrder", "createdAt");
