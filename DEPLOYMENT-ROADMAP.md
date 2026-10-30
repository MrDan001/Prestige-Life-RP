# Prestige Life RP — Deployment Reliability Roadmap

Updated: 30 October 2026

## Incident: failed Vercel builds during admin authentication changes

### Root cause
The failed deployments came from inconsistent intermediate commits during an unfinished admin-authentication transition. Vercel installed dependencies, generated Prisma Client, and reached the Next.js TypeScript build before compilation failed. This was not a Vercel deployment quota or daily-limit failure.

The inspected build logs showed missing bcryptjs in one intermediate commit, Prisma schema/API mismatches around Admin.passwordHash, and a nullable password hash passed directly to bcrypt.compare.

### Recovery and hardening
- [x] Restored a coherent baseline and confirmed a healthy Vercel build.
- [x] Kept existing staff records, role assignments, levels, extra rights, and game-account links.
- [x] Implemented the passwordless staff invitation/session flow.
- [x] Feature preview build reached READY at the final PR head.
- [x] Merged PR #1 to main (merge commit `afbe39ff10e39a71af2b72fa6b2faa5b27240046`).

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
- [x] README and this roadmap updated.

### Stage 3 — WebAuthn passkeys (in progress)

### Design
- [x] Use WebAuthn passkeys; no Resend, SendGrid, SMS, password, or external email delivery is involved.
- [x] Add per-staff passkey credentials and short-lived, one-use registration/authentication challenges.
- [x] Invitation acceptance routes new staff to passkey enrollment.
- [x] `/auth` now supports email + device passkey sign-in.
- [x] Dashboard navigation redirects staff without an enrolled passkey to profile setup.
- [x] Staff can add multiple passkeys and cannot accidentally remove their last one.
- [ ] Confirm dependency installation and a successful Vercel preview build.
- [ ] Test passkey enrollment and subsequent sign-in on Android Chrome and at least one desktop browser.
- [ ] Test replayed/expired challenges, suspended accounts, revoked sessions, and wrong-origin responses.
- [ ] Add owner-controlled passkey reset/recovery for a staff member who loses all registered devices.
- [ ] Verify production domain RP ID and origin; configure `WEBAUTHN_RP_ID` / `WEBAUTHN_ORIGIN` only if the production hostname changes.

## Database migrations and security
- [x] Applied the staff invitation/session migration.
- [x] Applied the session revocation cutoff migration.
- [x] Applied `lock_down_public_app_tables`: RLS enabled on all 14 public application tables and direct table privileges revoked from PUBLIC, anon, and authenticated.
- [x] Verified all 14 tables have RLS enabled; anon/authenticated have no SELECT privilege; table owner remains postgres and FORCE RLS is off.
- [x] Supabase security advisor no longer reports RLS-disabled tables. It reports informational no-policy notices because browser access is intentionally disabled and app access is server-side.
- [x] Existing staff and role rows were preserved.

### Production navigation correction — 30 October 2026
- [x] Updated `/auth` to validate the current database-backed staff session and redirect authenticated staff directly to `/admin`.
- [x] Kept the invitation-only instructions visible for visitors without a valid session.
- [ ] Verify direct `/auth` navigation redirects the owner to the dashboard on the latest production deployment.

### Production UI correction — 30 October 2026
- [x] Live owner screenshot exposed a leftover password input in the Add Staff form despite the passwordless API.
- [x] Removed the password field; the form now sends only name, email, role, and applicable level.
- [x] Updated successful creation handling to display the one-use invitation URL and expiry immediately, with copy/revoke controls.
- [ ] Verify the corrected Add Staff form and invite flow on the new production deployment.

### Deployment status
- [x] Preview build READY for the final PR code.
- [x] PR #1 merged to `main`.
- [x] Production deployment READY: `dpl_83U9emKcNcZPdoJoi9Zp5cGKPFpK`.
- [x] Production deployment commit: `afbe39ff10e39a71af2b72fa6b2faa5b27240046`.
- [x] Confirmed `prestige-life-rp.vercel.app` remains a verified project domain.
- [x] Checked Vercel runtime errors for the new deployment; none were reported in the initial 30-minute window.
- [ ] Confirm from a real browser that the public homepage and /auth load on the production domain.
- [ ] Owner accepts the separately issued one-use owner invitation and confirms dashboard access.
- [ ] Verify production Prisma DATABASE_URL read/write access through authenticated app actions.
- [ ] Test invitation acceptance, one-use enforcement, expiry, revocation, logout, suspension, session revocation, and permission preservation with authorized accounts.
- [ ] Confirm non-owner staff cannot create staff, issue invitations, revoke sessions, or access owner-only controls.

### Important operational notes
- Invitation URLs are shown once in the Owner-only Staff interface; no email delivery provider is configured. Share links privately.
- A fresh one-use owner invitation has been issued separately from the repository. It expires after 48 hours and must be kept private.
- Existing password hashes have not been deleted, but password login is disabled by the new application code.
- The public player-facing domain remains `https://prestige-life-rp.vercel.app`; application admin routes remain protected by application sessions.
- Vercel preview/generated deployment URLs remain behind Vercel Authentication.
- The RLS lockdown intentionally denies browser/API roles direct access to all public application tables. No broad client policies were added.
