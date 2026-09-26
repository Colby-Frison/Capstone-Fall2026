import { describe, expect, it } from 'vitest';
import { checklistCounts, groupSubmitItems } from './groupSubmitItems';
import type { DocumentItem } from '../data/types';

const documents: DocumentItem[] = [
  { id: 'note', label: 'Clinical progress note', required: true, kind: 'DOCUMENT' },
  { id: 'mri', label: 'MRI if already performed', required: false, kind: 'TEST' },
  { id: 'labs', label: 'Laboratory reports', required: true, kind: 'TEST' },
];

describe('groupSubmitItems', () => {
  it('omits empty kinds and keeps optional items out of the required list', () => {
    const groups = groupSubmitItems(documents);
    expect(groups.map((group) => group.key)).toEqual(['document', 'test']);
    expect(groups.find((group) => group.key === 'document')?.required).toHaveLength(1);
    const tests = groups.find((group) => group.key === 'test');
    expect(tests?.required.map((item) => item.id)).toEqual(['labs']);
    expect(tests?.optional.map((item) => item.id)).toEqual(['mri']);
    expect(groupSubmitItems([])).toEqual([]);
  });

  it('counts checks only for the current pathway', () => {
    expect(checklistCounts(documents, new Set(['note', 'from-another-pathway']))).toEqual({
      total: 3,
      checked: 1,
      required: 2,
      optional: 1,
    });
  });
});
