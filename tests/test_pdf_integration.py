import importlib.util
import json
from pathlib import Path
from types import ModuleType

import pytest
from pypdf import PdfReader, PdfWriter

from ame_parser.parser import AmeParser


ROOT = Path(__file__).parents[1]
RESOURCES = ROOT / "Documentation" / "Resources"
GOLDENS = json.loads(
    (Path(__file__).parent / "fixtures" / "golden_records.json").read_text(
        encoding="utf-8"
    )
)


def assert_goldens(result, expected: list[dict[str, object]]) -> None:
    for golden in expected:
        matches = [
            record
            for record in result.records
            if record.source.pdf_page == golden["pdf_page"]
            and str(golden["condition_contains"]).lower() in record.condition.lower()
            and str(golden["scenario_contains"]).lower() in record.scenario.lower()
            and (
                "certificate_class" not in golden
                or golden["certificate_class"] in record.certificate_classes
            )
        ]
        assert matches, f"Missing golden record: {golden}"
        record = matches[0]
        assert record.disposition.value == golden["disposition"]
        requirements = " ".join(item.text for item in record.requirements)
        assert str(golden["requirement_contains"]).lower() in requirements.lower()
        if "time_constraint" in golden:
            assert golden["time_constraint"] in record.time_constraints
        assert record.raw_text
        assert record.source.document


@pytest.mark.integration
def test_ame_guide_pages_match_human_reviewed_goldens() -> None:
    result = AmeParser().parse(
        RESOURCES / "ame_guide.pdf", page_range=(64, 72)
    )
    assert_goldens(result, GOLDENS["ame_guide"])
    assert result.summary["unknown_dispositions"] == 0


@pytest.mark.integration
def test_oneguide_pages_match_human_reviewed_goldens() -> None:
    result = AmeParser().parse(
        RESOURCES / "OneGuide_Neurology.pdf", page_range=(5, 14)
    )
    assert_goldens(result, GOLDENS["oneguide"])
    assert all("INCAPACITATE" not in record.raw_text for record in result.records)


def _load_legacy_parser() -> ModuleType:
    path = ROOT / "src" / "legacy" / "old" / "AMEParser.py"
    spec = importlib.util.spec_from_file_location("legacy_ame_parser", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _write_subset(source: Path, destination: Path, first: int, last: int) -> None:
    reader = PdfReader(source)
    writer = PdfWriter()
    for page_number in range(first, last + 1):
        writer.add_page(reader.pages[page_number - 1])
    with destination.open("wb") as output:
        writer.write(output)


@pytest.mark.characterization
def test_legacy_parser_drops_fourth_disposition_column(tmp_path: Path) -> None:
    subset = tmp_path / "ame-pages-64-72.pdf"
    _write_subset(RESOURCES / "ame_guide.pdf", subset, 64, 72)

    records = _load_legacy_parser().parse_pdf(subset)
    active_fistula = next(
        case
        for condition in records
        for case in condition["cases"]
        if "Active fistula" in case["scenario"]
    )

    assert active_fistula["decision_logic"]["then"] == "UNKNOWN"


@pytest.mark.characterization
def test_legacy_parser_skips_oneguide_workflow_tables(tmp_path: Path) -> None:
    subset = tmp_path / "oneguide-pages-5-14.pdf"
    _write_subset(RESOURCES / "OneGuide_Neurology.pdf", subset, 5, 14)
    assert _load_legacy_parser().parse_pdf(subset) == []
