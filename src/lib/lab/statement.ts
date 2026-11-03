/**
 * The lab's profit and loss builder: a statement of profit or loss in the
 * layout of the guide's figure 6 (p. 59), from sales revenue to retained
 * profit, with cost of sales either entered or worked out from stock and
 * purchases. The subtotals come from profitOrLoss() in src/lib/ratios.ts and
 * the margins from its ratio workings.
 */
import { fmtNumber, round } from '../format';
import { esc } from '../markup';
import { costOfSalesFromStock, fmtRatio, profitOrLoss, ratioWorkings, valueFromInputs, type ProfitOrLossLines } from '../ratios';
import type { Working } from '../finance';
import { PROFIT_AND_LOSS } from './business';
import { waterfallSvg, type WaterfallStep } from './charts';
import { PL_FIELDS, checkValue } from './fields';
import type { LabReport, Problem, Raw, Settings, WorkingBlock } from './types';
import { money, pct, signedPct } from './util';

export interface StatementState {
  /** 1: cost of sales from opening stock + purchases − closing stock; 0: entered directly. */
  stockMode: 0 | 1;
  salesRevenue: number;
  openingStock: number;
  purchases: number;
  closingStock: number;
  costOfSales: number;
  expenses: number;
  interest: number;
  tax: number;
  dividends: number;
  /** The heading of the statement. */
  entity: string;
  period: string;
}

export const STATEMENT_DEFAULTS: StatementState = { stockMode: 1, ...PROFIT_AND_LOSS, entity: 'Emberly Roasters', period: 'for the year ended 31 December 2025' };

export const STATEMENT_TEXT_DEFAULTS = { entity: STATEMENT_DEFAULTS.entity, period: STATEMENT_DEFAULTS.period };

const STOCK = [PL_FIELDS.openingStock, PL_FIELDS.purchases, PL_FIELDS.closingStock];

export function validateStatement(raw: Raw): Problem[] {
  const mode = raw.stockMode === 0 ? 0 : 1;
  const specs = [PL_FIELDS.salesRevenue, ...(mode === 1 ? STOCK : [PL_FIELDS.costOfSales]), PL_FIELDS.expenses, PL_FIELDS.interest, PL_FIELDS.tax, PL_FIELDS.dividends];
  const out: Problem[] = [];
  for (const f of specs) {
    const m = checkValue(raw[f.key], f);
    if (m) out.push({ field: f.key, message: m });
  }
  if (mode === 1 && !out.length) {
    const cos = costOfSalesFromStock(raw.openingStock ?? 0, raw.purchases ?? 0, raw.closingStock ?? 0);
    if (cos < 0) out.push({ field: 'closingStock', message: 'Closing stock cannot be more than opening stock plus purchases: cost of sales would be negative.' });
  }
  return out;
}

export function statementState(raw: Raw, text: Record<string, string>): StatementState {
  const v = (k: keyof StatementState) => {
    const x = raw[k];
    return typeof x === 'number' && Number.isFinite(x) ? x : (STATEMENT_DEFAULTS[k] as number);
  };
  const clean = (t: string | undefined, d: string) => {
    const s = (t ?? '').trim().replace(/\s+/g, ' ');
    return s ? s.slice(0, 80) : d;
  };
  return {
    stockMode: raw.stockMode === 0 ? 0 : 1,
    salesRevenue: v('salesRevenue'),
    openingStock: v('openingStock'),
    purchases: v('purchases'),
    closingStock: v('closingStock'),
    costOfSales: v('costOfSales'),
    expenses: v('expenses'),
    interest: v('interest'),
    tax: v('tax'),
    dividends: v('dividends'),
    entity: clean(text.entity, STATEMENT_DEFAULTS.entity),
    period: clean(text.period, STATEMENT_DEFAULTS.period),
  };
}

/** The lines the statement is built from, with cost of sales worked out when the reader gives stock and purchases. */
export function statementLines(st: StatementState): ProfitOrLossLines {
  return {
    salesRevenue: st.salesRevenue,
    costOfSales: st.stockMode === 1 ? costOfSalesFromStock(st.openingStock, st.purchases, st.closingStock) : st.costOfSales,
    expenses: st.expenses,
    interest: st.interest,
    tax: st.tax,
    dividends: st.dividends,
  };
}

/** A figure as the guide prints it in a statement: grouped, with deductions and losses in brackets. */
export function fmtStatement(v: number, deduct = false): string {
  const n = fmtNumber(Math.abs(v), Number.isInteger(round(v, 2)) ? 0 : 2);
  if (Math.abs(v) < 0.005) return '0';
  return deduct !== v < 0 ? `(${n})` : n;
}

