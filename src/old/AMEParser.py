"""
AME Rule Extractor
------------------
Extracts AME disposition tables from FAA guide PDFs into structured
decision logic JSON, grouped by medical condition.

Setup:
    pip install pdfplumber

Usage:
    python AMEParser.py path/to/ame_pages.pdf
    python AMEParser.py
"""

import json
import re
import sys
from pathlib import Path

try:
    from tkinter import Button, Label, TclError, Tk, filedialog, messagebox

    TK_AVAILABLE = True
except ImportError:  # minimal / headless Python builds without tkinter
    TK_AVAILABLE = False

    class TclError(Exception):
        pass

import pdfplumber  # PDF parsing library — handles text and table extraction


def clean(text):
    """Collapse all whitespace/newlines into a single space and strip edges."""
    return re.sub(r"\s+", " ", (text or "").replace("\n", " ")).strip()


def get_decision(text):
    """
    Pull the disposition keyword out of the raw cell text.
    DEFER/DENY are checked before ISSUE to avoid false matches
    (e.g., 'do not issue' would incorrectly match ISSUE otherwise).
    """
    upper = (text or "").upper()
    if "DEFER" in upper:
        return "DEFER"
    if "DENY" in upper:
        return "DENY"
    if "SPECIAL ISSUANCE" in upper:
        return "SPECIAL ISSUANCE"
    if "ISSUE" in upper:
        return "ISSUE"
    return "UNKNOWN"


def get_checklist(text):
    """
    Parse bullet-pointed criteria into a clean list of strings.
    Handles line-wrapped bullets by appending non-bullet lines
    to the item currently being built.

    Also handles numbered items (e.g., '1.', '2.') as section markers —
    these are kept as-is since they introduce multi-part requirements.
    """
    lines = (text or "").splitlines()
    items = []
    current = None

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        # Match bullet characters (including \x00 PDF encoding artifact) OR numbered items like "1."
        if re.match(r"^[-•·●\x00]", stripped) or re.match(r"^\d+\.", stripped):
            if current is not None:
                items.append(current)
            # Strip leading bullet/number prefix
            current = re.sub(r"^[-•·●\x00]+\s*", "", stripped)
            current = re.sub(r"^\d+\.\s*", "", current).strip()
        elif current is not None:
            current += " " + stripped  # Continuation of previous bullet
        else:
            # Plain text with no bullet prefix — treat as a standalone item
            # (e.g., "See the CACI Worksheet" in PCOS-B evaluation column)
            current = stripped

    if current is not None:
        items.append(current)

    return [i for i in items if i]  # Drop any empty strings


def get_time_constraints(text):
    """Extract time-based phrases like '90 days', '2 years or more' from criteria text.
    Normalizes whitespace first to avoid newline-split matches like '90\\ndays'.
    """
    normalized = clean(text)  # collapses all whitespace including newlines
    return re.findall(
        r"\d+\s*(?:\(\d+\))?\s*(?:or more|or less)?\s*(?:days?|months?|years?|weeks?)",
        normalized, re.IGNORECASE
    )


def extract_condition_name(page_text):
    """
    Find the medical condition name from the page.

    Strategy (in priority order):
    1. All-caps line that isn't boilerplate — matches pages like HIV, PCOS.
    2. Title-case line immediately after the boilerplate header — catches
       mixed-case headings like "Cushing's Syndrome or Cushing's Disease".

    Skips known boilerplate words that appear on every page.
    """
    skip_keywords = {
        "GUIDE", "VERSION", "FAA", "AME", "CLASS", "DISEASE", "CONDITION",
        "EVALUATION", "DISPOSITION", "ALL CLASSES", "UPDATED",
    }

    lines = page_text.splitlines()

    # Pass 1: all-caps lines (e.g. "HUMAN IMMUNODEFICIENCY VIRUS (HIV)")
    for line in lines:
        stripped = line.strip()
        if (
            stripped.isupper()
            and len(stripped) > 4
            and not any(kw in stripped for kw in skip_keywords)
        ):
            return stripped

    # Pass 2: title/mixed-case heading that follows the standard page header.
    # The FAA page header is always "Guide for Aviation Medical Examiners – Version …"
    # The condition name is on the very next non-empty line.
    header_pattern = re.compile(r"Guide for Aviation Medical Examiners", re.IGNORECASE)
    for idx, line in enumerate(lines):
        if header_pattern.search(line):
            for candidate in lines[idx + 1:]:
                candidate = candidate.strip()
                if candidate and not re.match(r"^(All Classes|Updated|\()", candidate, re.IGNORECASE):
                    return candidate
            break

    return "UNKNOWN"


