/**
 * The learner's progress, read from what this browser keeps: which subtopics
 * have been studied and marked complete, the results of every kind of
 * practice, subtopic by subtopic, the weak areas those results show, and what
 * to revise next. Pure functions, shared by the dashboard
 * (src/scripts/dashboard.ts), the revision planner (src/scripts/planner.ts)
 * and the unit tests. None of them touches storage, and none trusts what it
 * reads: a damaged, old or hand-edited value gives an empty result, never an
 * error.
 *
 * The results come from six records, each the tool's own:
 * - bb:bank, the question bank's self-ratings (not yet, partly, secure);
 * - bb:q:<id>, a practice question's self-check against its mark scheme;
 * - bb:p2-practice, Paper 2 calculation practice: each kind of calculation
 *   tried and how often it was right first time;
 * - bb:cards, the flashcards' spaced repetition (box, due date, last rating);
 * - bb:rc:<set>, the recall cards on the subtopic pages (not yet, partly, got it);
 * - the exercise items checked, kept in bb:learner with the answers in bb:quiz:<id>.
 * Each result counts as a value from 0 to 1: a right, secure, got-it, good or
 * easy result is 1, a partial or hard one 0.5, a wrong, not-yet or again one
 * 0; a self-marked question counts its marks as a share of the total.
 */
import { CODE_RE, asObject, checkTally, cleanText, parseLog, type LearnerLog, type StudiedList } from './learner';
import { ratingsOf, selfCheck, type DashExercise, type DashQuestion, type DashRetrieval } from './dashboard';

