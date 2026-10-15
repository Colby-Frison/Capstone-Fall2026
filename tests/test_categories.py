"""Unit tests for dictionary-driven browse category assignment."""

import json
from pathlib import Path

import pytest

from ame_parser.categories import load_category_dictionary, resolve_category


DICTIONARY = {
    "categories": ["Eyes", "Ears", "Neurology", "Other"],
    "condition_map": {"Glaucoma": "Eyes"},
    "item_map": {"31": "Eyes"},
    "alias_map": {"Inner Ear": "Ears"},
    "patterns": [
        {"category": "Neurology", "match": r"seizure|epilep"},
        {"category": "", "match": "ignored"},
        {"category": "Ears", "match": ""},
    ],
}


@pytest.mark.parametrize(
    ("condition", "category", "section", "expected"),
    [
        ("Glaucoma", None, None, "Eyes"),  # exact condition_map
        ("  glaucoma ", None, None, "Eyes"),  # normalized condition_map
        ("Anything", "ITEM 31. Eyes", None, "Eyes"),  # item_map via category
        ("ITEM 31 heading", None, None, "Eyes"),  # item_map via condition
        ("Anything", "inner   ear", None, "Ears"),  # alias_map
        ("Anything", None, "Neurology", "Neurology"),  # canonical section label
        ("Seizure disorder", None, None, "Neurology"),  # pattern on condition
        ("Anything", "Epilepsy chapter", None, "Neurology"),  # pattern on category
        ("Anything", "Unmapped label", None, "Other"),
        (None, None, None, "Other"),
    ],
)
def test_resolution_order(condition, category, section, expected) -> None:
    assert (
        resolve_category(condition, category, section, dictionary=DICTIONARY)
        == expected
    )


def test_null_bytes_and_whitespace_are_cleaned() -> None:
    assert resolve_category("Glau\x00coma", dictionary=DICTIONARY) == "Other"
    assert resolve_category("Glaucoma\n", dictionary=DICTIONARY) == "Eyes"


def test_default_dictionary_loads_canonical_categories() -> None:
    data = load_category_dictionary()
    assert "Neurology" in data["categories"]
    assert resolve_category("ALLERGIES") == "Nose and Sinuses"


def test_custom_dictionary_path(tmp_path: Path) -> None:
    path = tmp_path / "dictionary.json"
    path.write_text(json.dumps(DICTIONARY), encoding="utf-8")
    load_category_dictionary.cache_clear()
    try:
        assert load_category_dictionary(str(path))["condition_map"] == {
            "Glaucoma": "Eyes"
        }
    finally:
        load_category_dictionary.cache_clear()
