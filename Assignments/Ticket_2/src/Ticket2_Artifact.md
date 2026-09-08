# Ticket 2 Artifact — Key Feature & Unit Tests

**CS-4273 Capstone | Fall 2026 | Group F**  
**Project:** Pilots Guide to Medical Certification

This artifact covers Ticket 2 parts **c** (key feature + documentation) and **d** (unit tests in three languages). The project README is the primary documentation deliverable; this file explains the identified feature and how the tests map to it.

---

## Identifying information

| Field | Value |
| --- | --- |
| Course | CS-4273 Capstone — Fall 2026 |
| Ticket | Ticket 2 — Technologies, Documentation, and Unit Tests |
| Group ID | Group F |
| Team members | James Cunningham, Colby Frison, Shone George Kutty Renjan, Patrick Ha, Alan Vo |
| Related README | [`README.md`](../../../README.md) |
| Technology write-up | [`Step1a_Identify_Technologies.md`](Step1a_Identify_Technologies.md) |

---

## Key feature: Condition disposition classification

### What it is

When a pilot looks up a medical condition, the AME Guide often describes the examiner’s next step in dense wording (“AME may issue,” “Defer to FAA,” “Deny the certificate”). Our key feature takes that guidance text and classifies it into a short outcome label:

| Label | Meaning for the pilot |
| --- | --- |
| `ISSUE` | Certificate can typically be issued (when criteria are met) |
| `DEFER` | Case goes to the FAA; expect extra paperwork / tests |
| `DENY` | Certificate is denied under the stated guidance |
| `SPECIAL ISSUANCE` | Special Issuance path is indicated |
| `UNKNOWN` | No clear disposition keyword found |

This is not medical advice and does not predict what an AME will decide for a specific person. It labels **what the published guidance text says** so the search UI can show a clear outcome badge and, later, attach deferral paperwork or medication notes.

### Why this feature

- It sits at the center of the product: search finds a condition; disposition tells the pilot what the guidance implies next.
- The logic is small, deterministic, and easy to test the same way in multiple languages.
- Priority rules matter (e.g. `"Defer, do not issue"` must be `DEFER`, not `ISSUE`), so unit tests protect against regressions.

### How it fits the larger system

```text
PDF (AME Guide / OneGuide)
        │
        ▼
Python parser → structured condition data
        │
        ▼
Search UI → condition / sub-condition
        │
        ▼
get_decision() / getDecision()  ←── this feature (Ticket 2)
        │
        ▼
Pilot-facing label: Issue / Deferral / Denial (+ follow-on docs later)
```

---

## Technologies used for Ticket 2

| Language | Role in this artifact | Test runner |
| --- | --- | --- |
| **Python** | Content pipeline language; disposition helper + tests | `pytest` |
| **JavaScript** | Frontend language; same helper + tests | `node --test` |
| **C++** | Third language for Ticket 2 requirement; GTest suite | CMake + GoogleTest |

Broader stack (Next.js, Figma, JSON content, etc.) is documented in the [README](../../../README.md) and [Step 1.a](Step1a_Identify_Technologies.md).

---

## Unit tests (one feature, three languages)

Each language implements the same `get_decision` / `getDecision` behavior and runs the same disposition cases.

### Files

| File | Language |
| --- | --- |
| [`AMEParserTest.py`](AMEParserTest.py) | Python |
| [`AMEParserTest.js`](AMEParserTest.js) | JavaScript |
| [`AMEParserTest.cpp`](AMEParserTest.cpp) | C++ |
| [`CMakeLists.txt`](CMakeLists.txt) | C++ build (fetches GoogleTest) |
| [`run_all_tests.py`](run_all_tests.py) | Runs all three suites |

### Shared test cases

| Test | Input | Expected |
| --- | --- | --- |
| IssueTest | `"AME may issue"` | `ISSUE` |
| DeferTest | `"Defer to FAA"` | `DEFER` |
| DenyTest | `"Deny the certificate"` | `DENY` |
| SpecialIssuanceTest | `"Special Issuance required"` | `SPECIAL ISSUANCE` |
| DeferTakesPriorityOverIssueTest | `"Defer, do not issue"` | `DEFER` |
| UnknownDecisionTest | `"No matching keyword"` | `UNKNOWN` |
| NoneDecisionTest | `null` / empty | `UNKNOWN` |
| CaseInsensitiveTest | `"defer"` | `DEFER` |
| IssueInActionTextTest | `"ISSUE\nAME may issue and note this in Block 60."` | `ISSUE` |

### How to run

From `Assignments/Ticket_2/src/`:

```bash
# All three languages
python run_all_tests.py
```

Or individually:

```bash
# Python
python -m pytest AMEParserTest.py -v

# JavaScript (Node 18+)
node --test AMEParserTest.js

# C++
cmake -B build
cmake --build build
# Windows (typical):
./build/CppUnitTest.exe
# or ./build/Debug/CppUnitTest.exe
```

### Design notes (clarity & maintainability)

- One function, one responsibility: classify disposition text.
- Same case names and expectations across languages so peer reviewers can compare side by side.
- Priority order is explicit: `DEFER` → `DENY` → `SPECIAL ISSUANCE` → `ISSUE` → `UNKNOWN`.
- No PDF, network, or UI dependencies — tests stay fast and deterministic.

---

## Disclaimer

Educational Capstone work only. Not an official FAA product. Disposition labels summarize source wording for navigation and education; they are not a certification decision.
