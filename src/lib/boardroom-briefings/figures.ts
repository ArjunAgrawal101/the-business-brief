/**
 * The figures of the Boardroom Briefings, recomputed.
 *
 * Every briefing states its figures in exhibit tables and quotes them in its
 * text. This module checks both, so a number cannot drift from the evidence
 * it claims to come from:
 *
 * - an exhibit's checks work a row from other rows, or a column from other
 *   columns, and compare the result with the cell as printed, at the decimals
 *   the column shows;
 * - a briefing's own figures (a payback, a runway, a market share) are worked
 *   from the exhibits by their formulas, or declared as stated inputs;
 * - the weighted scores of the options are worked from the criteria's weights;
 * - every figure written in the briefing's text must be one of these: a cell,
 *   a figure or a score, at the precision shown (`unaccounted`).
 *
 * Formulas are small arithmetic: numbers, + − × ÷ written + - * /, brackets,
 * references in braces and a few functions. In an exhibit's row check
 * `{Revenue}` is the Revenue row in the same column; in a column check
 * `{Revenue}` is the Revenue column in the same row. Anywhere, `{ex-2|Revenue|2026}`
 * is a cell of exhibit ex-2 and `{@runway}` is one of the briefing's figures.
 * The functions are sum, min, max, abs, round(x, d), df(rate, year) (the
 * guide's discount factor), npv(rate, c0, c1, ...), payback(c0, c1, ...) and
 * arr(c0, c1, ...), where c0 is the year 0 flow (the capital cost, negative)
 * and the rest are each year's net cash flow; npv uses the guide's printed
 * factors through src/lib/investment.ts.
 *
 * Pure: no Astro, no DOM. Used by ./integrity.ts and the unit tests.
 */
import { arr, discountFactor, isRate, npv, payback, type Project } from '../investment';
import type { BoardroomBriefing, BriefingExhibit, BriefingFigure, ExhibitCheck } from './schema';

/* ------------------------------------------------------------------ */
/* Rounding and precision                                              */
/* ------------------------------------------------------------------ */

/** Round half away from zero to `d` decimals, after removing binary noise (2.675 is 2.68, not 2.67). */
export function roundTo(x: number, d: number): number {
  const f = 10 ** d;
  const scaled = Number((Math.abs(x) * f).toFixed(6));
  return (Math.sign(x) * Math.round(scaled)) / f;
}

/** Decimals in a number as written: 4.5 has 1, 420 has 0. */
export function decimalsOf(n: number): number {
  const s = String(n);
  if (/e/i.test(s)) return 0;
  const dot = s.indexOf('.');
  return dot < 0 ? 0 : s.length - dot - 1;
}

/** Decimals a cell is printed to, from its column's format (src/lib/cells.ts). */
export function cellDecimals(value: number, format: string | undefined): number {
  if (format === 'd1') return 1;
  if (format === 'd2') return 2;
  if (format === 'money') return Number.isInteger(value) ? 0 : 2;
  return decimalsOf(value);
}

/** True when `computed`, rounded as the stated figure is, gives the stated figure. */
export function sameAt(stated: number, computed: number, decimals: number): boolean {
  return Number.isFinite(computed) && Math.abs(roundTo(computed, decimals) - roundTo(stated, decimals)) < 10 ** -(decimals + 6);
}

/* ------------------------------------------------------------------ */
/* Formulas                                                            */
/* ------------------------------------------------------------------ */

type Token = { t: 'num'; v: number } | { t: 'ref'; v: string } | { t: 'name'; v: string } | { t: 'op'; v: string };

