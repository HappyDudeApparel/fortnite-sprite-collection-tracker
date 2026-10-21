# Sprite Games (production)

Released with Sprite Collection Locker v2.0.44. The Locker's **Play Sprite Games** button opens `games/` (hub) → `games/2d/` (Sprite Platformer, 5 levels) or `games/3d/` (Sprite Arena, 3 worlds).

- Self-contained: nothing here reads or writes the Locker's collection data. Game progress is stored separately in the browser (`spriteArcade.2d.progress.v1`, `spriteArcade.3d.progress.v1`).
- `catalog.json` maps collection records to artwork (`/assets/embedded/...`) for the character pickers.
- This folder is a released snapshot of `preview/collectors-vault/arcade/` (staging), minus the archived originals and the level validators. Develop and test in staging, then copy a new snapshot here.
- Third-party: three.js r180 (MIT, `3d/vendor/three/LICENSE`) and Kenney Platformer Kit (CC0, `3d/assets/kenney/LICENSE.txt`). The five recovered monster GLBs have now been **forensically matched (all 11 glTF structural sections + full source binary buffers)** to an independent mirror of Quaternius' *Cute Animated Monsters Pack* (publisher CC0). An optional direct official-archive comparison remains. **Citrus/Dash model rights and Fortnite-associated artwork/brand rights are still separate unresolved questions.** See `3d/assets/characters/README.md` for evidence and limits.
