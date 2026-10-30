# Prestige Life RP — Deployment Reliability Roadmap

Updated: 30 October 2026

## Incident: failed Vercel builds during admin authentication changes

### Root cause

The failed deployments were caused by inconsistent intermediate commits during an unfinished admin-authentication transition. Vercel installed dependencies, generated Prisma Client, and reached the Next.js TypeScript build before compilation failed. This was not a Vercel deployment quota or daily-limit failure.

The inspected build logs show three code-integrity problems:

- The login route imported bcryptjs while that package was absent from package.json and the lockfile in one intermediate commit.
- Other intermediate commits removed Admin.passwordHash from the Prisma model while existing admin-creation and seed code still attempted to write passwordHash.
- A later intermediate schema made passwordHash nullable, but the login route passed it directly to bcrypt.compare, which requires a non-null string.

### Recovery and hardening

- [x] Restored main to the last coherent password-based authentication implementation at commit 2486ef3.
- [x] Confirmed the restored deployment reached Vercel READY.
- [x] Confirmed bcryptjs is present in the package manifest and lockfile.
- [x] Confirmed Prisma Admin.passwordHash matches the existing login, staff-creation, and seed code.
- [x] Added a defensive check so a missing password hash is rejected before it reaches bcrypt.compare.
- [x] Kept the existing database schema and staff records unchanged during recovery.

### Rules for the next authentication migration

- [ ] Make schema, API route, staff UI, seed, dependency, and lockfile updates as one coordinated change.
- [ ] Search the full repository for every passwordHash and bcryptjs reference before changing the field or dependency.
- [ ] Add and review the database migration before deploying code that expects a changed schema.
- [ ] Run npm run build against the exact commit intended for deployment.
- [ ] Verify the new Vercel deployment is READY before treating the change as complete.
- [ ] Do not treat canceled deployments as build failures; use the actual ERROR log and commit SHA.

## Stage 1 — Production smoke test

### Deployment identity and build

- [x] Confirmed the recovery build reached Vercel READY.
- [x] Confirmed the follow-up documentation deployment reached Vercel READY at commit 9d531a1ee5f2734bae08af9f53d05ff8ca4e0550.
- [x] Confirmed Next.js generated the homepage, admin pages, staff page, and admin API routes.
- [x] Reviewed build output. npm configuration/install-script notices and the Prisma update notice are warnings, not build failures.

### HTTP and page checks

- [x] Production homepage GET / returned HTTP 200 and rendered the Prestige Live RP homepage.
- [x] Sign-in page GET /auth returned HTTP 200 and rendered the staff email/password form.
- [x] An unauthenticated visit to /admin returned the application sign-in page rather than the dashboard.
- [x] GET /api/admin/login returned HTTP 405, as expected for a login endpoint intended to accept POST requests.
- [ ] Authenticated admin API checks for /api/admin/me and /api/admin/admins, plus Owner login, dashboard data loading, staff management, and audit history, still require a real authorized browser session.

### Public production domain and admin access

The owner confirmed that players must be able to visit https://prestige-life-rp.vercel.app publicly until a replacement custom domain is configured.

- [x] Changed the Vercel project's Vercel Authentication (SSO Protection) scope from all_except_custom_domains to prod_deployment_urls_and_all_previews (Standard Protection).
- [x] Re-read Vercel project settings and confirmed Vercel Authentication remains enabled with the Standard Protection scope.
- [x] The intended effect is that the production domain prestige-life-rp.vercel.app is public while preview and generated deployment URLs remain protected by Vercel Authentication.
- [x] Kept the application's own admin login and session/authorization code unchanged. Making the production website public does not grant an application admin session.
- [x] Confirmed the /admin route still serves the application's sign-in screen when no application session is present.
- [ ] Final independent anonymous-browser verification of the public production domain is still recommended. The available remote deployment-fetch path uses Vercel's authenticated share-link mechanism, and the independent external fetch in this environment could not resolve the hostname. The saved Vercel protection setting is verified, but this is not represented as a completed anonymous-browser test.

The current application login remains email/password. The separately discussed passwordless invitation system has not been implemented and was not changed as part of this deployment-protection task.

### Database and environment checks

- [x] Confirmed the production Vercel environment contains the expected variable names: DATABASE_URL, SESSION_SECRET, GAME_API_KEY, OWNER_EMAIL, and OWNER_PASSWORD. Secret values were not read or exposed.
- [x] Ran read-only row-count checks against Supabase. Existing records were found: Admin 11, Player 11, Category 3, Complaint 12, Response 2, Role 8, SiteSetting 1.
- [ ] Record counts prove data exists in Supabase, but do not prove that the deployed app can successfully query it through its production connection. Dashboard data access still needs a real authenticated test.

### Stage 1 status

**Partially verified.** The production build is healthy, the production-domain protection setting is now configured for public player access, and /admin remains behind the application's sign-in flow. A real anonymous-browser check and authorized Owner/admin workflow test are still outstanding.

Remaining checks:

- [ ] Open https://prestige-life-rp.vercel.app in a private/incognito browser that is not signed in to Vercel and confirm the homepage loads without a Vercel login.
- [ ] Sign in through /auth using an authorized account and confirm the dashboard loads.
- [ ] Verify staff listing and staff-management actions.
- [ ] Verify player/site data loads in the dashboard and review runtime logs for database or server errors.

## Supabase status and separate security follow-up

The connected Supabase project is active and healthy. Existing application tables and records are present. No Supabase schema change was made as part of the Vercel recovery or Stage 1 checks.

The Supabase security advisor reports that Row Level Security (RLS) is disabled on 12 tables in the exposed public schema: Admin, Category, Player, Complaint, Response, AuditLog, LinkCode, Note, ResponseTemplate, Evidence, SiteSetting, and Role.

This is a separate database security issue, not the cause of the Vercel build failure. Do not blindly enable RLS on every table without defining policies. First confirm which tables, if any, should be exposed to browser clients, then design least-privilege policies. The application should keep privileged database operations on the server.

The Supabase migration-history endpoint currently returns no recorded migrations, so future schema changes need a deliberate migration baseline and review.

## Current verification snapshot

- GitHub repository: MrDan001/Prestige-Life-RP
- Production branch: main
- Previous smoke-test commit: 9d531a1ee5f2734bae08af9f53d05ff8ca4e0550
- Vercel project: prestige-life-rp
- Latest verified production deployment before the documentation-only updates: dpl_4EJJmKxFcF9grSM8RMvkyyZEki25 (READY)
- Production domain: https://prestige-life-rp.vercel.app (configured public under Standard Protection)
- Admin authentication: current email/password flow remains in place; passwordless invitation system is not implemented.
- Supabase project: Prestige RP Project (eu-west-1)
