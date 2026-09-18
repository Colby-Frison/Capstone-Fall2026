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
  SubCondition,
} from './types';

const DISPOSITION_MAP: Record<string, Disposition> = {
  ISSUE: 'issue',
  DEFER: 'deferral',
  DENY: 'denial',
  SPECIAL_ISSUANCE: 'special-issuance',
  UNKNOWN: 'unknown',
};

export function mapDisposition(value: string | null | undefined): Disposition {
  if (!value) return 'unknown';
  return DISPOSITION_MAP[value.toUpperCase()] ?? 'unknown';
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function truncate(text: string, max = 280): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trim()}…`;
}

export function requirementsToDocuments(
  record: NormalizedRecord,
): DocumentItem[] {
  return (record.requirements ?? [])
    .filter((item) => item.text?.trim())
    .map((item, index) => ({
      id: `${record.record_id}-req-${index}`,
      label: truncate(item.text, 160),
      description: item.text,
      required: true,
      kind: item.kind,
    }));
}

function recordToSubCondition(record: NormalizedRecord): SubCondition {
  const name = (record.subcondition || record.scenario || 'General pathway').trim();
  const disposition = mapDisposition(record.disposition);
  const action = record.action?.trim() || '';
  const summary = truncate(record.scenario || record.raw_text || name, 220);
  const certificationNote =
    action ||
    record.raw_disposition ||
    'See the published FAA guidance for this pathway.';

  return {
    id: slugify(record.record_id || `${record.condition}-${name}`),
    name,
    disposition,
    summary,
    certificationNote,
    documents: requirementsToDocuments(record),
    medicationNotes: record.medication_notes ?? [],
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
    const key = (record.condition || 'UNKNOWN').trim();
    if (!key || key === 'UNKNOWN') continue;
    const bucket = groups.get(key) ?? [];
    bucket.push(record);
    groups.set(key, bucket);
  }

  const conditions: Condition[] = [];

  for (const [conditionName, records] of groups) {
    const subConditions = records.map(recordToSubCondition);
    if (!subConditions.length) continue;

    const first = records[0];
    const category =
      first.category?.trim() ||
      first.source?.section?.trim() ||
      'General';
    const medicationNotes = Array.from(
      new Set(records.flatMap((r) => r.medication_notes ?? [])),
    );
    const disposition = pickPrimaryDisposition(subConditions);
    const summary = truncate(
      subConditions.map((s) => s.summary).join(' '),
      320,
    );
    const certificationNote =
      subConditions.find((s) => s.certificationNote)?.certificationNote ||
      'Review the published FAA pathway notes for this condition.';

    const pages = records
      .map((r) => r.source?.pdf_page)
      .filter((page): page is number => typeof page === 'number');
    const pageRange =
      pages.length > 0
        ? `p. ${Math.min(...pages)}${pages.length > 1 ? `–${Math.max(...pages)}` : ''}`
        : '';

    conditions.push({
      id: slugify(conditionName),
      name: conditionName.replace(/\*$/, '').trim(),
      category,
      disposition,
      summary,
      certificationNote,
      subConditions,
      relatedMedicationIds: [],
      source: `${first.source?.document || data.source_document}${pageRange ? ` (${pageRange})` : ''}`,
      sourceSection: first.source?.section || category,
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
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}
