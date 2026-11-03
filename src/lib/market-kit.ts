/**
 * Shared helpers for the Market Studio instruments: reading saved or imported
 * state safely, writing CSV, and small formatting pieces the tools share.
 * Pure functions, used by the server render, the browser scripts and the
 * unit tests alike.
 *
 * Saved work comes back from the reader's own browser, or from a file they
 * import, so nothing in it can be trusted: every normalizer below accepts
 * `unknown` and returns a value of the right type, clamped to a sensible
 * range, or the fallback.
 */

/** A string, trimmed of control characters and cut to a maximum length. */
export function asStr(v: unknown, fallback = '', max = 600): string {
  if (typeof v !== 'string') return fallback;
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max);
}

/** A finite number clamped to [min, max], or the fallback. */
export function asNum(v: unknown, fallback: number, min = -Infinity, max = Infinity): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** A whole number clamped to [min, max], or the fallback. */
export function asInt(v: unknown, fallback: number, min = -Infinity, max = Infinity): number {
  return Math.round(asNum(v, fallback, min, max));
}

export function asBool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

/** One of a fixed list of values, or the fallback. */
export function asOneOf<T extends string>(v: unknown, options: readonly T[], fallback: T): T {
  return typeof v === 'string' && (options as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** A list, each item mapped (items that map to null are dropped), at most `max` long. */
export function asList<T>(v: unknown, map: (item: unknown, i: number) => T | null, max = 40): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (let i = 0; i < v.length && out.length < max; i += 1) {
    const m = map(v[i], i);
    if (m !== null) out.push(m);
  }
  return out;
}

/** A list of strings, blank lines dropped. */
export function asLines(v: unknown, max = 12, maxLen = 300): string[] {
  return asList(v, (x) => {
    const s = asStr(x, '', maxLen).trim();
    return s ? s : null;
  }, max);
}

/** A plain object, or null. */
export function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Ids for rows the reader adds: the prefix and the first number not yet used. */
export function nextId(prefix: string, existing: string[]): string {
  let n = existing.length + 1;
  while (existing.includes(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

/** An id safe to use in element ids and data attributes. */
export function safeId(v: unknown, fallback: string): string {
  const s = asStr(v, '', 40).replace(/[^a-zA-Z0-9_-]/g, '');
  return s || fallback;
}

/** Make the ids in a list unique, keeping the first of any repeated id. */
export function uniqueIds<T extends { id: string }>(items: T[], prefix: string): T[] {
  const seen: string[] = [];
  return items.map((it) => {
    const id = it.id && !seen.includes(it.id) ? it.id : nextId(prefix, seen);
    seen.push(id);
    return { ...it, id };
  });
}

/**
 * CSV in the common form (RFC 4180): fields quoted when they hold a comma,
 * quote or line break, quotes doubled. Text that a spreadsheet would read as
 * a formula (starting with =, +, - or @) is prefixed with an apostrophe.
 */
export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  const cell = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
    let s = v;
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(',')).join('\r\n');
}

/** The envelope a tool's JSON export uses, so an import can check it is the right tool. */
export interface ToolFile<S> {
  tool: string;
  version: 1;
  exported: string;
  state: S;
}

export function toolFile<S>(tool: string, state: S, when: Date): ToolFile<S> {
  return { tool, version: 1, exported: when.toISOString(), state };
}

/** The state inside an exported file, or the object itself when it is a bare state; null when the file is for another tool. */
export function stateFromFile(raw: unknown, tool: string): unknown {
  const o = asObj(raw);
  if (!o) return null;
  if ('tool' in o && 'state' in o) return o.tool === tool ? o.state : null;
  return o;
}

/** "1 segment", "3 segments". */
export function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** A list in words: "a", "a and b", "a, b and c". */
export function listWords(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** The level of a check, from most to least serious. */
export type CheckLevel = 'conflict' | 'tension' | 'note' | 'fit';
export interface Check {
  level: CheckLevel;
  text: string;
  /** What the check is about, for grouping (an element, a question number, a segment). */
  about?: string;
}

export const CHECK_WORDS: Record<CheckLevel, string> = { conflict: 'Problem', tension: 'Check', note: 'Note', fit: 'Consistent' };

export function countChecks(checks: Check[]): Record<CheckLevel, number> {
  const out: Record<CheckLevel, number> = { conflict: 0, tension: 0, note: 0, fit: 0 };
  checks.forEach((c) => (out[c.level] += 1));
  return out;
}
