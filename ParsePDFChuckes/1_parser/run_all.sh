#!/usr/bin/env bash
# Full pipeline: PDF -> parsed guide -> website data.
#   ./run_all.sh path/to/ame_guide.pdf [output_dir]
set -euo pipefail
PDF="${1:?usage: ./run_all.sh ame_guide.pdf [output_dir]}"
OUT="${2:-output}"
HERE="$(cd "$(dirname "$0")" && pwd)"

# 1) parse in section-aligned chunks of <= 50 pages, merge, validate page-by-page
python3 "$HERE/chunked_parser.py" "$PDF" "$OUT/full_extraction" --chunks sections:50

# 2) organise by condition for the website (?condition=<id>)
python3 "$HERE/build_site_data.py" "$OUT/full_extraction/sections.json" "$OUT/website_data"

echo
echo "Done."
echo "  website data : $OUT/website_data   (check validation_report.md)"
echo "  full output  : $OUT/full_extraction (sections.json, CSVs, site/, validation.json)"