def build_rule(page_num, condition_name, section, col0, col1, col2):
    """
    Build a single rule dict from one table row.
    Shape: IF all checklist items pass → THEN decision, DO action.
    """
    decision = get_decision(col2)
    checklist = get_checklist(col1)
    time_constraints = get_time_constraints(col1)

    # Strip the leading decision keyword line from col2, then collect the
    # remaining lines as the action instructions.
    # BUG FIX: Previously any line containing "ISSUE" was dropped, which
    # incorrectly removed lines like "AME may issue and note this in Block 60."
    # Now only the very first line that IS the decision keyword is removed.
    col2_lines = col2.splitlines()
    action_lines = []
    decision_line_consumed = False
    for line in col2_lines:
        stripped = line.strip()
        if not stripped:
            continue
        upper = stripped.upper()
        # Skip only the bare decision keyword line at the top of the cell
        if not decision_line_consumed and any(
            upper == kw for kw in ["DEFER", "DENY", "ISSUE", "SPECIAL ISSUANCE"]
        ):
            decision_line_consumed = True
            continue
        action_lines.append(stripped)

    action = clean(" ".join(action_lines))

    rule = {
        "page": page_num,
        "condition": condition_name,
        "section": section,
        "scenario": clean(col0),
        "decision_logic": {
            "if_all_checked": checklist,
            "time_constraints": time_constraints,
            "then": decision,
            "action_required": action,
        }
    }

    return rule


def parse_pdf(pdf_path):
    """
    Iterate every page of the PDF, find disposition tables, and extract rules.
    Results are grouped by condition name at the end.
    """
    all_rules = []

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            page_text = page.extract_text() or ""
            tables = page.extract_tables() or []

            for table in tables:
                # Skip tables that are too small or missing expected columns
                if not table or len(table) < 2 or len(table[0]) < 3:
                    continue

                header = " ".join(clean(c or "") for c in table[0]).lower()

                # Only process AME disposition tables (identified by header keywords)
                if "disease" not in header or "disposition" not in header:
                    continue

                condition_name = extract_condition_name(page_text)
                page_rules = []

                for row in table[1:]:  # Skip header row
                    # Pad row to 3 columns in case of missing cells
                    col0, col1, col2 = (list(row) + ["", "", ""])[:3]
                    col0, col1, col2 = col0 or "", col1 or "", col2 or ""

                    if not any([col0.strip(), col1.strip(), col2.strip()]):
                        continue  # Skip blank/spacer rows

                    # Check for section labels like "A.", "B." in the scenario column
                    section_match = re.match(r"^([A-Z])\.", clean(col0))
                    section = section_match.group(1) if section_match else ""

                    rule = build_rule(page_num, condition_name, section, col0, col1, col2)
                    page_rules.append(rule)

                all_rules.extend(page_rules)

    # Group rules by condition name for the final output structure
    grouped = {}
    for rule in all_rules:
        key = rule["condition"]
        if key not in grouped:
            grouped[key] = {"condition": key, "cases": []}
        grouped[key]["cases"].append({
            "section": rule["section"],
            "scenario": rule["scenario"],
            "decision_logic": rule["decision_logic"],
        })

    return list(grouped.values())


