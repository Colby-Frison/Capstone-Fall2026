"""Table-driven tests for the text predicates behind AME page classification."""

import pytest

from ame_parser.page_types import (
    PageRole,
    classify_ame_page,
    has_new_condition_block,
    is_browse_section_label,
    is_class_scope_line,
    is_criteria_subtitle_line,
    is_heading_noise_line,
    is_section_label_line,
    is_synonym_paren_line,
    is_valid_condition_title,
    is_valid_scenario,
    page_has_disposition_table,
)
from ame_parser.pdf import PageData


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("All Classes", True),
        ("(All classes)", True),
        ("All Classes (Continued)", True),
        ("", False),
        ("All pilots", False),
    ],
)
def test_is_class_scope_line(text, expected) -> None:
    assert is_class_scope_line(text) is expected


@pytest.mark.parametrize(
    "text",
    [
        None,
        "All Classes",
        "(Continued)",
        "(Updates 04/2024)",
        "(Updated 2023)",
        "Updated 05/27/2020",
        "III. AEROSPACE MEDICAL DISPOSITION",
        "The following table lists conditions",
        "Medical certificates must not be issued",
        "Incapacitation risk is considered",
        (
            "This is a long explanatory paragraph that sits above the table and "
            "explains how examiners should read the rows that follow it"
        ),
    ],
)
def test_heading_noise_lines(text) -> None:
    assert is_heading_noise_line(text) is True


@pytest.mark.parametrize(
    "text",
    [
        "MIGRAINE",
        (
            "SEIZURE DISORDER (Epilepsy, convulsions and other related events that "
            "are described in the protocol for the examiner)"
        ),
    ],
)
def test_condition_titles_are_not_noise(text) -> None:
    assert is_heading_noise_line(text) is False


def test_synonym_paren_line() -> None:
    assert is_synonym_paren_line("(Seizure Disorder)")
    assert not is_synonym_paren_line("Seizure Disorder")
    assert not is_synonym_paren_line("(ab)")


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("", False),
        ("1. First episode", True),
        ("Coronary stenosis greater than 70%", True),
        ("CABG", True),
        (
            "Pilots who have had a single uncomplicated episode that resolved fully within a year",
            True,
        ),
        ("MIGRAINE", False),
    ],
)
def test_is_criteria_subtitle_line(text, expected) -> None:
    assert is_criteria_subtitle_line(text) is expected


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("NOSE", True),
        ("EYES - PROCEDURES", True),
        ("ITEM 31. EYES", False),
        ("Nose", False),
        ("", False),
        ("AB", False),
    ],
)
def test_is_section_label_line(text, expected) -> None:
    assert is_section_label_line(text) is expected


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Neurology", True),
        ("nose and sinuses", True),
        ("Migraine", False),
        (None, False),
    ],
)
def test_is_browse_section_label(text, expected) -> None:
    assert is_browse_section_label(text) is expected


@pytest.mark.parametrize(
    "text",
    [
        None,
        "UNKNOWN",
        "All Classes",
        "Neurology",
        "(Continued)",
        "AASI for Migraine",
        "AME ASSISTED SPECIAL ISSUANCE",
        "Guide Official Revision Description",
        "REASON FOR UPDATE",
        "(01/02/2024)",
        "III. Disposition",
        "AEROSPACE MEDICAL DISPOSITION THE FOLLOWING",
        "THE DISPOSITION TABLE LISTS",
        "THE FOLLOWING IS A TABLE",
        "lowercase start",
        "X" * 181,
        (
            "This condition is described here in long prose that keeps going and going "
            "with many words that are clearly not a disease title at all."
        ),
    ],
)
def test_invalid_condition_titles(text) -> None:
    assert is_valid_condition_title(text) is False


@pytest.mark.parametrize("text", ["MIGRAINE", "Acoustic Neuroma", "ALLERGIES (Hay fever)"])
def test_valid_condition_titles(text) -> None:
    assert is_valid_condition_title(text) is True


@pytest.mark.parametrize(
    "text",
    [
        "",
        "short",
        "MONTHS.",
        "All Classes",
        "Treated with",
        "Submitted to the FAA",
        "Revise the protocol",
        "lowercase evaluation shred",
        "Copies of all records",
        "Progress note from the treating physician",
    ],
)
def test_invalid_scenarios(text) -> None:
    assert is_valid_scenario(text) is False


@pytest.mark.parametrize(
    "text", ["A. Allergies controlled by medication", "Single episode, resolved"]
)
def test_valid_scenarios(text) -> None:
    assert is_valid_scenario(text) is True


def test_page_has_disposition_table_from_text_header() -> None:
    page = PageData(1, "DISEASE/CONDITION EVALUATION DATA\nrow text")
    assert page_has_disposition_table(page)
    assert not page_has_disposition_table(PageData(1, "Disease/condition prose"))


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("no header here", False),
        ("Guide for Aviation Medical Examiners\n12\nDISEASE/CONDITION", False),
        ("Guide\nITEM 46. Neurologic\nDISEASE/CONDITION", True),
        ("Guide\nMIGRAINE AND HEADACHE\nDISEASE/CONDITION", True),
        ("Guide\nAcoustic Neuroma Tumor\nDISEASE/CONDITION", True),
        ("Guide\nSee the protocol\nDISEASE/CONDITION", False),
    ],
)
def test_has_new_condition_block(text, expected) -> None:
    assert has_new_condition_block(text) is expected


@pytest.mark.parametrize(
    ("page", "role"),
    [
        (PageData(1, "TABLE OF CONTENTS\nChapter ........ 5"), PageRole.TOC),
        (PageData(1, "REVISION HISTORY\nchanges"), PageRole.REVISION_HISTORY),
        (
            PageData(1, "REASON FOR UPDATE\nVERSION DATE"),
            PageRole.REVISION_HISTORY,
        ),
        (PageData(1, "AASI for Migraine\nnarrative"), PageRole.AASI_NARRATIVE),
        (PageData(1, "CACI Worksheet for hypertension"), PageRole.CACI_WORKSHEET),
        (
            PageData(1, "CHECK EACH ITEM IN APPROPRIATE COLUMN"),
            PageRole.CHECKLIST_EXAM,
        ),
        (PageData(1, "Glaucoma Decision Tool"), PageRole.DECISION_TOOL),
        (PageData(1, "Arthritis Status Summary"), PageRole.STATUS_FORM),
        (PageData(1, "FAQ about certification"), PageRole.FAQ_NOTES),
        (
            PageData(1, "reference", tables=((("LIMITATION", "WHEN YOU SEE"), ("a", "b")),)),
            PageRole.OTHER_REFERENCE_TABLE,
        ),
        (PageData(1, "ITEM 47. Psychiatric\nnarrative"), PageRole.EXAM_NARRATIVE),
        (PageData(1, "plain administrative prose"), PageRole.PROSE_ADMIN),
        (PageData(1, "table page", tables=((("a", "b"),),)), PageRole.UNKNOWN),
    ],
)
def test_classify_non_disposition_pages(page, role) -> None:
    assert classify_ame_page(page) is role
