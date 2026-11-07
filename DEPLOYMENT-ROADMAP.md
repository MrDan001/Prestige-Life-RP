# Prestige Life RP — Deployment Reliability Roadmap

Updated: 6 November 2026

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
- [x] Staff creation by authorized staff managers using email, name, and an eligible role/level; no password is requested for new staff.
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
- Invitation URLs are shown once in the Staff interface to the creator and authorized staff managers; no email delivery provider is configured. Share links privately.
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
- [x] Default the Active queue to OPEN only; History contains RESOLVED and DISMISSED only, with optional closed-status filters.
- [x] On closure by manual status or judgment outcome, automatically move the selected complaint into History.
- [x] Enforce closed status server-side: closed cases reject replies, judgment drafts, notes, claim/release actions, and further status changes.
- [x] Allow only top-tier accounts (OWNER, TECH/PRM, DEVELOPER) to explicitly reopen a closed case to OPEN; the case returns to Active and requires a separate claim before further action.
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


## Delegated staff recruitment and permission governance — 30 October 2026
- [x] Add a direct **Manage Staff** permission; rank alone does not grant staff recruitment access, including level 6, PRM, or Developer.
- [x] Add a separate **Grant Staff Permissions** permission for granting/revoking staff rights.
- [x] Keep the Owner as the permanent authority for staff and permission management; the Owner can grant or revoke both permissions on eligible staff accounts.
- [x] Allow delegated managers to create admin accounts, assign only permitted admin levels/roles, and issue/replace/revoke private invitations for accounts below their authority.
- [x] Prevent delegated managers from changing their own permissions, managing equal/higher-ranked staff, assigning top-tier roles, or granting rights through reusable role definitions.
- [x] Keep passkey resets, permanent staff deletion, and role-definition management Owner-only.
- [x] Record permission grants/revocations in the audit log with actor, target, before/after rights, and timestamp.
- [ ] Run the Vercel preview build and test Owner, delegated PRM/Chief Admin, Developer without delegation, and unprivileged admin scenarios before merging.


## Built-in role label update — 30 October 2026
- [x] Rename the built-in top-tier role display label from **PRM 2** to **FOUNDER**.
- [x] Preserve the underlying OWNER kind, full permissions, primary-owner privacy protections, authentication, and authorization behavior.
- [x] Add an additive SQL migration to rename the existing role record and any matching staff display titles without deleting or recreating staff accounts.
- [x] Update the Prisma seed role name so future seed runs use FOUNDER.
- [x] Update README and this roadmap.
- [ ] Verify the Roles and Staff screens show FOUNDER after the migration and deployment.

 
## Production incident — Supabase connection exhaustion on /auth (6 November 2026)

### Confirmed root cause
- [x] Vercel runtime error digest `3909642681` traced to Prisma `P2039` / Supabase `EMAXCONNSESSION`.
- [x] The failing operation was `prisma.adminSession.findUnique()` during `GET /auth`; the same exhaustion affected `/api/admin/me` and complaint APIs.
- [x] Supabase reported the session-mode pooler client ceiling of 15 had been reached.
- [x] Inspected `lib/db.ts`: a new `pg.Pool` was created at module scope with the default maximum of 10 connections, and Prisma was cached only outside production.

### Code mitigation
- [x] Cache the PostgreSQL pool and Prisma client on `globalThis` in production and development.
- [x] Limit each warm Vercel function instance to one PostgreSQL client connection.
- [x] Set finite connection and idle timeouts to prevent requests waiting indefinitely.
- [x] Keep the application database URL server-only.
- [x] Update README and this roadmap.

### Required production connection setting and verification
- [ ] Replace Vercel Production `DATABASE_URL` with the Supabase **Transaction pooler** URI for project `bcximvygqxqnbghbghmd` (host pattern `aws-<region>.pooler.supabase.com`, port `6543`, database `postgres`, username `postgres.<project-ref>`). Preserve the existing database password; do not paste it into source control or chat.
- [ ] Include `connection_limit=1` in the URI; ensure the connection library is compatible with transaction mode.
- [ ] Redeploy production after the environment-variable change.
- [ ] Verify `/auth`, `/api/admin/me`, and `/api/admin/complaints` return successfully and that runtime errors no longer report `EMAXCONNSESSION`.
- [ ] Monitor Supabase pooler client usage under normal concurrent admin traffic.

