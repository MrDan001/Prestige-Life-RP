# Prestige Life RP

Prestige Life RP is a mobile-first roleplay community website and game companion.

## Local setup

1. Open PowerShell in this folder.
2. Run `powershell -ExecutionPolicy Bypass -File .\\setup.ps1`.
3. Start the app with `npm run dev`.
4. In a second terminal, run `powershell -ExecutionPolicy Bypass -File .\\test.ps1`.
5. Open `http://localhost:3000/auth`. Staff sign in with a registered passkey; new staff must accept an owner invitation and register a passkey first.

## Production access

- Public player-facing website: https://prestige-life-rp.vercel.app
- Passwordless staff invitation and session changes deployed to production on 30 October 2026 (commit `afbe39ff10e39a71af2b72fa6b2faa5b27240046`).
- The production domain is intended to remain public; preview and generated deployment URLs remain protected by Vercel Authentication.
- Admin access remains behind the application's own database-validated session checks. Opening `/auth` while already signed in redirects directly to `/admin`; signed-out visitors see the invitation-only access instructions.
- Staff access is passwordless and uses WebAuthn passkeys. Staff sign in at `/auth` with their registered email and device passkey (fingerprint, face unlock, device PIN, or compatible security key); no password or email delivery provider is used.
- Staff with the explicit **Manage Staff** permission can create eligible junior admin accounts and receive a private one-use invitation link that expires after 48 hours. Their selected role and level must remain within their own authority. Accepting the link starts a session and requires passkey registration before the dashboard can be used.
- Invitation acceptance creates a 30-day server-registered session. Each staff member must register a passkey before accessing the dashboard. Successful passkey sign-in creates a fresh 30-day session.
- Staff can add multiple passkeys in My Profile. Keep at least one working passkey; the UI prevents removal of the final one.
- If a staff member loses all passkeys, the owner can use **Reset passkeys & issue recovery invitation** in Staff management. This signs them out everywhere, removes their old passkeys, and issues a fresh one-use invitation so they can register a replacement.
- Invitation links are shown once in the Staff interface to the creator and authorized staff managers; they are not automatically emailed. Share them privately. Authorized managers can issue/replace or revoke invitations only for staff they are allowed to manage.
- Passkeys are stored as public-key credentials; private key material remains with the staff member's device or passkey provider.
- The former Tech role is displayed as **PR Manager (Project Management)**. Its underlying `TECH` permission kind is intentionally unchanged, so access rights and behavior stay the same.
- **Manage Staff** and **Grant Staff Permissions** are separate, direct per-person permissions and are not inherited from reusable roles. The Owner always retains both. Other staff need Manage Staff to recruit/manage junior staff, and need Grant Staff Permissions as well to grant or revoke permissions. Delegated permission changes are server-enforced, audited, limited to manageable subordinates, and cannot change the actor's own rights or outrank the actor. General workspace rights inherited from a custom role are marked **via role** in the Staff screen and remain controlled in the Owner-only Roles screen. Only the Owner can appoint top-tier roles or permanently delete staff. The owner can permanently delete a staff account from its Staff card. Deletion removes that account's invitations, sessions, passkeys, complaint responses, internal notes, and audit entries; complaint records themselves remain and staff references are cleared by the database. Owner accounts and the currently signed-in owner cannot be deleted.
- The owner must accept the separately issued one-use owner invitation to enter the new passwordless flow.
- When a replacement custom domain is ready, add and verify it in Vercel before changing player-facing links or redirects.

## Database security

- Prisma uses the private PostgreSQL `DATABASE_URL` from the server environment; do not expose it to browser code.
- On Vercel, use the Supabase **Transaction pooler** connection string (port `6543`) for runtime traffic. Do not use Supabase session mode (port `5432`) for serverless runtime requests.
- `lib/db.ts` lazily initializes one Prisma client and PostgreSQL pool per warm serverless instance and caps the local pool at one connection. Lazy initialization lets Vercel compile Preview builds without database credentials; database-backed requests still require `DATABASE_URL` in that environment. Keep `connection_limit=1` in the transaction-pooler URL where supported.
- RLS is enabled on the existing public application tables. The legacy `Rule` table remains the one RLS-disabled exception flagged by the current Supabase advisor.
- Direct table privileges are revoked from `PUBLIC`, `anon`, and `authenticated`; browser clients cannot query application tables directly.
- No broad RLS policies are defined. Application data access is performed by server-side Prisma routes.
- Keep database and session secrets in Vercel environment variables; never commit their values.

