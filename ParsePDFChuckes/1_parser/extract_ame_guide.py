#!/usr/bin/env python3
"""
Extract the FAA "Guide for Aviation Medical Examiners" PDF into website-ready data.

How it works
------------
1. The PDF's bookmarks (outline) define the sections -> one web page each.
2. The PDF is a *tagged* PDF (exported from Word). We walk its structure tree
   top-down, which gives headings, paragraphs, lists, tables (TR/TH/TD with
   row/col spans) and links in reading order - tables that run over several
   pages come out as one table.
3. Some content in this PDF was never tagged (~3%, about 70 pages, mostly
   tables). That content is rebuilt from the page layout: table grid lines
   for tables, text positions for paragraphs.

Usage
-----
    pip install pdfplumber pypdf
    python extract_ame_guide.py ame_guide.pdf out/

Outputs (in out/)
-----------------
    sections.json            every section: id, slug, title, level, parent, pages, html, text, tables
    sections.csv             one row per section (title, slug, parent, html)      -> CMS import
    tables.csv               every table row of every section, flat              -> spreadsheet / CMS
    disposition_tables.csv   only the Condition / Evaluation Data / Disposition rows
    site/                    a plain static website (index.html + one page per section)
    site/images/             figures cropped from the PDF
    report.txt               extraction notes (untagged pages, coverage)
"""
import copy
import csv
import html
import json
import os
import re
import sys
import unicodedata
from collections import defaultdict

import pdfplumber
import pypdf
from pypdf.generic import ArrayObject, DictionaryObject, IndirectObject, NullObject

SOURCE_URL = "https://www.faa.gov/ame_guide"
HEADER_BAND, FOOTER_BAND = 62, 735          # running header / page number zone (pt)
CONTAINERS = {"Document", "Sect", "Part", "Div", "Art", "NonStruct", "Private", "Footnote", "Note"}
BLOCK_TYPES = {"P", "L", "Table", "Figure", "BlockQuote", "Caption", "Sect", "Div",
               "H", "H1", "H2", "H3", "H4", "H5", "H6", "TOC"}
BULLETS = set("o•●○◦▪■□–-·")
DISPO_HEADER = ("DISEASE/CONDITION", "EVALUATION DATA", "DISPOSITION")
ENUM_RE = re.compile(r"^\s*(?:[•●○◦▪■]|-\s|\(?[0-9]{1,2}[.)]\s?|\(?[a-zA-Z][.)]\s|[ivx]{1,4}\.\s)")


def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s[:80].strip("-") or "section"


def clean(s):
    return re.sub(r"\s+", " ", (s or "").replace(" ", " ")).strip()


def obj(x):
    return x.get_object() if isinstance(x, IndirectObject) else x


# ==========================================================================
# Text helpers
# ==========================================================================
class Ch:
    """Light-weight character (pdfplumber char dicts are large)."""
    __slots__ = ("t", "x0", "x1", "top", "bottom", "size", "bold")

    def __init__(self, c):
        self.t = c["text"]; self.x0 = c["x0"]; self.x1 = c["x1"]
        self.top = c["top"]; self.bottom = c["bottom"]; self.size = c["size"] or 10
        self.bold = "Bold" in (c.get("fontname") or "")


def chars_to_html(chars):
    """Characters -> (html, text). Adds spaces at gaps / line breaks, wraps bold runs."""
    if not chars:
        return "", ""
    pieces, prev = [], None
    for ch in chars:
        if prev is not None:
            new_line = abs(ch.top - prev.top) > prev.size * 0.5
            if (new_line or ch.x0 - prev.x1 > prev.size * 0.18) and ch.t != " ":
                if pieces and not pieces[-1][0].endswith(" "):
                    if not (new_line and pieces[-1][0].endswith("-") and ch.t.islower()):
                        pieces.append((" ", pieces[-1][1]))
        pieces.append((ch.t, ch.bold))
        prev = ch
    text = clean("".join(p for p, _ in pieces))
    out, cur, buf = [], None, ""
    for t, b in pieces:
        if b != cur and buf:
            out.append(f"<strong>{html.escape(buf)}</strong>" if cur and buf.strip() else html.escape(buf))
            buf = ""
        cur = b
        buf += t
    if buf:
        out.append(f"<strong>{html.escape(buf)}</strong>" if cur and buf.strip() else html.escape(buf))
    h = re.sub(r"\s+", " ", "".join(out)).strip()
    h = re.sub(r"</strong>(\s*)<strong>", r"\1", h)
    return h, text


def bbox(chars):
    return (min(c.x0 for c in chars), min(c.top for c in chars),
            max(c.x1 for c in chars), max(c.bottom for c in chars))


def lines_of(chars):
    """Group chars into visual lines (top-to-bottom, left-to-right)."""
    lines = []
    for c in sorted(chars, key=lambda c: (round(c.top), c.x0)):
        if lines and abs(lines[-1][0].top - c.top) < c.size * 0.45:
            lines[-1].append(c)
        else:
            lines.append([c])
    return [sorted(l, key=lambda c: c.x0) for l in lines]


def paragraphs_of(chars):
    """Group loose chars into paragraphs by vertical gaps and list markers."""
    paras = []
    prev = None
    for line in lines_of(chars):
        txt = "".join(c.t for c in line)
        h = line[0].size
        gap = (line[0].top - prev[0].bottom) if prev else 0
        indent_jump = prev and abs(line[0].x0 - prev[0].x0) > 30 and gap > 2
        if (prev is None or gap > h * 0.8 or ENUM_RE.match(txt) or indent_jump):
            paras.append(list(line))
        else:
            paras[-1].extend(line)
        prev = line
    return paras


