-- Rename only the displayed built-in role label.
-- Preserve StaffKind.OWNER so owner authentication, authority and safeguards remain unchanged.
UPDATE "Role"
SET "name" = 'PRM 2'
WHERE "name" = 'Owner'
  AND "kind" = 'OWNER'
  AND NOT EXISTS (SELECT 1 FROM "Role" WHERE "name" = 'PRM 2');
