/**
 * The dashboard's reading of what this browser keeps. One pure function,
 * `dashboardView`, turns the stored items (every "bb:" key with its raw value)
 * and the build's configuration (the course, the questions, the exercises,
 * the rooms) into everything the page shows. Nothing is invented: a figure is
 * a count of something stored, a verdict is one the reader checked, and a
 * self-check is the reader's own mark against the platform's mark scheme.
 */
import {
  LEARNER_KEY,
  SAVED_KEY,
  VISIT_KINDS,
  asObject,
  checkTally,
  parseLog,
  parseSaved,
  safePath,
  type LearnerLog,
  type SavedList,
  type Tally,
  type Visit,
  type VisitKind,
} from './learner';

export type CoverageState = 'complete' | 'partial' | 'planned';

export interface DashLink {
  href: string;
  title: string;
}

export interface DashSubtopic {
  code: string;
  title: string;
  unit: number;
  url: string;
  level: string;
  state: CoverageState;
  /** Its mindmap's page, when it has one. */
  mindmap?: string;
  /** Its retrieval card sets, as storage keys (bb:rc:...). */
  cards: string[];
  /** Cards in its largest set. */
  cardCount: number;
}

export interface DashQuestion {
  id: string;
  title: string;
  url: string;
  marks: number;
  kind: 'points' | 'levels' | 'calculation' | 'criteria';
  /** Marks for each point of a points or calculation scheme. */
  points: number[];
  criteria: Array<{ id: string; marks: number }>;
  codes: string[];
}

/** A classification exercise, by its id on the page (its answers are kept as bb:quiz:<uid>). */
export interface DashExercise {
  uid: string;
  title: string;
  url: string;
  total: number;
  codes: string[];
}

export interface DashLab {
  uid: string;
  title: string;
  url: string;
  stages: number;
  codes: string[];
}

export interface DashDecision {
  id: string;
  title: string;
  url: string;
  rounds: string[];
  codes: string[];
}

export interface DashRetrieval {
  key: string;
  title: string;
  url: string;
  count: number;
  codes: string[];
}

/** A tool that keeps the reader's work under known keys (the first is its main one). */
export interface DashTool {
  keys: string[];
  title: string;
  url: string;
  detail: string;
  /** The room or page it belongs to, for grouping. */
  room: string;
}

/** A room's tool that keeps the reader's work under a key of its own, such as bb:strategy:swot; a summary of it may sit under another key. */
export interface DashRoomTool {
  key: string;
  title: string;
  url: string;
  room: string;
  summary?: string;
}

/** A Boardroom simulation (bb:boardroom:<id>, its decisions as picks). */
export interface DashSimulation {
  id: string;
  title: string;
  url: string;
  rounds: number;
  codes: string[];
}

/** A case file with a decision exercise (bb:case:<id>). */
export interface DashCaseDecision {
  id: string;
  title: string;
  url: string;
  codes: string[];
}

export interface DashConfig {
  units: Array<{ number: number; title: string }>;
  subtopics: DashSubtopic[];
  questions: DashQuestion[];
  exercises: DashExercise[];
  labs: DashLab[];
  decisions: DashDecision[];
  retrieval: DashRetrieval[];
  tools: DashTool[];
  roomTools: DashRoomTool[];
  simulations: DashSimulation[];
  caseDecisions: DashCaseDecision[];
  /** Assessment checklists (bb:ck:<id>), by the start of their id. */
  checklists: Array<{ prefix: string; title: string; href: string; room: string }>;
  /** Rooms and their pages, for linking work saved by a room's tools (bb:<room>:<tool>). */
  rooms: DashLink[];
  pages: DashLink[];
  /** Where to start when a kind of page has not been opened yet. */
  starts: Record<VisitKind, DashLink>;
  totals: { mindmaps: number; cases: number; frameworks: number };
  ia: { href: string; steps: number };
}

/* ---------- Families of stored items ---------- */

export type Family =
  | 'preference'
  | 'learner'
  | 'saved'
  | 'question'
  | 'quiz'
  | 'decision'
  | 'retrieval'
  | 'lab'
  | 'simulation'
  | 'case-decision'
  | 'tool'
  | 'checklist'
  | 'work';

