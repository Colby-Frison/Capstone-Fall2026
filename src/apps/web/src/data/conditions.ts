/**
 * Condition catalog backed by private guidance JSON under
 * src/data/guidance/content (fetched at build/dev). Falls back to synthetic
 * samples when content is empty. Files are merged and de-duplicated before
 * adaptation. NIH identities come from the committed sidecar (no live NIH at
 * build time).
 */
import {
  adaptGuidanceFiles,
  applyNihConditionMap,
  searchAdaptedConditions,
  type Condition,
  type NihConditionMapFile,
  type NormalizedGuidanceFile,
} from "@content/index";
import nihConditionMap from "@guidance/nih_condition_map.json";
import freqCondArray from "@guidance/freq_conditions.json";

export type { Condition } from '@content/types';

const contentModules = import.meta.glob('@guidance/content/**/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, NormalizedGuidanceFile>;

const sampleModules = import.meta.glob('@guidance/samples/**/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, NormalizedGuidanceFile>;

function loadGuidanceFiles(): NormalizedGuidanceFile[] {
  const contentKeys = Object.keys(contentModules).sort();
  if (contentKeys.length > 0) {
    return contentKeys.map((path) => contentModules[path]);
  }
  console.warn(
    '[guidance] src/data/guidance/content is empty; using synthetic samples. Run: node scripts/fetch-guidance.mjs',
  );
  return Object.keys(sampleModules)
    .sort()
    .map((path) => sampleModules[path]);
}

const guidanceFiles = loadGuidanceFiles();

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

// check if some element in freq_conditions.json array appears as substring in condition's name
// i.e. 'adhd' <=> 'Attention-deficit/hyperactivity Disorder (adhd)* And/or Use of Adhd Medications'
export function isFreqCondition(conditionName: string): true | false {
  let lowerConditionName = conditionName.toLowerCase();
  return freqCondArray.some((freqCond) => {
    return lowerConditionName.includes(freqCond);
  });
}
// function used to display frequent condition count in Browse.tsx
export function frequentConditionCount(): number {
  let frequentConditions = conditions.filter((condition) => {
    return isFreqCondition(condition.name);
  });
  return frequentConditions.length;
}
