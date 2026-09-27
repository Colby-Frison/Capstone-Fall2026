import type { DocumentItem } from '../data/types';

export type SubmitGroup = {
  key: string;
  label: string;
  required: DocumentItem[];
  optional: DocumentItem[];
};

const KIND_GROUPS: { key: string; label: string; match: (kind?: string) => boolean }[] = [
  {
    key: 'document',
    label: 'Records and documents',
    match: (kind) => !kind || kind === 'DOCUMENT',
  },
  {
    key: 'test',
    label: 'Tests and imaging',
    match: (kind) => kind === 'TEST',
  },
  {
    key: 'medication',
    label: 'Medications',
    match: (kind) => kind === 'MEDICATION',
  },
  {
    key: 'other',
    label: 'Other',
    match: (kind) => kind === 'OTHER' || kind === 'EVALUATION',
  },
];

export function groupSubmitItems(documents: DocumentItem[]): SubmitGroup[] {
  return KIND_GROUPS.map((group) => {
    const items = documents.filter((doc) => group.match(doc.kind));
    return {
      key: group.key,
      label: group.label,
      required: items.filter((doc) => doc.required),
      optional: items.filter((doc) => !doc.required),
    };
  }).filter((group) => group.required.length + group.optional.length > 0);
}

export function checklistCounts(documents: DocumentItem[], checkedIds: Iterable<string>) {
  const ids = new Set(documents.map((doc) => doc.id));
  let checked = 0;
  for (const id of checkedIds) {
    if (ids.has(id)) checked += 1;
  }
  const required = documents.filter((doc) => doc.required).length;
  return {
    total: documents.length,
    checked,
    required,
    optional: documents.length - required,
  };
}
