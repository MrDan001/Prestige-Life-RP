# Prestige Life RP — Deployment Reliability Roadmap

Updated: 30 October 2026

## Incident: failed Vercel builds during admin authentication changes

### Root cause
The failed deployments came from inconsistent intermediate commits during an unfinished admin-authentication transition. Vercel installed dependencies, generated Prisma Client, and reached the Next.js TypeScript build before compilation failed. This was not a Vercel deployment quota or daily-limit failure.

The inspected build logs showed missing bcryptjs in one intermediate commit, Prisma schema/API mismatches around Admin.passwordHash, and a nullable password hash passed directly to bcrypt.compare.

### Recovery and hardening
- [x] Restored a coherent baseline and confirmed a healthy Vercel build.
- [x] Kept existing staff records, role assignments, levels, extra rights, and game-account links.
- [x] Implemented the passwordless staff invitation/session flow on feature branch `feature/passwordless-staff-invitations`.
- [x] Feature branch preview build reached READY at commit `6df9758fca4bfbf4b99c912e3f53bf42685c762c`.

## Stage 2 — Passwordless staff invitations

### Implementation
- [x] Owner-only staff creation by email, name, and role; no password is requested for new staff.
- [x] Cryptographically random, one-use invitations; only SHA-256 hashes are stored.
- [x] Invitations expire after 48 hours; owner can reissue or revoke pending invitations.
- [x] Invitation acceptance creates a 30-day server-registered session.
- [x] Session checks consult the database; owner can revoke all sessions for a staff member.
- [x] Suspension revokes active sessions and pending invitations.
- [x] Legacy password login endpoint returns HTTP 410; /auth now explains invitation-only access.
- [x] Existing Admin/Role data is preserved by additive migrations.
- [x] Updated README and this roadmap.

### Database migrations
- [x] Applied the staff invitation/session migration.
- [x] Applied the session revocation cutoff migration.
- [x] Applied `lock_down_public_app_tables`: RLS enabled on all 14 public application tables and direct table privileges revoked from PUBLIC, anon, and authenticated.
- [x] Verified all 14 tables have RLS enabled; anon/authenticated have no SELECT privilege; table owner remains postgres and FORCE RLS is off.
- [x] Supabase security advisor no longer reports RLS-disabled tables. It reports informational no-policy notices because browser access is intentionally disabled and all app data access is server-side.
- [x] Existing staff and role rows were preserved; the new invitation/session tables were empty before rollout.
- [ ] Verify the deployed Prisma connection can read/write through its production DATABASE_URL after RLS lockdown.

### Deployment and live test gates
- [x] Feature preview build reached READY.
- [ ] Merge the reviewed feature branch to main and deploy production.
- [ ] Verify public homepage and /auth respond correctly.
- [ ] Issue a fresh one-use owner invitation after production deployment; owner must accept it before passwordless admin use.
- [ ] Test invitation acceptance, one-use enforcement, expiry, revocation, logout, suspension, session revocation, and permission preservation with authorized accounts.
- [ ] Confirm non-owner staff cannot create staff, issue invitations, revoke sessions, or access owner-only controls.
- [ ] Review Vercel runtime errors and verify dashboard data access.

### Important operational notes
- Invitation URLs are shown once in the Owner-only Staff interface; no email delivery provider is configured. Share links privately.
- Existing password hashes have not been deleted, but password login is disabled by the new application code.
- The current owner needs a fresh invitation link to enter the passwordless flow. Do not assume an old password will work after cutover.
- The public player-facing domain remains `https://prestige-life-rp.vercel.app`; application admin routes remain protected by application sessions.
- Vercel preview/generated deployment URLs remain behind Vercel Authentication.
- The RLS lockdown intentionally denies browser/API roles direct access to all public application tables. The server uses the private PostgreSQL connection; no broad client policies were added.
