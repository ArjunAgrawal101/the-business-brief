/**
 * Market metrics calculators: market share and market growth for a market
 * the reader defines (4.1, AO2 and AO4), relative market share for the BCG
 * matrix (a toolkit tool), and customer lifetime value (enrichment: not in the
 * IB guide). Market share and growth reuse the functions in market.ts, so the
 * figures here always agree with the Porto workspace.
 *
 * Customer lifetime value is worked in a standard form: the margin a customer
 * brings each year, kept with probability r each year and discounted at d,
 * is worth m ÷ (1 + d − r) today, with the first year's margin counted at the
 * end of the year.
 */
import type { Working } from './finance';
import { fmtMoney, fmtNumber } from './format';
import { growthRate, marketModel, validateMarket, type MarketModel } from './market';
import { asBool, asList, asNum, asObj, asOneOf, asStr, safeId, uniqueIds } from './market-kit';

export interface MetricsFirm {
  id: string;
  name: string;
  last: number;
  now: number;
  group: boolean;
}

export interface ClvInputs {
  /** Average spend per visit or purchase. */
  spend: number;
  /** Visits or purchases a year. */
  visits: number;
  /** Gross margin on what the customer buys, in per cent. */
  margin: number;
  /** Share of customers still buying a year later, in per cent (below 100). */
  retention: number;
  /** Discount rate a year, in per cent. */
  discount: number;
  /** Cost of winning one new customer. */
  cac: number;
}

export interface MetricsState {
  market: string;
  basis: 'value' | 'volume';
  /** The word for what sales are counted in, for readings: "dollars", "cups". */
  unit: string;
  /** Currency symbol for money (sales by value, and customer lifetime value). */
  symbol: string;
  periods: { last: string; now: string };
  focus: string;
  firms: MetricsFirm[];
  clv: ClvInputs;
}

/* ---------- Market share, growth and relative share ---------- */

/**
 * Relative market share, as the BCG matrix uses it: the firm's share divided
 * by the share of its largest named rival. Above 1 means the firm leads.
 */
export function relativeShare(firms: MetricsFirm[], focusId: string, period: 'last' | 'now' = 'now'): number | null {
  const f = firms.find((x) => x.id === focusId);
  if (!f || f.group) return null;
  const rivals = firms.filter((x) => x.id !== focusId && !x.group);
  if (!rivals.length) return null;
  const top = Math.max(...rivals.map((x) => x[period]));
  return top > 0 ? f[period] / top : null;
}

/** The largest named rival of the focus firm, by sales in the later period. */
export function largestRival(firms: MetricsFirm[], focusId: string): MetricsFirm | null {
  const rivals = firms.filter((x) => x.id !== focusId && !x.group);
  if (!rivals.length) return null;
  return rivals.reduce((a, b) => (b.now > a.now ? b : a));
}

export interface MetricsProblem {
  where: string;
  message: string;
}

/** Problems with the market the reader has entered, each tied to a field. */
export function validateMetrics(s: MetricsState): MetricsProblem[] {
  const out: MetricsProblem[] = [];
  if (s.firms.length < 2) out.push({ where: 'firms', message: 'A market needs at least two sellers.' });
  s.firms.forEach((f) => {
    if (!f.name.trim()) out.push({ where: `${f.id}-name`, message: 'Give the seller a name.' });
  });
  for (const p of validateMarket(s.firms)) out.push({ where: `${p.id}-${p.field}`, message: p.message });
  const focus = s.firms.find((f) => f.id === s.focus);
  if (!focus) out.push({ where: 'focus', message: 'Choose the business to focus on.' });
  else if (focus.group) out.push({ where: 'focus', message: 'The focus cannot be a group of many sellers.' });
  return out;
}

