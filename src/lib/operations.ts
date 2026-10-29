/**
 * Operations Floor models: capacity utilization and productivity (5.6, HL),
 * the stock control chart (5.6, HL) and weighted scoring of locations (5.4).
 * Pure functions, shared by the components, their scripts and the unit tests.
 *
 * The guide's formulas (p. 65): capacity utilization rate = actual output ÷
 * productive capacity × 100, and productivity rate = total output ÷ total
 * input × 100. Labour productivity, defect rate, reorder level and maximum
 * stock are standard definitions that the guide's formula list does not give.
 */
import type { Working } from './finance';
import { fmtMoney, fmtNumber } from './format';

/* ---------- Capacity utilization and productivity ---------- */

export interface CapacityInputs {
  /** Productive capacity, in units a period. */
  capacity: number;
  /** Actual output: good units produced in the period. */
  output: number;
  /** Units started, before quality inspection. */
  made: number;
  /** Units that failed inspection. */
  rejected: number;
  /** Labour hours worked on production. */
  labourHours: number;
  /** Total output and total input, both valued in money, for the productivity rate. */
  outputValue: number;
  inputCost: number;
  /** Fixed costs of the period, to show the fixed cost carried by each unit. */
  fixedCosts: number;
}

export interface CapacityModel {
  inputs: CapacityInputs;
  /** Per cent of capacity used. */
  utilization: number | null;
  spare: number;
  /** Per cent of units made that failed inspection. */
  defectRate: number | null;
  /** Good units per labour hour. */
  labourProductivity: number | null;
  /** Total output ÷ total input × 100, with both valued in money. */
  productivityRate: number | null;
  fixedCostPerUnit: number | null;
}

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

export function capacityModel(i: CapacityInputs): CapacityModel {
  const u = ratio(i.output, i.capacity);
  const d = ratio(i.rejected, i.made);
  const p = ratio(i.outputValue, i.inputCost);
  return {
    inputs: i,
    utilization: u === null ? null : u * 100,
    spare: Math.max(0, i.capacity - i.output),
    defectRate: d === null ? null : d * 100,
    labourProductivity: ratio(i.output, i.labourHours),
    productivityRate: p === null ? null : p * 100,
    fixedCostPerUnit: ratio(i.fixedCosts, i.output),
  };
}

export interface FieldProblem<K extends string> {
  field: K;
  message: string;
}

export function validateCapacity(raw: Record<keyof CapacityInputs, number | null>): Array<FieldProblem<keyof CapacityInputs>> {
  const out: Array<FieldProblem<keyof CapacityInputs>> = [];
  (Object.keys(raw) as Array<keyof CapacityInputs>).forEach((k) => {
    const v = raw[k];
    if (v === null || !Number.isFinite(v)) out.push({ field: k, message: 'Enter a number.' });
    else if (v < 0) out.push({ field: k, message: 'Cannot be negative.' });
  });
  if (out.length) return out;
  const r = raw as CapacityInputs;
  if (r.capacity <= 0) out.push({ field: 'capacity', message: 'Capacity must be more than zero.' });
  if (r.output > r.capacity) out.push({ field: 'output', message: 'Output cannot be more than capacity. Raise capacity, or lower output.' });
  if (r.rejected > r.made) out.push({ field: 'rejected', message: 'More units cannot fail than were made.' });
  if (r.made > 0 && r.made - r.rejected !== r.output) out.push({ field: 'made', message: `Units made minus units rejected (${fmtNumber(r.made - r.rejected)}) should equal good output (${fmtNumber(r.output)}).` });
  return out;
}

/** The platform's rule of thumb for reading capacity utilization; not an IB rule. */
export function utilizationBand(u: number): 'low' | 'comfortable' | 'busy' | 'full' {
  if (u < 60) return 'low';
  if (u < 85) return 'comfortable';
  if (u < 97) return 'busy';
  return 'full';
}

