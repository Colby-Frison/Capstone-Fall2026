/**
 * Condition catalog backed by AME parser normalized JSON.
 */
import guidance from '@guidance/ame_guide.normalized.json';
import {
  adaptGuidanceFile,
  searchAdaptedConditions,
  type Condition,
  type NormalizedGuidanceFile,
} from '@content/index';

export type { Condition } from '@content/types';

export const conditions: Condition[] = adaptGuidanceFile(
  guidance as NormalizedGuidanceFile,
);

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
