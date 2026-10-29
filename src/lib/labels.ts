/**
 * The words the platform uses to say where something comes from and how far it
 * has been checked. One definition, used by every label on every page and by
 * the explanation on the Sources page.
 */
import type { Provenance, Verification } from './schemas';

export const PROVENANCE_LABELS: Record<Provenance, { label: string; css: string; description: string }> = {
  'ib-requirement': {
    label: 'IB requirement',
    css: 'tag--ib',
    description:
      'A requirement of the IB Diploma Programme Business management course. Because the Business management guide was not available when this release was written, every such statement also carries a verification status.',
  },
  'subject-knowledge': {
    label: 'Subject knowledge',
    css: 'tag--knowledge',
    description:
      'Established Business Management knowledge, explained in the platform\u2019s own words. It is not quoted from a source, and it is not an IB requirement in itself.',
  },
  'curriculum-requirement': {
    label: 'Curriculum requirement',
    css: 'tag--curriculum',
    description: 'A requirement of another qualification, from its own specification. None is stated yet: no other specification has been mapped.',
  },
  'source-derived': {
    label: 'Source-derived',
    css: 'tag--source',
    description: 'An explanation built from a named source, such as a management text or a published study, and written in original words.',
  },
  'examiner-observation': {
    label: 'Examiner observation',
    css: 'tag--examiner',
    description: 'A point taken from an IB subject report. None is used yet, because no subject report is available to this platform.',
  },
  'external-evidence': {
    label: 'External evidence',
    css: 'tag--external',
    description: 'A dated fact about a real organization or event, with its source. Interpretation of the fact is labelled separately.',
  },
  'simulated-data': {
    label: 'Simulated data',
    css: 'tag--simulated',
    description:
      'Figures constructed for teaching. They are internally consistent and checked by tests, and they are never presented as the results of a real organization.',
  },
  'aa-framework': {
    label: 'Arjun Agrawal framework',
    css: 'tag--framework',
    description: 'A teaching method or analytical framework of this platform. It is not an IB requirement and is not assessed as such.',
  },
  'original-practice': {
    label: 'Original practice question',
    css: 'tag--practice',
    description:
      'Written for this platform. It is not an IB examination question, and its marks are the question’s own allocation, set to the size of the task.',
  },
  'assessment-explanation': {
    label: 'Assessment explanation',
    css: 'tag--explanation',
    description: 'An account of how an assessment component works and what it rewards, built from the sources shown beside it.',
  },
  enrichment: {
    label: 'Enrichment',
    css: 'tag--enrichment',
    description: 'Beyond the qualification, for curious students and for university and MBA learners. It is not required or assessed by the IB.',
  },
};

export const VERIFICATION_LABELS: Record<Verification, { label: string; description: string }> = {
  primary: { label: 'Verified', description: 'Checked against the primary document.' },
  recorded: {
    label: 'Recorded',
    description:
      'Taken from a record of the primary document that gives its section and page (the creator’s assessment procedures platform). The primary document was not reopened for this release.',
  },
  corroborated: {
    label: 'Corroborated, verify',
    description: 'Consistent across independent secondary sources, but not yet checked against the Business management guide.',
  },
  conflicting: {
    label: 'Sources conflict',
    description: 'Secondary sources disagree. The platform’s reading is stated with its reason; check the Guide before relying on it.',
  },
  unverified: { label: 'Unverified', description: 'Not yet confirmed by any source available to this platform. Check the Guide.' },
  pedagogical: { label: 'Teaching choice', description: 'A teaching decision, not a claim about requirements.' },
};

export const LEVEL_LABELS = {
  'SL/HL': 'SL and HL',
  HL: 'HL only',
  'SL/HL with HL-only content': 'SL and HL, with HL-only content',
} as const;

export const STATUS_LABELS = {
  live: { label: 'Live', css: 'tag--live' },
  partial: { label: 'Partly built', css: 'tag--partial' },
  planned: { label: 'Planned', css: 'tag--planned' },
  complete: { label: 'Complete', css: 'tag--live' },
  draft: { label: 'Draft', css: 'tag--partial' },
} as const;

export const CONCEPT_NAMES = {
  change: 'Change',
  creativity: 'Creativity',
  ethics: 'Ethics',
  sustainability: 'Sustainability',
} as const;
