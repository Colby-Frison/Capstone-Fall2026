/**
 * NIH Clinical Tables Conditions v3 — fetch + normalize to app DTO.
 * @see https://clinicaltables.nlm.nih.gov/apidoc/conditions/v3/doc.html
 */

export const CLINICAL_TABLES_URL =
  'https://clinicaltables.nlm.nih.gov/api/conditions/v3/search';

export const MAX_QUERY_LENGTH = 80;
export const DEFAULT_MAX_LIST = 8;
export const UPSTREAM_TIMEOUT_MS = 3000;

/**
 * @param {string} raw
 * @returns {string}
 */
export function sanitizeQuery(raw) {
  return String(raw ?? '')
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function asStringList(value) {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === 'string') return [item];
        if (Array.isArray(item)) return item.filter((x) => typeof x === 'string');
        return [];
      })
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * info_link_data: array of [url, title] pairs (may be nested).
 * @param {unknown} value
 * @returns {{ url: string, title: string }[]}
 */
export function parseInfoLinks(value) {
  if (!Array.isArray(value)) return [];
  const links = [];
  for (const entry of value) {
    if (!Array.isArray(entry)) continue;
    // Direct [url, title]
    if (typeof entry[0] === 'string' && entry[0].startsWith('http')) {
      links.push({
        url: entry[0],
        title: typeof entry[1] === 'string' ? entry[1] : entry[0],
      });
      continue;
    }
    // Nested list of pairs
    for (const inner of entry) {
      if (!Array.isArray(inner) || typeof inner[0] !== 'string') continue;
      if (!inner[0].startsWith('http')) continue;
      links.push({
        url: inner[0],
        title: typeof inner[1] === 'string' ? inner[1] : inner[0],
      });
    }
  }
  return links;
}

/**
 * Parse a Clinical Tables JSON array response into suggestions.
 * Output format: [total, codes[], extraHash|null, displayRows[][]]
 *
 * @param {unknown} payload
 * @param {string} query
 * @returns {{ query: string, suggestions: object[], error: null }}
 */
export function parseClinicalTablesResponse(payload, query) {
  if (!Array.isArray(payload) || payload.length < 4) {
    return { query, suggestions: [], error: null };
  }

  const codes = Array.isArray(payload[1]) ? payload[1] : [];
  const extra = payload[2] && typeof payload[2] === 'object' ? payload[2] : {};
  const displayRows = Array.isArray(payload[3]) ? payload[3] : [];

  const synonymsByIndex = Array.isArray(extra.synonyms) ? extra.synonyms : [];
  const icdByIndex = Array.isArray(extra.icd10cm_codes) ? extra.icd10cm_codes : [];
  const linksByIndex = Array.isArray(extra.info_link_data) ? extra.info_link_data : [];

  const suggestions = codes.map((code, index) => {
    const row = Array.isArray(displayRows[index]) ? displayRows[index] : [];
    const consumerName = typeof row[0] === 'string' ? row[0].trim() : '';
    const primaryName = typeof row[1] === 'string' ? row[1].trim() : '';
    const label = consumerName || primaryName || String(code);

    return {
      keyId: String(code),
      label,
      primaryName: primaryName || undefined,
      synonyms: asStringList(synonymsByIndex[index]),
      icd10: asStringList(icdByIndex[index]),
      infoLinks: parseInfoLinks(linksByIndex[index]),
      matchedConditionIds: [],
    };
  });

  return { query, suggestions, error: null };
}

/**
 * @param {string} query
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number, maxList?: number }} [options]
 */
export async function fetchConditionSuggestions(query, options = {}) {
  const q = sanitizeQuery(query);
  if (!q) {
    return { query: '', suggestions: [], error: 'empty_query' };
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? UPSTREAM_TIMEOUT_MS;
  const maxList = options.maxList ?? DEFAULT_MAX_LIST;

  const url = new URL(CLINICAL_TABLES_URL);
  url.searchParams.set('terms', q);
  url.searchParams.set('maxList', String(maxList));
  url.searchParams.set('df', 'consumer_name,primary_name');
  url.searchParams.set('ef', 'synonyms,icd10cm_codes,info_link_data');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      return { query: q, suggestions: [], error: 'upstream' };
    }
    const payload = await response.json();
    return parseClinicalTablesResponse(payload, q);
  } catch {
    return { query: q, suggestions: [], error: 'upstream' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Simple in-memory TTL cache.
 */
export function createTtlCache(ttlMs = 60_000) {
  /** @type {Map<string, { expires: number, value: unknown }>} */
  const store = new Map();

  return {
    get(key) {
      const hit = store.get(key);
      if (!hit) return undefined;
      if (Date.now() > hit.expires) {
        store.delete(key);
        return undefined;
      }
      return hit.value;
    },
    set(key, value) {
      store.set(key, { expires: Date.now() + ttlMs, value });
    },
    clear() {
      store.clear();
    },
  };
}
