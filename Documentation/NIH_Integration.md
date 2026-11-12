# NIH Clinical Tables Integration

Issue [#27](https://github.com/Colby-Frison/Capstone-Fall2026/issues/27) — smart condition lookup for search.

## Shipped status (Issue #27)

**Autocomplete + thin BFF is implemented** in this repository:

| Piece | Location |
| --- | --- |
| Local BFF | `src/apps/api` — Node server on `:8787` |
| Vercel BFF | `src/apps/web/api/nih/conditions.js` — serverless `GET /api/nih/conditions` |
| Shared client | `src/apps/web/api/_lib/clinicalTables.mjs` |
| Client match | `src/packages/content/nih.ts` |
| Combobox UI | `src/apps/web/src/components/ConditionSearchInput.tsx` |
| Tests | API `node --test`, `nih.match.test.ts`, e2e `nih-autocomplete.spec.ts` |

**Related issues:**

| Issue | Focus | Status |
| --- | --- | --- |
| [#32](https://github.com/Colby-Frison/Capstone-Fall2026/issues/32) | Map FAA parsed conditions to NIH medical identities (committed cache) | Shipped |
| [#31](https://github.com/Colby-Frison/Capstone-Fall2026/issues/31) | Scored synonym-aware search across condition content — see [Search_Scoring.md](./Search_Scoring.md) | Shipped |
| [#33](https://github.com/Colby-Frison/Capstone-Fall2026/issues/33) | Enrich condition detail with NIH context and external links | Shipped (below) |

Related: [#18](https://github.com/Colby-Frison/Capstone-Fall2026/issues/18) (terminology lookup). Accuracy rule unchanged: FAA guidance remains the only source of certification dispositions; NIH is for discovery, identity, and educational context.

## Purpose

Use NIH/NLM **Clinical Tables Conditions v3** to improve condition discovery (autocomplete, synonyms, ICD-10 hints, educational links) while keeping **FAA AME/OneGuide guidance** as the only source of certification dispositions and paperwork.

## API choice

| Item | Value |
| --- | --- |
| Service | [Clinical Table Search Service — Medical Conditions v3](https://clinicaltables.nlm.nih.gov/apidoc/conditions/v3/doc.html) |
| Base URL | `https://clinicaltables.nlm.nih.gov/api/conditions/v3/search` |
| Typical params | `terms`, `maxList=8`, `df=consumer_name,primary_name`, `ef=synonyms,icd10cm_codes,info_link_data` |

**Not used in this ship:** MedlinePlus Connect, UMLS, medication APIs.

## Accuracy boundary

| Source | Allowed use |
| --- | --- |
| NIH Clinical Tables | Autocomplete labels, synonyms, ICD-10 codes, external educational links |
| Local `*.normalized.json` via `@content` | Disposition, certification notes, documents, sub-conditions |

NIH never invents or overrides FAA outcomes. Unmatched NIH names show an explicit “no FAA guidance in this catalog” state.

## Architecture

```text
Browser (ConditionSearchInput)
  → GET /api/nih/conditions?q=…
  → Thin BFF
       local:  Vite proxy → src/apps/api (:8787)
       Vercel: src/apps/web/api/nih/conditions.js (Root Directory = src/apps/web)
  → Clinical Tables v3
  → Normalized DTO
  → Client matches labels/synonyms → local Condition.id
  → Select matched → ConditionDetail; else → local search
```

### App-owned DTO

```json
{
  "query": "migr",
  "suggestions": [
    {
      "keyId": "123",
      "label": "Migraine",
      "primaryName": "Migraine",
      "synonyms": ["..."],
      "icd10": ["G43.909"],
      "infoLinks": [{ "url": "https://...", "title": "..." }],
      "matchedConditionIds": ["migraine"]
    }
  ],
  "error": null
}
```

`matchedConditionIds` are filled by the web client using `matchConditionsByNames` against the bundled catalog:

1. **Exact** normalized condition name → totality `1`
2. Else the NIH/search string must be a **substring of the condition name** → totality = `needleLength / nameLength`
3. Multiple hits are ordered by **higher totality** first (then longer needle)

Fuzzy token / reverse-containment matching is intentionally not used, so autocomplete does not jump to unrelated FAA pages.

## BFF behavior

- Path: `GET /api/nih/conditions?q=`
- Sanitize: trim, max length 80, reject empty
- Upstream timeout: ~3s
- In-memory TTL cache: ~60s per query
- Fail soft: `{ suggestions: [], error: "upstream" }` (HTTP 200) so the UI can keep typing
- Production browsers call the app BFF only — not `clinicaltables.nlm.nih.gov` directly

## Accessibility

Search inputs use a combobox pattern:

- `role="combobox"` + `aria-expanded` / `aria-controls` / `aria-activedescendant`
- Listbox with `role="option"`
- Arrow Up/Down, Enter to select, Escape to close
- Debounced fetch (~250 ms) after at least 2 characters

## Local development

```powershell
# Terminal A — BFF (default http://127.0.0.1:8787)
node src/apps/api/src/server.mjs

# Terminal B — Vite (proxies /api → BFF)
python src/scripts/capstone.py dev
```

Or use `capstone.py dev`, which starts the BFF then Vite. Vite proxies `/api` to `http://127.0.0.1:8787`.

## Deployment notes (Vercel)

Vercel **Root Directory** is `src/apps/web`. The SPA still calls same-origin `/api/nih/conditions`.

| Environment | Who serves `/api/nih/conditions` |
| --- | --- |
| Local (`capstone.py dev`) | Vite proxies to `src/apps/api` on `:8787` |
| Vercel | Serverless function `api/nih/conditions.js` (under the web root) |

Shared fetch/normalize logic: `api/_lib/clinicalTables.mjs` (inside the web root so it is included in the deploy). The local API package re-exports that module.

After deploy, verify: `https://<your-domain>/api/nih/conditions?q=migr` returns JSON with `suggestions`.

## Testing

- Unit: Clinical Tables parse fixtures; `matchConditionsByNames` exact / alias / no-match
- E2E: mock `/api/nih/conditions` and assert autocomplete keyboard selection

## FAA ↔ NIH identity mapping (Issue #32)

Persist a stable NIH identity per adapted FAA condition so search and detail UIs can use synonyms/ICD-10/educational links without calling Clinical Tables at build time.

| Item | Value |
| --- | --- |
| Sidecar | `src/data/guidance/nih_condition_map.json` (keyed by `Condition.id`) |
| Fields | `mappingStatus`, `nihKeyId`, `consumerName`, `primaryName`, `synonyms[]`, `icd10[]`, `infoLinks[]`, `matchConfidence` |
| Merge | `applyNihConditionMap` in `src/packages/content/nihMap.ts` (wired from `src/apps/web/src/data/conditions.ts`) |
| Remap | From `src/apps/web`: `npx vite-node --config vitest.config.ts scripts/map-faa-nih.ts` |

### Confidence rules

| Status | Rule |
| --- | --- |
| `mapped` | Best bidirectional name score ≥ **0.85** (exact match = 1.0) |
| `low-confidence` | Score ≥ **0.50** and < 0.85 — identity stored but treat cautiously |
| `unmapped` | Below 0.50 or no suggestions — FAA-only record remains valid |

NIH never invents or overrides ISSUE/DEFER/DENY. Prefer `unmapped` / `low-confidence` over a bad auto-map.

### Remap workflow

1. Regenerate or update `*.normalized.json` as usual.
2. From `src/apps/web`, run:
   `npx vite-node --config vitest.config.ts scripts/map-faa-nih.ts`
   (needs network once; optional `--limit=N` for a smoke pass).
3. Commit the updated `nih_condition_map.json`.
4. CI and local Vite builds load the sidecar only — no live NIH required.

The mapper expands compound FAA headings into shorter query terms, scores NIH candidates with containment + token coverage, and writes an explicit `unmapped` entry when nothing clears the threshold.

## Condition detail enrichment (Issue #33)

Condition detail reads the **committed sidecar** on `condition.nih` — it does **not** call Clinical Tables when the page loads. Live Clinical Tables remain the source for search autocomplete only.

| Piece | Location |
| --- | --- |
| About panel | `src/apps/web/src/components/NihConditionAbout.tsx` |
| Mode helper | `src/apps/web/src/components/nihAboutMode.ts` |
| Links reuse | `NihRelatedLinks` with sidecar `infoLinks` |
| Wiring | `ConditionDetail` — after header summary, before pathway / FAA sections |
| Tests | `nihAboutMode.test.ts`; e2e `condition-nih-detail.spec.ts` (mapped + unmapped) |

### Behavior

| Sidecar state | UI |
| --- | --- |
| `mapped` / `low-confidence` with displayable fields | “About this condition”: common name, optional primary name, synonyms, ICD-10, NIH educational links |
| `unmapped`, missing identity, or empty fields | Calm FAA-only notice + Search / Browse CTAs — no invented medical blurb |

NIH copy is labeled educational. Disposition badges, pathway text, and checklists still come only from FAA guidance. The page disclaimer stays visible in the footer.

## Out of scope

- Replacing FAA JSON with NIH content
- MedlinePlus Connect enrichment panels (follow-up)
- Auth, persistent DB, PII