type Plain = Record<string, unknown>;
const isPlain = (v: unknown): v is Plain => typeof v === 'object' && v !== null && !Array.isArray(v);
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A calendar day, YYYY-MM-DD, that exists. */
export function isDay(v: unknown): v is string {
  if (typeof v !== 'string' || !DAY_RE.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** Today in the reader's time zone, as YYYY-MM-DD. */
export function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ---------- Where revision happens ---------- */

/**
 * The pages a revision task links to. The flashcards and the revision sheets
 * are each in a page of their own; the rest are the Assessment Centre's.
 */
export const REVISION_LINKS = {
  flashcards: '/revision/flashcards/',
  planner: '/revision/planner/',
  bank: '/assessment/question-bank/',
  p2: '/assessment/paper-2/practice/',
  p1: '/assessment/paper-1/#p1-prac-h',
  p3: '/assessment/paper-3/#p3-prac-h',
  timed: '/assessment/question-bank/#bank-h',
} as const;

/** The flashcards on one subtopic, or all of them. */
export function flashcardsHref(code?: string): string {
  return code && CODE_RE.test(code) ? `${REVISION_LINKS.flashcards}?topic=${code}` : REVISION_LINKS.flashcards;
}

/** A subtopic's revision sheet, from its page's address: /topics/<slug>/ has its sheet at /revision/<slug>/. */
export function sheetHref(url: string): string {
  const m = /^\/topics\/([a-z0-9-]+)\/$/.exec(url);
  return m ? `/revision/${m[1]}/` : '/revision/';
}

/* ---------- The flashcards record: bb:cards ---------- */

export const CARDS_KEY = 'bb:cards';
export const CARD_RATINGS = ['again', 'hard', 'good', 'easy'] as const;
export type CardRating = (typeof CARD_RATINGS)[number];

export interface Card {
  id: string;
  /** The Leitner box, 1 (new or forgotten) to 5 (well known). */
  box: number;
  /** When it is next due, YYYY-MM-DD; null when the record does not say. */
  due: string | null;
  seen: number;
  last: string | null;
  rating: CardRating | null;
  codes: string[];
  title: string;
}

export interface CardsState {
  v: 1;
  /** Every card, by id order. */
  cards: Card[];
}

const CARD_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,119}$/;
export const MAX_CARDS = 5_000;

/**
 * Read the flashcards' record, written by the flashcards page:
 * { v: 1, cards: { <id>: { box, due, seen, last, rating, codes, title } } }.
 * It may be absent, from another version or hand-edited, so every field is
 * checked and a card that cannot be read is left out. It never throws.
 */
export function parseCards(raw: unknown): CardsState {
  const v = asObject(raw);
  if (!v || (v.v !== undefined && v.v !== 1) || !isPlain(v.cards)) return { v: 1, cards: [] };
  const cards: Card[] = [];
  for (const [id, c] of Object.entries(v.cards)) {
    if (cards.length >= MAX_CARDS) break;
    if (!CARD_ID_RE.test(id) || !isPlain(c)) continue;
    const box = typeof c.box === 'number' && Number.isInteger(c.box) && c.box >= 1 && c.box <= 5 ? c.box : null;
    if (box === null) continue;
    const seen = typeof c.seen === 'number' && Number.isFinite(c.seen) ? Math.min(100_000, Math.max(0, Math.floor(c.seen))) : 0;
    const last = typeof c.last === 'string' && c.last.length <= 40 && Number.isFinite(Date.parse(c.last)) ? new Date(c.last).toISOString() : null;
    const rating = typeof c.rating === 'string' && (CARD_RATINGS as readonly string[]).includes(c.rating) ? (c.rating as CardRating) : null;
    const codes = Array.isArray(c.codes) ? [...new Set(c.codes.filter((x): x is string => typeof x === 'string' && CODE_RE.test(x)))].slice(0, 8) : [];
    cards.push({ id, box, due: isDay(c.due) ? c.due : null, seen, last, rating, codes, title: cleanText(c.title, 140) ?? id });
  }
  cards.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { v: 1, cards };
}

/** A card is due on its due day and every day after, until it is reviewed. A card the reader has never seen is not due. */
export function isDue(card: Card, today: string): boolean {
  return card.seen > 0 && card.due !== null && card.due <= today;
}

/** Cards due today or earlier, by subtopic (a card on two subtopics counts for each), most due first. */
export function dueByCode(cards: CardsState, today: string): Array<{ code: string; due: number }> {
  const counts = new Map<string, number>();
  for (const c of cards.cards) if (isDue(c, today)) for (const code of c.codes) counts.set(code, (counts.get(code) ?? 0) + 1);
  return [...counts.entries()].map(([code, due]) => ({ code, due })).sort((a, b) => b.due - a.due || codeOrder(a.code) - codeOrder(b.code));
}

/** "3.10" after "3.9": the syllabus order of two codes. */
export function codeOrder(code: string): number {
  const [u, s] = code.split('.').map(Number);
  return (u ?? 0) * 100 + (s ?? 0);
}

/* ---------- Results subtopic by subtopic ---------- */

export const SOURCES = ['bank', 'questions', 'p2', 'cards', 'recall', 'exercises'] as const;
export type ResultSource = (typeof SOURCES)[number];

export const SOURCE_LABELS: Record<ResultSource, string> = {
  bank: 'Question bank',
  questions: 'Practice questions',
  p2: 'Paper 2 calculations',
  cards: 'Flashcards',
  recall: 'Recall cards',
  exercises: 'Exercises',
};

/** Results counted: how many, and their values added up (each from 0 to 1). */
export interface Tally {
  n: number;
  sum: number;
}

export interface CodeResults extends Tally {
  code: string;
  by: Partial<Record<ResultSource, Tally>>;
}

/** What the browser needs to place each record's results under its subtopics. */
export interface EvidenceConfig {
  /** Every question in the bank: [id, subtopic codes, paper style]. */
  bank: Array<[string, string[], string]>;
  /** The practice questions with mark schemes (their answers are kept as bb:q:<id>). */
  questions: DashQuestion[];
  exercises: DashExercise[];
  retrieval: DashRetrieval[];
  /** Paper 2 calculation practice: each kind of calculation and the subtopic it practises. */
  p2: Record<string, string>;
}

const BANK_VALUE: Record<number, number> = { 1: 0, 2: 0.5, 3: 1 };
const CARD_VALUE: Record<CardRating, number> = { again: 0, hard: 0.5, good: 1, easy: 1 };
const RECALL_VALUE: Record<number, number> = { 0: 0, 1: 0.5, 2: 1 };

interface BankRow {
  attempts: number;
  rating: 1 | 2 | 3 | null;
}

/** The question bank's record (bb:bank), read as the bank reads it: questions with at least one attempt, and the timed sets finished. */
export function readBank(raw: unknown): { items: Record<string, BankRow>; sets: number } {
  const v = asObject(raw);
  const items: Record<string, BankRow> = {};
  if (v && isPlain(v.items))
    for (const [id, r] of Object.entries(v.items)) {
      if (!isPlain(r) || id.length > 160) continue;
      const attempts = typeof r.attempts === 'number' && Number.isFinite(r.attempts) ? Math.max(0, Math.floor(r.attempts)) : 0;
      if (!attempts) continue;
      items[id] = { attempts, rating: r.rating === 1 || r.rating === 2 || r.rating === 3 ? r.rating : null };
    }
  const sets = v && Array.isArray(v.sets) ? v.sets.filter((s) => isPlain(s) && typeof s.at === 'string').length : 0;
  return { items, sets };
}

/** Paper 2 calculation practice (bb:p2-practice): each kind tried and right first time, and the timed sets with their marks. */
export function readP2(raw: unknown, kinds: Readonly<Record<string, string>>): { kinds: Record<string, { tried: number; right: number }>; timed: Array<{ marks: number; total: number }> } {
  const v = asObject(raw);
  const out: Record<string, { tried: number; right: number }> = {};
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.floor(x)) : 0);
  if (v && isPlain(v.kinds))
    for (const [id, k] of Object.entries(v.kinds)) {
      if (!Object.prototype.hasOwnProperty.call(kinds, id) || !isPlain(k)) continue;
      const tried = num(k.tried);
      if (tried) out[id] = { tried, right: Math.min(tried, num(k.right)) };
    }
  const timed: Array<{ marks: number; total: number }> = [];
  if (v && Array.isArray(v.timed))
    for (const t of v.timed) {
      if (!isPlain(t) || typeof t.at !== 'string') continue;
      const total = num(t.total);
      if (total) timed.push({ marks: Math.min(total, num(t.marks)), total });
    }
  return { kinds: out, timed };
}

