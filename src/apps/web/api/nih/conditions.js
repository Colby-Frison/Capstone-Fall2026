/**
 * Vercel Serverless Function — GET /api/nih/conditions?q=
 * Root Directory is src/apps/web, so this file maps to that production path.
 */
import {
  createTtlCache,
  fetchConditionSuggestions,
  sanitizeQuery,
} from '../_lib/clinicalTables.mjs';

const cache = createTtlCache(60_000);

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const q = sanitizeQuery(String(req.query?.q ?? ''));
  if (!q) {
    res.status(400).json({ query: '', suggestions: [], error: 'empty_query' });
    return;
  }

  const cacheKey = q.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached) {
    res.status(200).json(cached);
    return;
  }

  const result = await fetchConditionSuggestions(q);
  // Soft-fail: always 200 with suggestions (possibly empty) so the combobox stays usable.
  const body = {
    query: result.query,
    suggestions: result.suggestions,
    error: result.error === 'empty_query' ? null : result.error,
  };
  if (!body.error) {
    cache.set(cacheKey, body);
  }
  res.status(200).json(body);
}
