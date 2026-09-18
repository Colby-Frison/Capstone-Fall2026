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
    label: 'Special Issuance',
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
      heading: 'Issuable',
      body: 'Published guidance indicates this condition may be issuable by the Aviation Medical Examiner without deferral to the FAA, provided all documentation criteria are met.',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      text: '#14532d',
      accent: '#16a34a',
    },
    deferral: {
      heading: 'Deferral Required',
      body: 'Published guidance indicates that this condition requires deferral to the FAA Aerospace Medical Certification Division (AMCD) for case-by-case review. Issuance is possible but requires FAA-level evaluation.',
      bg: '#fffbeb',
      border: '#fde68a',
      text: '#78350f',
      accent: '#d97706',
    },
    denial: {
      heading: 'Generally Disqualifying',
      body: 'Published guidance indicates this condition is generally disqualifying under current FAA standards. Special Issuance consideration may be available in some cases; consult your AME and the FAA for current guidance.',
      bg: '#fef2f2',
      border: '#fecaca',
      text: '#7f1d1d',
      accent: '#dc2626',
    },
    'special-issuance': {
      heading: 'Special Issuance Required',
      body: 'Published guidance indicates that certification is possible through the Special Issuance pathway. This requires additional documentation, FAA review, and time-limited authorization that must be renewed periodically.',
      bg: '#eff6ff',
      border: '#bfdbfe',
      text: '#1e3a8a',
      accent: '#3b82f6',
    },
    unknown: {
      heading: 'Review Required',
      body: 'Certification pathway for this condition requires AME evaluation. Published guidance may vary by specific presentation. Consult your AME with complete documentation.',
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
