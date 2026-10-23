#!/usr/bin/env node
/**
 * Thin BFF for NIH Clinical Tables condition autocomplete.
 * GET /api/nih/conditions?q=<terms>
 */

import http from 'node:http';
import {
  createTtlCache,
  fetchConditionSuggestions,
  sanitizeQuery,
} from './clinicalTables.mjs';

const HOST = process.env.NIH_API_HOST || '127.0.0.1';
const PORT = Number.parseInt(process.env.NIH_API_PORT || '8787', 10);
const cache = createTtlCache(60_000);

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(payload);
}

function notFound(res) {
  sendJson(res, 404, { error: 'not_found' });
}

async function handleNihConditions(req, res, url) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'method_not_allowed' });
    return;
  }

  const q = sanitizeQuery(url.searchParams.get('q') || '');
  if (!q) {
    sendJson(res, 400, { query: '', suggestions: [], error: 'empty_query' });
    return;
  }

  const cacheKey = q.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached) {
    sendJson(res, 200, cached);
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
  sendJson(res, 200, body);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
    if (url.pathname === '/api/nih/conditions' || url.pathname === '/health') {
      if (url.pathname === '/health') {
        sendJson(res, 200, { ok: true });
        return;
      }
      await handleNihConditions(req, res, url);
      return;
    }
    notFound(res);
  } catch {
    sendJson(res, 500, { query: '', suggestions: [], error: 'server' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[nih-api] listening on http://${HOST}:${PORT}`);
  console.log(`[nih-api] GET /api/nih/conditions?q=migr`);
});
