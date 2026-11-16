#!/usr/bin/env python3
"""Check that every FAA form link in forms_catalog.json still works.

Run with `python src/scripts/capstone.py check-links`. Sends a HEAD request to
each URL (falling back to GET if the server rejects HEAD) and exits 1 if any
link is dead. Needs network access to faa.gov, so it runs in its own CI
workflow (.github/workflows/form-links.yml) rather than the default test run.
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

CATALOG = Path(__file__).resolve().parents[1] / "data" / "guidance" / "forms_catalog.json"
# faa.gov rejects requests without a browser-like user agent.
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
TIMEOUT_SECONDS = 30


# Servers that do not support HEAD answer with one of these; retry with GET.
HEAD_NOT_SUPPORTED = {403, 405, 501}


def _request(url: str, method: str) -> str | None:
    request = urllib.request.Request(
        url, headers={"User-Agent": USER_AGENT}, method=method
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        content_type = response.headers.get("Content-Type", "")
        if "pdf" not in content_type.lower():
            return f"not a PDF (Content-Type: {content_type or 'missing'})"
        return None


def check(url: str) -> str | None:
    """Return None when the URL serves a PDF, otherwise a short reason."""
    try:
        try:
            return _request(url, "HEAD")
        except urllib.error.HTTPError as exc:
            if exc.code not in HEAD_NOT_SUPPORTED:
                raise
            return _request(url, "GET")
    except urllib.error.HTTPError as exc:
        return f"HTTP {exc.code}"
    except (urllib.error.URLError, TimeoutError) as exc:
        return f"request failed: {exc}"


def load_forms(catalog: Path = CATALOG) -> list[dict]:
    return json.loads(catalog.read_text(encoding="utf-8"))["forms"]


def main() -> int:
    forms = load_forms()
    failures = 0
    for form in forms:
        problem = check(form["url"])
        if problem:
            failures += 1
            print(f"[fail] {form['id']}: {problem}\n       {form['url']}")
        else:
            print(f"[ok]   {form['id']}")
    print(f"\n{len(forms) - failures} of {len(forms)} form links work.")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
