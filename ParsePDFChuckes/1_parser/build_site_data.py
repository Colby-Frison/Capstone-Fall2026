#!/usr/bin/env python3
"""
Turn the parser output (sections.json) into website data organised by
CONDITION, matching the site's URL scheme:

    https://<site>/?condition=abdomen-and-viscera-and-anus-conditions
                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ condition id

Usage:
    python build_site_data.py <parser-output>/sections.json website_data/

Output (website_data/):
    conditions.json            all conditions, in guide order (full records)
    conditions/<id>.json       one file per condition (load on demand)
    index.json                 light list for search / menus: id, name, category, decisions, aliases
    categories.json            body systems (exam items) -> condition ids, in exam order
    reference/<slug>.json      the rest of the guide (medications, CACI, AASI, protocols, ...)
    reference.json             list of reference pages (slug, title, group)
    meta.json                  source, generation date, counts, validation summary
    validation_report.md       checks: every disposition row placed once, no empty conditions, ...

A condition in the guide looks like this (the parser keeps this order):

    BARRETT'S ESOPHAGUS              <- heading      -> name / id
    All Classes                      <- applies to
    (Updated 4/27/2022)              <- updated
    [DISEASE/CONDITION | EVALUATION DATA | DISPOSITION]   <- rows
    notes, CACI worksheet, status summary ...             <- extras
"""
import datetime
import html as htmlmod
import json
import os
import re
import sys
import unicodedata
from collections import Counter, OrderedDict

FAA_URL = "https://www.faa.gov/ame_guide"
DISPO = ("DISEASE/CONDITION", "EVALUATION DATA", "DISPOSITION")
UPDATED_RE = re.compile(r"\(?\s*Updated\s+(\d{1,2}/\d{1,2}/\d{2,4})\s*\)?", re.I)
APPLIES_RE = re.compile(r"\(?\s*(All classes|AASIs for ALL CLASSES|ATCS - Air Traffic Control Specialist|"
                        r"(?:First|Second|Third|1st|2nd|3rd)[^.()]{0,50}Class(?:es)?(?: only)?)\s*\)?", re.I)
NOT_HEADINGS = {"NOTES", "NOTE", "CONDITIONS", "DISEASE/CONDITION", "EVALUATION DATA", "DISPOSITION",
                "AME MUST REVIEW", "ACCEPTABLE CERTIFICATION CRITERIA", "ISSUE", "DEFER", "YES", "NO"}
DECISIONS = [  # (pattern, normalized decision)
    (r"\bDENY\b", "deny"),
    (r"\bDEFER\b", "defer"),
    (r"Requires? FAA Decision", "faa_decision"),
    (r"\bCACI\b", "caci"),
    (r"\bAASI\b", "aasi"),
    (r"Special Issuance", "special_issuance"),
    (r"\bISSUE\b", "issue"),
    (r"MORE INFO NEEDED", "more_info_needed"),
]
ITEM_RE = re.compile(r"^ITEMS?\s+([\d.\-a-z]+)\.?\s+(.*)$", re.I)


# --------------------------------------------------------------------------
def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = s.replace("'", "").replace("’", "")
    return re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()[:90].strip("-")


JUNK_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\uf000-\uf0ff\u25a1\u2610]")


def clean(s):
    s = JUNK_RE.sub(" ", (s or "").replace("\u00a0", " "))
    return re.sub(r"\s+", " ", s).strip()


def sanitize(obj):
    """Remove control characters and private-use bullet glyphs everywhere."""
    if isinstance(obj, str):
        out = JUNK_RE.sub(" ", obj)
        return re.sub(r"[ \t]{2,}", " ", out).strip()
    if isinstance(obj, list):
        return [sanitize(x) for x in obj]
    if isinstance(obj, dict):
        return obj.__class__((k, sanitize(v)) for k, v in obj.items())
    return obj


def strip_tags(h):
    return clean(htmlmod.unescape(re.sub(r"<[^>]+>", " ", h or "")))


