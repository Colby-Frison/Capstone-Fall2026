/**
 * Re-export shared Clinical Tables client.
 * Source of truth lives under the Vercel web root so production can bundle it:
 *   src/apps/web/api/_lib/clinicalTables.mjs
 */
export {
  CLINICAL_TABLES_URL,
  DEFAULT_MAX_LIST,
  MAX_QUERY_LENGTH,
  UPSTREAM_TIMEOUT_MS,
  createTtlCache,
  fetchConditionSuggestions,
  parseClinicalTablesResponse,
  parseInfoLinks,
  sanitizeQuery,
} from '../../web/api/_lib/clinicalTables.mjs';