# ==========================================================================
# Outline (bookmarks) -> sections; destination resolving
# ==========================================================================
class Outline:
    def __init__(self, reader):
        self.r = reader
        self.pnum = {p.indirect_reference.idnum: i for i, p in enumerate(reader.pages)}
        self.items = []
        self._walk(reader.outline, 0, None)
        self.majors = set()
        used = set()
        for it in self.items:
            s = base = slugify(it["title"])
            n = 2
            while s in used:
                s = f"{base}-{n}"; n += 1
            used.add(s)
            it["slug"] = s
        try:
            self.named = {str(k): v for k, v in reader.named_destinations.items()}
        except Exception:
            self.named = {}

    def fix_hierarchy(self, pdf):
        """The PDF's bookmarks nest most of the guide under 'Condition Not Listed'.
        Rebuild the top level from the printed table of contents, where the major
        sections are the bold, left-aligned entries."""
        def norm(t):
            return re.sub(r"[^a-z0-9]+", " ", t.lower()).strip()
        bold_lines = []
        for page in pdf.pages[1:12]:
            for l in page.extract_text_lines():
                cs = [c for c in l["chars"] if c["text"].strip()]
                if cs and all("Bold" in (c.get("fontname") or "") for c in cs) and re.search(r"(\.{3,}|\s)\d+\s*$", l["text"]):
                    bold_lines.append((round(l["x0"]), norm(re.sub(r"[.\s]*\d+\s*$", "", l["text"]))))
        if not bold_lines:
            return
        x = max(set(b[0] for b in bold_lines), key=lambda v: sum(1 for b in bold_lines if b[0] == v))
        majors = {t for bx, t in bold_lines if bx == x}
        is_major, seen = {}, set()
        for it in self.items:          # only the first bookmark with a major title
            t = norm(it["title"])
            is_major[it["id"]] = t in majors and t not in seen
            if is_major[it["id"]]:
                seen.add(t)
        if sum(is_major.values()) < 3:
            return
        orig = {it["id"]: dict(it) for it in self.items}
        cur = None
        for it in self.items:
            o = orig[it["id"]]
            if is_major[it["id"]]:
                it["level"], it["parent"], cur = 0, None, it
                continue
            par = orig.get(o["parent"])
            if par is None or is_major.get(par["id"]) or par["level"] == 0:
                it["level"], it["parent"] = 1, (cur["id"] if cur else None)
            else:
                it["level"], it["parent"] = 2, par["id"]
        self.majors = majors

    def _walk(self, nodes, level, parent):
        last = None
        for n in nodes:
            if isinstance(n, list):
                self._walk(n, level + 1, last)
                continue
            pg = self.r.get_destination_page_number(n)
            top = n.get("/Top")
            h = float(self.r.pages[pg].mediabox.height)
            item = {"id": len(self.items) + 1, "title": clean(n.title), "level": level,
                    "parent": parent["id"] if parent else None, "page": pg,
                    "top": (h - float(top)) if top not in (None, NullObject()) else 0.0}
            self.items.append(item)
            last = item

    def section_at(self, page, top):
        best = None
        for it in self.items:
            if (it["page"], it["top"] - 4) <= (page, top):
                if best is None or (it["page"], it["top"]) >= (best["page"], best["top"]):
                    best = it
        return best

    def resolve_dest(self, d):
        """GoTo destination -> 'slug.html' (or None)."""
        try:
            d = obj(d)
            if isinstance(d, DictionaryObject):
                d = obj(d.get("/D"))
            if not isinstance(d, ArrayObject):
                d = self.named.get(str(d))
                if d is None:
                    return None
                pg = self.r.get_destination_page_number(d)
                top = 0
            else:
                pg = self.pnum.get(d[0].idnum) if isinstance(d[0], IndirectObject) else int(d[0])
                top = 0
                if len(d) > 3 and not isinstance(obj(d[3]), NullObject):
                    top = float(self.r.pages[pg].mediabox.height) - float(d[3])
            sec = self.section_at(pg, top)
            return f"{sec['slug']}.html" if sec else None
        except Exception:
            return None

    def href_of_action(self, a):
        a = obj(a)
        if not isinstance(a, DictionaryObject):
            return None
        s = a.get("/S")
        if s == "/URI":
            u = a.get("/URI")
            return u.decode("latin-1") if isinstance(u, bytes) else str(u)
        if s == "/GoTo":
            return self.resolve_dest(a.get("/D"))
        return None


# ==========================================================================
# Structure tree (top-down walk) -> plain nested dicts
# ==========================================================================
def build_tree(reader, outline):
    root = reader.trailer["/Root"].get("/StructTreeRoot")
    if root is None:
        return None, defaultdict(set)
    root = obj(root)
    rolemap = {str(k)[1:]: str(v)[1:] for k, v in (obj(root.get("/RoleMap")) or {}).items()}
    covered = defaultdict(set)  # page -> mcids reachable from the tree
    pnum = outline.pnum

    def pg_of(d, default):
        p = d.get("/Pg")
        return pnum.get(p.idnum, default) if isinstance(p, IndirectObject) else default

    def attrs(d):
        out = {}
        a = obj(d.get("/A"))
        for x in (a if isinstance(a, ArrayObject) else [a]):
            x = obj(x)
            if isinstance(x, DictionaryObject):
                for k in ("/RowSpan", "/ColSpan"):
                    if k in x:
                        out[k[1:].lower()] = int(x[k])
        return out

    def walk_el(d, page, depth=0):
        typ = str(d.get("/S", "/Span"))[1:]
        typ = rolemap.get(typ, typ)
        page = pg_of(d, page)
        node = {"type": typ, "kids": [], "alt": None, **attrs(d)}
        alt = d.get("/Alt")
        if alt:
            node["alt"] = str(alt)
        k = d.get("/K")
        if k is not None and depth < 60:
            add_kids(node, obj(k), page, depth)
        return node

    def add_kids(node, k, page, depth):
        if isinstance(k, ArrayObject):
            for x in k:
                add_kids(node, obj(x), page, depth)
        elif isinstance(k, int):
            node["kids"].append(("mc", page, int(k)))
            covered[page].add(int(k))
        elif isinstance(k, DictionaryObject):
            t = k.get("/Type")
            if t == "/MCR":
                p = pg_of(k, page)
                node["kids"].append(("mc", p, int(k["/MCID"])))
                covered[p].add(int(k["/MCID"]))
            elif t == "/OBJR":
                a = obj(k.get("/Obj"))
                if isinstance(a, DictionaryObject):
                    href = outline.href_of_action(a.get("/A"))
                    if href is None and "/Dest" in a:
                        href = outline.resolve_dest(a["/Dest"])
                    if href:
                        node["href"] = node.get("href") or href
            else:
                node["kids"].append(("el", walk_el(k, page, depth + 1)))

    tree = walk_el(root, None) if "/S" in root else {"type": "Document", "kids": []}
    if "/S" not in root:
        add_kids(tree, obj(root.get("/K")), None, 0)
    return tree, covered


