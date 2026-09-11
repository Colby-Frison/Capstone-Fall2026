# Undergraduate Capstone Project Proposal

| Field | Value |
| --- | --- |
| **Course** | CS-4273 Computer Science Capstone (Fall 2026) |
| **Project title** | Pilots Guide to Medical Certification |
| **Alternate / prior title** | Prototype of an Improved FAA Aviation Medical Certification Information Portal for Pilots |
| **STEM college** | Physical Sciences |
| **Project category** | Health & Biological Sciences |
| **Group** | Group F |
| **Team members** | James Cunningham, Colby Frison, Shone George Kutty Renjan, Patrick Ha, Alan Vo |
| **Mentors / clients** | Micheal Coffman, Rebecca Mauldin, Jesus J Viramontes |
| **Date** | Fall 2026 |

---

## 1. Executive summary

This Capstone project will prototype a pilot-facing web platform that makes FAA medical certification guidance easier to research and understand. Official content today lives primarily in long examiner-oriented documents (notably the FAA Guide for Aviation Medical Examiners and related OneGuide materials). Those documents are derived from structured data already maintained in an underlying database; for this semester the team will work from the published PDF extracts of that data, parse them into structured form, and present them through a searchable website.

The product is not a medical decision engine and does not replace an Aviation Medical Examiner (AME). It helps pilots answer two primary questions about **known** conditions before the exam, using **accurate, deterministic** information drawn from approved sources:

1. **Can the pilot get a medical certification with any known conditions?**  
   (This does not account for conditions that may be discovered during the exam.)
2. **What does the pilot need to bring to the AME appointment?**  
   (Medical records, tests, paperwork, and related documentation.)

The website must also adhere to **FAA website requirements** and remain suitable for possible later integration with the FAA Office of Communication.

---

## 2. Problem statement

