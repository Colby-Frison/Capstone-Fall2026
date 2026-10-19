# What to include on the website

Content inventory of the FAA *Guide for Aviation Medical Examiners* (932 pages,
version 08/26/2026), in priority order. Page numbers are PDF pages. The
`2_website_data` folder already contains everything marked as a condition;
the rest is in `2_website_data/reference/`.

## Must-have

- [ ] **Disposition tables by exam item (p. 58–462)**: 181 conditions, 497 rows of
      Condition / Evaluation Data / Disposition → `conditions/*.json`
  - Condition Not Listed (p. 60)
  - ENT (Items 25–30): head/neck, nose, anosmia, sinuses, mouth/throat, ears (vertigo, Ménière's, BPPV, cochlear implant, motion sickness)
  - Eye (Items 31–34): amblyopia, cataracts, diplopia, refractive surgery, chorioretinitis, retinoschisis
  - Lungs (Item 35): allergies, asthma, alpha-gal, sarcoid, sleep apnea, RLS
  - Heart (Item 36): arrhythmias, AFib, pacemaker, WPW, coronary heart disease, hypertension, murmurs, valves, cardiomyopathy
  - Vascular (Item 37): AVM, Buerger, POTS, Raynaud's
  - Abdomen (Items 38–39): Barrett's, gallstones, cirrhosis, GERD, liver transplant, pancreatitis, colon cancer, *Abdomen and Viscera and Anus Conditions* (colitis, hepatitis, hernia, ulcer, splenomegaly)
  - Skin (Item 40), G-U (Item 41), Musculoskeletal (Items 42–43), Lymphatics (Item 45)
  - Neurologic (Item 46): 38 conditions incl. epilepsy/seizure, stroke, TBI, MS, migraine, ULOC
  - Psychiatric (Item 47): ADHD, anxiety/depression (PATH), PTSD, situational depression
  - General systemic (Item 48): diabetes, prediabetes, thyroid, pituitary, blood disorders, HIV, cancers, PCOS, weight loss
- [ ] **Synopsis of Medical Standards (p. 757)**: vision, hearing, ECG, BP limits by class + the 15 disqualifying conditions → `reference/synopsis-of-medical-standards.json`
- [ ] **Certificate classes & validity (p. 21–26)**: 1st/2nd/3rd class, duration by age 40 → `reference/10-classes-…`, `reference/13-validity-…`
- [ ] **Medications (p. 623–677)**: Do Not Issue / Do Not Fly, OTC wait times, diabetes, antidepressant, migraine, sleep aids, weight loss … → `reference/*`
- [ ] **CACI list (p. 502)**: 31 conditions AMEs can issue → `reference/caci-conditions.json`; worksheets also inside each condition (`caci_worksheets`)
- [ ] **AASI (p. 678–720)**: 38 conditions → `reference/aasi-for-*.json`
- [ ] **Disease protocols (p. 503–622)**: OSA, insulin-treated diabetes (CGM / non-CGM), CHD, pacemaker, HIV, stress test, neuro/psych evaluation specs → `reference/protocol-*.json`

## Important supporting content

- [ ] Office-required testing, Items 49–58 (hearing, vision incl. 2025 color-vision rules, BP, ECG)
- [ ] Substances of dependence/abuse & HIMS (p. 721–756)
- [ ] FAA Form 8500-8 application items (p. 41–53), especially Item 18 Medical History
- [ ] General information (p. 9–40): Issue/Deny/Defer, privacy, appeals, Clinical Progress Note
- [ ] Glossary (p. 760)

## Skip or keep minimal

- Archives and Updates (p. 764–932): 169-page changelog – show only the latest changes
- Table of contents / "Frequently used pages" (p. 1–8) – replaced by site navigation
- Student Pilot Rule Change (p. 759) – 2016 note

## On every page

- [ ] "Source: FAA Guide for Aviation Medical Examiners, PDF pages X–Y" + link to the official FAA version (`source` field)
- [ ] Guide version + date of last data update (`meta.json`)
- [ ] Re-run the pipeline after each FAA monthly update (last Wednesday of most months)
