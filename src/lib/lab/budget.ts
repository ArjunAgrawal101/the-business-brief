/**
 * The lab's budget variances (3.9, HL): budgeted and actual figures line by
 * line in the layout of the guide's budget (figure 11, p. 63), each variance
 * marked [F] or [A] by its effect on profit. The arithmetic is budgetReport()
 * in src/lib/budget.ts.
 */
import { budgetReport, fmtBudget, fmtVariance, MARK_WORDS, type BudgetLine, type BudgetReport, type VarianceRow } from '../budget';
import type { Working } from '../finance';
import { fmtNumber, round } from '../format';
import { esc } from '../markup';
import { BUDGET } from './business';
import { varianceBarsSvg } from './charts';
import type { LabReport, Problem, Settings, WorkingBlock } from './types';
import { money, pct } from './util';

export const MAX_BUDGET_LINES = 15;

export interface BudgetState {
  period: string;
  lines: BudgetLine[];
}

export const BUDGET_DEFAULTS: BudgetState = { period: BUDGET.period, lines: BUDGET.lines.map((l) => ({ ...l })) };

export interface BudgetInput {
  period: string;
  lines: Array<{ id: string; label: string; kind: 'revenue' | 'cost'; budget: number | null; actual: number | null }>;
}

export function validateBudget(i: BudgetInput): Problem[] {
  const out: Problem[] = [];
  if (!i.lines.length) out.push({ field: 'period', message: 'Add at least one revenue or cost line.' });
  for (const l of i.lines) {
    const name = l.label.trim() || `this ${l.kind} line`;
    if (!l.label.trim()) out.push({ field: `${l.id}.label`, message: `Give this ${l.kind} line a name.` });
    for (const k of ['budget', 'actual'] as const) {
      const v = l[k];
      const which = k === 'budget' ? 'budgeted' : 'actual';
      if (v === null || !Number.isFinite(v)) out.push({ field: `${l.id}.${k}`, message: `Enter the ${which} figure for ${name} (0 if none).` });
      else if (v < 0) out.push({ field: `${l.id}.${k}`, message: `The ${which} figure for ${name} cannot be negative.` });
    }
  }
  return out;
}

export function budgetState(i: BudgetInput): BudgetState {
  const period = i.period.trim().replace(/\s+/g, ' ').slice(0, 80) || BUDGET_DEFAULTS.period;
  return { period, lines: i.lines.map((l) => ({ id: l.id, label: l.label.trim().slice(0, 60), kind: l.kind, budget: l.budget ?? 0, actual: l.actual ?? 0 })) };
}

/** The budget in the guide's layout (figure 11), as an HTML table. */
export function budgetTableHtml(b: BudgetReport, st: BudgetState, s: Settings): string {
  const row = (r: VarianceRow) => `<tr><th scope="row">${esc(r.label)}</th><td class="n">${esc(fmtBudget(r.budget))}</td><td class="n">${esc(fmtBudget(r.actual))}</td><td class="n bv bv--${r.mark ?? 'none'}">${esc(fmtVariance(r))}</td></tr>`;
  const total = (label: string, t: BudgetReport['totalRevenue'], cls = 'bt-total') => `<tr class="${cls}"><th scope="row">${esc(label)}</th><td class="n">${esc(fmtBudget(t.budget))}</td><td class="n">${esc(fmtBudget(t.actual))}</td><td class="n bv bv--${t.variance.mark ?? 'none'}">${esc(fmtVariance(t.variance))}</td></tr>`;
  const head = (label: string) => `<tr class="bt-head"><th scope="rowgroup" colspan="4">${esc(label)}</th></tr>`;
  const gap = '<tr class="bt-gap" aria-hidden="true"><td colspan="4"></td></tr>';
  return `<div class="table-scroll bt-wrap" role="region" aria-label="Budget, actual figures and variances" tabindex="0"><table class="table bt"><caption>Budget for ${esc(st.period)} <span class="muted">[F] means favourable, [A] means adverse.</span></caption><thead><tr><th scope="col">All figures in ${esc(s.currency.trim() || 'currency')}</th><th scope="col" class="n">Budgeted figures</th><th scope="col" class="n">Actual figures</th><th scope="col" class="n">Variance</th></tr></thead><tbody>${head('Revenue')}${b.revenues.map(row).join('')}${total('Total revenues', b.totalRevenue)}${gap}${head('Costs')}${b.costs.map(row).join('')}${total('Total costs', b.totalCost)}${gap}${total('Excess of revenues over (under) costs', b.surplus, 'bt-total bt-surplus')}</tbody></table></div>`;
}

