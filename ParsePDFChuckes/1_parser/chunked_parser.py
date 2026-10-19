#!/usr/bin/env python3
"""
Chunked parser for the FAA "Guide for Aviation Medical Examiners" PDF.

Instead of parsing all 932 pages in one pass, the PDF is split into smaller
chunks that are parsed independently (in parallel), then merged back into one
JSON structure and validated page-by-page against the original PDF.

    pip install pdfplumber pypdf
    python chunked_parser.py ame_guide.pdf out/                       # default: section-aligned chunks of <= 50 pages
    python chunked_parser.py ame_guide.pdf out/ --chunks pages:25     # fixed 25-page chunks
    python chunked_parser.py ame_guide.pdf out/ --mode files          # really split into chunk PDF files
    python chunked_parser.py ame_guide.pdf exp/ --experiment          # compare chunk sizes against the one-pass result

Chunk strategies (--chunks)
    whole           one chunk = the original one-pass parser (baseline)
    pages:N         fixed N-page chunks
    sections:N      chunks of at most N pages that only end where a new section
                    (bookmark) starts at the top of a page, so topics are not cut

Modes (--mode)
    virtual (default)  each chunk is a page range read from the original PDF.
                       Keeps the PDF's structure tags (headings, tables) intact.
    files              physically writes chunk_XXX.pdf files with pypdf and parses
                       each file on its own. Splitting a PDF this way DROPS its
                       structure tags and bookmarks, so every page has to be
                       rebuilt from layout - included to measure that cost.

Merging
    Chunks are concatenated in page order, then boundary repairs are applied:
    - paragraph cut at a chunk boundary   -> joined back into one paragraph
    - list cut at a chunk boundary        -> joined back into one list
    - table cut at a chunk boundary       -> joined (repeated header row dropped,
                                             row split across the break merged)
    - identical block emitted twice       -> duplicate dropped

Validation (every run)
    Each page of the original PDF is read independently (pdftotext, or
    pdfplumber if pdftotext is missing) and its words are compared with the
    sections that cover that page: missing words, duplicated words, flagged pages.
    With --experiment, every strategy is also compared section-by-section with
    the one-pass ("whole") result.
"""
import argparse
import collections
import csv
import json
import multiprocessing as mp
import os
import re
import shutil
import subprocess
import sys
import time

import pypdf

import extract_ame_guide as X

_CTX = None          # Prepared document, shared with forked workers
TERMINAL = tuple(".!?:;)\"”’]")


# ==========================================================================
# 1. Planning chunks
# ==========================================================================
def parse_spec(spec):
    """'files:pages:25' -> ('files', 'pages', 25)"""
    parts = spec.split(":")
    mode = "virtual"
    if parts[0] in ("files", "virtual"):
        mode, parts = parts[0], parts[1:]
    strategy = parts[0]
    size = int(parts[1]) if len(parts) > 1 else None
    if strategy not in ("whole", "pages", "sections"):
        raise SystemExit(f"unknown chunk strategy: {spec}")
    if strategy != "whole" and not size:
        raise SystemExit(f"chunk size missing in {spec!r} (e.g. pages:25)")
    return mode, strategy, size