/** The level a reader self-marked at, as its top mark: "5-6" is 6. */
const levelTop = (raw: unknown): number | null => {
  const level = asObject(raw)?.level;
  if (typeof level !== 'string' || !/^\d+(-\d+)?$/.test(level)) return null;
  const parts = level.split('-').map(Number);
  return parts[parts.length - 1] ?? null;
};

/**
 * Every result kept in this browser, placed under the subtopics it belongs
 * to: a question on two subtopics counts for both. `items` is every "bb:"
 * item with its raw value.
 */
export function resultsByCode(items: Readonly<Record<string, string>>, cfg: EvidenceConfig, log: LearnerLog = parseLog(items['bb:learner'])): Map<string, CodeResults> {
  const out = new Map<string, CodeResults>();
  const add = (code: string, source: ResultSource, value: number, weight = 1) => {
    if (!CODE_RE.test(code) || !(weight > 0) || !Number.isFinite(value)) return;
    const v = Math.min(1, Math.max(0, value)) * weight;
    const r = out.get(code) ?? { code, n: 0, sum: 0, by: {} };
    r.n += weight;
    r.sum += v;
    const s = r.by[source] ?? { n: 0, sum: 0 };
    s.n += weight;
    s.sum += v;
    r.by[source] = s;
    out.set(code, r);
  };

  // The question bank: a self-rating per question.
  const bank = readBank(items['bb:bank']);
  for (const [id, codes] of cfg.bank) {
    const rating = bank.items[id]?.rating;
    if (rating) for (const code of codes) add(code, 'bank', BANK_VALUE[rating] ?? 0);
  }

  // Practice questions: the marks the reader gave their own answer, as a share of the total.
  for (const q of cfg.questions) {
    const raw = items[`bb:q:${q.id}`];
    const sc = selfCheck(q, raw);
    if (!sc?.marked || q.marks <= 0) continue;
    const marks = sc.score ?? levelTop(raw);
    if (marks === null) continue;
    for (const code of q.codes) add(code, 'questions', marks / q.marks);
  }

  // Paper 2 calculation practice: every calculation tried, right first time or not.
  const p2 = readP2(items['bb:p2-practice'], cfg.p2);
  for (const [kind, k] of Object.entries(p2.kinds)) {
    const code = cfg.p2[kind];
    if (code && k.tried) add(code, 'p2', k.right / k.tried, k.tried);
  }

  // Flashcards: the last rating of every card reviewed.
  for (const c of parseCards(items['bb:cards']).cards) if (c.rating && c.seen > 0) for (const code of c.codes) add(code, 'cards', CARD_VALUE[c.rating]);

  // Recall cards on the subtopic pages.
  for (const set of cfg.retrieval) {
    const ratings = asObject(items[set.key]);
    if (!ratings) continue;
    for (const r of Object.values(ratings)) if (r === 0 || r === 1 || r === 2) for (const code of set.codes) add(code, 'recall', RECALL_VALUE[r] ?? 0);
  }

  // Exercise items checked, while the answer they were checked for still stands.
  for (const x of cfg.exercises) {
    const t = checkTally(log.checks[x.uid], asObject(items[`bb:quiz:${x.uid}`]) ?? {});
    if (!t.checked) continue;
    for (const code of x.codes) {
      add(code, 'exercises', 1, t.right);
      add(code, 'exercises', 0.5, t.partial);
      add(code, 'exercises', 0, t.wrong);
    }
  }
  return out;
}

