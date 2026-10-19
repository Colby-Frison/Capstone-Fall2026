# Chunked parser – FAA Guide for Aviation Medical Examiners

Re-implementation of the AME Guide parser that splits the 932-page PDF into
smaller chunks, parses each chunk independently (in parallel), merges the
results into one JSON structure, and validates the result against the original
FAA PDF.

## Files

| File | Purpose |
|---|---|
| `../1_parser/chunked_parser.py` | Chunk planning, parallel parsing, merging, validation, chunk-size experiment |
| `../1_parser/extract_ame_guide.py` | Parsing engine (also runs on its own as the one-pass parser) |
| `chunk_experiment.md` | Results of the chunk-size comparison on the 08/26/2026 guide |
| `chunk_experiment.csv` | Same, as a spreadsheet |
| `../3_full_extraction/` | Output of one run with the recommended setting: `sections.json`, CSVs, `site/`, per-chunk JSON + `chunk_report.csv`, `validation.json` |

## Run

```bash
pip install pdfplumber pypdf
python chunked_parser.py ame_guide.pdf out/                         # recommended: sections:50
python chunked_parser.py ame_guide.pdf out/ --chunks pages:25       # fixed-size chunks
python chunked_parser.py ame_guide.pdf out/ --mode files            # real chunk PDF files
python chunked_parser.py ame_guide.pdf exp/ --experiment            # compare chunk sizes
```

`--workers N` sets how many chunks are parsed at the same time (default: up to 4).

## Pipeline

1. **Plan chunks.** `pages:N` cuts every N pages. `sections:N` makes chunks of at
   most N pages but only cuts before a page where a new section (bookmark) starts
   at the top, so a topic is never split across chunks unless one section is
   longer than N pages.
2. **Parse each chunk independently.** A worker only reads its own pages, so
   anything that runs past the chunk edge comes out cut, exactly as with
   separate files.
   - `--mode virtual` (default): the chunk is a page range of the original PDF.
     The PDF's structure tags (headings, lists, tables) stay available.
   - `--mode files`: the chunk is written to its own PDF with pypdf and parsed
     alone. **Splitting a PDF this way drops its structure tags and bookmarks**,
     so every page has to be rebuilt from layout.
3. **Merge.** Chunks are joined in page order and the boundaries are repaired:
   paragraphs and lists cut at a boundary are re-joined; tables cut at a
   boundary are re-joined with the repeated header row dropped and a row split
   by the page break merged; a block emitted twice is dropped.
4. **Assemble** into sections (`sections.json`, CSVs, static site), same format
   as the one-pass parser.
5. **Validate.** Every page of the original PDF is read independently with
   `pdftotext` and its words are checked against the sections covering that
   page (missing words, duplicated words, flagged pages). `chunks/chunk_report.csv`
   lists the flagged pages per chunk, so a problem can be traced to one chunk.

## Results

Measured on the 08/26/2026 guide (932 pages) with `--experiment`
(full table: `chunk_experiment.md`). "One-pass" = the whole PDF parsed
in one chunk.

| Chunks | Chunks made | Time | Words missing* | Pages flagged* | Sections identical to one-pass | Sections with different tables |
|---|---|---|---|---|---|---|
| one pass (`whole`) | 1 | 65 s | 0.31% | 17 | 240/240 | 0 |
| `pages:10` | 94 | 54 s | 0.31% | 17 | 237/240 | 3 |
| `pages:25` | 38 | 42 s | 0.31% | 17 | 238/240 | 2 |
| `pages:50` | 19 | 39 s | 0.31% | 17 | 239/240 | 1 |
| `pages:100` | 10 | 36 s | 0.31% | 17 | 239/240 | 1 |
| `sections:25` | 41 | 44 s | 0.31% | 17 | 239/240 | 1 |
| **`sections:50`** (recommended) | 21 | 40 s | 0.31% | 17 | 239/240 | 1 |
| `files:pages:50` (real chunk PDFs) | 19 | 54 s | 0.43% | 30 | 70/240 | 94 |

\* The 0.31% / 17 pages are the same for every virtual run and come from the
check itself, not from lost content: removed "o" sub-bullet glyphs, hyphenation
("attention-deficit"), and list text read in a different order by `pdftotext`.
Spot checks found the flagged text present in the output.

What the numbers show

- **Chunking did not lose text** in virtual mode: every chunk size has the same
  missing-word figure as the one-pass parse. The differences are structural –
  how pieces cut at a boundary are put back together.
- **Smaller chunks = more boundaries = more repair work and more mistakes.**
  10-page chunks needed 38 boundary repairs and still left 3 sections with
  wrong tables (e.g. the OTC reference table stayed split in two); with
  25-page chunks a row in the Ears table was merged into the row above.
  50-page, 100-page and section-aligned chunks needed 3–7 repairs and left
  only one difference.
- **The one remaining difference** (Archives & Updates) is 21 untagged changelog
  rows on p.770: chunked runs place them in page order inside the changelog,
  the one-pass run places them after it.
- **Chunk size mostly changes speed**, not accuracy, because the parser is
  deterministic: parallel chunks were ~40% faster on 2 CPU cores.
- **Physically splitting the PDF is much worse**: pypdf drops the structure
  tags and bookmarks, so everything is rebuilt from layout – 30 pages flagged
  and only 70 of 240 sections identical.
- **Comparing chunked vs one-pass output found bugs in the one-pass parser
  too**: the tag order of table rows does not always follow the page order
  (a row was out of order in *Situational Depression*), and a list in the
  diabetes protocol had been placed 250 pages early, in the neurology section,
  because it was also tagged with an image on p.339. Both are fixed in this
  version.

Recommendation: `sections:50` – chunks of at most 50 pages that end at section
boundaries, parsed from the original PDF (virtual mode), followed by the
page-by-page validation.
