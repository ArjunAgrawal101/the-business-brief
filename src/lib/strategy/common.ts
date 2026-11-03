/**
 * Shared pieces for the Strategy Studio tools: the stages of an engagement,
 * defensive readers for saved work (local storage and imported files are
 * never trusted), identifiers for new rows, CSV and plain-text export, and a
 * deep comparison used by the integrity checks. Pure functions only: the same
 * code runs at build time and in the browser.
 */

export const STAGES = {
  diagnose: { no: 1, title: 'Diagnose', question: 'Where does the business stand?' },
  options: { no: 2, title: 'Generate options', question: 'Where could it go?' },
  decide: { no: 3, title: 'Decide', question: 'Which option, on what evidence?' },
  plan: { no: 4, title: 'Plan', question: 'How will the change be made to work?' },
} as const;

export type Stage = keyof typeof STAGES;
export const STAGE_IDS = Object.keys(STAGES) as Stage[];

/** A note about the reader's work: an error stops a result, a warning asks a question, info explains. */
export interface Check {
  level: 'error' | 'warning' | 'info';
  text: string;
}

/* ---------- Defensive readers ---------- */

/** A string, trimmed to a maximum length; anything else becomes the fallback. */
export function str(v: unknown, max = 240, fallback = ''): string {
  return typeof v === 'string' ? v.slice(0, max) : fallback;
}

/** A finite number within limits, or the fallback. */
export function num(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** A whole number within limits, or the fallback. */
export function int(v: unknown, min: number, max: number, fallback: number): number {
  return Math.round(num(v, min, max, fallback));
}

/** A number the reader may have left blank: null stays null, so the tool can say what is missing. */
export function numOrNull(v: unknown, min = -1e9, max = 1e9): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

export function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export function list(v: unknown, max: number): unknown[] {
  return Array.isArray(v) ? v.slice(0, max) : [];
}

export function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

const ID = /^[a-z][a-z0-9-]{0,23}$/;

/** A row id that is valid and not yet used, or a new one. */
export function ident(v: unknown, used: Set<string>, prefix: string): string {
  const id = typeof v === 'string' && ID.test(v) && !used.has(v) ? v : nextId(prefix, [...used]);
  used.add(id);
  return id;
}

/** The next free id with a prefix: s1, s2, ... */
export function nextId(prefix: string, existing: Iterable<string>): string {
  const taken = new Set(existing);
  let n = 1;
  while (taken.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

/* ---------- Export ---------- */

/** One CSV cell: quoted when needed, and protected against spreadsheet formulas. */
function cell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'number' ? (Number.isFinite(v) ? String(v) : '') : v;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Rows as CSV, with Windows line endings so that spreadsheets open it cleanly. */
export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  return rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

/** A heading and its lines, for plain-text summaries. */
export function textSection(title: string, lines: string[]): string {
  const body = lines.filter((l) => l.trim() !== '');
  return body.length ? `${title.toUpperCase()}\n${body.join('\n')}` : '';
}

/** Sections joined into one plain-text document. */
export function textDoc(title: string, sections: string[]): string {
  return [title, '='.repeat(Math.min(72, title.length)), ...sections.filter(Boolean)].join('\n\n') + '\n';
}

/** A safe file name stem: "Northvale Cycles" becomes "northvale-cycles". */
export function fileSlug(s: string, fallback = 'analysis'): string {
  const out = s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return out || fallback;
}

/** "a, b and c". */
export function andList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Text for an empty field, so that summaries never print a blank. */
export function orDash(s: string, empty = '(not given)'): string {
  return s.trim() ? s.trim() : empty;
}

/** Structural equality of plain data, for checking that saved work round-trips. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  const ka = Object.keys(a as object).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  const kb = Object.keys(b as object).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  return ka.length === kb.length && ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

/** The first difference between two plain values, as a path, for a helpful build error. */
export function firstDifference(a: unknown, b: unknown, path = ''): string | null {
  if (deepEqual(a, b)) return null;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
    for (const k of keys) {
      const d = firstDifference((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], path ? `${path}.${k}` : k);
      if (d) return d;
    }
  }
  return path || '(root)';
}

const SMALL = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** A count in words up to ten, as the platform writes small numbers in sentences: "three factors". */
export function count(n: number, capital = false): string {
  const w = Number.isInteger(n) && n >= 0 && n <= 10 ? (SMALL[n] ?? String(n)) : String(n);
  return capital ? w.charAt(0).toUpperCase() + w.slice(1) : w;
}

/** "a" or "an" before a word. */
export function article(word: string): string {
  return /^[aeiou]/i.test(word.trim()) ? 'an' : 'a';
}
