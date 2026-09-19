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
import { resolveCategory } from './categories';

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
  if (value.endsWith(')') && !value.includes('(')) {
    value = value.replace(/\)+$/, '').trim();
  }
  const letters = value.replace(/[^A-Za-z]/g, '');
  const upperLetters = letters.replace(/[^A-Z]/g, '');
  if (letters.length > 4 && upperLetters.length / letters.length >= 0.7) {
    value = titleCaseWords(value.toLowerCase());
  }
  return value;
}

export function humanizeCategory(category: string | null | undefined): string {
  const value = cleanText(category || 'General');
  if (!value || /^unknown$/i.test(value)) {
    return 'General';
  }
  if (/^ITEM\s+\d+/i.test(value) || (value.toUpperCase() === value && value.length <= 40)) {
    return titleCaseWords(value.toLowerCase());
  }
  return value;
}

export function pathwayTitle(scenario: string): string {
  const cleaned = stripOrderingMarker(cleanText(scenario));
  const withoutLetter = cleaned.replace(/^[A-Z]\.\s+/i, '').trim();
  let rest = withoutLetter || cleaned;
  rest = rest.split(/\s+[•·●]\s+/)[0];
  rest = stripOrderingMarker(rest);
  if (rest.length > 90) {
    rest = `${rest.slice(0, 87).replace(/\s+\S*$/, '')}…`;
  }
  return rest;
}

/** Remove A./B./1./bullet prefixes used only for source ordering. */
export function stripOrderingMarker(text: string): string {
  let value = cleanText(text);
  let previous = '';
  while (value !== previous) {
    previous = value;
    value = value
      .replace(/^[A-Z]\.\s*/i, '')
      .replace(/^\d+[.)]\s*/, '')
      .replace(/^[-•·●]+\s*/, '')
      .replace(/(?:\s*;\s*(?:and)?|,)\s*$/i, '')
      .trim();
  }
  return value;
}

function isBoilerplateHeader(text: string): boolean {
  const lower = cleanText(text).toLowerCase().replace(/:$/, '');
  if (
    [
      'submit the following',
      'submit the following for faa review',
      'submit the following to the faa for review',
      'submit the following for review',
  'it must include',
  'it must specifically include',
  'standard follow up would include',
  'standard follow-up would include',
].includes(lower)
  ) {
    return true;
  }
  if (lower.startsWith('submit the following') && lower.length <= 64) return true;
  return /^it must(?:\s+specifically)?\s+include$/.test(lower);
}

function peelRequirementPrefix(text: string): string {
  return cleanText(text)
    .replace(
      /^(?:(?:After [^.]{0,80}, )?(?:The pilot should )?Submit the following(?:\s+(?:to the FAA for review|for(?:\s+FAA)?\s+review))?|It must(?:\s+specifically)?\s+include)\s*:?\s*/i,
      '',
    )
    .replace(/\s+Note(?:\(s\))?\s*:.*$/i, '')
    .trim();
}

function stripTrailingDisposition(text: string): string {
  return cleanText(text)
    .replace(/(?:\s+|^)\b(?:DEFER|ISSUE|DENY|SPECIAL\s+ISSUANCE)\s*\.?$/i, '')
    .replace(/[;\s.]+$/, '')
    .trim();
}