function tokenize(expr: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i] as string;
    if (/\s/.test(ch)) {
      i++;
    } else if (/[0-9.]/.test(ch)) {
      const m = /^\d*\.?\d+/.exec(expr.slice(i));
      if (!m) throw new Error(`a number is malformed at "${expr.slice(i, i + 8)}"`);
      out.push({ t: 'num', v: Number(m[0]) });
      i += m[0].length;
    } else if (ch === '{') {
      const end = expr.indexOf('}', i);
      if (end < 0) throw new Error('a reference is not closed with "}"');
      out.push({ t: 'ref', v: expr.slice(i + 1, end).trim() });
      i = end + 1;
    } else if (/[a-z]/i.test(ch)) {
      const m = /^[a-z]+/i.exec(expr.slice(i)) as RegExpExecArray;
      out.push({ t: 'name', v: m[0].toLowerCase() });
      i += m[0].length;
    } else if ('+-*/(),'.includes(ch)) {
      out.push({ t: 'op', v: ch });
      i++;
    } else if (ch === '−' || ch === '×' || ch === '÷') {
      out.push({ t: 'op', v: ch === '−' ? '-' : ch === '×' ? '*' : '/' });
      i++;
    } else {
      throw new Error(`unexpected character "${ch}"`);
    }
  }
  return out;
}

const projectOf = (flows: number[]): Project => {
  const [c0, ...returns] = flows;
  if (c0 === undefined || c0 >= 0) throw new Error('the first cash flow must be the capital cost, written as a negative number');
  return { id: 'x', label: 'x', capitalCost: -c0, returns };
};

const FUNCTIONS: Record<string, (args: number[]) => number> = {
  sum: (a) => a.reduce((s, x) => s + x, 0),
  min: (a) => Math.min(...a),
  max: (a) => Math.max(...a),
  abs: (a) => Math.abs(a[0] ?? NaN),
  round: (a) => roundTo(a[0] ?? NaN, a[1] ?? 0),
  df: ([rate, year]) => {
    if (rate === undefined || !isRate(rate)) throw new Error(`df needs one of the guide's rates (4, 6, 8, 10, 20), not ${rate}`);
    return discountFactor(rate, year ?? NaN);
  },
  npv: ([rate, ...flows]) => {
    if (rate === undefined || !isRate(rate)) throw new Error(`npv needs one of the guide's rates (4, 6, 8, 10, 20), not ${rate}`);
    const v = npv(projectOf(flows), rate);
    if (v === null) throw new Error('npv covers one to ten years of returns');
    return v;
  },
  payback: (flows) => {
    const pb = payback(projectOf(flows));
    if (!pb) throw new Error('the capital cost is not recovered within the years given');
    return pb.total;
  },
  arr: (flows) => {
    const v = arr(projectOf(flows));
    if (v === null) throw new Error('arr needs a capital cost and at least one year of returns');
    return v;
  },
};

