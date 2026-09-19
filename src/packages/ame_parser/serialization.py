"""Deterministic JSON serialization."""

from __future__ import annotations

import json
from pathlib import Path

from .models import ParseResult
from .text import normalize_record_dict


def dumps(result: ParseResult) -> str:
    payload = result.to_dict()
    payload["records"] = [
        normalize_record_dict(record) for record in payload.get("records") or []
    ]
    return json.dumps(
        payload,
        ensure_ascii=False,
        indent=2,
        sort_keys=True,
    ) + "\n"


def write(result: ParseResult, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(dumps(result), encoding="utf-8")
