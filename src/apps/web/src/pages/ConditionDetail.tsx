import { useEffect, useState } from 'react';
import { getConditionById } from '../data/conditions';
import { getMedicationById } from '../data/medications';
import type { SubCondition } from '../data/types';
import DispositionBadge, { DispositionBlock } from '../components/DispositionBadge';
import DisclaimerCallout from '../components/DisclaimerCallout';
import { DocumentChecklist } from '../components/DocumentChecklist';
import NihConditionAbout from '../components/NihConditionAbout';
import { getConditionForms } from '../../../../packages/content/adapt';

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

  const relatedForms = getConditionForms(condition.name); 
  const relatedMeds = condition.relatedMedicationIds.map(getMedicationById).filter(Boolean);

  return (
    <div style={{ background: '#f5f7fa', minWidth: 0 }}>
      {/* Breadcrumb */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '12px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <nav className="crumbs" style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#6b7a99' }}>
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
        <div className="card-pad" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 20 }}>
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
            <CopyConditionLink conditionId={condition.id} />
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.975rem', color: '#475569', lineHeight: 1.65, margin: 0 }}>
            {condition.summary}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
          <NihConditionAbout
            nih={condition.nih}
            conditionName={condition.name}
            onBrowse={() => onNavigate('conditions')}
            onSearch={() => onNavigate('search', condition.name)}
          />

          {condition.subConditions.length > 0 && (
            <section style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid #e2e8f0' }}>
                <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: '#1b2d4f', margin: 0 }}>
                  Which situation matches you
                </h2>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.825rem', color: '#475569', margin: '6px 0 0', lineHeight: 1.5 }}>
                  Pick the row that fits. The result and the list of what to bring below are for that row.
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
                          minWidth: 0,
                          minHeight: 44,
                          background: isSelected ? '#f5f7fa' : 'transparent',
                          border: 'none',
                          borderRadius: 6,
                          padding: '14px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          textAlign: 'left',
                          transition: 'background 0.12s',
                        }}
                      >
                        <div className="split-main" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
                What the guide says
              </h2>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.825rem', color: '#475569', margin: '6px 0 0', lineHeight: 1.5 }}>
                {selectedSub
                  ? `Result for ${selectedSub.name}. Time limits, certificate class, and the guide's own wording follow when the source includes them.`
                  : 'Result for this condition.'}
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
                      {/^all$/i.test(cls) ? 'All certificate classes' : `${cls} class`}
                    </span>
                  ))}
                </div>
              )}

              {hasCrossRef ? (
                <div style={{ marginTop: 20, padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6 }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#1e3a8a', margin: 0, lineHeight: 1.6 }}>
                    <strong>Related guidance.</strong>{' '}
                    {guidanceNote || 'This row points to another part of the guide. Confirm that section with your medical examiner.'}
                  </p>
                </div>
              ) : guidanceNote ? (
                <div style={{ marginTop: 20, padding: '18px 20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.85rem', color: '#1b2d4f', marginBottom: 8 }}>
                    Wording from the guide
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
                What to bring
              </h2>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.825rem', color: '#475569', margin: '6px 0 0', lineHeight: 1.5 }}>
                {selectedSub
                  ? `Records, tests, and medications listed for ${selectedSub.name}.`
                  : 'Choose a situation above to see the records, tests, and medications for that row.'}
              </p>
            </div>

            <div style={{ padding: '20px 28px 24px' }}>
              {activeDocuments.length === 0 ? (
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: '#6b7a99', lineHeight: 1.6 }}>
                  {activeDisposition === 'issue'
                    ? 'The guide does not list extra paperwork for this situation beyond what the medical examiner reviews. Follow the wording above.'
                    : 'No separate list of materials was found for this situation. Follow the wording above and confirm it with your medical examiner.'}
                </p>
              ) : (
                <>
                  <DocumentChecklist
                    documents={activeDocuments}
                    checkedDocs={checkedDocs}
                    onToggle={toggleDoc}
                  />
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#64748b', lineHeight: 1.55, margin: '16px 0 0' }}>
                    “Often requested” means the guide asks for that item only in some cases, such as when a test was already done. Checking a box only tracks what you have gathered in this visit.
                  </p>
                </>
              )}
            </div>
          </section>

          {activeAmeReview.length > 0 && (
            <section style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '24px 28px' }}>
              <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: '#1b2d4f', margin: '0 0 8px' }}>
                What the medical examiner reviews
              </h2>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.825rem', color: '#64748b', margin: '0 0 12px', lineHeight: 1.5 }}>
                The medical examiner checks these at the visit. They are not items for you to pack.
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
                Medication notes from the guide
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

          {/* Related forms */}
          {relatedForms.length > 0 && (
            <section style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '24px 28px' }}>
              <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: '#1b2d4f', margin: '0 0 8px' }}>
                Related FAA Forms
              </h2>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.825rem', color: '#64748b', margin: '0 0 12px', lineHeight: 1.5 }}>
                Depending on your specific pathway and AME evaluation, you may be
                required to submit the following forms:
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: '#475569', lineHeight: 1.6 }}>
                {relatedForms.map((form, index) => (
                  <li key={index} style={{ marginBottom: 6 }}>
                    {form["Url"] ? (
                      <a
                        href={form["Url"]}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2563eb', textDecoration: 'none' }}
                      >
                        {form["Form Type"]}
                      </a>
                    ) : (
                      <span style={{ color: '#475569' }}>
                        {form["Form Type"]} <span style={{ fontSize: '0.75rem', color: '#d97706', fontStyle: 'italic', marginLeft: '4px' }}>(URL Pending)</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* G. Source + Disclaimer */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '18px 22px' }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.75rem', color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Where this came from
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

function CopyConditionLink({ conditionId }: { conditionId: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('condition', conditionId);
    const link = url.toString();
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const input = document.createElement('textarea');
      input.value = link;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
    <button
      type="button"
      className="copy-link"
      onClick={copyLink}
      aria-label={copied ? 'Link copied' : 'Copy link to this condition'}
      title="Copy link"
    >
      <svg
        width="23"
        height="23"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        style={{
          color: '#64748b',
          opacity: copied ? 0 : 1,
          transform: copied ? 'scale(0.82)' : 'scale(1)',
          transition: 'opacity 180ms ease, transform 180ms ease',
        }}
      >
        <rect x="5.5" y="5.5" width="8" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M10.5 5.5 V3.7 C10.5 3 9.9 2.5 9.2 2.5 H3.8 C3.1 2.5 2.5 3 2.5 3.7 V9.2 C2.5 9.9 3.1 10.5 3.8 10.5 H5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <svg
        width="23"
        height="23"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        style={{
          color: '#15803d',
          opacity: copied ? 1 : 0,
          transform: copied ? 'scale(1)' : 'scale(0.82)',
          transition: 'opacity 180ms ease, transform 180ms ease',
        }}
      >
        <path d="M3.5 8.5 L6.5 11.5 L12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
    <span
      style={{
        marginTop: copied ? 4 : 0,
        maxHeight: copied ? 16 : 0,
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
        fontSize: '0.7rem',
        lineHeight: 1,
        color: '#15803d',
        whiteSpace: 'nowrap',
        opacity: copied ? 1 : 0,
        transition: 'opacity 180ms ease, max-height 180ms ease, margin-top 180ms ease',
      }}
    >
      Link copied
    </span>
    </div>
  );
}