export function validateClv(c: ClvInputs): MetricsProblem[] {
  const out: MetricsProblem[] = [];
  const need = (k: keyof ClvInputs, ok: boolean, message: string) => ok || out.push({ where: `clv-${k}`, message });
  need('spend', c.spend >= 0, 'Spend cannot be negative.');
  need('visits', c.visits >= 0, 'Visits cannot be negative.');
  need('margin', c.margin >= 0 && c.margin <= 100, 'Enter a margin from 0 to 100%.');
  need('retention', c.retention >= 0 && c.retention < 100, 'Enter a retention rate from 0 to 99%.');
  need('discount', c.discount >= 0 && c.discount <= 50, 'Enter a discount rate from 0 to 50%.');
  need('cac', c.cac >= 0, 'The cost of winning a customer cannot be negative.');
  return out;
}

/* ---------- Customer lifetime value ---------- */

export interface ClvRow {
  year: number;
  /** Chance the customer is still buying in this year. */
  survival: number;
  /** Expected margin in the year: annual margin × survival. */
  margin: number;
  /** Discount factor 1 ÷ (1 + d)^year. */
  factor: number;
  /** Present value of the year's expected margin. */
  pv: number;
  cumulative: number;
}

export interface ClvModel {
  inputs: ClvInputs;
  annualMargin: number;
  /** Expected years as a customer, 1 ÷ (1 − r). */
  lifetime: number;
  /** Expected margin over the customer's life, not discounted. */
  undiscounted: number;
  /** Customer lifetime value: present value of the expected margin. */
  clv: number;
  /** Lifetime value less the cost of winning the customer. */
  net: number;
  /** Lifetime value ÷ acquisition cost; null when the cost is zero. */
  ratio: number | null;
  /** Months of margin (not discounted) to repay the acquisition cost; null when there is no margin. */
  paybackMonths: number | null;
  rows: ClvRow[];
}

export function annualMargin(c: ClvInputs): number {
  return c.spend * c.visits * (c.margin / 100);
}

export function clvModel(c: ClvInputs, years = 10): ClvModel {
  const r = c.retention / 100;
  const d = c.discount / 100;
  const m = annualMargin(c);
  const clv = m / (1 + d - r);
  const rows: ClvRow[] = [];
  let cumulative = 0;
  for (let t = 1; t <= years; t += 1) {
    const survival = r ** (t - 1);
    const margin = m * survival;
    const factor = 1 / (1 + d) ** t;
    const pv = margin * factor;
    cumulative += pv;
    rows.push({ year: t, survival, margin, factor, pv, cumulative });
  }
  return {
    inputs: c,
    annualMargin: m,
    lifetime: 1 / (1 - r),
    undiscounted: m / (1 - r),
    clv,
    net: clv - c.cac,
    ratio: c.cac > 0 ? clv / c.cac : null,
    paybackMonths: m > 0 ? c.cac / (m / 12) : null,
    rows,
  };
}

const money = (v: number, sym: string) => fmtMoney(v, sym, 2);

/** The eight-part working for customer lifetime value. */
export function clvWorking(k: ClvModel, sym: string): Working {
  const c = k.inputs;
  const r = c.retention / 100;
  const d = c.discount / 100;
  return {
    given: [
      { label: 'Spend per visit', value: money(c.spend, sym) },
      { label: 'Visits a year', value: fmtNumber(c.visits, Number.isInteger(c.visits) ? 0 : 1) },
      { label: 'Gross margin', value: `${fmtNumber(c.margin, Number.isInteger(c.margin) ? 0 : 1)}%` },
      { label: 'Retention rate a year', value: `${fmtNumber(c.retention, Number.isInteger(c.retention) ? 0 : 1)}%` },
      { label: 'Discount rate a year', value: `${fmtNumber(c.discount, Number.isInteger(c.discount) ? 0 : 1)}%` },
    ],
    formula: 'Customer lifetime value = annual margin ÷ (1 + discount rate − retention rate), where annual margin = spend per visit × visits a year × gross margin',
    substitution: `= (${fmtNumber(c.spend, 2)} × ${fmtNumber(c.visits, Number.isInteger(c.visits) ? 0 : 1)} × ${fmtNumber(c.margin / 100, 2)}) ÷ (1 + ${fmtNumber(d, 2)} − ${fmtNumber(r, 2)})`,
    steps: [
      `${fmtNumber(c.spend, 2)} × ${fmtNumber(c.visits, Number.isInteger(c.visits) ? 0 : 1)} × ${fmtNumber(c.margin / 100, 2)} = ${fmtNumber(k.annualMargin, 2)}`,
      `1 + ${fmtNumber(d, 2)} − ${fmtNumber(r, 2)} = ${fmtNumber(1 + d - r, 2)}`,
      `${fmtNumber(k.annualMargin, 2)} ÷ ${fmtNumber(1 + d - r, 2)} = ${fmtNumber(k.clv, 2)}`,
    ],
    answer: money(k.clv, sym),
    value: k.clv,
    unit: `${sym || 'money'} of margin per customer, in today's money`,
    note: 'A standard form of the formula. Customer lifetime value is not in the IB guide; it is enrichment.',
  };
}

