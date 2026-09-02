"""
Unit tests for AMEParser.py
Run with: python -m pytest test_ame_rules.py -v
"""

import pytest
from AMEParser import clean, get_decision, get_checklist, get_time_constraints, extract_condition_name, build_rule


# ---------------------------------------------------------------------------
# clean()
# ---------------------------------------------------------------------------

def test_clean_collapses_whitespace():
    assert clean("hello   world") == "hello world"

def test_clean_removes_newlines():
    assert clean("hello\nworld") == "hello world"

def test_clean_strips_edges():
    assert clean("  hello  ") == "hello"

def test_clean_handles_none():
    assert clean(None) == ""


# ---------------------------------------------------------------------------
# get_decision()
# ---------------------------------------------------------------------------

def test_get_decision_issue():
    assert get_decision("AME may issue") == "ISSUE"

def test_get_decision_defer():
    assert get_decision("Defer to FAA") == "DEFER"

def test_get_decision_deny():
    assert get_decision("Deny the certificate") == "DENY"

def test_get_decision_special_issuance():
    assert get_decision("Special Issuance required") == "SPECIAL ISSUANCE"

def test_get_decision_defer_takes_priority_over_issue():
    # DEFER is checked before ISSUE, so this should return DEFER
    assert get_decision("Defer, do not issue") == "DEFER"

def test_get_decision_unknown():
    assert get_decision("No matching keyword") == "UNKNOWN"

def test_get_decision_none():
    assert get_decision(None) == "UNKNOWN"

def test_get_decision_case_insensitive():
    assert get_decision("defer") == "DEFER"

def test_get_decision_issue_in_action_text():
    # "AME may issue and note this in Block 60" should still resolve to ISSUE
    # (regression test: old code would have dropped this line from action_required)
    assert get_decision("ISSUE\nAME may issue and note this in Block 60.") == "ISSUE"


# ---------------------------------------------------------------------------
# get_checklist()
# ---------------------------------------------------------------------------

def test_get_checklist_basic():
    text = "- No history of syncope\n- On approved medication"
    assert get_checklist(text) == ["No history of syncope", "On approved medication"]

def test_get_checklist_wrapped_line():
    # A non-bullet line should be appended to the previous bullet
    text = "- No history of syncope\n  in the past 5 years"
    assert get_checklist(text) == ["No history of syncope in the past 5 years"]

def test_get_checklist_various_bullet_chars():
    text = "• Item one\n· Item two\n● Item three"
    assert get_checklist(text) == ["Item one", "Item two", "Item three"]

def test_get_checklist_null_byte_bullet():
    # \x00 is a PDF encoding artifact used as a bullet character in some FAA pages
    text = "\x00 HIV status is negative;\n\x00 No side effects from the medication."
    result = get_checklist(text)
    assert result == ["HIV status is negative;", "No side effects from the medication."]

def test_get_checklist_numbered_items():
    # Numbered items like "1." should be treated as list markers, not plain text
    text = "1. Clinical Progress Note\n2. Lab results no more than 90 days old"
    result = get_checklist(text)
    assert result == ["Clinical Progress Note", "Lab results no more than 90 days old"]

def test_get_checklist_plain_text_no_bullets():
    # Plain prose with no bullet markers should be captured as a single item
    text = "See the CACI Worksheet.\nThis will require a current clinical note."
    result = get_checklist(text)
    assert len(result) >= 1
    assert "See the CACI Worksheet." in result[0]

def test_get_checklist_empty():
    assert get_checklist("") == []

def test_get_checklist_none():
    assert get_checklist(None) == []


# ---------------------------------------------------------------------------
# get_time_constraints()
# ---------------------------------------------------------------------------

def test_get_time_constraints_basic():
    assert get_time_constraints("Stable for 90 days") == ["90 days"]

def test_get_time_constraints_multiple():
    result = get_time_constraints("At least 6 months and no episodes in 2 years")
    assert "6 months" in result
    assert "2 years" in result

def test_get_time_constraints_newline_in_value():
    # Regression test: "90\ndays" from raw PDF text should normalize to "90 days"
    assert get_time_constraints("no more than 90\ndays prior") == ["90 days"]