## Visual quality

- The header uses the Prestige Life crown wordmark in `public/prestige-logo.svg`.
- The footer intentionally contains no logo.
- The feature strip uses hand-drawn inline SVG line icons.
- Image sizing, alignment, crop positions, and visual checks are tracked in [IMAGE-QUALITY-ROADMAP.md](./IMAGE-QUALITY-ROADMAP.md).

## Build and deployment

- Vercel project: `prestige-life-rp`; production branch: `main`.
- Build command: `prisma generate && next build`.
- Passwordless staff migration files live under `prisma/migrations/`; keep Prisma schema, SQL migrations, API routes, and documentation in sync.
- Deployment checks and remaining live verification steps are tracked in [DEPLOYMENT-ROADMAP.md](./DEPLOYMENT-ROADMAP.md).

### Owner identity privacy
- The primary owner's account is a private system identity, excluded from the Staff directory by immutable Admin ID regardless of its role/title. It cannot be edited, invited, suspended, deleted, or have its sessions/passkeys reset through staff-management APIs. Sign-in remains passkey-only for the primary owner's registered account; other staff see only their own signed-in identity in the account header.

## Admin workspace behavior
- Sign out is available only from **My Profile**; it is no longer shown in the shared admin navigation/account panel.
- The admin workspace requests a 1200px desktop viewport and retains its desktop sidebar, complaint split view, staff controls, and multi-column layouts on narrow devices. The complaints sidebar, queue and detail panes explicitly allow horizontal/vertical touch panning and native pinch zoom; keep later pane-specific touch-action rules aligned so they do not override this gesture policy.
- Only **OPEN** complaints appear in the **Active** queue. **RESOLVED** and **DISMISSED** complaints appear in the separate **History** queue.
- Closed complaints are read-only: staff cannot reply, draft a judgment, add a note, claim, release, or change their status while closed. The owner, PRM/TECH, and Developer top tier can explicitly reopen a closed complaint; it returns to Active, and a new response requires a separate action after reopening.

## Staff presence and invitation status
- The Staff directory shows a presence state on every staff card: **Active** (green), **Pending** (gold), **Suspended** (red), or **Inactive** (gray).
- Pending means the latest issued invitation has not been accepted. A revoked invitation remains Pending if the staff member has never accepted any invitation; a revoked recovery link for an already-onboarded staff member does not turn them back to Pending.
- Active means the staff member visited the admin website or resolved/dismissed a complaint within the last 24 hours. The admin shell sends a lightweight authenticated heartbeat once per minute while its browser tab is visible.
- Inactive means neither a website visit nor a complaint resolution/dismissal has been recorded in the last 24 hours.
- The Admin lastSeenAt field is added by migration 20261030040000_staff_activity_presence; run migrations before local testing.

## Built-in FOUNDER role
The built-in top-tier role is displayed as **FOUNDER**. It retains the existing OWNER kind and owner-level permissions and safeguards; only the displayed role name has changed. The additive migration `20261030050000_rename_prm2_to_founder` updates the existing role row and matching staff display titles. No staff accounts or permissions are recreated or changed.

 
## Complaint queue and owner-created reports
- The Active and History lists request 15 records at a time. **Load more comps** appends the next 15 when more records exist.
- Complaint cards lead with the complaint ID rather than the category label.
- Only the account signed in as `officialsafebase@gmail.com` sees **Create comp** in the admin navigation and can submit through the matching server-enforced API.
- The owner form captures the reporting player, reported player, category, incident description and optional evidence. Its **Generate** action creates an editable description draft; the owner reviews it before submission.
- Owner-created complaints enter the same OPEN queue and use the same player-facing presentation, fields and workflow as every other complaint.
- The retired synthetic complaint records and their evidence/player records have been deleted from production. A database safeguard blocks the legacy bulk-generation endpoint while the owner-created complaint workflow is reviewed. The follow-up migration `20261106150000_remove_retired_training_complaints` removes the now-unused training marker column after the updated application is deployed.


