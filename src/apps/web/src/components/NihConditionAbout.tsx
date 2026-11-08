import type { NihConditionIdentity } from '../data/types';
import NihRelatedLinks from './NihRelatedLinks';
import { resolveNihAboutMode } from './nihAboutMode';

interface Props {
  nih?: NihConditionIdentity;
  conditionName: string;
  onBrowse: () => void;
  onSearch: () => void;
}

/**
 * Educational NIH context for a condition detail page.
 * Distinct from FAA disposition / paperwork sections — never overrides certification outcomes.
 */
export default function NihConditionAbout({
  nih,
  conditionName,
  onBrowse,
  onSearch,
}: Props) {
  const mode = resolveNihAboutMode(nih);

  if (mode === 'unmapped') {
    return (
      <section
        aria-labelledby="nih-about-heading"
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderLeft: '4px solid #94a3b8',
          borderRadius: 10,
          padding: '20px 24px',
        }}
      >
        <h2
          id="nih-about-heading"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: '1.05rem',
            color: '#1b2d4f',
            margin: 0,
          }}
        >
          About this condition
        </h2>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.875rem',
            color: '#475569',
            lineHeight: 1.6,
            margin: '10px 0 0',
          }}
        >
          No NIH educational summary is mapped for{' '}
          <strong style={{ color: '#1b2d4f' }}>{conditionName}</strong> in this
          catalog. FAA guide content below remains the source for certification
          pathways. You can search or browse for a related name if you used a
          different medical term.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
          <button
            type="button"
            onClick={onSearch}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #1b2d4f',
              background: '#1b2d4f',
              color: '#fff',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            Search conditions
          </button>
          <button
            type="button"
            onClick={onBrowse}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#1b2d4f',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            Browse catalog
          </button>
        </div>
      </section>
    );
  }

  const displayName =
    nih?.consumerName?.trim() || nih?.primaryName?.trim() || conditionName;
  const synonyms = (nih?.synonyms ?? []).filter(Boolean).slice(0, 8);
  const icd10 = (nih?.icd10 ?? []).filter(Boolean).slice(0, 6);
  const links = nih?.infoLinks ?? [];
  const lowConfidence = nih?.mappingStatus === 'low-confidence';

  return (
    <section
      aria-labelledby="nih-about-heading"
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderLeft: '4px solid #64748b',
        borderRadius: 10,
        padding: '20px 24px 8px',
      }}
    >
      <h2
        id="nih-about-heading"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 700,
          fontSize: '1.05rem',
          color: '#1b2d4f',
          margin: 0,
        }}
      >
        About this condition
      </h2>
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.8rem',
          color: '#64748b',
          lineHeight: 1.5,
          margin: '6px 0 0',
        }}
      >
        Plain-language names and educational links from NIH sources. This is not
        FAA medical certification advice — outcomes below come only from the
        published guide.
      </p>

      {lowConfidence && (
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.8rem',
            color: '#92400e',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 6,
            padding: '8px 12px',
            margin: '12px 0 0',
            lineHeight: 1.5,
          }}
        >
          This NIH match is lower confidence. Confirm the name with your medical
          examiner if it does not match how you describe your condition.
        </p>
      )}

      <dl
        style={{
          margin: '16px 0 0',
          display: 'grid',
          gap: 12,
        }}
      >
        <div>
          <dt
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: '0.75rem',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 4,
            }}
          >
            Common medical name
          </dt>
          <dd
            style={{
              margin: 0,
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.95rem',
              color: '#1b2d4f',
              fontWeight: 500,
            }}
          >
            {displayName}
          </dd>
        </div>

        {nih?.primaryName?.trim() &&
          nih.primaryName.trim().toLowerCase() !== displayName.toLowerCase() && (
            <div>
              <dt
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 4,
                }}
              >
                Primary clinical name
              </dt>
              <dd
                style={{
                  margin: 0,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.9rem',
                  color: '#334155',
                }}
              >
                {nih.primaryName}
              </dd>
            </div>
          )}

        {synonyms.length > 0 && (
          <div>
            <dt
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: '0.75rem',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 6,
              }}
            >
              Also known as
            </dt>
            <dd style={{ margin: 0 }}>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                }}
              >
                {synonyms.map((syn) => (
                  <li
                    key={syn}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      borderRadius: 999,
                      padding: '3px 10px',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.78rem',
                      color: '#334155',
                    }}
                  >
                    {syn}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}

        {icd10.length > 0 && (
          <div>
            <dt
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: '0.75rem',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 4,
              }}
            >
              ICD-10 codes
            </dt>
            <dd
              style={{
                margin: 0,
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.85rem',
                color: '#475569',
              }}
            >
              {icd10.join(', ')}
            </dd>
          </div>
        )}
      </dl>

      <NihRelatedLinks links={links} />
    </section>
  );
}
