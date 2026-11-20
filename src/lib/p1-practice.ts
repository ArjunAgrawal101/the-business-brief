/**
 * Working on a Paper 1 practice case (src/lib/p1-cases.ts): the reader's own
 * work, kept on this device under bb:p1-case:<id>, and the checks the page
 * runs on it. Pure functions shared by the case page, its script and the unit
 * tests.
 *
 * - Research notes for each context topic of the pre-released statement.
 * - Evidence tagged in the case, as in the workspace (src/lib/p1-workspace.ts).
 * - A stakeholder analysis, compared with the platform's model.
 * - The tools chosen, with feedback on how well each fits the case.
 * - An answer to each question, built in the parts a strong answer has, with
 *   structure checks that say what is missing and never mark the answer.
 * - A self-mark against the platform's guidance for each question, and the
 *   total as a range where a level is chosen.
 * - Timed attempts at the guide's durations: five minutes' reading time, then
 *   1 hour 30 minutes (guide, pp. 41 and 43).
 */
import { TAG_IDS, type Evidence, type Tag } from './p1-workspace';
import type { P1Case, P1Question, P1Stakeholder, P1Tool } from './p1-cases';

/** The guide's durations for Paper 1, in seconds: reading time (p. 41) and the paper (p. 43). */
export const READING_SECONDS = 5 * 60;
export const WRITING_SECONDS = 90 * 60;
/** The teacher support material's suggestion of about 60% of the time for Section A: a recommended pace, not a rule. */
export const SECTION_A_SECONDS = Math.round(WRITING_SECONDS * 0.6);

export interface StakeRow {
  name: string;
  interest: string;
  power: '' | 'High' | 'Low';
  stance: '' | 'For' | 'Against' | 'Mixed';
}

export interface Answer {
  slots: Record<string, string>;
  /** Evidence ids used for this answer. */
  items: string[];
}

export interface Mark {
  /** Indexes of the guidance points the answer makes. */
  points: number[];
  /** The level chosen, such as "7-8", for a levels question. */
  level: string | null;
}

export interface Attempt {
  at: string;
  /** Seconds used for reading and for writing. */
  reading: number;
  used: number;
  allowed: number;
}

export interface CaseWork {
  v: 1;
  notes: string[];
  items: Evidence[];
  stakeholders: StakeRow[];
  tools: string[];
  /** The full case is open (examination day). */
  revealed: boolean;
  /** The Section B question chosen. */
  choice: string | null;
  answers: Record<string, Answer>;
  marks: Record<string, Mark>;
  attempts: Attempt[];
}

export const MAX_ITEMS = 200;
export const MAX_ROWS = 12;
export const MAX_ATTEMPTS = 20;
const TEXT = 3000;

export const emptyWork = (): CaseWork => ({ v: 1, notes: [], items: [], stakeholders: [], tools: [], revealed: false, choice: null, answers: {}, marks: {}, attempts: [] });

const str = (v: unknown, max = TEXT) => (typeof v === 'string' ? v.slice(0, max) : '');
const nat = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

