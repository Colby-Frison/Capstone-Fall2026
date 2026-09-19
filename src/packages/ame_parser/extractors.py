"""Format-specific extraction strategies."""

from __future__ import annotations

import re
from dataclasses import replace
from pathlib import Path
from typing import Protocol, Sequence

from .models import Disposition, GuidanceRecord, SourceReference
from .page_types import (
    PageRole,
    classify_ame_page,
    is_browse_section_label,
    is_class_scope_line,
    is_criteria_subtitle_line,
    is_disposition_role,
    is_heading_noise_line,
    is_section_label_line,
    is_synonym_paren_line,
    is_valid_condition_title,
    is_valid_scenario,
)
from .pdf import PageData, Table
from .table_assemble import ColumnMap, LogicalRow, assemble_page_rows
from .text import (
    classify_disposition,
    clean,
    extract_medication_notes,
    extract_requirements,
    extract_time_constraints,
    is_cross_reference_disposition,
    normalize_action,
    normalize_condition_name,
    normalize_scenario_title,
    printed_page,
    promote_section_label_condition,
    slug,
)


class UnsupportedDocumentError(ValueError):
    pass


class Extractor(Protocol):
    name: str

    def supports(self, pages: Sequence[PageData]) -> bool: ...

    def extract(
        self, pages: Sequence[PageData], source: Path
    ) -> tuple[GuidanceRecord, ...]: ...


def _append_unique(original: str, extra: str) -> str:
    original_clean = clean(original)
    extra_clean = clean(extra)
    if not extra_clean or extra_clean in original_clean:
        return original
    return f"{original}\n{extra}".strip()


def _assign_unique_record_ids(
    records: tuple[GuidanceRecord, ...],
) -> tuple[GuidanceRecord, ...]:
    """Ensure record_id uniqueness when pathways collide on the same page."""

    seen: dict[str, int] = {}
    unique: list[GuidanceRecord] = []
    for record in records:
        base = record.record_id
        count = seen.get(base, 0)
        seen[base] = count + 1
        if count == 0:
            unique.append(record)
            continue
        unique.append(replace(record, record_id=f"{base}-{count + 1}"))
    return tuple(unique)


def _finish(draft: dict[str, object], source: Path) -> GuidanceRecord | None:
    scenario_raw = str(draft["scenario"] or "")
    evaluation_raw = str(draft.get("evaluation", "") or "")
    action_raw = str(draft.get("action", "") or "")
    disposition_raw = str(draft.get("raw_disposition", "") or "")

    scenario = normalize_scenario_title(scenario_raw) or clean(scenario_raw)
    if not scenario or scenario.lower().startswith("submit the following"):
        return None
    if not is_valid_scenario(scenario):
        return None

    evaluation = clean(evaluation_raw)
    action = normalize_action(action_raw)
    raw_disposition = clean(disposition_raw)
    disposition, warnings = classify_disposition(raw_disposition or action)
    warning_list = list(warnings)

    if is_cross_reference_disposition(raw_disposition or action):
        xref = clean(raw_disposition or action)
        if xref and (not action or action.upper() in {"DEFER", "ISSUE", "DENY", "UNKNOWN"}):
            action = xref
        warning_list.append("cross_reference")
        disposition = Disposition.UNKNOWN
        raw_disposition = xref

    # Keep raw_disposition as the keyword label when classification succeeded.
    elif disposition is not Disposition.UNKNOWN:
        if (
            not action
            and raw_disposition
            and len(raw_disposition) > 24
            and disposition.value.replace("_", " ").lower()
            not in raw_disposition.lower()[:20]
        ):
            # Disposition cell mixed keyword + instructions into one string.
            action = raw_disposition
        if disposition is Disposition.SPECIAL_ISSUANCE:
            raw_disposition = "SPECIAL ISSUANCE"
        elif disposition is Disposition.DEFER and "FAA DECISION" in raw_disposition.upper():
            raw_disposition = "Requires FAA Decision"
        else:
            raw_disposition = disposition.value.replace("_", " ")

    all_warnings = tuple(dict.fromkeys((*draft.get("warnings", ()), *warning_list)))
    condition = normalize_condition_name(str(draft["condition"]))
    category = clean(str(draft.get("category", ""))) or None
    condition, scenario, category = promote_section_label_condition(
        condition, scenario, category
    )
    if not condition or condition == "UNKNOWN" or is_browse_section_label(condition):
        return None
    if not scenario or not is_valid_scenario(scenario):
        return None

    page = int(draft["page"])
    class_text = clean(str(draft.get("classes", "")))
    requirements = extract_requirements(evaluation_raw)
    medication_notes = extract_medication_notes(action_raw)
    return GuidanceRecord(
        record_id=f"{slug(source.stem, condition, scenario, class_text)}-p{page}",
        category=category,
        condition=condition,
        subcondition=scenario or None,
        scenario=scenario,
        certificate_classes=tuple(
            part.strip()
            for part in re.split(r"\s*(?:&|,|/)\s*", class_text)
            if part.strip()
        ),
        time_constraints=extract_time_constraints(
            scenario_raw, evaluation_raw, action_raw
        ),
        disposition=disposition,
        raw_disposition=raw_disposition,
        requirements=requirements,
        medication_notes=medication_notes,
        action=action,
        source=SourceReference(
            document=source.name,
            pdf_page=page,
            printed_page=draft.get("printed_page") or None,
            section=category,
        ),
        raw_text=clean(
            "\n".join(
                (
                    scenario,
                    class_text,
                    evaluation,
                    raw_disposition,
                    action,
                )
            )
        ),
        warnings=all_warnings,
    )


