"""
CS 4273 – Capstone | Fall 2026 | GROUP F

Unit tests for get_decision() — Python port matching AMEParserTest.js / .cpp.

Run with:
  python -m pytest AMEParserTest.py -v
"""

from __future__ import annotations


def get_decision(text: str | None) -> str:
    """
    Pull the disposition keyword out of the raw cell text.
    DEFER/DENY are checked before ISSUE to avoid false matches
    (e.g., 'do not issue' would incorrectly match ISSUE otherwise).
    """
    upper = (text or "").upper()

    if "DEFER" in upper:
        return "DEFER"
    if "DENY" in upper:
        return "DENY"
    if "SPECIAL ISSUANCE" in upper:
        return "SPECIAL ISSUANCE"
    if "ISSUE" in upper:
        return "ISSUE"

    return "UNKNOWN"


# ---------------------------------------------------------------------------
# DispositionSuite
# ---------------------------------------------------------------------------

def test_IssueTest():
    assert get_decision("AME may issue") == "ISSUE"


def test_DeferTest():
    assert get_decision("Defer to FAA") == "DEFER"


def test_DenyTest():
    assert get_decision("Deny the certificate") == "DENY"


def test_SpecialIssuanceTest():
    assert get_decision("Special Issuance required") == "SPECIAL ISSUANCE"


def test_DeferTakesPriorityOverIssueTest():
    # DEFER is checked before ISSUE, so this should return DEFER
    assert get_decision("Defer, do not issue") == "DEFER"


def test_UnknownDecisionTest():
    assert get_decision("No matching keyword") == "UNKNOWN"


def test_NoneDecisionTest():
    assert get_decision(None) == "UNKNOWN"
    assert get_decision("") == "UNKNOWN"


def test_CaseInsensitiveTest():
    assert get_decision("defer") == "DEFER"


def test_IssueInActionTextTest():
    assert (
        get_decision("ISSUE\nAME may issue and note this in Block 60.") == "ISSUE"
    )
