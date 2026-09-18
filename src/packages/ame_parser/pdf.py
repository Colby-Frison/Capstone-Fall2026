"""PDF input port and pdfplumber adapter."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Protocol, Sequence


Cell = str | None
Table = tuple[tuple[Cell, ...], ...]


@dataclass(frozen=True)
class PageData:
    number: int
    text: str
    tables: tuple[Table, ...] = ()


class DocumentReader(Protocol):
    def read(
        self, path: Path, page_range: tuple[int, int] | None = None
    ) -> Sequence[PageData]: ...


class PdfPlumberReader:
    """Read page text and tables without exposing pdfplumber downstream."""

    def read(
        self, path: Path, page_range: tuple[int, int] | None = None
    ) -> tuple[PageData, ...]:
        if path.suffix.lower() != ".pdf":
            raise ValueError(f"Expected a PDF file: {path}")
        if not path.is_file():
            raise FileNotFoundError(path)

        import pdfplumber
        from pdfminer.pdfdocument import (
            PDFEncryptionError,
            PDFPasswordIncorrect,
            PDFSyntaxError,
        )
        from pdfplumber.utils.exceptions import PdfminerException

        pages: list[PageData] = []
        try:
            with pdfplumber.open(path) as pdf:
                first, last = page_range or (1, len(pdf.pages))
                if first < 1 or last < first or last > len(pdf.pages):
                    raise ValueError(
                        f"Page range {first}-{last} is outside 1-{len(pdf.pages)}"
                    )
                for number in range(first, last + 1):
                    page = pdf.pages[number - 1]
                    raw_tables = page.extract_tables() or []
                    tables = tuple(
                        tuple(tuple(cell for cell in row) for row in table)
                        for table in raw_tables
                        if table
                    )
                    pages.append(
                        PageData(
                            number=number,
                            text=page.extract_text() or "",
                            tables=tables,
                        )
                    )
        except (
            PDFEncryptionError,
            PDFPasswordIncorrect,
            PDFSyntaxError,
            PdfminerException,
        ) as exc:
            raise ValueError(f"Unable to read PDF {path}: {exc}") from exc
        return tuple(pages)
