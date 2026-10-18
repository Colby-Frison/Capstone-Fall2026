/**
 * Re-runnable FAA → NIH identity mapper.
 * Writes src/data/guidance/nih_condition_map.json (committed cache; CI does not need live NIH).
 *
 * Usage (from src/apps/web):
 *   npx vite-node --config vitest.config.ts scripts/map-faa-nih.ts
 *   npx vite-node --config vitest.config.ts scripts/map-faa-nih.ts --limit=20
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  adaptGuidanceFiles,
  resolveNihIdentityForCondition,
  type NihConditionMapFile,
  type NormalizedGuidanceFile,
} from '@content/index';
import { fetchConditionSuggestions } from '../../api/src/clinicalTables.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const guidanceDir = path.resolve(__dirname, '../../../data/guidance');
const outPath = path.join(guidanceDir, 'nih_condition_map.json');

const guidanceModules = import.meta.glob('@guidance/*.normalized.json', {
  eager: true,
  import: 'default',
}) as Record<string, NormalizedGuidanceFile>;

const guidanceFiles = Object.keys(guidanceModules)
  .sort()
  .map((key) => guidanceModules[key]);

const conditions = adaptGuidanceFiles(guidanceFiles);

function parseLimit(): number | null {
  const arg = process.argv.find((a) => a.startsWith('--limit='));
  if (!arg) return null;
  const n = Number(arg.split('=')[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Extract shorter Clinical Tables queries from compound FAA headings. */
function queryTermsForName(name: string): string[] {
  const terms: string[] = [];
  const push = (raw: string) => {
    const t = raw.replace(/\s+/g, ' ').trim();
    if (t.length >= 3 && t.length <= 80) terms.push(t);
  };

  push(name);

  for (const match of name.matchAll(/\(([^)]+)\)/g)) {
    const inner = match[1].trim();
    push(inner);
    // "aka Lou Gehrig's" / acronym-only
    const aka = inner.replace(/^aka\s+/i, '').trim();
    if (aka !== inner) push(aka);
  }

  const beforeParen = name.split('(')[0].replace(/;.*$/, '').trim();
  push(beforeParen);

  // Split compound headings: "A or B", "A and/or B", comma lists
  for (const part of beforeParen.split(/\s+(?:or|and\/or|and)\s+|,\s*/i)) {
    push(part);
  }

  // Dedupe case-insensitively; prefer shorter terms first for Clinical Tables
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const t of terms.sort((a, b) => a.length - b.length)) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(t);
  }
  // Cap upstream calls per condition
  return unique.slice(0, 5);
}

async function main() {
  const limit = parseLimit();
  const target = limit ? conditions.slice(0, limit) : conditions;
  console.log(`Mapping ${target.length} of ${conditions.length} adapted conditions…`);

  const entries: NihConditionMapFile['entries'] = {};
  let mapped = 0;
  let low = 0;
  let unmapped = 0;

  for (let i = 0; i < target.length; i++) {
    const condition = target[i];
    const terms = queryTermsForName(condition.name);
    const candidates = [];
    const seen = new Set<string>();

    for (const term of terms) {
      const result = await fetchConditionSuggestions(term, { maxList: 8, timeoutMs: 5000 });
      for (const s of result.suggestions) {
        if (seen.has(s.keyId)) continue;
        seen.add(s.keyId);
        candidates.push(s);
      }
      await sleep(150);
    }

    const identity = resolveNihIdentityForCondition(
      condition.name,
      candidates,
      terms,
    );
    entries[condition.id] = identity;

    if (identity.mappingStatus === 'mapped') mapped += 1;
    else if (identity.mappingStatus === 'low-confidence') low += 1;
    else unmapped += 1;

    if ((i + 1) % 10 === 0 || i === target.length - 1) {
      console.log(
        `  ${i + 1}/${target.length} — mapped=${mapped} low=${low} unmapped=${unmapped}`,
      );
    }
  }

  // Preserve entries for conditions not remapped when --limit is used
  let prior: NihConditionMapFile | null = null;
  try {
    const mod = await import('@guidance/nih_condition_map.json');
    prior = mod.default as NihConditionMapFile;
  } catch {
    prior = null;
  }
  const mergedEntries = { ...(prior?.entries ?? {}), ...entries };

  // Ensure every adapted condition has an explicit entry
  for (const condition of conditions) {
    if (!mergedEntries[condition.id]) {
      mergedEntries[condition.id] = {
        mappingStatus: 'unmapped',
        synonyms: [],
        icd10: [],
        infoLinks: [],
        matchConfidence: 0,
      };
    }
  }

  const out: NihConditionMapFile = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: 'clinicaltables.nlm.nih.gov/api/conditions/v3',
    entries: mergedEntries,
  };

  writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${outPath}`);
  console.log(`Totals: mapped=${mapped} low-confidence=${low} unmapped=${unmapped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
