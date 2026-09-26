type Page = 'home' | 'search' | 'conditions' | 'condition-detail' | 'medication-detail' | 'how-it-works' | 'about';

interface Props {
  onNavigate: (page: Page, id?: string) => void;
}

export default function HowItWorks({ onNavigate }: Props) {
  const steps = [
    {
      num: '01',
      title: 'Search or browse for your condition',
      body: 'Use the search bar to find a condition, sub-condition, or medication by name. You can also browse all conditions by category — Neurology, Cardiology, Mental Health, and more.',
      action: { label: 'Search now', page: 'search' as Page },
    },
    {
      num: '02',
      title: 'Review the published certification pathway',
      body: 'Each condition page shows the disposition for that condition from published FAA AME Guide material: Issue, Deferral, Denial, or Special Issuance. Select a pathway when the same condition has more than one presentation.',
      action: null,
    },
    {
      num: '03',
      title: 'Build your document preparation checklist',
      body: 'The Information to submit section lists the records, test results, and medications called for by the guidance. Use the checklist to track what you have gathered before the examination. Examiner review items are listed separately and are not checkboxes.',
      action: null,
    },
    {
      num: '04',
      title: 'See your Aviation Medical Examiner',
      body: 'Arrive prepared. An AME who receives a complete documentation package at the time of examination can make a same-day issuance decision in many cases. Missing documentation is the most common cause of avoidable deferral delays.',
      action: null,
    },
  ];

  const whatItDoes = [
    'Shows published FAA disposition guidance (issue / deferral / denial / special issuance) for conditions in the dataset',
    'Lists documents, tests, and records called for by the guidance for each condition',
    'Covers medication flight-status notes where present in source materials',
    'Presents information sourced from the FAA AME Guide and related OneGuide materials',
  ];

  const whatItDoesNot = [
    'Provide a personal medical certification decision or guarantee',
    'Replace the AME examination or FAA review process',
    'Account for conditions discovered during the examination',
    'Offer medical, legal, or certification advice',
    'Store or transmit any personal medical information',
    'Represent an official FAA product or service',
  ];

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{ background: '#1b2d4f', padding: '48px 24px 40px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h1
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(1.6rem, 3vw, 2.25rem)',
              color: '#ffffff',
              margin: '0 0 12px',
              letterSpacing: '-0.02em',
            }}
          >
            How This Works
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '1rem', color: '#a0bcd8', margin: 0, lineHeight: 1.6 }}>
            A research and preparation tool — not a medical decision engine
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Content source */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '28px 32px' }}>
          <h2
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: '1.1rem',
              color: '#1b2d4f',
              margin: '0 0 12px',
            }}
          >
            Where the information comes from
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.925rem', color: '#475569', lineHeight: 1.65, margin: '0 0 16px' }}>
            The content in this guide is derived from the <strong>FAA Guide for Aviation Medical Examiners (AME Guide)</strong> and related OneGuide materials — the same documents that Aviation Medical Examiners consult when evaluating pilot applicants. These documents contain published disposition rules for hundreds of medical conditions and are the authoritative source for AME issuance decisions.
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.925rem', color: '#475569', lineHeight: 1.65, margin: 0 }}>
            This prototype works from PDF extracts of those materials, parsed into structured form so they can be searched and displayed deterministically. The same query against the same data version always returns the same published answer.
          </p>
        </div>

        {/* Steps */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '20px 28px', borderBottom: '1px solid #f0f4f8' }}>
            <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#1b2d4f', margin: 0 }}>
              Step-by-step
            </h2>
          </div>
          <div style={{ padding: '8px 28px 28px' }}>
            {steps.map((step, idx) => (
              <div
                key={step.num}
                style={{
                  display: 'flex',
                  gap: 20,
                  paddingTop: 24,
                  paddingBottom: idx < steps.length - 1 ? 24 : 0,
                  borderBottom: idx < steps.length - 1 ? '1px solid #f0f4f8' : 'none',
                }}
              >
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: '1.75rem',
                    color: '#e2e8f0',
                    lineHeight: 1,
                    flexShrink: 0,
                    width: 40,
                    paddingTop: 2,
                  }}
                >
                  {step.num}
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 700,
                      fontSize: '1rem',
                      color: '#1b2d4f',
                      margin: '0 0 8px',
                    }}
                  >
                    {step.title}
                  </h3>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, margin: step.action ? '0 0 12px' : 0 }}>
                    {step.body}
                  </p>
                  {step.action && (
                    <button
                      onClick={() => onNavigate(step.action!.page)}
                      style={{
                        background: '#1b2d4f',
                        border: 'none',
                        borderRadius: 5,
                        padding: '8px 18px',
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {step.action.label}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Does / Does not */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '24px 24px' }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.85rem', color: '#14532d', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
              This guide provides
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {whatItDoes.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                    <circle cx="8" cy="8" r="7" fill="#16a34a" />
                    <path d="M5 8l2.5 2.5L11 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#14532d', lineHeight: 1.5 }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '24px 24px' }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.85rem', color: '#7f1d1d', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
              This guide does not
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {whatItDoesNot.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                    <circle cx="8" cy="8" r="7" fill="#dc2626" />
                    <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#7f1d1d', lineHeight: 1.5 }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* About the content */}
        <div style={{ background: '#e8f2fb', border: '1px solid #b8d4ef', borderRadius: 10, padding: '24px 28px' }}>
          <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#1b2d4f', margin: '0 0 10px' }}>
            About the certification classes
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#1b4f72', lineHeight: 1.65, margin: 0 }}>
            The FAA issues three classes of medical certificate: First Class (required for Airline Transport Pilots), Second Class (required for Commercial Pilots), and Third Class (required for Private Pilots). Some conditions have different disposition thresholds by class. This prototype presents general published guidance; consult your AME for class-specific evaluation.
          </p>
        </div>
      </div>
    </div>
  );
}
