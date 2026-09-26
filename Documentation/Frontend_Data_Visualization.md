# Frontend data visualization requirements

Design and UI requirements for presenting AME / OneGuide guidance in the Pilots Guide prototype. Content must remain source-backed and educational — not personalized medical advice.

## Product questions

1. **Disposition** for a known condition and the selected pathway.
2. **Information to submit** for that pathway (structured checklist).

## Information hierarchy

| Level | Source field | UI treatment |
|-------|--------------|--------------|
| Category | `category` | Browse sidebar + breadcrumb chip |
| Condition | `condition` | Page title; Browse / Search row |
| Pathway | `scenario` | Pathway list; drives Disposition and Information to submit |
| Classes | `certificate_classes` | Chips under pathway (“All”, “1st”, “2nd”, “3rd”) |
| Disposition | `disposition` | Badge + explanation block |
| Bring list | requirements with `role=bring_list` | Checklist grouped by kind |
| Examiner review | requirements with `role=ame_review` | Separate read-only section (not checkboxes) |
| Time limits | `time_constraints` | Chips under pathway |
| Medication notes | `medication_notes` | Dedicated section |
| Warnings / cross-refs | `warnings`, See-… `action` | Calm notice callout |
| Source | `source` | Footer attribution with page |

## Condition Detail (core screen)

### Disposition
- Disposition badge and a short explanation of that status label (Issue, Deferral, Denial, Special Issuance, or Unknown).
- Certificate class chips and time limits when present.
- Source instruction from `action`, shown once. A cross-reference uses that same sentence in the related-guidance notice instead of a second copy.
- Do not repeat the pathway title’s checklist excerpt or the first materials item in this section.
- The known-condition limit is stated once, in the page disclaimer.

### Pathways
- List of pathways; one selected pathway drives Disposition and Information to submit.
- A pathway row shows the published name and disposition label. It does not repeat the materials list.
- Never show truncated or invalid pathway titles.
- Changing the pathway clears session checklist checks.

### Information to submit
- Summary count of items, required items, and often-requested items.
- One panel per kind that has items:
  - Records and documents (`DOCUMENT`)
  - Tests and imaging (`TEST`)
  - Medications (`MEDICATION`)
  - Other (`OTHER`)
- Required items first. Often-requested items follow under a quieter subheading and are labeled on the row.
- Progress counts only items on the current pathway.
- Session-only checkbox state (no account / no persistence).
- Empty state: calm copy that no additional materials are listed for this pathway.
- One short note under the list, plus the page disclaimer.

### Examiner review
- Separate section below the checklist when `ameReviewNotes` exist.
- Not interactive checkboxes.

## Browse / Search

- Browse sidebar uses canonical dictionary categories (not “General” spam).
- Rows: condition name, category, pathway count, primary disposition badge.
- Search remains condition-level; snippets may include pathway text.

## Visual / accessibility

Align with the Figma Make brief (`src/apps/web/src/imports/pasted_text/pilots-medical-certification-g.md`):

- Aviation navy / slate primary; restrained status colors.
- High contrast, visible focus, large tap targets.
- Cards only for interactive checklist / pathway grouping.
- Persistent educational disclaimer on condition pages.

## Manual verification checklist

- [ ] ALL leukemia → “All others”: grouped materials list (≥10 items) + separate Examiner review section.
- [ ] Switching pathways clears checklist checks. Condition Detail has no R1 or R2 labels.
- [ ] Epilepsy / Neurology category: no condition titled “Neurology”; disease names browse correctly.
- [ ] Eyes / CHD “See … table/protocol” pathway: UNKNOWN disposition with related-guidance callout and action text.
- [ ] Browse: category sidebar excludes General; pathway counts and disposition badges render.
- [ ] Condition Detail: class chips when `certificateClasses` present; Often requested items unchecked by default for `required: false`.