export function readCapacity(m: CapacityModel, currency: string, unit: { one: string; many: string }): { reading: string; implication: string } {
  if (m.utilization === null) return { reading: 'Enter a capacity above zero.', implication: '' };
  const band = utilizationBand(m.utilization);
  const fc = m.fixedCostPerUnit === null ? '' : ` Each ${unit.one} carries ${fmtMoney(m.fixedCostPerUnit, currency, 2)} of fixed costs.`;
  const reading = `The studio is using ${fmtNumber(m.utilization, 1)}% of its capacity, with ${fmtNumber(m.spare)} ${unit.many} of spare capacity.${fc}`;
  const implication = {
    low: 'Much of the capacity stands idle, so fixed costs are spread over few units. More sales, or selling the spare capacity, would lower the cost of each unit; cutting capacity would save cost but limit growth.',
    comfortable: 'There is room for more orders without strain, and fixed costs are spread over a reasonable output.',
    busy: 'Fixed costs are spread thinly, which is efficient, but there is little room for a rush order, a breakdown or maintenance.',
    full: 'The business is at or near full capacity. Any extra order displaces regular work or needs more capacity, and a breakdown would stop production.',
  }[band];
  return { reading, implication };
}

const n = (v: number, d = 2) => fmtNumber(v, Number.isInteger(v) ? 0 : d);

/** The eight-part workings for the four measures. */
export function capacityWorkings(m: CapacityModel, currency: string, unit: { one: string; many: string; period: string }): Record<'utilization' | 'productivity' | 'defect' | 'labour', Working> {
  const i = m.inputs;
  const pct = (v: number | null, d = 2) => (v === null ? 'n/a' : `${fmtNumber(v, d)}%`);
  const money = (v: number) => fmtMoney(v, currency, Number.isInteger(v) ? 0 : 2);
  return {
    utilization: {
      given: [
        { label: `Actual output this ${unit.period}`, value: `${n(i.output)} ${unit.many}` },
        { label: 'Productive capacity', value: `${n(i.capacity)} ${unit.many}` },
      ],
      formula: 'Capacity utilization rate = actual output ÷ productive capacity × 100',
      substitution: `= ${n(i.output)} ÷ ${n(i.capacity)} × 100`,
      steps: m.utilization === null ? ['Capacity is zero, so the rate cannot be calculated.'] : [`${n(i.output)} ÷ ${n(i.capacity)} = ${fmtNumber(i.output / i.capacity, 4)}`, `${fmtNumber(i.output / i.capacity, 4)} × 100 = ${pct(m.utilization)}`],
      answer: pct(m.utilization, 1),
      value: m.utilization,
      unit: 'per cent of capacity',
      note: 'The guide gives this formula (p. 65).',
    },
    productivity: {
      given: [
        { label: 'Total output, valued at its selling price', value: money(i.outputValue) },
        { label: 'Total input, valued at its cost', value: money(i.inputCost) },
      ],
      formula: 'Productivity rate = total output ÷ total input × 100',
      substitution: `= ${money(i.outputValue)} ÷ ${money(i.inputCost)} × 100`,
      steps: m.productivityRate === null ? ['Total input is zero, so the rate cannot be calculated.'] : [`${n(i.outputValue)} ÷ ${n(i.inputCost)} = ${fmtNumber(i.outputValue / i.inputCost, 4)}`, `${fmtNumber(i.outputValue / i.inputCost, 4)} × 100 = ${pct(m.productivityRate)}`],
      answer: pct(m.productivityRate, 1),
      value: m.productivityRate,
      unit: 'per cent: output value for each 100 of input value',
      note: 'The guide gives this formula (p. 65) without units. Output and input are valued in the same currency here so that the result is a percentage.',
    },
    defect: {
      given: [
        { label: `${unit.many.charAt(0).toUpperCase()}${unit.many.slice(1)} that failed inspection`, value: n(i.rejected) },
        { label: `${unit.many.charAt(0).toUpperCase()}${unit.many.slice(1)} made`, value: n(i.made) },
      ],
      formula: 'Defect rate = units that fail to meet the quality standard ÷ units made × 100',
      substitution: `= ${n(i.rejected)} ÷ ${n(i.made)} × 100`,
      steps: m.defectRate === null ? ['Nothing was made, so the rate cannot be calculated.'] : [`${n(i.rejected)} ÷ ${n(i.made)} = ${fmtNumber(i.rejected / i.made, 4)}`, `${fmtNumber(i.rejected / i.made, 4)} × 100 = ${pct(m.defectRate)}`],
      answer: pct(m.defectRate, 2),
      value: m.defectRate,
      unit: `per cent of ${unit.many} made`,
      note: "A standard definition. The guide's formula list does not include it; the teacher support material's glossary describes the defect rate as a percentage (TSM, p. 83).",
    },
    labour: {
      given: [
        { label: `Good ${unit.many} produced`, value: n(i.output) },
        { label: 'Labour hours worked', value: n(i.labourHours) },
      ],
      formula: 'Labour productivity = output ÷ labour input',
      substitution: `= ${n(i.output)} ÷ ${n(i.labourHours)}`,
      steps: m.labourProductivity === null ? ['No hours were worked, so it cannot be calculated.'] : [`${n(i.output)} ÷ ${n(i.labourHours)} = ${fmtNumber(m.labourProductivity, 3)}`],
      answer: m.labourProductivity === null ? 'n/a' : `${fmtNumber(m.labourProductivity, 2)} ${unit.many} an hour`,
      value: m.labourProductivity,
      unit: `good ${unit.many} a labour hour`,
      note: "A standard definition. The guide's formula list does not include it. Labour input can also be measured in workers rather than hours.",
    },
  };
}