/** The statement in the guide's layout (figure 6), as an HTML table. */
export function statementTableHtml(st: StatementState, s: Settings): string {
  const L = statementLines(st);
  const p = profitOrLoss(L);
  const rows: Array<[string, number, 'line' | 'less' | 'total' | 'final']> = [
    ['Sales revenue', L.salesRevenue, 'line'],
    ['Cost of sales', L.costOfSales, 'less'],
    ['Gross profit', p.grossProfit, 'total'],
    ['Expenses', L.expenses, 'less'],
    ['Profit before interest and tax', p.pbit, 'total'],
    ['Interest', L.interest, 'less'],
    ['Profit before tax', p.profitBeforeTax, 'total'],
    ['Tax', L.tax, 'less'],
    ['Profit for period', p.profitForPeriod, 'total'],
    ['Dividends', L.dividends, 'less'],
    ['Retained profit', p.retainedProfit, 'final'],
  ];
  const body = rows
    .map(([label, v, kind]) => `<tr class="pl-row pl-row--${kind}"><th scope="row">${esc(label)}</th><td class="n">${esc(fmtStatement(v, kind === 'less'))}</td></tr>`)
    .join('');
  return `<div class="table-scroll pl-sheet" role="region" aria-label="Statement of profit or loss" tabindex="0"><table class="table pl-table"><caption><span class="pl-table__entity">${esc(st.entity)}</span><span class="pl-table__title">Statement of profit or loss</span><span class="pl-table__period">${esc(st.period)}</span></caption><thead><tr><th scope="col"><span class="sr-only">Line</span></th><th scope="col" class="n">${esc(s.currency.trim() || 'Amount')}</th></tr></thead><tbody>${body}</tbody></table></div><p class="small muted pl-note">Deductions and losses are in brackets, as in the guide’s layout (figure 6, p. 59).</p>`;
}

function step(given: Working['given'], formula: string, substitution: string, line: string, value: number, s: Settings, note?: string): Working {
  return { given, formula, substitution, steps: [line], answer: money(value, s.currency), value: round(value, 2), unit: s.currency.trim() || 'currency', note };
}

