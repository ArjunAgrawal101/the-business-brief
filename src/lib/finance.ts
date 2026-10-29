/**
 * Finance Desk: the platform's calculations.
 *
 * These pure functions are the single source of truth for every number the
 * platform computes: the worked examples on topic pages, the live calculators,
 * the figures in the teaching cases and the answers to practice questions. The
 * same module runs at build time and in the browser. Each function is checked
 * in tests/unit/finance.test.ts against values worked out by hand.
 *
 * Classroom model, stated plainly: price and variable cost per unit are
 * constant over the range considered, fixed costs are fixed within that range,
 * and every unit produced is sold. Real businesses rarely satisfy all three.
 */
import { expectedValueWorking } from './decision-tree';
import { fmtMoney, fmtNumber, fmtPercent, round, roundUp, units } from './format';
import { ratioWorkings } from './ratios';

/* ------------------------------------------------------------------ */
/* Core arithmetic                                                     */
/* ------------------------------------------------------------------ */

export const totalRevenue = (price: number, quantity: number): number => price * quantity;

export const totalVariableCost = (variableCostPerUnit: number, quantity: number): number => variableCostPerUnit * quantity;

export const totalCost = (fixedCosts: number, variableCostPerUnit: number, quantity: number): number =>
  fixedCosts + variableCostPerUnit * quantity;

export const contributionPerUnit = (price: number, variableCostPerUnit: number): number => price - variableCostPerUnit;

export const totalContribution = (price: number, variableCostPerUnit: number, quantity: number): number =>
  (price - variableCostPerUnit) * quantity;

export const profit = (price: number, variableCostPerUnit: number, fixedCosts: number, quantity: number): number =>
  (price - variableCostPerUnit) * quantity - fixedCosts;

export const averageCost = (total: number, quantity: number): number | null => (quantity > 0 ? total / quantity : null);

/** Exact break-even quantity, or null when each unit does not cover its own variable cost. */
export function breakEvenExact(fixedCosts: number, price: number, variableCostPerUnit: number): number | null {
  const c = price - variableCostPerUnit;
  if (!(c > 0) || fixedCosts < 0) return null;
  return fixedCosts / c;
}

/**
 * Break-even output in whole units: the smallest whole number of units at which
 * the business makes no loss. It is the exact figure rounded up, because one
 * unit fewer would leave a loss.
 */
export function breakEvenUnits(fixedCosts: number, price: number, variableCostPerUnit: number): number | null {
  const exact = breakEvenExact(fixedCosts, price, variableCostPerUnit);
  if (exact === null) return null;
  return Math.ceil(round(exact, 9));
}

/** Break-even revenue = break-even quantity (exact) x price. */
export function breakEvenRevenue(fixedCosts: number, price: number, variableCostPerUnit: number): number | null {
  const exact = breakEvenExact(fixedCosts, price, variableCostPerUnit);
  return exact === null ? null : exact * price;
}

/** Margin of safety in units: forecast or actual output minus break-even output (whole units). */
export function marginOfSafety(output: number, fixedCosts: number, price: number, variableCostPerUnit: number): number | null {
  const beq = breakEvenUnits(fixedCosts, price, variableCostPerUnit);
  return beq === null ? null : output - beq;
}

/** Output needed to earn a target profit, in whole units (rounded up). */
export function targetProfitOutput(fixedCosts: number, targetProfit: number, price: number, variableCostPerUnit: number): number | null {
  const c = price - variableCostPerUnit;
  if (!(c > 0)) return null;
  return Math.ceil(round((fixedCosts + targetProfit) / c, 9));
}

/** Price needed to earn a target profit at a given output (exact). */
export function targetPriceExact(fixedCosts: number, targetProfit: number, variableCostPerUnit: number, quantity: number): number | null {
  if (!(quantity > 0)) return null;
  return (fixedCosts + targetProfit) / quantity + variableCostPerUnit;
}

/** Labour turnover as a percentage of the average number of employees. */
export function labourTurnover(leavers: number, averageEmployees: number): number | null {
  if (!(averageEmployees > 0)) return null;
  return (leavers / averageEmployees) * 100;
}