Pilots must obtain an initial and periodic FAA medical certificate (Class 1 / 2 / 3 or BasicMed) to fly. The typical path begins with an application in MedXPress ([medxpress.faa.gov](https://medxpress.faa.gov/)) followed by an AME examination. Pilots are encouraged to research their medical conditions and arrive prepared, preferably using FAA resources.

AMEs rely on the FAA AME Guide and related materials when deciding whether to issue a certificate or defer a case to the FAA for further review. Deferrals often require additional documentation and testing; missing that material can delay approval by months.

### Pain points

Newer pilots—and applicants with medical histories, including mental health concerns—frequently struggle to:

- Locate **accurate** information among conflicting or hard-to-navigate sources
- Determine whether a **known condition** (and its sub-conditions) is consistent with issuance, deferral, or denial under published guidance
- Identify **what to bring** to the AME appointment (records, test results, forms)
- Understand how **medications** affect flight status or the certification path
- Interpret examiner-oriented medical language in plain terms

Industry and agency feedback has long noted confusion around FAA medical certification information architecture and MedXPress usability (including conflicting guidance, poor findability, and weak documentation prompts). Satisfaction with parts of the process has been reported as uneven, reinforcing distrust and avoidable delays when applicants arrive underprepared.

### Opportunity

Prior OU Capstone teams (Fall 2025 / Spring 2026) prototyped concepts—including searchable content, structured JSON rule data, and related explorations—and presented them to FAA CAMI leadership. Those concepts are ready for more focused product work: a clear research and preparation tool for pilots, grounded in official content, within an FAA-acceptable web framework.

---

## 3. Background and content source model

### Official guidance

| Source | Role |
| --- | --- |
| [FAA Medical Certification](https://www.faa.gov/pilots/medical_certification) | Primary public entry point for pilots |
| [FAA AME Guide](https://www.faa.gov/ame_guide) | Examiner disposition rules and related guidance |
| AME Guide / OneGuide PDFs (mentor-provided) | Working extracts used by this Capstone team |
| MedXPress | Application system (out of scope to rebuild; context for pilot workflow) |

### Data lineage (important for stakeholders)

```text
Underlying FAA / CAMI structured database (tables)
                    │
                    ▼
            Published PDF extracts
         (AME Guide, OneGuide, etc.)
                    │
                    ▼
     Capstone content pipeline (PDF parse → structured data)
                    │
                    ▼
        Pilot-facing search & presentation website
```

The authoritative operational data lives in a database and is published into PDF form for examiner use. **This project deliberately works from those PDFs**, parsing them into structured content the website can search and display. Direct live database integration is a future option, not a dependency for the Fall 2026 MVP. Mentors and stakeholders can verify website answers against the same PDF sources the team used.

---

## 4. Objectives

1. Prototype a **user-centered website**, within an **FAA-acceptable framework**, that new pilots can find, trust, and navigate.
2. Enable pilots to **research known medical conditions** and related sub-conditions against official guidance.
3. Answer, in plain language and with deterministic content:
   - Whether published guidance supports medical certification for those **known** conditions (issue / deferral / denial pathways as represented in source material)
   - What **documents, tests, and records** the pilot should prepare for the AME appointment
4. Present medication-related flight-status / certification guidance where covered in approved sources.
5. Keep all displayed medical content **accurate, deterministic, and traceable** to mentor-approved FAA materials—no invented rules.
6. Continue prior Capstone research toward a production-minded prototype suitable for review by mentors and potential FAA Office of Communication integration.
7. Reinforce a health-first message: get healthy, consult personal physicians for concerns, then pursue the medical certificate.

---

## 5. Primary system requirements

These two requirements define success for the MVP:

| ID | Requirement | Clarification |
| --- | --- | --- |
| **R1** | Can the pilot get a medical certification with any known conditions? | Based on published disposition guidance for conditions the pilot already knows about. Does **not** account for findings discovered during the AME exam. Outcomes are presented as guidance labels (e.g., issue / deferral / denial), not as a personal guarantee. |
| **R2** | What does the pilot need to bring to the AME appointment? | Medical records, test results, forms, and other documentation called for by the guidance for the relevant condition / pathway—especially when deferral or additional evaluation is indicated. |

### Cross-cutting requirement

| ID | Requirement |
| --- | --- |
| **R3** | All information shown on the website must be **accurate** and **deterministic** (same inputs → same published guidance outputs; no speculative or model-invented medical rules). |
| **R4** | The website must adhere to **FAA website requirements** (branding, accessibility, technical, and policy constraints as directed by mentors / FAA stakeholders). |

---

## 6. Proposed solution

### Product concept

A modern, responsive web application focused on **search, research, and preparation**—not a multi-step medical-history wizard with auto-saved personal progress.

Pilots will:

1. Search or browse for a medical condition, sub-condition, or medication
2. View a clear hierarchy (condition → sub-conditions) grounded in source content
3. See the published disposition pathway (issue / deferral / denial / special issuance when present)
4. See a concrete list of documents and tests to prepare for the AME visit when the source material specifies them
5. Review medication-related notes affecting flight status where available

### Scope emphasis (Fall 2026)

| In scope | Out of scope |
| --- | --- |
| PDF-based content extraction and structured storage for the app | Live connection to the underlying FAA database (future) |
| Search / browse of conditions and related docs | Collecting or storing real PII |
| Disposition and “what to bring” presentation | Guaranteeing an individual certification outcome |
| Medication guidance from approved sources | Rebuilding MedXPress |
| FAA-acceptable web presentation & requirements compliance | Personalized medical or legal advice |
| Unit tests and mentor-verifiable content samples | Auto-save wizard / saved personal medical history flows |

Prior proposals described guided wizards, AME decision-support portals, and status tracking. Those remain useful long-term ideas from earlier teams; **this semester’s committed MVP** centers on R1–R4 above: deterministic research answers for known conditions and appointment preparation.

### International design references (informational)

Comparable civil aviation sites inform usability expectations (not legal requirements for this prototype):

- Australia — CASA medical records / portal resources  
- United Kingdom — CAA Cellma / aeromedical customer portal  
- Canada — Transport Canada structured apply / manage guidance  

References: [CASA](https://www.casa.gov.au/resources-and-education/our-systems/medical-records-system#UsingMRS), [UK CAA](https://www.caa.co.uk/aeromedical/connecting-with-the-caa/cellma-medical-records-system/), [Transport Canada](https://tc.canada.ca/en).

---

## 7. Functional and non-functional requirements

### Functional

1. User can search by keyword/phrase across structured condition and medication content.
2. Selecting a result shows condition / sub-condition structure when present in the data.
3. For a known condition, the system presents the published disposition pathway (R1).
4. Where source material lists paperwork, tests, or records, the system presents a clear “what to bring” list for the AME appointment (R2).
5. Medication entries describe flight-status / certification impact when present in sources.
6. UI content is driven by parsed structured data (not one-off hard-coded pages for every condition).
7. Core flows do not require user accounts or personal medical history storage.
8. Source attribution (PDF / section) is available for verification where practical.

### Non-functional

| Category | Requirement |
| --- | --- |
| Accuracy | Content matches mentor-approved FAA PDF sources; no invented medical rules (R3) |
| Determinism | Identical queries against the same content version yield the same guidance results (R3) |
| FAA compliance | Site meets FAA website requirements as specified by mentors / stakeholders (R4) |
| Usability | A new pilot can answer R1 and R2 without examiner training |
| Accessibility | WCAG-oriented structure, keyboard use, readable contrast |
| Privacy | No real PII in the prototype |
| Performance | Responsive search and page loads on target student / demo hosting |
| Maintainability | Pipeline can be re-run when PDFs are updated |
| Stakeholder tone | Accurate, easy to find, easy to understand, and encouraging |

---

## 8. Technical approach

| Layer | Approach |
| --- | --- |
| Content inputs | AME Guide PDF, OneGuide PDFs (e.g., neurology), other mentor-approved PDFs |
| Extraction | Python PDF tooling (building on prior-semester `AMEParser` work) |
| App data | Structured JSON (or equivalent) for search and UI |
| Frontend | React + Next.js (planned production prototype UI) |
| Design | Figma wireframes for search and result views |
| Quality | Automated unit tests (including disposition classification); mentor spot-checks vs. PDFs |
| Hosting | TBD with mentors; keep options open for FAA-facing integration |

Disposition classification (mapping guide text to issue / deferral / denial labels) is an early implemented building block and is covered by Ticket 2 unit tests in Python, JavaScript, and C++.

---

## 9. Methodology and deliverables

### Methodology

1. Domain and requirements alignment with mentors (Ticket 1 / Ticket 2 foundations)
2. Content pipeline: parse PDF extracts → structured condition / document datasets
3. Design: Figma wireframes for search, condition detail, and “what to bring” views
4. Build: Next.js prototype consuming structured data
5. Verify: automated tests + mentor comparison of sample answers to PDF sources
6. Confirm FAA website requirement compliance for the prototype surface
7. Demo, user guide, and final report

### Deliverables

- This formal project proposal  
- Project README and supporting requirements documentation  
- Content pipeline and structured datasets derived from approved PDFs  
- Working web prototype answering R1 and R2 for covered conditions  
- Unit tests and verification notes  
- User guide, presentation, and Capstone report  

### High-level timeline

| Phase | Weeks | Focus |
| --- | --- | --- |
| Domain & stack | 1–2 | Requirements, technologies, README, early tests |
| Design | 2–4 | Figma search / result / docs flows; mentor feedback |
| Content pipeline | 2–5 | PDF parsing; conditions, dispositions, documents |
| Frontend prototype | 4–8 | Search UI; R1/R2 presentation; medications |
| Testing & refinement | 8–10 | Accuracy, determinism, accessibility, FAA site requirements |
| Demo & handoff | 11–15 | Presentation, guide, report, stakeholder review |

---

## 10. Constraints and assumptions

- Work continues from Fall 2025 / Spring 2026 Capstone research and prototypes.
- Medical content is provided or approved by mentors; the team does not invent clinical rules.
- MVP content coverage may be a validated subset of the full AME Guide (e.g., selected sections / OneGuide materials) rather than the entire ~900-page corpus on day one.
- Team should remain comfortable evaluating AI-assisted approaches where mentors request them, but **MVP answers must remain deterministic and source-backed** (AI must not invent medical dispositions).
- Results may be integrated into a larger FAA-facing effort.
- Prototype uses no real personally identifiable information.

---

## 11. Success criteria

The project is successful when mentors can observe that:

1. For sample **known** conditions in the structured dataset, a pilot can determine the published certification pathway (R1).
2. For those same conditions, the pilot can see what to bring to the AME appointment when the source specifies documents/tests (R2).
3. Displayed information is accurate relative to the approved PDFs and behaves deterministically (R3).
4. The prototype website complies with applicable FAA website requirements (R4).
5. A demonstration shows: search → condition / sub-condition → disposition → documents to bring, without relying on saved personal wizard state.

---

## 12. References

### FAA and industry

- [FAA Medical Certification](https://www.faa.gov/pilots/medical_certification)
- [FAA Guide for Aviation Medical Examiners](https://www.faa.gov/ame_guide)
- [MedXPress](https://medxpress.faa.gov/)
- [AOPA — Preflight your medical](https://www.aopa.org/news-and-media/all-news/2025/december/pilot/flight-md-preflight-your-medical)
- [FAA — What does “Pre-Flight Your Exam” mean?](https://www.faa.gov/faq/what-does-pre-flight-your-exam-mean)
- [FAA Medical Certification FAQs](https://www.faa.gov/faq?combine=&field_faq_category_target_id=13621)

### Project documents

- [Project info](Project%20info.md)
- [Project Context and Requirements](Project_Context_and_Requirements.md)
- [Prior Capstone project proposal (PDF)](Capstone%20project%20proposal.pdf)
- [AME Guide PDF](ame_guide.pdf)
- [OneGuide Neurology PDF](OneGuide_Neurology.pdf)
- [Repository README](../../README.md)

---

## 13. Disclaimer

This is an educational Capstone prototype. It is **not** an official FAA product and does not provide medical, legal, or certification advice. Published guidance may change; content must be verified against current FAA materials and mentor-approved sources. The tool addresses **known** conditions only as represented in source documents and does not account for findings discovered during an AME examination. Individual outcomes remain the responsibility of the applicant, their physicians, the AME, and the FAA.