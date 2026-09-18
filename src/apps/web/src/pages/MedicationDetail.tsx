import { getMedicationById } from '../data/medications';
import { getConditionById } from '../data/conditions';
import DisclaimerCallout from '../components/DisclaimerCallout';

type Page = 'home' | 'search' | 'conditions' | 'condition-detail' | 'medication-detail' | 'how-it-works' | 'about';

interface Props {
  medicationId: string;
  onNavigate: (page: Page, id?: string) => void;
}

export default function MedicationDetail({ medicationId, onNavigate }: Props) {
  const med = getMedicationById(medicationId);

  if (!med) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ fontFamily: "'Inter', sans-serif", color: '#6b7a99' }}>Medication not found.</p>
        <button onClick={() => onNavigate('search')} style={{ marginTop: 16, padding: '8px 20px', borderRadius: 6, border: 'none', background: '#1b2d4f', color: '#fff', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
          Return to search
        </button>
      </div>
    );
  }

  const relatedConditions = med.relatedConditionIds.map(getConditionById).filter(Boolean);

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
      {/* Breadcrumb */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '12px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <nav style={{ display: 'flex', gap: 6, alignItems: 'center', fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#6b7a99' }}>
            <button onClick={() => onNavigate('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b7fc4', fontSize: '0.8rem', padding: 0, fontFamily: "'Inter', sans-serif" }}>Home</button>
            <span>›</span>
            <button onClick={() => onNavigate('search')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b7fc4', fontSize: '0.8rem', padding: 0, fontFamily: "'Inter', sans-serif" }}>Medications</button>
            <span>›</span>
            <span style={{ color: '#1b2d4f', fontWeight: 500 }}>{med.name}</span>
          </nav>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '28px 32px' }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ background: '#f0f4f8', border: '1px solid #cbd5e1', borderRadius: 3, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700, color: '#334155', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Medication
            </span>
          </div>
          <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 'clamp(1.6rem, 3vw, 2.25rem)', color: '#1b2d4f', margin: '8px 0 4px', letterSpacing: '-0.02em' }}>
            {med.name}
          </h1>
          {med.genericName && (
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#6b7a99', marginBottom: 12 }}>
              {med.genericName}
            </div>
          )}
          <div style={{ display: 'inline-flex', background: '#e8f2fb', border: '1px solid #b8d4ef', borderRadius: 4, padding: '4px 12px', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: '0.8rem', color: '#1b2d4f' }}>
            {med.category}
          </div>
        </div>

        {/* Flight status */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ background: '#1b2d4f', padding: '16px 24px' }}>
            <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#ffffff', margin: 0 }}>
              Flight Status & Certification Impact
            </h2>
          </div>
          <div style={{ padding: '24px 28px' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.8rem', color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                How it may affect flight status
              </div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.925rem', color: '#334155', lineHeight: 1.65, margin: 0 }}>
                {med.flightStatusNote}
              </p>
            </div>
            <div style={{ borderTop: '1px solid #f0f4f8', paddingTop: 20 }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.8rem', color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Certification pathway impact
              </div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.925rem', color: '#334155', lineHeight: 1.65, margin: 0 }}>
                {med.certificationImpact}
              </p>
            </div>
          </div>
        </div>

        {/* What to discuss with AME */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '24px 28px' }}>
          <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#1b2d4f', margin: '0 0 12px' }}>
            What to Discuss with Your AME and Physician
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: '#475569', lineHeight: 1.65, margin: 0 }}>
            {med.ameDiscussion}
          </p>
        </div>

        {/* Related conditions */}
        {relatedConditions.length > 0 && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '24px 28px' }}>
            <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#1b2d4f', margin: '0 0 14px' }}>
              Related Conditions
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {relatedConditions.map((c) => c && (
                <button
                  key={c.id}
                  onClick={() => onNavigate('condition-detail', c.id)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    padding: '12px 16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: '#1b2d4f', fontSize: '0.9rem' }}>{c.name}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.775rem', color: '#6b7a99', marginTop: 2 }}>{c.category}</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4l4 4-4 4" stroke="#3b7fc4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Source + disclaimer */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '18px 22px' }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.75rem', color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Source Attribution
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#334155', lineHeight: 1.55 }}>
              <div><strong>{med.source}</strong></div>
              <div style={{ color: '#6b7a99', marginTop: 2 }}>{med.sourceSection}</div>
            </div>
          </div>
          <DisclaimerCallout variant="compact" />
        </div>
      </div>
    </div>
  );
}
