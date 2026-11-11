/**
 * Build the site's condition content from the parsed FAA AME Guide
 * (ParsePDFChuckes/2_website_data). Pure: the same inputs always give the
 * same outputs, so a test can compare the committed files with a fresh run.
 *
 * Outputs
 *   src/data/guidance/parsed_condition_map.json   site ↔ parsed mapping (review this)
 *   src/data/guidance/parsed_conditions.json      content applied by applyParsedConditions()
 *   ParsePDFChuckes/6_docs/site_update_report.md  what changed, per condition
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  adaptGuidanceFiles,
  CONDITION_CERTIFICATION_NOTE,
  conditionSummary,
  firstSentence,
  isDisplayableConditionName,
  isDisplayableScenario,
  pathwayTitle,
  pickPrimaryDisposition,
  resolveCategory,
  slugify,
  type Condition,
  type Disposition,
  type DocumentItem,
  type NormalizedGuidanceFile,
  type ParsedConditionEntry,
  type ParsedConditionsFile,
  type SubCondition,
} from '@content/index';
import type { CaciWorksheet, FaaSource } from '@content/types';

// --------------------------------------------------------------------------
// Parser output types (subset of ParsePDFChuckes/2_website_data/types.ts)
// --------------------------------------------------------------------------
export interface ParsedRow {
  label: string | null;
  condition: string;
  condition_html: string;
  evaluation_data: string;
  evaluation_data_html: string;
  what_to_bring: string[];
  decisions: string[];
  disposition: string;
  disposition_html: string;
  pdf_page: number | null;
}

export interface ParsedCondition {
  id: string;
  name: string;
  subtitle: string | null;
  name_in_guide: string;
  category: { id: string; name: string; exam_item: string | null; part: string };
  applies_to: string;
  updated: string | null;
  order: number;
  rows: ParsedRow[];
  caci_worksheets: {
    title: string;
    updated: string | null;
    criteria: { ame_must_review: string; acceptable_certification_criteria: string }[];
    block_60_options: string[];
  }[];
  notes_html: string;
  aliases: string[];
  source: { section: string; section_title: string; pdf_pages: number[] | null; faa_url: string };
}

export interface ParsedMeta {
  source: string;
  source_url: string;
  guide_version: string | null;
}

export interface BuildInputs {
  siteConditions: Condition[];
  parsed: ParsedCondition[];
  meta: ParsedMeta;
}

export interface BuildOutputs {
  map: unknown;
  data: ParsedConditionsFile;
  report: string;
}

// --------------------------------------------------------------------------
// Rules (reviewed with the team on #56)
// --------------------------------------------------------------------------

/** First decision in a row → our Disposition. */
export const DECISION_TO_DISPOSITION: Record<string, Disposition> = {
  issue: 'issue',
  caci: 'issue',
  defer: 'deferral',
  faa_decision: 'deferral',
  more_info_needed: 'deferral',
  deny: 'denial',
  special_issuance: 'special-issuance',
  aasi: 'special-issuance',
  see_reference: 'unknown',
};

export function dispositionFromDecisions(decisions: string[] | null | undefined): Disposition {
  const first = decisions?.[0];
  return (first && DECISION_TO_DISPOSITION[first]) || 'unknown';
}

/** Parser category (guide exam item) → site category, used when the name gives no category. */
const PARSER_CATEGORY_TO_SITE: Record<string, string> = {
  'Abdomen and Viscera': 'Abdomen and Digestive',
  'Ear, Nose, and Throat (ENT)': 'Nose and Sinuses',
  'Ears, General': 'Ears',
  Eye: 'Eyes',
  'G-U System': 'Genitourinary',
  General: 'Other',
  'General Systemic': 'Endocrine',
  Heart: 'Cardiovascular',
  'Lungs and Chest': 'Lungs and Chest',
  Lymphatics: 'Blood and Lymphatics',
  'Mouth and Throat': 'Head, Face, Neck, and Scalp',
  Musculoskeletal: 'Musculoskeletal',
  Neurologic: 'Neurology',
  'Ocular Motility': 'Eyes',
  Ophthalmoscopic: 'Eyes',
  Psychiatric: 'Psychiatric',
  Pupils: 'Eyes',
  Sinuses: 'Nose and Sinuses',
  Skin: 'Skin',
  'Substances of Dependence/Abuse': 'Psychiatric',
  'Vascular System': 'Cardiovascular',
};

