/**
 * The capital budgeting comparator: net present value at any discount rate,
 * the internal rate of return, payback and discounted payback, the
 * profitability index, a sensitivity (tornado) analysis, and the weighted
 * average cost of capital with the cost of equity by the capital asset
 * pricing model.
 *
 * Standing against the IB course (guide, 3.8, p. 30; formula sheet p. 65,
 * discount table p. 66): payback and the average rate of return are SL and
 * HL, and NPV is HL, worked with the guide's table of discount factors at
 * five rates. Everything else here is beyond the course: NPV at any rate from
 * the formula 1 ÷ (1 + r)^t, the IRR, discounted payback, the profitability
 * index, the tornado and the WACC.
 *
 * The IRR is found without any formula for it, because none exists for more
 * than four years of cash flows. NPV is worked on a fine grid of rates from
 * −99% to 1,000%, every change of sign between neighbours is narrowed down by
 * bisection, and Descartes' rule of signs bounds how many rates there can be:
 * no more than the number of times the cash flows change sign. Bisection
 * cannot fail to converge, unlike Newton's method; its limit is the grid: a
 * rate outside the range, or one where NPV touches zero without crossing it,
 * is not found, and the result says so.
 */
import { validateFields } from '../finance-lab/fields';
import type { FieldSpec, Problem, Raw } from '../finance-lab/types';

export interface CapProject {
  name: string;
  /** Paid now, at the start of year one (year 0). */
  outlay: number;
  /** Net cash flow in each year from year one; negative where more goes out than comes in. */
  flows: number[];
}

export const MIN_PROJECTS = 2;
export const MAX_PROJECTS = 3;
export const MAX_YEARS = 15;
/** The search range for the internal rate of return, in per cent. */
export const IRR_RANGE = { low: -99, high: 1000 } as const;

/** Cash flows from year 0: the outlay as a negative, then each year. */
export const cashFlows = (p: CapProject): number[] => [-p.outlay, ...p.flows];

/** The discount factor 1 ÷ (1 + r)^t for a rate in per cent. */
export const discountFactor = (ratePct: number, year: number): number => 1 / (1 + ratePct / 100) ** year;

/** NPV of cash flows that start at year 0, at a rate in per cent. */
export function npvAt(flows0: readonly number[], ratePct: number): number {
  return flows0.reduce((s, cf, t) => s + cf * discountFactor(ratePct, t), 0);
}

/** How many times the cash flows change sign, ignoring years of zero. */
export function signChanges(flows0: readonly number[]): number {
  let n = 0;
  let last = 0;
  for (const cf of flows0) {
    if (cf === 0) continue;
    const s = Math.sign(cf);
    if (last !== 0 && s !== last) n += 1;
    last = s;
  }
  return n;
}

export type IrrStatus = 'none' | 'unique' | 'out-of-range' | 'multiple' | 'one-of-several' | 'none-found';

export interface IrrResult {
  status: IrrStatus;
  /** The rates found, in per cent, lowest first. */
  rates: number[];
  signChanges: number;
}

function bisect(f: (r: number) => number, a: number, b: number): number {
  let lo = a;
  let hi = b;
  let flo = f(lo);
  for (let k = 0; k < 300 && hi - lo > 1e-13 * Math.max(1, Math.abs(lo)); k++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (fm === 0) return mid;
    if (Math.sign(fm) === Math.sign(flo)) {
      lo = mid;
      flo = fm;
    } else hi = mid;
  }
  return (lo + hi) / 2;
}

/** The rates (as decimals) on the search grid: fine below 100%, coarser above. */
function grid(): number[] {
  const out: number[] = [];
  for (let k = 0; k <= 796; k++) out.push(-0.99 + k * 0.0025);
  for (let k = 1; k <= 450; k++) out.push(1 + k * 0.02);
  return out;
}
const GRID = grid();

/**
 * Every internal rate of return of a set of cash flows starting at year 0,
 * in per cent. With one change of sign there is exactly one, and the search
 * widens beyond the grid until it is bracketed; with none there is none; with
 * more than one there may be several, or none, and the grid finds those that
 * lie in its range.
 */
