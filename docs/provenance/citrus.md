# Citrus / Dash (`citrus.glb`): provenance evidence

**Status: lineage partly corroborated, rights NOT cleared.** This file records what the repositories prove and what they do not.
It makes no claim about authorship, copyright ownership or licensing. The model file is unchanged.

## Name and collection art
The owner confirms the character is called **Dash** (the 3D game's label "Citrus Sprite" is a working name). His collection art is
**Dash Sprite, id 127, rarity Legacy (C7S3)** in the Locker's Legacy tab (`assets/embedded/8654c402d75684a5af00.webp`); it is not in
`arcade/catalog.json`. This also means Dash corresponds to a Fortnite sprite in the Locker, so the brand question below (item 4) applies
to the character itself, separately from who built the mesh.

## The file

| | |
|---|---|
| Production / staging copies | `games/3d/assets/characters/citrus.glb`, `preview/collectors-vault/arcade/3d/assets/characters/citrus.glb` (identical) |
| SHA-256 | `2947c5dd0ff1d2fe578192d0fe4a7e31b82d06ba5d0f399d7ab924d4af7efd14` |
| Git blob | `f37b43e04090c734d8cd4195aab527335bf47346` |
| Same bytes as | `gamer-bros-game/pass1-v1/assets/recovered/characters/sprite_hero.glb` (also listed as `recovery-package/characters/sprite_hero.glb` in that repo's `SHA256SUMS.txt`) |
| First seen in a repo | `gamer-bros-game`, 2026-09-12 (a bot commit that stored recovered files). That is a copy date, not a creation date. |

## What the file itself shows (inspected, not assumed)

- Exporter: Khronos glTF Blender I/O v4.0.44, so it was exported from Blender.
- One skin, `SpriteHeroArmature`, with **27 joints** (`root`, `hips`, `spine1`, `spine2`, `chest`, `head`, `eye_L`, `eye_R`, …).
- **Six clips:** `Bite_InPlace`, `Dance`, `HitRecieve`, `Idle`, `Jump`, `Walk` (81 channels each, i.e. 27 bones x 3).
- One mesh, `Sphere`, 7 materials (`SpriteBody`, `SpriteCape`, `SpriteEye`, `SpriteMask`, `SpriteMouth`, `SpriteTeeth`, `SpriteEmblem`), **13,460 triangles**, no embedded images.

## Comparison with the August 2026 development record

An earlier development record (supplied by the project owner, via ChatGPT; the source conversation is not in these repositories) says a Blender/Python generator `build_hero.py` produced a rigged Sprite Hero of about 13,252 triangles, 27 bones and six animation clips, and that a later inventory named `sprite_hero_orange_v03.blend` in the workspace `D:\SpriteArtPipeline\game_integration_v06`.

| Item | Record | File | Result |
|---|---|---|---|
| Bones | 27 | 27 | Match |
| Animation clips | 6 | 6 | Match |
| Armature name | "Sprite Hero" | `SpriteHeroArmature` | Consistent |
| Triangles | about 13,252 | 13,460 | **Differs by 208 (1.5%)**, unexplained. The in-game stud removal in `look.js` takes the count to 11,560, so it does not account for it. It may be a different revision or export. |
| Source `.blend` / `build_hero.py` | exist on the owner's workstation | **not in any repository** | Unverified |

## Observations about the other characters

- The five monsters (`alien`, `cthulhu`, `ghost`, `stump`, `yeti`) are Quaternius CC0 files with a different pipeline: Blender exporter v1.6.16, `MonsterArmature` with 7-16 joints, one `Texture` material.
- Citrus shares none of that geometry, skeleton or materials. Its clip names reuse the Quaternius naming convention, including the `HitRecieve` spelling. This is consistent with a generator that named clips to match the game's animation lookup, and it is **not** evidence that Quaternius data was used.

## Searched and not found

`build_hero`, `sprite_hero_orange`, `game_integration_v06` and `SpriteArtPipeline` do not appear in the history or files of `fortnite-sprite-collection-tracker`, `gamer-bros-game`, `gamer-bros-game-dev`, `sprite-3d-arena` or `GBGamerBros`, nor in the owner's Google Drive full-text search or Gmail. The August records live in chat history that this audit cannot read.

## What would close the gap

1. Export the August 22-23 ChatGPT/Claude conversations that describe `build_hero.py`.
2. Provide `build_hero.py` and `sprite_hero_orange_v03.blend` from the workstation. We can then re-export, compare joints, clips, triangle count and mesh data against this file, and record the result.
3. Owner statement of the creative direction and reference used. Chain of title for AI-assisted work needs review.
4. Separate brand review: Fortnite-associated Sprite artwork and names are a different question from who built the mesh.

Until then, `citrus.glb` stays marked **not cleared** in `games/3d/assets/characters/README.md`.
