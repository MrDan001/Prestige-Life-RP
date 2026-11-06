-- Separate training/demo complaint queue. No foreign keys to live players or complaints.
CREATE TYPE public."DemoCompGroup" AS ENUM ('A', 'B', 'C');
CREATE TYPE public."DemoCompStatus" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE public."DemoComp" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "playerName" TEXT NOT NULL,
  "playerGameId" TEXT NOT NULL,
  "playerCountry" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "assignedGroup" public."DemoCompGroup" NOT NULL,
  "status" public."DemoCompStatus" NOT NULL DEFAULT 'OPEN',
  "closedById" TEXT,
  "closedByName" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DemoComp_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DemoComp_reference_key" ON public."DemoComp"("reference");
CREATE INDEX "DemoComp_assignedGroup_status_submittedAt_idx" ON public."DemoComp"("assignedGroup", "status", "submittedAt");
