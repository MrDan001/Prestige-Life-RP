-- Short, stable public case references. Existing internal CUIDs remain unchanged.
CREATE OR REPLACE FUNCTION public.generate_complaint_public_id()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  candidate TEXT;
BEGIN
  LOOP
    SELECT string_agg(substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', floor(random() * 36)::INTEGER + 1, 1), '')
      INTO candidate
      FROM generate_series(1, 6);
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public."Complaint" WHERE "publicId" = candidate
    );
  END LOOP;
  RETURN candidate;
END;
$$;

ALTER TABLE public."Complaint" ADD COLUMN IF NOT EXISTS "publicId" TEXT;

DO $$
DECLARE
  complaint_row RECORD;
  candidate TEXT;
BEGIN
  FOR complaint_row IN
    SELECT "id" FROM public."Complaint" WHERE "publicId" IS NULL OR "publicId" = ''
  LOOP
    candidate := public.generate_complaint_public_id();
    UPDATE public."Complaint" SET "publicId" = candidate WHERE "id" = complaint_row."id";
  END LOOP;
END;
$$;

ALTER TABLE public."Complaint"
  ALTER COLUMN "publicId" SET DEFAULT public.generate_complaint_public_id(),
  ALTER COLUMN "publicId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Complaint_publicId_key" ON public."Complaint"("publicId");
