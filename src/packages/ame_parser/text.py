"""Conservative text normalization shared by document strategies."""

from __future__ import annotations

import re

from .models import Disposition, Requirement, RequirementKind

_BULLET = re.compile(r"(?:^|\s)[-•·●\x00]\s+")
_NUMBERED = re.compile(r"(?:^|\s)\d+[.)]\s+")
_DECORATIVE = re.compile(r"^[\s\*]+$")
_SCENARIO_HEAD = re.compile(
    r"^([A-Z]\.\s+[^•\n]{3,120}?)(?:\s+(?:OR|AND|Including|With|Note:|Allergy|Epi|If\b).*)?$",
    re.I,
)


def clean(text: str | None) -> str:
    return re.sub(r"\s+", " ", (text or "").replace("\x00", " ")).strip()


def normalize_condition_name(text: str | None) -> str:
    value = clean(text).rstrip("*").strip()
    value = re.sub(r"([A-Za-z])\(", r"\1 (", value)
    value = re.sub(r";\s*", "; ", value)
    return value


def normalize_scenario_title(text: str | None) -> str:
    """Prefer the lettered pathway title, not the entire disease cell dump."""

    raw = (text or "").replace("\x00", " ")
    lines = [line.strip() for line in raw.splitlines() if line.strip()]
    if not lines:
        return ""

    # Join wrapped title lines until a bullet/number/note starts.
    title_parts: list[str] = []
    for line in lines:
        if re.match(r"^[-•·●]\s+", line) or re.match(r"^\d+[.)]\s+", line):
            break
        if line.lower().startswith(("note:", "submit the following", "see ")):
            break
        title_parts.append(line)
        joined = clean(" ".join(title_parts))
        # Stop once we have a reasonably complete title clause.
        if joined.endswith((".", ";", ":")) and len(joined) > 24:
            break
        if len(joined) >= 70 and not joined.endswith((",", "and", "or", "by", "with", "of", "to")):
            break
        if len(title_parts) >= 4:
            break

    first_line = clean(" ".join(title_parts)) if title_parts else clean(lines[0])
    if not first_line:
        return ""

    # Continuation fragments are not pathway titles.
    if first_line.lower().startswith("submit the following"):
        return ""

    match = re.match(r"^([A-Z]\.)\s*(.+)$", first_line)
    if match:
        letter, rest = match.group(1), match.group(2)
        rest = re.split(r"\s+[•·●]\s+", rest, maxsplit=1)[0]
        rest = clean(rest).rstrip(";")
        if len(rest) > 100:
            rest = rest[:97].rsplit(" ", 1)[0] + "…"
        return f"{letter} {rest}".strip()

    if len(first_line) > 100:
        return first_line[:97].rsplit(" ", 1)[0] + "…"
    return first_line.rstrip(",;")


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

    raw = (text or "").replace("\x00", "•")
    lines = [line.strip() for line in raw.splitlines() if line.strip()]
    if not lines:
        return ()

    # Collapse decorative separator lines used in some AME pages.
    lines = [line for line in lines if not _DECORATIVE.fullmatch(line)]
    if not lines:
        return ()

    marker = re.compile(r"^(?:[-•·●]+|\d+[.)])\s*")
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
        # Evaluation cells are often flattened to one line with inline bullets.
        flattened = clean(raw)
        if "•" in flattened or "·" in flattened:
            parts = re.split(r"\s*[•·●]\s*", flattened)
            parts = [clean(part) for part in parts if clean(part)]
            if len(parts) > 1:
                return tuple(parts)
        return (flattened,) if flattened else ()

    return tuple(item for item in items if item and not _DECORATIVE.fullmatch(item))


def requirement_kind(text: str) -> RequirementKind:
    lower = text.lower()
    # Prefer document/test over medication when the sentence is a progress note
    # that merely mentions medications as one field among many.
    if any(
        phrase in lower
        for phrase in (
            "progress note",
            "clinical note",
            "status report",
            "operative note",
            "hospital record",
            "submit the following",
            "medical information",
        )
    ):
        return RequirementKind.DOCUMENT
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
            "ct ",
            "ultrasound",
        )
    ):
        return RequirementKind.TEST
    if re.search(r"\b(medication list|current medications|dosage|drug)\b", lower):
        return RequirementKind.MEDICATION
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
    items = split_items(text)
    requirements: list[Requirement] = []
    for item in items:
        if len(item) < 8:
            continue
        if item.lower().startswith("if the ame can determine"):
            # Keep criteria as evaluation guidance, not a bring-list item.
            requirements.append(
                Requirement(text=item, kind=RequirementKind.EVALUATION)
            )
            continue
        requirements.append(Requirement(text=item, kind=requirement_kind(item)))
    return tuple(requirements)


def extract_medication_notes(*texts: str | None) -> tuple[str, ...]:
    """Keep only short, medication-specific notes — not entire evaluation cells."""

    notes: list[str] = []
    for text in texts:
        for item in split_items(text):
            lower = item.lower()
            if len(item) > 220:
                continue
            if not re.search(
                r"\b(medication|medications|antihistamine|dosage|drug|sedating)\b",
                lower,
            ):
                continue
            if lower.startswith(("submit the following", "a. ", "b. ", "c. ")):
                continue
            if "progress note" in lower and "medication" in lower and len(item) > 120:
                continue
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
