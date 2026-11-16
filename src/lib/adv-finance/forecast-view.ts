/**
 * The integrated forecast as a page: the three statements for the case in
 * view, the measures for each year, the scenarios, the two alternatives side
 * by side, every scenario with every option, the readings and the CSV rows.
 * The server renders the worked example with these functions and the browser
 * re-renders with them after every change.
 */
import { fmtMoney, fmtNumber, fmtPercent } from '../format';
import { inline } from '../markup';
import type { TableSpec } from '../finance-lab/types';
import { COBALT, GREEN, INK, linesSvg, SIGNAL, SLATE, shortMoney } from './charts';
import { chartFigureHtml, figuresHtml, givenHtml, headlineHtml, paras, readingHtml, statementHtml, tableHtml, type Fig, type StatementRow } from './html';
import { ALTERNATIVE_FIELDS, DRIVER_FIELDS, FLEX_FIELDS, OPENING_FIELDS, OPTION_IDS, runAll, SCENARIO_IDS, SCENARIO_NAMES, type ForecastInput, type OptionId, type Run, type ScenarioId } from './forecast';

export interface ForecastView {
  scenario: ScenarioId;
  option: OptionId;
}

export type ForecastRegion = 'headline' | 'figures' | 'case' | 'pl' | 'cf' | 'bs' | 'measures' | 'scenarios' | 'options' | 'matrix' | 'meaning' | 'given';

export interface ForecastReport {
  runs: ReturnType<typeof runAll>;
  view: ForecastView;
  regions: Record<ForecastRegion, string>;
  headline: { label: string; value: string; note: string };
  /** One calm sentence for the live region. */
  announce: string;
  /** A line for the dashboard: what the saved work holds. */
  summary: string;
  csv: Array<Array<string | number>>;
}

export function optionName(input: ForecastInput, o: OptionId): string {
  return o === 'none' ? 'Making no change' : input.alternatives[o].name;
}

/** The case in view, as it heads the statements: "Base case: Making no change". */
export function caseName(input: ForecastInput, v: ForecastView): string {
  return `${SCENARIO_NAMES[v.scenario]}: ${optionName(input, v.option)}`;
}

const pct = (v: number | null, d = 1) => (v === null ? 'n/a' : fmtPercent(v, d));
const times = (v: number | null) => (v === null ? 'n/a' : `${fmtNumber(v, 1)} times`);

/* ------------------------------------------------------------------ */
/* The statements                                                      */
/* ------------------------------------------------------------------ */

function profitOrLoss(run: Run): StatementRow[] {
  const v = (f: (y: Run['years'][number]) => number) => run.years.map(f);
  return [
    { label: 'Sales revenue', values: v((y) => y.revenue) },
    { label: 'Cost of sales (variable costs)', values: v((y) => -y.costOfSales), kind: 'less' },
    { label: 'Gross profit', values: v((y) => y.grossProfit), kind: 'total' },
    { label: 'Fixed costs', values: v((y) => -y.fixedCosts) },
    { label: 'Depreciation', values: v((y) => -y.depreciation), kind: 'less' },
    { label: 'Profit before interest and tax', values: v((y) => y.pbit), kind: 'total' },
    { label: 'Interest', values: v((y) => -y.interest), kind: 'less' },
    { label: 'Profit before tax', values: v((y) => y.pbt), kind: 'total' },
    { label: 'Tax', values: v((y) => -y.tax), kind: 'less' },
    { label: 'Profit for the year', values: v((y) => y.profit), kind: 'total' },
    { label: 'Dividends', values: v((y) => -y.dividends), kind: 'less' },
    { label: 'Retained profit', values: v((y) => y.retained), kind: 'final' },
  ];
}

