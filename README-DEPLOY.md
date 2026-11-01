# Sprite Collection Locker — v2.0.52 Approved Season Designs (November 1, 2026)

## Live site
https://sprites.happydude.ca/

The production branch is `main`. GitHub Pages serves the repository root. No manual ZIP upload is required.

## Collection state
- **C7S5 Treasure Hunters (default): 33 collectible Sprites** — 11 families × Base, Fortune and Cursed. A fourth **Gold** column is visible for the officially scheduled November 12 release; Gold records are not yet counted.
- **C7S4 Override: 162 collectibles** (archived and still playable).
- **C7S3 Runners: 117 collectibles** (archived; 119 total stored data records including Legacy).
- All 281 pre-existing C7S3/C7S4 records, image paths, ownership IDs and mastery progress keys remain intact.
- C7S5 is a separate local collection. All 33 portraits are locally hosted WebP crops from the 1536×864 VICE/Epic montage with limbs retained; image-to-name attribution remains provisional until independent portrait sources are available.

## Troubleshooting
If a phone still opens the previous season, refresh the browser or close/reopen the installed PWA. Check the bottom-left release badge for **v2.0.52**. The app service worker cache name rotates with the version.

## Follow-up image QA
Replace VICE collage cutouts with individually verified transparent PNG/WebP artwork from an authentic source when available. Verify the visual family assignments before declaring final art complete; never alter C7S3 or C7S4 in that work.

## Sources
https://www.vice.com/en/article/all-33-new-fortnite-sprites-added-in-treasure-hunters-mini-season-full-list/
https://communities.epicgames.com/thread/set-sail-for-fortnite-treasure-hunters-the-greatest-adventure-of-all-time/Pmud

## v2.0.49 visual theme preview
On the C7S5 overview, tap the compact **Theme** pill inside the season banner to cycle **Map Glow → Deep Sea → Tavern**. Three visual treatments correspond to the approved concept board. The last choice persists in `localStorage.scl_c7s5_theme_v1`; no collection, Sprite progress, detail, season or Locker state is affected.

Variant legend now uses the selected **Fortune C** (neon-green four-leaf clover inside a brass luck charm) and **Cursed C** (purple haunted relic skull with gold band). **Base and Gold are not modified.** All theme CSS is restricted to the active C7S5 overview; the other two season pages and their independent stored data stay unchanged. Themes only replace backgrounds, colours, materials and dot icon art—not dimensions, rows, columns or click handlers.

## v2.0.50 exact approved-concept illustrated skins
The active C7S5 page theme button still cycles Map Glow → Deep Sea Relic → Pirate Tavern Mystic. Unlike the earlier simple SVG-only interpretation, each theme now directly uses locally hosted cropped artwork from the user's approved design reference. Assets: three fully illustrated mobile hero scenes (with baked decorative banner title and Season Collection ribbon), three natural chest-and-ornamental summary-panel backgrounds, and three detailed bottom murals. These are kept at 2x source pixel dimensions, exported as compressed WebP and served locally. The native accessible hero text remains in the DOM but is visually hidden to avoid double-printing the title. The existing app layout, five functional collection summary tiles, 11x4 C7S5 row geometry and saved theme preference are retained. The side-by-side mockups themselves contained fictional demo row names and an incorrect example tally; those are not imported as data. All 281 existing C7S3/C7S4 Sprite records stay byte-identical, and 33 C7S5 sprites remain untouched.


## v2.0.51 premium Treasure Hunters environments
The C7S5 overview uses original, text-free illustrated environments with real local-font typography. Treasure Map Glow reveals a dotted treasure route; Deep Sea Relic has rising bubbles and moving refracted light; Pirate Tavern Mystic has lantern glow and drifting violet mist. The theme button cycles all three and retains the existing `scl_c7s5_theme_v1` preference. A separate Motion button pauses the atmosphere, and the system reduced-motion preference disables it automatically. Animation also pauses offscreen and in background tabs.

The existing family-plus-four-genre table now fills its available width and shows all four genres on phones. Every collection control and its original handler remains intact. There are no data migrations. All 314 Sprite records, including C7S5's 33 entries, and approved Fortune/Cursed icon files are hash-checked against v2.0.50. C7S3/C7S4, Locker, scene backgrounds and export implementation are unchanged.

Local assets: `assets/ui/c7s5-{map,sea,tavern}-{mobile,wide}.webp` (960px/1536px, undistorted `object-fit:cover`), `c7s5-premium.css`, `c7s5-atmosphere.js`, and OFL-licensed fonts in `assets/ui/fonts/`. Original generated artwork follows the user-supplied concept's art direction; it is not a crop of the phone mockups. Historical v2.0.50 artwork remains on disk for compatibility.

Run the meaningful static and browser regressions with:

```sh
CHROMIUM_PATH=/usr/bin/chromium python3 scripts/qa-c7s5-premium.py --output /tmp/c7s5-premium-qa
```

Requirements: Python with Playwright and Pillow, plus system Chromium or `python -m playwright install chromium`. The suite checks mobile portrait/landscape, tablet and desktop; themes; ownership/mastery persistence; search/filter; detail/variant selection; Locker/background selection; 1600×1200 PNG download; archived seasons; reduced motion and ambient motion. GitHub Actions runs the same script on release changes.


## v2.0.52 — approved season designs and unified navigation
C7S3 Runners now uses the supplied blossom/waterfall scenery and the exact canonical Water/Earth/Fire assets. C7S4 Override uses the approved title artwork, unlabelled scenery derivatives and the exact canonical Sonic/Tails/Shadow/Klombo/8-Bit assets. All overview counts, filters, rows, mastery bars and details remain live. No mockup ownership values or invented Sprite portraits are imported.

The single native navigation strip is now **C7S3 / Runners → C7S4 / Override → C7S5 / Treasure Hunters → Locker**. C7S5 remains the default opening season. Detail views retain their current-season navigation context. One legacy presentation hook now reads the actual season state instead of tab text, so the two-line labels cannot disable C7S4 styling.

The black map route is registered to the rendered map image, draws once, reveals its red X at the endpoint and settles. Sea bubble rules are byte-identical to v2.0.51. Lantern/chest glow anchors follow their artwork through `object-fit` crops and resize; reduced motion is static. Saved collections and the background/export catalogue are unchanged.

See [source and QA audit](docs/APPROVED-SEASONS-V2052.md). Additional checks: `python3 scripts/qa-navigation.py` and `python3 scripts/qa-c7s5-atmosphere.py`. Existing package/source originals remain in the extracted handoff outside the checkout; the six published scenery derivatives have exact crop/source checksums in `assets/ui/seasons/provenance.json`.
