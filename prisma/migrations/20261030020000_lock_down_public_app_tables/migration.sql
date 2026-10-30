-- Lock down all public application tables from Supabase Data API roles.
-- The Next.js server uses Prisma with the private PostgreSQL DATABASE_URL.
-- No browser-facing table policies are required; application access stays server-side.
ALTER TABLE public."Admin" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Admin" FROM PUBLIC, anon, authenticated;
ALTER TABLE public."AdminInvitation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."AdminInvitation" FROM PUBLIC, anon, authenticated;
ALTER TABLE public."AdminSession" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."AdminSession" FROM PUBLIC, anon, authenticated;
ALTER TABLE public."Category" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Category" FROM PUBLIC, anon, authenticated;
ALTER TABLE public."Player" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Player" FROM PUBLIC, anon, authenticated;
ALTER TABLE public."Complaint" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Complaint" FROM PUBLIC, anon, authenticated;
ALTER TABLE public."Response" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Response" FROM PUBLIC, anon, authenticated;
ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."AuditLog" FROM PUBLIC, anon, authenticated;
ALTER TABLE public."LinkCode" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."LinkCode" FROM PUBLIC, anon, authenticated;
ALTER TABLE public."Note" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Note" FROM PUBLIC, anon, authenticated;
ALTER TABLE public."ResponseTemplate" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."ResponseTemplate" FROM PUBLIC, anon, authenticated;
ALTER TABLE public."Evidence" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Evidence" FROM PUBLIC, anon, authenticated;
ALTER TABLE public."SiteSetting" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."SiteSetting" FROM PUBLIC, anon, authenticated;
ALTER TABLE public."Role" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Role" FROM PUBLIC, anon, authenticated;
