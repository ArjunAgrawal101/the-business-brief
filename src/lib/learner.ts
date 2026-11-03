/**
 * The learner record: what one reader has done on The Business Brief, kept in
 * this browser's local storage and nowhere else. These pure functions are
 * shared by the recorder (src/scripts/learner.ts), the save button, the
 * dashboard and the unit tests. None of them touches storage: each takes a
 * value and returns a new one, so every rule can be tested, and a damaged or
 * hostile value (an old version, a hand-edited export) can never break a page.
 *
 * Two items belong to the dashboard:
 * - bb:learner holds the pages opened, by kind (topic, mindmap, case,
 *   framework, tool), with the time of the first and latest visit, and the
 *   exercise items checked, so the dashboard can say what was right. It is
 *   capped in entries and in size.
 * - bb:saved holds the pages the reader chose to keep.
 * Everything else on the dashboard is read from the tools' own items.
 */

export const LEARNER_KEY = 'bb:learner';
export const SAVED_KEY = 'bb:saved';

/** The kinds of page the recorder notes. Any other page is not recorded. */
export const VISIT_KINDS = ['topic', 'mindmap', 'case', 'framework', 'tool'] as const;
export type VisitKind = (typeof VISIT_KINDS)[number];

export const VISIT_KIND_LABELS: Record<VisitKind, string> = {
  topic: 'Subtopics',
  mindmap: 'Mindmaps',
  case: 'Cases',
  framework: 'Toolkit and frameworks',
  tool: 'Tools and rooms',
};

/** The kinds of thing a reader can save. */
export const SAVED_KINDS = ['topic', 'term', 'case', 'mindmap', 'framework', 'diagram', 'question', 'tool', 'page'] as const;
export type SavedKind = (typeof SAVED_KINDS)[number];

export const SAVED_KIND_LABELS: Record<SavedKind, string> = {
  topic: 'Subtopic',
  term: 'Glossary term',
  case: 'Case',
  mindmap: 'Mindmap',
  framework: 'Toolkit guide',
  diagram: 'Diagram',
  question: 'Practice question',
  tool: 'Tool',
  page: 'Page',
};

export const VERDICTS = ['right', 'partial', 'wrong'] as const;
export type Verdict = (typeof VERDICTS)[number];

export interface Visit {
  kind: VisitKind;
  /** A path on this site, such as /topics/stakeholders/. */
  url: string;
  title: string;
  /** ISO times of the first and the latest visit. */
  first: string;
  last: string;
  /** Visits, counting at most one in any half hour. */
  count: number;
}

/** One exercise's checked items: each item's verdict and the answers it was given for. */
export interface CheckRecord {
  url: string;
  title: string;
  total: number;
  at: string;
  items: Record<string, { v: Verdict; p: string }>;
}

export interface LearnerLog {
  v: 1;
  /** The reader asked the recorder to stop noting anything. */
  paused: boolean;
  /** Most recent first; one entry per page. */
  visits: Visit[];
  /** By the exercise's id on its page. */
  checks: Record<string, CheckRecord>;
}

export interface SavedItem {
  url: string;
  title: string;
  kind: SavedKind;
  saved: string;
}

export interface SavedList {
  v: 1;
  /** Most recently saved first. */
  items: SavedItem[];
}

export const LIMITS = {
  visits: 400,
  checks: 80,
  checkItems: 60,
  title: 140,
  url: 300,
  saved: 200,
  /** The whole bb:learner value, serialized. */
  bytes: 100_000,
  /** A page opened again within this time is the same visit. */
  sessionGapMs: 30 * 60 * 1000,
};
export type Limits = typeof LIMITS;

/* ---------- Small validators ---------- */