/** Reviewed overrides where neither the name nor the parser category gives the right answer. */
const CATEGORY_OVERRIDES: Record<string, string> = {
  'headache-or-migraine': 'Neurology', // name pattern "ocular" would say Eyes
  thrombocytopenia: 'Blood and Lymphatics', // "General Systemic" would say Endocrine
  'primary-hemochromatosis': 'Blood and Lymphatics',
  'breast-cancer': 'Other',
  'covid-19-infections': 'Other',
};

const LOW_CONFIDENCE = 0.9;
const FAA_GUIDE_TITLE = 'FAA Guide for Aviation Medical Examiners';
const NO_GUIDANCE = 'See the published FAA guidance for this pathway.';

// --------------------------------------------------------------------------
// Text helpers
// --------------------------------------------------------------------------
const clean = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim();

export function normName(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\(\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s*\)/g, ' ')
    .replace(/['’`]s\b/g, 's')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Name without any (parenthetical) parts, also unclosed "(…" at the end. */
export function baseName(s: string): string {
  return normName(s.replace(/\([^)]*\)?/g, ' '));
}

function parentheticals(s: string): string[] {
  return [...s.matchAll(/\(([^)]*)\)?/g)].map((m) => normName(m[1])).filter(Boolean);
}

const STOP = new Set([
  'and', 'or', 'of', 'the', 'with', 'a', 'an', 'aka', 'other', 'use', 's',
  'disease', 'disorder', 'conditions', 'condition', 'syndrome',
]);
function tokens(s: string): Set<string> {
  return new Set(normName(s).split(' ').filter((t) => t && !STOP.has(t)));
}
function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  return inter / Math.max(1, a.size + b.size - inter);
}
const contains = (hay: string, needle: string) => ` ${hay} `.includes(` ${needle} `);

// --------------------------------------------------------------------------
// Notes HTML sanitizer (allowlist)
// --------------------------------------------------------------------------
const ALLOWED_TAGS = new Set([
  'p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u', 'sup', 'sub',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'h4',
]);
const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

function escapeAttr(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Keep only allowlisted tags without attributes, except colspan/rowspan on
 * cells and absolute http(s) links (opened in a new tab). Everything else is
 * unwrapped (text kept); script/style blocks are removed entirely.
 */
export function sanitizeNotesHtml(input: string | null | undefined): string {
  let html = (input || '').replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  const linkStack: boolean[] = [];
  html = html.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (_m, close: string, rawTag: string, attrs: string) => {
    let tag = rawTag.toLowerCase();
    if (HEADING_TAGS.has(tag)) tag = 'h4';
    if (tag === 'a') {
      if (close) return linkStack.pop() ? '</a>' : '';
      const href = /\bhref\s*=\s*"([^"]*)"/i.exec(attrs)?.[1] ?? '';
      const ok = /^https?:\/\//i.test(href);
      linkStack.push(ok);
      return ok ? `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">` : '';
    }
    if (!ALLOWED_TAGS.has(tag)) return tag === 'figure' || tag === 'details' ? ' ' : '';
    if (close) return `</${tag}>`;
    if (tag === 'td' || tag === 'th') {
      const spans = [...attrs.matchAll(/\b(colspan|rowspan)\s*=\s*"(\d{1,2})"/gi)]
        .map((m) => ` ${m[1].toLowerCase()}="${m[2]}"`)
        .join('');
      return `<${tag}${spans}>`;
    }
    return tag === 'br' ? '<br>' : `<${tag}>`;
  });
  return html
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

// --------------------------------------------------------------------------
// Matching
// --------------------------------------------------------------------------
type Method = 'exact-name' | 'name-without-parentheses' | 'parenthetical' | 'contained-in-guide-heading' | 'token-subset' | 'alias';

interface Match {
  site: Condition;
  parsed: ParsedCondition;
  method: Method;
  confidence: number;
}

const METHOD_CONFIDENCE: Record<Method, number> = {
  'exact-name': 1,
  'name-without-parentheses': 0.95,
  parenthetical: 0.9,
  'contained-in-guide-heading': 0.75,
  'token-subset': 0.7,
  alias: 0.6,
};

function isOneGuide(c: Condition): boolean {
  return /oneguide/i.test(c.source);
}

