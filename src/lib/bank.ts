/**
 * The question bank: classification, filtering, timed sets, progress and
 * export for every original practice question on the platform. Pure
 * functions with no content imports, so the page, the browser script and the
 * unit tests share them. The bank itself is assembled from the corpus by
 * src/lib/bank-build.ts.
 *
 * Paces for timed sets are each paper's time divided by its marks, from the
 * guide's assessment outlines (pp. 39 to 40). The guide sets the time and the
 * marks of each paper; it does not set a time per mark, so the pace is the
 * platform's recommendation, and the page says so.
 */
import { seeded } from './random';

export { seeded };

export type Ao = 'AO1' | 'AO2' | 'AO3' | 'AO4';
export type PaperStyle = 'paper-1' | 'paper-2' | 'paper-3' | 'ia-skill' | 'general';
export type QType = 'definition' | 'explanation' | 'evaluation' | 'calculation' | 'construction';
export type Band = '1-2' | '3-5' | '6-9' | '10+';
export type BankSource = 'question' | 'note' | 'case';
export type BankLevel = 'SL/HL' | 'HL';

/** What the browser needs to filter, search, time and track one question. */
export interface Facets {
  id: string;
  /** Every unit the question draws on (a question on 5.5 and 3.3 is in units 5 and 3). */
  units: number[];
  codes: string[];
  paper: PaperStyle;
  level: BankLevel;
  command: string;
  ao: Ao;
  marks: number;
  band: Band;
  type: QType;
  source: BankSource;
  title: string;
  /** Lower-case plain text searched by the search box. */
  text: string;
}

export const PAPER_LABELS: Record<PaperStyle, string> = {
  'paper-1': 'Paper 1 style',
  'paper-2': 'Paper 2 style',
  'paper-3': 'Paper 3 style',
  'ia-skill': 'IA skill',
  general: 'Not tied to a paper',
};

export const TYPE_LABELS: Record<QType, string> = {
  definition: 'Definition',
  explanation: 'Explanation and analysis',
  evaluation: 'Evaluation and judgement',
  calculation: 'Calculation',
  construction: 'Construction',
};

export const BAND_LABELS: Record<Band, string> = {
  '1-2': '1 to 2 marks',
  '3-5': '3 to 5 marks',
  '6-9': '6 to 9 marks',
  '10+': '10 marks or more',
};

export const SOURCE_LABELS: Record<BankSource, string> = {
  question: 'Practice question',
  note: 'From the notes',
  case: 'From a case file',
};

export const AO_LABELS: Record<Ao, string> = {
  AO1: 'AO1 Knowledge and understanding',
  AO2: 'AO2 Application and analysis',
  AO3: 'AO3 Synthesis and evaluation',
  AO4: 'AO4 Use and application of skills',
};

const CONSTRUCT = new Set(['annotate', 'complete', 'construct', 'draw', 'label', 'plot', 'prepare']);

/** The kind of response a question asks for, from its command term, AO and the question's own flags. */
export function questionType(command: string, ao: Ao, flags: { calculation?: boolean; evaluation?: boolean } = {}): QType {
  if (flags.calculation || command === 'calculate' || command === 'determine') return 'calculation';
  if (CONSTRUCT.has(command)) return 'construction';
  if (command === 'define') return 'definition';
  if (ao === 'AO3' || flags.evaluation) return 'evaluation';
  return 'explanation';
}

export function marksBand(marks: number): Band {
  if (marks <= 2) return '1-2';
  if (marks <= 5) return '3-5';
  if (marks <= 9) return '6-9';
  return '10+';
}

