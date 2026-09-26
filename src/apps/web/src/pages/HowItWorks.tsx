type Page = 'home' | 'search' | 'conditions' | 'condition-detail' | 'medication-detail' | 'how-it-works' | 'about';

interface Props {
  onNavigate: (page: Page, id?: string) => void;
}

export default function HowItWorks({ onNavigate }: Props) {
  const steps = [
    {
      num: '01',
      title: 'Search or browse for your condition',
      body: 'Use the search bar to find a condition or medication by name. You can also browse conditions by category, such as Neurology, Cardiology, and Mental Health.',
      action: { label: 'Search now', page: 'search' as Page },
    },
    {
      num: '02',
      title: 'Read what the guide says',
      body: 'Each condition page shows whether a certificate can be issued, needs FAA review, is usually not allowed, or needs a special approval. If the condition has more than one situation, choose the row that matches you.',
      action: null,
    },
    {
      num: '03',
      title: 'Build your document preparation checklist',
      body: 'The What to bring section lists records, test results, and medications from the guide. Use the checklist to track what you have gathered. Items the medical examiner reviews at the visit are listed separately and are not checkboxes.',
      action: null,
    },
    {
      num: '04',
      title: 'See your Aviation Medical Examiner',
      body: 'Arrive prepared. When the medical examiner has the full set of records at the visit, many cases can be decided that day. Missing records are a common reason the file has to wait for the FAA.',
      action: null,
    },
  ];

  const whatItDoes = [
    'Shows what the FAA guide says for conditions in this site: can be issued, needs FAA review, usually not allowed, or needs special approval',
    'Lists documents, tests, and records the guide asks you to bring',
    'Includes notes about medications when the guide mentions them',
    'Uses the FAA Guide for Aviation Medical Examiners and related OneGuide materials',
  ];

  const whatItDoesNot = [
    'Decide your own medical certificate or promise a result',
    'Replace the medical exam or the FAA review',
    'Cover conditions found for the first time during the exam',
    'Give medical, legal, or certificate advice',
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
            A way to look things up and get ready. It does not decide your case.
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
            The information comes from the <strong>FAA Guide for Aviation Medical Examiners</strong> and related OneGuide materials. Those are the same documents a pilot medical examiner uses. They spell out, for hundreds of conditions, whether a certificate can be issued.
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.925rem', color: '#475569', lineHeight: 1.65, margin: 0 }}>
            This site uses extracts of those PDFs so you can search them. The same search on the same version of the data always shows the same text from the guide.
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
            The FAA has three kinds of medical certificate. First Class is for airline pilots, Second Class is for commercial pilots, and Third Class is for private pilots. Some conditions are treated differently by class. This site shows the general guide. Ask your medical examiner how it applies to your class.
          </p>
        </div>
      </div>
    </div>
  );
}