## Owner-configurable category complaint batches
- The owner-only **Generate comps** page lets the owner add multiple category rows in one batch and set a separate quantity and claim-eligibility group for each row.
- Each row selects an active category, a quantity from 1–50, and a minimum reply rank: rank 3+ or rank 6+. A minimum rank of 3 includes ranks 3, 4, 5, rank 6 and top-tier admins; higher ranks inherit reply access to lower-rank complaints. A minimum rank of 6 is limited to rank 6 and top-tier admins. A batch supports up to 100 complaints across up to 20 rows.
- Minimum-rank selection is validated against the category’s minimum reply level on the server. An admin may reply when their rank is at least the complaint category’s minimum reply rank; lower ranks cannot reply upward. Existing safeguards for complaints against staff still apply, and closing remains governed by the category’s normal close threshold.
- Configured complaint batches enter the same OPEN/Active queue unassigned and use the same presentation and workflow as player-submitted complaints.
- Configured complaint descriptions use the standard **Problem** and **Reporter's complaint** sections. Reporter/reported-player identities remain in the normal complaint metadata.
- Generated complaint identities mix realistic international full names (for example, `Lucia Garcia` and `Mateo Ruiz`) with game-style handles (for example, `NgoziB` and `KelzHH`). Names contain letters only—no numbers or underscores—and every generated reporter/reported-player pairing uses different countries, so no generated case is same-country-versus-same-country.
- Complaint origin does not create a separate queue, label, badge, evidence caption or player-facing distinction.
- The batch is atomic, serialized with a transaction advisory lock, and fails without partial records if a category is inactive or does not support the selected rank group. No schema migration is required.


## Complaint judgment workflow restructure — 7 November 2026
- The complaints workspace separates open/in-review cases into **Active** and resolved/dismissed cases into **History**.
- Complaint details show the creation timestamp, resolution timestamp and **Closed By**. Closed By identifies the administrator who issued the latest judgment; unjudged/open complaints show no administrator name.
- Eligible staff can issue a judgment directly without claiming a complaint. Server-side category, target-rank and template-level checks remain enforced.
- Complaint detail shows the problem, evidence and latest judgment/verdict only; chronological replies, notes, claims and audit events are not displayed.
- Release, Resolve and Dismiss controls are available only to the primary owner account (`officialsafebase@gmail.com`), with matching server-side authorization. Legacy claim creation is disabled; the primary owner can clear existing claims.
- The primary owner account is displayed as **PR.BOT**. Its immutable account ID, email, OWNER kind and authorization are unchanged.
- All complaints, including owner-created and configured-batch cases, appear as ordinary player complaints. No Practice, Demo, Simulated or Generated markers are shown in the complaint interface or evidence captions.
- The post-send “Sent. The player will see it in the game.” confirmation has been removed.


### Complaint queue scrolling
- On the Complaints page, the admin shell, sidebar and header stay fixed within the viewport.
- Only the left-hand complaints list scrolls vertically. Selecting a complaint does not move the page or the detail panel; the complaint detail and judgment controls remain in the fixed right-hand workspace.
- This is scoped to the Complaints page and preserves the existing desktop admin layout.


## Complaint case links and judgment punishments
- Every complaint has a permanent six-character uppercase alphanumeric public reference URL at `/complaint/<public-id>` (for example, `/complaint/7XKRWC`). Internal CUIDs remain private implementation identifiers. Admins can copy the short link from the complaint detail panel; the game complaint creation and polling APIs return the short URL.
- The public case page shows status, verdict and the latest judgment, including its violated rule code, punishment and duration. It intentionally does not expose the private report narrative or attached evidence.
- Every community rule has a unique rule code. Chief Admin and higher can assign/edit codes in the Rules Manager; admins enter the code manually when recording an upheld complaint.
- An upheld (`COMPLAINANT`) judgment requires a valid rule code, active punishment choice and a duration belonging to that choice. The server validates the selection and stores a text snapshot on the judgment.
- Only the primary owner account (`officialsafebase@gmail.com`) can add, rename, edit or switch off punishment options and duration choices from **Admin → Punishments**. Existing judgment records retain the exact punishment snapshot even when the catalogue changes.
- Initial choices: Ban (3, 7, 30, 60 or 90 days), Jailed (30, 60, 120 or 180 minutes), and Mute (30, 60, 120 or 180 minutes). The owner can change these options later.