export function parsedCategory(p: ParsedCondition): { category: string; rule: string } {
  if (CATEGORY_OVERRIDES[p.id]) return { category: CATEGORY_OVERRIDES[p.id], rule: 'override' };
  const byName = resolveCategory(p.name_in_guide, null, null);
  if (byName !== 'Other') return { category: byName, rule: 'name pattern' };
  const mapped = PARSER_CATEGORY_TO_SITE[p.category.name];
  if (mapped) return { category: mapped, rule: `guide category "${p.category.name}"` };
  return { category: 'Other', rule: 'fallback' };
}

function findMatch(site: Condition, parsed: ParsedCondition[]): Omit<Match, 'site'> | null {
  const siteNorm = normName(site.name);
  const siteBase = baseName(site.name);
  const keysOf = (p: ParsedCondition) => [
    normName(p.name_in_guide),
    normName(p.name),
    normName(`${p.name} ${p.subtitle || ''}`),
    normName(p.id.replace(/-/g, ' ')),
  ];
  const baseKeysOf = (p: ParsedCondition) => [baseName(p.name_in_guide), baseName(p.name)];

  const strategies: [Method, (p: ParsedCondition) => boolean][] = [
    ['exact-name', (p) => keysOf(p).includes(siteNorm)],
    ['name-without-parentheses', (p) => !!siteBase && (keysOf(p).includes(siteBase) || baseKeysOf(p).includes(siteBase) || baseKeysOf(p).includes(siteNorm))],
    ['parenthetical', (p) => parentheticals(site.name).some((x) => x.length > 3 && (keysOf(p).includes(x) || baseKeysOf(p).includes(x)))],
    ['contained-in-guide-heading', (p) => siteNorm.split(' ').length >= 2 && siteNorm.length >= 10 && contains(normName(p.name_in_guide), siteNorm)],
    ['token-subset', (p) => {
      const st = tokens(site.name);
      const pt = tokens(p.name_in_guide);
      return st.size >= 3 && [...st].every((t) => pt.has(t));
    }],
    ['alias', (p) => p.aliases.some((a) => normName(a) === siteNorm)],
  ];

  for (const [method, test] of strategies) {
    const hits = parsed.filter(test);
    if (!hits.length) continue;
    // tie-break: same category first, then the closest name length
    hits.sort((a, b) => {
      const ca = parsedCategory(a).category === site.category ? 0 : 1;
      const cb = parsedCategory(b).category === site.category ? 0 : 1;
      if (ca !== cb) return ca - cb;
      const la = Math.abs(normName(a.name_in_guide).length - siteNorm.length);
      const lb = Math.abs(normName(b.name_in_guide).length - siteNorm.length);
      return la - lb || a.id.localeCompare(b.id);
    });
    return { parsed: hits[0], method, confidence: METHOD_CONFIDENCE[method] };
  }
  return null;
}

function bestSuggestion(site: Condition, parsed: ParsedCondition[]) {
  const st = tokens(site.name);
  let best: { parsedId: string; score: number } | null = null;
  for (const p of parsed) {
    const score = Math.max(jaccard(st, tokens(p.name_in_guide)), ...p.aliases.map((a) => jaccard(st, tokens(a))));
    if (!best || score > best.score) best = { parsedId: p.id, score: Math.round(score * 100) / 100 };
  }
  return best && best.score > 0 ? best : null;
}

// --------------------------------------------------------------------------
// Rows → sub-conditions
// --------------------------------------------------------------------------
interface RowLog {
  conditionId: string;
  row: string;
  action: string;
}

const stripBullets = (s: string) => clean(s).replace(/^[-•·●o]\s+/, '').trim();

function rowName(r: ParsedRow, index: number): string {
  const text = stripBullets(r.condition);
  if (text) return pathwayTitle(text) || text;
  return r.label ? `Row ${r.label}` : `Situation ${index + 1}`;
}

