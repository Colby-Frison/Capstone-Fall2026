# Issue #56: Integrate the PDF parser into the website

**Branch:** `issue-56-integrate-pdf-parser-website` (created from `main` at `c952126`)
**Status:** work is done in the working tree and tested. **Not committed yet.** Three rows still need fixing, and the browser check still needs to run (see [Open items](#open-items)).

This file records what was discussed and what was done for #56, so the team can review it before it is committed. The per-condition change list is in [`site_update_report.md`](site_update_report.md), which is generated.

---

## 1. Background

The site ("Pilots Guide to Medical Certification") already listed 175 conditions, built from `src/data/guidance/*.normalized.json` (the older parser) through `src/packages/content/adapt.ts`:
- 144 from the AME Guide
- 31 from OneGuide Neurology

The new chunked parser (Ticket 9, commit `c952126`) produced `ParsePDFChuckes/2_website_data/` with 181 conditions. For each one it has rows (condition / evaluation data / disposition), decisions, a "what to bring" checklist, CACI worksheets, notes and source pages.

**Goal agreed for #56:** the parsed AME Guide is the source of truth for condition content.
- **A.** Conditions already on the site are updated with the parsed data. Their id, `?condition=` URL, name, category, NIH data and form links are kept.
- **B.** Parsed conditions not yet on the site are added.
- Site-only conditions are kept, not deleted, and listed for review.

## 2. Decisions made

| Question | Decision |
|---|---|
| Row disposition | Use the **first** decision in each row. `issue`/`caci` → issue; `defer`/`faa_decision`/`more_info_needed` → deferral; `deny` → denial; `special_issuance`/`aasi` → special-issuance; `see_reference` or none → unknown. The full FAA disposition text is always kept on the row. |
| Checklist items | Used one-for-one, with no semicolon splitting. |
| OneGuide Neurology conditions | The 5 with a parsed match and no AME Guide twin are **updated**. The ones that duplicate an AME Guide condition are **left as-is** and listed. |
| Parser bugs found along the way | **Fix them in `build_site_data.py`** and regenerate `2_website_data/` with the script, not by hand. |
| UI | Three small additions to `ConditionDetail.tsx`: a CACI worksheet box, collapsible "Notes from the guide" (HTML limited to an allowlist), and an FAA Guide source link with page numbers. |
| Low-confidence matches | All 7 proposed were accepted. Only 4 are still low-confidence; the parser fix turned the other 3 into exact matches. |
| Category for new conditions | Name pattern first (`resolveCategory`), then the parser's category name, then 5 reviewed overrides. Item numbers are **not** used, because `category_dictionary.json` numbers exam items differently from this guide (its item 38 is Skin; the guide's item 38 is Abdomen). |

## 3. Code review of the Ticket 9 parser (start of the session)

Findings on `ParsePDFChuckes/1_parser/`, reported before any changes were made:

1. **`ame_guide.pdf` (11 MB) and three `.DS_Store` files were committed** in `c952126`, against the PR #54 rule that source PDFs stay local. `.gitignore` only covers `Documentation/Resources/ame_guide.pdf`. **Still open.**
2. The "rows placed" check in `build_site_data.py` counts rows before skipping header rows, so it can't fail.
3. The duplicate-id check can never fire: conditions are keyed by slug, so two headings with the same name merge silently.
4. The `chunked_parser.py` validation cache (`_source_pages.json`) isn't tied to which PDF it came from, so it can go stale.
5. The "table re-joined" repair count is assumed, not verified.
6. Smaller items: a no-op `clean()` replace, attributes set outside `__init__`, a module-level `category_intros` global, an unused parameter, and the folder name typo `ParsePDFChuckes`.
7. No tests or CI for the parser. (Tests for the parts changed in #56 have now been added.)

## 4. Parser fixes (`ParsePDFChuckes/1_parser/build_site_data.py`)

The chunked PDF extraction (`chunked_parser.py`) is **unchanged**. A full re-run of `run_all.sh` on `ame_guide.pdf` produced a `sections.json` byte-for-byte identical to the committed `3_full_extraction/sections.json`. All fixes are in the step that groups that output into conditions:

| Bug | Effect before | Fix |
|---|---|---|
| Headings ending in `;` were rejected | COPD's rows were filed under Pectus Excavatum | Accept and join `;` continuation lines |
| Long `( … )` subtitle lines (over 140 characters) broke heading detection | Middle Ear's rows were filed under Mastoids | Allow parenthetical subtitle lines up to 300 characters |
| Headings ending in `).` were rejected | Lens Implant's rows were filed under Eyes – Procedures | Accept short `… (…).` headings |
| Scrambled tables: header cells mixed into rows, rows glued together | Blepharitis lost entirely; Alzheimer's filed under a junk "Neurologic" condition; Bell's Palsy rows A and B lost; Psychiatric Conditions short 6 rows | New `repair_scrambled_tables()`: drop header-label cells, regroup into rows of 3, strip a glued heading, restore A/B/C order; drop a fragment glued to a header label only when that makes the cells regroup evenly |
| A cell containing only a header label ("DISPOSITION") | Pituitary Adenoma row B's outcome read "DISPOSITION" | Treat it as empty, so the "shared with the row above" rule applies |
| Row letters written as `- A.` not recognized | Epilepsy and others had no A/B labels (and wrong "group table" aliases) | Accept a leading dash or bullet |
| Stale output files never deleted | `conditions/neurologic.json` would linger after a monthly re-run | Clear `conditions/` and `reference/` before writing |

Every repair is listed in `2_website_data/validation_report.md`. Three tables are left as-is because their cells don't regroup evenly; none of them affects a condition's rows.

**Result:** 181 → **185** parsed conditions, and 497 → **510** disposition rows.
- Added: COPD, Middle Ear Abnormalities, Lens Implant, Blepharitis and Conjunctivitis, Alzheimer's/MCI/Dementia
- Removed: the junk "Neurologic" record

In the other conditions, the only differences are the renumbered `order` field and the restored row letters.

## 5. Merge into the site

### Pipeline

```
ParsePDFChuckes/3_full_extraction/sections.json        (chunked parser, unchanged)
   ↓ 1_parser/build_site_data.py                       (fixed, see section 4)
ParsePDFChuckes/2_website_data/conditions/*.json       (185 conditions)
   ↓ src/apps/web/scripts/build-parsed-conditions.ts   (new)
src/data/guidance/parsed_conditions.json               (what the site reads)
src/data/guidance/parsed_condition_map.json            (mapping, for review)
ParsePDFChuckes/6_docs/site_update_report.md           (change report)
   ↓ applyParsedConditions() in src/packages/content/parsedConditions.ts
Website: 175 → 211 conditions
```

`run_all.sh` now runs all three steps. Step 3 copies fresh output into `2_website_data/` and runs the merge script, so the monthly FAA update goes through the same path. Step 3 needs Node (`npm ci` in `src/apps/web` once).

The script is deterministic (no timestamps). `--check` reports stale outputs, and a test compares the committed files with a fresh run.

### Matching

Strategies are tried in order, and the first one that hits wins:

1. Exact normalized name
2. Name without its parentheses
3. Text inside the parentheses
4. Site name contained in the guide heading
5. Site name's words all appear in the guide heading
6. Parser alias

Normalizing handles curly versus straight apostrophes, `'s`, `*` and dates like `(07/29/2026)`. Ties go to the candidate in the same category. Strategies 4–6 count as low-confidence. Fuzzy scores are only recorded as suggestions for unmatched conditions, never applied, because they made mistakes (for example, Blepharitis → Pupils).

AME Guide site conditions claim parsed conditions first. A OneGuide condition whose parsed match is already claimed is a duplicate and stays as-is.

### Final counts

| | Count |
|---|---|
| Site conditions before | 175 |
| Parsed conditions | 185 |
| **Matched and updated** | **149**: all 144 AME Guide conditions + 5 OneGuide-only (Seizure, TGA, Tremor, Brain Abscess, ALS) |
| …of which low-confidence | 4 |
| **Added** (parsed-only) | **36** |
| **Site-only** (no parsed match, kept) | **5** |
| **OneGuide duplicates** (left as-is) | **21** |
| Site conditions after | **211** |

The site-side counts add up: 149 + 5 + 21 = 175.

**Low-confidence matches (accepted):**
1. Acute or Chronic Disease (Ears) → `inner-ear`
2. Cerebrovascular Accident (CVA) or TIA → `stroke`
3. "Hypertrophic Cardiomyopathy (HCM)," (truncated site name) → full HCM/HOCM heading
4. ALS (OneGuide) → `amyotrophic-lateral-sclerosis-als-aka-lou-gehrigs-disease`

**Site-only (all OneGuide; kept):**
- AVM of the nervous system
- Brain Tumor or Brain Cancer
- Head Injury or Brain Injury (Concussion, Closed)
- Head Injury or Remote Brain Injury
- Multiple Sclerosis; Neuromyelitis Optica Spectrum

Most of these are versions of AME Guide conditions whose names are too different to match safely.

**Added conditions (36):**
- **Common:** Hypertension, Asthma, CKD, Arthritis, Syncope, Headache or Migraine, Hypothyroidism
- **Cancers:** Breast, Colon, Prostate, Renal, Testicular, CLL/SLL, Leukemia, Neoplastic Disorders
- **Other:** BPPV, Motion Sickness, Ophthalmoscopic, Ocular Motility, Mitral Valve Repair, Eosinophilic Esophagitis, Psoriasis, Low T, Kidney Stones, Prostate Conditions, Nephritis, Carotid/Vertebral Artery Disease, Thrombocytopenia, COVID-19, Prediabetes, Adrenal Insufficiency, PCOS, Primary Hemochromatosis, Weight Loss Management, Substances of Dependence/Abuse, Drug Use

The category and the rule used for each one are in the report.

**Category overrides:**

| Condition | Category | Why |
|---|---|---|
| Headache or Migraine | Neurology | The name pattern "ocular" would say Eyes |
| Thrombocytopenia, Primary Hemochromatosis | Blood and Lymphatics | "General Systemic" would say Endocrine |
| Breast Cancer, COVID-19 | Other | No better fit |

### Row handling (all listed in the report)

- **10 rows split by a page break were merged back into the row above.** This applies to a row with no letter whose condition cell is empty or starts lowercase, or that continues a lettered row on the next page without its own disposition.
- **3 exact duplicate rows were skipped** (2 in Neuropathy, 1 in Psychiatric Conditions).
- **Header-only rows** are skipped. The Neoplasms "Also see: …" row is kept as a "see also" pointer.
- **Adapter filters:** parsed rows are turned into pathways directly, so `dedupeNormalizedRecords`, `isDisplayableConditionName` and `isDisplayableScenario` can't drop them. The old filters would have silently dropped 5 real rows, which are now kept:
  - CKD "eGFR 45 to 59"
  - CKD "eGFR 35 to 44"
  - CKD "eGFR 34 or less…"
  - Liver Transplant "Donor"
  - Diabetes Insipidus "Row C"

### What changed on the site

From `site_update_report.md`: 60 of the 149 updated conditions have row-level changes. There are 30 row-result changes, 4 overall-result changes, 26 pathways added and 71 removed. Most of the removed ones are old-parser duplicates and fragments, but they haven't all been checked by hand.

1. **Corrections of wrong data:** misfiled or missing rows (Pectus Excavatum, Mastoids, Eyes – Procedures, Bell's Palsy, Pituitary Adenoma B, and the 5 recovered conditions).
2. **Outcome now known (9 rows), previously "unknown".** Examples: Polio and Retinal Dystrophies (overall), Skin Cancer unknown pathology, Seizure (febrile, age 5 or younger), Tremor.
3. **Deferral → issue (about 20 rows), caused by the first-decision rule.** These aren't necessarily errors in the old data. Example, Bradycardia: *"If no evidence of structural, functional or coronary heart disease – Issue. Otherwise – Requires FAA Decision."* The old site showed the worse outcome; the new site shows the first one. The full wording, including the "otherwise" part, is shown on the row.
4. **Worse than before (3 rows; still open):**
   - Anxiety, Depression – "Up to TWO listed conditions…": issue → unknown (the disposition cell holds the wrong text)
   - Guillain-Barré – "Single episode": issue → unknown (empty disposition cell)
   - Neurofibromatosis – "Neurofibromatosis": deferral → unknown (empty disposition cell)

## 6. Site code changes

| File | Change |
|---|---|
| `src/packages/content/parsedConditions.ts` (new) | `applyParsedConditions()`: replaces content fields of matched conditions (keeping id, name, category and related medications) and appends added conditions |
| `src/packages/content/types.ts` | Optional fields: `SubCondition.label`, `SubCondition.dispositionText`, `Condition.caciWorksheets`, `notesHtml`, `faaSource`, `aliases`; types `CaciWorksheet`, `FaaSource`, `ParsedConditionsFile` |
| `src/packages/content/adapt.ts` | Exported existing helpers (`pickPrimaryDisposition`, `isDisplayable*`, `firstSentence`); extracted `conditionSummary()` and `CONDITION_CERTIFICATION_NOTE`. Behavior unchanged. |
| `src/packages/content/index.ts` | New exports |
| `src/apps/web/src/data/conditions.ts` | `applyNihConditionMap(applyParsedConditions(adaptGuidanceFiles(…), parsed), nihMap)`. NIH is applied last because it's keyed by id. |
| `src/apps/web/src/pages/ConditionDetail.tsx` | CACI worksheet box, collapsible "Notes from the guide", FAA Guide source link with pages |
| `src/apps/web/src/index.css` | Scoped `.guide-notes` styles (Tailwind's reset removes list bullets and table borders) |
| `src/apps/web/scripts/build-parsed-conditions.ts`, `scripts/lib/parsedConditionsBuild.ts` (new) | Merge script: matching, rows → pathways, notes HTML sanitizer, map, report |
| `ParsePDFChuckes/1_parser/run_all.sh` | Step 3: publish to `2_website_data/` and run the merge |
| `.gitignore` | `/ParsePDFChuckes/2_website_data/conditions.json` (3 MB combined file, never committed) and `/.venv/` |

Not touched: the medications data and the normalized guidance JSON. NIH data and form links are unchanged.

**Notes HTML allowlist:** `p br ul ol li strong b em i u sup sub table thead tbody tr th td h4`. Cells keep only `colspan`/`rowspan`. Links are kept only for absolute `http(s)` addresses and open in a new tab. Internal links from the parser's preview site are unwrapped. Script and style blocks are removed.

**NIH note:** the condition page has never displayed NIH links. NIH data is used for search synonyms and for the search page's live NIH panel. The tests check that matched conditions keep their NIH identity; for example, Epilepsy is still `mapped` with its MedlinePlus link.

## 7. Tests

| Suite | Result |
|---|---|
| `npm test` (src/apps/web) | **55 passed** (7 files) |
| `tsc --noEmit` | clean |
| `pytest` (repo root, `.venv`) | **57 passed, 6 skipped**. The skips are PDF integration tests that need the private PDFs in `Documentation/Resources/`. |

New tests:
- **`src/apps/web/src/parsed.conditions.test.ts`:**
  - committed data matches a fresh run
  - every parsed condition is on the site
  - every matched condition has exactly its parsed rows
  - id, name, category and NIH data are kept
  - OneGuide duplicates and site-only conditions are unchanged
  - the first-decision mapping
  - checklist items aren't re-split
  - the recovered conditions
  - new conditions appear in search and browse
  - the sanitizer
- **`tests/test_build_site_data.py`:** a regression case for each parser fix, shaped like the real tables (Blepharitis, Bell's Palsy, COPD, Middle Ear, Pituitary Adenoma, `- A.` labels).

Changed test:
- **`freq.conditions.test.ts`:** the frequent-conditions count went from **13 to 14**, because "Hypertension (HTN)" is now a site condition and matches "hypertension" in `freq_conditions.json`.

## 8. Local setup done (not part of the repo)

- `npm ci` in `src/apps/web`
- `.venv/` with `pip install -e ".[dev]"`, to run pytest
- Playwright Chromium, installed for the page check
- Dev server: `npm run dev` in `src/apps/web` → http://127.0.0.1:5173/

## Open items

1. **Fix the 3 rows that got worse** (Anxiety "Up to TWO…", Guillain-Barré "Single episode", Neurofibromatosis) by tracing their disposition cells in the parser output.
2. **Browser check:** Barrett's Esophagus (updated), Epilepsy (updated, NIH data present), Hypertension (new) and Liver Transplant (CACI worksheet). This was stopped before it ran.
3. **Review** the 71 removed and 26 added pathways in `site_update_report.md`.
4. **Commit** on `issue-56-integrate-pdf-parser-website` referencing #56. Don't push.
5. **From the code review:** remove `ParsePDFChuckes/1_parser/ame_guide.pdf` and the `.DS_Store` files from git and add them to `.gitignore`. Consider fixing the weak "rows placed" and duplicate-id checks in `build_site_data.py`.
