import type { NihSuggestion } from '../data/nih';

export interface PartitionedNihSuggestions {
  /** NIH rows that match at least one local FAA condition (catalog-first). */
  inCatalog: NihSuggestion[];
  /** NIH rows with no local catalog match. */
  nihOnly: NihSuggestion[];
  /** Flattened order: inCatalog then nihOnly (for keyboard navigation). */
  ordered: NihSuggestion[];
}

/**
 * Keep NIH fetch results, but present catalog matches first.
 * Dedupes catalog rows by primary matched condition id.
 */
export function partitionNihSuggestions(
  suggestions: NihSuggestion[],
): PartitionedNihSuggestions {
  const inCatalog: NihSuggestion[] = [];
  const nihOnly: NihSuggestion[] = [];
  const seenConditionIds = new Set<string>();

  for (const suggestion of suggestions) {
    const matchedId = suggestion.matchedConditionIds[0];
    if (!matchedId) {
      nihOnly.push(suggestion);
      continue;
    }
    if (seenConditionIds.has(matchedId)) continue;
    seenConditionIds.add(matchedId);
    inCatalog.push(suggestion);
  }

  return {
    inCatalog,
    nihOnly,
    ordered: [...inCatalog, ...nihOnly],
  };
}
