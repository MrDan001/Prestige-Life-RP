# Prestige Life RP

Prestige Life RP is a mobile-first roleplay community website and game companion.

## Local setup

1. Open PowerShell in this folder.
2. Run `powershell -ExecutionPolicy Bypass -File .\\setup.ps1`.
3. Start the app with `npm run dev`.
4. In a second terminal, run `powershell -ExecutionPolicy Bypass -File .\\test.ps1`.
5. Open `http://localhost:3000/auth` and sign in with the Owner email and password.

## Production access

- Public player-facing website: https://prestige-life-rp.vercel.app
- Vercel Authentication uses Standard Protection: the production domain is public, while preview and generated deployment URLs remain protected.
- Admin access remains behind the application's own sign-in/session checks at `/auth` and `/admin`. Vercel's public production-domain setting does not grant an application admin session.
- The deployed admin flow is currently email/password. The separately discussed passwordless invitation flow has not yet been implemented.
- When a replacement custom domain is ready, add and verify it in Vercel before changing player-facing links or redirects.

## Visual quality

- The header uses the custom Prestige crown wordmark in `public/prestige-logo.svg`.
- The footer intentionally contains no logo; its copyright and admin-access content remain.
- The feature strip uses hand-drawn inline SVG line icons rather than Unicode symbol characters, with consistent stroke weight and icon sizing.

The public homepage uses a consistent cinematic image system:
- A wide city hero image with responsive focal-point adjustments.
- A separate city image for the About panel.
- Four distinct gallery images, each cropped into equal-sized cards.
- Dark overlays are used for readable text, not to blur or soften the photographs.

Image sizing, alignment, crop positions, and the next visual checks are tracked in [IMAGE-QUALITY-ROADMAP.md](./IMAGE-QUALITY-ROADMAP.md).

## Build and deployment

- The production app is connected to the `prestige-life-rp` Vercel project and deploys from `main`.
- The build command is `prisma generate && next build`; Prisma schema changes must remain in sync with API routes, seed scripts, dependencies, and the database.
- Deployment incident findings and follow-up checks are tracked in [DEPLOYMENT-ROADMAP.md](./DEPLOYMENT-ROADMAP.md).
- Keep database and session secrets in Vercel environment variables; never commit their values.

Every file starts with a PATH line showing where it belongs in the project.
