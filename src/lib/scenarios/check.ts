/**
 * Checking a reader's answers to a scenario, step by step, and the summary at
 * the end. Every check returns words that explain the verdict, never a bare
 * right or wrong. Pure functions, used by the browser script and the tests.
 */
import { fmtNumber } from '../format';
import type { Calc, Choice, Exhibit, Question, Scenario, SortTask, StepId, Verdict } from './types';

export const VERDICT_WORDS: Record<Verdict, string> = { best: 'Best fit', fair: 'Partly fits', weak: 'Does not fit' };

export interface Answers {
  problem?: string;
  evidence?: string[];
  tool?: string;
  calc?: string;
  sort?: Record<string, string>;
  notes?: string;
  recommend?: string;
  justify?: string;
  stakeholders?: string;
  risk?: string;
  change?: string;
}

export function choiceResult(q: Question, id: string | undefined): { picked: Choice | undefined; best: Choice } {
  const best = q.choices.find((c) => c.verdict === 'best')!;
  return { picked: q.choices.find((c) => c.id === id), best };
}

export type ExhibitMark = 'found' | 'wrongly-chosen' | 'missed' | 'rightly-left';

export const EXHIBIT_WORDS: Record<ExhibitMark, string> = {
  found: 'Relevant, and you chose it',
  'wrongly-chosen': 'A distractor',
  missed: 'Relevant, and you left it out',
  'rightly-left': 'A distractor, rightly left out',
};

export function evidenceResult(exhibits: Exhibit[], chosen: readonly string[]): { marks: Array<{ exhibit: Exhibit; mark: ExhibitMark }>; found: number; relevant: number; distractors: number; verdict: Verdict } {
  const set = new Set(chosen);
  const marks = exhibits.map((e) => ({ exhibit: e, mark: (e.relevant ? (set.has(e.id) ? 'found' : 'missed') : set.has(e.id) ? 'wrongly-chosen' : 'rightly-left') as ExhibitMark }));
  const relevant = exhibits.filter((e) => e.relevant).length;
  const found = marks.filter((m) => m.mark === 'found').length;
  const distractors = marks.filter((m) => m.mark === 'wrongly-chosen').length;
  const verdict: Verdict = found === relevant && distractors === 0 ? 'best' : found * 2 >= relevant && distractors <= 1 ? 'fair' : 'weak';
  return { marks, found, relevant, distractors, verdict };
}

