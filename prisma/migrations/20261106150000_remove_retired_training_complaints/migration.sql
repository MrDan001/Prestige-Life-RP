-- Permanently remove the retired synthetic complaint set and its orphaned players.
-- Preserve any player account that still has another complaint.
CREATE TEMP TABLE "_retired_complaint_players" ON COMMIT DROP AS
SELECT DISTINCT p."id"
FROM public."Player" p
JOIN public."Complaint" c ON c."playerId" = p."id"
WHERE c."demoGroup" IS NOT NULL;

DELETE FROM public."Evidence" e
USING public."Complaint" c
WHERE e."complaintId" = c."id"
  AND c."demoGroup" IS NOT NULL;

DELETE FROM public."Response" r
USING public."Complaint" c
WHERE r."complaintId" = c."id"
  AND c."demoGroup" IS NOT NULL;

DELETE FROM public."Note" n
USING public."Complaint" c
WHERE n."complaintId" = c."id"
  AND c."demoGroup" IS NOT NULL;

DELETE FROM public."AuditLog" a
WHERE a."targetId" IN (SELECT c."id" FROM public."Complaint" c WHERE c."demoGroup" IS NOT NULL);

DELETE FROM public."Complaint"
WHERE "demoGroup" IS NOT NULL;

DELETE FROM public."Player" p
USING "_retired_complaint_players" retired
WHERE p."id" = retired."id"
  AND NOT EXISTS (
    SELECT 1 FROM public."Complaint" remaining
    WHERE remaining."playerId" = p."id"
  );

ALTER TABLE public."Complaint" DROP COLUMN "demoGroup";
