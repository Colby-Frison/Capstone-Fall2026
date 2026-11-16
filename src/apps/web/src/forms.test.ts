/*
Unit tests for the FAA form registry, form matching and form search (issue #43).
*/

import { describe, expect, it } from 'vitest';
import {
  conditionsUsingForm,
  formForDocument,
  formIdsForRecord,
  formIdsInText,
  formsForCondition,
  getFormById,
  listForms,
  normalizeFormText,
  searchCatalog,
  type NormalizedRecord,
} from '@content/index';
import catalog from '@guidance/forms_catalog.json';
import legacyFormLinks from '@guidance/form_links.json';
import { conditions } from './data/conditions';
import { searchCatalogResults } from './data/search';

function record(overrides: Partial<NormalizedRecord>): NormalizedRecord {
  return {
    record_id: 'test-record',
    condition: 'TEST CONDITION',
    category: null,
    scenario: 'A. Test',
    subcondition: 'A. Test',
    disposition: 'DEFER',
    raw_disposition: 'DEFER',
    action: '',
    requirements: [],
    medication_notes: [],
    time_constraints: [],
    warnings: [],
    certificate_classes: [],
    raw_text: '',
    source: { document: 'ame_guide.pdf', pdf_page: 1, printed_page: null, section: null },
    ...overrides,
  };
}

function findCondition(name: string) {
  const match = conditions.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (!match) throw new Error(`Condition not found: ${name}`);
  return match;
}

const registryIds = new Set(catalog.forms.map((f) => f.id));