## Complaint punishment API and short public references — 7 November 2026
- The admin punishment-choice API is implemented at `/api/admin/punishments` and `/api/admin/punishments/<id>`; reads require an authenticated admin and catalogue changes are restricted server-side to the primary owner.
- Every complaint receives a unique six-character uppercase alphanumeric public ID generated by PostgreSQL; old long internal complaint IDs remain valid internally and are not used in shared URLs.


## Complaint judgment message and rule-code correction — 7 November 2026
- Complaint IDs in the Active/History cards and judgment-template messages use the same six-character public ID as the complaint detail and share URL; internal database IDs are not displayed as complaint references.
- Approved judgment drafts show a live final-message preview. The preview automatically includes the violated rule code, punishment and duration as soon as the administrator enters/selects them; issuing the judgment saves that exact combined message and the structured punishment fields.
- Rule codes accept dots and hyphens (for example, `3.1GR`). When the Rules Manager catalogue contains entries, entered codes must match it. If the catalogue is empty, a syntactically valid manually entered code is accepted so externally maintained community rulebooks remain usable.


## Standard upheld judgment messages — 7 November 2026
- Upheld complaints use the official player-facing judgment format: greeting and public complaint reference, an explicit **UPHELD** decision, a disciplinary-action section with rule, punishment and duration, and the PR.BOT / Prestige Life Staff sign-off.
- The live preview and server-side saved message use the same shared formatter, so the message delivered to the game matches the preview.
- The redundant free-text editor is hidden for upheld judgments because the message is generated from the complaint and required punishment fields; custom judgment text remains available for other verdicts.
- Judgment API validation now reports the actual field problem instead of the generic “Send a status, judgment or verdict” response, and accepts messages up to 5,000 characters to cover configured templates plus formatting.


## Upheld judgment build note
- The admin complaint PATCH handler explicitly selects the complainant username when loading a complaint for judgment, which is required to construct the standardized upheld-judgment message. The matching deployment/build verification is tracked in [DEPLOYMENT-ROADMAP.md](./DEPLOYMENT-ROADMAP.md).


## Roles administration
- The owner Roles page supports creating custom roles and switching custom roles on/off; editing existing role details is not exposed in the interface.
- The unused manually-created **PR Manager** custom role is retired by migration `20261107220000_remove_unused_pr_manager_role`. The migration removes only the non-system PR Manager row and aborts if any staff account is still assigned to it. All built-in roles and other custom roles are preserved.


### Complaint judgment build type fix — 7 November 2026
- The complaint PATCH lookup now selects the accused administrator's display name, matching the upheld-judgment message formatter and Prisma's inferred query type.
- The complainant username remains selected explicitly for the same formatter.


## Production roles database state — 7 November 2026
- The unused, manually-created custom **PR Manager** role was removed from the production database after confirming it had zero staff assignments.
- The built-in **PRM** role was renamed to **PR Manager** in production; its underlying `TECH` kind and both existing staff assignments were preserved.
- All other production roles and their assignments were verified unchanged.
- PR #32 contains the matching Roles page cleanup and the complaint judgment TypeScript build correction. The remaining release step is one successful Vercel Production deployment from the merged PR.


## Judgment display cleanup — 8 November 2026
- The saved judgment message is the single place where the verdict, violated rule code, punishment and duration are displayed.
- Removed the separate repeated verdict/rule/punishment/duration rows beneath the judgment message in both the admin complaint detail and public complaint page.
- Structured punishment fields remain stored and available to the game/API; only duplicate UI output is removed.


