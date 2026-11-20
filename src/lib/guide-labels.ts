/**
 * The standing of a statement in the Assessment Centre, and the words a
 * reader sees for it. One list, read by the labels on the pages
 * (GuideLabel.astro), the checklists and the IA tools' feedback, so a label
 * reads the same wherever it appears.
 *
 *   ib        stated in the IB Business management guide (first assessment 2024),
 *             with its page: the guide decides every requirement
 *   examiner  what the creator's four assessment guides report from IB subject
 *             reports and past papers (May 2024 to May 2026), attributed to the
 *             guide that says it; the platform has not seen those reports
 *   strategy  the platform's own technique or advice, not a rule
 *   example   invented for teaching: fictional businesses, figures and answers
 *   tsm       advice from the IB's teacher support material (2022), paraphrased
 *             with its page: official guidance for teachers, not a requirement
 */
export type Standing = 'ib' | 'examiner' | 'strategy' | 'example' | 'tsm';

export const LABEL_TEXT: Record<Standing, string> = {
  ib: 'IB requirement',
  examiner: 'Examiner emphasis',
  strategy: 'Recommended strategy',
  example: 'Illustrative example',
  tsm: 'IB teacher support material',
};

/** What each label means, in a sentence, for the key on each page. */
export const LABEL_MEANING: Record<Standing, string> = {
  ib: 'Official: stated in the IB Business management guide (first assessment 2024), with its page. The guide decides every requirement.',
  examiner:
    'What the creator’s assessment guides report from IB subject reports and past papers (May 2024 to May 2026), attributed to the guide that says it. The platform has not seen those reports.',
  strategy: 'A technique the platform recommends. It is not an IB rule.',
  example: 'Invented for teaching: the businesses, figures and answers are fictional.',
  tsm: 'Advice from the IB’s teacher support material (2022), paraphrased with its page. Official guidance for teachers, not a requirement.',
};

/** The creator's assessment guides, as the Centre cites them beside examiner emphasis. */
export const CREATOR_GUIDE = {
  'internal-assessment': 'IA research guide',
  'paper-1': 'Paper 1 assessment guide',
  'paper-2': 'Paper 2 assessment guide',
  'paper-3': 'Paper 3 assessment guide',
} as const;
