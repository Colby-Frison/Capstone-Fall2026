# AME Parser

The production parser is in `src/ame_parser/`. The prior-semester
implementation remains unchanged in `src/old/` for characterization tests.

## Purpose and safety boundary

The parser converts FAA AME Guide and OneGuide PDF tables into deterministic,
source-traceable JSON for the pilot-facing search application. It does not make
medical decisions. Each record retains the raw disposition and source wording.
Unrecognized wording becomes `UNKNOWN`; it is not guessed.

`Requires FAA Decision` is the only reviewed non-literal mapping. It maps to
`DEFER` and carries the warning `requires_faa_decision_mapped_to_defer` so the
transformation remains visible.

## Install and run

```powershell
python -m pip install -e ".[dev]"
python -m ame_parser Documentation/Resources/ame_guide.pdf --pages 64-72 `
  --output ame-pages-64-72.json --diagnostic
```

For OneGuide:

```powershell
python -m ame_parser Documentation/Resources/OneGuide_Neurology.pdf --pages 5-14 `
  --output neurology-pages-5-14.json --diagnostic
```

Use `--strict` in validation jobs where any parser warning must fail the run.
Generate the machine-readable contract with:

```powershell
python -m ame_parser --schema schemas/ame-parser-v1.schema.json
```

Exit codes are `0` for success, `2` for invalid input, `3` for an unsupported
document, and `4` for strict validation failure.

## Architecture

The parser uses a staged pipeline:

1. `PdfPlumberReader` adapts PDF pages to framework-independent `PageData`.
2. `AmeParser` selects an extractor from deterministic content signatures.
3. `AmeGuideExtractor` and `OneGuideExtractor` map their distinct table
   layouts to common typed models.
4. Shared text functions normalize whitespace, reconstruct list items, and
   classify only reviewed disposition wording.
5. Contract validation and stable JSON serialization complete the pipeline.

The extractor registry is a Strategy pattern. The PDF reader is an injected
port/adapter, allowing tests to exercise extraction without loading PDFs.
Adding a format means implementing the `Extractor` protocol and registering
the strategy; shared models and serialization do not change.

## Normalized contract

The top-level object identifies `schema_version`, parser version, source
document, processed-page count, warnings, summary counts, and records.
Each record contains:

- condition, optional category/sub-condition, scenario, and certificate classes;
- time constraints with relational wording preserved, such as
  `less than 5 years` and `no more than 90 days`;
- normalized and raw disposition;
- typed requirements (`DOCUMENT`, `TEST`, `MEDICATION`, `EVALUATION`, `OTHER`);
- medication notes and action text;
- raw source text;
- PDF/printed page and section reference;
- record-specific warnings.

Stable ordering and sorted JSON keys make repeated runs byte-for-byte
comparable.

## Tests

```powershell
python -m pytest
python -m pytest --cov=ame_parser --cov-report=term-missing
```

The suite includes pure unit tests, schema/invariant tests, table-adapter
fixtures, malformed/encrypted input tests, deterministic serialization,
human-reviewed golden records, real-PDF integration tests, and legacy
characterization tests.

## Known limitations

- The production strategies currently target AME Guide disposition tables and
  OneGuide initial pilot certification columns. Internal AAM, VHT, ATCS, and
  DOC workflow columns are intentionally excluded from pilot-facing records.
- Image-only/scanned PDFs require OCR before parsing.
- Requirement typing is keyword-based; raw evaluation wording is retained so
  a reviewer can correct or extend classification rules safely.
- Headerless AME rows can be parsed when they retain the active table's column
  geometry; unrelated narrow tables are ignored.
- Starting a page range in the middle of a multi-page condition can omit the
  heading or earlier requirement text. Include the condition's title page.
- FAA layout or wording changes can produce warnings or golden-test failures
  and require a reviewed extractor update.
