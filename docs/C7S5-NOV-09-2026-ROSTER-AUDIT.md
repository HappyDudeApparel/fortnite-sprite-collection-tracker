# C7S5 Treasure Hunters — November 9, 2026 reconciliation

## Verified sources
- Fortnite.GG active C7 Mini Season catalogue: https://fortnite.gg/sprites — 35 individual entries visible (inclusive of Cursed Kelper), **34 currently collectible** shown in its progress denominator.
- Cursed Kelper: https://fortnite.gg/sprites/300-cursed-kelper — explicitly marked Unreleased.
- Epic November 8 announcement: https://communities.epicgames.com/thread/captains-day-lil-uzi-vert-november-8/t3YN — confirms Lil Uzi Vert, shield Chug Splash effect, temporary 24-hour boosted variants and Cursed appearances.
- Original individual portraits and descriptions:
  - Lil' Uzi Vert Jr. Base: https://fortnite.gg/sprites/308-lil'-uzi-vert-jr.
  - Fortune Lil' Uzi Vert Jr.: https://fortnite.gg/sprites/310-fortune-lil'-uzi-vert-jr.
  - Cursed Lil' Uzi Vert Jr.: https://fortnite.gg/sprites/309-cursed-lil'-uzi-vert-jr.
  - Transponder Snail Base: https://fortnite.gg/sprites/314-transponder-snail

## Important correction to the automated alert
The alert's **33 obtainable / 34 catalogued** and **312 obtainable / 313 catalogued** numbers each omit one legitimate entry. The source's actual season listing comprises:
- 11 Base-and-Fortune-and-Cursed families = 33 entries (Halfpeel'd, Re-Pete, Barry O'Fish, Wayfinder, Chester, Kelper, Exmarks, Lil' Squibbly, Lil' Flacko, Lil' Uzi Vert Jr., Plundarrgh);
- Transponder Snail Base = 1 entry;
- Sweet Dreams Base = 1 entry.
Total: **35** C7S5 entries, **34** obtainable, **1** unreleased (Cursed Kelper).

Prior seasons remain 117 (C7S3) and 162 (C7S4) obtainable. **Overall collectible: 313. Overall legitimate catalogue: 314.** There are separately two vaulted/Legacy records retained as non-counting records in C7S3, making 316 internal records. Do not use the alert's 312/313 overall totals.

## Changed records
- Added ID 534: Lil' Uzi Vert Jr. Base, Legendary, Fortnite.GG catalogue ID 308, in-game collection #41.
- Added ID 535: Lil' Uzi Vert Jr. Fortune, Special, Fortnite.GG ID 310, collection #42.
- Added ID 536: Lil' Uzi Vert Jr. Cursed, Special, Fortnite.GG ID 309, collection #43.
- Added ID 537: Transponder Snail Base, Legendary, Fortnite.GG ID 314.
- Existing ID 527 Cursed Kelper remains displayed with its original verified local portrait, but `releaseState=unreleased`, `preview=true`, `countsTowardCollection=false`; collection/level controls unavailable until confirmed release.
- Removed unsupported catalogue records ID 532 (Fortune Sweet Dreams) and ID 533 (Cursed Sweet Dreams). Their unused local artwork files and former local-storage keys are not deleted; no ownership data migration.
- Nine other already-present Cursed entries keep their IDs and verified artwork and remain collectible; no new Gold or other variants invented.

## Portrait provenance and export consideration
The four added portraits use individual authenticated 512px WebP artwork URLs from Fortnite.GG:
- Base Uzi: https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_RookGecko_L.webp
- Fortune Uzi: https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_RookGecko_Jeweled_L.webp
- Cursed Uzi: https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_RookGecko_Cursed_L.webp
- Transponder Snail: https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_FeedJet_L.webp

The previously imported 31 local source-verified images are **unchanged**. The new four are external until they can be mirrored as bytes into `assets/sprites/c7s5/`. Their visual availability on Fortnite.GG was confirmed, but **cross-origin canvas export on the Locker domain has not been smoke-tested**. Local mirroring and an export test are required before treating this branch as fully production QA-complete. Avoid falsely reporting the new images as locally mirrored.

## Static regression checks performed on the branch
- C7S3: 119 retained internal records; 117 collectible; byte-identical JSON to pre-patch.
- C7S4: 162 retained internal records; 162 collectible; byte-identical JSON.
- C7S5: 35 internal records; 34 collectible; 13 families; Cursed Kelper the only unreleased.
- 313 collectible across all seasons; 314 legitimate records excluding two preserved Legacy.
- All prior verified artwork URLs and IDs unchanged; new IDs 534–537 unique.
- Removed only unsupported Sweet Dreams variants and made only Kelper non-counting.
- HTML inline script syntax parse passed for all 14 inline JavaScript blocks.
- Saved ownership/mastery keys and state code left unchanged.
- Not tested: fully interactive browser/mobile viewports, external-image CORS/export, all image bytes mirrored locally, Play Games regression. This is a **review branch**, not a production deployment.
