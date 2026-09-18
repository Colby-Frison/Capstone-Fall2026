"""Conservative text normalization shared by document strategies."""

from __future__ import annotations

import re

from .models import Disposition, Requirement, RequirementKind


def clean(text: str | None) -> str:
    return re.sub(r"\s+", " ", (text or "").replace("\x00", " ")).strip()


def classify_disposition(text: str | None) -> tuple[Disposition, tuple[str, ...]]:
    """Classify explicit FAA wording and report non-literal mappings."""

    upper = clean(text).upper()
    if not upper:
        return Disposition.UNKNOWN, ("missing_disposition",)
    if re.search(r"\b(DEFER|REQUIRES? FAA DECISION)\b", upper):
        warning = (
            ("requires_faa_decision_mapped_to_defer",)
            if "FAA DECISION" in upper and "DEFER" not in upper
            else ()
        )
        return Disposition.DEFER, warning
    if re.search(r"\b(DENY|DENIAL|DO NOT ISSUE)\b", upper):
        return Disposition.DENY, ()
    if "SPECIAL ISSUANCE" in upper or re.search(r"\bSI\b", upper):
        return Disposition.SPECIAL_ISSUANCE, ()
    if re.search(r"\bISSUE\b", upper):
        return Disposition.ISSUE, ()
    return Disposition.UNKNOWN, ("unrecognized_disposition",)


def split_items(text: str | None) -> tuple[str, ...]:
    """Reconstruct bullet and numbered items from PDF cell line breaks."""

    lines = [line.strip() for line in (text or "").splitlines() if line.strip()]
    if not lines:
        return ()

    marker = re.compile(r"^(?:[-•·●\x00]+|\d+[.)])\s*")
    items: list[str] = []
    current = ""
    saw_marker = False
    for line in lines:
        match = marker.match(line)
        if match:
            saw_marker = True
            if current:
                items.append(clean(current))
            current = line[match.end() :]
        elif current:
            current = f"{current} {line}"
        else:
            current = line
    if current:
        items.append(clean(current))

    if not saw_marker:
        return (clean(text),)
    return tuple(item for item in items if item)


def requirement_kind(text: str) -> RequirementKind:
    lower = text.lower()
    if any(word in lower for word in ("medication", "dosage", "drug")):
        return RequirementKind.MEDICATION
    if any(
        word in lower
        for word in (
            "test",
            "imaging",
            "mri",
            "audiogram",
            "laboratory",
            "lab result",
            "dicom",
            "scan",
        )
    ):
        return RequirementKind.TEST
    if any(
        word in lower
        for word in (
            "record",
            "report",
            "note",
            "summary",
            "letter",
            "documentation",
        )
    ):
        return RequirementKind.DOCUMENT
    if "evaluation" in lower or "exam" in lower:
        return RequirementKind.EVALUATION
    return RequirementKind.OTHER


def extract_requirements(text: str | None) -> tuple[Requirement, ...]:
    return tuple(
        Requirement(text=item, kind=requirement_kind(item))
        for item in split_items(text)
    )


def extract_medication_notes(*texts: str | None) -> tuple[str, ...]:
    notes: list[str] = []
    for text in texts:
        for item in split_items(text):
            if any(word in item.lower() for word in ("medication", "drug", "dosage")):
                if item not in notes:
                    notes.append(item)
    return tuple(notes)


def extract_time_constraints(*texts: str | None) -> tuple[str, ...]:
    """Retain quantities together with their relational wording."""

    pattern = re.compile(
        r"\b(?:"
        r"(?:no more than|not more than|at least|less than|more than)\s+"
        r"\d+(?:\s*\(\d+\))?\s+(?:days?|weeks?|months?|years?)"
        r"|"
        r"\d+(?:\s*\(\d+\))?\s+(?:or more|or less)\s+"
        r"(?:days?|weeks?|months?|years?)"
        r"|"
        r"\d+(?:\s*\(\d+\))?\s+(?:days?|weeks?|months?|years?)"
        r")\b",
        re.I,
    )
    results: list[str] = []
    for text in texts:
        for match in pattern.finditer(clean(text)):
            value = match.group(0)
            if value not in results:
                results.append(value)
    return tuple(results)


def printed_page(text: str | None) -> str | None:
    lines = [line.strip() for line in (text or "").splitlines() if line.strip()]
    for line in reversed(lines):
        if re.fullmatch(r"\d{1,4}", line):
            return line
        match = re.fullmatch(r"--\s*(\d{1,4})\s+of\s+\d{1,4}\s*--", line)
        if match:
            return match.group(1)
    return None


def slug(*parts: str) -> str:
    value = "-".join(clean(part).lower() for part in parts if clean(part))
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-")