**Operational note:** the current Vercel secret is not readable through the available environment-variable metadata endpoint, so its password-bearing URI cannot safely be rewritten in place by this session. The code-side connection fan-out mitigation is committed; switching the production secret to transaction mode is still required for durable serverless scaling.


## Complaint queue and owner-created reports — 6 November 2026
- [x] Keep Active complaints OPEN until resolved or dismissed.
- [x] Require an explicit claim before staff can draft a judgment, reply, add a private note, or close a complaint.
- [x] Limit each admin to one OPEN claim at a time; preserve rank-based release/takeover rules.
- [x] Remove the judgment-template helper sentence.
- [x] Enforce a fixed 15-record page size for Active and History and expose Load more only when more records exist.
- [x] Display complaint IDs on queue cards instead of category names.
- [x] Remove the bulk synthetic complaint generator and training-only permission tiers.
- [x] Add an owner-only **Create comp** menu entry and server-enforced creation endpoint for `officialsafebase@gmail.com`.
- [x] Add structured reporter/reported-player identity, editable generated description and optional evidence fields.
- [x] Route owner-created cases into the normal OPEN queue and record their origin in the complaint audit timeline.
- [x] Remove the retired training marker from the Prisma schema.
- [x] Update README and this roadmap.
- [x] Deleted all 45 retired complaints, their 45 evidence records, related response/note/audit rows, and their now-unreferenced player records directly in production; verified zero remain.
- [x] Applied migration `20261106140000_block_retired_bulk_complaints` to prevent the still-deployed legacy endpoint from recreating those records while the PR is reviewed.
- [ ] Apply migration `20261106150000_remove_retired_training_complaints` after the updated app is deployed to drop the obsolete `demoGroup` column without breaking the currently deployed app.
- [ ] Verify owner-only navigation and API access; create a case and confirm a different authorized admin can claim, investigate and close it.
- [ ] Run the Vercel preview build and verify 15-item pagination in both Active and History.


## Vercel deployment failure investigation — 6 November 2026

### Findings from live Vercel build logs
- [x] Inspected the latest failed Preview build on `feature/owner-created-complaints` (commit `336a0b5fd0c38025a72df18d4f334d3b61354465`).
- [x] Confirmed dependencies installed and Prisma Client generated; the Next.js build compiled before failing during page-data collection.
- [x] Confirmed the fatal error: `DATABASE_URL is required to connect to the Prestige Life RP database` while Next.js imported `/api/admin/admins/[id]/invite`.
- [x] Confirmed Vercel currently has the five required app variables configured for **Production only**; no Preview-target variables are present.
- [x] Inspected earlier Main builds and found a separate stale-code TypeScript error in the retired bulk generator (`Cannot find name i`); that endpoint is removed on the current feature branch.
- [x] Distinguished non-fatal npm configuration/install-script warnings from the actual build-stopping error.

### Code fix
- [x] Changed `lib/db.ts` to initialize Prisma and the PostgreSQL pool only when a database operation is first accessed, not when Next.js imports an API route during build collection.
- [x] Kept an explicit, actionable missing-`DATABASE_URL` error at runtime so a Preview without a database cannot silently pretend database-backed features work.
- [x] Preserved one pool/client per warm instance and the one-connection pool cap.
- [x] Updated README and this roadmap.

### Remaining validation and environment setup
- [ ] Confirm a new Preview build reaches READY after the lazy-initialization commit.
- [ ] Configure a dedicated non-production Supabase database/branch and add its `DATABASE_URL` to Vercel Preview before testing database-backed Preview routes. Do not point Preview at production data.
- [ ] Confirm Production variables remain unchanged and production deployment is not triggered by this Preview-only fix.
- [ ] Re-run a clean build and inspect the resulting logs for any additional compile/type errors.