/** Interpretation and implication for the productivity, defect and labour workings. */
export function capacityNotes(m: CapacityModel, currency: string, unit: { one: string; many: string }): Record<'productivity' | 'defect' | 'labour', { interpretation: string; implication: string }> {
  const p = m.productivityRate;
  const d = m.defectRate;
  const l = m.labourProductivity;
  return {
    productivity: {
      interpretation: p === null ? 'Not available.' : `Every ${fmtMoney(100, currency, 0)} of inputs produced ${fmtMoney(p, currency, 2)} of output, valued at selling prices.`,
      implication: 'Compare periods, not single figures: the rate rises when fixed inputs, such as the studio and the kiln, are spread over more output.',
    },
    defect: {
      interpretation: d === null ? 'Not available.' : `${fmtNumber(d, 1)}% of the ${unit.many} made never reach a customer.`,
      implication: 'A lower defect rate raises good output without more hours or more material, and it is usually cheaper to prevent a defect than to find it.',
    },
    labour: {
      interpretation: l === null ? 'Not available.' : `Each labour hour produced ${fmtNumber(l, 2)} good ${unit.many}.`,
      implication: 'Long hours in a busy month can hold output up even if each hour produces less; compare this figure across months before drawing a conclusion.',
    },
  };
}

/* ---------- Stock control ---------- */

export interface StockPlan {
  /** Planned usage a week, in units (bags). */
  usage: number;
  /** Weeks between placing an order and receiving it. */
  leadTime: number;
  buffer: number;
  reorderQty: number;
  /** Weeks to simulate. */
  weeks: number;
}

export interface StockScenario {
  /** Weeks (numbered from 1) in which usage differs from the plan, inclusive. */
  usage?: Array<{ from: number; to: number; usage: number }>;
  /** One order arrives late: the nth order placed (counting from 1) takes this many extra weeks. */
  late?: { order: number; extraWeeks: number };
}

export interface StockOrder {
  placed: number;
  arrives: number;
  /** Stock when the order was placed. */
  level: number;
}

export interface StockRow {
  week: number;
  start: number;
  used: number;
  delivered: number;
  end: number;
  ordered: boolean;
}

export interface StockRun {
  plan: StockPlan;
  reorderLevel: number;
  maxStock: number;
  /** The stock line: time in weeks and stock in units. */
  points: Array<[number, number]>;
  orders: StockOrder[];
  minStock: number;
  minAt: number;
  /** Usage that could not be met because stock ran out. */
  shortfall: number;
  rows: StockRow[];
}

/** Reorder level = buffer stock + usage a week × lead time in weeks. */
export const reorderLevel = (p: Pick<StockPlan, 'buffer' | 'usage' | 'leadTime'>) => p.buffer + p.usage * p.leadTime;
/** Maximum stock = buffer stock + reorder quantity. */
export const maxStock = (p: Pick<StockPlan, 'buffer' | 'reorderQty'>) => p.buffer + p.reorderQty;

const EPS = 1e-9;
const clean = (v: number) => Math.round(v * 1e6) / 1e6;

