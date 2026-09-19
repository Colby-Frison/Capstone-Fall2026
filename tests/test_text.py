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


def test_extract_requirements_drops_headers_and_keeps_items() -> None:
    requirements = extract_requirements(
        "Submit the following for FAA review:\n"
        "1. Current neurological evaluation.\n"
        "2. MRI performed within 90 days.\n"
        "Note(s): See seizure section."
    )
    assert [item.text for item in requirements] == [
        "Current neurological evaluation.",
        "MRI performed within 90 days.",
    ]


def test_extract_requirements_splits_semicolon_checklist() -> None:
    blob = (
        "All Submit the following to the FAA for review: A current, detailed "
        "Clinical Progress Note generated from a clinic visit with the treating "
        "oncologist no more than 90 days before the AME exam. It must specifically "
        "include Initial staging; o Treatments used; o How long the condition has "
        "been o stable or in remission; Recurrence(s); o Risk of recurrence; and "
        "Medication list: Dates started and stopped. Operative notes and discharge "
        "summary (if applicable); Copies of lab including pathology reports; "
        "Copies of imaging reports from testing already performed. The AME must "
        "review an oncology evaluation performed within the previous 12 months. "
        "DEFER Submit the information to the FAA for a possible Special Issuance."
    )
    requirements = extract_requirements(blob)
    texts = [item.text for item in requirements]
    assert any("Clinical Progress Note" in text for text in texts)
    assert "Initial staging" in texts
    assert "Treatments used" in texts
    assert "Recurrence(s)" in texts
    assert any("oncology evaluation" in text for text in texts)
    assert all("DEFER" not in text for text in texts)
    assert all(not text.startswith("All ") for text in texts)
    assert len(texts) >= 6


def test_extract_requirements_strips_issue_action_glue() -> None:
    requirements = extract_requirements(
        "All The AME must review an oncology evaluation performed within the "
        "previous 12 months. If the oncology evaluation verifies the individual "
        "is cured, with no follow up treatment required: ISSUE Summarize this "
        "history in Block 60 and submit the evaluation to the FAA for retention "
        "in the pilot’s file"
    )
    assert len(requirements) == 1
    text = requirements[0].text
    assert text.startswith("The AME must review an oncology evaluation")
    assert "ISSUE" not in text
    assert "Block 60" not in text


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
    assert (
        normalize_scenario_title(
            "A. Allergies controlled by acceptable medications\nAllergy shots/SLIT"
        )
        == "Allergies controlled by acceptable medications"
    )


def test_repair_condition_category_joins_synonyms() -> None:
    from ame_parser.text import repair_condition_category

    assert repair_condition_category("(Seizure Disorder)", "EPILEPSY") == (
        "EPILEPSY (Seizure Disorder)",
        "",
    )
    assert repair_condition_category("(Updates 08/27/2025)", "EYES - PROCEDURES") == (
        "EYES - PROCEDURES",
        "",
    )
    assert repair_condition_category(
        "50% stenosis or higher; intervention (Stent)",
        "CORONARY HEART DISEASE",
    ) == ("CORONARY HEART DISEASE", "")


def test_resolve_category_uses_dictionary() -> None:
    from ame_parser.categories import resolve_category

    assert resolve_category("EPILEPSY (Seizure Disorder)") == "Neurology"
    assert resolve_category("ARRHYTHMIAS") == "Cardiovascular"
    assert resolve_category("ALLERGIES", "NOSE") == "Nose and Sinuses"
    assert resolve_category("PUPILS", "ITEM 33. Pupils") == "Eyes"
    assert resolve_category(
        "OUTER EAR ABNORMALITIES (Cerumen Impaction, Otitis Externa, Microtia)"
    ) == "Ears"
    assert (
        resolve_category("WOLFF PARKINSON WHITE (WPW) and other pre-excitation conditions")
        == "Cardiovascular"
    )


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


def test_promote_section_label_condition_to_disease_title() -> None:
    from ame_parser.text import promote_section_label_condition

    condition, scenario, category = promote_section_label_condition(
        "Neurology",
        "Epilepsy (Seizure Disorder)",
        None,
    )
    assert condition == "Epilepsy (Seizure Disorder)"
    assert scenario == "General pathway"
    assert category == "Neurology"


def test_is_valid_scenario_rejects_class_only_and_shreds() -> None:
    from ame_parser.page_types import is_valid_scenario

    assert not is_valid_scenario("All classes")
    assert not is_valid_scenario("All Classes (Continued)")
    assert not is_valid_scenario("Symptoms resolved with")
    assert not is_valid_scenario("A current, detailed neurological evaluation")
    assert is_valid_scenario("All others")
    assert is_valid_scenario("Treatment completed ten (10) or more years ago")


def test_cross_reference_disposition_stays_unknown() -> None:
    from ame_parser.text import classify_disposition, is_cross_reference_disposition

    assert is_cross_reference_disposition("See CAD protocol")
    assert is_cross_reference_disposition("See disposition table on page 12")
    disposition, warnings = classify_disposition("See CAD protocol")
    assert disposition is Disposition.UNKNOWN
    assert "cross_reference" in warnings


def test_requirement_role_and_required_flags() -> None:
    from ame_parser.models import RequirementRole

    requirements = extract_requirements(
        "Submit the following for FAA review:\n"
        "1. Clinical Progress Note.\n"
        "2. MRI if already performed.\n"
        "3. The AME must review a neurological evaluation within 12 months."
    )
    progress = next(item for item in requirements if "Clinical Progress" in item.text)
    mri = next(item for item in requirements if "MRI" in item.text)
    ame = next(item for item in requirements if "AME must" in item.text)
    assert progress.role is RequirementRole.BRING_LIST
    assert progress.required is True
    assert mri.role is RequirementRole.BRING_LIST
    assert mri.required is False
    assert ame.role is RequirementRole.AME_REVIEW
    assert ame.required is False