ACRONYMS = {"HIV", "ADHD", "PTSD", "GERD", "COPD", "CKD", "CLL", "SLL", "ALL", "HCM", "HOCM", "IHSS", "WPW", "AVM",
            "POTS", "TAO", "CSID", "BPPV", "PLF", "PPPD", "SSCDS", "CI", "MS", "TIA", "CVA", "TGA", "TBI", "CHI",
            "DBS", "RLS", "PAC", "CAD", "CHD", "MI", "HTN", "MVP", "PCOS", "HRT", "DUI", "DWI", "MASH", "NASH",
            "MASLD", "NAFLD", "TIC", "ITP", "AFIB", "ENT", "G-U", "ATCS", "CT", "MRI", "ECG", "EKG", "II", "III", "IV",
            "CHF", "PFO", "ASD", "VSD", "ICD", "SVT", "PAT", "VTE", "DVT", "PE", "OSA", "CSA", "NF1", "COVID-19",
            "COVID", "AME", "AMES", "FAA", "ALS", "ULOC", "3PD", "SI", "SODA", "CACI", "AASI", "HIMS"}
SMALL = {"and", "or", "of", "the", "in", "on", "for", "to", "with", "a", "an", "by", "without"}


def display_name(name):
    """'BARRETT'S ESOPHAGUS' -> "Barrett's Esophagus"; keeps acronyms (CKD, HIV, ...)."""
    def fix(word, first):
        core = re.sub(r"[^A-Za-z0-9-]", "", word)
        if word.startswith("(") and core.isupper() and len(core) <= 5:
            return word                      # (ALS), (ULOC), (3PD)
        if core.upper() in ACRONYMS and (core.isupper() or len(core) <= 4):
            return word.upper() if core.upper() != "AFIB" else word.replace(core, "AFib")
        if not core.isupper():
            return word                      # already mixed case in the guide
        if not first and core.lower() in SMALL:
            return word.lower()
        out = re.sub(r"[A-Za-z]+", lambda m: m.group(0).capitalize(), word.lower())
        out = re.sub(r"(?<=[’'])S\b", "s", out)           # Meniere’S -> Meniere’s
        out = re.sub(r"\((S|Es)\)", lambda m: m.group(0).lower(), out)  # Stone(S) -> Stone(s)
        return out
    words = name.split(" ")
    return " ".join(fix(w, i == 0) for i, w in enumerate(words))


def is_dispo(table):
    h = table.get("header") or []
    return "DISPOSITION" in [clean(x).upper() for x in h]


def heading_residue(text):
    """Remove 'All Classes' / '(Updated …)' from a line; what's left may be a heading."""
    t = UPDATED_RE.sub(" ", text)
    t = APPLIES_RE.sub(" ", t)
    return clean(t).strip(" -–:")


def looks_like_heading(t):
    if not (2 <= len(t) <= 110) or t.upper() in NOT_HEADINGS:
        return False
    if t.startswith(("[", "-", "•", "(")) or t.endswith((".", ":", ";")):
        return False
    if re.match(r"^(\d+\.|[A-Z]\.|I+\.|IV\.|V\.)\s", t):
        return False
    letters = [c for c in t if c.isalpha()]
    return len(letters) >= 3


def upper_heavy(t):
    letters = [c for c in t if c.isalpha()]
    return len(letters) >= 3 and sum(c.isupper() for c in letters) >= 0.7 * len(letters)


def heading_part(t):
    """A line that can belong to a (multi-line) condition heading."""
    if not (1 <= len(t) <= 110) or t.upper() in NOT_HEADINGS:
        return False
    if t.startswith(("[", "-", "•", "*")) or re.match(r"^(\d+\.|[A-Z]\.|I+\.|IV\.|V\.)\s", t):
        return False
    if t.endswith(".") and not t.endswith(".)"):
        return False
    if re.match(r"^(NOTE|Notes?)\b", t):
        return False
    return True


def links_in(h):
    return [{"text": strip_tags(m.group(2)), "href": m.group(1)}
            for m in re.finditer(r'<a href="([^"]+)"[^>]*>(.*?)</a>', h or "", re.S)]


