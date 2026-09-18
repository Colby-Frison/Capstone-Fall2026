/**
 * Adapt AME parser normalized JSON into pilot-facing UI models.
 * Dispositions are mapped only from reviewed enum values; wording stays source-backed.
 */

import type {
  Condition,
  Disposition,
  DocumentItem,
  NormalizedGuidanceFile,
  NormalizedRecord,
  NormalizedRequirement,
  SubCondition,
} from './types';

const DISPOSITION_MAP: Record<string, Disposition> = {
  ISSUE: 'issue',
  DEFER: 'deferral',
  DENY: 'denial',
  SPECIAL_ISSUANCE: 'special-issuance',
  UNKNOWN: 'unknown',
};

const TITLE_CASE_SMALL = new Set([
  'a',
  'an',
  'and',
  'or',
  'of',
  'the',
  'to',
  'for',
  'in',
  'on',
  'with',
]);

export function mapDisposition(value: string | null | undefined): Disposition {
  if (!value) return 'unknown';
  return DISPOSITION_MAP[value.toUpperCase().replace(/\s+/g, '_')] ?? 'unknown';
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function cleanText(text: string | null | undefined): string {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function titleCaseWords(text: string): string {
  return text
    .split(/\s+/)
    .map((word, index) => {
      if (!word) return word;
      const lower = word.toLowerCase();
      if (index > 0 && TITLE_CASE_SMALL.has(lower)) return lower;
      // Preserve short acronyms only when they contain digits or a slash (CI, MRI, AME/FAA).
      if (/^[A-Z0-9]{2,6}(?:\/[A-Z0-9]+)?$/.test(word) && /[0-9\/]/.test(word)) {
        return word;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

export function humanizeConditionName(name: string): string {
  let value = cleanText(name).replace(/\*+$/, '');
  value = value.replace(/([A-Za-z])\(/g, '$1 (');
  const letters = value.replace(/[^A-Za-z]/g, '');
  const upperLetters = letters.replace(/[^A-Z]/g, '');
  if (letters.length > 4 && upperLetters.length / letters.length >= 0.7) {
    value = titleCaseWords(value.toLowerCase());
  }
  return value;
}

export function humanizeCategory(category: string | null | undefined): string {
  const value = cleanText(category || 'General');
  if (value.toUpperCase() === value && value.length <= 24) {
    return titleCaseWords(value);
  }
  return value;
}

export function pathwayTitle(scenario: string): string {
  const cleaned = cleanText(scenario);
  const match = cleaned.match(/^([A-Z]\.)\s*(.+)$/i);
  if (!match) {
    return cleaned.length > 100 ? `${cleaned.slice(0, 97).trim()}…` : cleaned;
  }
  let rest = match[2];
  rest = rest.split(/\s+[•·●]\s+/)[0];
  if (rest.length > 90) {
    rest = `${rest.slice(0, 87).replace(/\s+\S*$/, '')}…`;
  }
  return `${match[1].toUpperCase()} ${rest}`.trim();
}

function firstSentence(text: string, max = 180): string {
  const cleaned = cleanText(text);
  if (!cleaned) return '';
  const sentence = cleaned.split(/(?<=[.!?])\s+/)[0] || cleaned;
  if (sentence.length <= max) return sentence;
  return `${sentence.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

function expandRequirementText(text: string): string[] {
  const cleaned = cleanText(text);
  if (!cleaned) return [];
  if (/[•·●]/.test(cleaned)) {
    return cleaned
      .split(/\s*[•·●]\s*/)
      .map((part) => cleanText(part))
      .filter((part) => part.length >= 8);
  }
  // Numbered lists flattened onto one line: "1. Foo 2. Bar"
  if (/\b\d+\.\s+\S/.test(cleaned) && (cleaned.match(/\b\d+\.\s+/g) || []).length > 1) {
    return cleaned
      .split(/\s(?=\d+\.\s+)/)
      .map((part) => cleanText(part.replace(/^\d+\.\s*/, '')))
      .filter((part) => part.length >= 8);
  }
  return [cleaned];
}

function isBringListItem(text: string, kind?: string): boolean {
  const lower = text.toLowerCase();
  if (lower.startsWith('if the ame can determine')) return false;
  if (lower.startsWith('the ame should inquire')) return false;
  if (lower.startsWith('no evaluations or follow-up needed')) return false;
  if (lower.startsWith('discuss with the pilot')) return false;
  if (kind === 'EVALUATION' && !/submit|progress note|report|record|imaging|test/i.test(text)) {
    return false;
  }
  return (
    /submit|progress note|report|record|imaging|mri|audiogram|test|documentation|statement|medication list|hospital/i.test(
      text,
    ) || kind === 'DOCUMENT' || kind === 'TEST'
  );
}

export function requirementsToDocuments(
  record: NormalizedRecord,
): DocumentItem[] {
  const expanded: { text: string; kind?: string }[] = [];
  for (const item of record.requirements ?? []) {
    for (const part of expandRequirementText(item.text)) {
      expanded.push({ text: part, kind: item.kind });
    }
  }

  const docs = expanded
    .filter((item) => isBringListItem(item.text, item.kind))
    .map((item, index) => {
      const label =
        item.text.length <= 140 ? item.text : firstSentence(item.text, 120);
      return {
        id: `${record.record_id}-req-${index}`,
        label,
        description: item.text === label ? undefined : item.text,
        required: true,
        kind: item.kind,
      } satisfies DocumentItem;
    });

  // De-duplicate near-identical labels
  const seen = new Set<string>();
  return docs.filter((doc) => {
    const key = doc.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function evaluationSummary(record: NormalizedRecord): string {
  const evaluationBits = (record.requirements ?? [])
    .map((item: NormalizedRequirement) => item.text)
    .filter(Boolean);
  if (evaluationBits.length) {
    return firstSentence(evaluationBits[0], 220);
  }
  return firstSentence(record.scenario || record.raw_text || '', 220);
}

function cleanMedicationNotes(notes: string[] | undefined): string[] {
  const out: string[] = [];
  for (const note of notes ?? []) {
    const cleaned = cleanText(note);
    if (!cleaned || cleaned.length > 220) continue;
    const lower = cleaned.toLowerCase();
    if (!/(medication|antihistamine|dosage|sedating|drug)/.test(lower)) continue;
    if (/^submit the following|^a\. |^b\. |^c\. /.test(lower)) continue;
    if (!out.includes(cleaned)) out.push(cleaned);
  }
  return out;
}

function recordToSubCondition(record: NormalizedRecord): SubCondition {
  const name = pathwayTitle(record.subcondition || record.scenario || 'General pathway');
  const disposition = mapDisposition(record.disposition);
  const action = cleanText(record.action);
  const summary = evaluationSummary(record);
  const certificationNote =
    action ||
    cleanText(record.raw_disposition) ||
    'See the published FAA guidance for this pathway.';

  return {
    id: slugify(record.record_id || `${record.condition}-${name}`),
    name,
    disposition,
    summary,
    certificationNote,
    documents: requirementsToDocuments(record),
    medicationNotes: cleanMedicationNotes(record.medication_notes),
    timeConstraints: record.time_constraints ?? [],
    sourcePage: record.source?.pdf_page,
    warnings: record.warnings ?? [],
  };
}

function pickPrimaryDisposition(subs: SubCondition[]): Disposition {
  if (subs.some((s) => s.disposition === 'denial')) return 'denial';
  if (subs.some((s) => s.disposition === 'deferral')) return 'deferral';
  if (subs.some((s) => s.disposition === 'special-issuance')) {
    return 'special-issuance';
  }
  if (subs.some((s) => s.disposition === 'issue')) return 'issue';
  return 'unknown';
}

export function adaptGuidanceFile(data: NormalizedGuidanceFile): Condition[] {
  const groups = new Map<string, NormalizedRecord[]>();

  for (const record of data.records ?? []) {
    const key = humanizeConditionName(record.condition || 'UNKNOWN');
    if (!key || key.toUpperCase() === 'UNKNOWN') continue;
    const bucket = groups.get(key) ?? [];
    bucket.push(record);
    groups.set(key, bucket);
  }

  const conditions: Condition[] = [];

  for (const [conditionName, records] of groups) {
    const subConditions = records.map(recordToSubCondition);
    if (!subConditions.length) continue;

    const first = records[0];
    const category = humanizeCategory(
      first.category || first.source?.section || 'General',
    );
    const medicationNotes = Array.from(
      new Set(subConditions.flatMap((sub) => sub.medicationNotes ?? [])),
    );
    const disposition = pickPrimaryDisposition(subConditions);
    const pathwayCount = subConditions.length;
    const summary = `${pathwayCount} published certification pathway${
      pathwayCount === 1 ? '' : 's'
    } from the AME Guide. Select a pathway below for disposition and what to bring.`;
    const certificationNote =
      'Pathway-specific notes appear after you select a sub-condition. Outcomes reflect published guidance only.';

    const pages = records
      .map((r) => r.source?.pdf_page)
      .filter((page): page is number => typeof page === 'number');
    const pageRange =
      pages.length > 0
        ? `p. ${Math.min(...pages)}${pages.length > 1 ? `–${Math.max(...pages)}` : ''}`
        : '';

    conditions.push({
      id: slugify(conditionName),
      name: conditionName,
      category,
      disposition,
      summary,
      certificationNote,
      subConditions,
      relatedMedicationIds: [],
      source: `${first.source?.document || data.source_document}${pageRange ? ` (${pageRange})` : ''}`,
      sourceSection: humanizeCategory(first.source?.section || category),
      medicationNotes,
    });
  }

  return conditions.sort((a, b) => a.name.localeCompare(b.name));
}

export function searchAdaptedConditions(
  conditions: Condition[],
  query: string,
): Condition[] {
  const q = query.trim().toLowerCase();
  if (!q) return conditions;
  return conditions.filter((condition) => {
    const haystack = [
      condition.name,
      condition.category,
      condition.summary,
      condition.certificationNote,
      ...condition.subConditions.map((s) => s.name),
      ...condition.subConditions.map((s) => s.summary),
      ...condition.subConditions.flatMap((s) => s.documents.map((d) => d.label)),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}
