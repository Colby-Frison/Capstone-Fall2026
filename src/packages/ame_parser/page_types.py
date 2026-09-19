"""Page-role classification for variable AME Guide layouts."""

from __future__ import annotations

import re
from enum import Enum

from .pdf import PageData, Table
from .text import clean


class PageRole(str, Enum):
    DISPOSITION_TABLE = "DISPOSITION_TABLE"
    CONTINUATION_DISPOSITION = "CONTINUATION_DISPOSITION"
    CHECKLIST_EXAM = "CHECKLIST_EXAM"
    CACI_WORKSHEET = "CACI_WORKSHEET"
    STATUS_FORM = "STATUS_FORM"
    DECISION_TOOL = "DECISION_TOOL"
    FAQ_NOTES = "FAQ_NOTES"
    PROSE_ADMIN = "PROSE_ADMIN"
    TOC = "TOC"
    REVISION_HISTORY = "REVISION_HISTORY"
    AASI_NARRATIVE = "AASI_NARRATIVE"
    EXAM_NARRATIVE = "EXAM_NARRATIVE"
    OTHER_REFERENCE_TABLE = "OTHER_REFERENCE_TABLE"
    UNKNOWN = "UNKNOWN"


_HEADER_LABEL = re.compile(
    r"^(DISEASE(?:/CONDITION)?|CLASS|EVALUATION(?:\s+DATA)?|DISPOSITION|AME\s+ACTIONS)\b",
    re.I,
)


def is_disposition_role(role: PageRole) -> bool:
    return role in (
        PageRole.DISPOSITION_TABLE,
        PageRole.CONTINUATION_DISPOSITION,
    )


def table_has_disposition_headers(table: Table) -> bool:
    """True when a short header row looks like disease/evaluation/disposition."""

    for row in table[:4]:
        headers = [clean(cell).upper() for cell in row if clean(cell)]
        short = [value for value in headers if len(value) <= 40]
        has_disease = any(
            value.startswith("DISEASE") and _HEADER_LABEL.match(value)
            for value in short
        )
        has_eval = any("EVALUATION" in value for value in short)
        has_disp = any(
            value == "DISPOSITION" or value.startswith("DISPOSITION")
            for value in short
        )
        if has_disease and (has_eval or has_disp):
            return True
    return False


def page_has_disposition_table(page: PageData) -> bool:
    """Require a real table header row — not prose that mentions disease/condition."""

    if any(table_has_disposition_headers(table) for table in page.tables):
        return True
    for line in (page.text or "").splitlines():
        upper = clean(line).upper()
        if upper.startswith("DISEASE/CONDITION") and (
            "DISPOSITION" in upper or "EVALUATION" in upper
        ):
            return True
    return False


def is_class_scope_line(text: str | None) -> bool:
    """True for All Classes / (All classes) scope markers, not disease titles."""

    value = clean(text)
    if not value:
        return False
    return bool(
        re.fullmatch(
            r"\(?\s*All\s+Classes?\s*(?:\(Continued\))?\s*\)?",
            value,
            re.I,
        )
    )


def is_heading_noise_line(text: str | None) -> bool:
    """Lines that appear above disposition tables but are not disease titles."""

    value = clean(text)
    if not value:
        return True
    if is_class_scope_line(value):
        return True
    if re.fullmatch(r"\(?\s*Continued\s*\)?", value, re.I):
        return True
    if re.match(r"^\(Updates?\b", value, re.I):
        return True
    if re.match(r"^\(Updated\b", value, re.I):
        return True
    if re.match(r"^Updated\b", value, re.I):
        return True
    if value.upper().startswith("III."):
        return True
    lower = value.lower()
    if lower.startswith(
        (
            "the following table",
            "the following is a table",
            "action that should",
            "medical certificates must",
            "deferral,",
            "incapacitation",
            "submitted for any condition",
            "medical documentation must",
        )
    ):
        return True
    if len(value) > 90 and not value.isupper() and value.count(" ") > 10:
        # Disease title + synonym parenthetical is not intro prose.
        if re.match(r"^[A-Z0-9][A-Z0-9\s,/;'&-]{2,80}\(", value):
            return False
        letters = re.sub(r"[^A-Za-z]", "", value)
        if letters and sum(1 for char in letters if char.islower()) / len(letters) > 0.4:
            return True
    return False


def is_synonym_paren_line(text: str | None) -> bool:
    """Parenthetical synonym line such as (Seizure Disorder)."""

    value = clean(text)
    return bool(re.fullmatch(r"\([^()]{3,120}\)", value))


