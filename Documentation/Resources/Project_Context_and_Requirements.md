# Project Context and Requirements

**Pilots Guide to Medical Certification**  
CS-4273 Capstone — Fall 2026 | Group F

This document expands on the README with product direction, content sources, features, and system requirements. It is meant for the team, mentors, and anyone picking up the project mid-semester.

---

## Additional context

Pilots who need an FAA medical certificate face a wall of official documentation. The AME Guide and related OneGuide materials describe conditions, sub-conditions, dispositions, required tests, and paperwork — but they are written for examiners, not for someone trying to figure out “what does this mean for me?”

There is also an external database that already stores much of this information in tables. Long term, connecting to that source may make sense. For this semester we are not depending on live database access. We will parse the same kind of information from the PDFs we have (AME Guide, OneGuide materials such as neurology, and related mentor-approved documents), turn it into structured data, and present it through a searchable web experience.

The product focus is **finding and understanding information**, not walking through a saved multi-step medical history wizard. Auto-save of user progress is out of scope. A pilot should search, read the relevant outcome and requirements, and know what to bring or expect.

Medication is part of the same problem. Taking a medication can change flight status or certification path, and that guidance needs to sit next to condition guidance so it is not a separate scavenger hunt.

Tone and stance stay the same as the original brief: accurate, easy to find, easy to understand, and encouraging. Pilots should get healthy and work with their own physicians first; this tool helps them prepare for the medical certification process after that.

---

## Problem summary

| Area | What goes wrong today |
| --- | --- |
| Discovery | Official PDFs are long and hard to search for a specific condition |
| Outcomes | Hard to tell if a condition/sub-condition leads to issue, deferral, or denial |
| Deferrals | Required paperwork and tests are easy to miss, which delays approval |
| Medications | Unclear how a drug affects flight status or the medical process |
| Language | Examiner-oriented medical wording is difficult for new pilots |

---

## Product goals

1. Let pilots **search** for conditions, sub-conditions, medications, and related certification guidance.
2. Show **disposition outcomes** (issue / deferral / denial) in plain language for the matched content.
3. For deferrals, surface **paperwork, tests, and documentation** so pilots can prepare early.
4. Include **medication ↔ flight status** information alongside condition content.
5. Keep content **traceable** to FAA / mentor-approved PDF sources.
6. Stay within an **FAA-acceptable** web framework for possible later integration with FAA Office of Communication.

---

## Features

### Must have (MVP)

| Feature | Description |
| --- | --- |
| Search | Keyword / phrase search across structured condition and medication content |
| Condition hierarchy | Display a condition and its sub-conditions in a clear hierarchy |
| Disposition display | Show likely outcome: issue, deferral, or denial (as represented in source material) |
| Deferral requirements | List paperwork, tests, and other documentation tied to a deferral path |
| Medication guidance | Present how medications relate to flight status / certification where covered in source PDFs |
| Plain-language presentation | Pilot-friendly wording; link or cite source material where accuracy matters |
| Responsive web UI | Usable on desktop and mobile |

### Should have

| Feature | Description |
| --- | --- |
| Browse / filter | Browse by category (e.g. neurology) when the pilot does not know the exact search term |
| Source attribution | Show which PDF / section a result came from |
| Empty and low-confidence states | Clear messaging when nothing matches or content is incomplete |
| Accessibility | Keyboard navigation, readable contrast, semantic structure |

### Nice to have / later

| Feature | Description |
| --- | --- |
| Live external database sync | Replace or supplement PDF parsing with the existing tabular database |
| AI-assisted search / Q&A | Prior teams explored this; revisit only if mentors want it and accuracy can be controlled |
| Official FAA hosting integration | Hand-off packaging for Office of Communication |

### Out of scope (this semester)

- Multi-step medical history wizard with auto-save / `localStorage` progress
- Collecting or storing real PII
- Giving personalized medical or legal advice
- Guaranteeing certification outcomes (tool presents source guidance only)

---

## Content pipeline requirements

| Requirement | Detail |
| --- | --- |
| Primary inputs | AME Guide PDF, OneGuide PDFs (e.g. neurology), other mentor-approved PDFs in `Documentation/Resources/` |
| Processing | Python-based parsing (building on prior-semester `AMEParser` work under `src/old/`) |
| Output | Structured data (JSON or equivalent) suitable for search and UI rendering |
| Fields of interest | Condition, sub-condition, disposition/outcome, required tests, paperwork / documentation, medication notes, source reference |
| Validation | Spot-check parsed results against the PDF; automated tests for parser stability |
| Database | External table database is acknowledged as a future/alternate source; not a hard dependency for MVP |

---

## System requirements

### Functional

1. User can enter a search query and receive ranked or filtered results for conditions, sub-conditions, and medications.
2. Selecting a result shows disposition (issue / deferral / denial) when present in the structured data.
3. Deferral-related results include associated paperwork and tests when present in the source material.
4. Medication-related results describe flight-status / certification impact when present in the source material.
5. Content displayed in the UI comes from the parsed structured dataset, not from ad-hoc hard-coded pages for every condition.
6. The application does not require user accounts or saved personal medical history for core search and browse flows.

### Non-functional

| Category | Requirement |
| --- | --- |
| Accuracy | Content must match mentor-approved FAA source material; no invented medical rules |
| Usability | A new pilot should find a condition and understand the outcome path without examiner training |
| Performance | Search and page loads should feel responsive on typical student/dev hardware and target hosting |
| Accessibility | Meet basic WCAG-oriented practices for text, focus, and structure |
| Privacy | No real PII collection in the prototype |
| Maintainability | Parser and data format should allow re-running when PDFs are updated |
| Framework | Stack and hosting choices should remain compatible with FAA-acceptable web practices (per mentor guidance) |

### Technical stack (planned)

| Layer | Choice |
| --- | --- |
| Content extraction | Python + PDF tooling (e.g. pdfplumber), pytest |
| Data | Structured JSON (or similar) consumed by the frontend |
| Frontend | React + Next.js |
| Design | Figma for wireframes and review |
| Hosting | TBD with mentors; keep options open for later FAA-facing integration |

---

## Success criteria

- A pilot can search a known condition or medication and reach a usable answer in a few interactions.
- For a deferral-prone path, the UI lists concrete paperwork/tests rather than only naming “deferral.”
- Mentors can verify sample results against the PDF sources.
- Demo shows search → condition/sub-condition → outcome → deferral or medication detail without relying on auto-saved wizard state.

---

## Related documents

- [README](../../README.md)
- [Project info](Project%20info.md)
- [Capstone project proposal](Capstone%20project%20proposal.pdf)
- [AME Guide](ame_guide.pdf)
- [OneGuide Neurology](OneGuide_Neurology.pdf)
- [Step 1.a — Identify Technologies](../../Assignments/Ticket_2/src/Step1a_Identify_Technologies.md)
