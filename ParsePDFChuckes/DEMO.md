# How to run it (and show it works)

## 1. One-time setup

- Install **Python 3.9+** (python.org). On Windows tick "Add Python to PATH".
- Unzip `AME-Guide-Project.zip` and put the FAA PDF next to it, e.g. `ame_guide.pdf`.
- Open a terminal **in the `AME-Guide-Project` folder** and install the two libraries:

```bash
pip install -r 1_parser/requirements.txt
```

(On some Macs use `pip3` / `python3`.)

## 2. Run the pipeline (≈ 1–3 minutes)

**Mac / Linux**
```bash
./1_parser/run_all.sh ../ame_guide.pdf demo_output
```

**Windows**
```bat
1_parser\run_all.bat ..\ame_guide.pdf demo_output
```

You will see each chunk being parsed, then a summary like:

```
=== sections:50: 21 chunk(s), mode=virtual ===
  chunk 1/21 (pages 1-43) done: 371 blocks, 4.1s
  ...
  merged: 240 sections, 438 tables, 485 disposition rows, repairs={'table re-joined': 4}
  validation: 0.308% words missing, 1.62% duplicated, 17 page(s) flagged
181 conditions in 21 categories; rows placed 497/497; 195 reference pages; issues: none
Done.
```

## 3. What to show

| Show this | Where | What it proves |
|---|---|---|
| The terminal output | – | PDF split into 21 chunks, parsed, merged; 497/497 rows placed |
| The guide as a website | open `demo_output/full_extraction/site/index.html` in a browser | Everything was extracted with headings, lists and tables intact |
| One condition, side by side with the PDF | open `demo_output/website_data/conditions/barretts-esophagus.json` and PDF page 205 | Same rows A/B, decisions, "what to bring" list |
| The condition from our site | `demo_output/website_data/conditions/abdomen-and-viscera-and-anus-conditions.json` | Matches `?condition=abdomen-and-viscera-and-anus-conditions` |
| Validation | `demo_output/website_data/validation_report.md` and `demo_output/full_extraction/validation.json` | Every page checked against the PDF; every row placed once |
| Per-chunk results | `demo_output/full_extraction/chunks/chunk_report.csv` | Time and flagged pages per chunk – errors traceable to one chunk |

Tip: VS Code or Firefox show JSON files nicely formatted.

## 4. Optional: the chunk-size experiment (≈ 6–8 minutes)

```bash
python 1_parser/chunked_parser.py ../ame_guide.pdf experiment_output --experiment
```

Prints and saves `experiment_output/chunk_experiment.md` – the table used in
the project write-up (10 / 25 / 50 / 100-page chunks, section-aligned chunks,
real chunk PDF files, compared with a one-pass parse).

## 5. Optional: try a different chunk size

```bash
python 1_parser/chunked_parser.py ../ame_guide.pdf test_25 --chunks pages:25
```

## Troubleshooting

- `python: command not found` → use `python3` (Mac/Linux) or reinstall Python with "Add to PATH" (Windows).
- `Permission denied: ./1_parser/run_all.sh` → `chmod +x 1_parser/run_all.sh` or run `bash 1_parser/run_all.sh …`.
- `ModuleNotFoundError: pdfplumber` → run the `pip install` step again (same Python as you run with).
- Windows parses the chunks one after another (no parallel workers there), so it takes a bit longer – same results.
- Validation uses `pdftotext` if it is installed (part of Poppler), otherwise pdfplumber – both work.
