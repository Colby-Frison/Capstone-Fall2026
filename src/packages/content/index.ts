export type {
  Condition,
  Disposition,
  DocumentItem,
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

export type {
  CaciWorksheet,
  FaaSource,
  ParsedConditionEntry,
  ParsedConditionsFile,
} from './types';

export { applyParsedConditions } from './parsedConditions';

export {
  adaptGuidanceFile,
  adaptGuidanceFiles,
  CONDITION_CERTIFICATION_NOTE,
  conditionSummary,
  dedupeNormalizedRecords,
  firstSentence,
  isDisplayableConditionName,
  isDisplayableScenario,
  pickPrimaryDisposition,
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
  searchCatalog,
  SEARCH_FIELD_WEIGHTS,
  type SearchHit,
  type SearchHitType,
} from './search';

export { listCanonicalCategories, resolveCategory } from './categories';
