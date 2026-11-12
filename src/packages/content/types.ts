/**
 * Shared UI content types for the pilots guide frontend.
 */

export type Disposition =
  | 'issue'
  | 'deferral'
  | 'denial'
  | 'special-issuance'
  | 'unknown';

export type RequirementRole = 'bring_list' | 'ame_review' | 'note';

export interface DocumentItem {
  id: string;
  label: string;
  required: boolean;
  description?: string;
  kind?: string;
  role?: RequirementRole;
}

export interface SubCondition {
  id: string;
  name: string;
  disposition: Disposition;
  summary: string;
  certificationNote: string;
  documents: DocumentItem[];
  ameReviewNotes?: string[];
  medicationNotes?: string[];
  timeConstraints?: string[];
  certificateClasses?: string[];
  sourcePage?: number;
  warnings?: string[];
  /** Row letter in the FAA disposition table (A, B, …), when the guide prints one. */
  label?: string;
  /** Full text of the FAA "Disposition" cell, kept verbatim. */
  dispositionText?: string;
}

/** CACI worksheet from the parsed AME Guide. */
export interface CaciWorksheet {
  title: string;
  updated: string | null;
  criteria: { ameMustReview: string; acceptableCertificationCriteria: string }[];
  block60Options: string[];
}

/** Where a parsed condition sits in the FAA AME Guide. */
export interface FaaSource {
  guideTitle: string;
  guideVersion: string | null;
  url: string;
  pdfPages: number[];
  sectionTitle: string;
  updated: string | null;
}

/** NIH identity attached from the committed FAA↔NIH sidecar (never overrides FAA disposition). */
export type NihMappingStatus = 'mapped' | 'unmapped' | 'low-confidence';

export interface NihConditionIdentity {
  mappingStatus: NihMappingStatus;
  nihKeyId?: string;
  consumerName?: string;
  primaryName?: string;
  synonyms: string[];
  icd10: string[];
  infoLinks: { url: string; title: string }[];
  matchConfidence: number;
}

export interface Condition {
  id: string;
  name: string;
  category: string;
  disposition: Disposition;
  summary: string;
  certificationNote: string;
  subConditions: SubCondition[];
  relatedMedicationIds: string[];
  source: string;
  sourceSection: string;
  medicationNotes?: string[];
  /** Populated from `nih_condition_map.json` when present. */
  nih?: NihConditionIdentity;
  /** From the parsed AME Guide (`parsed_conditions.json`). */
  caciWorksheets?: CaciWorksheet[];
  /** Notes printed under the condition table; sanitized to an allowlist of tags at build time. */
  notesHtml?: string;
  faaSource?: FaaSource;
  /** Sub-condition names the parser found in group tables (kept for later search work). */
  aliases?: string[];
}

/** One entry of `src/data/guidance/parsed_conditions.json`. */
export interface ParsedConditionEntry {
  /** Site condition id (= `?condition=` value). */
  id: string;
  parsedId: string;
  status: 'matched' | 'added';
  /** For `matched`: fields that replace the adapted condition's. For `added`: the full condition. */
  fields: Partial<Condition>;
}

export interface ParsedConditionsFile {
  version: number;
  source: string;
  guideVersion: string | null;
  conditions: ParsedConditionEntry[];
}

export interface Medication {
  id: string;
  name: string;
  genericName?: string;
  category: string;
  flightStatusNote: string;
  certificationImpact: string;
  relatedConditionIds: string[];
  ameDiscussion: string;
  source: string;
  sourceSection: string;
}

/** Parser-normalized JSON contract (subset used by the adapter). */
export interface NormalizedRequirement {
  kind: string;
  text: string;
  role?: RequirementRole | string;
  required?: boolean;
}

export interface NormalizedRecord {
  record_id: string;
  condition: string;
  category: string | null;
  scenario: string;
  subcondition: string | null;
  disposition: string;
  raw_disposition: string;
  action: string;
  requirements: NormalizedRequirement[];
  medication_notes: string[];
  time_constraints: string[];
  warnings: string[];
  certificate_classes: string[];
  raw_text: string;
  source: {
    document: string;
    pdf_page: number;
    printed_page: string | null;
    section: string | null;
  };
}

export interface NormalizedGuidanceFile {
  schema_version: string;
  parser_version: string;
  source_document: string;
  pages_processed: number;
  records: NormalizedRecord[];
  warnings: string[];
  summary: Record<string, number>;
}

export interface FormLinksValue {
  "Form Type": string;
  "Url": string;
}