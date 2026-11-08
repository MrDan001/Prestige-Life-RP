-- Rename the built-in TECH role label from PRM to PR Manager.
-- The prior migration removes only the unused manually-created custom PR Manager role.
DO $$
DECLARE
  built_in_count INTEGER;
  conflicting_count INTEGER;
BEGIN
  SELECT count(*) INTO built_in_count
  FROM "Role"
  WHERE name = 'PRM' AND system = true AND kind = 'TECH';

  SELECT count(*) INTO conflicting_count
  FROM "Role"
  WHERE name = 'PR Manager' AND NOT (system = true AND kind = 'TECH');

  IF conflicting_count > 0 THEN
    RAISE EXCEPTION 'Cannot rename built-in PRM role: another PR Manager role still exists';
  END IF;

  IF built_in_count > 1 THEN
    RAISE EXCEPTION 'Cannot rename built-in PRM role: multiple matching built-in roles found';
  END IF;

  UPDATE "Role"
  SET name = 'PR Manager'
  WHERE name = 'PRM' AND system = true AND kind = 'TECH';
END $$;
