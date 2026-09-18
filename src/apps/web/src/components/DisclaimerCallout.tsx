interface Props {
  variant?: 'default' | 'compact';
}

export default function DisclaimerCallout({ variant = 'default' }: Props) {
  if (variant === 'compact') {
    return (
      <div
        style={{
          background: '#f0f4f8',
          border: '1px solid #cbd5e1',
          borderLeft: '4px solid #3b7fc4',
          borderRadius: 6,
          padding: '12px 16px',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="8" cy="8" r="7" stroke="#3b7fc4" strokeWidth="1.5" />
          <path d="M8 5v4M8 11v.5" stroke="#3b7fc4" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#334155', lineHeight: 1.55, fontFamily: "'Inter', sans-serif" }}>
          Published guidance for known conditions only. Does not account for findings discovered during the AME examination. This is educational information, not a certification decision or medical advice.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#f0f4f8',
        border: '1px solid #cbd5e1',
        borderLeft: '4px solid #3b7fc4',
        borderRadius: 8,
        padding: '20px 24px',
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
          <circle cx="10" cy="10" r="9" stroke="#3b7fc4" strokeWidth="1.5" />
          <path d="M10 6v5M10 14v.5" stroke="#3b7fc4" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: '0.9rem',
              color: '#1b2d4f',
              marginBottom: 6,
            }}
          >
            Educational Guidance — Not a Certification Decision
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>
            Information on this site reflects published FAA AME Guide source material for conditions already known to the pilot. It does not account for findings discovered during the AME examination and does not guarantee any specific certification outcome. Individual outcomes are determined by the AME and the FAA based on the complete medical picture. Always verify guidance against current FAA materials.
          </p>
        </div>
      </div>
    </div>
  );
}