function cashFlows(run: Run): StatementRow[] {
  const v = (f: (y: Run['years'][number]) => number) => run.years.map(f);
  return [
    { label: 'Cash flows from operating activities', values: [], kind: 'head' },
    { label: 'Profit for the year', values: v((y) => y.profit) },
    { label: 'Add back depreciation', values: v((y) => y.depreciation) },
    { label: '(Increase) or decrease in stock', values: v((y) => -y.changeStock) },
    { label: '(Increase) or decrease in debtors', values: v((y) => -y.changeDebtors) },
    { label: 'Increase or (decrease) in trade creditors', values: v((y) => y.changeCreditors), kind: 'less' },
    { label: 'Net cash from operating activities', values: v((y) => y.operating), kind: 'total' },
    { label: 'Cash flows from investing activities', values: [], kind: 'head' },
    { label: 'Purchase of non-current assets', values: v((y) => -y.capex), kind: 'less' },
    { label: 'Net cash used in investing activities', values: v((y) => -y.capex), kind: 'total' },
    { label: 'Cash flows from financing activities', values: [], kind: 'head' },
    { label: 'New borrowing', values: v((y) => y.borrowing) },
    { label: 'Borrowing repaid', values: v((y) => -y.repayment) },
    { label: 'Dividends paid', values: v((y) => -y.dividends), kind: 'less' },
    { label: 'Net cash from financing activities', values: v((y) => y.financing), kind: 'total' },
    { label: 'Net change in cash', values: v((y) => y.netCash), kind: 'total' },
    { label: 'Cash at the start of the year', values: v((y) => y.openingCash) },
    { label: 'Cash at the end of the year', values: v((y) => y.closingCash), kind: 'final' },
  ];
}

function position(run: Run): StatementRow[] {
  const o = run.opening;
  const v = (open: number, f: (y: Run['years'][number]) => number) => [open, ...run.years.map(f)];
  return [
    { label: 'Non-current assets (net book value)', values: v(o.nonCurrentAssets, (y) => y.nonCurrentAssets) },
    { label: 'Current assets', values: [], kind: 'head' },
    { label: 'Cash', values: v(o.cash, (y) => y.cash) },
    { label: 'Debtors', values: v(o.debtors, (y) => y.debtors) },
    { label: 'Stock', values: v(o.stock, (y) => y.stock), kind: 'less' },
    { label: 'Total current assets', values: v(o.currentAssets, (y) => y.currentAssets), kind: 'total' },
    { label: 'Total assets', values: v(o.totalAssets, (y) => y.totalAssets), kind: 'total' },
    { label: 'Current liabilities', values: [], kind: 'head' },
    { label: 'Bank overdraft', values: v(o.overdraft, (y) => y.overdraft) },
    { label: 'Trade creditors', values: v(o.creditors, (y) => y.creditors), kind: 'less' },
    { label: 'Total current liabilities', values: v(o.currentLiabilities, (y) => y.currentLiabilities), kind: 'total' },
    { label: 'Non-current liabilities: borrowings', values: v(o.borrowings, (y) => y.borrowings), kind: 'less' },
    { label: 'Total liabilities', values: v(o.totalLiabilities, (y) => y.totalLiabilities), kind: 'total' },
    { label: 'Net assets', values: v(o.netAssets, (y) => y.netAssets), kind: 'final' },
    { label: 'Equity', values: [], kind: 'head' },
    { label: 'Share capital', values: v(o.shareCapital, (y) => y.shareCapital) },
    { label: 'Retained earnings', values: v(o.retainedEarnings, (y) => y.retainedEarnings), kind: 'less' },
    { label: 'Total equity', values: v(o.equity, (y) => y.equity), kind: 'final' },
  ];
}

/* ------------------------------------------------------------------ */
/* Readings                                                            */
/* ------------------------------------------------------------------ */

function cashSentence(run: Run, m: (v: number) => string): string {
  const l = run.last;
  const low = run.years[run.lowest.index];
  const overdrawn = run.years.filter((y) => y.closingCash < 0).length;
  if (run.lowest.value < 0 && low) {
    const end = l.closingCash >= 0 ? `and ${l.label} ends with ${m(l.closingCash)} in the bank` : `and the business is still overdrawn at the end of ${l.label}, by ${m(-l.closingCash)}`;
    return `Cash is lowest at the end of ${low.label}, an overdraft of ${m(-run.lowest.value)} (overdrawn at ${overdrawn} of ${run.years.length} year-ends), ${end}.`;
  }
  return `Cash never runs out: the lowest year-end balance is ${m(run.lowest.value)}${low ? ` (${low.label})` : ''}, and ${l.label} ends with ${m(l.closingCash)}.`;
}

