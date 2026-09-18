Design a polished, production-ready multi-screen web app prototype for “Pilots Guide to Medical Certification” — a Capstone project that may later integrate with FAA Office of Communication.

PRODUCT PURPOSE
Help new and returning pilots research FAA medical certification guidance before an Aviation Medical Examiner (AME) appointment. The app is search-first and research-focused. It is NOT a multi-step medical history wizard, NOT a chatbot, and NOT a form that saves personal medical data.

The website must answer two primary questions for KNOWN conditions only:
1) Can the pilot get a medical certification with this known condition? (based on published guidance; does not account for what may be discovered during the exam)
2) What does the pilot need to bring to the AME appointment? (medical records, tests, paperwork, forms)

All content must feel accurate, deterministic, calm, and trustworthy. Include clear disclaimers that this is educational guidance from FAA source material, not a personal certification decision or medical advice.

VISUAL DIRECTION (IMPORTANT)
- Aesthetic: official government / aviation information site — clean, credible, encouraging, highly readable
- Think: modern FAA.gov information architecture, not a startup SaaS dashboard
- Color: deep aviation navy / slate blue as primary; soft sky blue accents; white and cool light-gray surfaces; one restrained status color system (green = Issue, amber = Deferral, red = Denial, blue-gray = Special Issuance / Unknown)
- Avoid: purple gradients, neon glow, dark-mode-first UI, glassmorphism, playful illustration clutter, emoji, rounded-full pill spam, heavy multi-layer shadows, cream/terracotta “editorial” looks, newspaper layouts
- Typography: clear humanist or geometric sans for UI; strong hierarchy; large readable body text; no decorative script fonts
- Layout: generous whitespace, strong left-to-right reading flow, one job per section, minimal cards (use cards only when they help interaction or grouping of related docs)
- Accessibility: high contrast, visible focus states, large tap targets, WCAG-minded spacing
- Responsive: design desktop (1440) and mobile (390) variants for key screens
- Branding: product name “Pilots Guide to Medical Certification” should be a strong hero/header signal; include a subtle “Educational prototype · Based on FAA AME Guide sources” line. Do not invent an official FAA logo lockup; use a simple abstract wing/horizon mark or text-only wordmark suitable for a prototype

INFORMATION ARCHITECTURE
Global nav: Home | Search | Conditions | Medications | How this works | About / Disclaimer
Persistent global search in header on all pages after Home.

SCREENS TO GENERATE (desktop + mobile where noted)

1) HOME / LANDING
- One clear composition (not a dashboard)
- Brand name as hero-level signal
- One headline: help pilots prepare for their FAA medical with clear, official guidance
- One short supporting sentence focused on research and preparation
- One primary CTA: “Search a condition” and one secondary CTA: “Browse conditions”
- Briefly preview the two questions the site answers (certification pathway for known conditions; what to bring to the AME)
- Small trust strip: accurate · source-based · no personal data collected
- Short “Get healthy first” note: see personal physicians for health concerns, then prepare for the medical certificate
- Do NOT put stats, schedules, promo cards, or feature grids in the first viewport

2) SEARCH RESULTS
- Query example: “migraine” or “depression” or a medication name
- Result list with type chips: Condition | Sub-condition | Medication
- Each result shows short plain-language snippet + disposition preview badge when available (Issue / Deferral / Denial)
- Filters: All / Conditions / Medications; optional category filter (e.g., Neurology)
- Empty state and “no exact match” state
- Helper text: results reflect published guidance for known conditions only

3) CONDITION DETAIL (core screen — most important)
Use a realistic sample condition with 2–3 sub-conditions.
Page structure:
A. Condition title + plain-language summary
B. Answer panel for Question 1: “Based on published guidance for this known condition, what is the certification pathway?”
   - Large disposition status (Issue / Deferral / Denial / Special Issuance)
   - Short explanation in pilot-friendly language
   - Note: does not include findings that may be discovered during the exam
C. Sub-conditions section: expandable list; selecting a sub-condition updates the disposition and documents
D. Answer panel for Question 2: “What should I bring to my AME appointment?”
   - Checklist of medical records, tests, forms, and documents
   - Group by Required / Often requested if useful
   - Emphasize preparing early so a deferral is not delayed by missing paperwork
E. Related medications (if any)
F. Source attribution footer: AME Guide / OneGuide section reference (placeholder citations OK)
G. Persistent disclaimer

4) MEDICATION DETAIL
- Medication name
- How it may affect flight status / medical certification per published guidance
- Related conditions
- What to discuss with AME / personal physician (non-advisory tone)
- Source attribution + disclaimer

5) BROWSE CONDITIONS
- Category-based browse (e.g., Neurology, Cardiology, Mental Health — use plausible categories)
- Simple directory list, searchable within browse
- Not a dense table; scannable rows with disposition hints

6) HOW THIS WORKS
- 3–4 step explainer: Search → Review pathway for known conditions → Prepare documents → See your AME
- Clarify content comes from FAA AME Guide / related PDFs (deterministic source-backed info)
- Clarify what the site does NOT do (no personal diagnosis, no guarantee, no account/PII)

7) ABOUT / DISCLAIMER
- Educational Capstone prototype statement
- Not an official FAA product
- Encourage verification against current FAA guidance
- Privacy: no real PII collected

COMPONENT SYSTEM TO INCLUDE
- Header with logo/wordmark + nav + search
- Primary / secondary buttons
- Search input (large)
- Disposition badge set (Issue, Deferral, Denial, Special Issuance, Unknown)
- Document checklist item with checkbox (visual only; not a saved user account feature)
- Result row
- Sub-condition accordion
- Notice / disclaimer callout (calm, not alarming)
- Footer with links and prototype labeling
- Consistent 8px spacing system

INTERACTION NOTES FOR PROTOTYPE
- Home CTA goes to Search
- Search result opens Condition Detail
- Sub-condition selection updates disposition + bring-list on Condition Detail
- Nav links between all main screens
- Mobile: bottom-friendly primary actions; collapsed nav; search accessible

CONTENT TONE
Plain language, encouraging, precise. Avoid fear-based copy. Prefer “published guidance indicates…” over “you will be denied.” Always keep the two pilot questions visually obvious on condition pages.

OUTPUT
Create a complete Figma Make app flow with named frames for each screen (Desktop and Mobile), a small components page, and realistic placeholder aviation-medical content. Prioritize clarity of the Condition Detail screen so a mentor can immediately see how the product answers the two primary requirements.