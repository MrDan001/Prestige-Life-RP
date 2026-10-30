-- Rename the existing built-in role label only. Keep kind, levels, rights and account relations intact.
UPDATE public."Role"
SET "name" = 'FOUNDER'
WHERE "name" = 'PRM 2'
  AND NOT EXISTS (SELECT 1 FROM public."Role" WHERE "name" = 'FOUNDER');

-- Keep staff-facing title text consistent where the old label was stored directly.
UPDATE public."Admin"
SET "title" = 'FOUNDER'
WHERE "title" = 'PRM 2';
