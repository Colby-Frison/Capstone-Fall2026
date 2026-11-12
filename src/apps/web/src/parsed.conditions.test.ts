/**
 * #56 — the parsed AME Guide (ParsePDFChuckes/2_website_data) is the source of
 * truth for condition content. These tests guard the merge.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { conditions, getConditionById } from './data/conditions';
import {
  buildParsedConditions,
  dispositionFromDecisions,
  loadBuildInputs,
  PATHS,
  sanitizeNotesHtml,
  serializeOutputs,
  type ParsedCondition,
} from '../scripts/lib/parsedConditionsBuild';
import mapFile from '@guidance/parsed_condition_map.json';
import dataFile from '@guidance/parsed_conditions.json';
import nihMap from '@guidance/nih_condition_map.json';

const inputs = loadBuildInputs();
const parsedById = new Map<string, ParsedCondition>(inputs.parsed.map((p) => [p.id, p]));
const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

type Map = typeof mapFile;
const map = mapFile as Map;

describe('parsed AME Guide → site conditions', () => {
  it('committed data matches a fresh run of the script', () => {
    const fresh = serializeOutputs(buildParsedConditions(inputs));
    expect(readFileSync(PATHS.map, 'utf8')).toBe(fresh.map);
    expect(readFileSync(PATHS.data, 'utf8')).toBe(fresh.data);
    expect(readFileSync(PATHS.report, 'utf8')).toBe(fresh.report);
  });

  it('every parsed condition appears on the site', () => {
    const siteIdByParsed = new Map(dataFile.conditions.map((e) => [e.parsedId, e.id]));
    for (const p of inputs.parsed) {
      const siteId = siteIdByParsed.get(p.id);
      expect(siteId, `parsed ${p.id} has no site entry`).toBeTruthy();
      expect(getConditionById(siteId!), `site condition ${siteId} missing`).toBeTruthy();
    }
    expect(conditions).toHaveLength(map.counts.siteConditionsAfter);
  });

  it('every matched condition has exactly its parsed rows', () => {
    const entries = dataFile.conditions.filter((e) => e.status === 'matched');
    expect(entries).toHaveLength(map.counts.matched);
    for (const e of entries) {
      const site = getConditionById(e.id)!;
      expect(site.subConditions.map((s) => s.id)).toEqual(e.fields.subConditions!.map((s) => s.id));
      // every parsed row's FAA disposition text is on one of the pathways
      const texts = site.subConditions.map((s) => s.dispositionText ?? '');
      for (const row of parsedById.get(e.parsedId)!.rows) {
        const d = clean(row.disposition);
        if (d) expect(texts.some((t) => t.includes(d)), `${e.id}: "${d.slice(0, 60)}"`).toBe(true);
      }
    }
  });

  it('keeps the existing id, name, category, NIH data and form-link key of matched conditions', () => {
    const before = new Map(inputs.siteConditions.map((c) => [c.id, c]));
    for (const m of map.matched) {
      const old = before.get(m.siteId)!;
      const now = getConditionById(m.siteId)!;
      expect(now.name).toBe(old.name);
      expect(now.category).toBe(old.category);
      const nihEntry = (nihMap.entries as Record<string, { nihKeyId?: string }>)[m.siteId];
      if (nihEntry?.nihKeyId) expect(now.nih?.nihKeyId).toBe(nihEntry.nihKeyId);
    }
    const epilepsy = getConditionById('epilepsy-seizure-disorder')!;
    expect(epilepsy.nih?.mappingStatus).not.toBe('unmapped');
    expect(epilepsy.nih?.infoLinks.length).toBeGreaterThan(0);
  });

  it('leaves OneGuide duplicates and site-only conditions in place, unchanged', () => {
    const before = new Map(inputs.siteConditions.map((c) => [c.id, c]));
    for (const id of [
      ...map.oneGuideDuplicatesLeftAsIs.map((d) => d.siteId),
      ...map.siteOnly.map((s) => s.siteId),
    ]) {
      const now = getConditionById(id);
      expect(now, id).toBeTruthy();
      expect(now!.subConditions).toEqual(before.get(id)!.subConditions);
    }
  });

  it('uses the first decision of each row for the disposition', () => {
    expect(dispositionFromDecisions(['issue', 'defer'])).toBe('issue');
    expect(dispositionFromDecisions(['caci', 'defer'])).toBe('issue');
    expect(dispositionFromDecisions(['defer'])).toBe('deferral');
    expect(dispositionFromDecisions(['faa_decision'])).toBe('deferral');
    expect(dispositionFromDecisions(['more_info_needed'])).toBe('deferral');
    expect(dispositionFromDecisions(['deny', 'issue'])).toBe('denial');
    expect(dispositionFromDecisions(['special_issuance'])).toBe('special-issuance');
    expect(dispositionFromDecisions(['aasi'])).toBe('special-issuance');
    expect(dispositionFromDecisions(['see_reference'])).toBe('unknown');
    expect(dispositionFromDecisions([])).toBe('unknown');
  });

  it('does not re-split what-to-bring items (one parsed item = one checklist entry)', () => {
    let withSemicolon = 0;
    for (const e of dataFile.conditions) {
      const site = getConditionById(e.id)!;
      const docs = site.subConditions.flatMap((s) => s.documents.map((d) => d.description ?? d.label));
      for (const row of parsedById.get(e.parsedId)!.rows) {
        for (const item of row.what_to_bring) {
          if (item.includes(';')) withSemicolon += 1;
          expect(docs, `${e.id}: ${item.slice(0, 60)}`).toContain(clean(item));
        }
      }
    }
    expect(withSemicolon).toBeGreaterThan(0);
  });

  it('shows the recovered conditions with their own rows', () => {
    expect(getConditionById('pectus-excavatum')!.subConditions.some((s) => /GOLD/i.test(s.name))).toBe(false);
    expect(getConditionById('chronic-obstructive-pulmonary-disease-copd-emphysema-chronic-bronchitis')!.subConditions.length).toBeGreaterThan(0);
    expect(getConditionById('barrett-s-esophagus')!.faaSource?.pdfPages.length).toBeGreaterThan(0);
    expect(getConditionById('liver-transplant')!.caciWorksheets?.length).toBeGreaterThan(0);
  });

  it('adds new conditions to search and browse categories', async () => {
    const { searchConditions, categories } = await import('./data/conditions');
    const hypertension = getConditionById('hypertension-htn')!;
    expect(hypertension.subConditions.length).toBeGreaterThan(0);
    expect(categories).toContain(hypertension.category);
    expect(searchConditions('hypertension').map((c) => c.id)).toContain('hypertension-htn');
  });
});

describe('sanitizeNotesHtml', () => {
  it('keeps allowlisted tags and absolute links, drops everything else', () => {
    const out = sanitizeNotesHtml(
      '<p class="x" onclick="evil()">Hi <strong>there</strong></p><script>alert(1)</script>' +
        '<a href="other-section.html">internal</a> <a href="https://www.faa.gov/x">FAA</a>' +
        '<img src="images/a.png"><table><tr><td colspan="2" style="x">c</td></tr></table><h2>Head</h2>',
    );
    expect(out).toBe(
      '<p>Hi <strong>there</strong></p>internal <a href="https://www.faa.gov/x" target="_blank" rel="noopener noreferrer">FAA</a>' +
        '<table><tr><td colspan="2">c</td></tr></table><h4>Head</h4>',
    );
  });
});
