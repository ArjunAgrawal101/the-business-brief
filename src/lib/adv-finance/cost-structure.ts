/**
 * Break-even scenarios: two cost structures side by side, one with higher
 * fixed and lower variable costs than the other, at the same selling price.
 * For each: contribution, the break-even quantity and revenue, the margin of
 * safety, profit at the forecast and the degree of operating leverage; for the
 * pair: the indifference volume at which they earn the same profit, and which
 * earns more on either side of it.
 *
 * Standing against the IB course: break-even quantity, the margin of safety
 * and the effect of changes in price or cost are 5.5 (SL and HL, guide p. 34);
 * operating leverage, and cost to make against cost to buy, are 5.6 (HL,
 * p. 34), and contribution, which includes make or buy analysis, is an HL
 * toolkit tool (p. 14). The guide gives no formula for any of them. Comparing
 * whole cost structures and solving for the indifference volume is beyond the
 * course.
 *
 * Every break-even figure comes from src/lib/finance.ts, the functions the
 * Financial Laboratory and the Finance Desk use.
 */
import { breakEvenExact, breakEvenRevenue, breakEvenUnits, marginOfSafetyShare, operatingLeverage } from '../finance';
import { validateFields } from '../finance-lab/fields';
import type { FieldSpec, Problem, Raw } from '../finance-lab/types';

export interface Structure {
  name: string;
  fixedCosts: number;
  variableCost: number;
}

export interface CostStructureInput {
  price: number;
  forecast: number;
  capacity: number;
  a: Structure;
  b: Structure;
}

export interface StructureResult {
  structure: Structure;
  contribution: number;
  /** Contribution as a share of the price, in per cent. */
  contributionRatio: number;
  breakEven: number | null;
  breakEvenExact: number | null;
  breakEvenRevenue: number | null;
  marginOfSafety: number | null;
  marginOfSafetyShare: number | null;
  profitAtForecast: number;
  profitAtCapacity: number;
  /** Total contribution ÷ profit at the forecast; null at or below break-even. */
  operatingLeverage: number | null;
}

export function structureResult(s: Structure, price: number, forecast: number, capacity: number): StructureResult {
  const contribution = price - s.variableCost;
  const be = breakEvenUnits(s.fixedCosts, price, s.variableCost);
  const mos = be === null ? null : forecast - be;
  const profitAt = (q: number) => contribution * q - s.fixedCosts;
  return {
    structure: s,
    contribution,
    contributionRatio: price > 0 ? (contribution / price) * 100 : 0,
    breakEven: be,
    breakEvenExact: breakEvenExact(s.fixedCosts, price, s.variableCost),
    breakEvenRevenue: breakEvenRevenue(s.fixedCosts, price, s.variableCost),
    marginOfSafety: mos,
    marginOfSafetyShare: mos === null ? null : marginOfSafetyShare(forecast, mos),
    profitAtForecast: profitAt(forecast),
    profitAtCapacity: profitAt(capacity),
    operatingLeverage: operatingLeverage(contribution * forecast, profitAt(forecast)),
  };
}

export type Verdict =
  /** The two earn the same at every volume. */
  | { kind: 'same' }
  /** One earns more at every volume above zero. */
  | { kind: 'dominates'; better: 'a' | 'b' }
  /** They cross: `above` earns more above the volume, the other below it. */
  | { kind: 'crosses'; volume: number; above: 'a' | 'b' };

/**
 * The volume at which the two earn the same profit: the difference in fixed
 * costs divided by the difference in contribution per unit. Above it, the
 * structure with the higher contribution per unit earns more.
 */
export function indifference(a: Structure, b: Structure, price: number): Verdict {
  const ca = price - a.variableCost;
  const cb = price - b.variableCost;
  const dc = ca - cb;
  const df = a.fixedCosts - b.fixedCosts;
  if (Math.abs(dc) < 1e-12) {
    if (Math.abs(df) < 1e-9) return { kind: 'same' };
    return { kind: 'dominates', better: df < 0 ? 'a' : 'b' };
  }
  const q = df / dc;
  const above: 'a' | 'b' = dc > 0 ? 'a' : 'b';
  if (q <= 0) return { kind: 'dominates', better: above };
  return { kind: 'crosses', volume: q, above };
}

export interface ProfitRow {
  volume: number;
  label: string;
  a: number;
  b: number;
  base?: boolean;
}