export function meaningText(input: ForecastInput, run: Run, currency: string): string[] {
  const m = (v: number) => fmtMoney(v, currency, 0);
  const f = run.years[0];
  const l = run.last;
  if (!f) return [];
  const n = run.years.length;
  const wc = run.years.reduce((a, y) => a + y.changeStock + y.changeDebtors - y.changeCreditors, 0);
  const dep = run.years.reduce((a, y) => a + y.depreciation, 0);
  const out = [
    `In the case shown (${caseName(input, { scenario: run.scenario, option: run.option })}), sales revenue moves from ${m(f.revenue)} in ${f.label} to ${m(l.revenue)} in ${l.label}, and the profit for the year from ${m(f.profit)} to ${m(l.profit)}: **${m(run.totalProfit)} over the ${n} years**. The profit margin, the IB’s profit before interest and tax as a share of sales revenue, moves from ${pct(f.profitMargin)} to ${pct(l.profitMargin)}.`,
    `${cashSentence(run, m)} ${l.borrowings === 0 ? (input.opening.borrowings > 0 || run.years.some((y) => y.borrowing > 0) ? 'All the borrowing has been repaid by then.' : '') : `Borrowing of ${m(l.borrowings)} is still to be repaid.`}`.trim(),
    `Profit is not cash. Over the ${n} years the business earns ${m(run.totalProfit)} of profit and generates ${m(run.totalOperating)} of cash from its operations: the profit, plus ${m(dep)} of depreciation (a cost that uses no cash), ${wc >= 0 ? `less ${m(wc)} tied up in more stock and debtors than extra supplier credit pays for` : `plus ${m(-wc)} released from working capital`}. Capital expenditure of ${m(run.totalCapex)}, the repayments and the dividends then come out of that cash.`,
    run.balances ? `The statement of financial position balances in every year: assets less liabilities equal equity, because the cash on it is the cash the statement of cash flows arrives at.` : `The statement of financial position does not balance in every year, which means the figures are not consistent: check the opening position.`,
  ];
  return out;
}

function scenarioText(input: ForecastInput, runs: Record<ScenarioId, Run>, currency: string): string {
  const m = (v: number) => fmtMoney(v, currency, 0);
  const b = runs.base;
  const u = runs.upside;
  const d = runs.downside;
  const n = b.years.length;
  const dol = b.years[0]?.operatingLeverage ?? null;
  const parts = [`Profit over the ${n} years is ${m(d.totalProfit)} in the downside, ${m(b.totalProfit)} in the base case and ${m(u.totalProfit)} in the upside.`];
  if (dol !== null) parts.push(`The swing is wide because the margin is thin: in ${b.years[0]?.label} the base case’s degree of operating leverage is ${fmtNumber(dol, 1)}, so a 1% change in units sold, at the same prices and costs, moves profit before interest and tax by about ${fmtNumber(dol, 1)}%.`);
  const worst = d.years[d.lowest.index];
  if (d.lowest.value < 0 && worst) parts.push(`In the downside the overdraft reaches ${m(-d.lowest.value)} at the end of ${worst.label}: the size of the facility, or the new finance, the plan would need if things go badly.`);
  else parts.push('Even the downside keeps cash above zero at every year-end.');
  parts.push('Scenarios are not predictions: they show how far the result moves when the drivers do, so the board knows which assumptions the plan depends on.');
  void input;
  return parts.join(' ');
}

