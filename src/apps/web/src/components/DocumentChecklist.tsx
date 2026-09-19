import type { CSSProperties } from 'react';
import type { DocumentItem } from '../data/types';

const KIND_GROUPS: { key: string; label: string; match: (kind?: string) => boolean }[] = [
  {
    key: 'document',
    label: 'Records & documents',
    match: (kind) => !kind || kind === 'DOCUMENT',
  },
  {
    key: 'test',
    label: 'Tests & imaging',
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

export function DocumentChecklist({
  documents,
  checkedDocs,
  onToggle,
}: {
  documents: DocumentItem[];
  checkedDocs: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (!documents.length) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {KIND_GROUPS.map((group) => {
        const groupDocs = documents.filter((doc) => group.match(doc.kind));
        if (!groupDocs.length) return null;
        const requiredDocs = groupDocs.filter((doc) => doc.required);
        const optionalDocs = groupDocs.filter((doc) => !doc.required);
        return (
          <div key={group.key}>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700,
                fontSize: '0.8rem',
                color: '#1b2d4f',
                marginBottom: 12,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {group.label}
            </div>
            {requiredDocs.length > 0 && (
              <ChecklistSection
                title="Required"
                titleColor="#1b2d4f"
                docs={requiredDocs}
                checkedDocs={checkedDocs}
                onToggle={onToggle}
              />
            )}
            {optionalDocs.length > 0 && (
              <ChecklistSection
                title="Often requested"
                titleColor="#6b7a99"
                docs={optionalDocs}
                checkedDocs={checkedDocs}
                onToggle={onToggle}
                style={{ marginTop: requiredDocs.length ? 16 : 0 }}
              />
            )}
          </div>
        );
      })}

      <div
        style={{
          marginTop: 4,
          padding: '14px 18px',
          background: '#f5f7fa',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: '0.8rem',
              color: '#1b2d4f',
              marginBottom: 6,
            }}
          >
            Checklist progress
          </div>
          <div style={{ background: '#e2e8f0', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div
              style={{
                background: '#3b7fc4',
                height: '100%',
                borderRadius: 4,
                width: `${documents.length ? (checkedDocs.size / documents.length) * 100 : 0}%`,
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: '0.9rem',
            color: '#1b2d4f',
            flexShrink: 0,
          }}
        >
          {checkedDocs.size}/{documents.length}
        </span>
      </div>
    </div>
  );
}

function ChecklistSection({
  title,
  titleColor,
  docs,
  checkedDocs,
  onToggle,
  style,
}: {
  title: string;
  titleColor: string;
  docs: DocumentItem[];
  checkedDocs: Set<string>;
  onToggle: (id: string) => void;
  style?: CSSProperties;
}) {
  return (
    <div style={style}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ height: 1, flex: 1, background: '#e2e8f0' }} />
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: '0.72rem',
            color: titleColor,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </span>
        <div style={{ height: 1, flex: 1, background: '#e2e8f0' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {docs.map((doc) => (
          <DocItem key={doc.id} doc={doc} checked={checkedDocs.has(doc.id)} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}

function DocItem({
  doc,
  checked,
  onToggle,
}: {
  doc: DocumentItem;
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onToggle(doc.id)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 14px',
        background: checked ? '#f0fdf4' : '#fafbfd',
        border: `1px solid ${checked ? '#bbf7d0' : '#e2e8f0'}`,
        borderRadius: 6,
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          border: `2px solid ${checked ? '#16a34a' : '#cbd5e1'}`,
          background: checked ? '#16a34a' : '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 1,
          transition: 'all 0.15s',
        }}
      >
        {checked && (
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
            <path
              d="M1 4L4 7L10 1"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.875rem',
            color: checked ? '#14532d' : '#334155',
            lineHeight: 1.5,
            textDecoration: checked ? 'line-through' : 'none',
            transition: 'color 0.15s',
          }}
        >
          {doc.label}
        </div>
        {doc.description && (
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.78rem',
              color: '#64748b',
              lineHeight: 1.5,
              marginTop: 6,
            }}
          >
            {doc.description}
          </div>
        )}
      </div>
    </button>
  );
}
