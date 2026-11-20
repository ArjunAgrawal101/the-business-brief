/**
 * Diagrams a reader can change: each draws itself from the figures in its
 * inputs, wide or for a phone, and reads its own result in words. The
 * arithmetic is in src/lib/figure-models.ts; this file only draws and writes.
 * The build uses it for the first view and the download, and the browser
 * (src/scripts/diagram-live.ts) for every change, so the two never differ.
 */
import type { LiveModelId } from '../diagrams';
import {
  CASH_BASE,
  DASHBOARD_RATIOS,
  PROJECTS,
  TIDEWATER,
  cashTimeline,
  compareProjects,
  dashboardRatios,
  hierarchy,
  ratioMovements,
  ratioProblems,
  type Preference,
  type RatioFigures,
} from '../figure-models';
import { fmtPayback, isRate, type Project, type Rate } from '../investment';
import { C, NW, charsFor, circle, esc, frame, line, para, rect, text, wrap } from './kit';

export type Values = Record<string, number>;

export interface LiveReading {
  /** Headline figures, label then value. */
  rows: Array<[string, string]>;
  /** An optional table of the working. */
  table?: { caption: string; head: string[]; rows: string[][] };
  /** The result in words. */
  reading: string;
  /** Fields whose figure cannot be used, with the reason. */
  problems: Array<{ key: string; message: string }>;
}

export interface LiveFigure {
  title: string;
  alt: string;
  draw: (id: string, v: Values, narrow: boolean) => string;
  read: (v: Values) => LiveReading;
}

const n0 = (v: number) => Math.round(v).toLocaleString('en-GB');
const n2 = (v: number) => v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Accounting style: negatives in brackets, as the guide's cash flow forecast writes them. */
const acc = (v: number) => (v < 0 ? `(${n0(-v)})` : n0(v));
const money = (v: number) => (v < 0 ? `−$${n0(-v)}` : `$${n0(v)}`);

/** A tick step that gives four to six ticks over a range. */
function niceStep(range: number): number {
  const raw = range / 5;
  const p = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-9)));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

function intProblem(v: Values, key: string, min: number, max: number, what: string): Array<{ key: string; message: string }> {
  const x = v[key];
  if (x === undefined || !Number.isFinite(x)) return [{ key, message: `Enter ${what}.` }];
  if (!Number.isInteger(x) || x < min || x > max) return [{ key, message: `Enter a whole number from ${n0(min)} to ${n0(max)}.` }];
  return [];
}

/* ------------------------------------------------------------------ */
/* Span of control and levels of hierarchy (2.2)                        */
/* ------------------------------------------------------------------ */

const levelName = (i: number, n: number, count: number) =>
  i === n - 1 ? `${n0(count)} front-line ${count === 1 ? 'employee' : 'staff'}` : i === 0 ? '1 person at the top' : `${n0(count)} ${count === 1 ? 'manager' : 'managers'}`;

