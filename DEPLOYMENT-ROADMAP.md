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
- [x] Added owner-controlled passkey reset/recovery: revoke all sessions, delete the staff member's passkeys, and issue a one-use recovery invitation.
- [ ] Test the recovery flow end-to-end with a non-owner staff account.
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


## Staff account deletion controls — 30 October 2026
- [x] Added a clearly marked **Delete staff** action to every manageable staff card in the owner Staff page, alongside Suspend/Restore.
- [x] Added an owner-only DELETE API on `/api/admin/admins/[id]`; non-owner requests are rejected server-side.
- [x] Prevented deletion of owner accounts and the currently signed-in owner account.
- [x] Added a destructive confirmation naming the staff member and explaining which account-owned records will be removed.
- [x] Deletion transaction removes the staff member's invitations, sessions, passkeys, complaint responses, internal notes, and audit entries to satisfy existing restrictive foreign keys.
- [x] Complaint records are retained; accused/claimed staff references are cleared by the schema's SET NULL relations.
- [x] README and this roadmap updated.
- [ ] Run a production build and test owner delete, non-owner denial, owner protection, and retained complaint behavior before merging.


## Role label update — 30 October 2026
- [x] Rename the displayed built-in **Tech** role to **PRM (Project Management)**.
- [x] Keep the underlying `StaffKind.TECH` enum value unchanged; all permissions, authorization checks, role level, and behavior remain unchanged.
- [x] Add an idempotent database migration to rename the existing role record and any staff display titles from Tech to PRM.
- [x] Update the seed role name so future seed runs use PRM.
- [x] Update README and this roadmap.
- [ ] Confirm the production Roles and Staff screens show PRM after deployment.


## Built-in Owner role display label — 30 October 2026
- [x] Rename the built-in role's displayed name from **Owner** to **FOUNDER**.
- [x] Preserve the underlying `StaffKind.OWNER` kind, full owner permissions, authentication, and owner-only safeguards.
- [x] Keep the owner-account Staff directory hiding change from PR #5 intact.
- [x] Add a database migration and update the Prisma seed role name.
- [x] Update README and this roadmap.
- [ ] Verify FOUNDER appears in the Roles interface after deployment and that owner-only authorization remains unchanged.


## Owner roster privacy correction — 30 October 2026
- [x] Reapply the `kind != OWNER` filter directly in the staff-directory GET query on current main.
- [x] Ensure no OWNER account row or email is included in the staff roster response for any viewer.
- [x] Preserve `/api/admin/me` so the signed-in user can still see their own session identity in the top account panel; that is not a roster disclosure to other staff.
- [x] Update README and this roadmap.
- [ ] Confirm preview and production roster API responses contain no OWNER records.


## Private primary owner account — 30 October 2026
- [x] Identify the primary owner account by its immutable database Admin ID, not editable role, title, name, or email display fields.
- [x] Exclude only that primary account from the Staff roster for every viewer; FOUNDER and other legitimate staff accounts remain visible.
- [x] Block staff-management API operations against the primary account (role changes, suspension, deletion, invitation replacement, passkey reset, and session revocation).
- [x] Preserve normal passkey sign-in for the primary owner and preserve each staff member's own session identity in their own account header.
- [x] Keep the Owner/FOUNDER role and its authorization model unchanged for other accounts.
- [x] Update README and this roadmap.
- [ ] Verify the production Staff roster response contains no primary-owner account ID, name, or email.
- [ ] Verify the primary owner can still sign in with an already-registered passkey and other staff can still sign in normally.