def is_criteria_subtitle_line(text: str | None) -> bool:
    """Clinical criteria under a disease title, not the disease name itself."""

    value = clean(text)
    if not value:
        return False
    if re.match(r"^\d", value):
        return True
    lower = value.lower()
    if any(
        token in lower
        for token in (
            "stenosis",
            "intervention (",
            "stent",
            "ptca",
            "cabg",
            "myocardial infarction",
            "acute coronary",
        )
    ):
        return True
    if (
        len(value) > 70
        and not value.isupper()
        and sum(1 for char in value if char.islower()) > 20
    ):
        return True
    return False


def is_section_label_line(text: str | None) -> bool:
    """Short ALL-CAPS system labels (NOSE, EYES - PROCEDURES)."""

    value = clean(text)
    if not value or value.upper().startswith("ITEM "):
        return False
    if not re.match(r"^[A-Z0-9][A-Z0-9\s\-/&:;']*[A-Z0-9)]?$", value):
        return False
    letters = re.sub(r"[^A-Za-z]", "", value)
    return 3 <= len(letters) <= 36 and value.count(" ") <= 5


def is_valid_condition_title(text: str | None) -> bool:
    """Reject AASI prose, revision history, dates, and intro blurbs as titles."""

    value = clean(text)
    if not value or value.upper() == "UNKNOWN":
        return False
    if is_class_scope_line(value):
        return False
    if is_heading_noise_line(value) and not value.isupper():
        return False
    upper = value.upper()
    if upper.startswith("AASI") or "AME ASSISTED SPECIAL ISSUANCE" in upper:
        return False
    if "REVISION DESCRIPTION" in upper or "REASON FOR UPDATE" in upper:
        return False
    if re.fullmatch(r"\(\d{2}/\d{2}/\d{4}\)", value):
        return False
    if re.match(r"^\(Updates?\b", value, re.I):
        return False
    if value.startswith("III.") or "AEROSPACE MEDICAL DISPOSITION THE FOLLOWING" in upper:
        return False
    if "DISPOSITION TABLE LISTS" in upper or "FOLLOWING TABLE LISTS" in upper:
        return False
    if "FOLLOWING IS A TABLE" in upper:
        return False
    if re.match(r"^[a-z]", value):
        return False
    if len(value) > 180:
        return False
    # Reject paragraph-like prose masquerading as a title.
    if (
        value.endswith(".")
        and value.count(" ") > 15
        and not value.isupper()
        and not re.match(r"^[A-Z0-9][A-Z0-9\s,/;'()&-]{8,}$", value)
    ):
        letters = re.sub(r"[^A-Za-z]", "", value)
        if letters and sum(1 for char in letters if char.islower()) / len(letters) > 0.6:
            return False
    return True


def is_valid_scenario(text: str | None) -> bool:
    """Reject shredded fragment cells that are not pathways."""

    value = clean(text)
    if not value or len(value) < 6:
        return False
    upper = value.upper()
    if re.fullmatch(
        r"(OR|AND|C\.|CD\.|MONTHS?\.?|10\.|GUIDE VERSION|\d{4}|SUBMITTED\.?)",
        upper,
    ):
        return False
    if re.fullmatch(r"\(?\s*All\s+Classes?\s*(?:\(Continued\))?\s*\)?", value, re.I):
        return False
    if upper.startswith(
        (
            "SUBMITTED",
            "SUBMIT FOR",
            "REASON FOR UPDATE",
            "GUIDE VERSION",
            "VERSION DATE",
            "IN ITEM ",
            "IN EXAMINATION",
            "IN DISEASE PROTOCOLS",
            "IN AASI",
            "IN ARCHIVES",
            "REVISE ",
            "UPDATE ",
            "INSERT ",
            "CORRECTED ",
            "REMOVE ",
            "REPLACE ",
            "CLARIFIED ",
            "MAXIMAL ",
            "INR VALUES",
            "PHYSICIAN OR AME",
        )
    ):
        return False
    if value.lower() in {"months.", "and", "or"}:
        return False
    # Evaluation shreds often start lowercase or with list/document phrasing.
    if value[0].islower():
        return False
    if value.lower().startswith(
        (
            "the following",
            "a detailed",
            "a current",
            "copies of",
            "generated from",
            "visit with",
            "treating ",
            "progress note",
            "report",
            "readable format",
            "any other testing",
            "deemed clinically",
            "meets faa",
            "neuropsychological",
            "be required",
            "information",
            "current medications",
            "physical exam",
            "assessment and plan",
            "follow-up",
            "after a ",
            "obtain the",
            "submit for",
            "submit the",
            "in the acute",
            "days before",
            "specifications for",
            "specifically include",
            "medication is currently",
            "carbonate",
            "citrate",
            "supplements",
            "with medications",
        )
    ):
        return False
    return True