function rowsToSubConditions(siteId: string, p: ParsedCondition, log: RowLog[]): SubCondition[] {
  const kept: ParsedRow[] = [];
  const seen = new Set<string>();
  p.rows.forEach((raw, i) => {
    const r: ParsedRow = { ...raw, what_to_bring: [...(raw.what_to_bring || [])], decisions: [...(raw.decisions || [])] };
    const where = `row ${i + 1}${r.label ? ` (${r.label})` : ''}, p. ${r.pdf_page ?? '?'}`;
    const key = [r.condition, r.evaluation_data, r.disposition].map(clean).join('|');
    if (seen.has(key)) {
      log.push({ conditionId: siteId, row: where, action: 'skipped: exact duplicate of an earlier row' });
      return;
    }
    seen.add(key);

    const text = stripBullets(r.condition);
    const prev = kept[kept.length - 1];
    // A row cut by a page break: no letter, and either the condition cell is empty or
    // continues mid-sentence ("impact/ penetrating injuries…"), or a lettered row
    // continues on the next page without its own disposition (Bell's Palsy C, p. 294).
    const continuesOnNextPage =
      !!prev?.label && !clean(r.disposition) && (r.pdf_page ?? 0) > (prev.pdf_page ?? 0);
    if (prev && !r.label && (!text || /^[a-z]/.test(text) || continuesOnNextPage)) {
      const join = (a: string, b: string, sep = ' ') => clean(b) ? (clean(a) ? `${a}${sep}${b}` : b) : a;
      prev.condition = join(prev.condition, r.condition);
      prev.condition_html = join(prev.condition_html, r.condition_html, '\n');
      prev.evaluation_data = join(prev.evaluation_data, r.evaluation_data);
      prev.evaluation_data_html = join(prev.evaluation_data_html, r.evaluation_data_html, '\n');
      prev.disposition = join(prev.disposition, r.disposition);
      prev.disposition_html = join(prev.disposition_html, r.disposition_html, '\n');
      for (const item of r.what_to_bring) if (!prev.what_to_bring.includes(item)) prev.what_to_bring.push(item);
      if (!prev.decisions.length) prev.decisions = r.decisions;
      log.push({ conditionId: siteId, row: where, action: 'merged into the row above (row split by a page break)' });
      return;
    }

    if (!clean(r.evaluation_data) && !clean(r.disposition)) {
      if (/^(also\s+see|see)\b/i.test(text)) {
        r.decisions = ['see_reference'];
        kept.push(r);
        log.push({ conditionId: siteId, row: where, action: 'kept as a "see also" pointer' });
      } else {
        log.push({ conditionId: siteId, row: where, action: 'skipped: header-only row (no evaluation data, no disposition)' });
      }
      return;
    }
    kept.push(r);
  });

  const names = new Map<string, number>();
  const subs = kept.map((r, i) => {
    let name = rowName(r, i);
    const n = (names.get(name) ?? 0) + 1;
    names.set(name, n);
    if (n > 1) name = `${name} (${r.label ? `row ${r.label}` : `situation ${i + 1}`})`;

    const id = slugify(`${siteId}-${r.label ? r.label.toLowerCase() : `r${i + 1}`}`) || `${siteId}-${i}`;
    const disposition = dispositionFromDecisions(r.decisions);
    const dispositionText = clean(r.disposition);
    const documents: DocumentItem[] = r.what_to_bring.map((item, k) => {
      const text = clean(item);
      const short = text.length <= 140;
      const doc: DocumentItem = {
        id: `${id}-doc-${k + 1}`,
        label: short ? text : firstSentence(text, 120),
        required: true,
        kind: 'DOCUMENT',
        role: 'bring_list',
      };
      if (!short) doc.description = text;
      return doc;
    });
    const evaluation = clean(r.evaluation_data);
    const sub: SubCondition = {
      id,
      name,
      disposition,
      summary: evaluation ? firstSentence(evaluation, 220) : '',
      certificationNote: dispositionText || NO_GUIDANCE,
      documents,
      ameReviewNotes: !documents.length && evaluation ? [evaluation] : [],
      medicationNotes: [],
      timeConstraints: [],
      certificateClasses: /^all class/i.test(p.applies_to) ? ['All'] : [],
      warnings: r.decisions[0] === 'see_reference' ? ['cross_reference'] : [],
      dispositionText,
    };
    if (r.pdf_page != null) sub.sourcePage = r.pdf_page;
    if (r.label) sub.label = r.label;
    return sub;
  });

  // Make sure ids are unique within the condition.
  const ids = new Set<string>();
  for (const s of subs) {
    let id = s.id;
    for (let k = 2; ids.has(id); k += 1) id = `${s.id}-${k}`;
    ids.add(id);
    if (id !== s.id) {
      s.id = id;
      s.documents.forEach((d, k) => (d.id = `${id}-doc-${k + 1}`));
    }
  }
  return subs;
}

