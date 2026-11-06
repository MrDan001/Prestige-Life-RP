-- Active complaints stay OPEN until resolved or dismissed.
UPDATE public."Complaint"
SET "status" = 'OPEN'::"ComplaintStatus"
WHERE "status" = 'IN_REVIEW'::"ComplaintStatus";

-- Replace the generic accused label with distinct reported-player names for all demo complaints.
WITH ranked AS (
  SELECT c."id", ROW_NUMBER() OVER (ORDER BY c."createdAt" DESC, c."id") AS rn
  FROM public."Complaint" c
  WHERE c."demoGroup" IS NOT NULL
), names(ord, name) AS (
  VALUES
    (1, 'Ethan Vale'),
    (2, 'Sofia Bennett'),
    (3, 'Liam Carter'),
    (4, 'Maya Brooks'),
    (5, 'Noah Reed'),
    (6, 'Ava Mitchell'),
    (7, 'Lucas Hayes'),
    (8, 'Isabella Price'),
    (9, 'Mason Cooper'),
    (10, 'Amelia Foster'),
    (11, 'Oliver Ward'),
    (12, 'Chloe Morgan'),
    (13, 'Elijah Ross'),
    (14, 'Grace Turner'),
    (15, 'James Parker'),
    (16, 'Zoe Collins'),
    (17, 'Benjamin Gray'),
    (18, 'Lily Adams'),
    (19, 'Henry Bell'),
    (20, 'Nora Hughes'),
    (21, 'Jack Murphy'),
    (22, 'Aria Kelly'),
    (23, 'Leo Bailey'),
    (24, 'Ella Richardson'),
    (25, 'Samuel Cox'),
    (26, 'Mila Howard'),
    (27, 'Daniel Flores'),
    (28, 'Ruby Sanders'),
    (29, 'Alexander Perry'),
    (30, 'Layla Jenkins'),
    (31, 'Michael Powell'),
    (32, 'Hannah Long'),
    (33, 'Sebastian Bryant'),
    (34, 'Ivy Russell'),
    (35, 'David Griffin'),
    (36, 'Stella Diaz'),
    (37, 'Matthew Barnes'),
    (38, 'Freya Coleman'),
    (39, 'Joseph Simmons'),
    (40, 'Alice Butler'),
    (41, 'Owen Fisher'),
    (42, 'Clara Henderson'),
    (43, 'Gabriel West'),
    (44, 'Naomi Woods'),
    (45, 'Caleb James')
)
UPDATE public."Complaint" c
SET "accusedName" = names.name
FROM ranked
JOIN names ON names.ord = ranked.rn
WHERE c."id" = ranked."id";

-- Add simulated training evidence, clearly distinguished from genuine player evidence.
INSERT INTO public."Evidence" ("id", "complaintId", "kind", "caption", "text", "createdAt")
SELECT
  'demo-evidence-' || c."id",
  c."id",
  'TEXT'::"EvidenceKind",
  'Training evidence (simulated)',
  CASE MOD(ROW_NUMBER() OVER (ORDER BY c."createdAt" DESC, c."id") - 1, 5)
    WHEN 0 THEN 'Training attachment: chat excerpt and timestamp supplied for moderator review.'
    WHEN 1 THEN 'Training attachment: trade history reference and transaction details supplied for verification.'
    WHEN 2 THEN 'Training attachment: gameplay clip description and approximate server timestamp supplied for review.'
    WHEN 3 THEN 'Training attachment: purchase receipt reference and inventory state supplied for verification.'
    ELSE 'Training attachment: moderation conversation excerpt supplied for independent review.'
  END,
  NOW()
FROM public."Complaint" c
WHERE c."demoGroup" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public."Evidence" e WHERE e."complaintId" = c."id");
