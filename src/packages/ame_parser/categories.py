"""Predetermined category assignment from the guidance category dictionary."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

_DICTIONARY_PATH = (
    Path(__file__).resolve().parents[2] / "data" / "guidance" / "category_dictionary.json"
)
_ITEM_NUMBER = re.compile(r"ITEM\s+(\d+)", re.I)


def _clean(text: str | None) -> str:
    return re.sub(r"\s+", " ", (text or "").replace("\x00", " ")).strip()


@lru_cache(maxsize=1)
def load_category_dictionary(path: str | None = None) -> dict:
    dictionary_path = Path(path) if path else _DICTIONARY_PATH
    return json.loads(dictionary_path.read_text(encoding="utf-8"))


def _normalize_key(value: str) -> str:
    return re.sub(r"\s+", " ", _clean(value)).casefold()


def resolve_category(
    condition: str | None,
    category: str | None = None,
    source_section: str | None = None,
    *,
    dictionary: dict | None = None,
) -> str:
    """Assign a browse category using the predetermined dictionary."""

    data = dictionary or load_category_dictionary()
    condition_value = _clean(condition)
    extracted = _clean(category) or _clean(source_section)
    allowed = {str(name) for name in data.get("categories") or []}

    # 1) Exact condition title override.
    condition_map = data.get("condition_map") or {}
    if condition_value in condition_map:
        return str(condition_map[condition_value])
    for key, mapped in condition_map.items():
        if _normalize_key(key) == _normalize_key(condition_value):
            return str(mapped)

    # 2) FAA exam ITEM number from extracted heading/section.
    item_map = data.get("item_map") or {}
    for candidate in (extracted, condition_value):
        match = _ITEM_NUMBER.search(candidate or "")
        if match and match.group(1) in item_map:
            return str(item_map[match.group(1)])

    # 3) Alias for extracted PDF labels.
    alias_map = {
        _normalize_key(key): value for key, value in (data.get("alias_map") or {}).items()
    }
    if extracted:
        alias = alias_map.get(_normalize_key(extracted))
        if alias:
            return str(alias)
        if extracted in allowed:
            return extracted

    # 4) First matching keyword pattern against the condition title.
    for rule in data.get("patterns") or []:
        pattern = str(rule.get("match") or "")
        mapped = str(rule.get("category") or "")
        if pattern and mapped and re.search(pattern, condition_value, re.I):
            return mapped

    # 5) Patterns against extracted category text.
    if extracted:
        for rule in data.get("patterns") or []:
            pattern = str(rule.get("match") or "")
            mapped = str(rule.get("category") or "")
            if pattern and mapped and re.search(pattern, extracted, re.I):
                return mapped

    return "Other"
