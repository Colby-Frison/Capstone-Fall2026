# Guidance data privacy and public app repo

Issue [#48](https://github.com/Colby-Frison/Capstone-Fall2026/issues/48) — keep FAA **source PDFs** out of git while the **app repo stays public** for Hobby Vercel collaboration.

## Current decision (PR #54)

| Asset | Where it lives | In public git? |
| --- | --- | --- |
| Source PDFs (`ame_guide.pdf`, `OneGuide_Neurology.pdf`) | Local `Documentation/Resources/` (gitignored) | **No** |
| Normalized guidance JSON (`*.normalized.json`) | `src/data/guidance/` | **Yes** |
| Curated sidecars (`category_dictionary.json`, `form_links.json`, `freq_conditions.json`, `nih_condition_map.json`) | `src/data/guidance/` | **Yes** |
| Vite / Vercel build | Reads committed JSON via `import.meta.glob('@guidance/*.normalized.json')` | N/A — no token required |

**Secrecy target:** source PDFs (and git history that once held them). Normalized JSON is treated as publishable product content for this Capstone prototype.

## What we tried and rolled back

Earlier Option 2 used a private companion repo + `scripts/fetch-guidance.mjs` (`GUIDANCE_REPO` / `GUIDANCE_TOKEN`) and synthetic samples. That path caused Vercel `prebuild` failures when the token was unset and added clone complexity.

PR [#54](https://github.com/Colby-Frison/Capstone-Fall2026/pull/54) restored committed `*.normalized.json`, removed fetch/samples plumbing, and kept PDFs gitignored only.

Children:

| Issue | Outcome |
| --- | --- |
| [#49](https://github.com/Colby-Frison/Capstone-Fall2026/issues/49) | Private companion + fetch plumbing (later superseded for app builds) |
| [#50](https://github.com/Colby-Frison/Capstone-Fall2026/issues/50) | History purge + app repo made public — **done**; re-clone or hard-reset local remotes after the rewrite |
| [#51](https://github.com/Colby-Frison/Capstone-Fall2026/issues/51) | Closed as duplicate of [#20](https://github.com/Colby-Frison/Capstone-Fall2026/issues/20) (per-condition split under `ParsePDFChuckes`) |

## Local PDF setup

1. Obtain mentor-approved AME Guide / OneGuide PDFs outside git.
2. Place them at:
   - `Documentation/Resources/ame_guide.pdf`
   - `Documentation/Resources/OneGuide_Neurology.pdf`
3. Parse into `src/data/guidance/` (see [AME_Parser.md](./AME_Parser.md)).
4. Commit updated `*.normalized.json` when the catalog changes; never commit the PDFs.

Integration pytest skips when PDFs are missing — place the files locally; there is no `fetch-guidance` script on `main`.

## After the #50 history rewrite

If your local clone predates the filter-repo / public flip:

```powershell
git fetch origin
git checkout main
git reset --hard origin/main
```

Or delete the folder and re-clone `https://github.com/Colby-Frison/Capstone-Fall2026.git`.

Optional: remove unused Vercel env vars `GUIDANCE_REPO` / `GUIDANCE_TOKEN` / `GUIDANCE_REQUIRED` if they remain from the dual-repo experiment. Archive any private companion guidance repo if it only stored PDFs you already keep locally.

## Acceptance (revised)

- [x] App repo is public and suitable for Hobby Vercel team collaboration
- [x] Source PDFs are gitignored and not required for CI/frontend builds
- [x] Normalized guidance JSON is committed so clones and Vercel builds work without a guidance token
- [x] History purged before the public flip (#50)
- [x] Dual-repo fetch path intentionally removed in favor of public JSON (#54)
