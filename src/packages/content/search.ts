/**
 * Scored synonym-aware catalog search across conditions and medications.
 * See Documentation/Search_Scoring.md for weights and field list.
 */

import type { Condition, Medication } from './types';

/** Documented field weights (higher = stronger match). */
export const SEARCH_FIELD_WEIGHTS = {
  nameExact: 1000,
  nameSubstring: 800,
  nihSynonymExact: 750,
  nihSynonymSubstring: 600,
  subConditionName: 450,
  category: 400,
  summary: 220,
  certificationNote: 220,
  medicationNotes: 220,
  documentLabel: 120,
  warnings: 100,
  medGenericName: 800,
  medFlightNote: 200,
  medImpact: 150,
} as const;

export type SearchHitType = 'condition' | 'medication';

export interface SearchHit {
  type: SearchHitType;
  id: string;
  score: number;
  condition?: Condition;
  medication?: Medication;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function needlesFrom(query: string, expandedTerms: string[] = []): string[] {
  const raw = [query, ...expandedTerms]
    .map((t) => normalize(t))
    .filter((t) => t.length >= 2);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of raw) {
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

/** Best weighted hit of needle against a single field. */
function scoreField(
  field: string | undefined,
  needle: string,
  exactWeight: number,
  substringWeight: number,
): number {
  const norm = normalize(field || '');
  if (!norm || !needle) return 0;
  if (norm === needle) return exactWeight;
  if (norm.includes(needle)) {
    return Math.round(substringWeight * (needle.length / norm.length));
  }
  return 0;
}

function bestAcrossNeedles(
  needles: string[],
  scorer: (needle: string) => number,
): number {
  let best = 0;
  for (const needle of needles) {
    best = Math.max(best, scorer(needle));
  }
  return best;
}

export function scoreCondition(condition: Condition, needles: string[]): number {
  return bestAcrossNeedles(needles, (needle) => {
    let score = 0;
    score = Math.max(
      score,
      scoreField(
        condition.name,
        needle,
        SEARCH_FIELD_WEIGHTS.nameExact,
        SEARCH_FIELD_WEIGHTS.nameSubstring,
      ),
    );

    const synonyms = condition.nih?.synonyms ?? [];
    const consumer = condition.nih?.consumerName;
    const primary = condition.nih?.primaryName;
    for (const syn of [...synonyms, consumer, primary].filter(Boolean) as string[]) {
      score = Math.max(
        score,
        scoreField(
          syn,
          needle,
          SEARCH_FIELD_WEIGHTS.nihSynonymExact,
          SEARCH_FIELD_WEIGHTS.nihSynonymSubstring,
        ),
      );
    }

    score = Math.max(
      score,
      scoreField(
        condition.category,
        needle,
        SEARCH_FIELD_WEIGHTS.category,
        SEARCH_FIELD_WEIGHTS.category,
      ),
    );
    score = Math.max(
      score,
      scoreField(
        condition.summary,
        needle,
        SEARCH_FIELD_WEIGHTS.summary,
        SEARCH_FIELD_WEIGHTS.summary,
      ),
    );
    score = Math.max(
      score,
      scoreField(
        condition.certificationNote,
        needle,
        SEARCH_FIELD_WEIGHTS.certificationNote,
        SEARCH_FIELD_WEIGHTS.certificationNote,
      ),
    );

    for (const note of condition.medicationNotes ?? []) {
      score = Math.max(
        score,
        scoreField(
          note,
          needle,
          SEARCH_FIELD_WEIGHTS.medicationNotes,
          SEARCH_FIELD_WEIGHTS.medicationNotes,
        ),
      );
    }

    for (const sub of condition.subConditions) {
      score = Math.max(
        score,
        scoreField(
          sub.name,
          needle,
          SEARCH_FIELD_WEIGHTS.subConditionName,
          SEARCH_FIELD_WEIGHTS.subConditionName,
        ),
      );
      score = Math.max(
        score,
        scoreField(
          sub.summary,
          needle,
          SEARCH_FIELD_WEIGHTS.summary,
          SEARCH_FIELD_WEIGHTS.summary,
        ),
      );
      score = Math.max(
        score,
        scoreField(
          sub.certificationNote,
          needle,
          SEARCH_FIELD_WEIGHTS.certificationNote,
          SEARCH_FIELD_WEIGHTS.certificationNote,
        ),
      );
      for (const note of sub.medicationNotes ?? []) {
        score = Math.max(
          score,
          scoreField(
            note,
            needle,
            SEARCH_FIELD_WEIGHTS.medicationNotes,
            SEARCH_FIELD_WEIGHTS.medicationNotes,
          ),
        );
      }
      for (const doc of sub.documents) {
        score = Math.max(
          score,
          scoreField(
            doc.label,
            needle,
            SEARCH_FIELD_WEIGHTS.documentLabel,
            SEARCH_FIELD_WEIGHTS.documentLabel,
          ),
        );
      }
      for (const warning of sub.warnings ?? []) {
        score = Math.max(
          score,
          scoreField(
            warning,
            needle,
            SEARCH_FIELD_WEIGHTS.warnings,
            SEARCH_FIELD_WEIGHTS.warnings,
          ),
        );
      }
    }

    return score;
  });
}

export function scoreMedication(medication: Medication, needles: string[]): number {
  return bestAcrossNeedles(needles, (needle) => {
    let score = 0;
    score = Math.max(
      score,
      scoreField(
        medication.name,
        needle,
        SEARCH_FIELD_WEIGHTS.nameExact,
        SEARCH_FIELD_WEIGHTS.nameSubstring,
      ),
    );
    score = Math.max(
      score,
      scoreField(
        medication.genericName,
        needle,
        SEARCH_FIELD_WEIGHTS.medGenericName,
        SEARCH_FIELD_WEIGHTS.medGenericName,
      ),
    );
    score = Math.max(
      score,
      scoreField(
        medication.category,
        needle,
        SEARCH_FIELD_WEIGHTS.category,
        SEARCH_FIELD_WEIGHTS.category,
      ),
    );
    score = Math.max(
      score,
      scoreField(
        medication.flightStatusNote,
        needle,
        SEARCH_FIELD_WEIGHTS.medFlightNote,
        SEARCH_FIELD_WEIGHTS.medFlightNote,
      ),
    );
    score = Math.max(
      score,
      scoreField(
        medication.certificationImpact,
        needle,
        SEARCH_FIELD_WEIGHTS.medImpact,
        SEARCH_FIELD_WEIGHTS.medImpact,
      ),
    );
    return score;
  });
}

/** Collect expansion terms from NIH suggestion DTOs (labels + synonyms). */
export function expandedTermsFromNihSuggestions(
  suggestions: Array<{ label?: string; primaryName?: string; synonyms?: string[] }>,
): string[] {
  const terms: string[] = [];
  for (const s of suggestions) {
    if (s.label) terms.push(s.label);
    if (s.primaryName) terms.push(s.primaryName);
    for (const syn of s.synonyms ?? []) terms.push(syn);
  }
  return terms;
}

/**
 * Ranked catalog search. Ties break by type (condition before medication), then id.
 */
export function searchCatalog(
  query: string,
  options: {
    conditions: Condition[];
    medications?: Medication[];
    expandedTerms?: string[];
  },
): SearchHit[] {
  const needles = needlesFrom(query, options.expandedTerms ?? []);
  if (!needles.length) return [];

  const hits: SearchHit[] = [];

  for (const condition of options.conditions) {
    const score = scoreCondition(condition, needles);
    if (score > 0) {
      hits.push({ type: 'condition', id: condition.id, score, condition });
    }
  }

  for (const medication of options.medications ?? []) {
    const score = scoreMedication(medication, needles);
    if (score > 0) {
      hits.push({ type: 'medication', id: medication.id, score, medication });
    }
  }

  hits.sort(
    (a, b) =>
      b.score - a.score ||
      a.type.localeCompare(b.type) ||
      a.id.localeCompare(b.id),
  );

  return hits;
}
