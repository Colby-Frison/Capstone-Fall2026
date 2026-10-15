import { describe, expect, it } from 'vitest';
import {
  listCanonicalCategories,
  resolveCategory,
  slugify,
  stripOrderingMarker,
} from '@content/index';
import { getConditionForms } from '@content/adapt';

describe('resolveCategory', () => {
  it('uses the exact condition_map entry first', () => {
    expect(resolveCategory('ALLERGIES', 'Eyes')).toBe('Nose and Sinuses');
  });

  it('matches condition_map keys case-insensitively', () => {
    expect(resolveCategory('allergies')).toBe('Nose and Sinuses');
  });

  it('maps ITEM N headings through item_map', () => {
    expect(resolveCategory('Some condition', 'ITEM 31. Eyes')).toBe('Eyes');
  });

  it('maps extracted PDF labels through alias_map', () => {
    expect(resolveCategory('Unmapped thing', 'inner ear')).toBe('Ears');
  });

  it('falls back to the source section when no category is given', () => {
    expect(resolveCategory('Unmapped thing', null, 'Neurology')).toBe('Neurology');
  });

  it('accepts an extracted label that is already canonical', () => {
    expect(resolveCategory('Unmapped thing', 'Psychiatric')).toBe('Psychiatric');
  });

  it('matches condition text against the pattern rules', () => {
    expect(resolveCategory('Atrial Fibrillation')).toBe('Cardiovascular');
  });

  it('returns Other when nothing matches', () => {
    expect(resolveCategory('zzz qqq', 'not a label')).toBe('Other');
    expect(resolveCategory(null)).toBe('Other');
  });
});

describe('listCanonicalCategories', () => {
  it('returns a copy of the dictionary categories ending with Other', () => {
    const first = listCanonicalCategories();
    expect(first).toContain('Neurology');
    expect(first.at(-1)).toBe('Other');
    first.push('Mutated');
    expect(listCanonicalCategories()).not.toContain('Mutated');
  });
});

describe('getConditionForms', () => {
  it('finds forms regardless of case', () => {
    const upper = getConditionForms('NOSE');
    expect(upper.length).toBeGreaterThan(0);
    expect(getConditionForms('nose')).toEqual(upper);
    expect(upper[0].Url).toMatch(/^https:\/\//);
  });

  it('returns an empty list for unknown conditions', () => {
    expect(getConditionForms('Not a real condition')).toEqual([]);
  });
});

describe('text helpers', () => {
  it('slugify collapses punctuation and trims to 80 chars', () => {
    expect(slugify('  Hay Fever (Allergies)!  ')).toBe('hay-fever-allergies');
    expect(slugify('a'.repeat(100))).toHaveLength(80);
  });

  it('stripOrderingMarker removes stacked ordering prefixes', () => {
    expect(stripOrderingMarker('A. 1) • Clinical note')).toBe('Clinical note');
    expect(stripOrderingMarker('Plain text')).toBe('Plain text');
  });
});