const PATH_RE = /^\/(?!\/)[A-Za-z0-9\-._~/%#?=&+]*$/;
const UID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/;
const ITEM_RE = /^[A-Za-z0-9_.:-]{1,80}$/;

type Plain = Record<string, unknown>;

function isPlain(v: unknown): v is Plain {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** A value as an object: parses a JSON string, accepts an object, rejects anything else. */
export function asObject(raw: unknown): Plain | null {
  let v = raw;
  if (typeof raw === 'string') {
    try {
      v = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return isPlain(v) ? v : null;
}

/** A path on this site (with an optional fragment), or null. Never a full address, "//host" or "javascript:". */
export function safePath(v: unknown, max = LIMITS.url): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length > 0 && s.length <= max && PATH_RE.test(s) ? s : null;
}

/** The page part of a path: no query, no fragment. */
export function pagePath(v: unknown): string | null {
  const s = safePath(v);
  if (!s) return null;
  const page = s.split('#')[0]?.split('?')[0] ?? '';
  return page.startsWith('/') ? page : null;
}

/** Text fit to show: control characters removed, spaces collapsed, cut to `max` characters. */
export function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.replace(/\p{Cc}/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

/** An ISO time, normalized, or null. */
export function isoTime(v: unknown): string | null {
  if (typeof v !== 'string' || v.length > 40) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

const isKind = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === 'string' && (list as readonly string[]).includes(v);

/* ---------- The visit log ---------- */

export function emptyLog(): LearnerLog {
  return { v: 1, paused: false, visits: [], checks: {} };
}

function parseVisit(raw: unknown): Visit | null {
  if (!isPlain(raw)) return null;
  const url = pagePath(raw.url);
  const first = isoTime(raw.first);
  const last = isoTime(raw.last);
  if (!isKind(VISIT_KINDS, raw.kind) || !url || !first || !last) return null;
  const count = typeof raw.count === 'number' && Number.isFinite(raw.count) ? Math.min(100_000, Math.max(1, Math.floor(raw.count))) : 1;
  return { kind: raw.kind, url, title: cleanText(raw.title, LIMITS.title) ?? url, first: first <= last ? first : last, last, count };
}

function parseCheck(raw: unknown): CheckRecord | null {
  if (!isPlain(raw) || !isPlain(raw.items)) return null;
  const url = safePath(raw.url);
  const at = isoTime(raw.at);
  if (!url || !at) return null;
  const items: CheckRecord['items'] = {};
  for (const [id, c] of Object.entries(raw.items)) {
    if (!ITEM_RE.test(id) || !isPlain(c) || !isKind(VERDICTS, c.v) || typeof c.p !== 'string' || !c.p || c.p.length > 400) continue;
    items[id] = { v: c.v, p: c.p };
  }
  if (!Object.keys(items).length) return null;
  const total = typeof raw.total === 'number' && Number.isFinite(raw.total) ? Math.min(500, Math.max(1, Math.floor(raw.total))) : Object.keys(items).length;
  return { url, title: cleanText(raw.title, LIMITS.title) ?? 'An exercise', total, at, items };
}

/** Read a stored bb:learner value. Anything it cannot use is dropped; it never throws. */
export function parseLog(raw: unknown, limits: Limits = LIMITS): LearnerLog {
  const v = asObject(raw);
  if (!v) return emptyLog();
  const byUrl = new Map<string, Visit>();
  for (const x of Array.isArray(v.visits) ? v.visits : []) {
    const visit = parseVisit(x);
    if (!visit) continue;
    const had = byUrl.get(visit.url);
    if (!had || had.last < visit.last) byUrl.set(visit.url, visit);
  }
  const checks: LearnerLog['checks'] = {};
  if (isPlain(v.checks))
    for (const [uid, c] of Object.entries(v.checks)) {
      const rec = UID_RE.test(uid) ? parseCheck(c) : null;
      if (rec) checks[uid] = rec;
    }
  return capLog({ v: 1, paused: v.paused === true, visits: [...byUrl.values()], checks }, limits);
}

const byLastDesc = (a: Visit, b: Visit) => (a.last < b.last ? 1 : a.last > b.last ? -1 : 0);

/**
 * Keep the record within its limits: the most recent pages and exercises,
 * at most `checkItems` items an exercise, and at most `bytes` in all, dropping
 * the oldest visits first.
 */
export function capLog(log: LearnerLog, limits: Limits = LIMITS): LearnerLog {
  const visits = [...log.visits].sort(byLastDesc).slice(0, limits.visits);
  const checks = Object.fromEntries(
    Object.entries(log.checks)
      .sort((a, b) => (a[1].at < b[1].at ? 1 : a[1].at > b[1].at ? -1 : 0))
      .slice(0, limits.checks)
      .map(([uid, c]) => [uid, { ...c, items: Object.fromEntries(Object.entries(c.items).slice(0, limits.checkItems)) }]),
  );
  const out: LearnerLog = { v: 1, paused: log.paused, visits, checks };
  let size = JSON.stringify(out).length;
  while (size > limits.bytes && (out.visits.length || Object.keys(out.checks).length)) {
    if (out.visits.length) {
      // The list is newest first, so the oldest tenth comes off the end.
      const drop = Math.max(1, Math.ceil(out.visits.length * 0.1));
      out.visits.splice(out.visits.length - drop, drop);
    } else {
      const oldest = Object.entries(out.checks).sort((a, b) => (a[1].at < b[1].at ? -1 : 1))[0];
      if (oldest) delete out.checks[oldest[0]];
    }
    size = JSON.stringify(out).length;
  }
  return out;
}

/**
 * Note a visit to a page. A page opened again within half an hour is the
 * same visit: its time moves on but its count does not. Nothing is noted
 * while the reader has paused the record.
 */
export function recordVisit(log: LearnerLog, input: { kind: VisitKind; url: string; title: string }, now: Date, limits: Limits = LIMITS): LearnerLog {
  if (log.paused || !isKind(VISIT_KINDS, input.kind)) return log;
  const url = pagePath(input.url);
  if (!url) return log;
  const at = now.toISOString();
  const title = cleanText(input.title, limits.title) ?? url;
  const prev = log.visits.find((x) => x.url === url);
  const visit: Visit = prev
    ? { ...prev, kind: input.kind, title, last: at, count: now.getTime() - Date.parse(prev.last) >= limits.sessionGapMs ? prev.count + 1 : prev.count }
    : { kind: input.kind, url, title, first: at, last: at, count: 1 };
  return capLog({ ...log, visits: [visit, ...log.visits.filter((x) => x.url !== url)] }, limits);
}

/**
 * The kind of a page, from its address. Topic, mindmap, case and framework
 * pages are the ones under /topics/, /mindmaps/, /cases/, /toolkit/ and
 * /frameworks/ (not the libraries themselves); tools are the pages under any
 * of `toolPrefixes`.
 */
export function kindOfPath(path: string, toolPrefixes: readonly string[]): VisitKind | null {
  const page = pagePath(path);
  if (!page) return null;
  const p = page.endsWith('/') ? page : `${page}/`;
  if (/^\/topics\/[^/]+\/$/.test(p)) return 'topic';
  if (/^\/mindmaps\/[^/]+\/$/.test(p)) return 'mindmap';
  if (/^\/cases\/[^/]+\/$/.test(p)) return 'case';
  if (/^\/(toolkit|frameworks)\/[^/]+\/$/.test(p)) return 'framework';
  if (toolPrefixes.some((pre) => pre !== '/' && p.startsWith(pre))) return 'tool';
  return null;
}

/** Rooms with tools of their own, beyond the navigation's Tools group. */
const EXTRA_TOOL_ROOMS = ['/case-room/', '/decision-room/', '/boardroom/', '/ia-studio/'];

/** The address prefixes of tool pages: every link in the navigation's Tools group, the Case Room, the Decision Rooms, the Boardroom and the IA planner. */
export function toolPrefixes(nav: ReadonlyArray<{ id: string; links: ReadonlyArray<{ href: string }> }>): string[] {
  const fromNav = nav.filter((g) => g.id === 'tools').flatMap((g) => g.links.map((l) => (l.href.endsWith('/') ? l.href : `${l.href}/`)));
  return [...new Set([...fromNav, ...EXTRA_TOOL_ROOMS])];
}

const TITLE_SUFFIXES = [/\s*\|\s*The Business Brief$/i, /:\s*(mindmap|case file|toolkit|definition|framework)$/i];

/** A page's title as the dashboard lists it: without the site's name or a kind already shown by the list. */
export function cleanTitle(docTitle: string): string {
  let t = docTitle.trim();
  for (const re of TITLE_SUFFIXES) t = t.replace(re, '').trim();
  return cleanText(t, LIMITS.title) ?? '';
}

/* ---------- Exercise checks ---------- */

function stringRecord(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (isPlain(v)) for (const [k, x] of Object.entries(v)) if (typeof x === 'string') out[k] = x;
  return out;
}

/**
 * What an item was answered with, from the exercise's saved answers (its
 * bb:quiz:<id> value, keyed "<item>:<group>"). Empty when unanswered.
 */
export function pickSignature(picks: unknown, item: string): string {
  const all = stringRecord(picks);
  return Object.keys(all)
    .filter((k) => k.startsWith(`${item}:`))
    .sort()
    .map((k) => `${k}=${all[k]}`)
    .join('|')
    .slice(0, 400);
}

/**
 * Note the items of an exercise as they are checked. The quiz engine reports
 * the items checked during this visit; an item checked on an earlier visit is
 * kept while its answer is unchanged, and dropped once the answer changes or
 * is cleared, so the record never claims a verdict for an answer the reader no
 * longer holds.
 */
export function updateChecks(
  log: LearnerLog,
  input: { uid: string; total: number; results: unknown; picks: unknown; url: string; title: string },
  now: Date,
  limits: Limits = LIMITS,
): LearnerLog {
  if (log.paused || !UID_RE.test(input.uid)) return log;
  const url = safePath(input.url);
  if (!url) return log;
  const items: CheckRecord['items'] = {};
  for (const [id, c] of Object.entries(log.checks[input.uid]?.items ?? {})) if (c.p === pickSignature(input.picks, id)) items[id] = c;
  if (isPlain(input.results))
    for (const [id, v] of Object.entries(input.results)) {
      const p = pickSignature(input.picks, id);
      if (ITEM_RE.test(id) && isKind(VERDICTS, v) && p) items[id] = { v, p };
    }
  const checks = { ...log.checks };
  if (Object.keys(items).length) {
    const total = Number.isFinite(input.total) && input.total > 0 ? Math.min(500, Math.floor(input.total)) : Object.keys(items).length;
    checks[input.uid] = { url, title: cleanText(input.title, limits.title) ?? 'An exercise', total, at: now.toISOString(), items };
  } else delete checks[input.uid];
  return capLog({ ...log, checks }, limits);
}

export interface Tally {
  checked: number;
  right: number;
  partial: number;
  wrong: number;
  total: number;
}

/** The verdicts that still stand: items whose answer is the one that was checked. */
export function checkTally(rec: CheckRecord | undefined, picks: unknown): Tally {
  const t: Tally = { checked: 0, right: 0, partial: 0, wrong: 0, total: rec?.total ?? 0 };
  for (const [id, c] of Object.entries(rec?.items ?? {})) {
    if (c.p !== pickSignature(picks, id)) continue;
    t.checked += 1;
    t[c.v] += 1;
  }
  return t;
}

/* ---------- Saved items ---------- */

export function emptySaved(): SavedList {
  return { v: 1, items: [] };
}

/** Read a stored bb:saved value: newest first, one entry per address, at most LIMITS.saved. */
export function parseSaved(raw: unknown, limits: Limits = LIMITS): SavedList {
  const v = asObject(raw);
  if (!v || !Array.isArray(v.items)) return emptySaved();
  const seen = new Set<string>();
  const items: SavedItem[] = [];
  for (const x of v.items) {
    if (!isPlain(x)) continue;
    const url = safePath(x.url);
    const saved = isoTime(x.saved);
    if (!url || !saved || !isKind(SAVED_KINDS, x.kind) || seen.has(url)) continue;
    seen.add(url);
    items.push({ url, title: cleanText(x.title, limits.title) ?? url, kind: x.kind, saved });
  }
  items.sort((a, b) => (a.saved < b.saved ? 1 : a.saved > b.saved ? -1 : 0));
  return { v: 1, items: items.slice(0, limits.saved) };
}

export function isSaved(list: SavedList, url: string): boolean {
  return list.items.some((x) => x.url === url);
}

/** Save the item, or remove it when it is already saved. */
export function toggleSaved(list: SavedList, item: { url: string; title: string; kind: string }, now: Date, limits: Limits = LIMITS): { list: SavedList; saved: boolean } {
  const url = safePath(item.url);
  if (!url || !isKind(SAVED_KINDS, item.kind)) return { list, saved: isSaved(list, item.url) };
  if (isSaved(list, url)) return { list: removeSaved(list, url), saved: false };
  const entry: SavedItem = { url, title: cleanText(item.title, limits.title) ?? url, kind: item.kind, saved: now.toISOString() };
  return { list: { v: 1, items: [entry, ...list.items].slice(0, limits.saved) }, saved: true };
}

export function removeSaved(list: SavedList, url: string): SavedList {
  return { v: 1, items: list.items.filter((x) => x.url !== url) };
}

/* ---------- Combining two records (import) ---------- */

/** Both lists, one entry per address, the later save winning. Importing the same file twice changes nothing. */
export function mergeSaved(base: SavedList, extra: SavedList, limits: Limits = LIMITS): SavedList {
  const byUrl = new Map(base.items.map((x) => [x.url, x]));
  for (const x of extra.items) {
    const had = byUrl.get(x.url);
    if (!had || had.saved < x.saved) byUrl.set(x.url, x);
  }
  return parseSaved({ v: 1, items: [...byUrl.values()] }, limits);
}

/** Both visit records, one entry per page: the earliest first visit, the latest visit, the larger count. The pause setting stays this browser's. */
export function mergeLogs(base: LearnerLog, extra: LearnerLog, limits: Limits = LIMITS): LearnerLog {
  const byUrl = new Map(base.visits.map((x) => [x.url, x]));
  for (const x of extra.visits) {
    const had = byUrl.get(x.url);
    if (!had) {
      byUrl.set(x.url, x);
      continue;
    }
    const later = had.last >= x.last ? had : x;
    byUrl.set(x.url, { ...later, first: had.first < x.first ? had.first : x.first, count: Math.max(had.count, x.count) });
  }
  const checks = { ...base.checks };
  for (const [uid, c] of Object.entries(extra.checks)) {
    const had = checks[uid];
    if (!had || had.at < c.at) checks[uid] = c;
  }
  return capLog({ v: 1, paused: base.paused, visits: [...byUrl.values()], checks }, limits);
}

/* ---------- Export and import ---------- */

export const EXPORT_FORMAT = 'the-business-brief/learner-data';
export const EXPORT_VERSION = 1;
/** The names this site gives its items: "bb:" and a short name of letters, digits and : . _ - */
export const KEY_RE = /^bb:[a-z0-9][a-z0-9:._-]{0,150}$/i;
export const IMPORT_LIMITS = { fileChars: 4_000_000, items: 2_000, valueChars: 500_000 };

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  site: string;
  exported: string;
  note: string;
  /** Each item exactly as this browser keeps it. */
  items: Record<string, string>;
}

/** The export: every item of this site's, exactly as stored, in name order. */
export function buildExport(entries: ReadonlyArray<readonly [string, string]>, now: Date): ExportFile {
  const items: Record<string, string> = {};
  for (const [k, v] of [...entries].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))) if (KEY_RE.test(k) && typeof v === 'string') items[k] = v;
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    site: 'Arjun Agrawal | The Business Brief',
    exported: now.toISOString(),
    note: 'Your work and progress from The Business Brief, exported from one browser. Import it on the dashboard of another. It was not sent anywhere; keep it private, since it holds your answers and notes.',
    items,
  };
}

export type ImportCheck =
  | { ok: true; exported: string | null; items: Array<{ key: string; value: string }>; skipped: Array<{ key: string; reason: string }> }
  | { ok: false; error: string };

/**
 * Check a file before anything is written. It must be an export from this
 * dashboard; every item must have one of this site's names and a value of
 * the right shape. The dashboard's own items are cleaned through the same
 * parsers as the stored ones, and every other value must be valid JSON.
 */
export function validateImport(text: string, limits = IMPORT_LIMITS): ImportCheck {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, error: 'The file is empty.' };
  if (text.length > limits.fileChars) return { ok: false, error: 'The file is far larger than any export from this dashboard, so it was not read.' };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The file is not a JSON file. Choose the file the dashboard downloaded when you exported.' };
  }
  if (!isPlain(data) || data.format !== EXPORT_FORMAT) return { ok: false, error: 'This JSON file was not exported from this dashboard, so nothing was imported.' };
  if (data.version !== EXPORT_VERSION) return { ok: false, error: 'The file comes from a version of the dashboard this page cannot read.' };
  if (!isPlain(data.items)) return { ok: false, error: 'The file holds no items.' };
  const entries = Object.entries(data.items);
  if (entries.length > limits.items) return { ok: false, error: 'The file holds more items than this site ever keeps, so it was not read.' };
  const items: Array<{ key: string; value: string }> = [];
  const skipped: Array<{ key: string; reason: string }> = [];
  for (const [key, value] of entries) {
    if (!KEY_RE.test(key)) {
      skipped.push({ key: key.slice(0, 60), reason: 'not a name this site uses' });
      continue;
    }
    if (typeof value !== 'string' || value.length > limits.valueChars) {
      skipped.push({ key, reason: 'its value is not one this site writes' });
      continue;
    }
    if (key === 'bb:level') {
      if (value === 'SL' || value === 'HL') items.push({ key, value });
      else skipped.push({ key, reason: 'the level must be SL or HL' });
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      skipped.push({ key, reason: 'its value is not valid JSON' });
      continue;
    }
    if (key === LEARNER_KEY) items.push({ key, value: JSON.stringify(parseLog(parsed)) });
    else if (key === SAVED_KEY) items.push({ key, value: JSON.stringify(parseSaved(parsed)) });
    else items.push({ key, value: JSON.stringify(parsed) });
  }
  if (!items.length) return { ok: false, error: 'The file holds nothing this site can use.' };
  return { ok: true, exported: isoTime(data.exported), items, skipped };
}

export interface ImportWrite {
  key: string;
  value: string;
  /** new: not held before; replace: held with another value; same: held already, unchanged. */
  effect: 'new' | 'replace' | 'same';
}

/**
 * What importing will write. Saved items and visit records are combined with
 * what this browser already holds; every other item replaces the one with the
 * same name. Nothing the file does not name is touched.
 */
export function planImport(current: Readonly<Record<string, string | null | undefined>>, items: ReadonlyArray<{ key: string; value: string }>): ImportWrite[] {
  return items.map(({ key, value }) => {
    const had = current[key];
    let next = value;
    if (key === LEARNER_KEY && had) next = JSON.stringify(mergeLogs(parseLog(had), parseLog(value)));
    if (key === SAVED_KEY && had) next = JSON.stringify(mergeSaved(parseSaved(had), parseSaved(value)));
    const effect: ImportWrite['effect'] = had === null || had === undefined ? 'new' : had === next ? 'same' : 'replace';
    return { key, value: next, effect };
  });
}
