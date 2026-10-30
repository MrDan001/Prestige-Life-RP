# Prestige Life RP

Prestige Life RP is a mobile-first roleplay community website and game companion.

## Local setup

1. Open PowerShell in this folder.
2. Run `powershell -ExecutionPolicy Bypass -File .\\setup.ps1`.
3. Start the app with `npm run dev`.
4. In a second terminal, run `powershell -ExecutionPolicy Bypass -File .\\test.ps1`.
5. Open `http://localhost:3000/auth` and sign in with the Owner email and password.

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

Every file starts with a PATH line showing where it belongs in the project.