/** Work out a formula. `lookup` turns a reference (the text between braces) into a number, or throws. */
export function evaluate(expr: string, lookup: (ref: string) => number): number {
  const tokens = tokenize(expr);
  let pos = 0;
  const peek = () => tokens[pos];
  const take = () => tokens[pos++];
  const expectOp = (v: string) => {
    const t = take();
    if (!t || t.t !== 'op' || t.v !== v) throw new Error(`expected "${v}" in "${expr}"`);
  };

  function primary(): number {
    const t = take();
    if (!t) throw new Error(`"${expr}" ends too soon`);
    if (t.t === 'num') return t.v;
    if (t.t === 'ref') return lookup(t.v);
    if (t.t === 'op' && t.v === '(') {
      const v = sum();
      expectOp(')');
      return v;
    }
    if (t.t === 'op' && t.v === '-') return -primary();
    if (t.t === 'name') {
      const fn = FUNCTIONS[t.v];
      if (!fn) throw new Error(`unknown function "${t.v}"`);
      expectOp('(');
      const args: number[] = [];
      if (!(peek()?.t === 'op' && peek()?.v === ')')) {
        args.push(sum());
        while (peek()?.t === 'op' && peek()?.v === ',') {
          take();
          args.push(sum());
        }
      }
      expectOp(')');
      return fn(args);
    }
    throw new Error(`unexpected "${t.v}" in "${expr}"`);
  }
  function product(): number {
    let v = primary();
    while (peek()?.t === 'op' && (peek()?.v === '*' || peek()?.v === '/')) {
      const op = take()?.v;
      const r = primary();
      v = op === '*' ? v * r : v / r;
    }
    return v;
  }
  function sum(): number {
    let v = product();
    while (peek()?.t === 'op' && (peek()?.v === '+' || peek()?.v === '-')) {
      const op = take()?.v;
      const r = product();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }

  const value = sum();
  if (pos !== tokens.length) throw new Error(`"${expr}" has more after the end of the formula`);
  if (!Number.isFinite(value)) throw new Error(`"${expr}" does not give a finite number`);
  return value;
}

/* ------------------------------------------------------------------ */
/* The briefing's figures: cells, figures and cross references          */
/* ------------------------------------------------------------------ */

export function allExhibits(b: BoardroomBriefing): BriefingExhibit[] {
  return [...b.exhibits, ...b.analysis.exhibits];
}

const rowIndex = (e: BriefingExhibit, label: string) => (e.rows ?? []).findIndex((r) => String(r[0]) === label);
const colIndex = (e: BriefingExhibit, label: string) => (e.columns ?? []).findIndex((c) => c.label === label);

/** A cell of an exhibit by row and column label, as a number, or an error message. */
export function cellOf(e: BriefingExhibit, row: string, column: string): number | string {
  const r = rowIndex(e, row);
  if (r < 0) return `exhibit ${e.id} has no row "${row}"`;
  const k = colIndex(e, column);
  if (k < 0) return `exhibit ${e.id} has no column "${column}"`;
  const v = e.rows?.[r]?.[k];
  return typeof v === 'number' ? v : `exhibit ${e.id}, row "${row}", column "${column}" is not a number`;
}

/** Where a formula is being worked: in a column check, the row's label; in a row check, the column's. */
export interface Here {
  row?: string;
  column?: string;
}

/**
 * Resolves the references every formula may use: a cell anywhere
 * ({ex|row|col}) and a figure ({@id}). In a cell reference, `*` stands for the
 * row (or column) being checked, so one column check can read the same row of
 * another exhibit: {ex-4|*|Year 1}.
 */
export type GlobalLookup = (ref: string, here?: Here) => number | undefined;

export function globalLookup(b: BoardroomBriefing, figureValues: Map<string, number>): GlobalLookup {
  const exhibits = new Map(allExhibits(b).map((e) => [e.id, e]));
  return (ref, here = {}) => {
    if (ref.startsWith('@')) {
      const v = figureValues.get(ref.slice(1));
      if (v === undefined) throw new Error(`figure "${ref.slice(1)}" is not declared above this point`);
      return v;
    }
    const parts = ref.split('|').map((p) => p.trim());
    if (parts.length !== 3) return undefined;
    const [ex, rawRow, rawCol] = parts as [string, string, string];
    const row = rawRow === '*' ? here.row : rawRow;
    const col = rawCol === '*' ? here.column : rawCol;
    if (row === undefined || col === undefined) throw new Error(`"{${ref}}": "*" stands for the row or column being checked, so it can be used only in an exhibit's checks`);
    const e = exhibits.get(ex);
    if (!e) throw new Error(`exhibit "${ex}" is not in the briefing`);
    const v = cellOf(e, row, col);
    if (typeof v === 'string') throw new Error(v);
    return v;
  };
}

/** Works out each declared figure in order, so a figure may use the ones before it. Returns the values and any problems. */
export function workFigures(b: BoardroomBriefing): { values: Map<string, number>; problems: string[] } {
  const values = new Map<string, number>();
  const problems: string[] = [];
  const lookup = globalLookup(b, values);
  const seen = new Set<string>();
  for (const f of b.figures) {
    if (seen.has(f.id)) problems.push(`figure "${f.id}" is declared twice`);
    seen.add(f.id);
    if (f.is) {
      try {
        const v = evaluate(f.is, (ref) => {
          const x = lookup(ref);
          if (x === undefined) throw new Error(`"{${ref}}" is not a reference a figure can use: name a cell as {exhibit|row|column} or a figure as {@id}`);
          return x;
        });
        const d = f.decimals ?? decimalsOf(f.value);
        if (!sameAt(f.value, v, d)) problems.push(`figure "${f.id}" (${f.label}) is stated as ${f.value} but works out at ${roundTo(v, Math.max(d, 4))}`);
      } catch (err) {
        problems.push(`figure "${f.id}": ${(err as Error).message}`);
      }
    }
    values.set(f.id, f.value);
  }
  return { values, problems };
}

/** Applies one exhibit's checks and its footer sum. Each problem names the cell. */
export function checkExhibitFigures(e: BriefingExhibit, global: GlobalLookup): string[] {
  const problems: string[] = [];
  const cols = e.columns ?? [];
  const rows = e.rows ?? [];
  const at = `exhibit ${e.id}`;
  for (const r of rows) {
    if (r.length !== cols.length) problems.push(`${at}, row "${String(r[0])}": ${r.length} cells for ${cols.length} columns`);
  }
  const numericCols = cols.map((c, k) => ({ c, k })).filter(({ c, k }) => k > 0 && c.numeric);

  const run = (check: ExhibitCheck) => {
    if ('row' in check) {
      const target = rowIndex(e, check.row);
      if (target < 0) return problems.push(`${at}: the check names row "${check.row}", which is not in the table`);
      const targets = check.columns ? check.columns.map((label) => ({ k: colIndex(e, label), label })) : numericCols.map(({ c, k }) => ({ k, label: c.label }));
      for (const { k, label } of targets) {
        if (k < 0) {
          problems.push(`${at}: the check of row "${check.row}" names column "${label}", which is not in the table`);
          continue;
        }
        const stated = rows[target]?.[k];
        if (typeof stated !== 'number') {
          problems.push(`${at}, row "${check.row}", column "${label}": not a number, so it cannot be checked`);
          continue;
        }
        try {
          const v = evaluate(check.is, (ref) => {
            const g = global(ref, { column: label });
            if (g !== undefined) return g;
            const ri = rowIndex(e, ref);
            if (ri < 0) throw new Error(`no row "${ref}"`);
            const cell = rows[ri]?.[k];
            if (typeof cell !== 'number') throw new Error(`row "${ref}", column "${label}" is not a number`);
            return cell;
          });
          const d = cellDecimals(stated, cols[k]?.format);
          if (!sameAt(stated, v, d)) problems.push(`${at}, row "${check.row}", column "${label}": printed ${stated}, but ${check.is} gives ${roundTo(v, Math.max(d, 4))}`);
        } catch (err) {
          problems.push(`${at}, row "${check.row}", column "${label}": ${(err as Error).message}`);
        }
      }
    } else {
      const k = colIndex(e, check.column);
      if (k < 0) return problems.push(`${at}: the check names column "${check.column}", which is not in the table`);
      const targets = check.rows ? check.rows.map((label) => ({ i: rowIndex(e, label), label })) : rows.map((r, i) => ({ i, label: String(r[0]) }));
      for (const { i, label } of targets) {
        if (i < 0) {
          problems.push(`${at}: the check of column "${check.column}" names row "${label}", which is not in the table`);
          continue;
        }
        const stated = rows[i]?.[k];
        if (typeof stated !== 'number') {
          problems.push(`${at}, row "${label}", column "${check.column}": not a number, so it cannot be checked`);
          continue;
        }
        try {
          const v = evaluate(check.is, (ref) => {
            const g = global(ref, { row: label });
            if (g !== undefined) return g;
            const ci = colIndex(e, ref);
            if (ci < 0) throw new Error(`no column "${ref}"`);
            const cell = rows[i]?.[ci];
            if (typeof cell !== 'number') throw new Error(`row "${label}", column "${ref}" is not a number`);
            return cell;
          });
          const d = cellDecimals(stated, cols[k]?.format);
          if (!sameAt(stated, v, d)) problems.push(`${at}, row "${label}", column "${check.column}": printed ${stated}, but ${check.is} gives ${roundTo(v, Math.max(d, 4))}`);
        } catch (err) {
          problems.push(`${at}, row "${label}", column "${check.column}": ${(err as Error).message}`);
        }
      }
    }
    return undefined;
  };
  e.checks.forEach(run);

  if (e.footerIsSum) {
    const footer = e.footer ?? [];
    for (const { c, k } of numericCols) {
      const stated = footer[k];
      const total = rows.reduce((s, r) => s + (typeof r[k] === 'number' ? (r[k] as number) : 0), 0);
      if (typeof stated !== 'number' || !sameAt(stated, total, cellDecimals(stated, c.format))) {
        problems.push(`${at}: the footer of column "${c.label}" is ${String(stated)}, but the column adds up to ${roundTo(total, 4)}`);
      }
    }
  }
  return problems;
}

/** Each option's weighted score: the sum of weight × score, divided by 100 (the weights add up to 100). */
export function weightedScores(b: BoardroomBriefing): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of b.analysis.scores) {
    out.set(
      s.option,
      b.criteria.reduce((t, c) => t + c.weight * (s.scores[c.id] ?? 0), 0) / 100,
    );
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Every figure in the text                                            */
/* ------------------------------------------------------------------ */

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';

/** Text removed before figures are read: references and dates rather than data. */
const NOT_FIGURES = [
  /\bExhibits?\s+[A-Z]?\d+(?:(?:,\s*|\s+and\s+|\s+to\s+)[A-Z]?\d+)*/g,
  /\bpp?\.\s*\d+(?:\s+to\s+\d+)?/g,
  new RegExp(`\\b\\d{1,2}\\s+(?:${MONTHS})\\b`, 'g'),
  new RegExp(`\\b(?:${MONTHS})\\s+\\d{1,2}\\b(?!,\\d)`, 'g'),
  /\bsubtopics?\s+\d\.\d(?:(?:,\s*|\s+and\s+)\d\.\d)*/gi,
  /\bunits?\s+\d\b/gi,
  /\b\d+\s+words\b/g,
  /\]\([^)]*\)/g,
  // The unit a table is in, such as (£000) or (US$000): a label, not a figure.
  /(?:A\$|C\$|US\$|NZ\$|S\$|R\$|MX\$|HK\$|KSh\s?|£|€|₹|₩|¥|\$|R)000\b/g,
];