function spanDraw(id: string, v: Values, narrow: boolean): string {
  const h = hierarchy(v.frontLine!, v.span!);
  const n = h.levels.length;
  const max = Math.max(...h.levels);
  const p: string[] = [];
  const desc = `A structure with ${n0(v.frontLine!)} front-line staff and a span of control of ${v.span}. ${h.levels
    .map((c, i) => `Level ${i + 1}: ${levelName(i, n, c)}`)
    .join('. ')}. That is ${n} levels of hierarchy, ${n0(h.managers)} managers and ${n0(h.total)} people in all, with ${h.chain} links in the chain of command from the top to the front line. It assumes every manager has the same span.`;
  if (!narrow) {
    const W = 680;
    const top = 44;
    const row = 36;
    const bx = 120;
    const bw = 450;
    const cx = bx + bw / 2;
    const H = top + n * row + 72;
    p.push(text(0, 20, 'Level', { size: 13, weight: 700, fill: C.slate, label: true }));
    p.push(text(cx, 20, 'People at each level', { size: 13, weight: 700, fill: C.slate, anchor: 'middle', label: true }));
    h.levels.forEach((count, i) => {
      const y = top + i * row;
      const w = Math.max(10, (count / max) * bw);
      const front = i === n - 1;
      p.push(text(0, y + 19, `Level ${i + 1}`, { size: 13, weight: 600, fill: C.ink }));
      p.push(rect(cx - w / 2, y + 2, w, row - 10, { fill: front ? C.cobaltWash : C.ink, stroke: front ? C.cobalt : undefined, sw: 1.2, rx: 3 }));
      const label = levelName(i, n, count);
      const inside = w > label.length * 7.6 + 16;
      p.push(
        text(inside ? cx : cx + w / 2 + 8, y + 19.5, label, { size: 13, weight: 600, fill: inside ? (front ? C.cobaltText : C.white) : C.ink, anchor: inside ? 'middle' : 'start' }),
      );
    });
    const ax = 596;
    p.push(text(W, 20, 'Chain of command', { size: 13, weight: 700, fill: C.slate, label: true, anchor: 'end' }));
    p.push(line(id, ax, top + 6, ax, top + (n - 1) * row + 18, { sw: 1.6, arrow: 'end' }));
    p.push(text(ax + 10, top + ((n - 1) * row) / 2 + 18, `${h.chain} ${h.chain === 1 ? 'link' : 'links'}`, { size: 13.5, weight: 700, fill: C.ink }));
    const fy = top + n * row + 14;
    p.push(rect(0, fy, W, 1, { fill: C.hair }));
    p.push(text(0, fy + 24, `Span of control ${v.span}: ${h.levels.length} levels, ${n0(h.managers)} managers, ${n0(h.total)} people in all.`, { size: 13.5, weight: 700, fill: C.ink }));
    p.push(text(0, fy + 46, 'Assumes every manager has the same span; where the numbers do not divide exactly, one manager has fewer.', { size: 13, italic: true, fill: C.slate }));
    return frame({ id, w: W, h: H, title: 'Span of control and levels of hierarchy', alt: LIVE.span.alt, desc }, p.join(''));
  }
  const top = 6;
  const row = 46;
  const H = top + n * row + 74;
  h.levels.forEach((count, i) => {
    const y = top + i * row;
    const w = Math.max(6, (count / max) * NW);
    const front = i === n - 1;
    p.push(text(0, y + 15, `Level ${i + 1}: ${levelName(i, n, count)}`, { size: 14, weight: 600, fill: C.ink }));
    p.push(rect(NW / 2 - w / 2, y + 22, w, 16, { fill: front ? C.cobaltWash : C.ink, stroke: front ? C.cobalt : undefined, sw: 1.2, rx: 2 }));
  });
  const fy = top + n * row + 6;
  p.push(rect(0, fy, NW, 1, { fill: C.hair }));
  p.push(para(0, fy + 24, `Span ${v.span}: ${n} levels, ${n0(h.managers)} managers, ${h.chain} ${h.chain === 1 ? 'link' : 'links'} from the top to the front line.`, charsFor(NW, 14), { size: 14, weight: 700, fill: C.ink, lh: 19 }));
  return frame({ id, w: NW, h: H, title: 'Span of control and levels of hierarchy', alt: LIVE.span.alt, desc }, p.join(''));
}

function spanRead(v: Values): LiveReading {
  const problems = [...intProblem(v, 'frontLine', 2, 1000, 'the number of front-line staff'), ...intProblem(v, 'span', 2, 20, 'a span of control')];
  if (problems.length) return { rows: [], reading: 'Check the figures marked.', problems };
  const h = hierarchy(v.frontLine!, v.span!);
  const wider = hierarchy(v.frontLine!, Math.min(20, v.span! * 2));
  const fewer = h.levels.length - wider.levels.length;
  const saved = h.managers - wider.managers;
  const compare =
    v.span! * 2 <= 20 && (fewer > 0 || saved > 0)
      ? ` Doubling the span to ${v.span! * 2} would leave ${wider.levels.length} levels and ${n0(wider.managers)} managers: ${fewer > 0 ? `${fewer} ${fewer === 1 ? 'level' : 'levels'} fewer` : 'the same number of levels'} and ${n0(saved)} fewer managers, which is what delayering does, at the cost of more people for each manager to supervise.`
      : '';
  return {
    rows: [
      ['Levels of hierarchy', String(h.levels.length)],
      ['Managers above the front line', n0(h.managers)],
      ['People in all', n0(h.total)],
      ['Links in the chain of command', String(h.chain)],
    ],
    reading: `With a span of control of ${v.span}, ${n0(v.frontLine!)} front-line staff need ${n0(h.managers)} managers in ${h.levels.length - 1} ${h.levels.length - 1 === 1 ? 'level' : 'levels'} above them, so an instruction from the top passes through ${h.chain} ${h.chain === 1 ? 'link' : 'links'} to reach the front line.${compare}`,
    problems: [],
  };
}

/* ------------------------------------------------------------------ */
/* Cash flow timeline (3.7)                                             */
/* ------------------------------------------------------------------ */

const STATUS_WORDS = { 'in-credit': 'In credit', overdraft: 'Overdrawn, within the limit', 'over-limit': 'Beyond the overdraft limit' } as const;