export function irr(flows0: readonly number[]): IrrResult {
  const changes = signChanges(flows0);
  if (changes === 0) return { status: 'none', rates: [], signChanges: 0 };
  const f = (r: number) => npvAt(flows0, r * 100);
  if (changes === 1) {
    const lo = -0.999999;
    const flo = f(lo);
    let hi = 10;
    while (Math.sign(f(hi)) === Math.sign(flo) && hi < 1e6) hi *= 4;
    if (Math.sign(f(hi)) === Math.sign(flo)) return { status: 'out-of-range', rates: [], signChanges: 1 };
    // Start from the grid's bracket where it has one, for a tighter search.
    let a = lo;
    let b = hi;
    for (let k = 1; k < GRID.length; k++) {
      const x0 = GRID[k - 1] as number;
      const x1 = GRID[k] as number;
      if (Math.sign(f(x0)) !== Math.sign(f(x1))) {
        a = x0;
        b = x1;
        break;
      }
    }
    return { status: 'unique', rates: [bisect(f, a, b) * 100], signChanges: 1 };
  }
  const roots: number[] = [];
  let x0 = GRID[0] as number;
  let f0 = f(x0);
  if (f0 === 0) roots.push(x0);
  for (let k = 1; k < GRID.length; k++) {
    const x1 = GRID[k] as number;
    const f1 = f(x1);
    if (f1 === 0) roots.push(x1);
    else if (f0 !== 0 && Math.sign(f0) !== Math.sign(f1)) roots.push(bisect(f, x0, x1));
    x0 = x1;
    f0 = f1;
  }
  const rates = roots.map((r) => r * 100).filter((r, i, all) => i === 0 || Math.abs(r - (all[i - 1] as number)) > 1e-6);
  return { status: rates.length >= 2 ? 'multiple' : rates.length === 1 ? 'one-of-several' : 'none-found', rates, signChanges: changes };
}

export interface Recovery {
  /** Years until the cumulative cash flow first reaches zero, with the cash of that year spread evenly through it; null if it never does. */
  years: number | null;
  /** The year in which it is reached (1-based), or 0 when nothing has to be recovered. */
  inYear: number | null;
  /** True when the cumulative cash flow falls below zero again afterwards. */
  fallsBack: boolean;
}

/** The point at which cumulative cash flow (from year 0) first reaches zero. */
export function recovery(flows0: readonly number[]): Recovery {
  let cum = flows0[0] ?? 0;
  if (cum >= 0) return { years: 0, inYear: 0, fallsBack: flows0.some((_, t) => flows0.slice(0, t + 1).reduce((a, b) => a + b, 0) < 0) };
  for (let t = 1; t < flows0.length; t++) {
    const flow = flows0[t] ?? 0;
    const next = cum + flow;
    if (next >= -1e-9) {
      const years = t - 1 + -cum / flow;
      let c = next;
      let fallsBack = false;
      for (let u = t + 1; u < flows0.length; u++) {
        c += flows0[u] ?? 0;
        if (c < -1e-9) fallsBack = true;
      }
      return { years, inYear: t, fallsBack };
    }
    cum = next;
  }
  return { years: null, inYear: null, fallsBack: false };
}

export const discountedFlows = (flows0: readonly number[], ratePct: number): number[] => flows0.map((cf, t) => cf * discountFactor(ratePct, t));

/** The present value of the cash flows after year 0, divided by the outlay. Some textbooks use NPV ÷ outlay instead, which is this less 1 and ranks projects the same way. */
export function profitabilityIndex(p: CapProject, ratePct: number): number | null {
  if (!(p.outlay > 0)) return null;
  return npvAt([0, ...p.flows], ratePct) / p.outlay;
}

export interface Appraisal {
  project: CapProject;
  rate: number;
  flows0: number[];
  presentValues: number[];
  /** The present value of the cash flows after year 0. */
  pv: number;
  npv: number;
  irr: IrrResult;
  payback: Recovery;
  discountedPayback: Recovery;
  pi: number | null;
  cumulative: number[];
  cumulativeDiscounted: number[];
}

const running = (xs: number[]): number[] => {
  let s = 0;
  return xs.map((x) => (s += x));
};

