"""Tests for src/scripts/sync_form_links.py, which fills form URLs from the guide's hyperlinks."""

from __future__ import annotations

import importlib.util
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _load():
    path = ROOT / "src" / "scripts" / "sync_form_links.py"
    spec = importlib.util.spec_from_file_location("sync_form_links", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module  # dataclasses need the module registered
    spec.loader.exec_module(module)
    return module


sync = _load()
MEDIA = "https://www.faa.gov/ame_guide/media/"

PACEMAKER = {"id": "pacemaker", "title": "Pacemaker Status Summary", "match": ["pacemaker status summary"], "url": ""}
OSA = {"id": "osa", "title": "OSA Treated Status Report", "match": ["osa treated status report"], "url": ""}
NOTE = {"id": "note", "title": "Clinical Progress Note", "match": ["clinical progress note", "status report"], "url": ""}
CHORIO = {"id": "chorio", "title": "Chorioretinitis Status Summary", "match": ["chorioretinitis status summary"], "url": ""}
FORM_8500 = {"id": "8500-7", "title": "FAA Form 8500-7", "match": ["form 8500-7"], "url": "https://www.faa.gov/x/FAA_Form_8500-7.pdf"}


def link(text: str, file: str, section: str = "") -> "sync.Link":
    return sync.Link(text=sync.normalize(text), url=MEDIA + file, section=sync.normalize(section))


def alive(*dead: str):
    """A fake link checker: every URL works except the file names listed."""
    return lambda url: "HTTP 404" if url.rsplit("/", 1)[-1] in dead else None


def test_normalize_matches_the_website_rules():
    assert sync.normalize("Eyes – Refractive   Surgery Status Summary") == "eyes-refractive surgery status summary"
    assert sync.normalize("(AFib)/A- Flutter Status Summary") == "(afib)/a-flutter status summary"


def test_extract_links_keeps_only_faa_pdfs():
    sections = [
        {
            "title": "Pacemaker",
            "html": (
                '<p>See the <a href="http://www.faa.gov/ame_guide/media/Pacemaker_Status_Summary.pdf">'
                "Pacemaker <b>Status</b> Summary</a>, the "
                '<a href="https://www.faa.gov/ame_guide/app_process/general/who">who page</a> and '
                '<a href="https://pubmed.ncbi.nlm.nih.gov/123.pdf">a paper</a>.</p>'
            ),
        }
    ]
    assert sync.extract_links(sections) == [
        sync.Link(text="pacemaker status summary", url=MEDIA + "Pacemaker_Status_Summary.pdf", section="pacemaker")
    ]


def test_fills_an_empty_url_from_the_guide():
    results, _ = sync.sync([dict(PACEMAKER)], [link("The Pacemaker Status Summary", "Pacemaker_Status_Summary.pdf")], alive())
    assert (results[0].status, results[0].source) == ("updated", "guide")
    assert results[0].url == MEDIA + "Pacemaker_Status_Summary.pdf"


def test_a_link_goes_to_the_form_it_names_most_specifically():
    links = [
        link("OSA Treated Status Report", "OSA_Treated_Status_Report.pdf"),
        link("current, detailed Clinical Progress Note", "ProgressNote.pdf"),
    ]
    candidates, _ = sync.candidates_by_form([OSA, NOTE], links)
    assert candidates["osa"] == Counter({MEDIA + "OSA_Treated_Status_Report.pdf": 1})
    assert candidates["note"] == Counter({MEDIA + "ProgressNote.pdf": 1})


def test_skips_a_dead_guide_link_and_uses_the_working_one():
    links = [
        link("Pacemaker Status Summary", "Old_Pacemaker_Status_Summary.pdf"),
        link("Pacemaker Status Summary", "Old_Pacemaker_Status_Summary.pdf"),
        link("Pacemaker Status Summary", "Pacemaker_Status_Summary.pdf"),
    ]
    results, _ = sync.sync([dict(PACEMAKER)], links, alive("Old_Pacemaker_Status_Summary.pdf"))
    assert results[0].url == MEDIA + "Pacemaker_Status_Summary.pdf"
    assert "1 dead" in results[0].detail


def test_identifies_a_bare_status_summary_link_by_its_file_name():
    links = [
        link("Chorioretinitis Status Summary", "Dispo_Table_Chorioretinitis.pdf"),
        link("Status Summary", "Chorioretinitis_Status_Summary.pdf"),
    ]
    results, suggestions = sync.sync([dict(CHORIO)], links, alive())
    assert results[0].url == MEDIA + "Chorioretinitis_Status_Summary.pdf"
    assert suggestions == []


def test_keeps_the_registry_url_when_the_guide_confirms_it():
    form = dict(PACEMAKER, url=MEDIA + "Pacemaker_Status_Summary.pdf")
    links = [
        link("Pacemaker Status Summary", "Pacemaker_Status_Summary.pdf"),
        link("Pacemaker Status Summary", "Pacemaker_Report_Form.pdf"),
        link("Pacemaker Status Summary", "Pacemaker_Report_Form.pdf"),
    ]
    results, _ = sync.sync([form], links, alive())
    assert (results[0].status, results[0].url) == ("confirmed", form["url"])


def test_form_the_guide_does_not_link_stays_manual():
    results, _ = sync.sync([dict(FORM_8500)], [], alive())
    assert (results[0].status, results[0].source, results[0].url) == ("manual", "manual", FORM_8500["url"])


def test_reports_a_form_with_no_working_url_as_dead():
    form = dict(PACEMAKER, url=MEDIA + "Gone.pdf")
    results, _ = sync.sync([form], [], alive("Gone.pdf"))
    assert results[0].status == "dead"


def test_suggests_working_form_links_missing_from_the_registry():
    links = [
        link("Gout Status Summary", "Gout_Status_Summary.pdf"),
        link("OSA Status Summary - Initial", "OSA_Initial_Status_Summary.pdf"),
        link("Hypertension FAQs", "Hypertension_FAQs.pdf"),
    ]
    _, suggestions = sync.sync([dict(PACEMAKER)], links, alive("OSA_Initial_Status_Summary.pdf"))
    assert [s.url for s in suggestions] == [MEDIA + "Gout_Status_Summary.pdf"]


def test_apply_writes_url_source_and_date_but_leaves_dead_forms_alone():
    forms = [dict(PACEMAKER), dict(PACEMAKER, id="gone", url=MEDIA + "Gone.pdf")]
    results = [
        sync.Result("pacemaker", "updated", MEDIA + "Pacemaker_Status_Summary.pdf", "guide"),
        sync.Result("gone", "dead", MEDIA + "Gone.pdf", "manual"),
    ]
    sync.apply(forms, results, "2026-11-15")
    assert forms[0]["url"] == MEDIA + "Pacemaker_Status_Summary.pdf"
    assert (forms[0]["urlSource"], forms[0]["lastVerified"]) == ("guide", "2026-11-15")
    assert "urlSource" not in forms[1]
