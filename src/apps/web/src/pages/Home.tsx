import { useState } from 'react';

type Page = 'home' | 'search' | 'conditions' | 'condition-detail' | 'medication-detail' | 'how-it-works' | 'about';

interface Props {
  onNavigate: (page: Page, query?: string) => void;
}

export default function Home({ onNavigate }: Props) {
  const [query, setQuery] = useState('');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) onNavigate('search', query.trim());
    else onNavigate('search');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>
      {/* Hero */}
      <section
        style={{
          background: 'linear-gradient(160deg, #1b2d4f 0%, #243e6b 60%, #1b3560 100%)',
          padding: '80px 24px 72px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle grid overlay */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(59,127,196,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(59,127,196,0.06) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative', textAlign: 'center' }}>
          {/* Wordmark above hero */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 32,
              padding: '6px 16px',
              background: 'rgba(59,127,196,0.15)',
              border: '1px solid rgba(59,127,196,0.3)',
              borderRadius: 4,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M4 22 L16 8 L28 22" stroke="#7fa8d0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <line x1="4" y1="24" x2="28" y2="24" stroke="#7fa8d0" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: '0.8rem',
                color: '#7fa8d0',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Pilots Guide to Medical Certification
            </span>
          </div>

          <h1
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(2rem, 5vw, 3.25rem)',
              color: '#ffffff',
              lineHeight: 1.15,
              marginBottom: 20,
              letterSpacing: '-0.02em',
            }}
          >
            Prepare for your FAA medical with clear, official guidance
          </h1>

          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 'clamp(1rem, 2vw, 1.15rem)',
              color: '#a0bcd8',
              lineHeight: 1.65,
              marginBottom: 40,
              maxWidth: 580,
              margin: '0 auto 40px',
            }}
          >
            Research certification pathways and appointment preparation checklists for known medical conditions — grounded in published FAA AME Guide source material.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, maxWidth: 560, margin: '0 auto 24px' }}>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a condition or medication (e.g., migraine, depression)"
              style={{
                flex: 1,
                background: '#ffffff',
                border: '2px solid #ffffff',
                borderRadius: 6,
                padding: '14px 20px',
                fontSize: '1rem',
                fontFamily: "'Inter', sans-serif",
                color: '#1e293b',
                outline: 'none',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              }}
            />
            <button
              type="submit"
              style={{
                background: '#3b7fc4',
                border: '2px solid #3b7fc4',
                borderRadius: 6,
                padding: '14px 28px',
                color: '#ffffff',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                transition: 'background 0.15s',
              }}
            >
              Search
            </button>
          </form>

          <button
            onClick={() => onNavigate('conditions')}
            style={{
              background: 'none',
              border: '1px solid rgba(160,188,216,0.4)',
              borderRadius: 6,
              padding: '10px 24px',
              color: '#a0bcd8',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'border-color 0.15s, color 0.15s',
            }}
          >
            Browse all conditions
          </button>
        </div>
      </section>

      {/* Two questions preview */}
      <section style={{ background: '#f5f7fa', borderBottom: '1px solid #e2e8f0', padding: '48px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 32,
            }}
          >
            <div style={{ height: 2, flex: 1, background: '#e2e8f0' }} />
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: '0.75rem',
                color: '#6b7a99',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                whiteSpace: 'nowrap',
              }}
            >
              What this guide covers
            </span>
            <div style={{ height: 2, flex: 1, background: '#e2e8f0' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {/* Q1 */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderTop: '4px solid #1b2d4f',
                borderRadius: 8,
                padding: '28px 28px 24px',
              }}
            >
              <h2
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  color: '#1b2d4f',
                  marginBottom: 10,
                  lineHeight: 1.3,
                }}
              >
                Can I get a medical certificate with this condition?
              </h2>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.875rem',
                  color: '#475569',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Based on published FAA disposition guidance for conditions you already know about. Outcomes are presented as guidance labels — Issue, Deferral, Denial, or Special Issuance — not personal guarantees.
              </p>
            </div>

            {/* Q2 */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderTop: '4px solid #3b7fc4',
                borderRadius: 8,
                padding: '28px 28px 24px',
              }}
            >
              <h2
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  color: '#1b2d4f',
                  marginBottom: 10,
                  lineHeight: 1.3,
                }}
              >
                What should I bring to my AME appointment?
              </h2>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.875rem',
                  color: '#475569',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                A clear checklist of medical records, test results, forms, and documentation called for by the guidance for your condition. Arriving prepared can prevent months of delay from a deferral.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section style={{ background: '#ffffff', padding: '32px 24px', borderBottom: '1px solid #e2e8f0' }}>
        <div
          style={{
            maxWidth: 900,
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 40,
          }}
        >
          {[
            { icon: '✓', label: 'Source-based', detail: 'FAA AME Guide / OneGuide content' },
            { icon: '✓', label: 'Deterministic', detail: 'Same query, same published answer' },
            { icon: '✓', label: 'No personal data collected', detail: 'No account, no medical history stored' },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 28,
                  height: 28,
                  background: '#e8f2fb',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#3b7fc4',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </span>
              <div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#1b2d4f',
                  }}
                >
                  {item.label}
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.775rem', color: '#6b7a99' }}>
                  {item.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Health first note */}
      <section style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '20px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="10" cy="10" r="9" stroke="#d97706" strokeWidth="1.5" />
            <path d="M10 6v5M10 14v.5" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#78350f', lineHeight: 1.55 }}>
            <strong>Get healthy first.</strong> If you have active medical concerns, consult your personal physician before pursuing a medical certificate. This site helps you prepare for the certification process — your health comes first.
          </p>
        </div>
      </section>

      {/* How it works preview */}
      <section style={{ background: '#ffffff', padding: '64px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: '1.5rem',
              color: '#1b2d4f',
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            How to use this guide
          </h2>
          <p
            style={{
              textAlign: 'center',
              color: '#6b7a99',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.9rem',
              marginBottom: 40,
            }}
          >
            Four steps from research to your AME appointment
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {[
              { step: '01', label: 'Search or browse', detail: 'Find your condition or medication by name or category' },
              { step: '02', label: 'Review the pathway', detail: 'See the published disposition for your known condition' },
              { step: '03', label: 'Review information to submit', detail: 'Use the materials list for the selected pathway before the examination' },
              { step: '04', label: 'See your AME', detail: 'Arrive prepared with the right records and test results' },
            ].map((item) => (
              <div key={item.step} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: '1.5rem',
                    color: '#d1d9e6',
                    lineHeight: 1,
                    flexShrink: 0,
                    minWidth: 36,
                  }}
                >
                  {item.step}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      color: '#1b2d4f',
                      marginBottom: 4,
                    }}
                  >
                    {item.label}
                  </div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.825rem', color: '#6b7a99', lineHeight: 1.5 }}>
                    {item.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <button
              onClick={() => onNavigate('how-it-works')}
              style={{
                background: 'none',
                border: '1px solid #1b2d4f',
                borderRadius: 6,
                padding: '10px 24px',
                color: '#1b2d4f',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Learn more about how this works
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