export function appraise(p: CapProject, ratePct: number): Appraisal {
  const flows0 = cashFlows(p);
  const presentValues = discountedFlows(flows0, ratePct);
  const npv = presentValues.reduce((a, b) => a + b, 0);
  return {
    project: p,
    rate: ratePct,
    flows0,
    presentValues,
    pv: npv + p.outlay,
    npv,
    irr: irr(flows0),
    payback: recovery(flows0),
    discountedPayback: recovery(presentValues),
    pi: profitabilityIndex(p, ratePct),
    cumulative: running(flows0),
    cumulativeDiscounted: running(presentValues),
  };
}

/* ------------------------------------------------------------------ */
/* Sensitivity                                                         */
/* ------------------------------------------------------------------ */

export type TornadoId = 'flows' | 'outlay' | 'rate' | 'life';

export interface TornadoItem {
  id: TornadoId;
  label: string;
  /** NPV with the estimate lower, and with it higher. */
  low: number;
  high: number;
  lowNote: string;
  highNote: string;
  /** How far apart the two NPVs are. */
  swing: number;
}

/**
 * One estimate at a time moved down and up by a share (0.1 for 10%) while the
 * rest stay as entered; the life moves by one year, the added year earning
 * what the last one did. Widest swing first.
 */
export function tornado(p: CapProject, ratePct: number, share: number): TornadoItem[] {
  const pct = Math.round(share * 100);
  const npvOf = (q: CapProject, r = ratePct) => npvAt(cashFlows(q), r);
  const scaled = (k: number): CapProject => ({ ...p, flows: p.flows.map((f) => f * k) });
  const lastFlow = p.flows[p.flows.length - 1] ?? 0;
  const items: TornadoItem[] = [
    { id: 'flows', label: 'Yearly cash flows', low: npvOf(scaled(1 - share)), high: npvOf(scaled(1 + share)), lowNote: `every year ${pct}% lower`, highNote: `every year ${pct}% higher`, swing: 0 },
    { id: 'outlay', label: 'Initial investment', low: npvOf({ ...p, outlay: p.outlay * (1 - share) }), high: npvOf({ ...p, outlay: p.outlay * (1 + share) }), lowNote: `${pct}% lower`, highNote: `${pct}% higher`, swing: 0 },
    { id: 'rate', label: 'Discount rate', low: npvOf(p, ratePct * (1 - share)), high: npvOf(p, ratePct * (1 + share)), lowNote: `${pct}% lower (${round2(ratePct * (1 - share))}%)`, highNote: `${pct}% higher (${round2(ratePct * (1 + share))}%)`, swing: 0 },
    { id: 'life', label: 'Life of the project', low: npvOf({ ...p, flows: p.flows.slice(0, -1) }), high: npvOf({ ...p, flows: [...p.flows, lastFlow] }), lowNote: 'one year shorter', highNote: 'one year longer', swing: 0 },
  ];
  for (const it of items) it.swing = Math.abs(it.high - it.low);
  return items.sort((a, b) => b.swing - a.swing);
}

const round2 = (v: number) => (Math.round(v * 100) / 100).toString();

/** How far the estimates can move before NPV reaches zero: every year's cash flow (per cent change) and the outlay (per cent change). */
export function breakEvenChanges(a: Appraisal): { flows: number | null; outlay: number | null } {
  return {
    flows: a.pv !== 0 ? (-a.npv / a.pv) * 100 : null,
    outlay: a.project.outlay > 0 ? (a.npv / a.project.outlay) * 100 : null,
  };
}

/* ------------------------------------------------------------------ */
/* The cost of capital                                                 */
/* ------------------------------------------------------------------ */

export interface WaccInputs {
  riskFree: number;
  beta: number;
  marketPremium: number;
  /** Before tax. */
  costOfDebt: number;
  taxRate: number;
  equityValue: number;
  debtValue: number;
}

export interface Wacc {
  /** By the capital asset pricing model: risk-free rate + beta × market risk premium. */
  costOfEquity: number;
  /** Cost of debt × (1 − tax rate). */
  afterTaxDebt: number;
  weightEquity: number;
  weightDebt: number;
  wacc: number;
}

export function costOfEquity(w: Pick<WaccInputs, 'riskFree' | 'beta' | 'marketPremium'>): number {
  return w.riskFree + w.beta * w.marketPremium;
}

