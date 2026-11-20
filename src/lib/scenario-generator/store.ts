/**
 * bb:scenarios, the scenario generator's record on this device: for each
 * scenario the reader has worked (by its code), the answers given at each
 * step, the steps checked, the verdict on each and when. Newest first, at
 * most LIMIT scenarios. Read defensively: anything damaged or unexpected is
 * dropped, and reading never throws.
 */
import { STEP_IDS, type StepId, type Verdict } from './types';
import type { Answers } from './check';

export const STORAGE_KEY = 'bb:scenarios';
export const LIMIT = 60;
const TEXT_MAX = 4000;
const CODE = /^[a-z][a-z0-9-]{1,60}-\d{1,5}$/;
const VERDICTS: readonly Verdict[] = ['best', 'fair', 'weak'];

export interface Entry {
  code: string;
  title: string;
  answers: Answers;
  checked: StepId[];
  verdicts: Partial<Record<StepId, Verdict>>;
  /** When the reader last answered a step, as an ISO time. */
  at: string;
}

export interface Record_ {
  v: 1;
  title: string;
  href: string;
  /** A line for My Business Workspace. */
  headline: string;
  items: Entry[];
}

const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const short = (v: unknown, max = 40) => (typeof v === 'string' && v.length <= max ? v : undefined);

function readAnswers(v: unknown): Answers {
  if (!isObj(v)) return {};
  const a: Answers = {};
  for (const k of ['problem', 'tool', 'recommend', 'stakeholders', 'risk', 'change'] as const) {
    const x = short(v[k], 60);
    if (x) a[k] = x;
  }
  if (Array.isArray(v.evidence)) a.evidence = v.evidence.filter((x): x is string => typeof x === 'string' && /^ex\d{1,2}$/.test(x)).slice(0, 12);
  if (typeof v.calc === 'string') a.calc = v.calc.slice(0, 40);
  if (isObj(v.sort)) {
    const s: Record<string, string> = {};
    for (const [k, x] of Object.entries(v.sort).slice(0, 20)) if (/^[a-z0-9-]{1,30}$/.test(k) && typeof x === 'string' && x.length <= 40) s[k] = x;
    a.sort = s;
  }
  if (typeof v.notes === 'string') a.notes = v.notes.slice(0, TEXT_MAX);
  if (typeof v.justify === 'string') a.justify = v.justify.slice(0, TEXT_MAX);
  return a;
}

function readEntry(v: unknown): Entry | null {
  if (!isObj(v) || typeof v.code !== 'string' || !CODE.test(v.code)) return null;
  const checked = Array.isArray(v.checked) ? STEP_IDS.filter((s) => (v.checked as unknown[]).includes(s)) : [];
  const verdicts: Partial<Record<StepId, Verdict>> = {};
  if (isObj(v.verdicts)) for (const s of STEP_IDS) if (VERDICTS.includes(v.verdicts[s] as Verdict) && checked.includes(s)) verdicts[s] = v.verdicts[s] as Verdict;
  const at = typeof v.at === 'string' && Number.isFinite(Date.parse(v.at)) ? new Date(v.at).toISOString() : new Date(0).toISOString();
  return { code: v.code, title: typeof v.title === 'string' ? v.title.slice(0, 160) : v.code, answers: readAnswers(v.answers), checked, verdicts, at };
}

export function emptyRecord(): Record_ {
  return { v: 1, title: 'Business scenario generator', href: '/decision-room/scenarios/', headline: '', items: [] };
}

/** Read a stored value (a string or parsed JSON). */
export function readRecord(raw: unknown): Record_ {
  let v: unknown = raw;
  if (typeof raw === 'string') {
    try {
      v = JSON.parse(raw);
    } catch {
      return emptyRecord();
    }
  }
  const rec = emptyRecord();
  if (!isObj(v) || !Array.isArray(v.items)) return rec;
  const seen = new Set<string>();
  for (const x of v.items) {
    const e = readEntry(x);
    if (!e || seen.has(e.code)) continue;
    seen.add(e.code);
    rec.items.push(e);
    if (rec.items.length >= LIMIT) break;
  }
  rec.headline = headlineOf(rec);
  return rec;
}

export function headlineOf(rec: Record_): string {
  const done = rec.items.filter((e) => e.checked.length === STEP_IDS.length);
  if (!rec.items.length) return '';
  const last = rec.items[0]!;
  return `${done.length} ${done.length === 1 ? 'scenario' : 'scenarios'} worked to the end, ${rec.items.length} started; latest: ${last.title}`;
}

/** The record with one scenario's entry put first (replacing any earlier entry for the same code), capped at LIMIT. */
export function upsert(rec: Record_, entry: Entry): Record_ {
  const items = [entry, ...rec.items.filter((e) => e.code !== entry.code)].slice(0, LIMIT);
  const next = { ...rec, items };
  return { ...next, headline: headlineOf(next) };
}

export function find(rec: Record_, code: string): Entry | undefined {
  return rec.items.find((e) => e.code === code);
}
