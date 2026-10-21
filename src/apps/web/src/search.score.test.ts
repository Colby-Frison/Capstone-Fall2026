import { describe, expect, it } from 'vitest';
import {
  applyNihConditionMap,
  expandedTermsFromNihSuggestions,
  searchCatalog,
  type Condition,
  type Medication,
} from '@content/index';

function stubCondition(partial: Partial<Condition> & Pick<Condition, 'id' | 'name'>): Condition {
  return {
    category: 'General',
    disposition: 'unknown',
    summary: 'Summary text',
    certificationNote: 'Guide note',
    subConditions: [],
    relatedMedicationIds: [],
    source: 'test',
    sourceSection: 'General',
    ...partial,
  };
}

function stubMedication(partial: Partial<Medication> & Pick<Medication, 'id' | 'name'>): Medication {
  return {
    category: 'Other',
    flightStatusNote: 'Flight note',
    certificationImpact: 'Impact note',
    relatedConditionIds: [],
    ameDiscussion: 'Discuss',
    source: 'test',
    sourceSection: 'Meds',
    ...partial,
  };
}

describe('scored synonym-aware search', () => {
  const migraine = stubCondition({
    id: 'migraine',
    name: 'Migraine',
    summary: 'Headache pathway summary',
  });
  const allergies = stubCondition({
    id: 'allergies',
    name: 'Allergies or Anaphylaxis',
    subConditions: [
      {
        id: 'allergies-a',
        name: 'Controlled by acceptable medications',
        disposition: 'issue',
        summary: 'Includes steroid treatment notes',
        certificationNote: '',
        documents: [{ id: 'd1', label: 'Clinical Progress Note', required: true }],
      },
    ],
  });
  const withSynonym = applyNihConditionMap(
    [
      stubCondition({
        id: 'adhd',
        name: 'Attention Deficit Hyperactivity Disorder',
      }),
    ],
    {
      version: 1,
      entries: {
        adhd: {
          mappingStatus: 'mapped',
          nihKeyId: '1',
          consumerName: 'ADHD',
          synonyms: ['Attention deficit disorder'],
          icd10: [],
          infoLinks: [],
          matchConfidence: 1,
        },
      },
    },
  )[0];

  const sertraline = stubMedication({
    id: 'sertraline',
    name: 'Sertraline',
    genericName: 'Sertraline HCl',
    flightStatusNote: 'SSRI special issuance policy',
  });

  it('ranks exact name above weak body hits', () => {
    const bodyOnly = stubCondition({
      id: 'other',
      name: 'Unrelated Condition',
      summary: 'Mentions migraine only in passing',
    });
    const hits = searchCatalog('migraine', {
      conditions: [bodyOnly, migraine],
      medications: [],
    });
    expect(hits.map((h) => h.id)).toEqual(['migraine', 'other']);
    expect(hits[0].score).toBeGreaterThan(hits[1].score);
  });

  it('matches sub-condition and document fields', () => {
    const hits = searchCatalog('steroid', {
      conditions: [allergies, migraine],
      medications: [],
    });
    expect(hits.some((h) => h.id === 'allergies')).toBe(true);
  });

  it('uses stored NIH synonyms and query expansion terms', () => {
    const byStored = searchCatalog('attention deficit disorder', {
      conditions: [withSynonym, migraine],
      medications: [],
    });
    expect(byStored[0]?.id).toBe('adhd');

    const expanded = expandedTermsFromNihSuggestions([
      { label: 'ADHD', synonyms: ['Attention deficit hyperactivity disorder'] },
    ]);
    const byExpand = searchCatalog('hyperfocus', {
      conditions: [withSynonym],
      medications: [],
      expandedTerms: expanded,
    });
    expect(byExpand.some((h) => h.id === 'adhd')).toBe(true);
  });

  it('returns a unified ranked list with medications', () => {
    const hits = searchCatalog('sertraline', {
      conditions: [migraine],
      medications: [sertraline],
    });
    expect(hits[0]).toMatchObject({ type: 'medication', id: 'sertraline' });
  });

  it('breaks score ties stably by type then id', () => {
    const a = stubCondition({ id: 'aaa', name: 'Shared Token Condition' });
    const b = stubCondition({ id: 'bbb', name: 'Shared Token Condition Two' });
    // Both get substring scores; order should be deterministic
    const hits = searchCatalog('shared token', {
      conditions: [b, a],
      medications: [],
    });
    expect(hits.map((h) => h.id)).toEqual(['aaa', 'bbb']);
  });
});
