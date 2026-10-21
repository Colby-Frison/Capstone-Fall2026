import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parseClinicalTablesResponse,
  parseInfoLinks,
  sanitizeQuery,
  fetchConditionSuggestions,
  createTtlCache,
} from './clinicalTables.mjs';

describe('sanitizeQuery', () => {
  it('trims and caps length', () => {
    assert.equal(sanitizeQuery('  migraine  '), 'migraine');
    assert.equal(sanitizeQuery('x'.repeat(100)).length, 80);
  });
});

describe('parseInfoLinks', () => {
  it('parses direct and nested pairs', () => {
    assert.deepEqual(
      parseInfoLinks([['https://example.com/a', 'Alpha']]),
      [{ url: 'https://example.com/a', title: 'Alpha' }],
    );
    assert.deepEqual(
      parseInfoLinks([[['https://example.com/b', 'Beta']]]),
      [{ url: 'https://example.com/b', title: 'Beta' }],
    );
  });
});

describe('parseClinicalTablesResponse', () => {
  it('maps codes, display fields, and extras', () => {
    const payload = [
      2,
      ['4458', '99'],
      {
        synonyms: [['belly ache'], ['gut pain']],
        icd10cm_codes: ['K52.9', 'K52.1'],
        info_link_data: [
          [['https://medlineplus.gov/gastroenteritis.html', 'Gastroenteritis']],
          [],
        ],
      },
      [
        ['Gastroenteritis', 'Gastroenteritis NOS'],
        ['Colitis', 'Colitis'],
      ],
    ];

    const result = parseClinicalTablesResponse(payload, 'gastro');
    assert.equal(result.query, 'gastro');
    assert.equal(result.suggestions.length, 2);
    assert.equal(result.suggestions[0].keyId, '4458');
    assert.equal(result.suggestions[0].label, 'Gastroenteritis');
    assert.equal(result.suggestions[0].primaryName, 'Gastroenteritis NOS');
    assert.deepEqual(result.suggestions[0].synonyms, ['belly ache']);
    assert.deepEqual(result.suggestions[0].icd10, ['K52.9']);
    assert.equal(result.suggestions[0].infoLinks[0].title, 'Gastroenteritis');
    assert.deepEqual(result.suggestions[0].matchedConditionIds, []);
  });

  it('returns empty for malformed payloads', () => {
    assert.deepEqual(parseClinicalTablesResponse(null, 'x').suggestions, []);
    assert.deepEqual(parseClinicalTablesResponse([], 'x').suggestions, []);
  });
});

describe('fetchConditionSuggestions', () => {
  it('returns empty_query for blank input', async () => {
    const result = await fetchConditionSuggestions('   ');
    assert.equal(result.error, 'empty_query');
    assert.deepEqual(result.suggestions, []);
  });

  it('maps a successful upstream fixture', async () => {
    const fixture = [
      1,
      ['1'],
      { synonyms: [[]], icd10cm_codes: ['G43.9'], info_link_data: [[]] },
      [['Migraine', 'Migraine']],
    ];
    const result = await fetchConditionSuggestions('migr', {
      fetchImpl: async () => ({
        ok: true,
        json: async () => fixture,
      }),
    });
    assert.equal(result.error, null);
    assert.equal(result.suggestions[0].label, 'Migraine');
    assert.deepEqual(result.suggestions[0].icd10, ['G43.9']);
  });

  it('soft-fails on upstream timeout/error', async () => {
    const result = await fetchConditionSuggestions('migr', {
      fetchImpl: async () => {
        throw new Error('network');
      },
    });
    assert.equal(result.error, 'upstream');
    assert.deepEqual(result.suggestions, []);
  });
});

describe('createTtlCache', () => {
  it('stores and expires entries', async () => {
    const cache = createTtlCache(20);
    cache.set('a', { ok: true });
    assert.deepEqual(cache.get('a'), { ok: true });
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(cache.get('a'), undefined);
  });
});