/** Profit for each structure from 60% to 140% of the forecast, within capacity, and at capacity. */
export function profitTable(input: CostStructureInput): ProfitRow[] {
  const profit = (s: Structure, q: number) => (input.price - s.variableCost) * q - s.fixedCosts;
  // The forecast first, so that where two steps round to the same volume the forecast keeps its name.
  const volumes = [0, -40, -30, -20, -10, 10, 20, 30, 40].map((k) => ({ k, q: Math.round(input.forecast * (1 + k / 100)) })).filter((x) => x.q >= 0 && x.q <= input.capacity);
  const seen = new Set<number>();
  const rows: ProfitRow[] = [];
  for (const { k, q } of volumes) {
    if (seen.has(q)) continue;
    seen.add(q);
    rows.push({ volume: q, label: k === 0 ? 'the forecast' : `${k > 0 ? '+' : '−'}${Math.abs(k)}% on the forecast`, a: profit(input.a, q), b: profit(input.b, q), base: k === 0 });
  }
  if (!seen.has(input.capacity)) rows.push({ volume: input.capacity, label: 'capacity', a: profit(input.a, input.capacity), b: profit(input.b, input.capacity) });
  return rows.sort((x, y) => x.volume - y.volume);
}

export interface Comparison {
  input: CostStructureInput;
  a: StructureResult;
  b: StructureResult;
  verdict: Verdict;
  /** Which earns more at the forecast, or null when they earn the same. */
  betterAtForecast: 'a' | 'b' | null;
  /** How much more it earns there. */
  gapAtForecast: number;
  /** How far sales would have to move from the forecast, in per cent, for the other structure to earn more. */
  switchShare: number | null;
  table: ProfitRow[];
}

export function compareStructures(input: CostStructureInput): Comparison {
  const a = structureResult(input.a, input.price, input.forecast, input.capacity);
  const b = structureResult(input.b, input.price, input.forecast, input.capacity);
  const verdict = indifference(input.a, input.b, input.price);
  const gap = a.profitAtForecast - b.profitAtForecast;
  const betterAtForecast = Math.abs(gap) < 0.005 ? null : gap > 0 ? 'a' : 'b';
  const switchShare = verdict.kind === 'crosses' && input.forecast > 0 ? ((verdict.volume - input.forecast) / input.forecast) * 100 : null;
  return { input, a, b, verdict, betterAtForecast, gapAtForecast: Math.abs(gap), switchShare, table: profitTable(input) };
}

/* ------------------------------------------------------------------ */
/* The form                                                            */
/* ------------------------------------------------------------------ */

export const SHARED_FIELDS: FieldSpec[] = [
  { key: 'price', label: 'Selling price per {unit}', kind: 'money', min: 0, minExclusive: true, name: 'the selling price' },
  { key: 'forecast', label: 'Forecast sales per {period}', kind: 'count', min: 0, integer: true, name: 'forecast sales' },
  { key: 'capacity', label: 'Capacity per {period}', kind: 'count', min: 1, integer: true, name: 'capacity', hint: 'The most that can be made and sold in the period.' },
];

export const STRUCTURE_FIELDS: FieldSpec[] = [
  { key: 'fixedCosts', label: 'Fixed costs per {period}', kind: 'money', min: 0, name: 'the fixed costs' },
  { key: 'variableCost', label: 'Variable cost per {unit}', kind: 'money', min: 0, name: 'the variable cost per unit' },
];

export function validateCostStructures(raw: Raw): Problem[] {
  const out = [...validateFields(raw, SHARED_FIELDS), ...validateFields(raw, STRUCTURE_FIELDS, 'a.', ' for the first structure'), ...validateFields(raw, STRUCTURE_FIELDS, 'b.', ' for the second structure')];
  const f = raw.forecast;
  const c = raw.capacity;
  if (!out.some((p) => p.field === 'forecast' || p.field === 'capacity') && typeof f === 'number' && typeof c === 'number' && f > c) out.push({ field: 'forecast', message: 'Forecast sales cannot be more than capacity.' });
  return out;
}

export function costStructureInput(raw: Raw, names: { a: string; b: string }): CostStructureInput {
  const n = (k: string) => raw[k] ?? 0;
  return {
    price: n('price'),
    forecast: n('forecast'),
    capacity: n('capacity'),
    a: { name: names.a, fixedCosts: n('a.fixedCosts'), variableCost: n('a.variableCost') },
    b: { name: names.b, fixedCosts: n('b.fixedCosts'), variableCost: n('b.variableCost') },
  };
}
