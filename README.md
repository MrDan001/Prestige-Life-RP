# Prestige Life RP

Prestige Life RP is a mobile-first roleplay community website and game companion.

## Local setup

1. Open PowerShell in this folder.
2. Run `powershell -ExecutionPolicy Bypass -File .\\setup.ps1`.
3. Start the app with `npm run dev`.
4. In a second terminal, run `powershell -ExecutionPolicy Bypass -File .\\test.ps1`.
5. Open `http://localhost:3000/auth`. Staff access is invitation-only; ask the owner for a private invitation link.

## Production access

- Public player-facing website: https://prestige-life-rp.vercel.app
- Passwordless staff invitation and session changes deployed to production on 30 October 2026 (commit `afbe39ff10e39a71af2b72fa6b2faa5b27240046`).
- The production domain is intended to remain public; preview and generated deployment URLs remain protected by Vercel Authentication.
- Admin access remains behind the application's own session checks at `/auth` and `/admin`.
- Staff access is invitation-only and passwordless. The owner creates staff records and privately shares a one-use invitation link; links expire after 48 hours.
- Invitation acceptance creates a 30-day server-registered session. The owner can revoke pending invitations, revoke all active sessions for a staff member, or suspend the account.
- Invitation links are shown once in the Owner-only Staff interface and are not automatically emailed. Share them privately.
- Existing staff records, role assignments, levels, extra rights, and game-account links are preserved.
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
