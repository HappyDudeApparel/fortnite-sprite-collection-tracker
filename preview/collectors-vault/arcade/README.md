# Sprite Arcade — Collector’s Vault staging integration

**Current status:** Restored browser games with prototype enhancements, staged under:
- `https://sprites.happydude.ca/preview/collectors-vault/#arcade`
- `https://sprites.happydude.ca/preview/collectors-vault/arcade/2d/`
- `https://sprites.happydude.ca/preview/collectors-vault/arcade/3d/`

**Approval boundary:** All changes are isolated to `preview/collectors-vault/` (including staging-specific QA workflows). Production Sprite Collection Locker v2.0.43 remains untouched. GB GAMER BROS™ Adventure Mountain™ source, levels, enemies, characters and game mechanics are not modified or imported.

## Restored originals — never overwritten
- `source-original/Sprite-Game-Preview-v0.3.html` — recovered original 2D source from Drive.
- `source-original/Sprite-3D-Arena-Visual-Upgrade-v0.2.html` — recovered original 3D source from Drive.

The playable staging versions are separate files. Preserve the archived copies for regression and fidelity checks.

## 2D playable v0.5 — five-level pack
- Original 18 playable Sprite families and unique original prototype power definitions retained. Choose a Sprite, then choose a level; clearing a level unlocks the next (a **testing** toggle on the level screen unlocks all). Progress, stars and best gem counts are saved in the browser only (`localStorage`); nothing touches the Locker or any account.
- Articulated image-piece animation separately moves both side-arm regions and both lower-leg regions while preserving all artwork pixels. Motion toggle and OS reduced-motion preference retained.
- `?sprite=<collection record id>` still selects a character through `arcade/catalog.json`, swaps in that record's **authentic corresponding variant artwork** and auto-starts the matching original-family prototype move. Add `&level=N` (1–5) to pick the level; the default is level 1.
- Unsupported Sprite families retain the original 18-family character-select screen; no imaginary "canonical" power has been invented. Abilities in this legacy prototype are original fan-game attacks, not an assertion of Epic's official ability definitions.
- Handheld touch controls and keyboard remain intact; landscape recommended.

### The levels (original to Sprite Arcade; no Adventure Mountain names or layouts)
| # | Level | Theme | New in this level |
|---|---|---|---|
| 1 | Sunflower Run | Meadow, river gorge, collection facility | The original July level, kept intact, plus gems |
| 2 | Lumen Caverns | Glowing crystal cave | Ferry platform, crumbling crystal steps, bounce pads, pits |
| 3 | Cloudspire Climb | Sky islands | No ground to fall back on: moving clouds, a lift cloud, crumbling clouds, pads |
| 4 | Cinder Works | Lava foundry | Lava floor, girder ferries, a rising lift, crumbling grates |
| 5 | Frostline Pass | Snow and ice | Slippery ice, icicle hazards, ferry floes, pad shortcut, finale gauntlet |

Every level has parallax backdrops (static sky + three tiling depth layers), ambient particles (motes, clouds, embers or snow), themed platform and hazard skins, per-level checkpoints, and gems with a three-star rating (★ finish · ★★ at least 70% of gems · ★★★ every gem).

### Mechanics added to the engine
Moving platforms (riders are carried), crumbling platforms (shake ~0.6 s, vanish, return after ~2.6 s), bounce pads (a pad launch ignores the short-hop cut), lava, ice (slippery ground), collectible gems, level select, level-complete card, and a parallax/ambient renderer. Existing power, enemy, brick, boulder, crystal and tube logic is unchanged.

### Authoring and validating levels
- Levels are plain data in `2d/levels.js` (no DOM). Looks are in `2d/themes.js`.
- `node preview/collectors-vault/arcade/tools/validate-levels.js` replays the game's own physics (same constants and collision rules) from every standing spot, trying walking, jumps, double jumps, pads and moving platforms at random phases. It **fails the build** unless the tube and every gem are reachable from the spawn, and also checks that enemies, checkpoints, the tube, pads and hazards sit on real ground and that props don't overlap. `--struct` runs only the fast structural checks.
- The validator treats bricks, boulders and crystals as passable because every power destroys them. It does not model enemy damage or timing-based mover alignment beyond random phase sampling, so a human playtest is still the final word on difficulty.

