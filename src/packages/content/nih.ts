/**
 * NIH Clinical Tables DTO types and name → local Condition matching.
 *
 * Matching rules (strict):
 * 1. Exact normalized name match wins (totality = 1).
 * 2. Else the search/NIH label must be a substring of the condition name.
 * 3. Among multiple hits, higher totality (needle length / condition name length) wins.
 */

import type { Condition } from './types';

export interface NihInfoLink {
  url: string;
  title: string;
}

export interface NihSuggestion {
  keyId: string;
  label: string;
  primaryName?: string;
  synonyms: string[];
  icd10: string[];
  infoLinks: NihInfoLink[];
  matchedConditionIds: string[];
}

export interface NihConditionsResponse {
  query: string;
  suggestions: NihSuggestion[];
  error?: string | null;
}

/** Ignore tiny needles that would substring-match almost anything. */
const MIN_NEEDLE_LENGTH = 3;

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesForSuggestion(names: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of names) {
    const n = normalizeName(raw);
    if (!n || n.length < MIN_NEEDLE_LENGTH || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

/**
 * Score how completely `needle` covers `conditionName`.
 * - Exact match → 1
 * - Needle is a substring of the condition name → needleLen / nameLen (0, 1)
 * - Otherwise → 0 (no match)
 */
export function matchTotality(conditionName: string, needle: string): number {
  const nameNorm = normalizeName(conditionName);
  const needleNorm = normalizeName(needle);
  if (!nameNorm || !needleNorm || needleNorm.length < MIN_NEEDLE_LENGTH) return 0;
  if (nameNorm === needleNorm) return 1;
  if (nameNorm.includes(needleNorm)) {
    return needleNorm.length / nameNorm.length;
  }
  return 0;
}

/**
 * Ranked match of NIH / free-text names onto local Condition ids.
 * Exact matches first; otherwise substring-of-condition-name ranked by totality.
 */
export function matchConditionsByNames(
  conditions: Condition[],
  names: string[],
  limit = 5,
): string[] {
  const needles = namesForSuggestion(names);
  if (!needles.length || !conditions.length) return [];

  type Hit = { id: string; totality: number; needleLen: number };
  const hits: Hit[] = [];

  for (const condition of conditions) {
    let bestTotality = 0;
    let bestNeedleLen = 0;

    for (const needle of needles) {
      const totality = matchTotality(condition.name, needle);
      if (totality <= 0) continue;
      if (
        totality > bestTotality ||
        (totality === bestTotality && needle.length > bestNeedleLen)
      ) {
        bestTotality = totality;
        bestNeedleLen = needle.length;
      }
    }

    if (bestTotality > 0) {
      hits.push({
        id: condition.id,
        totality: bestTotality,
        needleLen: bestNeedleLen,
      });
    }
  }

  hits.sort(
    (a, b) =>
      b.totality - a.totality ||
      b.needleLen - a.needleLen ||
      a.id.localeCompare(b.id),
  );

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    ids.push(hit.id);
    if (ids.length >= limit) break;
  }
  return ids;
}

/**
 * Attach matchedConditionIds to each NIH suggestion using the local catalog.
 */
export function enrichSuggestionsWithMatches(
  conditions: Condition[],
  suggestions: NihSuggestion[],
): NihSuggestion[] {
  return suggestions.map((suggestion) => {
    const names = [
      suggestion.label,
      suggestion.primaryName || '',
      ...suggestion.synonyms,
    ];
    return {
      ...suggestion,
      matchedConditionIds: matchConditionsByNames(conditions, names),
    };
  });
}
