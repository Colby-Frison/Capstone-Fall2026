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


def test_headerless_page_continues_with_previous_columns() -> None:
    primary = (
        ("DISEASE/CONDITION", "EVALUATION DATA", "DISPOSITION"),
        ("A. Pathway one", "Submit note", "DEFER"),
    )
    _, columns = assemble_page_rows((primary,))
    continuation = (
        ("B. Pathway two", "Submit labs", "ISSUE"),
        ("C. Pathway three", "Submit imaging", "DEFER"),
    )
    rows, carried = assemble_page_rows((continuation,), columns)
    assert carried == columns
    assert [row.scenario for row in rows] == ["B. Pathway two", "C. Pathway three"]


def test_headerless_lone_fragment_becomes_evaluation_row() -> None:
    primary = (
        ("DISEASE/CONDITION", "EVALUATION DATA", "DISPOSITION"),
        ("A. Pathway one", "Submit note", "DEFER"),
    )
    _, columns = assemble_page_rows((primary,))
    rows, _ = assemble_page_rows(((), (("• wrapped bullet",),)), columns)
    assert len(rows) == 1
    assert rows[0].scenario == ""
    assert rows[0].evaluation == "• wrapped bullet"


def test_headerless_page_without_prior_columns_yields_nothing() -> None:
    assert assemble_page_rows(((("text",),),)) == ([], None)


def test_secondary_disposition_table_on_same_page() -> None:
    first = (
        ("DISEASE/CONDITION", "EVALUATION DATA", "DISPOSITION"),
        ("A. Pathway one", "Submit note", "DEFER"),
        ("B. Pathway two", "Submit note", "DEFER"),
    )
    second = (
        ("DISEASE/CONDITION", "EVALUATION DATA", "DISPOSITION"),
        ("C. Other pathway", "Submit labs", "ISSUE"),
    )
    rows, _ = assemble_page_rows((first, second))
    assert [row.scenario for row in rows] == [
        "A. Pathway one",
        "B. Pathway two",
        "C. Other pathway",
    ]
