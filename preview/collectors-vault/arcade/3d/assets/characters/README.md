# Sprite Arena — 3D character assets and rights

## Forensic verification: five monster models

**Conclusion: their source is strongly established as Quaternius, *Cute Animated Monsters Pack* (August 2020), released by its publisher under CC0.** Publisher's licence record: https://quaternius.com/packs/cutemonsters .

We independently compared each production `.glb` with the corresponding `.gltf` in the publicly available pack mirror:
https://github.com/agentkaerf/FreeModels/tree/main/Cute%20Animated%20Monsters%20-%20Aug%202020/glTF

For **all five models**, all 11 structural glTF sections matched *exactly* (`asset`, `scenes`, `scene`, `nodes`, `meshes`, `skins`, `animations`, `accessors`, `materials`, `textures`, `samplers`). More decisively, **every byte of the original mirrored glTF binary buffer**, including its embedded texture payload, matches the corresponding prefix of the deployed GLB binary chunk. The GLB has a small additional appended image copy due to packaging.

| Deployed GLB | Quaternius pack file | Exact buffer match | Production Git blob SHA-1 |
| --- | --- | --- | --- |
| `ghost.glb` | `Ghost.gltf` | 238,688 / 238,688 bytes | `ca9846d0eae97ec176f9b6dd26112ffb0bb6ed4c` |
| `yeti.glb` | `Yeti.gltf` | 288,360 / 288,360 bytes | `44146cffcf03a32583a03753476d2633f7cba31b` |
| `stump.glb` | `Tree.gltf` | 357,868 / 357,868 bytes | `edb8ab76db236354b7d827b4c6fa182a17769544` |
| `cthulhu.glb` | `Cthulhu.gltf` | 326,124 / 326,124 bytes | `57d540766e4c4e38d0ef3a5a79cdd83a4ded0a3d` |
| `alien.glb` | `Alien.gltf` | 320,400 / 320,400 bytes | `e81598bad18f4074e49440e2472abce2799aec15` |

The same deployed GLB Git blobs are byte-identical to the files recovered into `HappyDudeApparel/gamer-bros-game/pass1-v1/assets/recovered/characters/` (`hero.glb` there is renamed `alien.glb` here), confirming the copy chain. Original package checksums were also recorded in that repo's `pass1-v1/assets/recovered/SHA256SUMS.txt`.

**Rights assessment:** The pack publisher expressly offers the pack under CC0, which permits use and adaptation without required attribution. Our matching of the models to an independently maintained pack mirror is compelling verification of their source; it is not a byte-for-byte download-and-compare of the official publisher's ZIP. An official archive cross-check remains a useful final provenance improvement, not evidence of an identified conflicting licence. Preserve Quaternius credit voluntarily.

## Citrus / Dash (distinct issue — NOT CLEARED)

- `citrus.glb`: byte-identical Git blob to `HappyDudeApparel/gamer-bros-game/pass1-v1/assets/recovered/characters/sprite_hero.glb`; Git blob SHA-1 `f37b43e04090c734d8cd4195aab527335bf47346`.
- Procedural gummy/cape/eye styling in `js/look.js` is a later game change.
- The original authored model's creator and redistribution permission **have not been established**. The Quaternius monster-pack CC0 does **not** extend to this separate asset.
- Fortnite-associated Sprite artwork, characters and names also raise separate brand/copyright questions. Fan-made, not monetized, or an unofficial disclaimer does not itself grant rights.

## Independently cleared engine and level assets

- Three.js r180 — MIT: `games/3d/vendor/three/LICENSE`.
- Kenney Platformer Kit environment models — CC0: `games/3d/assets/kenney/LICENSE.txt`; https://kenney.nl/assets/platformer-kit .

No 2D/3D gameplay, shaders, model binaries or collection data were modified by this audit. Before wide promotion, finish the Citrus/brand permissions review and optionally reconcile Quaternius' official archive.