function pageLabel(pages: number[]): string {
  if (!pages.length) return '';
  const lo = Math.min(...pages);
  const hi = Math.max(...pages);
  return lo === hi ? `p. ${lo}` : `pp. ${lo}–${hi}`;
}

function contentFields(siteId: string, p: ParsedCondition, meta: ParsedMeta, log: RowLog[]): Partial<Condition> {
  const subConditions = rowsToSubConditions(siteId, p, log);
  const pages = [...new Set([...(p.source.pdf_pages ?? []), ...p.rows.map((r) => r.pdf_page).filter((x): x is number => x != null)])].sort((a, b) => a - b);
  const faaSource: FaaSource = {
    guideTitle: FAA_GUIDE_TITLE,
    guideVersion: meta.guide_version,
    url: p.source.faa_url || meta.source_url,
    pdfPages: pages,
    sectionTitle: p.source.section_title,
    updated: p.updated,
  };
  const caciWorksheets: CaciWorksheet[] = p.caci_worksheets.map((w) => ({
    title: clean(w.title),
    updated: w.updated,
    criteria: w.criteria.map((c) => ({
      ameMustReview: clean(c.ame_must_review),
      acceptableCertificationCriteria: clean(c.acceptable_certification_criteria),
    })),
    block60Options: w.block_60_options.map(clean),
  }));
  const version = meta.guide_version ? ` (${meta.guide_version})` : '';
  const fields: Partial<Condition> = {
    disposition: pickPrimaryDisposition(subConditions),
    summary: conditionSummary(subConditions.length),
    certificationNote: CONDITION_CERTIFICATION_NOTE,
    subConditions,
    source: `FAA AME Guide${version}${pages.length ? `, ${pageLabel(pages)}` : ''}`,
    sourceSection: p.source.section_title,
    caciWorksheets,
    faaSource,
    aliases: [...p.aliases],
  };
  const notes = sanitizeNotesHtml(p.notes_html);
  if (notes) fields.notesHtml = notes;
  return fields;
}

