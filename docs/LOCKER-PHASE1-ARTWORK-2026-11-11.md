# Phase 1 — Approved Locker artwork reconstruction
**Date:** 2026-11-11  
**Status:** Artwork assets and responsive visual layers built on an unmerged review branch. This is NOT an authorization to publish.

## Visual authority
- `LOCKER_APPROVED_MAIN_PAGE.png` (882 × 1784 px, owner approved November 1, 2026)
- `LOCKER_APPROVED_FEATURED_AND_BACKGROUNDS.png` (882 × 1784 px, same approval)
- `ASTRA_LOCKER_DESIGN_ADDENDUM_AND_APPROVED_REFERENCE_IMAGES_2026-11-01.zip`, section “Visual-design lock”

The artwork is reconstructed from APPROVED image pixels, rather than approximating their materials with CSS polygons. Gold laurel typography, vaulted arches, lanterns, foliage, twin crystal vitrines, equalizers and projection floor are retained. An illustrative holographic Llama was carefully removed from the scene, leaving an empty centre into which the real repository Llama art is projected. This preserves the instruction never to substitute fictional mock characters for canonical Sprite data.

## Size decision
**Two master hero crops, not one stretched phone poster.** A 1764 × 648 WebP is displayed below 1200 CSS pixels; a 2200 × 648 WebP (preserving all approved stage landmarks) is displayed at widths at or above 1200 CSS pixels. Their authored aspect ratios match the actual hero container at their respective breakpoints. Both are 2x-style source resolution for high-DPR displays.

**One reusable frame per chromatic material.** The exact approved cyan, gold, violet and teal card chrome is extracted into transparent 318 × 444-ish PNG overlays (3× source crop resolution). Card interiors are transparent, not filled with mock characters, labels or progress. Genuine `SPRITES` source-record portraits and real live names remain DOM children beneath/above the decorative frame, never flattened into a screenshot.

**Independent ornamental panel frames** reproduce the approved gold/indigo collection header, gold/cyan Featured Sprite panel, cyan/violet Background Selector frame, and violet/cyan floor continuation. All mock copy, thumbnails, progress figures, and example ownership statuses are cut out, so only real data and existing controls can appear in those openings.

## Deliverables within `assets/ui/locker-art/`
- `locker-hall-mobile-approved.webp`, `locker-hall-wide-approved.webp` — actual architectural treatment and gold visual logo, centre clear for canonical projection.
- `locker-card-approved-{cyan,gold,violet,teal}.png` — pixel-authentic transparent gem-cut card chrome.
- `locker-summary-panel-frame.png` — gold progress-panel material, transparent inside.
- `locker-feature-panel-frame.png` — gold/cyan selected-Sprite panel chrome, transparent inside.
- `locker-background-panel-frame.png` — cyan/violet carousel-panel chrome, transparent inside.
- `locker-floor-approved.webp` — bottom floor glow and atmosphere with no sample thumbnails.

## Layering and semantics
- The gold *SPRITE COLLECTION LOCKER* title is preserved within the approved arch artwork to retain its exact engraved lighting and metallic depth; the existing semantic `h1` remains in the DOM for assistive technology and is only visually hidden while the Locker page is active.
- The Llama silhouette and wireframe effect are derived from the canonical `lockerFamilyEntries()` art's actual image path, not a generated mascot.
- Live search, filters, collection tiles, selected sprite/background, ownership/mastery, Save/Share/export and background navigation remain native live controls. The actual catalogue and season-page files were not changed.

## Boundaries
This delivers **Phase 1 artwork only**, plus visual-only CSS integration and art-loading smoke tests. It is *not* the staging website, deployment or whole-app Phase 2/3 acceptance. Do not merge it until the separate downstream end-to-end audit and user-approved publication.

## Provenance and integrity
The original reference pixels outside the deliberately cleared central illustrative Llama region are unchanged in the mobile PNG master; 88.19% of its RGB source pixels remain byte-identical to the approved source crop (before size encoding). Frame interiors are cut out with alpha; the approved frame chrome is retained. Every presented decorative image is local to this repository, registered in the asset manifest for PWA caching. No newly imagined Sprite portrait, invented family, mock user ownership or demo background has been introduced.
