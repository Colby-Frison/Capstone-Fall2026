export type {
  Condition,
  Disposition,
  DocumentItem,
  FormRef,
  FormType,
  Medication,
  NihConditionIdentity,
  NihMappingStatus,
  NormalizedGuidanceFile,
  NormalizedRecord,
  NormalizedRequirement,
  SubCondition,
} from './types';

export type {
  NihConditionsResponse,
  NihInfoLink,
  NihSuggestion,
} from './nih';

export type { NihConditionMapFile } from './nihMap';

export {
  adaptGuidanceFile,
  adaptGuidanceFiles,
  dedupeNormalizedRecords,
  humanizeCategory,
  humanizeConditionName,
  mapDisposition,
  mergeGuidanceFiles,
  pathwayTitle,
  recordDedupeKey,
  requirementsToAmeReviewNotes,
  requirementsToDocuments,
  searchAdaptedConditions,
  slugify,
  stripOrderingMarker,
} from './adapt';

export {
  enrichSuggestionsWithMatches,
  matchConditionsByNames,
  matchTotality,
} from './nih';

export {
  applyNihConditionMap,
  faaNihNameScore,
  faaNihTokenScore,
  LOW_CONFIDENCE_THRESHOLD,
  MAPPED_CONFIDENCE_THRESHOLD,
  mappingStatusFromConfidence,
  normalizeNihIdentity,
  resolveNihIdentityForCondition,
} from './nihMap';

export {
  expandedTermsFromNihSuggestions,
  scoreCondition,
  scoreMedication,
  scoreForm,
  searchCatalog,
  SEARCH_FIELD_WEIGHTS,
  type SearchHit,
  type SearchHitType,
} from './search';

export {
  conditionLevelFormIds,
  conditionsUsingForm,
  FORM_TYPE_LABELS,
  formForDocument,
  formIdsForRecord,
  formIdsInText,
  formsByIds,
  formsForCondition,
  getFormById,
  listForms,
  normalizeFormText,
} from './forms';

export { listCanonicalCategories, resolveCategory } from './categories';
