/**
 * My Business Workspace: the reader's own work on The Business Brief, kept in
 * this browser's local storage and nowhere else. The workspace is the learner
 * dashboard grown into a place to work: it keeps everything the dashboard
 * showed (src/lib/dashboard.ts) and adds three items of its own, whose rules
 * are all here as pure functions, shared by the page's script, the note
 * editor, the Financial Laboratory and the unit tests:
 *
 * - bb:workspace:list holds the learning list's arrangement: the order the
 *   reader gave the saved items (bb:saved, unchanged), and for each one a
 *   status (to do, in progress, done) and a short note.
 * - bb:workspace:notes is the notebook: case notes under the six headings of
 *   a business case analysis, or free notes, each attached to a page or
 *   standalone.
 * - bb:workspace:snapshots holds the results the reader saved from the
 *   Financial Laboratory: the calculator, the figures, the headline result
 *   and the date.
 *
 * Nothing here touches storage. Each function takes a value and returns a new
 * one, so a damaged or hostile value (an old version, a hand-edited file) can
 * never break a page, and every cap and merge can be tested.
 *
 * The saved analyses are read from the tools' own items without changing
 * them. A selection of work exports as Markdown, to read and print, and as
 * JSON in the format of the whole-record export, so the workspace's "Import a
 * copy" reads it back and combines it with what is there.
 */
import { dashboardView, type DashConfig, type DashboardView, type WorkItem } from './dashboard';
import {
  SAVED_KEY,
  SAVED_KIND_LABELS,
  asObject,
  buildExport,
  cleanText,
  isoTime,
  pagePath,
  planImport,
  safePath,
  validateImport,
  type ExportFile,
  type ImportCheck,
  type ImportWrite,
  type SavedItem,
  type SavedList,
} from './learner';

export const LIST_KEY = 'bb:workspace:list';
export const NOTES_KEY = 'bb:workspace:notes';
export const SNAPSHOTS_KEY = 'bb:workspace:snapshots';
export const WORKSPACE_KEYS = [LIST_KEY, NOTES_KEY, SNAPSHOTS_KEY] as const;

export const WS_LIMITS = {
  /** A short note on an item of the learning list. */
  listNote: 280,
  /** Arrangements kept: the saved items, and those the reader unsaved elsewhere, so a note comes back if they save it again. */
  listEntries: 400,
  notes: 200,
  noteTitle: 140,
  /** Each heading of a case note, or the whole of a free note. */
  noteField: 4_000,
  /** The whole notebook, serialized: well under the 500,000 characters an import accepts for one item. */
  notesBytes: 400_000,
  snapshots: 60,
  /** Figures kept for one snapshot (a cash flow forecast has many). */
  snapshotLines: 40,
  snapshotText: 160,
};
export type WsLimits = typeof WS_LIMITS;

type Plain = Record<string, unknown>;
const isPlain = (v: unknown): v is Plain => typeof v === 'object' && v !== null && !Array.isArray(v);
const EPOCH = new Date(0).toISOString();
const newer = (a: string, b: string) => (a > b ? a : b);

/**
 * Text written over several lines, fit to keep: control characters removed
 * (line breaks kept), spaces collapsed, at most one blank line in a row, cut
 * to `max` characters. Empty when there is nothing.
 */