function cashDraw(id: string, v: Values, narrow: boolean): string {
  const t = cashTimeline({ customerCredit: v.customerCredit!, supplierCredit: v.supplierCredit!, opening: v.opening!, overdraft: v.overdraft! });
  const closings = t.rows.map((r) => r.closing);
  const profits = t.rows.map((r) => r.cumulativeProfit);
  const desc = `${CASH_BASE.business}, a fictional new business, sells on ${v.customerCredit} ${v.customerCredit === 1 ? 'month' : 'months'}' credit and pays its suppliers after ${v.supplierCredit} ${v.supplierCredit === 1 ? 'month' : 'months'}, starting with ${money(v.opening!)} in the bank and an overdraft limit of ${money(v.overdraft!)}. Closing bank balances: ${t.rows
    .map((r) => `${r.month} ${acc(r.closing)}, ${STATUS_WORDS[r.status].toLowerCase()}`)
    .join('; ')}. Profit to date climbs every month to ${money(t.profit)} by ${t.rows[t.rows.length - 1]!.month}. At the end customers still owe ${money(t.debtors)} and the business owes suppliers ${money(t.creditors)}.`;
  const p: string[] = [];
  if (!narrow) {
    const W = 680;
    const H = 400;
    const lo = Math.min(0, -v.overdraft!, ...closings);
    const hi = Math.max(0, ...closings, ...profits);
    const step = niceStep(hi - lo);
    const y0 = Math.floor(lo / step) * step;
    const y1 = Math.ceil(hi / step) * step;
    const px = 86;
    const pw = 570;
    const py = 50;
    const ph = 290;
    const Y = (val: number) => py + ph - ((val - y0) / (y1 - y0)) * ph;
    const slot = pw / t.rows.length;
    for (let val = y0; val <= y1 + 1e-6; val += step) {
      p.push(line(id, px, Y(val), px + pw, Y(val), { stroke: val === 0 ? C.ink : C.hair, sw: val === 0 ? 1.6 : 1 }));
      p.push(text(px - 8, Y(val) + 4.5, acc(val), { size: 13, fill: C.slate, anchor: 'end' }));
    }
    p.push(text(0, 18, '$', { size: 13, weight: 700, fill: C.slate }));
    // The overdraft limit.
    if (v.overdraft! > 0) p.push(line(id, px, Y(-v.overdraft!), px + pw, Y(-v.overdraft!), { stroke: C.signal, sw: 1.6, dash: '6 5' }));
    t.rows.forEach((r, i) => {
      const cx = px + slot * (i + 0.5);
      const bw = 40;
      const yTop = Y(Math.max(0, r.closing));
      const yBot = Y(Math.min(0, r.closing));
      const neg = r.closing < 0;
      const solid = r.status === 'over-limit';
      p.push(rect(cx - bw / 2, yTop, bw, Math.max(1, yBot - yTop), { fill: neg ? (solid ? C.signal : C.signalWash) : C.ink, stroke: neg ? C.signal : undefined, sw: 1.2 }));
      // A label inside a bar tall enough to hold it, so it never sits on the overdraft line.
      const inside = yBot - yTop >= 22;
      const ly = neg ? (inside ? yBot - 7 : yBot + 17) : inside ? yTop + 17 : yTop - 7;
      const lf = inside ? (neg ? (solid ? C.white : C.signalText) : C.white) : neg ? C.signalText : C.ink;
      p.push(text(cx, ly, acc(r.closing), { size: 13, weight: 700, fill: lf, anchor: 'middle' }));
      p.push(text(cx, py + ph + 22, r.month.slice(0, 3), { size: 13, weight: 600, fill: C.ink, anchor: 'middle' }));
    });
    // Profit to date.
    const pts = t.rows.map((r, i) => [px + slot * (i + 0.5), Y(r.cumulativeProfit)] as [number, number]);
    p.push(`<path d="${pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}" fill="none" stroke="${C.green}" stroke-width="2.4" stroke-linejoin="round"/>`);
    pts.forEach(([x, y]) => p.push(circle(x, y, 4, { fill: C.white, stroke: C.green, sw: 2 })));
    const last = pts[pts.length - 1]!;
    p.push(text(last[0] - 10, last[1] - 12, `Profit to date ${acc(t.profit)}`, { size: 13, weight: 700, fill: C.greenText, anchor: 'end' }));
    // Key.
    const ky = H - 18;
    p.push(rect(0, ky - 11, 14, 12, { fill: C.ink }));
    p.push(text(20, ky, 'Bank balance at the end of the month', { size: 13, fill: C.body }));
    p.push(line(id, 262, ky - 5, 286, ky - 5, { stroke: C.green, sw: 2.4 }));
    p.push(text(292, ky, 'Profit to date', { size: 13, fill: C.body }));
    if (v.overdraft! > 0) {
      p.push(line(id, 400, ky - 5, 424, ky - 5, { stroke: C.signal, sw: 1.6, dash: '6 5' }));
      p.push(text(430, ky, `Overdraft limit ${acc(-v.overdraft!)}`, { size: 13, fill: C.body }));
    }
    p.push(text(W, ky, 'Fictional figures.', { size: 13, italic: true, fill: C.slate, anchor: 'end' }));
    return frame({ id, w: W, h: H, title: 'Profit and cash, month by month', alt: LIVE.cash.alt, desc }, p.join(''));
  }
  // For a phone: one row a month, bars to the left of zero for an overdraft.
  const lo = Math.min(0, -v.overdraft!, ...closings);
  const hi = Math.max(0, ...closings);
  const span = Math.max(1, hi - lo);
  const X = (val: number) => ((val - lo) / span) * NW;
  const top = 44;
  const row = 52;
  const H = top + t.rows.length * row + 34;
  p.push(text(0, 16, 'Bank balance at the end of each month', { size: 14, weight: 700, fill: C.ink }));
  p.push(text(0, 36, 'and the profit made so far', { size: 14, fill: C.greenText }));
  const zx = X(0);
  t.rows.forEach((r, i) => {
    const y = top + i * row;
    const neg = r.closing < 0;
    p.push(text(0, y + 16, r.month, { size: 14, weight: 600, fill: C.ink }));
    p.push(text(NW - 8, y + 16, `profit ${acc(r.cumulativeProfit)}`, { size: 14, fill: C.greenText, anchor: 'end' }));
    const xA = Math.min(zx, X(r.closing));
    const w = Math.max(2, Math.abs(X(r.closing) - zx));
    p.push(rect(xA, y + 24, w, 18, { fill: neg ? C.signal : C.ink }));
    const label = acc(r.closing);
    const lw = label.length * 8.2;
    if (neg) {
      const inside = xA - 4 - lw < 0;
      p.push(text(inside ? xA + 4 : xA - 4, y + 38, label, { size: 14, weight: 700, fill: inside ? C.white : C.signalText, anchor: inside ? 'start' : 'end' }));
    } else {
      const inside = xA + w + 4 + lw > NW;
      p.push(text(inside ? xA + w - 4 : xA + w + 4, y + 38, label, { size: 14, weight: 700, fill: inside ? C.white : C.ink, anchor: inside ? 'end' : 'start' }));
    }
  });
  p.push(line(id, zx, top + 20, zx, top + t.rows.length * row, { stroke: C.ink, sw: 1.4 }));
  if (v.overdraft! > 0) {
    const ox = X(-v.overdraft!);
    p.push(line(id, ox, top + 20, ox, top + t.rows.length * row, { stroke: C.signal, sw: 1.6, dash: '5 4' }));
    p.push(text(Math.max(0, ox), H - 12, `Overdraft limit ${acc(-v.overdraft!)}`, { size: 14, weight: 600, fill: C.signalText }));
  }
  return frame({ id, w: NW, h: H, title: 'Profit and cash, month by month', alt: LIVE.cash.alt, desc }, p.join(''));
}

