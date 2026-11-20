/**
 * The Smart Revision Planner (/revision/planner/): a week-by-week revision
 * plan from the date of the first examination paper, the level, the
 * subtopics to revise, the hours a week and the study days. Pure functions,
 * shared by the page, its script (src/scripts/planner.ts), the dashboard's
 * revision queue and the unit tests; nothing here touches storage.
 *
 * How a plan is made (buildPlan), every rule the platform's recommendation,
 * not an IB requirement:
 * - The days from the start to the examination are counted, and the last
 *   few are left free: about one day in every fortnight, from one to five
 *   (none when the examination is under a week away).
 * - Each study day is split into equal sessions of about 45 minutes, from the
 *   hours a week and the number of study days.
 * - About one session in four is examination practice, rotating case
 *   practice in the style of Paper 1, Paper 2 calculations and, at HL only,
 *   Paper 3. In the last two weeks before the free days (the last third of a
 *   short plan), every other session is timed practice at a paper's pace.
 * - Every subtopic is met at least twice: first to learn it (or review it,
 *   when it has been studied), then to retrieve it from memory a set gap
 *   later (a week, or less in a short plan). A third meeting, retrieving it
 *   again after twice the gap, is added where there is room. Weak subtopics
 *   start first, then those not yet studied, then the rest, in syllabus order.
 * - A subtopic starts only when every retrieval already planned, and its
 *   own, still has a session on a later day, so no subtopic is left met once;
 *   a retrieval is brought forward only when the sessions would otherwise run
 *   out. Subtopics that do not fit are listed, not hidden.
 * - Sessions left over when every subtopic is placed become more practice.
 * Regenerating keeps the sessions marked done and plans the rest from today:
 * a subtopic met once already needs only its retrieval.
 */
import { CODE_RE, cleanText } from './learner';
import { REVISION_LINKS, codeOrder, flashcardsHref, isDay } from './progress';

export const PLANNER_KEY = 'bb:planner';

export type Level = 'SL' | 'HL';
export type Paper = 'paper-1' | 'paper-2' | 'paper-3';

export interface PlannerTopic {
  code: string;
  title: string;
  unit: number;
  /** As the guide sets it: SL/HL, HL (HL only) or SL/HL with HL-only content. */
  level: string;
  url: string;
}

/** A family of Paper 2 calculations, as calculation practice groups them. */
export interface CalcFamily {
  id: string;
  label: string;
  /** The subtopic it practises. */
  code: string;
  hl: boolean;
}

export interface PlannerContext {
  /** Every subtopic, in syllabus order. */
  topics: PlannerTopic[];
  /** Each paper's time in minutes, from the guide's assessment outlines. */
  papers: Record<'paper-1' | 'paper-2-sl' | 'paper-2-hl' | 'paper-3', number>;
  calc: CalcFamily[];
}

export interface PlannerInput {
  /** The day revision starts, YYYY-MM-DD. */
  start: string;
  /** The day of the first examination paper, YYYY-MM-DD. */
  exam: string;
  level: Level;
  /** Hours a week. */
  hours: number;
  /** Study days of the week, 1 (Monday) to 7 (Sunday). */
  days: number[];
  /** The subtopics to revise, by code. */
  topics: string[];
  /** The subtopics to start first, weakest first. */
  weak: string[];
  /** The subtopics already studied: their first session is a review, not a first learning. */
  studied: string[];
}

export const SESSION_KINDS = ['learn', 'review', 'retrieve', 'case', 'calc', 'paper3', 'timed'] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];
const TOPIC_KINDS: readonly SessionKind[] = ['learn', 'review', 'retrieve'];

export const KIND_LABELS: Record<SessionKind, string> = {
  learn: 'Learn',
  review: 'Review',
  retrieve: 'Retrieve',
  case: 'Case practice',
  calc: 'Calculations',
  paper3: 'Paper 3',
  timed: 'Timed practice',
};

export interface Session {
  id: string;
  date: string;
  kind: SessionKind;
  minutes: number;
  /** The subtopic: for learn, review and retrieve, and the one a calculation family practises. */
  code?: string;
  /** For a subtopic: 1 learn or review, 2 retrieve, 3 retrieve again. */
  n?: number;
  /** For timed practice: the paper whose pace it keeps. */
  paper?: Paper;
  /** For calculations: the family. */
  family?: string;
}

/** Everything about a plan except its sessions. */
export interface PlanMeta {
  /** The first day planned, and the last study day before the free days. */
  from: string;
  last: string;
  exam: string;
  /** Days left free before the examination. */
  buffer: number;
  /** Minutes a session, and sessions a study day. */
  slot: number;
  perDay: number;
  /** Days between learning a subtopic and retrieving it. */
  gap: number;
  /** The first day of the final phase, when every other session is timed practice. */
  finalFrom: string;
  notFitted: string[];
  warnings: string[];
}

