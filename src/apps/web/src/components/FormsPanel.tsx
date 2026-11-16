import type { ReactNode } from 'react';
import type { FormRef } from '../data/types';
import { FORM_TYPE_LABELS } from '@content/forms';

export const DOWNLOAD_LABEL = 'Download PDF';

/** Screen-reader text for a form link. The PDF opens on faa.gov in a new tab. */
export function downloadAriaLabel(title: string): string {
  return `${DOWNLOAD_LABEL}: ${title} (opens faa.gov in a new tab)`;
}

export function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <path
        d="M8 2.5v7.5M4.75 7.25L8 10.5l3.25-3.25M3 13h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const pillStyle = {
  display: 'inline-block',
  borderRadius: 999,
  padding: '2px 10px',
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 600,
  fontSize: '0.72rem',
  lineHeight: 1.5,
} as const;

const subheadingStyle = {
  margin: '0 0 4px',
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 600,
  fontSize: '0.72rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#64748b',
} as const;

/** One form: type and "filled in by" tags, title, one-line explanation, and the PDF link. */
export function FormCard({ form, children }: { form: FormRef; children?: ReactNode }) {
  return (
    <li
      data-testid="form-card"
      data-form-id={form.id}
      style={{
        listStyle: 'none',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        background: '#fafbfd',
        padding: '14px 16px',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 16px' }}>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            <span style={{ ...pillStyle, background: '#e8f2fb', border: '1px solid #b8d4ef', color: '#1b2d4f' }}>
              {FORM_TYPE_LABELS[form.type]}
            </span>
            <span style={{ ...pillStyle, background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569' }}>
              Filled in by: {form.completedBy}
            </span>
          </div>
          <h3 style={{ margin: 0, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#1b2d4f', overflowWrap: 'anywhere' }}>
            {form.title}
          </h3>
          <p style={{ margin: '6px 0 0', fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#475569', lineHeight: 1.55 }}>
            {form.summary}
          </p>
        </div>
        <a
          href={form.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={downloadAriaLabel(form.title)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            minHeight: 44,
            padding: '0 18px',
            borderRadius: 6,
            background: '#1b2d4f',
            color: '#ffffff',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            fontSize: '0.85rem',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <DownloadIcon />
          {DOWNLOAD_LABEL}
        </a>
      </div>
      {children}
    </li>
  );
}

const listStyle = { margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 } as const;

/**
 * FAA forms for the selected situation, each with a short summary and a direct link.
 * `otherForms` are the condition's remaining forms: ones named in other situations
 * and ones the registry assigns to the condition as a whole.
 */
export default function FormsPanel({
  forms,
  otherForms,
  situationName,
}: {
  forms: FormRef[];
  otherForms: FormRef[];
  situationName?: string;
}) {
  if (!forms.length && !otherForms.length) return null;

  return (
    <section
      aria-labelledby="forms-panel-heading"
      style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}
    >
      <div style={{ padding: '20px 28px 0' }}>
        <h2 id="forms-panel-heading" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: '#1b2d4f', margin: 0 }}>
          Forms for this situation
        </h2>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.825rem', color: '#475569', margin: '6px 0 0', lineHeight: 1.5 }}>
          {forms.length
            ? `Official FAA forms the guide names${situationName ? ` for ${situationName}` : ''}. Each one opens as a PDF on faa.gov in a new tab.`
            : 'The guide does not name a form for this situation.'}
        </p>
      </div>

      <div style={{ padding: '16px 28px 24px' }}>
        {forms.length > 0 && (
          <ul style={listStyle} data-testid="situation-forms">
            {forms.map((form) => (
              <FormCard key={form.id} form={form} />
            ))}
          </ul>
        )}

        {otherForms.length > 0 && (
          <div style={{ marginTop: forms.length ? 20 : 0 }}>
            <h3 style={subheadingStyle}>Other forms for this condition</h3>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#64748b', margin: '0 0 10px', lineHeight: 1.5 }}>
              The guide uses these elsewhere for this condition. Read each description to see if one fits you.
            </p>
            <ul style={listStyle} data-testid="other-forms">
              {otherForms.map((form) => (
                <FormCard key={form.id} form={form} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
