-- Remove only the unused, manually-created PR Manager custom role.
-- Built-in roles and all staff assignments are deliberately left untouched.
DO $$
DECLARE
  target_role_id TEXT;
  assigned_count INTEGER;
BEGIN
  SELECT id INTO target_role_id
  FROM "Role"
  WHERE lower(trim(name)) = 'pr manager'
    AND system = false
  LIMIT 1;

  IF target_role_id IS NOT NULL THEN
    SELECT count(*) INTO assigned_count
    FROM "Admin"
    WHERE "roleId" = target_role_id;

    IF assigned_count <> 0 THEN
      RAISE EXCEPTION 'Cannot remove PR Manager role: % staff account(s) are still assigned', assigned_count;
    END IF;

    DELETE FROM "Role" WHERE id = target_role_id;
  END IF;
END $$;
