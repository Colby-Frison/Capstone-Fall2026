# Search scoring

Issue [#31](https://github.com/Colby-Frison/Capstone-Fall2026/issues/31) — scored synonym-aware search across condition and medication content.

## Behavior

1. Build **needles**: the user query plus optional NIH expansion terms (suggestion labels + synonyms from `GET /api/nih/conditions`).
2. Score every condition and medication against each needle; keep the **max** score per item.
3. Return a single ranked list (stable ties: higher score → type → `id`).
4. UI shows type badges; raw scores are not displayed.

FAA dispositions are never derived from NIH. Synonyms are discovery aids only.

## Indexed fields

### Conditions

| Field | Role |
| --- | --- |
| `name` | Strongest (exact / substring) |
| `nih.synonyms`, `nih.consumerName`, `nih.primaryName` | Synonym-on-identity (from #32 sidecar) |
| `category` | Medium-high |
| `subConditions[].name` | Medium-high |
| `summary`, `certificationNote`, `medicationNotes` | Medium |
| `subConditions[].summary`, `certificationNote`, `medicationNotes` | Medium |
| `subConditions[].documents[].label` | Low |
| `subConditions[].warnings` | Low |

### Medications

| Field | Role |
| --- | --- |
| `name`, `genericName` | Strongest |
| `category` | Medium-high |
| `flightStatusNote` | Medium |
| `certificationImpact` | Weaker body |

## Weights

Implemented in `src/packages/content/search.ts` as `SEARCH_FIELD_WEIGHTS`:

| Key | Weight |
| --- | --- |
| `nameExact` | 1000 |
| `nameSubstring` | 800 (scaled by needle/field length) |
| `nihSynonymExact` | 750 |
| `nihSynonymSubstring` | 600 (scaled) |
| `subConditionName` | 450 |
| `category` | 400 |
| `summary` / `certificationNote` / `medicationNotes` | 220 |
| `documentLabel` | 120 |
| `warnings` | 100 |
| `medGenericName` | 800 |
| `medFlightNote` | 200 |
| `medImpact` | 150 |

Exact name matches always rank above synonym-on-name and weak body hits.

## API

- `searchCatalog(query, { conditions, medications, expandedTerms })` → `SearchHit[]`
- `searchAdaptedConditions(conditions, query, expandedTerms?)` → ranked `Condition[]` (compat wrapper)
- `expandedTermsFromNihSuggestions(suggestions)` → string[]

## Query expansion

`SearchResults` fetches NIH suggestions for the query and passes labels/synonyms into `searchCatalog` so everyday language can surface FAA rows that use clinical headings.
