# Sprite Collection Locker — C7S5 v2.0.64, November 16, 2026

## Owner-approved distinction: site inclusion versus Fortnite availability

**The site marks authentic portraits as released and fully collectible even if the underlying Fortnite sprite is not yet obtainable in-game.** An entry's `releaseState: released` means it is active in the owner's visual Sprite Collection Locker. This is not a claim that the item is obtainable in the live game. The `inGameReleaseState` field stores the separate Fortnite.GG status for Gold and Sir Oscar.

Primary catalogue: https://fortnite.gg/sprites
Epic update: https://communities.epicgames.com/thread/v43-10-fortnite-treasure-hunters-update-notes/CoOG
Independent post-release confirmation: https://esports.gg/guides/fortnite/all-new-sprites-fortnite-week-3/

## Final site counts

| Season | Catalogue records | Site-released records | Families |
| --- | ---: | ---: | ---: |
| C7S3 | 119 | 117 | Unchanged |
| C7S4 | 162 | 162 | Unchanged |
| C7S5 | 59 | 59 | 17 |
| **Combined** | **340** | **338** | — |

The in-game obtainable C7S5 count on Fortnite.GG on November 16 is **42**, which is intentionally different from the Locker's **59** verified authentic artwork entries. This is an explicit user-approved policy, not an error.

## Added during this November 16 workflow

Seven newly obtainable entries (IDs 538–544): Mini Miku Base, Fortune, Cursed; Squiplash Base, Fortune, Cursed; Zee Base. They use genuine variant-specific source WebPs hosted locally.

Seventeen additional artwork entries activated (IDs 545–561): fourteen Gold variants and Sir Oscar the Second's Base, Fortune and Cursed. Gold Sir Oscar is included among the fourteen Gold rows, making four total Sir Oscar variants. All are now `releaseState: released`, `status: Collectible`, `preview: false`, `countsTowardCollection: true`. All have exact individual 512x512 portraits from linked source pages and working independent ownership and level controls.

Also corrected existing Cursed Kelper (ID 527) from preview-only to released; that record and key were not recreated.

### Authentic art and catalogue IDs

| App ID | Sprite | Fortnite.GG source ID | Verified local filename |
| --- | --- | --- | --- |
| 538 | Mini Miku | 332 | mini-miku-base.webp |
| 539 | Fortune Mini Miku | 335 | mini-miku-fortune.webp |
| 540 | Cursed Mini Miku | 334 | mini-miku-cursed.webp |
| 541 | Squiplash | 321 | squiplash-base.webp |
| 542 | Fortune Squiplash | 323 | squiplash-fortune.webp |
| 543 | Cursed Squiplash | 324 | squiplash-cursed.webp |
| 544 | Zee | 338 | zee-base.webp |
| 545 | Gold Halfpeel'd | 315 | halfpeel-d-gold.webp |
| 546 | Gold Re-Pete | 316 | re-pete-gold.webp |
| 547 | Gold Barry O'Fish | 317 | barry-o-fish-gold.webp |
| 548 | Gold Wayfinder | 320 | wayfinder-gold.webp |
| 549 | Gold Chester | 318 | chester-gold.webp |
| 550 | Gold Kelper | 325 | kelper-gold.webp |
| 551 | Gold Exmarks | 319 | exmarks-gold.webp |
| 552 | Gold Lil' Squibbly | 337 | lil-squibbly-gold.webp |
| 553 | Gold Squiplash | 322 | squiplash-gold.webp |
| 554 | Gold Lil' Flacko | 330 | lil-flacko-gold.webp |
| 555 | Gold Lil' Uzi Vert Jr. | 331 | lil-uzi-vert-jr-gold.webp |
| 556 | Gold Plundarrgh | 336 | plundarrgh-gold.webp |
| 557 | Gold Mini Miku | 333 | mini-miku-gold.webp |
| 558 | Gold Sir Oscar the Second | 327 | sir-oscar-the-second-gold.webp |
| 559 | Sir Oscar the Second Base | 326 | sir-oscar-the-second-base.webp |
| 560 | Fortune Sir Oscar the Second | 328 | sir-oscar-the-second-fortune.webp |
| 561 | Cursed Sir Oscar the Second | 329 | sir-oscar-the-second-cursed.webp |

All files are at `assets/sprites/c7s5/`, and each record's `artworkSourcePage` points to the corresponding individual `https://fortnite.gg/sprites/<id>-<slug>` page. Source images came directly from links on those pages, without generated artwork or recolouring. CI checks file presence, RIFF/WEBP signature and integrity.

### Variant facts

- Gold gives a 3x elimination XP bonus alongside its base Sprite power.
- Fortune highlights nearby Chests.
- Cursed improves the chances of rare Sprite variants with water damage.
- Sir Oscar Base is Legendary; Fortune, Cursed and Gold are Special; Mini Miku Base Mythic; Squiplash Base Epic; Zee Base Mythic.
- Unverified summon cost and drop chance are stored as unknown, not invented or treated as a genuine 0%.

## Preservation and behaviour

- All original 316 records (IDs 1–537) are preserved byte-for-byte at the record-data level, with Cursed Kelper's four release flags the sole correction. Existing progress key for ID 527 remains intact.
- Existing C7S3/C7S4 data, all old artwork, 58 backgrounds, approved variant icons and Vault layout are unchanged.
- Original `sprite-mobile-v33-*` and `scl-clean-view-mode` localStorage keys remain unchanged. Adding the 24 new entries introduces new unique numeric IDs, not renamed historical keys.
- Zee uses the original agreed secret-rare rule: before ownership, its identity and image are represented by a mystery cell; after discovery, the real portrait appears and is accessible in the Vault. This special reveal does not make the record unreleased.
- WebP assets are local; service worker app shell and PWA launcher now use v2.0.64.
- Unit/source acceptance: `python3 scripts/qa-c7s5-nov16.py`. Mobile/desktop browser test: `node scripts/qa-c7s5-nov16-browser.cjs`. CI workflows run both. A GitHub CI pass is not a substitute for a device-specific manual visual approval.

## No unrelated changes

No additions to Gummy, Galaxy, Holofoil, Gem, Cube or Quack. No changes to original backgrounds, existing art, transitions, stored ownership or Vault structure.