/** A plain reading of the lifetime value against the cost of winning the customer. */
export function readClv(k: ClvModel, sym: string): { reading: string; implication: string } {
  const life = fmtNumber(k.lifetime, 1);
  const reading = `Each customer brings ${money(k.annualMargin, sym)} of margin a year and stays about ${life} ${k.lifetime === 1 ? 'year' : 'years'} on average, so a new customer is worth about ${money(k.clv, sym)} in today's money.${
    k.ratio === null ? '' : ` Winning one costs ${money(k.inputs.cac, sym)}, so the value is ${fmtNumber(k.ratio, 1)} times the cost${k.paybackMonths === null ? '' : `, repaid by about ${fmtNumber(k.paybackMonths, 1)} months of margin`}.`
  }`;
  const implication =
    k.net <= 0
      ? 'Winning customers at this cost loses money over their lifetime. Cut the acquisition cost, raise the margin, or keep customers longer before spending more on promotion.'
      : `The business could spend up to ${money(k.clv, sym)} to win a customer and still break even over their lifetime. The figure is only as good as the retention rate behind it: a small change in retention moves it a lot.`;
  return { reading, implication };
}

/** How much the lifetime value changes when retention moves by a number of percentage points, for the sensitivity line. */
export function clvAtRetention(c: ClvInputs, retention: number): number {
  return clvModel({ ...c, retention: Math.min(99, Math.max(0, retention)) }, 1).clv;
}

/* ---------- The whole instrument ---------- */

export interface MetricsView {
  model: MarketModel;
  relative: number | null;
  rival: MetricsFirm | null;
  clv: ClvModel;
}

export function metricsView(s: MetricsState): MetricsView {
  return { model: marketModel(s.firms), relative: relativeShare(s.firms, s.focus), rival: largestRival(s.firms, s.focus), clv: clvModel(s.clv) };
}

/** The growth in the focus firm's own sales, in per cent. */
export function focusGrowth(s: MetricsState): number | null {
  const f = s.firms.find((x) => x.id === s.focus);
  return f ? growthRate(f.last, f.now) : null;
}