function cashRead(v: Values): LiveReading {
  const problems = [
    ...intProblem(v, 'customerCredit', 0, 3, 'the months customers take to pay'),
    ...intProblem(v, 'supplierCredit', 0, 2, 'the months the business takes to pay suppliers'),
    ...intProblem(v, 'opening', 0, 50000, 'the opening bank balance'),
    ...intProblem(v, 'overdraft', 0, 50000, 'the overdraft limit'),
  ];
  if (problems.length) return { rows: [], reading: 'Check the figures marked.', problems };
  const t = cashTimeline({ customerCredit: v.customerCredit!, supplierCredit: v.supplierCredit!, opening: v.opening!, overdraft: v.overdraft! });
  const lastMonth = t.rows[t.rows.length - 1]!.month;
  const over = t.overLimit;
  const overText = over.length
    ? ` Its balance goes beyond the ${money(v.overdraft!)} overdraft limit in ${over.length === 1 ? over[0] : `${over.slice(0, -1).join(', ')} and ${over[over.length - 1]}`}, so it would need more finance or would have to change its credit terms.`
    : t.lowest.closing < 0
      ? ` It stays within its overdraft, at worst ${money(t.lowest.closing)} in ${t.lowest.month}.`
      : ' It never needs its overdraft.';
  return {
    rows: [
      ['Profit over the six months', money(t.profit)],
      [`Bank balance at the end of ${lastMonth}`, money(t.closing)],
      ['Lowest balance', `${money(t.lowest.closing)} (${t.lowest.month})`],
      ['Customers still owe (debtors)', money(t.debtors)],
      ['Owed to suppliers (creditors)', money(t.creditors)],
    ],
    table: {
      caption: 'Cash flow forecast ($). Brackets show a negative figure.',
      head: ['Month', 'Cash in', 'Cash out', 'Closing balance'],
      rows: t.rows.map((r) => [r.month, acc(r.receipts), acc(r.payments), acc(r.closing)]),
    },
    reading: `${CASH_BASE.business} makes a profit every month, ${money(t.profit)} in all.${overText} Profit counts a sale when it is made; cash arrives only when the customer pays. Closing balance = opening ${money(v.opening!)} + profit ${money(t.profit)} − debtors ${money(t.debtors)} + creditors ${money(t.creditors)} = ${money(t.closing)}.`,
    problems: [],
  };
}

