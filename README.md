# Pilots Guide to Medical Certification

**CS-4273 Capstone - Fall 2026 | Group F**

A searchable web platform that helps pilots understand FAA medical certification: conditions and sub-conditions, likely outcomes (issue, deferral, or denial), deferral paperwork and tests, and how medications affect flight status.

This project continues prior OU Capstone work (Fall 2025 / Spring 2026) and is designed for possible integration with the FAA Office of Communication. Content should stay accurate, easy to find, easy to understand, and encouraging.

---

## Problem

FAA medical guidance is dense and examiner-oriented. Newer pilots often cannot tell what a condition means for their certificate, what an Aviation Medical Examiner (AME) will need, or whether a medication will affect flight status. Applicants with medical histories — including mental health concerns — sometimes assume a piloting career is over before it starts.

Common pain points:

- Finding accurate information among conflicting sources
- Identifying a condition and its related sub-conditions
- Knowing whether guidance points to issue, deferral, or denial
- Understanding deferral paperwork and tests early enough that approval is not delayed
- Checking how medications affect flight status
- Decoding medical terminology in plain language

---

## Goals

- Build a pilot-facing web platform within an **FAA-acceptable framework**
- Make certification information **searchable** and easy to navigate
- Present conditions, outcomes, deferral requirements, and medication guidance clearly
- Ground content in official FAA sources (parsed from AME Guide / OneGuide PDFs) and mentor-approved material
- Emphasize: get healthy first, see personal physicians for concerns, then pursue the medical certificate

---

## What we are building

The core product is **data presentation and search**. Pilots look up what they need and leave with a clear answer — not a multi-step wizard with saved progress.

| Area | What pilots get |
| --- | --- |
| **Search** | Find conditions, sub-conditions, medications, and related guidance |
| **Outcomes** | See whether guidance maps to **issue**, **deferral**, or **denial** |
| **Deferral readiness** | List paperwork, tests, and docs tied to a deferral path |
| **Medications** | See how a medication can affect flight status / certification |
| **Content source** | Structured data parsed from official PDFs this semester (external DB possible later) |

### Key feature (Ticket 2)

**Condition disposition classification** — take AME Guide–style disposition text and label it `ISSUE`, `DEFER`, `DENY`, `SPECIAL ISSUANCE`, or `UNKNOWN`. That label is what the UI can show as a clear outcome after search.

Documented with unit tests in Python, JavaScript, and C++:

- [Ticket 2 artifact](Assignments/Ticket_2/src/Ticket2_Artifact.md)
- Tests: `AMEParserTest.py` / `.js` / `.cpp` — run with `python Assignments/Ticket_2/src/run_all_tests.py`

---

## Technologies

| Technology | Role |
| --- | --- |
| **Python** | PDF parsing, content pipeline, disposition logic, pytest, Capstone CLI |
| **React + Vite** | Product frontend (from Figma Make mockup) |
| **TypeScript** | Frontend and content adapter |
| **JSON** | Normalized guidance consumed by the UI |
| **Tailwind CSS** | Presentation styling |
| **Figma** | Design / mockup source |

FAA policy does **not** mandate a specific JavaScript framework. Capstone compatibility focuses on Section 508 / WCAG-oriented structure, deterministic source-backed content, and a static-hostable React build suitable for later Office of Communication review. This SPA is **not** an officially AOC-approved FAA site.

### How they fit together

```mermaid
flowchart LR
    subgraph design[Design]
        FIG["Figma"]
    end

    subgraph content[Content pipeline]
        PDF["AME Guide / OneGuide PDFs"]
        PY["ame_parser"]
        DATA["src/data/guidance"]
        ADAPTER["packages/content"]
    end

    subgraph app[Web application]
        WEB["apps/web Vite React"]
        SEARCH["Search"]
        DISP["Disposition labels"]
    end

    FIG --> WEB
    PDF --> PY --> DATA --> ADAPTER --> WEB
    WEB --> SEARCH
    SEARCH --> DISP
```

See [Step 1.a — Identify Technologies](Assignments/Ticket_2/src/Step1a_Identify_Technologies.md) and [Project Context and Requirements](Documentation/Resources/Project_Context_and_Requirements.md).

---

## Repository structure

```
Capstone-Fall2026/
├── README.md
├── pyproject.toml
├── Documentation/                 # proposals, resources, parser docs
├── Assignments/                   # Ticket deliverables (separate from product code)
├── tests/                         # Python pytest suite
├── schemas/                       # ame-parser JSON Schema
└── src/                           # all product code
    ├── apps/
    │   ├── web/                   # Vite + React product UI
    │   └── api/                   # Thin NIH Clinical Tables BFF
    ├── packages/
    │   ├── ame_parser/            # PDF extraction package
    │   └── content/               # normalized JSON → UI models
    ├── data/
    │   └── guidance/              # all *.normalized.json loaded by the app
    ├── legacy/
    │   ├── old/                   # prior-semester parser baseline
    │   └── web-next/              # archived Next.js boilerplate
    └── scripts/
        └── capstone.py            # sectional tests + dev server
```

---

## Getting started

### Capstone CLI (recommended)

Requires Python 3.10+ and Node.js 18+ (pnpm or npm).

