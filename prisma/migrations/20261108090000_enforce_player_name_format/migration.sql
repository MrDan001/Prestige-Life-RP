-- Normalize legacy player identities to Firstname_lastname, then enforce the format.
-- This preserves the available name text while splitting joined names and padding one-letter segments.
CREATE OR REPLACE FUNCTION pg_temp.normalize_player_name(value text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  candidate text;
  parts text[];
  first_name text;
  last_name text;
BEGIN
  candidate := regexp_replace(trim(coalesce(value, '')), '\s+', '_', 'g');
  candidate := regexp_replace(candidate, '([a-z])([A-Z])', '\1_\2', 'g');
  candidate := regexp_replace(candidate, '[^A-Za-z_]', '_', 'g');
  candidate := regexp_replace(candidate, '_+', '_', 'g');
  candidate := btrim(candidate, '_');

  IF candidate = '' THEN
    RETURN 'Player_Name';
  END IF;

  parts := string_to_array(candidate, '_');
  first_name := regexp_replace(coalesce(parts[1], ''), '[^A-Za-z]', '', 'g');
  last_name := regexp_replace(array_to_string(parts[2:array_length(parts, 1)], ''), '[^A-Za-z]', '', 'g');

  IF first_name = '' THEN first_name := 'Player'; END IF;
  IF last_name = '' THEN last_name := 'Player'; END IF;
  IF length(first_name) = 1 THEN first_name := first_name || lower(first_name); END IF;
  IF length(last_name) = 1 THEN last_name := last_name || lower(last_name); END IF;

  RETURN first_name || '_' || last_name;
END;
$$;

UPDATE "Player"
SET "username" = pg_temp.normalize_player_name("username")
WHERE "username" !~ '^[A-Za-z]{2,}_[A-Za-z]{2,}$';

UPDATE "Complaint"
SET "accusedName" = pg_temp.normalize_player_name("accusedName")
WHERE "accusedName" IS NOT NULL
  AND "accusedName" !~ '^[A-Za-z]{2,}_[A-Za-z]{2,}$';

ALTER TABLE "Player"
  ADD CONSTRAINT "Player_username_name_format_check"
  CHECK ("username" ~ '^[A-Za-z]{2,}_[A-Za-z]{2,}$');

ALTER TABLE "Complaint"
  ADD CONSTRAINT "Complaint_accusedName_name_format_check"
  CHECK ("accusedName" IS NULL OR "accusedName" ~ '^[A-Za-z]{2,}_[A-Za-z]{2,}$');
