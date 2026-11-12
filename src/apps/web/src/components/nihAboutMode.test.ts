import { describe, expect, it } from 'vitest';
import type { NihConditionIdentity } from '../data/types';
import { resolveNihAboutMode } from './nihAboutMode';

function identity(
  partial: Partial<NihConditionIdentity> & Pick<NihConditionIdentity, 'mappingStatus'>,
): NihConditionIdentity {
  return {
    synonyms: [],
    icd10: [],
    infoLinks: [],
    matchConfidence: 0,
    ...partial,
  };
}

describe('resolveNihAboutMode', () => {
  it('treats missing identity as unmapped', () => {
    expect(resolveNihAboutMode(undefined)).toBe('unmapped');
  });

  it('treats explicit unmapped as unmapped even if fields exist', () => {
    expect(
      resolveNihAboutMode(
        identity({
          mappingStatus: 'unmapped',
          consumerName: 'Should not show',
          infoLinks: [{ url: 'https://example.com', title: 'x' }],
        }),
      ),
    ).toBe('unmapped');
  });

  it('shows mapped identities with displayable fields', () => {
    expect(
      resolveNihAboutMode(
        identity({
          mappingStatus: 'mapped',
          consumerName: 'Valvular heart disease',
          infoLinks: [{ url: 'https://example.com/vhd', title: 'VHD' }],
          matchConfidence: 1,
        }),
      ),
    ).toBe('mapped');
  });

  it('shows low-confidence identities when they carry fields', () => {
    expect(
      resolveNihAboutMode(
        identity({
          mappingStatus: 'low-confidence',
          primaryName: 'Hyperparathyroidism',
          matchConfidence: 0.7,
        }),
      ),
    ).toBe('mapped');
  });

  it('falls back to unmapped when mapped status has no displayable content', () => {
    expect(
      resolveNihAboutMode(
        identity({
          mappingStatus: 'mapped',
          matchConfidence: 0.9,
        }),
      ),
    ).toBe('unmapped');
  });
});
