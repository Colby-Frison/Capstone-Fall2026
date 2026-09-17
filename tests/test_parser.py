import json
from pathlib import Path

import pytest

from ame_parser.extractors import UnsupportedDocumentError
from ame_parser.parser import AmeParser
from ame_parser.pdf import PageData
from ame_parser.schema import ValidationError, validate_result
from ame_parser.serialization import dumps


class FakeReader:
    def __init__(self, pages: tuple[PageData, ...]) -> None:
        self.pages = pages
        self.received_range: tuple[int, int] | None = None

    def read(
        self, path: Path, page_range: tuple[int, int] | None = None
    ) -> tuple[PageData, ...]:
        self.received_range = page_range
        return self.pages


def ame_page() -> PageData:
    return PageData(
        number=1,
        text=(
            "Guide for Aviation Medical Examiners\nTEST CONDITION\n"
            "DISEASE/CONDITION EVALUATION DATA DISPOSITION\n1"
        ),
        tables=(
            (
                ("DISEASE/CONDITION", "EVALUATION DATA", "DISPOSITION"),
                ("A. Stable", "Current physician report", "ISSUE\nAnnotate Block 60"),
            ),
        ),
    )


def test_pipeline_is_deterministic_and_contract_valid() -> None:
    parser = AmeParser(reader=FakeReader((ame_page(),)))
    first = parser.parse("input.pdf")
    second = parser.parse("input.pdf")

    assert dumps(first) == dumps(second)
    assert validate_result(first) == ()
    payload = json.loads(dumps(first))
    assert payload["schema_version"] == "1.0"
    assert payload["summary"]["records_extracted"] == 1


def test_page_range_is_passed_to_reader() -> None:
    reader = FakeReader((ame_page(),))
    AmeParser(reader=reader).parse("input.pdf", page_range=(4, 9))
    assert reader.received_range == (4, 9)


def test_unsupported_document_has_clear_error() -> None:
    parser = AmeParser(reader=FakeReader((PageData(1, "unrelated document"),)))
    with pytest.raises(UnsupportedDocumentError):
        parser.parse("input.pdf")


def test_supported_document_without_tables_warns_and_strict_mode_fails() -> None:
    parser = AmeParser(
        reader=FakeReader((PageData(1, "Guide for Aviation Medical Examiners"),))
    )
    result = parser.parse("input.pdf")
    assert "no_guidance_records" in result.warnings
    with pytest.raises(ValidationError):
        parser.parse("input.pdf", strict=True)


def test_empty_reader_result_is_rejected() -> None:
    with pytest.raises(UnsupportedDocumentError, match="no readable pages"):
        AmeParser(reader=FakeReader(())).parse("input.pdf")
