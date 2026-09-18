# AME Parser Baseline Comparison

This report compares the unchanged `src/legacy/old/AMEParser.py` with the production
package on the human-reviewed ranges used by the automated tests.

## AME Guide PDF pages 64–72

- Legacy: 37 emitted rows across 8 condition groups; 28 rows had `UNKNOWN`
  disposition.
- Production: 19 normalized records; 0 unknown dispositions.
- The larger legacy count is not greater coverage. It includes PDF layout
  fragments interpreted as independent rules.
- The legacy parser reads only the first three cells. On four-column page 64,
  it treats `EVALUATION DATA` as disposition and drops the real disposition.
- The production parser maps columns by header role and separates the stacked
  first/second-class and third-class pathways on page 64.
- It also retains page 69's headerless palate row under the active sinus
  condition and preserves relational time wording such as `less than 5 years`.
- The reviewed `Requires FAA Decision` mapping is exposed as a warning.

## OneGuide Neurology PDF pages 5–14

- Legacy: 0 conditions and 0 records.
- Production: 3 pilot certification records: the ALS pathway and two AVM
  pathways; 0 unknown dispositions.
- The legacy parser requires `disease` and `disposition` in the first table
  row. OneGuide uses a two-level, seven-column workflow header and calls the
  pilot disposition column `AME Actions`.
- The production strategy reads only the initial pilot scenario, evaluation,
  and AME-action columns. Internal AAM, VHT, ATCS, and DOC actions are not
  presented as pilot guidance.

## Verification basis

The metrics above are reproducible through `tests/test_pdf_integration.py`.
Golden expectations in `tests/fixtures/golden_records.json` were transcribed
from the source pages and assert condition, scenario, certificate class where
applicable, disposition, requirement wording, and source page.

Counts alone are not acceptance criteria. Correct R1 disposition, R2
appointment requirements, preserved raw wording, and source traceability are
the acceptance checks.
