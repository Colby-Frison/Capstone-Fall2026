import { describe, expect, it } from 'vitest';
import {
  adaptGuidanceFile,
  mapDisposition,
  requirementsToDocuments,
  searchAdaptedConditions,
  type NormalizedGuidanceFile,
} from '@content/index';

const fixture: NormalizedGuidanceFile = {
  schema_version: '1.0',
  parser_version: '0.1.0',
  source_document: 'ame_guide.pdf',
  pages_processed: 2,
  warnings: [],
  summary: { records_extracted: 2 },
  records: [
    {
      record_id: 'ame-guide-allergies-a-p65',
      condition: 'ALLERGIES or ANAPHYLAXIS; (Hay fever)',
      category: 'NOSE',
      scenario: 'A. Allergies controlled by acceptable medications',
      subcondition: 'A. Allergies controlled by acceptable medications',
      disposition: 'ISSUE',
      raw_disposition: 'ISSUE',
      action: 'Annotate this in Block 60.',
      requirements: [
        {
          kind: 'MEDICATION',
          text: 'Current medications are acceptable.',
        },
      ],
      medication_notes: ['See antihistamine guidance.'],
      time_constraints: [],
      warnings: [],
      certificate_classes: [],
      raw_text: 'A. Allergies controlled ISSUE',
      source: {
        document: 'ame_guide.pdf',
        pdf_page: 65,
        printed_page: '65',
        section: 'NOSE',
      },
    },
    {
      record_id: 'ame-guide-allergies-b-p65',
      condition: 'ALLERGIES or ANAPHYLAXIS; (Hay fever)',
      category: 'NOSE',
      scenario: 'B. Allergies indicated by steroid treatment',
      subcondition: 'B. Allergies indicated by steroid treatment',
      disposition: 'DEFER',
      raw_disposition: 'DEFER',
      action: 'Submit the information to the FAA.',
      requirements: [
        {
          kind: 'DOCUMENT',
          text: 'A current, detailed Clinical Progress Note.',
        },
      ],
      medication_notes: [],
      time_constraints: ['no more than 90 days'],
      warnings: [],
      certificate_classes: [],
      raw_text: 'B. Allergies DEFER',
      source: {
        document: 'ame_guide.pdf',
        pdf_page: 65,
        printed_page: '65',
        section: 'NOSE',
      },
    },
  ],
};

describe('content adapter', () => {
  it('maps reviewed disposition enums', () => {
    expect(mapDisposition('ISSUE')).toBe('issue');
    expect(mapDisposition('DEFER')).toBe('deferral');
    expect(mapDisposition('SPECIAL_ISSUANCE')).toBe('special-issuance');
    expect(mapDisposition('nonsense')).toBe('unknown');
  });

  it('turns requirements into required document checklist items', () => {
    const docs = requirementsToDocuments(fixture.records[1]);
    expect(docs).toHaveLength(1);
    expect(docs[0].required).toBe(true);
    expect(docs[0].label).toContain('Clinical Progress Note');
    expect(docs[0].kind).toBe('DOCUMENT');
  });

  it('groups records into one condition with sub-conditions', () => {
    const conditions = adaptGuidanceFile(fixture);
    expect(conditions).toHaveLength(1);
    const condition = conditions[0];
    expect(condition.name).toContain('ALLERGIES');
    expect(condition.category).toBe('NOSE');
    expect(condition.disposition).toBe('deferral');
    expect(condition.subConditions).toHaveLength(2);
    expect(condition.subConditions[0].disposition).toBe('issue');
    expect(condition.subConditions[1].disposition).toBe('deferral');
    expect(condition.subConditions[1].documents[0].label).toContain(
      'Clinical Progress Note',
    );
    expect(condition.source).toContain('ame_guide.pdf');
    expect(condition.medicationNotes?.[0]).toContain('antihistamine');
  });

  it('supports search across adapted conditions', () => {
    const conditions = adaptGuidanceFile(fixture);
    expect(searchAdaptedConditions(conditions, 'steroid')).toHaveLength(1);
    expect(searchAdaptedConditions(conditions, 'zzz')).toHaveLength(0);
  });
});
