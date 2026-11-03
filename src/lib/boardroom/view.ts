/**
 * What the Boardroom's pages show, worked out once per scenario at build time
 * from the engine: the board pack's statements and ratios, the narrated path,
 * the named paths and every path compared, and the configuration the browser
 * receives. Pure: no Astro, no page code.
 */
import type { KpiId, PeriodResult } from './engine';
import { originState } from './engine';
import { narrateContext, type NarrateContext } from './narrate';
import { envelope, historyYears, runHistory, runPath, sumPl, type PathEnvelope, type PathSummary, type Run } from './scenario';
import type { Scenario } from './schema';

export interface StatementColumn {
  label: string;
  values: Record<string, number>;
}

export interface StatementRow {
  key: string;
  label: string;
  /** subtotal rows carry a rule above; total rows a double rule. */
  kind?: 'item' | 'subtotal' | 'total' | 'heading';
  indent?: boolean;
}

/** The statement of profit or loss, in the guide's order, for a set of columns. */
export const PL_ROWS: StatementRow[] = [
  { key: 'revenue', label: 'Sales revenue' },
  { key: 'costOfSales', label: 'Cost of sales' },
  { key: 'grossProfit', label: 'Gross profit', kind: 'subtotal' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'staff', label: 'of which staff costs', indent: true },
  { key: 'overheads', label: 'of which overheads, rent and administration', indent: true },
  { key: 'marketing', label: 'of which marketing', indent: true },
  { key: 'depreciation', label: 'of which depreciation', indent: true },
  { key: 'otherExpenses', label: 'of which maintenance and other costs', indent: true },
  { key: 'otherIncome', label: 'Other income, including gains on sales of assets' },
  { key: 'pbit', label: 'Profit before interest and tax', kind: 'subtotal' },
  { key: 'interest', label: 'Interest' },
  { key: 'pbt', label: 'Profit before tax', kind: 'subtotal' },
  { key: 'tax', label: 'Tax' },
  { key: 'profit', label: 'Profit for the period', kind: 'total' },
  { key: 'dividends', label: 'Dividends' },
  { key: 'retained', label: 'Retained profit', kind: 'subtotal' },
];

/** The statement of financial position, in the guide's order. */
export const POSITION_ROWS: StatementRow[] = [
  { key: 'nonCurrentAssets', label: 'Non-current assets (net book value)' },
  { key: 'h-current', label: 'Current assets', kind: 'heading' },
  { key: 'cash', label: 'Cash', indent: true },
  { key: 'debtors', label: 'Debtors', indent: true },
  { key: 'stock', label: 'Stock', indent: true },
  { key: 'currentAssets', label: 'Total current assets', kind: 'subtotal' },
  { key: 'totalAssets', label: 'Total assets', kind: 'subtotal' },
  { key: 'h-liab', label: 'Current liabilities', kind: 'heading' },
  { key: 'overdraft', label: 'Bank overdraft', indent: true },
  { key: 'creditors', label: 'Trade creditors', indent: true },
  { key: 'currentLiabilities', label: 'Total current liabilities', kind: 'subtotal' },
  { key: 'loans', label: 'Non-current liabilities: loans' },
  { key: 'netAssets', label: 'Net assets', kind: 'total' },
  { key: 'h-equity', label: 'Equity', kind: 'heading' },
  { key: 'shareCapital', label: 'Share capital', indent: true },
  { key: 'retainedEarnings', label: 'Retained earnings', indent: true },
  { key: 'equity', label: 'Total equity', kind: 'total' },
];

function plValues(pl: PeriodResult['pl']): Record<string, number> {
  const staff = pl.wages + pl.overtime + pl.bonus;
  return {
    revenue: pl.revenue,
    costOfSales: pl.costOfSales,
    grossProfit: pl.grossProfit,
    expenses: pl.expenses,
    staff,
    overheads: pl.overheads,
    marketing: pl.marketing,
    depreciation: pl.depreciation,
    otherExpenses: pl.expenses - staff - pl.overheads - pl.marketing - pl.depreciation,
    otherIncome: pl.otherIncome + pl.gain,
    pbit: pl.pbit,
    interest: pl.interest,
    pbt: pl.pbt,
    tax: pl.tax,
    profit: pl.profit,
    dividends: pl.dividends,
    retained: pl.retained,
  };
}