/* ------------------------------------------------------------------ */
/* Profitability and liquidity dashboard (3.5)                          */
/* ------------------------------------------------------------------ */

export const RATIO_KEYS: Array<keyof RatioFigures> = ['salesRevenue', 'costOfSales', 'expenses', 'nonCurrentLiabilities', 'equity', 'currentAssets', 'stock', 'currentLiabilities'];

const figuresOf = (v: Values): RatioFigures => Object.fromEntries(RATIO_KEYS.map((k) => [k, v[k] ?? NaN])) as unknown as RatioFigures;
const fmtRatioValue = (val: number | null, kind: 'percent' | 'ratio') => (val === null ? 'n/a' : kind === 'percent' ? `${n2(val)}%` : n2(val));
const changeText = (a: number | null, b: number | null, kind: 'percent' | 'ratio') => {
  if (a === null || b === null) return 'n/a';
  const d = Math.round(b * 100) - Math.round(a * 100);
  if (d === 0) return 'No change';
  return `${d > 0 ? 'Up' : 'Down'} ${n2(Math.abs(d) / 100)}${kind === 'percent' ? ' points' : ''}`;
};

function ratiosDraw(id: string, v: Values, narrow: boolean): string {
  const A = dashboardRatios(TIDEWATER.a);
  const B = dashboardRatios(figuresOf(v));
  const [ya, yb] = TIDEWATER.years;
  const pctMax = Math.max(60, ...DASHBOARD_RATIOS.filter((r) => r.kind === 'percent').flatMap((r) => [A[r.id] ?? 0, B[r.id] ?? 0]));
  const ratMax = Math.max(3, ...DASHBOARD_RATIOS.filter((r) => r.kind === 'ratio').flatMap((r) => [A[r.id] ?? 0, B[r.id] ?? 0]));
  const scaleMax = { percent: Math.ceil(pctMax / 10) * 10, ratio: Math.ceil(ratMax * 2) / 2 };
  const desc = `${TIDEWATER.business}, a fictional retailer, in ${ya} and ${yb}. ${DASHBOARD_RATIOS.map((r) => `${r.name}: ${fmtRatioValue(A[r.id]!, r.kind)} in ${ya}, ${fmtRatioValue(B[r.id]!, r.kind)} in ${yb}, ${changeText(A[r.id]!, B[r.id]!, r.kind).toLowerCase()}`).join('. ')}. A current ratio of about 1.5 to 2 is often called comfortable, and an acid test ratio of about 1 means short-term debts could be paid without selling stock; both are rules of thumb, not IB rules.`;
  const p: string[] = [];
  const W = narrow ? NW : 680;
  const bx = narrow ? 48 : 230;
  const bwMax = narrow ? 178 : 330;
  const barH = narrow ? 16 : 18;
  const size = narrow ? 14 : 13;
  let y = 0;
  let family = '';
  for (const r of DASHBOARD_RATIOS) {
    if (r.family !== family) {
      family = r.family;
      y += family === 'Profitability' ? 18 : 30;
      p.push(text(0, y, family, { size: narrow ? 14 : 13, weight: 700, fill: C.goldText, label: true }));
      p.push(rect(0, y + 7, W, 1, { fill: C.hair }));
      y += 14;
    }
    const a = A[r.id]!;
    const b = B[r.id]!;
    const max = scaleMax[r.kind];
    const X = (val: number) => bx + (Math.max(0, Math.min(val, max)) / max) * bwMax;
    const head = y + (narrow ? 20 : 22);
    p.push(text(0, head, r.name, { size: narrow ? 14 : 14, weight: 700, fill: C.ink }));
    const mv = changeText(a, b, r.kind);
    const down = mv.startsWith('Down');
    p.push(text(narrow ? W : 0, narrow ? head : head + 20, mv, { size, weight: 600, fill: mv === 'No change' || mv === 'n/a' ? C.slate : down ? C.signalText : C.greenText, anchor: narrow ? 'end' : 'start' }));
    const b1 = narrow ? head + 10 : y + 8;
    // Reference bands: rules of thumb, labelled as such in the key.
    if (r.id === 'current') p.push(rect(X(1.5), b1 - 4, X(2) - X(1.5), barH * 2 + 14, { fill: C.goldWash }));
    if (r.id === 'acid') p.push(line(id, X(1), b1 - 4, X(1), b1 + barH * 2 + 10, { stroke: C.gold, sw: 2, dash: '4 3' }));
    [
      [ya, a, false],
      [yb, b, true],
    ].forEach(([year, val, solid], k) => {
      const by = b1 + (k as number) * (barH + 6);
      p.push(text(bx - 8, by + barH - 3.5, String(year), { size, fill: C.slate, anchor: 'end' }));
      const w = val === null ? 0 : Math.max(2, X(val as number) - bx);
      p.push(rect(bx, by, w, barH, { fill: solid ? C.ink : C.white, stroke: C.ink, sw: 1.2 }));
      p.push(text(bx + w + 6, by + barH - 3.5, fmtRatioValue(val as number | null, r.kind), { size, weight: 700, fill: C.ink }));
    });
    y = b1 + barH * 2 + 6 + (narrow ? 10 : 12);
  }
  y += 14;
  p.push(rect(0, y - 10, 14, 12, { fill: C.goldWash, stroke: C.gold, sw: 1 }));
  const key = 'Shaded: a current ratio of 1.5 to 2, often called comfortable. Dashed: an acid test ratio of 1. Rules of thumb, not IB rules.';
  const keyLines = wrap(key, charsFor(W - 22, narrow ? 14 : 13));
  p.push(text(22, y, keyLines.join('\n'), { size: narrow ? 14 : 13, fill: C.body, lh: narrow ? 18 : 16 }));
  y += keyLines.length * (narrow ? 18 : 16) + 8;
  const fl = wrap(`${TIDEWATER.business}: fictional figures, $000.`, charsFor(W, narrow ? 14 : 13));
  p.push(text(0, y + 4, fl.join('\n'), { size: narrow ? 14 : 13, italic: true, fill: C.slate, lh: narrow ? 18 : 15 }));
  const H = y + 14 + (fl.length - 1) * (narrow ? 18 : 15);
  return frame({ id, w: W, h: H, title: 'Profitability and liquidity at a glance', alt: LIVE.ratios.alt, desc }, p.join(''));
}

