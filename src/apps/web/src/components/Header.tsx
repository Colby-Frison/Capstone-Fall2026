import { useEffect, useState } from 'react';
import ConditionSearchInput from './ConditionSearchInput';
import type { NihSuggestion } from '../data/nih';

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

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  function handleSearch(q: string) {
    if (q.trim()) {
      onNavigate('search', q.trim());
      setMobileMenuOpen(false);
    }
  }

  function handleSelectCondition(conditionId: string, _suggestion: NihSuggestion) {
    onNavigate('condition-detail', conditionId);
    setMobileMenuOpen(false);
  }

  function handleSelectUnmatched(suggestion: NihSuggestion) {
    onNavigate('search', suggestion.label);
    setMobileMenuOpen(false);
  }

  const showSearch = currentPage !== 'home';

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileMenuOpen]);

  return (
    <header
      className="site-header"
      style={{
        background: '#1b2d4f',
        borderBottom: '1px solid #243e6b',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        className="prototype-banner"
        style={{
          background: '#0f1e35',
          borderBottom: '1px solid #243e6b',
          textAlign: 'center',
        }}
      >
        <span style={{ color: '#7fa8d0', fontSize: '0.72rem', letterSpacing: '0.04em', fontFamily: "'DM Sans', sans-serif" }}>
          Learning tool · Based on the FAA medical examiner guide · Not an official FAA site · Not medical or legal advice
        </span>
      </div>

      <div className="header-inner">
        <div className="header-bar">
          {/* Wordmark */}
          <button
            className="wordmark"
            onClick={() => onNavigate('home')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              minWidth: 0,
            }}
          >
            {/* Abstract wing mark */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
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
                className="wordmark-kicker"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 400,
                  fontSize: '0.7rem',
                  color: '#7fa8d0',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Medical Certification
              </div>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="desktop-nav" aria-label="Primary">
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
            <div className="desktop-search">
              <ConditionSearchInput
                value={query}
                onChange={setQuery}
                onSearch={handleSearch}
                onSelectCondition={handleSelectCondition}
                onSelectUnmatched={handleSelectUnmatched}
                variant="header"
                placeholder="Search conditions, medications…"
              />
            </div>
          )}

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="menu-toggle"
            aria-label="Toggle navigation"
            aria-expanded={mobileMenuOpen}
            aria-controls="site-menu"
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
          <div id="site-menu" className="mobile-menu">
            {showSearch && (
              <div style={{ padding: '12px 0' }}>
                <ConditionSearchInput
                  value={query}
                  onChange={setQuery}
                  onSearch={handleSearch}
                  onSelectCondition={handleSelectCondition}
                  onSelectUnmatched={handleSelectUnmatched}
                  variant="header"
                  submitLabel="Go"
                  placeholder="Search conditions, medications…"
                  inputStyle={{ width: '100%', flex: 1 }}
                />
              </div>
            )}
            {navItems.map((item) => (
              <button
                key={item.page}
                className="mobile-nav-link"
                onClick={() => {
                  onNavigate(item.page);
                  setMobileMenuOpen(false);
                }}
                style={{
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
