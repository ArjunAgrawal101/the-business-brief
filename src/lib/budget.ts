/**
 * Budgets and variances, subtopic 3.9 (HL only). The layout follows the
 * guide's budget (figure 11, p. 63): for each line the budgeted figure, the
 * actual figure and the variance, shown as an amount marked [F] for
 * favourable or [A] for adverse, with totals for revenues and costs and the
 * excess of revenues over (under) costs. A variance is judged by its effect
 * on profit, not by its sign: revenue above budget is favourable, and so is a
 * cost below budget. The guide gives no variance formula; the standard one is
 * used (variance = actual − budgeted). tests/unit/budget.test.ts checks every
 * figure by hand.
 */
import { fmtNumber, round } from './format';

export type BudgetKind = 'revenue' | 'cost';
/** F favourable, A adverse, null when actual equals budget. */
export type VarianceMark = 'F' | 'A' | null;

export interface BudgetLine {
  id: string;
  label: string;
  kind: BudgetKind;
  budget: number;
  actual: number;
}

export interface Variance {
  /** Actual − budgeted. */
  difference: number;
  /** The size of the variance, as the guide prints it (always zero or more). */
  amount: number;
  mark: VarianceMark;
  /** The variance as a percentage of the budgeted figure, or null when the budget is zero. */
  share: number | null;
}

/** Differences smaller than half a cent count as no variance. */
const EPS = 0.005;

/** The variance on one line: actual − budgeted, marked by its effect on profit. */
export function variance(kind: BudgetKind, budget: number, actual: number): Variance {
  const difference = round(actual - budget, 6);
  const amount = Math.abs(difference);
  let mark: VarianceMark = null;
  if (amount >= EPS) {
    const up = difference > 0;
    mark = (kind === 'revenue') === up ? 'F' : 'A';
  }
  return { difference, amount, mark, share: budget > 0 ? (amount / budget) * 100 : null };
}

export interface VarianceRow extends BudgetLine, Variance {}

export interface BudgetTotals {
  budget: number;
  actual: number;
  variance: Variance;
}

export interface BudgetReport {
  revenues: VarianceRow[];
  costs: VarianceRow[];
  totalRevenue: BudgetTotals;
  totalCost: BudgetTotals;
  /** Excess of revenues over (under) costs: a surplus above budget is favourable. */
  surplus: BudgetTotals;
  /** Lines with a variance, largest first. */
  ranked: VarianceRow[];
  favourableTotal: number;
  adverseTotal: number;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function budgetReport(lines: BudgetLine[]): BudgetReport {
  const rows = lines.map((l) => ({ ...l, ...variance(l.kind, l.budget, l.actual) }));
  const revenues = rows.filter((r) => r.kind === 'revenue');
  const costs = rows.filter((r) => r.kind === 'cost');
  const total = (rs: VarianceRow[], kind: BudgetKind): BudgetTotals => {
    const budget = round(sum(rs.map((r) => r.budget)), 6);
    const actual = round(sum(rs.map((r) => r.actual)), 6);
    return { budget, actual, variance: variance(kind, budget, actual) };
  };
  const totalRevenue = total(revenues, 'revenue');
  const totalCost = total(costs, 'cost');
  const sb = round(totalRevenue.budget - totalCost.budget, 6);
  const sa = round(totalRevenue.actual - totalCost.actual, 6);
  const ranked = rows.filter((r) => r.mark !== null).sort((a, b) => b.amount - a.amount);
  return {
    revenues,
    costs,
    totalRevenue,
    totalCost,
    surplus: { budget: sb, actual: sa, variance: variance('revenue', sb, sa) },
    ranked,
    favourableTotal: round(sum(rows.filter((r) => r.mark === 'F').map((r) => r.amount)), 6),
    adverseTotal: round(sum(rows.filter((r) => r.mark === 'A').map((r) => r.amount)), 6),
  };
}

/** A figure as the guide's budget prints it: 6,600 [F], 5,700 [A], or 0. */
export function fmtVariance(v: Variance, decimals = 0): string {
  if (v.mark === null) return '0';
  return `${fmtNumber(v.amount, decimals)} [${v.mark}]`;
}

/** An accounts figure for the budget: grouped, with a negative in brackets. */
export function fmtBudget(value: number, decimals = 0): string {
  const s = fmtNumber(Math.abs(value), decimals);
  return value < 0 && Number(Math.abs(value).toFixed(decimals)) !== 0 ? `(${s})` : s;
}

export const MARK_WORDS: Record<'F' | 'A', string> = { F: 'favourable', A: 'adverse' };
