# Sprite Games: creative and technical expansion proposal

Status: **proposal for review. Nothing here is built or published.** Production (`/games/`, v2.0.44) and the current staging games stay as the known-good references.

## 0. Summary

- **Track 1 (2D, priority):** keep the five-level game frozen as World 1 and build a new engine beside it around one idea: the world is a set of **element fields** (water, heat, wind, charge, growth, echo) that Sprite powers write to and machines read from. Every new mechanic is a combination of those fields, so one engine yields dozens of levels, and puzzles stay machine-checkable.
- **Track 2 (3D):** a shared-skeleton pipeline. One rig family, many bodies, material variants. First wave: four original-family characters built from the approved artwork, reviewed from multiple angles, with Citrus's provenance gap closed before any of it is released.
- **First deliverables, in order:** (1) an engine spike with the field system and one demo room, (2) the extended validator, (3) World 2 with 6 levels, (4) 3D character pipeline spike with one new character. Each is staged only; nothing reaches production without your review.

## 1. What exists today (audit)

### 2D (`preview/collectors-vault/arcade/2d/`)

| Strength worth keeping | Where | Limit to design around |
|---|---|---|
| Levels are pure data with authoring helpers (`ground`, `ledge`, `mover`, `crumble`, `pad`, `arc`) | `levels.js`, 318 lines | Level format has no notion of switches, fluids or state |
| Headless reachability validator that replays the game's physics | `tools/validate-levels.js` | Treats bricks, boulders and crystals as always passable ("every power breaks them"), so it cannot validate power-specific puzzles |
| 18 hand-written powers (water, earth, fire, duck, ghost, dream, demon, punk, king, peanut, zero point, fishy, striker, aura, boss, grim, seven, air) built from projectiles, zones and particles | `index.html`, `ABILITIES` + `cast*` functions | Each power only damages enemies and breaks objects; none changes terrain or any shared state |
| Parallax painters per theme | `themes.js` | Fine as is |
| Locker hand-off (`ARCADE_LOCKER_SPRITE`) plus a read-only catalogue: 279 collection entries, 97 playable, others fall back to a family power | `catalog.json` | One Sprite per run, no mid-level swapping |
| Progress store `spriteArcade.2d.progress.v1`, separate from the Locker's storage | `index.html` | Levels and stars only; no achievements or world state |
| **Weakest point:** the whole engine is one 4,182-line, 315 KB HTML file (art is inlined) | | Hard to extend or test in parts |

### 3D (`.../arcade/3d/`)

| Strength worth keeping | Limit |
|---|---|
| `sim.js` is pure, deterministic physics shared by the game and `validate-3d-levels.mjs` | Static solids and movers only; no interactive state |
| Chain-of-islands level builder with deliberate gap sizes; themes | Three levels |
| Instancing, adaptive quality ladder, skeleton-clone for GLBs, `roster.js` maps clip names per character | Only Citrus is a rigged player; the other playable characters are artwork billboards |
| `look.js` procedural restyle (gummy skin, cape, eye glow) | Tied to Citrus's material names |

## 2. Track 1: a 2D game that keeps surprising players

### 2.1 Engine direction

Do not extend the monolith. Build `arcade-next/2d/` as ES modules and keep `arcade/2d` (and `/games/2d`) untouched:

```
core/      loop, input (keyboard, gamepad, touch), camera, save
physics/   same constants as today's game, so World 1 plays identically
fields/    the element field grid (section 2.2)
devices/   data-driven machines: valve, sluice, vent, fuse, lever, crystal gate, press, lift
powers/    registry; each power declares what it writes to fields, plus its existing cast effect
bosses/    stage machines
levels/    world manifests + level data (World 1 imports the existing levels.js unchanged)
tools/     validator, level lint, replay recorder
```

Rule: **World 1 is `levels.js` loaded as-is.** A regression test replays recorded inputs through the old engine and the new one and requires matching end positions.

### 2.2 The core idea: element fields

Each level has a coarse grid (for example 32 px cells) with a few numeric fields. Powers *write* to them, devices *read* them, and platforms, hazards and enemies react. Nothing is scripted per level; combinations emerge from the same rules.

| Field | Written by | Reads / effects |
|---|---|---|
| **Water level** (per basin) | Water, Fishy | Floating platforms rise and fall, sluices open, fire and fuses go out, electric hazards conduct |
| **Heat** | Fire, Demon, Zero Point | Melts ice and wax barriers, lights fuses, drives updrafts, boils water to steam |
| **Wind** | Air, Punk (sound pressure) | Moves light platforms, pushes projectiles, spreads fire, fills sails |
| **Charge** | Aura, Striker, Seven | Powers lifts and gates, arcs through water |
| **Growth** | Earth, Dream, Duck | Grows vines and bridges from seed pads; roots hold platforms |
| **Echo** | Ghost, Grim | Records a ghost double of your last few seconds; doubles hold switches |

