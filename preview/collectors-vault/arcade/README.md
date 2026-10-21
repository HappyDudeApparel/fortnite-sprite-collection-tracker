# Sprite Games — Collector's Vault staging

**Entry point:** the staging page (`/preview/collectors-vault/`) keeps its original look and has a single **🎮 Play Sprite Games** button. It opens the hub at `/preview/collectors-vault/arcade/` where you pick **2D** or **3D**.

- `arcade/index.html` — the 2D/3D chooser
- `arcade/2d/` — Sprite Platformer (five levels)
- `arcade/3d/` — Sprite Arena (three worlds, real 3D)

**Approval boundary:** all changes are isolated to `preview/collectors-vault/` (plus the staging QA workflow). Production Sprite Collection Locker v2.0.43 remains untouched (the QA workflow verifies the root files by hash). GB GAMER BROS™ Adventure Mountain source, levels, enemies and mechanics are not modified or imported; the only things shared with the Gamer Bros repos are generic CC0 Kenney art and the recovered Sprite character models listed below.

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

## 3D — Sprite Arena (rebuilt from scratch)
The earlier 3D prototype lagged and glitched (a single 600 KB bundle with ~70 dynamic lights, physical materials and a flat 2.5D avatar). It is replaced by a performance-first rebuild; the old file is preserved at `source-original/Sprite-3D-Arena-Visual-Upgrade-v0.2.html`.

**Game:** third-person platformer. Run, jump, double jump, **Bite** rivals (or stomp them), collect shards ✦ and hearts ♥, ride springs, dodge saws and spikes, light checkpoint flags, and reach the glowing Collection Tube. Three worlds — Sunflower Isles, Frostline Heights (aurora night), Cinder Isles (lava) — each with ★ ratings (★ finish · ★★ 70% shards · ★★★ every shard), saved in the browser only. Keyboard, gamepad and touch (virtual stick, Jump, Bite, drag-to-look) are supported.

**Characters**
- **Citrus Sprite** — the recovered rigged 3D model (`assets/characters/citrus.glb`, from `gamer-bros-game/pass1-v1/assets/recovered/characters/sprite_hero.glb`) with a matte "jelly" material (soft fresnel glow instead of glossy plastic). Idle / Walk / Jump / Bite / Hit / Dance animations are used.
- **Any other Sprite** from the collection catalogue can be chosen on the title screen (or via `?sprite=<id>`); until a rigged model exists for it, it plays as 2.5D collection art with squash-and-stretch and a real cast shadow.
- Rivals use the recovered rigged monsters (`ghost`, `yeti`, `stump`, `cthulhu`, `alien`). **Their original author/licence is not recorded** — confirm before any public release. See `3d/assets/characters/README.md`.
- To add another 3D Sprite: drop a rigged `.glb` into `3d/assets/characters/` and add it to `3d/js/roster.js`.

**Performance design** (budgets measured on the real build; see `?debug=1` for a live readout)
- ~65–72 draw calls and 68–86k triangles per world, ~0.4 ms of JS per frame, flat JS heap (no per-frame allocation).
- One shadow-casting light that follows the player; everything repeated is instanced (terrain, trees, gems, flags, spikes, contact shadows); one palette-textured material for the whole Kenney kit; no post-processing.
- **Adaptive quality governor**: a six-step ladder (resolution scale → pixel-ratio cap → shadow size → shadows off → fewer particles). It only steps down when the frame rate actually suffers. `?q=0..5` locks a level for testing.
- Shaders are pre-compiled during loading, and the level-finish sequence is frame-driven (no timers).

**Validation:** `node tools/validate-3d-levels.mjs` replays the game's own physics (`3d/js/sim.js`, the same file the browser runs) from every standing spot — jumps, double jumps, springs, moving platforms — and fails unless the tube and every shard are reachable. It also checks that props sit on islands and that islands do not overlap. Monsters and saws are not simulated (timing/combat), so a human playtest is still the final word on difficulty.

**Third-party assets:** three.js r180 (MIT, `3d/vendor/three/LICENSE`); Kenney Platformer Kit (CC0, `3d/assets/kenney/LICENSE.txt`).

## Launcher
The Collector's Vault staging page has one **Play Sprite Games** button → hub → 2D or 3D. (The earlier Arcade tab and Locker "Play This Sprite" button were removed to keep the staging page uncluttered.) `?sprite=<collection id>` still works on both game pages.

## Canon and intellectual-property gates
- Fortnite Sprite names and character artwork reused only from the verified current collection-tracker record library.
- Legacy fan-game special attacks and newly composed arenas/props are **fan-game design**, not falsely labelled as official Fortnite gameplay or locations.
- New proposed levels must **not** reuse any names from GB Adventure Mountain or any of its approved level/location vocabulary.
- No Gamer Bros code, levels, names, bots, lore, mechanisms, concept art or maps are used. Two kinds of *assets* did come out of the Gamer Bros repos because that is where they were recovered: the generic CC0 Kenney kit, and the rigged Citrus Sprite / monster models (see 3D section for the open licence question on the monsters).
- Public fan-content use needs a separate policy/licensing review before a permanent production game launch. The preview currently carries prototype/fan-made notices.

## More 3D Sprites (open item)
Only one rigged 3D Sprite exists in the repos or Drive (Citrus). A glassier, less plastic Citrus variant (possibly "citrus5" or a Superman Sprite) was remembered but is **not in any repo, commit or Drive folder searched**; if it turns up (or is generated through Higgsfield `image_to_3d` / `multi_image_to_3d`), drop the `.glb` into `3d/assets/characters/` and register it in `3d/js/roster.js`.

## Development priorities (not all complete)
1. Human playtest of the five 2D levels and three 3D worlds for difficulty and feel (the validators prove completability, not fun); tune checkpoints, enemy counts, saw timing and ice behaviour.
2. Real-device performance check of the 3D game (`?debug=1`) on a mid-range phone; adjust the quality ladder if needed.
3. More rigged 3D Sprites and per-Sprite abilities; confirm the monster models' licence.
4. Give 2D Sunflower Run the layered parallax treatment of levels 2–5; more 3D worlds.
5. Review rightsholder fan-content permissions and get approval before promoting any game to production.

## Smoke test
`.github/workflows/sprite-arcade-stage-qa.yml` verifies root production file hashes, archived originals, the simplified staging page and hub, all game JavaScript syntax, both level validators (2D and 3D), a browser play test (hub → 2D → 3D, desktop and phone sizes), and that the public staging routes serve the new files.
