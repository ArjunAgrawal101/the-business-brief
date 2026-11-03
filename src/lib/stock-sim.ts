/**
 * The stock control simulator (5.6, HL): weeks of demand, a lead time, a
 * buffer, a reorder level and a reorder quantity, run week by week by
 * simulateStock in src/lib/operations.ts. This module adds what a plan costs
 * and where it fails: stock-outs, unmet demand, the share of demand met,
 * average stock, and the costs of holding, ordering and running out.
 *
 * Reorder level = buffer stock + usage per week × lead time and maximum
 * stock = buffer stock + reorder quantity are the standard forms the notes on
 * production planning give; the guide gives no formula for either.
 */
import { fmtMoney, fmtNumber } from './format';
import { maxStock, simulateStock, type StockRun } from './operations';

export interface StockCosts {
  /** Cost of holding one unit for one week. */
  holding: number;
  /** Cost of placing one order. */
  ordering: number;
  /** Cost of each unit of demand that cannot be met, such as lost contribution. */
  shortage: number;
}

export interface StockSimInputs {
  opening: number;
  /** Weeks between placing an order and receiving it. */
  leadTime: number;
  buffer: number;
  reorderLevel: number;
  reorderQty: number;
  /** Demand in each week, in units. */
  demand: number[];
  /** One order that arrives late: the nth order placed, by this many weeks. */
  late: { order: number; extraWeeks: number } | null;
  costs: StockCosts;
}

export interface StockSimResult {
  inputs: StockSimInputs;
  run: StockRun;
  weeks: number;
  averageDemand: number;
  /** Buffer + average weekly demand × lead time. */
  suggestedReorderLevel: number;
  maxStock: number;
  demandTotal: number;
  unmetTotal: number;
  /** Per cent of demand met from stock. */
  serviceLevel: number;
  stockOutWeeks: number[];
  /** Weeks that end below the buffer. */
  belowBufferWeeks: number[];
  /** Area under the stock line divided by the number of weeks. */
  averageStock: number;
  ordersPlaced: number;
  deliveries: number;
  holdingCost: number;
  orderingCost: number;
  shortageCost: number;
  totalCost: number;
}

export const MIN_WEEKS = 4;
export const MAX_WEEKS = 26;

/** Buffer stock + average usage per week × lead time in weeks. */
export function suggestedReorderLevel(buffer: number, demand: number[], leadTime: number): number {
  const avg = demand.length ? demand.reduce((a, b) => a + b, 0) / demand.length : 0;
  return buffer + avg * leadTime;
}

/** The area under a stock line made of straight segments, in unit-weeks. */
export function stockArea(points: Array<[number, number]>): number {
  let a = 0;
  for (let k = 1; k < points.length; k += 1) {
    const p = points[k - 1];
    const q = points[k];
    if (!p || !q) continue;
    a += ((p[1] + q[1]) / 2) * (q[0] - p[0]);
  }
  return a;
}

export function simulatePlan(i: StockSimInputs): StockSimResult {
  const weeks = i.demand.length;
  const usage = i.demand.map((d, k) => ({ from: k + 1, to: k + 1, usage: d }));
  const averageDemand = weeks ? i.demand.reduce((a, b) => a + b, 0) / weeks : 0;
  const plan = { usage: averageDemand, leadTime: i.leadTime, buffer: i.buffer, reorderQty: i.reorderQty, weeks };
  const run = simulateStock(plan, { usage, late: i.late && i.late.extraWeeks > 0 ? i.late : undefined }, { reorderLevel: i.reorderLevel, opening: i.opening });
  const demandTotal = i.demand.reduce((a, b) => a + b, 0);
  const unmetTotal = run.rows.reduce((a, r) => a + r.unmet, 0);
  const area = stockArea(run.points);
  const averageStock = weeks ? area / weeks : 0;
  const ordersPlaced = run.orders.length;
  const deliveries = run.rows.filter((r) => r.delivered > 0).reduce((n, r) => n + Math.round(r.delivered / i.reorderQty), 0);
  const holdingCost = area * i.costs.holding;
  const orderingCost = ordersPlaced * i.costs.ordering;
  const shortageCost = unmetTotal * i.costs.shortage;
  return {
    inputs: i,
    run,
    weeks,
    averageDemand,
    suggestedReorderLevel: suggestedReorderLevel(i.buffer, i.demand, i.leadTime),
    maxStock: maxStock(plan),
    demandTotal,
    unmetTotal,
    serviceLevel: demandTotal > 0 ? ((demandTotal - unmetTotal) / demandTotal) * 100 : 100,
    stockOutWeeks: run.rows.filter((r) => r.unmet > 1e-9).map((r) => r.week),
    belowBufferWeeks: run.rows.filter((r) => r.end < i.buffer - 1e-9).map((r) => r.week),
    averageStock,
    ordersPlaced,
    deliveries,
    holdingCost,
    orderingCost,
    shortageCost,
    totalCost: holdingCost + orderingCost + shortageCost,
  };
}