# --------------------------------------------------------------------------
# Rows
# --------------------------------------------------------------------------
def checklist(eval_html, eval_text):
    """Turn the 'Evaluation data' cell into a list of things to bring/submit."""
    items = []
    for m in re.finditer(r"<li>(.*?)</li>", eval_html or "", re.S):
        inner = m.group(1)
        if "<li>" in inner:                     # nested list: keep the lead-in only
            inner = inner.split("<ul")[0]
        t = strip_tags(inner)
        if t:
            items.append(t)
    for m in re.finditer(r"<p>(.*?)</p>", eval_html or "", re.S):
        t = strip_tags(m.group(1))
        if re.match(r"^\(?\d{1,2}[.)]\s+\S", t):
            items.append(t)
    if not items and re.match(r"\s*(Submit|Provide|Bring|Obtain|Review|A current)", eval_text or "", re.I):
        items = [clean(eval_text)]
    out, seen = [], set()
    for t in items:
        t = clean(t)
        t = re.sub(r"^\(?\d{1,2}[.)]\s*", "", t).strip()
        t = re.sub(r"^[-•o]\s+", "", t)
        k = t.lower()
        if len(t) > 2 and k not in seen:
            seen.add(k)
            out.append(t)
    return out


def decisions_of(text):
    found = []
    for pat, name in DECISIONS:
        for m in re.finditer(pat, text or "", re.I):
            found.append((m.start(), name))
    found.sort()
    if not found and re.match(r"\s*See\b", text or ""):
        return ["see_reference"]
    out = []
    for _, n in found:
        if n not in out:
            out.append(n)
    return out


def row_record(cells, header):
    texts = [c["text"] for c in cells]
    htmls = [c["html"] for c in cells]
    if len(cells) == 3:
        cond_t, ev_t, dis_t = texts
        cond_h, ev_h, dis_h = htmls
    else:  # unusual shape: keep everything
        cond_t, ev_t, dis_t = texts[0], " ".join(texts[1:-1]), texts[-1]
        cond_h, ev_h, dis_h = htmls[0], "\n".join(htmls[1:-1]), htmls[-1]
    m = re.match(r"^([A-Z])\.\s*(.*)$", cond_t, re.S)
    label, cond_plain = (m.group(1), m.group(2)) if m else (None, cond_t)
    return OrderedDict([
        ("label", label),
        ("condition", clean(cond_plain)),
        ("condition_html", cond_h),
        ("evaluation_data", clean(ev_t)),
        ("evaluation_data_html", ev_h),
        ("what_to_bring", checklist(ev_h, ev_t)),
        ("decisions", decisions_of(dis_t)),
        ("disposition", clean(dis_t)),
        ("disposition_html", dis_h),
    ])


# --------------------------------------------------------------------------
# Categories (body systems / exam items)
# --------------------------------------------------------------------------
def categorize(sections):
    """Each section -> its exam item / body system: the closest preceding
    'ITEM nn.' section within the same major part of the guide."""
    by_id = {s["id"]: s for s in sections}

    def major(s):
        while s.get("parent_id") is not None and s["parent_id"] in by_id:
            s = by_id[s["parent_id"]]
        return s

    cats, current, cur_major = {}, None, None
    for s in sections:
        mj = major(s)
        if mj["id"] != cur_major:
            cur_major, current = mj["id"], None
        m = ITEM_RE.match(s["title"])
        if m:
            current = {"id": slugify(m.group(2)), "name": clean(m.group(2)),
                       "item": m.group(1).rstrip("."), "section": s["slug"]}
        if current is None:
            if mj["title"].upper().startswith("AME PHYSICAL EXAMINATION"):
                current = {"id": "general", "name": "General", "item": None, "section": s["slug"]}
            else:
                current = {"id": slugify(mj["title"]), "name": display_name(mj["title"]),
                           "item": None, "section": mj["slug"]}
        cats[s["slug"]] = dict(current, part=display_name(mj["title"]))
    return cats


