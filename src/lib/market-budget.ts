/**
 * The marketing budget allocation tool (enrichment: the guide covers the role
 * of marketing planning in 4.2 and, at HL, budgets in 3.9, but not response
 * models).
 *
 * An illustrative model of diminishing returns. A channel can reach an
 * audience of A people; spending s on it reaches A × (1 − e^(−s ÷ k)) of
 * them, where k is the spend that reaches about 63% of the audience. Each
 * extra dollar therefore reaches fewer new people than the one before. A
 * share c of the people reached become customers. The model ignores people
 * reached by two channels, minimum spends and timing, and its numbers are
 * assumptions, not measurements.
 *
 * The suggested split hands out the budget in small steps, each to the
 * channel whose next step wins the most customers, which for curves like
 * these comes close to the best split: the one where the next dollar wins
 * the same number of customers in every channel used.
 */
import { asList, asNum, asObj, asStr, safeId, uniqueIds, type Check } from './market-kit';
import { fmtMoney, fmtNumber } from './format';

export interface BudgetChannel {
  id: string;
  name: string;
  spend: number;
  /** People the channel could reach at most. */
  audience: number;
  /** The spend that reaches about 63% of that audience (1 − e^(−1)). */
  k: number;
  /** Share of the people reached who become customers, in per cent. */
  conversion: number;
}

export interface BudgetState {
  business: string;
  currency: string;
  budget: number;
  channels: BudgetChannel[];
}

export function reach(c: Pick<BudgetChannel, 'audience' | 'k'>, spend: number): number {
  if (spend <= 0 || c.k <= 0) return 0;
  return c.audience * (1 - Math.exp(-spend / c.k));
}

export function customers(c: BudgetChannel, spend: number): number {
  return reach(c, spend) * (c.conversion / 100);
}

/** New customers from the next dollar at this spend (the slope of the curve). */
export function marginalCustomers(c: BudgetChannel, spend: number): number {
  if (c.k <= 0) return 0;
  return ((c.audience * c.conversion) / 100 / c.k) * Math.exp(-Math.max(0, spend) / c.k);
}

export interface ChannelResult {
  id: string;
  name: string;
  spend: number;
  reach: number;
  customers: number;
  /** Average cost per new customer, spend ÷ customers; null with no customers. */
  cpa: number | null;
  /** Cost of the next customer at this spend; null when the channel cannot win one. */
  marginalCpa: number | null;
  /** Customers won by the first 100 and by the next 100 spent, to show the curve flattening. */
  first100: number;
  next100: number;
}

export function channelResult(c: BudgetChannel, spend = c.spend): ChannelResult {
  const cust = customers(c, spend);
  const mc = marginalCustomers(c, spend);
  return {
    id: c.id,
    name: c.name,
    spend,
    reach: reach(c, spend),
    customers: cust,
    cpa: cust > 1e-9 ? spend / cust : null,
    marginalCpa: mc > 1e-12 ? 1 / mc : null,
    first100: customers(c, 100),
    next100: customers(c, spend + 100) - cust,
  };
}

export interface Allocation {
  results: ChannelResult[];
  spend: number;
  reach: number;
  customers: number;
  cpa: number | null;
}

export function allocation(chs: BudgetChannel[], spends: number[]): Allocation {
  const results = chs.map((c, i) => channelResult(c, spends[i] ?? 0));
  const spend = results.reduce((n, r) => n + r.spend, 0);
  const cust = results.reduce((n, r) => n + r.customers, 0);
  return { results, spend, reach: results.reduce((n, r) => n + r.reach, 0), customers: cust, cpa: cust > 1e-9 ? spend / cust : null };
}

/** The suggested split: the budget handed out in steps, each to the channel whose next step wins most customers. */
export function suggestSplit(chs: BudgetChannel[], budget: number, steps = 400): number[] {
  const spends = chs.map(() => 0);
  if (!(budget > 0) || !chs.length) return spends;
  const step = budget / steps;
  for (let s = 0; s < steps; s += 1) {
    let best = -1;
    let gain = 0;
    chs.forEach((c, i) => {
      const g = customers(c, (spends[i] ?? 0) + step) - customers(c, spends[i] ?? 0);
      if (g > gain + 1e-12) {
        gain = g;
        best = i;
      }
    });
    if (best < 0) break;
    spends[best] = (spends[best] ?? 0) + step;
  }
  return spends.map((v) => Math.round(v * 100) / 100);
}

