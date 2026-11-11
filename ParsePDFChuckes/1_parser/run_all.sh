#!/usr/bin/env bash
# Full pipeline: PDF -> parsed guide -> website data -> site condition data (#56).
#   ./run_all.sh path/to/ame_guide.pdf [output_dir]
#
# Monthly FAA update: run with the new guide, then review
# ParsePDFChuckes/2_website_data/validation_report.md and
# ParsePDFChuckes/6_docs/site_update_report.md before committing.
# Step 3 needs Node (npm ci in src/apps/web once).
set -euo pipefail
PDF="${1:?usage: ./run_all.sh ame_guide.pdf [output_dir]}"
OUT="${2:-output}"
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"

# 1) parse in section-aligned chunks of <= 50 pages, merge, validate page-by-page
python3 "$HERE/chunked_parser.py" "$PDF" "$OUT/full_extraction" --chunks sections:50

# 2) organise by condition for the website (?condition=<id>)
python3 "$HERE/build_site_data.py" "$OUT/full_extraction/sections.json" "$OUT/website_data"

# 3) publish to ParsePDFChuckes/2_website_data (what the site reads; stale per-condition
#    files are removed) and merge into the site's condition data
SITE_DATA="$REPO/ParsePDFChuckes/2_website_data"
mkdir -p "$SITE_DATA/conditions" "$SITE_DATA/reference"
rm -f "$SITE_DATA"/conditions/*.json "$SITE_DATA"/reference/*.json
cp -R "$OUT/website_data/." "$SITE_DATA/"
(cd "$REPO/src/apps/web" && npx vite-node --config vitest.config.ts scripts/build-parsed-conditions.ts)

echo
echo "Done."
echo "  website data : $OUT/website_data   (check validation_report.md)"
echo "  full output  : $OUT/full_extraction (sections.json, CSVs, site/, validation.json)"
echo "  site data    : src/data/guidance/parsed_conditions.json, parsed_condition_map.json"
echo "  site report  : ParsePDFChuckes/6_docs/site_update_report.md"