/* ---------- Checks ---------- */

export type StockField = 'opening' | 'leadTime' | 'buffer' | 'reorderLevel' | 'reorderQty' | 'holding' | 'ordering' | 'shortage' | 'lateOrder' | 'lateWeeks' | 'demand';

export interface StockProblem {
  field: StockField;
  /** For demand: the week, counting from 1. */
  week?: number;
  message: string;
}

export function validatePlan(raw: {
  opening: number | null;
  leadTime: number | null;
  buffer: number | null;
  reorderLevel: number | null;
  reorderQty: number | null;
  holding: number | null;
  ordering: number | null;
  shortage: number | null;
  demand: Array<number | null>;
  late: { order: number | null; extraWeeks: number | null } | null;
}): StockProblem[] {
  const out: StockProblem[] = [];
  const num = (field: StockField, v: number | null, opts: { positive?: boolean; max?: number; label?: string } = {}) => {
    if (v === null || !Number.isFinite(v)) out.push({ field, message: 'Enter a number.' });
    else if (v < 0) out.push({ field, message: 'Cannot be negative.' });
    else if (opts.positive && v <= 0) out.push({ field, message: `${opts.label ?? 'It'} must be more than zero.` });
    else if (opts.max !== undefined && v > opts.max) out.push({ field, message: `Use ${fmtNumber(opts.max)} or less here.` });
  };
  num('opening', raw.opening, { max: 1e7 });
  num('leadTime', raw.leadTime, { max: 8 });
  num('buffer', raw.buffer, { max: 1e7 });
  num('reorderLevel', raw.reorderLevel, { max: 1e7 });
  num('reorderQty', raw.reorderQty, { positive: true, max: 1e7, label: 'The reorder quantity' });
  num('holding', raw.holding, { max: 1e6 });
  num('ordering', raw.ordering, { max: 1e7 });
  num('shortage', raw.shortage, { max: 1e7 });
  if (raw.demand.length < MIN_WEEKS || raw.demand.length > MAX_WEEKS) out.push({ field: 'demand', message: `Plan between ${MIN_WEEKS} and ${MAX_WEEKS} weeks.` });
  raw.demand.forEach((d, k) => {
    if (d === null || !Number.isFinite(d)) out.push({ field: 'demand', week: k + 1, message: `Week ${k + 1}: enter a number.` });
    else if (d < 0) out.push({ field: 'demand', week: k + 1, message: `Week ${k + 1}: demand cannot be negative.` });
    else if (d > 1e7) out.push({ field: 'demand', week: k + 1, message: `Week ${k + 1}: use a smaller number.` });
  });
  if (raw.late) {
    const o = raw.late.order;
    const e = raw.late.extraWeeks;
    if (o === null || !Number.isInteger(o) || o < 1 || o > 20) out.push({ field: 'lateOrder', message: 'Choose an order from 1 to 20.' });
    if (e === null || !Number.isFinite(e) || e < 0 || e > 8) out.push({ field: 'lateWeeks', message: 'Use a delay of 0 to 8 weeks.' });
  }
  return out;
}

