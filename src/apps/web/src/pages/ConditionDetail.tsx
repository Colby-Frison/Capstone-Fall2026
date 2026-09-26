import { useEffect, useState } from 'react';
import { getConditionById } from '../data/conditions';
import { getMedicationById } from '../data/medications';
import type { SubCondition } from '../data/types';
import DispositionBadge, { DispositionBlock } from '../components/DispositionBadge';
import DisclaimerCallout from '../components/DisclaimerCallout';
import { DocumentChecklist } from '../components/DocumentChecklist';

type Page = 'home' | 'search' | 'conditions' | 'condition-detail' | 'medication-detail' | 'how-it-works' | 'about';

interface Props {
  conditionId: string;
  onNavigate: (page: Page, id?: string) => void;
}

export default function ConditionDetail({ conditionId, onNavigate }: Props) {
  const condition = getConditionById(conditionId);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(
    condition?.subConditions[0]?.id ?? null,
  );
  const [checkedDocs, setCheckedDocs] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedSubId(condition?.subConditions[0]?.id ?? null);
    setCheckedDocs(new Set());
  }, [conditionId, condition]);

  useEffect(() => {
    setCheckedDocs(new Set());
  }, [selectedSubId]);

  if (!condition) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ fontFamily: "'Inter', sans-serif", color: '#6b7a99' }}>Condition not found.</p>
        <button onClick={() => onNavigate('conditions')} style={{ marginTop: 16, padding: '8px 20px', borderRadius: 6, border: '1px solid #1b2d4f', background: '#1b2d4f', color: '#fff', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
          Browse conditions
        </button>
      </div>
    );
  }

  const selectedSub: SubCondition | null =
    condition.subConditions.find((s) => s.id === selectedSubId) ??
    condition.subConditions[0] ??
    null;
  const activeDisposition = selectedSub ? selectedSub.disposition : condition.disposition;
  const activeDocuments = selectedSub?.documents ?? [];
  const activeCertNote = selectedSub ? selectedSub.certificationNote : condition.certificationNote;
  const guidanceNote =
    activeCertNote &&
    !/^See the published FAA guidance for this pathway\.?$/i.test(activeCertNote.trim())
      ? activeCertNote
      : '';
  const activeMedNotes =
    (selectedSub?.medicationNotes?.length
      ? selectedSub.medicationNotes
      : condition.medicationNotes) ?? [];
  const activeTimeConstraints = selectedSub?.timeConstraints ?? [];
  const activeClasses = selectedSub?.certificateClasses ?? [];
  const activeWarnings = selectedSub?.warnings ?? [];
  const activeAmeReview = selectedSub?.ameReviewNotes ?? [];
  const hasCrossRef = activeWarnings.includes('cross_reference');

  function toggleDoc(id: string) {
    setCheckedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const relatedMeds = condition.relatedMedicationIds.map(getMedicationById).filter(Boolean);

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
      {/* Breadcrumb */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '12px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <nav style={{ display: 'flex', gap: 6, alignItems: 'center', fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#6b7a99' }}>
            <button onClick={() => onNavigate('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b7fc4', fontSize: '0.8rem', padding: 0, fontFamily: "'Inter', sans-serif" }}>Home</button>
            <span>›</span>
            <button onClick={() => onNavigate('conditions')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b7fc4', fontSize: '0.8rem', padding: 0, fontFamily: "'Inter', sans-serif" }}>Conditions</button>
            <span>›</span>
            <button onClick={() => onNavigate('conditions')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b7fc4', fontSize: '0.8rem', padding: 0, fontFamily: "'Inter', sans-serif" }}>{condition.category}</button>
            <span>›</span>
            <span style={{ color: '#1b2d4f', fontWeight: 500 }}>{condition.name}</span>
          </nav>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        {/* A. Condition header */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '32px 36px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ background: '#e8f2fb', border: '1px solid #b8d4ef', borderRadius: 3, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700, color: '#1b2d4f', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {condition.category}
                </span>
                <DispositionBadge disposition={activeDisposition} size="sm" />
              </div>
              <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', color: '#1b2d4f', margin: 0, letterSpacing: '-0.02em' }}>
                {condition.name}
              </h1>
            </div>
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.975rem', color: '#475569', lineHeight: 1.65, margin: 0 }}>
            {condition.summary}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>

          {condition.subConditions.length > 0 && (
            <section style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid #e2e8f0' }}>
                <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: '#1b2d4f', margin: 0 }}>
                  Pathways
                </h2>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.825rem', color: '#475569', margin: '6px 0 0', lineHeight: 1.5 }}>
                  Each row is a published presentation of this condition. The disposition and the materials list below are for the selected row.
                </p>
              </div>
              <div style={{ padding: '12px 20px' }}>
                {condition.subConditions.map((sub, idx) => {
                  const isSelected = selectedSubId === sub.id;
                  return (
                    <div key={sub.id} style={{ borderBottom: idx < condition.subConditions.length - 1 ? '1px solid #f0f4f8' : 'none' }}>
                      <button
                        onClick={() => setSelectedSubId(sub.id)}
                        style={{
                          width: '100%',
                          background: isSelected ? '#f5f7fa' : 'transparent',
                          border: 'none',
                          borderRadius: 6,
                          padding: '14px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          textAlign: 'left',
                          transition: 'background 0.12s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: isSelected ? 700 : 500, fontSize: '0.95rem', color: isSelected ? '#1b2d4f' : '#334155' }}>
                            {sub.name}
                          </span>
                        </div>
                        <DispositionBadge disposition={sub.disposition} size="sm" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '20px 28px 0' }}>
              <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: '#1b2d4f', margin: 0 }}>
                Disposition
              </h2>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.825rem', color: '#475569', margin: '6px 0 0', lineHeight: 1.5 }}>
                {selectedSub
                  ? `Published outcome for ${selectedSub.name}. The label below is the guidance status. Supporting limits, certificate classes, and the source instruction follow it.`
                  : 'Published outcome for this condition.'}
              </p>
            </div>

            <div style={{ padding: '20px 28px 24px' }}>
              <DispositionBlock disposition={activeDisposition} />

              {activeTimeConstraints.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {activeTimeConstraints.map((constraint) => (
                    <span
                      key={constraint}
                      style={{
                        background: '#eef2ff',
                        border: '1px solid #c7d2fe',
                        borderRadius: 999,
                        padding: '4px 10px',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.75rem',
                        color: '#3730a3',
                      }}
                    >
                      {constraint}
                    </span>
                  ))}
                </div>
              )}

              {activeClasses.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {activeClasses.map((cls) => (
                    <span
                      key={cls}
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: 999,
                        padding: '4px 10px',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.75rem',
                        color: '#334155',
                      }}
                    >
                      {/^all$/i.test(cls) ? 'All classes' : cls}
                    </span>
                  ))}
                </div>
              )}

              {hasCrossRef ? (
                <div style={{ marginTop: 20, padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6 }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#1e3a8a', margin: 0, lineHeight: 1.6 }}>
                    <strong>Related guidance.</strong>{' '}
                    {guidanceNote || 'This pathway points to another protocol or disposition table. Confirm the referenced section with your AME.'}
                  </p>
                </div>
              ) : guidanceNote ? (
                <div style={{ marginTop: 20, padding: '18px 20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.85rem', color: '#1b2d4f', marginBottom: 8 }}>
                    Source instruction
                  </div>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#475569', lineHeight: 1.65, margin: 0 }}>
                    {guidanceNote}
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <section style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '20px 28px 0' }}>
              <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: '#1b2d4f', margin: 0 }}>
                Information to submit
              </h2>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.825rem', color: '#475569', margin: '6px 0 0', lineHeight: 1.5 }}>
                {selectedSub
                  ? `Records, tests, and medications listed for ${selectedSub.name}.`
                  : 'Select a pathway to see the records, tests, and medications listed for that row.'}
              </p>
            </div>

            <div style={{ padding: '20px 28px 24px' }}>
              {activeDocuments.length === 0 ? (
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: '#6b7a99', lineHeight: 1.6 }}>
                  {activeDisposition === 'issue'
                    ? 'Published guidance for this pathway does not list additional materials beyond what the examiner reviews. Follow the guidance note above.'
                    : 'No separate materials list was extracted for this pathway. Follow the guidance note above and confirm requirements with your AME.'}
                </p>
              ) : (
                <>
                  <DocumentChecklist
                    documents={activeDocuments}
                    checkedDocs={checkedDocs}
                    onToggle={toggleDoc}
                  />
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#64748b', lineHeight: 1.55, margin: '16px 0 0' }}>
                    Items marked often requested apply when the study was already performed or when the guidance says they apply to the case. Checking an item only tracks your preparation in this session.
                  </p>
                </>
              )}
            </div>
          </section>

          {activeAmeReview.length > 0 && (
            <section style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '24px 28px' }}>
              <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: '#1b2d4f', margin: '0 0 8px' }}>
                Examiner review
              </h2>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.825rem', color: '#64748b', margin: '0 0 12px', lineHeight: 1.5 }}>
                These items are reviewed by the examiner. They are not part of the preparation checklist.
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#475569', lineHeight: 1.6 }}>
                {activeAmeReview.map((note, index) => (
                  <li key={`${index}-${note.slice(0, 40)}`} style={{ marginBottom: 6 }}>
                    {note}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* E. Medication notes from source guidance */}
          {activeMedNotes.length > 0 && (
            <section style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '24px 28px' }}>
              <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1b2d4f', margin: '0 0 12px' }}>
                Medication Notes from Source Guidance
              </h2>
              <ul style={{ margin: 0, paddingLeft: 18, fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#475569', lineHeight: 1.6 }}>
                {activeMedNotes.map((note, index) => (
                  <li key={`${index}-${note.slice(0, 24)}`} style={{ marginBottom: 8 }}>
                    {note}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* F. Related medications (curated catalog) */}
          {relatedMeds.length > 0 && (
            <section style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '24px 28px' }}>
              <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1b2d4f', marginBottom: 16, margin: '0 0 16px' }}>
                Related Medications
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {relatedMeds.map((med) => med && (
                  <button
                    key={med.id}
                    onClick={() => onNavigate('medication-detail', med.id)}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      padding: '14px 18px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.9rem', color: '#1b2d4f', marginBottom: 2 }}>
                        {med.name}
                      </div>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: '#6b7a99' }}>
                        {med.category}
                      </div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 4l4 4-4 4" stroke="#3b7fc4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* G. Source + Disclaimer */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '18px 22px' }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.75rem', color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Source Attribution
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#334155', lineHeight: 1.55 }}>
                <div><strong>{condition.source}</strong></div>
                <div style={{ color: '#6b7a99', marginTop: 2 }}>{condition.sourceSection}</div>
              </div>
            </div>
            <DisclaimerCallout variant="compact" />
          </div>
        </div>
      </div>
    </div>
  );
}