function varianceWorking(label: string, kind: 'revenue' | 'cost', budget: number, actual: number, mark: 'F' | 'A' | null, c: string): Working {
  const d = actual - budget;
  const why =
    mark === null
      ? 'Actual equals budget, so there is no variance.'
      : kind === 'revenue'
        ? d > 0
          ? 'Revenue above budget raises profit: favourable.'
          : 'Revenue below budget lowers profit: adverse.'
        : d > 0
          ? 'A cost above budget lowers profit: adverse.'
          : 'A cost below budget raises profit: favourable.';
  return {
    given: [
      { label: `Budgeted ${label.toLowerCase()}`, value: money(budget, c) },
      { label: `Actual ${label.toLowerCase()}`, value: money(actual, c) },
    ],
    formula: 'Variance = actual figure − budgeted figure, marked [F] or [A] by its effect on profit',
    substitution: `= ${money(actual, c)} − ${money(budget, c)}`,
    steps: [`${fmtNumber(actual)} − ${fmtNumber(budget)} = ${fmtNumber(d)}`, why],
    answer: mark === null ? '0' : `${money(Math.abs(d), c)} [${mark}]`,
    value: round(Math.abs(d), 2),
    unit: `${c.trim() || 'currency'} for the period`,
  };
}

export function buildBudget(st: BudgetState, s: Settings): LabReport {
  const c = s.currency;
  const b = budgetReport(st.lines);
  const adverse = b.ranked.filter((r) => r.mark === 'A');
  const favourable = b.ranked.filter((r) => r.mark === 'F');
  const worst = adverse[0];
  const best = favourable[0];
  const workings: WorkingBlock[] = [];
  if (worst) workings.push({ title: `The largest adverse variance: ${worst.label}`, working: varianceWorking(worst.label, worst.kind, worst.budget, worst.actual, worst.mark, c), interpretation: `${worst.label} ${worst.kind === 'revenue' ? 'came in below' : 'ran above'} budget by ${money(worst.amount, c)}${worst.share === null ? '' : `, ${pct(worst.share)} of its budget`}.`, implication: 'The first line to investigate: find the cause before judging the budget holder.' });
  if (best) workings.push({ title: `The largest favourable variance: ${best.label}`, working: varianceWorking(best.label, best.kind, best.budget, best.actual, best.mark, c), interpretation: `${best.label} ${best.kind === 'revenue' ? 'came in above' : 'ran below'} budget by ${money(best.amount, c)}.`, implication: 'Good news is investigated too: a saving may store up a problem, and a revenue surplus may show the budget was set too low.' });
  workings.push({
    title: 'Excess of revenues over (under) costs',
    working: varianceWorking('excess of revenues over costs', 'revenue', b.surplus.budget, b.surplus.actual, b.surplus.variance.mark, c),
    interpretation: b.surplus.variance.mark === null ? 'Overall the period finished exactly on budget.' : `Overall, profit for the period was ${money(b.surplus.variance.amount, c)} ${b.surplus.variance.mark === 'F' ? 'above' : 'below'} budget.`,
    implication: 'The total can hide large variances that cancel out, so read the lines as well.',
  });
  const rankRows = b.ranked.map((r) => ({ th: r.label, cells: [r.kind === 'revenue' ? 'Revenue' : 'Cost', fmtVariance(r), r.share === null ? 'n/a' : pct(r.share), MARK_WORDS[r.mark as 'F' | 'A']] }));
  const marketingSaving = favourable.find((r) => r.kind === 'cost' && /market|advert|promot/i.test(r.label));
  const revenueShort = adverse.find((r) => r.kind === 'revenue');
  const actions: string[] = [];
  if (worst) actions.push(`Investigate ${worst.label.toLowerCase()} first: ask whether the cause was inside the budget holder’s control (waste, poor buying) or outside it (a supplier’s price rise, the weather, the economy).`);
  if (marketingSaving && revenueShort) actions.push(`Read the lines together: the saving on ${marketingSaving.label.toLowerCase()} may explain part of the shortfall in ${revenueShort.label.toLowerCase()}, so a favourable variance is not always good news.`);
  actions.push('Decide whether to act or to re-budget: a variance caused by a lasting change, such as higher input prices, may mean the budget itself needs revising.');
  actions.push('Look for patterns over several periods: one adverse variance may be noise, a run of them is a signal.');
  return {
    headline: {
      label: 'Variance in the excess of revenues over costs',
      value: b.surplus.variance.mark === null ? money(0, c) : `${money(b.surplus.variance.amount, c)} [${b.surplus.variance.mark}]`,
      note: b.surplus.variance.mark === null ? 'on budget' : `${MARK_WORDS[b.surplus.variance.mark]}: profit ${b.surplus.variance.mark === 'F' ? 'above' : 'below'} budget`,
    },
    figures: [
      { label: 'Total revenues', value: fmtVariance(b.totalRevenue.variance), note: `budget ${fmtBudget(b.totalRevenue.budget)}, actual ${fmtBudget(b.totalRevenue.actual)}` },
      { label: 'Total costs', value: fmtVariance(b.totalCost.variance), note: `budget ${fmtBudget(b.totalCost.budget)}, actual ${fmtBudget(b.totalCost.actual)}` },
      { label: 'Excess of revenues over (under) costs', value: fmtVariance(b.surplus.variance), note: `budget ${fmtBudget(b.surplus.budget)}, actual ${fmtBudget(b.surplus.actual)}` },
      { label: 'Largest adverse variance', value: worst ? `${worst.label}: ${fmtVariance(worst)}` : 'None' },
      { label: 'Largest favourable variance', value: best ? `${best.label}: ${fmtVariance(best)}` : 'None' },
      { label: 'Favourable against adverse, all lines', value: `${fmtNumber(b.favourableTotal)} [F] / ${fmtNumber(b.adverseTotal)} [A]` },
    ],
    workings,
    chart: {
      svg: varianceBarsSvg(b, { currency: c, id: 'lab-budget-variances-chart' }),
      caption: 'Each line’s variance: adverse to the left, favourable to the right, each labelled [A] or [F].',
      table: {
        caption: 'Each line’s variance',
        head: ['Line', 'Kind', 'Budgeted', 'Actual', 'Variance', 'Share of budget'],
        rows: [...b.revenues, ...b.costs].map((r) => ({ th: r.label, cells: [r.kind === 'revenue' ? 'Revenue' : 'Cost', fmtBudget(r.budget), fmtBudget(r.actual), fmtVariance(r), r.share === null ? 'n/a' : pct(r.share)] })),
        numeric: [false, false, true, true, true, true],
      },
    },
    sensitivity: rankRows.length
      ? {
          title: 'Where to look first',
          intro: 'The variances ranked by size, each with its share of the line’s budget. A large variance on a small budget can matter as much as a larger one on a big budget.',
          table: { caption: 'Variances by size', head: ['Line', 'Kind', 'Variance', 'Share of budget', 'Effect on profit'], rows: rankRows, numeric: [false, false, true, true, false] },
          reading: worst ? `${worst.label} is the largest adverse variance${worst.share === null ? '' : `, ${pct(worst.share)} over its budget`}${adverse.length > 1 ? `; ${adverse.length - 1} other ${adverse.length - 1 === 1 ? 'line is' : 'lines are'} adverse` : ''}. ${favourable.length ? `${favourable.length} ${favourable.length === 1 ? 'line is' : 'lines are'} favourable, together ${fmtNumber(b.favourableTotal)}.` : ''}` : 'No line is adverse.',
        }
      : undefined,
    interpretation: {
      meaning:
        b.surplus.variance.mark === null
          ? 'The period finished exactly on budget overall, though individual lines may still differ.'
          : `Revenues were ${fmtVariance(b.totalRevenue.variance)} against budget and costs ${fmtVariance(b.totalCost.variance)}, so the excess of revenues over costs was **${money(b.surplus.variance.amount, c)} ${b.surplus.variance.mark === 'F' ? 'better' : 'worse'}** than planned${worst ? `, driven most by ${worst.label.toLowerCase()} (${fmtVariance(worst)})` : ''}.`,
      compare: 'Compare each variance with the size of its budget, with the same line in earlier periods, and with the lines around it: sales and the costs that rise with them should move together. Compare the causes with what the budget holder could control.',
      benchmarks: 'There is no universal threshold for a variance worth investigating; many businesses set one in money or as a percentage of the budget, and it depends on the size of the business and the line. A volatile cost such as energy or raw materials varies more from budget than rent does, and a budget set in a stable year can look badly wrong after a sudden rise in prices.',
      actions,
    },
    extra: budgetTableHtml(b, st, s),
    given: [{ label: 'Period', value: st.period }, ...st.lines.map((l) => ({ label: `${l.label} (${l.kind})`, value: `budget ${fmtBudget(l.budget)}, actual ${fmtBudget(l.actual)}` }))],
    announce: `Excess of revenues over costs: ${b.surplus.variance.mark === null ? 'on budget' : `${fmtNumber(b.surplus.variance.amount)} ${MARK_WORDS[b.surplus.variance.mark]}`}.${worst ? ` Largest adverse variance: ${worst.label}.` : ''}`,
    csv: [
      ['Input', 'Period', st.period, ''],
      ['Budget', 'Line', 'Kind', 'Budgeted', 'Actual', 'Variance', 'Mark'],
      ...[...b.revenues, ...b.costs].map((r) => ['Budget', r.label, r.kind, r.budget, r.actual, r.amount, r.mark ?? '']),
      ['Budget', 'Total revenues', 'revenue', b.totalRevenue.budget, b.totalRevenue.actual, b.totalRevenue.variance.amount, b.totalRevenue.variance.mark ?? ''],
      ['Budget', 'Total costs', 'cost', b.totalCost.budget, b.totalCost.actual, b.totalCost.variance.amount, b.totalCost.variance.mark ?? ''],
      ['Budget', 'Excess of revenues over (under) costs', '', b.surplus.budget, b.surplus.actual, b.surplus.variance.amount, b.surplus.variance.mark ?? ''],
    ],
  };
}