/** The unit a subtopic code belongs to: "3.10" is in unit 3. */
export function unitOf(code: string): number | null {
  const n = Number(code.split('.')[0]);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

/** Lower-case text with marks, punctuation and runs of space removed, for searching. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[*_`[\]()#>]/g, ' ')
    .replace(/[^a-z0-9%$.,'&\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when every word of the query appears in the text. An empty query matches everything. */
export function matchesQuery(text: string, query: string): boolean {
  const words = normalize(query)
    .split(' ')
    .map((w) => w.replace(/^[.,']+|[.,']+$/g, ''))
    .filter(Boolean);
  if (!words.length) return true;
  const hay = normalize(text);
  return words.every((w) => hay.includes(w));
}

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

export type StatusFilter = '' | 'new' | 'attempted' | 'not-secure' | 'secure';

export interface BankFilters {
  unit: number | null;
  code: string;
  paper: PaperStyle | '';
  /** "SL" hides HL-only questions; "HL" shows only HL-only questions. */
  level: '' | 'SL' | 'HL';
  command: string;
  ao: Ao | '';
  band: Band | '';
  type: QType | '';
  status: StatusFilter;
  query: string;
}

export const NO_FILTERS: BankFilters = { unit: null, code: '', paper: '', level: '', command: '', ao: '', band: '', type: '', status: '', query: '' };

export function statusOf(rec: BankRecord | undefined): Exclude<StatusFilter, '' | 'not-secure'> {
  if (!rec || rec.attempts === 0) return 'new';
  return rec.rating === 3 ? 'secure' : 'attempted';
}

export function matches(f: Facets, filters: BankFilters, state?: BankState): boolean {
  if (filters.unit !== null && !f.units.includes(filters.unit)) return false;
  if (filters.code && !f.codes.includes(filters.code)) return false;
  if (filters.paper && f.paper !== filters.paper) return false;
  if (filters.level === 'SL' && f.level === 'HL') return false;
  if (filters.level === 'HL' && f.level !== 'HL') return false;
  if (filters.command && f.command !== filters.command) return false;
  if (filters.ao && f.ao !== filters.ao) return false;
  if (filters.band && f.band !== filters.band) return false;
  if (filters.type && f.type !== filters.type) return false;
  if (filters.status) {
    const st = statusOf(state?.items[f.id]);
    if (filters.status === 'not-secure' ? st === 'secure' : filters.status === 'attempted' ? st === 'new' : st !== filters.status) return false;
  }
  return matchesQuery(f.text, filters.query);
}

/** How many filters are set, for the "clear filters" control. */
export function activeFilters(filters: BankFilters): number {
  return (Object.keys(NO_FILTERS) as Array<keyof BankFilters>).filter((k) => filters[k] !== NO_FILTERS[k]).length;
}

/* ------------------------------------------------------------------ */
/* Saved progress: bb:bank                                             */
/* ------------------------------------------------------------------ */

/** 1: not yet, 2: partly, 3: secure. */
export type Rating = 1 | 2 | 3;

export const RATING_LABELS: Record<Rating, string> = {
  1: 'Not yet',
  2: 'Partly',
  3: 'Secure',
};

export const RATING_HINTS: Record<Rating, string> = {
  1: 'Most of the guidance was missing from my answer',
  2: 'Some of it was there, not all',
  3: 'My answer did what the guidance describes',
};

export interface BankRecord {
  attempts: number;
  rating: Rating | null;
  /** The last day it was attempted, as YYYY-MM-DD. */
  last: string;
}

export interface SetRecord {
  /** When the set finished, as an ISO timestamp. */
  at: string;
  pace: PaceId;
  ids: string[];
  marks: number;
  /** Time allowed and time used, in seconds. */
  allowed: number;
  used: number;
  /** The self-rating given to each question, in order (null when not rated). */
  ratings: Array<Rating | null>;
}

export interface BankState {
  v: 1;
  items: Record<string, BankRecord>;
  sets: SetRecord[];
}

export const MAX_SETS = 50;

export const emptyState = (): BankState => ({ v: 1, items: {}, sets: [] });

const isRating = (x: unknown): x is Rating => x === 1 || x === 2 || x === 3;
const isDay = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);

