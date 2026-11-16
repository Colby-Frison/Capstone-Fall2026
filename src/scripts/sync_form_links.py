#!/usr/bin/env python3
"""Fill in form URLs in forms_catalog.json from the hyperlinks in the AME guide.

The guide's PDF hyperlinks are already extracted by ParsePDFChuckes into
`3_full_extraction/sections.json` (link text + URL). For every form in the
registry this script:

  1. finds the guide links whose text names the form (same phrases and text
     normalisation the website uses to match forms to situations);
  2. requests each candidate URL and keeps only the ones that serve a PDF,
     because some links in the guide are wrong or dead;
  3. picks the best working URL and, with --write, saves it to the registry
     together with today's date and `"urlSource": "guide"`.

Forms the guide never hyperlinks (e.g. FAA Form 8500-7) keep their existing URL
and are marked `"urlSource": "manual"` so it is clear which ones a person has to
maintain. To add a form, give it an id, title, summary and `match` phrases,
leave `url` empty, and run this with --write.

Run with `python src/scripts/capstone.py sync-form-links [--write]`.
Exits 1 if any form ends up without a working URL.
"""

from __future__ import annotations

import argparse
import datetime as dt
import html
import importlib.util
import json
import re
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Callable
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "src" / "data" / "guidance" / "forms_catalog.json"
SECTIONS = ROOT / "ParsePDFChuckes" / "3_full_extraction" / "sections.json"

ANCHOR = re.compile(r'<a\s[^>]*href="([^"]+)"[^>]*>(.*?)</a>', re.IGNORECASE | re.DOTALL)
TAG = re.compile(r"<[^>]+>")
# File names that look like a form rather than a disposition table or protocol page.
FORM_LIKE = re.compile(r"status|summary|questionnaire|report|form|sheet|note", re.IGNORECASE)
TABLE_LIKE = re.compile(r"dispo|disposition|protocol", re.IGNORECASE)
# Link text that suggests a form we do not have in the registry yet.
FORM_WORDS = re.compile(r"status (summary|report)|questionnaire")


def normalize(text: str) -> str:
    """Python port of normalizeFormText in src/packages/content/forms.ts. Keep them in step."""
    text = (text or "").lower()
    text = re.sub(r"[‐-―−]", "-", text)
    text = re.sub(r"\s*-\s*", "-", text)
    text = re.sub(r"\s*/\s*", "/", text)
    return re.sub(r"\s+", " ", text).strip()


@dataclass(frozen=True)
class Link:
    text: str  # normalised link text
    url: str
    section: str  # normalised title of the guide section the link is in


def clean_url(href: str) -> str | None:
    """Return an https faa.gov PDF URL, or None for anything else."""
    href = html.unescape(href).strip()
    parsed = urlparse(href)
    if parsed.netloc.lower() not in {"www.faa.gov", "faa.gov"}:
        return None
    if not parsed.path.lower().endswith(".pdf"):
        return None
    return f"https://www.faa.gov{parsed.path}"


def extract_links(sections: list[dict]) -> list[Link]:
    """Every faa.gov PDF hyperlink in the extracted guide, with its text and section."""
    links: list[Link] = []
    for section in sections:
        title = normalize(section.get("title", ""))
        for href, inner in ANCHOR.findall(section.get("html", "")):
            url = clean_url(href)
            text = normalize(html.unescape(TAG.sub(" ", inner)))
            if url and text:
                links.append(Link(text=text, url=url, section=title))
    return links


def file_words(url: str) -> str:
    """`.../Chorioretinitis_Status_Summary.pdf` -> "chorioretinitis status summary"."""
    name = unquote(url.rsplit("/", 1)[-1]).rsplit(".", 1)[0]
    return normalize(re.sub(r"[_\s]+", " ", name))


def match_strength(form: dict, link: Link) -> int:
    """How specifically a link names a form: length of the longest matching phrase, 0 if none.

    The phrase can appear in the link text or in the PDF's file name; the guide often
    links a bare "Status Summary" whose file name is the only thing that identifies it.
    """
    phrases = [*form.get("match", []), normalize(form.get("title", ""))]
    name = file_words(link.url)
    best = max((len(p) for p in phrases if p and (p in link.text or p in name)), default=0)
    for rule in form.get("conditionMatch", []):
        if rule["condition"] in link.section and rule["phrase"] in link.text:
            best = max(best, len(rule["phrase"]))
    return best