// --------------------------------------------------------------------------
// Build
// --------------------------------------------------------------------------
export function buildParsedConditions({ siteConditions, parsed, meta }: BuildInputs): BuildOutputs {
  const parsedSorted = [...parsed].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const sites = [...siteConditions].sort((a, b) => a.id.localeCompare(b.id));
  const ame = sites.filter((c) => !isOneGuide(c));
  const oneGuide = sites.filter(isOneGuide);

  // 1) AME Guide site conditions claim parsed conditions (best match wins).
  const claimed = new Map<string, Match>();
  const conflicts: { siteId: string; parsedId: string; heldBy: string }[] = [];
  const candidates = ame
    .map((site) => {
      const m = findMatch(site, parsedSorted);
      return m ? { site, ...m } : null;
    })
    .filter((m): m is Match => m !== null)
    .sort((a, b) => b.confidence - a.confidence || a.site.id.localeCompare(b.site.id));
  const unmatchedSites: Condition[] = ame.filter((s) => !candidates.some((c) => c.site.id === s.id));
  for (const m of candidates) {
    const held = claimed.get(m.parsed.id);
    if (held) {
      conflicts.push({ siteId: m.site.id, parsedId: m.parsed.id, heldBy: held.site.id });
      unmatchedSites.push(m.site);
      continue;
    }
    claimed.set(m.parsed.id, m);
  }

  // 2) OneGuide conditions: a twin of an AME condition stays as-is; a OneGuide-only
  //    condition with a parsed match is updated like any other match.
  const duplicates: { siteId: string; siteName: string; parsedId: string; ameSiteId: string }[] = [];
  for (const site of oneGuide) {
    const m = findMatch(site, parsedSorted);
    if (!m) {
      unmatchedSites.push(site);
      continue;
    }
    const held = claimed.get(m.parsed.id);
    if (held) {
      duplicates.push({ siteId: site.id, siteName: site.name, parsedId: m.parsed.id, ameSiteId: held.site.id });
    } else {
      claimed.set(m.parsed.id, { site, ...m });
    }
  }

  // 3) Content for every parsed condition.
  const rowLog: RowLog[] = [];
  const siteIds = new Set(siteConditions.map((c) => c.id));
  const entries: ParsedConditionEntry[] = [];
  const added: { id: string; parsedId: string; name: string; category: string; rule: string; rows: number }[] = [];
  const nameChecks: string[] = [];
  for (const p of parsedSorted) {
    const m = claimed.get(p.id);
    if (m) {
      entries.push({ id: m.site.id, parsedId: p.id, status: 'matched', fields: contentFields(m.site.id, p, meta, rowLog) });
      continue;
    }
    let id = p.id;
    if (siteIds.has(id)) id = `${p.id}-faa-guide`;
    const { category, rule } = parsedCategory(p);
    const fields = contentFields(id, p, meta, rowLog);
    const condition: Condition = {
      id,
      name: clean(p.name),
      category,
      disposition: fields.disposition!,
      summary: fields.summary!,
      certificationNote: fields.certificationNote!,
      subConditions: fields.subConditions!,
      relatedMedicationIds: [],
      source: fields.source!,
      sourceSection: fields.sourceSection!,
      medicationNotes: [],
      caciWorksheets: fields.caciWorksheets,
      faaSource: fields.faaSource,
      aliases: fields.aliases,
      ...(fields.notesHtml ? { notesHtml: fields.notesHtml } : {}),
    };
    if (!isDisplayableConditionName(condition.name)) {
      nameChecks.push(`${id}: "${condition.name}" would fail isDisplayableConditionName (kept)`);
    }
    entries.push({ id, parsedId: p.id, status: 'added', fields: condition });
    added.push({ id, parsedId: p.id, name: condition.name, category, rule, rows: condition.subConditions.length });
  }
  entries.sort((a, b) => a.id.localeCompare(b.id));

  // 4) Filter checks: parsed rows do not go through the record filters, but
  //    report which ones those filters would have dropped.
  const filterChecks: string[] = [];
  for (const e of entries) {
    const subs = e.fields.subConditions ?? [];
    const keys = new Map<string, string>();
    for (const s of subs) {
      if (!isDisplayableScenario(s.name)) {
        filterChecks.push(`${e.id} — "${s.name}": isDisplayableScenario would drop it (kept)`);
      }
      const k = `${slugify(s.name)}|${s.disposition}`;
      if (keys.has(k)) filterChecks.push(`${e.id} — "${s.name}": dedupeSubConditions would merge it with "${keys.get(k)}" (kept)`);
      else keys.set(k, s.name);
    }
  }

  const matches = [...claimed.values()].sort((a, b) => a.site.id.localeCompare(b.site.id));
  const lowConfidence = matches.filter((m) => m.confidence < LOW_CONFIDENCE);
  unmatchedSites.sort((a, b) => a.id.localeCompare(b.id));
  duplicates.sort((a, b) => a.siteId.localeCompare(b.siteId));

  const counts = {
    siteConditionsBefore: siteConditions.length,
    parsedConditions: parsed.length,
    matched: matches.length,
    matchedLowConfidence: lowConfidence.length,
    matchedOneGuideOnly: matches.filter((m) => isOneGuide(m.site)).length,
    added: added.length,
    siteOnly: unmatchedSites.length,
    oneGuideDuplicatesLeftAsIs: duplicates.length,
    siteConditionsAfter: siteConditions.length + added.length,
  };

  const map = {
    version: 1,
    generatedBy: 'src/apps/web/scripts/build-parsed-conditions.ts',
    guideVersion: meta.guide_version,
    counts,
    matched: matches.map((m) => ({
      siteId: m.site.id,
      siteName: m.site.name,
      siteSource: isOneGuide(m.site) ? 'OneGuide_Neurology.pdf' : 'ame_guide.pdf',
      parsedId: m.parsed.id,
      parsedName: m.parsed.name_in_guide,
      method: m.method,
      confidence: m.confidence,
      lowConfidence: m.confidence < LOW_CONFIDENCE,
    })),
    lowConfidence: lowConfidence.map((m) => ({ siteId: m.site.id, parsedId: m.parsed.id, method: m.method, confidence: m.confidence })),
    added: added.map(({ id, parsedId, name, category, rule }) => ({ id, parsedId, name, category, categoryRule: rule })),
    siteOnly: unmatchedSites.map((s) => ({
      siteId: s.id,
      siteName: s.name,
      siteSource: isOneGuide(s) ? 'OneGuide_Neurology.pdf' : 'ame_guide.pdf',
      suggestion: bestSuggestion(s, parsedSorted),
    })),
    oneGuideDuplicatesLeftAsIs: duplicates,
    conflicts,
  };

  const data: ParsedConditionsFile = {
    version: 1,
    source: `${meta.source} (${meta.source_url})`,
    guideVersion: meta.guide_version,
    conditions: entries,
  };

  const report = renderReport({
    counts, matches, lowConfidence, added, unmatchedSites, duplicates, conflicts,
    siteConditions, entries, rowLog, filterChecks, nameChecks, meta,
  });
  return { map, data, report };
}