# ==========================================================================
# Rendering structure elements
# ==========================================================================
class Doc:
    def __init__(self, pdf_path, out_dir):
        self.pdf_path = pdf_path
        self.img_dir = os.path.join(out_dir, "site", "images")
        os.makedirs(self.img_dir, exist_ok=True)
        self.chars = {}                       # (page, mcid) -> [Ch]
        self.images = defaultdict(list)       # page -> [(mcid, bbox)]
        self.fallback = defaultdict(list)     # page -> [block]
        self.fig_n = 0
        self.used = set()

    # ---- positions -------------------------------------------------------
    def node_chars(self, n):
        out = []
        for k in n["kids"]:
            if k[0] == "mc":
                out.extend(self.chars.get((k[1], k[2]), []))
            else:
                out.extend(self.node_chars(k[1]))
        return out

    def node_pages(self, n):
        out = set()
        for k in n["kids"]:
            if k[0] == "mc":
                if (k[1], k[2]) in self.chars:
                    out.add(k[1])
            else:
                out |= self.node_pages(k[1])
        return out

    def node_pos(self, n):
        """(page, top) where this element starts. Uses the earliest page that
        holds a real share of its text: the tag order does not always follow
        the page order, and some elements also point at a stray item on a far
        away page (e.g. an image tagged inside a list 200 pages later).
        Images are only used when the element has no text at all."""
        per_page, imgs = {}, []
        self._collect_pos(n, per_page, imgs)
        if per_page:
            total = sum(c for c, _ in per_page.values())
            need = min(max(1, 0.05 * total), 20)
            keep = [pg for pg, (c, _) in per_page.items() if c >= need] or list(per_page)
            pg = min(keep)
            return (pg, per_page[pg][1])
        return min(imgs) if imgs else None

    def _collect_pos(self, n, per_page, imgs):
        for k in n["kids"]:
            if k[0] == "mc":
                cs = self.chars.get((k[1], k[2]))
                if cs:
                    c, top = per_page.get(k[1], (0, 10 ** 6))
                    per_page[k[1]] = (c + len(cs), min(top, min(ch.top for ch in cs)))
                elif (k[1], k[2]) in self.img_mcids:
                    imgs.append((k[1], self.img_mcids[(k[1], k[2])][1]))
            else:
                self._collect_pos(k[1], per_page, imgs)

    # ---- inline ----------------------------------------------------------
    def inline(self, n):
        hs, ts, run = [], [], []

        def flush():
            if run:
                h, t = chars_to_html(run)
                if t:
                    hs.append(h); ts.append(t)
                run.clear()
        for k in n["kids"]:
            if k[0] == "mc":
                run.extend(self.chars.get((k[1], k[2]), []))
                self.used.add((k[1], k[2]))
            else:
                flush()
                h, t = self.render(k[1], inline=True)
                if t or h:
                    hs.append(h); ts.append(t)
        flush()
        return clean(" ".join(hs)), clean(" ".join(ts))

    def has_block_kid(self, n):
        return any(k[0] == "el" and k[1]["type"] in BLOCK_TYPES for k in n["kids"])

    # ---- blocks ----------------------------------------------------------
    def render(self, n, inline=False):
        t = n["type"]
        if t in ("TOC", "TOCI", "Artifact"):
            return "", ""
        if t in ("Link", "Reference"):
            h, txt = self.inline(n)
            href = n.get("href")
            if t == "Link" and href and txt:
                ext = ' target="_blank" rel="noopener"' if href.startswith("http") else ""
                return f'<a href="{html.escape(href)}"{ext}>{h}</a>', txt
            return h, txt
        if t in ("Figure", "InlineShape", "Diagram", "Chart", "Formula"):
            return self.figure(n)
        if inline and not self.has_block_kid(n):
            return self.inline(n)
        if re.fullmatch(r"H[1-6]?", t):
            h, txt = self.inline(n)
            lvl = min(5, max(2, int(t[1:]) - 1 if len(t) > 1 else 2))
            return (f"<h{lvl}>{h}</h{lvl}>" if txt else ""), txt
        if t in ("P", "Caption", "BlockQuote", "LBody", "Lbl", "Span", "Quote", "Note"):
            if self.has_block_kid(n):
                return self.container(n)
            h, txt = self.inline(n)
            return (f"<p>{h}</p>" if txt else ""), txt
        if t == "L":
            return self.list_(n)
        if t == "Table":
            return self.table(n), None
        return self.container(n)

    def container(self, n):
        hs, ts, run = [], [], []

        def flush():
            if run:
                h, t = chars_to_html(run)
                if t:
                    hs.append(f"<p>{h}</p>"); ts.append(t)
                run.clear()
        for k in n["kids"]:
            if k[0] == "mc":
                run.extend(self.chars.get((k[1], k[2]), []))
                self.used.add((k[1], k[2]))
                continue
            c = k[1]
            if c["type"] not in BLOCK_TYPES and c["type"] not in ("LI", "TR", "TD", "TH") \
                    and not self.has_block_kid(c):
                h, t = self.render(c, inline=True)   # inline element between text runs
                if t:
                    run_h = f"<p>{h}</p>"
                    flush(); hs.append(run_h); ts.append(t)
                continue
            flush()
            h, t = self.render(c)
            if isinstance(h, dict):
                hs.append(table_html(h)); ts.append(table_text(h))
            elif h:
                hs.append(h); ts.append(t)
        flush()
        return "\n".join(hs), "\n".join(ts)

    def list_(self, n):
        items_h, items_t, labelled = [], [], False
        for k in n["kids"]:
            if k[0] == "mc":
                h, t = chars_to_html(self.chars.get((k[1], k[2]), []))
                self.used.add((k[1], k[2]))
                if t:
                    items_h.append(f"<li>{h}</li>"); items_t.append(t)
                continue
            li = k[1]
            if li["type"] == "L":
                h, t = self.list_(li)
                if not t:
                    continue
                if items_h:
                    items_h[-1] = items_h[-1][:-5] + h + "</li>"
                    items_t[-1] += "\n" + t
                else:
                    items_h.append(f"<li>{h}</li>"); items_t.append(t)
                continue
            lbl, body_h, body_t = "", [], []
            for kk in li["kids"]:
                if kk[0] == "mc":
                    h, t = chars_to_html(self.chars.get((kk[1], kk[2]), []))
                    self.used.add((kk[1], kk[2]))
                    body_h.append(h); body_t.append(t)
                    continue
                c = kk[1]
                if c["type"] == "Lbl":
                    lbl = self.inline(c)[1]
                elif c["type"] == "LBody" and not self.has_block_kid(c):
                    h, t = self.inline(c)
                    body_h.append(h); body_t.append(t)
                else:
                    h, t = self.render(c)
                    if isinstance(h, dict):
                        h, t = table_html(h), table_text(h)
                    body_h.append(h); body_t.append(t)
            if lbl and lbl not in BULLETS:
                labelled = True
                body_h.insert(0, html.escape(lbl)); body_t.insert(0, lbl)
            bh = " ".join(x for x in body_h if x)
            bh = re.sub(r"^(\s*(?:<strong>)?\s*)(?:[•●○◦▪■\uf0b7\uf0a7]|o(?=\s+[A-Z(]))\s*", r"\1", bh)
            body_t = ([re.sub(r"^\s*(?:[•●○◦▪■\uf0b7\uf0a7]|o(?=\s+[A-Z(]))\s*", "", clean(body_t[0]))] + body_t[1:]) if body_t else body_t
            if clean(" ".join(body_t)):
                items_h.append(f"<li>{bh}</li>")
                items_t.append(clean(" ".join(body_t)))
        if not items_h:
            return "", ""
        cls = ' class="labelled"' if labelled else ""
        return f"<ul{cls}>{''.join(items_h)}</ul>", "\n".join("- " + x for x in items_t)

    def table(self, n):
        rows = []

        def rows_of(x):
            for k in x["kids"]:
                if k[0] != "el":
                    continue
                if k[1]["type"] == "TR":
                    yield k[1]
                elif k[1]["type"] in ("THead", "TBody", "TFoot"):
                    yield from rows_of(k[1])
        trs = list(rows_of(n))
        # rows in page order (tag order is not reliable in this PDF)
        far = (10 ** 6, 0)
        trs = [t for _, _, t in sorted(((self.node_pos(t) or far), i, t) for i, t in enumerate(trs))]
        for tr in trs:
            cells = []
            for k in tr["kids"]:
                if k[0] != "el" or k[1]["type"] not in ("TD", "TH"):
                    continue
                c = k[1]
                cc = self.node_chars(c)
                h, t = self.container(c)
                cells.append({"th": c["type"] == "TH", "html": h, "text": clean(t),
                              "colspan": c.get("colspan", 1), "rowspan": c.get("rowspan", 1),
                              "x": (((min(ch.x0 for ch in cc) + max(ch.x1 for ch in cc)) / 2) if cc else None)})
            trc = self.node_chars(tr)
            if trc and sum(1 for c in trc if id(c) in self.claimed) >= 0.7 * len(trc):
                continue   # row rebuilt from layout instead
            if cells and any(c["text"] for c in cells):
                rows.append(cells)
        return normalize_table(rows)

    def figure(self, n):
        alt = clean(n.get("alt") or "")
        pos = []
        for k in n["kids"]:
            if k[0] == "mc" and (k[1], k[2]) in self.img_mcids:
                pos.append((k[1], self.img_mcids[(k[1], k[2])]))
        if not pos:
            h, t = self.inline(n)
            if t:
                return f"<p>{h}</p>", t
            meaningful = (len(re.findall(r"[A-Za-z]{2,}", alt)) >= 2
                          and not re.search(r"[\u3000-\u9fff\uac00-\ud7af]", alt))
            if not meaningful:          # missing image + junk alt text (e.g. an ID)
                return "", ""
            return f"<p><em>[Figure: {html.escape(alt)}]</em></p>", alt
        page = pos[0][0]
        bbs = [b for p, b in pos if p == page]
        x0, top = min(b[0] for b in bbs), min(b[1] for b in bbs)
        x1, bot = max(b[2] for b in bbs), max(b[3] for b in bbs)
        if x1 - x0 < 8 or bot - top < 8:
            return "", alt
        self.fig_n += 1
        name = f"p{page + 1:03d}_fig{self.fig_n}.png"
        self.pending_figs.append((page, (x0, top, x1, bot), name))
        return (f'<figure><img src="images/{name}" alt="{html.escape(alt)}" loading="lazy">'
                f'</figure>'), alt