/** Reads saved work defensively: anything malformed, or about another case, is dropped. */
export function parseWork(raw: unknown, c: P1Case): CaseWork {
  const out = emptyWork();
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Partial<Record<keyof CaseWork, unknown>>;
  if (Array.isArray(r.notes)) out.notes = c.context.map((_, i) => str((r.notes as unknown[])[i]));
  if (Array.isArray(r.items)) {
    for (const e of r.items.slice(0, MAX_ITEMS)) {
      if (!e || typeof e !== 'object') continue;
      const x = e as Partial<Evidence>;
      const n = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : -1);
      if (typeof x.id !== 'string' || typeof x.text !== 'string' || !x.text.trim() || !TAG_IDS.includes(x.tag as Tag)) continue;
      const para = n(x.para);
      const start = n(x.start);
      const end = n(x.end);
      if (para < 0 || start < 0 || end <= start) continue;
      out.items.push({ id: x.id.slice(0, 40), tag: x.tag as Tag, text: x.text.slice(0, 2000), para, start, end, note: str(x.note, 1000) });
    }
  }
  if (Array.isArray(r.stakeholders)) {
    out.stakeholders = r.stakeholders.slice(0, MAX_ROWS).flatMap((row) => {
      if (!row || typeof row !== 'object') return [];
      const x = row as Partial<StakeRow>;
      return [{ name: str(x.name, 200), interest: str(x.interest, 500), power: x.power === 'High' || x.power === 'Low' ? x.power : '', stance: x.stance === 'For' || x.stance === 'Against' || x.stance === 'Mixed' ? x.stance : '' }];
    });
  }
  const toolIds = new Set(c.tools.map((t) => t.id));
  if (Array.isArray(r.tools)) out.tools = [...new Set(r.tools.filter((t): t is string => typeof t === 'string' && toolIds.has(t)))];
  out.revealed = r.revealed === true;
  const qs = new Map(c.questions.map((q) => [q.id, q]));
  if (typeof r.choice === 'string' && qs.get(r.choice)?.section === 'B') out.choice = r.choice;
  const ids = new Set(out.items.map((e) => e.id));
  if (r.answers && typeof r.answers === 'object') {
    for (const [qid, v] of Object.entries(r.answers as Record<string, unknown>)) {
      const q = qs.get(qid);
      if (!q || !v || typeof v !== 'object') continue;
      const a = v as { slots?: unknown; items?: unknown };
      const slots: Record<string, string> = {};
      if (a.slots && typeof a.slots === 'object') for (const s of q.plan) slots[s.id] = str((a.slots as Record<string, unknown>)[s.id]);
      out.answers[qid] = { slots, items: Array.isArray(a.items) ? a.items.filter((x): x is string => typeof x === 'string' && ids.has(x)) : [] };
    }
  }
  if (r.marks && typeof r.marks === 'object') {
    for (const [qid, v] of Object.entries(r.marks as Record<string, unknown>)) {
      const q = qs.get(qid);
      if (!q || !v || typeof v !== 'object') continue;
      const m = v as { points?: unknown; level?: unknown };
      const n = q.scheme.kind === 'points' ? q.scheme.points.length : 0;
      const levels = q.scheme.kind === 'levels' ? q.scheme.levels.map((l) => l.marks) : [];
      out.marks[qid] = {
        points: Array.isArray(m.points) ? [...new Set(m.points.filter((i): i is number => Number.isInteger(i) && i >= 0 && i < n))].sort((a, b) => a - b) : [],
        level: typeof m.level === 'string' && levels.includes(m.level) ? m.level : null,
      };
    }
  }
  if (Array.isArray(r.attempts)) {
    out.attempts = r.attempts
      .flatMap((t) => {
        if (!t || typeof t !== 'object') return [];
        const x = t as Partial<Attempt>;
        return typeof x.at === 'string' ? [{ at: x.at.slice(0, 40), reading: nat(x.reading), used: nat(x.used), allowed: nat(x.allowed) || WRITING_SECONDS }] : [];
      })
      .slice(-MAX_ATTEMPTS);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Self-marking                                                        */
/* ------------------------------------------------------------------ */

/** "7-8" as [7, 8]; "0" as [0, 0]. */
export function bandRange(band: string): [number, number] {
  const [a, b] = band.split('-').map(Number);
  return [a ?? 0, b ?? a ?? 0];
}

/** One question's self-mark as a range: points add up, capped at the marks; a level gives its band. Null when not yet marked. */
export function questionMark(q: P1Question, m: Mark | undefined): [number, number] | null {
  if (!m) return null;
  if (q.scheme.kind === 'points') {
    if (!m.points.length) return null;
    const pts = q.scheme.points;
    const sum = Math.min(q.marks, m.points.reduce((s, i) => s + (pts[i]?.marks ?? 0), 0));
    return [sum, sum];
  }
  return m.level === null ? null : bandRange(m.level);
}

export interface PaperTotal {
  /** Section A as marked so far, and how many of its questions are still to mark. */
  a: [number, number];
  aMax: number;
  aToMark: number;
  /** The chosen Section B question's mark, or null. */
  b: [number, number] | null;
  bMax: number;
  total: [number, number];
  max: number;
}

/** The self-marked total for the paper: every Section A question and the chosen Section B question. A self-mark is the reader's own judgement, never a grade. */
export function paperTotal(c: P1Case, w: CaseWork): PaperTotal {
  const A = c.questions.filter((q) => q.section === 'A');
  const marks = A.map((q) => questionMark(q, w.marks[q.id]));
  const a: [number, number] = [marks.reduce((s, m) => s + (m?.[0] ?? 0), 0), marks.reduce((s, m) => s + (m?.[1] ?? 0), 0)];
  const aMax = A.reduce((s, q) => s + q.marks, 0);
  const chosen = c.questions.find((q) => q.id === w.choice);
  const b = chosen ? questionMark(chosen, w.marks[chosen.id]) : null;
  const bMax = Math.max(0, ...c.questions.filter((q) => q.section === 'B').map((q) => q.marks));
  return { a, aMax, aToMark: marks.filter((m) => m === null).length, b, bMax, total: [a[0] + (b?.[0] ?? 0), a[1] + (b?.[1] ?? 0)], max: aMax + bMax };
}

/** "23" or "23 to 24", for a range of marks. */
export const fmtRange = (r: [number, number]) => (r[0] === r[1] ? String(r[0]) : `${r[0]} to ${r[1]}`);

/* ------------------------------------------------------------------ */
/* Structure checks on an answer                                       */
/* ------------------------------------------------------------------ */

export interface AnswerCheck {
  status: 'ok' | 'advice';
  text: string;
  standing: 'ib' | 'examiner' | 'strategy';
}

const filled = (s: string | undefined) => (s ?? '').trim().length > 3;
const words = (s: string | undefined) => (s ?? '').trim().split(/\s+/).filter(Boolean).length;
const CONDITION = /\b(if|unless|provided|as long as|only when|depends|on condition)\b/i;
const LIMIT = /\b(does not|doesn't|no figure|not (say|state|give|show|tell)|unclear|unknown|missing|cannot|only (from|of)|limit)/i;
const NUMBER = /\d/;

/**
 * What an answer's structure still needs, from the parts of a strong answer
 * for its command term and the evidence tied to it. These are prompts from the
 * platform's recommended construction and the creator's Paper 1 guide; they
 * say nothing about the quality of the argument and never mark the answer.
 */
export function answerChecks(q: P1Question, a: Answer | undefined, items: Evidence[], organization = ''): AnswerCheck[] {
  const out: AnswerCheck[] = [];
  const slot = (id: string) => a?.slots[id] ?? '';
  const ev = items.filter((e) => a?.items.includes(e.id));
  const empty = q.plan.filter((s) => !filled(slot(s.id)));
  if (empty.length === q.plan.length) return [{ status: 'advice', text: 'Nothing written yet: fill in each part of the answer below.', standing: 'strategy' }];
  for (const s of empty) out.push({ status: 'advice', text: `${s.title}: not written yet.`, standing: 'strategy' });
  const term = q.command;
  if (term === 'define' || term === 'state' || term === 'list') {
    const long = q.plan.filter((s) => words(slot(s.id)) > (term === 'define' ? 40 : 15));
    if (long.length) out.push({ status: 'advice', text: `${term === 'define' ? 'A definition needs two precise elements, not a paragraph' : 'This command term asks for a line, not a paragraph'}: keep the time for the longer questions.`, standing: 'examiner' });
    const name = organization.split(/\s+/)[0] ?? '';
    if (term === 'define' && name.length > 2 && new RegExp(`\\b${name}\\b`, 'i').test(Object.values(a?.slots ?? {}).join(' '))) out.push({ status: 'advice', text: 'The definition mentions the case. Define the term in general first; an example is not a definition.', standing: 'examiner' });
  }
  if (term === 'calculate') {
    if (!/[=÷×/*]/.test(slot('f'))) out.push({ status: 'advice', text: 'Write the formula, with its operation, before any figures.', standing: 'examiner' });
    if (!NUMBER.test(slot('s'))) out.push({ status: 'advice', text: 'The substitution needs the figures from the case.', standing: 'examiner' });
    if (filled(slot('a')) && !/[%$₵a-z]/i.test(slot('a'))) out.push({ status: 'advice', text: 'Give the answer with its unit: a missing % or currency sign can cost the mark.', standing: 'examiner' });
  }
  if (['explain', 'describe', 'suggest', 'analyse', 'outline'].includes(term) && q.plan.length === 2) {
    if (ev.length < 2) out.push({ status: 'advice', text: 'Tie a piece of case evidence to each point: answers to AO2 questions that are not applied to the case are typically limited to about half the marks (TSM, p. 56).', standing: 'ib' });
    const [p1, p2] = [slot('p1').toLowerCase(), slot('p2').toLowerCase()];
    const shared = p1 && p2 && p1.split(/\W+/).filter((w) => w.length > 6 && p2.includes(w)).length > 3;
    if (shared) out.push({ status: 'advice', text: 'The two points share many words: check they are distinct, each with its own evidence. Overlapping points earn less.', standing: 'examiner' });
  }
  if (q.section === 'B') {
    if (!filled(slot('for')) || !filled(slot('against'))) out.push({ status: 'advice', text: 'Develop both sides: a one-sided answer cannot reach the top levels.', standing: 'examiner' });
    if (filled(slot('limit')) && !LIMIT.test(slot('limit'))) out.push({ status: 'advice', text: 'Say exactly what the case does not tell you, and how that gap weakens the judgement.', standing: 'examiner' });
    if (!filled(slot('limit'))) out.push({ status: 'advice', text: 'No limitation of the case yet: the assessment guides report that without one, marks are limited to 8 of 10.', standing: 'examiner' });
    if (filled(slot('judge')) && !CONDITION.test(slot('judge'))) out.push({ status: 'advice', text: 'Give the judgement a condition: what it depends on, or when it would change.', standing: 'strategy' });
    if (ev.length < 2) out.push({ status: 'advice', text: 'Tie case evidence to the answer: the strongest responses integrate the case, not just its names.', standing: 'examiner' });
    if (!ev.some((e) => e.tag === 'data')) out.push({ status: 'advice', text: 'No figure from the case yet: a figure makes an argument specific.', standing: 'strategy' });
  }
  if (!out.length) out.push({ status: 'ok', text: 'Every part is there. Read it against the question once more: the command term, the number of points and the focus.', standing: 'strategy' });
  return out;
}

/** Every part of every answer written, as plain text for printing or notes. */
export function answersText(c: P1Case, w: CaseWork): string {
  const byId = new Map(w.items.map((e) => [e.id, e]));
  const lines = [`Paper 1 practice: ${c.title} (fictional)`, ''];
  for (const q of c.questions) {
    if (q.section === 'B' && w.choice && w.choice !== q.id) continue;
    lines.push(`${q.number} ${q.prompt.replace(/\*+/g, '')} [${q.marks}]`);
    const a = w.answers[q.id];
    for (const s of q.plan) {
      const t = (a?.slots[s.id] ?? '').trim();
      lines.push(`  ${s.title}: ${t || '(not written)'}`);
    }
    for (const id of a?.items ?? []) {
      const e = byId.get(id);
      if (e) lines.push(`  Evidence: "${e.text}"`);
    }
    const m = questionMark(q, w.marks[q.id]);
    if (m) lines.push(`  Self-mark: ${fmtRange(m)} of ${q.marks}`);
    lines.push('');
  }
  lines.push('The guidance and levels are the platform’s own, written for these questions. They are not an IB markscheme.');
  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/* Tools and stakeholders                                              */
/* ------------------------------------------------------------------ */

export interface ToolNote {
  tool: P1Tool;
  chosen: boolean;
  text: string;
}

/** Feedback on the tools chosen, and the strong fits not yet chosen. */
export function toolNotes(c: P1Case, chosen: string[]): ToolNote[] {
  const out: ToolNote[] = [];
  for (const t of c.tools) {
    const on = chosen.includes(t.id);
    if (on) {
      const lead = t.level === 'HL' ? 'Not for Paper 1.' : t.fit === 'strong' ? 'A strong fit.' : t.fit === 'possible' ? 'Possible, with care.' : 'A weak fit here.';
      out.push({ tool: t, chosen: true, text: `${lead} ${t.why}` });
    } else if (t.fit === 'strong') out.push({ tool: t, chosen: false, text: `Also consider it. ${t.why}` });
  }
  return out;
}

const KEY_WORDS = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .split(/[^a-z]+/)
    .filter((w) => w.length > 3 && !['the', 'and', 'staff', 'group', 'their'].includes(w));

/**
 * Which of the model's stakeholders the reader's rows name, matched by their
 * key words; and which are missing. A word two stakeholders share, such as
 * the surname of two founders, does not pick out either of them.
 */
export function compareStakeholders(model: P1Stakeholder[], rows: StakeRow[]): { found: P1Stakeholder[]; missing: P1Stakeholder[] } {
  const named = rows.map((r) => r.name.toLowerCase()).filter(Boolean);
  const keysOf = model.map((m) => KEY_WORDS(m.name));
  const shared = (w: string) => keysOf.filter((ks) => ks.includes(w)).length > 1;
  const found: P1Stakeholder[] = [];
  const missing: P1Stakeholder[] = [];
  model.forEach((m, i) => {
    const all = keysOf[i] ?? [];
    const own = all.filter((w) => !shared(w));
    const keys = own.length ? own : all;
    (named.some((n) => keys.some((k) => n.includes(k))) ? found : missing).push(m);
  });
  return { found, missing };
}

/** Adds evidence to a case's work, ignoring an exact duplicate (same words, same place, same tag) and anything past the cap. */
export function addItem(w: CaseWork, e: Omit<Evidence, 'id' | 'note'>, id: string): CaseWork {
  if (w.items.some((x) => x.tag === e.tag && x.para === e.para && x.start === e.start && x.end === e.end)) return w;
  if (w.items.length >= MAX_ITEMS) return w;
  return { ...w, items: [...w.items, { ...e, id, note: '' }] };
}
