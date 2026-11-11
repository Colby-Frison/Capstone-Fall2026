/**
 * Re-runnable merge of the parsed FAA AME Guide into the site's condition data (#56).
 * Run after ParsePDFChuckes/1_parser/build_site_data.py (run_all.sh does both).
 *
 * Usage (from src/apps/web):
 *   npx vite-node --config vitest.config.ts scripts/build-parsed-conditions.ts
 *   npx vite-node --config vitest.config.ts scripts/build-parsed-conditions.ts --check   # fail if outputs are stale
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  buildParsedConditions,
  loadBuildInputs,
  PATHS,
  serializeOutputs,
} from './lib/parsedConditionsBuild';

const check = process.argv.includes('--check');
const out = serializeOutputs(buildParsedConditions(loadBuildInputs()));
const files: [string, string][] = [
  [PATHS.map, out.map],
  [PATHS.data, out.data],
  [PATHS.report, out.report],
];

let stale = 0;
for (const [file, content] of files) {
  const rel = path.relative(process.cwd(), file);
  if (check) {
    const current = existsSync(file) ? readFileSync(file, 'utf8') : '';
    if (current !== content) {
      stale += 1;
      console.error(`stale: ${rel}`);
    }
    continue;
  }
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  console.log(`wrote ${rel}`);
}

const counts = (JSON.parse(out.map) as { counts: Record<string, number> }).counts;
console.log(
  `matched ${counts.matched} (low-confidence ${counts.matchedLowConfidence}), added ${counts.added}, ` +
    `site-only ${counts.siteOnly}, OneGuide duplicates ${counts.oneGuideDuplicatesLeftAsIs}, ` +
    `site conditions ${counts.siteConditionsBefore} → ${counts.siteConditionsAfter}`,
);
if (check && stale) process.exit(1);