/**
 * Simulates the stock line week by week, starting full. An order for the
 * reorder quantity is placed when stock falls to the reorder level (computed
 * from the plan) and arrives after the lead time; only one order is open at a
 * time. Stock cannot fall below zero: unmet usage is counted as a shortfall.
 */
export function simulateStock(plan: StockPlan, scenario: StockScenario = {}): StockRun {
  const rol = reorderLevel(plan);
  const max = maxStock(plan);
  const usageIn = (week: number) => scenario.usage?.find((u) => week >= u.from && week <= u.to)?.usage ?? plan.usage;
  let t = 0;
  let s = max;
  let open: StockOrder | null = null;
  const orders: StockOrder[] = [];
  const points: Array<[number, number]> = [[0, s]];
  let minStock = s;
  let minAt = 0;
  let shortfall = 0;
  const rows: StockRow[] = [];

  const place = (at: number) => {
    const n = orders.length + 1;
    const extra = scenario.late && scenario.late.order === n ? scenario.late.extraWeeks : 0;
    // Exact times drive the simulation; the record of orders is rounded for display.
    open = { placed: at, arrives: at + plan.leadTime + extra, level: s };
    orders.push({ placed: clean(at), arrives: clean(at + plan.leadTime + extra), level: clean(s) });
  };
  const note = () => {
    if (s < minStock - EPS) {
      minStock = s;
      minAt = t;
    }
  };

  for (let w = 1; w <= plan.weeks; w += 1) {
    const end = w;
    const r = usageIn(w);
    const row: StockRow = { week: w, start: clean(s), used: 0, delivered: 0, end: 0, ordered: false };
    // An order is due at the start of the week, or stock already at the reorder level with none open.
    for (let guard = 0; guard < 100; guard += 1) {
      const o = open as StockOrder | null;
      if (o && o.arrives <= t + EPS) {
        s += plan.reorderQty;
        row.delivered += plan.reorderQty;
        points.push([clean(t), clean(s)]);
        open = null;
      }
      if (!open && s <= rol + EPS) {
        place(t);
        row.ordered = true;
      }
      if (t >= end - EPS) break;
      const cur = open as StockOrder | null;
      // The next thing that happens: the delivery, stock reaching the reorder level, stock running out, or the end of the week.
      const tDeliver = cur ? cur.arrives : Infinity;
      const tReorder = !cur && r > 0 && s > rol + EPS ? t + (s - rol) / r : Infinity;
      const tEmpty = r > 0 && s > EPS ? t + s / r : Infinity;
      const next = Math.min(end, tDeliver, tReorder, tEmpty);
      const dt = next - t;
      if (s <= EPS && r > 0) {
        // Stock is out: usage in this interval cannot be met.
        shortfall += r * dt;
        s = 0;
      } else {
        const use = Math.min(s, r * dt);
        row.used += use;
        s -= use;
        if (s < EPS) s = 0;
      }
      t = next;
      points.push([clean(t), clean(s)]);
      note();
    }
    row.used = clean(row.used);
    row.end = clean(s);
    rows.push(row);
  }
  // Collapse consecutive points that do not change direction, for a tidy line.
  const tidy: Array<[number, number]> = [];
  for (const p of points) {
    const last = tidy[tidy.length - 1];
    if (last && Math.abs(last[0] - p[0]) < EPS && Math.abs(last[1] - p[1]) < EPS) continue;
    tidy.push(p);
  }
  return { plan, reorderLevel: rol, maxStock: max, points: tidy, orders, minStock: clean(minStock), minAt: clean(minAt), shortfall: clean(shortfall), rows };
}

export type BufferUse = 'none' | 'some' | 'all';

/** How much of the buffer a run used: none, some, or all of it. */
export function bufferUse(run: StockRun): BufferUse {
  if (run.minStock >= run.plan.buffer - EPS) return 'none';
  if (run.minStock > EPS) return 'some';
  return 'all';
}

