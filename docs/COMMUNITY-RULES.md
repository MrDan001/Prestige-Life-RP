# Community Rules

- The public community rules are shown at `/rules`.
- Authorized staff manage them from **Admin → Home page settings → Rules Manager**.
- Staff can add, edit, delete, and reorder rules. Changes are published immediately.
- The server enforces the management boundary: Admin level 6 (Chief Admin) and the existing top-tier staff kinds may manage rules. Lower levels cannot manage rules by changing client-side requests.
- Staff presence still uses the existing `INACTIVE` state and activity calculation; the staff interface displays that state as **Offline**.
- The additive Prisma migration is `prisma/migrations/20261030070000_community_rules/migration.sql`. The Rules Manager also initializes only its new `Rule` table and index on the first authorized manager load, so no other application tables are changed.
