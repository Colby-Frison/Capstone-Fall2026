type Page = 'home' | 'search' | 'conditions' | 'condition-detail' | 'medication-detail' | 'how-it-works' | 'about';

interface Props {
  onNavigate: (page: Page) => void;
}

export default function About({ onNavigate }: Props) {
  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
      <div style={{ background: '#1b2d4f', padding: '48px 24px 40px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h1
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(1.6rem, 3vw, 2.25rem)',
              color: '#ffffff',
              margin: '0 0 10px',
              letterSpacing: '-0.02em',
            }}
          >
            About & Disclaimer
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: '#a0bcd8', margin: 0, lineHeight: 1.55 }}>
            CS-4273 Capstone Project — Group F · Fall 2026
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Project statement */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '28px 32px' }}>
          <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#1b2d4f', margin: '0 0 14px' }}>
            About this project
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.925rem', color: '#475569', lineHeight: 1.65, margin: '0 0 14px' }}>
            <strong>Pilots Guide to Medical Certification</strong> is an educational prototype developed as a Computer Science Capstone project (CS-4273) at the University of Oklahoma, Fall 2026 (Group F). The project is mentored by Micheal Coffman and Rebecca Mauldin.
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.925rem', color: '#475569', lineHeight: 1.65, margin: '0 0 14px' }}>
            The goal of this prototype is to make FAA medical certification guidance easier for pilots to research and understand before an Aviation Medical Examiner (AME) appointment. Content is drawn from the FAA Guide for Aviation Medical Examiners and related OneGuide materials, parsed into structured form for searchability.
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.925rem', color: '#475569', lineHeight: 1.65, margin: 0 }}>
            The project continues research from Fall 2025 and Spring 2026 Capstone teams and is designed to be suitable for eventual review by the FAA Office of Communication.
          </p>
        </div>

        {/* Official disclaimer */}
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderLeft: '4px solid #dc2626',
            borderRadius: 8,
            padding: '24px 28px',
          }}
        >
          <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#7f1d1d', margin: '0 0 12px' }}>
            Official Disclaimer
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: '#7f1d1d', lineHeight: 1.65, margin: '0 0 10px' }}>
            <strong>This is an educational Capstone prototype. It is not an official FAA product and does not provide medical, legal, or certification advice.</strong>
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#991b1b', lineHeight: 1.65, margin: '0 0 10px' }}>
            Published guidance may change; content must be verified against current FAA materials and mentor-approved sources. The tool addresses known conditions only as represented in source documents and does not account for findings discovered during an AME examination.
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#991b1b', lineHeight: 1.65, margin: 0 }}>
            Individual outcomes remain the responsibility of the applicant, their physicians, the AME, and the FAA.
          </p>
        </div>

        {/* Team */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '28px 32px' }}>
          <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1b2d4f', margin: '0 0 16px' }}>
            Project information
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 24px' }}>
            {[
              ['Course', 'CS-4273 Computer Science Capstone (Fall 2026)'],
              ['Group', 'Group F'],
              ['Team', 'James Cunningham, Colby Frison, Shone George Kutty Renjan, Patrick Ha, Alan Vo'],
              ['Mentors', 'Micheal Coffman, Rebecca Mauldin'],
              ['Date', 'Fall 2026'],
            ].map(([label, value]) => (
              <>
                <div key={`l-${label}`} style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.825rem', color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '0.06em', paddingTop: 2 }}>
                  {label}
                </div>
                <div key={`v-${label}`} style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#334155', lineHeight: 1.5 }}>
                  {value}
                </div>
              </>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '28px 32px' }}>
          <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1b2d4f', margin: '0 0 12px' }}>
            Privacy
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: '#475569', lineHeight: 1.65, margin: 0 }}>
            This prototype does not collect, store, or transmit any personally identifiable information (PII). No medical history is stored. No user accounts are required or created. Checklist interactions are visual only and exist solely in your current browser session.
          </p>
        </div>

        {/* Sources */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '28px 32px' }}>
          <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1b2d4f', margin: '0 0 14px' }}>
            Source references
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              'FAA Medical Certification — faa.gov/pilots/medical_certification',
              'FAA Guide for Aviation Medical Examiners (AME Guide) — faa.gov/ame_guide',
              'MedXPress Application System — medxpress.faa.gov',
              'AOPA Pilot Flight Medical Preflight (December 2025)',
              'FAA FAQ — What does "pre-flight your exam" mean?',
            ].map((ref, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b7fc4', flexShrink: 0, marginTop: 7 }} />
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                  {ref}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <button
            onClick={() => onNavigate('how-it-works')}
            style={{
              background: 'none',
              border: '1px solid #1b2d4f',
              borderRadius: 6,
              padding: '10px 24px',
              color: '#1b2d4f',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              marginRight: 12,
            }}
          >
            How this works
          </button>
          <button
            onClick={() => onNavigate('search')}
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
            Start searching
          </button>
        </div>
      </div>
    </div>
  );
}
