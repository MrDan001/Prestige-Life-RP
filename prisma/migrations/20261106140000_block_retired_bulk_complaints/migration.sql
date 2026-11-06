-- Prevent the still-deployed legacy endpoint from recreating the retired synthetic set.
CREATE OR REPLACE FUNCTION public.block_retired_bulk_complaints()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."demoGroup" IS NOT NULL THEN
    RAISE EXCEPTION 'Bulk complaint generation has been retired.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "block_retired_bulk_complaints" ON public."Complaint";
CREATE TRIGGER "block_retired_bulk_complaints"
BEFORE INSERT OR UPDATE OF "demoGroup" ON public."Complaint"
FOR EACH ROW
EXECUTE FUNCTION public.block_retired_bulk_complaints();