/** The average of a tally, from 0 to 1; 0 when there is nothing. */
export const scoreOf = (t: Tally | undefined): number => (t && t.n > 0 ? t.sum / t.n : 0);

/** A share as a whole percentage: 0.375 is "38%". */
export const pct = (x: number): string => `${Math.round(Math.min(1, Math.max(0, x)) * 100)}%`;

/* ---------- Weak areas ---------- */

/** The rule for a weak area, shown to the reader in one sentence (WEAK_SENTENCE). */
export const WEAK_RULE = { min: 3, below: 0.6 } as const;

export const WEAK_SENTENCE = `A subtopic is a weak area when you have at least ${WEAK_RULE.min} results on it and they average under ${pct(WEAK_RULE.below)}, where a right, secure or recalled answer counts as 100%, a partial or hard one as 50%, and a wrong, not-yet or forgotten one as 0%.`;

export interface ProgressSubtopic {
  code: string;
  title: string;
  unit: number;
  /** As the guide sets it: SL/HL, HL (HL only) or SL/HL with HL-only content. */
  level: string;
  /** Its page. */
  url: string;
  mindmap?: string;
}

export type Level = 'SL' | 'HL';

/** Whether a subtopic is on the course at this level: at SL, the HL-only subtopics are not. */
export const atLevel = (s: Pick<ProgressSubtopic, 'level'>, level: Level): boolean => level === 'HL' || s.level !== 'HL';

export interface WeakArea {
  code: string;
  title: string;
  url: string;
  n: number;
  score: number;
  by: Partial<Record<ResultSource, Tally>>;
}

/** The weak areas among the subtopics at the reader's level, weakest first (then those with more results, then in syllabus order). */
export function weakAreas(results: ReadonlyMap<string, CodeResults>, subtopics: readonly ProgressSubtopic[], level: Level): WeakArea[] {
  const out: WeakArea[] = [];
  for (const s of subtopics) {
    const r = results.get(s.code);
    if (!r || !atLevel(s, level) || r.n < WEAK_RULE.min) continue;
    const score = scoreOf(r);
    if (score < WEAK_RULE.below) out.push({ code: s.code, title: s.title, url: s.url, n: r.n, score, by: r.by });
  }
  return out.sort((a, b) => a.score - b.score || b.n - a.n || codeOrder(a.code) - codeOrder(b.code));
}

/** "2 in the question bank (1 secure), 3 flashcards": where a subtopic's results come from, in words. */
export function sourcesWords(by: Partial<Record<ResultSource, Tally>>): string {
  return SOURCES.filter((s) => by[s]?.n)
    .map((s) => `${SOURCE_LABELS[s].toLowerCase()} ${pct(scoreOf(by[s]))} of ${by[s]!.n}`)
    .join(', ');
}

/* ---------- Studied and completed ---------- */

export interface SubtopicState {
  code: string;
  /** Its page or its mindmap opened. */
  visited: boolean;
  /** The latest visit to either, ISO; null when never. */
  lastVisit: string | null;
  /** Any result kept on it. */
  practised: boolean;
  /** Marked as complete on its page. */
  completed: boolean;
  completedAt: string | null;
  /** Visited, practised or completed. */
  studied: boolean;
  results: CodeResults | null;
}

/** Each subtopic's state, in the order given. */
export function subtopicStates(subtopics: readonly ProgressSubtopic[], log: LearnerLog, studied: StudiedList, results: ReadonlyMap<string, CodeResults>): SubtopicState[] {
  const last = new Map(log.visits.map((v) => [v.url, v.last]));
  return subtopics.map((s) => {
    const times = [last.get(s.url), s.mindmap ? last.get(s.mindmap) : undefined].filter((x): x is string => Boolean(x)).sort();
    const r = results.get(s.code) ?? null;
    const completedAt = studied.done[s.code] ?? null;
    const visited = times.length > 0;
    const practised = Boolean(r && r.n > 0);
    return { code: s.code, visited, lastVisit: times[times.length - 1] ?? null, practised, completed: completedAt !== null, completedAt, studied: visited || practised || completedAt !== null, results: r };
  });
}

