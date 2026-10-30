# Prestige Life RP — Image Quality & Alignment Roadmap

Updated: 30 October 2026

## Goal
Bring the homepage photography closer to the supplied desktop reference: crisp cinematic images, consistent framing, balanced composition, and a clean responsive layout.

## Completed in this pass
- [x] Stop reusing the same tiny 7.6 KB WebP as the hero, About image, and all four gallery scenes.
- [x] Give the hero a dedicated high-resolution city photograph and responsive focal-point positioning.
- [x] Give the About panel its own city photograph.
- [x] Give Law Enforcement, Business & Careers, Vehicles & Lifestyle, and Events & More distinct photographs.
- [x] Use one consistent 4-column desktop gallery grid and a 2-column tablet/mobile grid.
- [x] Set stable image aspect ratios so cards align evenly rather than inheriting inconsistent heights.
- [x] Keep overlays limited to the lower portion of gallery images so photographs remain visible while labels stay readable.
- [x] Update the README with the visual asset approach and roadmap reference.

## Brand mark and icon pass — completed 30 October 2026
- [x] Replaced the improvised crown text glyph with a dedicated vector crown + PRESTIGE + LIVE RP logo matching the supplied reference composition.
- [x] Use the official logo asset in the site header; the footer intentionally has no logo.
- [x] Removed the footer logo while preserving its existing copyright and admin-access content.
- [x] Replaced the four Unicode feature symbols with custom SVG outline icons for community, economy, roleplay, and possibilities.
- [x] Standardised the feature icon box, stroke thickness, headings, and description spacing for a more deliberate aligned row.
- [x] Updated README documentation for the official wordmark and icon system and the footer layout.

## Verification still required
- [ ] Run `npm run build` and resolve any build errors.
- [ ] Compare the rendered crown proportions, gold wordmark, and LIVE RP lettering against the supplied reference on desktop and mobile.
- [ ] Confirm SVG logo sizing does not crowd the compact mobile navigation.
- [ ] Review the new line icons at high-density mobile scale and adjust stroke thickness only if necessary.
- [ ] Check the homepage at 1440px, 1024px, 768px, 390px, and 360px widths.
- [ ] Confirm each Unsplash image URL loads in production and review the crop against the intended scene.
- [ ] If production must not depend on a third-party image CDN, download approved originals into `public/images/` and switch the CSS to local assets.
- [ ] Review hero text contrast on narrow screens and adjust only the overlay strength if needed.
- [ ] Confirm image loading and layout stability on a slower mobile connection.

## Implementation note
The photographs are currently loaded from the Unsplash image CDN with explicit width and quality parameters. CSS backgrounds are used so existing component markup and accessibility labels remain unchanged. The site still needs a browser-level visual pass after deployment.
