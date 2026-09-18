"""Deterministic JSON serialization."""

from __future__ import annotations

import json
from pathlib import Path

from .models import ParseResult


def dumps(result: ParseResult) -> str:
    return json.dumps(
        result.to_dict(),
        ensure_ascii=False,
        indent=2,
        sort_keys=True,
    ) + "\n"


def write(result: ParseResult, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(dumps(result), encoding="utf-8")
