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

## 2D playable v0.4
- Original 18 playable Sprite families and unique original prototype power definitions retained; one long scrollable platformer with enemies, hazards, destruction, checkpoints and tube objective.
- Articulated image-piece animation now separately moves both side-arm regions and both lower-leg regions while preserving all artwork pixels. Gentle action response, walking gait, air pose, motion toggle and OS reduced-motion preference.
- `?sprite=<collection record id>` selects a character through `arcade/catalog.json`, swaps in that record’s **authentic corresponding variant artwork** and auto-starts the matching original-family prototype move.
- Unsupported Sprite families retain the original 18-family character-select screen; no imaginary "canonical" power has been invented. Abilities in this legacy prototype are original fan-game attacks, not an assertion of Epic’s official ability definitions.
- Handheld touch controls and keyboard remain intact; landscape recommended.

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
2. Iteratively improve 2D puppet masks/joints/posed action animation from actual in-game captures.
3. Implement proper 3D rigging, animation, per-Sprite abilities and controller, with real models only after independent canon-accuracy checks.
4. Design and playtest several distinct, compact Fortnite-inspired challenges; **do not import GB locations or name vocabulary**. Author navigation and hazard puzzles, verify reset/respawn, accessible route and sustained frame rate before expanding.
5. Review rightsholder fan-content permissions and get approval before promoting any game to production.

## Smoke test
`.github/workflows/sprite-arcade-stage-qa.yml` verifies root production file hashes, archived original sources, game JavaScript syntax, 2D Locker autostart, actual movement and articulation toggle, 3D GPU startup and artwork/prop readiness, as well as public staging routes. Screenshots may be skipped in headless software WebGL if the browser stalls while capturing a continuously-rendered canvas; browser gameplay assertions remain required.