/** Saved or imported state, made safe; null when it cannot be used at all. */
export function normalizeMetrics(raw: unknown, fallback: MetricsState): MetricsState | null {
  const o = asObj(raw);
  if (!o) return null;
  const firms = uniqueIds(
    asList(o.firms, (x, i) => {
      const f = asObj(x);
      if (!f) return null;
      return { id: safeId(f.id, `f${i + 1}`), name: asStr(f.name, '', 60), last: asNum(f.last, 0, 0, 1e12), now: asNum(f.now, 0, 0, 1e12), group: asBool(f.group) };
    }, 12),
    'f',
  );
  if (firms.length < 2) return null;
  const p = asObj(o.periods) ?? {};
  const c = asObj(o.clv) ?? {};
  const fc = fallback.clv;
  const focus = asStr(o.focus, '', 40);
  return {
    market: asStr(o.market, fallback.market, 160),
    basis: asOneOf(o.basis, ['value', 'volume'] as const, fallback.basis),
    unit: asStr(o.unit, fallback.unit, 30) || fallback.unit,
    symbol: asStr(o.symbol, fallback.symbol, 4),
    periods: { last: asStr(p.last, fallback.periods.last, 20) || fallback.periods.last, now: asStr(p.now, fallback.periods.now, 20) || fallback.periods.now },
    focus: firms.some((f) => f.id === focus && !f.group) ? focus : (firms.find((f) => !f.group)?.id ?? firms[0]?.id ?? ''),
    firms,
    clv: {
      spend: asNum(c.spend, fc.spend, 0, 1e7),
      visits: asNum(c.visits, fc.visits, 0, 1e5),
      margin: asNum(c.margin, fc.margin, 0, 100),
      retention: asNum(c.retention, fc.retention, 0, 99),
      discount: asNum(c.discount, fc.discount, 0, 50),
      cac: asNum(c.cac, fc.cac, 0, 1e7),
    },
  };
}

/** Rows for the CSV export: the market table, then the lifetime value inputs and result. */
export function metricsCsvRows(s: MetricsState): Array<Array<string | number>> {
  const v = metricsView(s);
  const r = (x: number | null, d = 2) => (x === null ? '' : Number(x.toFixed(d)));
  const rows: Array<Array<string | number>> = [
    ['Seller', `Sales ${s.periods.last}`, `Share ${s.periods.last} (%)`, `Sales ${s.periods.now}`, `Share ${s.periods.now} (%)`, 'Change in share (points)', 'Sales growth (%)'],
    ...v.model.firms.map((f) => [f.name + (f.group ? ' (group)' : ''), f.last, r(f.shareLast), f.now, r(f.shareNow), r(f.shareChange), r(f.salesGrowth)]),
    ['Market', v.model.totalLast, 100, v.model.totalNow, 100, '', r(v.model.growth)],
    [],
    ['Relative market share of the focus business', r(v.relative, 3)],
    [],
    ['Customer lifetime value (enrichment)', ''],
    ['Spend per visit', s.clv.spend],
    ['Visits a year', s.clv.visits],
    ['Gross margin (%)', s.clv.margin],
    ['Retention rate (%)', s.clv.retention],
    ['Discount rate (%)', s.clv.discount],
    ['Acquisition cost', s.clv.cac],
    ['Annual margin', r(v.clv.annualMargin)],
    ['Customer lifetime value', r(v.clv.clv)],
    ['Lifetime value less acquisition cost', r(v.clv.net)],
  ];
  return rows;
}

/** A plain-text summary to copy. */
export function metricsSummary(s: MetricsState): string {
  const v = metricsView(s);
  const f = v.model.firms.find((x) => x.id === s.focus);
  const pc = (x: number | null) => (x === null ? 'n/a' : `${fmtNumber(x, 1)}%`);
  const lines = [
    `Market metrics: ${s.market}`,
    `Measured by ${s.basis}, ${s.periods.last} to ${s.periods.now}.`,
    `Market size: ${fmtNumber(v.model.totalLast)} to ${fmtNumber(v.model.totalNow)} ${s.unit}; market growth ${pc(v.model.growth)}.`,
    f ? `${f.name}: share ${pc(f.shareLast)} to ${pc(f.shareNow)}; sales growth ${pc(f.salesGrowth)}.` : '',
    v.relative === null ? '' : `Relative market share: ${fmtNumber(v.relative, 2)} (against ${v.rival?.name ?? 'the largest rival'}).`,
    `Customer lifetime value (enrichment): ${money(v.clv.clv, s.symbol)} per customer; acquisition cost ${money(s.clv.cac, s.symbol)}.`,
  ];
  return lines.filter(Boolean).join('\n');
}
