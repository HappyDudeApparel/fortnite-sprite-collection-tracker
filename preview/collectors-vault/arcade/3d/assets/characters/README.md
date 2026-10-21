# Character asset provenance — Sprite Arena

## Citrus / Dash (playable)
- `citrus.glb`: recovered from `HappyDudeApparel/gamer-bros-game/pass1-v1/assets/recovered/characters/sprite_hero.glb` and styled procedurally by `js/look.js`.
- Original author, source agreement and permitted uses of this authored model: **NOT YET DOCUMENTED**. Do not confuse a recovered repository file with a licence grant. The game's display of Fortnite-associated Sprite names/art also requires separate brand/IP review.

## Monsters (enemies)
- `ghost.glb`, `yeti.glb`, `stump.glb`, `cthulhu.glb`, `alien.glb` (the last was `hero.glb` in recovery).
- Traceable source: `HappyDudeApparel/gamer-bros-game/pass1-v1/assets/recovered/characters/`; the original recovery SHA256SUMS is in `pass1-v1/assets/recovered/SHA256SUMS.txt`.
- **Likely pack candidate (not yet proved for these exact binaries):** Quaternius, *Cute Animated Monsters Pack* (August 2020), https://quaternius.com/packs/cutemonsters . Quaternius publishes that pack as CC0. The reported characters include Alien, Cthulhu, Ghost, Tree and Yeti; the recovered GLB meshes use these names (Tree is the `stump.glb` mesh), share `MonsterArmature` rigs and matching animation families. This is strong *identification evidence*, not an official archive/hash comparison or a record of how the copies were obtained.
- **Release-clearance status: PENDING** until the recovered GLBs have been compared to the corresponding authentic Quaternius release (or independent ownership/permission established). Do not label these particular binaries `CC0 verified` merely because the likely source pack is CC0.
- Verification steps: obtain the original pack from the publisher; compare each corresponding GLB or inspect mesh topology, skin/rig, animation names and textures where file encodings differ; record the original download URL, pack version/date, applicable licence and per-file verification results. Preserve this register and the publisher's terms. If a file cannot be verified, replace it with a confirmed-licensed equivalent before promoting the game.
- No models were replaced or modified by this provenance audit.

## Confirmed separate libraries
- Three.js r180: MIT, `games/3d/vendor/three/LICENSE`.
- Kenney Platformer Kit environment assets: CC0, `games/3d/assets/kenney/LICENSE.txt`; publisher: https://kenney.nl/assets/platformer-kit .
- These permissions **do not extend** to the five recovered monster GLBs or the Citrus model.

See `games/README.md` for production release context.
