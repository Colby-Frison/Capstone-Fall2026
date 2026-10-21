import {
  expandedTermsFromNihSuggestions,
  searchCatalog,
  type SearchHit,
} from '@content/index';
import { conditions } from './conditions';
import { medications } from './medications';

export type { SearchHit };
export { expandedTermsFromNihSuggestions };

/** Unified ranked search across the local condition + medication catalogs. */
export function searchCatalogResults(
  query: string,
  expandedTerms: string[] = [],
): SearchHit[] {
  const q = query.trim();
  if (!q) return [];
  return searchCatalog(q, { conditions, medications, expandedTerms });
}
