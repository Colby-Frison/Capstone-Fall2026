import { useState } from 'react';
import { conditions, categories } from '../data/conditions';
import DispositionBadge from '../components/DispositionBadge';

type Page = 'home' | 'search' | 'conditions' | 'condition-detail' | 'medication-detail' | 'how-it-works' | 'about';

interface Props {
  onNavigate: (page: Page, id?: string) => void;
}

export default function Browse({ onNavigate }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [browseQuery, setBrowseQuery] = useState('');

  const allCategories = ['All', ...categories];

  const filtered = conditions.filter((c) => {
    const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
    const matchesQuery =
      !browseQuery ||
      c.name.toLowerCase().includes(browseQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(browseQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
      {/* Page header */}
      <div style={{ background: '#1b2d4f', padding: '40px 24px 36px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h1
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              color: '#ffffff',
              margin: '0 0 10px',
              letterSpacing: '-0.02em',
            }}
          >
            Browse Conditions
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: '#a0bcd8', margin: '0 0 24px' }}>
            {conditions.length} conditions across {categories.length} categories — with published disposition guidance
          </p>

          {/* Search within browse */}
          <input
            type="search"
            value={browseQuery}
            onChange={(e) => setBrowseQuery(e.target.value)}
            placeholder="Filter within conditions…"
            style={{
              background: '#243e6b',
              border: '1px solid #345487',
              borderRadius: 6,
              padding: '10px 18px',
              color: '#ffffff',
              fontSize: '0.9rem',
              width: '100%',
              maxWidth: 400,
              fontFamily: "'Inter', sans-serif",
              outline: 'none',
            }}
          />
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 24px' }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {/* Category sidebar */}
          <div style={{ width: 200, flexShrink: 0 }}>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700,
                fontSize: '0.72rem',
                color: '#6b7a99',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 10,
                paddingLeft: 4,
              }}
            >
              Categories
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {allCategories.map((cat) => {
                const count = cat === 'All' ? conditions.length : conditions.filter((c) => c.category === cat).length;
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderRadius: 5,
                      border: 'none',
                      background: isActive ? '#1b2d4f' : 'transparent',
                      color: isActive ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 400,
                      textAlign: 'left',
                      transition: 'background 0.12s, color 0.12s',
                    }}
                  >
                    <span>{cat}</span>
                    <span
                      style={{
                        background: isActive ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                        borderRadius: 10,
                        padding: '1px 7px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: isActive ? '#ffffff' : '#6b7a99',
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Condition list */}
          <div style={{ flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <p style={{ fontFamily: "'Inter', sans-serif", color: '#6b7a99' }}>No conditions match your filter.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onNavigate('condition-detail', c.id)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '18px 22px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16,
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: 600,
                            fontSize: '0.975rem',
                            color: '#1b2d4f',
                          }}
                        >
                          {c.name}
                        </span>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.775rem', color: '#6b7a99' }}>
                          {c.category}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.825rem',
                          color: '#64748b',
                          lineHeight: 1.5,
                        }}
                      >
                        {c.subConditions.length} sub-condition{c.subConditions.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <DispositionBadge disposition={c.disposition} size="sm" />
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M6 4l4 4-4 4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
