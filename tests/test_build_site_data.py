"""Regression tests for ParsePDFChuckes/1_parser/build_site_data.py (#56).

Each case is shaped like the real AME Guide table that was lost before the fix.
"""
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location(
    "build_site_data", ROOT / "ParsePDFChuckes" / "1_parser" / "build_site_data.py"
)
bsd = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(bsd)

HDR = ["DISEASE/CONDITION", "EVALUATION DATA", "DISPOSITION"]


def cell(text):
    return {"text": text, "html": f"<p>{text}</p>"}


def para(text, page=1):
    return {"type": "paragraph", "page": page, "text": text, "html": f"<p>{text}</p>"}


def section(blocks, tables, title="ITEM 35. Lungs and Chest"):
    return {"id": 1, "slug": "s", "title": title, "level": 1, "parent_id": None,
            "pdf_pages": [1], "blocks": blocks, "tables": tables, "text": ""}


def dispo_table(rows):
    return {"header": HDR, "rows": [[cell(t) for t in r] for r in rows]}


def test_scrambled_table_is_repaired_and_reordered():
    # Blepharitis (p. 97): heading glued onto row C, header cells mixed in, rows C, A, B
    t = {"header": None, "rows": [
        [cell("BLEPHARITIS and CONJUNCTIVITIS C. All others"), cell("Submit the following"),
         cell("DEFER Submit the information"), cell("DISEASE/CONDITION"), cell("DISPOSITION")],
        [cell("- A. Blepharitis"), cell("Generally, not of aeromedical concern."), cell("ISSUE")],
        [cell("- B. Conjunctivitis, active"), cell("Should not fly."), cell("Once resolved, see Row A.")],
        [cell(x) for x in HDR],
    ]}
    s = section([para("BLEPHARITIS and CONJUNCTIVITIS"), para("All Classes"),
                 {"type": "table", "page": 1, "table_index": 0}], [t])
    log = bsd.repair_scrambled_tables([s])
    assert log == [("s", 0, "repaired into 3 rows")]
    assert t["header"] == HDR
    assert [r[0]["text"] for r in t["rows"]] == ["- A. Blepharitis", "- B. Conjunctivitis, active", "C. All others"]

    conditions, _, _, _ = bsd.build_conditions([s])
    assert [c["id"] for c in conditions] == ["blepharitis-and-conjunctivitis"]
    assert [r["label"] for r in conditions[0]["rows"]] == ["A", "B", "C"]


def test_flattened_table_with_header_and_glued_label_is_repaired():
    # Bell's Palsy (p. 293): header kept, but rows A-C flattened into one 12-cell row and a
    # fragment from the next page glued to the "DISPOSITION" label
    t = {"header": HDR, "rows": [[cell(x) for x in [
        "DISEASE/CONDITION", "EVALUATION DATA", "DISPOSITION 3. MRI of the brain",
        "A. Single episode resolved", "If the AME can determine", "ISSUE",
        "B. Single episode recent", "If ALL of the following", "ISSUE Annotate Block 60",
        "C. All others", "Submit the following", "DEFER"]]]}
    s = section([para("BELL'S PALSY"), para("All Classes"), {"type": "table", "page": 1, "table_index": 0}], [t])
    (_, _, what), = bsd.repair_scrambled_tables([s])
    assert what.startswith("repaired into 3 rows; dropped fragment")
    assert [r[0]["text"] for r in t["rows"]] == ["A. Single episode resolved", "B. Single episode recent", "C. All others"]


def test_lone_header_label_in_a_cell_counts_as_empty():
    # Pituitary Adenoma (p. 445): row B's disposition cell holds only "DISPOSITION";
    # it must share row A's merged disposition instead
    s = section(
        [para("PITUITARY ADENOMA"), para("All Classes"), {"type": "table", "page": 1, "table_index": 0}],
        [dispo_table([["A. Microadenoma", "Submit", "DEFER for Special Issuance"],
                      ["B. Macroadenoma", "Submit", "DISPOSITION"]])],
    )
    (c,), _, _, _ = bsd.build_conditions([s])
    b = c["rows"][1]
    assert b["disposition"] == "DEFER for Special Issuance"
    assert b["disposition_shared_with_previous_row"] is True


def test_table_with_odd_cell_count_is_left_alone():
    t = {"header": None, "rows": [[cell("DISPOSITION"), cell("a"), cell("b")]]}
    s = section([{"type": "table", "page": 1, "table_index": 0}], [t])
    assert "left as-is" in bsd.repair_scrambled_tables([s])[0][2]
    assert t["header"] is None


def test_heading_ending_in_semicolon_starts_a_new_condition():
    # Pectus Excavatum then COPD (pp. 133-134): COPD's heading ends with ";" and used
    # to be rejected, so its rows were filed under Pectus Excavatum.
    s = section(
        [para("PECTUS EXCAVATUM"), para("All Classes"), {"type": "table", "page": 1, "table_index": 0},
         para("Chronic Obstructive Pulmonary Disease (COPD);", 2), para("Emphysema; Chronic Bronchitis", 2),
         para("All Classes", 2), para("(Updated 08/26/2026)", 2), {"type": "table", "page": 2, "table_index": 1}],
        [dispo_table([["A. Asymptomatic", "None", "ISSUE"]]),
         dispo_table([["A. GOLD stage 1A", "Submit the following", "DEFER"]])],
    )
    conditions, _, _, _ = bsd.build_conditions([s])
    assert [c["id"] for c in conditions] == [
        "pectus-excavatum", "chronic-obstructive-pulmonary-disease-copd-emphysema-chronic-bronchitis"]
    assert len(conditions[0]["rows"]) == 1


def test_long_parenthetical_subtitle_does_not_hide_the_heading():
    # Middle Ear Abnormalities (p. 85): the "(Otitis Media, …)" subtitle line is 152 characters,
    # over the 140-character limit for heading lines
    subtitle = "(" + ", ".join(["Otitis Media", "Serous Otitis Media", "Eardrum Abnormalities"] * 3) + ")"
    assert 140 < len(subtitle) <= bsd.SUBTITLE_MAX
    s = section(
        [para("MASTOIDS"), para("All Classes"), {"type": "table", "page": 1, "table_index": 0},
         para("MIDDLE EAR ABNORMALITIES"), para(subtitle), para("All Classes"),
         {"type": "table", "page": 1, "table_index": 1}],
        [dispo_table([["A. Mastoiditis", "x", "ISSUE"]]), dispo_table([["A. Ear tubes", "y", "ISSUE"]])],
        title="ITEM 29. Ears, General",
    )
    conditions, _, _, _ = bsd.build_conditions([s])
    assert [c["id"] for c in conditions] == ["mastoids", "middle-ear-abnormalities"]
    assert conditions[1]["subtitle"] == subtitle


def test_row_letter_after_a_dash_is_recognised():
    assert bsd.row_record([cell("- A. Epilepsy by history"), cell("x"), cell("DEFER")], HDR)["label"] == "A"
