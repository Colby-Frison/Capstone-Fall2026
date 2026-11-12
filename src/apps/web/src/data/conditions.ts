/**
 * Condition catalog backed by every normalized guidance JSON under
 * src/data/guidance. Files are merged and de-duplicated before adaptation.
 * NIH identities come from the committed sidecar (no live NIH at build time).
 */
import {
  adaptGuidanceFiles,
  applyNihConditionMap,
  applyParsedConditions,
  searchAdaptedConditions,
  type Condition,
  type NihConditionMapFile,
  type NormalizedGuidanceFile,
  type ParsedConditionsFile,
} from "@content/index";
import nihConditionMap from "@guidance/nih_condition_map.json";
// Generated from the parsed AME Guide by scripts/build-parsed-conditions.ts (#56).
import parsedConditions from "@guidance/parsed_conditions.json";
import freqCondArray from "@guidance/freq_conditions.json";

export type { Condition } from '@content/types';

const guidanceModules = import.meta.glob('@guidance/*.normalized.json', {
  eager: true,
  import: 'default',
}) as Record<string, NormalizedGuidanceFile>;

const guidanceFiles = Object.keys(guidanceModules)
  .sort()
  .map((path) => guidanceModules[path]);

// Parsed AME Guide content replaces/extends the adapted records; NIH identity is keyed by id, so it is applied last.
export const conditions: Condition[] = applyNihConditionMap(
  applyParsedConditions(
    adaptGuidanceFiles(guidanceFiles),
    parsedConditions as unknown as ParsedConditionsFile,
  ),
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