# ==========================================================================
# Fallback for untagged content (rebuilt from layout)
# ==========================================================================
def is_colored_fill(r):
    if not r.get("fill"):
        return False
    c = r.get("non_stroking_color")
    if c is None:
        return False
    c = tuple(c) if isinstance(c, (list, tuple)) else (c,)
    white = {(1,), (1, 1, 1), (0, 0, 0, 0), (1.0,), (1.0, 1.0, 1.0)}
    return c not in white


def fallback_blocks(page, page_idx, loose, tagged, links, img_dir):
    """Rebuild untagged content from the page layout.
    loose: untagged chars; tagged: chars already covered by the structure tree.
    Returns (blocks, claimed) where claimed = ids of tagged chars that were
    re-rendered here (so the partial tagged copy can be suppressed)."""
    blocks, claimed = [], set()
    if not loose:
        return blocks, claimed
    remaining = list(loose)

    def within(cs, box, pad=1):
        x0, top, x1, bot = box
        return [c for c in cs if x0 - pad <= (c.x0 + c.x1) / 2 <= x1 + pad
                and top - pad <= (c.top + c.bottom) / 2 <= bot + pad]
    try:
        tables = page.find_tables()
    except Exception:
        tables = []
    boxes = [t.bbox for t in tables]
    outer = [t for t in tables if not any(
        o != t.bbox and o[0] <= t.bbox[0] + 1 and o[1] <= t.bbox[1] + 1 and
        o[2] >= t.bbox[2] - 1 and o[3] >= t.bbox[3] - 1 for o in boxes)]
    for t in outer:
        x0, top, x1, bot = t.bbox
        inside_loose = within(remaining, t.bbox)
        inside_tag = within(tagged, t.bbox)
        if len(inside_loose) < 3:
            continue
        inside = inside_loose + inside_tag   # rebuild the whole table from layout
        claimed |= set(map(id, inside_tag))
        # columns: non-empty cells of the first row; rows: horizontal rules spanning the table
        first = next((r for r in t.rows if sum(1 for c in r.cells if c) >= 1), None)
        cols = sorted([c[0] for c in first.cells if c]) if first else [x0]
        cols = cols + [x1]
        width = x1 - x0
        cover = defaultdict(list)
        ys = []
        for e in sorted(page.horizontal_edges, key=lambda e: e["top"]):
            if top - 2 <= e["top"] <= bot + 2 and e["x1"] > x0 and e["x0"] < x1:
                if not ys or e["top"] - ys[-1] > 2.5:
                    ys.append(e["top"])
                cover[round(ys[-1], 1)].append((max(x0, e["x0"]), min(x1, e["x1"])))
        hs = {round(top, 1), round(bot, 1)}
        for y, segs in cover.items():
            segs.sort(); tot, cur = 0, None
            for a, b in segs:
                if cur is None or a > cur[1]:
                    if cur: tot += cur[1] - cur[0]
                    cur = [a, b]
                else:
                    cur[1] = max(cur[1], b)
            if cur: tot += cur[1] - cur[0]
            if tot >= width * 0.85:
                hs.add(float(y))
        hs = sorted(hs)
        bands = []
        for y in hs:
            if not bands or y - bands[-1] > 3:
                bands.append(y)
        rows = []
        for ri in range(len(bands) - 1):
            r_top, r_bot = bands[ri], bands[ri + 1]
            row = []
            for ci in range(len(cols) - 1):
                cc = [c for c in inside if cols[ci] - 2 <= (c.x0 + c.x1) / 2 < cols[ci + 1] - 1
                      and r_top <= (c.top + c.bottom) / 2 < r_bot]
                ph, pt = [], []
                for para in paragraphs_of(cc):
                    h, txt = chars_to_html(para)
                    h = linkify(h, para, links)
                    ph.append(f"<p>{h}</p>"); pt.append(txt)
                row.append({"th": False, "html": "\n".join(ph), "text": clean(" ".join(pt)),
                            "colspan": 1, "rowspan": 1})
            if any(c["text"] for c in row):
                rows.append(row)
        for r in rows:   # header rows (incl. repeated ones) -> th
            if tuple(c["text"].upper() for c in r) == DISPO_HEADER:
                for c in r:
                    c["th"] = True
        rows = normalize_table(rows)["rows"] if rows and is_header_row(rows[0]) else rows
        if rows:
            blocks.append({"pos": (page_idx, top), "kind": "table", "table": {"rows": rows},
                           "fallback": True})
        ids = set(map(id, inside))
        remaining = [c for c in remaining if id(c) not in ids]
    # diagrams (coloured boxes with loose text) -> image + text version
    if len(remaining) > 80:
        bb = bbox(remaining)
        fills = [r for r in page.rects if is_colored_fill(r) and r["x1"] > bb[0] and r["x0"] < bb[2]
                 and r["bottom"] > bb[1] and r["top"] < bb[3]]
        if len(fills) >= 6:
            x0 = min([bb[0]] + [r["x0"] for r in fills]) - 6
            top = min([bb[1]] + [r["top"] for r in fills]) - 6
            x1 = max([bb[2]] + [r["x1"] for r in fills]) + 6
            bot = max([bb[3]] + [r["bottom"] for r in fills]) + 6
            box = (max(0, x0), max(HEADER_BAND, top), min(page.width, x1), min(FOOTER_BAND, bot))
            name = f"p{page_idx + 1:03d}_diagram.png"
            try:
                page.crop(box).to_image(resolution=150).save(os.path.join(img_dir, name))
                inside_tag = within(tagged, box)
                claimed |= set(map(id, inside_tag))
                allc = remaining + inside_tag
                txt_h = "".join(f"<p>{chars_to_html(pp)[0]}</p>" for pp in paragraphs_of(allc))
                alt = clean(" ".join(chars_to_html(pp)[1] for pp in paragraphs_of(allc)))
                blocks.append({"pos": (page_idx, box[1]), "kind": "html", "fallback": True, "text": alt,
                               "html": f'<figure><img src="images/{name}" alt="{html.escape(alt[:300])}" '
                                       f'loading="lazy"><details><summary>Text version of this diagram'
                                       f'</summary>{txt_h}</details></figure>'})
                remaining = []
            except Exception as e:
                print(f"  ! diagram on page {page_idx + 1} not rendered: {e}")
    for para in paragraphs_of(remaining):
        h, txt = chars_to_html(para)
        if txt:
            blocks.append({"pos": (page_idx, min(c.top for c in para)), "kind": "html",
                           "html": f"<p>{linkify(h, para, links)}</p>", "text": txt, "fallback": True})
    return blocks, claimed