export interface UnitProgress {
  number: number;
  title: string;
  /** Subtopics at the reader's level. */
  total: number;
  studied: number;
  completed: number;
}

/** Each unit's subtopics at the reader's level, how many are studied and how many completed. */
export function unitProgress(units: ReadonlyArray<{ number: number; title: string }>, subtopics: readonly ProgressSubtopic[], states: readonly SubtopicState[], level: Level): UnitProgress[] {
  const byCode = new Map(states.map((x) => [x.code, x]));
  return units.map((u) => {
    const subs = subtopics.filter((s) => s.unit === u.number && atLevel(s, level));
    return {
      number: u.number,
      title: u.title,
      total: subs.length,
      studied: subs.filter((s) => byCode.get(s.code)?.studied).length,
      completed: subs.filter((s) => byCode.get(s.code)?.completed).length,
    };
  });
}

const escXml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/**
 * Progress by unit as a compact chart: a row for each unit and a square for
 * each of its subtopics at the reader's level, filled when completed, half
 * filled when studied, an outline when not started, so the state is told by
 * shape as well as colour. An inline SVG whose title and description state
 * the result; the same figures are in the table beside it.
 */
export function progressChartSvg(units: readonly UnitProgress[], subtopics: readonly ProgressSubtopic[], states: readonly SubtopicState[], level: Level): string {
  const cell = 22;
  const gap = 4;
  const rowH = 30;
  const labelW = 56;
  const byCode = new Map(states.map((x) => [x.code, x]));
  const rows = units.map((u) => ({ u, subs: subtopics.filter((s) => s.unit === u.number && atLevel(s, level)) }));
  const most = Math.max(1, ...rows.map((r) => r.subs.length));
  const W = labelW + most * (cell + gap) + 70;
  const H = Math.max(1, rows.length) * rowH - (rowH - cell) + 2;
  const total = units.reduce((a, u) => a + u.total, 0);
  const studied = units.reduce((a, u) => a + u.studied, 0);
  const completed = units.reduce((a, u) => a + u.completed, 0);
  const title = `Subtopics at ${level}: ${studied} of ${total} studied, ${completed} completed`;
  const desc = `One square for each subtopic at ${level}, unit by unit: filled when you marked it complete, half filled when you have studied it, an outline when not started. ${units
    .map((u) => `Unit ${u.number}: ${u.studied} of ${u.total} studied, ${u.completed} completed`)
    .join('. ')}.`;
  let body = '';
  rows.forEach(({ u, subs }, i) => {
    const y = 1 + i * rowH;
    body += `<text class="pgc-label" x="0" y="${y + 15.5}">Unit ${u.number}</text>`;
    subs.forEach((s, j) => {
      const x = labelW + j * (cell + gap);
      const st = byCode.get(s.code);
      const state = st?.completed ? 'completed' : st?.studied ? 'studied' : 'none';
      if (state === 'completed') body += `<rect class="pgc-fill" x="${x}" y="${y}" width="${cell}" height="${cell}"/>`;
      if (state === 'studied') body += `<rect class="pgc-half" x="${x}" y="${y + cell / 2}" width="${cell}" height="${cell / 2}"/>`;
      body += `<rect class="pgc-cell pgc-cell--${state}" x="${x + 0.5}" y="${y + 0.5}" width="${cell - 1}" height="${cell - 1}"/>`;
    });
    body += `<text class="pgc-value" x="${labelW + subs.length * (cell + gap) + 4}" y="${y + 15.5}">${u.completed} of ${u.total}</text>`;
  });
  return `<svg class="pgc" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="pgc-title pgc-desc" focusable="false"><title id="pgc-title">${escXml(title)}</title><desc id="pgc-desc">${escXml(desc)}</desc>${body}</svg>`;
}

/* ---------- Practice performance ---------- */

export interface PracticeSummary {
  bank: { attempted: number; total: number; attempts: number; secure: number; partly: number; notYet: number; sets: number; byPaper: Array<{ paper: string; attempted: number; secure: number; total: number }> };
  questions: { answered: number; marked: number; total: number; marks: number; of: number };
  p2: { tried: number; right: number; timed: number; marks: number; total: number };
  cards: { reviewed: number; due: number; again: number; hard: number; good: number; easy: number };
  recall: { rated: number; got: number; partly: number; notYet: number };
  exercises: { checked: number; right: number; partial: number; wrong: number };
  /** Questions attempted in all: in the bank, the practice questions answered and the calculations tried. */
  attempted: number;
}

