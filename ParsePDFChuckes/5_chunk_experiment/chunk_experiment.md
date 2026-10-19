# Chunk size experiment

PDF: `ame_guide.pdf` (932 pages). Every strategy is validated page-by-page against the original PDF and compared section-by-section with the one-pass result (`whole`).

| Strategy | Mode | Chunks | Pages/chunk | Time (s) | Words missing | Words duplicated | Pages flagged | Tables | Disposition rows | Sections identical to one-pass | Sections with different tables | Boundary repairs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `whole` | virtual | 1 | 932.0 | 65.2 | 0.308% | 1.62% | 17 | 437 | 485 | 240/240 | 0 | – |
| `pages:10` | virtual | 94 | 9.9 | 54.3 | 0.308% | 1.625% | 17 | 438 | 485 | 237/240 | 3 | paragraph re-joined: 2, list re-joined: 3, table re-joined: 33 |
| `pages:25` | virtual | 38 | 24.5 | 42.2 | 0.308% | 1.546% | 17 | 438 | 486 | 238/240 | 2 | paragraph re-joined: 1, table re-joined: 11 |
| `pages:50` | virtual | 19 | 49.1 | 38.6 | 0.308% | 1.62% | 17 | 438 | 485 | 239/240 | 1 | paragraph re-joined: 1, table re-joined: 6 |
| `pages:100` | virtual | 10 | 93.2 | 36.3 | 0.308% | 1.62% | 17 | 438 | 485 | 239/240 | 1 | table re-joined: 3 |
| `sections:25` | virtual | 41 | 22.7 | 43.6 | 0.308% | 1.62% | 17 | 438 | 485 | 239/240 | 1 | table re-joined: 8 |
| `sections:50` | virtual | 21 | 44.4 | 40.0 | 0.308% | 1.62% | 17 | 438 | 485 | 239/240 | 1 | table re-joined: 4 |
| `files:pages:50` | files | 19 | 49.1 | 53.7 | 0.425% | 1.459% | 30 | 521 | 583 | 70/242 | 94 | paragraph re-joined: 1, table re-joined: 6 |

## Differences from the one-pass result

**pages:10**
- text: OVER-THE-COUNTER (OTC) MEDICATIONS REFERENCE GUIDE (word overlap 0.9908)
- text: ARCHIVES AND UPDATES (word overlap 0.9998)
- text: ARTERIOVENOUS MALFORMATION (AVM) – Neurological (Brain or Spinal Cord) (word overlap 0.9999)
- table: ARTERIOVENOUS MALFORMATION (AVM) – Neurological (Brain or Spinal Cord): rows [3, 1, 1, 1, 1, 1] vs [3, 1, 1, 1, 1, 1]
- table: OVER-THE-COUNTER (OTC) MEDICATIONS REFERENCE GUIDE: rows [3, 12] vs [3, 11, 1]
- table: ARCHIVES AND UPDATES: rows [1200, 21] vs [45, 21, 1156]

**pages:25**
- text: ITEM 29. Ears, General (word overlap 0.9757)
- text: ARCHIVES AND UPDATES (word overlap 0.9998)
- table: ITEM 29. Ears, General: rows [2, 3, 2, 3, 4, 2] vs [2, 3, 2, 3, 4, 1]
- table: ARCHIVES AND UPDATES: rows [1200, 21] vs [74, 21, 1127]

**pages:50**
- text: ARCHIVES AND UPDATES (word overlap 0.9998)
- table: ARCHIVES AND UPDATES: rows [1200, 21] vs [262, 21, 939]

**pages:100**
- text: ARCHIVES AND UPDATES (word overlap 0.9998)
- table: ARCHIVES AND UPDATES: rows [1200, 21] vs [262, 21, 939]

**sections:25**
- text: ARCHIVES AND UPDATES (word overlap 0.9998)
- table: ARCHIVES AND UPDATES: rows [1200, 21] vs [137, 21, 1064]

**sections:50**
- text: ARCHIVES AND UPDATES (word overlap 0.9998)
- table: ARCHIVES AND UPDATES: rows [1200, 21] vs [146, 21, 1054]

**files:pages:50**
- text: ITEM 61. Applicant's Name (word overlap 0.0)
- text: Introduction (word overlap 0.4667)
- text: ITEM 34. Ocular Motility (word overlap 0.5981)
- text: ITEM 33. Pupils (word overlap 0.654)
- text: ITEM 50. Distant Vision (word overlap 0.8418)
- table: Introduction: rows [0, 3, 14, 15] vs [16, 4, 15, 16]
- table: 3. Equipment Requirements: rows [2, 5] vs [9]
- table: 12. Medical Certificates – AME Completion: rows [25] vs [36, 2]
- table: 26. Subpoena for Medical Records or Testimony: AME Guidance: rows [1] vs [2]
- table: ITEMS 3-10. Identification: rows [] vs [4]
- table: ITEMS 21-22. Height and Weight: rows [2] vs [3]
- table: Condition Not Listed: rows [2, 6, 3, 3, 2] vs [2, 7, 4, 4, 2]
- table: ITEM 27. Sinuses: rows [2] vs [4]

