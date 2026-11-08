import type { NihConditionIdentity } from '../data/types';

export type NihAboutMode = 'mapped' | 'unmapped';

/**
 * Decide whether condition detail should show NIH educational context
 * or an FAA-only / unmapped notice. Never invents medical blurbs.
 */
export function resolveNihAboutMode(
  nih: NihConditionIdentity | undefined,
): NihAboutMode {
  if (!nih) return 'unmapped';
  if (nih.mappingStatus === 'unmapped') return 'unmapped';

  const hasIdentity =
    Boolean(nih.consumerName?.trim()) ||
    Boolean(nih.primaryName?.trim()) ||
    nih.synonyms.length > 0 ||
    nih.icd10.length > 0 ||
    nih.infoLinks.length > 0;

  // mapped or low-confidence only when the sidecar actually carries displayable fields
  return hasIdentity ? 'mapped' : 'unmapped';
}