# --------------------------------------------------------------------------
# Conditions
# --------------------------------------------------------------------------
def build_conditions(sections):
    cats = categorize(sections)
    conditions = OrderedDict()
    global category_intros
    category_intros = {}
    placed_rows = 0
    total_rows = 0
    reference_sections = []

    for s in sections:
        blocks = s.get("blocks", [])
        tables = s["tables"]
        dispo_idx = [i for i, b in enumerate(blocks) if b["type"] == "table" and is_dispo(tables[b["table_index"]])]
        total_rows += sum(len(tables[blocks[i]["table_index"]]["rows"]) for i in dispo_idx)
        if not dispo_idx:
            reference_sections.append(s)
            continue

        # 1) find the heading for every disposition table -> condition starts
        starts = []           # (start block, table block, name, subtitle, applies, updated)
        used = set()
        for ti in dispo_idx:
            applies, updated, parts, start = None, None, [], None
            j = ti - 1
            while j >= 0 and blocks[j]["type"] != "table" and j not in used and ti - j <= 7:
                t = blocks[j]["text"]
                if updated is None:
                    mu = UPDATED_RE.search(t) or re.search(r"\(Updates? (\d{1,2}/\d{1,2}/\d{2,4})\)", t)
                    if mu:
                        updated = mu.group(1)
                if applies is None and len(t) < 120:
                    ma = APPLIES_RE.search(t)
                    if ma:
                        applies = clean(ma.group(1))
                res = heading_residue(re.sub(r"\(Updates? [^)]*\)", " ", t))
                if not res:                      # only 'All Classes' / '(Updated ...)'
                    start = j
                    j -= 1
                    continue
                if not heading_part(res) or len(t) > 140:
                    break                        # body text of the previous condition
                parts.insert(0, (j, res))
                start = j
                if len(parts) >= 4:
                    break
                j -= 1
            name = subtitle = None
            if parts:
                caps = [k for k, (_, r) in enumerate(parts) if upper_heavy(r)]
                if caps:                         # notes above the heading are not part of it
                    parts = parts[caps[0]:]
                    start = parts[0][0]
                main = [parts[0][1]]
                k = 1
                while k < len(parts) and main[-1].rstrip().endswith(("/", ",", "-", "(")):
                    main.append(parts[k][1]); k += 1
                name = clean(" ".join(main)).rstrip("*").strip()
                rest = clean(" ".join(r for _, r in parts[k:]))
                subtitle = rest or None
                if not looks_like_heading(name):
                    name, subtitle = None, None
            if name is None and not starts:
                name = re.sub(r"^ITEMS?\s+[\d.\-a-z]+\.?\s+", "", s["title"], flags=re.I)
            if start is None:
                start = ti
            starts.append((start, ti, name, subtitle, applies, updated))
            used.update(range(start, ti + 1))

        # 2) cut the section into conditions; tables without a heading continue the previous one
        segs = []
        for n, (start, ti, name, subtitle, applies, updated) in enumerate(starts):
            if name is None and segs:
                segs[-1]["tables"].append(ti)
                continue
            segs.append({"start": start, "tables": [ti], "name": name, "subtitle": subtitle,
                         "applies": applies, "updated": updated})
        for n, sg in enumerate(segs):
            sg["end"] = segs[n + 1]["start"] if n + 1 < len(segs) else len(blocks)
            for q in range(max(sg["tables"]) + 1, sg["end"]):
                if blocks[q]["type"] != "table" and ITEM_RE.match(blocks[q]["text"]) and len(blocks[q]["text"]) < 90:
                    sg["item_line"] = q
                    break
        # text before the first condition (CFR, exam techniques) stays with the section page
        intro_end = segs[0]["start"] if segs else len(blocks)

        cat = cats[s["slug"]]
        scan_from = 0
        for sg in segs:
            for q in range(scan_from, sg["start"]):
                b = blocks[q]
                mi = ITEM_RE.match(b.get("text", "")) if b["type"] != "table" else None
                if mi and len(b["text"]) < 90 and (cat["item"] is None or "-" in mi.group(1)):
                    nm = re.sub(r"\s*\(Updated[^)]*\)", "", mi.group(2)).strip()
                    cat = dict(cat, id=slugify(nm), name=nm, item=mi.group(1).rstrip("."))
                    intro = [x for x in blocks[q:sg["start"]]]
                    category_intros.setdefault(cat["id"], []).extend(
                        x["html"] if x["type"] != "table" else _table_html(tables[x["table_index"]]) for x in intro)
            scan_from = sg.get("item_line", sg["end"])
            if "item_line" in sg:
                sg["end"] = sg["item_line"]
            name = sg["name"]
            cid = slugify(name)
            rec = conditions.get(cid)
            if rec is None:
                rec = OrderedDict([
                    ("id", cid), ("name", display_name(name)), ("subtitle", sg["subtitle"]),
                    ("name_in_guide", clean(name + " " + (sg["subtitle"] or ""))),
                    ("category", {"id": cat["id"], "name": cat["name"], "exam_item": cat["item"],
                                  "part": cat["part"]}),
                    ("applies_to", sg["applies"] or "All Classes"),
                    ("updated", sg["updated"]),
                    ("order", len(conditions) + 1),
                    ("decisions", []), ("what_to_bring", []), ("rows", []),
                    ("caci_worksheets", []), ("status_summaries", []),
                    ("notes_html", ""), ("links", []), ("aliases", []),
                    ("source", {"section": s["slug"], "section_title": s["title"], "pdf_pages": [],
                                "faa_url": FAA_URL}),
                ])
                conditions[cid] = rec
            elif sg["updated"] and not rec["updated"]:
                rec["updated"] = sg["updated"]

            notes, i = [], sg["start"]
            while i < sg["end"]:
                b = blocks[i]
                if b["type"] == "table":
                    t = tables[b["table_index"]]
                    if i in sg["tables"]:
                        prev_row = None
                        for cells in t["rows"]:
                            placed_rows += 1
                            texts = tuple(clean(c["text"]).upper() for c in cells)
                            if not any(texts) or texts == DISPO:
                                continue                    # empty / repeated header row
                            r = row_record(cells, t["header"])
                            r["pdf_page"] = b.get("page")
                            r["disposition_shared_with_previous_row"] = False
                            if not r["disposition"] and prev_row is not None and prev_row["disposition"]:
                                # merged (row-spanning) disposition cell in the PDF
                                r["decisions"] = list(prev_row["decisions"])
                                r["disposition"] = prev_row["disposition"]
                                r["disposition_html"] = prev_row["disposition_html"]
                                r["disposition_shared_with_previous_row"] = True
                            rec["rows"].append(r)
                            prev_row = r
                    elif t["header"] and "AME MUST REVIEW" in [clean(x).upper() for x in t["header"]]:
                        ws = rec["caci_worksheets"][-1] if rec["caci_worksheets"] else None
                        if ws is None:
                            ws = {"title": f"CACI – {rec['name']} Worksheet", "updated": None,
                                  "criteria": [], "block_60_options": []}
                            rec["caci_worksheets"].append(ws)
                        for cells in t["rows"]:
                            txt = [c["text"] for c in cells]
                            ws["criteria"].append({"ame_must_review": txt[0],
                                                   "acceptable_certification_criteria": " ".join(x for x in txt[1:] if x)})
                    else:
                        notes.append(_table_html(t))
                    rec["source"]["pdf_pages"].append(b.get("page"))
                    i += 1
                    continue
                txt = b["text"]
                if i in range(sg["start"], min(sg["tables"])):     # heading / applies / updated lines
                    i += 1
                    continue
                if re.match(r"^CACI\b.*(Worksheet|–|-)", txt):
                    mu = UPDATED_RE.search(txt) or (UPDATED_RE.search(blocks[i + 1]["text"]) if i + 1 < len(blocks) and blocks[i + 1]["type"] != "table" else None)
                    rec["caci_worksheets"].append({"title": clean(UPDATED_RE.sub("", txt)),
                                                   "updated": mu.group(1) if mu else None,
                                                   "criteria": [], "block_60_options": []})
                elif txt.startswith("[ ]") and rec["caci_worksheets"]:
                    rec["caci_worksheets"][-1]["block_60_options"].append(txt[3:].strip())
                elif re.search(r"Status Summary", txt) and len(txt) < 120:
                    rec["status_summaries"].append(clean(UPDATED_RE.sub("", txt)))
                    notes.append(b["html"])
                elif rec["caci_worksheets"] and re.match(r"^(To determine the applicant|AME MUST NOTE)", txt):
                    pass                                            # worksheet boilerplate
                else:
                    notes.append(b["html"])
                rec["source"]["pdf_pages"].append(b.get("page"))
                i += 1
            if notes:
                rec["notes_html"] = (rec["notes_html"] + "\n" + "\n".join(notes)).strip()

        if intro_end > 0:
            reference_sections.append(dict(s, blocks=blocks[:intro_end], _intro_only=True))

    # finish records
    for rec in conditions.values():
        rec["source"]["pdf_pages"] = sorted({p for p in rec["source"]["pdf_pages"] if p}) or None
        for r in rec["rows"]:
            for d in r["decisions"]:
                if d not in rec["decisions"]:
                    rec["decisions"].append(d)
            for w in r["what_to_bring"]:
                if w not in rec["what_to_bring"]:
                    rec["what_to_bring"].append(w)
        all_html = rec["notes_html"] + " ".join(r["evaluation_data_html"] + r["disposition_html"] for r in rec["rows"])
        seen = set()
        for l in links_in(all_html):
            if l["href"] not in seen:
                seen.add(l["href"])
                rec["links"].append(l)
        # rows without A./B. labels in "group" conditions name their own sub-condition
        if rec["rows"] and all(r["label"] is None for r in rec["rows"]) and len(rec["rows"]) > 1:
            rec["aliases"] = [r["condition"][:80] for r in rec["rows"] if r["condition"]]
        if rec["source"]["pdf_pages"]:
            rec["source"]["faa_url"] = FAA_URL
    return list(conditions.values()), reference_sections, placed_rows, total_rows


