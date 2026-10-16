# NIH Clinical Tables Integration

Issue [#27](https://github.com/Colby-Frison/Capstone-Fall2026/issues/27) — smart condition lookup for search.

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
  → Thin BFF (src/apps/api)
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

## Deployment notes

- The static Vite build (`apps/web/dist`) does not host the BFF.
- Deploy the BFF as a small Node process or serverless function that exposes `GET /api/nih/conditions`.
- Point the SPA at the same origin `/api` (reverse proxy) or configure a same-origin gateway.
- Figma Make / static-only hosts need a separate API host for live autocomplete.

## Testing

- Unit: Clinical Tables parse fixtures; `matchConditionsByNames` exact / alias / no-match
- E2E: mock `/api/nih/conditions` and assert autocomplete keyboard selection

## Out of scope

- Replacing FAA JSON with NIH content
- MedlinePlus Connect enrichment panels (follow-up)
- Auth, persistent DB, PII
