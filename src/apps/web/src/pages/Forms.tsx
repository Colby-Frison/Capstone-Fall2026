import { useMemo, useState } from 'react';
import { conditions } from '../data/conditions';
import type { FormType } from '../data/types';
import { conditionsUsingForm, FORM_TYPE_LABELS, listForms } from '@content/forms';
import { FormCard } from '../components/FormsPanel';
import DisclaimerCallout from '../components/DisclaimerCallout';

type Page = 'home' | 'search' | 'conditions' | 'forms' | 'condition-detail' | 'medication-detail' | 'how-it-works' | 'about';

interface Props {
  onNavigate: (page: Page, id?: string) => void;
}

type TypeFilter = 'all' | FormType;

/** How many condition links to show before the rest are tucked behind "Show all". */
const CONDITIONS_SHOWN = 6;

const TYPE_FILTER_LABELS: Record<FormType, string> = {
  status_summary: 'Status summaries',
  questionnaire: 'Questionnaires',
  faa_form: 'FAA forms',
  result_sheet: 'Test result sheets',
  progress_note: 'Guides for your doctor',
};

const conditionLinkStyle = {
  background: '#ffffff',
  border: '1px solid #d1d9e6',
  borderRadius: 999,
  padding: '6px 12px',
  minHeight: 32,
  cursor: 'pointer',
  fontFamily: "'Inter', sans-serif",
  fontSize: '0.78rem',
  color: '#2563eb',
  textAlign: 'left',
} as const;

export default function Forms({ onNavigate }: Props) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [query, setQuery] = useState('');

  const rows = useMemo(
    () =>
      listForms().map((form) => ({
        form,
        usedBy: conditionsUsingForm(form.id, conditions),
      })),
    [],
  );

  const types = useMemo(
    () => [...new Set(rows.map((row) => row.form.type))],
    [rows],
  );

  const needle = query.trim().toLowerCase();
  const filtered = rows.filter(({ form, usedBy }) => {
    if (typeFilter !== 'all' && form.type !== typeFilter) return false;
    if (!needle) return true;
    return [
      form.title,
      form.summary,
      form.completedBy,
      FORM_TYPE_LABELS[form.type],
      ...(form.aliases ?? []),
      ...usedBy.map((c) => c.name),
    ].some((text) => text.toLowerCase().includes(needle));
  });

  return (
    <div style={{ background: '#f5f7fa', minWidth: 0 }}>
      <div style={{ background: '#1b2d4f', padding: '40px 24px 36px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: '#ffffff', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            Forms &amp; Documents
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: '#a0bcd8', margin: '0 0 24px', lineHeight: 1.5 }}>
            {rows.length} official FAA forms named in the medical examiner guide. Each one opens as a PDF on faa.gov.
          </p>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search forms or conditions…"
            aria-label="Search forms or conditions"
            style={{
              background: '#243e6b',
              border: '1px solid #345487',
              borderRadius: 6,
              padding: '10px 18px',
              color: '#ffffff',
              fontSize: '1rem',
              width: '100%',
              maxWidth: 400,
              fontFamily: "'Inter', sans-serif",
              outline: 'none',
            }}
          />
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 24px 40px' }}>
        <div role="group" aria-label="Filter by form type" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {(['all', ...types] as TypeFilter[]).map((type) => {
            const active = typeFilter === type;
            const count = type === 'all' ? rows.length : rows.filter((row) => row.form.type === type).length;
            return (
              <button
                key={type}
                type="button"
                aria-pressed={active}
                onClick={() => setTypeFilter(type)}
                style={{
                  padding: '8px 14px',
                  minHeight: 44,
                  borderRadius: 4,
                  border: active ? '1px solid #1b2d4f' : '1px solid #d1d9e6',
                  background: active ? '#1b2d4f' : '#ffffff',
                  color: active ? '#ffffff' : '#475569',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {type === 'all' ? 'All' : TYPE_FILTER_LABELS[type]} ({count})
              </button>
            );
          })}
        </div>

        <p aria-live="polite" style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#6b7a99', margin: '0 0 14px' }}>
          Showing {filtered.length} of {rows.length} forms
        </p>

        {filtered.length === 0 ? (
          <p style={{ fontFamily: "'Inter', sans-serif", color: '#6b7a99', textAlign: 'center', padding: '48px 0' }}>
            No forms match your search.
          </p>
        ) : (
          <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(({ form, usedBy }) => (
              <FormCard key={form.id} form={form}>
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', marginBottom: 8 }}>
                    {usedBy.length
                      ? `Used for ${usedBy.length} condition${usedBy.length === 1 ? '' : 's'} on this site`
                      : 'Not linked to a condition on this site yet'}
                  </div>
                  {usedBy.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {usedBy.slice(0, CONDITIONS_SHOWN).map((c) => (
                        <button key={c.id} type="button" onClick={() => onNavigate('condition-detail', c.id)} style={conditionLinkStyle}>
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {usedBy.length > CONDITIONS_SHOWN && (
                    <details style={{ marginTop: 8 }}>
                      <summary style={{ cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#475569', padding: '6px 0' }}>
                        Show all {usedBy.length} conditions
                      </summary>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {usedBy.slice(CONDITIONS_SHOWN).map((c) => (
                          <button key={c.id} type="button" onClick={() => onNavigate('condition-detail', c.id)} style={conditionLinkStyle}>
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </FormCard>
            ))}
          </ul>
        )}

        <div style={{ marginTop: 28 }}>
          <DisclaimerCallout variant="compact" />
        </div>
      </div>
    </div>
  );
}
