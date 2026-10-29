/**
 * Finance Desk: investment appraisal, subtopic 3.8. Payback period and the
 * average rate of return (ARR) are SL and HL; net present value (NPV) is HL
 * only (guide, p. 30).
 *
 * ARR and NPV use the formulas on the guide's formula sheet (p. 65), and NPV
 * uses the guide's own four-decimal discount factors (p. 66), not factors
 * computed afresh, so that every answer matches one worked with the table.
 * The guide's formula sheet gives no formula for payback; the method here is
 * the standard one, assuming each year's net cash flow arrives evenly through
 * the year. tests/unit/investment.test.ts checks every figure by hand.
 */
import type { Working, WorkingBuilder } from './finance';
import { fmtMoney, fmtNumber, round } from './format';

/**
 * Discount factors from the Business management guide, p. 66 (HL only), years
 * 1 to 10, exactly as printed. One printed factor differs from the formula:
 * 6% in year 8 is 0.6271, where 1 ÷ 1.06^8 is 0.6274 to four places. The
 * printed figure is kept, because it is the table an examination provides.
 */
export const DISCOUNT_TABLE = {
  4: [0.9615, 0.9246, 0.889, 0.8548, 0.8219, 0.7903, 0.7599, 0.7307, 0.7026, 0.6756],
  6: [0.9434, 0.89, 0.8396, 0.7921, 0.7473, 0.705, 0.6651, 0.6271, 0.5919, 0.5584],
  8: [0.9259, 0.8573, 0.7938, 0.735, 0.6806, 0.6302, 0.5835, 0.5403, 0.5002, 0.4632],
  10: [0.9091, 0.8264, 0.7513, 0.683, 0.6209, 0.5645, 0.5132, 0.4665, 0.4241, 0.3855],
  20: [0.8333, 0.6944, 0.5787, 0.4823, 0.4019, 0.3349, 0.2791, 0.2326, 0.1938, 0.1615],
} as const;

export const RATES = [4, 6, 8, 10, 20] as const;
export type Rate = (typeof RATES)[number];
export const MAX_YEARS = 10;

export const isRate = (r: number): r is Rate => (RATES as readonly number[]).includes(r);

/** The guide's discount factor for a rate and a year (1 to 10). */
export function discountFactor(rate: Rate, year: number): number {
  const f = DISCOUNT_TABLE[rate][year - 1];
  if (f === undefined) throw new Error(`The guide's discount table covers years 1 to ${MAX_YEARS}, not year ${year}`);
  return f;
}

export interface Project {
  id: string;
  label: string;
  /** The capital cost, paid at the start (year 0). */
  capitalCost: number;
  /** Net cash flow (returns) in each year of use, years 1 to n. */
  returns: number[];
}

/* ------------------------------------------------------------------ */
/* Payback                                                             */
/* ------------------------------------------------------------------ */

export interface Payback {
  /** Whole years before the year in which the cost is recovered. */
  years: number;
  /** Months into the payback year, assuming cash arrives evenly through it. */
  months: number;
  /** The payback period in years, for example 2.5. */
  total: number;
  /** The year in which the cost is recovered (1-based). */
  inYear: number;
}

/** Cumulative net cash flow at the end of each year, starting with year 0 (the capital cost). */
export function cumulative(p: Project): number[] {
  const out = [-p.capitalCost];
  p.returns.forEach((r, i) => out.push((out[i] ?? 0) + r));
  return out;
}

/** The payback period, or null if the cost is not recovered within the project's life. */
export function payback(p: Project): Payback | null {
  if (!(p.capitalCost > 0)) return null;
  const cum = cumulative(p);
  for (let t = 1; t < cum.length; t++) {
    const before = cum[t - 1] ?? 0;
    const after = cum[t] ?? 0;
    if (after >= -1e-9) {
      const flow = p.returns[t - 1] ?? 0;
      const outstanding = -before;
      const share = outstanding <= 1e-9 ? 0 : outstanding / flow;
      const months = round(share * 12, 6);
      if (months >= 12 - 1e-9) return { years: t, months: 0, total: t, inYear: t };
      return { years: t - 1, months, total: round(t - 1 + share, 6), inYear: t };
    }
  }
  return null;
}

/** "4 years", "2 years and 6 months", "3 years and 4.8 months", "11 months". */
export function fmtPayback(pb: Payback | null): string {
  if (!pb) return 'Not within its life';
  const mRounded = round(pb.months, 1);
  const years = mRounded >= 12 ? pb.years + 1 : pb.years;
  const y = years === 0 ? '' : `${years} ${years === 1 ? 'year' : 'years'}`;
  if (mRounded < 0.05 || mRounded >= 12) return y || '0 months';
  const m = `${fmtNumber(mRounded, Number.isInteger(mRounded) ? 0 : 1)} ${mRounded === 1 ? 'month' : 'months'}`;
  return y ? `${y} and ${m}` : m;
}

