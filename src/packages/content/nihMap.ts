/**
 * FAA condition ↔ NIH Clinical Tables identity mapping (committed sidecar).
 * NIH fields never affect FAA dispositions.
 */

import type { Condition, NihConditionIdentity, NihMappingStatus } from './types';

export interface NihConditionMapFile {
  version: number;
  generatedAt?: string;
  source?: string;
  entries: Record<string, NihConditionIdentity>;
}

export const MAPPED_CONFIDENCE_THRESHOLD = 0.85;
export const LOW_CONFIDENCE_THRESHOLD = 0.5;

export function normalizeNihIdentity(
  entry: Partial<NihConditionIdentity> | null | undefined,
): NihConditionIdentity {
  const status = (entry?.mappingStatus ?? 'unmapped') as NihMappingStatus;
  return {
    mappingStatus: status,
    nihKeyId: entry?.nihKeyId,
    consumerName: entry?.consumerName,
    primaryName: entry?.primaryName,
    synonyms: Array.isArray(entry?.synonyms) ? entry!.synonyms!.filter(Boolean) : [],
    icd10: Array.isArray(entry?.icd10) ? entry!.icd10!.filter(Boolean) : [],
    infoLinks: Array.isArray(entry?.infoLinks)
      ? entry!.infoLinks!.filter((l) => l && typeof l.url === 'string')
      : [],
    matchConfidence:
      typeof entry?.matchConfidence === 'number' ? entry.matchConfidence : 0,
  };
}

function isNihConditionMapFile(
  map: NihConditionMapFile | Record<string, NihConditionIdentity>,
): map is NihConditionMapFile {
  return (
    typeof map === 'object' &&
    map !== null &&
    'entries' in map &&
    typeof (map as NihConditionMapFile).entries === 'object' &&
    (map as NihConditionMapFile).entries !== null &&
    !Array.isArray((map as NihConditionMapFile).entries)
  );
}

/** Attach sidecar NIH identities onto adapted conditions (by Condition.id). */
export function applyNihConditionMap(
  conditions: Condition[],
  map: NihConditionMapFile | Record<string, NihConditionIdentity> | null | undefined,
): Condition[] {
  const entries: Record<string, NihConditionIdentity> = !map
    ? {}
    : isNihConditionMapFile(map)
      ? map.entries
      : map;

  return conditions.map((condition) => {
    const raw = entries[condition.id];
    if (!raw) {
      return {
        ...condition,
        nih: normalizeNihIdentity({ mappingStatus: 'unmapped', matchConfidence: 0 }),
      };
    }
    return {
      ...condition,
      nih: normalizeNihIdentity(raw),
    };
  });
}

export function mappingStatusFromConfidence(confidence: number): NihMappingStatus {
  if (confidence >= MAPPED_CONFIDENCE_THRESHOLD) return 'mapped';
  if (confidence >= LOW_CONFIDENCE_THRESHOLD) return 'low-confidence';
  return 'unmapped';
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_TOKENS = new Set([
  'and',
  'or',
  'of',
  'the',
  'to',
  'for',
  'in',
  'on',
  'with',
  'a',
  'an',
  'not',
  'aka',
  'use',
  'conditions',
  'condition',
  'disease',
  'disorder',
  'related',
  'other',
  'including',
]);

function significantTokens(value: string): string[] {
  return normalizeName(value)
    .split(' ')
    .filter((t) => t.length >= 3 && !STOP_TOKENS.has(t));
}

/** Token coverage: fraction of FAA significant tokens found in the NIH name. */
export function faaNihTokenScore(faaName: string, nihName: string): number {
  const faaTokens = significantTokens(faaName);
  const nihNorm = normalizeName(nihName);
  if (!faaTokens.length || !nihNorm) return 0;
  const hits = faaTokens.filter((t) => nihNorm.includes(t)).length;
  return hits / faaTokens.length;
}

/**
 * Bidirectional containment score between FAA display name and an NIH label/synonym.
 * Exact → 1; otherwise shorter/longer when one contains the other; else token coverage.
 */
export function faaNihNameScore(faaName: string, nihName: string): number {
  const a = normalizeName(faaName);
  const b = normalizeName(nihName);
  if (!a || !b) return 0;
  if (a === b) return 1;
  let containment = 0;
  if (a.includes(b)) containment = b.length / a.length;
  else if (b.includes(a)) containment = a.length / b.length;
  const token = faaNihTokenScore(faaName, nihName);
  // Prefer strong containment; allow token coverage to lift compound headings.
  return Math.max(containment, token * 0.95);
}

export interface NihCandidate {
  keyId: string;
  label: string;
  primaryName?: string;
  synonyms?: string[];
  icd10?: string[];
  infoLinks?: { url: string; title: string }[];
}

/** Pick the best NIH candidate for a FAA condition name and build a sidecar entry. */
export function resolveNihIdentityForCondition(
  faaName: string,
  candidates: NihCandidate[],
  alternateFaaNames: string[] = [],
): NihConditionIdentity {
  let best: { score: number; candidate: NihCandidate } | null = null;
  const faaNames = [faaName, ...alternateFaaNames].filter(Boolean);

  for (const candidate of candidates) {
    const names = [
      candidate.label,
      candidate.primaryName || '',
      ...(candidate.synonyms || []),
    ].filter(Boolean);
    let score = 0;
    for (const faa of faaNames) {
      for (const name of names) {
        score = Math.max(score, faaNihNameScore(faa, name));
      }
    }
    if (!best || score > best.score) {
      best = { score, candidate };
    }
  }

  if (!best || best.score < LOW_CONFIDENCE_THRESHOLD) {
    return normalizeNihIdentity({
      mappingStatus: 'unmapped',
      matchConfidence: best?.score ?? 0,
    });
  }

  const status = mappingStatusFromConfidence(best.score);
  const c = best.candidate;
  if (status === 'unmapped') {
    return normalizeNihIdentity({
      mappingStatus: 'unmapped',
      matchConfidence: best.score,
    });
  }

  return normalizeNihIdentity({
    mappingStatus: status,
    nihKeyId: c.keyId,
    consumerName: c.label,
    primaryName: c.primaryName,
    synonyms: c.synonyms || [],
    icd10: c.icd10 || [],
    infoLinks: c.infoLinks || [],
    matchConfidence: best.score,
  });
}
