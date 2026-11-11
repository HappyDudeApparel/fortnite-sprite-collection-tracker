# Phase 2 — Live Locker Sections Integration (2026-11-11)

**Current status:** Phase 2 implemented on the unpublished review branch; **all seven-viewport functional/browser QA and independent C7S4 regression passed** at code commit `055b01f09669c3348f4c0268c74c5c828983077d`. This file is the independent cross-model handoff. The user has authorized Phase 2, **not** a production merge or deploy.

## Source of truth and branch
- Repository: `HappyDudeApparel/fortnite-sprite-collection-tracker`
- Review branch: `feature/locker-approved-scroll-2026-11-10`
- Draft PR: `https://github.com/HappyDudeApparel/fortnite-sprite-collection-tracker/pull/22`
- Production: `main` — **unchanged**.
- Approved visual authorities: `LOCKER_APPROVED_MAIN_PAGE.png` and `LOCKER_APPROVED_FEATURED_AND_BACKGROUNDS.png` from the November 1, 2026 owner handoff.
- Phase 1 source/provenance: `docs/LOCKER-PHASE1-ARTWORK-2026-11-11.md`; actual art under `assets/ui/locker-art/`. These are not flattened mockups of the user's collection.

## Phase 2 responsibilities and implementation

### Continuous native gallery
- `assets/ui/locker-phase2.js` is a **separate, idempotent DOM layout adapter** loaded after `locker-vault.js`. It never edits or overrides `SPRITES`, `BACKGROUNDS`, collection state/storage, or native event handlers.
- The gallery collection footer is moved below the real scrollable base grid, before the canonical variants.
- `assets/ui/locker-phase2.css` defines one continuous indigo/gold/cyan reading column with restrained connecting lighting, preserving all 67 base families and their real original portraits.
- The base collection remains an **independent vertical scroll** with 8 responsive columns (6 below 360px) and live search/owned/missing/list/grid controls. The Featured Sprite and backgrounds remain OUTSIDE that scroll.

### Variants are not sacrificed for the reference illustration
- All valid variants stay as native `.lockerVariantCard` buttons, but the old tall grid becomes a **compact, independently horizontally scrollable ribbon** between the collection footer and Featured Sprite.
- The existing `renderLockerRedesign()` routine continues to render and wire each variant button, preserving variant IDs and collection ownership.

### Featured Sprite and selectable background scene
- The selected Sprite image (`byId(selectedId).image`), description, ownership/mastery status and chosen `BACKGROUNDS[bgIndex].file` remain genuine live DOM data.
- The approved ornamental Featured panel continues the same palette, has a centered title band, and displays the live scene beside the selected details.
- Native `Display: Full` and `Save / Share` actions are retained, not replaced by decorative inert buttons. Existing export canvas and Share overlay remain intact.

### Genuine functional background carousel
- A new `.vaultPhase2BackgroundRail` wraps the **existing native** `#lockerBackgroundGrid` with accessible previous/next scroll arrows; arrow presses scroll the collection **without changing the chosen background**.
- Users can swipe or scroll through every genuine background, and click any original `.lockerBgCard` button to set the native selected background.
- The existing `#lockerBackgroundName` live title remains bound to the actual chosen background; the Featured scene updates through the Phase 1 observer.
- Native re-rendering replaces the background button children, never the strip itself. A small MutationObserver preserves the strip's horizontal scroll offset and arrow state. **When the chosen background changes**, it scrolls that genuine selected thumbnail into view; an unrelated Sprite change preserves browsing offset.
- The background image files and descriptions are not modified, regenerated or substituted with fictional reference-demo entries.

## Files changed or added
- New: `assets/ui/locker-phase2.js`, `assets/ui/locker-phase2.css`.
- `index.html`: only adds the two scoped Phase 2 resource references after Phase 1.
- `asset-manifest.json`: registers both new resources for the existing PWA cache.
- `scripts/qa_locker_vault.py`: additional interactive and visual behavior assertions across 320/360/390/430/768/1024/1440 viewports.
- `.github/workflows/locker-vault-qa.yml`: watches Phase 2 files and art changes.

## Acceptance constraints
1. Gallery independent scroll and all families visible/reachable.
2. Variant ribbon remains truly interactive, including Base/Fortune/Cursed and legacy Base-only cases.
3. Featured Sprite, status, description and selected background remain live and update together.
4. Background strip can be paged by functional arrows and swiped. Horizontal scroll position is preserved through selection.
5. Native Save / Share overlay and export affordances remain usable.
6. No runtime errors and no user-data migrations.
7. C7S3/C7S4/C7S5 regression remains green.
8. Actual mobile/tablet/desktop browser screenshots must be visually inspected, not only green CI.

## Remaining phases / publication hold
Phase 3 = comprehensive visual + end-to-end regression acceptance against both approved images. Phase 4 = a verified standalone working staging URL followed by owner-directed production publication. Neither has been authorized for this change. **Do not merge PR #22 or update `main` yet.**

For independent review, start with this document, the two approved reference PNGs, the source `index.html`, `assets/ui/locker-vault.{js,css}`, `assets/ui/locker-phase2.{js,css}`, and latest GitHub Actions Locker QA run screenshots. Do not rebuild from old v1.0.39 or archived v2.0.4 ZIPs: the working base is the live v2.0.55 branch ancestry with all 316 canonical data rows.

## Verified CI and visual evidence
- Locker browser run: `https://github.com/HappyDudeApparel/fortnite-sprite-collection-tracker/actions/runs/42976664318` — **success** (SHA `055b01f09669c3348f4c0268c74c5c828983077d`).
- Independent C7S4 responsive regression: `https://github.com/HappyDudeApparel/fortnite-sprite-collection-tracker/actions/runs/42976673632` — **success** at same SHA.
- The Locker run's `locker-scroll-20261110-visual-qa` artifact includes screenshots at **320, 360, 390, 430, 768, 1024, 1440** CSS pixels; top/last/featured/background/full-page captures.
- Manually inspected the rendered full mobile (390px), desktop (1440px), and mobile background-selector captures after tests. The gallery and both lower sections share a consistent ornamental frame. The actual selected background is visible and marked in the selector in the background capture.
- QA covers full base-family count, independent gallery scroll with last item reachable, real image loading, search and filters, list/grid, variant buttons, selected portrait/background live binding, carousel arrow operation and selection visibility, Save/Share overlay and three season navigation destinations. No application page exceptions were reported.
- **This is Phase 2 validation, not the comprehensive owner visual acceptance (Phase 3).** Differences from the November 1 concept remain subject to that later independent audit, and production remains untouched.