## 3D playable v0.3
- Original bundled Three.js/WebGL arena preserved with movement, touch joystick, jumping, charged prototype shockwave, opponents, destruction and tube objective.
- `?sprite=<collection record id>` loads the selected Sprite’s exact catalogue art as a 2.5D camera-facing 3D-world avatar; opponent appearances use authentic Water/Earth/Fire Sprite images. Original generic lookalike meshes are hidden only after the approved art has loaded successfully.
- Selected artwork is genuinely in the 3D world, **not merely a HUD portrait**. The original combat controller remains experimental and does not claim an official ability for all 281 catalogue variants.
- Five real CC0 Kenney environment model meshes (pine tree, rocks, flowers, fence and grass-topped stone corner) and texture atlas were recovered from the **generic third-party asset pool** already included in the Adventure Mountain dev repository. These are independently reusable Kenney third-party environment props; **no GB franchise assets** are reused.
- Props render as real Three.js BufferGeometry meshes with their original vertices, normals, UVs and Kenney-colour texture atlas. A reduced subset is used on touch-capable devices to keep mobile memory and GPU demands lower.
- `props/kenney-environment.json` contains source repository/ref/blob provenance for each original Kenney asset. Original Kenney CC0 source: https://kenney.nl/assets/platformer-kit.
- No level names, character designs or gameplay mechanics have been imported from Adventure Mountain.

## Arcade launcher and Locker entry
- New **▶ Arcade** tab in Collector’s Vault staging.
- New **▶ Play This Sprite** control on the featured Sprite panel of the existing **Locker**, launching the Arcade with the actual selected record/variant.
- New full-collection Sprite selector and variant-specific game links. Playable 2D is restricted to the original 18 families while the current 3D 2.5D system can display any available released authentic Sprite art.
- Dedicated full-window game pages allow browser back, minimizing PWA collector UI overhead; game state does not modify the collection tracker or Fortnite accounts.

## Canon and intellectual-property gates
- Fortnite Sprite names and character artwork reused only from the verified current collection-tracker record library.
- Legacy fan-game special attacks and newly composed arenas/props are **fan-game design**, not falsely labelled as official Fortnite gameplay or locations.
- New proposed levels must **not** reuse any names from GB Adventure Mountain or any of its approved level/location vocabulary.
- No GB playable characters, stone enemies, cannon systems, bots, lore, mechanisms, proprietary concept art or world maps can enter the Sprite Arcade.
- Public fan-content use needs a separate policy/licensing review before a permanent production game launch. The preview currently carries prototype/fan-made notices.

## 3D model upgrade pipeline
Higgsfield offers genuine 3D generation workflows beyond simple 2D pictures, including `sam_3_3d` (Meta single-image object→GLB), `image_to_3d` (Meshy single-image→GLB with optional rigging and animation) and `multi_image_to_3d` (Meshy 1–4 images→GLB). These models would be evaluated against exact authentic Sprite proportions, face, anatomy, arm/foot silhouettes, texture and polycount; model generation may incur credits and **was not started** without cost approval. Existing game-specific 2.5D billboards are the truthful fallback until 3D models pass visual comparison.

## Development priorities (not all complete)
1. Finish automated browser and visual QA on mobile and desktop.
2. Iteratively improve 2D puppet masks/joints/posed action animation from actual in-game captures, and give Sunflower Run the same layered parallax treatment as levels 2–5.
3. Implement proper 3D rigging, animation, per-Sprite abilities and controller, with real models only after independent canon-accuracy checks.
4. Human playtest of the five 2D levels for difficulty and feel (the validator proves completability, not fun); tune checkpoints, enemy counts and ice behaviour from that feedback. Then design the 3D arena levels the same way; **do not import GB locations or name vocabulary**.
5. Review rightsholder fan-content permissions and get approval before promoting any game to production.

## Smoke test
`.github/workflows/sprite-arcade-stage-qa.yml` verifies root production file hashes, archived original sources, game JavaScript syntax, 2D Locker autostart, actual movement and articulation toggle, 3D GPU startup and artwork/prop readiness, as well as public staging routes. Screenshots may be skipped in headless software WebGL if the browser stalls while capturing a continuously-rendered canvas; browser gameplay assertions remain required.
