import type { Disposition } from '../data/types';

interface Props {
  disposition: Disposition;
  size?: 'sm' | 'md' | 'lg';
}

const config: Record<Disposition, { label: string; dotColor: string; className: string }> = {
  issue: {
    label: 'Issue',
    dotColor: '#16a34a',
    className: 'badge badge-issue',
  },
  deferral: {
    label: 'Deferral',
    dotColor: '#d97706',
    className: 'badge badge-deferral',
  },
  denial: {
    label: 'Denial',
    dotColor: '#dc2626',
    className: 'badge badge-denial',
  },
  'special-issuance': {
    label: 'Special issuance',
    dotColor: '#3b82f6',
    className: 'badge badge-special',
  },
  unknown: {
    label: 'Unknown',
    dotColor: '#94a3b8',
    className: 'badge badge-unknown',
  },
};

export default function DispositionBadge({ disposition, size = 'md' }: Props) {
  const { label, dotColor, className } = config[disposition];

  const sizeStyles =
    size === 'sm'
      ? { fontSize: '0.7rem', padding: '2px 8px', gap: '4px' }
      : size === 'lg'
        ? { fontSize: '0.85rem', padding: '5px 14px', gap: '7px' }
        : {};

  return (
    <span className={className} style={sizeStyles}>
      <span
        style={{
          width: size === 'sm' ? 6 : size === 'lg' ? 9 : 7,
          height: size === 'sm' ? 6 : size === 'lg' ? 9 : 7,
          borderRadius: '50%',
          backgroundColor: dotColor,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}

export function DispositionBlock({ disposition }: { disposition: Disposition }) {
  const labels: Record<Disposition, { heading: string; body: string; bg: string; border: string; text: string; accent: string }> = {
    issue: {
      heading: 'A medical examiner can issue the certificate',
      body: 'The published guide says a medical examiner can issue the certificate for this situation when the listed records are in order. It does not have to be sent to the FAA first.',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      text: '#14532d',
      accent: '#16a34a',
    },
    deferral: {
      heading: 'The FAA has to review it',
      body: 'The published guide says the medical examiner cannot decide this one alone. The file is sent to the FAA, which reviews it case by case. A certificate is still possible after that review.',
      bg: '#fffbeb',
      border: '#fde68a',
      text: '#78350f',
      accent: '#d97706',
    },
    denial: {
      heading: 'Usually not allowed',
      body: 'The published guide treats this situation as one that does not qualify for a certificate. In some cases a special approval is still possible. Ask a medical examiner and check the current FAA guide.',
      bg: '#fef2f2',
      border: '#fecaca',
      text: '#7f1d1d',
      accent: '#dc2626',
    },
    'special-issuance': {
      heading: 'Possible with special approval',
      body: 'The published guide allows a certificate through a special FAA approval. That needs extra records, an FAA review, and a time limit. It has to be renewed.',
      bg: '#eff6ff',
      border: '#bfdbfe',
      text: '#1e3a8a',
      accent: '#3b82f6',
    },
    unknown: {
      heading: 'The guide does not give a clear answer',
      body: 'The published page does not state a clear result for this situation. A medical examiner has to look at the full record.',
      bg: '#f8fafc',
      border: '#e2e8f0',
      text: '#334155',
      accent: '#94a3b8',
    },
  };

  const d = labels[disposition];

  return (
    <div
      style={{
        background: d.bg,
        border: `1px solid ${d.border}`,
        borderLeft: `4px solid ${d.accent}`,
        borderRadius: 6,
        padding: '20px 24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <DispositionBadge disposition={disposition} size="lg" />
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: '1.1rem',
            color: d.text,
          }}
        >
          {d.heading}
        </span>
      </div>
      <p style={{ color: d.text, fontSize: '0.925rem', lineHeight: 1.6, margin: 0 }}>{d.body}</p>
    </div>
  );
}
