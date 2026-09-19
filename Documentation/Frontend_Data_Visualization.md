# Frontend data visualization requirements

Design and UI requirements for presenting AME / OneGuide guidance in the Pilots Guide prototype. Content must remain source-backed and educational — not personalized medical advice.

## Product questions

1. **Certification pathway** for a known condition (disposition + selected pathway).
2. **What to bring** to the AME appointment (structured checklist).

## Information hierarchy

| Level | Source field | UI treatment |
|-------|--------------|--------------|
| Category | `category` | Browse sidebar + breadcrumb chip |
| Condition | `condition` | Page title; Browse / Search row |
| Pathway (sub-condition) | `scenario` | Accordion; drives R1 / R2 |
| Classes | `certificate_classes` | Chips under pathway (“All”, “1st”, “2nd”, “3rd”) |
| Disposition | `disposition` | Badge + explanation block |
| Bring list | requirements with `role=bring_list` | Checklist grouped by kind |
| AME review | requirements with `role=ame_review` | Read-only callout (not checkboxes) |
| Time limits | `time_constraints` | Chips under pathway |
| Medication notes | `medication_notes` | Dedicated section |
| Warnings / cross-refs | `warnings`, See-… `action` | Calm notice callout |
| Source | `source` | Footer attribution with page |

## Condition Detail (core screen)

### R1 — Pathway panel
- Large disposition badge (Issue / Deferral / Denial / Special Issuance / Unknown).
- Plain-language pathway summary.
- Certificate class chips when present.
- Certification note from `action` (including “See related guidance: …” for cross-references).
- Cross-reference notice when `warnings` contains `cross_reference`.

### Pathway list
- Expandable list of pathways; one selected pathway drives R1/R2.
- Never show truncated or invalid pathway titles.

### R2 — What to Bring
- Group checklist by kind labels:
  - Records & documents (`DOCUMENT`)
  - Tests & imaging (`TEST`)
  - Medications (`MEDICATION`)
  - Other (`OTHER`)
- Within each group, subgroup **Required** vs **Often requested** using `required`.
- Session-only checkbox state (no account / no persistence).
- Empty state: calm copy that no additional paperwork is listed for this pathway.

### AME evaluation notes
- Separate short section below the checklist when `ameReviewNotes` exist.
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

- [ ] ALL leukemia → “All others”: grouped bring-list (≥10 items) + separate AME review line.
- [ ] Epilepsy / Neurology category: no condition titled “Neurology”; disease names browse correctly.
- [ ] Eyes / CHD “See … table/protocol” pathway: UNKNOWN disposition with related-guidance callout and action text.
- [ ] Browse: category sidebar excludes General; pathway counts and disposition badges render.
- [ ] Condition Detail: class chips when `certificateClasses` present; Often requested items unchecked by default for `required: false`.