/** Bank questions by paper style, in this order; questions tied to no paper come last. */
export const PAPER_ORDER = ['paper-1', 'paper-2', 'paper-3', 'ia-skill', 'general'] as const;

/** Every kind of practice, counted from what this browser keeps. */
export function practiceSummary(items: Readonly<Record<string, string>>, cfg: EvidenceConfig, today: string, log: LearnerLog = parseLog(items['bb:learner'])): PracticeSummary {
  const bank = readBank(items['bb:bank']);
  const byPaper = new Map<string, { paper: string; attempted: number; secure: number; total: number }>();
  let attempted = 0;
  let attempts = 0;
  let secure = 0;
  let partly = 0;
  let notYet = 0;
  for (const [id, , paper] of cfg.bank) {
    const row = byPaper.get(paper) ?? { paper, attempted: 0, secure: 0, total: 0 };
    row.total += 1;
    const r = bank.items[id];
    if (r) {
      attempted += 1;
      attempts += r.attempts;
      row.attempted += 1;
      if (r.rating === 3) {
        secure += 1;
        row.secure += 1;
      } else if (r.rating === 2) partly += 1;
      else if (r.rating === 1) notYet += 1;
    }
    byPaper.set(paper, row);
  }
  const papers = [...byPaper.values()].sort((a, b) => PAPER_ORDER.indexOf(a.paper as (typeof PAPER_ORDER)[number]) - PAPER_ORDER.indexOf(b.paper as (typeof PAPER_ORDER)[number]));

  let answered = 0;
  let marked = 0;
  let marks = 0;
  let of = 0;
  for (const q of cfg.questions) {
    const raw = items[`bb:q:${q.id}`];
    const sc = selfCheck(q, raw);
    if (!sc) continue;
    answered += sc.answered || sc.marked ? 1 : 0;
    if (!sc.marked) continue;
    marked += 1;
    const m = sc.score ?? levelTop(raw);
    if (m !== null) {
      marks += Math.min(q.marks, m);
      of += q.marks;
    }
  }

  const p2 = readP2(items['bb:p2-practice'], cfg.p2);
  const tried = Object.values(p2.kinds).reduce((a, k) => a + k.tried, 0);
  const right = Object.values(p2.kinds).reduce((a, k) => a + k.right, 0);

  const cards = parseCards(items['bb:cards']).cards.filter((c) => c.seen > 0);
  const count = (r: CardRating) => cards.filter((c) => c.rating === r).length;

  const recall = { rated: 0, got: 0, partly: 0, notYet: 0 };
  for (const set of cfg.retrieval) {
    const r = ratingsOf(items[set.key]);
    recall.rated += r.rated;
    recall.got += r.got;
    recall.partly += r.partly;
    recall.notYet += r.notYet;
  }

  const exercises = { checked: 0, right: 0, partial: 0, wrong: 0 };
  for (const x of cfg.exercises) {
    const t = checkTally(log.checks[x.uid], asObject(items[`bb:quiz:${x.uid}`]) ?? {});
    exercises.checked += t.checked;
    exercises.right += t.right;
    exercises.partial += t.partial;
    exercises.wrong += t.wrong;
  }

  return {
    bank: { attempted, total: cfg.bank.length, attempts, secure, partly, notYet, sets: bank.sets, byPaper: papers },
    questions: { answered, marked, total: cfg.questions.length, marks, of },
    p2: { tried, right, timed: p2.timed.length, marks: p2.timed.reduce((a, t) => a + t.marks, 0), total: p2.timed.reduce((a, t) => a + t.total, 0) },
    cards: { reviewed: cards.length, due: cards.filter((c) => isDue(c, today)).length, again: count('again'), hard: count('hard'), good: count('good'), easy: count('easy') },
    recall,
    exercises,
    attempted: attempted + answered + tried,
  };
}

/* ---------- What to revise next ---------- */

export interface QueueLink {
  label: string;
  href: string;
}

export interface QueueItem {
  kind: 'plan' | 'cards' | 'weak' | 'new';
  code?: string;
  title: string;
  why: string;
  links: QueueLink[];
}

