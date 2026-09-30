type Page = 'home' | 'search' | 'conditions' | 'condition-detail' | 'medication-detail' | 'how-it-works' | 'about';

interface Props {
  onNavigate: (page: Page) => void;
}

export default function Footer({ onNavigate }: Props) {
  return (
    <footer
      className="site-footer"
      style={{
        background: '#0f1e35',
        borderTop: '1px solid #1b2d4f',
        marginTop: 'auto',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px 32px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
            gap: 40,
            marginBottom: 40,
          }}
        >
          {/* Brand */}
          <div>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700,
                fontSize: '1rem',
                color: '#ffffff',
                marginBottom: 8,
              }}
            >
              Pilots Guide to Medical Certification
            </div>
            <p style={{ color: '#6b85a8', fontSize: '0.825rem', lineHeight: 1.6, margin: 0 }}>
              A learning tool based on the FAA medical examiner guide. Not an official FAA product.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: '0.75rem',
                color: '#7fa8d0',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 12,
              }}
            >
              Navigation
            </div>
            {[
              { label: 'Home', page: 'home' as Page },
              { label: 'Search', page: 'search' as Page },
              { label: 'Browse Conditions', page: 'conditions' as Page },
              { label: 'How This Works', page: 'how-it-works' as Page },
              { label: 'About & Disclaimer', page: 'about' as Page },
            ].map((item) => (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                style={{
                  display: 'block',
                  background: 'none',
                  border: 'none',
                  padding: '4px 0',
                  cursor: 'pointer',
                  color: '#6b85a8',
                  fontSize: '0.875rem',
                  fontFamily: "'Inter', sans-serif",
                  textAlign: 'left',
                  transition: 'color 0.15s',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Disclaimer */}
          <div>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: '0.75rem',
                color: '#7fa8d0',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 12,
              }}
            >
              Important Notice
            </div>
            <p style={{ color: '#6b85a8', fontSize: '0.8rem', lineHeight: 1.6, margin: 0 }}>
              Use this to look things up and get ready. It is not medical advice, legal advice, or a promise about your certificate. Check the current FAA materials and talk with your medical examiner.
            </p>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid #1b2d4f',
            paddingTop: 24,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ color: '#4a6280', fontSize: '0.775rem', fontFamily: "'Inter', sans-serif" }}>
            CS-4273 Capstone Project — Group F · Fall 2026 · Educational prototype only
          </span>
          <span style={{ color: '#4a6280', fontSize: '0.775rem', fontFamily: "'Inter', sans-serif" }}>
            No personal data collected · No official FAA affiliation
          </span>
        </div>
      </div>
    </footer>
  );
}
