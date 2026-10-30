-- Staff website presence heartbeat.
ALTER TABLE public."Admin" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Admin_lastSeenAt_idx" ON public."Admin"("lastSeenAt");
