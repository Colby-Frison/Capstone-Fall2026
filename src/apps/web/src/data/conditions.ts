/**
 * Condition catalog backed by every normalized guidance JSON under
 * src/data/guidance. Files are merged and de-duplicated before adaptation.
 * NIH identities come from the committed sidecar (no live NIH at build time).
 */
import {
  adaptGuidanceFiles,
  applyNihConditionMap,
  searchAdaptedConditions,
  type Condition,
  type NihConditionMapFile,
  type NormalizedGuidanceFile,
} from '@content/index';
import nihConditionMap from '@guidance/nih_condition_map.json';

export type { Condition } from '@content/types';

const guidanceModules = import.meta.glob('@guidance/*.normalized.json', {
  eager: true,
  import: 'default',
}) as Record<string, NormalizedGuidanceFile>;

const guidanceFiles = Object.keys(guidanceModules)
  .sort()
  .map((path) => guidanceModules[path]);

export const conditions: Condition[] = applyNihConditionMap(
  adaptGuidanceFiles(guidanceFiles),
  nihConditionMap as NihConditionMapFile,
);

export const categories = [
  ...new Set(
    conditions
      .map((condition) => condition.category)
      .filter((category) => category && category !== 'General'),
  ),
].sort();

export function getConditionById(id: string): Condition | undefined {
  return conditions.find((condition) => condition.id === id);
}

export function searchConditions(
  query: string,
  expandedTerms: string[] = [],
): Condition[] {
  const q = query.trim();
  if (!q) return [];
  return searchAdaptedConditions(conditions, q, expandedTerms);
}