export function validateStock(raw: Record<'usage' | 'leadTime' | 'buffer' | 'reorderQty', number | null>): Array<FieldProblem<'usage' | 'leadTime' | 'buffer' | 'reorderQty'>> {
  const out: Array<FieldProblem<'usage' | 'leadTime' | 'buffer' | 'reorderQty'>> = [];
  (Object.keys(raw) as Array<keyof typeof raw>).forEach((k) => {
    const v = raw[k];
    if (v === null || !Number.isFinite(v)) out.push({ field: k, message: 'Enter a number.' });
    else if (v < 0) out.push({ field: k, message: 'Cannot be negative.' });
  });
  if (out.length) return out;
  if ((raw.usage ?? 0) <= 0) out.push({ field: 'usage', message: 'Usage must be more than zero.' });
  if ((raw.reorderQty ?? 0) <= 0) out.push({ field: 'reorderQty', message: 'The reorder quantity must be more than zero.' });
  if ((raw.leadTime ?? 0) > 8) out.push({ field: 'leadTime', message: 'Use a lead time of eight weeks or less here.' });
  // With one order open at a time, each delivery must at least replace what is used while it is on its way.
  if ((raw.reorderQty ?? 0) > 0 && (raw.usage ?? 0) * (raw.leadTime ?? 0) > (raw.reorderQty ?? 0)) {
    out.push({ field: 'reorderQty', message: 'The reorder quantity must be at least the usage during the lead time (usage × lead time), or stock runs down with every order.' });
  }
  return out;
}

export function readStock(plan: StockRun, scenarioRun: StockRun | null, unit: { one: string; many: string }): { reading: string; implication: string } {
  const u = (n: number) => `${fmtNumber(n, Number.isInteger(n) ? 0 : 1)} ${Math.abs(n) === 1 ? unit.one : unit.many}`;
  const cycle = plan.plan.reorderQty / plan.plan.usage;
  const base = `At ${u(plan.plan.usage)} a week, the studio reorders when stock falls to ${u(plan.reorderLevel)} (buffer ${u(plan.plan.buffer)} plus ${u(plan.plan.usage * plan.plan.leadTime)} used during the ${fmtNumber(plan.plan.leadTime, Number.isInteger(plan.plan.leadTime) ? 0 : 1)}-week lead time). Stock peaks at ${u(plan.maxStock)} and each order lasts about ${fmtNumber(cycle, Number.isInteger(cycle) ? 0 : 1)} weeks.`;
  if (!scenarioRun) {
    return { reading: base, implication: 'When usage and lead time are as planned, each delivery arrives just as stock reaches the buffer, so the buffer is never touched.' };
  }
  const use = bufferUse(scenarioRun);
  const low = `the lowest point is ${u(scenarioRun.minStock)}, in week ${Math.floor(scenarioRun.minAt) + 1}`;
  const text = {
    none: `In this scenario the buffer is not used: ${low}.`,
    some: `In this scenario the buffer does its job: ${low}, so ${fmtNumber(clean(scenarioRun.plan.buffer - scenarioRun.minStock), 1).replace(/\.0$/, '')} of the ${u(scenarioRun.plan.buffer)} of buffer stock ${clean(scenarioRun.plan.buffer - scenarioRun.minStock) === 1 ? 'is' : 'are'} used, and production never stops.`,
    all: `In this scenario the buffer is used up: ${low}.${scenarioRun.shortfall > 0 ? ` ${u(scenarioRun.shortfall)} of clay that the studio needed was not there, so production stopped.` : ''}`,
  }[use];
  return {
    reading: `${base} ${text}`,
    implication:
      use === 'all'
        ? 'A larger buffer, an earlier reorder level for the busy season, or a supplier with a shorter lead time would protect production. Each costs money: stock ties up cash and space.'
        : 'Buffer stock is insurance against usage above plan and late deliveries. It costs cash and storage space, so its size is a trade-off between the risk of running out and the cost of holding stock.',
  };
}

/* ---------- Location: weighted scoring ---------- */

export interface LocFactor {
  id: string;
  label: string;
  weight: number;
}

export interface LocSite {
  id: string;
  name: string;
  scores: Record<string, number>;
}

export interface SiteResult {
  id: string;
  name: string;
  total: number;
  /** Total as a share of the highest possible total, in per cent. */
  share: number;
  rank: number;
}