function ratiosRead(v: Values): LiveReading {
  const f = figuresOf(v);
  const problems = ratioProblems(f).map((x) => ({ key: x.field, message: x.message }));
  if (problems.length) return { rows: [], reading: 'Check the figures marked.', problems };
  const A = dashboardRatios(TIDEWATER.a);
  const B = dashboardRatios(f);
  const moves = ratioMovements(A, B);
  const [ya, yb] = TIDEWATER.years;
  const list = (dir: 'up' | 'down') => DASHBOARD_RATIOS.filter((r) => moves[r.id] === dir).map((r) => r.name.toLowerCase().replace('roce', 'ROCE'));
  const join = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
  const up = list('up');
  const down = list('down');
  const parts: string[] = [];
  if (down.length) parts.push(`${join(down)} ${down.length === 1 ? 'is' : 'are'} lower than in ${ya}`);
  if (up.length) parts.push(`${join(up)} ${up.length === 1 ? 'is' : 'are'} higher`);
  const acid = B.acid;
  const current = B.current;
  const flags: string[] = [];
  if (current !== null && current < 1) flags.push('The current ratio is below 1: current liabilities are larger than current assets, so the business may need new finance to pay its short-term debts.');
  else if (acid !== null && acid < 1) flags.push('The acid test ratio is below 1: without selling stock, the business could not pay all its short-term debts.');
  const reading = `${parts.length ? `In ${yb}, ${parts.join(', and ')}.` : `Every ratio is the same as in ${ya}.`} ${flags.join(' ')} A ratio says what changed; the accounts and the business's situation explain why.`.replace(/\s+/g, ' ').trim();
  return {
    rows: [],
    table: {
      caption: `${TIDEWATER.business}: the five ratios in ${ya} and ${yb}`,
      head: ['Ratio', ya, yb, 'Change'],
      rows: DASHBOARD_RATIOS.map((r) => [r.name, fmtRatioValue(A[r.id], r.kind), fmtRatioValue(B[r.id], r.kind), changeText(A[r.id], B[r.id], r.kind)]),
    },
    reading: reading.charAt(0).toUpperCase() + reading.slice(1),
    problems: [],
  };
}

/* ------------------------------------------------------------------ */
/* Two projects, three methods (3.8)                                    */
/* ------------------------------------------------------------------ */

const projectsOf = (v: Values): [Project, Project] =>
  (['a', 'b'] as const).map((k, i) => ({
    id: k,
    label: PROJECTS[i]!.label,
    capitalCost: v[`${k}Cost`] ?? NaN,
    returns: [1, 2, 3, 4, 5].map((y) => v[`${k}${y}`] ?? NaN),
  })) as [Project, Project];

const rateOf = (v: Values): Rate => (isRate(v.rate ?? NaN) ? (v.rate as Rate) : 10);
const preferWords = (p: Preference) => (p === 'a' ? 'A' : p === 'b' ? 'B' : p === 'tie' ? 'Neither: a tie' : 'Neither');

