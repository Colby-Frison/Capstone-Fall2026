// Types for the AME Guide website data (see SCHEMA.md).

export type Decision =
  | "issue"
  | "caci"
  | "defer"
  | "faa_decision"
  | "special_issuance"
  | "aasi"
  | "deny"
  | "more_info_needed"
  | "see_reference";

export interface CategoryRef {
  id: string;            // "abdomen-and-viscera"
  name: string;          // "Abdomen and Viscera"
  exam_item: string | null; // "38", "31-34", or null (General, Substances)
  part: string;          // major part of the guide
}

export interface ConditionRow {
  label: string | null;  // "A", "B", ... (null in group tables)
  condition: string;
  condition_html: string;
  evaluation_data: string;
  evaluation_data_html: string;
  what_to_bring: string[];
  decisions: Decision[];
  disposition: string;
  disposition_html: string;
  disposition_shared_with_previous_row: boolean;
  pdf_page: number | null;
}

export interface CaciWorksheet {
  title: string;
  updated: string | null;
  criteria: { ame_must_review: string; acceptable_certification_criteria: string }[];
  block_60_options: string[];
}

export interface Condition {
  id: string;                 // value of ?condition=
  name: string;
  subtitle: string | null;
  name_in_guide: string;
  category: CategoryRef;
  applies_to: string;
  updated: string | null;
  order: number;
  decisions: Decision[];
  what_to_bring: string[];
  rows: ConditionRow[];
  caci_worksheets: CaciWorksheet[];
  status_summaries: string[];
  notes_html: string;
  links: { text: string; href: string }[];
  aliases: string[];
  source: { section: string; section_title: string; pdf_pages: number[] | null; faa_url: string };
}

export interface ConditionIndexEntry {
  id: string;
  name: string;
  category: string;
  category_name: string;
  decisions: Decision[];
  has_caci: boolean;
  aliases: string[];
  rows: number;
  updated: string | null;
}

export interface Category {
  id: string;
  name: string;
  exam_item: string | null;
  part: string;
  order: number;
  intro_html: string | null;
  conditions: string[];      // condition ids, in guide order
}

export interface ReferenceBlock {
  type: "heading" | "paragraph" | "list" | "figure" | "html" | "table";
  page: number | null;
  text?: string;
  html: string;
  header?: string[] | null;  // tables only
  rows?: string[][];         // tables only
}

export interface ReferencePage {
  slug: string;
  title: string;
  group: string | null;
  intro_of_condition_section: boolean;
  pdf_pages: number[];
  blocks: ReferenceBlock[];
}

export interface Meta {
  source: string;
  source_url: string;
  guide_version: string | null;
  generated: string;
  counts: { conditions: number; categories: number; disposition_rows: number; reference_pages: number };
  validation: {
    disposition_rows_in_guide: number;
    disposition_rows_placed: number;
    rows_without_recognised_decision: number;
    issues: string[];
  };
}