export function weightedScores(sites: LocSite[], factors: Array<Pick<LocFactor, 'id'>>, weights: Record<string, number>, maxScore: number): SiteResult[] {
  const best = factors.reduce((n, f) => n + (weights[f.id] ?? 0) * maxScore, 0);
  const totals = sites.map((s) => ({ id: s.id, name: s.name, total: factors.reduce((n, f) => n + (weights[f.id] ?? 0) * (s.scores[f.id] ?? 0), 0) }));
  return totals
    .map((s) => ({ ...s, share: best > 0 ? (s.total / best) * 100 : 0, rank: 1 + totals.filter((o) => o.total > s.total).length }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

/** The sites ranked first (more than one when they tie). */
export function leaders(results: SiteResult[]): string[] {
  return results.filter((r) => r.rank === 1).map((r) => r.id);
}

export interface Sensitivity {
  factor: string;
  /** The nearest weight, from 0 to the maximum, at which the leader changes or a tie appears. */
  weight: number;
  leaders: string[];
}

/**
 * For each factor, holding the other weights, the nearest weight at which the
 * site ranked first changes, or a tie for first appears. Factors whose weight
 * cannot change the leader on their own are left out.
 */
export function sensitivity(sites: LocSite[], factors: LocFactor[], weights: Record<string, number>, maxScore: number, maxWeight = 5): Sensitivity[] {
  const now = leaders(weightedScores(sites, factors, weights, maxScore));
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
  const out: Sensitivity[] = [];
  for (const f of factors) {
    const cur = weights[f.id] ?? 0;
    let found: Sensitivity | null = null;
    for (let d = 1; d <= maxWeight && !found; d += 1) {
      for (const w of [cur - d, cur + d]) {
        if (w < 0 || w > maxWeight) continue;
        const l = leaders(weightedScores(sites, factors, { ...weights, [f.id]: w }, maxScore));
        if (!same(l, now)) {
          found = { factor: f.id, weight: w, leaders: l };
          break;
        }
      }
    }
    if (found) out.push(found);
  }
  return out;
}

/** Scores at or below the threshold: weaknesses a weighted total can hide. */
export function lowScores(sites: LocSite[], factors: LocFactor[], threshold: number): Array<{ site: string; factor: string; score: number }> {
  const out: Array<{ site: string; factor: string; score: number }> = [];
  for (const s of sites) for (const f of factors) if ((s.scores[f.id] ?? 0) <= threshold) out.push({ site: s.id, factor: f.id, score: s.scores[f.id] ?? 0 });
  return out;
}

export function readLocation(results: SiteResult[], sens: Sensitivity[], sites: LocSite[], factors: LocFactor[], weights: Record<string, number>): { reading: string; implication: string } {
  const name = (id: string) => sites.find((s) => s.id === id)?.name ?? id;
  const label = (id: string) => factors.find((f) => f.id === id)?.label.toLowerCase() ?? id;
  const top = results.filter((r) => r.rank === 1);
  const second = results.find((r) => r.rank > 1);
  if (!top.length || results.every((r) => r.total === 0)) return { reading: 'Give at least one factor a weight above zero.', implication: '' };
  const lead =
    top.length > 1
      ? `${top.map((r) => r.name).join(' and ')} tie for first place with ${fmtNumber(top[0]?.total ?? 0)} points.`
      : `${top[0]?.name} ranks first with ${fmtNumber(top[0]?.total ?? 0)} points${second ? `, ${fmtNumber((top[0]?.total ?? 0) - second.total)} ahead of ${second.name}` : ''}.`;
  const flips = sens.map((s) => {
    const who = s.leaders.length > 1 ? `${s.leaders.map(name).join(' and ')} tie` : `${name(s.leaders[0] ?? '')} ranks first`;
    return `at a weight of ${s.weight} on ${label(s.factor)} (now ${weights[s.factor] ?? 0}), ${who}`;
  });
  const reading = `${lead} ${flips.length ? `The ranking is sensitive to the weights: ${flips.join('; ')}.` : 'No single change of weight changes the site ranked first.'}`;
  const implication = flips.length
    ? 'A close ranking means the decision rests on the weights, which are judgements about priorities. Agree the weights before seeing the totals, and check the qualitative factors the scores leave out.'
    : 'The ranking is robust to any one change of weight. That makes the weighted score more persuasive, but the scores themselves are still judgements.';
  return { reading, implication };
}