/** Reads saved progress defensively: anything malformed is dropped, never thrown. */
export function parseState(raw: unknown): BankState {
  const out = emptyState();
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as { items?: unknown; sets?: unknown };
  if (r.items && typeof r.items === 'object') {
    for (const [id, v] of Object.entries(r.items as Record<string, unknown>)) {
      if (!v || typeof v !== 'object') continue;
      const rec = v as { attempts?: unknown; rating?: unknown; last?: unknown };
      const attempts = typeof rec.attempts === 'number' && Number.isFinite(rec.attempts) ? Math.max(0, Math.floor(rec.attempts)) : 0;
      if (!attempts) continue;
      out.items[id] = { attempts, rating: isRating(rec.rating) ? rec.rating : null, last: isDay(rec.last) ? rec.last : '' };
    }
  }
  if (Array.isArray(r.sets)) {
    for (const s of r.sets) {
      if (!s || typeof s !== 'object') continue;
      const x = s as Partial<SetRecord>;
      if (typeof x.at !== 'string' || !isPace(x.pace) || !Array.isArray(x.ids)) continue;
      const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0);
      out.sets.push({
        at: x.at,
        pace: x.pace,
        ids: x.ids.filter((i): i is string => typeof i === 'string'),
        marks: num(x.marks),
        allowed: num(x.allowed),
        used: num(x.used),
        ratings: Array.isArray(x.ratings) ? x.ratings.map((v) => (isRating(v) ? v : null)) : [],
      });
    }
    out.sets = out.sets.slice(-MAX_SETS);
  }
  return out;
}

/**
 * Records a self-rating. The first rating on a given day counts as an
 * attempt; changing the rating later the same day corrects it without
 * counting a second attempt.
 */
export function rate(state: BankState, id: string, rating: Rating, today: string): BankState {
  const prev = state.items[id];
  const newDay = !prev || prev.last !== today;
  const rec: BankRecord = { attempts: (prev?.attempts ?? 0) + (newDay ? 1 : 0), rating, last: today };
  return { ...state, items: { ...state.items, [id]: rec } };
}

/** Removes one question's record. */
export function clearItem(state: BankState, id: string): BankState {
  const items = { ...state.items };
  delete items[id];
  return { ...state, items };
}