def linkify(h, chars, links):
    for (x0, t, x1, b), href in links:
        inside = [c for c in chars if x0 - 1 <= (c.x0 + c.x1) / 2 <= x1 + 1 and t - 1 <= (c.top + c.bottom) / 2 <= b + 1]
        if not inside:
            continue
        label = html.escape(clean("".join(c.t for c in inside)))
        if label and label in h and "<a " not in h:
            ext = ' target="_blank" rel="noopener"' if href.startswith("http") else ""
            h = h.replace(label, f'<a href="{html.escape(href)}"{ext}>{label}</a>', 1)
    return h


# ==========================================================================
# Tables
# ==========================================================================
def blank_cell():
    return {"th": False, "html": "", "text": "", "colspan": 1, "rowspan": 1, "x": None}


def normalize_table(rows):
    """Fix up a tagged table: Word sometimes leaves empty cells untagged, so rows
    can be short; header rows repeat after page breaks; a row split by a page
    break continues in the row after the repeated header."""
    if not rows:
        return {"rows": rows}
    hdr = rows[0] if is_header_row(rows[0]) else None
    ncol = max(sum(c.get("colspan", 1) for c in r) for r in rows)
    if hdr and len(hdr) == ncol and all(c.get("x") is not None for c in hdr):
        starts = [c["x"] for c in hdr]
        for ri, r in enumerate(rows):
            if len(r) < ncol and all(c.get("colspan", 1) == 1 for c in r):
                new = [blank_cell() for _ in range(ncol)]
                ok = True
                for c in r:
                    if c.get("x") is None:
                        ok = False; break
                    col = min(range(ncol), key=lambda i: abs(starts[i] - c["x"]))
                    if new[col]["text"]:
                        ok = False; break
                    new[col] = c
                if ok:
                    rows[ri] = new
    out, after_hdr = [], False
    htexts = [c["text"] for c in hdr] if hdr else None
    for i, r in enumerate(rows):
        if i > 0 and htexts and [c["text"] for c in r] == htexts:
            after_hdr = True
            continue
        if after_hdr and out and not r[0]["text"] and len(r) == len(out[-1]) and out[-1] is not rows[0]:
            last = out[-1]
            for j, c in enumerate(r):
                if c["text"]:
                    last[j]["html"] = (last[j]["html"] + "\n" + c["html"]).strip()
                    last[j]["text"] = clean(last[j]["text"] + " " + c["text"])
        else:
            out.append(r)
        after_hdr = False
    return {"rows": out}


def is_header_row(row):
    return all(c["th"] for c in row) or tuple(c["text"].upper() for c in row) == DISPO_HEADER


def span(c):
    a = ""
    if c.get("colspan", 1) > 1:
        a += f' colspan="{c["colspan"]}"'
    if c.get("rowspan", 1) > 1:
        a += f' rowspan="{c["rowspan"]}"'
    return a


def table_html(tbl):
    rows = tbl["rows"]
    out, i = ["<table>"], 0
    if rows and is_header_row(rows[0]):
        out.append("<thead><tr>" + "".join(f"<th{span(c)}>{c['html']}</th>" for c in rows[0]) + "</tr></thead>")
        i = 1
    out.append("<tbody>")
    for r in rows[i:]:
        out.append("<tr>" + "".join(
            f"<{'th' if c['th'] else 'td'}{span(c)}>{c['html']}</{'th' if c['th'] else 'td'}>" for c in r) + "</tr>")
    out.append("</tbody></table>")
    return "\n".join(out)


def table_text(tbl):
    return "\n".join(" | ".join(c["text"] for c in r) for r in tbl["rows"])


def merge_tables(a, b):
    """b continues a after a page break: drop a repeated header row, and join a
    row that was split across the break (its first cell is empty)."""
    rows = b["rows"]
    if rows and a["rows"] and is_header_row(rows[0]) and \
            [c["text"] for c in rows[0]] == [c["text"] for c in a["rows"][0]]:
        rows = rows[1:]
    if rows and a["rows"] and len(rows[0]) == len(a["rows"][-1]) and not rows[0][0]["text"] \
            and not is_header_row(a["rows"][-1]):
        last = a["rows"][-1]
        for i, c in enumerate(rows[0]):
            if c["text"]:
                last[i]["html"] = (last[i]["html"] + "\n" + c["html"]).strip()
                last[i]["text"] = clean(last[i]["text"] + " " + c["text"])
        rows = rows[1:]
    a["rows"].extend(rows)


