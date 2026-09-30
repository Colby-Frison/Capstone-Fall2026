import type { DocumentItem } from '../data/types';
import { checklistCounts, groupSubmitItems } from './groupSubmitItems';

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

  const groups = groupSubmitItems(documents);
  const counts = checklistCounts(documents, checkedDocs);
  const summaryParts = [`${counts.total} item${counts.total === 1 ? '' : 's'}`];
  if (counts.required) summaryParts.push(`${counts.required} required`);
  if (counts.optional) summaryParts.push(`${counts.optional} often requested`);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p
        style={{
          margin: 0,
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.85rem',
          color: '#475569',
        }}
      >
        {summaryParts.join(' · ')}
      </p>

      {groups.map((group) => {
        const count = group.required.length + group.optional.length;
        return (
          <section
            key={group.key}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              overflow: 'hidden',
              background: '#ffffff',
            }}
          >
            <header
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 14px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: '#1b2d4f',
                }}
              >
                {group.label}
              </h3>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.75rem',
                  color: '#64748b',
                }}
              >
                {count}
              </span>
            </header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
              {group.required.map((doc) => (
                <DocItem
                  key={doc.id}
                  doc={doc}
                  checked={checkedDocs.has(doc.id)}
                  onToggle={onToggle}
                />
              ))}
              {group.optional.length > 0 && (
                <p
                  style={{
                    margin: group.required.length ? '8px 0 0' : 0,
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#64748b',
                  }}
                >
                  Often requested
                </p>
              )}
              {group.optional.map((doc) => (
                <DocItem
                  key={doc.id}
                  doc={doc}
                  checked={checkedDocs.has(doc.id)}
                  onToggle={onToggle}
                />
              ))}
            </div>
          </section>
        );
      })}

      <div
        style={{
          padding: '14px 18px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: '0.8rem',
              color: '#1b2d4f',
              marginBottom: 6,
            }}
          >
            Prepared
          </div>
          <div style={{ background: '#e2e8f0', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div
              style={{
                background: '#1b2d4f',
                height: '100%',
                borderRadius: 4,
                width: `${counts.total ? (counts.checked / counts.total) * 100 : 0}%`,
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
          {counts.checked}/{counts.total}
        </span>
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
      type="button"
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
        minHeight: 44,
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
        aria-hidden
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
      <div style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
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
        {!doc.required && (
          <div
            style={{
              marginTop: 4,
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.72rem',
              color: '#64748b',
            }}
          >
            Often requested
          </div>
        )}
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