export function buildStatement(st: StatementState, s: Settings): LabReport {
  const L = statementLines(st);
  const p = profitOrLoss(L);
  const c = s.currency;
  const n = (v: number) => fmtNumber(v, Number.isInteger(round(v, 2)) ? 0 : 2);
  const gpm = valueFromInputs('gross-profit-margin', { grossProfit: p.grossProfit, salesRevenue: L.salesRevenue });
  const pm = valueFromInputs('profit-margin', { pbit: p.pbit, salesRevenue: L.salesRevenue });
  const workings: WorkingBlock[] = [];
  if (st.stockMode === 1) {
    workings.push({
      title: 'Cost of sales',
      working: step(
        [
          { label: 'Opening stock', value: money(st.openingStock, c) },
          { label: 'Purchases', value: money(st.purchases, c) },
          { label: 'Closing stock', value: money(st.closingStock, c) },
        ],
        'Cost of sales = opening stock + purchases − closing stock',
        `= ${money(st.openingStock, c)} + ${money(st.purchases, c)} − ${money(st.closingStock, c)}`,
        `${n(st.openingStock)} + ${n(st.purchases)} − ${n(st.closingStock)} = ${n(L.costOfSales)}`,
        L.costOfSales,
        s,
        'Closing stock is taken away because it has not been sold yet; it appears again as a current asset in the statement of financial position.',
      ),
      interpretation: `The goods actually sold in the period cost ${money(L.costOfSales, c)}.`,
      implication: 'Only the cost of what was sold belongs in this year’s cost of sales, not everything bought.',
    });
  }
  workings.push(
    {
      title: 'Gross profit',
      working: step(
        [
          { label: 'Sales revenue', value: money(L.salesRevenue, c) },
          { label: 'Cost of sales', value: money(L.costOfSales, c) },
        ],
        'Gross profit = sales revenue − cost of sales',
        `= ${money(L.salesRevenue, c)} − ${money(L.costOfSales, c)}`,
        `${n(L.salesRevenue)} − ${n(L.costOfSales)} = ${n(p.grossProfit)}`,
        p.grossProfit,
        s,
      ),
      interpretation: p.grossProfit >= 0 ? `Trading leaves ${money(p.grossProfit, c)} after the cost of the goods sold${gpm === null ? '' : `, ${fmtRatio(gpm, 'percent')} of sales revenue`}.` : 'The goods cost more than they sold for: the business loses money on trading itself.',
      implication: 'This is what is left to pay the expenses of running the business.',
    },
    {
      title: 'Profit before interest and tax',
      working: step(
        [
          { label: 'Gross profit', value: money(p.grossProfit, c) },
          { label: 'Expenses', value: money(L.expenses, c) },
        ],
        'Profit before interest and tax = gross profit − expenses',
        `= ${money(p.grossProfit, c)} − ${money(L.expenses, c)}`,
        `${n(p.grossProfit)} − ${n(L.expenses)} = ${n(p.pbit)}`,
        p.pbit,
        s,
      ),
      interpretation: `Operations earn ${money(p.pbit, c)} before the cost of finance and tax${pm === null ? '' : `, ${fmtRatio(pm, 'percent')} of sales revenue`}.`,
      implication: 'The profit margin and ROCE both start from this figure.',
    },
    {
      title: 'Profit before tax and profit for period',
      working: {
        given: [
          { label: 'Profit before interest and tax', value: money(p.pbit, c) },
          { label: 'Interest', value: money(L.interest, c) },
          { label: 'Tax', value: money(L.tax, c) },
        ],
        formula: 'Profit before tax = profit before interest and tax − interest; profit for period = profit before tax − tax',
        substitution: `= ${money(p.pbit, c)} − ${money(L.interest, c)}; then − ${money(L.tax, c)}`,
        steps: [`${n(p.pbit)} − ${n(L.interest)} = ${n(p.profitBeforeTax)}`, `${n(p.profitBeforeTax)} − ${n(L.tax)} = ${n(p.profitForPeriod)}`],
        answer: money(p.profitForPeriod, c),
        value: round(p.profitForPeriod, 2),
        unit: c.trim() || 'currency',
        note: p.profitForPeriod < 0 ? 'A negative profit for period is a loss.' : undefined,
      },
      interpretation: `After interest and tax, ${money(p.profitForPeriod, c)} belongs to the owners.`,
      implication: L.interest > 0 && p.pbit > 0 ? `Interest takes ${pct((L.interest / p.pbit) * 100)} of the operating profit.` : 'There is no interest to pay out of operating profit.',
    },
    {
      title: 'Retained profit',
      working: step(
        [
          { label: 'Profit for period', value: money(p.profitForPeriod, c) },
          { label: 'Dividends', value: money(L.dividends, c) },
        ],
        'Retained profit = profit for period − dividends',
        `= ${money(p.profitForPeriod, c)} − ${money(L.dividends, c)}`,
        `${n(p.profitForPeriod)} − ${n(L.dividends)} = ${n(p.retainedProfit)}`,
        p.retainedProfit,
        s,
      ),
      interpretation: p.retainedProfit >= 0 ? `${money(p.retainedProfit, c)} is kept in the business and adds to retained earnings.` : 'Dividends are more than the profit for period, so retained earnings fall.',
      implication: 'Retained profit is an internal source of finance (3.2) for the next year’s investment.',
    },
  );
  workings.push(
    { title: 'Gross profit margin', working: ratioWorkings['gross-profit-margin']({ grossProfit: p.grossProfit, salesRevenue: L.salesRevenue }, c.trim()), interpretation: gpm === null ? 'Sales revenue is zero, so there is no margin.' : `${fmtRatio(gpm, 'percent')} of each sale is left after the cost of sales.`, implication: 'Worked in full, with two years, in the gross profit margin calculator.' },
    { title: 'Profit margin', working: ratioWorkings['profit-margin']({ pbit: p.pbit, salesRevenue: L.salesRevenue }, c.trim()), interpretation: pm === null ? 'Sales revenue is zero, so there is no margin.' : `${fmtRatio(pm, 'percent')} of each sale is left after all the costs of running the business.`, implication: 'Worked in full, with two years, in the profit margin calculator.' },
  );
  const steps: WaterfallStep[] = [
    { label: 'Sales revenue', value: L.salesRevenue, kind: 'total' },
    { label: 'Cost of sales', value: L.costOfSales, kind: 'less' },
    { label: 'Gross profit', value: p.grossProfit, kind: 'total' },
    { label: 'Expenses', value: L.expenses, kind: 'less' },
    { label: 'Profit before interest and tax', value: p.pbit, kind: 'total' },
    { label: 'Interest', value: L.interest, kind: 'less' },
    { label: 'Profit before tax', value: p.profitBeforeTax, kind: 'total' },
    { label: 'Tax', value: L.tax, kind: 'less' },
    { label: 'Profit for period', value: p.profitForPeriod, kind: 'total' },
    { label: 'Dividends', value: L.dividends, kind: 'less' },
    { label: 'Retained profit', value: p.retainedProfit, kind: 'total' },
  ];
  // Sales up or down, with cost of sales in proportion and expenses unchanged.
  const changes = [-0.2, -0.1, -0.05, 0, 0.05, 0.1];
  const sens = changes.map((k) => {
    const sr = L.salesRevenue * (1 + k);
    const lines = { ...L, salesRevenue: sr, costOfSales: L.costOfSales * (1 + k) };
    const q = profitOrLoss(lines);
    const m = valueFromInputs('profit-margin', { pbit: q.pbit, salesRevenue: sr });
    return { k, sr, q, m, row: { th: k === 0 ? 'As entered' : `Sales ${k > 0 ? '+' : '−'}${Math.abs(k * 100)}%`, cells: [money(sr, c), money(q.grossProfit, c), money(q.pbit, c), fmtRatio(m, 'percent'), k === 0 ? 'as entered' : signedPct(p.pbit, q.pbit)], base: k === 0 } };
  });
  const down10 = sens.find((x) => x.k === -0.1);
  const sensReading =
    p.pbit > 0 && down10
      ? `Because expenses stay the same while gross profit moves with sales, profit before interest and tax moves faster than sales: a 10% fall in sales cuts it by ${signedPct(p.pbit, down10.q.pbit).replace('−', '')}, to ${money(down10.q.pbit, c)}.`
      : 'At these figures profit before interest and tax is zero or negative, so compare the money columns rather than the percentage change.';
  const largest = [
    { name: 'cost of sales', v: L.costOfSales },
    { name: 'expenses', v: L.expenses },
    { name: 'interest', v: L.interest },
    { name: 'tax', v: L.tax },
  ].sort((a, b) => b.v - a.v)[0];
  const actions: string[] = [];
  if (gpm !== null && gpm < 30) actions.push('The gross margin is thin: look at prices and the cost of sales first, such as supplier terms, waste and the product mix.');
  if (L.salesRevenue > 0 && L.expenses > 0) actions.push(`Expenses take ${pct((L.expenses / L.salesRevenue) * 100)} of sales: compare that share with earlier years and similar businesses before cutting, and protect the spending that wins sales.`);
  if (p.pbit > 0 && L.interest / p.pbit > 0.15) actions.push('Interest takes a large share of operating profit: refinancing at a lower rate or repaying debt would leave more for the owners.');
  if (p.retainedProfit < 0) actions.push('Dividends exceed the profit for period: paying them reduces the business’s reserves, which cannot continue for long.');
  actions.push('Weigh dividends against retained profit: owners want a return now, but retained profit is the cheapest finance for growth.');
  return {
    headline: { label: 'Profit for period', value: money(p.profitForPeriod, c), note: `Retained profit ${money(p.retainedProfit, c)}; gross profit margin ${fmtRatio(gpm, 'percent')}` },
    figures: [
      { label: 'Gross profit margin', value: fmtRatio(gpm, 'percent'), note: 'gross profit ÷ sales revenue × 100' },
      { label: 'Profit margin', value: fmtRatio(pm, 'percent'), note: 'profit before interest and tax ÷ sales revenue × 100' },
      { label: 'Share of sales taken by expenses', value: L.salesRevenue > 0 ? pct((L.expenses / L.salesRevenue) * 100, 2) : 'n/a', note: 'the gap between the two margins' },
      { label: 'Cost of sales', value: money(L.costOfSales, c), note: st.stockMode === 1 ? 'opening stock + purchases − closing stock' : 'as entered' },
    ],
    workings,
    chart: {
      svg: waterfallSvg(steps, { currency: c, id: 'lab-profit-and-loss-chart' }),
      caption: 'Each dark bar is a stage of profit in the statement’s order; each light bar is what is deducted on the way to the next stage.',
      table: { caption: 'The chart’s figures', head: ['Line', 'Amount', 'Kind'], rows: steps.map((x) => ({ th: x.label, cells: [fmtStatement(x.value, x.kind === 'less'), x.kind === 'total' ? 'Stage of profit' : 'Deduction'] })), numeric: [false, true, false] },
    },
    sensitivity: {
      title: 'If sales revenue changes',
      intro: 'Profit before interest and tax when sales revenue changes, assuming cost of sales moves in proportion and expenses stay the same. Interest, tax and dividends are left out, because they do not follow sales in a simple way.',
      table: { caption: 'Profit before interest and tax at different levels of sales', head: ['Change', 'Sales revenue', 'Gross profit', 'Profit before interest and tax', 'Profit margin', 'Change in profit'], rows: sens.map((x) => x.row) },
      reading: sensReading,
    },
    interpretation: {
      meaning: `From sales revenue of ${money(L.salesRevenue, c)}, the business keeps **${money(p.grossProfit, c)}** after the cost of sales (gross profit${gpm === null ? '' : `, ${fmtRatio(gpm, 'percent')} of sales`}), **${money(p.pbit, c)}** after expenses (profit before interest and tax${pm === null ? '' : `, ${fmtRatio(pm, 'percent')}`}) and **${money(p.profitForPeriod, c)}** after interest and tax. It pays ${money(L.dividends, c)} in dividends and retains ${money(p.retainedProfit, c)}. The largest deduction is ${largest?.name ?? 'cost of sales'}.`,
      compare: 'Compare each stage with the same statement for earlier years: the margins show whether prices and direct costs (gross profit margin) or overheads (the gap down to the profit margin) explain a change. Compare the margins with similar businesses, and retained profit with the business’s plans for investment.',
      benchmarks: 'A healthy statement looks different in every industry. A retailer has a large cost of sales and a thin margin; a consultancy has almost no cost of sales but large expenses, mostly salaries. Over time, a business that is investing may show lower profit for a while, and choices such as how fast assets are depreciated change the figures, so compare like with like.',
      actions,
    },
    extra: statementTableHtml(st, s),
    given: [
      { label: 'Sales revenue', value: money(L.salesRevenue, c) },
      ...(st.stockMode === 1
        ? [
            { label: 'Opening stock', value: money(st.openingStock, c) },
            { label: 'Purchases', value: money(st.purchases, c) },
            { label: 'Closing stock', value: money(st.closingStock, c) },
          ]
        : [{ label: 'Cost of sales', value: money(st.costOfSales, c) }]),
      { label: 'Expenses', value: money(L.expenses, c) },
      { label: 'Interest', value: money(L.interest, c) },
      { label: 'Tax', value: money(L.tax, c) },
      { label: 'Dividends', value: money(L.dividends, c) },
    ],
    announce: `Profit for period ${money(p.profitForPeriod, c)}. Retained profit ${money(p.retainedProfit, c)}.`,
    csv: [
      ['Input', 'Business', st.entity, ''],
      ['Input', 'Period', st.period, ''],
      ['Input', 'Sales revenue', L.salesRevenue, c.trim()],
      ...(st.stockMode === 1 ? STOCK.map((f) => ['Input', f.label, st[f.key as 'openingStock' | 'purchases' | 'closingStock'], c.trim()]) : [['Input', 'Cost of sales', st.costOfSales, c.trim()]]),
      ['Input', 'Expenses', L.expenses, c.trim()],
      ['Input', 'Interest', L.interest, c.trim()],
      ['Input', 'Tax', L.tax, c.trim()],
      ['Input', 'Dividends', L.dividends, c.trim()],
      ['Statement', 'Sales revenue', L.salesRevenue, c.trim()],
      ['Statement', 'Cost of sales', -L.costOfSales, c.trim()],
      ['Statement', 'Gross profit', p.grossProfit, c.trim()],
      ['Statement', 'Expenses', -L.expenses, c.trim()],
      ['Statement', 'Profit before interest and tax', p.pbit, c.trim()],
      ['Statement', 'Interest', -L.interest, c.trim()],
      ['Statement', 'Profit before tax', p.profitBeforeTax, c.trim()],
      ['Statement', 'Tax', -L.tax, c.trim()],
      ['Statement', 'Profit for period', p.profitForPeriod, c.trim()],
      ['Statement', 'Dividends', -L.dividends, c.trim()],
      ['Statement', 'Retained profit', p.retainedProfit, c.trim()],
      ['Result', 'Gross profit margin', gpm === null ? 'not defined' : round(gpm, 4), '%'],
      ['Result', 'Profit margin', pm === null ? 'not defined' : round(pm, 4), '%'],
      ...sens.map((x) => ['Sensitivity', x.row.th, round(x.q.pbit, 2), `${c.trim()} profit before interest and tax`]),
    ],
  };
}
