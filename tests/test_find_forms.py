"""Unit tests for form detection used to build form_links.json."""

import json
from pathlib import Path

from ame_parser.find_forms import (
    CLINICAL_PROGRESS_NOTE_URL,
    FAA_FORM_8500_7_URL,
    find_forms,
    forms_for_text,
    main,
)


def test_no_forms_for_unrelated_text() -> None:
    assert forms_for_text("Annotate Block 60.") == []


def test_named_status_summary_and_questionnaire() -> None:
    forms = forms_for_text(
        "Submit the Diabetes Mellitus Status Summary and the Sleep Apnea Questionnaire."
    )
    assert [form["Form Type"] for form in forms] == [
        # Only the capitalized words directly before the form name are kept.
        "Diabetes Mellitus Status Summary",
        "Sleep Apnea Questionnaire",
    ]
    assert all(form["Url"] == "" for form in forms)


def test_unnamed_status_summary_and_questionnaire_fall_back() -> None:
    forms = forms_for_text("see status Status Summary; and questionnaire: Questionnaire")
    assert [form["Form Type"] for form in forms] == ["Status Summary", "Questionnaire"]


def test_clinical_progress_note_and_form_8500_7_have_links() -> None:
    forms = forms_for_text("Provide a status report and FAA Form 8500-7.")
    assert forms == [
        {"Form Type": "Clinical Progress Note / Status Report", "Url": CLINICAL_PROGRESS_NOTE_URL},
        {"Form Type": "FAA Form 8500-7", "Url": FAA_FORM_8500_7_URL},
    ]


def test_records_are_grouped_by_condition_without_duplicates() -> None:
    records = [
        {"condition": "ASTHMA", "raw_text": "Clinical Progress Note"},
        {"condition": "ASTHMA", "raw_text": "Clinical Progress Note and FAA Form 8500-7"},
        {"condition": "ACNE", "raw_text": "No forms"},
    ]
    result = find_forms(records)
    assert list(result) == ["ASTHMA"]
    assert [form["Form Type"] for form in result["ASTHMA"]] == [
        "Clinical Progress Note / Status Report",
        "FAA Form 8500-7",
    ]


def test_main_reads_input_and_writes_output(tmp_path: Path) -> None:
    source = tmp_path / "guide.json"
    source.write_text(
        json.dumps({"records": [{"condition": "GLAUCOMA", "raw_text": "status report"}]}),
        encoding="utf-8",
    )
    output = tmp_path / "form_links.json"
    returned = main(source, output)
    assert json.loads(output.read_text(encoding="utf-8")) == returned
    assert list(returned) == ["GLAUCOMA"]