function firstSentence(text: string, max = 180): string {
  const cleaned = cleanText(text);
  if (!cleaned) return '';
  const sentence = cleaned.split(/(?<=[.!?])\s+/)[0] || cleaned;
  if (sentence.length <= max) return sentence;
  return `${sentence.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

function expandRequirementText(text: string): string[] {
  let cleaned = peelRequirementPrefix(cleanText(text));
  cleaned = stripOrderingMarker(cleaned);
  cleaned = cleaned.replace(
    /^(?:All(?:\s+Classes?)?|1st(?:\s+class)?|2nd(?:\s+class)?|3rd(?:\s+class)?)\s+/i,
    '',
  );
  cleaned = cleaned
    .replace(/(?::\s*)?\b(?:DEFER|ISSUE|DENY|SPECIAL\s+ISSUANCE)\b.*$/i, '')
    .replace(
      /\s+(?:Submit the information to the FAA\b.*|Summarize this history in Block 60\b.*)$/i,
      '',
    )
    .replace(/(?:^|\s)o\s+(?=[A-Za-z(])/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || isBoilerplateHeader(cleaned)) return [];
  if (/^note(?:\(s\))?\s*:/i.test(cleaned)) return [];

  if (/[•·●]/.test(cleaned)) {
    return cleaned
      .split(/\s*[•·●]\s*/)
      .map((part) => stripOrderingMarker(peelRequirementPrefix(part)))
      .filter((part) => part.length >= 4 && !isBoilerplateHeader(part));
  }

  // Numbered lists flattened onto one line: "1. Foo 2. Bar" (skip Block 60.)
  const numberedHits = cleaned.match(
    /(?<!Block\s)(?<!Item\s)\b\d{1,2}\.\s*[A-Za-z]/g,
  );
  if (numberedHits && numberedHits.length > 1) {
    return cleaned
      .split(/(?:(?<=\s)|^)(?=\d{1,2}\.\s*[A-Za-z("])/)
      .map((part) => stripOrderingMarker(peelRequirementPrefix(part)))
      .filter(
        (part) =>
          part.length >= 8 &&
          !isBoilerplateHeader(part) &&
          !/^Block\s+\d+$/i.test(part),
      );
  }

  // Semicolon-separated FAA checklist fragments.
  if ((cleaned.match(/;/g) || []).length >= 2) {
    const specifically = cleaned.match(/\bIt must\s+specifically\s+include\s*:?\s*/i);
    const chunks: string[] = [];
    if (specifically && specifically.index != null) {
      const head = cleaned.slice(0, specifically.index).replace(/[;:\s]+$/, '').trim();
      const tail = cleaned.slice(specifically.index + specifically[0].length).trim();
      if (head) chunks.push(head);
      chunks.push(
        ...tail
          .split(/\s*;\s*/)
          .map((part) =>
            stripOrderingMarker(part.replace(/^(?:and\s+)/i, '').trim()),
          )
          .filter((part) => part.length >= 4),
      );
    } else {
      chunks.push(
        ...cleaned
          .split(/\s*;\s*/)
          .map((part) =>
            stripOrderingMarker(part.replace(/^(?:and\s+)/i, '').trim()),
          )
          .filter((part) => part.length >= 4),
      );
    }
    if (chunks.length > 1) return chunks;
  }

  return [cleaned];
}

function isBringListItem(text: string, kind?: string): boolean {
  const lower = text.toLowerCase();
  if (isBoilerplateHeader(text)) return false;
  if (lower.startsWith('if the ame can determine')) return false;
  if (lower.startsWith('the ame should inquire')) return false;
  if (lower.startsWith('no evaluations or follow-up needed')) return false;
  if (lower.startsWith('discuss with the pilot')) return false;
  if (lower.startsWith('note:') || lower.startsWith('note(s):')) return false;
  if (kind === 'EVALUATION' && !/submit|progress note|report|record|imaging|test/i.test(text)) {
    return false;
  }
  return (
    /submit|progress note|report|record|imaging|mri|audiogram|test|documentation|statement|medication list|hospital|neurolog|evaluation/i.test(
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
        label: stripOrderingMarker(label),
        description:
          item.text === label ? undefined : stripOrderingMarker(item.text),
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
    .map((item: NormalizedRequirement) =>
      stripOrderingMarker(peelRequirementPrefix(item.text)),
    )
    .filter((text) => text && !isBoilerplateHeader(text));
  if (evaluationBits.length) {
    return firstSentence(evaluationBits[0], 220);
  }
  return firstSentence(
    pathwayTitle(record.scenario || record.raw_text || ''),
    220,
  );
}

function cleanMedicationNotes(notes: string[] | undefined): string[] {
  const out: string[] = [];
  for (const note of notes ?? []) {
    const cleaned = stripOrderingMarker(cleanText(note));
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
  const action = stripTrailingDisposition(record.action);
  const summary = evaluationSummary(record);
  const certificationNote =
    action ||
    (() => {
      const raw = cleanText(record.raw_disposition);
      if (/^(DEFER|ISSUE|DENY|SPECIAL ISSUANCE|UNKNOWN)$/i.test(raw)) return '';
      return raw;
    })() ||
    'See the published FAA guidance for this pathway.';

  return {
    id: slugify(record.record_id || `${record.condition}-${name}`),
    name,
    disposition,
    summary,
    certificationNote: stripOrderingMarker(certificationNote),
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

/** Stable key for presentation dedupe across guidance JSON files. */
export function recordDedupeKey(record: NormalizedRecord): string {
  const condition = slugify(humanizeConditionName(record.condition || ''));
  const pathway = slugify(
    pathwayTitle(record.subcondition || record.scenario || ''),
  );
  const disposition = cleanText(record.disposition || 'UNKNOWN').toUpperCase();
  return `${condition}|${pathway}|${disposition}`;
}

function recordRichness(record: NormalizedRecord): number {
  const reqChars = (record.requirements ?? []).reduce(
    (sum, item) => sum + (item.text?.length ?? 0),
    0,
  );
  return (
    (record.requirements?.length ?? 0) * 100 +
    (record.medication_notes?.length ?? 0) * 20 +
    (record.action?.length ?? 0) +
    (record.raw_text?.length ?? 0) +
    reqChars
  );
}

/**
 * Drop duplicate pathways before UI adaptation.
 * Same record_id wins once; otherwise condition+pathway+disposition collapses
 * to the richer record (more requirements / longer source text).
 */
export function dedupeNormalizedRecords(
  records: NormalizedRecord[],
): NormalizedRecord[] {
  const byId = new Map<string, NormalizedRecord>();
  const withoutId: NormalizedRecord[] = [];

  for (const record of records) {
    const id = cleanText(record.record_id);
    if (!id) {
      withoutId.push(record);
      continue;
    }
    const existing = byId.get(id);
    if (!existing || recordRichness(record) > recordRichness(existing)) {
      byId.set(id, record);
    }
  }

  const byContent = new Map<string, NormalizedRecord>();
  for (const record of [...byId.values(), ...withoutId]) {
    const key = recordDedupeKey(record);
    if (!key.startsWith('|') && key !== '||UNKNOWN') {
      const existing = byContent.get(key);
      if (!existing || recordRichness(record) > recordRichness(existing)) {
        byContent.set(key, record);
      }
    } else if (!byContent.has(key)) {
      byContent.set(key, record);
    }
  }

  return [...byContent.values()];
}

export function mergeGuidanceFiles(
  files: NormalizedGuidanceFile[],
): NormalizedGuidanceFile {
  const ordered = [...files].sort((a, b) =>
    cleanText(a.source_document).localeCompare(cleanText(b.source_document)),
  );
  const mergedRecords = dedupeNormalizedRecords(
    ordered.flatMap((file) => file.records ?? []),
  );
  const sourceDocuments = ordered
    .map((file) => cleanText(file.source_document))
    .filter(Boolean);

  return {
    schema_version: ordered[0]?.schema_version || '1.0',
    parser_version: ordered[0]?.parser_version || '0.1.0',
    source_document: sourceDocuments.join(', ') || 'guidance',
    pages_processed: ordered.reduce(
      (sum, file) => sum + (file.pages_processed || 0),
      0,
    ),
    records: mergedRecords,
    warnings: ordered.flatMap((file) => file.warnings ?? []),
    summary: {
      records_extracted: mergedRecords.length,
      source_files: ordered.length,
    },
  };
}

function dedupeSubConditions(subs: SubCondition[]): SubCondition[] {
  const byKey = new Map<string, SubCondition>();
  for (const sub of subs) {
    const key = `${slugify(sub.name)}|${sub.disposition}`;
    const existing = byKey.get(key);
    if (
      !existing ||
      sub.documents.length > existing.documents.length ||
      sub.summary.length > existing.summary.length
    ) {
      byKey.set(key, sub);
    }
  }
  return [...byKey.values()];
}

export function adaptGuidanceFiles(
  files: NormalizedGuidanceFile[],
): Condition[] {
  if (!files.length) return [];
  return adaptGuidanceFile(mergeGuidanceFiles(files));
}

function isDisplayableConditionName(name: string): boolean {
  const value = cleanText(name);
  if (!value || value.toUpperCase() === 'UNKNOWN') return false;
  const upper = value.toUpperCase();
  if (upper.startsWith('AASI') || upper.includes('AME ASSISTED SPECIAL ISSUANCE')) {
    return false;
  }
  if (upper.includes('REVISION DESCRIPTION') || upper.includes('REASON FOR UPDATE')) {
    return false;
  }
  if (/^\(\d{2}\/\d{2}\/\d{4}\)$/.test(value)) return false;
  if (/^\(?\s*All\s+Classes?\s*\)?$/i.test(value)) return false;
  if (
    value.startsWith('III.') ||
    upper.includes('AEROSPACE MEDICAL DISPOSITION THE FOLLOWING')
  ) {
    return false;
  }
  if (upper.includes('DISPOSITION TABLE LISTS')) return false;
  if (value.length > 160) return false;
  return true;
}

function isDisplayableScenario(name: string): boolean {
  const value = cleanText(name);
  if (!value || value.length < 6) return false;
  const upper = value.toUpperCase();
  if (
    /^(OR|AND|C\.|CD\.|MONTHS?\.?|10\.|GUIDE VERSION|\d{4}|SUBMITTED\.?)$/i.test(
      value,
    )
  ) {
    return false;
  }
  if (
    /^(SUBMITTED|SUBMIT FOR|REASON FOR UPDATE|GUIDE VERSION|IN ITEM |REVISE |UPDATE |THE FOLLOWING|A DETAILED|A CURRENT|COPIES OF|GENERATED FROM|PROGRESS NOTE|REPORT)/i.test(
      value,
    )
  ) {
    return false;
  }
  if (/^[a-z]/.test(value)) return false;
  return true;
}

export function adaptGuidanceFile(data: NormalizedGuidanceFile): Condition[] {
  const groups = new Map<string, NormalizedRecord[]>();

  for (const record of dedupeNormalizedRecords(data.records ?? [])) {
    const key = humanizeConditionName(record.condition || 'UNKNOWN');
    if (!isDisplayableConditionName(key)) continue;
    const scenario = record.subcondition || record.scenario || '';
    if (scenario && !isDisplayableScenario(pathwayTitle(scenario))) {
      // Keep records with empty scenario only if they somehow appear; otherwise skip junk.
      if (cleanText(scenario)) continue;
    }
    const bucket = groups.get(key) ?? [];
    bucket.push(record);
    groups.set(key, bucket);
  }

  const conditions: Condition[] = [];
  const usedIds = new Set<string>();

  for (const [conditionName, records] of groups) {
    let subConditions = dedupeSubConditions(records.map(recordToSubCondition));
    subConditions = subConditions.filter((sub) => isDisplayableScenario(sub.name));
    if (!subConditions.length) continue;

    const first = records[0];
    const category = resolveCategory(
      first.condition,
      first.category,
      first.source?.section,
    );
    const medicationNotes = Array.from(
      new Set(subConditions.flatMap((sub) => sub.medicationNotes ?? [])),
    );
    const disposition = pickPrimaryDisposition(subConditions);
    const pathwayCount = subConditions.length;
    const summary = `${pathwayCount} published certification pathway${
      pathwayCount === 1 ? '' : 's'
    } from FAA guidance. Select a pathway below for disposition and what to bring.`;
    const certificationNote =
      'Pathway-specific notes appear after you select a sub-condition. Outcomes reflect published guidance only.';

    const pages = records
      .map((r) => r.source?.pdf_page)
      .filter((page): page is number => typeof page === 'number');
    const pageRange =
      pages.length > 0
        ? `p. ${Math.min(...pages)}${pages.length > 1 ? `–${Math.max(...pages)}` : ''}`
        : '';

    let id = slugify(conditionName) || 'condition';
    if (usedIds.has(id)) {
      const pageHint = pages.length ? String(Math.min(...pages)) : String(usedIds.size);
      id = slugify(`${conditionName}-${pageHint}`) || `${id}-${usedIds.size}`;
    }
    usedIds.add(id);

    conditions.push({
      id,
      name: conditionName,
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
      ...condition.subConditions.flatMap((s) => s.documents.map((d) => d.label)),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}
