/**
 * Finance Desk: ratio analysis, subtopic 3.5 (profitability and liquidity,
 * SL and HL) and subtopic 3.6 (efficiency, HL only).
 *
 * Every formula is the one on the Business management guide's formula sheet
 * (pp. 64 to 65), including its definitions of capital employed
 * (non-current liabilities + equity) and average stock ((opening + closing) ÷ 2).
 * The same functions run at build time and in the browser, and
 * tests/unit/ratios.test.ts checks each against figures worked by hand.
 */
import type { Working, WorkingBuilder } from './finance';
import { fmtNumber, round } from './format';

/* ------------------------------------------------------------------ */
/* Statements                                                          */
/* ------------------------------------------------------------------ */

/** The line items a statement of profit or loss and a statement of financial position are built from. */
export interface Statement {
  salesRevenue: number;
  costOfSales: number;
  expenses: number;
  interest: number;
  tax: number;
  dividends: number;
  propertyPlantEquipment: number;
  accumulatedDepreciation: number;
  cash: number;
  debtors: number;
  stock: number;
  bankOverdraft: number;
  tradeCreditors: number;
  otherShortTermLoans: number;
  longTermBorrowings: number;
  shareCapital: number;
  retainedEarnings: number;
}

export const STATEMENT_FIELDS = [
  'salesRevenue',
  'costOfSales',
  'expenses',
  'interest',
  'tax',
  'dividends',
  'propertyPlantEquipment',
  'accumulatedDepreciation',
  'cash',
  'debtors',
  'stock',
  'bankOverdraft',
  'tradeCreditors',
  'otherShortTermLoans',
  'longTermBorrowings',
  'shareCapital',
  'retainedEarnings',
] as const satisfies ReadonlyArray<keyof Statement>;

export type StatementField = (typeof STATEMENT_FIELDS)[number];

/** Subtotals and totals, computed from the line items. */
export interface Derived {
  grossProfit: number;
  pbit: number;
  profitBeforeTax: number;
  profitForPeriod: number;
  retainedProfit: number;
  nonCurrentAssets: number;
  currentAssets: number;
  totalAssets: number;
  currentLiabilities: number;
  nonCurrentLiabilities: number;
  totalLiabilities: number;
  netAssets: number;
  totalEquity: number;
  /** Non-current liabilities + equity (guide, p. 64). */
  capitalEmployed: number;
}

export function derive(s: Statement): Derived {
  const grossProfit = s.salesRevenue - s.costOfSales;
  const pbit = grossProfit - s.expenses;
  const profitBeforeTax = pbit - s.interest;
  const profitForPeriod = profitBeforeTax - s.tax;
  const nonCurrentAssets = s.propertyPlantEquipment - s.accumulatedDepreciation;
  const currentAssets = s.cash + s.debtors + s.stock;
  const currentLiabilities = s.bankOverdraft + s.tradeCreditors + s.otherShortTermLoans;
  const nonCurrentLiabilities = s.longTermBorrowings;
  const totalLiabilities = currentLiabilities + nonCurrentLiabilities;
  const totalAssets = nonCurrentAssets + currentAssets;
  const totalEquity = s.shareCapital + s.retainedEarnings;
  return {
    grossProfit,
    pbit,
    profitBeforeTax,
    profitForPeriod,
    retainedProfit: profitForPeriod - s.dividends,
    nonCurrentAssets,
    currentAssets,
    totalAssets,
    currentLiabilities,
    nonCurrentLiabilities,
    totalLiabilities,
    netAssets: totalAssets - totalLiabilities,
    totalEquity,
    capitalEmployed: nonCurrentLiabilities + totalEquity,
  };
}

/** Net assets equal total equity: the statement of financial position balances. */
export function balances(s: Statement): boolean {
  const d = derive(s);
  return Math.abs(d.netAssets - d.totalEquity) < 1e-6;
}

