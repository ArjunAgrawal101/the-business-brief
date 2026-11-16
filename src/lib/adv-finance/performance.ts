/**
 * The financial performance dashboard: several years of accounts read with
 * measures beyond the IB course, beside the IB's own ratios.
 *
 * - Return on equity split by the DuPont identity into net profit margin,
 *   asset turnover and the equity multiplier, which multiply to ROE because
 *   sales revenue and total assets cancel; and the extended split of the
 *   margin into the tax burden, the interest burden and the operating margin
 *   (which is the IB's profit margin).
 * - The cash conversion cycle: stock days plus debtor days less creditor days,
 *   each worked with the guide's formula (3.6, HL).
 * - Interest cover, the guide's gearing ratio (3.6, HL) and borrowing as a
 *   share of equity.
 *
 * Every IB ratio comes from src/lib/ratios.ts, the functions behind the ratio
 * desk and the Financial Laboratory, so the figures agree across the site.
 * The DuPont figures use year-end balances throughout, so that the identity
 * holds exactly; averages would be more accurate when balances move a lot.
 */
import { validateFields } from '../finance-lab/fields';
import type { FieldSpec, Problem, Raw } from '../finance-lab/types';
import { acidTestRatio, balances, creditorDays, currentRatio, debtorDays, derive, gearingRatio, grossProfitMargin, profitMargin, roce, stockTurnoverDays, type Statement } from '../ratios';

export interface YearAccounts {
  label: string;
  statement: Statement;
}

export interface PerformanceInput {
  /** Stock at the start of the first year, for its average stock. */
  openingStock: number;
  years: YearAccounts[];
}

export const MIN_YEARS = 3;
export const MAX_YEARS = 5;

export interface YearMeasures {
  label: string;
  revenue: number;
  pbit: number;
  pbt: number;
  profit: number;
  totalAssets: number;
  equity: number;
  /** Return on equity: profit for the year ÷ total equity × 100. */
  roe: number | null;
  /** Profit for the year ÷ sales revenue × 100. */
  netMargin: number | null;
  /** Sales revenue ÷ total assets. */
  assetTurnover: number | null;
  /** Total assets ÷ total equity. */
  equityMultiplier: number | null;
  /** Profit for the year ÷ profit before tax. */
  taxBurden: number | null;
  /** Profit before tax ÷ profit before interest and tax. */
  interestBurden: number | null;
  /** The IB's profit margin: profit before interest and tax ÷ sales revenue × 100. */
  operatingMargin: number | null;
  grossMargin: number | null;
  roce: number | null;
  currentRatio: number | null;
  acidTest: number | null;
  stockDays: number | null;
  debtorDays: number | null;
  creditorDays: number | null;
  /** Stock days + debtor days − creditor days. */
  cycle: number | null;
  /** Profit before interest and tax ÷ interest. */
  interestCover: number | null;
  /** The guide's gearing: non-current liabilities ÷ capital employed × 100. */
  gearing: number | null;
  /** Every borrowing, overdraft and short-term loans included, ÷ total equity × 100. */
  borrowingToEquity: number | null;
  /** Cost of sales ÷ 365: what one day of the cycle ties up. */
  costPerDay: number;
  balances: boolean;
  /** Assets − liabilities − equity. */
  imbalance: number;
  /** Retained earnings less last year's less this year's retained profit; null in the first year. */
  retainedGap: number | null;
}

const pos = (v: number | null): v is number => v !== null && Number.isFinite(v);

export function measureYears(input: PerformanceInput): YearMeasures[] {
  let prevStock = input.openingStock;
  let prevRetained: number | null = null;
  return input.years.map(({ label, statement: s }) => {
    const d = derive(s);
    const eq = d.totalEquity;
    const borrowing = s.bankOverdraft + s.otherShortTermLoans + s.longTermBorrowings;
    const sd = stockTurnoverDays(s.costOfSales, prevStock, s.stock);
    const dd = debtorDays(s.debtors, s.salesRevenue);
    const cd = creditorDays(s.tradeCreditors, s.costOfSales);
    const out: YearMeasures = {
      label,
      revenue: s.salesRevenue,
      pbit: d.pbit,
      pbt: d.profitBeforeTax,
      profit: d.profitForPeriod,
      totalAssets: d.totalAssets,
      equity: eq,
      roe: eq > 0 ? (d.profitForPeriod / eq) * 100 : null,
      netMargin: s.salesRevenue > 0 ? (d.profitForPeriod / s.salesRevenue) * 100 : null,
      assetTurnover: d.totalAssets > 0 ? s.salesRevenue / d.totalAssets : null,
      equityMultiplier: eq > 0 ? d.totalAssets / eq : null,
      taxBurden: d.profitBeforeTax !== 0 ? d.profitForPeriod / d.profitBeforeTax : null,
      interestBurden: d.pbit !== 0 ? d.profitBeforeTax / d.pbit : null,
      operatingMargin: profitMargin(d.pbit, s.salesRevenue),
      grossMargin: grossProfitMargin(d.grossProfit, s.salesRevenue),
      roce: roce(d.pbit, d.nonCurrentLiabilities, eq),
      currentRatio: currentRatio(d.currentAssets, d.currentLiabilities),
      acidTest: acidTestRatio(d.currentAssets, s.stock, d.currentLiabilities),
      stockDays: sd,
      debtorDays: dd,
      creditorDays: cd,
      cycle: pos(sd) && pos(dd) && pos(cd) ? sd + dd - cd : null,
      interestCover: s.interest > 0 ? d.pbit / s.interest : null,
      gearing: gearingRatio(d.nonCurrentLiabilities, eq),
      borrowingToEquity: eq > 0 ? (borrowing / eq) * 100 : null,
      costPerDay: s.costOfSales / 365,
      balances: balances(s),
      imbalance: d.netAssets - eq,
      retainedGap: prevRetained === null ? null : s.retainedEarnings - prevRetained - d.retainedProfit,
    };
    prevStock = s.stock;
    prevRetained = s.retainedEarnings;
    return out;
  });
}