/** A number typed by a person: "1,250", " 12.5 ", "£1,250", "12.5%", with a typographic minus. */
export function readNumber(raw: string): number | null {
  const cleaned = raw
    .replace(/[\s, ]/g, '')
    .replace(/−/g, '-')
    .replace(/^[^\d.-]+/, '')
    .replace(/[^\d.]+$/, '');
  if (!/^-?\d*\.?\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export interface CalcResult {
  status: 'right' | 'slip' | 'wrong' | 'invalid';
  value: number | null;
  verdict: Verdict;
  message: string;
}

/** An answer as the scenario writes it: −£40,000, 3.2 years, 12.5%. */
export function fmtAnswer(c: Pick<Calc, 'prefix' | 'suffix' | 'dp'>, v: number): string {
  return `${v < 0 && Math.abs(v) >= 0.5 * 10 ** -c.dp ? '\u2212' : ''}${c.prefix}${fmtNumber(Math.abs(v), c.dp)}${c.suffix}`;
}

export function calcResult(c: Calc, raw: string): CalcResult {
  const value = readNumber(raw);
  const shown = fmtAnswer(c, c.answer);
  if (value === null) return { status: 'invalid', value, verdict: 'weak', message: 'Enter a number, such as 1250 or 12.5, without words.' };
  if (Math.abs(value - c.answer) <= c.tolerance) return { status: 'right', value, verdict: 'best', message: `Right: ${shown}. ${c.meaning}` };
  const slip = [...c.slips].sort((a, b) => Math.abs(a.value - value) - Math.abs(b.value - value)).find((s) => Math.abs(s.value - value) <= Math.max(c.tolerance, Math.abs(s.value) * 0.005));
  if (slip) return { status: 'slip', value, verdict: 'fair', message: `Not quite. ${slip.why} The answer is ${shown}.` };
  return { status: 'wrong', value, verdict: 'weak', message: `Not this time: the answer is ${shown}. Follow the working below line by line to see where yours went another way.` };
}

export function sortResult(t: SortTask, answers: Record<string, string> | undefined): { items: Array<{ id: string; right: boolean; picked: string | undefined }>; right: number; verdict: Verdict } {
  const items = t.items.map((it) => ({ id: it.id, right: answers?.[it.id] === it.answer, picked: answers?.[it.id] }));
  const right = items.filter((x) => x.right).length;
  const verdict: Verdict = right === t.items.length ? 'best' : right * 2 >= t.items.length ? 'fair' : 'weak';
  return { items, right, verdict };
}

export const MIN_JUSTIFY_WORDS = 8;

export function wordCount(s: string | undefined): number {
  return (s ?? '').trim().split(/\s+/).filter(Boolean).length;
}

/** The analysis step's verdict: the calculation's and the sorting's together (best only when both are). */
export function analysisVerdict(s: Scenario, a: Answers): Verdict {
  const vs: Verdict[] = [];
  if (s.analysis.calc) vs.push(calcResult(s.analysis.calc, a.calc ?? '').verdict);
  if (s.analysis.sort) vs.push(sortResult(s.analysis.sort, a.sort).verdict);
  if (!vs.length) return 'fair';
  if (vs.every((v) => v === 'best')) return 'best';
  if (vs.every((v) => v === 'weak')) return 'weak';
  return 'fair';
}

/** The verdict on each step the reader has checked, for the summary and the stored record. */
export function stepVerdicts(s: Scenario, a: Answers, checked: readonly StepId[]): Partial<Record<StepId, Verdict>> {
  const out: Partial<Record<StepId, Verdict>> = {};
  const has = (k: StepId) => checked.includes(k);
  if (has('problem')) out.problem = choiceResult(s.problem, a.problem).picked?.verdict ?? 'weak';
  if (has('evidence')) out.evidence = evidenceResult(s.evidence.exhibits, a.evidence ?? []).verdict;
  if (has('tool')) out.tool = s.toolStep.choices.find((c) => c.id === a.tool)?.verdict ?? 'weak';
  if (has('analysis')) out.analysis = analysisVerdict(s, a);
  if (has('recommend')) out.recommend = choiceResult(s.recommend, a.recommend).picked?.verdict ?? 'weak';
  if (has('evaluate')) {
    const vs = (['stakeholders', 'risk', 'change'] as const).map((k) => choiceResult(s.evaluate[k], a[k]).picked?.verdict ?? 'weak');
    const best = vs.filter((v) => v === 'best').length;
    out.evaluate = best === 3 ? 'best' : best >= 1 || vs.every((v) => v !== 'weak') ? 'fair' : 'weak';
  }
  return out;
}

/** What the reader chose at each step, in words, for the summary. */
export function answerWords(s: Scenario, a: Answers, step: StepId): string {
  switch (step) {
    case 'problem':
      return s.problem.choices.find((c) => c.id === a.problem)?.text ?? 'No answer';
    case 'evidence': {
      const r = evidenceResult(s.evidence.exhibits, a.evidence ?? []);
      return `${r.found} of ${r.relevant} relevant ${r.relevant === 1 ? 'exhibit' : 'exhibits'} chosen, ${r.distractors} ${r.distractors === 1 ? 'distractor' : 'distractors'}`;
    }
    case 'tool':
      return s.toolStep.choices.find((c) => c.id === a.tool)?.text ?? 'No answer';
    case 'analysis':
      if (s.analysis.calc) {
        const v = readNumber(a.calc ?? '');
        return v === null ? 'No answer' : fmtAnswer(s.analysis.calc, v);
      }
      if (s.analysis.sort) {
        const r = sortResult(s.analysis.sort, a.sort);
        return `${r.right} of ${s.analysis.sort.items.length} placed correctly`;
      }
      return 'Written';
    case 'recommend':
      return s.recommend.choices.find((c) => c.id === a.recommend)?.text ?? 'No answer';
    case 'evaluate': {
      const best = (['stakeholders', 'risk', 'change'] as const).filter((k) => choiceResult(s.evaluate[k], a[k]).picked?.verdict === 'best').length;
      return `${best} of 3 judgements on the best answer`;
    }
  }
}

/** A one-line verdict on the whole scenario, for the stored record and the workspace. */
export function headline(s: Scenario, v: Partial<Record<StepId, Verdict>>): string {
  const n = Object.values(v).filter((x) => x === 'best').length;
  const done = Object.keys(v).length;
  return `${s.title}: ${n} of ${done} ${done === 1 ? 'step' : 'steps'} on the best answer`;
}
