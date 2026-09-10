## 2.0.27 — 2026-09-10
- Fixed portrait-only family artwork/name overlap by increasing internal label clearance; landscape remains untouched.
- Added an explicit non-regression rule: unrelated updates must not alter known-good layouts, orientations, data, artwork mappings, or interactions.
- Preserved all 15 live Loot Hacker variants and the publish-immediately asset rule.

## 2.0.26 — 2026-09-10
- Marked Jonesy, Adventure, Bush, Sonic, Tails, Shadow, 8-Bit, Jackrabbit, Killswitch, Klombo, Overshield, X-Ray, Onigiri, and Storm Scout Loot Hacker variants live.
- Validated all 14 entries have distinct finished local artwork before publication; Crown remains live, completing 15 Loot Hacker variants.
- Adopted the publication rule: confirmed Sprite + available finished asset = publish immediately with safe/default details, then refine metadata later.
- Preserved the C7S3 Legacy-row removal while retaining Dash/Superman in Locker/preview.

## 2.0.25 — 2026-09-10
- Marked Loot Hacker Crown as verified released/live.
- Marked the other 14 finished Loot Hacker variants as officially announced for Sept. 10 pending live acquisition verification.
- Removed the custom Legacy row from the C7S3 main collection view only. Dash and Superman remain available in Locker and featured preview/detail modes.
- Preserved C7S4 permanent catalogue totals and Mega Man Base-only treatment.

## v2.0.24 — 2026-09-05
- Removed the three unverified Mega Man variant silhouette placeholders. Mega Man remains Base-only; no catalogue/count/progress data changed.

## v2.0.23 — 2026-09-05
- Fixed the later-loading mobile C7S4 CSS that still hard-coded three variant lanes.
- Portrait now keeps Base, Cheat, Hacker, and Gold in one compact horizontal row with the same tight spacing approach used by C7S3.
- Corrected the C7S4 detail variant rail from three lanes to four.
- No Sprite data, artwork, totals, progress, leveling, or saved-state changes.

## v2.0.22 — 2026-09-04
- Preserved v2.0.21 data, 61 C7S4 entries and Base/Cheat/Hacker/Gold layout.
- Moved embedded artwork into deterministic local repository assets; no external runtime image dependency.
- Reduced HTML size for direct GitHub-connected maintenance.

## 2.0.21 — 2026-09-04
- Fixed C7S4 main collection grid to use four aligned variant columns: Base, Cheat Master, Loot Hacker, Gold.
- Removed the accidental fourth-item wrap that placed Gold beneath the family column.
- Updated C7S4 detail variant grid to four columns, including mobile sizing.
- No Sprite data, artwork, totals, progress, leveling, or saved-state changes.

# Changelog

## 2.0.20 — 2026-09-03
- Expanded C7S4 permanent catalogue from 36 to 61 counting entries across 16 families.
- Added Mega Man, Overshield, X-Ray, and Onigiri families with verified v42.10 powers and finished embedded artwork.
- Added Loot Hacker as a C7S4 variant row and catalogued every finished Loot Hacker asset immediately under the permanent inclusion rule, regardless of current obtainability.
- Added verified v42.10 Sprite Dust summon costs and mastered resummon display at 50% of the base cost.
- Added the verified Loot Hacker perk: increased chance of items spawning from Loot Hacks.
- Preserved Very Rare for unpublished Sprite Chest rates.
- Carried forward the detail-card cleanup: full text wrapping, dynamic fact boxes, and duplicate-description suppression while keeping the rainbow power/bonus treatment.
- All Sprite artwork remains self-contained in the HTML; no fortnite.gg or other runtime asset dependency was introduced.

## 2.0.18 — 2026-08-28
- Updated all 36 C7S4 Sprite Dust summon costs to current family/variant values.
- Replaced C7S4 placeholder Sprite Chest `0%` values with `Very Rare`.
- Updated Crown Sprite progression wording: one Victory Royale while carrying Crown now fully masters it and grants the next variant.
- Kept all 36 C7S4 Sprites counting; no Sprite, artwork, row, layout, or tracker-function changes.
- Retained fully embedded/self-contained Sprite artwork with no Fortnite.gg runtime asset dependency.
- Updated PWA/service-worker version to 2.0.18.

## 2.0.15 — 2026-08-20
- Added C7S4 as the default season tab with 36 live sprites across 12 families.
- Added C7S4 Base, Cheat Master, and Gold variants.
- Renamed the prior main collection to C7S3 and kept its progress independent.
- Corrected C7S3 to the current 117 released/countable sprites.
- Expanded Locker data to include C7S4 families and variants.
- Preserved Legacy unchanged under C7S3 only and outside completion totals.
- Removed generated John Wick variant silhouettes; John Wick remains Base-only.
- Retained Llama Holofoil-to-Gem correction and Grim Gem/Holofoil additions.
- Normalized John Wick, Ironmouse, Pollo, and Vini Jr visual scale.
- Added Cheat Master styling and export color treatment.
- Updated PWA/service-worker version to 2.0.15.
