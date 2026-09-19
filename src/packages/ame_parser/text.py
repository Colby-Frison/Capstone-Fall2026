"""Conservative text normalization shared by document strategies."""

from __future__ import annotations

import re

from .categories import resolve_category
from .models import Disposition, Requirement, RequirementKind

_DECORATIVE = re.compile(r"^[\s\*]+$")
_ORDERING_PREFIX = re.compile(
    r"^(?:[A-Z]\.|[-•·●]+|\d+[.)])\s*",
)
_INLINE_NUMBER_SPLIT = re.compile(
    r"(?<!Block )(?<!Item )(?:(?<=\s)|^)(?=\d{1,2}\.\s*[A-Za-z(\"•])",
)
_HEADER_PREFIX = re.compile(
    r"^(?:Submit the following(?:\s+for(?:\s+FAA)?\s+review)?|"
    r"It must(?:\s+specifically)?\s+include)\s*:?\s*",
    re.I,
)
_NOTE_PREFIX = re.compile(r"^Note(?:\(s\))?\s*:\s*", re.I)
_INLINE_NOTE = re.compile(r"\s+Note(?:\(s\))?\s*:\s*.*$", re.I)
_TRAILING_DISPOSITION = re.compile(
    r"(?:\s+|^)\b(?:DEFER|ISSUE|DENY|SPECIAL\s+ISSUANCE)\s*\.?$",
    re.I,
)
_LIST_GLUE = re.compile(r"(?:\s*;\s*(?:and)?|\s*,)\s*$", re.I)

_BOILERPLATE_HEADERS = {
    "submit the following",
    "submit the following for faa review",
    "submit the following to the faa for review",
    "submit the following for review",
    "it must include",
    "it must specifically include",
    "standard follow up would include",
    "standard follow-up would include",
}


def clean(text: str | None) -> str:
    return re.sub(r"\s+", " ", (text or "").replace("\x00", " ")).strip()


def strip_ordering_marker(text: str | None) -> str:
    """Remove leading A./B./1./bullet markers used only for source ordering."""

    value = clean(text)
    value = _INLINE_NOTE.sub("", value).strip()
    while True:
        updated = _ORDERING_PREFIX.sub("", value)
        if updated == value:
            break
        value = updated.strip()
    return _LIST_GLUE.sub("", value).strip()


def strip_trailing_disposition(text: str | None) -> str:
    value = clean(text)
    return _TRAILING_DISPOSITION.sub("", value).strip(" ;.")


def is_boilerplate_header(text: str | None) -> bool:
    """True for section headers that classify content, not checklist rows."""

    value = clean(text)
    if not value:
        return True
    lower = value.lower().rstrip(":").strip()
    if lower in _BOILERPLATE_HEADERS:
        return True
    if lower.startswith("submit the following") and len(lower) <= 64:
        return True
    if re.fullmatch(r"it must(?:\s+specifically)?\s+include", lower):
        return True
    return False


def peel_requirement_prefix(text: str | None) -> str:
    """Drop leading submit/include headers glued onto a real requirement."""

    value = clean(text)
    peeled = _HEADER_PREFIX.sub("", value, count=1).strip()
    peeled = _INLINE_NOTE.sub("", peeled).strip()
    return peeled or value


def normalize_condition_name(text: str | None) -> str:
    value = clean(text).rstrip("*").strip()
    value = re.sub(r"([A-Za-z])\(", r"\1 (", value)
    value = re.sub(r";\s*", "; ", value)
    value = value.replace("\u2013", "-").replace("\u2014", "-")
    # Repair orphan closing paren from wrapped synonym lines.
    if value.endswith(")") and "(" not in value:
        value = value.rstrip(")").strip()
    return value


def normalize_scenario_title(text: str | None) -> str:
    """Prefer the pathway title without A./B./C. ordering markers."""

    raw = (text or "").replace("\x00", " ")
    lines = [line.strip() for line in raw.splitlines() if line.strip()]
    if not lines:
        return ""

    # Join wrapped title lines until a bullet/number/note starts.
    title_parts: list[str] = []
    for line in lines:
        if re.match(r"^[-•·●]\s+", line) or re.match(r"^\d+[.)]\s+", line):
            break
        if line.lower().startswith(("note:", "note(s):", "submit the following", "see ")):
            break
        # Lettered pathway: keep the first titled line only unless clearly wrapped.
        if title_parts and re.match(r"^[A-Z]\.\s+", title_parts[0]):
            if re.match(r"^[A-Z]\.\s+", line):
                break
            if line[:1].isupper() and not title_parts[-1].endswith(
                (",", "and", "or", "by", "with", "of", "to", "-")
            ):
                break
        title_parts.append(line)
        joined = clean(" ".join(title_parts))
        # Stop once we have a reasonably complete title clause.
        if joined.endswith((".", ";", ":")) and len(joined) > 24:
            break
        if len(joined) >= 70 and not joined.endswith(
            (",", "and", "or", "by", "with", "of", "to")
        ):
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
        rest = match.group(2)
        rest = re.split(r"\s+[•·●]\s+", rest, maxsplit=1)[0]
        rest = strip_ordering_marker(rest).rstrip(";")
        if len(rest) > 100:
            rest = rest[:97].rsplit(" ", 1)[0] + "…"
        return rest

    title = strip_ordering_marker(first_line).rstrip(",;")
    if len(title) > 100:
        return title[:97].rsplit(" ", 1)[0] + "…"
    return title


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


