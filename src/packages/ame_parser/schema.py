"""Schema validation for normalized parser output."""

from __future__ import annotations

from .models import GuidanceRecord, ParseResult, SCHEMA_VERSION


class ValidationError(ValueError):
    pass


def validate_record(record: GuidanceRecord) -> tuple[str, ...]:
    errors: list[str] = []
    if not record.record_id:
        errors.append("record_id is required")
    if not record.condition or record.condition == "UNKNOWN":
        errors.append(f"{record.record_id}: condition is required")
    if not record.scenario:
        errors.append(f"{record.record_id}: scenario is required")
    if record.source.pdf_page < 1:
        errors.append(f"{record.record_id}: source.pdf_page must be positive")
    if not record.raw_text:
        errors.append(f"{record.record_id}: raw_text is required")
    if record.disposition.value not in {
        "ISSUE",
        "DEFER",
        "DENY",
        "SPECIAL_ISSUANCE",
        "UNKNOWN",
    }:
        errors.append(f"{record.record_id}: unsupported disposition")
    return tuple(errors)


def validate_result(result: ParseResult) -> tuple[str, ...]:
    errors: list[str] = []
    if result.schema_version != SCHEMA_VERSION:
        errors.append(f"Unsupported schema version: {result.schema_version}")
    if not result.source_document:
        errors.append("source_document is required")
    if result.pages_processed < 0:
        errors.append("pages_processed cannot be negative")
    seen: set[str] = set()
    for record in result.records:
        errors.extend(validate_record(record))
        if record.record_id in seen:
            errors.append(f"Duplicate record_id: {record.record_id}")
        seen.add(record.record_id)
    return tuple(errors)


JSON_SCHEMA = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://example.invalid/ame-parser/v1.0/schema.json",
    "title": "AME Parser Result",
    "type": "object",
    "required": [
        "schema_version",
        "parser_version",
        "source_document",
        "pages_processed",
        "records",
        "warnings",
        "summary",
    ],
    "properties": {
        "schema_version": {"const": SCHEMA_VERSION},
        "parser_version": {"type": "string"},
        "source_document": {"type": "string", "minLength": 1},
        "pages_processed": {"type": "integer", "minimum": 0},
        "warnings": {"type": "array", "items": {"type": "string"}},
        "summary": {
            "type": "object",
            "additionalProperties": {"type": "integer", "minimum": 0},
        },
        "records": {
            "type": "array",
            "items": {
                "type": "object",
                "required": [
                    "record_id",
                    "condition",
                    "scenario",
                    "disposition",
                    "raw_disposition",
                    "requirements",
                    "source",
                    "raw_text",
                ],
                "properties": {
                    "record_id": {"type": "string", "minLength": 1},
                    "condition": {"type": "string", "minLength": 1},
                    "scenario": {"type": "string", "minLength": 1},
                    "disposition": {
                        "enum": [
                            "ISSUE",
                            "DEFER",
                            "DENY",
                            "SPECIAL_ISSUANCE",
                            "UNKNOWN",
                        ]
                    },
                    "raw_disposition": {"type": "string"},
                    "certificate_classes": {
                        "type": "array",
                        "items": {"type": "string", "minLength": 1},
                    },
                    "time_constraints": {
                        "type": "array",
                        "items": {"type": "string", "minLength": 1},
                    },
                    "requirements": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["text", "kind"],
                            "properties": {
                                "text": {"type": "string", "minLength": 1},
                                "kind": {
                                    "enum": [
                                        "DOCUMENT",
                                        "TEST",
                                        "MEDICATION",
                                        "EVALUATION",
                                        "OTHER",
                                    ]
                                },
                                "role": {
                                    "enum": ["bring_list", "ame_review", "note"]
                                },
                                "required": {"type": "boolean"},
                            },
                        },
                    },
                    "source": {
                        "type": "object",
                        "required": ["document", "pdf_page"],
                        "properties": {
                            "document": {"type": "string", "minLength": 1},
                            "pdf_page": {"type": "integer", "minimum": 1},
                        },
                    },
                },
            },
        },
    },
}
