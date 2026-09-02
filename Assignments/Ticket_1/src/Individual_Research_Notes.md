# Ticket 1 — Individual Research Notes

**Course:** CS-4273 Capstone, Fall 2026  
**Project:** Pilots Guide to Medical Certification  
**Ticket:** Domain Understanding (1.1b)  
**Note:** Each member should produce their own answers. This file is a thorough research baseline the group can compare, cite, and refine during collaboration.

---

## Q1. What is an FAA medical certificate?

### Definition

An FAA airman medical certificate is proof that a pilot meets medical standards in **14 CFR Part 67**. Many flight operations require it (alongside a pilot certificate). The certificate class needed depends on the **privileges being exercised**, not only the type of pilot certificate held ([14 CFR § 61.23](https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61/subpart-A/section-61.23)).

### Classes (who typically needs which)


| Class      | Typical use                                                                | Validity for that privilege (high level)                                |
| ---------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **First**  | Airline transport / Part 121 PIC (and certain SIC cases)                   | Often 12 months if under 40; 6 months if 40+ for first-class privileges |
| **Second** | Commercial pilot privileges (and related ops)                              | Generally 12 months for second-class privileges                         |
| **Third**  | Student, recreational, private pilot privileges when a medical is required | 60 months if under 40; 24 months if 40+                                 |


