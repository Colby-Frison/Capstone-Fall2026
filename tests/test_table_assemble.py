"""Unit tests for logical disposition-table assembly."""

from ame_parser.table_assemble import (
    assemble_page_rows,
    map_headers,
    select_primary_table,
)


def test_map_headers_tolerates_sparse_physical_columns() -> None:
    table = (
        ("DISEASE/CONDITION", "EVALUATION DATA", None, None, "DISPOSITION", None),
        ("A. Controlled", "", "Progress note", None, "ISSUE", None),
    )
    columns = map_headers(table)
    assert columns is not None
    assert columns.disease == 0
    assert columns.evaluation == 1
    assert columns.disposition == 4
    assert columns.class_idx is None


def test_fragment_tables_merge_into_primary_pathway() -> None:
    primary = (
        ("DISEASE/CONDITION", "EVALUATION DATA", None, None, "DISPOSITION"),
        (
            "A. Allergies controlled by acceptable medications",
            "If the AME can determine:",
            None,
            None,
            "ISSUE\nAnnotate Block 60.",
        ),
        (
            "B. Allergies indicated by steroid treatment",
            "Submit the following for FAA review:",
            None,
            None,
            "DEFER",
        ),
    )
    fragment = (
        ("• A current, detailed Clinical Progress Note",),
        ("• Current medications, dosage, and side effects",),
    )
    noise = (("wrapped list fragment only",),)
    rows, columns = assemble_page_rows((primary, fragment, noise))
    assert columns is not None
    assert len(rows) == 2
    assert rows[0].scenario.startswith("A.")
    assert rows[1].scenario.startswith("B.")
    assert "Clinical Progress Note" in rows[1].evaluation
    assert "medications, dosage" in rows[1].evaluation


def test_select_primary_prefers_pathway_table() -> None:
    ghost = (("bullet text",), ("more bullet",))
    real = (
        ("DISEASE/CONDITION", "EVALUATION DATA", "DISPOSITION"),
        ("A. Pathway one", "Submit note", "DEFER"),
    )
    selected = select_primary_table((ghost, real))
    assert selected is not None
    assert selected[0] is real
