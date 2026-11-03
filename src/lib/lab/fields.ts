/**
 * The inputs of the lab's calculators and the checks on them. A label may use
 * {unit}, {units} and {period}, which take the words the reader has chosen.
 * Every message names the field, says what is wrong and what would be right.
 */
import { fmtNumber } from '../format';
import type { FieldSpec, Problem, Raw, Settings } from './types';

const cap = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;

/** Fill a label's {unit}, {units} and {period} with the reader's words. */
export function fillLabel(template: string, s: Settings): string {
  return template.replace(/\{unit\}/g, s.unit).replace(/\{units\}/g, s.units).replace(/\{period\}/g, s.period);
}

/** Checks one value against its specification; returns a message or null. */
export function checkValue(v: number | null | undefined, f: FieldSpec): string | null {
  if (v === null || v === undefined || !Number.isFinite(v)) return `Enter a number for ${f.name}.`;
  if (f.integer && !Number.isInteger(v)) return `${cap(f.name)} must be a whole number.`;
  if (f.min !== undefined) {
    if (f.minExclusive && !(v > f.min)) return f.min === 0 ? `${cap(f.name)} must be more than zero.` : `${cap(f.name)} must be more than ${fmtNumber(f.min)}.`;
    if (!f.minExclusive && v < f.min) return f.min === 0 ? `${cap(f.name)} cannot be negative.` : `${cap(f.name)} must be at least ${fmtNumber(f.min)}.`;
  }
  if (f.max !== undefined && v > f.max) return `${cap(f.name)} must be no more than ${fmtNumber(f.max)}.`;
  return null;
}

