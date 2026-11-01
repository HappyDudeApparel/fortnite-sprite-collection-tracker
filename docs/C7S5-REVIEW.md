# Treasure Hunters C7S5 — production release v2.0.47 (November 1, 2026)

## Verified roster and genres

VICE's Nov. 1 article lists **33** collectible Sprites: **11 families × Base / Fortune / Cursed**, and Epic's live patch notes independently confirm 11 new families and the Fortune, Cursed and upcoming Gold genres.
- Total C7S5 currently 33, Base=11, Fortune=11, Cursed=11. No Gold family rows until the November 12 update verifies their availability.
- New families: Halfpeel'd; Re-Pete; Barry O'Fish; Exmarks; Plundarrgh; Chester; Wayfinder; Kelper; Lil' Squibbly; Lil' Flacko; Sweet Dreams.
- Every one of the 33 rows supports local acquisition and levels 1–5, and the corresponding active-season summary.
- C7S3 stays at **117 countable (119 raw)** and C7S4 **162 countable**. The 281 old sprite objects are byte-for-byte identical to the previous main branch. Old favorites/mastery in browser localStorage stay on their original stable numeric IDs.
- Three-category genre release while a four-column bar still displays a Gold release marker.
- C7S5 CSS stays isolated (body.season-c7s5) and its legend/rows share one horizontal scrolling parent, like the previously corrected C7S4 interaction. Other seasons' CSS remains untouched.

## Artwork provenance / limitation

The user supplied a 1536×864 original montage corresponding to the **VICE** published gallery. For this web release, the app uses the source publisher's web image as **one externally loaded sprite sheet**, with per-variant crop coordinates and no modification of old image assets.

**Known constraints**: crop-to-name attribution for several visual families remains provisional (descriptive names are confirmed, but the collage is unlabeled). These are provisional gallery visual previews, not independently verified, perfectly transparent character PNGs. The remote image requires third-party site availability. On browsers that disallow cross-origin canvas export, Featured Sprite export will gracefully use a safe non-tainted placeholder rather than a broken download. The visual gallery can still appear as ordinary CSS background imagery.

After individual authentic PNG/WebP portraits become available from Fortnite.GG, Epic or another high-quality source, replace these montage slices with locally hosted transparent exports and verify every artwork-to-name mapping. This is the immediate quality follow-up, but the Sprite entries and owned/mastered tracker can operate now.

## Sources
- Epic official: https://communities.epicgames.com/thread/set-sail-for-fortnite-treasure-hunters-the-greatest-adventure-of-all-time/Pmud
- VICE (33 new, all family variant combinations): https://www.vice.com/en/article/all-33-new-fortnite-sprites-added-in-treasure-hunters-mini-season-full-list/
- Image sheet: https://www.vice.com/wp-content/uploads/sites/2/2026/11/all-fortnite-treasure-hunters-sprites.jpg
- Fortnite.GG: https://fortnite.gg/sprites
- Epic season promotional article: https://www.fortnite.com/news/fortnite-treasure-hunters-the-greatest-adventure-of-all-time

## QA
- 33 C7S5 entries across 11 families with unique, collision-free IDs; C7S3 and C7S4 collectible counts verified unchanged.
- Inline script syntax checked in all 14 blocks.
- A post-publish device/browser walkthrough should verify live thumbnails, mobile alignment, game-details/Locker and export card behavior.
- No C7S3/C7S4 dataset changes, artwork rewrites, or progress-key migrations.


## v2.0.48 local art import
All 33 gallery crops are now stored as local WebP assets; the temporary remote crop handler was removed. The montage was published by VICE from Epic screenshots. Per-character mapping is provisional until official individual variant icons become available. All character images preserve original limbs and montage background; no destructive isolation.