# ==========================================================================
# Pipeline
# ==========================================================================
def flatten_blocks(n):
    if n is None:          # untagged PDF (e.g. a chunk file split with pypdf)
        return
    for k in n["kids"]:
        if k[0] == "el":
            c = k[1]
            if c["type"] in CONTAINERS:
                yield from flatten_blocks(c)
            else:
                yield c
        else:
            yield {"type": "P", "kids": [k], "alt": None}


class Prepared:
    """Document-level information shared by every chunk (read once)."""

    def __init__(self, pdf_path):
        self.pdf_path = pdf_path
        self.reader = pypdf.PdfReader(pdf_path)
        self.outline = Outline(self.reader)
        with pdfplumber.open(pdf_path) as _pdf:
            self.outline.fix_hierarchy(_pdf)
            self.n_pages = len(_pdf.pages)
        self.tree, self.covered = build_tree(self.reader, self.outline)


def prepare(pdf_path, verbose=True):
    ctx = Prepared(pdf_path)
    if verbose:
        print(f"{len(ctx.outline.items)} bookmarks -> sections")
        print(f"structure tree read ({sum(len(v) for v in ctx.covered.values())} tagged content items)")
    return ctx


def parse_pages(ctx, pages, out_dir, verbose=False):
    """Parse ONLY the given pages (0-based indexes, contiguous range).

    Nothing outside `pages` is read, so a table or paragraph that runs past the
    range comes out cut at the boundary - exactly like parsing a separate chunk
    file. Returns (blocks, report): blocks are sorted by position on the page.
    """
    pages = list(pages)
    reader, outline, covered = ctx.reader, ctx.outline, ctx.covered
    doc = Doc(ctx.pdf_path, out_dir)
    doc.img_mcids = {}
    doc.pending_figs = []
    doc.claimed = set()
    report = []
    with pdfplumber.open(ctx.pdf_path, pages=[i + 1 for i in pages]) as pdf:
        for i, page in zip(pages, pdf.pages):
            if verbose and i % 100 == 0:
                print(f"  reading page {i + 1}/{ctx.n_pages}")
            loose = []
            for c in page.chars:
                if not c["text"].strip() and c.get("mcid") is None:
                    continue
                ch = Ch(c)
                m = c.get("mcid")
                if m is not None and m in covered[i]:
                    doc.chars.setdefault((i, m), []).append(ch)
                elif HEADER_BAND < c["top"] < FOOTER_BAND and c["text"].strip():
                    loose.append(ch)
            for im in page.images:
                if im.get("mcid") is not None:
                    doc.img_mcids[(i, im["mcid"])] = (max(0, im["x0"]), max(0, im["top"]),
                                                     min(page.width, im["x1"]), min(page.height, im["bottom"]))
            if loose:
                links = []
                ph = float(reader.pages[i].mediabox.height)
                for a in obj(reader.pages[i].get("/Annots")) or []:
                    a = obj(a)
                    if a.get("/Subtype") != "/Link":
                        continue
                    href = outline.href_of_action(a.get("/A"))
                    if href is None and "/Dest" in a:
                        href = outline.resolve_dest(a["/Dest"])
                    if href:
                        x0, y0, x1, y1 = [float(v) for v in a["/Rect"]]
                        links.append(((min(x0, x1), ph - max(y0, y1), max(x0, x1), ph - min(y0, y1)), href))
                tagged = [c for (pg, m), cs in doc.chars.items() if pg == i for c in cs]
                fb, cl = fallback_blocks(page, i, loose, tagged, links, doc.img_dir)
                doc.fallback[i].extend(fb)
                doc.claimed |= cl
                if len(loose) > 40:
                    report.append(f"page {i + 1}: {len(loose)} untagged characters rebuilt from layout "
                                  f"({sum(1 for b in fb if b['kind'] == 'table')} table(s))")
            page.flush_cache()

    # ---- tagged blocks in reading order (only their parts on these pages) --
    stream = []
    for blk in flatten_blocks(ctx.tree):
        pos = doc.node_pos(blk)
        if pos is None:
            continue
        bc = doc.node_chars(blk)
        if bc and sum(1 for c in bc if id(c) in doc.claimed) >= 0.7 * len(bc):
            continue   # this content was rebuilt from layout instead
        h, txt = doc.render(blk)
        if isinstance(h, dict):
            if h["rows"]:
                stream.append({"pos": pos, "kind": "table", "table": h, "span": doc.node_pages(blk)})
        elif h:
            stream.append({"pos": pos, "kind": "html", "html": h, "text": txt, "span": doc.node_pages(blk)})

    # ---- add untagged blocks, order by position -------------------------
    merged = stream + [b for bs in doc.fallback.values() for b in bs]
    merged.sort(key=lambda b: b["pos"])   # stable: keeps tree order within a position

    # ---- crop figures ---------------------------------------------------
    if doc.pending_figs:
        with pdfplumber.open(ctx.pdf_path) as pdf:
            for page_i, box, name in doc.pending_figs:
                try:
                    pdf.pages[page_i].crop(box).to_image(resolution=150).save(os.path.join(doc.img_dir, name))
                except Exception as e:
                    report.append(f"figure {name} could not be rendered: {e}")
    for b in merged:
        b["span"] = sorted(b.get("span", ()))
    return merged, report


def extract(pdf_path, out_dir):
    """Whole document in one pass (the original, non-chunked parser)."""
    ctx = prepare(pdf_path)
    blocks, report = parse_pages(ctx, range(ctx.n_pages), out_dir, verbose=True)
    return assemble(ctx, blocks), report