# ---------------------------- UI / INPUT LOGIC START ----------------------------
# Everything below handles interactive file selection (GUI and terminal fallback).
def choose_pdf_with_dialog():
    """Show a simple picker window, then open file browser in current directory."""
    if not TK_AVAILABLE:
        raise TclError("tkinter is unavailable")

    # Build a small custom window first so users see clear instructions
    # before the OS file picker appears.
    root = Tk()
    root.title("AME Parser")
    root.geometry("760x560")
    root.minsize(700, 520)
    root.configure(padx=24, pady=24)

    # Shared state for selected file and parse confirmation.
    selected = {"path": None, "confirmed": False, "parse_enabled": False}
    is_macos = sys.platform == "darwin"

    title_label = "Pick a PDF file to parse"
    Label(
        root,
        text=title_label,
        font=("Helvetica", 18, "bold"),
        pady=8,
    ).pack()

    Label(
        root,
        text=f"Current directory: {Path.cwd()}",
        fg="#444444",
        pady=8,
        wraplength=560,
    ).pack()

    selected_file_label = Label(
        root,
        text="No file selected",
        fg="#333333",
        pady=4,
        wraplength=560,
    )
    selected_file_label.pack()

    def on_choose_file():
        # Open in current working directory so file browsing starts in-project.
        file_path = filedialog.askopenfilename(
            title="Select a PDF file to parse",
            initialdir=str(Path.cwd()),
            filetypes=[("PDF files", "*.pdf")],
        )
        if file_path:
            selected["path"] = file_path
            selected_file_label.config(text=f"Selected: {Path(file_path).name}")
            selected["parse_enabled"] = True
            if is_macos:
                # macOS native buttons ignore bg/fg, so use the label fallback styling.
                parse_button.config(
                    bg="#2E7D32",
                    fg="white",
                    cursor="hand2",
                )
            else:
                # Windows/Linux: use a normal enabled green button.
                parse_button.config(
                    state="normal",
                    bg="#2E7D32",
                    fg="white",
                    activebackground="#1B5E20",
                    activeforeground="white",
                )

    def on_parse():
        if selected["path"]:
            selected["confirmed"] = True
            root.destroy()

    def on_parse_click(_event):
        if selected["parse_enabled"]:
            on_parse()

    Button(
        root,
        text="Click Here To Choose A PDF",
        command=on_choose_file,
        font=("Helvetica", 16, "bold"),
        width=34,
        height=5,
        relief="groove",
        bd=3,
        cursor="hand2",
    ).pack(expand=True, fill="both", pady=(12, 8))

    if is_macos:
        parse_button = Label(
            root,
            text="Parse Selected File",
            font=("Helvetica", 13, "bold"),
            bg="#BDBDBD",
            fg="#333333",
            pady=10,
            relief="ridge",
            bd=2,
            cursor="arrow",
        )
        parse_button.pack(fill="x", pady=(0, 0))
        parse_button.bind("<Button-1>", on_parse_click)
    else:
        parse_button = Button(
            root,
            text="Parse Selected File",
            command=on_parse,
            font=("Helvetica", 13, "bold"),
            state="disabled",
            bg="#BDBDBD",
            fg="#333333",
            activebackground="#BDBDBD",
            activeforeground="#333333",
            pady=8,
        )
        parse_button.pack(fill="x", pady=(0, 0))

    # Block until user confirms Parse or closes the window.
    root.mainloop()
    if selected["confirmed"] and selected["path"]:
        return Path(selected["path"])
    return None


def choose_pdf_from_terminal():
    """Fallback text-based selector used when no GUI display is available."""
    pdf_files = sorted(Path.cwd().glob("*.pdf"))
    if not pdf_files:
        print("No PDF files found in the current directory.")
        print("Usage: python AMEParser.py path/to/ame.pdf")
        sys.exit(1)

    print("Select a PDF file to parse:")
    for idx, file_path in enumerate(pdf_files, start=1):
        print(f"{idx}. {file_path.name}")

    while True:
        selection = input("Enter number: ").strip()
        if not selection.isdigit():
            print("Please enter a valid number.")
            continue

        selected_idx = int(selection)
        if 1 <= selected_idx <= len(pdf_files):
            return pdf_files[selected_idx - 1]

        print(f"Please enter a number between 1 and {len(pdf_files)}.")


# ----------------------------- APPLICATION ENTRYPOINT ----------------------------
def main():
    # CLI argument takes priority so scripts/automation still work.
    if len(sys.argv) >= 2:
        pdf_path = Path(sys.argv[1])
        if not pdf_path.exists():
            print(f"File not found: {pdf_path}")
            sys.exit(1)
    else:
        try:
            # Interactive mode: show custom UI picker.
            pdf_path = choose_pdf_with_dialog()
        except TclError:
            # If GUI cannot open (e.g. no display), use terminal selector.
            pdf_path = choose_pdf_from_terminal()

        if not pdf_path:
            print("No file selected. Exiting.")
            sys.exit(0)

    print(f"Extracting rules from: {pdf_path.name}")
    rules = parse_pdf(pdf_path)

    # Output file goes in the current working directory, same stem as the input PDF
    out_path = Path.cwd() / (pdf_path.stem + ".json")
    out_path.write_text(json.dumps(rules, indent=2), encoding="utf-8")

    print(f"Done — {sum(len(r['cases']) for r in rules)} rule(s) across {len(rules)} condition(s) -> {out_path.name}")
    try:
        messagebox.showinfo("AME Parser", f"Parsing complete.\nSaved: {out_path.name}")
    except TclError:
        # Non-GUI environments can ignore popup notification.
        pass


if __name__ == "__main__":
    main()