import {
  expandedTermsFromNihSuggestions,
  searchCatalog,
  type SearchHit,
} from '@content/index';
import { conditions } from './conditions';
import { medications } from './medications';
import { listForms } from '@content/forms';

export type { SearchHit };
export { expandedTermsFromNihSuggestions };

/** Unified ranked search across the local condition, medication and FAA form catalogs. */
export function searchCatalogResults(
  query: string,
  expandedTerms: string[] = [],
): SearchHit[] {
  const q = query.trim();
  if (!q) return [];
  return searchCatalog(q, {
    conditions,
    medications,
    forms: listForms(),
    expandedTerms,
  });
}
