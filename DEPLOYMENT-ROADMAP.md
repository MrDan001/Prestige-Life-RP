# Prestige Life RP — Deployment Reliability Roadmap

Updated: 30 October 2026

## Incident: failed Vercel builds during admin authentication changes

### Root cause

The failed deployments were caused by inconsistent intermediate commits during an unfinished admin-authentication transition. Vercel cloned the GitHub commit, installed dependencies, ran Prisma generation, and reached the Next.js TypeScript build. It then failed compilation; this was not a Vercel deployment quota or daily-limit failure.

The inspected build logs show three distinct code-integrity problems:

- The login route imported `bcryptjs` while that package was absent from `package.json` / the lockfile in one intermediate commit.
- Other intermediate commits removed `Admin.passwordHash` from the Prisma model while existing admin-creation and seed code still attempted to write `passwordHash`. Prisma Client correctly rejected those writes at type-check time.
- A later intermediate schema made `passwordHash` nullable, but the login route passed it directly to `bcrypt.compare`, which requires a non-null string. This caused the final observed TypeScript failure.

### Recovery and hardening

- [x] Restored `main` to the last coherent password-based authentication implementation at commit `2486ef3`.
- [x] Confirmed the restored deployment reached Vercel `READY` on the production target.
- [x] Confirmed `bcryptjs` is present in both the package manifest and lockfile on the restored branch.
- [x] Confirmed the current Prisma `Admin.passwordHash` field is required and matches the existing login, staff-creation, and seed code.
- [x] Added a defensive check in the login route so a null or missing password hash is rejected before it can reach `bcrypt.compare`.
- [x] Kept the existing database schema and staff records unchanged during recovery.

### Rules for the next authentication migration

- [ ] Make schema, API route, staff UI, seed, dependency, and lockfile updates as one coordinated change.
- [ ] Search the full repository for every `passwordHash` and `bcryptjs` reference before removing or changing the field or dependency.
- [ ] Add and review the database migration before deploying code that expects a changed schema.
- [ ] Run `npm run build` against the exact commit intended for deployment.
- [ ] Verify the new Vercel deployment is `READY` before treating the change as complete.
- [ ] Do not treat canceled deployments as build failures; use the actual `ERROR` log and commit SHA to diagnose each failed build.

## Stage 1 — Production smoke test

### Deployment identity and build

- [x] Confirmed GitHub `main` points to commit `b3e4e3c3d45b3df4c66b7b5e0ffe1152c3253a38`.
- [x] Confirmed Vercel production deployment `dpl_8tcmwDJT6BcPBX1Y57qHyA6X7mzk` is `READY`.
- [x] Confirmed the deployed Git SHA matches GitHub `main`.
- [x] Confirmed the build completed and Next.js generated the homepage, admin pages, staff page, and admin API routes.
- [x] Reviewed the build output. The npm config/install-script notices and Prisma update notice are warnings, not build failures.

### HTTP and page checks

- [x] Public homepage `GET /` returned HTTP 200 and rendered the Prestige Live RP page HTML.
- [x] Staff sign-in page `GET /auth` returned HTTP 200 and rendered the email/password form.
- [x] Unauthenticated `GET /admin` returned the sign-in page rather than exposing the dashboard.
- [x] `GET /api/admin/login` returned HTTP 405, as expected for a login endpoint intended to accept POST requests.
- [ ] Could not complete authenticated admin API checks for `/api/admin/me` and `/api/admin/admins`: Vercel's deployment-fetch service was blocked by deployment authentication while attempting to access those dynamic endpoints. No conclusion about their runtime health is claimed.
- [ ] Owner login, dashboard data loading, staff listing/creation/suspension, and audit history still require a real authenticated browser session. No owner credentials were used or requested during this smoke test.

### Database and environment checks

- [x] Confirmed the production Vercel environment contains the expected variable names: `DATABASE_URL`, `SESSION_SECRET`, `GAME_API_KEY`, `OWNER_EMAIL`, and `OWNER_PASSWORD`. Secret values were not read or exposed.
- [x] Ran read-only row-count checks against the connected Supabase database. Existing records were found: Admin 11, Player 11, Category 3, Complaint 12, Response 2, Role 8, SiteSetting 1.
- [ ] These database counts prove that records exist in Supabase, but do not prove that the deployed app can successfully query them using its production connection.

### Production access protection — decision required

Vercel project settings report SSO deployment protection enabled with deployment type `all_except_custom_domains`. The project currently lists only Vercel-provided domains (`prestige-life-rp.vercel.app` and Vercel-generated aliases); no separate custom domain is listed.

This may prevent ordinary players and staff from opening the production site without Vercel team authentication. It is a potential launch blocker, not a confirmed application-code defect. Do not disable protection until the owner confirms the intended public-access model. If this is meant to be a public game site, either disable deployment SSO protection for the production deployment or configure and verify a public custom domain excluded from that protection.

### Stage 1 status

**Partially verified — build and public page rendering pass; authenticated admin workflows and anonymous public accessibility remain unverified.**

Before Stage 1 can be marked complete:

- [ ] Owner confirms whether the public game site should be accessible without Vercel team sign-in.
- [ ] Verify the production site from a normal browser session that is not signed in to Vercel.
- [ ] Owner signs in at `/auth` and confirms the dashboard loads.
- [ ] Verify staff list and staff-management actions using an authorized account.
- [ ] Verify player/site data loads in the dashboard and review runtime logs for database or server errors.

## Supabase status and separate security follow-up

The connected Supabase project is active and healthy. The existing application tables and records are present. No Supabase schema change was made as part of the Vercel recovery or Stage 1 checks.

The Supabase security advisor reports that Row Level Security (RLS) is disabled on 12 tables in the exposed `public` schema: `Admin`, `Category`, `Player`, `Complaint`, `Response`, `AuditLog`, `LinkCode`, `Note`, `ResponseTemplate`, `Evidence`, `SiteSetting`, and `Role`.

This is a separate, critical database security issue, not the cause of the Vercel build failure. Do not blindly enable RLS on every table without defining policies: that can block legitimate access through the Supabase Data API. First confirm which tables, if any, should be exposed to browser clients, then design least-privilege policies. The application should keep privileged database operations on the server.

The Supabase migration-history endpoint currently returns no recorded migrations, so future schema changes need a deliberate migration baseline and review.

## Current verification snapshot

- GitHub repository: `MrDan001/Prestige-Life-RP`
- Production branch: `main`
- Latest verified GitHub commit: `b3e4e3c3d45b3df4c66b7b5e0ffe1152c3253a38`
- Vercel project: `prestige-life-rp`
- Latest verified production deployment: `dpl_8tcmwDJT6BcPBX1Y57qHyA6X7mzk` (`READY`)
- Supabase project: `Prestige RP Project` (`eu-west-1`)
- Admin authentication: restored password-based flow; passwordless invitation system is not implemented.
