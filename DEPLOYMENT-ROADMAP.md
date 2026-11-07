# Prestige Life RP — Deployment Reliability Roadmap

Updated: 7 November 2026

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
- [x] Include structured reporter/reported-player identities, a concise problem summary, a first-person reporter complaint, and two evidence exhibits per case.
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


## Generated complaint presentation and claim-state clarity — 7 November 2026
- [x] Limit generated complaint descriptions to two sections: **Problem** and **Reporter's complaint**.
- [x] Remove generated timeline, impact/context, requested-review boilerplate, duplicated category/player identifiers and the provenance paragraph from the description; preserve simulation markers in staff audit history and evidence captions.
- [x] Keep eligible unclaimed complaints visually claimable instead of dimming them or labelling them view-only before the administrator has claimed them.
- [x] Show view-only copy only when the administrator is not eligible to claim/reply; retain the separate explanation for another administrator's active claim.
- [ ] Verify the Preview build, claim/reply controls for rank 3–6 and top-tier admins, and the shortened generated descriptions before merge.


## Complaint judgment workflow restructure — 7 November 2026
- [x] Replace Active/History tabs with one unified queue containing open and closed complaints.
- [x] Remove the visible History tab, chronological complaint timeline and private-note panel.
- [x] Allow eligible admins to issue judgments directly without claiming or taking over a complaint.
- [x] Display only the latest judgment/verdict alongside the complaint and evidence.
- [x] Restrict Release, Resolve and Dismiss controls and matching server endpoints to the primary owner account.
- [x] Disable new claim creation; permit the primary owner to clear legacy claims.
- [x] Display the primary owner as **PR.BOT** without changing the account's immutable identity or OWNER permissions.
- [x] Remove the post-send confirmation sentence.
- [x] Earlier presentation used Practice/simulation markers; this was superseded by the 7 November 2026 uniform player-case presentation update below.
- [ ] Run the Preview build and verify direct unclaimed judgments, rank restrictions, owner-only lifecycle actions, the unified queue and latest-judgment display.


## Complaints queue scroll containment — 7 November 2026
- [x] Keep the admin shell, sidebar and complaints header fixed to the viewport.
- [x] Make only the left-hand complaints list vertically scrollable, including its Load more control.
- [x] Keep the selected complaint detail and judgment controls stationary in the right-hand panel.
- [x] Scope overflow containment to the Complaints page without changing scrolling behavior on other admin pages.
- [x] Update README and this roadmap.
- [ ] Run a clean Vercel Preview build and inspect build logs.
- [ ] Verify on desktop and a narrow phone viewport that only the complaints list scrolls, while the header, sidebar and detail panel remain stationary.
- [ ] Confirm list pagination, complaint selection, evidence viewing and judgment actions still work.


## Restore complaint History and lifecycle metadata — 7 November 2026
- [x] Restore separate **Active** and **History** tabs; keep OPEN and IN_REVIEW cases in Active and RESOLVED/DISMISSED cases in History.
- [x] Apply queue filtering and pagination on the server so closed cases cannot leak into Active and open cases cannot appear in History.
- [x] Restore the complaint creation date/time in the detail information blocks.
- [x] Show the recorded status-transition timestamp as the settled/resolved time, with a latest-response fallback for legacy closed cases that lack a status audit record.
- [x] Show the administrator who attended/resolved the case using the latest judgment author, closure actor, or legacy claim owner fallback.
- [x] Move a complaint between tabs after a status change or reopening, and preserve the PR #21 list-only scrolling layout.
- [x] Update README and this roadmap.
- [ ] Run the Vercel Preview build and inspect TypeScript/build logs.
- [ ] Verify Active/History filters, pagination, close/reopen movement, and metadata on both recent and legacy closed cases before production promotion.