// --------------------------------------------------------------------------
// Report
// --------------------------------------------------------------------------
function compareSubs(before: SubCondition[], after: SubCondition[]) {
  const used = new Set<number>();
  const pairs: { old: SubCondition; next: SubCondition }[] = [];
  const addedRows: SubCondition[] = [];
  for (const next of after) {
    const nt = tokens(next.name);
    let best = -1;
    let bestScore = 0;
    before.forEach((old, i) => {
      if (used.has(i)) return;
      const o = normName(old.name);
      const n = normName(next.name);
      // same row, longer wording in the parsed guide ("Asymptomatic" → "Asymptomatic; Mild; OR …")
      const prefix = o.length >= 4 && (n.startsWith(o) || o.startsWith(n));
      const score = o === n || prefix ? 1 : jaccard(tokens(old.name), nt);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best >= 0 && bestScore >= 0.5) {
      used.add(best);
      pairs.push({ old: before[best], next });
    } else {
      addedRows.push(next);
    }
  }
  const removed = before.filter((_, i) => !used.has(i));
  return { pairs, addedRows, removed };
}

const md = (s: string) => s.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

function renderReport(r: {
  counts: Record<string, number>;
  matches: Match[];
  lowConfidence: Match[];
  added: { id: string; parsedId: string; name: string; category: string; rule: string; rows: number }[];
  unmatchedSites: Condition[];
  duplicates: { siteId: string; siteName: string; parsedId: string; ameSiteId: string }[];
  conflicts: { siteId: string; parsedId: string; heldBy: string }[];
  siteConditions: Condition[];
  entries: ParsedConditionEntry[];
  rowLog: RowLog[];
  filterChecks: string[];
  nameChecks: string[];
  meta: ParsedMeta;
}): string {
  const c = r.counts;
  const before = new Map(r.siteConditions.map((s) => [s.id, s]));
  const out: string[] = [
    '# Site update report — parsed AME Guide → website (#56)',
    '',
    `Generated by \`src/apps/web/scripts/build-parsed-conditions.ts\` from \`ParsePDFChuckes/2_website_data/\` ` +
      `(FAA guide version ${r.meta.guide_version ?? 'unknown'}). Do not edit by hand — re-run the script.`,
    '',
    '## Counts',
    '',
    '| | Count |',
    '|---|---|',
    `| Site conditions before | ${c.siteConditionsBefore} |`,
    `| Parsed conditions | ${c.parsedConditions} |`,
    `| Matched → updated with parsed data | ${c.matched} (${c.matchedOneGuideOnly} of them OneGuide-only) |`,
    `| …of which low-confidence | ${c.matchedLowConfidence} |`,
    `| Parsed-only → added | ${c.added} |`,
    `| Site-only (no parsed match, kept) | ${c.siteOnly} |`,
    `| OneGuide duplicates of an AME condition (left as-is) | ${c.oneGuideDuplicatesLeftAsIs} |`,
    `| Site conditions after | ${c.siteConditionsAfter} |`,
    '',
    '## Low-confidence matches',
    '',
    '| Site condition | Parsed condition | Method | Confidence |',
    '|---|---|---|---|',
    ...r.lowConfidence.map((m) => `| ${md(m.site.name)} (\`${m.site.id}\`) | ${md(m.parsed.name_in_guide)} (\`${m.parsed.id}\`) | ${m.method} | ${m.confidence} |`),
    '',
  ];
  if (r.conflicts.length) {
    out.push('## Conflicts (two site conditions matched one parsed condition)', '');
    out.push(...r.conflicts.map((x) => `- \`${x.siteId}\` → \`${x.parsedId}\`, already held by \`${x.heldBy}\` — left unchanged`), '');
  }

  out.push('## Site-only conditions (no parsed match — kept for review)', '');
  out.push(...(r.unmatchedSites.length
    ? r.unmatchedSites.map((s) => `- ${md(s.name)} (\`${s.id}\`, ${isOneGuide(s) ? 'OneGuide' : 'AME Guide'})`)
    : ['- none']), '');

  out.push('## OneGuide duplicates (left as-is)', '');
  out.push(...r.duplicates.map((d) => `- ${md(d.siteName)} (\`${d.siteId}\`) — same parsed condition \`${d.parsedId}\` as \`${d.ameSiteId}\``), '');

  out.push('## Added conditions', '', '| Condition | id | Category | Category rule | Rows |', '|---|---|---|---|---|');
  out.push(...r.added.map((a) => `| ${md(a.name)} | \`${a.id}\` | ${a.category} | ${a.rule} | ${a.rows} |`), '');

  out.push('## Row handling', '');
  out.push(...(r.rowLog.length ? r.rowLog.map((l) => `- \`${l.conditionId}\` ${l.row}: ${l.action}`) : ['- none']), '');

  out.push('## Adapter filter check', '',
    'Parsed rows are turned into pathways directly, so `dedupeNormalizedRecords`, `isDisplayableConditionName` and ' +
    '`isDisplayableScenario` cannot drop them. These are the rows those filters would have dropped or merged:', '');
  out.push(...([...r.filterChecks, ...r.nameChecks].length ? [...r.filterChecks, ...r.nameChecks].map((x) => `- ${x}`) : ['- none']), '');

  out.push('## Changes per updated condition', '');
  for (const e of r.entries.filter((x) => x.status === 'matched')) {
    const old = before.get(e.id);
    if (!old) continue;
    const next = e.fields.subConditions ?? [];
    const { pairs, addedRows, removed } = compareSubs(old.subConditions, next);
    const changed = pairs.filter((p) => p.old.disposition !== p.next.disposition);
    out.push(`### ${md(old.name)} (\`${e.id}\` ← \`${e.parsedId}\`)`, '');
    out.push(`- Pathways: ${old.subConditions.length} → ${next.length}`);
    if (old.disposition !== e.fields.disposition) out.push(`- Overall result: ${old.disposition} → ${e.fields.disposition}`);
    for (const a of addedRows) out.push(`- Added: ${md(a.name)} (${a.disposition})`);
    for (const x of removed) out.push(`- Removed: ${md(x.name)} (${x.disposition})`);
    for (const p of changed) out.push(`- Result changed: ${md(p.next.name)}: ${p.old.disposition} → ${p.next.disposition}`);
    const caci = e.fields.caciWorksheets?.length ?? 0;
    if (caci) out.push(`- CACI worksheets: ${caci}`);
    if (!addedRows.length && !removed.length && !changed.length && old.disposition === e.fields.disposition) {
      out.push('- Same pathways and results; wording, checklists and source pages now from the parsed guide');
    }
    out.push('');
  }
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

// --------------------------------------------------------------------------
// File loading (shared by the script and the tests)
// --------------------------------------------------------------------------
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
export const PATHS = {
  guidanceDir: path.join(REPO_ROOT, 'src/data/guidance'),
  parsedDir: path.join(REPO_ROOT, 'ParsePDFChuckes/2_website_data'),
  map: path.join(REPO_ROOT, 'src/data/guidance/parsed_condition_map.json'),
  data: path.join(REPO_ROOT, 'src/data/guidance/parsed_conditions.json'),
  report: path.join(REPO_ROOT, 'ParsePDFChuckes/6_docs/site_update_report.md'),
};

const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;

export function loadBuildInputs(): BuildInputs {
  const guidanceFiles = readdirSync(PATHS.guidanceDir)
    .filter((f) => f.endsWith('.normalized.json'))
    .sort()
    .map((f) => readJson<NormalizedGuidanceFile>(path.join(PATHS.guidanceDir, f)));
  const conditionsDir = path.join(PATHS.parsedDir, 'conditions');
  const parsed = readdirSync(conditionsDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => readJson<ParsedCondition>(path.join(conditionsDir, f)));
  return {
    siteConditions: adaptGuidanceFiles(guidanceFiles),
    parsed,
    meta: readJson<ParsedMeta>(path.join(PATHS.parsedDir, 'meta.json')),
  };
}

/** Exact file contents the script writes (also used by the freshness test). */
export function serializeOutputs(out: BuildOutputs): { map: string; data: string; report: string } {
  return {
    map: `${JSON.stringify(out.map, null, 1)}\n`,
    data: `${JSON.stringify(out.data, null, 1)}\n`,
    report: out.report,
  };
}
