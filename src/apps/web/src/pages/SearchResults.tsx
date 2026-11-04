import { useState, useEffect, useMemo } from 'react';
import { conditions } from '../data/conditions';
import {
  expandedTermsFromNihSuggestions,
  searchCatalogResults,
  type SearchHit,
} from '../data/search';
import DispositionBadge from '../components/DispositionBadge';
import DisclaimerCallout from '../components/DisclaimerCallout';
import ConditionSearchInput from '../components/ConditionSearchInput';
import NihRelatedLinks from '../components/NihRelatedLinks';
import {
  collectInfoLinks,
  fetchNihConditionSuggestions,
  type NihSuggestion,
} from '../data/nih';

type Page = 'home' | 'search' | 'conditions' | 'condition-detail' | 'medication-detail' | 'how-it-works' | 'about';
type Filter = 'all' | 'conditions' | 'medications';

interface Props {
  query: string;
  onNavigate: (page: Page, id?: string) => void;
  onSearch: (q: string) => void;
}

export default function SearchResults({ query, onNavigate, onSearch }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [inputVal, setInputVal] = useState(query);
  const [nihSuggestions, setNihSuggestions] = useState<NihSuggestion[]>([]);

  useEffect(() => {
    setInputVal(query);
  }, [query]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setNihSuggestions([]);
      return;
    }
    const controller = new AbortController();
    fetchNihConditionSuggestions(q, controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        setNihSuggestions(result.suggestions);
      }
    });
    return () => controller.abort();
  }, [query]);

  const expandedTerms = useMemo(
    () => expandedTermsFromNihSuggestions(nihSuggestions),
    [nihSuggestions],
  );

  const rankedHits = useMemo(
    () => searchCatalogResults(query, expandedTerms),
    [query, expandedTerms],
  );

  const visibleHits = rankedHits.filter((hit) => {
    if (filter === 'conditions') return hit.type === 'condition';
    if (filter === 'medications') return hit.type === 'medication';
    return true;
  });

  const conditionCount = rankedHits.filter((h) => h.type === 'condition').length;
  const medicationCount = rankedHits.filter((h) => h.type === 'medication').length;
  const totalResults = rankedHits.length;
  const nihLinks = collectInfoLinks(nihSuggestions);
  const showUnmatchedNih =
    Boolean(query.trim()) &&
    totalResults === 0 &&
    nihSuggestions.length > 0;

  function handleSelectCondition(conditionId: string) {
    onNavigate('condition-detail', conditionId);
  }

  function handleSelectUnmatched(suggestion: NihSuggestion) {
    onSearch(suggestion.label);
  }

  return (
    <div style={{ minHeight: '100%', background: '#f5f7fa', minWidth: 0 }}>
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '20px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ marginBottom: 16 }}>
            <ConditionSearchInput
              value={inputVal}
              onChange={setInputVal}
              onSearch={onSearch}
              onSelectCondition={handleSelectCondition}
              onSelectUnmatched={handleSelectUnmatched}
              variant="default"
              placeholder="Search conditions, medications…"
            />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {(['all', 'conditions', 'medications'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '8px 14px',
                  minHeight: 44,
                  borderRadius: 4,
                  border: filter === f ? '1px solid #1b2d4f' : '1px solid #d1d9e6',
                  background: filter === f ? '#1b2d4f' : '#ffffff',
                  color: filter === f ? '#ffffff' : '#475569',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  textTransform: 'capitalize',
                  transition: 'all 0.15s',
                }}
              >
                {f === 'all'
                  ? `All (${totalResults})`
                  : f === 'conditions'
                    ? `Conditions (${conditionCount})`
                    : `Medications (${medicationCount})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {!query ? (
          <EmptyPrompt onNavigate={onNavigate} onSearch={onSearch} />
        ) : totalResults === 0 ? (
          <>
            <NoResults query={query} onNavigate={onNavigate} />
            <NihRelatedLinks links={nihLinks} unmatched={showUnmatchedNih || nihLinks.length > 0} query={query} />
          </>
        ) : (
          <>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.85rem',
                color: '#6b7a99',
                marginBottom: 24,
                overflowWrap: 'anywhere',
              }}
            >
              {visibleHits.length} result{visibleHits.length !== 1 ? 's' : ''} for{' '}
              <strong style={{ color: '#1b2d4f' }}>"{query}"</strong>
              {expandedTerms.length > 0 ? ' — including related medical terms' : ''}
              {' '}— ordered by relevance. Results are for conditions you already know about.
            </div>

            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}
              data-testid="search-results-list"
            >
              {visibleHits.map((hit) => (
                <ResultRow key={`${hit.type}-${hit.id}`} hit={hit} onNavigate={onNavigate} />
              ))}
            </div>

            {nihLinks.length > 0 && <NihRelatedLinks links={nihLinks} />}

            <DisclaimerCallout variant="compact" />
          </>
        )}
      </div>
    </div>
  );
}

function ResultRow({
  hit,
  onNavigate,
}: {
  hit: SearchHit;
  onNavigate: (page: Page, id?: string) => void;
}) {
  if (hit.type === 'condition' && hit.condition) {
    const c = hit.condition;
    return (
      <button
        onClick={() => onNavigate('condition-detail', c.id)}
        data-testid={`search-hit-condition-${c.id}`}
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '20px 24px',
          textAlign: 'left',
          cursor: 'pointer',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          display: 'block',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', minWidth: 0 }}>
          <div className="split-main">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: '#1b2d4f',
                }}
              >
                {c.name}
              </span>
              <TypeBadge label="Condition" tone="condition" />
              <span style={{ fontSize: '0.75rem', color: '#6b7a99', fontFamily: "'Inter', sans-serif" }}>
                {c.category}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.875rem',
                color: '#475569',
                lineHeight: 1.55,
              }}
            >
              {c.summary.slice(0, 160)}…
            </p>
          </div>
          <div style={{ flexShrink: 0 }}>
            <DispositionBadge disposition={c.disposition} size="sm" />
          </div>
        </div>
      </button>
    );
  }

  if (hit.type === 'medication' && hit.medication) {
    const m = hit.medication;
    return (
      <button
        onClick={() => onNavigate('medication-detail', m.id)}
        data-testid={`search-hit-medication-${m.id}`}
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '20px 24px',
          textAlign: 'left',
          cursor: 'pointer',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          display: 'block',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', minWidth: 0 }}>
          <div className="split-main">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: '#1b2d4f',
                }}
              >
                {m.name}
              </span>
              <TypeBadge label="Medication" tone="medication" />
              <span style={{ fontSize: '0.75rem', color: '#6b7a99', fontFamily: "'Inter', sans-serif" }}>
                {m.category}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.875rem',
                color: '#475569',
                lineHeight: 1.55,
              }}
            >
              {m.flightStatusNote.slice(0, 160)}…
            </p>
          </div>
        </div>
      </button>
    );
  }

  return null;
}

function TypeBadge({ label, tone }: { label: string; tone: 'condition' | 'medication' }) {
  const styles =
    tone === 'condition'
      ? { background: '#e8f2fb', border: '1px solid #b8d4ef', color: '#1b2d4f' }
      : { background: '#f0f4f8', border: '1px solid #cbd5e1', color: '#334155' };
  return (
    <span
      style={{
        ...styles,
        borderRadius: 3,
        padding: '1px 8px',
        fontSize: '0.7rem',
        fontWeight: 600,
        fontFamily: "'DM Sans', sans-serif",
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {label}
    </span>
  );
}

function EmptyPrompt({
  onNavigate,
  onSearch,
}: {
  onNavigate: (page: Page, id?: string) => void;
  onSearch: (q: string) => void;
}) {
  const suggestions = conditions.slice(0, 4);
  return (
    <div>
      <h2
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          fontSize: '1.1rem',
          color: '#1b2d4f',
          marginBottom: 16,
        }}
      >
        Try searching for a condition or medication
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
        {['migraine', 'depression', 'hypertension', 'sertraline', 'diabetes', 'sleep apnea'].map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => onSearch(term)}
            style={{
              background: '#ffffff',
              border: '1px solid #d1d9e6',
              borderRadius: 4,
              padding: '6px 14px',
              color: '#1b2d4f',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {term}
          </button>
        ))}
      </div>
      <h3
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          fontSize: '0.9rem',
          color: '#6b7a99',
          marginBottom: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        Featured conditions
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {suggestions.map((c) => (
          <button
            key={c.id}
            onClick={() => onNavigate('condition-detail', c.id)}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              padding: '14px 18px',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              minWidth: 0,
            }}
          >
            <div className="split-main">
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: '#1b2d4f', fontSize: '0.95rem' }}>
                {c.name}
              </span>
              <span style={{ marginLeft: 10, fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#6b7a99' }}>
                {c.category}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function NoResults({ query, onNavigate }: { query: string; onNavigate: (page: Page, id?: string) => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div
        style={{
          width: 56,
          height: 56,
          background: '#f0f4f8',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="8" stroke="#6b7a99" strokeWidth="1.5" />
          <path d="m21 21-4.35-4.35" stroke="#6b7a99" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8 11h6M11 8v6" stroke="#6b7a99" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <h3
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 700,
          fontSize: '1.15rem',
          color: '#1b2d4f',
          marginBottom: 8,
          overflowWrap: 'anywhere',
        }}
      >
        No results for "{query}"
      </h3>
      <p style={{ fontFamily: "'Inter', sans-serif", color: '#6b7a99', fontSize: '0.9rem', marginBottom: 24, lineHeight: 1.55 }}>
        This site only includes conditions and medications that appear in the FAA guide materials loaded here. Try a different word or browse all conditions.
      </p>
      <button
        onClick={() => onNavigate('conditions')}
        style={{
          background: '#1b2d4f',
          border: 'none',
          borderRadius: 6,
          padding: '10px 24px',
          color: '#ffffff',
          fontSize: '0.9rem',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Browse all conditions
      </button>
    </div>
  );
}