## Complaint closure attribution and uniform player-case presentation — 7 November 2026
- [x] Replace “Admin resolved / attended” with the exact label **Closed By** after the resolution timestamp.
- [x] Attribute Closed By to the administrator who issued the latest judgment, never to a claim/attendance owner or unrelated status actor.
- [x] Leave Closed By blank for open complaints; reject attempts to resolve/dismiss a complaint before at least one judgment exists.
- [x] Remove visible Practice/Practice scenario/Simulated/Generated provenance markers from complaint cards, details, generated descriptions, evidence text and evidence captions.
- [x] Give generated and owner-created cases the same player complaint labels, neutral exhibit captions, normal player-style IDs, Active/History routing and detail presentation as in-game player submissions.
- [x] Keep provenance out of the player-facing complaint experience and retain only operational rank/category audit details.
- [x] Update README and this roadmap.
- [ ] Build and inspect the Vercel deployment; verify Closed By attribution for judged cases, blank attribution and OPEN state before judgment, and identical presentation across player-, owner- and generated-origin complaints.


## Global generated complaint identities and latest-batch cleanup — 7 November 2026
- [x] Replace the Nigeria-only generated reporter/accused name list with a shuffled international pool spanning Africa, Europe, the Americas, Asia, Oceania and the Middle East; Nigerian names remain included as one part of the global mix.
- [x] Shuffle the complete pool for each generation cycle so a generated batch does not always begin with the same names or repeatedly overrepresent one region.
- [x] Delete the latest 50 owner-generated complaints requested for cleanup, including their 100 evidence rows, 50 creation-audit rows and 50 now-unreferenced reporter records.
- [x] Verify that no complaint from that latest batch remains and that the 3 complaints already in the Active queue before the batch remain.
- [x] Leave the older complaint records and pre-existing History items untouched.
- [x] Update README and this deployment roadmap.
- [ ] Confirm the main-branch Vercel deployment completes and inspect the generated-name mix in a subsequent owner-approved test batch.


## Cross-country game-style generated identities — 7 November 2026
- [x] Use familiar roleplay usernames/handles such as `Ngozi_B` and `Kelz_77`, rather than only formal first-and-last names.
- [x] Make every generated reporter/reported-player pair cross-country; Nigeria-versus-Nigeria pairings are excluded.
- [x] Include a broad mix of countries and regions, with Nigerian players appearing alongside players from other countries.
- [x] Shuffle identity pairings for each generation cycle and reshuffle when a batch exceeds the pool.
- [x] Save the reporter's country on the generated Player record; no schema migration is required because Player.country already exists.
- [x] Update README and this deployment roadmap.
- [ ] Verify the next owner-approved generated batch visually in the admin complaint queue.


## Mixed full names and letter-only generated identities — 7 November 2026
- [x] Mix realistic international full names with game-style handles in the same shuffled identity pool.
- [x] Remove digits and underscores from every generated identity; names contain letters only, with spaces permitted between full-name parts.
- [x] Keep every reporter/reported-player matchup cross-country.
- [x] Preserve the global country mix and shuffled batch selection.
- [x] Update README and this roadmap.
- [ ] Verify a later owner-approved generated batch displays both name styles and contains no numeric characters.


## Complaint reference links and judgment punishments — 7 November 2026
- [x] Give every complaint a stable unique URL at `/complaint/<complaint-id>`; expose it in the admin detail panel and in the game complaint creation/polling API.
- [x] Add a public case-reference page showing case status, verdict and latest judgment without exposing the private complaint narrative or evidence.
- [x] Add a unique code to every community rule; backfill existing rules with stable `RULE-###` codes and let rule managers edit codes going forward.
- [x] Require an upheld judgment (`COMPLAINANT`) to include a manually entered valid rule code, a configured punishment choice and a duration valid for that choice.
- [x] Store rule code, punishment label and duration on each judgment as immutable historical text snapshots.
- [x] Add owner-only punishment catalogue management for `officialsafebase@gmail.com`, including adding/editing/switching off punishment types and duration choices.
- [x] Seed Ban (3/7/30/60/90 days), Jailed (30/60/120/180 minutes), and Mute (30/60/120/180 minutes); owner can adjust the catalogue later.
- [x] Update README and this roadmap.
- [ ] Apply the additive migration in a non-production environment and verify Prisma migration/client generation.
- [ ] Run the build and test owner-only catalogue access, rule-code uniqueness/validation, approved-judgment required fields, non-approved judgments without punishment, public link behavior, and history snapshots after catalogue edits.