export type Field = 'exam' | 'start' | 'level' | 'hours' | 'days' | 'topics';

export type PlanResult = { ok: true; plan: PlanMeta; sessions: Session[]; input: PlannerInput } | { ok: false; field: Field; error: string };

/* ---------- Days ---------- */

const DAY_MS = 86_400_000;

/** A calendar day as a whole number of days since 1 January 1970; null when it is not a real day. */
export function dayNum(s: string): number | null {
  return isDay(s) ? Math.round(Date.parse(`${s}T00:00:00Z`) / DAY_MS) : null;
}

export const dayStr = (n: number): string => new Date(n * DAY_MS).toISOString().slice(0, 10);

/** 1 for Monday to 7 for Sunday. */
export const isoWeekday = (n: number): number => ((new Date(n * DAY_MS).getUTCDay() + 6) % 7) + 1;

export const WEEKDAYS = [
  { n: 1, name: 'Monday', short: 'Mon' },
  { n: 2, name: 'Tuesday', short: 'Tue' },
  { n: 3, name: 'Wednesday', short: 'Wed' },
  { n: 4, name: 'Thursday', short: 'Thu' },
  { n: 5, name: 'Friday', short: 'Fri' },
  { n: 6, name: 'Saturday', short: 'Sat' },
  { n: 7, name: 'Sunday', short: 'Sun' },
] as const;

