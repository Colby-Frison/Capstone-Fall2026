import { useState } from 'react';
import ConditionSearchInput from '../components/ConditionSearchInput';
import type { NihSuggestion } from '../data/nih';

type Page = 'home' | 'search' | 'conditions' | 'condition-detail' | 'medication-detail' | 'how-it-works' | 'about';

interface Props {
  onNavigate: (page: Page, query?: string) => void;
}

export default function Home({ onNavigate }: Props) {
  const [query, setQuery] = useState('');

  function handleSearch(q: string) {
    if (q.trim()) onNavigate('search', q.trim());
    else onNavigate('search');
  }

  function handleSelectCondition(conditionId: string, _suggestion: NihSuggestion) {
    onNavigate('condition-detail', conditionId);
  }

  function handleSelectUnmatched(suggestion: NihSuggestion) {
    onNavigate('search', suggestion.label);
  }

  return (
    <div style={{ background: '#ffffff', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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
          <div className="hero-chip">
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
            Look up a medical condition you already know about. See what the FAA guide says, and what to bring to the medical exam.
          </p>

          {/* Search bar with NIH autocomplete */}
          <div style={{ maxWidth: 560, margin: '0 auto 24px' }}>
            <ConditionSearchInput
              value={query}
              onChange={setQuery}
              onSearch={handleSearch}
              onSelectCondition={handleSelectCondition}
              onSelectUnmatched={handleSelectUnmatched}
              variant="hero"
              placeholder="Search a condition or medication (e.g., migraine, depression)"
            />
          </div>

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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 24 }}>
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
                For a condition you already know about, the guide says whether a certificate can be issued, needs FAA review, is usually not allowed, or needs a special approval. This is the published guide, not a promise about your own case.
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
                What should I bring to my medical exam?
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
                A checklist of records, test results, and other papers the guide asks you to bring. Showing up with them can avoid a long wait while the FAA asks for missing items.
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
            { icon: '✓', label: 'From the FAA guide', detail: 'Same source medical examiners use' },
            { icon: '✓', label: 'Same answer every time', detail: 'The same search shows the same published text' },
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

      {/* Certification terms */}
      <section style={{ background: '#ffffff', padding: '56px 24px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: '1.5rem',
              color: '#1b2d4f',
              margin: '0 0 30px',
              textAlign: 'center',
            }}
          >
            Medical Certification Decisions & Pathways
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 16 }}>
            {[
              {
                term: 'Issuance',
                name: 'The AME issues a certificate',
                detail: 'The AME may issue a certificate when you meet all medical standards.',
                color: '#166534',
                background: '#f0fdf4',
                border: '#bbf7d0',
              },
              {
                term: 'Deferral',
                name: 'More FAA review is needed',
                detail: 'The AME sends your application to the FAA for further review. A deferral is not a denial.',
                color: '#78350f',
                background: '#fffbeb',
                border: '#fde68a',
              },
              {
                term: 'Denial',
                name: 'The application is not approved',
                detail: 'The AME may deny when you clearly do not meet medical standards.',
                color: '#7f1d1d',
                background: '#fef2f2',
                border: '#fecaca',
              },
              {
                term: 'CACI',
                name: 'Conditions AMEs Can Issue',
                detail: 'For certain conditions, the AME may issue on the spot if FAA criteria and documentation are met.',
                color: '#166534',
                background: '#f0fdf4',
                border: '#bbf7d0',
              },
              {
                term: 'SODA',
                name: 'Statement of Demonstrated Ability',
                detail: 'The FAA may grant a SODA for certain static conditions after assessing your ability to perform safely. A SODA does not expire.',
                color: '#1e3a8a',
                background: '#eff6ff',
                border: '#bfdbfe',
              },
              {
                term: 'Special Issuance',
                name: 'Time-limited FAA authorization',
                detail: 'The FAA may authorize certification for some disqualifying conditions; the authorization has an expiration date.',
                color: '#1e3a8a',
                background: '#eff6ff',
                border: '#bfdbfe',
              }
            ].map((item) => (
              <article
                key={item.term}
                style={{
                  background: item.background,
                  border: `1px solid ${item.border}`,
                  borderRadius: 8,
                  padding: '20px 22px',
                }}
              >
                <h3
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    color: item.color,
                    margin: '0 0 4px',
                  }}
                >
                  {item.term}
                </h3>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    color: '#334155',
                    marginBottom: 10,
                  }}
                >
                  {item.name}
                </div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.825rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                  {item.detail}
                </p>
              </article>
            ))}
          </div>
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
            Four steps from looking it up to your medical exam
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 16 }}>
            {[
              { step: '01', label: 'Search or browse', detail: 'Find your condition or medication by name or category' },
              { step: '02', label: 'Read the result', detail: 'See what the guide says for your situation' },
              { step: '03', label: 'See what to bring', detail: 'Use the list for the situation you selected' },
              { step: '04', label: 'See your medical examiner', detail: 'Bring the records and test results on the list' },
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