def candidates_by_form(forms: list[dict], links: list[Link]) -> tuple[dict[str, Counter], list[Link]]:
    """Give each link to the form it names most specifically.

    "OSA Treated Status Report" contains the generic phrase "status report", but it
    belongs to the OSA form, not the progress-note guide, because the OSA phrase is longer.
    Returns {form id: Counter of URLs} and the form-like links no form claimed.
    """
    candidates: dict[str, Counter] = {form["id"]: Counter() for form in forms}
    unclaimed: list[Link] = []
    for link in links:
        strengths = {form["id"]: match_strength(form, link) for form in forms}
        top = max(strengths.values(), default=0)
        if top == 0:
            if FORM_WORDS.search(link.text):
                unclaimed.append(link)
            continue
        for form_id, strength in strengths.items():
            if strength == top:
                candidates[form_id][link.url] += 1
    return candidates, unclaimed


def rank(url: str, votes: int) -> tuple[int, int]:
    name = url.rsplit("/", 1)[-1]
    kind = 0 if TABLE_LIKE.search(name) else 2 if FORM_LIKE.search(name) else 1
    return (kind, votes)


@dataclass
class Result:
    form_id: str
    status: str  # confirmed | updated | manual | dead
    url: str
    source: str  # guide | manual
    detail: str = ""


def resolve(form: dict, candidates: Counter, check: Callable[[str], str | None]) -> Result:
    """Choose the URL for one form. `check(url)` returns None when the URL serves a PDF."""
    current = form.get("url", "")
    working = [url for url in candidates if check(url) is None]
    dead = [url for url in candidates if url not in working]
    note = f"guide also links {len(dead)} dead URL(s)" if dead else ""

    if current and current in working:
        return Result(form["id"], "confirmed", current, "guide", note)
    if working:
        best = max(working, key=lambda url: rank(url, candidates[url]))
        was = f"was {current}" if current else "was empty"
        return Result(form["id"], "updated", best, "guide", "; ".join(filter(None, [was, note])))
    if current and check(current) is None:
        reason = "every guide link for it is dead" if dead else "the guide does not hyperlink it"
        return Result(form["id"], "manual", current, "manual", reason)
    return Result(form["id"], "dead", current, "manual", "no working URL found")


def sync(
    forms: list[dict],
    links: list[Link],
    check: Callable[[str], str | None],
) -> tuple[list[Result], list[Link]]:
    candidates, unclaimed = candidates_by_form(forms, links)
    cache: dict[str, str | None] = {}

    def cached(url: str) -> str | None:
        if url not in cache:
            cache[url] = check(url)
        return cache[url]

    results = [resolve(form, candidates[form["id"]], cached) for form in forms]
    known = {result.url for result in results}
    suggestions = [
        link for link in unclaimed if link.url not in known and cached(link.url) is None
    ]
    return results, suggestions


def apply(forms: list[dict], results: list[Result], today: str) -> None:
    """Write resolved URLs back into the registry entries (in place)."""
    by_id = {result.form_id: result for result in results}
    for form in forms:
        result = by_id[form["id"]]
        if result.status == "dead":
            continue
        form["url"] = result.url
        form["urlSource"] = result.source
        form["lastVerified"] = today


def _load_checker() -> Callable[[str], str | None]:
    path = Path(__file__).with_name("check_form_links.py")
    spec = importlib.util.spec_from_file_location("check_form_links", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.check


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--write", action="store_true", help="save the resolved URLs to forms_catalog.json")
    args = parser.parse_args(argv)

    if not SECTIONS.is_file():
        print(f"Extracted guide not found: {SECTIONS}\nRun ParsePDFChuckes/1_parser/run_all.sh first.", file=sys.stderr)
        return 1

    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    forms = catalog["forms"]
    links = extract_links(json.loads(SECTIONS.read_text(encoding="utf-8")))
    results, unclaimed = sync(forms, links, _load_checker())

    for result in results:
        detail = f"  ({result.detail})" if result.detail else ""
        print(f"[{result.status:9}] {result.form_id}{detail}")
        if result.status == "updated":
            print(f"             -> {result.url}")

    counts = Counter(result.status for result in results)
    print(
        f"\n{len(forms)} forms: {counts['confirmed']} confirmed by the guide, "
        f"{counts['updated']} updated from the guide, {counts['manual']} manual, {counts['dead']} dead."
    )

    if unclaimed:
        print("\nWorking form-like links in the guide that are not in the registry (consider adding):")
        for url in sorted({link.url for link in unclaimed}):
            texts = sorted({link.text for link in unclaimed if link.url == url}, key=len)
            print(f"  {url}\n      \"{texts[0]}\"")

    if args.write:
        apply(forms, results, dt.date.today().isoformat())
        CATALOG.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"\nWrote {CATALOG.relative_to(ROOT)}")
    else:
        print("\nDry run. Re-run with --write to save.")

    return 1 if counts["dead"] else 0


if __name__ == "__main__":
    sys.exit(main())