Three families (King, Boss, Burnt Peanut) have no field assigned yet; they get **role powers** (for example King raises or lowers a whole machine; Boss smashes and reshapes). Assignment is a design workshop item, not a code risk.

**Combinations that fall out of the rules** (all tested in the validator):
- Water + Heat = steam vent that lifts you; Water + cold zone = ice bridge.
- Wind + Fire = spreading burn that clears vines but also your route.
- Water + Charge = a live pool: a hazard until a Sprite with Growth plugs it with roots.
- Echo + any of the above = two actors, so one Sprite can open a gate while you walk through it.

### 2.3 Novel mechanics that distinguish the game

1. **Living levels (transformations).** A level has two or three authored *states* (for example Drained, Flooded, Frozen). Fields push it between states, platforms and passages are defined per state, and the transition is animated. The flood-the-reservoir idea becomes: Flooded raises floating platforms and opens an upper passage while closing a lower tunnel.
2. **Relay shrines.** Carry up to three Locker Sprites per run and swap at shrines. The Sprites you own decide which routes you can open, and families that are missing get alternate, harder routes. This ties the games to the collection without changing it: the games only *read* the Locker's selection, never write to it.
3. **Echo doubles.** Ghost and Grim record a short loop. Puzzle rooms are built around standing a double on a plate while you cross.
4. **Cross-world consequences.** A global flag map (its own save key) lets an action in one world change another. Draining the World 2 canal lowers the water in World 4. Secrets reveal a challenge elsewhere through **echo gates** that appear once a flag is set.
5. **Boss as environment puzzle.** Each boss has three stages tied to the fields. Example, the Tide Colossus: flood the arena so its core floats within reach; vent heat to crack its shell; then redirect wind to knock it into the rising water.
6. **Branching routes.** Levels expose two or three exits (for example heat route vs. water route) that lead to different next levels. Each world map is a small graph, not a line.
7. **Replay value.** Each level has a secret that only one field combination reveals, three stars, a par time, and a "remix" modifier unlocked on completion (reversed gravity zone, night mode).

### 2.4 Worlds (draft, to be refined with you)

| World | Theme | Dominant fields | Notes |
|---|---|---|---|
| 1 | The five existing levels | n/a | Frozen, same progress |
| 2 | Tide Works (canals, locks, reservoirs) | Water, Charge | Introduces living levels and the first boss |
| 3 | Cinder Foundry | Heat, Wind | Updrafts, fuses, the foundry boss |
| 4 | Overgrowth | Growth, Echo | Seeds and doubles; reads World 2 flags |
| 5 | The Hub Spire | All | Relay shrines mandatory; finale |

Six levels per world is the target, plus a bonus room.

### 2.5 Touch and responsiveness

Floating thumb stick plus a large jump button and an ability button with auto-aim; variable jump height; input buffering and coyote time kept identical in World 1 and improved elsewhere; a "Motion" (reduced effects) toggle stays; haptics on supported devices; a 60 fps target on a mid-range phone with the quality governor from the 3D game reused.

### 2.6 Save, achievements and unlocks

New key `spriteArcade.2d.progress.v2` that **imports v1 on first run and never deletes it**; a separate `spriteArcade.world.flags.v1`, and achievements/unlocks under their own key. None of these touch the Locker's keys (`sprite-mobile-*`, `vault-stage-*`). Achievements and unlocks (Sprites, trails, remix modifiers) are cosmetic and cannot affect a collection.

### 2.7 Validation: how puzzles get proven solvable

The current validator proves position reachability. With state it needs to prove **reachability over (position, device states, active Sprite, echo)**:

1. Abstract each room into islands connected by traversal edges (the existing physics replay computes these per state).
2. Run a bounded breadth-first search over device states (levers, valves, field thresholds). Rooms are authored to a small state budget (for example 12 bits), keeping it tractable.
3. For each Sprite in the allowed set, confirm the exit is reachable, and confirm that "bad" Sprites cannot softlock (a stuck state must always be escapable by respawn-to-checkpoint).
4. Mutation tests as before: remove a device or a platform and the validator must fail.
5. Replay tests: recorded input files for each level run in CI to catch physics drift.

Cost is the main risk (see section 5). I would build this validator **before** authoring World 2.

## 3. Track 2: authentic 3D Sprite models

### 3.1 Scope reality

The collection has 279 entries across 52 families; only 18 families are original playable families in the 2D game. A model per entry is neither needed nor sensible. The proposal is **base bodies plus variants**:

