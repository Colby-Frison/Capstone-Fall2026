import { useState } from 'react';
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
  const activeSummary = selectedSub?.summary ?? condition.summary;
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

          {/* C. Sub-conditions */}
          {condition.subConditions.length > 0 && (
            <section style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid #f0f4f8' }}>
                <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1b2d4f', margin: 0 }}>
                  Sub-conditions
                </h2>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.825rem', color: '#6b7a99', margin: '4px 0 0' }}>
                  Select a sub-condition to see the specific certification pathway and document checklist.
                </p>
              </div>
              <div style={{ padding: '12px 20px' }}>
                {condition.subConditions.map((sub, idx) => {
                  const isSelected = selectedSubId === sub.id;
                  const isOpen = isSelected;
                  return (
                    <div key={sub.id} style={{ borderBottom: idx < condition.subConditions.length - 1 ? '1px solid #f0f4f8' : 'none' }}>
                      <button
                        onClick={() => setSelectedSubId(isSelected ? null : sub.id)}
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
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                            <path d="M6 4l4 4-4 4" stroke={isSelected ? '#3b7fc4' : '#94a3b8'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: isSelected ? 700 : 500, fontSize: '0.95rem', color: isSelected ? '#1b2d4f' : '#334155' }}>
                            {sub.name}
                          </span>
                        </div>
                        <DispositionBadge disposition={sub.disposition} size="sm" />
                      </button>

                      {isOpen && (
                        <div style={{ padding: '4px 12px 16px 40px' }}>
                          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#475569', lineHeight: 1.6, margin: '0 0 12px' }}>
                            {sub.summary}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* B. Q1 — Certification pathway */}
          <section style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ background: '#1b2d4f', padding: '18px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#3b7fc4', borderRadius: 4, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.8rem', color: '#ffffff' }}>R1</span>
                </div>
                <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#ffffff', margin: 0 }}>
                  Certification Pathway
                </h2>
              </div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#7fa8d0', margin: '6px 0 0 38px' }}>
                Based on published guidance for this known condition{selectedSub ? ` — ${selectedSub.name}` : ''}. Does not account for findings discovered during the exam.
              </p>
            </div>

            <div style={{ padding: '24px 28px' }}>
              <DispositionBlock disposition={activeDisposition} />

              {activeSummary && (
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#475569', lineHeight: 1.6, margin: '16px 0 0' }}>
                  {activeSummary}
                </p>
              )}

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

              <div style={{ marginTop: 20, padding: '18px 20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.85rem', color: '#1b2d4f', marginBottom: 8 }}>
                  Published guidance note
                </div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#475569', lineHeight: 1.65, margin: 0 }}>
                  {activeCertNote}
                </p>
              </div>

              {hasCrossRef && (
                <div style={{ marginTop: 12, padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6 }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#1e3a8a', margin: 0, lineHeight: 1.5 }}>
                    <strong>Related guidance:</strong> This pathway points to another protocol or disposition table. Follow the published note above and confirm the referenced section with your AME.
                  </p>
                </div>
              )}

              <div style={{ marginTop: 16, padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6 }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.775rem', color: '#78350f', margin: 0, lineHeight: 1.5 }}>
                  <strong>Note:</strong> This pathway reflects known conditions only. The AME examination may identify additional findings that affect certification. Your individual outcome is determined by the AME and the FAA.
                </p>
              </div>
            </div>
          </section>

          {/* D. Q2 — What to bring */}
          <section style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ background: '#243e6b', padding: '18px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#3b7fc4', borderRadius: 4, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.8rem', color: '#ffffff' }}>R2</span>
                </div>
                <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#ffffff', margin: 0 }}>
                  What to Bring to Your AME Appointment
                </h2>
              </div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#7fa8d0', margin: '6px 0 0 38px' }}>
                {selectedSub ? `For ${selectedSub.name}` : 'Select a sub-condition above for specific documents'}. Prepare these items in advance — missing paperwork can delay a deferral by months.
              </p>
            </div>

            <div style={{ padding: '24px 28px' }}>
              {activeDocuments.length === 0 ? (
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: '#6b7a99', lineHeight: 1.6 }}>
                  {activeDisposition === 'issue'
                    ? 'Published guidance for this pathway does not list additional paperwork to bring beyond what the AME reviews at the exam. Follow the certification note above.'
                    : 'No discrete “bring this” checklist items were extracted for this pathway. Use the certification note above and confirm requirements with your AME.'}
                </p>
              ) : (
                <>
                  <DocumentChecklist
                    documents={activeDocuments}
                    checkedDocs={checkedDocs}
                    onToggle={toggleDoc}
                  />
                  <div style={{ marginTop: 16, padding: '12px 16px', background: '#e8f2fb', border: '1px solid #b8d4ef', borderRadius: 6 }}>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.775rem', color: '#1b2d4f', margin: 0, lineHeight: 1.5 }}>
                      <strong>Tip:</strong> Gather all documentation before your appointment. If a deferral is required, arriving with complete records can prevent an additional wait of 90 days or more while missing items are collected.
                    </p>
                  </div>
                </>
              )}

              {activeAmeReview.length > 0 && (
                <div style={{ marginTop: 24, padding: '16px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.85rem', color: '#1b2d4f', marginBottom: 10 }}>
                    AME evaluation notes
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
                    {activeAmeReview.map((note) => (
                      <li key={note.slice(0, 48)} style={{ marginBottom: 6 }}>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

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
