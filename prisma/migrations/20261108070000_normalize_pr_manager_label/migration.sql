-- Normalize the built-in TECH role label without changing its kind or assignments.
-- If both legacy and canonical rows exist, move assignments before removing the duplicate.
DO $$
DECLARE
  legacy_role_id TEXT;
  canonical_role_id TEXT;
BEGIN
  SELECT "id" INTO legacy_role_id
  FROM public."Role"
  WHERE lower(trim("name")) = 'prm'
  ORDER BY "createdAt" ASC
  LIMIT 1;

  SELECT "id" INTO canonical_role_id
  FROM public."Role"
  WHERE lower(trim("name")) = 'pr manager'
  ORDER BY "createdAt" ASC
  LIMIT 1;

  IF legacy_role_id IS NOT NULL AND canonical_role_id IS NULL THEN
    UPDATE public."Role"
    SET "name" = 'PR Manager'
    WHERE "id" = legacy_role_id;
  ELSIF legacy_role_id IS NOT NULL AND canonical_role_id IS NOT NULL
        AND legacy_role_id <> canonical_role_id THEN
    UPDATE public."Admin"
    SET "roleId" = canonical_role_id
    WHERE "roleId" = legacy_role_id;
    DELETE FROM public."Role"
    WHERE "id" = legacy_role_id;
  END IF;
END $$;

-- Normalize only the old PRM display labels; do not alter role kinds or staff permissions.
UPDATE public."Admin"
SET "title" = 'PR Manager'
WHERE lower(trim("title")) IN ('prm', 'prm (project management)');
