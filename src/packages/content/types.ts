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