/** The weighted average cost of capital, in per cent, with market-value weights; null when the values add up to nothing. */
export function wacc(w: WaccInputs): Wacc | null {
  const total = w.equityValue + w.debtValue;
  if (!(total > 0)) return null;
  const ke = costOfEquity(w);
  const kd = w.costOfDebt * (1 - w.taxRate / 100);
  const we = w.equityValue / total;
  const wd = w.debtValue / total;
  return { costOfEquity: ke, afterTaxDebt: kd, weightEquity: we, weightDebt: wd, wacc: we * ke + wd * kd };
}

/* ------------------------------------------------------------------ */
/* The form                                                            */
/* ------------------------------------------------------------------ */

export const WACC_FIELDS: FieldSpec[] = [
  { key: 'riskFree', label: 'Risk-free rate', kind: 'percent', min: -5, max: 30, name: 'the risk-free rate', hint: 'The return on government bonds, for example.' },
  { key: 'beta', label: 'Beta', kind: 'number', min: -3, max: 5, name: 'beta', hint: 'How much the shares move with the market; 1 is the market’s own risk.' },
  { key: 'marketPremium', label: 'Market risk premium', kind: 'percent', min: 0, max: 30, name: 'the market risk premium', hint: 'The extra return investors expect from shares over the risk-free rate.' },
  { key: 'costOfDebt', label: 'Cost of debt, before tax', kind: 'percent', min: 0, max: 50, name: 'the cost of debt' },
  { key: 'taxRate', label: 'Tax rate', kind: 'percent', min: 0, max: 100, name: 'the tax rate' },
  { key: 'equityValue', label: 'Market value of equity', kind: 'money', min: 0, name: 'the value of equity' },
  { key: 'debtValue', label: 'Market value of debt', kind: 'money', min: 0, name: 'the value of debt' },
];

export const OWN_RATE: FieldSpec = { key: 'ownRate', label: 'Your discount rate', kind: 'percent', min: 0, max: 99, name: 'the discount rate' };

export interface CapitalForm {
  projects: Array<{ name: string; outlay: number | null; flows: Array<number | null> }>;
  rateSource: 'wacc' | 'own';
  raw: Raw;
}

export function validateCapital(f: CapitalForm): Problem[] {
  const out: Problem[] = [];
  if (f.projects.length < MIN_PROJECTS || f.projects.length > MAX_PROJECTS) out.push({ field: 'p0.outlay', message: `Compare ${MIN_PROJECTS} or ${MAX_PROJECTS} projects.` });
  f.projects.forEach((p, i) => {
    const who = `project ${i + 1}`;
    if (p.outlay === null || !Number.isFinite(p.outlay)) out.push({ field: `p${i}.outlay`, message: `Enter a number for the initial investment in ${who}.` });
    else if (!(p.outlay > 0)) out.push({ field: `p${i}.outlay`, message: `The initial investment in ${who} must be more than zero.` });
    if (p.flows.length < 1 || p.flows.length > MAX_YEARS) out.push({ field: `p${i}.outlay`, message: `Give ${who} between 1 and ${MAX_YEARS} years of cash flows.` });
    p.flows.forEach((v, k) => {
      if (v === null || !Number.isFinite(v)) out.push({ field: `p${i}.r${k + 1}`, message: `Enter a number for year ${k + 1} of ${who} (0 if nothing, negative if more goes out than comes in).` });
    });
  });
  out.push(...validateFields(f.raw, WACC_FIELDS, 'w.'));
  if (f.rateSource === 'own') out.push(...validateFields(f.raw, [OWN_RATE]));
  if (!out.some((p) => p.field.startsWith('w.'))) {
    const w = waccFromRaw(f.raw);
    const r = wacc(w);
    if (r === null) out.push({ field: 'w.equityValue', message: 'The values of equity and debt cannot both be zero.' });
    else if (f.rateSource === 'wacc' && !(r.wacc >= 0 && r.wacc < 99)) out.push({ field: 'w.beta', message: `These inputs give a WACC of ${round2(r.wacc)}%; the discount rate must be between 0% and 99%.` });
  }
  return out;
}

export function waccFromRaw(raw: Raw): WaccInputs {
  const n = (k: string) => raw[`w.${k}`] ?? 0;
  return { riskFree: n('riskFree'), beta: n('beta'), marketPremium: n('marketPremium'), costOfDebt: n('costOfDebt'), taxRate: n('taxRate'), equityValue: n('equityValue'), debtValue: n('debtValue') };
}