/* ------------------------------------------------------------------ */
/* Average rate of return and net present value                        */
/* ------------------------------------------------------------------ */

export const totalReturns = (p: Project): number => p.returns.reduce((a, b) => a + b, 0);

/** ARR = ((total returns − capital cost) ÷ years of use) ÷ capital cost × 100 (guide, p. 65). */
export function arr(p: Project): number | null {
  const n = p.returns.length;
  if (!(p.capitalCost > 0) || n === 0) return null;
  return ((totalReturns(p) - p.capitalCost) / n / p.capitalCost) * 100;
}

/** Present value of each year's return, with the guide's factors. */
export function presentValues(p: Project, rate: Rate): number[] {
  return p.returns.map((r, i) => r * discountFactor(rate, i + 1));
}

/** NPV = Σ present values of returns − original cost (guide, p. 65). */
export function npv(p: Project, rate: Rate): number | null {
  if (p.returns.length === 0 || p.returns.length > MAX_YEARS) return null;
  return presentValues(p, rate).reduce((a, b) => a + b, 0) - p.capitalCost;
}

export interface Appraisal {
  project: Project;
  payback: Payback | null;
  arr: number | null;
  npv: number | null;
  cumulative: number[];
  presentValues: number[];
}

export function appraise(p: Project, rate: Rate): Appraisal {
  return { project: p, payback: payback(p), arr: arr(p), npv: npv(p, rate), cumulative: cumulative(p), presentValues: presentValues(p, rate) };
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export interface InputProblem {
  field: string;
  message: string;
}

export function validateProject(p: { id: string; capitalCost: number | null; returns: Array<number | null> }): InputProblem[] {
  const out: InputProblem[] = [];
  if (p.capitalCost === null) out.push({ field: `${p.id}-cost`, message: 'Enter a number.' });
  else if (!(p.capitalCost > 0)) out.push({ field: `${p.id}-cost`, message: 'The capital cost must be above zero.' });
  p.returns.forEach((r, i) => {
    if (r === null) out.push({ field: `${p.id}-r${i + 1}`, message: 'Enter a number (0 if there is no return that year).' });
  });
  if (p.returns.length > MAX_YEARS) out.push({ field: `${p.id}-cost`, message: `The guide's discount table covers ${MAX_YEARS} years.` });
  return out;
}

/* ------------------------------------------------------------------ */
/* Worked solutions                                                    */
/* ------------------------------------------------------------------ */

type Inputs = Record<string, number>;

/** Reads cost and r1, r2 ... from a working's inputs. */
export function projectFromInputs(inputs: Inputs, id = 'project', labelText = 'The project'): Project {
  const cost = inputs.cost;
  if (typeof cost !== 'number' || !Number.isFinite(cost)) throw new Error('Missing or invalid input "cost"');
  const returns: number[] = [];
  for (let k = 1; inputs[`r${k}`] !== undefined; k++) {
    const r = inputs[`r${k}`];
    if (typeof r !== 'number' || !Number.isFinite(r)) throw new Error(`Missing or invalid input "r${k}"`);
    returns.push(r);
  }
  if (returns.length === 0) throw new Error('At least one year of returns ("r1") is needed');
  return { id, label: labelText, capitalCost: cost, returns };
}

/** Project inputs in the form the working builders take: cost, r1, r2 ... */
export function projectInputs(p: Project, rate?: Rate): Inputs {
  const out: Inputs = { cost: p.capitalCost };
  p.returns.forEach((r, i) => (out[`r${i + 1}`] = r));
  if (rate !== undefined) out.rate = rate;
  return out;
}

const mon = (v: number, s: string) => fmtMoney(v, s, Number.isInteger(round(v, 2)) ? 0 : 2);
const num = (v: number) => fmtNumber(v, Number.isInteger(round(v, 2)) ? 0 : 2);

function givenFor(p: Project, s: string) {
  return [
    { label: 'Capital cost (year 0)', value: mon(p.capitalCost, s) },
    ...p.returns.map((r, i) => ({ label: `Net cash flow, year ${i + 1}`, value: mon(r, s) })),
  ];
}

export const investmentWorkings: Record<'payback-period' | 'average-rate-of-return' | 'net-present-value', WorkingBuilder> = {
  'payback-period': (inputs, s) => {
    const p = projectFromInputs(inputs);
    const cum = cumulative(p);
    const pb = payback(p);
    const base = {
      given: givenFor(p, s),
      formula: 'Payback period = years before the cost is recovered + (amount still to recover ÷ net cash flow in the payback year) × 12 months',
      unit: 'years and months',
    };
    const cumSteps = cum.slice(1).map((c, i) => `End of year ${i + 1}: ${mon(cum[i] ?? 0, s)} + ${mon(p.returns[i] ?? 0, s)} = ${mon(c, s)}`);
    if (!pb) {
      return {
        ...base,
        substitution: '= no payback: the cumulative net cash flow never reaches zero',
        steps: cumSteps,
        answer: 'Not within its life',
        value: null,
        error: 'The returns never add up to the capital cost, so the project does not pay back within its life.',
      };
    }
    const before = cum[pb.inYear - 1] ?? 0;
    const flow = p.returns[pb.inYear - 1] ?? 0;
    const exactYear = Math.abs(pb.months) < 1e-9;
    const steps = [...cumSteps.slice(0, pb.inYear)];
    if (!exactYear) {
      steps.push(`Still to recover at the start of year ${pb.inYear}: ${mon(-before, s)}`);
      steps.push(`${num(-before)} ÷ ${num(flow)} = ${fmtNumber(-before / flow, 4)} of year ${pb.inYear}`);
      steps.push(`${fmtNumber(-before / flow, 4)} × 12 = ${fmtNumber(pb.months, 2)} months`);
    }
    return {
      ...base,
      substitution: exactYear
        ? `= ${pb.years} ${pb.years === 1 ? 'year' : 'years'}: the cumulative net cash flow reaches zero exactly at the end of year ${pb.years}`
        : `= ${pb.years} ${pb.years === 1 ? 'year' : 'years'} + (${num(-before)} ÷ ${num(flow)}) × 12 months`,
      steps,
      answer: fmtPayback(pb),
      value: round(pb.total, 4),
      note: exactYear
        ? undefined
        : 'Assumes the year’s cash arrives evenly through the year. If an answer must be in whole months, round up: the cost is recovered during that month.',
    } satisfies Working;
  },

  'average-rate-of-return': (inputs, s) => {
    const p = projectFromInputs(inputs);
    const n = p.returns.length;
    const tr = totalReturns(p);
    const v = arr(p);
    const base = {
      given: givenFor(p, s),
      formula: 'ARR = ((total returns − capital cost) ÷ years of use) ÷ capital cost × 100',
      substitution: `= ((${num(tr)} − ${num(p.capitalCost)}) ÷ ${n}) ÷ ${num(p.capitalCost)} × 100`,
      unit: 'per cent of the capital cost, per year',
    };
    if (v === null) return { ...base, steps: [], answer: 'Not defined', value: null, error: 'The capital cost must be above zero.' };
    const profit = tr - p.capitalCost;
    return {
      ...base,
      steps: [
        `Total returns = ${p.returns.map(num).join(' + ')} = ${num(tr)}`,
        `Total profit = ${num(tr)} − ${num(p.capitalCost)} = ${num(profit)}`,
        `Average profit a year = ${num(profit)} ÷ ${n} = ${fmtNumber(profit / n, 2)}`,
        `${fmtNumber(profit / n, 2)} ÷ ${num(p.capitalCost)} × 100 = ${fmtNumber(v, 2)}`,
      ],
      answer: `${fmtNumber(v, 2)}%`,
      value: round(v, 2),
      note: v < 0 ? 'A negative ARR means the returns do not cover the capital cost over the project’s life.' : undefined,
    };
  },

  'net-present-value': (inputs, s) => {
    const p = projectFromInputs(inputs);
    const rateIn = inputs.rate;
    const base = {
      given: [...givenFor(p, s), { label: 'Discount rate', value: rateIn === undefined ? 'missing' : `${rateIn}%` }],
      formula: 'NPV = sum of the present values of the returns − original cost',
      unit: `${s.trim() || 'currency'}, in today’s money`,
    };
    if (rateIn === undefined || !isRate(rateIn)) {
      return { ...base, substitution: '', steps: [], answer: 'Not defined', value: null, error: 'Use one of the rates in the guide’s discount table: 4, 6, 8, 10 or 20%.' };
    }
    if (p.returns.length > MAX_YEARS) {
      return { ...base, substitution: '', steps: [], answer: 'Not defined', value: null, error: `The guide's discount table covers ${MAX_YEARS} years.` };
    }
    const pvs = presentValues(p, rateIn);
    const sum = pvs.reduce((a, b) => a + b, 0);
    const v = sum - p.capitalCost;
    return {
      ...base,
      substitution: `= (${p.returns.map((r, i) => `${num(r)} × ${discountFactor(rateIn, i + 1).toFixed(4)}`).join(' + ')}) − ${num(p.capitalCost)}`,
      steps: [
        ...p.returns.map((r, i) => `Year ${i + 1}: ${num(r)} × ${discountFactor(rateIn, i + 1).toFixed(4)} = ${num(pvs[i] ?? 0)}`),
        `Sum of present values = ${num(sum)}`,
        `${num(sum)} − ${num(p.capitalCost)} = ${num(v)}`,
      ],
      answer: mon(round(v, 2), s),
      value: round(v, 2),
      note: `Discount factors at ${rateIn}% from the guide's table (p. 66). ${v >= 0 ? 'A positive NPV means the returns are worth more, in today’s money, than the cost.' : 'A negative NPV means the returns are worth less, in today’s money, than the cost.'}`,
    };
  },
};

/* ------------------------------------------------------------------ */
/* Readings                                                            */
/* ------------------------------------------------------------------ */

export interface AppraisalReading {
  payback: string;
  arr: string;
  npv: string;
  /** Which project each method prefers (null when it cannot choose). */
  prefers: { payback: string | null; arr: string | null; npv: string | null };
  agreement: string;
}

const pct = (v: number) => `${fmtNumber(v, 2)}%`;

/** Compares two appraisals method by method, in words. `includeNpv` is false for SL. */
export function readAppraisals(a: Appraisal, b: Appraisal, rate: Rate, currency: string, includeNpv = true): AppraisalReading {
  const A = a.project.label;
  const B = b.project.label;
  const pa = a.payback?.total ?? Infinity;
  const pbv = b.payback?.total ?? Infinity;
  const prefPayback = pa === pbv ? null : pa < pbv ? A : B;
  const paybackText =
    a.payback === null && b.payback === null
      ? 'Neither project recovers its cost within its life.'
      : prefPayback === null
        ? `Both pay back in ${fmtPayback(a.payback)}.`
        : `${prefPayback} pays back first: ${fmtPayback(prefPayback === A ? a.payback : b.payback)}, against ${fmtPayback(prefPayback === A ? b.payback : a.payback)}.`;

  const ra = a.arr ?? -Infinity;
  const rb = b.arr ?? -Infinity;
  const prefArr = Math.abs(ra - rb) < 0.005 ? null : ra > rb ? A : B;
  const arrText =
    prefArr === null
      ? `Both have an ARR of ${pct(ra)}.`
      : `${prefArr} has the higher average rate of return: ${pct(prefArr === A ? ra : rb)} a year, against ${pct(prefArr === A ? rb : ra)}.`;

  const na = a.npv ?? -Infinity;
  const nb = b.npv ?? -Infinity;
  const prefNpv = Math.abs(na - nb) < 0.5 ? null : na > nb ? A : B;
  const m = (v: number) => fmtMoney(Math.round(v), currency, 0);
  let npvText: string;
  if (na < 0 && nb < 0) npvText = `At ${rate}%, neither project is worth its cost in today’s money: ${A} ${m(na)}, ${B} ${m(nb)}. ${prefNpv ? `${prefNpv} loses less.` : ''}`.trim();
  else if (prefNpv === null) npvText = `At ${rate}%, both add the same value in today’s money: ${m(na)}.`;
  else {
    const best = prefNpv === A ? na : nb;
    const other = prefNpv === A ? nb : na;
    const otherName = prefNpv === A ? B : A;
    npvText = `At ${rate}%, ${prefNpv} adds more value in today’s money: ${m(best)}, against ${m(other)} for ${otherName}${other < 0 ? ', which is not worth its cost at this rate' : ''}.`;
  }

  const prefs = [prefPayback, prefArr, ...(includeNpv ? [prefNpv] : [])].filter((x): x is string => x !== null);
  const unique = [...new Set(prefs)];
  let agreement: string;
  if (prefs.length === 0) agreement = 'The methods cannot separate the two projects on these figures.';
  else if (unique.length === 1) agreement = `The methods agree: each prefers ${unique[0]}. The decision still depends on what the figures leave out.`;
  else {
    const byPayback = prefPayback ? `payback prefers ${prefPayback}` : null;
    const others = [prefArr ? `ARR prefers ${prefArr}` : null, includeNpv && prefNpv ? `NPV prefers ${prefNpv}` : null].filter(Boolean);
    agreement = `The methods disagree: ${[byPayback, ...others].filter(Boolean).join('; ')}. That is the judgement to make: speed of recovery against the size of the return.`;
  }
  return { payback: paybackText, arr: arrText, npv: npvText, prefers: { payback: prefPayback, arr: prefArr, npv: includeNpv ? prefNpv : null }, agreement };
}
