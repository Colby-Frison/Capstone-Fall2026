import { useEffect, useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import SearchResults from './pages/SearchResults';
import ConditionDetail from './pages/ConditionDetail';
import MedicationDetail from './pages/MedicationDetail';
import Browse from './pages/Browse';
import HowItWorks from './pages/HowItWorks';
import About from './pages/About';

type Page =
  | 'home'
  | 'search'
  | 'conditions'
  | 'condition-detail'
  | 'medication-detail'
  | 'how-it-works'
  | 'about';

interface NavState {
  page: Page;
  id?: string;
  query?: string;
}

function readNavFromLocation(): NavState {
  const params = new URLSearchParams(window.location.search);
  const condition = params.get('condition');
  if (condition) return { page: 'condition-detail', id: condition };
  return { page: 'home' };
}

function writeNavToLocation(next: NavState, replace = false) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  if (next.page === 'condition-detail' && next.id) {
    url.searchParams.set('condition', next.id);
  }
  const method = replace ? 'replaceState' : 'pushState';
  window.history[method](next, '', `${url.pathname}${url.search}`);
}

export default function App() {
  const [nav, setNav] = useState<NavState>(readNavFromLocation);

  useEffect(() => {
    writeNavToLocation(nav, true);
    function onPopState(event: PopStateEvent) {
      const state = event.state as NavState | null;
      setNav(state?.page ? state : readNavFromLocation());
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function navigate(page: Page, idOrQuery?: string) {
    const next: NavState =
      page === 'search'
        ? { page: 'search', query: idOrQuery ?? '' }
        : page === 'condition-detail' || page === 'medication-detail'
          ? { page, id: idOrQuery }
          : { page };
    setNav(next);
    writeNavToLocation(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSearch(query: string) {
    const next: NavState = { page: 'search', query };
    setNav(next);
    writeNavToLocation(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const showHeader = nav.page !== 'home';

  return (
    <div className="app-shell">
      {nav.page === 'home' ? (
        <HomeWithHeader onNavigate={navigate} />
      ) : (
        <>
          <Header
            currentPage={nav.page}
            onNavigate={navigate}
            searchQuery={nav.query}
          />
          <main className="app-main">
            {nav.page === 'search' && (
              <SearchResults
                query={nav.query ?? ''}
                onNavigate={navigate}
                onSearch={handleSearch}
              />
            )}
            {nav.page === 'condition-detail' && nav.id && (
              <ConditionDetail conditionId={nav.id} onNavigate={navigate} />
            )}
            {nav.page === 'medication-detail' && nav.id && (
              <MedicationDetail medicationId={nav.id} onNavigate={navigate} />
            )}
            {nav.page === 'conditions' && <Browse onNavigate={navigate} />}
            {nav.page === 'how-it-works' && <HowItWorks onNavigate={navigate} />}
            {nav.page === 'about' && <About onNavigate={navigate} />}
          </main>
          <Footer onNavigate={navigate} />
        </>
      )}
    </div>
  );
}

function HomeWithHeader({ onNavigate }: { onNavigate: (page: Page, id?: string) => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navItems: { label: string; page: Page }[] = [
    { label: 'Search', page: 'search' },
    { label: 'Conditions', page: 'conditions' },
    { label: 'How This Works', page: 'how-it-works' },
    { label: 'About', page: 'about' },
  ];

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileMenuOpen]);

  return (
    <div className="app-shell">
      <header className="site-header" style={{ background: '#1b2d4f', borderBottom: '1px solid #243e6b', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="prototype-banner" style={{ background: '#0f1e35', borderBottom: '1px solid #243e6b', textAlign: 'center' }}>
          <span style={{ color: '#7fa8d0', fontSize: '0.72rem', letterSpacing: '0.04em', fontFamily: "'DM Sans', sans-serif" }}>
            Learning tool · Based on the FAA medical examiner guide · Not an official FAA site · Not medical or legal advice
          </span>
        </div>
        <div className="header-inner">
          <div className="header-bar">
            <div className="wordmark" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M4 22 L16 8 L28 22" stroke="#3b7fc4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M8 22 L16 12 L24 22" stroke="#7fa8d0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <line x1="4" y1="24" x2="28" y2="24" stroke="#3b7fc4" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#ffffff', lineHeight: 1.2, letterSpacing: '-0.01em' }}>Pilots Guide</div>
                <div className="wordmark-kicker" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: '0.7rem', color: '#7fa8d0', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Medical Certification</div>
              </div>
            </div>
            <nav className="desktop-nav" aria-label="Primary">
              {navItems.map((item) => (
                <button
                  key={item.page}
                  onClick={() => onNavigate(item.page)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: 4, fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem', fontWeight: 400, color: '#a0bcd8', borderBottom: '2px solid transparent', transition: 'color 0.15s' }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="menu-toggle"
              aria-label="Toggle navigation"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav"
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
          {mobileMenuOpen && (
            <div id="mobile-nav" className="mobile-menu">
              {navItems.map((item) => (
                <button
                  key={item.page}
                  className="mobile-nav-link"
                  onClick={() => { onNavigate(item.page); setMobileMenuOpen(false); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0', fontFamily: "'DM Sans', sans-serif", fontSize: '0.95rem', color: '#a0bcd8', borderBottom: '1px solid #243e6b' }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
      <main className="app-main">
        <Home onNavigate={onNavigate} />
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