export function percentChange(from: number, to: number): number | null {
  if (from === 0) return null;
  return ((to - from) / Math.abs(from)) * 100;
}

/**
 * A special order judged on contribution: the change in profit from accepting
 * an order at a given price, if there is spare capacity and regular sales are
 * unaffected. Extra fixed costs are any costs incurred only because of the order.
 */
export function specialOrderGain(orderPrice: number, variableCostPerUnit: number, quantity: number, extraFixedCosts = 0): number {
  return (orderPrice - variableCostPerUnit) * quantity - extraFixedCosts;
}

/* ------------------------------------------------------------------ */
/* Unit costs built from a cost ledger                                 */
/* ------------------------------------------------------------------ */

export interface CostLine {
  label: string;
  /** Fixed amount per period. */
  fixed?: number;
  /** Variable amount per unit. */
  perUnit?: number;
  /** Variable amount as a share of the selling price (card and platform fees). */
  shareOfPrice?: number;
}

/** Variable cost per unit at a given price, including costs that scale with price. */
export function variableCostAtPrice(lines: CostLine[], price: number): number {
  return lines.reduce((sum, l) => sum + (l.perUnit ?? 0) + (l.shareOfPrice ?? 0) * price, 0);
}

export function fixedCostTotal(lines: CostLine[]): number {
  return lines.reduce((sum, l) => sum + (l.fixed ?? 0), 0);
}

/* ------------------------------------------------------------------ */
/* Worked solutions: the eight-part presentation                        */
/* ------------------------------------------------------------------ */

export interface Labels {
  /** Singular unit of output, for example "mug". */
  unit: string;
  /** Plural, for example "mugs". */
  units: string;
  /** Accounting period, for example "month". */
  period: string;
}

export interface Working {
  given: Array<{ label: string; value: string }>;
  formula: string;
  substitution: string;
  steps: string[];
  answer: string;
  value: number | null;
  unit: string;
  note?: string;
  error?: string;
}

const DEFAULT_LABELS: Labels = { unit: 'unit', units: 'units', period: 'period' };

type Inputs = Record<string, number>;

function need<K extends string[]>(inputs: Inputs, ...keys: K): { [I in keyof K]: number } {
  return keys.map((k) => {
    const v = inputs[k];
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`Missing or invalid input "${k}"`);
    return v;
  }) as { [I in keyof K]: number };
}

const m2 = (v: number, s: string) => fmtMoney(v, s, 2);
const m0 = (v: number, s: string) => fmtMoney(v, s, Number.isInteger(v) ? 0 : 2);

export type WorkingBuilder = (inputs: Inputs, currency: string, labels?: Labels) => Working;

