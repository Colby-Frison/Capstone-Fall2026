interface LinkItem {
  url: string;
  title: string;
}

interface Props {
  links: LinkItem[];
  /** When true, show stronger “no FAA match” framing. */
  unmatched?: boolean;
  query?: string;
}

/**
 * Clearly labeled NIH educational links — separate from FAA disposition content.
 */
export default function NihRelatedLinks({ links, unmatched = false, query }: Props) {
  if (!links.length && !unmatched) return null;

  return (
    <aside
      aria-label="Related educational links from NIH"
      style={{
        marginTop: 24,
        marginBottom: 24,
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderLeft: '4px solid #64748b',
        borderRadius: 8,
        padding: '18px 20px',
      }}
    >
      {unmatched && (
        <p
          style={{
            margin: '0 0 12px',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.875rem',
            color: '#475569',
            lineHeight: 1.55,
          }}
        >
          {query ? (
            <>
              No FAA guidance in this catalog matched{' '}
              <strong style={{ color: '#1b2d4f' }}>"{query}"</strong> as a certification
              condition. NIH educational links below are for terminology only — they are not
              FAA medical certification outcomes.
            </>
          ) : (
            <>
              No FAA guidance in this catalog matched that common medical name. NIH educational
              links below are for terminology only — they are not FAA medical certification
              outcomes.
            </>
          )}
        </p>
      )}

      {links.length > 0 && (
        <>
          <h3
            style={{
              margin: '0 0 8px',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: '0.85rem',
              color: '#334155',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Related educational links (NIH)
          </h3>
          <p
            style={{
              margin: '0 0 12px',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.8rem',
              color: '#64748b',
              lineHeight: 1.5,
            }}
          >
            Patient-education material from NIH sources. Not a substitute for the FAA AME Guide
            content on this site.
          </p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {links.map((link) => (
              <li key={link.url} style={{ marginBottom: 6 }}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.875rem',
                    color: '#1b4f8a',
                  }}
                >
                  {link.title}
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: 6 }}>
                    (opens educational resource)
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
