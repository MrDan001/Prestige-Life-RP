-- Rename the displayed Tech role to PRM (Project Management).
-- Keep the underlying StaffKind enum value TECH unchanged so permissions and
-- existing account authorization behavior remain exactly the same.
UPDATE "Role"
SET "name" = 'PRM'
WHERE "name" = 'Tech'
  AND NOT EXISTS (SELECT 1 FROM "Role" existing WHERE existing."name" = 'PRM');

UPDATE "Admin"
SET "title" = 'PRM'
WHERE lower("title") = 'tech';