export const workings: Record<string, WorkingBuilder> = {
  'contribution-per-unit': (inputs, s, labels = DEFAULT_LABELS) => {
    const [p, vc] = need(inputs, 'price', 'variableCost');
    const c = contributionPerUnit(p, vc);
    return {
      given: [
        { label: `Selling price per ${labels.unit}`, value: m2(p, s) },
        { label: `Variable cost per ${labels.unit}`, value: m2(vc, s) },
      ],
      formula: 'Contribution per unit = selling price per unit − variable cost per unit',
      substitution: `= ${m2(p, s)} − ${m2(vc, s)}`,
      steps: [`${fmtNumber(p, 2)} − ${fmtNumber(vc, 2)} = ${fmtNumber(c, 2)}`],
      answer: m2(c, s),
      value: round(c, 2),
      unit: `${s.trim() || 'currency'} per ${labels.unit}`,
    };
  },

  'total-contribution': (inputs, s, labels = DEFAULT_LABELS) => {
    const [p, vc, q] = need(inputs, 'price', 'variableCost', 'quantity');
    const c = contributionPerUnit(p, vc);
    const tc = totalContribution(p, vc, q);
    return {
      given: [
        { label: `Selling price per ${labels.unit}`, value: m2(p, s) },
        { label: `Variable cost per ${labels.unit}`, value: m2(vc, s) },
        { label: `Output per ${labels.period}`, value: `${fmtNumber(q)} ${units(q, labels.unit, labels.units)}` },
      ],
      formula: 'Total contribution = contribution per unit × number of units sold',
      substitution: `= (${m2(p, s)} − ${m2(vc, s)}) × ${fmtNumber(q)}`,
      steps: [`Contribution per unit = ${fmtNumber(p, 2)} − ${fmtNumber(vc, 2)} = ${fmtNumber(c, 2)}`, `${fmtNumber(c, 2)} × ${fmtNumber(q)} = ${fmtNumber(tc, 2)}`],
      answer: m0(round(tc, 2), s),
      value: round(tc, 2),
      unit: `${s.trim() || 'currency'} per ${labels.period}`,
    };
  },

  'total-cost': (inputs, s, labels = DEFAULT_LABELS) => {
    const [fc, vc, q] = need(inputs, 'fixedCosts', 'variableCost', 'quantity');
    const t = totalCost(fc, vc, q);
    return {
      given: [
        { label: `Fixed costs per ${labels.period}`, value: m0(fc, s) },
        { label: `Variable cost per ${labels.unit}`, value: m2(vc, s) },
        { label: `Output per ${labels.period}`, value: `${fmtNumber(q)} ${units(q, labels.unit, labels.units)}` },
      ],
      formula: 'Total cost = total fixed costs + (variable cost per unit × output)',
      substitution: `= ${m0(fc, s)} + (${m2(vc, s)} × ${fmtNumber(q)})`,
      steps: [`Total variable cost = ${fmtNumber(vc, 2)} × ${fmtNumber(q)} = ${fmtNumber(vc * q, 2)}`, `${fmtNumber(fc, 2)} + ${fmtNumber(vc * q, 2)} = ${fmtNumber(t, 2)}`],
      answer: m0(round(t, 2), s),
      value: round(t, 2),
      unit: `${s.trim() || 'currency'} per ${labels.period}`,
    };
  },

  'total-revenue': (inputs, s, labels = DEFAULT_LABELS) => {
    const [p, q] = need(inputs, 'price', 'quantity');
    const r = totalRevenue(p, q);
    return {
      given: [
        { label: `Selling price per ${labels.unit}`, value: m2(p, s) },
        { label: `Sales per ${labels.period}`, value: `${fmtNumber(q)} ${units(q, labels.unit, labels.units)}` },
      ],
      formula: 'Total revenue = selling price per unit × quantity sold',
      substitution: `= ${m2(p, s)} × ${fmtNumber(q)}`,
      steps: [`${fmtNumber(p, 2)} × ${fmtNumber(q)} = ${fmtNumber(r, 2)}`],
      answer: m0(round(r, 2), s),
      value: round(r, 2),
      unit: `${s.trim() || 'currency'} per ${labels.period}`,
    };
  },

  profit: (inputs, s, labels = DEFAULT_LABELS) => {
    const [p, vc, fc, q] = need(inputs, 'price', 'variableCost', 'fixedCosts', 'quantity');
    const r = totalRevenue(p, q);
    const t = totalCost(fc, vc, q);
    const pr = r - t;
    return {
      given: [
        { label: `Selling price per ${labels.unit}`, value: m2(p, s) },
        { label: `Variable cost per ${labels.unit}`, value: m2(vc, s) },
        { label: `Fixed costs per ${labels.period}`, value: m0(fc, s) },
        { label: `Sales per ${labels.period}`, value: `${fmtNumber(q)} ${units(q, labels.unit, labels.units)}` },
      ],
      formula: 'Profit = total revenue − total cost',
      substitution: `= (${m2(p, s)} × ${fmtNumber(q)}) − (${m0(fc, s)} + ${m2(vc, s)} × ${fmtNumber(q)})`,
      steps: [
        `Total revenue = ${fmtNumber(p, 2)} × ${fmtNumber(q)} = ${fmtNumber(r, 2)}`,
        `Total cost = ${fmtNumber(fc, 2)} + ${fmtNumber(vc * q, 2)} = ${fmtNumber(t, 2)}`,
        `${fmtNumber(r, 2)} − ${fmtNumber(t, 2)} = ${fmtNumber(pr, 2)}`,
      ],
      answer: m0(round(pr, 2), s),
      value: round(pr, 2),
      unit: `${s.trim() || 'currency'} per ${labels.period}`,
      note: pr < 0 ? 'A negative figure is a loss.' : undefined,
    };
  },

  'break-even-quantity': (inputs, s, labels = DEFAULT_LABELS) => {
    const [fc, p, vc] = need(inputs, 'fixedCosts', 'price', 'variableCost');
    const c = contributionPerUnit(p, vc);
    const base: Working = {
      given: [
        { label: `Fixed costs per ${labels.period}`, value: m0(fc, s) },
        { label: `Selling price per ${labels.unit}`, value: m2(p, s) },
        { label: `Variable cost per ${labels.unit}`, value: m2(vc, s) },
      ],
      formula: 'Break-even quantity = fixed costs ÷ contribution per unit',
      substitution: `= ${m0(fc, s)} ÷ (${m2(p, s)} − ${m2(vc, s)})`,
      steps: [],
      answer: '',
      value: null,
      unit: `${labels.units} per ${labels.period}`,
    };
    if (!(c > 0)) {
      return {
        ...base,
        steps: [`Contribution per unit = ${fmtNumber(p, 2)} − ${fmtNumber(vc, 2)} = ${fmtNumber(c, 2)}`],
        answer: 'No break-even point',
        error: 'Each unit sold does not cover its own variable cost, so selling more only deepens the loss. There is no break-even point at this price.',
      };
    }
    const exact = fc / c;
    const whole = breakEvenUnits(fc, p, vc) as number;
    const below = whole - 1;
    const lossBelow = profit(p, vc, fc, below);
    const steps = [`Contribution per unit = ${fmtNumber(p, 2)} − ${fmtNumber(vc, 2)} = ${fmtNumber(c, 2)}`, `${fmtNumber(fc, 2)} ÷ ${fmtNumber(c, 2)} = ${fmtNumber(exact, 2)}`];
    const isWhole = Math.abs(exact - Math.round(exact)) < 1e-9;
    return {
      ...base,
      steps,
      answer: `${fmtNumber(whole)} ${units(whole, labels.unit, labels.units)}`,
      value: whole,
      note: isWhole
        ? `The division is exact, so the business breaks even at exactly ${fmtNumber(whole)} ${labels.units}.`
        : `Rounded up, not to the nearest whole number: at ${fmtNumber(below)} ${units(below, labels.unit, labels.units)} the result would be a loss of ${fmtMoney(Math.abs(lossBelow), s, 2)}.`,
    };
  },

  'break-even-revenue': (inputs, s, labels = DEFAULT_LABELS) => {
    const [fc, p, vc] = need(inputs, 'fixedCosts', 'price', 'variableCost');
    const exact = breakEvenExact(fc, p, vc);
    const base: Working = {
      given: [
        { label: `Fixed costs per ${labels.period}`, value: m0(fc, s) },
        { label: `Selling price per ${labels.unit}`, value: m2(p, s) },
        { label: `Variable cost per ${labels.unit}`, value: m2(vc, s) },
      ],
      formula: 'Break-even revenue = break-even quantity × selling price per unit',
      substitution: `= (${m0(fc, s)} ÷ (${m2(p, s)} − ${m2(vc, s)})) × ${m2(p, s)}`,
      steps: [],
      answer: '',
      value: null,
      unit: `${s.trim() || 'currency'} per ${labels.period}`,
    };
    if (exact === null) {
      return { ...base, answer: 'No break-even point', error: 'Contribution per unit is zero or negative, so there is no break-even point.' };
    }
    const rev = exact * p;
    return {
      ...base,
      steps: [`Break-even quantity = ${fmtNumber(fc, 2)} ÷ ${fmtNumber(p - vc, 2)} = ${fmtNumber(exact, 4)}`, `${fmtNumber(exact, 4)} × ${fmtNumber(p, 2)} = ${fmtNumber(rev, 2)}`],
      answer: m2(round(rev, 2), s),
      value: round(rev, 2),
      note: 'The exact break-even quantity is used here, so the revenue is the point where total revenue equals total cost.',
    };
  },

  'margin-of-safety': (inputs, s, labels = DEFAULT_LABELS) => {
    const [fc, p, vc, q] = need(inputs, 'fixedCosts', 'price', 'variableCost', 'quantity');
    const beq = breakEvenUnits(fc, p, vc);
    const base: Working = {
      given: [
        { label: `Forecast sales per ${labels.period}`, value: `${fmtNumber(q)} ${units(q, labels.unit, labels.units)}` },
        { label: `Fixed costs per ${labels.period}`, value: m0(fc, s) },
        { label: `Selling price per ${labels.unit}`, value: m2(p, s) },
        { label: `Variable cost per ${labels.unit}`, value: m2(vc, s) },
      ],
      formula: 'Margin of safety = forecast (or actual) output − break-even output',
      substitution: `= ${fmtNumber(q)} − (${m0(fc, s)} ÷ (${m2(p, s)} − ${m2(vc, s)}))`,
      steps: [],
      answer: '',
      value: null,
      unit: `${labels.units} per ${labels.period}`,
    };
    if (beq === null) return { ...base, answer: 'Not defined', error: 'There is no break-even point, so there is no margin of safety.' };
    const mos = q - beq;
    const share = q > 0 ? (mos / q) * 100 : 0;
    return {
      ...base,
      steps: [
        `Break-even output = ${fmtNumber(fc, 2)} ÷ ${fmtNumber(p - vc, 2)} = ${fmtNumber(fc / (p - vc), 2)}, rounded up to ${fmtNumber(beq)}`,
        `${fmtNumber(q)} − ${fmtNumber(beq)} = ${fmtNumber(mos)}`,
        `As a share of forecast sales: ${fmtNumber(mos)} ÷ ${fmtNumber(q)} × 100 = ${fmtPercent(share)}`,
      ],
      answer: `${fmtNumber(mos)} ${units(mos, labels.unit, labels.units)}`,
      value: mos,
      note:
        mos < 0
          ? `Forecast sales are below break-even, so the figure is negative: the business is ${fmtNumber(Math.abs(mos))} ${units(mos, labels.unit, labels.units)} short of breaking even.`
          : `Sales could fall by ${fmtNumber(mos)} ${units(mos, labels.unit, labels.units)} (${fmtPercent(share)}) before the business makes a loss.`,
    };
  },

  'target-profit-output': (inputs, s, labels = DEFAULT_LABELS) => {
    const [fc, tp, p, vc] = need(inputs, 'fixedCosts', 'targetProfit', 'price', 'variableCost');
    const c = p - vc;
    const base: Working = {
      given: [
        { label: `Fixed costs per ${labels.period}`, value: m0(fc, s) },
        { label: `Target profit per ${labels.period}`, value: m0(tp, s) },
        { label: `Selling price per ${labels.unit}`, value: m2(p, s) },
        { label: `Variable cost per ${labels.unit}`, value: m2(vc, s) },
      ],
      formula: 'Target profit output = (fixed costs + target profit) ÷ contribution per unit',
      substitution: `= (${m0(fc, s)} + ${m0(tp, s)}) ÷ (${m2(p, s)} − ${m2(vc, s)})`,
      steps: [],
      answer: '',
      value: null,
      unit: `${labels.units} per ${labels.period}`,
    };
    if (!(c > 0)) return { ...base, answer: 'Not possible', error: 'Contribution per unit is zero or negative, so no level of output reaches the target.' };
    const exact = (fc + tp) / c;
    const whole = targetProfitOutput(fc, tp, p, vc) as number;
    return {
      ...base,
      steps: [`Contribution per unit = ${fmtNumber(p, 2)} − ${fmtNumber(vc, 2)} = ${fmtNumber(c, 2)}`, `(${fmtNumber(fc, 2)} + ${fmtNumber(tp, 2)}) ÷ ${fmtNumber(c, 2)} = ${fmtNumber(exact, 2)}`],
      answer: `${fmtNumber(whole)} ${units(whole, labels.unit, labels.units)}`,
      value: whole,
      note: Math.abs(exact - Math.round(exact)) < 1e-9 ? undefined : 'Rounded up, so that the target is reached rather than just missed.',
    };
  },

  /** Optional input: priceShare, the costs that are a share of the price (card fees), in per cent. */
  'target-price': (inputs, s, labels = DEFAULT_LABELS) => {
    const [fc, tp, vc, q] = need(inputs, 'fixedCosts', 'targetProfit', 'variableCost', 'quantity');
    const share = inputs.priceShare ?? 0;
    const exact = targetPriceExact(fc, tp, vc, q);
    const given = [
      { label: `Fixed costs per ${labels.period}`, value: m0(fc, s) },
      { label: `Target profit per ${labels.period}`, value: m0(tp, s) },
      { label: share ? `Variable cost per ${labels.unit}, excluding costs that are a share of the price` : `Variable cost per ${labels.unit}`, value: m2(vc, s) },
      { label: `Expected sales per ${labels.period}`, value: `${fmtNumber(q)} ${units(q, labels.unit, labels.units)}` },
    ];
    if (share) given.push({ label: 'Costs that are a share of the price', value: fmtPercent(share, share % 1 ? 1 : 0) });
    const base: Working = {
      given,
      formula: share
        ? 'Target price = ((fixed costs + target profit) ÷ expected sales + variable cost per unit) ÷ (1 − share of the price)'
        : 'Target price = ((fixed costs + target profit) ÷ expected sales) + variable cost per unit',
      substitution: share
        ? `= ((${m0(fc, s)} + ${m0(tp, s)}) ÷ ${fmtNumber(q)} + ${m2(vc, s)}) ÷ (1 − ${fmtNumber(share / 100, 2)})`
        : `= ((${m0(fc, s)} + ${m0(tp, s)}) ÷ ${fmtNumber(q)}) + ${m2(vc, s)}`,
      steps: [],
      answer: '',
      value: null,
      unit: `${s.trim() || 'currency'} per ${labels.unit}`,
    };
    if (exact === null) return { ...base, answer: 'Not defined', error: 'Expected sales must be above zero.' };
    if (share >= 100) return { ...base, answer: 'Not defined', error: 'Costs that are a share of the price must be below 100%.' };
    const raw = exact / (1 - share / 100);
    const price = roundUp(raw, 2);
    const steps = [`(${fmtNumber(fc, 2)} + ${fmtNumber(tp, 2)}) ÷ ${fmtNumber(q)} = ${fmtNumber((fc + tp) / q, 4)}`, `${fmtNumber((fc + tp) / q, 4)} + ${fmtNumber(vc, 2)} = ${fmtNumber(exact, 4)}`];
    if (share) steps.push(`${fmtNumber(exact, 4)} ÷ ${fmtNumber(1 - share / 100, 2)} = ${fmtNumber(raw, 4)}`);
    return {
      ...base,
      steps,
      answer: m2(price, s),
      value: price,
      note: share
        ? `Rounded up to the next cent. Dividing by ${fmtNumber(1 - share / 100, 2)} allows for the costs that rise with the price: at ${m2(price, s)} they are ${m2((price * share) / 100, s)} a ${labels.unit}.`
        : 'Rounded up to the next cent, so that the target profit is reached at the expected sales.',
    };
  },

  'labour-turnover': (inputs) => {
    const [leavers, avg] = need(inputs, 'leavers', 'averageEmployees');
    const lt = labourTurnover(leavers, avg);
    const base: Working = {
      given: [
        { label: 'Employees who left during the year', value: fmtNumber(leavers) },
        { label: 'Average number of employees', value: fmtNumber(avg) },
      ],
      formula: 'Labour turnover = (number of employees leaving ÷ average number of employees) × 100',
      substitution: `= (${fmtNumber(leavers)} ÷ ${fmtNumber(avg)}) × 100`,
      steps: [],
      answer: '',
      value: null,
      unit: 'per cent of the average workforce, per year',
    };
    if (lt === null) return { ...base, answer: 'Not defined', error: 'The average number of employees must be above zero.' };
    return {
      ...base,
      steps: [`${fmtNumber(leavers)} ÷ ${fmtNumber(avg)} = ${fmtNumber(leavers / avg, 4)}`, `${fmtNumber(leavers / avg, 4)} × 100 = ${fmtNumber(lt, 1)}`],
      answer: fmtPercent(lt, 1),
      value: round(lt, 1),
    };
  },

  'special-order': (inputs, s, labels = DEFAULT_LABELS) => {
    const [op, vc, q, extra] = need(inputs, 'orderPrice', 'variableCost', 'quantity', 'extraFixedCosts');
    const displaced = inputs.displaced ?? 0;
    const rc = inputs.regularContribution ?? 0;
    const lost = displaced * rc;
    const orderContribution = (op - vc) * q;
    const gain = specialOrderGain(op, vc, q, extra) - lost;
    const given = [
      { label: `Price offered per ${labels.unit}`, value: m2(op, s) },
      { label: `Variable cost per ${labels.unit}`, value: m2(vc, s) },
      { label: 'Order size', value: `${fmtNumber(q)} ${units(q, labels.unit, labels.units)}` },
      { label: 'Extra costs caused only by the order', value: m0(extra, s) },
    ];
    if (displaced > 0) {
      given.push(
        { label: 'Regular sales displaced', value: `${fmtNumber(displaced)} ${units(displaced, labels.unit, labels.units)}` },
        { label: `Contribution lost per displaced ${labels.unit}`, value: m2(rc, s) },
      );
    }
    const steps = [
      `Contribution per unit on the order = ${fmtNumber(op, 2)} − ${fmtNumber(vc, 2)} = ${fmtNumber(op - vc, 2)}`,
      `${fmtNumber(op - vc, 2)} × ${fmtNumber(q)} = ${fmtNumber(orderContribution, 2)}`,
    ];
    if (displaced > 0) {
      steps.push(`Contribution lost = ${fmtNumber(displaced)} × ${fmtNumber(rc, 2)} = ${fmtNumber(lost, 2)}`);
      steps.push(`${fmtNumber(orderContribution, 2)} − ${fmtNumber(extra, 2)} − ${fmtNumber(lost, 2)} = ${fmtNumber(gain, 2)}`);
    } else {
      steps.push(`${fmtNumber(orderContribution, 2)} − ${fmtNumber(extra, 2)} = ${fmtNumber(gain, 2)}`);
    }
    return {
      given,
      formula:
        displaced > 0
          ? 'Change in profit = (order price − variable cost per unit) × order size − extra fixed costs − contribution lost on displaced regular sales'
          : 'Change in profit = (order price − variable cost per unit) × order size − extra fixed costs',
      substitution:
        displaced > 0
          ? `= (${m2(op, s)} − ${m2(vc, s)}) × ${fmtNumber(q)} − ${m0(extra, s)} − ${fmtNumber(displaced)} × ${m2(rc, s)}`
          : `= (${m2(op, s)} − ${m2(vc, s)}) × ${fmtNumber(q)} − ${m0(extra, s)}`,
      steps,
      answer: m0(round(gain, 2), s),
      value: round(gain, 2),
      unit: `${s.trim() || 'currency'}, change in profit for the ${labels.period}`,
      note:
        displaced > 0
          ? 'Assumes the displaced regular sales are lost, not delayed, and that the lower price does not change what regular customers pay or buy.'
          : 'Valid only if there is spare capacity and the lower price does not change what regular customers pay or buy.',
    };
  },

  /** Inputs: cost, then p1 and x1, p2 and x2, and so on, for the outcomes at the chance node. */
  'expected-value': (inputs, s) => {
    const [cost] = need(inputs, 'cost');
    const outcomes = [];
    for (let k = 1; inputs[`p${k}`] !== undefined; k++) {
      const [p, x] = need(inputs, `p${k}`, `x${k}`);
      outcomes.push({ label: `Outcome ${k}`, probability: p, payoff: x });
    }
    return expectedValueWorking({ id: 'option', label: 'The option', cost, outcomes }, s, '');
  },

  /* Ratio analysis (3.5, 3.6) in src/lib/ratios.ts. */
  ...ratioWorkings,
};

export function buildWorking(id: string, inputs: Inputs, currency: string, labels?: Labels): Working {
  const fn = workings[id];
  if (!fn) throw new Error(`Unknown calculation "${id}"`);
  return fn(inputs, currency, labels);
}