describe('form registry', () => {
  const forms = catalog.forms;

  it('lists each form once', () => {
    expect(new Set(forms.map((f) => f.id)).size).toBe(forms.length);
    expect(new Set(forms.map((f) => f.url)).size).toBe(forms.length);
    expect(listForms()).toHaveLength(forms.length);
  });

  it.each(forms.map((f) => [f.id, f] as const))('%s is complete', (_id, form) => {
    const url = new URL(form.url);
    expect(url.protocol).toBe('https:');
    expect(url.hostname).toBe('www.faa.gov');
    expect(url.pathname).toMatch(/\.pdf$/i);
    expect(form.title.trim()).not.toBe('');
    expect(form.summary.trim().length).toBeGreaterThan(20);
    expect(form.completedBy.trim()).not.toBe('');
    expect(form.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(form.match.length).toBeGreaterThan(0);
    // Phrases are compared against normalised text, so they must already be normalised.
    for (const phrase of form.match) expect(normalizeFormText(phrase)).toBe(phrase);
  });

  it('assigns condition-level forms only to conditions that exist', () => {
    for (const form of forms) {
      for (const name of (form as { conditions?: string[] }).conditions ?? []) {
        expect(findCondition(name).formIds, `${form.id} on ${name}`).toContain(form.id);
      }
    }
  });

  it('lists the general progress-note guide last', () => {
    expect(listForms().at(-1)?.type).toBe('progress_note');
  });
});

describe('form matching', () => {
  it('normalises dashes and the spacing PDF extraction adds', () => {
    expect(normalizeFormText('Eyes – Refractive   Surgery Status Summary')).toBe(
      'eyes-refractive surgery status summary',
    );
    expect(normalizeFormText('(AFib)/A- Flutter Status Summary')).toBe(
      '(afib)/a-flutter status summary',
    );
  });

  it('finds a form named in a requirement or the row text', () => {
    expect(
      formIdsForRecord(
        record({ requirements: [{ kind: 'DOCUMENT', text: '2. Pacemaker Status Summary' }] }),
      ),
    ).toEqual(['pacemaker-status-summary']);
    expect(
      formIdsForRecord(record({ raw_text: 'See Eyes – Refractive Surgery Status Summary' })),
    ).toEqual(['refractive-surgery-status-summary']);
  });

  it('returns nothing when the row names no form', () => {
    expect(formIdsForRecord(record({ raw_text: 'No evaluations or follow-up needed.' }))).toEqual([]);
  });

  it('puts a named form ahead of the progress-note guide', () => {
    const text = 'Submit the COPD Status Summary and a current, detailed Clinical Progress Note';
    expect(formIdsInText(text)).toEqual(['copd-status-summary', 'clinical-progress-note-guide']);
    expect(formForDocument(text)?.id).toBe('copd-status-summary');
  });

  it('applies condition-scoped phrases only inside that condition', () => {
    const text = 'If applicant has two DBS devices, complete a Status Summary for each device.';
    expect(formIdsInText(text, 'DEEP BRAIN STIMULATOR')).toContain('dbs-status-summary');
    expect(formIdsInText('complete a Status Summary for each device', 'SKIN CANCER')).toEqual([]);
  });
});

describe('forms on real guidance data', () => {
  it('uses only form ids that exist in the registry', () => {
    for (const condition of conditions) {
      for (const id of condition.formIds ?? []) {
        expect(registryIds.has(id), `${condition.name}: ${id}`).toBe(true);
      }
      for (const sub of condition.subConditions) {
        for (const id of sub.formIds ?? []) {
          expect(registryIds.has(id), `${condition.name} / ${sub.name}: ${id}`).toBe(true);
          expect(condition.formIds).toContain(id);
        }
      }
    }
  });

  it('gives checklist items that name a form its id and https url', () => {
    const linked = conditions
      .flatMap((c) => c.subConditions)
      .flatMap((sub) => sub.documents)
      .filter((doc) => doc.formId || doc.url);
    expect(linked.length).toBeGreaterThan(0);
    for (const doc of linked) {
      expect(doc.url).toBe(getFormById(doc.formId)?.url);
      expect(doc.url).toMatch(/^https:\/\/www\.faa\.gov\//);
    }
  });

  it('links the pacemaker checklist item to the Pacemaker Status Summary', () => {
    const pacemaker = findCondition('Pacemaker');
    expect(pacemaker.formIds).toContain('pacemaker-status-summary');
    const linkedDocs = pacemaker.subConditions
      .flatMap((sub) => sub.documents)
      .filter((doc) => doc.formId === 'pacemaker-status-summary');
    expect(linkedDocs.length).toBeGreaterThan(0);
    expect(linkedDocs[0].url).toBe('https://www.faa.gov/ame_guide/media/Pacemaker_Status_Summary.pdf');
  });

  it('shows forms per situation rather than per condition', () => {
    const withAndWithout = conditions.filter(
      (c) =>
        c.subConditions.some((s) => (s.formIds ?? []).length > 0) &&
        c.subConditions.some((s) => (s.formIds ?? []).length === 0),
    );
    expect(withAndWithout.length).toBeGreaterThan(0);
  });

  it('leaves conditions that name no form without any', () => {
    expect(conditions.some((c) => formsForCondition(c).length === 0)).toBe(true);
  });

  it('lists the conditions that use a form', () => {
    const names = conditionsUsingForm('pacemaker-status-summary', conditions).map((c) => c.name);
    expect(names).toContain(findCondition('Pacemaker').name);
    expect(conditionsUsingForm('path-status-summary', conditions).map((c) => c.id)).toEqual([
      findCondition('Anxiety, Depression, and Related Conditions').id,
    ]);
  });

  // The old per-condition file from PR #24. Every link it offered must still be offered,
  // apart from Form 8500-7, which now points at the FAA's unversioned file name.
  it('still offers every form the legacy form_links.json offered', () => {
    const replaced: Record<string, string> = {
      'https://www.faa.gov/documentLibrary/media/Form/FAA_Form_8500-7_Exp_10.31.24.pdf':
        'https://www.faa.gov/documentLibrary/media/Form/FAA_Form_8500-7.pdf',
    };
    const missing: string[] = [];
    for (const [name, entries] of Object.entries(
      legacyFormLinks as Record<string, { 'Form Type': string; Url: string }[]>,
    )) {
      const urls = new Set(formsForCondition(findCondition(name)).map((f) => f.url));
      for (const entry of entries) {
        const expected = replaced[entry.Url] ?? entry.Url;
        if (!urls.has(expected)) missing.push(`${name}: ${entry['Form Type']}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('form search', () => {
  it('finds a form by the name the guide uses for it', () => {
    const hits = searchCatalogResults('COPD status summary');
    expect(hits[0]).toMatchObject({ type: 'form', id: 'copd-status-summary' });
  });

  it('finds a form by its number', () => {
    const forms = searchCatalogResults('8500-7').filter((hit) => hit.type === 'form');
    expect(forms.map((hit) => hit.id)).toContain('faa-form-8500-7');
  });

  it('keeps the condition ahead of its form when searching the condition name', () => {
    const hits = searchCatalogResults('pacemaker');
    expect(hits[0]).toMatchObject({ type: 'condition', id: findCondition('Pacemaker').id });
    expect(hits.some((hit) => hit.type === 'form' && hit.id === 'pacemaker-status-summary')).toBe(true);
  });

  it('returns no form hits when forms are not passed in', () => {
    const hits = searchCatalog('COPD status summary', { conditions });
    expect(hits.every((hit) => hit.type !== 'form')).toBe(true);
  });
});
