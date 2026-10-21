import { searchCatalog } from '@content/index';
import type { Medication } from './types';

export const medications: Medication[] = [
  {
    id: 'sertraline',
    name: 'Sertraline',
    genericName: 'Sertraline HCl',
    category: 'Antidepressant — SSRI',
    flightStatusNote:
      'Sertraline is one of four SSRIs currently accepted under the FAA Special Issuance SSRI policy for pilots with mild-to-moderate depression. Use during flight operations is permitted under the conditions of the Special Issuance authorization.',
    certificationImpact:
      'Published guidance lists sertraline (Zoloft) as an FAA-accepted SSRI under the established psychiatric Special Issuance policy. A minimum stability period on the medication — typically 6 months without dose changes or significant side effects — is required before the Special Issuance may be granted. Neuropsychological evaluation (e.g., COGSCREEN) is part of the authorization process.',
    relatedConditionIds: [],
    ameDiscussion:
      'The pilot should be prepared to discuss: medication start date, dose history, any dose changes, side effects experienced (especially sedation, cognitive effects, or vision changes), current functional status, and whether they have discussed flight duties with their prescribing physician.',
    source: 'FAA AME Guide / SSRI Policy',
    sourceSection: 'Psychiatric Special Issuance — SSRI Authorization Policy',
  },
  {
    id: 'fluoxetine',
    name: 'Fluoxetine',
    genericName: 'Fluoxetine HCl',
    category: 'Antidepressant — SSRI',
    flightStatusNote:
      'Fluoxetine (Prozac) is one of four SSRIs accepted under the FAA SSRI Special Issuance policy. Its long half-life distinguishes it pharmacokinetically from other accepted SSRIs and is noted in the authorization guidance.',
    certificationImpact:
      'Published guidance accepts fluoxetine under the SSRI Special Issuance policy. Due to its extended half-life, the evaluation and stability criteria follow the same framework as other accepted SSRIs. Neuropsychological evaluation is required.',
    relatedConditionIds: [],
    ameDiscussion:
      'The AME and FAA review will consider the long half-life of fluoxetine, any prior medication switches, and the standard SSRI policy stability criteria. Be prepared to document the complete medication history and treating physician evaluation.',
    source: 'FAA AME Guide / SSRI Policy',
    sourceSection: 'Psychiatric Special Issuance — SSRI Authorization Policy',
  },
  {
    id: 'escitalopram',
    name: 'Escitalopram',
    genericName: 'Escitalopram oxalate',
    category: 'Antidepressant — SSRI',
    flightStatusNote:
      'Escitalopram (Lexapro) is one of four SSRIs accepted under the FAA SSRI Special Issuance policy for mild-to-moderate depression in pilots.',
    certificationImpact:
      'Published guidance accepts escitalopram under the SSRI policy. The standard Special Issuance evaluation process applies: minimum 6-month stability, neuropsychological testing, and psychiatrist evaluation.',
    relatedConditionIds: [],
    ameDiscussion:
      'Prepare documentation of escitalopram start date, current dose, treating psychiatrist notes, and neuropsychological test results. The AME will submit the Special Issuance application to the AMCD for authorization.',
    source: 'FAA AME Guide / SSRI Policy',
    sourceSection: 'Psychiatric Special Issuance — SSRI Authorization Policy',
  },
  {
    id: 'sumatriptan',
    name: 'Sumatriptan',
    genericName: 'Sumatriptan succinate',
    category: 'Antimigraine — Triptan',
    flightStatusNote:
      'Sumatriptan (Imitrex) is used for acute migraine treatment. Published guidance indicates it is not acceptable for use within a specified period before or during flight operations due to its potential side effects, which can include dizziness, pressure sensations, and sedation.',
    certificationImpact:
      'Published guidance does not disqualify pilots from certification solely for having sumatriptan prescribed, but the medication itself may not be used within the required time window before acting as pilot-in-command. The underlying migraine condition drives the certification outcome; the medication is evaluated as part of that condition review.',
    relatedConditionIds: [],
    ameDiscussion:
      'The pilot should be prepared to discuss: how frequently sumatriptan is used, whether use has been required before flight duties, what alternative acute treatments are in place, and the overall frequency and control of migraine episodes. The AME evaluates whether the condition and medication together create a safety risk.',
    source: 'FAA AME Guide',
    sourceSection: 'Neurological — Migraine Treatment / Triptans',
  },
  {
    id: 'topiramate',
    name: 'Topiramate',
    genericName: 'Topiramate',
    category: 'Anticonvulsant / Migraine Preventive',
    flightStatusNote:
      'Topiramate (Topamax) used as migraine prophylaxis introduces disqualifying concerns under published guidance due to its cognitive side effect profile, including word-finding difficulty and attention effects. Use requires FAA review.',
    certificationImpact:
      'Published guidance indicates that topiramate use, even for migraine prevention rather than seizure control, triggers additional evaluation for cognitive side effects and requires FAA/AMCD review. Certification under topiramate is possible via Special Issuance but requires neuropsychological documentation demonstrating absence of significant cognitive impairment.',
    relatedConditionIds: [],
    ameDiscussion:
      'Discuss with the AME: the dose and duration of topiramate use, any cognitive side effects experienced, neuropsychological test results, and whether alternative preventive treatments have been considered. A treating neurologist letter addressing cognitive effects is strongly advised.',
    source: 'FAA AME Guide',
    sourceSection: 'Neurological — Migraine Prophylaxis / Anticonvulsants',
  },
  {
    id: 'amitriptyline',
    name: 'Amitriptyline',
    genericName: 'Amitriptyline HCl',
    category: 'Tricyclic Antidepressant / Migraine Preventive',
    flightStatusNote:
      'Amitriptyline used for migraine prevention is generally not acceptable for pilot use during flight operations under published guidance due to its sedating and anticholinergic properties, which impair pilot performance and situational awareness.',
    certificationImpact:
      'Published guidance indicates that amitriptyline is typically disqualifying when used for any indication, due to its sedation, cognitive, and cardiac side effects. Alternative migraine prophylaxis medications should be discussed with the treating physician if certification is being pursued.',
    relatedConditionIds: [],
    ameDiscussion:
      'The AME will note amitriptyline use and its disqualifying status. Discuss with the treating physician whether a transition to an alternative migraine preventive acceptable under FAA guidance (e.g., propranolol, verapamil) is clinically appropriate before pursuing certification.',
    source: 'FAA AME Guide',
    sourceSection: 'Psychiatric / Neurological — Tricyclic Antidepressants',
  },
  {
    id: 'metformin',
    name: 'Metformin',
    genericName: 'Metformin HCl',
    category: 'Antidiabetic — Biguanide',
    flightStatusNote:
      'Metformin is the most commonly used oral antidiabetic medication and is generally acceptable under published guidance. It does not cause hypoglycemia when used as monotherapy and is the preferred first-line agent for Type 2 diabetes in the aviation medical context.',
    certificationImpact:
      'Published guidance accepts metformin for use in pilots with Type 2 diabetes. Its low hypoglycemia risk makes it the most favorable oral antidiabetic medication from a certification standpoint. The certification pathway depends on overall glycemic control and absence of diabetic complications, not metformin use alone.',
    relatedConditionIds: [],
    ameDiscussion:
      'Prepare HbA1c results and fasting glucose documentation. Inform the AME of all diabetes medications in use; metformin is generally acceptable but combination therapy with hypoglycemia-inducing agents (sulfonylureas, insulin) changes the evaluation pathway significantly.',
    source: 'FAA AME Guide',
    sourceSection: 'Endocrine — Diabetes Mellitus / Oral Antidiabetic Agents',
  },
  {
    id: 'lisinopril',
    name: 'Lisinopril',
    genericName: 'Lisinopril',
    category: 'Antihypertensive — ACE Inhibitor',
    flightStatusNote:
      'Lisinopril (an ACE inhibitor) is generally acceptable under published guidance for treatment of hypertension in pilots. The primary side effect of note is a persistent cough and, rarely, angioedema — both of which are evaluated by the AME.',
    certificationImpact:
      'Published guidance accepts most ACE inhibitors including lisinopril for treatment of hypertension in pilots. Certification is driven by blood pressure control at the examination, not the specific antihypertensive agent. The AME reviews side effect history.',
    relatedConditionIds: [],
    ameDiscussion:
      'Be prepared to discuss: how long lisinopril has been prescribed, current dose, whether a cough side effect is present (and if so, its impact on duties), and blood pressure readings over the prior weeks. Bring a home BP log if available.',
    source: 'FAA AME Guide',
    sourceSection: 'Cardiovascular — Hypertension / Antihypertensive Medications',
  },
  {
    id: 'amlodipine',
    name: 'Amlodipine',
    genericName: 'Amlodipine besylate',
    category: 'Antihypertensive — Calcium Channel Blocker',
    flightStatusNote:
      'Amlodipine (Norvasc) is a long-acting calcium channel blocker generally acceptable under published guidance for hypertension management in pilots. Ankle edema is a common side effect; significant edema may prompt AME inquiry.',
    certificationImpact:
      'Published guidance accepts calcium channel blockers including amlodipine for hypertension. Blood pressure control at the examination determines the certification outcome. Side effects such as significant edema may be noted but are not typically disqualifying in themselves.',
    relatedConditionIds: [],
    ameDiscussion:
      'Discuss current blood pressure control, dose, any edema or other side effects, and home BP readings. Bring a 4–6 week blood pressure log and your current medication list.',
    source: 'FAA AME Guide',
    sourceSection: 'Cardiovascular — Hypertension / Antihypertensive Medications',
  },
];

export function getMedicationById(id: string): Medication | undefined {
  return medications.find((m) => m.id === id);
}

export function searchMedications(
  query: string,
  expandedTerms: string[] = [],
): Medication[] {
  const q = query.trim();
  if (!q) return [];
  return searchCatalog(q, { conditions: [], medications, expandedTerms })
    .filter((hit) => hit.type === 'medication' && hit.medication)
    .map((hit) => hit.medication!);
}