class AmeGuideExtractor:
    name = "ame_guide"

    def supports(self, pages: Sequence[PageData]) -> bool:
        return any("Guide for Aviation Medical Examiners" in page.text for page in pages)

    def extract(
        self, pages: Sequence[PageData], source: Path
    ) -> tuple[GuidanceRecord, ...]:
        drafts: list[dict[str, object]] = []
        condition = ""
        category = ""
        last_columns: ColumnMap | None = None

        for page in pages:
            role = classify_ame_page(page)
            if not is_disposition_role(role):
                # Drop carried geometry so revision/AASI pages cannot reuse it.
                last_columns = None
                continue

            heading = self._heading(page.text)
            if role is PageRole.DISPOSITION_TABLE and heading:
                if is_valid_condition_title(heading[1]):
                    category, condition = heading
                else:
                    # Invalid title block — do not pollute carried state.
                    category, condition = "", ""
            elif role is PageRole.CONTINUATION_DISPOSITION:
                if heading and is_valid_condition_title(heading[1]) and not condition:
                    category, condition = heading
            elif heading and is_valid_condition_title(heading[1]):
                category, condition = heading

            if not is_valid_condition_title(condition):
                # Continuations without a known condition are unsafe after skips.
                continue

            page_classes = ""
            for line in page.text.splitlines():
                if is_class_scope_line(line):
                    page_classes = "All"
                    break

            rows, last_columns = assemble_page_rows(page.tables, last_columns)
            for logical in rows:
                if logical.scenario and not is_valid_scenario(logical.scenario):
                    continue
                self._ingest_logical_row(
                    drafts,
                    logical,
                    category=category,
                    condition=condition,
                    page=page,
                    default_classes=page_classes,
                )

        return _assign_unique_record_ids(
            tuple(
                record
                for draft in drafts
                if (record := _finish(draft, source)) is not None
            )
        )

    def _ingest_logical_row(
        self,
        drafts: list[dict[str, object]],
        logical: LogicalRow,
        *,
        category: str,
        condition: str,
        page: PageData,
        default_classes: str = "",
    ) -> None:
        scenario = logical.scenario
        evaluation = logical.evaluation
        raw_action = logical.disposition
        # Page-level "All Classes" only applies to real pathway rows, not
        # empty-scenario fragment shreds (which would mint duplicate drafts).
        classes = logical.classes or (default_classes if scenario else "")

        if scenario:
            stacked = self._stacked_pathways(classes, evaluation, raw_action)
            if stacked:
                for class_value, evaluation_value, disposition_value in stacked:
                    raw_disposition, action = self._split_disposition(
                        disposition_value
                    )
                    drafts.append(
                        {
                            "category": category,
                            "condition": condition or "UNKNOWN",
                            "scenario": scenario,
                            "classes": class_value,
                            "evaluation": evaluation_value,
                            "raw_disposition": raw_disposition,
                            "action": action,
                            "page": page.number,
                            "printed_page": printed_page(page.text),
                            "warnings": ("stacked_table_row_split",),
                        }
                    )
                return
            raw_disposition, action = self._split_disposition(raw_action)
            drafts.append(
                {
                    "category": category,
                    "condition": condition or "UNKNOWN",
                    "scenario": scenario,
                    "classes": classes,
                    "evaluation": evaluation,
                    "raw_disposition": raw_disposition,
                    "action": action,
                    "page": page.number,
                    "printed_page": printed_page(page.text),
                    "warnings": () if condition else ("missing_condition_heading",),
                }
            )
            return

        if classes and drafts and raw_action:
            raw_disposition, action = self._split_disposition(raw_action)
            previous = drafts[-1]
            drafts.append(
                {
                    "category": category,
                    "condition": condition or previous["condition"],
                    "scenario": previous["scenario"],
                    "classes": classes,
                    "evaluation": evaluation,
                    "raw_disposition": raw_disposition,
                    "action": action,
                    "page": page.number,
                    "printed_page": printed_page(page.text),
                    "warnings": (),
                }
            )
            return

        if drafts:
            draft = drafts[-1]
            draft["evaluation"] = _append_unique(
                str(draft.get("evaluation", "")), evaluation
            )
            disposition, action = self._split_disposition(raw_action)
            draft["raw_disposition"] = _append_unique(
                str(draft.get("raw_disposition", "")), disposition
            )
            draft["action"] = _append_unique(str(draft.get("action", "")), action)

    @staticmethod
    def _stacked_pathways(
        classes: str, evaluation: str, disposition: str
    ) -> tuple[tuple[str, str, str], ...]:
        """Split visually stacked class pathways merged into one PDF row."""

        class_lines = [clean(line) for line in classes.splitlines() if clean(line)]
        if len(class_lines) < 2:
            return ()
        decisions = re.findall(
            r"\b(?:REQUIRES?\s+FAA\s+DECISION|DEFER|DENY|ISSUE)\b",
            clean(disposition),
            re.I,
        )
        evaluation_parts = [
            clean(part)
            for part in re.split(r"(?=\bSubmit\b)", clean(evaluation))
            if clean(part)
        ]
        if len(decisions) != len(class_lines) or len(evaluation_parts) != len(
            class_lines
        ):
            return ()

        disposition_clean = clean(disposition)
        first_decision = re.match(
            r"^(Requires?\s+FAA\s+Decision|DEFER|DENY|ISSUE)\b",
            disposition_clean,
            re.I,
        )
        if not first_decision or len(class_lines) != 2:
            return ()
        first = first_decision.group(1)
        remaining = disposition_clean[first_decision.end() :].strip()
        return (
            (class_lines[0], evaluation_parts[0], first),
            (class_lines[1], evaluation_parts[1], remaining),
        )

    @staticmethod
    def _split_disposition(text: str) -> tuple[str, str]:
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        if not lines:
            return "", ""
        decision_lines: list[str] = []
        while lines and len(decision_lines) < 3:
            candidate = clean(" ".join((*decision_lines, lines[0]))).upper()
            if any(
                phrase in candidate
                for phrase in (
                    "ISSUE",
                    "DEFER",
                    "DENY",
                    "FAA DECISION",
                    "SPECIAL ISSUANCE",
                )
            ):
                decision_lines.append(lines.pop(0))
                break
            decision_lines.append(lines.pop(0))
        raw = clean(" ".join(decision_lines))
        if classify_disposition(raw)[0].value == "UNKNOWN":
            return clean(text), ""
        return raw, clean("\n".join(lines))

    @staticmethod
    def _heading(text: str) -> tuple[str, str] | None:
        """Parse ITEM / category / condition title block before the table."""

        lines = [clean(line) for line in text.splitlines() if clean(line)]
        try:
            end = next(
                index
                for index, line in enumerate(lines)
                if "DISEASE/CONDITION" in line.upper()
            )
        except StopIteration:
            return None

        start = 0
        while start < end and re.match(
            r"^(Guide for Aviation|Version|--\s*\d)",
            lines[start],
            re.I,
        ):
            start += 1

        candidates = [
            line
            for line in lines[start:end]
            if not is_heading_noise_line(line) and not re.fullmatch(r"\d{1,4}", line)
        ]
        if not candidates:
            return None

        item = next(
            (line for line in candidates if line.upper().startswith("ITEM ")),
            "",
        )
        names = [line for line in candidates if line != item]
        if not names:
            return None

        category = item
        primary_parts: list[str] = []
        synonyms: list[str] = []

        for index, line in enumerate(names):
            if is_synonym_paren_line(line):
                inner = line.strip()[1:-1].strip()
                # Instructional parentheticals are not disease synonyms.
                if inner.lower().startswith("use for"):
                    continue
                synonyms.append(inner)
                continue
            # Broken OCR/title fragment: "COGNITIVE DISORDER)"
            if line.endswith(")") and "(" not in line and len(line) < 60:
                synonyms.append(line.rstrip(")").strip())
                continue
            if is_criteria_subtitle_line(line):
                continue
            if (
                not primary_parts
                and is_section_label_line(line)
                and any(
                    not is_synonym_paren_line(other)
                    and not is_criteria_subtitle_line(other)
                    and other != line
                    for other in names[index + 1 :]
                )
            ):
                # Short system label (NOSE, EYES - PROCEDURES) before disease title.
                category = line
                continue
            primary_parts.append(line)

        condition = clean(" ".join(primary_parts))
        if synonyms:
            syn = synonyms[0]
            if syn and syn.lower() not in condition.lower():
                condition = f"{condition} ({syn})" if condition else syn

        if not is_valid_condition_title(condition):
            # Fall back to section label when it is the real disease title.
            if category and not category.upper().startswith("ITEM "):
                if is_valid_condition_title(category):
                    condition = category
                    category = item
            elif names:
                for candidate in names:
                    repaired = candidate.rstrip(")") if candidate.endswith(")") and "(" not in candidate else candidate
                    if is_valid_condition_title(repaired):
                        condition = repaired
                        break

        if not condition or not is_valid_condition_title(condition):
            return None
        if category == condition:
            category = item
        return category or item, condition