def plan_chunks(ctx, strategy, size):
    """Return [(start, end)] 0-based page ranges, end exclusive."""
    n = ctx.n_pages
    if strategy == "whole":
        return [(0, n)]
    if strategy == "pages":
        return [(s, min(n, s + size)) for s in range(0, n, size)]
    # sections: only cut before a page where a bookmark starts near the top
    clean_cuts = {it["page"] for it in ctx.outline.items if it["top"] < 130}
    chunks, start = [], 0
    while start < n:
        hard = min(n, start + size)
        if hard == n:
            chunks.append((start, n))
            break
        cuts = [p for p in clean_cuts if start + max(1, size // 2) <= p <= hard]
        end = max(cuts) if cuts else hard          # no clean cut available -> forced cut
        chunks.append((start, end))
        start = end
    return chunks


# ==========================================================================
# 2. Parsing one chunk (runs in a worker process)
# ==========================================================================
def _work(job):
    idx, (a, b), mode, out_dir = job
    t0 = time.time()
    if mode == "virtual":
        blocks, rep = X.parse_pages(_CTX, range(a, b), out_dir)
    else:
        blocks, rep = _parse_chunk_file(idx, a, b, out_dir)
    for bl in blocks:
        bl["chunk"] = idx
    return idx, blocks, rep, time.time() - t0


def _parse_chunk_file(idx, a, b, out_dir):
    """--mode files: write pages a..b to their own PDF and parse that file alone."""
    chunk_dir = os.path.join(out_dir, "chunk_pdfs")
    os.makedirs(chunk_dir, exist_ok=True)
    path = os.path.join(chunk_dir, f"chunk_{idx + 1:03d}_p{a + 1}-{b}.pdf")
    src = pypdf.PdfReader(_CTX.pdf_path)
    w = pypdf.PdfWriter()
    for i in range(a, b):
        w.add_page(src.pages[i])
    with open(path, "wb") as f:
        w.write(f)

    tmp = os.path.join(out_dir, "_tmp", f"chunk{idx + 1:03d}")
    cctx = X.Prepared(path)                      # no tags, no bookmarks in this file
    blocks, rep = X.parse_pages(cctx, range(b - a), tmp)

    # images: move into site/images/chunkNNN/ and fix their src
    sub = f"chunk{idx + 1:03d}"
    src_img = os.path.join(tmp, "site", "images")
    dst_img = os.path.join(out_dir, "site", "images", sub)
    if os.path.isdir(src_img) and os.listdir(src_img):
        os.makedirs(dst_img, exist_ok=True)
        for fn in os.listdir(src_img):
            shutil.move(os.path.join(src_img, fn), os.path.join(dst_img, fn))
    shutil.rmtree(tmp, ignore_errors=True)

    # local page numbers -> page numbers in the full PDF
    for bl in blocks:
        bl["pos"] = (bl["pos"][0] + a, bl["pos"][1])
        bl["span"] = [p + a for p in bl.get("span", [])]
        if bl["kind"] == "html":
            bl["html"] = bl["html"].replace('src="images/', f'src="images/{sub}/')
    rep = [re.sub(r"page (\d+)", lambda m: f"page {int(m.group(1)) + a}", r) for r in rep]
    return blocks, rep


def run_chunks(ctx, chunks, mode, out_dir, workers):
    global _CTX
    _CTX = ctx
    jobs = [(i, c, mode, out_dir) for i, c in enumerate(chunks)]
    results = {}
    try:
        fork = mp.get_context("fork")          # not available on Windows
    except ValueError:
        fork = None
        if workers > 1:
            print("  (parallel chunks need 'fork' - not available here, parsing chunks one by one)")
    if fork is not None and workers > 1 and len(jobs) > 1:
        with fork.Pool(workers) as pool:
            for idx, blocks, rep, sec in pool.imap_unordered(_work, jobs):
                results[idx] = (blocks, rep, sec)
                print(f"  chunk {idx + 1}/{len(jobs)} (pages {chunks[idx][0] + 1}-{chunks[idx][1]}) "
                      f"done: {len(blocks)} blocks, {sec:.1f}s")
    else:
        for job in jobs:
            idx, blocks, rep, sec = _work(job)
            results[idx] = (blocks, rep, sec)
            print(f"  chunk {idx + 1}/{len(jobs)} (pages {chunks[idx][0] + 1}-{chunks[idx][1]}) "
                  f"done: {len(blocks)} blocks, {sec:.1f}s")
    return [results[i] for i in range(len(chunks))]


# ==========================================================================
# 3. Merging chunks
# ==========================================================================
def merge_chunks(results, chunks):
    """Concatenate chunk outputs in page order and repair chunk boundaries.
    (Tables cut at a boundary are re-joined later by X.assemble, which merges a
    table with the table continuing at the top of the next page.)"""
    blocks, repairs = [], collections.Counter()
    seen = set()
    for idx, (bl, _rep, _sec) in enumerate(results):
        start = chunks[idx][0]
        for k, b in enumerate(bl):
            key = (b["pos"], b["kind"], b.get("text") or json.dumps(b.get("table"), sort_keys=True)[:2000])
            if key in seen:
                repairs["duplicate block dropped"] += 1
                continue
            seen.add(key)
            prev = blocks[-1] if blocks else None
            at_boundary = (k == 0 and idx > 0 and prev is not None
                           and b["pos"][0] == start and b["pos"][1] < 140)
            if at_boundary and prev["kind"] == "table" and b["kind"] == "table":
                repairs["table re-joined"] += 1          # done in assemble()
            elif at_boundary and prev["kind"] == "html" and b["kind"] == "html":
                ph, bh = prev["html"], b["html"]
                pt, bt = (prev.get("text") or "").rstrip(), (b.get("text") or "").lstrip()
                if ph.endswith("</ul>") and bh.startswith("<ul"):
                    prev["html"] = ph[:-5] + bh[bh.index(">") + 1:]
                    prev["text"] = pt + "\n" + bt
                    prev["span"] = sorted(set(prev.get("span", [])) | set(b.get("span", [])))
                    repairs["list re-joined"] += 1
                    continue
                if (ph.endswith("</p>") and bh.startswith("<p>") and pt and bt
                        and not pt.endswith(TERMINAL) and (bt[0].islower() or bt[0].isdigit())):
                    prev["html"] = ph[:-4] + " " + bh[3:]
                    prev["text"] = pt + " " + bt
                    prev["span"] = sorted(set(prev.get("span", [])) | set(b.get("span", [])))
                    repairs["paragraph re-joined"] += 1
                    continue
            blocks.append(b)
    return blocks, repairs


# ==========================================================================
# 4. Validation against the original PDF
# ==========================================================================
def source_pages(pdf_path, cache_dir):
    """Text of every page, read independently of the parser."""
    cache = os.path.join(cache_dir, "_source_pages.json")
    if os.path.exists(cache):
        return json.load(open(cache))
    if shutil.which("pdftotext"):
        out = subprocess.run(["pdftotext", "-enc", "UTF-8", pdf_path, "-"],
                             capture_output=True, text=True, check=True).stdout
        pages = out.split("\f")
    else:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            pages = [(p.extract_text() or "") for p in pdf.pages]
    os.makedirs(cache_dir, exist_ok=True)
    json.dump(pages, open(cache, "w"))
    return pages


def toks(s):
    return re.findall(r"[a-z0-9]+", s.lower())


def clean_source(pages):
    """Drop the running header (an identical line on most pages), the page number
    (last line, digits only) and table-of-contents pages (dot leaders): the
    parser leaves these out on purpose."""
    line_count = collections.Counter()
    for p in pages:
        line_count.update(set(x.strip() for x in p.split("\n") if x.strip()))
    common = {l for l, c in line_count.items() if c > len(pages) * 0.5 and not l.isdigit()}
    out = []
    for p in pages:
        if len(re.findall(r"\.{5,}", p)) > 5:
            out.append(None)               # TOC page
            continue
        lines = [l for l in p.split("\n") if l.strip() not in common]
        while lines and not lines[-1].strip():
            lines.pop()
        if lines and lines[-1].strip().isdigit():
            lines.pop()                    # page number
        out.append("\n".join(lines))
    return out


def validate(sections, src_pages):
    """Per-page word check: each page's words must be found in the sections
    that cover that page. Also counts words that appear more often than in the PDF."""
    by_page = collections.defaultdict(collections.Counter)
    total_out = collections.Counter()
    for s in sections:
        c = collections.Counter(toks(s["title"] + " " + s["text"]))
        total_out += c
        pages = s["pdf_pages"]
        for p in range(pages[0] - 1, pages[-1] + 2):      # +-1 page: sections start mid-page
            by_page[p] |= c
    total_src = collections.Counter()
    missing = words = 0
    flagged = []
    for i, p in enumerate(src_pages, 1):
        if p is None:
            continue
        pc = collections.Counter(toks(p))
        total_src += pc
        n = sum(pc.values())
        if n < 10:
            continue
        m = sum(max(0, v - by_page[i][w]) for w, v in pc.items())
        missing += m
        words += n
        if m / n > 0.03:
            flagged.append({"page": i, "missing": m, "words": n,
                            "examples": sorted(w for w, v in pc.items() if v > by_page[i][w])[:8]})
    dup = sum(max(0, v - total_src[w]) for w, v in total_out.items())
    return {"words_checked": words, "missing_words": missing,
            "missing_pct": round(100 * missing / max(1, words), 3),
            "duplicated_words": dup, "duplicated_pct": round(100 * dup / max(1, words), 3),
            "pages_flagged": flagged}


def compare_to_baseline(sections, base):
    """Section-by-section comparison with the one-pass result: word overlap of
    the text, and the shape (row count) of every table."""
    omap = {s["slug"]: s for s in sections}
    same = changed = missing_secs = tables_diff = 0
    worst, table_notes = [], []
    for s in base:
        o = omap.get(s["slug"])
        if o is None:
            missing_secs += 1
            continue
        a, b = collections.Counter(toks(s["text"])), collections.Counter(toks(o["text"]))
        if not a and not b:
            f1 = 1.0
        else:
            f1 = 2 * sum((a & b).values()) / max(1, sum(a.values()) + sum(b.values()))
        shape_a = [len(t["rows"]) for t in s["tables"]]
        shape_b = [len(t["rows"]) for t in o["tables"]]
        if shape_a != shape_b:
            tables_diff += 1
            table_notes.append(f"{s['title']}: rows {shape_a[:6]} vs {shape_b[:6]}")
        if f1 >= 0.999 and shape_a == shape_b:
            same += 1
        else:
            changed += 1
            worst.append((round(f1, 4), s["title"]))
    extra = sum(1 for s in sections if s["slug"] not in {b["slug"] for b in base})
    return {"sections_identical": same, "sections_changed": changed,
            "sections_missing": missing_secs, "sections_extra": extra,
            "sections_with_different_tables": tables_diff,
            "most_changed": sorted(worst)[:5], "table_differences": table_notes[:8]}


def table_stats(sections):
    n_tables = sum(len(s["tables"]) for s in sections)
    rows = sum(len(t["rows"]) for s in sections for t in s["tables"])
    dispo = sum(len(t["rows"]) for s in sections for t in s["tables"]
                if t["header"] and tuple(h.upper() for h in t["header"]) == X.DISPO_HEADER)
    return {"tables": n_tables, "table_rows": rows, "disposition_rows": dispo}


# ==========================================================================
# 5. One full run
# ==========================================================================
def run(ctx, spec, out_dir, workers, src_pages, write_site=True, quiet=False):
    mode, strategy, size = parse_spec(spec)
    chunks = plan_chunks(ctx, strategy, size)
    print(f"\n=== {spec}: {len(chunks)} chunk(s), mode={mode} ===")
    os.makedirs(out_dir, exist_ok=True)
    t0 = time.time()
    results = run_chunks(ctx, chunks, mode, out_dir, workers)
    t_parse = time.time() - t0
    blocks, repairs = merge_chunks(results, chunks)
    sections = X.assemble(ctx, blocks)
    report = [r for bl, rep, sec in results for r in rep]
    elapsed = time.time() - t0

    # per-chunk debugging output
    cdir = os.path.join(out_dir, "chunks")
    os.makedirs(cdir, exist_ok=True)
    chunk_rows = []
    val = validate(sections, src_pages)
    flagged_by_page = {f["page"]: f for f in val["pages_flagged"]}
    for idx, ((a, b), (bl, rep, sec)) in enumerate(zip(chunks, results)):
        fname = f"chunk_{idx + 1:03d}_p{a + 1}-{b}.json"
        with open(os.path.join(cdir, fname), "w", encoding="utf-8") as f:
            json.dump({"chunk": idx + 1, "pages": [a + 1, b], "seconds": round(sec, 2),
                       "blocks": [{"page": x["pos"][0] + 1, "kind": x["kind"],
                                   "text": x.get("text") if x["kind"] == "html" else X.table_text(x["table"]),
                                   "html": x.get("html") if x["kind"] == "html" else X.table_html(x["table"])}
                                  for x in bl]}, f, ensure_ascii=False, indent=1)
        fl = [flagged_by_page[p] for p in range(a + 1, b + 1) if p in flagged_by_page]
        chunk_rows.append({"chunk": idx + 1, "pages": f"{a + 1}-{b}", "n_pages": b - a,
                           "blocks": len(bl), "seconds": round(sec, 2),
                           "pages_flagged": len(fl),
                           "flagged_pages": " ".join(str(f["page"]) for f in fl)})
    with open(os.path.join(cdir, "chunk_report.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(chunk_rows[0]))
        w.writeheader()
        w.writerows(chunk_rows)

    if write_site:
        X.write_outputs(sections, out_dir, report)
    else:
        with open(os.path.join(out_dir, "sections.json"), "w", encoding="utf-8") as f:
            json.dump(sections, f, ensure_ascii=False, indent=1)

    summary = {"spec": spec, "mode": mode, "strategy": strategy, "size": size,
               "chunks": len(chunks), "avg_pages": round(ctx.n_pages / len(chunks), 1),
               "parse_seconds": round(t_parse, 1), "total_seconds": round(elapsed, 1),
               "sections": len(sections), **table_stats(sections),
               "repairs": dict(repairs), "validation": val}
    with open(os.path.join(out_dir, "validation.json"), "w") as f:
        json.dump(summary, f, indent=1)
    print(f"  merged: {len(sections)} sections, {summary['tables']} tables, "
          f"{summary['disposition_rows']} disposition rows, repairs={dict(repairs)}")
    print(f"  validation: {val['missing_pct']}% words missing, {val['duplicated_pct']}% duplicated, "
          f"{len(val['pages_flagged'])} page(s) flagged")
    return sections, summary


# ==========================================================================
# 6. Experiment: compare chunk sizes
# ==========================================================================
DEFAULT_EXPERIMENT = ["whole", "pages:10", "pages:25", "pages:50", "pages:100",
                      "sections:25", "sections:50", "files:pages:50"]


def experiment(ctx, specs, out_dir, workers, src_pages):
    rows, base = [], None
    for spec in specs:
        sub = os.path.join(out_dir, spec.replace(":", "_"))
        sections, summ = run(ctx, spec, sub, workers, src_pages, write_site=False)
        if spec == "whole":
            base = sections
        summ["vs_whole"] = compare_to_baseline(sections, base) if base else None
        rows.append(summ)

    with open(os.path.join(out_dir, "chunk_experiment.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["strategy", "mode", "chunks", "avg_pages_per_chunk", "seconds",
                    "missing_words_pct", "duplicated_words_pct", "pages_flagged",
                    "tables", "table_rows", "disposition_rows",
                    "sections_identical_to_whole", "sections_changed", "sections_with_different_tables",
                    "boundary_repairs"])
        for r in rows:
            v = r["vs_whole"] or {}
            w.writerow([r["spec"], r["mode"], r["chunks"], r["avg_pages"], r["total_seconds"],
                        r["validation"]["missing_pct"], r["validation"]["duplicated_pct"],
                        len(r["validation"]["pages_flagged"]), r["tables"], r["table_rows"],
                        r["disposition_rows"], v.get("sections_identical", ""),
                        v.get("sections_changed", ""), v.get("sections_with_different_tables", ""),
                        sum(r["repairs"].values())])

    md = ["# Chunk size experiment", "",
          f"PDF: `{os.path.basename(ctx.pdf_path)}` ({ctx.n_pages} pages). "
          "Every strategy is validated page-by-page against the original PDF and "
          "compared section-by-section with the one-pass result (`whole`).", "",
          "| Strategy | Mode | Chunks | Pages/chunk | Time (s) | Words missing | Words duplicated "
          "| Pages flagged | Tables | Disposition rows | Sections identical to one-pass | Sections with different tables | Boundary repairs |",
          "|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for r in rows:
        v = r["vs_whole"] or {}
        rep = ", ".join(f"{k}: {n}" for k, n in r["repairs"].items()) or "–"
        ident = f"{v.get('sections_identical')}/{r['sections']}" if v else "baseline"
        md.append(f"| `{r['spec']}` | {r['mode']} | {r['chunks']} | {r['avg_pages']} | {r['total_seconds']} "
                  f"| {r['validation']['missing_pct']}% | {r['validation']['duplicated_pct']}% "
                  f"| {len(r['validation']['pages_flagged'])} | {r['tables']} | {r['disposition_rows']} "
                  f"| {ident} | {v.get('sections_with_different_tables', '–') if v else '–'} | {rep} |")
    md += ["", "## Differences from the one-pass result", ""]
    for r in rows:
        v = r["vs_whole"]
        if v and r["spec"] != "whole" and (v["most_changed"] or v["table_differences"]):
            md.append(f"**{r['spec']}**")
            md += [f"- text: {t} (word overlap {f})" for f, t in v["most_changed"]]
            md += [f"- table: {t}" for t in v["table_differences"]]
            md.append("")
    with open(os.path.join(out_dir, "chunk_experiment.md"), "w") as f:
        f.write("\n".join(md) + "\n")
    print("\n" + "\n".join(md))
    return rows


# ==========================================================================
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf")
    ap.add_argument("out")
    ap.add_argument("--chunks", default="sections:50",
                    help="whole | pages:N | sections:N (default sections:50)")
    ap.add_argument("--mode", choices=["virtual", "files"], default="virtual")
    ap.add_argument("--workers", type=int, default=max(1, min(4, os.cpu_count() or 1)))
    ap.add_argument("--experiment", nargs="?", const=",".join(DEFAULT_EXPERIMENT),
                    help="compare strategies, comma-separated (default: %(const)s)")
    a = ap.parse_args()

    ctx = X.prepare(a.pdf)
    src = clean_source(source_pages(a.pdf, a.out))
    if a.experiment:
        specs = [s.strip() for s in a.experiment.split(",") if s.strip()]
        if "whole" in specs:                       # baseline first
            specs.remove("whole")
        experiment(ctx, ["whole"] + specs, a.out, a.workers, src)
    else:
        spec = a.chunks if a.mode == "virtual" else f"files:{a.chunks}"
        run(ctx, spec, a.out, a.workers, src)


if __name__ == "__main__":
    main()