def test_get_time_constraints_none_found():
    assert get_time_constraints("No time info here") == []

def test_get_time_constraints_none_input():
    assert get_time_constraints(None) == []


# ---------------------------------------------------------------------------
# extract_condition_name()
# ---------------------------------------------------------------------------

def test_extract_condition_name_all_caps():
    # Pass 1: all-caps line — matches pages like HIV and PCOS
    page_text = "Guide for Aviation Medical Examiners – Version 02/25/2026\nHUMAN IMMUNODEFICIENCY VIRUS (HIV)\nAll Classes"
    assert extract_condition_name(page_text) == "HUMAN IMMUNODEFICIENCY VIRUS (HIV)"

def test_extract_condition_name_mixed_case_after_header():
    # Pass 2: mixed-case title immediately after the standard page header
    # Regression test: "Cushing's Syndrome or Cushing's Disease" was returned as "UNKNOWN"
    page_text = (
        "Guide for Aviation Medical Examiners – Version 02/25/2026\n"
        "Cushing\u2019s Syndrome or Cushing\u2019s Disease\n"
        "All Classes\n"
        "(Updated 09/24/2025)"
    )
    assert extract_condition_name(page_text) == "Cushing\u2019s Syndrome or Cushing\u2019s Disease"

def test_extract_condition_name_skips_boilerplate():
    # Lines that are only boilerplate keywords should not be returned
    page_text = "FAA\nAME\nGUIDE\nVERSION"
    assert extract_condition_name(page_text) == "UNKNOWN"

def test_extract_condition_name_unknown_fallback():
    assert extract_condition_name("no all caps headings here") == "UNKNOWN"

def test_extract_condition_name_skips_all_classes_line():
    # "All Classes" should not be mistakenly returned as the condition name
    page_text = (
        "Guide for Aviation Medical Examiners – Version 02/25/2026\n"
        "DIABETES MELLITUS\n"
        "All Classes"
    )
    result = extract_condition_name(page_text)
    assert result != "All Classes"
    assert result == "DIABETES MELLITUS"


# ---------------------------------------------------------------------------
# build_rule()
# ---------------------------------------------------------------------------

def test_build_rule_structure():
    rule = build_rule(
        page_num=3,
        condition_name="HYPERTENSION",
        section="A",
        col0="A. Controlled hypertension",
        col1="- BP under 155/95\n- No cardiac history",
        col2="ISSUE\nSend copy to AMCD"
    )
    assert rule["page"] == 3
    assert rule["condition"] == "HYPERTENSION"
    assert rule["section"] == "A"
    assert rule["decision_logic"]["then"] == "ISSUE"
    assert "BP under 155/95" in rule["decision_logic"]["if_all_checked"]
    assert rule["decision_logic"]["action_required"] == "Send copy to AMCD"

def test_build_rule_action_strips_only_keyword_line():
    # Only the bare "DEFER" line at the top should be removed;
    # subsequent lines containing the word "issue" must be preserved.
    rule = build_rule(1, "TEST", "", "", "", "DEFER\nContact regional office")
    assert rule["decision_logic"]["action_required"] == "Contact regional office"
    assert "DEFER" not in rule["decision_logic"]["action_required"]

def test_build_rule_action_preserves_issue_in_body():
    # Regression test: "AME may issue" in the body was previously dropped
    # because old code stripped any line containing "ISSUE"
    col2 = "ISSUE\nNote this in Block 60.\nAME may issue and note this in Block 60."
    rule = build_rule(1, "HIV", "", "", "", col2)
    assert "AME may issue" in rule["decision_logic"]["action_required"]

def test_build_rule_section_extracted_from_col0():
    rule = build_rule(1, "PCOS", "B", "B. Treated with medication", "", "ISSUE")
    assert rule["section"] == "B"

def test_build_rule_time_constraints_populated():
    rule = build_rule(1, "TEST", "", "", "Stable for 90 days prior to exam", "ISSUE")
    assert "90 days" in rule["decision_logic"]["time_constraints"]