function investDraw(id: string, v: Values, narrow: boolean): string {
  const [a, b] = projectsOf(v);
  const cmp = compareProjects(a, b, rateOf(v));
  const series = [
    { key: 'A', cum: cmp.a.cumulative, stroke: C.cobalt, dash: undefined as string | undefined, pb: cmp.a.payback },
    { key: 'B', cum: cmp.b.cumulative, stroke: C.ink, dash: '7 5', pb: cmp.b.payback },
  ];
  const all = series.flatMap((s) => s.cum);
  const lo = Math.min(0, ...all);
  const hi = Math.max(0, ...all);
  const step = niceStep(hi - lo || 1);
  const y0 = Math.floor(lo / step) * step;
  const y1 = Math.ceil(hi / step) * step || step;
  const W = narrow ? NW : 680;
  const H = narrow ? 300 : 380;
  const px = narrow ? 52 : 80;
  const pw = narrow ? NW - px - 24 : 520;
  const py = narrow ? 30 : 40;
  const ph = narrow ? 210 : 270;
  const size = narrow ? 14 : 13;
  const X = (yr: number) => px + (yr / 5) * pw;
  const Y = (val: number) => py + ph - ((val - y0) / (y1 - y0)) * ph;
  const p: string[] = [];
  for (let val = y0; val <= y1 + 1e-6; val += step) {
    p.push(line(id, px, Y(val), px + pw, Y(val), { stroke: val === 0 ? C.ink : C.hair, sw: val === 0 ? 1.6 : 1 }));
    p.push(text(px - 8, Y(val) + 5, acc(val), { size, fill: C.slate, anchor: 'end' }));
  }
  for (let yr = 0; yr <= 5; yr++) p.push(text(X(yr), py + ph + (narrow ? 22 : 20), String(yr), { size, fill: C.slate, anchor: 'middle' }));
  p.push(text(px + pw / 2, py + ph + (narrow ? 44 : 40), 'Year', { size, weight: 600, fill: C.ink, anchor: 'middle' }));
  p.push(text(narrow ? 0 : px - 8, py - 14, 'Cumulative net cash flow, $000', { size, weight: 600, fill: C.ink }));
  for (const s of series) {
    const pts = s.cum.map((c, yr) => [X(yr), Y(c)] as [number, number]);
    p.push(`<path d="${pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}" fill="none" stroke="${s.stroke}" stroke-width="2.6"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''} stroke-linejoin="round"/>`);
    pts.forEach(([x, y]) => p.push(s.key === 'A' ? circle(x, y, 4.2, { fill: C.white, stroke: s.stroke, sw: 2 }) : rect(x - 4, y - 4, 8, 8, { fill: C.white, stroke: s.stroke, sw: 2 })));
    const end = pts[pts.length - 1]!;
    p.push(text(end[0] + 8, end[1] + 5, s.key, { size: narrow ? 15 : 14, weight: 700, fill: s.key === 'A' ? C.cobaltText : C.ink }));
    if (s.pb) {
      const x = X(s.pb.total);
      p.push(line(id, x, Y(0) - 9, x, Y(0) + 9, { stroke: s.stroke, sw: 2.4 }));
    }
  }
  let Hn = H;
  if (narrow) {
    const nl = wrap(series.map((s) => `${s.key} pays back in ${fmtPayback(s.pb)}`).join('; ') + '.', charsFor(W, 14));
    p.push(text(0, H + 4, nl.join('\n'), { size: 14, weight: 600, fill: C.ink, lh: 18 }));
    Hn = H + 10 + nl.length * 18;
  }
  if (!narrow) {
    const notes = series.map((s) => `${s.key} pays back in ${fmtPayback(s.pb)}`);
    p.push(text(px, H - 8, notes.join('.   ') + '.', { size: 13, weight: 600, fill: C.ink }));
    p.push(text(W, H - 8, 'Fictional figures.', { size: 13, italic: true, fill: C.slate, anchor: 'end' }));
  }
  const desc = `Two fictional projects. ${series
    .map((s, i) => `${s.key}, ${[a, b][i]!.label.replace(/^Project [AB]: /, '')}, costs $${n0([a, b][i]!.capitalCost)}k and its cumulative net cash flow runs ${s.cum.map(acc).join(', ')}; it pays back in ${fmtPayback(s.pb)}`)
    .join('. ')}. Each line crosses zero where the project has repaid its cost.`;
  return frame({ id, w: W, h: Hn, title: 'Two projects, three methods', alt: LIVE.invest.alt, desc }, p.join(''));
}