def _split_numbered_flat(text: str) -> list[str]:
    flattened = clean(text)
    if not flattened:
        return []
    markers = re.findall(
        r"(?<!Block )(?<!Item )\b\d{1,2}\.\s*[A-Za-z]",
        flattened,
    )
    starts_with_number = bool(re.match(r"\d{1,2}\.\s*[A-Za-z]", flattened))
    if len(markers) > 1 or (len(markers) >= 1 and not starts_with_number):
        parts = [
            strip_ordering_marker(part)
            for part in _INLINE_NUMBER_SPLIT.split(flattened)
            if clean(part)
        ]
        return [
            part
            for part in parts
            if part and not re.fullmatch(r"Block\s+\d+", part, re.I)
        ]
    return [strip_ordering_marker(flattened)]


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
        if _NOTE_PREFIX.match(line):
            if current:
                items.append(clean(current))
                current = ""
            items.append(clean(line))
            continue
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
        flattened = clean(raw)
        expanded: list[str] = []
        # Bullets first, then number-split each fragment.
        if "•" in flattened or "·" in flattened or "●" in flattened:
            bullet_parts = re.split(r"\s*[•·●]\s*", flattened)
        else:
            bullet_parts = [flattened]
        for part in bullet_parts:
            expanded.extend(_split_numbered_flat(part))
        expanded = [part for part in expanded if part]
        if len(expanded) > 1 or (
            expanded and expanded != [strip_ordering_marker(flattened)]
        ):
            return tuple(expanded)
        return (strip_ordering_marker(flattened),) if flattened else ()

    return tuple(
        strip_ordering_marker(item)
        for item in items
        if item and not _DECORATIVE.fullmatch(item)
    )


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
            "cta",
            "mra",
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
            "summary",
            "letter",
            "documentation",
            "statement",
        )
    ):
        return RequirementKind.DOCUMENT
    if "evaluation" in lower or "exam" in lower or "assessment" in lower:
        return RequirementKind.EVALUATION
    if lower.startswith("note"):
        return RequirementKind.OTHER
    return RequirementKind.OTHER


