"""Application service coordinating document reading and extraction."""

from __future__ import annotations

from pathlib import Path
from typing import Sequence

from .extractors import DEFAULT_EXTRACTORS, Extractor, UnsupportedDocumentError
from .models import ParseResult
from .pdf import DocumentReader, PdfPlumberReader
from .schema import ValidationError, validate_result


class AmeParser:
    def __init__(
        self,
        reader: DocumentReader | None = None,
        extractors: Sequence[Extractor] = DEFAULT_EXTRACTORS,
    ) -> None:
        self._reader = reader or PdfPlumberReader()
        self._extractors = tuple(extractors)

    def parse(
        self,
        path: str | Path,
        *,
        page_range: tuple[int, int] | None = None,
        strict: bool = False,
    ) -> ParseResult:
        source = Path(path)
        pages = tuple(self._reader.read(source, page_range))
        if not pages:
            raise UnsupportedDocumentError("The PDF contains no readable pages")

        extractor = next(
            (candidate for candidate in self._extractors if candidate.supports(pages)),
            None,
        )
        if extractor is None:
            raise UnsupportedDocumentError(
                "No supported AME Guide or OneGuide document signature was found"
            )

        records = extractor.extract(pages, source)
        warnings: list[str] = []
        if not any(page.text.strip() for page in pages):
            warnings.append("no_extractable_text")
        if not records:
            warnings.append("no_guidance_records")
        warnings.extend(
            f"{record.record_id}:{warning}"
            for record in records
            for warning in record.warnings
        )
        summary = {
            "pages_processed": len(pages),
            "records_extracted": len(records),
            "records_with_warnings": sum(bool(record.warnings) for record in records),
            "unknown_dispositions": sum(
                record.disposition.value == "UNKNOWN" for record in records
            ),
        }
        result = ParseResult(
            source_document=source.name,
            pages_processed=len(pages),
            records=records,
            warnings=tuple(dict.fromkeys(warnings)),
            summary=summary,
        )
        errors = validate_result(result)
        if errors:
            result = ParseResult(
                source_document=result.source_document,
                pages_processed=result.pages_processed,
                records=result.records,
                warnings=tuple((*result.warnings, *(f"validation:{e}" for e in errors))),
                summary=result.summary,
            )
        if strict and (errors or result.warnings):
            details = "; ".join((*errors, *result.warnings))
            raise ValidationError(details)
        return result
