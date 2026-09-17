import json
from pathlib import Path

import pytest
from pypdf import PdfWriter

from ame_parser.cli import main, page_range
from ame_parser.models import ParseResult
from ame_parser.pdf import PdfPlumberReader
from ame_parser.schema import ValidationError


def test_page_range_parser() -> None:
    assert page_range("7") == (7, 7)
    assert page_range("5-14") == (5, 14)
    with pytest.raises(Exception):
        page_range("14-5")


def test_schema_command_writes_versioned_contract(tmp_path: Path) -> None:
    output = tmp_path / "schema.json"
    assert main(["--schema", str(output)]) == 0
    schema = json.loads(output.read_text(encoding="utf-8"))
    assert schema["properties"]["schema_version"]["const"] == "1.0"
    assert "records" in schema["properties"]


def test_cli_returns_input_error_for_missing_file(tmp_path: Path, capsys) -> None:
    missing = tmp_path / "missing.pdf"
    assert main([str(missing)]) == 2
    assert "missing.pdf" in capsys.readouterr().err


def test_cli_writes_stable_output_and_diagnostics(
    tmp_path: Path, monkeypatch, capsys
) -> None:
    class SuccessfulParser:
        def parse(self, *args, **kwargs) -> ParseResult:
            return ParseResult(
                source_document="input.pdf",
                pages_processed=1,
                summary={
                    "pages_processed": 1,
                    "records_extracted": 0,
                    "records_with_warnings": 0,
                    "unknown_dispositions": 0,
                },
            )

    monkeypatch.setattr("ame_parser.cli.AmeParser", SuccessfulParser)
    output = tmp_path / "output.json"
    assert main(["input.pdf", "-o", str(output), "--diagnostic"]) == 0
    payload = json.loads(output.read_text(encoding="utf-8"))
    assert payload["source_document"] == "input.pdf"
    captured = capsys.readouterr()
    assert "records_extracted=0" in captured.err
    assert str(output) in captured.out


def test_cli_reports_strict_validation_failure(monkeypatch, capsys) -> None:
    class StrictFailureParser:
        def parse(self, *args, **kwargs):
            raise ValidationError("ambiguous source text")

    monkeypatch.setattr("ame_parser.cli.AmeParser", StrictFailureParser)
    assert main(["input.pdf", "--strict"]) == 4
    assert "strict validation failed" in capsys.readouterr().err


def test_reader_rejects_non_pdf_and_invalid_pdf(tmp_path: Path) -> None:
    text = tmp_path / "input.txt"
    text.write_text("not a PDF", encoding="utf-8")
    with pytest.raises(ValueError, match="Expected a PDF"):
        PdfPlumberReader().read(text)

    malformed = tmp_path / "malformed.pdf"
    malformed.write_bytes(b"not a PDF")
    with pytest.raises(ValueError, match="Unable to read PDF"):
        PdfPlumberReader().read(malformed)


def test_reader_rejects_encrypted_pdf_without_password(tmp_path: Path) -> None:
    encrypted = tmp_path / "encrypted.pdf"
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    writer.encrypt("secret")
    with encrypted.open("wb") as output:
        writer.write(output)

    with pytest.raises(ValueError, match="Unable to read PDF"):
        PdfPlumberReader().read(encrypted)


def test_reader_validates_page_range(tmp_path: Path) -> None:
    pdf = tmp_path / "one-page.pdf"
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    with pdf.open("wb") as output:
        writer.write(output)
    with pytest.raises(ValueError, match="outside"):
        PdfPlumberReader().read(pdf, (2, 2))
