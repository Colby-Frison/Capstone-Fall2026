# AME Guide → Pilots Guide to Medical Certification

Everything built from the FAA *Guide for Aviation Medical Examiners* PDF
(932 pages, version 08/26/2026) for the capstone website
(`?condition=<id>` pages).

## Folders

| Folder | What it is | Use it for |
|---|---|---|
| `1_parser/` | The code: `chunked_parser.py` (chunked PDF parser + validation), `extract_ame_guide.py` (parsing engine), `build_site_data.py` (organises output by condition), `run_all.sh` / `run_all.bat` (Windows) | Re-running on each monthly FAA update |
| `2_website_data/` | **The data for the website**, organised by condition: `index.json`, `categories.json`, `conditions/<id>.json`, `reference/*.json`, `meta.json`, plus `SCHEMA.md`, `types.ts`, `example_usage.ts` | Copy into your app (e.g. `public/data/`) |
| `3_full_extraction/` | The complete parse in guide order: `sections.json` (240 sections with ordered blocks + tables), `sections.csv`, `tables.csv`, `disposition_tables.csv`, `validation.json`, per-chunk outputs | Reference / debugging / CMS import |
| `4_preview_site/` | Static HTML version of the whole guide (open `index.html`) | Checking the extraction visually |
| `5_chunk_experiment/` | Chunk-size comparison (results + method) | Project report |
| `6_docs/` | `content_checklist.md` (what to include on the site), `project_writeup.md` (risk / challenges / lessons, with results) | Planning + report |

**To run it and demo it, see `DEMO.md`.**

## Quick start (website)

1. Copy `2_website_data/` to your app's public folder, e.g. `public/data/`.
2. Home page / search: load `data/index.json` (181 conditions, with aliases for search) and `data/categories.json` (21 body systems in exam order).
3. Condition page: `?condition=abdomen-and-viscera-and-anus-conditions` → load `data/conditions/abdomen-and-viscera-and-anus-conditions.json`.
   Show `name`, `decisions`, the **`what_to_bring`** checklist, and the `rows` table (Condition / Evaluation Data / Disposition).
4. Types and a loader are in `types.ts` / `example_usage.ts`; every field is described in `SCHEMA.md`.

## Re-run on a new guide

```bash
pip install -r 1_parser/requirements.txt          # pdfplumber, pypdf (+ pdftotext optional, for validation)
./1_parser/run_all.sh new_ame_guide.pdf output/
# -> output/website_data   (check validation_report.md)
# -> output/full_extraction
```

About 1 minute on a laptop. Condition ids stay the same as long as the FAA keeps
the headings, so existing URLs keep working.

## Quality checks

- Every page of the PDF is checked against the output (word coverage, page by page): 0.31% of words differ, all explained by removed bullet glyphs, hyphenation and reading order – no missing passages found in spot checks.
- All **497** disposition rows in the guide are placed in exactly one condition.
- 14 rows have a free-text disposition with no Issue/Defer/CACI keyword – listed in `2_website_data/validation_report.md` for a manual look.
- The FAA copy is authoritative: every condition carries its PDF pages and a link to the official guide (`source`). Keep that link on the site.

## Can't-see-your-site note

The live site couldn't be opened from the build environment, so the structure
follows the URL scheme (`?condition=<slug of the condition heading>`) and the
site's description ("look up a known medical condition … and see what to bring
to your medical exam"). If your app expects different field names, the mapping
is one function in `build_site_data.py` (`main`) or a small adapter on the
front end.
