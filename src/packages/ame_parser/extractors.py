"""Format-specific extraction strategies."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Protocol, Sequence

from .models import Disposition, GuidanceRecord, SourceReference
from .pdf import PageData, Table
from .text import (
    classify_disposition,
    clean,
    extract_medication_notes,
    extract_requirements,
    extract_time_constraints,
    normalize_condition_name,
    normalize_scenario_title,
    printed_page,
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


def _join_cells(row: Sequence[str | None], first: int, last: int) -> str:
    return "\n".join(cell for cell in row[first:last] if clean(cell))


def _append_unique(original: str, extra: str) -> str:
    original_clean = clean(original)
    extra_clean = clean(extra)
    if not extra_clean or extra_clean in original_clean:
        return original
    return f"{original}\n{extra}".strip()


def _finish(draft: dict[str, object], source: Path) -> GuidanceRecord | None:
    scenario_raw = str(draft["scenario"] or "")
    evaluation_raw = str(draft.get("evaluation", "") or "")
    action_raw = str(draft.get("action", "") or "")
    disposition_raw = str(draft.get("raw_disposition", "") or "")

    scenario = normalize_scenario_title(scenario_raw) or clean(scenario_raw)
    if not scenario or scenario.lower().startswith("submit the following"):
        return None

    evaluation = clean(evaluation_raw)
    action = clean(action_raw)
    raw_disposition = clean(disposition_raw)
    disposition, warnings = classify_disposition(raw_disposition or action)
    # Keep raw_disposition as the keyword label when classification succeeded.
    if disposition is not Disposition.UNKNOWN:
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

    all_warnings = tuple(dict.fromkeys((*draft.get("warnings", ()), *warnings)))
    condition = normalize_condition_name(str(draft["condition"]))
    page = int(draft["page"])
    category = clean(str(draft.get("category", ""))) or None
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
        last_roles: tuple[int, int | None, int, int, int] | None = None

        for page in pages:
            heading = self._heading(page.text)
            if heading:
                category, condition = heading

            for table in page.tables:
                roles = self._roles(table)
                if roles is None:
                    if (
                        last_roles is None
                        or not table
                        or max((len(row) for row in table), default=0)
                        <= last_roles[3]
                    ):
                        continue
                    roles = (*last_roles[:4], -1)
                else:
                    last_roles = roles
                (
                    disease_idx,
                    class_idx,
                    evaluation_idx,
                    disposition_idx,
                    header_idx,
                ) = roles
                for row in table[header_idx + 1 :]:
                    scenario = _join_cells(row, disease_idx, disease_idx + 1)
                    classes = (
                        _join_cells(row, class_idx, class_idx + 1)
                        if class_idx is not None
                        else ""
                    )
                    evaluation = _join_cells(row, evaluation_idx, disposition_idx)
                    raw_action = _join_cells(row, disposition_idx, len(row))
                    if not any(
                        clean(value)
                        for value in (scenario, classes, evaluation, raw_action)
                    ):
                        continue
                    if (
                        scenario.upper().startswith("NOTE:")
                        and not evaluation
                        and not raw_action
                    ):
                        continue

                    if scenario:
                        stacked = self._stacked_pathways(
                            classes, evaluation, raw_action
                        )
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
                            continue
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
                                "warnings": ()
                                if condition
                                else ("missing_condition_heading",),
                            }
                        )
                    elif classes and drafts and raw_action:
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
                    elif drafts:
                        draft = drafts[-1]
                        draft["evaluation"] = _append_unique(
                            str(draft.get("evaluation", "")), evaluation
                        )
                        disposition, action = self._split_disposition(raw_action)
                        draft["raw_disposition"] = _append_unique(
                            str(draft.get("raw_disposition", "")), disposition
                        )
                        draft["action"] = _append_unique(
                            str(draft.get("action", "")), action
                        )

        return tuple(
            record
            for draft in drafts
            if (record := _finish(draft, source)) is not None
        )

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
        if len(decisions) != len(class_lines) or len(evaluation_parts) != len(class_lines):
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
    def _roles(
        table: Table,
    ) -> tuple[int, int | None, int, int, int] | None:
        for header_idx, row in enumerate(table[:3]):
            headers = [clean(cell).upper() for cell in row]
            disease = next(
                (index for index, value in enumerate(headers) if "DISEASE" in value),
                None,
            )
            evaluation = next(
                (index for index, value in enumerate(headers) if "EVALUATION" in value),
                None,
            )
            disposition = next(
                (index for index, value in enumerate(headers) if "DISPOSITION" in value),
                None,
            )
            if None not in (disease, evaluation, disposition):
                class_idx = next(
                    (
                        index
                        for index, value in enumerate(headers)
                        if value == "CLASS"
                    ),
                    None,
                )
                return disease, class_idx, evaluation, disposition, header_idx
        return None

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
        lines = [clean(line) for line in text.splitlines() if clean(line)]
        try:
            end = next(
                index
                for index, line in enumerate(lines)
                if "DISEASE/CONDITION" in line.upper()
            )
        except StopIteration:
            return None
        candidates = [
            line
            for line in lines[1:end]
            if not re.match(r"^(All Classes|Updated|\(Updated)", line, re.I)
        ]
        if not candidates:
            return None
        item = next((line for line in candidates if line.upper().startswith("ITEM ")), "")
        names = [line for line in candidates if line != item]
        category = item
        if len(names) > 1 and names[0].isupper() and not names[0].startswith("("):
            category = names.pop(0)
        condition = clean(" ".join(names))
        return category, condition


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

        return tuple(
            record
            for draft in drafts
            if (record := _finish(draft, source)) is not None
        )

    @staticmethod
    def _pilot_rows(table: Table) -> tuple[Sequence[tuple[str | None, ...]], int | None]:
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
                title: list[str] = []
                for candidate in lines[index + 1 :]:
                    if candidate.upper().startswith("DISCLAIMER"):
                        break
                    title.append(candidate)
                return clean(" ".join(title)) or None
        return None


DEFAULT_EXTRACTORS: tuple[Extractor, ...] = (
    OneGuideExtractor(),
    AmeGuideExtractor(),
)