```powershell
python -m pip install -e ".[dev]"
python src/scripts/capstone.py test
python src/scripts/capstone.py dev
```

`dev` starts the Vite app (default http://127.0.0.1:5173) and the NIH autocomplete BFF on http://127.0.0.1:8787 (Vite proxies `/api`). Use `--no-api` to skip the BFF. See [NIH Integration](Documentation/NIH_Integration.md).

### Testing

`python src/scripts/capstone.py test` is the single entry point, and CI runs the same command. Each section can also run on its own:

| Section | What it runs | Coverage gate |
|---------|--------------|---------------|
| `parser` | pytest over [`tests/`](tests/) (unit, harness, schema-contract, and PDF integration tests) | `fail_under = 85` in `pyproject.toml` |
| `web` | All Vitest unit + component tests (jsdom + Testing Library), then the production build | 90% lines / 75% branches in `vitest.config.ts` |
| `content` | Only the content-adapter tests (quick subset of `web`) | — |
| `e2e` | Playwright flows in [`src/apps/web/e2e/`](src/apps/web/e2e/) | — |

```powershell
python src/scripts/capstone.py test                    # parser + web, with coverage
python src/scripts/capstone.py test --e2e              # ...plus Playwright
python src/scripts/capstone.py test --section parser   # one section
python src/scripts/capstone.py test --no-coverage      # faster local loop
```

The HTML coverage reports go to `coverage/python/html/` and `src/apps/web/coverage/`. A run fails when coverage drops below a threshold.

Adding tests:

- **Parser:** add `tests/test_*.py`. Build fake `PageData` pages (see `tests/test_parser.py`) instead of reading PDFs. Save real-PDF checks for `tests/test_pdf_integration.py`.
- **Content / logic:** add `*.test.ts` next to the code. These run in Node.
- **Components / pages:** add `*.test.tsx` that starts with `// @vitest-environment jsdom`. Use Testing Library queries by role or text. Pick fixtures from the real `conditions` data rather than hard-coding ids that can change on a re-parse.
- **Schema:** `tests/test_schema.py` fails if `schemas/ame-parser-v1.schema.json` drifts from the code. Regenerate it with `python -m ame_parser --schema schemas/ame-parser-v1.schema.json`.

### Content pipeline

```powershell
python -m pip install -e ".[dev]"
python src/scripts/capstone.py parse --input ame_guide.pdf --pages 64-72
python -m pytest
```

Normalized JSON for the website lives in [`src/data/guidance/`](src/data/guidance/). PDF source artifacts remain under [`Documentation/Resources/`](Documentation/Resources/). See [AME Parser documentation](Documentation/AME_Parser.md).

### Web app (direct)

```powershell
cd src/apps/web
pnpm install   # or: npm install
pnpm dev
pnpm test            # or: pnpm test:coverage
pnpm test:e2e
pnpm build
```

### Ticket 2 unit tests

```powershell
cd Assignments/Ticket_2/src
python run_all_tests.py
```

---

## Progress plan

| Phase | Timeline | Deliverables |
| --- | --- | --- |
| **1. Domain & stack** | Weeks 1–2 | Ticket 1 domain work; technology selection; README; Ticket 2 unit tests |
| **2. Design** | Weeks 2–4 | Figma wireframes for search and result views; mentor feedback |
| **3. Content pipeline** | Weeks 2–5 | Extend PDF parsing; structure conditions, outcomes, deferral docs, medications |
| **4. Frontend prototype** | Weeks 4–8 | Vite React app with search, disposition labels, deferral and medication info |
| **5. Testing & refinement** | Weeks 8–10 | Broader unit tests; accessibility review; content accuracy checks |
| **6. Demo & handoff** | Weeks 11–15 | Presentation, user guide, report; prepare for FAA stakeholder review |

---

## Team

| Role | Name |
| --- | --- |
| Group ID | Group F |
| Team members | James Cunningham, Colby Frison (product owner), Shone George Kutty Renjan, Patrick Ha, Alan Vo (sprint master) |
| Mentor / Client | Micheal Coffman, Rebecca Mauldin, Jesus J Viramontes |

---

## References

- [FAA Medical Certification](https://www.faa.gov/pilots/medical_certification)
- [FAA Guide for Aviation Medical Examiners](https://www.faa.gov/ame_guide)
- [MedXPress](https://medxpress.faa.gov/)
- [AOPA — Preflight your medical](https://www.aopa.org/news-and-media/all-news/2025/december/pilot/flight-md-preflight-your-medical)
- [Project info](Documentation/Resources/Project%20info.md)
- [Capstone project proposal (prior PDF)](Documentation/Resources/Capstone%20project%20proposal.pdf)
- [Formal project proposal (Fall 2026)](Documentation/Resources/Project_Proposal.md)
- [Project context & requirements](Documentation/Resources/Project_Context_and_Requirements.md)
- [Ticket 2 artifact](Assignments/Ticket_2/src/Ticket2_Artifact.md)
- [AME Parser](Documentation/AME_Parser.md)
- [NIH Integration](Documentation/NIH_Integration.md)

---

## Disclaimer

Educational prototype for CS-4273 Capstone. **Not** an official FAA product and **not** AOC-approved FAA.gov content. Medical content must be verified against current FAA guidance and mentor-approved sources. The prototype does not collect real personally identifiable information (PII).
