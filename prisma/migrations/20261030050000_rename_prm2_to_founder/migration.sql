-- Rename the existing built-in role label only. Preserve all account relations and permissions.
DO $$
DECLARE
  old_role_id TEXT;
  founder_role_id TEXT;
BEGIN
  SELECT "id" INTO old_role_id FROM public."Role" WHERE "name" = 'PRM 2' LIMIT 1;
  SELECT "id" INTO founder_role_id FROM public."Role" WHERE "name" = 'FOUNDER' LIMIT 1;

  IF old_role_id IS NOT NULL AND founder_role_id IS NULL THEN
    UPDATE public."Role" SET "name" = 'FOUNDER' WHERE "id" = old_role_id;
  ELSIF old_role_id IS NOT NULL AND founder_role_id IS NOT NULL THEN
    UPDATE public."Admin" SET "roleId" = founder_role_id WHERE "roleId" = old_role_id;
    DELETE FROM public."Role" WHERE "id" = old_role_id;
  END IF;
END $$;

-- Keep staff-facing title text consistent where the old label was stored directly.
UPDATE public."Admin"
SET "title" = 'FOUNDER'
WHERE "title" = 'PRM 2';