| Layer | Content | Shared by |
|---|---|---|
| Skeleton family | 27-bone humanoid-ish rig (Citrus's, once its provenance is cleared) plus one quadruped and one floater variant | Many bodies |
| Body | Mesh authored per family (proportion, silhouette, face) | All variants of that family |
| Variant kit | Material set, accessory meshes, emissive/pattern masks | Each collection variant |
| Animation set | Idle, walk, jump, attack, hit, win, plus a family-specific signature move | All bodies on that skeleton |

Mapping variants onto shared geometry needs per-family checks; any variant whose artwork changes the silhouette will need its own accessory meshes.

### 3.2 First wave (proposal)

Pick families from the original 18 whose artwork is unambiguously ours, and that cover three silhouettes:

1. **Water Sprite** (rounded, fluid material, tests transparency and cost)
2. **Fire Sprite** (emissive, particle accessories)
3. **Earth Sprite** (heavy silhouette, tests rig scale)
4. **Ghost Sprite** (assuming its artwork reads as a floating body, this tests the floater rig and translucency)

Third-party-named variants (several collection families carry names of other companies' characters) are **excluded from the first wave and need a separate rights decision** before any 3D model is made of them.

### 3.3 Pipeline

1. **Reference sheet** per family from approved collection art, with front, side and 3/4 views signed off before modelling.
2. **Model** in Blender against the shared skeleton (script-driven where possible, as with the Citrus generator), to a 12-18k triangle budget for hero characters and 4-6k for crowd/enemy use.
3. **Export** glTF, then a validate step: bone names, clip names (the `roster.js` mapping), triangle count, texture size, no embedded junk.
4. **Inspection viewer** in staging: turntable, multiple camera presets, animation scrubber, side-by-side with the source artwork.
5. **Roster entry** in `roster.js`; gameplay animations and controls work unchanged because they key off clip names.
6. **Provenance record** per asset (generator script, source file hash, tool and date, reference art, licence) committed alongside it, in the format of `docs/provenance/citrus.md`.

### 3.4 Performance

Keep the existing governor. Shared skeleton means shared animation clips and a single skinned-mesh cost per character; only one or two animated characters on screen at a time; variant materials share one texture atlas per family; GLBs under 400 KB each where possible; test on a real phone with `?debug=1`.

## 4. Development sequence, dependencies, gates

| # | Work | Depends on | Output | Gate |
|---|---|---|---|---|
| 0 | Close Citrus provenance gap (obtain `build_hero.py`, `.blend`, August conversations) | You / ChatGPT | Evidence recorded | Needed before any Citrus-based skeleton is reused |
| 1 | Engine spike: modules, World 1 loads unchanged, replay-equivalence test | none | `arcade-next` staging page | Old and new engines match on all 5 levels |
| 2 | Field system + two powers + one demo room | 1 | Playable room | Review of feel |
| 3 | Extended validator with state search and mutation tests | 2 | CI job | Must catch removed devices |
| 4 | Touch controls and save v2 | 1 | Phone-tested | Real-device pass |
| 5 | World 2 (6 levels + boss) | 2, 3 | Staging world | Playtest by you |
| 6 | 3D pipeline spike: reference sheet to viewer to one new character in game | 0 (for skeleton) | Staging character | Multi-angle review |
| 7 | Worlds 3-5, further characters, achievements | 5, 6 | Staging | Review per world |
| 8 | Release plan, as a separate hand-made PR with the same safeguards used for 2.0.44 | all | Production | Your approval |

Steps 1-4 can run in parallel with step 6 after step 0.

## 5. Risks and open decisions

- **Validator cost:** state-space search can blow up. Mitigation: a hard state budget per room and design rules that keep rooms independent; fall back to constructive solutions recorded as replays.
- **Feel parity:** the new engine must not change how World 1 plays. The replay-equivalence test is the guard.
- **Scope creep:** five worlds is long. I would ship World 2 as the proof and let the response decide the rest.
- **Rights:** Citrus/Dash authorship and permissions are unproven (`docs/provenance/citrus.md`); Sprite names/artwork have a separate brand question; third-party-named variants need their own decision. None of this is resolved by building a better model.
- **File size:** the 315 KB single file will not scale; the new engine should load art as separate files.

**Decisions I need from you:** (1) approve the element-field approach for 2D; (2) the four first-wave 3D families, or your own picks; (3) whether relay shrines (reading your Locker selection) is acceptable; (4) where the missing Citrus source files live and whether you can supply them.

## 6. What happens next

On approval I will start with step 1 and step 0's evidence request in parallel, staging only, and report with screenshots, test results and the CI links before anything else is proposed. Production remains untouched.