Sources: [FAA AME Guide — validity](https://www.faa.gov/ame_guide/app_process/general/validity); [14 CFR § 61.23](https://www.faraim.org/faa/far/cfr/title-14/part-61/section-61.23.html).

### Why it matters for new pilots

- A third-class medical is commonly the entry point for flight training when a traditional medical is required.
- Many new pilots believe any medical history ends a career; the real barrier is often **process knowledge**, not automatic disqualification.
- Alternatives exist for some operations (e.g., **BasicMed**, sport pilot with driver’s license rules, certain glider/balloon cases). New pilots must confirm which path applies before assuming a full Part 67 medical is the only option.



### Product implication

The site should explain classes in plain language, map “what I want to fly” → “what medical I need,” and set expectations that getting healthy and understanding standards comes before the exam.

---



## Q2. What must applicants disclose, and what happens after disclosure?



### What is disclosed

Applicants complete **FAA Form 8500-8** through **MedXPress** (Items 1–20: personal info, medical history, medications, visits to health professionals, etc.). History items commonly stress new pilots include mental health diagnoses/treatment, medications, surgeries, and chronic conditions ([FAA Medical Certification](https://www.faa.gov/pilots/medical_certification); AME Guide / Form 8500-8 process).

Truthful disclosure is mandatory. Omitting or falsifying history can lead to certificate action and other penalties; honesty is safer than “hoping it isn’t found.”

### What happens after disclosure

1. **AME can issue** — history and exam meet standards (sometimes with required documentation brought to the visit).
2. **Deferral** — AME cannot issue on the spot; application goes to FAA Aerospace Medical Certification Division (AMCD) for more review. Common for mental health history, incomplete records, or conditions needing Special Issuance pathways. A deferral is **not** the same as a denial.
3. **Denial** — formal finding that standards are not currently met; triggers reconsideration / appeal timelines (e.g., reconsideration pathways under Part 67 processes).
4. **Special Issuance / AASI** — for some conditions, certification may continue under additional monitoring or documentation (FAA AME Guide disposition tables; evolving mental-health pathways such as AME-Assisted Special Issuance programs).



### Pitfalls for new pilots

- Fear of disclosing mental health care; waiting until conditions worsen.
- Showing up to the AME without records the Guide says are needed for issuance.
- Confusing deferral with “career over.”



### Product implication

Content must be **encouraging and accurate**: disclose honestly, prepare documentation, expect possible deferral as a process step, and point to official disposition guidance—not unofficial “hacks” that encourage concealment.

---



## Q3. How does a new pilot obtain a certificate end-to-end?



### End-to-end flow

1. **Prep / get healthy** — Address medical concerns with personal physicians first (project objective). Review condition-specific expectations in the [Guide for Aviation Medical Examiners](https://www.faa.gov/ame_guide) disposition materials when relevant.
2. **MedXPress application** — Create an account, complete Form 8500-8, submit, save the **confirmation number**. The AME needs this number to import the application. Complete the exam within **60 days** of submission or the application expires.
3. **Find and schedule an AME** — Use the FAA designee / AME locator. For substance-related or certain complex mental-health pathways, a **HIMS AME** may be appropriate.
4. **Exam day** — Bring government photo ID, confirmation number, and medical records/documentation. Typical checks: vitals, vision, hearing, urine sample; ECG when required (e.g., certain first-class age rules).
5. **Outcome**
  - **Issue** — certificate issued if standards met and required docs reviewed.
  - **Defer** — sent to FAA for more information / decision; respond promptly to FAA letters requesting records.
  - **Deny** — follow FAA reconsideration / appeal instructions; seek qualified medical/aviation guidance as needed.

Sources summarizing the FAA process: [FAA Medical Certification hub](https://www.faa.gov/pilots/medical_certification); [AME Guide](https://www.faa.gov/ame_guide).

### If the AME cannot issue

Explain deferral vs denial; list what documents FAA may request; reassure that many applicants eventually certify with proper documentation; never recommend skipping disclosure.

### Product implication

Build a step-by-step checklist and outcome explainer (issue / defer / deny) with links to MedXPress, AME locator, and official next-step pages.

---



## Q4. Where should pilots get accurate information, and what does “FAA-acceptable” mean?



### Prefer these sources

- [FAA Medical Certification](https://www.faa.gov/pilots/medical_certification) (pilot-facing)
- [MedXPress](https://medxpress.faa.gov/) for the application itself
- [Guide for Aviation Medical Examiners](https://www.faa.gov/ame_guide) and disposition tables (condition-level expectations)
- **14 CFR Part 67** (standards) and **§ 61.23** (when a medical is required / duration)
- Regional Flight Surgeon / AMCD when official channels say to escalate
- Project-provided medical content approved by FAA stakeholders (per brief)



### Treat carefully

Flight-school blogs, forums, and “life hacks” may oversimplify or encourage risky behavior. Useful for empathy and UX research; **not** authoritative for clinical/regulatory claims.

### “FAA-acceptable framework” for this project

From [Project info.md](../../../Resources/Project%20info.md):

- Content must be **accurate, easy to find, easy to understand, and encouraging**.
- Medical content is **provided** / must remain correct—students develop tools and navigation, not invent clinical rules.
- Work may integrate with **FAA Office of Communication**; public wording and AI answers must stay within approved messaging.
- Prior teams already stressed **accuracy of AI results** when presenting to FAA CAMI leadership.

Accessibility: federal public sites often target Section 508 / WCAG-aligned practices; treat as an implementation requirement under “easy to find / use,” not a separate domain question.

### Product implication

Prefer citing/linking official FAA material; sandbox AI answers against approved JSON/content; clearly label educational vs medical advice; avoid guaranteeing issuance outcomes.

---



## Q5. What did prior OU teams build, and what should this semester continue?



### From the project brief (confirmed)

Prior teams (Fall 2025 and Spring 2026 with Dr. Abdulhak’s students):

- Prototyped **AI-assisted search**, **interactive graphics**, and **JSON** content structures
- Explored the “art of the possible” for AI **and** measured **accuracy of results**
- Presented concepts to **FAA CAMI leadership**
- Concepts are ready for **more detailed work** and potential **integration with FAA Office of Communication**

Constraints:

- This semester must **start from** that prior research
- Team needs comfort working with **AI**
- Results may fold into a **larger FAA project**



### Needs mentor confirmation (not fully available in public notes)

- Exact repos, demos, slide decks, and evaluation metrics from prior semesters
- Which prototype is preferred for productionization
- Content ownership / approval workflow
- Priority order: education site vs AI tools vs integration readiness



### Regulation / guidance changes subsection

FAA AME Guide and mental-health related pathways continue to update (e.g., disposition table updates; special issuance / AASI-style programs). The product should be designed so **content can be updated** without rewriting the whole app. Confirm with mentor which changes matter for the approved content pack.

### Product implication

Inventory prior artifacts first; pick one primary UX path for new pilots; harden accuracy (citations, approved content, refusal/escalation when uncertain); prepare for Communications-ready presentation of information.

---



## Flags for mentor confirmation

- [ ] Access to Fall 2025 / Spring 2026 deliverables
- [ ] Content provider and approver
- [ ] Semester priority (education / AI / integration)
- [ ] Mentor vs client role and check-in cadence