const CURRENCY = String.raw`(?:A\$|C\$|US\$|NZ\$|S\$|R\$|MX\$|HK\$|KSh\s?|R(?=\d)|£|€|₹|₩|¥|\$)`;
const TOKEN = new RegExp(
  String.raw`(?<![\w.,])(?<neg>[−-])?(?<cur>${CURRENCY})?(?<num>\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(?<suf>\s?(?:bn|m|k|million|billion|thousand)\b)?(?<pct>\s?%| per cent)?`,
  'g',
);
const SUFFIX: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, bn: 1e9, billion: 1e9 };
export const UNIT_SCALE = { one: 1, thousand: 1e3, million: 1e6 } as const;

export interface FigureToken {
  text: string;
  value: number;
  decimals: number;
  /** The multiplier its suffix gives (m: a million). */
  scale: number;
  percent: boolean;
  currency: boolean;
  index: number;
}

/** The figures written in a piece of text, after taking out references and dates. Years and small counts are left to the caller. */
export function figureTokens(text: string): FigureToken[] {
  let clean = text;
  for (const re of NOT_FIGURES) clean = clean.replace(re, (m) => ' '.repeat(m.length));
  const out: FigureToken[] = [];
  for (const m of clean.matchAll(TOKEN)) {
    const g = m.groups ?? {};
    const raw = g.num ?? '';
    out.push({
      text: m[0].trim(),
      value: Number(raw.replace(/,/g, '')),
      decimals: raw.includes('.') ? (raw.split('.')[1] ?? '').length : 0,
      scale: SUFFIX[(g.suf ?? '').trim()] ?? 1,
      percent: Boolean(g.pct),
      currency: Boolean(g.cur),
      index: m.index ?? 0,
    });
  }
  return out;
}

