# Treasure Hunters premium release — v2.0.51

Validated November 1, 2026 against v2.0.50. The supplied three-phone concept was the visual benchmark. New original artwork contains no baked interface text; local fonts, responsive WebP and separate SVG/CSS atmosphere provide the final presentation.

## Browser validation

Chromium with Playwright passed at 320×640, 390×844, 844×390, 768×1024 and 1440×900. All three themes were captured and visually reviewed at every size. A separate 3× retina-phone check confirmed selection of the original 1536px assets, with all three themes decoded and captured. Refinement passes corrected map caption contrast, the old hidden genre columns/desktop gutter, legend alignment, and landscape search/logo overlap.

- All 33 C7S5 entries and 11 families appear with four aligned genre columns. Every column is initially visible at all tested widths; the narrowest collection control is 45.5px wide.
- Actual clicks collect and master a Sprite; reloads and theme/season changes retain that progress. Search and summary filters pass.
- Detail/variant selection, all 65 Locker families, background selection and actual 1600×1200 PNG downloads pass.
- All 314 complete Sprite records hash-match the previous release, including all 281 archived C7S3/C7S4 records. Approved Fortune/Cursed SVG bytes are unchanged. Base/Gold icon definitions and collection code are unchanged.
- Archived-season screenshots retain their layout. C7S4 comparisons are pixel-identical; C7S3 comparisons differ by a few antialiased legend-edge pixels only, with no geometry changes.
- All existing inline application scripts are unchanged except the release version and cosmetic theme-switcher labels. Scene/background/export implementations and original storage keys are unchanged. No data migration occurs.
- No browser JavaScript exceptions. All inline scripts and the new atmosphere script pass syntax checks.

## Motion validation

The map route's actual timeline reveals from dash offset 1 to 0 and brings the treasure X from opacity .25 to 1. Sea has eight bubbles and refracted light; tavern has lantern glow and mist. Real pause/resume clicks freeze/resume each active timeline; the preference survives reload. Scrolling the hero offscreen suspends animation. System reduced motion stops the atmosphere and removes the motion button. The visibility handler passed a synthetic hidden/visible signal; real background-tab visibility could not be simulated by headless Chromium.

## Reproduction and production evidence

Run `CHROMIUM_PATH=/usr/bin/chromium python3 scripts/qa-c7s5-premium.py --output /tmp/c7s5-premium-qa` with Playwright/Pillow installed. The GitHub theme workflow runs the same suite and uploads responsive screenshots and exported PNGs. Its production check also verifies the live release and asset bytes and captures each theme in a live mobile/desktop browser.

Current-instance evidence is retained outside the checkout at `/workspace/scratch/c7s5-qa/final-run/`, `/workspace/scratch/c7s5-qa/final-visual/` and `/workspace/scratch/c7s5-qa/motion-review.json`.

Existing portrait-to-family artwork mapping remains provisional; this cosmetic release does not change those portraits or their attribution.