/** "Tuesday 1 December 2026". */
export const longDay = (s: string): string => (isDay(s) ? new Date(`${s}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : s);
/** "Tue 1 Dec". */
export const shortDay = (s: string): string => (isDay(s) ? new Date(`${s}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) : s);
/** "1 December". */
export const dayMonth = (s: string): string => (isDay(s) ? new Date(`${s}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' }) : s);

/** 40 as "40 min", 90 as "1 h 30 min", 120 as "2 h". */
export function fmtMinutes(m: number): string {
  const v = Math.max(0, Math.round(m));
  const h = Math.floor(v / 60);
  const r = v % 60;
  return h ? `${h} h${r ? ` ${r} min` : ''}` : `${r} min`;
}

/* ---------- The rules, as numbers ---------- */

export const RULES = {
  /** The planner plans up to a year ahead. */
  maxDays: 366,
  hours: { min: 1, max: 40 },
  /** The shortest session a day can hold. */
  minSlot: 15,
  /** The length a session aims for. */
  aimSlot: 45,
  /** One session in this many is practice, before the final phase. */
  practiceEvery: 4,
  /** In the final phase, one session in this many is timed practice. */
  finalEvery: 2,
  /** The final phase: the last 14 days, or the last third of a plan under six weeks. */
  finalDays: 14,
  /** The gap between learning and retrieving: a week, or a fifth of a plan under five weeks (at least 2 days). */
  gapDays: 7,
  minGap: 2,
  /** Days left free: one a fortnight, from 1 to 5, none under a week. */
  bufferEvery: 14,
  maxBuffer: 5,
} as const;

/** Days left free before the examination when it is `days` away. */
export function bufferFor(days: number): number {
  return days < 7 ? 0 : Math.min(RULES.maxBuffer, Math.max(1, Math.round(days / RULES.bufferEvery)));
}

/** The gap between learning a subtopic and retrieving it, in a study period of `period` days. */
export function gapFor(period: number): number {
  return period >= RULES.gapDays * 5 ? RULES.gapDays : Math.max(RULES.minGap, Math.floor(period / 5));
}

/** Sessions a study day and their length, from the minutes a study day: about 45 minutes each, rounded down to 5. */
export function sessionsFor(minutesPerDay: number): { perDay: number; slot: number } {
  const perDay = Math.max(1, Math.round(minutesPerDay / RULES.aimSlot));
  return { perDay, slot: Math.max(RULES.minSlot, Math.floor(minutesPerDay / perDay / 5) * 5) };
}

/** Whether a subtopic is on the course at this level. */
const atLevel = (t: Pick<PlannerTopic, 'level'>, level: Level) => level === 'HL' || t.level !== 'HL';

const isTopicKind = (k: SessionKind) => TOPIC_KINDS.includes(k);

/* ---------- Checking the input ---------- */

const unique = <T>(xs: readonly T[]) => [...new Set(xs)];

/** The input as the planner uses it, or the first problem with it and the field it belongs to. */
export function checkInput(input: PlannerInput, ctx: PlannerContext, from?: string): { ok: true; input: PlannerInput; dropped: string[] } | { ok: false; field: Field; error: string } {
  const exam = dayNum(input.exam);
  if (exam === null) return { ok: false, field: 'exam', error: 'Enter the date of your first examination paper, as a full date.' };
  const start = dayNum(input.start);
  if (start === null) return { ok: false, field: 'start', error: 'Enter the day you start revising, as a full date.' };
  const first = Math.max(start, from ? (dayNum(from) ?? start) : start);
  if (exam < first && first > start) return { ok: false, field: 'exam', error: 'That examination date has passed. Enter the date of your next paper.' };
  if (exam === first && first > start) return { ok: false, field: 'exam', error: 'The examination is today, so there is nothing left to plan.' };
  if (exam <= first) return { ok: false, field: 'exam', error: 'The examination must come after the day you start.' };
  if (exam - first > RULES.maxDays) return { ok: false, field: 'exam', error: 'Choose an examination within a year of the start: the planner plans revision, not a whole course.' };
  if (input.level !== 'SL' && input.level !== 'HL') return { ok: false, field: 'level', error: 'Choose SL or HL.' };
  if (typeof input.hours !== 'number' || !Number.isFinite(input.hours) || input.hours < RULES.hours.min || input.hours > RULES.hours.max)
    return { ok: false, field: 'hours', error: `Enter the hours you can give each week, from ${RULES.hours.min} to ${RULES.hours.max}.` };
  const days = unique((Array.isArray(input.days) ? input.days : []).filter((d) => Number.isInteger(d) && d >= 1 && d <= 7)).sort((a, b) => a - b);
  if (!days.length) return { ok: false, field: 'days', error: 'Choose at least one study day.' };
  if ((input.hours * 60) / days.length < RULES.minSlot) return { ok: false, field: 'hours', error: `That leaves under ${RULES.minSlot} minutes on each study day: give more hours, or choose fewer days.` };
  const known = new Map(ctx.topics.map((t) => [t.code, t]));
  const asked = unique((Array.isArray(input.topics) ? input.topics : []).filter((c) => known.has(c)));
  const topics = ctx.topics.filter((t) => asked.includes(t.code) && atLevel(t, input.level)).map((t) => t.code);
  const dropped = asked.filter((c) => !topics.includes(c));
  if (!topics.length) return { ok: false, field: 'topics', error: dropped.length ? 'Every subtopic you chose is HL only. Choose subtopics on the SL course, or choose HL.' : 'Choose at least one subtopic to revise.' };
  const weak = unique((Array.isArray(input.weak) ? input.weak : []).filter((c) => topics.includes(c)));
  const studied = unique((Array.isArray(input.studied) ? input.studied : []).filter((c) => known.has(c)));
  return { ok: true, input: { start: input.start, exam: input.exam, level: input.level, hours: input.hours, days, topics, weak, studied }, dropped };
}

/* ---------- Building a plan ---------- */

interface Meeting {
  code: string;
  n: number;
  /** The study day (index) of the previous meeting; -1 when it was before this plan. */
  prev: number;
  /** The day number it is due. */
  due: number;
  rank: number;
}

const byDue = (a: Meeting, b: Meeting) => a.due - b.due || a.rank - b.rank;

/**
 * A plan from `from` (the start, or today when regenerating, whichever is
 * later) to the examination. `history` is the sessions already done, from
 * earlier plans: a subtopic met in them is not started again. `gen` numbers
 * the plan, so the new sessions' ids never meet the old ones'.
 */
export function buildPlan(raw: PlannerInput, ctx: PlannerContext, opts: { from?: string; history?: readonly Session[]; gen?: number } = {}): PlanResult {
  const checked = checkInput(raw, ctx, opts.from);
  if (!checked.ok) return checked;
  const input = checked.input;
  const gen = Math.max(1, Math.floor(opts.gen ?? 1));
  const start = dayNum(input.start)!;
  const exam = dayNum(input.exam)!;
  const from = Math.max(start, opts.from ? (dayNum(opts.from) ?? start) : start);
  const span = exam - from;
  const buffer = bufferFor(span);
  const last = exam - buffer - 1;
  const studyDays: number[] = [];
  for (let d = from; d <= last; d++) if (input.days.includes(isoWeekday(d))) studyDays.push(d);
  if (!studyDays.length) return { ok: false, field: 'days', error: 'None of your study days falls between the start and the examination. Choose more days, or an earlier start.' };

  const { perDay, slot } = sessionsFor((input.hours * 60) / input.days.length);
  const period = last - from + 1;
  const gap = gapFor(period);
  const finalFrom = last - (period >= RULES.finalDays * 3 ? RULES.finalDays : Math.ceil(period / 3)) + 1;
  // With a single study day there is nothing to retrieve on: every session goes to a first meeting.
  const single = studyDays.length < 2;

  // Each slot is a subtopic's or practice, fixed before anything is placed.
  let g = 0;
  const types: Array<Array<'topic' | 'practice'>> = studyDays.map((d) =>
    Array.from({ length: perDay }, () => {
      const at = g++;
      if (single) return 'topic';
      return (d >= finalFrom ? at % RULES.finalEvery === RULES.finalEvery - 1 : at % RULES.practiceEvery === RULES.practiceEvery - 1) ? 'practice' : 'topic';
    }),
  );
  const topicSlots = types.map((ts) => ts.filter((x) => x === 'topic').length);
  const after: number[] = topicSlots.map(() => 0);
  for (let t = topicSlots.length - 2; t >= 0; t--) after[t] = after[t + 1]! + topicSlots[t + 1]!;

  // The order subtopics start in: weak first, then those not yet studied, then the rest.
  const weak = input.weak;
  const fresh = input.topics.filter((c) => !weak.includes(c) && !input.studied.includes(c));
  const known = input.topics.filter((c) => !weak.includes(c) && input.studied.includes(c));
  const order = [...weak, ...fresh, ...known];
  const rank = new Map(order.map((c, i) => [c, i]));

  // What the sessions already done have covered.
  const met = new Map<string, { count: number; last: number }>();
  for (const s of opts.history ?? []) {
    if (!s.code || !isTopicKind(s.kind) || !rank.has(s.code)) continue;
    const d = dayNum(s.date);
    if (d === null) continue;
    const m = met.get(s.code) ?? { count: 0, last: d };
    met.set(s.code, { count: m.count + 1, last: Math.max(m.last, d) });
  }
  const queue = order.filter((c) => !met.get(c)?.count);
  const pending: Meeting[] = [];
  const optional: Meeting[] = [];
  for (const c of order) {
    const m = met.get(c);
    if (m?.count === 1) pending.push({ code: c, n: 2, prev: -1, due: Math.max(from, m.last + gap), rank: rank.get(c)! });
    if (m?.count === 2) optional.push({ code: c, n: 3, prev: -1, due: Math.max(from, m.last + 2 * gap), rank: rank.get(c)! });
  }

  // Practice rotates through its kinds, carrying on from the sessions already done.
  const history = opts.history ?? [];
  const normal: SessionKind[] = input.level === 'HL' ? ['case', 'calc', 'paper3'] : ['case', 'calc'];
  const papers: Paper[] = input.level === 'HL' ? ['paper-1', 'paper-2', 'paper-3'] : ['paper-1', 'paper-2'];
  let ni = history.filter((s) => s.kind === 'case' || s.kind === 'calc' || s.kind === 'paper3').length;
  let ti = history.filter((s) => s.kind === 'timed').length;
  let ci = history.filter((s) => s.kind === 'calc').length;
  const families = ctx.calc.filter((f) => input.level === 'HL' || !f.hl);
  const ownFamilies = families.filter((f) => input.topics.includes(f.code));
  const fams = ownFamilies.length ? ownFamilies : families;
  const practice = (final: boolean): Omit<Session, 'id' | 'date' | 'minutes'> => {
    if (final) return { kind: 'timed', paper: papers[ti++ % papers.length]! };
    let kind = normal[ni++ % normal.length]!;
    if (kind === 'calc' && !fams.length) kind = 'case';
    if (kind !== 'calc') return { kind };
    const f = fams[ci++ % fams.length]!;
    return { kind, family: f.id, code: f.code };
  };

  const sessions: Session[] = [];
  let seq = 0;
  const lastIdx = studyDays.length - 1;
  studyDays.forEach((d, t) => {
    let free = topicSlots[t]!;
    const today = new Set<string>();
    const placed: Array<Omit<Session, 'id' | 'date' | 'minutes'>> = [];
    const meet = (m: Meeting) => {
      free -= 1;
      today.add(m.code);
      placed.push({ kind: m.n === 1 ? (input.studied.includes(m.code) ? 'review' : 'learn') : 'retrieve', code: m.code, n: m.n });
      if (m.n === 2) optional.push({ code: m.code, n: 3, prev: t, due: d + 2 * gap, rank: m.rank });
    };
    const take = (list: Meeting[], m: Meeting) => {
      list.splice(list.indexOf(m), 1);
      meet(m);
    };

    if (!single) {
      // 1. Retrievals that are due.
      for (const m of [...pending].sort(byDue)) if (free > 0 && m.due <= d && m.prev < t && !today.has(m.code)) take(pending, m);
      // 2. Retrievals brought forward, only when the later sessions could not hold them all.
      let need = pending.length - after[t]!;
      for (const m of [...pending].sort(byDue)) {
        if (need <= 0 || free <= 0) break;
        if (m.prev < t && !today.has(m.code)) {
          take(pending, m);
          need -= 1;
        }
      }
    }
    // 3. New subtopics, while every retrieval planned, and this one's, still has a later session.
    while (free > 0 && queue.length && (single || (t < lastIdx && after[t]! >= pending.length + 1))) {
      const code = queue.shift()!;
      meet({ code, n: 1, prev: t, due: d, rank: rank.get(code)! });
      if (!single) pending.push({ code, n: 2, prev: t, due: d + gap, rank: rank.get(code)! });
    }
    // 4. Retrieving again, where there is room: weak subtopics first.
    if (!single) for (const m of [...optional].sort((a, b) => a.rank - b.rank || a.due - b.due)) if (free > 0 && m.due <= d && m.prev < t && !today.has(m.code)) take(optional, m);

    // The day's sessions in slot order; a subtopic slot left over becomes practice.
    const final = d >= finalFrom;
    for (const type of types[t]!) {
      const s = type === 'topic' ? (placed.shift() ?? practice(final)) : practice(final);
      sessions.push({ id: `${gen}-${++seq}`, date: dayStr(d), minutes: slot, ...s });
    }
  });

  const name = (c: string) => ctx.topics.find((t) => t.code === c)?.code ?? c;
  const warnings: string[] = [];
  if (checked.dropped.length) warnings.push(`At SL the HL-only subtopics are left out: ${checked.dropped.map(name).join(', ')}.`);
  if (queue.length) {
    const fitted = input.topics.length - queue.length;
    warnings.push(
      single
        ? `There is room for ${fitted} of the ${input.topics.length} subtopics. Not fitted: ${queue.map(name).join(', ')}.`
        : `Your time fits ${fitted} of the ${input.topics.length} subtopics twice. Not fitted: ${queue.map(name).join(', ')}. Give more hours or study days, or choose fewer subtopics.`,
    );
  }
  if (single) warnings.push('There is only one study day before the examination, so each subtopic is met once, weakest first, with no practice sessions.');
  else if (period < 14) warnings.push(`With under two weeks to plan, each subtopic comes back after ${gap} days rather than a week.`);
  if (!buffer) warnings.push('The examination is less than a week away, so no day before it is left free.');

  return {
    ok: true,
    input,
    sessions,
    plan: { from: dayStr(from), last: dayStr(last), exam: input.exam, buffer, slot, perDay, gap, finalFrom: dayStr(finalFrom), notFitted: queue, warnings },
  };
}

/* ---------- The stored plan: bb:planner ---------- */

export interface PlannerState {
  v: 1;
  /** Plans made so far: each numbers its sessions' ids. */
  gen: number;
  input: PlannerInput | null;
  /** When the plan was made, ISO. */
  made: string | null;
  plan: PlanMeta | null;
  /** The sessions done in earlier plans, then this plan's, by date. */
  sessions: Session[];
  /** Sessions marked done: id to the time, ISO. */
  done: Record<string, string>;
}

export const MAX_SESSIONS = 1_200;
const ID_RE = /^\d{1,4}-\d{1,5}$/;
const PAPERS: readonly Paper[] = ['paper-1', 'paper-2', 'paper-3'];
const FAMILY_RE = /^[a-z][a-z0-9-]{0,40}$/;

export function emptyPlanner(): PlannerState {
  return { v: 1, gen: 0, input: null, made: null, plan: null, sessions: [], done: {} };
}

type Plain = Record<string, unknown>;
const isPlain = (v: unknown): v is Plain => typeof v === 'object' && v !== null && !Array.isArray(v);
const asObj = (raw: unknown): Plain | null => {
  let v = raw;
  if (typeof raw === 'string') {
    try {
      v = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return isPlain(v) ? v : null;
};
const codes = (v: unknown, max = 60) => unique((Array.isArray(v) ? v : []).filter((c): c is string => typeof c === 'string' && CODE_RE.test(c))).slice(0, max);
const iso = (v: unknown) => (typeof v === 'string' && v.length <= 40 && Number.isFinite(Date.parse(v)) ? new Date(v).toISOString() : null);

/** The form's values as kept: dates may be empty while the reader has not entered them. */
export function parseInput(raw: unknown): PlannerInput | null {
  const v = asObj(raw);
  if (!v) return null;
  const day = (x: unknown) => (isDay(x) ? x : '');
  const hours = typeof v.hours === 'number' && Number.isFinite(v.hours) ? Math.min(RULES.hours.max, Math.max(0, Math.round(v.hours * 2) / 2)) : 6;
  const days = unique((Array.isArray(v.days) ? v.days : []).filter((d): d is number => Number.isInteger(d) && d >= 1 && d <= 7)).sort((a, b) => a - b);
  return { start: day(v.start), exam: day(v.exam), level: v.level === 'SL' ? 'SL' : 'HL', hours, days, topics: codes(v.topics), weak: codes(v.weak), studied: codes(v.studied) };
}

function parseSession(raw: unknown): Session | null {
  if (!isPlain(raw) || typeof raw.id !== 'string' || !ID_RE.test(raw.id) || !isDay(raw.date)) return null;
  const kind = typeof raw.kind === 'string' && (SESSION_KINDS as readonly string[]).includes(raw.kind) ? (raw.kind as SessionKind) : null;
  if (!kind) return null;
  const minutes = typeof raw.minutes === 'number' && Number.isFinite(raw.minutes) ? Math.round(raw.minutes) : 0;
  if (minutes < 5 || minutes > 600) return null;
  const s: Session = { id: raw.id, date: raw.date, kind, minutes };
  const code = typeof raw.code === 'string' && CODE_RE.test(raw.code) ? raw.code : undefined;
  if (isTopicKind(kind)) {
    if (!code) return null;
    s.code = code;
    s.n = raw.n === 2 || raw.n === 3 ? raw.n : kind === 'retrieve' ? 2 : 1;
  }
  if (kind === 'timed') {
    if (typeof raw.paper !== 'string' || !(PAPERS as readonly string[]).includes(raw.paper)) return null;
    s.paper = raw.paper as Paper;
  }
  if (kind === 'calc' && typeof raw.family === 'string' && FAMILY_RE.test(raw.family)) {
    s.family = raw.family;
    if (code) s.code = code;
  }
  return s;
}

function parseMeta(raw: unknown): PlanMeta | null {
  if (!isPlain(raw) || !isDay(raw.from) || !isDay(raw.last) || !isDay(raw.exam) || !isDay(raw.finalFrom)) return null;
  const num = (x: unknown, lo: number, hi: number) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(hi, Math.max(lo, Math.round(x))) : lo);
  const warnings = (Array.isArray(raw.warnings) ? raw.warnings : []).map((w) => cleanText(w, 400)).filter((w): w is string => Boolean(w)).slice(0, 8);
  return {
    from: raw.from,
    last: raw.last,
    exam: raw.exam,
    finalFrom: raw.finalFrom,
    buffer: num(raw.buffer, 0, RULES.maxBuffer),
    slot: num(raw.slot, RULES.minSlot, 600),
    perDay: num(raw.perDay, 1, 40),
    gap: num(raw.gap, 1, 60),
    notFitted: codes(raw.notFitted),
    warnings,
  };
}

/** Read a stored bb:planner value. Anything it cannot use is dropped; it never throws. */
export function parsePlanner(raw: unknown): PlannerState {
  const v = asObj(raw);
  if (!v || v.v !== 1) return emptyPlanner();
  const seen = new Set<string>();
  const sessions: Session[] = [];
  for (const x of Array.isArray(v.sessions) ? v.sessions : []) {
    const s = parseSession(x);
    if (!s || seen.has(s.id)) continue;
    seen.add(s.id);
    sessions.push(s);
    if (sessions.length >= MAX_SESSIONS) break;
  }
  sessions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const marked: Record<string, string> = {};
  if (isPlain(v.done))
    for (const [id, at] of Object.entries(v.done)) {
      const t = iso(at);
      if (t && seen.has(id)) marked[id] = t;
    }
  const plan = parseMeta(v.plan);
  // Without a plan, only the sessions done are worth keeping.
  const kept = plan ? sessions : sessions.filter((s) => marked[s.id]);
  return {
    v: 1,
    gen: typeof v.gen === 'number' && Number.isFinite(v.gen) ? Math.min(9_999, Math.max(0, Math.floor(v.gen))) : 0,
    input: parseInput(v.input),
    made: iso(v.made),
    plan,
    sessions: kept,
    done: marked,
  };
}

/**
 * Make a plan, or a new one: the sessions already done are kept, with their
 * dates, and the rest of the work is planned from today (or the start, if
 * that is later). Returns the problem with the input instead when it cannot.
 */
export function makePlan(state: PlannerState, raw: PlannerInput, ctx: PlannerContext, today: string, now: Date): { ok: true; state: PlannerState } | { ok: false; field: Field; error: string } {
  const kept = state.sessions.filter((s) => state.done[s.id]);
  const gen = state.gen + 1;
  const r = buildPlan(raw, ctx, { from: today, history: kept, gen });
  if (!r.ok) return r;
  const done: Record<string, string> = {};
  for (const s of kept) done[s.id] = state.done[s.id]!;
  const sessions = [...kept, ...r.sessions].slice(0, MAX_SESSIONS).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { ok: true, state: { v: 1, gen, input: r.input, made: now.toISOString(), plan: r.plan, sessions, done } };
}

/** Mark a session done or not done. An unknown id changes nothing. */
export function setDone(state: PlannerState, id: string, on: boolean, now: Date): PlannerState {
  if (!state.sessions.some((s) => s.id === id)) return state;
  const done = { ...state.done };
  if (on) done[id] = done[id] ?? now.toISOString();
  else delete done[id];
  return { ...state, done };
}

/** Clear the plan but keep the reader's choices in the form. */
export function clearPlan(state: PlannerState): PlannerState {
  return { ...emptyPlanner(), gen: state.gen, input: state.input };
}

/* ---------- Reading a plan ---------- */

/** What a session is called. */
export function sessionTitle(s: Session, ctx: Pick<PlannerContext, 'topics' | 'calc'>): string {
  const topic = s.code ? ctx.topics.find((t) => t.code === s.code) : undefined;
  const name = topic ? `${topic.code} ${topic.title}` : (s.code ?? '');
  switch (s.kind) {
    case 'learn':
      return `Learn ${name}`;
    case 'review':
      return `Review ${name}`;
    case 'retrieve':
      return s.n === 3 ? `Retrieve ${name} again` : `Retrieve ${name}`;
    case 'case':
      return 'Case practice in the style of Paper 1';
    case 'calc': {
      const f = ctx.calc.find((x) => x.id === s.family);
      return f ? `Paper 2 calculations: ${f.label.charAt(0).toLowerCase()}${f.label.slice(1)}` : 'Paper 2 calculations';
    }
    case 'paper3':
      return 'Paper 3 practice: a social enterprise';
    case 'timed':
      return `Timed questions at ${s.paper === 'paper-3' ? 'Paper 3' : s.paper === 'paper-2' ? 'Paper 2' : 'Paper 1'} pace`;
  }
}

/** What to do in the session, in a line. */
export const SESSION_HOW: Record<SessionKind, string> = {
  learn: 'Read the notes and the mindmap, then answer the recall cards at the end of the page.',
  review: 'Reread the summary, redraw the mindmap from memory, then check yourself with the recall cards.',
  retrieve: 'From memory first: the flashcards, then the recall cards. Note what you missed and look it up.',
  case: 'Answer one case question in full, under no time pressure, then check it against the mark scheme.',
  calc: 'Fresh figures every time; when an answer is wrong, the working shows where the slip was.',
  paper3: 'Plan a recommendation for the social enterprise, then mark it yourself on criteria A to D.',
  timed: 'A timed set in the question bank at the paper’s pace, then rate each answer honestly.',
};

/** Where the session is done. */
export function sessionHref(s: Session, ctx: Pick<PlannerContext, 'topics'>): string {
  switch (s.kind) {
    case 'learn':
    case 'review':
      return ctx.topics.find((t) => t.code === s.code)?.url ?? '/topics/';
    case 'retrieve':
      return flashcardsHref(s.code);
    case 'case':
      return REVISION_LINKS.p1;
    case 'calc':
      return REVISION_LINKS.p2;
    case 'paper3':
      return REVISION_LINKS.p3;
    case 'timed':
      return REVISION_LINKS.timed;
  }
}

export interface Week {
  n: number;
  from: string;
  to: string;
  sessions: Session[];
  minutes: number;
}

/** The plan's sessions week by week, each week the seven days from the plan's first day; sessions done before it come first, as week 0. */
export function weeksOf(state: PlannerState): Week[] {
  if (!state.plan) return [];
  const from = dayNum(state.plan.from)!;
  const weeks = new Map<number, Week>();
  for (const s of state.sessions) {
    const d = dayNum(s.date)!;
    const n = d < from ? 0 : Math.floor((d - from) / 7) + 1;
    const w = weeks.get(n) ?? { n, from: n ? dayStr(from + (n - 1) * 7) : s.date, to: n ? dayStr(from + n * 7 - 1) : s.date, sessions: [], minutes: 0 };
    if (!n) {
      if (s.date < w.from) w.from = s.date;
      if (s.date > w.to) w.to = s.date;
    }
    w.sessions.push(s);
    w.minutes += s.minutes;
    weeks.set(n, w);
  }
  return [...weeks.values()].sort((a, b) => a.n - b.n);
}

export interface PlannerProgress {
  total: number;
  done: number;
  minutes: number;
  minutesDone: number;
  /** Sessions not done whose day has passed, then today's. */
  overdue: Session[];
  today: Session[];
  /** The first session not done from today on. */
  next: Session | null;
  /** The subtopics chosen, and how many have been met twice or more. */
  topics: number;
  twice: number;
}

export function plannerProgress(state: PlannerState, today: string): PlannerProgress {
  const isDone = (s: Session) => Boolean(state.done[s.id]);
  const met = new Map<string, number>();
  for (const s of state.sessions) if (isDone(s) && s.code && isTopicKind(s.kind)) met.set(s.code, (met.get(s.code) ?? 0) + 1);
  const chosen = state.input?.topics ?? [];
  return {
    total: state.sessions.length,
    done: state.sessions.filter(isDone).length,
    minutes: state.sessions.reduce((a, s) => a + s.minutes, 0),
    minutesDone: state.sessions.filter(isDone).reduce((a, s) => a + s.minutes, 0),
    overdue: state.sessions.filter((s) => !isDone(s) && s.date < today),
    today: state.sessions.filter((s) => !isDone(s) && s.date === today),
    next: state.sessions.find((s) => !isDone(s) && s.date >= today) ?? null,
    topics: chosen.length,
    twice: chosen.filter((c) => (met.get(c) ?? 0) >= 2).length,
  };
}

/** The sessions not done whose day has come, earliest first: what the dashboard's queue takes from the plan. */
export function dueSessions(state: PlannerState, today: string): Session[] {
  return state.sessions.filter((s) => !state.done[s.id] && s.date <= today).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Each kind of session, counted. */
export function kindCounts(sessions: readonly Session[]): Record<SessionKind, number> {
  const out = Object.fromEntries(SESSION_KINDS.map((k) => [k, 0])) as Record<SessionKind, number>;
  for (const s of sessions) out[s.kind] += 1;
  return out;
}

/* ---------- Calendar ---------- */

const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** A content line folded at 75 octets, as iCalendar requires, never inside a character. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  let size = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    // The first line holds 75 octets; each line after begins with a space, so holds 74 more.
    if (size + n > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = '';
      size = 0;
    }
    cur += ch;
    size += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

/**
 * The plan as an iCalendar file: an all-day event on each study day that
 * still has sessions to do from `today`, listing them with their links, and
 * one for the examination. Re-exporting gives each day the same identifier,
 * so a calendar that updates events replaces the day rather than adding it
 * twice. `stamp` is the time of export as YYYYMMDDTHHMMSSZ; `origin` makes
 * the links whole addresses.
 */
export function plannerIcs(state: PlannerState, ctx: Pick<PlannerContext, 'topics' | 'calc'>, opts: { stamp: string; origin: string; today: string }): string {
  const compact = (day: string) => day.replace(/-/g, '');
  const next = (day: string) => compact(dayStr(dayNum(day)! + 1));
  const byDay = new Map<string, Session[]>();
  for (const s of state.sessions) if (!state.done[s.id] && s.date >= opts.today) byDay.set(s.date, [...(byDay.get(s.date) ?? []), s]);
  const events: string[] = [];
  for (const [day, list] of [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const minutes = list.reduce((a, s) => a + s.minutes, 0);
    const summary = `Revision, ${fmtMinutes(minutes)}: ${list.map((s) => (s.code && isTopicKind(s.kind) ? `${KIND_LABELS[s.kind]} ${s.code}` : KIND_LABELS[s.kind])).join(', ')}`;
    const desc = list.map((s) => `${sessionTitle(s, ctx)} (${fmtMinutes(s.minutes)}): ${opts.origin}${sessionHref(s, ctx)}`).join('\n');
    events.push(
      'BEGIN:VEVENT',
      `UID:bb-revision-${compact(day)}@the-business-brief`,
      `DTSTAMP:${opts.stamp}`,
      `DTSTART;VALUE=DATE:${compact(day)}`,
      `DTEND;VALUE=DATE:${next(day)}`,
      foldLine(`SUMMARY:${icsText(summary)}`),
      foldLine(`DESCRIPTION:${icsText(`${desc}\nFrom your revision plan on The Business Brief.`)}`),
      'END:VEVENT',
    );
  }
  if (state.plan && state.plan.exam >= opts.today)
    events.push(
      'BEGIN:VEVENT',
      `UID:bb-exam-${compact(state.plan.exam)}@the-business-brief`,
      `DTSTAMP:${opts.stamp}`,
      `DTSTART;VALUE=DATE:${compact(state.plan.exam)}`,
      `DTEND;VALUE=DATE:${next(state.plan.exam)}`,
      foldLine(`SUMMARY:${icsText('Examination: your first paper')}`),
      'END:VEVENT',
    );
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The Business Brief//Revision planner//EN', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR', ''].join('\r\n');
}

/** The subtopics a plan can offer at a level, in syllabus order. */
export function topicsAt(ctx: Pick<PlannerContext, 'topics'>, level: Level): PlannerTopic[] {
  return ctx.topics.filter((t) => atLevel(t, level)).sort((a, b) => codeOrder(a.code) - codeOrder(b.code));
}