/** A bare whole number that is a year (1900 to 2039) or a small count (0 to 12): not a figure to account for. */
export function isYearOrCount(t: FigureToken): boolean {
  if (t.currency || t.percent || t.scale !== 1 || t.decimals > 0) return false;
  return (t.value >= 1900 && t.value <= 2039) || t.value <= 12;
}

/** True when some allowed value, in the briefing's units or as it stands, reads as the token at its precision. */
export function accountedFor(t: FigureToken, allowed: Iterable<number>, unitScale: number): boolean {
  const base = t.value * t.scale;
  const step = 10 ** -t.decimals * t.scale;
  const factors = t.percent ? [1] : [...new Set([1, unitScale])];
  for (const a of allowed) {
    for (const f of factors) {
      const r = roundTo((a * f) / step, 0) * step;
      if (Math.abs(r - base) <= step * 1e-6 || Math.abs(Math.abs(r) - base) <= step * 1e-6) return true;
    }
  }
  return false;
}

/**
 * Keys whose values are formulas, model data or schedule labels rather than
 * prose: the checks and declared figures (the model itself), the scores, the
 * money the figures are in, and the "when" of each implementation step
 * ("Months 13 to 18"), which is a timetable, not a figure.
 */
const SKIP_KEYS = new Set(['checks', 'figures', 'scores', 'is', 'currency', 'when', 'totals', 'updated']);