## Owner-generated rank-tier complaint batches — 7 November 2026
- [x] Add an owner-only **Generate 20 comps** item to the admin navigation and complaints header.
- [x] Generate exactly 15 OPEN cases with minimum reply rank 3 (claimable by ranks 3 and above, including rank 6 and top tier) and 5 OPEN cases with minimum reply rank 6 (claimable by rank 6 and top tier), using existing category permission thresholds.
- [x] Leave every generated complaint unassigned in the normal Active queue so eligible administrators claim them themselves.
- [x] Include structured reporter/reported-player identities, incident summary, timeline, impact, requested review, and two evidence exhibits per case.
- [x] Mark all generated names, IDs, scenarios, and evidence as simulated so they cannot be mistaken for real player allegations or verified exhibits.
- [x] Create all 20 complaints, players, evidence records, and audit entries atomically; reject the batch before writing if eligible categories are unavailable.
- [x] Keep the existing production schema unchanged; no migration or cleanup operation is part of this feature.
- [ ] Run a Vercel Preview build and inspect the build logs.
- [ ] Verify Owner-only UI/API access, exactly 20 records per successful run, two evidence records per complaint, no pre-assignment, ranks 3–6 and top tier claiming the minimum-rank-3 cases, rank 5 denial on minimum-rank-6 cases, and rank 6/top-tier access to minimum-rank-6 cases.
- [ ] Verify a missing category threshold causes a clean failure with zero partial records.


## Owner-configurable category complaint batches — 7 November 2026
- [x] Replace the fixed 20-complaint action with a configurable **Generate comps** page.
- [x] Allow multiple category rows per batch, each with its own active category, quantity and minimum reply rank (rank 3+ or rank 6+); higher ranks inherit reply access to lower-rank complaints.
- [x] Validate selected category rank thresholds server-side; preserve category-specific close permissions.
- [x] Enforce per-row quantity 1–50, up to 20 rows and 100 complaints per batch.
- [x] Keep generated complaints OPEN, unassigned, and in the normal Active queue with two clearly marked simulated exhibits each.
- [x] Correct advisory-lock result typing by wrapping PostgreSQL's void lock call in a subquery while returning an integer column to Prisma.
- [x] Keep the complete batch atomic; serialize generation and reject invalid/inactive categories before writing.
- [x] Update README and deployment roadmap.
- [ ] Run Vercel Preview build and inspect build logs for the new branch.
- [ ] Verify owner-only category loading and generation, multiple category rows, quantity limits, minimum-rank validation, no partial writes on failure, and normal queue claiming.
- [ ] Do not run a generation batch against Production until the owner explicitly requests it after Preview validation.


## Complaint reply rank inheritance — 7 November 2026
- [x] Make generator selections explicit minimum-rank thresholds rather than exclusive rank bands.
- [x] A rank 3 minimum allows ranks 3, 4, 5, rank 6 and top-tier admins to claim and reply, subject to category thresholds and protections for complaints against staff.
- [x] A rank 6 minimum remains restricted to rank 6 and top-tier admins.
- [x] Preserve the server-side rule that an admin can reply only when their rank is at least the complaint's minimum reply rank; higher ranks inherit access to lower-rank cases.
- [x] Keep category close thresholds separate from reply thresholds.
- [x] Update the generator UI, audit wording, README and this roadmap to remove the misleading implication that rank 6+ cannot answer rank 3–5 complaints.
- [ ] Run a Vercel Preview build and inspect the latest build logs.
- [ ] With non-production test accounts, verify rank 3 can answer minimum-rank-3 complaints; ranks 4, 5 and 6 can also answer them; rank 3 cannot answer minimum-rank-6 complaints; and rank 6 can answer minimum-rank-6 complaints.
- [ ] Verify claim takeover/release rules, accused-staff safeguards, judgment-template level checks and category close thresholds remain intact.
- [ ] Do not generate complaints against the Production database for testing.
