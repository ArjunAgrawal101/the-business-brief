/**
 * The word count planner for the internal assessment, as pure functions:
 * the 1,800 words shared between the project's sections, planned and then
 * written, against the guide's limit and its list of what does not count
 * (p. 56). The suggested split is the platform's; the limit and the list are
 * the guide's. Saved in bb:ia-words.
 */
import { IA_LIMITS } from './ia';
import type { Check } from './ia-tools';

export interface Section {
  name: string;
  /** Words planned, or null while not set. */
  planned: number | null;
  /** Words that count written so far, or null while not known. */
  written: number | null;
  /** The introduction, main body or conclusion: what the guide's structure asks of the section (p. 55). */
  part: 'introduction' | 'body' | 'conclusion';
}

/** What the guide leaves out of the count (p. 56), in its order. */
export const NOT_COUNTED = [
  { id: 'acknowledgments', text: 'Acknowledgments' },
  { id: 'contents', text: 'The contents page' },
  { id: 'tables', text: 'Tables of statistical data' },
  { id: 'diagrams', text: 'Diagrams or figures' },
  { id: 'equations', text: 'Equations, formulae and calculations' },
  { id: 'documents', text: 'The supporting documents' },
  { id: 'citations', text: 'Citations, which go in the body' },
  { id: 'references', text: 'References, which go in footnotes or endnotes' },
  { id: 'bibliography', text: 'The bibliography' },
] as const;

/** The platform's suggested split of the limit: a starting point, not a rule. Shares add up to 1. */
export const SUGGESTED: Array<{ name: string; part: Section['part']; share: number }> = [
  { name: 'Introduction: the organization, the issue, the question and the method', part: 'introduction', share: 0.12 },
  { name: 'Main body: first finding, analysed', part: 'body', share: 0.26 },
  { name: 'Main body: second finding, analysed', part: 'body', share: 0.26 },
  { name: 'Main body: evaluation, weighing the findings', part: 'body', share: 0.24 },
  { name: 'Conclusion: the answer to the question', part: 'conclusion', share: 0.12 },
];

/** The suggested split in whole tens of words, never over the limit. */
export function suggestedSections(limit: number = IA_LIMITS.words): Section[] {
  return SUGGESTED.map((s) => ({ name: s.name, part: s.part, planned: Math.floor((limit * s.share) / 10) * 10, written: null }));
}

const sum = (xs: Array<number | null>) => xs.reduce<number>((n, x) => n + (x ?? 0), 0);

export interface WordSummary {
  planned: number;
  written: number;
  /** Words left in the plan and in the writing; negative when over the limit. */
  plannedLeft: number;
  writtenLeft: number;
  checks: Check[];
}

export function summarizeWords(sections: Section[], limit: number = IA_LIMITS.words): WordSummary {
  const planned = sum(sections.map((s) => s.planned));
  const written = sum(sections.map((s) => s.written));
  const checks: Check[] = [];
  const over = (n: number) => `${n.toLocaleString('en-GB')} ${n === 1 ? 'word' : 'words'}`;
  if (planned > limit)
    checks.push({ status: 'problem', text: `Your plan is ${over(planned - limit)} over the limit of ${limit.toLocaleString('en-GB')}. Over the limit, your teacher marks only the first 1,800 words and moderators do not read beyond them.`, standing: 'ib', source: 'Guide, p. 56' });
  else if (planned > 0) checks.push({ status: 'ok', text: `Your plan uses ${over(planned)}, within the limit, with ${over(limit - planned)} to spare.`, standing: 'ib', source: 'Guide, p. 56' });
  if (written > limit)
    checks.push({ status: 'problem', text: `You have written ${over(written - limit)} more than the limit. Cut before you submit: words beyond 1,800 are not marked or read.`, standing: 'ib', source: 'Guide, p. 56' });
  else if (written > 0) checks.push({ status: 'ok', text: `${over(written)} written that count, ${over(limit - written)} left.`, standing: 'ib', source: 'Guide, p. 56' });
  for (const s of sections) {
    if (s.planned !== null && s.written !== null && s.planned > 0 && s.written > s.planned * 1.15)
      checks.push({ status: 'advice', text: `${s.name || 'A section'}: ${over(s.written - s.planned)} over its plan. Take them from another section, or cut.`, standing: 'strategy' });
  }
  const parts = (p: Section['part']) => sum(sections.filter((s) => s.part === p).map((s) => s.planned));
  if (planned > 0) {
    if (!sections.some((s) => s.part === 'introduction') || !sections.some((s) => s.part === 'conclusion'))
      checks.push({ status: 'advice', text: 'The guide’s structure has an introduction, a main body and a conclusion that answers the question: plan all three.', standing: 'ib', source: 'Guide, p. 55' });
    if (parts('introduction') > planned * 0.2)
      checks.push({
        status: 'advice',
        text: 'More than a fifth of your plan is introduction. The IA research guide reports that subject reports advise against a long research proposal or methodology section; the analysis needs the words.',
        standing: 'examiner',
        source: 'IA research guide, p. 5',
      });
    if (parts('body') < planned * 0.6)
      checks.push({ status: 'advice', text: 'Less than three fifths of your plan is the main body, where the tools are applied and the evidence weighed. Criteria C and D are marked there.', standing: 'strategy' });
  }
  return { planned, written, plannedLeft: limit - planned, writtenLeft: limit - written, checks };
}

export interface WordsState {
  v: 1;
  sections: Section[];
  /** The exclusions the reader has checked they left out of their count. */
  excluded: string[];
}

export const MAX_SECTIONS = 10;

export const emptyWords = (): WordsState => ({ v: 1, sections: suggestedSections(), excluded: [] });

/** Saved state, read defensively. */
export function parseWords(raw: unknown): WordsState {
  const out = emptyWords();
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(20000, Math.floor(v)) : null);
  if (Array.isArray(r.sections)) {
    const sections = r.sections
      .slice(0, MAX_SECTIONS)
      .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
      .map((x) => ({
        name: typeof x.name === 'string' ? x.name.slice(0, 160) : '',
        planned: num(x.planned),
        written: num(x.written),
        part: x.part === 'introduction' || x.part === 'conclusion' ? x.part : ('body' as Section['part']),
      }));
    if (sections.length) out.sections = sections;
  }
  const ids = NOT_COUNTED.map((x) => x.id as string);
  if (Array.isArray(r.excluded)) out.excluded = [...new Set(r.excluded.filter((x): x is string => typeof x === 'string' && ids.includes(x)))];
  return out;
}
