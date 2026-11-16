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
  /** Registry id of the FAA form this item refers to, when the guide names one. */
  formId?: string;
  /** Direct link to that form's PDF on faa.gov. */
  url?: string;
}

export interface SubCondition {
  id: string;
  name: string;
  disposition: Disposition;
  summary: string;
  certificationNote: string;
  documents: DocumentItem[];
  /** Registry ids of the FAA forms the guide names for this situation. */
  formIds?: string[];
  ameReviewNotes?: string[];
  medicationNotes?: string[];
  timeConstraints?: string[];
  certificateClasses?: string[];
  sourcePage?: number;
  warnings?: string[];
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
  /** Registry ids of every FAA form this condition uses (all situations plus condition-level forms). */
  formIds?: string[];
  /** Populated from `nih_condition_map.json` when present. */
  nih?: NihConditionIdentity;
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

export type FormType =
  | 'status_summary'
  | 'questionnaire'
  | 'faa_form'
  | 'result_sheet'
  | 'progress_note';

/** One official FAA form from `forms_catalog.json`. */
export interface FormRef {
  id: string;
  title: string;
  type: FormType;
  /** Plain-language description of what the form is and when it is used. */
  summary: string;
  /** Who fills it in, e.g. "Your cardiologist" or "You (the pilot)". */
  completedBy: string;
  url: string;
  /** Other names the guide uses for the form, used by search. */
  aliases?: string[];
}