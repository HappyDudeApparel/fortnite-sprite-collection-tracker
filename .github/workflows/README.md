# Workflows

All workflows here are **read-only** (`contents: read`). None of them may write to `main`.

| Workflow | Purpose |
|---|---|
| `c7s4-v2041-regression.yml` | Version consistency, C7S3/C7S4 integrity, and live-site polling |
| `c7s4-responsive-cleanup.yml` | Responsive/layout regression checks |
| `vault-stage-qa.yml` | Staging Collector's Vault QA; production files must match the pinned release commit |
| `sprite-arcade-stage-qa.yml` | Sprite Games (2D/3D) QA on staging and production |

## Retired workflows

Seven earlier workflows could commit and push to `main`: `fix-v2030-legend`, `production-cleanup`,
`fortnitemares-live-sync` (`-v2`, `-v3`), `c7s4-verified-artwork` and `repair-fortnitemares-sync`.
They carried hard-coded v2.0.29–v2.0.40 version, manifest and artwork rewrites that would damage the
current release if re-run, and they are removed. Their full text remains in Git history; **do not restore them.**

## Release process (replacement)

Production releases are made by hand in a pull request, never by an automation that rewrites files on `main`:

1. Branch from current `main`.
2. Bump `APP_VERSION` in `index.html`, `service-worker.js`, `version.json`, `asset-manifest.json`,
   `manifest.webmanifest` `start_url` (`?v=`), and `CHANGELOG.md` together.
3. Never change the `manifest.webmanifest` `id`: it identifies the installed app and its saved collections.
4. Let the four QA workflows pass, then merge.
