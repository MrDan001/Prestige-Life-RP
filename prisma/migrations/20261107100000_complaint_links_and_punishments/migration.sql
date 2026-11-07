-- Rule codes support precise rule references in complaint judgments.
ALTER TABLE public."Rule" ADD COLUMN IF NOT EXISTS "code" VARCHAR(32);

WITH missing_codes AS (
  SELECT "id",
    'RULE-' || LPAD(ROW_NUMBER() OVER (ORDER BY "sortOrder", "createdAt", "id")::TEXT, 3, '0') AS generated_code
  FROM public."Rule"
  WHERE "code" IS NULL OR BTRIM("code") = ''
)
UPDATE public."Rule" AS rule
SET "code" = missing_codes.generated_code
FROM missing_codes
WHERE rule."id" = missing_codes."id";

ALTER TABLE public."Rule" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Rule_code_key" ON public."Rule"("code");

ALTER TABLE public."Response"
  ADD COLUMN IF NOT EXISTS "ruleCode" TEXT,
  ADD COLUMN IF NOT EXISTS "punishmentType" TEXT,
  ADD COLUMN IF NOT EXISTS "punishmentDuration" TEXT;

CREATE TABLE IF NOT EXISTS public."PunishmentOption" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(60) NOT NULL,
  "durationOptions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PunishmentOption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PunishmentOption_name_key" ON public."PunishmentOption"("name");
CREATE INDEX IF NOT EXISTS "PunishmentOption_active_sortOrder_idx" ON public."PunishmentOption"("active", "sortOrder");

INSERT INTO public."PunishmentOption"
  ("id", "name", "durationOptions", "sortOrder", "active", "createdAt", "updatedAt")
VALUES
  ('punishment-ban', 'Ban', ARRAY['3 days', '7 days', '30 days', '60 days', '90 days']::TEXT[], 0, TRUE, NOW(), NOW()),
  ('punishment-jailed', 'Jailed', ARRAY['30 mins', '60 mins', '120 mins', '180 mins']::TEXT[], 1, TRUE, NOW(), NOW()),
  ('punishment-mute', 'Mute', ARRAY['30 mins', '60 mins', '120 mins', '180 mins']::TEXT[], 2, TRUE, NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;
