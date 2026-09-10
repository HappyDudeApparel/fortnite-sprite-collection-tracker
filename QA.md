# Non-regression rule — 2026-09-10

- Never change or break a working layout, orientation, feature, dataset, artwork mapping, or interaction as collateral to an unrelated update.
- UI fixes must be scoped to the failing breakpoint/orientation/component and guarded against changes to known-good states.
- New confirmed Sprite/variant + finished artwork remains publish-immediately with safe/default details until refined.

# Current publication rule — 2026-09-10

- When a new Sprite/variant is confirmed and finished artwork is available, publish it to the live tracker immediately.
- Use safe/default details where exact per-Sprite metadata is not yet verified; refine those fields later without delaying the Sprite/artwork publication.
- Do not substitute silhouettes when finished artwork is unavailable.

# v2.0.15 validation

Static/data checks completed:
- JavaScript syntax: all inline script blocks pass `node --check`.
- C7S3 released/countable roster: 117.
- C7S4 released/countable roster: 36 (12 families × Base/Cheat/Gold).
- Combined current Fortnite.gg roster represented: 153.
- C7S3 and C7S4 use independent active datasets and progress calculations.
- Default season is C7S4.
- Legacy is rendered only under C7S3 and remains excluded from progress.
- John Wick is Base-only; additional generated silhouettes are disabled.
- Llama has Gem artwork and no Holofoil record.
- Grim Gem and Grim Holofoil remain included.
- Service worker cache version updated to 2.0.15 and retains Fortnite.gg sprite-icon caching support.

Limitation: a full interactive Chromium smoke test could not be completed in the build container because the very large single-file app timed out while loading. Static syntax/data validation passed; final visual/device QA should still be performed after deployment or from the provided preview.