function investRead(v: Values): LiveReading {
  const problems: Array<{ key: string; message: string }> = [];
  for (const k of ['a', 'b']) {
    const cost = v[`${k}Cost`];
    if (cost === undefined || !Number.isFinite(cost) || cost <= 0) problems.push({ key: `${k}Cost`, message: 'Enter a cost above zero.' });
    for (let y = 1; y <= 5; y++) {
      const x = v[`${k}${y}`];
      if (x === undefined || !Number.isFinite(x) || x < 0) problems.push({ key: `${k}${y}`, message: 'Enter a net cash flow of zero or more.' });
    }
  }
  if (!isRate(v.rate ?? NaN)) problems.push({ key: 'rate', message: 'Choose one of the guide’s discount rates.' });
  if (problems.length) return { rows: [], reading: 'Check the figures marked.', problems };
  const [a, b] = projectsOf(v);
  const rate = rateOf(v);
  const cmp = compareProjects(a, b, rate);
  const arrText = (x: number | null) => (x === null ? 'n/a' : `${n2(x)}%`);
  const npvText = (x: number | null) => (x === null ? 'n/a' : `${x < 0 ? '−' : ''}$${n2(Math.abs(x))}k`);
  const names = { payback: 'payback', arr: 'the ARR', npv: 'NPV' } as const;
  const firm = (['payback', 'arr', 'npv'] as const).filter((m) => cmp.prefer[m] === 'a' || cmp.prefer[m] === 'b');
  let reading: string;
  if (cmp.conflict) {
    const forA = firm.filter((m) => cmp.prefer[m] === 'a').map((m) => names[m]);
    const forB = firm.filter((m) => cmp.prefer[m] === 'b').map((m) => names[m]);
    const j = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
    reading = `The methods disagree. ${j(forA).replace(/^./, (c) => c.toUpperCase())} ${forA.length === 1 ? 'prefers' : 'prefer'} A; ${j(forB)} ${forB.length === 1 ? 'prefers' : 'prefer'} B. Payback rewards getting the money back soon; the ARR and NPV count every year's return, and NPV also counts when it arrives. The choice depends on what the business needs most: cash back quickly, or the larger return.`;
  } else if (firm.length) {
    const w = cmp.prefer[firm[0]!] === 'a' ? 'A' : 'B';
    reading = `All the methods that can decide prefer project ${w}. Agreement makes the choice easier, but the figures are forecasts, and the further ahead they look, the less certain they are.`;
  } else reading = 'Neither project can be ranked on these figures.';
  return {
    rows: [],
    table: {
      caption: `The three methods for each project (NPV at ${rate}%, with the guide's discount factors; NPV is HL only)`,
      head: ['Method', 'Project A', 'Project B', 'Prefers'],
      rows: [
        ['Payback period', fmtPayback(cmp.a.payback), fmtPayback(cmp.b.payback), preferWords(cmp.prefer.payback)],
        ['Average rate of return', arrText(cmp.a.arr), arrText(cmp.b.arr), preferWords(cmp.prefer.arr)],
        [`NPV at ${rate}% (HL)`, npvText(cmp.a.npv), npvText(cmp.b.npv), preferWords(cmp.prefer.npv)],
      ],
    },
    reading,
    problems: [],
  };
}

/* ------------------------------------------------------------------ */
/* The register                                                         */
/* ------------------------------------------------------------------ */

export const LIVE: Record<LiveModelId, LiveFigure> = {
  span: {
    title: 'Span of control and levels of hierarchy',
    alt: 'Bars, one for each level of an organization, from one person at the top to the front-line staff, showing how the span of control sets the number of levels.',
    draw: spanDraw,
    read: spanRead,
  },
  cash: {
    title: 'Profit and cash, month by month',
    alt: 'A chart of six months for a fictional new business: bars for the bank balance at the end of each month, a line for the profit made so far, and the overdraft limit.',
    draw: cashDraw,
    read: cashRead,
  },
  ratios: {
    title: 'Profitability and liquidity at a glance',
    alt: 'Paired bars for five ratios of a fictional retailer in two years: gross profit margin, profit margin, ROCE, the current ratio and the acid test ratio.',
    draw: ratiosDraw,
    read: ratiosRead,
  },
  invest: {
    title: 'Two projects, three methods',
    alt: 'Two lines of cumulative net cash flow over five years for two fictional projects, each crossing zero at its payback point.',
    draw: investDraw,
    read: investRead,
  },
};

/** The figures a live diagram starts from: its inputs' values. */
export function defaults(inputs: Array<{ key: string; value: number }>): Values {
  return Object.fromEntries(inputs.map((i) => [i.key, i.value]));
}

/** A reading as HTML, the same on the server and in the browser: the headline figures, the table and the words. */
export function readingHtml(r: LiveReading): string {
  const out: string[] = [];
  if (r.rows.length) out.push(`<dl class="dg-read__rows">${r.rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`);
  if (r.table) {
    const [first, ...rest] = r.table.head;
    out.push(
      `<table class="dg-read__table"><caption>${esc(r.table.caption)}</caption><thead><tr><th scope="col">${esc(first ?? '')}</th>${rest.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${r.table.rows
        .map(([head, ...cells]) => `<tr><th scope="row">${esc(head ?? '')}</th>${cells.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
        .join('')}</tbody></table>`,
    );
  }
  out.push(`<p class="dg-read__text">${esc(r.reading)}</p>`);
  return out.join('');
}