def extract_requirements(text: str | None) -> tuple[Requirement, ...]:
    items = split_items(text)
    requirements: list[Requirement] = []
    for raw_item in items:
        item = peel_requirement_prefix(raw_item)
        item = strip_ordering_marker(item)
        if len(item) < 8:
            continue
        if is_boilerplate_header(item):
            continue
        # Notes are sidecars, not bring-list rows.
        if _NOTE_PREFIX.match(item):
            continue
        if item.lower().startswith("if the ame can determine"):
            requirements.append(
                Requirement(text=item, kind=RequirementKind.EVALUATION)
            )
            continue
        # A peeled header may leave a numbered blob — split again.
        nested = (
            split_items(item)
            if re.search(r"\b\d{1,2}\.\s+[A-Za-z]", item)
            else (item,)
        )
        if len(nested) > 1:
            for part in nested:
                part = peel_requirement_prefix(strip_ordering_marker(part))
                if len(part) < 8 or is_boilerplate_header(part):
                    continue
                if _NOTE_PREFIX.match(part):
                    continue
                requirements.append(
                    Requirement(text=part, kind=requirement_kind(part))
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
            cleaned = strip_ordering_marker(item)
            if cleaned and cleaned not in notes:
                notes.append(cleaned)
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


def normalize_action(text: str | None) -> str:
    """Clean action prose: strip ordering markers and trailing disposition tokens."""

    value = strip_trailing_disposition(text)
    value = strip_ordering_marker(value)
    return value


def repair_condition_category(
    condition: str | None, category: str | None
) -> tuple[str, str]:
    """Fix common title/category inversions left by older heading parses."""

    from .page_types import (
        is_criteria_subtitle_line,
        is_heading_noise_line,
        is_section_label_line,
        is_synonym_paren_line,
        is_valid_condition_title,
    )

    raw_condition = clean(condition)
    category_value = (
        clean(category)
        .replace("\u2013", "-")
        .replace("\u2014", "-")
        .rstrip(":")
        .strip()
    )

    def _usable_category(value: str) -> bool:
        if not value or value.upper().startswith("ITEM "):
            return False
        return is_valid_condition_title(value)

    # Updates banners / intro prose / criteria accidentally stored as condition.
    if (
        is_heading_noise_line(raw_condition)
        or is_criteria_subtitle_line(raw_condition)
        or (
            raw_condition
            and not is_valid_condition_title(raw_condition)
            and not is_synonym_paren_line(raw_condition)
        )
    ) and _usable_category(category_value):
        return category_value, ""

    # Parenthetical lead-in with trailing qualifier, e.g.
    # "(Intracranial aneurysm) Not Ruptured"
    if (
        raw_condition.startswith("(")
        and ")" in raw_condition
        and _usable_category(category_value)
    ):
        inner, _, rest = raw_condition[1:].partition(")")
        inner = inner.strip()
        rest = rest.strip(" -–—")
        if inner.lower().startswith(("use for", "update")):
            return category_value, ""
        if rest:
            return f"{category_value} ({inner}) {rest}".strip(), ""
        return f"{category_value} ({inner})", ""

    # Parenthetical-only title with no usable category — keep the inner name.
    if is_synonym_paren_line(raw_condition):
        inner = raw_condition.strip()[1:-1].strip()
        if not inner.lower().startswith(("use for", "update", "continued")):
            return normalize_condition_name(inner), category_value

    # Orphan synonym fragment joined to section label.
    if (
        raw_condition.endswith(")")
        and "(" not in raw_condition
        and _usable_category(category_value)
    ):
        return f"{category_value} ({raw_condition.rstrip(')').strip()})", ""

    condition_value = normalize_condition_name(raw_condition)

    # Disease title duplicated into category (NOSE-style labels are fine).
    if (
        category_value
        and condition_value
        and category_value.upper() == condition_value.upper().split("(")[0].strip()
        and not is_section_label_line(category_value)
    ):
        return condition_value, ""

    if not is_valid_condition_title(condition_value) and _usable_category(category_value):
        return category_value, ""

    return condition_value, category_value


def normalize_record_dict(record: dict) -> dict:
    """Clean a serialized guidance record for storage / UI consumption."""

    scenario = normalize_scenario_title(
        record.get("subcondition") or record.get("scenario") or ""
    ) or strip_ordering_marker(record.get("scenario") or "")
    action = normalize_action(record.get("action") or "")

    requirements: list[dict] = []
    seen: set[str] = set()

    # Prefer re-splitting from raw_text when it still holds the full list blob.
    raw_text = strip_trailing_disposition(record.get("raw_text") or "")
    joined_reqs = "\n".join(
        str(req.get("text") or "") for req in record.get("requirements") or []
    )
    source_blobs = []
    if raw_text and len(raw_text) >= len(joined_reqs):
        source_blobs.append(raw_text)
    if joined_reqs:
        source_blobs.append(joined_reqs)
    if not source_blobs:
        source_blobs.append("")

    for blob in source_blobs:
        extracted = extract_requirements(blob)
        if extracted:
            for item in extracted:
                text = item.text
                if scenario and text.lower().startswith(scenario.lower()):
                    remainder = text[len(scenario) :].lstrip(" :-")
                    if remainder:
                        text = peel_requirement_prefix(remainder)
                        text = strip_ordering_marker(text)
                    else:
                        continue
                if len(text) < 8 or is_boilerplate_header(text):
                    continue
                key = text.lower()
                if key in seen:
                    continue
                if scenario and key == scenario.lower():
                    continue
                seen.add(key)
                requirements.append(
                    {"kind": requirement_kind(text).value, "text": text}
                )
            if requirements:
                break
    else:
        for req in record.get("requirements") or []:
            text = strip_ordering_marker(
                peel_requirement_prefix(str(req.get("text") or ""))
            )
            if (
                len(text) < 8
                or is_boilerplate_header(text)
                or _NOTE_PREFIX.match(text)
            ):
                continue
            key = text.lower()
            if key in seen:
                continue
            seen.add(key)
            kind = str(req.get("kind") or requirement_kind(text).value)
            requirements.append({"kind": kind, "text": text})

    medication_notes = [
        strip_ordering_marker(note)
        for note in record.get("medication_notes") or []
        if strip_ordering_marker(note)
    ]

    raw_text = strip_ordering_marker(raw_text)
    condition, category = repair_condition_category(
        record.get("condition") or "",
        record.get("category") or "",
    )

    # Prefer predetermined browse categories over noisy PDF headings.
    section = ""
    source = record.get("source")
    if isinstance(source, dict):
        section = str(source.get("section") or "")
    category = resolve_category(condition, category, section)

    out = dict(record)
    out["scenario"] = scenario
    out["subcondition"] = scenario or None
    out["action"] = action
    out["requirements"] = requirements
    out["medication_notes"] = medication_notes
    out["raw_text"] = raw_text
    out["condition"] = condition
    out["category"] = category
    if isinstance(source, dict):
        out["source"] = {**source, "section": category}
    return out
