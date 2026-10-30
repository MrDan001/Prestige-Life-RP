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
- New staff are created by the owner using name, email, and role/level only. The owner shares a private one-use invitation link that expires after 48 hours. Accepting it starts a session and requires passkey registration before the dashboard can be used.
- Invitation acceptance creates a 30-day server-registered session. Each staff member must register a passkey before accessing the dashboard. Successful passkey sign-in creates a fresh 30-day session.
- Staff can add multiple passkeys in My Profile. Keep at least one working passkey; the UI prevents removal of the final one.
- If a staff member loses all passkeys, the owner can use **Reset passkeys & issue recovery invitation** in Staff management. This signs them out everywhere, removes their old passkeys, and issues a fresh one-use invitation so they can register a replacement.
- Invitation links are shown once in the Owner-only Staff interface and are not automatically emailed. Share them privately.
- Passkeys are stored as public-key credentials; private key material remains with the staff member's device or passkey provider.
- The former Tech role is displayed as **PRM (Project Management)**. Its underlying `TECH` permission kind is intentionally unchanged, so access rights and behavior stay the same.
- Owner accounts are hidden from the Staff directory for all viewers, including PRM/TECH, developers, and other owners. The Owner role and full owner permissions remain intact; this is a directory-visibility change, not a role or access change.
- The owner can permanently delete a staff account from its Staff card. Deletion removes that account's invitations, sessions, passkeys, complaint responses, internal notes, and audit entries; complaint records themselves remain and staff references are cleared by the database. Owner accounts and the currently signed-in owner cannot be deleted.
- The owner must accept the separately issued one-use owner invitation to enter the new passwordless flow.
- When a replacement custom domain is ready, add and verify it in Vercel before changing player-facing links or redirects.

## Database security

- Prisma uses the private PostgreSQL `DATABASE_URL` from the server environment; do not expose it to browser code.
- RLS is enabled on all 14 public application tables.
- Direct table privileges are revoked from `PUBLIC`, `anon`, and `authenticated`; browser clients cannot query application tables directly.
- No broad RLS policies are defined. Application data access is performed by server-side Prisma routes.
- Keep database and session secrets in Vercel environment variables; never commit their values.

## Visual quality

- The header uses the custom Prestige crown wordmark in `public/prestige-logo.svg`.
- The footer intentionally contains no logo.
- The feature strip uses hand-drawn inline SVG line icons.
- Image sizing, alignment, crop positions, and visual checks are tracked in [IMAGE-QUALITY-ROADMAP.md](./IMAGE-QUALITY-ROADMAP.md).

## Build and deployment

- Vercel project: `prestige-life-rp`; production branch: `main`.
- Build command: `prisma generate && next build`.
- Passwordless staff migration files live under `prisma/migrations/`; keep Prisma schema, SQL migrations, API routes, and documentation in sync.
- Deployment checks and remaining live verification steps are tracked in [DEPLOYMENT-ROADMAP.md](./DEPLOYMENT-ROADMAP.md).