def assemble(ctx, merged):
    """Assign parsed blocks to sections and build the final JSON structure.
    Tables continuing onto the next page are joined here, which is also what
    re-joins tables cut at chunk boundaries."""
    outline = ctx.outline
    merged = [dict(b, table=copy.deepcopy(b["table"])) if b["kind"] == "table" else dict(b) for b in merged]
    # ---- assign blocks to sections ---------------------------------------
    secs = {it["id"]: dict(it, blocks=[], pages=set()) for it in outline.items}
    front = {"id": 0, "title": "Introduction", "slug": "introduction", "level": 0,
             "parent": None, "page": 0, "top": 0, "blocks": [], "pages": set()}
    def header_fragment(b):
        if b["kind"] != "table" or len(b["table"]["rows"]) != 1:
            return False
        txt = [c["text"].upper() for c in b["table"]["rows"][0] if c["text"]]
        return bool(txt) and all(t in DISPO_HEADER for t in txt)
    merged = [b for b in merged if not header_fragment(b)]
    for b in merged:
        sec = outline.section_at(*b["pos"])
        tgt = secs[sec["id"]] if sec else front
        prev = tgt["blocks"][-1] if tgt["blocks"] else None
        # table continuing on the next page, or a header-only table -> merge
        header_only = (prev and prev["kind"] == "table" and len(prev["table"]["rows"]) == 1
                       and is_header_row(prev["table"]["rows"][0]))
        if (b["kind"] == "table" and prev and prev["kind"] == "table"
                and len(prev["table"]["rows"][-1]) == len(b["table"]["rows"][-1])
                and (header_only or (b["pos"][0] == prev["last_page"] + 1 and b["pos"][1] < 140))):
            merge_tables(prev["table"], b["table"])
            prev["last_page"] = max([prev["last_page"], b["pos"][0]] + list(b.get("span", ())))
        else:
            b["last_page"] = max([b["pos"][0]] + list(b.get("span", ())))
            tgt["blocks"].append(b)
        tgt["pages"].add(b["pos"][0] + 1)
        tgt["pages"] |= {pg + 1 for pg in b.get("span", ())}

    ordered = ([front] if front["blocks"] else []) + [secs[k] for k in sorted(secs)]

    # bookmarks split in two (e.g. "Protocol for History of Human" + "Immunodeficiency
    # Virus (HIV) Related Conditions") -> join the title into the next section
    for idx, s in enumerate(ordered[:-1]):
        nxt = ordered[idx + 1]
        has_children = any(o.get("parent") == s["id"] for o in ordered)
        body_len = sum(len(b.get("text") or "") for b in s["blocks"] if b["kind"] == "html")
        if (body_len < 120 and not any(b["kind"] == "table" for b in s["blocks"])
                and not has_children and nxt["page"] == s["page"]
                and abs(nxt["top"] - s["top"]) < 45 and nxt["level"] == s["level"]):
            sep = " / " if nxt["title"].upper().startswith("ITEM") else " "
            nxt["title"] = clean(s["title"] + sep + nxt["title"])
            nxt["blocks"] = s["blocks"] + nxt["blocks"]
            nxt["pages"] |= s["pages"]
            for o in ordered:                      # re-parent (none expected)
                if o.get("parent") == s["id"]:
                    o["parent"] = nxt["id"]
            s["drop"] = True
    ordered = [s for s in ordered if not s.get("drop")]
    used = set()
    for s in ordered:
        b = slugify(s["title"]); sl = b; k = 2
        while sl in used:
            sl = f"{b}-{k}"; k += 1
        used.add(sl); s["slug"] = sl

    by_id = {s["id"]: s for s in ordered}
    result = []
    for s in ordered:
        body_h, body_t, tables, blocks = [], [], [], []
        tnorm = clean(s["title"]).lower()
        for b in s["blocks"]:
            if b["kind"] == "table":
                t = b["table"]
                body_h.append(table_html(t)); body_t.append(table_text(t))
                header = [c["text"] for c in t["rows"][0]] if is_header_row(t["rows"][0]) else None
                tables.append({"header": header,
                               "rows": [[{"html": c["html"], "text": c["text"]} for c in r]
                                        for r in (t["rows"][1:] if header else t["rows"])]})
                blocks.append({"type": "table", "page": b["pos"][0] + 1, "table_index": len(tables) - 1})
            else:
                bt = clean(b["text"]).lower()
                if not body_h and len(bt) > 3 and bt in tnorm and \
                        (b["html"].startswith("<h") or len(bt) < 120):
                    continue  # heading/line that only repeats the section title
                body_h.append(b["html"]); body_t.append(b["text"])
                h = b["html"]
                kind = ("heading" if re.match(r"<h\d", h) else "list" if h.startswith("<ul") else
                        "figure" if h.startswith("<figure") else "paragraph" if h.count("<p>") <= 1 else "html")
                blocks.append({"type": kind, "page": b["pos"][0] + 1, "html": h, "text": b["text"]})
        parent = by_id.get(s["parent"])
        result.append({
            "id": s["id"], "slug": s["slug"], "title": s["title"], "level": s["level"],
            "parent_id": s["parent"] if parent else None,
            "parent_slug": parent["slug"] if parent else None,
            "pdf_pages": sorted(s["pages"]) or [s["page"] + 1],
            "html": "\n".join(body_h), "text": "\n\n".join(body_t), "tables": tables,
            "blocks": blocks,
        })

    # internal links were resolved to old slugs before titles were merged -> remap
    old_to_new = {it["slug"]: by_id[it["id"]]["slug"] for it in outline.items if it["id"] in by_id}
    for r in result:
        r["html"] = re.sub(r'href="([a-z0-9-]+)\.html"',
                           lambda m: f'href="{old_to_new.get(m.group(1), m.group(1))}.html"', r["html"])
        for bl in r["blocks"]:
            if "html" in bl:
                bl["html"] = re.sub(r'href="([a-z0-9-]+)\.html"',
                                    lambda m: f'href="{old_to_new.get(m.group(1), m.group(1))}.html"', bl["html"])
        for t in r["tables"]:
            for row in t["rows"]:
                for c in row:
                    c["html"] = re.sub(r'href="([a-z0-9-]+)\.html"',
                                       lambda m: f'href="{old_to_new.get(m.group(1), m.group(1))}.html"', c["html"])
    return result


# ==========================================================================
# Writers
# ==========================================================================
CSS = """
:root{--bg:#fff;--fg:#1d2330;--muted:#5b6475;--line:#d9dde5;--accent:#0b5cad;--head:#f2f4f8}
@media (prefers-color-scheme:dark){:root{--bg:#14171c;--fg:#e6e9ef;--muted:#9aa3b2;--line:#2c323c;--accent:#7ab4ff;--head:#1c2027}}
*{box-sizing:border-box}body{margin:0;font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--fg)}
.wrap{display:grid;grid-template-columns:300px 1fr;min-height:100vh}
nav{border-right:1px solid var(--line);padding:16px;overflow:auto;max-height:100vh;position:sticky;top:0;font-size:14px}
nav a{display:block;color:var(--fg);text-decoration:none;padding:3px 0}nav a:hover,nav a.on{color:var(--accent)}
nav .l1{padding-left:14px}nav .l2{padding-left:28px;color:var(--muted)}nav .l0{font-weight:600;margin-top:10px}
nav input{width:100%;padding:8px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--fg);font:inherit}
main{padding:24px 32px;max-width:1000px;min-width:0}a{color:var(--accent)}h1{line-height:1.25}
.crumb{color:var(--muted);font-size:14px}.src{color:var(--muted);font-size:13px;margin-top:40px;border-top:1px solid var(--line);padding-top:12px}
table{border-collapse:collapse;width:100%;margin:16px 0;font-size:15px}th,td{border:1px solid var(--line);padding:8px 10px;vertical-align:top;text-align:left}
th{background:var(--head)}td p,th p{margin:0 0 6px}td ul,th ul{padding-left:18px;margin:4px 0}
.tablewrap{overflow-x:auto}img{max-width:100%;height:auto}ul.labelled{list-style:none;padding-left:8px}
.pager{display:flex;justify-content:space-between;gap:12px;margin-top:32px}
@media (max-width:800px){.wrap{grid-template-columns:1fr}nav{position:static;max-height:40vh;border-right:0;border-bottom:1px solid var(--line)}main{padding:16px}}
"""