/** An identifier, a code or a single word: "ex-2", "3.8", "net-present-value", "A". Never prose with a figure in it. */
const isIdentifier = (s: string) => /^[\w.@|-]+$/.test(s);

/** Every piece of prose in a briefing, with where it sits: the text, the exhibits' titles, notes, labels and sources, and any words in a table's cells. */
export function proseOf(b: BoardroomBriefing): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const walk = (node: unknown, path: string, key: string) => {
    if (SKIP_KEYS.has(key)) return;
    if (Array.isArray(node)) {
      node.forEach((x, i) => walk(x, `${path}[${i}]`, key));
      return;
    }
    if (node && typeof node === 'object' && !(node instanceof Date)) {
      for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k, k);
      return;
    }
    if (typeof node === 'string' && !isIdentifier(node)) out.push([path, node]);
  };
  walk(b, '', '');
  return out;
}

/** Every value the text may quote: exhibit cells and footers, the briefing's figures, the criteria's weights and the options' scores. */
export function allowedValues(b: BoardroomBriefing, figureValues: Map<string, number>): Set<number> {
  const allowed = new Set<number>([100, 365]);
  for (const e of allExhibits(b)) {
    for (const r of e.rows ?? []) for (const c of r) if (typeof c === 'number') allowed.add(c);
    for (const c of e.footer ?? []) if (typeof c === 'number') allowed.add(c);
  }
  for (const v of figureValues.values()) allowed.add(v);
  for (const c of b.criteria) allowed.add(c.weight);
  for (const v of weightedScores(b).values()) allowed.add(roundTo(v, 2));
  for (const s of b.analysis.scores) allowed.add(s.total);
  return allowed;
}

/** Figures in the briefing's prose that no cell, figure or score accounts for. */
export function unaccounted(b: BoardroomBriefing, figureValues: Map<string, number>): string[] {
  const allowed = [...allowedValues(b, figureValues)];
  const scale = UNIT_SCALE[b.currency.unit];
  const problems: string[] = [];
  for (const [path, text] of proseOf(b)) {
    for (const t of figureTokens(text)) {
      if (isYearOrCount(t) || accountedFor(t, allowed, scale)) continue;
      const near = text.slice(Math.max(0, t.index - 40), t.index + t.text.length + 30).replace(/\s+/g, ' ').trim();
      problems.push(`${path}: the figure "${t.text}" is not a cell of an exhibit or a declared figure, near "${near}"`);
    }
  }
  return problems;
}

/** Figures in text that must describe things in general terms (context, market and research evidence): anything but a year. */
export function figuresInGeneralText(text: string): string[] {
  return figureTokens(text)
    .filter((t) => !(t.decimals === 0 && !t.currency && !t.percent && t.scale === 1 && t.value >= 1900 && t.value <= 2039))
    .map((t) => t.text);
}

/** The value of a figure, for a page or a test. */
export function figureValue(b: BoardroomBriefing, id: string): number {
  const f = b.figures.find((x: BriefingFigure) => x.id === id);
  if (!f) throw new Error(`${b.title}: no figure "${id}"`);
  return f.value;
}
