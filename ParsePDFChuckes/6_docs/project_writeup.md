# Re-implement parser using smaller PDF chunks
**Shone George Kutty Renjan**

**Risk Management:** Smaller chunks can cut tables and paragraphs at chunk
boundaries, so content may be split, wrongly combined, or duplicated. Each
chunk size was validated page-by-page against the original FAA PDF and compared
section-by-section with a one-pass parse. Chunks of 10, 25, 50 and 100 pages,
section-aligned chunks, and physically split PDF files were tested.

**Challenges:** Re-joining tables, lists and paragraphs cut at chunk boundaries,
and assembling all chunks into one JSON structure without gaps or duplicates.
Physically splitting the PDF removed its structure tags and bookmarks, which
made results much worse (70 of 240 sections correct vs 239 of 240), so chunks
were read as page ranges of the original file instead.

**Lesson Learned:** Smaller chunks made errors easier to isolate, but more
boundaries also created more errors: 10-page chunks needed 38 boundary repairs
and still left a table split, while 50-page section-aligned chunks needed only
4. Where chunks end matters more than how big they are. Testing the extracted
data against the original PDF was essential: it caught chunking errors and also
exposed two bugs in the original one-pass parser.

---

## Results (from `5_chunk_experiment/chunk_experiment.md`)

| Chunks | Chunks made | Time | Sections identical to one-pass | Sections with different tables | Boundary repairs |
|---|---|---|---|---|---|
| one pass | 1 | 65 s | 240/240 | 0 | – |
| 10 pages | 94 | 54 s | 237/240 | 3 | 38 |
| 25 pages | 38 | 42 s | 238/240 | 2 | 12 |
| 50 pages | 19 | 39 s | 239/240 | 1 | 7 |
| 100 pages | 10 | 36 s | 239/240 | 1 | 3 |
| sections ≤ 25 pages | 41 | 44 s | 239/240 | 1 | 8 |
| **sections ≤ 50 pages** | 21 | 40 s | 239/240 | 1 | 4 |
| real chunk PDF files (50) | 19 | 54 s | 70/240 | 94 | 7 |

Words missing compared with the PDF were the same (0.31%) for every virtual
chunk size – chunking changed structure, not text coverage.

## Follow-up: organising the output for the website

The merged JSON was reorganised by condition to match the site's
`?condition=<id>` URLs: 181 conditions in 21 body-system categories, each with
its disposition rows, a "what to bring" checklist, decisions (Issue / Defer /
CACI / …), CACI worksheets and source pages. All 497 disposition rows in the
guide were placed in exactly one condition (checked automatically).
