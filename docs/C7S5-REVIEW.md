# C7S5 Treasure Hunters — review gate, 2026-11-01

## Officially confirmed

- Begins November 1, 2026. Epic schedules a Chapter 7 end event on December 5 (the precise new Chapter launch date is not stated there).
- Eleven newly named Sprite families: Halfpeel'd; Re-Pete; Barry O'Fish; Exmarks; Plundarrgh; Chester; Wayfinder; Kelper; Lil' Squibbly; Lil' Flacko; Sweet Dreams.
- Variant genres: Fortune (reveals chests), Cursed (improves rare-variant odds but water causes damage), and Gold (elimination XP bonus, November 12).
- Sprite Mastery Track returns and the seasonal Sprite Stamp / ordering improvements are officially announced.

## Build choices

- C7S5 is the default new tab; the original C7S3 (117 collectible; 119 total records) and C7S4 (162 collectible) tabs are retained, untouched, and fully selectable.
- Eleven C7S5 family rows are announced previews, each with a visually labeled art-pending treasure chest illustration. No fabricated character silhouettes or family/variant pairings.
- Four independent genre columns: Base, Fortune, Cursed, Gold. Unknown cells have a dash, not a fake collectable.
- Zero collectible C7S5 records are counted until real individual portraits, acquisition mechanics and actual variant mappings are verified. Existing favorites/levels and backgrounds are not migrated or overwritten.
- The 4-column alignment is applied exclusively under the season-c7s5 CSS class, using one horizontally scrollable table for both legend and rows.
- Official promotional key art is linked from Epic's image CDN; it requires connectivity and is not yet included in an offline asset package.
- Chapter 8 removal is **a leak only**, not confirmed by Epic. Nothing should ever delete previously saved collections on this premise.

## Sources

1. https://communities.epicgames.com/thread/set-sail-for-fortnite-treasure-hunters-the-greatest-adventure-of-all-time/Pmud
2. https://www.fortnite.com/news/fortnite-treasure-hunters-the-greatest-adventure-of-all-time
3. https://fortnite.gg/sprites
4. https://cms-assets.unrealengine.com/cm6l5gfpm05kr07my04cqgy2x/resize%3Dfit%3Aclip%2Cwidth%3A1920/quality%3Dvalue%3A80/cmvtxul9bkewz08mx8srtsws2

## Required before merging / deployment

- Collect final released Sprite roster, source sprites, family-specific portraits and exact family-to-variant availability from official game/fortnite.gg after launch at 9am ET.
- Validate the initial 11 announced family names and powers against an authenticated runtime collection and identify released vs upcoming variants. Add distinct rows only for **verified** family/variant combinations.
- Promote a Sprite from preview to collectible and enable mastery/ownership only after its mechanics are confirmed.
- Run on-device interactive and visual QA at portrait, landscape and desktop widths: default C7S5, banner art fallback, aligned variant bar and rows, details, switching seasons, independent saved levels, locker, exported cards, and offline/PWA updates. Confirm C7S3=117 and C7S4=162 counts remain unchanged.
- Merge this draft PR into main **only after approval and successful testing**.