const FAMILIES: Array<[RegExp, Family]> = [
  [/^bb:(level|intro-seen)$/, 'preference'],
  // A tool's check that storage works, written and removed at once; never the reader's work.
  [/^bb:(.+:)?(probe|storage-check)$/, 'preference'],
  [/^bb:learner$/, 'learner'],
  [/^bb:saved$/, 'saved'],
  [/^bb:q:.+$/, 'question'],
  [/^bb:quiz:.+$/, 'quiz'],
  [/^bb:dr:.+$/, 'decision'],
  [/^bb:rc:.+$/, 'retrieval'],
  [/^bb:case-lab:.+$/, 'lab'],
  [/^bb:boardroom:.+$/, 'simulation'],
  [/^bb:case:.+$/, 'case-decision'],
  [/^bb:(studio|ff|cash-flow):.+$/, 'tool'],
  [/^bb:(ia-plan|ia:rq|ia:sd|p3:plan)$/, 'tool'],
  [/^bb:ck:.+$/, 'checklist'],
];

/** What a stored item is. Anything the platform's own tools do not write is work from a room's tool. */
export function familyOf(key: string): Family {
  return FAMILIES.find(([re]) => re.test(key))?.[1] ?? 'work';
}

/* ---------- Practice questions ---------- */

export interface SelfCheck {
  answered: boolean;
  marked: boolean;
  /** Marks from the reader's own self-check, when the scheme gives a number. */
  score: number | null;
  state: string;
}

/**
 * A practice question's state from its saved value: answered, and
 * self-marked against the platform's mark scheme where the reader ticked
 * points, chose a level or marked the criteria. A self-check is the reader's
 * own judgement, never a grade.
 */
export function selfCheck(q: DashQuestion, raw: unknown): SelfCheck | null {
  const v = asObject(raw);
  if (!v) return null;
  const answered = typeof v.answer === 'string' && v.answer.trim().length > 0;
  const points = Array.isArray(v.points) ? v.points.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < q.points.length) : [];
  const level = typeof v.level === 'string' && /^\d+(-\d+)?$/.test(v.level) ? v.level : null;
  const crit = asObject(v.crit) ?? {};
  const critMarks = q.criteria.filter((k) => typeof crit[k.id] === 'number');
  const of = `${q.marks} ${q.marks === 1 ? 'mark' : 'marks'}`;
  if ((q.kind === 'points' || q.kind === 'calculation') && points.length) {
    const score = Math.min(q.marks, [...new Set(points)].reduce((s, i) => s + (q.points[i] ?? 0), 0));
    return { answered, marked: true, score, state: `Self-marked: ${score} of ${of}` };
  }
  if (q.kind === 'levels' && level) {
    const [a, b] = level.split('-');
    return { answered, marked: true, score: null, state: b ? `Self-marked: the ${a} to ${b} marks level, of ${q.marks}` : `Self-marked: the ${a} marks level, of ${q.marks}` };
  }
  if (q.kind === 'criteria' && critMarks.length) {
    const score = critMarks.reduce((s, k) => s + Math.min(k.marks, Math.max(0, Number(crit[k.id]))), 0);
    const rest = q.criteria.length - critMarks.length;
    return { answered, marked: true, score, state: `Self-marked: ${score} of ${of}${rest ? `, ${rest} of ${q.criteria.length} criteria still to mark` : ''}` };
  }
  return answered ? { answered, marked: false, score: null, state: 'Answered, not yet self-marked' } : null;
}

/* ---------- Retrieval cards ---------- */

export interface Ratings {
  rated: number;
  got: number;
  partly: number;
  notYet: number;
}

/** Ratings of 0 (not yet), 1 (partly) and 2 (got it), keyed by card. */
export function ratingsOf(raw: unknown): Ratings {
  const v = asObject(raw) ?? {};
  const vals = Object.values(v).filter((x): x is number => x === 0 || x === 1 || x === 2);
  return { rated: vals.length, got: vals.filter((x) => x === 2).length, partly: vals.filter((x) => x === 1).length, notYet: vals.filter((x) => x === 0).length };
}

export function ratingWords(r: Ratings, count: number): string {
  return `${r.rated} of ${count} rated: ${r.got} got it, ${r.partly} partly, ${r.notYet} not yet`;
}

export function tallyWords(t: Tally): string {
  return `${t.right} right, ${t.partial} partly right, ${t.wrong} not yet right`;
}

/* ---------- Dates ---------- */

