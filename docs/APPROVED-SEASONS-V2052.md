# Approved season designs — v2.0.52 source and QA audit

The functional baseline is production `feeaa62a0f93f2266e1529c1722d635ac846ead7` (v2.0.51). Existing local navigation/animation work was preserved before extracting the two independently uploaded archives outside the checkout. Both part notes, `START_HERE_FOR_CODEX.md`, the updated master handoff, nested source READMEs/manifests, working images and processing scripts were inspected. No packaged application code replaced production code.

## Artwork fidelity and provenance

- Runners uses supplied blossom, waterfall and mountain scenery with native live typography and the exact original Water/Earth/Fire WebP files. Sprite pixels and transparency are untouched; the corrected concept's black portrait rectangles are not reproduced.
- Override uses the supplied approved title illustration and unlabelled scenic sections. The five foreground Sprite images reference the exact canonical Sonic, Tails, Shadow, Klombo and 8-Bit paths from the handoff/current roster. Generated concept character lineups are not used.
- Overview scenery is decorative illustration, not a claim of named official game geography. The existing Sprite scene/background catalogue and export rendering remain unchanged.
- `scripts/prepare-approved-season-art.py` reproducibly creates six nondestructive scenery derivatives. The original full-resolution sources remain preserved under `/workspace/scratch/approved-handoff/`. `assets/ui/seasons/provenance.json` records source SHA-256, exact crop boxes and output checksums.
- Approved Runners source: `b18e317f9dd7e4cf08eb4ed0a11af0fe1322413557a5d95970ef40051d41d221`.
- Approved Override source: `7654ab6d4f5971b529c50978a0c5bb96277b969c26008a99bd018049ca5061bc`.

## Changed-file audit

| Files | Purpose |
| --- | --- |
| `index.html` | Native tab reorder/two-line labels, supplied-art heroes, route/X/chest decoration, release/cache links. A legacy C7S4 presentation hook reads season state rather than label text. |
| `assets/ui/scl-navigation.css`, `.js` | Shared accessible header layout, active/current-season state and retained utilities. Existing click handlers are unchanged. |
| `assets/ui/archive-seasons.css`, `seasons/*` | Scoped Runners/Override materials and supplied scenery. No row dimensions, variant logic, data records or Sprite portraits are replaced. |
| `assets/ui/c7s5-premium.css`, `c7s5-atmosphere.js` | One-shot image-registered black route/red X and calibrated lantern/chest ambience. Sea bubble rules are frozen against production. |
| `scripts/prepare-approved-season-art.py`, `qa-navigation.py`, `qa-c7s5-atmosphere.py` | Reproducible art provenance, responsive navigation, canonical/core preservation, independent ownership/mastery and animation tests. |
| Existing premium/live QA, workflow and release metadata | Seven-size coverage, all-season live screenshots, 22 deployed asset hashes and consistent v2.0.52 cache/version metadata. |

## Preservation gates

All 314 Sprite objects are hash-checked against production: 119 C7S3 stored records (117 collectible), 162 C7S4 and 33 C7S5. Their IDs, portraits, variant sets and mastery/storage semantics remain unchanged. The entire original main application script, normalized only for its release version, retains SHA-256 `9fa290c7a17fd3f190a5aa7542e9a2a9666b5c3ec793a0b42bf3fffac5f05797`. This includes collection, storage, selected Sprite, backgrounds, Locker and export logic. Approved Fortune/Cursed icons and Base/Gold definitions are retained.

Mockup totals such as 117/117, 162/162, 100% and 4/4 were not imported. Five summary/filter controls still derive their values from the real collection. C7S3 retains eight native variant columns and special Legacy; C7S4 retains seven; C7S5 retains four, with 33 collectible entries.

## Browser checks and visual comparisons

The repeatable suites cover 320×640, 360×800, 390×844, 844×390, 768×1024, 1024×768 and 1440×900. Screenshots of every season were compared with the supplied concepts. Refinements corrected a tab-label compatibility issue, narrow legend label collisions, scenery edge blending and spacing between the map route and live text.

Checks exercise actual season/detail/Locker/search/name utility/keyboard clicks; all four navigation targets fit and remain hit-testable at 44px or more. Ownership/mastery edits in all three seasons persist independently through reload, with C7S5 opening by default. The collection suite downloads real 1600×1200 PNG exports and verifies existing backgrounds/Locker. Exact canonical RGBA source bytes and scenery provenance are checked.

Animation tests seek real browser timelines: black dashes progressively reveal, the red X is hidden through route completion, the endpoint matches the X, and the result remains settled after the single iteration. Painted path/X geometry avoids live text. Eight bubbles retain exact production styles/timings. Lantern/chest anchors track actual image crops through resize. Real pause/resume, reload, offscreen suspension and reduced motion are exercised; document visibility handling uses a synthetic signal because headless Chromium does not reliably expose real background-tab visibility.

Run:

```sh
python3 scripts/qa-c7s5-premium.py --output /tmp/season-qa/collection
python3 scripts/qa-navigation.py --output /tmp/season-qa/navigation
python3 scripts/qa-c7s5-atmosphere.py --output /tmp/season-qa/atmosphere
python3 scripts/qa-c7s5-live.py --output /tmp/season-qa/live
```

Use `CHROMIUM_PATH=/usr/bin/chromium` when appropriate. Playwright/Pillow are required. The CI workflow runs these checks and uploads source/local/live screenshots, PNG exports and JSON evidence. Current-instance results and comparisons are under `/workspace/scratch/approved-final-qa/`.
