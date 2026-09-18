from ame_parser.models import Disposition, RequirementKind
from ame_parser.text import (
    classify_disposition,
    clean,
    extract_requirements,
    extract_time_constraints,
    printed_page,
    split_items,
)


def test_clean_collapses_pdf_artifacts() -> None:
    assert clean("  Clinical\x00\n Note  ") == "Clinical Note"


def test_disposition_precedence_and_reviewed_mapping() -> None:
    assert classify_disposition("DEFER - do not issue")[0] is Disposition.DEFER
    disposition, warnings = classify_disposition("Requires FAA Decision")
    assert disposition is Disposition.DEFER
    assert warnings == ("requires_faa_decision_mapped_to_defer",)
    assert classify_disposition("Special Issuance")[0] is Disposition.SPECIAL_ISSUANCE


def test_split_items_reconstructs_wrapped_numbered_requirements() -> None:
    text = (
        "Submit the following:\n"
        "1. Current neurological\n evaluation.\n"
        "2. MRI performed within 90 days."
    )
    assert split_items(text) == (
        "Submit the following:",
        "Current neurological evaluation.",
        "MRI performed within 90 days.",
    )


def test_requirements_are_typed_without_removing_source_wording() -> None:
    requirements = extract_requirements(
        "1. Current Clinical Progress Note\n2. MRI brain imaging\n3. Medication list"
    )
    assert [item.kind for item in requirements] == [
        RequirementKind.DOCUMENT,
        RequirementKind.TEST,
        RequirementKind.MEDICATION,
    ]
    assert requirements[0].text == "Current Clinical Progress Note"


def test_normalize_scenario_and_condition_titles() -> None:
    from ame_parser.text import normalize_condition_name, normalize_scenario_title

    assert normalize_condition_name("ANOSMIA*") == "ANOSMIA"
    assert normalize_condition_name("SINUSITIS(Acute)") == "SINUSITIS (Acute)"
    assert normalize_scenario_title(
        "A. Allergies controlled by acceptable medications\nAllergy shots/SLIT"
    ).startswith("A. Allergies controlled")


def test_medication_notes_ignore_evaluation_blobs() -> None:
    from ame_parser.text import extract_medication_notes

    notes = extract_medication_notes(
        "Submit the following for FAA review: A current Clinical Progress Note "
        "including current medications, dosage, and side effects.",
        "Warn for any required no fly time for sedating antihistamine medications.",
    )
    assert notes == (
        "Warn for any required no fly time for sedating antihistamine medications.",
    )


def test_printed_page_supports_both_document_footer_styles() -> None:
    assert printed_page("content\n64") == "64"
    assert printed_page("content\n-- 5 of 369 --") == "5"
    assert printed_page("content only") is None


def test_time_constraints_keep_relational_meaning() -> None:
    assert extract_time_constraints(
        "Treated less than 5 years ago; note generated no more than 90 days ago"
    ) == ("less than 5 years", "no more than 90 days")
    assert extract_time_constraints("Stable for 5 or more years") == (
        "5 or more years",
    )