/** A planned session that is due: its date, what it is and where it is done. */
export interface DueSession {
  date: string;
  title: string;
  href: string;
  minutes: number;
  code?: string;
}

export interface QueueInput {
  today: string;
  level: Level;
  subtopics: readonly ProgressSubtopic[];
  states: readonly SubtopicState[];
  weak: readonly WeakArea[];
  cards: CardsState;
  /** The planner's sessions not yet done whose day has come, earliest first. */
  plan: readonly DueSession[];
}

/** How many of each kind the queue takes, in its order; the queue holds at most QUEUE_MAX. */
export const QUEUE_TAKE = { plan: 3, cards: 2, weak: 2, new: 2 } as const;
export const QUEUE_MAX = 7;

/** How the queue is ordered, in one sentence. */
export const QUEUE_SENTENCE =
  'In this order: the sessions your revision plan sets for today or has left overdue, then flashcards that are due, then your weakest subtopics, then subtopics at your level you have not started.';

const dayWords = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

/**
 * The revision queue for today: what to do next, most pressing first, each
 * with why it is there and where to do it. One item a subtopic at most,
 * except for planned sessions, which are the reader's own plan.
 */
export function revisionQueue(input: QueueInput): QueueItem[] {
  const out: QueueItem[] = [];
  const byCode = new Map(input.subtopics.map((s) => [s.code, s]));
  const taken = new Set<string>();
  const name = (code: string) => {
    const s = byCode.get(code);
    return s ? `${s.code} ${s.title}` : code;
  };

  for (const s of input.plan.slice(0, QUEUE_TAKE.plan)) {
    out.push({
      kind: 'plan',
      code: s.code,
      title: s.title,
      why: s.date < input.today ? `In your plan for ${dayWords(s.date)}, not yet done (${s.minutes} minutes)` : `In your plan for today (${s.minutes} minutes)`,
      links: [
        { label: 'Open it', href: s.href },
        { label: 'Mark it done in your plan', href: REVISION_LINKS.planner },
      ],
    });
  }

  const due = dueByCode(input.cards, input.today).filter((d) => byCode.has(d.code));
  for (const d of due.slice(0, QUEUE_TAKE.cards)) {
    taken.add(d.code);
    out.push({
      kind: 'cards',
      code: d.code,
      title: `Review ${d.due} ${d.due === 1 ? 'flashcard' : 'flashcards'} on ${name(d.code)}`,
      why: d.due === 1 ? 'Due today: the flashcards bring a card back just before it is forgotten' : 'Due today: the flashcards bring each card back just before it is forgotten',
      links: [{ label: 'Review them', href: flashcardsHref(d.code) }],
    });
  }
  // Cards due that name no subtopic: one item for all of them.
  const loose = input.cards.cards.filter((c) => isDue(c, input.today) && !c.codes.some((code) => byCode.has(code))).length;
  if (loose && out.filter((x) => x.kind === 'cards').length < QUEUE_TAKE.cards)
    out.push({ kind: 'cards', title: `Review ${loose} ${loose === 1 ? 'flashcard' : 'flashcards'}`, why: 'Due today', links: [{ label: 'Review them', href: flashcardsHref() }] });

  let weak = 0;
  for (const w of input.weak) {
    if (weak >= QUEUE_TAKE.weak) break;
    if (taken.has(w.code)) continue;
    taken.add(w.code);
    weak += 1;
    out.push({
      kind: 'weak',
      code: w.code,
      title: `Revise ${name(w.code)}`,
      why: `A weak area: ${w.n} ${w.n === 1 ? 'result averages' : 'results average'} ${pct(w.score)}`,
      links: [
        { label: 'Its revision sheet', href: sheetHref(w.url) },
        { label: 'Its flashcards', href: flashcardsHref(w.code) },
      ],
    });
  }

  let fresh = 0;
  const states = new Map(input.states.map((x) => [x.code, x]));
  for (const s of input.subtopics) {
    if (fresh >= QUEUE_TAKE.new) break;
    if (!atLevel(s, input.level) || states.get(s.code)?.studied || taken.has(s.code)) continue;
    taken.add(s.code);
    fresh += 1;
    out.push({ kind: 'new', code: s.code, title: `Start ${name(s.code)}`, why: `Not opened yet, and on the ${input.level} course`, links: [{ label: 'Open it', href: s.url }] });
  }
  return out.slice(0, QUEUE_MAX);
}
