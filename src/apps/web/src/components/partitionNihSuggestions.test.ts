import { describe, expect, it } from 'vitest';
import type { NihSuggestion } from '../data/nih';
import { partitionNihSuggestions } from './partitionNihSuggestions';

function suggestion(
  partial: Partial<NihSuggestion> & Pick<NihSuggestion, 'keyId' | 'label'>,
): NihSuggestion {
  return {
    primaryName: partial.label,
    synonyms: [],
    icd10: [],
    infoLinks: [],
    matchedConditionIds: [],
    ...partial,
  };
}

describe('partitionNihSuggestions', () => {
  it('lists catalog matches before NIH-only rows', () => {
    const partitioned = partitionNihSuggestions([
      suggestion({ keyId: '1', label: 'Unrelated NIH', matchedConditionIds: [] }),
      suggestion({
        keyId: '2',
        label: 'Acoustic neuroma',
        matchedConditionIds: ['acoustic-neuroma'],
      }),
      suggestion({ keyId: '3', label: 'Also unmatched', matchedConditionIds: [] }),
    ]);

    expect(partitioned.inCatalog.map((s) => s.keyId)).toEqual(['2']);
    expect(partitioned.nihOnly.map((s) => s.keyId)).toEqual(['1', '3']);
    expect(partitioned.ordered.map((s) => s.keyId)).toEqual(['2', '1', '3']);
  });

  it('dedupes catalog rows that resolve to the same condition id', () => {
    const partitioned = partitionNihSuggestions([
      suggestion({
        keyId: 'a',
        label: 'Acoustic neuroma',
        matchedConditionIds: ['acoustic-neuroma'],
      }),
      suggestion({
        keyId: 'b',
        label: 'Vestibular schwannoma',
        matchedConditionIds: ['acoustic-neuroma'],
      }),
    ]);

    expect(partitioned.inCatalog).toHaveLength(1);
    expect(partitioned.inCatalog[0]?.keyId).toBe('a');
    expect(partitioned.nihOnly).toHaveLength(0);
  });
});
