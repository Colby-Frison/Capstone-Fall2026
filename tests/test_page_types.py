"""Unit tests for AME Guide page-role classification."""

from ame_parser.page_types import PageRole, classify_ame_page, is_disposition_role
from ame_parser.pdf import PageData


def test_classifies_clean_disposition_table() -> None:
    page = PageData(
        number=64,
        text=(
            "Guide for Aviation Medical Examiners – Version X\n"
            "ITEM 25. Head, Face, Neck, and Scalp\n"
            "HEAD, FACE, NECK, AND SCALP\n"
            "DISEASE/CONDITION CLASS EVALUATION DATA DISPOSITION\n64"
        ),
        tables=(
            (
                ("DISEASE/CONDITION", "CLASS", "EVALUATION DATA", "DISPOSITION"),
                ("Active fistula", "All", "Submit note", "DEFER"),
            ),
        ),
    )
    role = classify_ame_page(page)
    assert role is PageRole.DISPOSITION_TABLE
    assert is_disposition_role(role)


def test_classifies_continuation_without_condition_block() -> None:
    page = PageData(
        number=66,
        text=(
            "Guide for Aviation Medical Examiners\n"
            "DISEASE/CONDITION EVALUATION DATA DISPOSITION\n66"
        ),
        tables=(
            (
                ("DISEASE/CONDITION", "EVALUATION DATA", "DISPOSITION"),
                ("", "continued evaluation text", ""),
            ),
        ),
    )
    assert classify_ame_page(page) is PageRole.CONTINUATION_DISPOSITION


def test_skips_checklist_caci_and_prose() -> None:
    checklist = PageData(
        number=88,
        text=(
            "Guide for Aviation Medical Examiners\n"
            "ITEM 31. Eyes\n"
            "CHECK EACH ITEM IN APPROPRIATE COLUMN\n"
            "Normal Abnormal\n88"
        ),
        tables=(),
    )
    caci = PageData(
        number=173,
        text=(
            "Guide for Aviation Medical Examiners\n"
            "CACI - Hypertension Worksheet\n"
            "Applicant meets worksheet criteria\n173"
        ),
        tables=((("Checkbox", "Criteria"), ("Yes", "BP controlled")),),
    )
    prose = PageData(
        number=30,
        text=(
            "Guide for Aviation Medical Examiners\n"
            "13. Validity of medical certificates\n"
            "A medical certificate is valid...\n30"
        ),
        tables=(),
    )
    assert classify_ame_page(checklist) is PageRole.CHECKLIST_EXAM
    assert classify_ame_page(caci) is PageRole.CACI_WORKSHEET
    assert classify_ame_page(prose) is PageRole.PROSE_ADMIN
    assert not is_disposition_role(PageRole.CHECKLIST_EXAM)


def test_skips_revision_history_and_aasi_narrative() -> None:
    revision = PageData(
        number=769,
        text=(
            "Guide for Aviation Medical Examiners\n"
            "Guide Official Revision Description Reason for Update\n"
            "Version Date Number Of Change\n"
            "2026 07/29/2026 7 Medical Policy In Item 48 added Disposition Table.\n769"
        ),
        tables=((("2026", "07/29/2026", "7", "Medical Policy", "In Item 48"),),),
    )
    aasi = PageData(
        number=685,
        text=(
            "Guide for Aviation Medical Examiners\n"
            "AASI for Asthma\n"
            "Note: If the applicant has mild symptoms...\n"
            "AME Assisted Special Issuance (AASI) is a process...\n"
            "an AASI for the above disease/condition, and the applicant\n685"
        ),
        tables=((("Annual, current, detailed Clinical Progress Note",),),),
    )
    assert classify_ame_page(revision) is PageRole.REVISION_HISTORY
    assert classify_ame_page(aasi) is PageRole.AASI_NARRATIVE
    assert not is_disposition_role(PageRole.REVISION_HISTORY)
    assert not is_disposition_role(PageRole.AASI_NARRATIVE)