/** Applies a strategy's changes to a statement. A negative cash balance is shown as a bank overdraft. */
export function applyAdjustments(s: Statement, adjust: Partial<Record<StatementField, number>>): Statement {
  const out = { ...s };
  for (const k of STATEMENT_FIELDS) out[k] = round(out[k] + (adjust[k] ?? 0), 6);
  if (out.cash < 0) {
    out.bankOverdraft = round(out.bankOverdraft - out.cash, 6);
    out.cash = 0;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* The ratios                                                          */
/* ------------------------------------------------------------------ */

export const grossProfitMargin = (grossProfit: number, salesRevenue: number): number | null =>
  salesRevenue > 0 ? (grossProfit / salesRevenue) * 100 : null;

export const profitMargin = (pbit: number, salesRevenue: number): number | null => (salesRevenue > 0 ? (pbit / salesRevenue) * 100 : null);

export const capitalEmployed = (nonCurrentLiabilities: number, equity: number): number => nonCurrentLiabilities + equity;

export function roce(pbit: number, nonCurrentLiabilities: number, equity: number): number | null {
  const ce = capitalEmployed(nonCurrentLiabilities, equity);
  return ce > 0 ? (pbit / ce) * 100 : null;
}

export const currentRatio = (currentAssets: number, currentLiabilities: number): number | null =>
  currentLiabilities > 0 ? currentAssets / currentLiabilities : null;

export const acidTestRatio = (currentAssets: number, stock: number, currentLiabilities: number): number | null =>
  currentLiabilities > 0 ? (currentAssets - stock) / currentLiabilities : null;

export const averageStock = (openingStock: number, closingStock: number): number => (openingStock + closingStock) / 2;

export function stockTurnoverTimes(costOfSales: number, openingStock: number, closingStock: number): number | null {
  const avg = averageStock(openingStock, closingStock);
  return avg > 0 ? costOfSales / avg : null;
}

export function stockTurnoverDays(costOfSales: number, openingStock: number, closingStock: number): number | null {
  const avg = averageStock(openingStock, closingStock);
  return costOfSales > 0 ? (avg / costOfSales) * 365 : null;
}

export const debtorDays = (debtors: number, salesRevenue: number): number | null => (salesRevenue > 0 ? (debtors / salesRevenue) * 365 : null);

export const creditorDays = (creditors: number, costOfSales: number): number | null => (costOfSales > 0 ? (creditors / costOfSales) * 365 : null);

export function gearingRatio(nonCurrentLiabilities: number, equity: number): number | null {
  const ce = capitalEmployed(nonCurrentLiabilities, equity);
  return ce > 0 ? (nonCurrentLiabilities / ce) * 100 : null;
}

export const RATIO_IDS = [
  'gross-profit-margin',
  'profit-margin',
  'roce',
  'current-ratio',
  'acid-test-ratio',
  'stock-turnover-times',
  'stock-turnover-days',
  'debtor-days',
  'creditor-days',
  'gearing-ratio',
] as const;
export type RatioId = (typeof RATIO_IDS)[number];

export type RatioGroup = 'profitability' | 'liquidity' | 'efficiency';
export type RatioKind = 'percent' | 'ratio' | 'times' | 'days';

export interface RatioDef {
  id: RatioId;
  name: string;
  short: string;
  group: RatioGroup;
  level: 'SL/HL' | 'HL';
  kind: RatioKind;
  /** Which way is better, other things equal; "depends" where the answer needs judgement. */
  better: 'higher' | 'lower' | 'depends';
  formula: string;
  /** What the ratio measures, in one sentence. */
  measures: string;
}

export const RATIOS: Record<RatioId, RatioDef> = {
  'gross-profit-margin': {
    id: 'gross-profit-margin',
    name: 'Gross profit margin',
    short: 'GPM',
    group: 'profitability',
    level: 'SL/HL',
    kind: 'percent',
    better: 'higher',
    formula: 'Gross profit margin = (gross profit ÷ sales revenue) × 100',
    measures: 'The share of each pound of sales left after the direct cost of providing the service or making the goods.',
  },
  'profit-margin': {
    id: 'profit-margin',
    name: 'Profit margin',
    short: 'Profit margin',
    group: 'profitability',
    level: 'SL/HL',
    kind: 'percent',
    better: 'higher',
    formula: 'Profit margin = (profit before interest and tax ÷ sales revenue) × 100',
    measures: 'The share of each pound of sales left after all the costs of running the business, before interest and tax.',
  },
  roce: {
    id: 'roce',
    name: 'Return on capital employed (ROCE)',
    short: 'ROCE',
    group: 'profitability',
    level: 'SL/HL',
    kind: 'percent',
    better: 'higher',
    formula: 'ROCE = (profit before interest and tax ÷ capital employed) × 100, where capital employed = non-current liabilities + equity',
    measures: 'The profit the business earns on the long-term finance invested in it, from lenders and owners together.',
  },
  'current-ratio': {
    id: 'current-ratio',
    name: 'Current ratio',
    short: 'Current ratio',
    group: 'liquidity',
    level: 'SL/HL',
    kind: 'ratio',
    better: 'higher',
    formula: 'Current ratio = current assets ÷ current liabilities',
    measures: 'How many times the assets that will turn into cash within a year cover the debts due within a year.',
  },
  'acid-test-ratio': {
    id: 'acid-test-ratio',
    name: 'Acid test (quick) ratio',
    short: 'Acid test',
    group: 'liquidity',
    level: 'SL/HL',
    kind: 'ratio',
    better: 'higher',
    formula: 'Acid test (quick) ratio = (current assets − stock) ÷ current liabilities',
    measures: 'The same cover as the current ratio, leaving out stock, the current asset that is slowest and least certain to turn into cash.',
  },
  'stock-turnover-times': {
    id: 'stock-turnover-times',
    name: 'Stock turnover (number of times)',
    short: 'Stock turnover (times)',
    group: 'efficiency',
    level: 'HL',
    kind: 'times',
    better: 'higher',
    formula: 'Stock turnover (number of times) = cost of sales ÷ average stock, where average stock = (opening stock + closing stock) ÷ 2',
    measures: 'How many times in the year the business uses up and replaces its average stock.',
  },
  'stock-turnover-days': {
    id: 'stock-turnover-days',
    name: 'Stock turnover (number of days)',
    short: 'Stock turnover (days)',
    group: 'efficiency',
    level: 'HL',
    kind: 'days',
    better: 'lower',
    formula: 'Stock turnover (number of days) = (average stock ÷ cost of sales) × 365',
    measures: 'How many days, on average, stock is held before it is used or sold.',
  },
  'debtor-days': {
    id: 'debtor-days',
    name: 'Debtor days',
    short: 'Debtor days',
    group: 'efficiency',
    level: 'HL',
    kind: 'days',
    better: 'lower',
    formula: 'Debtor days = (debtors ÷ total sales revenue) × 365',
    measures: 'How many days, on average, customers take to pay what they owe.',
  },
  'creditor-days': {
    id: 'creditor-days',
    name: 'Creditor days',
    short: 'Creditor days',
    group: 'efficiency',
    level: 'HL',
    kind: 'days',
    better: 'depends',
    formula: 'Creditor days = (creditors ÷ cost of sales) × 365',
    measures: 'How many days, on average, the business takes to pay its suppliers.',
  },
  'gearing-ratio': {
    id: 'gearing-ratio',
    name: 'Gearing ratio',
    short: 'Gearing',
    group: 'efficiency',
    level: 'HL',
    kind: 'percent',
    better: 'depends',
    formula: 'Gearing ratio = (non-current liabilities ÷ capital employed) × 100, where capital employed = non-current liabilities + equity',
    measures: 'The share of the long-term finance that is borrowed rather than provided by the owners.',
  },
};

export const GROUP_NAMES: Record<RatioGroup, string> = {
  profitability: 'Profitability ratios',
  liquidity: 'Liquidity ratios',
  efficiency: 'Efficiency ratios (HL)',
};

/** The named inputs each ratio's working needs, taken from one year's statement. */
export function ratioInputs(id: RatioId, s: Statement, openingStock: number): Record<string, number> {
  const d = derive(s);
  switch (id) {
    case 'gross-profit-margin':
      return { grossProfit: d.grossProfit, salesRevenue: s.salesRevenue };
    case 'profit-margin':
      return { pbit: d.pbit, salesRevenue: s.salesRevenue };
    case 'roce':
      return { pbit: d.pbit, nonCurrentLiabilities: d.nonCurrentLiabilities, equity: d.totalEquity };
    case 'current-ratio':
      return { currentAssets: d.currentAssets, currentLiabilities: d.currentLiabilities };
    case 'acid-test-ratio':
      return { currentAssets: d.currentAssets, stock: s.stock, currentLiabilities: d.currentLiabilities };
    case 'stock-turnover-times':
    case 'stock-turnover-days':
      return { costOfSales: s.costOfSales, openingStock, closingStock: s.stock };
    case 'debtor-days':
      return { debtors: s.debtors, salesRevenue: s.salesRevenue };
    case 'creditor-days':
      return { creditors: s.tradeCreditors, costOfSales: s.costOfSales };
    case 'gearing-ratio':
      return { nonCurrentLiabilities: d.nonCurrentLiabilities, equity: d.totalEquity };
  }
}

/** The exact value of a ratio from its named inputs, or null when its denominator is zero. */
export function valueFromInputs(id: RatioId, i: Record<string, number>): number | null {
  const v = (k: string) => i[k] ?? 0;
  switch (id) {
    case 'gross-profit-margin':
      return grossProfitMargin(v('grossProfit'), v('salesRevenue'));
    case 'profit-margin':
      return profitMargin(v('pbit'), v('salesRevenue'));
    case 'roce':
      return roce(v('pbit'), v('nonCurrentLiabilities'), v('equity'));
    case 'current-ratio':
      return currentRatio(v('currentAssets'), v('currentLiabilities'));
    case 'acid-test-ratio':
      return acidTestRatio(v('currentAssets'), v('stock'), v('currentLiabilities'));
    case 'stock-turnover-times':
      return stockTurnoverTimes(v('costOfSales'), v('openingStock'), v('closingStock'));
    case 'stock-turnover-days':
      return stockTurnoverDays(v('costOfSales'), v('openingStock'), v('closingStock'));
    case 'debtor-days':
      return debtorDays(v('debtors'), v('salesRevenue'));
    case 'creditor-days':
      return creditorDays(v('creditors'), v('costOfSales'));
    case 'gearing-ratio':
      return gearingRatio(v('nonCurrentLiabilities'), v('equity'));
  }
}

/** The exact value of a ratio for one year's statement, or null when its denominator is zero. */
export function ratioValue(id: RatioId, s: Statement, openingStock: number): number | null {
  return valueFromInputs(id, ratioInputs(id, s, openingStock));
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

/** A ratio to two decimal places, with its unit: 25.00%, 2.08, 31.36 times, 44.99 days. */
export function fmtRatio(v: number | null, kind: RatioKind): string {
  if (v === null || !Number.isFinite(v)) return 'n/a';
  const n = fmtNumber(v, 2);
  if (kind === 'percent') return `${n}%`;
  if (kind === 'times') return `${n} times`;
  if (kind === 'days') return `${n} days`;
  return n;
}

/** The change between two values, in the ratio's own terms. */
export function fmtChange(a: number | null, b: number | null, kind: RatioKind): string {
  if (a === null || b === null) return 'n/a';
  const d = round(b, 2) - round(a, 2);
  const n = fmtNumber(Math.abs(d), 2);
  if (Math.abs(d) < 0.005) return 'No change';
  const sign = d > 0 ? '+' : '−';
  if (kind === 'percent') return `${sign}${n} percentage points`;
  if (kind === 'days') return `${sign}${n} days`;
  if (kind === 'times') return `${sign}${n} times`;
  return `${sign}${n}`;
}

/* ------------------------------------------------------------------ */
/* Worked solutions                                                    */
/* ------------------------------------------------------------------ */

type Inputs = Record<string, number>;

function need(inputs: Inputs, ...keys: string[]): number[] {
  return keys.map((k) => {
    const v = inputs[k];
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`Missing or invalid input "${k}"`);
    return v;
  });
}

/** Figures from the accounts. `unit` names their unit, for example "£000". */
const money = (v: number) => fmtNumber(v, Number.isInteger(v) ? 0 : 2);
const label = (text: string, unit: string) => (unit ? `${text} (${unit})` : text);
const f4 = (v: number) => fmtNumber(v, 4);

function answer(kind: RatioKind, v: number): Pick<Working, 'answer' | 'value'> {
  return { answer: fmtRatio(v, kind), value: round(v, 2) };
}

function undefinedWorking(base: Omit<Working, 'answer' | 'value' | 'steps'>, error: string): Working {
  return { ...base, steps: [], answer: 'Not defined', value: null, error };
}

/**
 * Working builders for the ten ratios, keyed by calculation id. The
 * `currency` argument carries the unit of the figures (for example "£000"),
 * because ratios are calculated from the statements as published.
 */
export const ratioWorkings: Record<RatioId, WorkingBuilder> = {
  'gross-profit-margin': (inputs, unit) => {
    const [gp, sales] = need(inputs, 'grossProfit', 'salesRevenue') as [number, number];
    const base = {
      given: [
        { label: label('Gross profit', unit), value: money(gp) },
        { label: label('Sales revenue', unit), value: money(sales) },
      ],
      formula: RATIOS['gross-profit-margin'].formula,
      substitution: `= (${money(gp)} ÷ ${money(sales)}) × 100`,
      unit: 'per cent of sales revenue',
    };
    if (!(sales > 0)) return undefinedWorking(base, 'Sales revenue must be above zero.');
    const v = (gp / sales) * 100;
    return { ...base, steps: [`${money(gp)} ÷ ${money(sales)} = ${f4(gp / sales)}`, `${f4(gp / sales)} × 100 = ${fmtNumber(v, 2)}`], ...answer('percent', v) };
  },

  'profit-margin': (inputs, unit) => {
    const [pbit, sales] = need(inputs, 'pbit', 'salesRevenue') as [number, number];
    const base = {
      given: [
        { label: label('Profit before interest and tax', unit), value: money(pbit) },
        { label: label('Sales revenue', unit), value: money(sales) },
      ],
      formula: RATIOS['profit-margin'].formula,
      substitution: `= (${money(pbit)} ÷ ${money(sales)}) × 100`,
      unit: 'per cent of sales revenue',
    };
    if (!(sales > 0)) return undefinedWorking(base, 'Sales revenue must be above zero.');
    const v = (pbit / sales) * 100;
    return {
      ...base,
      steps: [`${money(pbit)} ÷ ${money(sales)} = ${f4(pbit / sales)}`, `${f4(pbit / sales)} × 100 = ${fmtNumber(v, 2)}`],
      ...answer('percent', v),
      note: 'The guide uses profit before interest and tax, so the margin is not affected by how the business is financed.',
    };
  },

  roce: (inputs, unit) => {
    const [pbit, ncl, eq] = need(inputs, 'pbit', 'nonCurrentLiabilities', 'equity') as [number, number, number];
    const ce = ncl + eq;
    const base = {
      given: [
        { label: label('Profit before interest and tax', unit), value: money(pbit) },
        { label: label('Non-current liabilities', unit), value: money(ncl) },
        { label: label('Equity', unit), value: money(eq) },
      ],
      formula: RATIOS.roce.formula,
      substitution: `= (${money(pbit)} ÷ (${money(ncl)} + ${money(eq)})) × 100`,
      unit: 'per cent of capital employed, per year',
    };
    if (!(ce > 0)) return undefinedWorking(base, 'Capital employed must be above zero.');
    const v = (pbit / ce) * 100;
    return {
      ...base,
      steps: [`Capital employed = ${money(ncl)} + ${money(eq)} = ${money(ce)}`, `${money(pbit)} ÷ ${money(ce)} = ${f4(pbit / ce)}`, `${f4(pbit / ce)} × 100 = ${fmtNumber(v, 2)}`],
      ...answer('percent', v),
    };
  },

  'current-ratio': (inputs, unit) => {
    const [ca, cl] = need(inputs, 'currentAssets', 'currentLiabilities') as [number, number];
    const base = {
      given: [
        { label: label('Current assets', unit), value: money(ca) },
        { label: label('Current liabilities', unit), value: money(cl) },
      ],
      formula: RATIOS['current-ratio'].formula,
      substitution: `= ${money(ca)} ÷ ${money(cl)}`,
      unit: 'a ratio, often written as a number to 1 (for example 1.50:1)',
    };
    if (!(cl > 0)) return undefinedWorking(base, 'Current liabilities must be above zero.');
    const v = ca / cl;
    return { ...base, steps: [`${money(ca)} ÷ ${money(cl)} = ${f4(v)}`], ...answer('ratio', v) };
  },

  'acid-test-ratio': (inputs, unit) => {
    const [ca, stock, cl] = need(inputs, 'currentAssets', 'stock', 'currentLiabilities') as [number, number, number];
    const base = {
      given: [
        { label: label('Current assets', unit), value: money(ca) },
        { label: label('Stock', unit), value: money(stock) },
        { label: label('Current liabilities', unit), value: money(cl) },
      ],
      formula: RATIOS['acid-test-ratio'].formula,
      substitution: `= (${money(ca)} − ${money(stock)}) ÷ ${money(cl)}`,
      unit: 'a ratio, often written as a number to 1',
    };
    if (!(cl > 0)) return undefinedWorking(base, 'Current liabilities must be above zero.');
    const v = (ca - stock) / cl;
    return { ...base, steps: [`${money(ca)} − ${money(stock)} = ${money(ca - stock)}`, `${money(ca - stock)} ÷ ${money(cl)} = ${f4(v)}`], ...answer('ratio', v) };
  },

  'stock-turnover-times': (inputs, unit) => {
    const [cos, open, close] = need(inputs, 'costOfSales', 'openingStock', 'closingStock') as [number, number, number];
    const avg = averageStock(open, close);
    const base = {
      given: [
        { label: label('Cost of sales', unit), value: money(cos) },
        { label: label('Opening stock', unit), value: money(open) },
        { label: label('Closing stock', unit), value: money(close) },
      ],
      formula: RATIOS['stock-turnover-times'].formula,
      substitution: `= ${money(cos)} ÷ ((${money(open)} + ${money(close)}) ÷ 2)`,
      unit: 'times a year',
    };
    if (!(avg > 0)) return undefinedWorking(base, 'Average stock must be above zero.');
    const v = cos / avg;
    return {
      ...base,
      steps: [`Average stock = (${money(open)} + ${money(close)}) ÷ 2 = ${money(avg)}`, `${money(cos)} ÷ ${money(avg)} = ${f4(v)}`],
      ...answer('times', v),
    };
  },

  'stock-turnover-days': (inputs, unit) => {
    const [cos, open, close] = need(inputs, 'costOfSales', 'openingStock', 'closingStock') as [number, number, number];
    const avg = averageStock(open, close);
    const base = {
      given: [
        { label: label('Cost of sales', unit), value: money(cos) },
        { label: label('Opening stock', unit), value: money(open) },
        { label: label('Closing stock', unit), value: money(close) },
      ],
      formula: RATIOS['stock-turnover-days'].formula,
      substitution: `= (((${money(open)} + ${money(close)}) ÷ 2) ÷ ${money(cos)}) × 365`,
      unit: 'days',
    };
    if (!(cos > 0)) return undefinedWorking(base, 'Cost of sales must be above zero.');
    const v = (avg / cos) * 365;
    return {
      ...base,
      steps: [`Average stock = (${money(open)} + ${money(close)}) ÷ 2 = ${money(avg)}`, `${money(avg)} ÷ ${money(cos)} = ${fmtNumber(avg / cos, 6)}`, `${fmtNumber(avg / cos, 6)} × 365 = ${fmtNumber(v, 2)}`],
      ...answer('days', v),
    };
  },

  'debtor-days': (inputs, unit) => {
    const [debtors, sales] = need(inputs, 'debtors', 'salesRevenue') as [number, number];
    const base = {
      given: [
        { label: label('Debtors', unit), value: money(debtors) },
        { label: label('Total sales revenue', unit), value: money(sales) },
      ],
      formula: RATIOS['debtor-days'].formula,
      substitution: `= (${money(debtors)} ÷ ${money(sales)}) × 365`,
      unit: 'days',
    };
    if (!(sales > 0)) return undefinedWorking(base, 'Sales revenue must be above zero.');
    const v = (debtors / sales) * 365;
    return {
      ...base,
      steps: [`${money(debtors)} ÷ ${money(sales)} = ${fmtNumber(debtors / sales, 6)}`, `${fmtNumber(debtors / sales, 6)} × 365 = ${fmtNumber(v, 2)}`],
      ...answer('days', v),
      note: 'The guide divides by total sales revenue. A business that sells partly for cash would collect its credit sales more slowly than this suggests.',
    };
  },

  'creditor-days': (inputs, unit) => {
    const [creditors, cos] = need(inputs, 'creditors', 'costOfSales') as [number, number];
    const base = {
      given: [
        { label: label('Creditors', unit), value: money(creditors) },
        { label: label('Cost of sales', unit), value: money(cos) },
      ],
      formula: RATIOS['creditor-days'].formula,
      substitution: `= (${money(creditors)} ÷ ${money(cos)}) × 365`,
      unit: 'days',
    };
    if (!(cos > 0)) return undefinedWorking(base, 'Cost of sales must be above zero.');
    const v = (creditors / cos) * 365;
    return {
      ...base,
      steps: [`${money(creditors)} ÷ ${money(cos)} = ${fmtNumber(creditors / cos, 6)}`, `${fmtNumber(creditors / cos, 6)} × 365 = ${fmtNumber(v, 2)}`],
      ...answer('days', v),
    };
  },

  'gearing-ratio': (inputs, unit) => {
    const [ncl, eq] = need(inputs, 'nonCurrentLiabilities', 'equity') as [number, number];
    const ce = ncl + eq;
    const base = {
      given: [
        { label: label('Non-current liabilities', unit), value: money(ncl) },
        { label: label('Equity', unit), value: money(eq) },
      ],
      formula: RATIOS['gearing-ratio'].formula,
      substitution: `= (${money(ncl)} ÷ (${money(ncl)} + ${money(eq)})) × 100`,
      unit: 'per cent of capital employed',
    };
    if (!(ce > 0)) return undefinedWorking(base, 'Capital employed must be above zero.');
    const v = (ncl / ce) * 100;
    return {
      ...base,
      steps: [`Capital employed = ${money(ncl)} + ${money(eq)} = ${money(ce)}`, `${money(ncl)} ÷ ${money(ce)} = ${f4(ncl / ce)}`, `${f4(ncl / ce)} × 100 = ${fmtNumber(v, 2)}`],
      ...answer('percent', v),
    };
  },
};

/* ------------------------------------------------------------------ */
/* Readings                                                            */
/* ------------------------------------------------------------------ */

export type Verdict = 'better' | 'worse' | 'unchanged' | 'judgement';

/** Whether a change is an improvement, other things equal. */
export function verdict(def: RatioDef, a: number | null, b: number | null): Verdict {
  if (a === null || b === null) return 'judgement';
  const d = round(b, 2) - round(a, 2);
  if (Math.abs(d) < 0.005) return 'unchanged';
  if (def.better === 'depends') return 'judgement';
  const up = d > 0;
  return (def.better === 'higher') === up ? 'better' : 'worse';
}

export const VERDICT_TEXT: Record<Verdict, string> = {
  better: 'Better',
  worse: 'Worse',
  unchanged: 'Unchanged',
  judgement: 'A matter of judgement',
};

/** One sentence describing the movement between two years. */
export function describeChange(def: RatioDef, a: number | null, b: number | null, from: string, to: string): string {
  if (a === null || b === null) return `${def.name} cannot be calculated for both years.`;
  const ra = round(a, 2);
  const rb = round(b, 2);
  if (Math.abs(rb - ra) < 0.005) return `${def.name} is unchanged at ${fmtRatio(b, def.kind)} (${from} and ${to}).`;
  const dir = rb > ra ? 'rose' : 'fell';
  const by = def.kind === 'percent' ? `${fmtNumber(Math.abs(rb - ra), 2)} percentage points` : def.kind === 'days' ? `${fmtNumber(Math.abs(rb - ra), 2)} days` : fmtNumber(Math.abs(rb - ra), 2);
  return `${def.name} ${dir} from ${fmtRatio(a, def.kind)} in ${from} to ${fmtRatio(b, def.kind)} in ${to}, a change of ${by}.`;
}

/* ------------------------------------------------------------------ */
/* Checking a learner's answer                                         */
/* ------------------------------------------------------------------ */

export interface Diagnosis {
  correct: boolean;
  message: string;
}

/** Answers within this distance of the exact value count as right (it allows rounding to one decimal place). */
export const TOLERANCE = 0.051;

/** Wrong answers that come from a known slip, with what went wrong. */
function slips(id: RatioId, i: Inputs): Array<{ value: number | null; message: string }> {
  const v = (k: string) => i[k] ?? 0;
  switch (id) {
    case 'gross-profit-margin':
      return [
        { value: v('grossProfit') / v('salesRevenue'), message: 'That is the fraction before multiplying by 100. A margin is a percentage.' },
        { value: ((v('salesRevenue') - v('grossProfit')) / v('salesRevenue')) * 100, message: 'That is cost of sales as a share of revenue. The margin uses gross profit, what is left after cost of sales.' },
      ];
    case 'profit-margin':
      return [
        { value: (v('pbit') / v('salesRevenue')), message: 'That is the fraction before multiplying by 100.' },
      ];
    case 'roce': {
      const ce = v('nonCurrentLiabilities') + v('equity');
      return [
        { value: (v('pbit') / v('equity')) * 100, message: 'That divides by equity alone. Capital employed is non-current liabilities plus equity: lenders’ long-term money counts too.' },
        { value: (v('pbit') / v('nonCurrentLiabilities')) * 100, message: 'That divides by non-current liabilities alone. Capital employed adds equity to them.' },
        { value: v('pbit') / ce, message: 'That is the fraction before multiplying by 100.' },
      ];
    }
    case 'current-ratio':
      return [{ value: v('currentLiabilities') / v('currentAssets'), message: 'That is the ratio upside down: current assets go on top.' }];
    case 'acid-test-ratio':
      return [
        { value: v('currentAssets') / v('currentLiabilities'), message: 'That is the current ratio. The acid test takes stock out of current assets first.' },
        { value: v('currentAssets') / (v('currentLiabilities') - v('stock')), message: 'Stock is taken away from current assets, not from current liabilities.' },
      ];
    case 'stock-turnover-times':
      return [
        { value: v('costOfSales') / v('closingStock'), message: 'That uses closing stock. The guide uses average stock: (opening + closing) ÷ 2.' },
        { value: averageStock(v('openingStock'), v('closingStock')) / v('costOfSales'), message: 'That is the ratio upside down: cost of sales goes on top for the number of times.' },
      ];
    case 'stock-turnover-days':
      return [
        { value: (v('closingStock') / v('costOfSales')) * 365, message: 'That uses closing stock. The guide uses average stock: (opening + closing) ÷ 2.' },
        { value: averageStock(v('openingStock'), v('closingStock')) / v('costOfSales'), message: 'That is the fraction before multiplying by 365.' },
      ];
    case 'debtor-days':
      return [{ value: v('debtors') / v('salesRevenue'), message: 'That is the fraction before multiplying by 365.' }];
    case 'creditor-days':
      return [{ value: v('creditors') / v('costOfSales'), message: 'That is the fraction before multiplying by 365.' }];
    case 'gearing-ratio':
      return [
        { value: (v('nonCurrentLiabilities') / v('equity')) * 100, message: 'That divides by equity. The guide divides by capital employed: non-current liabilities plus equity.' },
        { value: v('nonCurrentLiabilities') / (v('nonCurrentLiabilities') + v('equity')), message: 'That is the fraction before multiplying by 100.' },
      ];
  }
}

/**
 * Checks a learner's answer against the exact value. `extra` adds slips that
 * need the whole statement (see statementSlips).
 */
export function diagnose(id: RatioId, answerValue: number, inputs: Inputs, extra: Array<{ value: number | null; message: string }> = []): Diagnosis {
  const exact = valueFromInputs(id, inputs);
  if (exact === null) return { correct: false, message: 'This ratio cannot be calculated from these figures.' };
  if (Math.abs(answerValue - exact) <= TOLERANCE) {
    return { correct: true, message: `Right. To two decimal places it is ${fmtRatio(exact, RATIOS[id].kind)}.` };
  }
  const known = [...slips(id, inputs), ...extra].find((x) => x.value !== null && Number.isFinite(x.value) && Math.abs(answerValue - x.value) <= TOLERANCE);
  if (known) return { correct: false, message: `Not yet. ${known.message}` };
  return { correct: false, message: 'Not yet. Check which figures the formula uses, then compare your steps with the working below.' };
}

/** Slips that need the whole statement: margins and returns worked from the wrong profit line. */
export function statementSlips(id: RatioId, s: Statement): Array<{ value: number | null; message: string }> {
  const d = derive(s);
  if (id === 'profit-margin') {
    return [
      { value: grossProfitMargin(d.grossProfit, s.salesRevenue), message: 'That is the gross profit margin. The profit margin uses profit before interest and tax.' },
      { value: profitMargin(d.profitBeforeTax, s.salesRevenue), message: 'That uses profit before tax. The guide uses profit before interest and tax.' },
      { value: profitMargin(d.profitForPeriod, s.salesRevenue), message: 'That uses the profit for the period, after interest and tax. The guide uses profit before interest and tax.' },
    ];
  }
  if (id === 'gross-profit-margin') {
    return [{ value: profitMargin(d.pbit, s.salesRevenue), message: 'That is the profit margin, from profit before interest and tax. The gross profit margin uses gross profit.' }];
  }
  if (id === 'roce') {
    return [
      { value: d.totalAssets > 0 ? (d.pbit / d.totalAssets) * 100 : null, message: 'That divides by total assets. Capital employed is non-current liabilities plus equity.' },
      { value: roce(d.profitForPeriod, d.nonCurrentLiabilities, d.totalEquity), message: 'That uses the profit for the period. ROCE uses profit before interest and tax.' },
      { value: roce(d.profitBeforeTax, d.nonCurrentLiabilities, d.totalEquity), message: 'That uses profit before tax. ROCE uses profit before interest and tax.' },
    ];
  }
  if (id === 'gearing-ratio') {
    return [{ value: d.capitalEmployed > 0 ? (d.totalLiabilities / d.capitalEmployed) * 100 : null, message: 'That uses all liabilities. Gearing counts only non-current liabilities, the long-term borrowing.' }];
  }
  if (id === 'debtor-days') {
    return [{ value: creditorDays(s.debtors, s.costOfSales), message: 'That divides by cost of sales. Debtor days divide by total sales revenue.' }];
  }
  if (id === 'creditor-days') {
    return [{ value: debtorDays(s.tradeCreditors, s.salesRevenue), message: 'That divides by sales revenue. Creditor days divide by cost of sales.' }];
  }
  return [];
}
