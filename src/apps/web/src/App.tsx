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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {nav.page === 'home' ? (
        <HomeWithHeader onNavigate={navigate} />
      ) : (
        <>
          <Header
            currentPage={nav.page}
            onNavigate={navigate}
            searchQuery={nav.query}
          />
          <main style={{ flex: 1 }}>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Minimal header on home — just prototype banner + nav, no search bar */}
      <header style={{ background: '#1b2d4f', borderBottom: '1px solid #243e6b', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ background: '#0f1e35', borderBottom: '1px solid #243e6b', padding: '5px 24px', textAlign: 'center' }}>
          <span style={{ color: '#7fa8d0', fontSize: '0.72rem', letterSpacing: '0.04em', fontFamily: "'DM Sans', sans-serif" }}>
            Learning tool · Based on the FAA medical examiner guide · Not an official FAA site · Not medical or legal advice
          </span>
        </div>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 64, gap: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M4 22 L16 8 L28 22" stroke="#3b7fc4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M8 22 L16 12 L24 22" stroke="#7fa8d0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <line x1="4" y1="24" x2="28" y2="24" stroke="#3b7fc4" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#ffffff', lineHeight: 1.2, letterSpacing: '-0.01em' }}>Pilots Guide</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: '0.7rem', color: '#7fa8d0', lineHeight: 1, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Medical Certification</div>
            </div>
          </div>
          <nav style={{ display: 'flex', gap: 4, flex: 1, alignItems: 'center' }} className="hidden md:flex">
            {[
              { label: 'Search', page: 'search' as Page },
              { label: 'Conditions', page: 'conditions' as Page },
              { label: 'How This Works', page: 'how-it-works' as Page },
              { label: 'About', page: 'about' as Page },
            ].map((item) => (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: 4, fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem', fontWeight: 400, color: '#a0bcd8', borderBottom: '2px solid transparent', transition: 'color 0.15s' }}
              >
                {item.label}
              </button>
            ))}
          </nav>
          {/* Mobile nav toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ marginLeft: 'auto', background: 'none', border: '1px solid #345487', borderRadius: 4, padding: '6px 10px', color: '#a0bcd8', cursor: 'pointer', display: 'none' }}
            className="md:hidden block"
            aria-label="Toggle navigation"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
            </svg>
          </button>
        </div>
        {mobileMenuOpen && (
          <div style={{ background: '#1b2d4f', borderTop: '1px solid #243e6b', padding: '8px 24px 16px' }}>
            {[
              { label: 'Search', page: 'search' as Page },
              { label: 'Conditions', page: 'conditions' as Page },
              { label: 'How This Works', page: 'how-it-works' as Page },
              { label: 'About', page: 'about' as Page },
            ].map((item) => (
              <button key={item.page} onClick={() => { onNavigate(item.page); setMobileMenuOpen(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0', fontFamily: "'DM Sans', sans-serif", fontSize: '0.95rem', color: '#a0bcd8', borderBottom: '1px solid #243e6b' }}>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>
      <main style={{ flex: 1 }}>
        <Home onNavigate={onNavigate} />
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
