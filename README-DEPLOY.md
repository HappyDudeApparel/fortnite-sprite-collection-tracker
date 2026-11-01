# Sprite Collection Locker — v2.0.50 Treasure Hunters (November 1, 2026)

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
If a phone still opens the previous season, refresh the browser or close/reopen the installed PWA. Check the bottom-left release badge for **v2.0.48**. The app service worker cache name rotates with the version.

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