## Judgment action availability — 8 November 2026
- The **Issue judgment** action remains visible, enabled and sticky at the bottom of the judgment form while punishment details are entered.
- Clicking the action runs the existing validation and shows a clear message for any missing or invalid rule code, punishment or duration; the action is not disabled or hidden by incomplete form state.
- Judgment details are presented only inside the judgment message; no separate structured verdict/rule/punishment/duration rows are rendered in complaint history.


## Admin complaints workspace scrolling — 8 November 2026
- The admin navigation sidebar, complaint list, and selected complaint detail each have their own vertical scroll area.
- The complaints workspace and page header remain fixed; scrolling one panel does not scroll either of the other panels.
- Scroll chaining is contained at each panel boundary so wheel, trackpad, and touch scrolling stay within the active panel.


## Staff role labels and private Founder account count — 8 November 2026
- The built-in TECH role is named **PR Manager** consistently in the role picker, staff cards, role list and seed data; legacy staff display titles containing the exact old label **PRM** are normalized by the accompanying migration.
- The primary owner account remains private and is excluded from role-assignment headcounts. The single visible **FOUNDER** count therefore reflects only visible staff assigned to that role, not the concealed primary owner.
- The primary owner identity, account ID, email, permissions and authentication are unchanged.


## Admin navigation and staff-label consistency — 8 November 2026
- Admin navigation now remains stationary at the left edge on every admin route. The complete menu stays available while the active page content scrolls independently in the right-hand workspace.
- The sidebar has its own overflow protection on short screens, so long menus remain reachable without moving the page content.
- Legacy **PRM** and **PRM (Project Management)** staff titles and role names are normalized to **PR Manager** in the staff API, role API, and staff-card display. This presentation safeguard works even before the earlier database label migration is applied.
- The underlying TECH staff kind, permissions, role assignments, and primary-owner privacy safeguards are unchanged.


## Mobile rendering of the desktop admin workspace — 8 November 2026
- The admin route now declares its 1200px desktop viewport through Next.js server-side viewport metadata, so the browser receives the correct layout width in the initial HTML rather than waiting for a client-side effect.
- Removed the forced `initial-scale=1` setting. Mobile browsers can now scale the complete desktop workspace to the phone display width while retaining the desktop navigation, complaint queue, and detail-panel layout.
- The normal public website viewport remains unchanged because the viewport metadata is scoped to the admin route segment.


## Complaint detail touch scrolling correction — 8 November 2026
- Made the complaints detail pane an explicit, momentum-scrollable touch region on mobile browsers while preserving the desktop-width three-panel admin workspace.
- Removed the ambiguous percentage-height dependency from the split pane and assigned its flex height from the available viewport.
- Kept the complaint queue and sidebar as independent scroll regions.


## Consistent pinch zoom across the complaints workspace — 8 November 2026
- The complaint list and detail panel now allow native pinch-to-zoom while retaining vertical touch scrolling.
- The sidebar, queue and detail sections use the same vertical-pan-plus-pinch gesture policy; the prior `touch-action: pan-y` rule had disabled pinch zoom in the two content panels.
- No complaint data, judgment behavior, permissions or desktop panel sizing is changed.


## Player name format
- Every player identity stored or accepted by the complaint system uses exactly `Firstname_lastname`: letters only, one underscore, and at least two letters in each part (for example, `Db_yk`).
- The game complaint API and owner-created complaint API reject names that do not match this format. The owner-only Generate comps endpoint normalizes every generated identity before saving it.
- Migration `20261108090000_enforce_player_name_format` normalizes existing player and accused-player names, then adds database checks so invalid names cannot be written through another application path.


## Native mobile pan and pinch behavior for the complaints workspace — 8 November 2026
- On touch-first devices, the complaints page keeps the 1200px desktop layout but uses the document itself as the single horizontal-and-vertical pan surface.
- Browser-native pinch zoom remains enabled. After zooming, one-finger drags move the page's visual viewport across the sidebar, complaint queue and case detail together.
- Removed nested touch-device scrolling and overflow clipping from those three workspace columns because nested scrollers were consuming one-finger gestures instead of allowing the zoomed page to pan as one surface.
- Desktop pointer devices retain their existing independently scrollable sidebar, queue and detail panes.
- This behavior is scoped to the complaints page and touch-first input; other admin routes and public pages keep their existing scroll models.