/**
 * Whole amounts that add up to the same total, by the largest-remainder method: each spend rounded down, then the
 * dollars left over given to the spends with the largest fractions. Used when the suggested split is applied.
 */
export function roundSplit(spends: number[]): number[] {
  const total = Math.round(spends.reduce((n, v) => n + v, 0));
  const floors = spends.map((v) => Math.floor(v + 1e-9));
  let left = total - floors.reduce((n, v) => n + v, 0);
  const order = spends.map((v, i) => ({ i, frac: v - Math.floor(v + 1e-9) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const o of order) {
    if (left <= 0) break;
    floors[o.i] = (floors[o.i] ?? 0) + 1;
    left -= 1;
  }
  return floors;
}

export interface BudgetView {
  yours: Allocation;
  suggested: Allocation;
  suggestedSpends: number[];
  unallocated: number;
}

export function budgetView(s: BudgetState): BudgetView {
  const yours = allocation(s.channels, s.channels.map((c) => c.spend));
  const suggestedSpends = suggestSplit(s.channels, s.budget);
  const suggested = allocation(s.channels, suggestedSpends);
  return { yours, suggested, suggestedSpends, unallocated: s.budget - yours.spend };
}

export interface BudgetProblem {
  where: string;
  message: string;
}

export function validateBudget(s: BudgetState): BudgetProblem[] {
  const out: BudgetProblem[] = [];
  if (!(s.budget > 0)) out.push({ where: 'budget', message: 'Enter a budget above zero.' });
  if (!s.channels.length) out.push({ where: 'channels', message: 'Add at least one channel.' });
  s.channels.forEach((c) => {
    if (!c.name.trim()) out.push({ where: `${c.id}-name`, message: 'Name the channel.' });
    if (!(c.spend >= 0)) out.push({ where: `${c.id}-spend`, message: 'Spend cannot be negative.' });
    if (!(c.audience > 0)) out.push({ where: `${c.id}-audience`, message: 'Enter an audience above zero.' });
    if (!(c.k > 0)) out.push({ where: `${c.id}-k`, message: 'Enter a spend above zero.' });
    if (!(c.conversion >= 0 && c.conversion <= 100)) out.push({ where: `${c.id}-conversion`, message: 'Enter a share from 0 to 100%.' });
  });
  return out;
}

export function budgetChecks(s: BudgetState, v: BudgetView): Check[] {
  const out: Check[] = [];
  const money = (x: number) => fmtMoney(x, s.currency, 0);
  const add = (level: Check['level'], about: string, text: string) => out.push({ level, about, text });
  if (v.unallocated < -0.005) add('conflict', 'Budget', `The channels spend ${money(v.yours.spend)}, ${money(-v.unallocated)} more than the budget.`);
  else if (v.unallocated > s.budget * 0.02) add('note', 'Budget', `${money(v.unallocated)} of the budget is not allocated.`);
  const used = v.yours.results.filter((r) => r.spend > 0 && r.marginalCpa !== null);
  if (used.length > 1) {
    const sorted = [...used].sort((a, b) => (a.marginalCpa ?? 0) - (b.marginalCpa ?? 0));
    const cheap = sorted[0];
    const dear = sorted[sorted.length - 1];
    if (cheap && dear && (dear.marginalCpa ?? 0) > (cheap.marginalCpa ?? 0) * 1.5) add('tension', 'Diminishing returns', `The next customer costs about ${money(dear.marginalCpa ?? 0)} through ${dear.name} but ${money(cheap.marginalCpa ?? 0)} through ${cheap.name}: moving money towards ${cheap.name} would win more customers for the same budget.`);
    else add('fit', 'Diminishing returns', 'The next customer costs about the same in every channel you use, which is what the best split looks like on this model.');
  }
  const gain = v.suggested.customers - v.yours.customers;
  if (gain > 0.5) add('note', 'Suggested split', `On the model's assumptions, the suggested split would win about ${fmtNumber(gain, 0)} more customers for the same budget.`);
  add('note', 'Model', 'An illustrative model: the response curves are assumptions, and real channels overlap, have minimum spends and change over time.');
  return out;
}

/** The customers each channel would win at each spend from 0 to the budget, for the response curves. */
export function curvePoints(s: BudgetState, n = 11): { spends: number[]; series: Array<{ name: string; values: number[] }> } {
  const max = Math.max(s.budget, ...s.channels.map((c) => c.spend), 1);
  const spends = Array.from({ length: n }, (_, i) => (max * i) / (n - 1));
  return { spends, series: s.channels.map((c) => ({ name: c.name, values: spends.map((x) => customers(c, x)) })) };
}

export function normalizeBudget(raw: unknown, f: BudgetState): BudgetState | null {
  const o = asObj(raw);
  if (!o) return null;
  const channels = uniqueIds(
    asList(o.channels, (x, i) => {
      const c = asObj(x);
      if (!c) return null;
      return { id: safeId(c.id, `ch${i + 1}`), name: asStr(c.name, '', 60), spend: asNum(c.spend, 0, 0, 1e10), audience: asNum(c.audience, 1, 0, 1e10), k: asNum(c.k, 100, 0, 1e10), conversion: asNum(c.conversion, 0, 0, 100) };
    }, 10),
    'ch',
  );
  if (!channels.length) return null;
  return { business: asStr(o.business, f.business, 80), currency: asStr(o.currency, f.currency, 4), budget: asNum(o.budget, f.budget, 0, 1e10), channels };
}

export function budgetCsvRows(s: BudgetState): Array<Array<string | number>> {
  const v = budgetView(s);
  const r = (x: number | null, d = 2) => (x === null ? '' : Number(x.toFixed(d)));
  return [
    ['Channel', 'Your spend', 'Audience', 'Spend for 63% reach', 'Conversion (%)', 'Reach', 'Customers', 'Average cost per customer', 'Cost of the next customer', 'Suggested spend', 'Customers at the suggested spend'],
    ...s.channels.map((c, i) => {
      const y = v.yours.results[i];
      const g = v.suggested.results[i];
      return [c.name, c.spend, c.audience, c.k, c.conversion, r(y?.reach ?? 0, 0), r(y?.customers ?? 0, 1), r(y?.cpa ?? null), r(y?.marginalCpa ?? null), r(v.suggestedSpends[i] ?? 0), r(g?.customers ?? 0, 1)];
    }),
    ['Total', v.yours.spend, '', '', '', r(v.yours.reach, 0), r(v.yours.customers, 1), r(v.yours.cpa), '', r(v.suggested.spend), r(v.suggested.customers, 1)],
    [],
    ['An illustrative model of diminishing returns: the curves are assumptions, not measurements.'],
  ];
}

export function budgetSummary(s: BudgetState): string {
  const v = budgetView(s);
  const money = (x: number) => fmtMoney(x, s.currency, 0);
  return [
    `Marketing budget: ${s.business}, ${money(s.budget)}`,
    ...v.yours.results.map((r) => `- ${r.name}: ${money(r.spend)}, about ${fmtNumber(r.customers, 0)} customers${r.cpa === null ? '' : `, ${fmtMoney(r.cpa, s.currency, 2)} each`}${r.marginalCpa === null ? '' : `; the next costs ${fmtMoney(r.marginalCpa, s.currency, 2)}`}`),
    `Total: ${money(v.yours.spend)} for about ${fmtNumber(v.yours.customers, 0)} customers${v.yours.cpa === null ? '' : ` (${fmtMoney(v.yours.cpa, s.currency, 2)} each)`}.`,
    `Suggested split (illustrative): ${v.suggested.results.map((r) => `${r.name} ${money(r.spend)}`).join(', ')}; about ${fmtNumber(v.suggested.customers, 0)} customers.`,
    'An illustrative model: the response curves are assumptions.',
  ].join('\n');
}
