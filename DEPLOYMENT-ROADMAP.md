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

## Supabase status and separate security follow-up

The connected Supabase project is active and healthy. The existing application tables and records are present. No Supabase schema change was made as part of the Vercel recovery.

The Supabase security advisor reports that Row Level Security (RLS) is disabled on 12 tables in the exposed `public` schema: `Admin`, `Category`, `Player`, `Complaint`, `Response`, `AuditLog`, `LinkCode`, `Note`, `ResponseTemplate`, `Evidence`, `SiteSetting`, and `Role`.

This is a separate, critical database security issue, not the cause of the Vercel build failure. Do not blindly enable RLS on every table without defining policies: that can block legitimate access through the Supabase Data API. First confirm which tables, if any, should be exposed to browser clients, then design least-privilege policies. The application should keep privileged database operations on the server.

The Supabase migration-history endpoint currently returns no recorded migrations, so future schema changes need a deliberate migration baseline and review.

## Current verification snapshot

- GitHub repository: `MrDan001/Prestige-Life-RP`
- Production branch: `main`
- Vercel project: `prestige-life-rp`
- Supabase project: `Prestige RP Project` (`eu-west-1`)
- Last confirmed successful production deployment before this hardening commit: commit `2486ef3`, state `READY`
- Latest hardening commit: verify its Vercel build after push.
