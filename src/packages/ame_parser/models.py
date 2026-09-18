"""Normalized, source-traceable data structures for AME guidance."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any


SCHEMA_VERSION = "1.0"


class Disposition(str, Enum):
    ISSUE = "ISSUE"
    DEFER = "DEFER"
    DENY = "DENY"
    SPECIAL_ISSUANCE = "SPECIAL_ISSUANCE"
    UNKNOWN = "UNKNOWN"


class RequirementKind(str, Enum):
    DOCUMENT = "DOCUMENT"
    TEST = "TEST"
    MEDICATION = "MEDICATION"
    EVALUATION = "EVALUATION"
    OTHER = "OTHER"


@dataclass(frozen=True)
class SourceReference:
    document: str
    pdf_page: int
    printed_page: str | None = None
    section: str | None = None


@dataclass(frozen=True)
class Requirement:
    text: str
    kind: RequirementKind = RequirementKind.OTHER


@dataclass(frozen=True)
class GuidanceRecord:
    record_id: str
    condition: str
    scenario: str
    disposition: Disposition
    raw_disposition: str
    source: SourceReference
    category: str | None = None
    subcondition: str | None = None
    certificate_classes: tuple[str, ...] = ()
    time_constraints: tuple[str, ...] = ()
    requirements: tuple[Requirement, ...] = ()
    medication_notes: tuple[str, ...] = ()
    action: str = ""
    raw_text: str = ""
    warnings: tuple[str, ...] = ()


@dataclass(frozen=True)
class ParseResult:
    source_document: str
    records: tuple[GuidanceRecord, ...] = ()
    warnings: tuple[str, ...] = ()
    pages_processed: int = 0
    schema_version: str = SCHEMA_VERSION
    parser_version: str = "0.1.0"
    summary: dict[str, int] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Return JSON-ready data while retaining enum string values."""

        return _enum_values(asdict(self))


def _enum_values(value: Any) -> Any:
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {key: _enum_values(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_enum_values(item) for item in value]
    return value
