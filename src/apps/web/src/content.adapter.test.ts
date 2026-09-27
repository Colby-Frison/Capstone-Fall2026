import { describe, expect, it } from 'vitest';
import {
  adaptGuidanceFile,
  adaptGuidanceFiles,
  dedupeNormalizedRecords,
  humanizeCategory,
  humanizeConditionName,
  mapDisposition,
  mergeGuidanceFiles,
  pathwayTitle,
  requirementsToAmeReviewNotes,
  requirementsToDocuments,
  searchAdaptedConditions,
  type NormalizedGuidanceFile,
  type NormalizedRecord,
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
      'Controlled allergies',
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
    expect(condition.category).toBe('Nose and Sinuses');
    expect(condition.disposition).toBe('deferral');
    expect(condition.summary).toContain('2 situations in the FAA guide');
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

  it('merges guidance files and de-duplicates identical pathways', () => {
    const duplicate: NormalizedRecord = {
      ...fixture.records[0],
      record_id: 'other-doc-allergies-a-p1',
      action: 'Annotate this in Block 60. Extra detail that makes this richer.',
      source: {
        ...fixture.records[0].source,
        document: 'OneGuide_Nose.pdf',
        pdf_page: 1,
      },
    };
    const neurology: NormalizedGuidanceFile = {
      schema_version: '1.0',
      parser_version: '0.1.0',
      source_document: 'OneGuide_Neurology.pdf',
      pages_processed: 1,
      warnings: [],
      summary: { records_extracted: 1 },
      records: [
        {
          record_id: 'oneguide-neurology-als-p5',
          condition: 'ALS - Amyotrophic Lateral Sclerosis',
          category: 'Neurology',
          scenario: 'A. All classes Any history',
          subcondition: 'A. All classes Any history',
          disposition: 'DEFER',
          raw_disposition: 'DEFER',
          action: '',
          requirements: [
            {
              kind: 'DOCUMENT',
              text: 'Submit a current neurological evaluation.',
            },
          ],
          medication_notes: [],
          time_constraints: [],
          warnings: [],
          certificate_classes: [],
          raw_text: 'A. All classes DEFER',
          source: {
            document: 'OneGuide_Neurology.pdf',
            pdf_page: 5,
            printed_page: null,
            section: 'Neurology',
          },
        },
      ],
    };
    const merged = mergeGuidanceFiles([
      fixture,
      { ...fixture, source_document: 'OneGuide_Nose.pdf', records: [duplicate] },
      neurology,
    ]);
    expect(dedupeNormalizedRecords(merged.records)).toHaveLength(3);
    expect(merged.records).toHaveLength(3);
    expect(merged.source_document).toContain('ame_guide.pdf');
    expect(merged.source_document).toContain('OneGuide_Neurology.pdf');

    const conditions = adaptGuidanceFiles([
      fixture,
      { ...fixture, source_document: 'OneGuide_Nose.pdf', records: [duplicate] },
      neurology,
    ]);
    expect(conditions).toHaveLength(2);
    const allergies = conditions.find((c) =>
      c.name.toLowerCase().includes('allerg'),
    );
    expect(allergies?.subConditions).toHaveLength(2);
    expect(
      allergies?.subConditions.find((s) => s.disposition === 'issue')
        ?.certificationNote,
    ).toContain('Extra detail');
  });

  it('maps role/required into bring-list docs and AME review notes', () => {
    const record: NormalizedRecord = {
      ...fixture.records[1],
      certificate_classes: ['All'],
      warnings: ['cross_reference'],
      requirements: [
        {
          kind: 'DOCUMENT',
          text: 'Clinical Progress Note',
          role: 'bring_list',
          required: true,
        },
        {
          kind: 'TEST',
          text: 'MRI if already performed',
          role: 'bring_list',
          required: false,
        },
        {
          kind: 'EVALUATION',
          text: 'The AME must review a neurological evaluation.',
          role: 'ame_review',
          required: false,
        },
      ],
      action: 'See CAD protocol',
      disposition: 'UNKNOWN',
      raw_disposition: 'See CAD protocol',
    };
    const docs = requirementsToDocuments(record);
    expect(docs).toHaveLength(2);
    expect(docs.find((d) => d.label.includes('Clinical'))?.required).toBe(true);
    expect(docs.find((d) => d.label.includes('MRI'))?.required).toBe(false);
    expect(docs.every((d) => d.kind)).toBeTruthy();

    const notes = requirementsToAmeReviewNotes(record);
    expect(notes.some((n) => n.includes('AME must'))).toBe(true);

    const conditions = adaptGuidanceFile({
      ...fixture,
      records: [record],
    });
    expect(conditions).toHaveLength(1);
    const sub = conditions[0].subConditions[0];
    expect(sub.certificateClasses).toEqual(['All']);
    expect(sub.warnings).toContain('cross_reference');
    expect(sub.ameReviewNotes?.length).toBeGreaterThan(0);
    expect(sub.documents.some((d) => !d.required)).toBe(true);
  });

  it('splits a leukemia-style checklist and keeps examiner review off the bring list', () => {
    const record: NormalizedRecord = {
      ...fixture.records[1],
      requirements: [
        {
          kind: 'DOCUMENT',
          role: 'bring_list',
          required: true,
          text:
            'A current, detailed Clinical Progress Note generated from a clinic visit with the treating oncologist. It must specifically include Initial staging; Treatments used; How long the condition has been stable or in remission; Recurrence(s); Risk of recurrence; Medication list: Dates started and stopped',
        },
        {
          kind: 'DOCUMENT',
          role: 'bring_list',
          required: false,
          text: 'Operative notes and discharge summary (if applicable)',
        },
        {
          kind: 'TEST',
          role: 'bring_list',
          required: false,
          text: 'Copies of lab including pathology reports if already performed',
        },
        {
          kind: 'EVALUATION',
          role: 'ame_review',
          required: false,
          text: 'The AME must review an oncology evaluation performed within the previous 12 months.',
        },
      ],
    };
    const docs = requirementsToDocuments(record);
    expect(docs.length).toBeGreaterThanOrEqual(8);
    expect(docs.every((doc) => doc.role === 'bring_list')).toBe(true);
    expect(docs.some((doc) => /AME must/i.test(doc.label))).toBe(false);
    expect(docs.some((doc) => doc.label.includes('Initial staging'))).toBe(true);
    expect(docs.find((doc) => doc.label.includes('Operative notes'))?.required).toBe(
      false,
    );
    expect(docs.find((doc) => doc.label.includes('pathology'))?.kind).toBe('TEST');
    const notes = requirementsToAmeReviewNotes(record);
    expect(notes).toEqual([
      'The AME must review an oncology evaluation performed within the previous 12 months.',
    ]);
  });

  it('filters section-label conditions from browseable catalog', () => {
    const neurologyLabel: NormalizedGuidanceFile = {
      ...fixture,
      records: [
        {
          ...fixture.records[0],
          record_id: 'ame-guide-neurology-misfile',
          condition: 'Neurology',
          category: 'Neurology',
          scenario: 'All classes',
        },
      ],
    };
    expect(adaptGuidanceFile(neurologyLabel)).toHaveLength(0);
  });
});
