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
          This covers conditions you already know about. It does not cover anything found for the first time at the exam. It is for learning, not a decision about your certificate and not medical advice.
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
            For learning only. Not a decision about your certificate.
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>
            This site repeats text from the FAA guide for conditions you already know about. It does not cover findings from the exam itself, and it does not promise a result. Your medical examiner and the FAA decide, using the full record. Check the current FAA materials before you rely on this page.
          </p>
        </div>
      </div>
    </div>
  );
}
