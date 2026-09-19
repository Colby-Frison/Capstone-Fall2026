/**
 * Predetermined browse categories shared with the Python parser dictionary.
 */

import dictionary from '@guidance/category_dictionary.json';

export type CategoryDictionary = {
  version: number;
  description?: string;
  categories: string[];
  item_map: Record<string, string>;
  alias_map: Record<string, string>;
  condition_map: Record<string, string>;
  patterns: Array<{ category: string; match: string }>;
};

const data = dictionary as CategoryDictionary;

function clean(text: string | null | undefined): string {
  return (text || '').replace(/\x00/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeKey(value: string): string {
  return clean(value).toLocaleLowerCase();
}

export function resolveCategory(
  condition: string | null | undefined,
  category?: string | null,
  sourceSection?: string | null,
): string {
  const conditionValue = clean(condition);
  const extracted = clean(category) || clean(sourceSection);
  const allowed = new Set(data.categories || []);

  const conditionMap = data.condition_map || {};
  if (conditionValue && conditionMap[conditionValue]) {
    return conditionMap[conditionValue];
  }
  const conditionKey = normalizeKey(conditionValue);
  for (const [key, mapped] of Object.entries(conditionMap)) {
    if (normalizeKey(key) === conditionKey) return mapped;
  }

  const itemMap = data.item_map || {};
  for (const candidate of [extracted, conditionValue]) {
    const match = candidate.match(/ITEM\s+(\d+)/i);
    if (match && itemMap[match[1]]) return itemMap[match[1]];
  }

  const aliasMap = Object.fromEntries(
    Object.entries(data.alias_map || {}).map(([key, value]) => [normalizeKey(key), value]),
  );
  if (extracted) {
    const alias = aliasMap[normalizeKey(extracted)];
    if (alias) return alias;
    if (allowed.has(extracted)) return extracted;
  }

  for (const rule of data.patterns || []) {
    if (!rule.match || !rule.category) continue;
    if (new RegExp(rule.match, 'i').test(conditionValue)) return rule.category;
  }

  if (extracted) {
    for (const rule of data.patterns || []) {
      if (!rule.match || !rule.category) continue;
      if (new RegExp(rule.match, 'i').test(extracted)) return rule.category;
    }
  }

  return 'Other';
}

export function listCanonicalCategories(): string[] {
  return [...(data.categories || [])];
}
