"""Checks on the FAA form registry (src/data/guidance/forms_catalog.json) and its link checker."""

from __future__ import annotations

import importlib.util
import json
import urllib.error
from pathlib import Path
from urllib.parse import urlparse

import pytest

ROOT = Path(__file__).resolve().parents[1]
GUIDANCE = ROOT / "src" / "data" / "guidance"
CATALOG = GUIDANCE / "forms_catalog.json"
FORM_TYPES = {"status_summary", "questionnaire", "faa_form", "result_sheet", "progress_note"}


def _load_checker():
    path = ROOT / "src" / "scripts" / "check_form_links.py"
    spec = importlib.util.spec_from_file_location("check_form_links", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


checker = _load_checker()
FORMS = json.loads(CATALOG.read_text(encoding="utf-8"))["forms"]


def test_form_ids_and_urls_are_unique():
    ids = [form["id"] for form in FORMS]
    urls = [form["url"] for form in FORMS]
    assert len(ids) == len(set(ids))
    assert len(urls) == len(set(urls))


@pytest.mark.parametrize("form", FORMS, ids=[form["id"] for form in FORMS])
def test_form_entry_is_complete(form):
    url = urlparse(form["url"])
    assert url.scheme == "https"
    assert url.netloc == "www.faa.gov"
    assert url.path.lower().endswith(".pdf")
    assert form["type"] in FORM_TYPES
    for field in ("title", "summary", "completedBy", "lastVerified"):
        assert form[field].strip(), f"{field} is empty"
    assert form["match"], "needs at least one phrase to match in the guide"


def test_condition_assignments_name_real_conditions():
    """A form's `conditions` list must use names that exist in the parsed guidance."""
    known = set()
    for path in GUIDANCE.glob("*.normalized.json"):
        for record in json.loads(path.read_text(encoding="utf-8"))["records"]:
            known.add(record["condition"].strip().lower())
    for form in FORMS:
        for name in form.get("conditions", []):
            assert name.strip().lower() in known, f"{form['id']}: unknown condition {name!r}"


class _Response:
    def __init__(self, content_type: str):
        self.headers = {"Content-Type": content_type}

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def _http_error(url: str, code: int) -> urllib.error.HTTPError:
    return urllib.error.HTTPError(url, code, "error", None, None)


def test_check_passes_for_a_pdf(monkeypatch):
    monkeypatch.setattr(checker.urllib.request, "urlopen", lambda *a, **k: _Response("application/pdf"))
    assert checker.check("https://www.faa.gov/x.pdf") is None


def test_check_reports_a_dead_link(monkeypatch):
    def urlopen(request, **kwargs):
        raise _http_error(request.full_url, 404)

    monkeypatch.setattr(checker.urllib.request, "urlopen", urlopen)
    assert checker.check("https://www.faa.gov/gone.pdf") == "HTTP 404"


def test_check_reports_an_error_page_served_as_html(monkeypatch):
    monkeypatch.setattr(checker.urllib.request, "urlopen", lambda *a, **k: _Response("text/html"))
    assert "not a PDF" in checker.check("https://www.faa.gov/x.pdf")


def test_check_falls_back_to_get_when_head_is_rejected(monkeypatch):
    methods = []

    def urlopen(request, **kwargs):
        methods.append(request.get_method())
        if request.get_method() == "HEAD":
            raise _http_error(request.full_url, 405)
        return _Response("application/pdf")

    monkeypatch.setattr(checker.urllib.request, "urlopen", urlopen)
    assert checker.check("https://www.faa.gov/x.pdf") is None
    assert methods == ["HEAD", "GET"]


def test_main_exits_nonzero_when_any_link_fails(monkeypatch, capsys):
    monkeypatch.setattr(checker, "check", lambda url: "HTTP 404" if "COPD" in url else None)
    assert checker.main() == 1
    assert "[fail] copd-status-summary" in capsys.readouterr().out
