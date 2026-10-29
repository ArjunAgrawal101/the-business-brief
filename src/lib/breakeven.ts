/**
 * The break-even model behind the Finance Desk workspace. One function derives
 * every figure from the inputs, using src/lib/finance.ts, so the page, the
 * chart and the working can never disagree with each other.
 */
import {
  breakEvenExact,
  breakEvenRevenue,
  breakEvenUnits,
  contributionPerUnit,
  profit,
  targetProfitOutput,
  totalCost,
  totalRevenue,
} from './finance';

export interface BreakEvenInputs {
  price: number;
  /** Variable cost per unit, excluding costs that are a share of the price. */
  variableCost: number;
  /** Costs that are a share of the price (card fees, commissions), in per cent. */
  priceShare: number;
  fixedCosts: number;
  quantity: number;
  targetProfit: number;
  capacity: number;
}

export interface BreakEvenModel {
  inputs: BreakEvenInputs;
  /** Variable cost per unit including the price-linked share. */
  unitVariableCost: number;
  contribution: number;
  hasBreakEven: boolean;
  beqExact: number | null;
  beq: number | null;
  beRevenue: number | null;
  mos: number | null;
  mosShare: number | null;
  profitAtForecast: number;
  revenueAtForecast: number;
  costAtForecast: number;
  targetOutput: number | null;
  targetWithinCapacity: boolean | null;
  forecastWithinCapacity: boolean;
  beqWithinCapacity: boolean | null;
}

export function unitVariableCost(i: Pick<BreakEvenInputs, 'variableCost' | 'priceShare' | 'price'>): number {
  return i.variableCost + (i.priceShare / 100) * i.price;
}

export function breakEvenModel(i: BreakEvenInputs): BreakEvenModel {
  const avc = unitVariableCost(i);
  const c = contributionPerUnit(i.price, avc);
  const exact = breakEvenExact(i.fixedCosts, i.price, avc);
  const beq = breakEvenUnits(i.fixedCosts, i.price, avc);
  const target = targetProfitOutput(i.fixedCosts, i.targetProfit, i.price, avc);
  return {
    inputs: i,
    unitVariableCost: avc,
    contribution: c,
    hasBreakEven: exact !== null,
    beqExact: exact,
    beq,
    beRevenue: breakEvenRevenue(i.fixedCosts, i.price, avc),
    mos: beq === null ? null : i.quantity - beq,
    mosShare: beq === null || i.quantity <= 0 ? null : ((i.quantity - beq) / i.quantity) * 100,
    profitAtForecast: profit(i.price, avc, i.fixedCosts, i.quantity),
    revenueAtForecast: totalRevenue(i.price, i.quantity),
    costAtForecast: totalCost(i.fixedCosts, avc, i.quantity),
    targetOutput: target,
    targetWithinCapacity: target === null ? null : target <= i.capacity,
    forecastWithinCapacity: i.quantity <= i.capacity,
    beqWithinCapacity: beq === null ? null : beq <= i.capacity,
  };
}

export type InputProblem = { field: keyof BreakEvenInputs; message: string };

/** Check inputs a person has typed; returns the problems, if any. */
export function validateInputs(i: Partial<Record<keyof BreakEvenInputs, number | null>>): InputProblem[] {
  const p: InputProblem[] = [];
  const need = (f: keyof BreakEvenInputs, label: string, opts: { min?: number; max?: number; allowNegative?: boolean } = {}) => {
    const v = i[f];
    if (v === null || v === undefined || !Number.isFinite(v)) return p.push({ field: f, message: `Enter a number for ${label}.` });
    if (!opts.allowNegative && v < 0) return p.push({ field: f, message: `${label[0]?.toUpperCase()}${label.slice(1)} cannot be negative.` });
    if (opts.min !== undefined && v < opts.min) return p.push({ field: f, message: `${label[0]?.toUpperCase()}${label.slice(1)} must be at least ${opts.min}.` });
    if (opts.max !== undefined && v > opts.max) return p.push({ field: f, message: `${label[0]?.toUpperCase()}${label.slice(1)} must be no more than ${opts.max}.` });
    return undefined;
  };
  need('price', 'the price', { min: 0.01 });
  need('variableCost', 'the variable cost');
  need('priceShare', 'the share of the price', { max: 100 });
  need('fixedCosts', 'fixed costs');
  need('quantity', 'forecast sales');
  need('targetProfit', 'the target profit', { allowNegative: true });
  need('capacity', 'capacity', { min: 1 });
  return p;
}

export interface Labels {
  unit: string;
  units: string;
  period: string;
}

/** Plain-language reading of the result: what it means, and what it implies. */
export function readBreakEven(m: BreakEvenModel, currency: string, l: Labels): { interpretation: string; implication: string } {
  const n = (v: number) => v.toLocaleString('en-GB', { maximumFractionDigits: 0 });
  const money = (v: number) => `${v < 0 ? '−' : ''}${currency}${Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const i = m.inputs;
  if (!m.hasBreakEven || m.beq === null || m.mos === null) {
    return {
      interpretation: `Each ${l.unit} costs ${money(m.unitVariableCost)} to make and sell, which is not less than its price of ${money(i.price)}. No level of sales covers the fixed costs.`,
      implication: `Raise the price or cut the variable cost per ${l.unit} before anything else: selling more only deepens the loss.`,
    };
  }
  const word = m.profitAtForecast >= 0 ? 'profit' : 'loss';
  const interpretation =
    m.mos >= 0
      ? `The business must sell ${n(m.beq)} ${l.units} a ${l.period} to cover its costs. At forecast sales of ${n(i.quantity)} it makes a ${word} of ${money(Math.abs(m.profitAtForecast))}, and sales could fall by ${n(m.mos)} ${l.units} (${(m.mosShare ?? 0).toFixed(1)}%) before it makes a loss.`
      : `The business must sell ${n(m.beq)} ${l.units} a ${l.period} to cover its costs. Forecast sales of ${n(i.quantity)} are ${n(Math.abs(m.mos))} ${l.units} short of that, so it makes a loss of ${money(Math.abs(m.profitAtForecast))}.`;
  const notes: string[] = [];
  if (m.mos < 0) notes.push('At this forecast the business needs more sales, a higher price or lower costs.');
  else if ((m.mosShare ?? 0) < 10) notes.push('Sales would only have to fall by about one in ten for the business to make a loss. That is a thin cushion.');
  else if ((m.mosShare ?? 0) < 25) notes.push(`The business could absorb a moderate fall in sales, but each ${l.unit} lost costs ${money(m.contribution)} of profit.`);
  else notes.push('There is a comfortable cushion: sales could fall by a quarter or more before a loss.');
  if (m.beqWithinCapacity === false) notes.push(`Break-even is above capacity (${n(i.capacity)}), so the business cannot break even without more capacity.`);
  else if (!m.forecastWithinCapacity) notes.push(`The forecast is above capacity (${n(i.capacity)}), so it cannot all be made.`);
  if (m.targetOutput !== null && m.targetWithinCapacity === false) notes.push(`The target profit needs ${n(m.targetOutput)} ${l.units}, more than the ${n(i.capacity)} that can be made.`);
  return { interpretation, implication: notes.join(' ') };
}
