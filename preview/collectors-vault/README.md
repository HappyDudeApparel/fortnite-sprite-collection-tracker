# Collector's Vault — interactive staging preview

**Preview URL:** https://sprites.happydude.ca/preview/collectors-vault/

## Approval boundary
- Production remains rooted at /index.html and version **2.0.43**.
- The files in this directory are **staging-only**, served at a distinct URL on the same Pages domain.
- Nothing in this preview replaces the live application's HTML, JavaScript, stylesheet, manifest, assets, or service worker.
- This prototype deliberately omits service-worker registration and the installable PWA manifest.
- Review approval is REQUIRED before any of these features are adapted into the actual production app. There is no automatic merge/promotion.
- Publishing a public staging URL requires Git commits for the **new staging files**, but no production-file commit or launch decision is required.

## Prototype feature coverage
1. **New Collector's Vault dashboard:** authentic featured Sprite; current-season progress ring; found/missing/mastered counts; responsive featured background.
2. **New mobile-friendly Collector Cards:** full family art, independent authentic variant art, collected-level state, manage-level buttons; one-click Classic Grid toggle retaining the established native grid.
3. **Three instant design concepts:** Aurora, Midnight Museum, and Neon Arcade with a quick switch in the staging banner and additional switches under Museum > Studio Settings.
4. **Mastery Reward journey:** all five Quack milestones (40/45/50/55/60), explicit self-tracked in-game mastery disclaimer and reward readiness; original powers preserved.
5. **Achievements:** eight actual progress-derived collector awards with locked/unlocked treatments.
6. **Personal museum:** up to six shelves, six adjustable Sprite slots per shelf, editable labels, original verified scene backgrounds. Existing background/sprite calibration data is untouched.
7. **Collection backup/restore:** locally downloaded JSON with recorded ownership, levels, season preference, shelves, appearance and selected art. Imported data is verified and requires confirmation before **staging-only** import.
8. **Collector cards, sharing and completion certificates:** portrait (1080 × 1350), square (1080 × 1080), landscape (1600 × 900), and certificate (1600 × 1000), downloadable PNG and optional native OS share sheet.
9. **Motion + sounds:** opt-in achievement audio, level-5 confetti, a modest rift-inspired animation prototype, reduced-motion toggle and operating-system motion preference support.
10. **Modular staging code:** `vault.css` and `vault.js` live separately from the original page, reducing the risk of altering historical behavior.

## Deliberate exclusions / limitations
- **Cloud account synchronization is not deployed.** It would require an approved identity system and backend/service, which have not been configured. The working, portable JSON backup/restore exists now.
- The **original Fortnite-style plasma reference animation is not claimed to be reproduced exactly**; the staging rift is an optional prototype.
- The older production page's many historic CSS/script patches remain intact, not recklessly consolidated. Modular improvements are staged separately and any future structural production refactor requires review and regression checks.
- Site achievements and mastery rewards are derived from the player's own checked-off entries. They do not claim verification against Fortnite's servers.
- The default sample display shelf may feature released character art as **example artwork** until customized; it does not claim those Sprites are owned.

## Source and data isolation
- The staging `index.html` is copied from the verified **v2.0.43 production HTML**, with a base path pointing two levels up solely to **reuse the approved original image assets**.
- Staging does not duplicate or replace any original C7S3 or C7S4 image.
- Production records and staging records are byte-equivalent JSON arrays, checked in CI.
- First staging visit copies existing local collection progress **read-only** to the prefixed `vault-stage-v1-*` storage namespace.
- All later preview edits and JSON restores write only those staging keys; returning to the live site leaves the real collection as before.
- Do not clear site data to reset staging: that would also clear the live app's local collection. To reset the preview use the app's own JSON backup/restore workflow or carefully select preview-prefixed keys only.

## Automated quality checks
`.github/workflows/vault-stage-qa.yml` runs Chromium simulations at 390 × 844, 768 × 1024 and 1440 × 900; checks the dashboard, family cards, Classic Grid, collection totals, seasons, museum, shelves, themes, motion settings, graphics export, backup/restore and storage isolation; captures images as build artifacts; then checks the published public preview URL.

The tests also compare every protected production root file to the pre-staging commit (`45278cd967c230a1d97ec31cb7c2a00d11492139`) and require exact equality.

## Rollout plan (only after the user explicitly approves)
1. Review all three concepts on a phone and desktop; note required design edits.
2. Make any desired adjustments **within staging only** and rerun the staging QA.
3. Prepare a separate, explicit production-promotion pull request; audit all 281 sprite records, two season views, approved images, storage migration, background calibration, offline assets and export features.
4. Only after approval merge/ship. Do not overwrite existing ownership keys or C7S3 operations.