export function cleanBlock(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  const s = v
    .replace(/\r\n?/g, '\n')
    .replace(/\p{Cc}/gu, (c) => (c === '\n' ? c : ' '))
    .replace(/[^\S\n]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

const ID_RE = /^[a-z][a-z0-9-]{2,60}$/;

/** A short id that sorts by time: "n-mbz1x2a-0k3fq". `rand` is a number from 0 to 1, given in the tests. */
export function newId(prefix: string, now: Date, rand: number = Math.random()): string {
  const r = Math.floor(Math.min(0.999999, Math.max(0, rand)) * 36 ** 5)
    .toString(36)
    .padStart(5, '0');
  return `${prefix}-${now.getTime().toString(36)}-${r}`;
}

/* ---------- The learning list ---------- */

export const STATUSES = ['todo', 'doing', 'done'] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABELS: Record<Status, string> = { todo: 'To do', doing: 'In progress', done: 'Done' };
const isStatus = (v: unknown): v is Status => typeof v === 'string' && (STATUSES as readonly string[]).includes(v);

export interface ListEntry {
  status: Status;
  note: string;
  updated: string;
}

export interface ListState {
  v: 1;
  /** The order the reader gave the list, by address. Items saved since then come first. */
  order: string[];
  /** Each item's status and note, by address. */
  entries: Record<string, ListEntry>;
}

export function emptyList(): ListState {
  return { v: 1, order: [], entries: {} };
}

/** Read a stored bb:workspace:list value. Anything it cannot use is dropped; it never throws. */
export function parseList(raw: unknown, limits: WsLimits = WS_LIMITS): ListState {
  const v = asObject(raw);
  if (!v) return emptyList();
  const order: string[] = [];
  for (const x of Array.isArray(v.order) ? v.order : []) {
    const url = safePath(x);
    if (url && !order.includes(url)) order.push(url);
  }
  const entries: Record<string, ListEntry> = {};
  if (isPlain(v.entries))
    for (const [k, e] of Object.entries(v.entries)) {
      const url = safePath(k);
      if (!url || !isPlain(e)) continue;
      entries[url] = { status: isStatus(e.status) ? e.status : 'todo', note: cleanText(e.note, limits.listNote) ?? '', updated: isoTime(e.updated) ?? EPOCH };
    }
  return capList({ v: 1, order, entries }, limits);
}

/** Keep the arrangement within its limit: the arranged items first, then the most recently changed. */
export function capList(list: ListState, limits: WsLimits = WS_LIMITS): ListState {
  const order = [...new Set(list.order)].slice(0, limits.listEntries);
  const placed = new Set(order);
  const keep = Object.entries(list.entries)
    .sort((a, b) => Number(placed.has(b[0])) - Number(placed.has(a[0])) || (a[1].updated < b[1].updated ? 1 : a[1].updated > b[1].updated ? -1 : 0))
    .slice(0, limits.listEntries);
  return { v: 1, order, entries: Object.fromEntries(keep) };
}

export interface ListItem extends SavedItem {
  status: Status;
  note: string;
  /** When its status or note last changed; null when never. */
  updated: string | null;
}

/**
 * The learning list as the reader sees it: every saved item, those saved
 * since the reader last arranged the list first (newest first), then the
 * rest in the reader's order, each with its status and note.
 */
export function listView(saved: SavedList, list: ListState): ListItem[] {
  const byUrl = new Map(saved.items.map((x) => [x.url, x]));
  const arranged = list.order.filter((u) => byUrl.has(u));
  const placed = new Set(arranged);
  const items = [...saved.items.filter((x) => !placed.has(x.url)), ...arranged.map((u) => byUrl.get(u)!)];
  return items.map((x) => {
    const e = list.entries[x.url];
    return { ...x, status: e?.status ?? 'todo', note: e?.note ?? '', updated: e && e.updated !== EPOCH ? e.updated : null };
  });
}

/** The list's items counted by status. */
export function listCounts(items: readonly ListItem[]): Record<Status, number> {
  const out: Record<Status, number> = { todo: 0, doing: 0, done: 0 };
  for (const x of items) out[x.status] += 1;
  return out;
}

/**
 * Move an item up (delta -1) or down (+1) the list the reader sees. The order
 * shown becomes the stored order, so what the reader sees is what is kept.
 */
export function moveInList(list: ListState, shown: readonly string[], url: string, delta: number, limits: WsLimits = WS_LIMITS): ListState {
  const at = shown.indexOf(url);
  if (at < 0 || !Number.isInteger(delta) || delta === 0) return list;
  const to = Math.min(shown.length - 1, Math.max(0, at + delta));
  if (to === at) return list;
  const order = [...shown];
  order.splice(at, 1);
  order.splice(to, 0, url);
  return capList({ ...list, order }, limits);
}

export function setListStatus(list: ListState, url: string, status: string, now: Date, limits: WsLimits = WS_LIMITS): ListState {
  const u = safePath(url);
  if (!u || !isStatus(status)) return list;
  const had = list.entries[u];
  return capList({ ...list, entries: { ...list.entries, [u]: { status, note: had?.note ?? '', updated: now.toISOString() } } }, limits);
}

export function setListNote(list: ListState, url: string, note: string, now: Date, limits: WsLimits = WS_LIMITS): ListState {
  const u = safePath(url);
  if (!u) return list;
  const had = list.entries[u];
  return capList({ ...list, entries: { ...list.entries, [u]: { status: had?.status ?? 'todo', note: cleanText(note, limits.listNote) ?? '', updated: now.toISOString() } } }, limits);
}

/** Forget an item's place, status and note: the reader removed it from the list. */
export function forgetInList(list: ListState, url: string): ListState {
  const entries = { ...list.entries };
  delete entries[url];
  return { v: 1, order: list.order.filter((u) => u !== url), entries };
}

/** Both arrangements: for each item the later change wins; this browser's order first, then any the other adds. Importing twice changes nothing. */
export function mergeLists(base: ListState, extra: ListState, limits: WsLimits = WS_LIMITS): ListState {
  const entries = { ...base.entries };
  for (const [url, e] of Object.entries(extra.entries)) {
    const had = entries[url];
    if (!had || had.updated < e.updated) entries[url] = e;
  }
  return capList({ v: 1, order: [...base.order, ...extra.order.filter((u) => !base.order.includes(u))], entries }, limits);
}

/* ---------- The notebook ---------- */

/** The six headings of a business case analysis, in the order an answer takes them. */
export const NOTE_FIELDS = ['problem', 'evidence', 'theory', 'alternatives', 'recommendation', 'evaluation'] as const;
export type NoteField = (typeof NOTE_FIELDS)[number];

export const NOTE_FIELD_LABELS: Record<NoteField, string> = {
  problem: 'Problem identified',
  evidence: 'Evidence',
  theory: 'Relevant theory',
  alternatives: 'Strategic alternatives',
  recommendation: 'Recommendation',
  evaluation: 'Evaluation',
};

/** A prompt for each heading, shown under it in the editor. */
export const NOTE_FIELD_HINTS: Record<NoteField, string> = {
  problem: 'The issue the business faces, in a sentence, separated from its symptoms.',
  evidence: 'Figures, facts and quotations from the case that show it.',
  theory: 'The concepts, tools and frameworks that explain it.',
  alternatives: 'The realistic options open to the business.',
  recommendation: 'The option you would choose, and why.',
  evaluation: 'Its risks, the conditions it depends on, and what would change your mind.',
};

export const NOTE_KINDS = ['case', 'free'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];
export const NOTE_KIND_LABELS: Record<NoteKind, string> = { case: 'Case notes', free: 'Note' };

export interface NotePage {
  url: string;
  title: string;
}

export interface Note {
  id: string;
  kind: NoteKind;
  title: string;
  /** The page it is attached to; null for a standalone note. */
  page: NotePage | null;
  /** The six headings of a case note (all empty for a free note). */
  fields: Record<NoteField, string>;
  /** The text of a free note (empty for a case note). */
  body: string;
  created: string;
  updated: string;
}

export interface Notebook {
  v: 1;
  /** Most recently changed first. */
  notes: Note[];
}

export function emptyNotebook(): Notebook {
  return { v: 1, notes: [] };
}

const blankFields = (): Record<NoteField, string> => ({ problem: '', evidence: '', theory: '', alternatives: '', recommendation: '', evaluation: '' });

function cleanPage(raw: unknown, limits: WsLimits): NotePage | null {
  if (!isPlain(raw)) return null;
  const url = safePath(raw.url);
  return url ? { url, title: cleanText(raw.title, limits.noteTitle) ?? url } : null;
}

/** Whether a note says anything: a case note in any heading, a free note in its text. */
export function hasContent(n: Pick<Note, 'kind' | 'fields' | 'body'>): boolean {
  return n.kind === 'case' ? NOTE_FIELDS.some((f) => n.fields[f].trim() !== '') : n.body.trim() !== '';
}

/** A title for a note the reader did not name: its page's title, else its first words. */
export function fallbackTitle(n: Pick<Note, 'kind' | 'fields' | 'body' | 'page'>, limits: WsLimits = WS_LIMITS): string {
  if (n.page) return n.page.title;
  const first = n.kind === 'case' ? (NOTE_FIELDS.map((f) => n.fields[f]).find((t) => t.trim()) ?? '') : n.body;
  return cleanText(first.split('\n')[0] ?? '', Math.min(80, limits.noteTitle)) ?? 'Untitled note';
}

function parseNote(raw: unknown, limits: WsLimits): Note | null {
  if (!isPlain(raw) || typeof raw.id !== 'string' || !ID_RE.test(raw.id)) return null;
  const created = isoTime(raw.created);
  const updated = isoTime(raw.updated) ?? created;
  if (!created || !updated) return null;
  const rawFields = isPlain(raw.fields) ? raw.fields : {};
  const kind: NoteKind = raw.kind === 'case' || raw.kind === 'free' ? raw.kind : Object.values(rawFields).some((x) => typeof x === 'string' && x.trim()) ? 'case' : 'free';
  const fields = blankFields();
  if (kind === 'case') for (const f of NOTE_FIELDS) fields[f] = cleanBlock(rawFields[f], limits.noteField);
  const body = kind === 'free' ? cleanBlock(raw.body, limits.noteField) : '';
  const page = cleanPage(raw.page, limits);
  const note = { id: raw.id, kind, page, fields, body, created: created <= updated ? created : updated, updated, title: '' };
  if (!hasContent(note)) return null;
  note.title = cleanText(raw.title, limits.noteTitle) ?? fallbackTitle(note, limits);
  return note;
}

const byUpdatedDesc = (a: Note, b: Note) => (a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Keep the notebook within its limits: at most `notes` notes and `notesBytes` characters, dropping the oldest changed first. */
export function capNotebook(nb: Notebook, limits: WsLimits = WS_LIMITS): Notebook {
  const notes = [...nb.notes].sort(byUpdatedDesc).slice(0, limits.notes);
  while (notes.length && JSON.stringify({ v: 1, notes }).length > limits.notesBytes) notes.pop();
  return { v: 1, notes };
}

/** Read a stored bb:workspace:notes value: one note per id (the latest), newest first, within the limits. It never throws. */
export function parseNotebook(raw: unknown, limits: WsLimits = WS_LIMITS): Notebook {
  const v = asObject(raw);
  if (!v || !Array.isArray(v.notes)) return emptyNotebook();
  const byId = new Map<string, Note>();
  for (const x of v.notes) {
    const n = parseNote(x, limits);
    if (!n) continue;
    const had = byId.get(n.id);
    if (!had || had.updated < n.updated) byId.set(n.id, n);
  }
  return capNotebook({ v: 1, notes: [...byId.values()] }, limits);
}

/** What the editor hands over: an id when it edits a note, none for a new one. */
export interface NoteDraft {
  id?: string;
  kind: string;
  title?: string;
  page?: { url: string; title: string } | null;
  fields?: Partial<Record<string, string>>;
  body?: string;
}

export type NoteResult = { ok: true; notebook: Notebook; note: Note } | { ok: false; field: string; error: string };

/**
 * Save a note: a new one, or the one with the draft's id. Refused, with the
 * reason and the field it concerns, when it says nothing, or when the
 * notebook is full.
 */
export function saveNote(nb: Notebook, draft: NoteDraft, now: Date, rand: number = Math.random(), limits: WsLimits = WS_LIMITS): NoteResult {
  const kind: NoteKind = draft.kind === 'case' ? 'case' : 'free';
  const fields = blankFields();
  if (kind === 'case') for (const f of NOTE_FIELDS) fields[f] = cleanBlock(draft.fields?.[f], limits.noteField);
  const body = kind === 'free' ? cleanBlock(draft.body, limits.noteField) : '';
  const page = draft.page ? cleanPage(draft.page, limits) : null;
  if (!hasContent({ kind, fields, body }))
    return kind === 'case' ? { ok: false, field: NOTE_FIELDS[0], error: 'Write under at least one of the headings before saving the note.' } : { ok: false, field: 'body', error: 'Write the note before saving it.' };
  const had = draft.id ? nb.notes.find((n) => n.id === draft.id) : undefined;
  if (!had && nb.notes.length >= limits.notes) return { ok: false, field: 'form', error: `Your notebook holds ${limits.notes} notes, the most it keeps. Delete one you no longer need to make room.` };
  const at = now.toISOString();
  const base = { kind, fields, body, page };
  const note: Note = {
    id: had?.id ?? newId('n', now, rand),
    ...base,
    title: cleanText(draft.title, limits.noteTitle) ?? fallbackTitle(base, limits),
    created: had?.created ?? at,
    updated: had ? newer(at, had.updated) : at,
  };
  const notes = [note, ...nb.notes.filter((n) => n.id !== note.id)];
  if (JSON.stringify({ v: 1, notes }).length > limits.notesBytes) return { ok: false, field: 'form', error: 'Your notebook is full: this browser keeps it under a set size. Shorten this note, or delete a note you no longer need.' };
  return { ok: true, notebook: { v: 1, notes: notes.sort(byUpdatedDesc) }, note };
}

export function deleteNote(nb: Notebook, id: string): Notebook {
  return { v: 1, notes: nb.notes.filter((n) => n.id !== id) };
}

/** Both notebooks, one note per id, the later change winning. Importing the same file twice changes nothing. */
export function mergeNotebooks(base: Notebook, extra: Notebook, limits: WsLimits = WS_LIMITS): Notebook {
  const byId = new Map(base.notes.map((n) => [n.id, n]));
  for (const n of extra.notes) {
    const had = byId.get(n.id);
    if (!had || had.updated < n.updated) byId.set(n.id, n);
  }
  return capNotebook({ v: 1, notes: [...byId.values()] }, limits);
}

/** Lower case, without accents, so "evaluacion" finds "Evaluación". */
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();

/** All of a note's words, for search. */
export function noteText(n: Note): string {
  return [n.title, n.page?.title ?? '', n.page?.url ?? '', ...NOTE_FIELDS.map((f) => n.fields[f]), n.body].join('\n');
}

/** The notes that contain every word of the query, in their order. An empty query keeps them all. */
export function searchNotes(notes: readonly Note[], query: string): Note[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [...notes];
  return notes.filter((n) => {
    const hay = fold(noteText(n));
    return words.every((w) => hay.includes(w));
  });
}

/**
 * The notes attached to a page. An address with a fragment names one item on
 * a page (a question, a diagram) and finds the notes on that item; a page's
 * own address finds every note on the page.
 */
export function notesForPage(notes: readonly Note[], url: string): Note[] {
  const page = pagePath(url);
  if (!page) return [];
  if (url.includes('#')) return notes.filter((n) => n.page?.url === url);
  return notes.filter((n) => n.page && pagePath(n.page.url) === page);
}

/* ---------- Results saved from the Financial Laboratory ---------- */

export interface Snapshot {
  id: string;
  /** The calculator's id, such as break-even-quantity. */
  calc: string;
  name: string;
  /** The calculator's address, with the figures in it where the calculator can read them back. */
  url: string;
  headline: { label: string; value: string; note: string };
  /** The figures the result was worked from, as the calculator lists them. */
  inputs: Array<{ label: string; value: string }>;
  /** The reader's own figures; false when they are the calculator's example. */
  mine: boolean;
  saved: string;
}

export interface Snapshots {
  v: 1;
  /** Newest first. */
  items: Snapshot[];
}

export function emptySnapshots(): Snapshots {
  return { v: 1, items: [] };
}

const CALC_RE = /^[a-z0-9][a-z0-9-]{0,60}$/;

function parseLines(raw: unknown, limits: WsLimits): Array<{ label: string; value: string }> {
  const out: Array<{ label: string; value: string }> = [];
  for (const x of Array.isArray(raw) ? raw : []) {
    if (!isPlain(x)) continue;
    const label = cleanText(x.label, limits.snapshotText);
    const value = cleanText(x.value, limits.snapshotText);
    if (label && value !== null) out.push({ label, value });
    if (out.length >= limits.snapshotLines) break;
  }
  return out;
}

function parseSnapshot(raw: unknown, limits: WsLimits): Snapshot | null {
  if (!isPlain(raw) || typeof raw.id !== 'string' || !ID_RE.test(raw.id) || typeof raw.calc !== 'string' || !CALC_RE.test(raw.calc)) return null;
  const url = safePath(raw.url);
  const saved = isoTime(raw.saved);
  const h = isPlain(raw.headline) ? raw.headline : null;
  const label = cleanText(h?.label, limits.snapshotText);
  const value = cleanText(h?.value, limits.snapshotText);
  if (!url || !saved || !label || !value) return null;
  return {
    id: raw.id,
    calc: raw.calc,
    name: cleanText(raw.name, limits.snapshotText) ?? raw.calc,
    url,
    headline: { label, value, note: cleanText(h?.note, limits.snapshotText) ?? '' },
    inputs: parseLines(raw.inputs, limits),
    mine: raw.mine === true,
    saved,
  };
}

/** Read a stored bb:workspace:snapshots value: one per id, newest first, at most `snapshots`. It never throws. */
export function parseSnapshots(raw: unknown, limits: WsLimits = WS_LIMITS): Snapshots {
  const v = asObject(raw);
  if (!v || !Array.isArray(v.items)) return emptySnapshots();
  const byId = new Map<string, Snapshot>();
  for (const x of v.items) {
    const s = parseSnapshot(x, limits);
    if (s && !byId.has(s.id)) byId.set(s.id, s);
  }
  return { v: 1, items: [...byId.values()].sort((a, b) => (a.saved < b.saved ? 1 : a.saved > b.saved ? -1 : 0)).slice(0, limits.snapshots) };
}

/** What a calculator hands over when the reader saves its result. */
export interface SnapshotInput {
  calc: string;
  name: string;
  url: string;
  /** The calculator's own page, used when the address with the figures cannot be kept. */
  page: string;
  headline: { label: string; value: string; note?: string };
  inputs: ReadonlyArray<{ label: string; value: string }>;
  mine: boolean;
}

const sameResult = (a: Snapshot, b: Snapshot) => a.calc === b.calc && a.url === b.url && a.headline.value === b.headline.value && JSON.stringify(a.inputs) === JSON.stringify(b.inputs);

/**
 * Keep a result. The same result saved again (same calculator, figures and
 * answer) is not kept twice: it moves to the top with the new date. Null
 * when the result is not one the workspace can keep.
 */
export function addSnapshot(list: Snapshots, input: SnapshotInput, now: Date, rand: number = Math.random(), limits: WsLimits = WS_LIMITS): { list: Snapshots; snapshot: Snapshot } | null {
  const url = safePath(input.url) ?? safePath(input.page);
  const snap = parseSnapshot({ ...input, url, id: newId('s', now, rand), saved: now.toISOString() }, limits);
  if (!snap) return null;
  const twin = list.items.find((x) => sameResult(x, snap));
  const kept = twin ? { ...twin, saved: snap.saved, mine: snap.mine } : snap;
  return { list: { v: 1, items: [kept, ...list.items.filter((x) => x.id !== kept.id)].slice(0, limits.snapshots) }, snapshot: kept };
}

export function removeSnapshot(list: Snapshots, id: string): Snapshots {
  return { v: 1, items: list.items.filter((x) => x.id !== id) };
}

/** Both lists, one result per id. Importing the same file twice changes nothing. */
export function mergeSnapshots(base: Snapshots, extra: Snapshots, limits: WsLimits = WS_LIMITS): Snapshots {
  const byId = new Map(base.items.map((x) => [x.id, x]));
  for (const x of extra.items) if (!byId.has(x.id)) byId.set(x.id, x);
  return parseSnapshots({ v: 1, items: [...byId.values()] }, limits);
}

/* ---------- Saved analyses ---------- */

/** A piece of work a tool keeps, or a result saved from the Financial Laboratory, as the workspace lists it. */
export interface Analysis {
  /** Unique on the page: the work's main item, or "snapshot:<id>". */
  id: string;
  /** The stored items that hold it, exported exactly as they are. */
  keys: string[];
  /** A Financial Laboratory result's id. */
  snapshot?: string;
  room: string;
  title: string;
  href: string;
  line: string;
  when: string | null;
}

export interface WorkspaceConfig extends DashConfig {
  /** The Boardroom's seats, by id, as a sentence names them ("finance director"). */
  seats: Record<string, string>;
  /** Room names in the order the workspace lists their analyses; any other room follows. */
  roomOrder: string[];
  /** The Financial Laboratory's name, and the Boardroom's, as the rooms are named. */
  labName: string;
  boardroomName: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** A Boardroom simulation as an analysis: how far the reader got, in which seat, and the memo. Null when nothing is kept. */
export function boardroomAnalysis(sim: WorkspaceConfig['simulations'][number], raw: unknown, seats: Record<string, string>, room: string): Analysis | null {
  const v = asObject(raw);
  if (!v) return null;
  const picks = Array.isArray(v.picks) ? Math.min(sim.rounds, v.picks.filter((p) => typeof p === 'string' && p).length) : 0;
  const seat = typeof v.role === 'string' ? seats[v.role] : undefined;
  if (!picks && !seat) return null;
  const memo = asObject(v.memo);
  const written = memo ? Object.values(memo).filter((x) => typeof x === 'string' && x.trim()).length : 0;
  const parts = [picks >= sim.rounds ? 'Every round decided' : `${picks} of ${sim.rounds} rounds decided`];
  if (seat) parts[0] += `, as the ${seat}`;
  if (written) parts.push(`${plural(written, 'part', 'parts')} of the board memo written`);
  return { id: `bb:boardroom:${sim.id}`, keys: [`bb:boardroom:${sim.id}`], room, title: sim.title, href: sim.url, line: parts.join('; '), when: null };
}

export function snapshotAnalysis(s: Snapshot, room: string): Analysis {
  return {
    id: `snapshot:${s.id}`,
    keys: [],
    snapshot: s.id,
    room,
    title: s.name,
    href: s.url,
    line: `${s.headline.label}: ${s.headline.value}${s.mine ? '' : ' (the example figures)'}`,
    when: s.saved,
  };
}

const fromWork = (w: WorkItem): Analysis => ({ id: w.key, keys: w.keys, room: w.where || 'Tools', title: w.title, href: w.href, line: w.detail, when: w.when });

/** The analyses grouped by room: the rooms in `roomOrder` first, in that order, then the rest as they first appear. */
export function groupAnalyses(list: readonly Analysis[], roomOrder: readonly string[]): Array<{ room: string; items: Analysis[] }> {
  const groups: Array<{ room: string; items: Analysis[] }> = [];
  for (const a of list) {
    const g = groups.find((x) => x.room === a.room);
    if (g) g.items.push(a);
    else groups.push({ room: a.room, items: [a] });
  }
  const rank = (room: string) => {
    const i = roomOrder.indexOf(room);
    return i < 0 ? roomOrder.length : i;
  };
  return groups.map((g, i) => ({ g, i })).sort((a, b) => rank(a.g.room) - rank(b.g.room) || a.i - b.i).map((x) => x.g);
}

/* ---------- The whole workspace ---------- */

export interface WorkspaceView extends DashboardView {
  listState: ListState;
  list: ListItem[];
  listCounts: Record<Status, number>;
  notebook: Notebook;
  snapshots: Snapshots;
  analyses: Analysis[];
  analysisGroups: Array<{ room: string; items: Analysis[] }>;
}

/** Everything the workspace shows, from the stored items and the build's configuration. */
export function workspaceView(items: Readonly<Record<string, string>>, cfg: WorkspaceConfig): WorkspaceView {
  const dash = dashboardView(items, cfg);
  const listState = parseList(items[LIST_KEY]);
  const list = listView(dash.saved, listState);
  const notebook = parseNotebook(items[NOTES_KEY]);
  const snapshots = parseSnapshots(items[SNAPSHOTS_KEY]);
  const analyses: Analysis[] = [
    ...snapshots.items.map((s) => snapshotAnalysis(s, cfg.labName)),
    ...dash.work.map(fromWork),
    ...cfg.simulations.map((sim) => boardroomAnalysis(sim, items[`bb:boardroom:${sim.id}`], cfg.seats, cfg.boardroomName)).filter((a): a is Analysis => a !== null),
  ];
  return {
    ...dash,
    any: dash.any || notebook.notes.length > 0 || snapshots.items.length > 0,
    listState,
    list,
    listCounts: listCounts(list),
    notebook,
    snapshots,
    analyses,
    analysisGroups: groupAnalyses(analyses, cfg.roomOrder),
  };
}

/* ---------- Exporting a selection ---------- */

export interface Selection {
  /** Items of the learning list, by address. */
  list: readonly string[];
  /** Notes, by id. */
  notes: readonly string[];
  /** Analyses, by their id in the view. */
  analyses: readonly string[];
}

export const SELECTION_NOTE =
  'A selection of your work from The Business Brief, exported from My Business Workspace in one browser. Import it with "Import a copy" in the workspace of another browser, where it is combined with what is there. It was not sent anywhere; keep it private, since it holds your notes.';

export interface SelectionFile extends ExportFile {
  selection: { list: number; notes: number; analyses: number };
}

/**
 * The selection as a file the workspace can import: the whole-record export's
 * format, holding only the chosen work. Learning list items take their saved
 * entry and their arrangement, notes and Financial Laboratory results their
 * own entries, and every other analysis its items exactly as stored.
 */
export function selectionExport(items: Readonly<Record<string, string>>, view: Pick<WorkspaceView, 'list' | 'listState' | 'notebook' | 'snapshots' | 'analyses'>, sel: Selection, now: Date): SelectionFile {
  const entries: Array<[string, string]> = [];
  const listUrls = view.list.filter((x) => sel.list.includes(x.url));
  if (listUrls.length) {
    const saved: SavedList = { v: 1, items: listUrls.map(({ url, title, kind, saved: at }) => ({ url, title, kind, saved: at })) };
    const order = listUrls.map((x) => x.url);
    const arranged: ListState = { v: 1, order, entries: Object.fromEntries(order.flatMap((u) => (view.listState.entries[u] ? [[u, view.listState.entries[u]!]] : []))) };
    entries.push([SAVED_KEY, JSON.stringify(saved)], [LIST_KEY, JSON.stringify(arranged)]);
  }
  const notes = view.notebook.notes.filter((n) => sel.notes.includes(n.id));
  if (notes.length) entries.push([NOTES_KEY, JSON.stringify({ v: 1, notes })]);
  const chosen = view.analyses.filter((a) => sel.analyses.includes(a.id));
  const snaps = view.snapshots.items.filter((s) => chosen.some((a) => a.snapshot === s.id));
  if (snaps.length) entries.push([SNAPSHOTS_KEY, JSON.stringify({ v: 1, items: snaps })]);
  for (const a of chosen) for (const k of a.keys) if (items[k] !== undefined && !entries.some(([x]) => x === k)) entries.push([k, items[k]!]);
  return { ...buildExport(entries, now), note: SELECTION_NOTE, selection: { list: listUrls.length, notes: notes.length, analyses: chosen.length } };
}

/** Text for Markdown: characters that would start formatting, a link or HTML are escaped, so the text reads as written. */
export function mdInline(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/[\\`*_[\]<>|#]/g, (c) => `\\${c}`);
}

/** Several lines of the reader's own text for Markdown: line breaks kept, HTML and a heading or rule at the start of a line escaped. */
export function mdBlock(s: string): string {
  return s
    .split('\n')
    .map((line) => line.replace(/[\\<>`]/g, (c) => `\\${c}`).replace(/^(\s*)(#{1,6}\s|[-*_]{3,}\s*$|=+\s*$)/, '$1\\$2'))
    .join('  \n')
    .replace(/( {2}\n){2,}/g, '\n\n');
}

const longDay = (iso: string) => {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
};

const fullUrl = (origin: string, url: string) => (origin ? `${origin.replace(/\/+$/, '')}${url}` : url);
const link = (origin: string, url: string) => `<${fullUrl(origin, url)}>`;

/**
 * The selection as a Markdown document, to read and print: the learning list
 * with each item's status and note, every chosen note under its headings, and
 * the analyses by room, a Financial Laboratory result with its figures.
 * `origin` makes the links absolute (the site's address); empty keeps them
 * as paths.
 */
export function selectionMarkdown(view: Pick<WorkspaceView, 'list' | 'notebook' | 'snapshots' | 'analyses'>, sel: Selection, now: Date, origin: string, roomOrder: readonly string[] = []): string {
  const out: string[] = ['# My Business Workspace', '', `A selection of your work from The Business Brief, exported on ${longDay(now.toISOString())}. It was made in your browser and sent nowhere.`, ''];
  const list = view.list.filter((x) => sel.list.includes(x.url));
  if (list.length) {
    out.push('## Learning list', '');
    list.forEach((x, i) => {
      out.push(`${i + 1}. **${mdInline(x.title)}** (${SAVED_KIND_LABELS[x.kind]}): ${STATUS_LABELS[x.status]}  `);
      out.push(`   ${link(origin, x.url)}${x.note ? '  ' : ''}`);
      if (x.note) out.push(`   Note: ${mdInline(x.note)}`);
    });
    out.push('');
  }
  const notes = view.notebook.notes.filter((n) => sel.notes.includes(n.id));
  if (notes.length) {
    out.push('## Notes', '');
    for (const n of notes) {
      out.push(`### ${mdInline(n.title)}`, '');
      const on = n.page ? `, on [${mdInline(n.page.title)}](${fullUrl(origin, n.page.url)})` : '';
      out.push(`*${NOTE_KIND_LABELS[n.kind]}${on}. Last changed ${longDay(n.updated)}.*`, '');
      if (n.kind === 'case') {
        for (const f of NOTE_FIELDS) {
          if (!n.fields[f].trim()) continue;
          out.push(`#### ${NOTE_FIELD_LABELS[f]}`, '', mdBlock(n.fields[f]), '');
        }
      } else out.push(mdBlock(n.body), '');
    }
  }
  const analyses = view.analyses.filter((a) => sel.analyses.includes(a.id));
  if (analyses.length) {
    out.push('## Saved analyses', '');
    for (const g of groupAnalyses(analyses, roomOrder)) {
      out.push(`### ${mdInline(g.room)}`, '');
      for (const a of g.items) {
        const snap = a.snapshot ? view.snapshots.items.find((s) => s.id === a.snapshot) : undefined;
        if (snap) {
          out.push(`#### ${mdInline(snap.name)}`, '');
          out.push(`**${mdInline(snap.headline.label)}: ${mdInline(snap.headline.value)}**${snap.headline.note ? ` (${mdInline(snap.headline.note)})` : ''}  `);
          out.push(`${snap.mine ? 'Your own figures' : 'The example figures'}, saved ${longDay(snap.saved)}.`, '');
          if (snap.inputs.length) {
            out.push('| Figure | Value |', '| --- | --- |');
            for (const r of snap.inputs) out.push(`| ${mdInline(r.label)} | ${mdInline(r.value)} |`);
            out.push('');
          }
          out.push(`Open the calculator: ${link(origin, snap.url)}`, '');
        } else {
          out.push(`- **${mdInline(a.title)}**: ${mdInline(a.line)}${a.when ? ` Saved ${longDay(a.when)}.` : ''}  `, `  ${link(origin, a.href)}`);
        }
      }
      if (out[out.length - 1] !== '') out.push('');
    }
  }
  if (!list.length && !notes.length && !analyses.length) out.push('Nothing was chosen.', '');
  return `${out.join('\n').trimEnd()}\n`;
}

/** How many of each are chosen, in words: "2 items, 1 note and 3 analyses". */
export function selectionWords(sel: Selection): string {
  const parts = [
    sel.list.length ? plural(sel.list.length, 'item', 'items') : '',
    sel.notes.length ? plural(sel.notes.length, 'note', 'notes') : '',
    sel.analyses.length ? plural(sel.analyses.length, 'analysis', 'analyses') : '',
  ].filter(Boolean);
  if (!parts.length) return 'nothing';
  return parts.length === 1 ? parts[0]! : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/* ---------- Importing ---------- */

/**
 * Check a file before anything is written: the learner record's checks
 * (src/lib/learner.ts), with the workspace's own items cleaned through their
 * parsers, so a hand-edited note or arrangement cannot carry anything the
 * workspace would not write itself.
 */
export function checkImport(text: string): ImportCheck {
  const r = validateImport(text);
  if (!r.ok) return r;
  return {
    ...r,
    items: r.items.map(({ key, value }) => {
      if (key === LIST_KEY) return { key, value: JSON.stringify(parseList(value)) };
      if (key === NOTES_KEY) return { key, value: JSON.stringify(parseNotebook(value)) };
      if (key === SNAPSHOTS_KEY) return { key, value: JSON.stringify(parseSnapshots(value)) };
      return { key, value };
    }),
  };
}

/**
 * What importing will write: the learner record's plan, with the learning
 * list, the notebook and the Financial Laboratory results combined with what
 * this browser holds rather than replaced.
 */
export function planWorkspaceImport(current: Readonly<Record<string, string | null | undefined>>, items: ReadonlyArray<{ key: string; value: string }>): ImportWrite[] {
  return planImport(current, items).map((w) => {
    const had = current[w.key];
    if (had === null || had === undefined) return w;
    const merge: Record<string, () => unknown> = {
      [LIST_KEY]: () => mergeLists(parseList(had), parseList(w.value)),
      [NOTES_KEY]: () => mergeNotebooks(parseNotebook(had), parseNotebook(w.value)),
      [SNAPSHOTS_KEY]: () => mergeSnapshots(parseSnapshots(had), parseSnapshots(w.value)),
    };
    const combine = merge[w.key];
    if (!combine) return w;
    const next = JSON.stringify(combine());
    return { key: w.key, value: next, effect: had === next ? 'same' : 'replace' };
  });
}