## Admin workspace and complaint lifecycle update — 30 October 2026
- [x] Remove the shared sign-out button from the admin layout/account panel.
- [x] Add the self sign-out action to My Profile only, using the existing revocable logout endpoint.
- [x] Keep all admin routes in desktop layout: fixed desktop workspace minimum width, no admin mobile media-query transformations, and an admin-only 1200px viewport request that restores the public site's original viewport when leaving admin.
- [x] Add separate **Active** and **History** complaint queue tabs.
- [x] Default the Active queue to OPEN and IN_REVIEW only; History contains RESOLVED and DISMISSED only, with optional status filters.
- [x] On closure by manual status or judgment outcome, automatically move the selected complaint into History.
- [x] Enforce closed status server-side: closed cases reject replies, judgment drafts, notes, claim/release actions, and further status changes.
- [x] Allow only top-tier accounts (OWNER, TECH/PRM, DEVELOPER) to explicitly reopen a closed case to OPEN or IN_REVIEW; the case returns to Active and requires a separate response action.
- [x] Make complaint state updates and reply creation atomic to avoid a closed case being saved without its submitted response.
- [x] Update README and this roadmap.
- [ ] Run Vercel preview build; verify TypeScript and production build before promotion.
- [ ] Test Active/History queue routing, close by status, close by judgment, non-top-tier reopen denial, top-tier reopen, and reply-after-reopen behavior.
- [ ] Test that sign out appears only on My Profile and desktop navigation remains intact on Android and desktop browsers.


## Staff presence and invitation tracking — 30 October 2026
- [x] Add Admin.lastSeenAt and the 20261030040000_staff_activity_presence SQL migration.
- [x] Record authenticated website visits through /api/admin/me; refresh presence every 60 seconds while the admin tab is visible.
- [x] Include latest invitation acceptance state in the staff roster. Unaccepted invitations display **Pending**, including revoked invitations where the person has never accepted an invitation.
- [x] Derive complaint activity from audit records for transitions to RESOLVED or DISMISSED.
- [x] Show **Active** (green) when a visit or complaint closure/dismissal occurred in the last 24 hours; **Inactive** (gray) when neither occurred in 24 hours.
- [x] Show **Suspended** (red) regardless of activity; show **Pending** (gold) for staff who have not accepted their invitation.
- [x] Add staff-directory filters for Active, Pending, Suspended and Inactive.
- [x] Update README and this roadmap.
- [ ] Run npx prisma migrate deploy against the local test database, then npx prisma generate.
- [ ] Run npm run build and verify the four status colors, invitation acceptance transition, heartbeat refresh, and 24-hour boundary locally.
- [ ] Confirm existing owner identity privacy and staff permissions remain unchanged.


## Built-in role label update — 30 October 2026
- [x] Rename the built-in top-tier role display label from **PRM 2** to **FOUNDER**.
- [x] Preserve the underlying OWNER kind, full permissions, primary-owner privacy protections, authentication, and authorization behavior.
- [x] Add an additive SQL migration to rename the existing role record and any matching staff display titles without deleting or recreating staff accounts.
- [x] Update the Prisma seed role name so future seed runs use FOUNDER.
- [x] Update README and this roadmap.
- [ ] Verify the Roles and Staff screens show FOUNDER after the migration and deployment.


## Admin role selector and branded confirmation dialogs — 30 October 2026
- [x] Replace the Android/browser-native role dropdown in Add Staff and staff profile editing with a branded accessible role picker.
- [x] Show each role's name, level range or top-tier description, and selected state in the custom menu.
- [x] Replace browser-native "site says" confirmations for passkey reset, staff deletion, sign-out-all-devices, and profile logout with branded in-app confirmation dialogs.
- [x] Use a consistent dark Prestige Life dialog with clear action labels, cancel controls, keyboard Escape handling, and busy-state protection.
- [x] Confirm production Role table now contains FOUNDER (kind OWNER) and PRM (kind TECH); no PRM 2 role row remains. PRM remains a separate Project Management role as previously specified.
- [x] Keep underlying permissions, role levels, owner privacy, and staff account assignments unchanged.
- [x] Update README and this roadmap.
- [ ] Verify custom dropdown, all confirmation dialogs, and FOUNDER/PRM role names on local dev server and Android Chrome.
- [ ] Run npm build and deploy only after local verification.