/** Ratio rows: [KPI, HL only?]. The guide's formulas, from the engine's figures. */
export const RATIO_ROWS: Array<[KpiId, boolean]> = [
  ['gpm', false],
  ['profitMargin', false],
  ['roce', false],
  ['currentRatio', false],
  ['acidTest', false],
  ['stockDays', true],
  ['debtorDays', true],
  ['creditorDays', true],
  ['gearing', true],
];

/** The measures in the board pack's table of key figures by period. */
export function packMeasures(sc: Scenario): KpiId[] {
  const ids: KpiId[] = ['revenue', 'avgPrice', 'volume', 'lostSales', 'marketShare', 'brand', 'capacity', 'utilization', 'productivity'];
  if (sc.model.defects) ids.push('defectRate');
  ids.push('headcount', 'morale', 'turnover', 'pbit', 'profitMargin', 'profit', 'netCash', 'debt');
  if (sc.sustainability) ids.push('emissionsPerUnit', 'emissions');
  return ids;
}

export interface ScenarioView {
  ctx: NarrateContext;
  history: PeriodResult[];
  last: PeriodResult;
  plColumns: StatementColumn[];
  positionColumns: StatementColumn[];
  walkthrough: Run;
  named: Array<{ id: string; label: string; picks: string[]; lesson: string; summary: PathSummary }>;
  env: PathEnvelope;
}

export function scenarioView(sc: Scenario): ScenarioView {
  const ctx = narrateContext(sc);
  const { history } = runHistory(sc);
  const last = history[history.length - 1];
  if (!last) throw new Error('A scenario needs history');
  const perYear = sc.model.period.perYear;
  const plColumns: StatementColumn[] =
    perYear > 1
      ? [
          ...history.map((r) => ({ label: r.label, values: plValues(r.pl) })),
          ...historyYears(sc, history).map((y) => ({ label: `Year to ${y[y.length - 1]?.label ?? ''}`, values: plValues(sumPl(y)) })),
        ]
      : history.map((r) => ({ label: r.label, values: plValues(r.pl) }));
  const o = originState(sc.model, sc.start);
  const oDebtors = Object.values(o.debtorsBy).reduce((a, b) => a + b, 0);
  const oNca = o.assets.reduce((a, x) => a + x.nbv, 0);
  const oLoans = o.loans.reduce((a, l) => a + l.principal, 0);
  const oCash = Math.max(0, o.netCash);
  const oOver = Math.max(0, -o.netCash);
  const origin: Record<string, number> = {
    nonCurrentAssets: oNca,
    cash: oCash,
    debtors: oDebtors,
    stock: o.stock,
    currentAssets: oCash + oDebtors + o.stock,
    totalAssets: oNca + oCash + oDebtors + o.stock,
    overdraft: oOver,
    creditors: o.creditors,
    currentLiabilities: oOver + o.creditors,
    loans: oLoans,
    netAssets: oNca + oCash + oDebtors + o.stock - oOver - o.creditors - oLoans,
    shareCapital: o.shareCapital,
    retainedEarnings: o.retainedEarnings,
    equity: o.shareCapital + o.retainedEarnings,
  };
  const ends = perYear > 1 ? historyYears(sc, history).map((y) => y[y.length - 1] as PeriodResult) : history;
  const positionColumns: StatementColumn[] = [
    { label: sc.start.label, values: origin },
    ...ends.map((r) => ({ label: `End of ${r.label}`, values: r.position as unknown as Record<string, number> })),
  ];
  const env = envelope(sc);
  const findSummary = (picks: string[]) => {
    const s = env.summaries.find((x) => x.picks.join('>') === picks.join('>'));
    if (!s) throw new Error(`No summary for path ${picks.join(' > ')}`);
    return s;
  };
  return {
    ctx,
    history,
    last,
    plColumns,
    positionColumns,
    walkthrough: runPath(sc, sc.walkthrough.picks),
    named: sc.debrief.paths.map((p) => ({ ...p, summary: findSummary(p.picks) })),
    env,
  };
}

/** Money in a statement, in thousands with no decimals and a typographic minus: 2,385 or −41. */
export function thousands(v: number): string {
  const k = Math.round(v / 1000);
  const abs = Math.abs(k).toLocaleString('en-GB');
  return k < 0 ? `(${abs})` : abs;
}