/** Plans that will run but are probably not what was meant. */
export function planWarnings(i: StockSimInputs): string[] {
  const out: string[] = [];
  const avg = i.demand.length ? i.demand.reduce((a, b) => a + b, 0) / i.demand.length : 0;
  if (i.reorderLevel < i.buffer) out.push('The reorder level is below the buffer, so every order is placed after the buffer has started to be used.');
  else if (i.reorderLevel < i.buffer + avg * i.leadTime - 1e-9) out.push('The reorder level is below the buffer plus average demand during the lead time, so an average order cycle dips into the buffer.');
  if (i.reorderQty < avg * i.leadTime - 1e-9) out.push('The reorder quantity is less than the usage during one lead time. With one order open at a time, stock runs down with every order.');
  if (i.opening > i.buffer + i.reorderQty + 1e-9) out.push('The opening stock is above the maximum stock (buffer plus reorder quantity).');
  return out;
}

/* ---------- Words ---------- */

export interface StockUnits {
  one: string;
  many: string;
}

const n = (v: number) => fmtNumber(v, Number.isInteger(Math.round(v * 10) / 10) ? 0 : 1);

/** Weeks as a phrase: "week 9", "weeks 9 and 10", "weeks 3, 9 and 10". */
export function weekList(ws: number[]): string {
  if (!ws.length) return '';
  if (ws.length === 1) return `week ${ws[0]}`;
  return `weeks ${ws.slice(0, -1).join(', ')} and ${ws[ws.length - 1]}`;
}

export function readPlan(r: StockSimResult, u: StockUnits, currency: string): { reading: string; implication: string } {
  const unit = (v: number) => `${n(v)} ${Math.abs(v - 1) < 1e-9 ? u.one : u.many}`;
  const cover = r.averageDemand > 0 ? r.inputs.buffer / r.averageDemand : null;
  const base = `Orders of ${unit(r.inputs.reorderQty)} are placed when stock falls to ${unit(r.inputs.reorderLevel)}; ${r.ordersPlaced} ${r.ordersPlaced === 1 ? 'order is' : 'orders are'} placed in ${r.weeks} weeks, and stock averages ${unit(r.averageStock)}.`;
  if (r.stockOutWeeks.length) {
    const lost = r.inputs.costs.shortage > 0 ? `, costing ${fmtMoney(r.shortageCost, currency, 0)} at ${fmtMoney(r.inputs.costs.shortage, currency, 2)} each` : '';
    return {
      reading: `${base} Stock runs out in ${weekList(r.stockOutWeeks)}: ${unit(r.unmetTotal)} of demand cannot be met (${fmtNumber(100 - r.serviceLevel, 1)}% of the total)${lost}.`,
      implication: `A larger buffer, a higher reorder level for the busy weeks, a larger reorder quantity or a supplier with a shorter or more reliable lead time would protect production.${cover !== null ? ` The buffer covers about ${fmtNumber(cover, 1)} weeks of average demand.` : ''} Each remedy raises the cost of holding stock, which is the trade-off between just in case and just in time.`,
    };
  }
  if (r.belowBufferWeeks.length) {
    return {
      reading: `${base} The buffer is drawn on in ${weekList(r.belowBufferWeeks)}, falling to a low of ${unit(r.run.minStock)}, but stock never runs out.`,
      implication: 'The buffer is doing its job: it absorbs demand above the plan or a late delivery. Holding it costs money, so its size should match how uncertain demand and deliveries really are.',
    };
  }
  return {
    reading: `${base} The buffer is never touched: the lowest stock is ${unit(r.run.minStock)}.`,
    implication: 'A buffer that is never used may be larger than needed, tying up cash and space. Try a busy spell or a late delivery to see how much protection it gives.',
  };
}

/** The plan week by week, for a spreadsheet. */
export function stockCsvRows(r: StockSimResult): string[][] {
  return [
    ['Week', 'Stock at the start', 'Demand', 'Demand met', 'Demand not met', 'Delivered', 'Stock at the end', 'Order placed'],
    ...r.run.rows.map((w) => [String(w.week), String(w.start), String(w.demand), String(w.used), String(w.unmet), String(w.delivered), String(w.end), w.ordered ? 'yes' : '']),
  ];
}
