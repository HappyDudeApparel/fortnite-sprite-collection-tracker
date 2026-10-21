# Sprite Games (production)

Released with Sprite Collection Locker v2.0.44. The Locker's **Play Sprite Games** button opens `games/` (hub) → `games/2d/` (Sprite Platformer, 5 levels) or `games/3d/` (Sprite Arena, 3 worlds).

- Self-contained: nothing here reads or writes the Locker's collection data. Game progress is stored separately in the browser (`spriteArcade.2d.progress.v1`, `spriteArcade.3d.progress.v1`).
- `catalog.json` maps collection records to artwork (`/assets/embedded/...`) for the character pickers.
- This folder is a released snapshot of `preview/collectors-vault/arcade/` (staging), minus the archived originals and the level validators. Develop and test in staging, then copy a new snapshot here.
- Third-party: three.js r180 (MIT, `3d/vendor/three/LICENSE`) and the Kenney Platformer Kit (CC0, `3d/assets/kenney/LICENSE.txt`). See `3d/assets/characters/README.md` for character-model provenance (monster models' licence still to be confirmed).
