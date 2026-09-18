import { describe, expect, it } from 'vitest';
import {
  adaptGuidanceFile,
  humanizeCategory,
  humanizeConditionName,
  mapDisposition,
  pathwayTitle,
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
          kind: 'EVALUATION',
          text: 'If the AME can determine: • The condition is under control; • Current medications are acceptable.',
        },
      ],
      medication_notes: ['Warn for sedating antihistamine medications.'],
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
          text: 'Submit the following for FAA review: • A current, detailed Clinical Progress Note. • Current medications, dosage, and side effects.',
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

  it('humanizes names and pathway titles without inventing content', () => {
    expect(humanizeConditionName('ANOSMIA*')).toBe('Anosmia');
    expect(humanizeCategory('NOSE')).toBe('Nose');
    expect(pathwayTitle('A. Controlled allergies • Extra detail')).toBe(
      'A. Controlled allergies',
    );
  });

  it('expands bring-list requirements and skips AME inquiry prose', () => {
    const docs = requirementsToDocuments(fixture.records[1]);
    expect(docs.length).toBeGreaterThanOrEqual(2);
    expect(docs.some((d) => d.label.includes('Clinical Progress Note'))).toBe(
      true,
    );
    expect(requirementsToDocuments(fixture.records[0])).toHaveLength(0);
  });

  it('groups records into one condition with readable pathways', () => {
    const conditions = adaptGuidanceFile(fixture);
    expect(conditions).toHaveLength(1);
    const condition = conditions[0];
    expect(condition.name.toLowerCase()).toContain('allerg');
    expect(condition.category).toBe('Nose');
    expect(condition.disposition).toBe('deferral');
    expect(condition.summary).toContain('2 published certification pathways');
    expect(condition.subConditions).toHaveLength(2);
    expect(condition.subConditions[0].disposition).toBe('issue');
    expect(condition.subConditions[1].documents.length).toBeGreaterThan(0);
    expect(condition.source).toContain('ame_guide.pdf');
    expect(condition.medicationNotes?.[0]).toContain('antihistamine');
  });

  it('supports search across adapted conditions', () => {
    const conditions = adaptGuidanceFile(fixture);
    expect(searchAdaptedConditions(conditions, 'steroid')).toHaveLength(1);
    expect(searchAdaptedConditions(conditions, 'zzz')).toHaveLength(0);
  });
});