def _table_html(t):
    out = ["<table>"]
    if t.get("header"):
        out.append("<thead><tr>" + "".join(f"<th>{htmlmod.escape(h)}</th>" for h in t["header"]) + "</tr></thead>")
    out.append("<tbody>")
    for r in t["rows"]:
        out.append("<tr>" + "".join(f"<td>{c['html']}</td>" for c in r) + "</tr>")
    out.append("</tbody></table>")
    return "".join(out)


# --------------------------------------------------------------------------
def main(sections_path, out_dir):
    sections = json.load(open(sections_path, encoding="utf-8"))
    conditions, refs, placed, total = build_conditions(sections)
    os.makedirs(os.path.join(out_dir, "conditions"), exist_ok=True)
    os.makedirs(os.path.join(out_dir, "reference"), exist_ok=True)

    def dump(obj, *path):
        with open(os.path.join(out_dir, *path), "w", encoding="utf-8") as f:
            json.dump(sanitize(obj), f, ensure_ascii=False, indent=1)

    dump(conditions, "conditions.json")
    for c in conditions:
        dump(c, "conditions", f"{c['id']}.json")

    index = [OrderedDict([("id", c["id"]), ("name", c["name"]), ("category", c["category"]["id"]),
                          ("category_name", c["category"]["name"]), ("decisions", c["decisions"]),
                          ("has_caci", bool(c["caci_worksheets"])), ("aliases", c["aliases"]),
                          ("rows", len(c["rows"])), ("updated", c["updated"])]) for c in conditions]
    dump(index, "index.json")

    cats = OrderedDict()
    for c in conditions:
        k = c["category"]["id"]
        if k not in cats:
            cats[k] = OrderedDict([("id", k), ("name", c["category"]["name"]),
                                   ("exam_item", c["category"]["exam_item"]), ("part", c["category"]["part"]),
                                   ("order", len(cats) + 1),
                                   ("intro_html", "\n".join(category_intros.get(k, [])) or None),
                                   ("conditions", [])])
        cats[k]["conditions"].append(c["id"])
    dump(list(cats.values()), "categories.json")

    ref_list = []
    sec_by_id = {s["id"]: s for s in sections}
    for s in refs:
        tables = s["tables"]
        blocks = []
        for b in s["blocks"]:
            if b["type"] == "table":
                t = tables[b["table_index"]]
                blocks.append({"type": "table", "page": b.get("page"), "header": t["header"],
                               "rows": [[c["text"] for c in r] for r in t["rows"]],
                               "html": _table_html(t)})
            else:
                blocks.append({"type": b["type"], "page": b.get("page"), "text": b["text"], "html": b["html"]})
        par = sec_by_id.get(s.get("parent_id"))
        rec = OrderedDict([("slug", s["slug"]), ("title", s["title"]),
                           ("group", par["title"] if par else None),
                           ("intro_of_condition_section", bool(s.get("_intro_only"))),
                           ("pdf_pages", s["pdf_pages"]), ("blocks", blocks)])
        dump(rec, "reference", f"{s['slug']}.json")
        ref_list.append(OrderedDict([("slug", s["slug"]), ("title", s["title"]), ("group", rec["group"]),
                                     ("intro_of_condition_section", rec["intro_of_condition_section"])]))
    dump(ref_list, "reference.json")

    # ---- validation ------------------------------------------------------
    issues = []
    empty = [c["id"] for c in conditions if not c["rows"]]
    no_dec = [(c["id"], r["label"] or r["condition"][:40]) for c in conditions for r in c["rows"] if not r["decisions"]]
    dup_ids = [k for k, v in Counter(c["id"] for c in conditions).items() if v > 1]
    if placed != total:
        issues.append(f"{total - placed} disposition rows were not placed in a condition")
    if empty:
        issues.append(f"conditions without rows: {empty}")
    if dup_ids:
        issues.append(f"duplicate ids: {dup_ids}")
    meta = OrderedDict([
        ("source", "FAA Guide for Aviation Medical Examiners"),
        ("source_url", FAA_URL),
        ("guide_version", _guide_version(sections)),
        ("generated", datetime.date.today().isoformat()),
        ("counts", {"conditions": len(conditions), "categories": len(cats),
                    "disposition_rows": placed, "reference_pages": len(ref_list)}),
        ("validation", {"disposition_rows_in_guide": total, "disposition_rows_placed": placed,
                        "rows_without_recognised_decision": len(no_dec), "issues": issues}),
    ])
    dump(meta, "meta.json")
    rep = ["# Validation report", "",
           f"- Disposition rows in the guide: **{total}**; placed in a condition: **{placed}**",
           f"- Conditions: **{len(conditions)}** in **{len(cats)}** categories",
           f"- Conditions with no rows: {len(empty)}",
           f"- Rows whose disposition has no ISSUE/DEFER/DENY/CACI/AASI keyword "
           f"(free-text dispositions, check by hand): {len(no_dec)}", ""]
    rep += [f"  - {cid}: {lab}" for cid, lab in no_dec]
    rep += ["", "## Conditions by category", ""]
    for c in cats.values():
        rep.append(f"**{c['name']}** ({c['exam_item'] or c['part']}): " +
                   ", ".join(next(x["name"] for x in conditions if x["id"] == i) for i in c["conditions"]))
        rep.append("")
    with open(os.path.join(out_dir, "validation_report.md"), "w") as f:
        f.write("\n".join(rep) + "\n")
    print(f"{len(conditions)} conditions in {len(cats)} categories; rows placed {placed}/{total}; "
          f"{len(ref_list)} reference pages; issues: {issues or 'none'}")


def _guide_version(sections):
    for s in sections[:3]:
        m = re.search(r"Updated (\d{2}/\d{2}/\d{4})", s.get("text", ""))
        if m:
            return m.group(1)
    return None


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
