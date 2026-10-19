# Website data – schema

Built from the FAA *Guide for Aviation Medical Examiners* (version 08/26/2026)
by `1_parser/build_site_data.py`. Everything is ordered the way the guide is
ordered (exam item 25 → 48, then substances), so lists can be rendered as-is.

```
2_website_data/
  index.json              light list of all 181 conditions (search box, menus)
  categories.json         21 body systems / exam items, each with its condition ids
  conditions.json         all conditions, full records (one file, ~3 MB)
  conditions/<id>.json    the same records, one file per condition (load on demand)
  reference.json          list of the other guide pages (medications, CACI, AASI, protocols, …)
  reference/<slug>.json   one file per reference page, as ordered blocks
  meta.json               guide version, generation date, counts, validation summary
  validation_report.md    what was checked + rows to review by hand
  types.ts                TypeScript types for all of the above
  example_usage.ts        loading a condition from ?condition=<id>
```

## Condition id = the `?condition=` value

The id is the slug of the condition heading in the guide:

| Heading in the guide | id |
|---|---|
| ABDOMEN AND VISCERA AND ANUS CONDITIONS | `abdomen-and-viscera-and-anus-conditions` |
| BARRETT'S ESOPHAGUS | `barretts-esophagus` |
| CHRONIC KIDNEY DISEASE (CKD) | `chronic-kidney-disease-ckd` |
| BRAIN BLEED (Intracranial Hemorrhage, …) | `brain-bleed` (the parenthetical becomes `subtitle`) |

So `https://<site>/?condition=barretts-esophagus` → `conditions/barretts-esophagus.json`.

## `conditions/<id>.json`

| Field | Type | Meaning |
|---|---|---|
| `id` | string | URL id (see above) |
| `name` | string | Display name, e.g. "Barrett's Esophagus" |
| `subtitle` | string \| null | Second line of the heading, e.g. "(Intracranial Hemorrhage, Cerebral Hemorrhage, …)" |
| `name_in_guide` | string | Heading exactly as printed in the PDF |
| `category` | `{id, name, exam_item, part}` | Body system, e.g. `{id:"abdomen-and-viscera", name:"Abdomen and Viscera", exam_item:"38"}` |
| `applies_to` | string | Usually "All Classes" |
| `updated` | string \| null | "(Updated mm/dd/yyyy)" date of this table in the guide |
| `order` | number | Position in the guide (1 = first) |
| `decisions` | Decision[] | All outcomes that appear in the rows, in order of first appearance |
| `what_to_bring` | string[] | Union of the rows' checklists (de-duplicated) – the "what to bring to your exam" list |
| `rows` | Row[] | The disposition table, one entry per row (A, B, C …) |
| `caci_worksheets` | Worksheet[] | CACI worksheet(s) for this condition, if any |
| `status_summaries` | string[] | Names of status-summary forms mentioned (e.g. "Low Testosterone (Low T) Hypogonadism Status Summary") |
| `notes_html` | string | Notes, footnotes and extra tables printed under the condition (HTML) |
| `links` | `{text, href}[]` | Links found in the condition (FAA worksheets, protocols, …) |
| `aliases` | string[] | For group tables (e.g. *Abdomen and Viscera and Anus Conditions*): the sub-conditions named in each row – useful for search |
| `source` | `{section, section_title, pdf_pages, faa_url}` | Where it came from in the PDF |

### Row

| Field | Type | Meaning |
|---|---|---|
| `label` | "A" \| "B" \| … \| null | Row letter (null in group tables, where each row is its own sub-condition) |
| `condition` / `condition_html` | string | Left column ("Disease/Condition") |
| `evaluation_data` / `evaluation_data_html` | string | Middle column ("Evaluation Data") |
| `what_to_bring` | string[] | Middle column turned into a checklist (numbered items / bullets). Empty when the row needs nothing extra (typically ISSUE rows) |
| `decisions` | Decision[] | Outcomes found in the right column |
| `disposition` / `disposition_html` | string | Right column ("Disposition") |
| `disposition_shared_with_previous_row` | boolean | true when the PDF uses one merged disposition cell for several rows; the value was copied from the row above |
| `pdf_page` | number | Page in the PDF |

### Decision values

| Value | Shown in the guide as | Suggested label for pilots |
|---|---|---|
| `issue` | ISSUE | The examiner can issue at the exam |
| `caci` | Follow the CACI worksheet | Can issue at the exam if the CACI worksheet criteria are met |
| `defer` | DEFER | Examiner sends it to the FAA – bring the documents |
| `faa_decision` | Requires FAA Decision | FAA decides |
| `special_issuance` | Special Issuance | FAA Special Issuance needed |
| `aasi` | AASI | AME Assisted Special Issuance (renewals) |
| `deny` | DENY | Disqualifying |
| `more_info_needed` | MORE INFO NEEDED | More information needed |
| `see_reference` | "See …" | Look at the referenced table/protocol (see `links`) |

### Worksheet (`caci_worksheets[]`)

| Field | Meaning |
|---|---|
| `title` | e.g. "CACI – Chronic Kidney Disease (CKD) Worksheet" |
| `updated` | date |
| `criteria[]` | `{ame_must_review, acceptable_certification_criteria}` – rows of the worksheet |
| `block_60_options[]` | the three "AME MUST NOTE in Block 60" options |

## `index.json`

`{id, name, category, category_name, decisions, has_caci, aliases, rows, updated}` for
every condition – small enough to load on the home page for search/autocomplete.

## `categories.json`

`{id, name, exam_item, part, order, intro_html, conditions: [ids]}` – `intro_html`
holds the category's introduction (CFR text, exam techniques) where the guide
has one at the top of the category.

## `reference/<slug>.json`

`{slug, title, group, intro_of_condition_section, pdf_pages, blocks[]}` where each block is
`{type: "heading"|"paragraph"|"list"|"figure"|"html"|"table", page, text, html}`
(tables also have `header` and `rows` as plain text). These are the parts of the
guide that are not condition tables: General Information, the application items,
office testing, medications, CACI and AASI lists, disease protocols, HIMS, glossary.

## Keeping it current

The FAA updates the guide on the last Wednesday of most months. Re-run
`1_parser/run_all.sh new_guide.pdf` – ids stay the same as long as the FAA keeps
the headings, so existing URLs keep working. Check `validation_report.md` after
each run.