/** "today", "yesterday", "3 November", or "3 November 2025" for another year. */
export function shortDate(iso: string, now: Date): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86_400_000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  return d.toLocaleDateString('en-GB', d.getFullYear() === now.getFullYear() ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ---------- Work saved by the rooms' tools ---------- */

const ACRONYMS = new Set(['swot', 'steeple', 'pest', 'pestle', 'bcg', 'cpa', 'eoq', 'npv', 'arr', 'ia', 'kpi', 'mvp', 'roce', 'csr', 'hrm', 'jit', 'tqm', 'raci', 'smart', 'esg', 'fdi', 'p3']);

/** "unit-economics" as "Unit economics"; "swot" as "SWOT". */
export function humanize(slug: string): string {
  const words = slug
    .split(/[-_:.\s]+/)
    .filter(Boolean)
    .map((w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.toLowerCase()));
  const s = words.join(' ');
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

/** Short room names some tools use, and the words of the room's address they stand for. */
const ROOM_ALIASES: Record<string, string[]> = {
  ops: ['operations'],
  operations: ['operations'],
  lab: ['lab', 'enterprise', 'entrepreneurship', 'innovation'],
  case: ['case', 'cases'],
  finance: ['finance'],
  people: ['people'],
  market: ['market'],
  strategy: ['strategy'],
};

const firstSegment = (href: string) => href.split('/').filter(Boolean)[0] ?? '';

function roomMatches(room: string, href: string): boolean {
  const tokens = firstSegment(href).toLowerCase().split('-');
  const wants = ROOM_ALIASES[room] ?? [room];
  return wants.some((w) => tokens.some((t) => t === w || (w.length >= 4 && t.startsWith(w)) || (t.length >= 4 && w.startsWith(t))));
}

/**
 * The page to link a room tool's saved work back to: the tool's own page
 * under the room's address when one is known, otherwise the room, otherwise
 * a search for the tool's name, so the link always leads somewhere relevant.
 */
export function workLink(room: string, tool: string, rooms: readonly DashLink[], pages: readonly DashLink[]): string {
  const roomHrefs = [...new Set(rooms.map((r) => r.href).filter((h) => roomMatches(room, h)))];
  const slug = tool.toLowerCase();
  if (slug) {
    for (const base of roomHrefs) {
      const under = pages.filter((p) => p.href.startsWith(base) && p.href !== base);
      const hit =
        under.find((p) => p.href.split(/[/#]/).filter(Boolean).includes(slug)) ??
        under.find((p) => {
          const last = p.href.split('#')[0]!.split('/').filter(Boolean).pop() ?? '';
          return last.length >= 4 && slug.length >= 4 && (last.startsWith(slug) || slug.startsWith(last));
        });
      if (hit) return hit.href;
    }
  }
  if (roomHrefs[0]) return roomHrefs[0];
  return `/search/?q=${encodeURIComponent(humanize(tool || room))}`;
}

export interface WorkItem {
  key: string;
  title: string;
  /** The room or page it belongs to. */
  where: string;
  href: string;
  detail: string;
  /** When the tool says it was saved. */
  when: string | null;
}

const textOf = (v: unknown, max = 160): string | null => (typeof v === 'string' && v.trim() ? v.replace(/\s+/g, ' ').trim().slice(0, max) : null);

/** A line that says what a saved piece of work holds, when the tool wrote one: its headline, summary or verdict. */
export function workLine(raw: unknown): string | null {
  let v: unknown = raw;
  if (typeof raw === 'string') {
    try {
      v = JSON.parse(raw);
    } catch {
      return textOf(raw);
    }
  }
  if (typeof v === 'string') return textOf(v);
  const o = asObject(v);
  if (!o) return null;
  const verdict = textOf(o.verdict);
  return textOf(o.headline) ?? textOf(o.summary) ?? (verdict ? (textOf(o.idea, 80) ? `${textOf(o.idea, 80)}: ${verdict}` : verdict) : null);
}

function workFromRoom(key: string, raw: string, summaries: Map<string, string>, cfg: Pick<DashConfig, 'rooms' | 'pages' | 'roomTools'>): WorkItem {
  const [room = '', ...rest] = key.slice(3).split(':');
  const tool = rest.join(':');
  const v = asObject(raw);
  const known = cfg.roomTools.find((t) => t.key === key);
  const roomTitle = known?.room ?? cfg.rooms.find((r) => roomMatches(room, r.href))?.title ?? humanize(room);
  const own = safePath(v?.href);
  const title = known?.title ?? textOf(v?.title, 90) ?? (tool ? humanize(tool) : humanize(room));
  const detail = workLine(raw) ?? (known?.summary ? summaries.get(known.summary) : undefined) ?? summaries.get(key) ?? 'Your work is kept here.';
  const when = [v?.savedAt, v?.saved, v?.updated].map((x) => (typeof x === 'string' && Number.isFinite(Date.parse(x)) ? new Date(x).toISOString() : null)).find(Boolean) ?? null;
  return { key, title, where: roomTitle, href: known?.url ?? own ?? workLink(room, tool, cfg.rooms, cfg.pages), detail, when };
}

/* ---------- The whole view ---------- */

export interface Row {
  title: string;
  href: string;
  state: string;
  done: boolean;
  tally?: Tally;
  when?: string | null;
}

export interface CourseRow {
  code: string;
  read: boolean;
  mindmap: boolean;
  cards: Ratings & { count: number };
  questions: number;
  exercises: number;
  status: 'none' | 'explored' | 'practised';
  words: string;
}

export interface UnitRow {
  number: number;
  title: string;
  total: number;
  complete: number;
  explored: number;
  practised: number;
}

export interface DashboardView {
  /** Anything stored at all, beyond preferences. */
  any: boolean;
  log: LearnerLog;
  saved: SavedList;
  figures: {
    explored: number;
    practised: number;
    subtopics: number;
    completeExplored: number;
    complete: number;
    mindmaps: number;
    cases: number;
    answered: number;
    marked: number;
    questions: number;
    checked: Tally;
    cards: Ratings;
    labStages: number;
    labStagesAll: number;
    roomsDone: number;
    rooms: number;
    simulationsDone: number;
    simulations: number;
    caseDecisions: number;
    caseDecisionsAll: number;
    analyses: number;
    analysesAll: number;
    work: number;
    saved: number;
  };
  course: { rows: CourseRow[]; units: UnitRow[] };
  visits: Record<VisitKind, Visit[]>;
  practice: { questions: Row[]; exercises: Row[]; labs: Row[]; decisions: Row[]; simulations: Row[]; cases: Row[]; retrieval: Row[] };
  /** Grouped by room, in the order the rooms first appear. */
  work: WorkItem[];
  workGroups: Array<{ room: string; items: WorkItem[] }>;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Everything the dashboard shows, from the stored items and the build's configuration. */
export function dashboardView(items: Readonly<Record<string, string>>, cfg: DashConfig): DashboardView {
  const get = (k: string) => items[k];
  const log = parseLog(get(LEARNER_KEY));
  const saved = parseSaved(get(SAVED_KEY));
  const visited = new Set(log.visits.map((v) => v.url));

  // Practice questions
  const questions: Row[] = [];
  const answeredBy = new Map<string, number>();
  let answered = 0;
  let marked = 0;
  for (const q of cfg.questions) {
    const sc = selfCheck(q, get(`bb:q:${q.id}`));
    if (!sc) continue;
    answered += sc.answered ? 1 : 0;
    marked += sc.marked ? 1 : 0;
    questions.push({ title: q.title, href: q.url, state: sc.state, done: sc.marked });
    for (const code of q.codes) answeredBy.set(code, (answeredBy.get(code) ?? 0) + 1);
  }

  // Classification exercises, with the verdicts the reader checked
  const exercises: Row[] = [];
  const exercisedBy = new Map<string, number>();
  const checked: Tally = { checked: 0, right: 0, partial: 0, wrong: 0, total: 0 };
  const known = new Set(cfg.exercises.map((x) => x.uid));
  const addTally = (t: Tally) => {
    checked.checked += t.checked;
    checked.right += t.right;
    checked.partial += t.partial;
    checked.wrong += t.wrong;
  };
  for (const x of cfg.exercises) {
    const picks = asObject(get(`bb:quiz:${x.uid}`)) ?? {};
    const answeredItems = new Set(Object.keys(picks).map((k) => k.split(':')[0])).size;
    const t = checkTally(log.checks[x.uid], picks);
    if (!answeredItems && !t.checked) continue;
    addTally(t);
    const state = t.checked
      ? `Checked ${t.checked} of ${x.total}: ${tallyWords(t)}`
      : `${answeredItems} of ${x.total} answered, none checked yet`;
    exercises.push({ title: x.title, href: x.url, state, done: t.checked >= x.total, tally: t.checked ? t : undefined });
    for (const code of x.codes) exercisedBy.set(code, (exercisedBy.get(code) ?? 0) + 1);
  }
  // Exercises the build does not list (on the Assessment Centre's pages, or a new room's), as the recorder saw them
  for (const [uid, rec] of Object.entries(log.checks)) {
    if (known.has(uid)) continue;
    const t = checkTally(rec, asObject(get(`bb:quiz:${uid}`)) ?? {});
    if (!t.checked) continue;
    addTally(t);
    exercises.push({ title: rec.title, href: rec.url, state: `Checked ${t.checked} of ${rec.total}: ${tallyWords(t)}`, done: t.checked >= rec.total, tally: t });
  }

  // Case labs
  const labs: Row[] = [];
  let labStages = 0;
  let labStagesAll = 0;
  for (const lab of cfg.labs) {
    labStagesAll += lab.stages;
    const v = asObject(get(`bb:case-lab:${lab.uid}`));
    const done = Array.isArray(v?.done) ? new Set(v.done.filter((s): s is string => typeof s === 'string')).size : 0;
    if (!done) continue;
    const n = Math.min(done, lab.stages);
    labStages += n;
    labs.push({ title: lab.title, href: lab.url, state: n >= lab.stages ? 'Every stage done' : `${n} of ${lab.stages} stages done`, done: n >= lab.stages });
    for (const code of lab.codes) exercisedBy.set(code, (exercisedBy.get(code) ?? 0) + 1);
  }

  // Decision Rooms
  const decisions: Row[] = [];
  let roomsDone = 0;
  for (const d of cfg.decisions) {
    const picks = asObject(asObject(get(`bb:dr:${d.id}`))?.picks) ?? {};
    const made = d.rounds.filter((r) => typeof picks[r] === 'string' && picks[r]).length;
    if (!made) continue;
    const done = made >= d.rounds.length;
    roomsDone += done ? 1 : 0;
    decisions.push({ title: d.title, href: d.url, state: done ? 'Every decision made' : `${made} of ${d.rounds.length} decisions made`, done });
    for (const code of d.codes) exercisedBy.set(code, (exercisedBy.get(code) ?? 0) + 1);
  }

  // Boardroom simulations: the rounds decided
  const simulations: Row[] = [];
  let simulationsDone = 0;
  for (const sim of cfg.simulations) {
    const picks = asObject(get(`bb:boardroom:${sim.id}`))?.picks;
    const n = Array.isArray(picks) ? Math.min(sim.rounds, picks.filter((p) => typeof p === 'string' && p).length) : 0;
    if (!n) continue;
    const done = n >= sim.rounds;
    simulationsDone += done ? 1 : 0;
    simulations.push({ title: sim.title, href: sim.url, state: done ? 'Every round decided' : `${n} of ${sim.rounds} rounds decided`, done });
    for (const code of sim.codes) exercisedBy.set(code, (exercisedBy.get(code) ?? 0) + 1);
  }

  // Decision exercises in the case files
  const cases: Row[] = [];
  let caseDecisions = 0;
  for (const cd of cfg.caseDecisions) {
    const v = asObject(get(`bb:case:${cd.id}`));
    const choice = textOf(v?.choice);
    const reasons = textOf(v?.reasons);
    if (!choice && !reasons) continue;
    const committed = textOf(v?.committed, 40);
    const done = Boolean(committed && choice);
    caseDecisions += done ? 1 : 0;
    cases.push({ title: cd.title, href: cd.url, state: done ? `Decided on ${committed}` : 'Started, not yet committed', done });
    for (const code of cd.codes) exercisedBy.set(code, (exercisedBy.get(code) ?? 0) + 1);
  }

  // Retrieval cards
  const retrieval: Row[] = [];
  const cards: Ratings = { rated: 0, got: 0, partly: 0, notYet: 0 };
  for (const set of cfg.retrieval) {
    const r = ratingsOf(get(set.key));
    if (!r.rated) continue;
    cards.rated += r.rated;
    cards.got += r.got;
    cards.partly += r.partly;
    cards.notYet += r.notYet;
    retrieval.push({ title: set.title, href: set.url, state: ratingWords(r, set.count), done: r.rated >= set.count });
  }

  // The course, subtopic by subtopic
  const rows: CourseRow[] = cfg.subtopics.map((s) => {
    const sets = s.cards.map((k) => ratingsOf(get(k)));
    const best = sets.reduce<Ratings>((a, b) => (b.rated > a.rated ? b : a), { rated: 0, got: 0, partly: 0, notYet: 0 });
    const read = visited.has(s.url);
    const mindmap = Boolean(s.mindmap && visited.has(s.mindmap));
    const q = answeredBy.get(s.code) ?? 0;
    const x = exercisedBy.get(s.code) ?? 0;
    const status: CourseRow['status'] = best.rated || q || x ? 'practised' : read || mindmap ? 'explored' : 'none';
    const parts = [
      read ? 'Read' : '',
      mindmap ? 'Mindmap viewed' : '',
      best.rated ? `${best.rated} of ${s.cardCount} cards rated` : '',
      q ? plural(q, 'question answered', 'questions answered') : '',
      x ? plural(x, 'activity', 'activities') : '',
    ].filter(Boolean);
    return { code: s.code, read, mindmap, cards: { ...best, count: s.cardCount }, questions: q, exercises: x, status, words: parts.length ? parts.join(' · ') : 'Not started' };
  });
  const units: UnitRow[] = cfg.units.map((u) => {
    const subs = cfg.subtopics.map((s, i) => ({ s, r: rows[i]! })).filter((x) => x.s.unit === u.number);
    return {
      number: u.number,
      title: u.title,
      total: subs.length,
      complete: subs.filter((x) => x.s.state === 'complete').length,
      explored: subs.filter((x) => x.r.status !== 'none').length,
      practised: subs.filter((x) => x.r.status === 'practised').length,
    };
  });

  // Visits by kind
  const visits = Object.fromEntries(VISIT_KINDS.map((k) => [k, log.visits.filter((v) => v.kind === k)])) as Record<VisitKind, Visit[]>;

  // Work kept by the tools
  const work: WorkItem[] = [];
  const keys = Object.keys(items).sort();
  const EMPTY = new Set(['', '{}', '[]', 'null', '""']);
  for (const t of cfg.tools) {
    const held = t.keys.filter((k) => get(k) !== undefined && !EMPTY.has(get(k) ?? ''));
    if (!held.length) continue;
    const key = t.keys[0] ?? held[0]!;
    let detail = t.detail;
    const v = asObject(get(key));
    if (key === 'bb:ia-plan' && v) {
      const fields = asObject(v.fields) ?? {};
      const steps = Object.keys(fields).filter((k) => /^done-\d+$/.test(k) && fields[k] === 'on').length;
      detail = `${steps} of ${cfg.ia.steps} steps done`;
    }
    if (key === 'bb:ia:sd' && v && Array.isArray(v.docs)) detail = plural(v.docs.length, 'document listed', 'documents listed');
    work.push({ key, title: t.title, where: t.room, href: t.url, detail, when: null });
  }
  for (const c of cfg.checklists) {
    const lists = keys.filter((k) => k.startsWith(`bb:ck:${c.prefix}`));
    const ticked = lists.reduce((n, k) => {
      try {
        const v = JSON.parse(items[k] ?? '[]');
        return n + (Array.isArray(v) ? v.length : 0);
      } catch {
        return n;
      }
    }, 0);
    if (ticked) work.push({ key: `bb:ck:${c.prefix}`, title: c.title, where: c.room, href: c.href, detail: `${plural(ticked, 'item', 'items')} ticked in ${plural(lists.length, 'list', 'lists')}`, when: null });
  }
  // Summaries a room keeps beside its tools' work (bb:<room>:summary:<tool>), by their own key and by the work's.
  const summaries = new Map<string, string>();
  for (const k of keys) {
    const m = /^bb:([^:]+):summary:(.+)$/.exec(k);
    if (!m) continue;
    const s = workLine(items[k] ?? '');
    if (!s) continue;
    summaries.set(k, s);
    summaries.set(`bb:${m[1]}:${m[2]}`, s);
  }
  for (const k of keys) {
    if (familyOf(k) !== 'work' || /^bb:[^:]+:summary:/.test(k)) continue;
    work.push(workFromRoom(k, items[k] ?? '', summaries, cfg));
  }

  const complete = cfg.subtopics.filter((s) => s.state === 'complete');
  const explored = rows.filter((r) => r.status !== 'none').length;
  // Something to show: a page opened, an item saved, or a row in any list below.
  const any = log.visits.length > 0 || saved.items.length > 0 || work.length > 0 || [questions, exercises, labs, decisions, simulations, cases, retrieval].some((l) => l.length > 0);
  const workGroups: DashboardView['workGroups'] = [];
  for (const w of work) {
    const room = w.where || 'Tools';
    const g = workGroups.find((x) => x.room === room);
    if (g) g.items.push(w);
    else workGroups.push({ room, items: [w] });
  }
  const analysesAll = cfg.roomTools.filter((t) => t.key.startsWith('bb:strategy:')).length;
  const analyses = cfg.roomTools.filter((t) => t.key.startsWith('bb:strategy:') && items[t.key] !== undefined).length;

  return {
    any,
    log,
    saved,
    figures: {
      explored,
      practised: rows.filter((r) => r.status === 'practised').length,
      subtopics: rows.length,
      completeExplored: complete.filter((s) => rows[cfg.subtopics.indexOf(s)]?.status !== 'none').length,
      complete: complete.length,
      mindmaps: visits.mindmap.length,
      cases: visits.case.length,
      answered,
      marked,
      questions: cfg.questions.length,
      checked,
      cards,
      labStages,
      labStagesAll,
      roomsDone,
      rooms: cfg.decisions.length,
      simulationsDone,
      simulations: cfg.simulations.length,
      caseDecisions,
      caseDecisionsAll: cfg.caseDecisions.length,
      analyses,
      analysesAll,
      work: work.length,
      saved: saved.items.length,
    },
    course: { rows, units },
    visits,
    practice: { questions, exercises, labs, decisions, simulations, cases, retrieval },
    work,
    workGroups,
  };
}

/* ---------- The course chart ---------- */

const escXml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/**
 * The course at a glance: a row for each unit and a square for each of its
 * subtopics, filled when practised, half filled when explored, an outline
 * when not started, so the state is told by shape as well as colour. An
 * inline SVG with a title and a description that state the result; the same
 * figures are in the unit table beside it.
 */
export function courseChartSvg(units: readonly UnitRow[], rows: readonly CourseRow[], subtopics: readonly DashSubtopic[]): string {
  const cell = 22;
  const gap = 4;
  const rowH = 30;
  const labelW = 56;
  const most = Math.max(1, ...units.map((u) => subtopics.filter((s) => s.unit === u.number).length));
  const W = labelW + most * (cell + gap) + 52;
  const H = units.length * rowH - (rowH - cell) + 2;
  const status = new Map(rows.map((r) => [r.code, r.status]));
  const explored = rows.filter((r) => r.status !== 'none').length;
  const practised = rows.filter((r) => r.status === 'practised').length;
  const title = `Subtopics explored: ${explored} of ${rows.length}, of which ${practised} practised`;
  const desc = `One square for each subtopic, unit by unit: filled when practised, half filled when explored, an outline when not started. ${units
    .map((u) => `Unit ${u.number}: ${u.explored} of ${u.total} explored, ${u.practised} practised`)
    .join('. ')}.`;
  let body = '';
  units.forEach((u, i) => {
    const y = 1 + i * rowH;
    const subs = subtopics.filter((s) => s.unit === u.number);
    body += `<text class="dbc-label" x="0" y="${y + 15.5}">Unit ${u.number}</text>`;
    subs.forEach((s, j) => {
      const x = labelW + j * (cell + gap);
      const st = status.get(s.code) ?? 'none';
      if (st === 'practised') body += `<rect class="dbc-fill" x="${x}" y="${y}" width="${cell}" height="${cell}"/>`;
      if (st === 'explored') body += `<rect class="dbc-half" x="${x}" y="${y + cell / 2}" width="${cell}" height="${cell / 2}"/>`;
      body += `<rect class="dbc-cell dbc-cell--${st}" x="${x + 0.5}" y="${y + 0.5}" width="${cell - 1}" height="${cell - 1}"/>`;
    });
    body += `<text class="dbc-value" x="${labelW + subs.length * (cell + gap) + 4}" y="${y + 15.5}">${u.explored} of ${u.total}</text>`;
  });
  return `<svg class="dbc" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="dbc-title dbc-desc" focusable="false"><title id="dbc-title">${escXml(title)}</title><desc id="dbc-desc">${escXml(desc)}</desc>${body}</svg>`;
}