function optionsText(input: ForecastInput, runs: Record<OptionId, Run>, scenario: ScenarioId, currency: string): string {
  const m = (v: number) => fmtMoney(v, currency, 0);
  const ranked = [...OPTION_IDS].sort((a, b) => runs[b].totalProfit - runs[a].totalProfit);
  const best = ranked[0] as OptionId;
  const others = ranked.slice(1);
  const last = runs.none.last.label;
  const n = runs.none.years.length;
  const parts = [`${SCENARIO_NAMES[scenario]}: the most profit over the ${n} years comes from **${optionName(input, best)}**, ${m(runs[best].totalProfit)}, against ${others.map((o) => `${m(runs[o].totalProfit)} (${optionName(input, o)})`).join(' and ')}.`];
  const finalLeader = [...OPTION_IDS].sort((a, b) => runs[b].last.profit - runs[a].last.profit)[0] as OptionId;
  if (finalLeader !== best) parts.push(`But ${optionName(input, finalLeader)} earns the most in ${last} (${m(runs[finalLeader].last.profit)}, against ${m(runs[best].last.profit)}): it is catching up, and over a longer horizon the order could change.`);
  for (const o of ['a', 'b'] as const) {
    const alt = input.alternatives[o];
    const r = runs[o];
    if (alt.investment > 0) parts.push(`${alt.name} needs ${m(alt.investment)} in ${r.years[0]?.label}${alt.borrowing > 0 ? `, ${m(alt.borrowing)} of it borrowed` : ''}; its net debt at the end of ${last} is ${m(r.last.netDebt)}${r.last.netDebt < 0 ? ' (more cash than debt)' : ''}.`);
  }
  const safest = [...OPTION_IDS].sort((a, b) => runs[b].lowest.value - runs[a].lowest.value)[0] as OptionId;
  parts.push(`${optionName(input, safest)} puts the least strain on cash: its lowest year-end balance is ${m(runs[safest].lowest.value)}.`);
  return parts.join(' ');
}

function matrixText(input: ForecastInput, runs: ReturnType<typeof runAll>, currency: string): string {
  const m = (v: number) => fmtMoney(v, currency, 0);
  const order = (s: ScenarioId) => [...OPTION_IDS].sort((a, b) => runs[`${s}/${b}`].totalProfit - runs[`${s}/${a}`].totalProfit);
  const picks = SCENARIO_IDS.map((s) => {
    const o = order(s);
    const best = o[0] as OptionId;
    const second = o[1] as OptionId;
    return { s, best, second, lead: runs[`${s}/${best}`].totalProfit - runs[`${s}/${second}`].totalProfit };
  });
  const same = picks.every((p) => p.best === picks[0]?.best);
  if (same) {
    const closest = [...picks].sort((a, b) => a.lead - b.lead)[0];
    return `On profit over the whole forecast, ${optionName(input, picks[0]?.best ?? 'none')} comes first in every scenario: a choice that wins whichever way the drivers move is robust. ${closest ? `Its narrowest lead is in the ${SCENARIO_NAMES[closest.s].toLowerCase()}, ${m(closest.lead)} over ${optionName(input, closest.second)}, so a small change in the drivers could reverse it.` : ''}`.trim();
  }
  return `The best choice depends on the scenario: ${picks.map((p) => `${SCENARIO_NAMES[p.s].toLowerCase()}, ${optionName(input, p.best)}`).join('; ')}. The option with the lower fixed costs protects profit when volume disappoints; the one with the lower variable cost earns more when volume is high. Which to choose depends on how likely each scenario is and how much risk the business can carry.`;
}

/* ------------------------------------------------------------------ */
/* The report                                                          */
/* ------------------------------------------------------------------ */

const SCENARIO_STYLE: Record<ScenarioId, { colour: string; dash?: string }> = {
  base: { colour: INK },
  upside: { colour: GREEN, dash: '7 5' },
  downside: { colour: SIGNAL, dash: '2 4' },
};
const OPTION_STYLE: Record<OptionId, { colour: string; dash?: string }> = {
  none: { colour: SLATE, dash: '2 4' },
  a: { colour: INK },
  b: { colour: COBALT, dash: '7 5' },
};