/** Records a finished timed set, and a rating for each question rated in it. */
export function recordSet(state: BankState, set: SetRecord, today: string): BankState {
  let next = state;
  set.ids.forEach((id, i) => {
    const r = set.ratings[i];
    if (r) next = rate(next, id, r, today);
  });
  return { ...next, sets: [...next.sets, set].slice(-MAX_SETS) };
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

export interface ProgressRow {
  key: string;
  total: number;
  attempted: number;
  secure: number;
}

/** Counts by unit (a question spanning two units counts in each) or by command term. */
export function progressBy(items: Facets[], state: BankState, by: 'unit' | 'command'): ProgressRow[] {
  const rows = new Map<string, ProgressRow>();
  for (const f of items) {
    const keys = by === 'unit' ? f.units.map(String) : [f.command];
    const st = statusOf(state.items[f.id]);
    for (const key of keys) {
      const row = rows.get(key) ?? { key, total: 0, attempted: 0, secure: 0 };
      row.total += 1;
      if (st !== 'new') row.attempted += 1;
      if (st === 'secure') row.secure += 1;
      rows.set(key, row);
    }
  }
  return [...rows.values()];
}

export function totals(items: Facets[], state: BankState): { total: number; attempted: number; secure: number; marks: number } {
  let attempted = 0;
  let secure = 0;
  for (const f of items) {
    const st = statusOf(state.items[f.id]);
    if (st !== 'new') attempted++;
    if (st === 'secure') secure++;
  }
  return { total: items.length, attempted, secure, marks: items.reduce((s, f) => s + f.marks, 0) };
}

/* ------------------------------------------------------------------ */
/* Timed sets                                                          */
/* ------------------------------------------------------------------ */

export const PACE_IDS = ['paper-1', 'paper-2-sl', 'paper-2-hl', 'paper-3'] as const;
export type PaceId = (typeof PACE_IDS)[number];
const isPace = (x: unknown): x is PaceId => typeof x === 'string' && (PACE_IDS as readonly string[]).includes(x);

export interface Pace {
  id: PaceId;
  label: string;
  /** The paper's time and marks, from the guide's assessment outlines. */
  minutes: number;
  marks: number;
  paper: Extract<PaperStyle, 'paper-1' | 'paper-2' | 'paper-3'>;
  /** Questions an SL student would not meet are left out of an SL set. */
  slOnly: boolean;
}

/** "1 hour 30 minutes" is 90; "1 hour 45 minutes" is 105; "75 minutes" is 75. */
export function parseDuration(s: string): number | null {
  const h = /(\d+)\s*hours?/.exec(s);
  const m = /(\d+)\s*minutes?/.exec(s);
  if (!h && !m) return null;
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
}

export const minutesPerMark = (p: Pace): number => p.minutes / p.marks;

/** Time allowed for a set, in whole seconds, at the paper's pace. */
export function setSeconds(marks: number, p: Pace): number {
  return Math.round(marks * minutesPerMark(p) * 60);
}

/** "2.25 minutes a mark" and similar, without trailing zeros. */
export function fmtPace(p: Pace): string {
  const v = Math.round(minutesPerMark(p) * 100) / 100;
  return `${String(v)} ${v === 1 ? 'minute' : 'minutes'} a mark`;
}

/** 4,530 seconds as "1 h 15 min 30 s"; 330 as "5 min 30 s". */
export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const parts = [h ? `${h} h` : '', m ? `${m} min` : '', r || (!h && !m) ? `${r} s` : ''].filter(Boolean);
  return parts.join(' ');
}

/** A countdown display: 75:00, 04:05, or 1:02:03 past an hour. */
export function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${two(m)}:${two(r)}` : `${two(m)}:${two(r)}`;
}

/** Questions a timed set at this pace can draw on. */
export function inPace(f: Facets, p: Pace, includeGeneral: boolean): boolean {
  if (p.slOnly && f.level === 'HL') return false;
  if (f.paper === p.paper) return true;
  return includeGeneral && f.paper === 'general';
}

/**
 * Draws up to n questions for a set: shuffled from the seed, then the ones
 * practised least come first, so a set favours what you have not yet done.
 */
export function drawSet(pool: Facets[], n: number, seed: number, state: BankState): Facets[] {
  const rnd = seeded(seed);
  const order = pool.map((f) => ({ f, k: rnd() }));
  order.sort((a, b) => (state.items[a.f.id]?.attempts ?? 0) - (state.items[b.f.id]?.attempts ?? 0) || a.k - b.k);
  return order.slice(0, Math.max(0, n)).map((x) => x.f);
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

const csvCell = (v: string | number): string => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const CSV_HEADER = ['Question', 'Where it is from', 'Paper style', 'Units', 'Subtopics', 'Command term', 'AO', 'Marks', 'Attempts', 'Last attempted', 'Self-rating'];

/** One row for every question you have attempted, in bank order. */
export function bankCsv(items: Facets[], state: BankState, commandName: (id: string) => string): string {
  const rows = items
    .filter((f) => state.items[f.id])
    .map((f) => {
      const rec = state.items[f.id] as BankRecord;
      return [
        f.title,
        SOURCE_LABELS[f.source],
        PAPER_LABELS[f.paper],
        f.units.join(' and '),
        f.codes.join(' and '),
        commandName(f.command),
        f.ao,
        f.marks,
        rec.attempts,
        rec.last,
        rec.rating ? RATING_LABELS[rec.rating] : 'Not rated',
      ];
    });
  return [CSV_HEADER, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}