class OneGuideExtractor:
    name = "oneguide"

    def supports(self, pages: Sequence[PageData]) -> bool:
        joined = "\n".join(page.text[:1000] for page in pages[:5])
        return "OneGuide" in joined or any(
            "Initial Certification (Pilot)" in page.text for page in pages
        )

    def extract(
        self, pages: Sequence[PageData], source: Path
    ) -> tuple[GuidanceRecord, ...]:
        drafts: list[dict[str, object]] = []
        condition = ""
        active: dict[str, object] | None = None

        for page in pages:
            page_condition = self._condition_heading(page.text)
            if page_condition:
                condition = page_condition
                active = None

            for table in page.tables:
                rows, column_count = self._pilot_rows(table)
                if column_count is None:
                    continue
                for row in rows:
                    scenario = clean(row[0] if len(row) > 0 else "")
                    evaluation = clean(row[1] if len(row) > 1 else "")
                    ame_action = clean(row[2] if len(row) > 2 else "")
                    if not any((scenario, evaluation, ame_action)):
                        continue
                    if scenario and not re.search(r"[A-Za-z0-9]", scenario):
                        continue
                    if scenario:
                        raw_disposition, action = AmeGuideExtractor._split_disposition(
                            ame_action
                        )
                        active = {
                            "category": "Neurology",
                            "condition": condition or "UNKNOWN",
                            "scenario": scenario,
                            "evaluation": evaluation,
                            "raw_disposition": raw_disposition,
                            "action": action,
                            "page": page.number,
                            "printed_page": printed_page(page.text),
                            "warnings": ()
                            if condition
                            else ("missing_condition_heading",),
                        }
                        drafts.append(active)
                    elif active:
                        active["evaluation"] = _append_unique(
                            str(active.get("evaluation", "")), evaluation
                        )
                        if classify_disposition(ame_action)[0].value != "UNKNOWN":
                            raw_disposition, action = (
                                AmeGuideExtractor._split_disposition(ame_action)
                            )
                            active["raw_disposition"] = _append_unique(
                                str(active.get("raw_disposition", "")),
                                raw_disposition,
                            )
                            active["action"] = _append_unique(
                                str(active.get("action", "")), action
                            )
                        else:
                            active["action"] = _append_unique(
                                str(active.get("action", "")), ame_action
                            )

        return _assign_unique_record_ids(
            tuple(
                record
                for draft in drafts
                if (record := _finish(draft, source)) is not None
            )
        )

    @staticmethod
    def _pilot_rows(
        table: Table,
    ) -> tuple[Sequence[tuple[str | None, ...]], int | None]:
        for index, row in enumerate(table[:3]):
            headers = [clean(cell).upper() for cell in row]
            if (
                len(headers) >= 3
                and "DISEASE/CONDITION" in headers[0]
                and "EVALUATION DATA" in headers[1]
                and "AME ACTIONS" in headers[2]
            ):
                return table[index + 1 :], len(row)
        if table and len(table[0]) >= 7:
            return table, len(table[0])
        return (), None

    @staticmethod
    def _condition_heading(text: str) -> str | None:
        lines = [clean(line) for line in text.splitlines() if clean(line)]
        for index, line in enumerate(lines):
            if re.fullmatch(r"18[lI]\.\s*Neurology", line, re.I):
                for candidate in lines[index + 1 :]:
                    if candidate.upper().startswith("DISCLAIMER"):
                        break
                    if is_browse_section_label(candidate) or is_class_scope_line(
                        candidate
                    ):
                        continue
                    if is_heading_noise_line(candidate):
                        continue
                    if is_valid_condition_title(candidate):
                        return candidate
                return None
        return None


DEFAULT_EXTRACTORS: tuple[Extractor, ...] = (
    OneGuideExtractor(),
    AmeGuideExtractor(),
)
