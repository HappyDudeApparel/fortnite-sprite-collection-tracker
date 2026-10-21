# Sprite Arcade Next (staging only)

Experimental home for the next-generation 2D Sprite Platformer. **Nothing here is linked from the production site, the
Play Sprite Games hub, or the staging Locker page.** The known-good games (`/games/` in production and
`../arcade/` in staging) are untouched.

Direct test link (staging): `/preview/collectors-vault/arcade-next/2d/?autostart=water&level=6`
(`autostart` = any Sprite id such as `water`, `earth`, `fire`; `level=6` is the Tide Works room; levels 1-5 are the
original game, byte-identical `levels.js` and `themes.js`).

## What this spike proves
The proposal in `docs/proposals/sprite-games-expansion.md` is built around **element fields**. This spike builds the
first one, **water**, end to end:

- `2d/fields.js` is pure data and rules, shared by the game and the validator. A basin has a water level 0..3;
  platforms and hazards can exist only at certain levels (`when`), and a platform can ride the water (`float`).
- Sprite powers write to the field through devices: the **FILL** inlet accepts only Water and Fishy powers; the
  **DRAIN** valve accepts any power.
- **Tide Works** (level 6) has two routes: flood the basin so the dock lifts you onto the dam (Water/Fishy), or drain it
  and walk the dry bed and tunnel (every Sprite).
- `tools/validate-levels.js` solves the room over (water level, Sprite class). It also runs mutation tests: break the
  room on purpose and the check must fail.
- `tools/qa-tide-works.py` drives the real game in Chromium: real Aqua Lance bolts change the tide, and a small input
  bot finishes the drain route with an Earth Sprite.

## Changes to the known-good 2D engine
`2d/index.html` is a copy of `../arcade/2d/index.html` with 25 changed lines (hooks for the field system, a separate
preview save key `spriteArcade.next.2d.progress.v1`, and links back to the known-good hub). CI checks that this stays
small and that World 1's data is byte-identical.

## Known limits (spike)
- The validator's device rule is approximate: a device is usable when a reached standing spot is within 340 px
  horizontally and 120 px vertically; line of fire is not simulated. The browser QA covers the real behaviour.
- `tools/validate-levels.js` is a copy of the known-good validator plus the state search; it should be refactored
  into a shared module when the engine is split.
- Only the water field exists. Heat, wind, charge, growth and echo are proposals.