def write_outputs(sections, out_dir, report):
    with open(os.path.join(out_dir, "sections.json"), "w", encoding="utf-8") as f:
        json.dump(sections, f, ensure_ascii=False, indent=1)

    with open(os.path.join(out_dir, "sections.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["id", "slug", "title", "level", "parent_slug", "pdf_pages", "html", "text"])
        for s in sections:
            w.writerow([s["id"], s["slug"], s["title"], s["level"], s["parent_slug"] or "",
                        f"{s['pdf_pages'][0]}-{s['pdf_pages'][-1]}", s["html"], s["text"]])

    with open(os.path.join(out_dir, "tables.csv"), "w", newline="", encoding="utf-8") as f, \
            open(os.path.join(out_dir, "disposition_tables.csv"), "w", newline="", encoding="utf-8") as g:
        w = csv.writer(f)
        w.writerow(["section_slug", "section_title", "table_no", "row_no",
                    "col1", "col2", "col3", "col4", "col5", "header"])
        dw = csv.writer(g)
        dw.writerow(["section_slug", "section_title", "condition", "evaluation_data", "disposition",
                     "condition_html", "evaluation_data_html", "disposition_html"])
        n_dispo = 0
        for s in sections:
            for ti, t in enumerate(s["tables"], 1):
                for ri, r in enumerate(t["rows"], 1):
                    cols = ([c["text"] for c in r] + [""] * 5)[:5]
                    w.writerow([s["slug"], s["title"], ti, ri, *cols, " | ".join(t["header"] or [])])
                hdr = tuple((h or "").upper() for h in (t["header"] or []))
                if hdr == DISPO_HEADER:
                    for r in t["rows"]:
                        if len(r) == 3:
                            dw.writerow([s["slug"], s["title"], *[c["text"] for c in r], *[c["html"] for c in r]])
                            n_dispo += 1
    report.append(f"{n_dispo} disposition-table rows")

    site = os.path.join(out_dir, "site")
    by_id = {s["id"]: s for s in sections}
    js = ("<script>function f(q){q=q.toLowerCase();document.querySelectorAll('nav a')"
          ".forEach(a=>a.style.display=a.textContent.toLowerCase().includes(q)?'':'none')}"
          "var o=document.querySelector('nav a.on');o&&o.scrollIntoView({block:'center'})</script>")

    def nav(cur):
        out = ['<input type="search" placeholder="Filter sections…" oninput="f(this.value)">',
               '<a class="l0" href="index.html">Contents</a>']
        for s in sections:
            on = " on" if s["slug"] == cur else ""
            out.append(f'<a class="l{min(s["level"], 2)}{on}" href="{s["slug"]}.html">{html.escape(s["title"])}</a>')
        return "\n".join(out)

    def page(title, body, cur=None):
        return (f"<!doctype html><html lang=en><head><meta charset=utf-8>"
                f"<meta name=viewport content='width=device-width,initial-scale=1'>"
                f"<title>{html.escape(title)}</title><link rel=stylesheet href=style.css></head>"
                f"<body><div class=wrap><nav>{nav(cur)}</nav><main>{body}</main></div>{js}</body></html>")

    with open(os.path.join(site, "style.css"), "w") as f:
        f.write(CSS)
    for i, s in enumerate(sections):
        crumbs, p = [], by_id.get(s["parent_id"])
        while p:
            crumbs.insert(0, f'<a href="{p["slug"]}.html">{html.escape(p["title"])}</a>')
            p = by_id.get(p["parent_id"])
        body_html = re.sub(r"(<table>.*?</table>)", r'<div class="tablewrap">\1</div>', s["html"], flags=re.S)
        kids = [c for c in sections if c["parent_id"] == s["id"]]
        kids_html = ("<h2>In this section</h2><ul>" + "".join(
            f'<li><a href="{c["slug"]}.html">{html.escape(c["title"])}</a></li>' for c in kids) + "</ul>") if kids else ""
        prv = f'<a href="{sections[i-1]["slug"]}.html">← {html.escape(sections[i-1]["title"])}</a>' if i else "<span></span>"
        nxt = f'<a href="{sections[i+1]["slug"]}.html">{html.escape(sections[i+1]["title"])} →</a>' if i + 1 < len(sections) else ""
        pages = s["pdf_pages"]
        body = (f'<div class=crumb>{" › ".join(crumbs)}</div><h1>{html.escape(s["title"])}</h1>'
                f'{body_html}{kids_html}<div class=pager>{prv}{nxt}</div>'
                f'<p class=src>Source: FAA Guide for Aviation Medical Examiners, PDF page'
                f'{"s" if pages[0] != pages[-1] else ""} {pages[0]}{"–" + str(pages[-1]) if pages[0] != pages[-1] else ""}. '
                f'Always check the <a href="{SOURCE_URL}">official FAA version</a>.</p>')
        with open(os.path.join(site, f"{s['slug']}.html"), "w", encoding="utf-8") as f:
            f.write(page(s["title"], body, s["slug"]))
    toc = "".join(f'<li style="margin-left:{s["level"] * 18}px"><a href="{s["slug"]}.html">'
                  f'{html.escape(s["title"])}</a></li>' for s in sections)
    with open(os.path.join(site, "index.html"), "w", encoding="utf-8") as f:
        f.write(page("Guide for Aviation Medical Examiners",
                     f"<h1>Guide for Aviation Medical Examiners</h1>"
                     f"<p class=crumb>Extracted from the FAA PDF. Always check the "
                     f"<a href='{SOURCE_URL}'>official FAA version</a>.</p>"
                     f"<ul style='list-style:none;padding:0'>{toc}</ul>"))
    with open(os.path.join(out_dir, "report.txt"), "w") as f:
        f.write("\n".join(report) + "\n")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    pdf_path, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    secs, rep = extract(pdf_path, out)
    write_outputs(secs, out, rep)
    print(f"Done: {len(secs)} sections, {sum(len(s['tables']) for s in secs)} tables -> {out}")
    print("\n".join(rep[-3:]))
