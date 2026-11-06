-- Convert training examples into ordinary Player and Complaint records.
ALTER TABLE public."Player" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE public."Complaint" ADD COLUMN IF NOT EXISTS "demoGroup" TEXT;
ALTER TABLE public."Complaint" ADD CONSTRAINT "Complaint_demoGroup_check"
  CHECK ("demoGroup" IS NULL OR "demoGroup" IN ('A', 'B', 'C'));
CREATE INDEX IF NOT EXISTS "Complaint_demoGroup_status_createdAt_idx"
  ON public."Complaint" ("demoGroup", "status", "createdAt");
DROP TABLE IF EXISTS public."DemoComp";
DROP TYPE IF EXISTS public."DemoCompStatus";
DROP TYPE IF EXISTS public."DemoCompGroup";