/** Checks every field; `prefix` is put before each key (for example "latest."). */
export function validateFields(raw: Raw, specs: FieldSpec[], prefix = '', nameSuffix = ''): Problem[] {
  const out: Problem[] = [];
  for (const f of specs) {
    const message = checkValue(raw[`${prefix}${f.key}`], nameSuffix ? { ...f, name: `${f.name}${nameSuffix}` } : f);
    if (message) out.push({ field: `${prefix}${f.key}`, message });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Break-even, contribution and target profit                          */
/* ------------------------------------------------------------------ */

const F = {
  price: { key: 'price', label: 'Selling price per {unit}', kind: 'money', min: 0, minExclusive: true, name: 'the selling price' },
  variableCost: { key: 'variableCost', label: 'Variable cost per {unit}', kind: 'money', min: 0, name: 'the variable cost per unit', hint: 'Every cost that rises with each unit made and sold.' },
  fixedCosts: { key: 'fixedCosts', label: 'Fixed costs per {period}', kind: 'money', min: 0, name: 'fixed costs', hint: 'Costs that stay the same whatever the output.' },
  quantity: { key: 'quantity', label: 'Forecast sales per {period}', kind: 'count', min: 0, integer: true, name: 'forecast sales' },
  sold: { key: 'quantity', label: 'Sales per {period}', kind: 'count', min: 0, integer: true, name: 'sales' },
  capacity: { key: 'capacity', label: 'Capacity per {period}', kind: 'count', min: 1, integer: true, name: 'capacity', hint: 'The most that can be made in the period.' },
  targetProfit: { key: 'targetProfit', label: 'Target profit per {period}', kind: 'money', name: 'the target profit' },
  expectedSales: { key: 'expectedSales', label: 'Expected sales per {period}, for the target price', kind: 'count', min: 1, integer: true, name: 'expected sales' },
} satisfies Record<string, FieldSpec>;

export const BREAK_EVEN_FIELDS: Record<string, FieldSpec[]> = {
  'break-even-quantity': [F.price, F.variableCost, F.fixedCosts, F.quantity, F.capacity],
  'break-even-revenue': [F.price, F.variableCost, F.fixedCosts, F.quantity, F.capacity],
  'margin-of-safety': [F.price, F.variableCost, F.fixedCosts, F.quantity, F.capacity],
  contribution: [F.price, F.variableCost, F.sold, F.fixedCosts, F.capacity],
  'target-profit': [F.price, F.variableCost, F.fixedCosts, F.targetProfit, F.expectedSales, F.capacity],
};

/* ------------------------------------------------------------------ */
/* Profit and loss                                                     */
/* ------------------------------------------------------------------ */

export const PL_FIELDS = {
  salesRevenue: { key: 'salesRevenue', label: 'Sales revenue', kind: 'money', min: 0, name: 'sales revenue' },
  openingStock: { key: 'openingStock', label: 'Opening stock', kind: 'money', min: 0, name: 'opening stock' },
  purchases: { key: 'purchases', label: 'Purchases', kind: 'money', min: 0, name: 'purchases' },
  closingStock: { key: 'closingStock', label: 'Closing stock', kind: 'money', min: 0, name: 'closing stock' },
  costOfSales: { key: 'costOfSales', label: 'Cost of sales', kind: 'money', min: 0, name: 'cost of sales' },
  expenses: { key: 'expenses', label: 'Expenses', kind: 'money', min: 0, name: 'expenses', hint: 'Running costs that are not part of cost of sales, including depreciation.' },
  interest: { key: 'interest', label: 'Interest', kind: 'money', min: 0, name: 'interest' },
  tax: { key: 'tax', label: 'Tax', kind: 'money', min: 0, name: 'tax' },
  dividends: { key: 'dividends', label: 'Dividends', kind: 'money', min: 0, name: 'dividends' },
} satisfies Record<string, FieldSpec>;

/* ------------------------------------------------------------------ */
/* Ratios: two years, the same fields in each                          */
/* ------------------------------------------------------------------ */

const R = {
  salesRevenue: { key: 'salesRevenue', label: 'Sales revenue', kind: 'money', min: 0, name: 'sales revenue' },
  costOfSales: { key: 'costOfSales', label: 'Cost of sales', kind: 'money', min: 0, name: 'cost of sales' },
  pbit: { key: 'pbit', label: 'Profit before interest and tax', kind: 'money', name: 'profit before interest and tax', hint: 'A loss is entered as a negative number.' },
  nonCurrentLiabilities: { key: 'nonCurrentLiabilities', label: 'Non-current liabilities', kind: 'money', min: 0, name: 'non-current liabilities' },
  equity: { key: 'equity', label: 'Total equity', kind: 'money', name: 'total equity', hint: 'Share capital plus retained earnings.' },
  currentAssets: { key: 'currentAssets', label: 'Current assets', kind: 'money', min: 0, name: 'current assets' },
  currentLiabilities: { key: 'currentLiabilities', label: 'Current liabilities', kind: 'money', min: 0, name: 'current liabilities' },
  stock: { key: 'stock', label: 'Stock', kind: 'money', min: 0, name: 'stock', hint: 'Part of current assets.' },
  openingStock: { key: 'openingStock', label: 'Opening stock', kind: 'money', min: 0, name: 'opening stock' },
  closingStock: { key: 'closingStock', label: 'Closing stock', kind: 'money', min: 0, name: 'closing stock' },
  debtors: { key: 'debtors', label: 'Debtors', kind: 'money', min: 0, name: 'debtors' },
  creditors: { key: 'creditors', label: 'Creditors', kind: 'money', min: 0, name: 'creditors', hint: 'Trade creditors, the suppliers waiting to be paid.' },
} satisfies Record<string, FieldSpec>;

export const RATIO_FIELDS: Record<string, FieldSpec[]> = {
  'gross-profit-margin': [R.salesRevenue, R.costOfSales],
  'profit-margin': [R.salesRevenue, R.pbit],
  roce: [R.pbit, R.nonCurrentLiabilities, R.equity],
  'current-ratio': [R.currentAssets, R.currentLiabilities],
  'acid-test-ratio': [R.currentAssets, R.stock, R.currentLiabilities],
  'gearing-ratio': [R.nonCurrentLiabilities, R.equity],
  'stock-turnover': [R.costOfSales, R.openingStock, R.closingStock],
  'debtor-days': [R.debtors, R.salesRevenue],
  'creditor-days': [R.creditors, R.costOfSales],
};

/** The two years a ratio calculator compares. */
export const YEARS = [
  { key: 'previous', label: 'Previous year' },
  { key: 'latest', label: 'Latest year' },
] as const;
export type YearKey = (typeof YEARS)[number]['key'];

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export const CURRENCIES = [
  { value: '$', label: 'Dollar ($)' },
  { value: '€', label: 'Euro (€)' },
  { value: '£', label: 'Pound (£)' },
  { value: '₹', label: 'Rupee (₹)' },
  { value: '¥', label: 'Yen or yuan (¥)' },
  { value: 'CHF ', label: 'Swiss franc (CHF)' },
] as const;

export const PERIODS = ['month', 'week', 'quarter', 'year'] as const;

/** Settings read from a form, with the defaults where a word is blank or too long. */
export function cleanSettings(raw: Partial<Settings>, fallback: Settings): Settings {
  const word = (v: string | undefined, d: string) => {
    const t = (v ?? '').trim().replace(/\s+/g, ' ');
    return t && t.length <= 24 ? t : d;
  };
  const currency = CURRENCIES.some((c) => c.value === raw.currency) ? (raw.currency as string) : fallback.currency;
  const period = (PERIODS as readonly string[]).includes(raw.period ?? '') ? (raw.period as string) : fallback.period;
  return { currency, unit: word(raw.unit, fallback.unit), units: word(raw.units, fallback.units), period };
}