def has_new_condition_block(text: str) -> bool:
    """Detect ITEM / ALL-CAPS condition titles before the disposition table."""

    lines = [clean(line) for line in text.splitlines() if clean(line)]
    try:
        end = next(
            index
            for index, line in enumerate(lines)
            if "DISEASE/CONDITION" in line.upper()
        )
    except StopIteration:
        return False

    body = lines[1:end] if lines else []
    meaningful = [
        line
        for line in body
        if not re.match(
            r"^(Guide for Aviation|Version|\(Updated|Updated|All Classes|--\s*\d)",
            line,
            re.I,
        )
        and not re.fullmatch(r"\d{1,4}", line)
    ]
    if not meaningful:
        return False
    if any(line.upper().startswith("ITEM ") for line in meaningful):
        return True
    for line in meaningful:
        if not is_valid_condition_title(line):
            continue
        letters = re.sub(r"[^A-Za-z]", "", line)
        if len(letters) >= 8 and letters.isupper():
            return True
        if re.match(r"^[A-Z][A-Za-z].{6,}", line) and not line.upper().startswith(
            ("CHECK ", "NOTE:", "SEE ", "THE ", "AASI")
        ):
            if len(line) <= 120 and not line.endswith("."):
                return True
    return False


def classify_ame_page(page: PageData) -> PageRole:
    """Label an AME Guide page before pathway extraction."""

    text = page.text or ""
    upper = text.upper()

    if re.search(r"TABLE OF CONTENTS|\.{5,}", text) and "DISEASE/CONDITION" not in upper:
        if "ITEM " not in upper[:500]:
            return PageRole.TOC

    if (
        "GUIDE OFFICIAL REVISION DESCRIPTION" in upper
        or "REVISION HISTORY" in upper
        or (
            "REASON FOR UPDATE" in upper
            and ("VERSION DATE" in upper or "NUMBER OF CHANGE" in upper)
        )
        or ("VERSION" in upper and "DESCRIPTION OF CHANGE" in upper)
    ):
        return PageRole.REVISION_HISTORY

    if re.search(r"^AASI\s+FOR\b|AME ASSISTED SPECIAL ISSUANCE", text, re.M | re.I):
        if not any(table_has_disposition_headers(table) for table in page.tables):
            return PageRole.AASI_NARRATIVE

    if "CACI" in upper and ("WORKSHEET" in upper or "CERTIFICATE" in upper):
        return PageRole.CACI_WORKSHEET

    if "CHECK EACH ITEM IN APPROPRIATE COLUMN" in upper or (
        "NORMAL" in upper
        and "ABNORMAL" in upper
        and "ITEM " in upper
        and not page_has_disposition_table(page)
    ):
        return PageRole.CHECKLIST_EXAM

    if any(
        phrase in upper
        for phrase in (
            "STATUS SUMMARY",
            "QUALITY OF VISION QUESTIONNAIRE",
            "DECISION TOOL",
            "WORKSHEET",
        )
    ) and not page_has_disposition_table(page):
        if "DECISION TOOL" in upper:
            return PageRole.DECISION_TOOL
        return PageRole.STATUS_FORM

    if re.search(r"\bFAQS?\b|FREQUENTLY ASKED", upper) and not page_has_disposition_table(
        page
    ):
        return PageRole.FAQ_NOTES

    if page.tables and not page_has_disposition_table(page):
        for table in page.tables:
            headers = " ".join(
                clean(cell).upper() for row in table[:2] for cell in row if clean(cell)
            )
            if any(
                token in headers
                for token in (
                    "LIMITATION",
                    "WHEN YOU SEE",
                    "IT MEANS",
                    "SITUATION",
                    "AMCS",
                )
            ):
                return PageRole.OTHER_REFERENCE_TABLE

    if page_has_disposition_table(page):
        if has_new_condition_block(text):
            return PageRole.DISPOSITION_TABLE
        return PageRole.CONTINUATION_DISPOSITION

    if re.search(r"^ITEM\s+\d+", text, re.M | re.I) and not page_has_disposition_table(
        page
    ):
        return PageRole.EXAM_NARRATIVE

    if not page.tables:
        return PageRole.PROSE_ADMIN

    return PageRole.UNKNOWN