## Punishment choices endpoint and short complaint URLs — 7 November 2026

### Root cause
- [x] The judgment UI requested `/api/admin/punishments`, but the API route files were missing from the merged implementation. This caused the punishment-choice request to fail even though the catalogue table and seeded rows existed.

### Fix in PR
- [x] Add authenticated `GET /api/admin/punishments`; only active options are returned to ordinary admins, while the owner may request all options.
- [x] Add owner-only `POST /api/admin/punishments` and `PATCH /api/admin/punishments/<id>` with validation and audit records.
- [x] Add a unique six-character uppercase alphanumeric `Complaint.publicId` generated in PostgreSQL and backfill existing complaints without changing their internal CUIDs.
- [x] Change admin share/copy links, public case lookup, and game complaint create/poll APIs to use `/complaint/<publicId>` (example: `/complaint/7XKRWC`).
- [x] Update README and this roadmap.
- [ ] Apply `20261107210000_short_complaint_public_ids` to production after merge.
- [ ] Confirm Vercel preview build succeeds, then merge and verify live punishment choices and public short links.


## Complaint ID, rule-code validation and punishment-in-message fix — 7 November 2026
- [x] Use the public six-character complaint ID consistently on queue cards, complaint details, copied URLs and judgment-template variables.
- [x] Accept dotted community rule codes such as `3.1GR`; validate against the Rules Manager when it is populated, and allow well-formed manual codes while that catalogue is empty.
- [x] Add a live final judgment-message preview that updates when the rule code, punishment or duration changes.
- [x] Save the punishment details inside the judgment message as well as the structured judgment fields.
- [ ] Verify PR preview build and test a complete approved judgment with rule code `3.1GR`, punishment and duration before production promotion.


## Standard upheld judgment message and submission validation — 7 November 2026
- [x] Use the agreed official format for upheld complaints, including the reporter greeting, public complaint ID, explicit UPHELD decision, disciplinary action, rule code, punishment, duration and PR.BOT sign-off.
- [x] Generate the live preview from the same shared formatter used by the server to save and deliver the exact judgment message.
- [x] Remove the redundant free-text composer from the upheld-judgment path; retain custom judgment text for other verdicts.
- [x] Replace the generic “Send a status, judgment or verdict” API response with actionable validation details.
- [x] Align judgment-message validation with configured template sizes and the added punishment section.
- [x] Update README and this roadmap.
- [ ] Run a clean production build and verify the preview, issued judgment record, public case page and game-delivery response with a test upheld complaint before production promotion.


## PR #28 production build follow-up — 7 November 2026

### Verified Vercel failure
- [x] Confirmed Vercel picked up the exact PR #28 merge commit `5033276757028a5327337aed389a252471124e85` for a production-target build; the earlier daily deployment API rate-limit block is no longer the blocker.
- [x] Inspected the failed build logs: Next.js compiled, then TypeScript failed at `app/api/admin/complaints/[id]/route.ts:154` because the PATCH query did not select `player`, while the canonical upheld-judgment formatter read `c.player.username`.
- [x] Distinguished the non-fatal `jose` Edge Runtime warnings from the fatal Prisma query result type error.

### Corrective change
- [x] Explicitly select `player.username` in the PATCH complaint query so the reporter name is present in the inferred Prisma result type.
- [x] Update README and this roadmap with the root cause and correction.
- [ ] Build the corrected branch, merge the fix, and verify the exact new main commit reaches READY on the Production target with the production domain aliases attached.
- [ ] Smoke-test the admin complaint detail and upheld-judgment flow without issuing a real disciplinary action against a player.
