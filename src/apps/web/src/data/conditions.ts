/**
 * Condition catalog backed by every normalized guidance JSON under
 * src/data/guidance. Files are merged and de-duplicated before adaptation.
 */
import {
  adaptGuidanceFiles,
  searchAdaptedConditions,
  type Condition,
  type NormalizedGuidanceFile,
} from '@content/index';

export type { Condition } from '@content/types';

const guidanceModules = import.meta.glob('@guidance/*.normalized.json', {
  eager: true,
  import: 'default',
}) as Record<string, NormalizedGuidanceFile>;

const guidanceFiles = Object.keys(guidanceModules)
  .sort()
  .map((path) => guidanceModules[path]);

export const conditions: Condition[] = adaptGuidanceFiles(guidanceFiles);

export const categories = [
  ...new Set(conditions.map((condition) => condition.category)),
].sort();

export function getConditionById(id: string): Condition | undefined {
  return conditions.find((condition) => condition.id === id);
}

export function searchConditions(query: string): Condition[] {
  const q = query.trim();
  if (!q) return [];
  return searchAdaptedConditions(conditions, q);
}
