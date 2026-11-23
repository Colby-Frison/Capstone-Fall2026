/**
 * FAA form registry and matching.
 *
 * `forms_catalog.json` lists each form once (title, plain-language summary,
 * who completes it, verified faa.gov URL). Conditions, situations and checklist
 * items point at forms by id:
 *   - a situation gets the forms whose phrases appear in that table row's text;
 *   - a condition also gets forms the registry assigns to it by name.
 */

import catalog from '@guidance/forms_catalog.json';
import type {
  Condition,
  FormRef,
  FormType,
  NormalizedRecord,
} from './types';

interface CatalogEntry {
  id: string;
  title: string;
  type: FormType;
  summary: string;
  completedBy: string;
  url: string;
  /** Phrases the guide uses for this form (matched after normalizeFormText). */
  match: string[];
  /** Phrases that count only inside a condition whose name contains `condition`. */
  conditionMatch?: { condition: string; phrase: string }[];
  /** Condition names this form belongs to even when no table row names it. */
  conditions?: string[];
  lastVerified: string;
}

const ENTRIES = (catalog as { forms: CatalogEntry[] }).forms;

/** Display order: named forms first, the general progress-note guide last. */
const TYPE_ORDER: FormType[] = [
  'status_summary',
  'questionnaire',
  'faa_form',
  'result_sheet',
  'progress_note',
];

export const FORM_TYPE_LABELS: Record<FormType, string> = {
  status_summary: 'Status summary',
  questionnaire: 'Questionnaire',
  faa_form: 'FAA form',
  result_sheet: 'Test result sheet',
  progress_note: 'Guide for your doctor',
};

/** Lower-case, unify dashes, and drop spacing the PDF extraction adds around - and /. */
export function normalizeFormText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[‐-―−]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function toRef(entry: CatalogEntry): FormRef {
  return {
    id: entry.id,
    title: entry.title,
    type: entry.type,
    summary: entry.summary,
    completedBy: entry.completedBy,
    url: entry.url,
    aliases: entry.match,
  };
}

const FORMS: FormRef[] = ENTRIES.map(toRef);
const BY_ID = new Map(FORMS.map((form) => [form.id, form]));

function typeRank(id: string): number {
  const form = BY_ID.get(id);
  return form ? TYPE_ORDER.indexOf(form.type) : TYPE_ORDER.length;
}

/** Unique ids in display order (stable within a type). */
function orderIds(ids: Iterable<string>): string[] {
  return [...new Set(ids)].sort((a, b) => typeRank(a) - typeRank(b));
}

function entryMatches(
  entry: CatalogEntry,
  text: string,
  conditionName: string,
): boolean {
  if (entry.match.some((phrase) => text.includes(phrase))) return true;
  return (entry.conditionMatch ?? []).some(
    (rule) =>
      conditionName.includes(rule.condition) && text.includes(rule.phrase),
  );
}

/** Every form in the registry, in display order. */
export function listForms(): FormRef[] {
  return formsByIds(FORMS.map((form) => form.id));
}

export function getFormById(id: string | undefined): FormRef | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** Resolve ids to forms in display order, skipping unknown ids. */
export function formsByIds(ids: Iterable<string> | undefined): FormRef[] {
  return orderIds(ids ?? [])
    .map((id) => BY_ID.get(id))
    .filter((form): form is FormRef => Boolean(form));
}

/** Ids of every registry form named in `text`. `conditionName` enables condition-scoped phrases. */
export function formIdsInText(text: string, conditionName = ''): string[] {
  const haystack = normalizeFormText(text);
  if (!haystack) return [];
  const condition = normalizeFormText(conditionName);
  return orderIds(
    ENTRIES.filter((entry) => entryMatches(entry, haystack, condition)).map(
      (entry) => entry.id,
    ),
  );
}

/** Ids of the forms the guide names anywhere in one disposition-table row. */
export function formIdsForRecord(record: NormalizedRecord): string[] {
  const text = [
    record.raw_text ?? '',
    ...(record.requirements ?? []).map((item) => item.text ?? ''),
  ].join(' ');
  return formIdsInText(text, record.condition);
}

/** The form a single checklist item refers to, preferring a named form over the progress-note guide. */
export function formForDocument(
  text: string,
  conditionName = '',
): FormRef | undefined {
  return getFormById(formIdsInText(text, conditionName)[0]);
}

/** Ids of forms the registry assigns to a whole condition by (display) name. */
export function conditionLevelFormIds(conditionName: string): string[] {
  const name = conditionName.trim().toLowerCase();
  return ENTRIES.filter((entry) =>
    (entry.conditions ?? []).some((c) => c.trim().toLowerCase() === name),
  ).map((entry) => entry.id);
}

/** All form ids for a condition: every situation's forms plus condition-level forms. */
export function collectConditionFormIds(
  conditionName: string,
  situationFormIds: string[][],
): string[] {
  return orderIds([
    ...situationFormIds.flat(),
    ...conditionLevelFormIds(conditionName),
  ]);
}

/**
 * Re-link forms on a condition whose situations were built without them (the
 * parsed AME Guide in parsedConditions.ts). Each situation gets the forms named
 * in its displayed text, each checklist item gets the form it names, and the
 * condition keeps any form ids it already had.
 */
export function linkConditionForms(condition: Condition): Condition {
  const subConditions = condition.subConditions.map((sub) => {
    const documents = sub.documents.map((doc) => {
      if (doc.formId) return doc;
      const form = formForDocument(doc.description ?? doc.label, condition.name);
      return form ? { ...doc, formId: form.id, url: form.url } : doc;
    });
    const text = [
      sub.name,
      sub.summary,
      sub.certificationNote,
      sub.dispositionText ?? '',
      ...documents.map((doc) => doc.description ?? doc.label),
      ...(sub.ameReviewNotes ?? []),
    ].join(' ');
    const formIds = orderIds([
      ...(sub.formIds ?? []),
      ...formIdsInText(text, condition.name),
    ]);
    return { ...sub, documents, formIds };
  });
  return {
    ...condition,
    subConditions,
    formIds: collectConditionFormIds(condition.name, [
      condition.formIds ?? [],
      ...subConditions.map((sub) => sub.formIds),
    ]),
  };
}

/** Every form a condition uses, in display order. */
export function formsForCondition(condition: Condition): FormRef[] {
  return formsByIds(condition.formIds);
}

/** Conditions that use a given form, for the Forms & Documents page. */
export function conditionsUsingForm(
  formId: string,
  conditions: Condition[],
): Condition[] {
  return conditions.filter((c) => (c.formIds ?? []).includes(formId));
}
