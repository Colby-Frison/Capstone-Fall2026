import { useState } from 'react';

type Page =
  | 'home'
  | 'search'
  | 'conditions'
  | 'condition-detail'
  | 'medication-detail'
  | 'how-it-works'
  | 'about';

interface Props {
  currentPage: Page;
  onNavigate: (page: Page, query?: string) => void;
  searchQuery?: string;
}

export default function Header({ currentPage, onNavigate, searchQuery = '' }: Props) {
  const [query, setQuery] = useState(searchQuery);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { label: string; page: Page }[] = [
    { label: 'Home', page: 'home' },
    { label: 'Search', page: 'search' },
    { label: 'Conditions', page: 'conditions' },
    { label: 'How This Works', page: 'how-it-works' },
    { label: 'About', page: 'about' },
  ];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) onNavigate('search', query.trim());
  }

  const showSearch = currentPage !== 'home';

  return (
    <header
      style={{
        background: '#1b2d4f',
        borderBottom: '1px solid #243e6b',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Prototype banner */}
      <div
        style={{
          background: '#0f1e35',
          borderBottom: '1px solid #243e6b',
          padding: '5px 24px',
          textAlign: 'center',
        }}
      >
        <span style={{ color: '#7fa8d0', fontSize: '0.72rem', letterSpacing: '0.04em', fontFamily: "'DM Sans', sans-serif" }}>
          Educational prototype · Based on FAA AME Guide sources · Not an official FAA product · Not medical or legal advice
        </span>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, height: 64 }}>
          {/* Wordmark */}
          <button
            onClick={() => onNavigate('home')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
            }}
          >
            {/* Abstract wing mark */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M4 22 L16 8 L28 22" stroke="#3b7fc4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M8 22 L16 12 L24 22" stroke="#7fa8d0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <line x1="4" y1="24" x2="28" y2="24" stroke="#3b7fc4" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div style={{ textAlign: 'left' }}>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: '#ffffff',
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                }}
              >
                Pilots Guide
              </div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 400,
                  fontSize: '0.7rem',
                  color: '#7fa8d0',
                  lineHeight: 1,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Medical Certification
              </div>
            </div>
          </button>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', gap: 4, flex: 1, alignItems: 'center' }} className="hidden md:flex">
            {navItems.map((item) => (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: 4,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.875rem',
                  fontWeight: currentPage === item.page ? 600 : 400,
                  color: currentPage === item.page ? '#ffffff' : '#a0bcd8',
                  borderBottom: currentPage === item.page ? '2px solid #3b7fc4' : '2px solid transparent',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Search bar (shown on non-home pages) */}
          {showSearch && (
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flexShrink: 0 }} className="hidden md:flex">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conditions, medications…"
                style={{
                  background: '#243e6b',
                  border: '1px solid #345487',
                  borderRadius: 4,
                  padding: '7px 14px',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  width: 240,
                  fontFamily: "'Inter', sans-serif",
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#3b7fc4',
                  border: 'none',
                  borderRadius: 4,
                  padding: '7px 16px',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  whiteSpace: 'nowrap',
                }}
              >
                Search
              </button>
            </form>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: '1px solid #345487',
              borderRadius: 4,
              padding: '6px 10px',
              color: '#a0bcd8',
              cursor: 'pointer',
              display: 'none',
            }}
            className="md:hidden block"
            aria-label="Toggle navigation"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              {mobileMenuOpen ? (
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
              ) : (
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div style={{ borderTop: '1px solid #243e6b', paddingBottom: 16 }}>
            {showSearch && (
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, padding: '12px 0' }}>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search conditions, medications…"
                  style={{
                    flex: 1,
                    background: '#243e6b',
                    border: '1px solid #345487',
                    borderRadius: 4,
                    padding: '8px 14px',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontFamily: "'Inter', sans-serif",
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: '#3b7fc4',
                    border: 'none',
                    borderRadius: 4,
                    padding: '8px 16px',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Go
                </button>
              </form>
            )}
            {navItems.map((item) => (
              <button
                key={item.page}
                onClick={() => {
                  onNavigate(item.page);
                  setMobileMenuOpen(false);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '10px 0',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.95rem',
                  fontWeight: currentPage === item.page ? 600 : 400,
                  color: currentPage === item.page ? '#ffffff' : '#a0bcd8',
                  borderBottom: '1px solid #243e6b',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
