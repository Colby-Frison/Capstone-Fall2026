import { describe, expect, it } from 'vitest';
import {
  adaptGuidanceFile,
  enrichSuggestionsWithMatches,
  matchConditionsByNames,
  matchTotality,
  type Condition,
  type NormalizedGuidanceFile,
  type NihSuggestion,
} from '@content/index';

const fixture: NormalizedGuidanceFile = {
  schema_version: '1.0',
  parser_version: '0.1.0',
  source_document: 'ame_guide.pdf',
  pages_processed: 1,
  warnings: [],
  summary: { records_extracted: 3 },
  records: [
    {
      record_id: 'ame-guide-migraine-a',
      condition: 'MIGRAINE AND CHRONIC HEADACHE',
      category: 'Neurology',
      scenario: 'A. Stable migraine',
      subcondition: 'A. Stable migraine',
      disposition: 'ISSUE',
      raw_disposition: 'ISSUE',
      action: 'Issue.',
      requirements: [],
      medication_notes: [],
      time_constraints: [],
      warnings: [],
      certificate_classes: [],
      raw_text: 'Migraine ISSUE',
      source: {
        document: 'ame_guide.pdf',
        pdf_page: 100,
        printed_page: '100',
        section: 'Neurology',
      },
    },
    {
      record_id: 'ame-guide-depression-a',
      condition: 'DEPRESSION',
      category: 'Psychiatric',
      scenario: 'A. Resolved',
      subcondition: 'A. Resolved',
      disposition: 'DEFER',
      raw_disposition: 'DEFER',
      action: 'Defer.',
      requirements: [],
      medication_notes: [],
      time_constraints: [],
      warnings: [],
      certificate_classes: [],
      raw_text: 'Depression DEFER',
      source: {
        document: 'ame_guide.pdf',
        pdf_page: 200,
        printed_page: '200',
        section: 'Psychiatric',
      },
    },
    {
      record_id: 'ame-guide-headache-only',
      condition: 'HEADACHE',
      category: 'Neurology',
      scenario: 'A. Simple',
      subcondition: 'A. Simple',
      disposition: 'ISSUE',
      raw_disposition: 'ISSUE',
      action: 'Issue.',
      requirements: [],
      medication_notes: [],
      time_constraints: [],
      warnings: [],
      certificate_classes: [],
      raw_text: 'Headache ISSUE',
      source: {
        document: 'ame_guide.pdf',
        pdf_page: 101,
        printed_page: '101',
        section: 'Neurology',
      },
    },
  ],
};

describe('matchTotality', () => {
  it('returns 1 for exact matches', () => {
    expect(matchTotality('Depression', 'depression')).toBe(1);
  });

  it('returns needle/name ratio when needle is a substring of the condition', () => {
    const totality = matchTotality('Migraine and Chronic Headache', 'migraine');
    expect(totality).toBeGreaterThan(0);
    expect(totality).toBeLessThan(1);
  });

  it('returns 0 when the search is not a substring of the condition name', () => {
    expect(matchTotality('Depression', 'anxiety')).toBe(0);
    // Reverse containment is not enough — search must be inside the condition name.
    expect(matchTotality('Pain', 'chronic pain disorder')).toBe(0);
  });
});

describe('matchConditionsByNames', () => {
  const conditions: Condition[] = adaptGuidanceFile(fixture);

  it('prefers an exact condition name over a longer title', () => {
    const ids = matchConditionsByNames(conditions, ['Headache']);
    expect(ids[0]).toMatch(/^headache/);
  });

  it('matches when the search is a substring of the condition name', () => {
    const ids = matchConditionsByNames(conditions, ['Migraine']);
    expect(ids[0]).toMatch(/migraine/);
  });

  it('ranks higher totality first when multiple conditions contain the needle', () => {
    // "headache" is an exact match for HEADACHE (totality 1) and a substring of
    // MIGRAINE AND CHRONIC HEADACHE (lower totality). Exact / higher totality wins.
    const ids = matchConditionsByNames(conditions, ['headache']);
    expect(ids[0]).toMatch(/^headache/);
    expect(ids.some((id) => id.includes('migraine'))).toBe(true);
  });

  it('returns empty for unrelated terms', () => {
    expect(matchConditionsByNames(conditions, ['zzzz-no-such-disease'])).toEqual([]);
  });

  it('enriches NIH suggestions with matched ids', () => {
    const suggestions: NihSuggestion[] = [
      {
        keyId: '1',
        label: 'Depression',
        synonyms: ['major depressive disorder'],
        icd10: ['F32.9'],
        infoLinks: [],
        matchedConditionIds: [],
      },
    ];
    const enriched = enrichSuggestionsWithMatches(conditions, suggestions);
    expect(enriched[0].matchedConditionIds[0]).toMatch(/depression/);
  });
});
