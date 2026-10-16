/**
 * Client for the NIH conditions BFF (/api/nih/conditions).
 */
import {
  enrichSuggestionsWithMatches,
  type NihConditionsResponse,
  type NihSuggestion,
} from '@content/index';
import { conditions } from './conditions';

export type { NihConditionsResponse, NihInfoLink, NihSuggestion } from '@content/index';

const MIN_QUERY_LENGTH = 2;

export function emptyNihResponse(query = ''): NihConditionsResponse {
  return { query, suggestions: [], error: null };
}

/**
 * Fetch NIH suggestions via the app BFF and attach local Condition matches.
 */
export async function fetchNihConditionSuggestions(
  query: string,
  signal?: AbortSignal,
): Promise<NihConditionsResponse> {
  const q = query.trim();
  if (q.length < MIN_QUERY_LENGTH) {
    return emptyNihResponse(q);
  }

  try {
    const url = `/api/nih/conditions?q=${encodeURIComponent(q)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!response.ok) {
      return { query: q, suggestions: [], error: 'upstream' };
    }
    const data = (await response.json()) as NihConditionsResponse;
    const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
    return {
      query: data.query || q,
      suggestions: enrichSuggestionsWithMatches(conditions, suggestions),
      error: data.error ?? null,
    };
  } catch (err) {
    if (signal?.aborted) {
      return emptyNihResponse(q);
    }
    return { query: q, suggestions: [], error: 'upstream' };
  }
}

/** Collect unique educational links from a set of suggestions. */
export function collectInfoLinks(suggestions: NihSuggestion[], limit = 6) {
  const seen = new Set<string>();
  const links: { url: string; title: string }[] = [];
  for (const suggestion of suggestions) {
    for (const link of suggestion.infoLinks || []) {
      if (!link?.url || seen.has(link.url)) continue;
      seen.add(link.url);
      links.push({ url: link.url, title: link.title || link.url });
      if (links.length >= limit) return links;
    }
  }
  return links;
}