/** The logarithmic mean of two positive numbers, the weight that makes a log split add up exactly. */
export function logMean(a: number, b: number): number {
  if (Math.abs(a - b) < 1e-12 * Math.max(1, Math.abs(a))) return a;
  return (b - a) / Math.log(b / a);
}

export interface RoeSplit {
  from: string;
  to: string;
  /** The change in ROE, in percentage points. */
  change: number;
  /** Each factor's part of the change, in percentage points; they add up to the change. Null when a factor is not positive in both years. */
  parts: { margin: number; turnover: number; leverage: number } | null;
}

/**
 * How much of a change in ROE each DuPont factor accounts for. Each factor's
 * part is its proportional change, measured in logarithms, times the
 * logarithmic mean of the two ROEs, so that the three parts add up exactly to
 * the change in percentage points. It needs every factor to be positive in
 * both years: with a loss or negative equity the split has no meaning.
 */
export function splitRoe(a: YearMeasures, b: YearMeasures): RoeSplit | null {
  if (!pos(a.roe) || !pos(b.roe)) return null;
  const change = b.roe - a.roe;
  const fs = [a.netMargin, a.assetTurnover, a.equityMultiplier, b.netMargin, b.assetTurnover, b.equityMultiplier, a.roe, b.roe];
  if (!fs.every((v) => pos(v) && v > 0)) return { from: a.label, to: b.label, change, parts: null };
  const w = logMean(a.roe, b.roe);
  const part = (x: number, y: number) => w * Math.log(y / x);
  return {
    from: a.label,
    to: b.label,
    change,
    parts: {
      margin: part(a.netMargin as number, b.netMargin as number),
      turnover: part(a.assetTurnover as number, b.assetTurnover as number),
      leverage: part(a.equityMultiplier as number, b.equityMultiplier as number),
    },
  };
}

/* ------------------------------------------------------------------ */
/* The form                                                            */
/* ------------------------------------------------------------------ */

const money = (key: keyof Statement, label: string, name: string, negative = false): FieldSpec => ({ key, label, kind: 'money', ...(negative ? {} : { min: 0 }), name });

/** The lines of each year's accounts, in the order of the guide's two statements. */
export const ACCOUNT_FIELDS: Array<{ group: string; fields: FieldSpec[] }> = [
  {
    group: 'Statement of profit or loss',
    fields: [
      money('salesRevenue', 'Sales revenue', 'sales revenue'),
      money('costOfSales', 'Cost of sales', 'cost of sales'),
      money('expenses', 'Expenses', 'expenses'),
      money('interest', 'Interest', 'interest'),
      money('tax', 'Tax', 'tax'),
      money('dividends', 'Dividends', 'dividends'),
    ],
  },
  {
    group: 'Statement of financial position',
    fields: [
      money('propertyPlantEquipment', 'Property, plant and equipment', 'property, plant and equipment'),
      money('accumulatedDepreciation', 'Accumulated depreciation', 'accumulated depreciation'),
      money('cash', 'Cash', 'cash'),
      money('debtors', 'Debtors', 'debtors'),
      money('stock', 'Stock', 'stock'),
      money('bankOverdraft', 'Bank overdraft', 'the bank overdraft'),
      money('tradeCreditors', 'Trade creditors', 'trade creditors'),
      money('otherShortTermLoans', 'Other short-term loans', 'other short-term loans'),
      money('longTermBorrowings', 'Long-term borrowings', 'long-term borrowings'),
      money('shareCapital', 'Share capital', 'share capital'),
      money('retainedEarnings', 'Retained earnings', 'retained earnings', true),
    ],
  },
];

export const OPENING_STOCK_FIELD: FieldSpec = { key: 'openingStock', label: 'Stock at the start of the first year', kind: 'money', min: 0, name: 'the opening stock', hint: 'For the first year’s average stock.' };

export function validatePerformance(raw: Raw, years: number): Problem[] {
  const out: Problem[] = [];
  if (years < MIN_YEARS || years > MAX_YEARS) out.push({ field: 'openingStock', message: `Give between ${MIN_YEARS} and ${MAX_YEARS} years of accounts.` });
  out.push(...validateFields(raw, [OPENING_STOCK_FIELD]));
  const all = ACCOUNT_FIELDS.flatMap((g) => g.fields);
  for (let i = 0; i < years; i++) out.push(...validateFields(raw, all, `y${i}.`, ` in year ${i + 1}`));
  return out;
}

export function performanceInput(raw: Raw, labels: string[]): PerformanceInput {
  const all = ACCOUNT_FIELDS.flatMap((g) => g.fields);
  return {
    openingStock: raw.openingStock ?? 0,
    years: labels.map((label, i) => ({
      label,
      statement: Object.fromEntries(all.map((f) => [f.key, raw[`y${i}.${f.key}`] ?? 0])) as unknown as Statement,
    })),
  };
}
