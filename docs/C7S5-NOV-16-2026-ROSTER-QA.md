# C7S5 November 16, 2026 — Seven-sprite release audit

## Decision and source priority
**Verified collectible:** Mini Miku (Base, Fortune, Cursed), Squiplash (Base, Fortune, Cursed), Zee (Base, secret rare), plus release-state correction for pre-existing Cursed Kelper. Fortnite.GG live catalogue lists 42 collectible C7S5 entries on November 16; Epic announced the Nov 15 Miku/Teto arrival. Post-release independent reporting confirms availability. No client-side/game-client inspection was performed.

- Epic official notes: https://communities.epicgames.com/thread/v43-10-fortnite-treasure-hunters-update-notes/CoOG
- Fortnite.GG catalogue: https://fortnite.gg/sprites
- Independent post-release reporting: https://esports.gg/guides/fortnite/all-new-sprites-fortnite-week-3/

## Current classification, record IDs and exact individual artwork
| App ID | Sprite | Rarity | Source page | Locally hosted authentic portrait |
| --- | --- | --- | --- | --- |
| 538 | Mini Miku | Mythic | https://fortnite.gg/sprites/332-mini-miku | assets/sprites/c7s5/mini-miku-base.webp |
| 539 | Fortune Mini Miku | Special | https://fortnite.gg/sprites/335-fortune-mini-miku | assets/sprites/c7s5/mini-miku-fortune.webp |
| 540 | Cursed Mini Miku | Special | https://fortnite.gg/sprites/334-cursed-mini-miku | assets/sprites/c7s5/mini-miku-cursed.webp |
| 541 | Squiplash | Epic | https://fortnite.gg/sprites/321-squiplash | assets/sprites/c7s5/squiplash-base.webp |
| 542 | Fortune Squiplash | Special | https://fortnite.gg/sprites/323-fortune-squiplash | assets/sprites/c7s5/squiplash-fortune.webp |
| 543 | Cursed Squiplash | Special | https://fortnite.gg/sprites/324-cursed-squiplash | assets/sprites/c7s5/squiplash-cursed.webp |
| 544 | Zee | Mythic (secret rare) | https://fortnite.gg/sprites/338-zee | assets/sprites/c7s5/zee-base.webp |

Each portrait was fetched from the image linked directly by its corresponding individual Fortnite.GG source page (not cropped from a collage or generated). Verified as a nonempty RIFF/WEBP asset after GitHub Actions import. All seven are 512px source icons, with genuine character and variant treatment.

## Totals
- Previously saved source: **C7S3 117 collectible / 119 catalogued**; **C7S4 162 / 162**; **C7S5 34 / 35** (existing Cursed Kelper unreleased).
- C7S5 after update: **42 collectible / 59 catalogued** in **16 collectible families plus 1 unreleased-only family**.
- C7S5 count correction: +7 new entries, +1 release-state correction (Cursed Kelper), total +8 = 42.
- All-season collectible denominator: **117 + 162 + 42 = 321**.
- Unreleased C7S5 (17 records): **14 Gold** including Gold Mini Miku, Gold Squiplash and Gold Sir Oscar the Second; plus Sir Oscar the Second Base, Fortune, Cursed.
- No Gold or Oscar entries are added to the collectible denominator. No speculative artwork is shown for unreleased variants.

## Powers
- Mini Miku: Friendship Bubble while emoting with other players; cooldown decreases with level.
- Squiplash: healing smoke at low health; cooldown decreases and healing/duration improve with level.
- Zee: regenerating Zero Point Dash charges; increased maximum charges and faster recharge through leveling.
- Fortune: nearby Chest reveal. Cursed: increased chance of rare variants but damage from water.
- Exact summon costs and Sprite Chest percentages are **not verified**. Blank/null metadata is intentional, not a zero-cost assertion.

## Regression safeguards
1. No C7S3 or C7S4 data records modified. IDs 1–537 remain unchanged apart from existing Cursed Kelper record ID 527 switching to released/collectible (same key). New IDs are 538–561.
2. Existing localStorage keys stay exactly the same: `sprite-mobile-v33-selected`, `sprite-mobile-v33-levels`, `sprite-mobile-v33-favorites`, `sprite-mobile-v33-bg`, `scl-clean-view-mode`, `sprite-mobile-v33-title`.
3. Zee remains a mystery silhouette until marked discovered. Its portrait and identity become visible once owned; before discovery, it is withheld from the Locker's family/variant grid.
4. Unreleased variants are in catalogue data but cannot be counted, leveled, or mistakenly claimed. Artwork-free unreleased variants use explicit placeholder cells instead of fake variant portraits.
5. No Gummy, Galaxy, Holofoil, Gem, Cube or Quack variant data or artwork changed.
6. Cache is versioned to v2.0.63; app identity, approved Vault layout, background catalogues, visual effects, and C7S3/C7S4 graphics are unchanged.

## Testing
- Inspect inline script syntax, all ID uniqueness, 42/321 counts, unchanged C7S3/C7S4 record JSON, immutable storage-key names, local art references, and asset WebP signatures.
- After publication, perform live-screen interaction and export tests on mobile/tablet/desktop. These are separate from source-level QA; do not claim they were performed unless recorded.