export function buildForecastReport(input: ForecastInput, view: ForecastView, currency: string): ForecastReport {
  const runs = runAll(input);
  const run = runs[`${view.scenario}/${view.option}`];
  const m = (v: number) => fmtMoney(v, currency, 0);
  const cur = currency.trim() || 'currency';
  const years = run.years.map((y) => y.label);
  const first = run.years[0];
  const last = run.last;
  const low = run.years[run.lowest.index];
  const overdrawn = run.years.filter((y) => y.closingCash < 0).length;
  const name = caseName(input, view);

  const headline = {
    label: 'Lowest year-end cash',
    value: m(run.lowest.value),
    note: run.lowest.value < 0 ? `an overdraft at the end of ${low?.label}; overdrawn at ${overdrawn} of ${run.years.length} year-ends` : `at the end of ${low?.label}; never overdrawn at a year-end`,
  };
  const figures: Fig[] = [
    { label: `Profit for the year, ${first?.label}`, value: m(first?.profit ?? 0), note: `${last.label}: ${m(last.profit)}` },
    { label: `Profit over ${run.years.length} years`, value: m(run.totalProfit) },
    { label: `Cash at the end of ${last.label}`, value: m(last.closingCash), note: last.closingCash < 0 ? 'an overdraft' : 'in the bank' },
    last.netDebt <= 0
      ? { label: `Net cash at the end of ${last.label}`, value: m(-last.netDebt), note: 'cash less borrowing and any overdraft' }
      : { label: `Net debt at the end of ${last.label}`, value: m(last.netDebt), note: 'borrowing and any overdraft less cash' },
    { label: `ROCE, ${last.label}`, value: pct(last.roce), note: 'the IB’s formula, on closing capital employed', standing: 'ib' },
    { label: 'Balance check', value: run.balances ? 'Balances every year' : 'Does not balance', note: 'assets − liabilities = equity' },
  ];

  const statementNote = 'Negative figures in brackets, as in the guide’s layouts. Interest and tax are paid in the year they are charged, so they sit inside the profit for the year; a published statement of cash flows would show them on lines of their own.';
  const pl = statementHtml({ id: 'af-pl-cap', title: 'Statement of profit or loss', caption: `for each year ended 31 December, ${name}`, columns: years, rows: profitOrLoss(run), unit: `${cur}` });
  const cf = statementHtml({ id: 'af-cf-cap', title: 'Statement of cash flows', caption: `for each year, built from the profit (the indirect method), ${name}`, columns: years, rows: cashFlows(run), unit: `${cur}`, note: statementNote });
  const bs = statementHtml({ id: 'af-bs-cap', title: 'Statement of financial position', caption: `at the start and at 31 December each year, ${name}`, columns: [run.opening.label, ...years], rows: position(run), unit: `${cur}` });

  const measures: TableSpec = {
    caption: `Measures for each year, ${name}`,
    head: ['Measure', ...years],
    rows: [
      { th: 'Units sold', cells: run.years.map((y) => fmtNumber(y.volume)) },
      { th: 'Gross margin', cells: run.years.map((y) => pct(y.grossMargin)) },
      { th: 'Profit margin (IB 3.5)', cells: run.years.map((y) => pct(y.profitMargin)) },
      { th: 'ROCE (IB 3.5)', cells: run.years.map((y) => pct(y.roce)) },
      { th: 'Gearing (IB 3.6, HL)', cells: run.years.map((y) => pct(y.gearing)) },
      { th: 'Current ratio (IB 3.5)', cells: run.years.map((y) => (y.currentRatio === null ? 'n/a' : fmtNumber(y.currentRatio, 2))) },
      { th: 'Interest cover', cells: run.years.map((y) => times(y.interestCover)) },
      { th: 'Break-even units, before interest', cells: run.years.map((y) => (y.breakEven === null ? 'none' : fmtNumber(y.breakEven))) },
      { th: 'Degree of operating leverage', cells: run.years.map((y) => (y.operatingLeverage === null ? 'n/a' : fmtNumber(y.operatingLeverage, 2))) },
      { th: 'Net debt (negative: net cash)', cells: run.years.map((y) => m(y.netDebt)) },
    ],
  };

  /* Scenarios, for the option in view */
  const byScenario = Object.fromEntries(SCENARIO_IDS.map((s) => [s, runs[`${s}/${view.option}`]])) as Record<ScenarioId, Run>;
  const scenarioTable: TableSpec = {
    caption: `Each scenario (${optionName(input, view.option)})`,
    head: ['Measure', ...SCENARIO_IDS.map((s) => SCENARIO_NAMES[s])],
    rows: [
      { th: `Sales revenue, ${last.label}`, cells: SCENARIO_IDS.map((s) => m(byScenario[s].last.revenue)) },
      { th: `Profit for the year, ${first?.label}`, cells: SCENARIO_IDS.map((s) => m(byScenario[s].years[0]?.profit ?? 0)) },
      { th: `Profit for the year, ${last.label}`, cells: SCENARIO_IDS.map((s) => m(byScenario[s].last.profit)) },
      { th: `Profit over ${run.years.length} years`, cells: SCENARIO_IDS.map((s) => m(byScenario[s].totalProfit)), strong: true },
      { th: 'Lowest year-end cash', cells: SCENARIO_IDS.map((s) => `${m(byScenario[s].lowest.value)} (${byScenario[s].years[byScenario[s].lowest.index]?.label})`) },
      { th: `Cash at the end of ${last.label}`, cells: SCENARIO_IDS.map((s) => m(byScenario[s].last.closingCash)) },
      { th: `Net debt at the end of ${last.label} (negative: net cash)`, cells: SCENARIO_IDS.map((s) => m(byScenario[s].last.netDebt)) },
      { th: `ROCE, ${last.label}`, cells: SCENARIO_IDS.map((s) => pct(byScenario[s].last.roce)) },
    ],
  };
  const scenarioChart = chartFigureHtml({
    svg: linesSvg({
      id: 'af-scenario-cash',
      title: `Year-end cash in each scenario (${optionName(input, view.option)})`,
      desc: `${SCENARIO_IDS.map((s) => `${SCENARIO_NAMES[s]}: ${byScenario[s].years.map((y) => `${y.label} ${m(y.closingCash)}`).join(', ')}`).join('. ')}. Below zero the business is overdrawn.`,
      x: years,
      series: SCENARIO_IDS.map((s) => ({ label: SCENARIO_NAMES[s], values: byScenario[s].years.map((y) => y.closingCash), ...SCENARIO_STYLE[s], text: byScenario[s].years.map((y) => `${SCENARIO_NAMES[s]}, end of ${y.label}: ${m(y.closingCash)}`) })),
      tick: (v) => shortMoney(v, currency.trim()),
      axis: 'Year-end cash (below zero: an overdraft)',
      belowZero: 'Overdrawn',
    }),
    label: 'Year-end cash in each scenario',
    caption: 'Year-end cash in the base case, the upside and the downside. Below the zero line the business is overdrawn and is borrowing from the bank.',
    table: { caption: 'Year-end cash in each scenario', head: ['Year', ...SCENARIO_IDS.map((s) => SCENARIO_NAMES[s])], rows: years.map((yl, i) => ({ th: yl, cells: SCENARIO_IDS.map((s) => m(byScenario[s].years[i]?.closingCash ?? 0)) })) },
  });
  const scenarios = `${tableHtml(scenarioTable, 'Each scenario', 'af-compare')}${scenarioChart}${readingHtml(scenarioText(input, byScenario, currency))}`;

  /* The options, for the scenario in view */
  const byOption = Object.fromEntries(OPTION_IDS.map((o) => [o, runs[`${view.scenario}/${o}`]])) as Record<OptionId, Run>;
  const optionTable: TableSpec = {
    caption: `Each option (${SCENARIO_NAMES[view.scenario]})`,
    head: ['Measure', ...OPTION_IDS.map((o) => optionName(input, o))],
    rows: [
      { th: `Investment in ${first?.label}`, cells: OPTION_IDS.map((o) => m(o === 'none' ? 0 : input.alternatives[o].investment)) },
      { th: `Break-even units, ${first?.label}`, cells: OPTION_IDS.map((o) => (byOption[o].years[0]?.breakEven === null ? 'none' : fmtNumber(byOption[o].years[0]?.breakEven ?? 0))) },
      { th: `Operating leverage, ${first?.label}`, cells: OPTION_IDS.map((o) => (byOption[o].years[0]?.operatingLeverage == null ? 'n/a' : fmtNumber(byOption[o].years[0]?.operatingLeverage ?? 0, 2))) },
      { th: `Profit for the year, ${first?.label}`, cells: OPTION_IDS.map((o) => m(byOption[o].years[0]?.profit ?? 0)) },
      { th: `Profit for the year, ${last.label}`, cells: OPTION_IDS.map((o) => m(byOption[o].last.profit)) },
      { th: `Profit over ${run.years.length} years`, cells: OPTION_IDS.map((o) => m(byOption[o].totalProfit)), strong: true },
      { th: 'Lowest year-end cash', cells: OPTION_IDS.map((o) => `${m(byOption[o].lowest.value)} (${byOption[o].years[byOption[o].lowest.index]?.label})`) },
      { th: `Net debt at the end of ${last.label} (negative: net cash)`, cells: OPTION_IDS.map((o) => m(byOption[o].last.netDebt)) },
      { th: `ROCE, ${last.label}`, cells: OPTION_IDS.map((o) => pct(byOption[o].last.roce)) },
    ],
  };
  const optionChart = chartFigureHtml({
    svg: linesSvg({
      id: 'af-option-profit',
      title: `Profit for the year under each option (${SCENARIO_NAMES[view.scenario]})`,
      desc: `${OPTION_IDS.map((o) => `${optionName(input, o)}: ${byOption[o].years.map((y) => `${y.label} ${m(y.profit)}`).join(', ')}`).join('. ')}.`,
      x: years,
      series: OPTION_IDS.map((o) => ({ label: optionName(input, o), values: byOption[o].years.map((y) => y.profit), ...OPTION_STYLE[o], text: byOption[o].years.map((y) => `${optionName(input, o)}, ${y.label}: profit ${m(y.profit)}`) })),
      tick: (v) => shortMoney(v, currency.trim()),
      axis: 'Profit for the year',
      belowZero: 'A loss',
    }),
    label: 'Profit for the year under each option',
    caption: 'Profit for the year under each option. Where two lines cross, the option with the lower variable cost has caught up with the one with the lower fixed costs.',
    table: { caption: 'Profit for the year under each option', head: ['Year', ...OPTION_IDS.map((o) => optionName(input, o))], rows: years.map((yl, i) => ({ th: yl, cells: OPTION_IDS.map((o) => m(byOption[o].years[i]?.profit ?? 0)) })) },
  });
  const options = `${tableHtml(optionTable, 'The options side by side', 'af-compare')}${optionChart}${readingHtml(optionsText(input, byOption, view.scenario, currency))}`;

  /* Every scenario with every option */
  const matrixTable: TableSpec = {
    caption: `Profit over ${run.years.length} years, every scenario with every option`,
    head: ['Option', ...SCENARIO_IDS.map((s) => SCENARIO_NAMES[s])],
    rows: OPTION_IDS.map((o) => ({ th: optionName(input, o), cells: SCENARIO_IDS.map((s) => m(runs[`${s}/${o}`].totalProfit)) })),
  };
  const matrix = `${tableHtml(matrixTable, 'Every scenario with every option', 'af-compare')}${readingHtml(matrixText(input, runs, currency))}`;

  const d = input.drivers;
  const given = [
    { label: 'Years', value: `${d.years}, from ${d.firstYear}` },
    ...Object.values(DRIVER_FIELDS)
      .flat()
      .map((f) => ({ label: f.label, value: fmtGiven(d[f.key as keyof typeof d], f.kind, currency) })),
    ...OPENING_FIELDS.map((f) => ({ label: `Opening: ${f.label.toLowerCase()}`, value: fmtGiven(input.opening[f.key as keyof typeof input.opening], f.kind, currency) })),
    ...(['upside', 'downside'] as const).flatMap((s) => FLEX_FIELDS.map((f) => ({ label: `${SCENARIO_NAMES[s]}: ${f.label.toLowerCase()}`, value: f.key === 'growth' ? `${signed(input.scenarios[s].growth)} points` : `${signed(input.scenarios[s][f.key as keyof typeof input.scenarios.upside])}%` }))),
    ...(['a', 'b'] as const).flatMap((k) => [
      { label: `Alternative ${k.toUpperCase()}`, value: input.alternatives[k].name },
      ...ALTERNATIVE_FIELDS.map((f) => ({ label: `${input.alternatives[k].name}: ${f.label.toLowerCase()}`, value: fmtGiven(input.alternatives[k][f.key as 'investment'], f.kind, currency) })),
    ]),
  ];

  const csv: Array<Array<string | number>> = [
    ...given.map((g) => ['Input', g.label, g.value, '']),
    ['Case in view', name, '', ''],
    ...statementCsv('Statement of profit or loss', profitOrLoss(run), years, cur),
    ...statementCsv('Statement of cash flows', cashFlows(run), years, cur),
    ...statementCsv('Statement of financial position', position(run), [run.opening.label, ...years], cur),
    ...SCENARIO_IDS.map((s) => ['Scenario', `${SCENARIO_NAMES[s]}: profit over the years`, byScenario[s].totalProfit, cur]),
    ...SCENARIO_IDS.map((s) => ['Scenario', `${SCENARIO_NAMES[s]}: lowest year-end cash`, byScenario[s].lowest.value, cur]),
    ...OPTION_IDS.map((o) => ['Option', `${optionName(input, o)}: profit over the years`, byOption[o].totalProfit, cur]),
    ...OPTION_IDS.map((o) => ['Option', `${optionName(input, o)}: net debt at the end`, byOption[o].last.netDebt, cur]),
    ...SCENARIO_IDS.flatMap((s) => OPTION_IDS.map((o) => ['Every case', `${SCENARIO_NAMES[s]}, ${optionName(input, o)}: profit over the years`, runs[`${s}/${o}`].totalProfit, cur])),
  ];

  const regions: Record<ForecastRegion, string> = {
    headline: headlineHtml(headline),
    figures: figuresHtml(figures),
    case: inline(`Showing the **${name}**.`),
    pl,
    cf,
    bs,
    measures: tableHtml(measures, 'Measures for each year', 'af-compare'),
    scenarios,
    options,
    matrix,
    meaning: paras(meaningText(input, run, currency)),
    given: givenHtml(given),
  };
  return {
    runs,
    view,
    regions,
    headline,
    announce: `${name}: lowest year-end cash ${m(run.lowest.value)}; profit over ${run.years.length} years ${m(run.totalProfit)}.`,
    summary: `Lowest year-end cash ${m(run.lowest.value)}; profit over ${run.years.length} years ${m(run.totalProfit)} (${name}).`,
    csv,
  };
}

const signed = (v: number) => (v > 0 ? `+${fmtNumber(v, Number.isInteger(v) ? 0 : 1)}` : v < 0 ? `−${fmtNumber(-v, Number.isInteger(v) ? 0 : 1)}` : '0');

function fmtGiven(v: number, kind: string, currency: string): string {
  if (kind === 'money') return fmtMoney(v, currency, Number.isInteger(v) ? 0 : 2);
  if (kind === 'percent') return `${fmtNumber(v, Number.isInteger(v) ? 0 : 2)}%`;
  return fmtNumber(v, Number.isInteger(v) ? 0 : 2);
}

function statementCsv(section: string, rows: StatementRow[], columns: string[], cur: string): Array<Array<string | number>> {
  return rows.filter((r) => r.kind !== 'head').flatMap((r) => r.values.map((v, i) => [section, `${r.label}, ${columns[i]}`, v ?? '', cur]));
}
