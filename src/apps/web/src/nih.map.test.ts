import { describe, expect, it } from 'vitest';
import {
  adaptGuidanceFile,
  applyNihConditionMap,
  faaNihNameScore,
  resolveNihIdentityForCondition,
  type NormalizedGuidanceFile,
} from '@content/index';

const fixture: NormalizedGuidanceFile = {
  schema_version: '1.0',
  parser_version: '0.1.0',
  source_document: 'ame_guide.pdf',
  pages_processed: 1,
  warnings: [],
  summary: { records_extracted: 1 },
  records: [
    {
      record_id: 'ame-guide-migraine-a-p1',
      condition: 'MIGRAINE',
      category: 'NEUROLOGIC',
      scenario: 'A. Controlled migraine',
      subcondition: 'A. Controlled migraine',
      disposition: 'ISSUE',
      raw_disposition: 'ISSUE',
      action: 'Annotate.',
      requirements: [],
      medication_notes: [],
      time_constraints: [],
      warnings: [],
      certificate_classes: [],
      raw_text: 'MIGRAINE ISSUE',
      source: {
        document: 'ame_guide.pdf',
        pdf_page: 1,
        printed_page: '1',
        section: 'NEUROLOGIC',
      },
    },
  ],
};

describe('FAA↔NIH mapping', () => {
  it('scores exact, containment, and token-overlap name pairs', () => {
    expect(faaNihNameScore('Migraine', 'Migraine')).toBe(1);
    expect(faaNihNameScore('Allergies (Hay fever)', 'Hay fever')).toBeGreaterThan(0.3);
    expect(
      faaNihNameScore(
        'Attention Deficit Hyperactivity Disorder ADHD',
        'Attention deficit hyperactivity disorder',
      ),
    ).toBeGreaterThan(0.7);
    expect(faaNihNameScore('Migraine', 'Unrelated condition')).toBe(0);
  });

  it('resolves a mapped identity from NIH candidates', () => {
    const identity = resolveNihIdentityForCondition('Migraine', [
      {
        keyId: '42',
        label: 'Migraine',
        primaryName: 'Migraine',
        synonyms: ['Sick headache'],
        icd10: ['G43.909'],
        infoLinks: [{ url: 'https://example.com/migraine', title: 'Migraine' }],
      },
    ]);
    expect(identity.mappingStatus).toBe('mapped');
    expect(identity.nihKeyId).toBe('42');
    expect(identity.synonyms).toContain('Sick headache');
    expect(identity.icd10).toContain('G43.909');
    expect(identity.matchConfidence).toBe(1);
  });

  it('marks unmatched when no viable NIH candidate exists', () => {
    const identity = resolveNihIdentityForCondition('Completely Made Up FAA Heading XYZ', [
      {
        keyId: '1',
        label: 'Diabetes mellitus',
        synonyms: [],
        icd10: [],
        infoLinks: [],
      },
    ]);
    expect(identity.mappingStatus).toBe('unmapped');
    expect(identity.nihKeyId).toBeUndefined();
  });

  it('applies sidecar entries onto adapted conditions', () => {
    const adapted = adaptGuidanceFile(fixture);
    expect(adapted.length).toBeGreaterThanOrEqual(1);
    const id = adapted[0].id;
    const withMap = applyNihConditionMap(adapted, {
      version: 1,
      entries: {
        [id]: {
          mappingStatus: 'mapped',
          nihKeyId: '99',
          consumerName: 'Migraine',
          synonyms: ['Sick headache'],
          icd10: ['G43.909'],
          infoLinks: [],
          matchConfidence: 1,
        },
      },
    });
    expect(withMap[0].nih?.mappingStatus).toBe('mapped');
    expect(withMap[0].nih?.nihKeyId).toBe('99');
    expect(withMap[0].disposition).toBe('issue');

    const missing = applyNihConditionMap(adapted, { version: 1, entries: {} });
    expect(missing[0].nih?.mappingStatus).toBe('unmapped');
  });
});
