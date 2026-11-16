/**
 * The integrated forecast: drivers (volume, price, growth, variable cost,
 * fixed costs, capital expenditure, depreciation, working capital days,
 * interest, tax and dividends) turned into a statement of profit or loss, a
 * statement of cash flows and a statement of financial position for three to
 * five years, linked so that the balance sheet balances every year.
 *
 * Beyond the IB course: the guide's final accounts (3.4) and cash flow
 * forecasts (3.7) are separate tools; linking them through a statement of
 * cash flows built from profit is advanced financial analysis.
 *
 * How the three statements link, in one year:
 * - profit for the year adds to retained earnings;
 * - the statement of cash flows starts from that profit, adds back
 *   depreciation (a cost that uses no cash), takes off the cash tied up in
 *   more stock and debtors, adds the cash kept by owing suppliers more, then
 *   takes off capital expenditure, loan repayments and dividends;
 * - the closing cash is the cash on the balance sheet, so assets less
 *   liabilities equal equity whenever they did at the start. The model checks
 *   it every year rather than assuming it.
 *
 * Simplifications, stated on the page: every figure is rounded to a whole
 * unit of money as it is calculated (so every total adds up exactly); interest
 * and tax are paid in the year they are charged; interest is charged on the
 * borrowing and any overdraft at the start of the year, with new borrowing
 * drawn at the start of year one; no tax is charged on a loss and no dividend
 * is paid from one; depreciation is straight line, a full year's charge in the
 * year an asset is bought; all borrowing is on one line.
 */
import { round } from '../format';
import { validateFields } from '../finance-lab/fields';
import type { FieldSpec, Problem, Raw } from '../finance-lab/types';

export interface Opening {
  /** Non-current assets at net book value. */
  nonCurrentAssets: number;
  stock: number;
  debtors: number;
  /** Negative when the account is overdrawn. */
  cash: number;
  creditors: number;
  /** Every loan, short or long term, except an overdraft. */
  borrowings: number;
  shareCapital: number;
}

export interface Drivers {
  years: number;
  firstYear: number;
  /** Units sold in year one. */
  volume: number;
  /** Per cent a year, from year two. */
  volumeGrowth: number;
  price: number;
  priceGrowth: number;
  /** Per unit, year one: every cost that rises with each unit, which the forecast treats as cost of sales. */
  variableCost: number;
  /** Per cent a year, applied to the variable cost per unit and to the fixed costs. */
  costInflation: number;
  /** Year one, excluding depreciation. */
  fixedCosts: number;
  /** Capital expenditure every year. */
  capex: number;
  /** Years over which new assets are depreciated. */
  assetLife: number;
  /** Years of life left in the assets owned at the start. */
  existingLife: number;
  debtorDays: number;
  stockDays: number;
  creditorDays: number;
  interestRate: number;
  /** Borrowing repaid each year, until none is left. */
  repayment: number;
  taxRate: number;
  /** Dividends as a per cent of the profit for the year. */
  payout: number;
}

/** A scenario's changes to the drivers: per cent changes, and percentage points for volume growth. */
export interface Flex {
  volume: number;
  growth: number;
  price: number;
  variableCost: number;
  fixedCosts: number;
}

/** A strategic alternative: an investment in year one and changes to the year-one drivers. */
export interface Alternative {
  name: string;
  investment: number;
  borrowing: number;
  /** Money per unit, in year-one prices. */
  variableCostChange: number;
  /** Money a year, in year-one prices. */
  fixedCostChange: number;
  /** Per cent. */
  volumeChange: number;
}

export interface ForecastInput {
  drivers: Drivers;
  opening: Opening;
  scenarios: { upside: Flex; downside: Flex };
  alternatives: { a: Alternative; b: Alternative };
}

export type ScenarioId = 'base' | 'upside' | 'downside';
export type OptionId = 'none' | 'a' | 'b';
export const SCENARIO_IDS: readonly ScenarioId[] = ['base', 'upside', 'downside'];
export const OPTION_IDS: readonly OptionId[] = ['none', 'a', 'b'];
export const SCENARIO_NAMES: Record<ScenarioId, string> = { base: 'Base case', upside: 'Upside', downside: 'Downside' };

export const NO_FLEX: Flex = { volume: 0, growth: 0, price: 0, variableCost: 0, fixedCosts: 0 };
export const MIN_YEARS = 3;
export const MAX_YEARS = 5;

const whole = (v: number): number => round(v, 0) + 0;
const cents = (v: number): number => round(v, 2) + 0;

/** The opening statement of financial position's retained earnings: whatever makes it balance. */
export function openingRetained(o: Opening): number {
  const assets = o.nonCurrentAssets + o.stock + o.debtors + Math.max(0, o.cash);
  const liabilities = o.creditors + Math.max(0, -o.cash) + o.borrowings;
  return assets - liabilities - o.shareCapital;
}

/** The year-one figures a scenario and an option give, before growth. */
export interface Effective {
  volume: number;
  growth: number;
  price: number;
  variableCost: number;
  fixedCosts: number;
  capex: number[];
  borrowing: number[];
}

export function effective(input: ForecastInput, scenario: ScenarioId, option: OptionId): Effective {
  const d = input.drivers;
  const f = scenario === 'base' ? NO_FLEX : input.scenarios[scenario];
  const alt = option === 'none' ? null : input.alternatives[option];
  const n = d.years;
  return {
    volume: d.volume * (1 + f.volume / 100) * (1 + (alt?.volumeChange ?? 0) / 100),
    growth: (d.volumeGrowth + f.growth) / 100,
    price: d.price * (1 + f.price / 100),
    variableCost: d.variableCost * (1 + f.variableCost / 100) + (alt?.variableCostChange ?? 0),
    fixedCosts: d.fixedCosts * (1 + f.fixedCosts / 100) + (alt?.fixedCostChange ?? 0),
    capex: Array.from({ length: n }, (_, k) => d.capex + (k === 0 ? (alt?.investment ?? 0) : 0)),
    borrowing: Array.from({ length: n }, (_, k) => (k === 0 ? (alt?.borrowing ?? 0) : 0)),
  };
}

export interface Year {
  label: string;
  /* Statement of profit or loss */
  volume: number;
  price: number;
  unitCost: number;
  revenue: number;
  costOfSales: number;
  grossProfit: number;
  fixedCosts: number;
  depreciation: number;
  pbit: number;
  interest: number;
  pbt: number;
  tax: number;
  profit: number;
  dividends: number;
  retained: number;
  /* Statement of cash flows */
  changeStock: number;
  changeDebtors: number;
  changeCreditors: number;
  operating: number;
  capex: number;
  borrowing: number;
  repayment: number;
  financing: number;
  netCash: number;
  openingCash: number;
  closingCash: number;
  /* Statement of financial position */
  nonCurrentAssets: number;
  stock: number;
  debtors: number;
  cash: number;
  currentAssets: number;
  totalAssets: number;
  overdraft: number;
  creditors: number;
  currentLiabilities: number;
  borrowings: number;
  totalLiabilities: number;
  netAssets: number;
  shareCapital: number;
  retainedEarnings: number;
  equity: number;
  /** Net assets less equity: zero when the year balances. */
  difference: number;
  /* Measures */
  contribution: number;
  grossMargin: number | null;
  profitMargin: number | null;
  roce: number | null;
  gearing: number | null;
  interestCover: number | null;
  currentRatio: number | null;
  netDebt: number;
  /** Units to cover fixed costs and depreciation, before interest, rounded up. */
  breakEven: number | null;
  /** Total contribution ÷ profit before interest and tax, when that profit is positive. */
  operatingLeverage: number | null;
}

export interface OpeningRow {
  label: string;
  nonCurrentAssets: number;
  stock: number;
  debtors: number;
  cash: number;
  currentAssets: number;
  totalAssets: number;
  overdraft: number;
  creditors: number;
  currentLiabilities: number;
  borrowings: number;
  totalLiabilities: number;
  netAssets: number;
  shareCapital: number;
  retainedEarnings: number;
  equity: number;
}

export interface Run {
  scenario: ScenarioId;
  option: OptionId;
  opening: OpeningRow;
  years: Year[];
  /** True when every year balances to the unit. */
  balances: boolean;
  totalProfit: number;
  totalOperating: number;
  totalCapex: number;
  lowest: { value: number; index: number };
  last: Year;
}

const ratio = (a: number, b: number): number | null => (b > 0 ? a / b : null);

export function openingRow(o: Opening, firstYear: number): OpeningRow {
  const cash = Math.max(0, o.cash);
  const overdraft = Math.max(0, -o.cash);
  const currentAssets = cash + o.debtors + o.stock;
  const totalAssets = o.nonCurrentAssets + currentAssets;
  const currentLiabilities = overdraft + o.creditors;
  const totalLiabilities = currentLiabilities + o.borrowings;
  const re = openingRetained(o);
  return {
    label: `Start of ${firstYear}`,
    nonCurrentAssets: o.nonCurrentAssets,
    stock: o.stock,
    debtors: o.debtors,
    cash,
    currentAssets,
    totalAssets,
    overdraft,
    creditors: o.creditors,
    currentLiabilities,
    borrowings: o.borrowings,
    totalLiabilities,
    netAssets: totalAssets - totalLiabilities,
    shareCapital: o.shareCapital,
    retainedEarnings: re,
    equity: o.shareCapital + re,
  };
}

/**
 * Depreciation in each year, straight line: the assets owned at the start over
 * the years left in them, and each year's capital expenditure over the asset
 * life, a full year's charge in the year of purchase. Each year's charge is
 * the rise in the rounded total charged so far, so that rounding never
 * charges more than an asset cost.
 */
export function depreciationSchedule(nbv: number, existingLife: number, capex: number[], assetLife: number): number[] {
  let before = 0;
  return capex.map((_, k) => {
    const t = k + 1;
    const existing = nbv * (Math.min(t, existingLife) / existingLife);
    let fresh = 0;
    for (let j = 1; j <= t; j++) fresh += (capex[j - 1] ?? 0) * (Math.min(t - j + 1, assetLife) / assetLife);
    const total = whole(existing + fresh);
    const charge = total - before;
    before = total;
    return charge;
  });
}

/** Runs one scenario with one option through every year. */
export function runForecast(input: ForecastInput, scenario: ScenarioId = 'base', option: OptionId = 'none'): Run {
  const d = input.drivers;
  const o = input.opening;
  const e = effective(input, scenario, option);
  const open = openingRow(o, d.firstYear);
  const deps = depreciationSchedule(o.nonCurrentAssets, d.existingLife, e.capex, d.assetLife);
  const years: Year[] = [];
  let prev = { nca: o.nonCurrentAssets, stock: o.stock, debtors: o.debtors, creditors: o.creditors, cash: o.cash, borrowings: o.borrowings, re: open.retainedEarnings };
  for (let k = 0; k < d.years; k++) {
    const growth = (rate: number) => (1 + rate) ** k;
    const volume = whole(e.volume * growth(e.growth));
    const price = cents(e.price * growth(d.priceGrowth / 100));
    const unitCost = cents(e.variableCost * growth(d.costInflation / 100));
    const revenue = whole(volume * price);
    const costOfSales = whole(volume * unitCost);
    const grossProfit = revenue - costOfSales;
    const fixedCosts = whole(e.fixedCosts * growth(d.costInflation / 100));
    const depreciation = deps[k] ?? 0;
    const pbit = grossProfit - fixedCosts - depreciation;
    const capex = e.capex[k] ?? 0;
    const borrowing = e.borrowing[k] ?? 0;
    const interest = whole((d.interestRate / 100) * (prev.borrowings + borrowing + Math.max(0, -prev.cash)));
    const pbt = pbit - interest;
    const tax = pbt > 0 ? whole((d.taxRate / 100) * pbt) : 0;
    const profit = pbt - tax;
    const dividends = profit > 0 ? whole((d.payout / 100) * profit) : 0;
    const retained = profit - dividends;
    const debtors = whole((revenue * d.debtorDays) / 365);
    const stock = whole((costOfSales * d.stockDays) / 365);
    const creditors = whole((costOfSales * d.creditorDays) / 365);
    const changeStock = stock - prev.stock;
    const changeDebtors = debtors - prev.debtors;
    const changeCreditors = creditors - prev.creditors;
    const operating = profit + depreciation - changeStock - changeDebtors + changeCreditors;
    const repayment = Math.min(d.repayment, prev.borrowings + borrowing);
    const financing = borrowing - repayment - dividends;
    const netCash = operating - capex + financing;
    const closingCash = prev.cash + netCash;
    const nonCurrentAssets = prev.nca + capex - depreciation;
    const borrowings = prev.borrowings + borrowing - repayment;
    const retainedEarnings = prev.re + retained;
    const cash = Math.max(0, closingCash);
    const overdraft = Math.max(0, -closingCash);
    const currentAssets = cash + debtors + stock;
    const totalAssets = nonCurrentAssets + currentAssets;
    const currentLiabilities = overdraft + creditors;
    const totalLiabilities = currentLiabilities + borrowings;
    const netAssets = totalAssets - totalLiabilities;
    const equity = o.shareCapital + retainedEarnings;
    const contribution = revenue - costOfSales;
    const unitContribution = price - unitCost;
    years.push({
      label: String(d.firstYear + k),
      volume,
      price,
      unitCost,
      revenue,
      costOfSales,
      grossProfit,
      fixedCosts,
      depreciation,
      pbit,
      interest,
      pbt,
      tax,
      profit,
      dividends,
      retained,
      changeStock,
      changeDebtors,
      changeCreditors,
      operating,
      capex,
      borrowing,
      repayment,
      financing,
      netCash,
      openingCash: prev.cash,
      closingCash,
      nonCurrentAssets,
      stock,
      debtors,
      cash,
      currentAssets,
      totalAssets,
      overdraft,
      creditors,
      currentLiabilities,
      borrowings,
      totalLiabilities,
      netAssets,
      shareCapital: o.shareCapital,
      retainedEarnings,
      equity,
      difference: netAssets - equity,
      contribution,
      grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : null,
      profitMargin: revenue > 0 ? (pbit / revenue) * 100 : null,
      roce: borrowings + equity > 0 ? (pbit / (borrowings + equity)) * 100 : null,
      gearing: borrowings + equity > 0 ? (borrowings / (borrowings + equity)) * 100 : null,
      interestCover: interest > 0 ? pbit / interest : null,
      currentRatio: ratio(currentAssets, currentLiabilities),
      netDebt: borrowings + overdraft - cash,
      breakEven: unitContribution > 0 ? Math.ceil(round((fixedCosts + depreciation) / unitContribution, 9)) : null,
      operatingLeverage: pbit > 0 ? contribution / pbit : null,
    });
    prev = { nca: nonCurrentAssets, stock, debtors, creditors, cash: closingCash, borrowings, re: retainedEarnings };
  }
  let lowest = { value: Infinity, index: 0 };
  years.forEach((y, i) => {
    if (y.closingCash < lowest.value) lowest = { value: y.closingCash, index: i };
  });
  const sum = (f: (y: Year) => number) => years.reduce((a, y) => a + f(y), 0);
  const last = years[years.length - 1] as Year;
  return {
    scenario,
    option,
    opening: open,
    years,
    balances: years.every((y) => y.difference === 0),
    totalProfit: sum((y) => y.profit),
    totalOperating: sum((y) => y.operating),
    totalCapex: sum((y) => y.capex),
    lowest,
    last,
  };
}

/** Every scenario with every option: nine runs, keyed "scenario/option". */
export function runAll(input: ForecastInput): Record<`${ScenarioId}/${OptionId}`, Run> {
  const out = {} as Record<`${ScenarioId}/${OptionId}`, Run>;
  for (const s of SCENARIO_IDS) for (const o of OPTION_IDS) out[`${s}/${o}`] = runForecast(input, s, o);
  return out;
}

/* ------------------------------------------------------------------ */
/* The form                                                            */
/* ------------------------------------------------------------------ */

const pc = (key: string, label: string, name: string, min: number, max: number, hint?: string): FieldSpec => ({ key, label, kind: 'percent', min, max, name, ...(hint ? { hint } : {}) });

/** The drivers, grouped as the form groups them. */
export const DRIVER_FIELDS: Record<'sales' | 'costs' | 'assets' | 'working' | 'finance', FieldSpec[]> = {
  sales: [
    { key: 'volume', label: 'Units sold in year one', kind: 'count', min: 0, integer: true, name: 'the units sold in year one' },
    pc('volumeGrowth', 'Growth in units, a year', 'the growth in units', -50, 100, 'From year two. Negative for a fall.'),
    { key: 'price', label: 'Selling price per unit, year one', kind: 'money', min: 0, minExclusive: true, name: 'the selling price' },
    pc('priceGrowth', 'Price rise, a year', 'the price rise', -50, 100),
  ],
  costs: [
    { key: 'variableCost', label: 'Variable cost per unit, year one', kind: 'money', min: 0, name: 'the variable cost per unit', hint: 'Every cost that rises with each unit; the forecast treats it as cost of sales.' },
    { key: 'fixedCosts', label: 'Fixed costs, year one', kind: 'money', min: 0, name: 'the fixed costs', hint: 'Wages, rent and other overheads, before depreciation.' },
    pc('costInflation', 'Cost inflation, a year', 'cost inflation', -50, 100, 'Applied to the variable cost per unit and to the fixed costs.'),
  ],
  assets: [
    { key: 'capex', label: 'Capital expenditure, each year', kind: 'money', min: 0, name: 'the capital expenditure' },
    { key: 'assetLife', label: 'Life of new assets, years', kind: 'number', min: 1, max: 50, integer: true, name: 'the life of new assets', hint: 'Straight line, a full year’s charge in the year of purchase.' },
    { key: 'existingLife', label: 'Years left in the assets owned now', kind: 'number', min: 1, max: 50, integer: true, name: 'the years left in the assets owned now' },
  ],
  working: [
    { key: 'debtorDays', label: 'Debtor days', kind: 'number', min: 0, max: 365, name: 'debtor days', hint: 'Year-end debtors = sales revenue × days ÷ 365.' },
    { key: 'stockDays', label: 'Stock days', kind: 'number', min: 0, max: 365, name: 'stock days', hint: 'Year-end stock = cost of sales × days ÷ 365.' },
    { key: 'creditorDays', label: 'Creditor days', kind: 'number', min: 0, max: 365, name: 'creditor days', hint: 'Year-end creditors = cost of sales × days ÷ 365.' },
  ],
  finance: [
    pc('interestRate', 'Interest rate', 'the interest rate', 0, 100, 'On the borrowing and any overdraft at the start of each year.'),
    { key: 'repayment', label: 'Borrowing repaid each year', kind: 'money', min: 0, name: 'the yearly repayment' },
    pc('taxRate', 'Tax rate', 'the tax rate', 0, 100, 'On profit before tax; none on a loss.'),
    pc('payout', 'Dividends, share of profit', 'the dividend payout', 0, 100),
  ],
};

export const OPENING_FIELDS: FieldSpec[] = [
  { key: 'nonCurrentAssets', label: 'Non-current assets (net book value)', kind: 'money', min: 0, name: 'the non-current assets' },
  { key: 'stock', label: 'Stock', kind: 'money', min: 0, name: 'the opening stock' },
  { key: 'debtors', label: 'Debtors', kind: 'money', min: 0, name: 'the opening debtors' },
  { key: 'cash', label: 'Cash (negative if overdrawn)', kind: 'money', name: 'the opening cash' },
  { key: 'creditors', label: 'Trade creditors', kind: 'money', min: 0, name: 'the opening creditors' },
  { key: 'borrowings', label: 'Borrowings', kind: 'money', min: 0, name: 'the opening borrowings', hint: 'Every loan, short or long term, except an overdraft.' },
  { key: 'shareCapital', label: 'Share capital', kind: 'money', min: 0, name: 'the share capital' },
];

export const FLEX_FIELDS: FieldSpec[] = [
  pc('volume', 'Units sold', 'the change in units', -90, 200),
  { key: 'growth', label: 'Growth in units, percentage points', kind: 'number', min: -50, max: 50, name: 'the change in growth' },
  pc('price', 'Selling price', 'the change in price', -90, 200),
  pc('variableCost', 'Variable cost per unit', 'the change in variable cost', -90, 200),
  pc('fixedCosts', 'Fixed costs', 'the change in fixed costs', -90, 200),
];

export const ALTERNATIVE_FIELDS: FieldSpec[] = [
  { key: 'investment', label: 'Investment in year one', kind: 'money', min: 0, name: 'the investment', hint: 'Depreciated over the life of new assets.' },
  { key: 'borrowing', label: 'New borrowing in year one', kind: 'money', min: 0, name: 'the new borrowing' },
  { key: 'variableCostChange', label: 'Change in variable cost per unit', kind: 'money', name: 'the change in variable cost', hint: 'Negative for a saving.' },
  { key: 'fixedCostChange', label: 'Change in fixed costs, a year', kind: 'money', name: 'the change in fixed costs', hint: 'Negative for a saving.' },
  pc('volumeChange', 'Change in units sold', 'the change in units', -90, 200),
];

export const HORIZON = { key: 'years', name: 'the number of years' } as const;
export const FIRST_YEAR: FieldSpec = { key: 'firstYear', label: 'First year', kind: 'number', min: 1900, max: 2200, integer: true, name: 'the first year' };

/** Every numeric field of the form, by its name in the form. */
export function forecastFieldNames(): string[] {
  return [
    HORIZON.key,
    FIRST_YEAR.key,
    ...Object.values(DRIVER_FIELDS).flat().map((f) => f.key),
    ...OPENING_FIELDS.map((f) => `o.${f.key}`),
    ...(['up', 'down'] as const).flatMap((s) => FLEX_FIELDS.map((f) => `${s}.${f.key}`)),
    ...(['a', 'b'] as const).flatMap((s) => ALTERNATIVE_FIELDS.map((f) => `${s}.${f.key}`)),
  ];
}

const ALT_NAME = (text: Record<string, string>, k: 'a' | 'b') => cleanName(text[`${k}.name`] ?? '', k === 'a' ? 'Alternative A' : 'Alternative B');

/** A name typed by the reader, with spaces tidied and the platform's text marks removed, so it can sit inside a sentence. */
export function cleanName(v: string, fallback: string, max = 48): string {
  const t = v.replace(/[*_`[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  return t || fallback;
}

/** Checks the form; every message names its field. */
export function validateForecast(raw: Raw): Problem[] {
  const out: Problem[] = [];
  const years = raw[HORIZON.key];
  if (years === null || years === undefined || !Number.isInteger(years) || years < MIN_YEARS || years > MAX_YEARS) out.push({ field: HORIZON.key, message: `Choose between ${MIN_YEARS} and ${MAX_YEARS} years.` });
  out.push(...validateFields(raw, [FIRST_YEAR]));
  out.push(...validateFields(raw, Object.values(DRIVER_FIELDS).flat()));
  out.push(...validateFields(raw, OPENING_FIELDS, 'o.'));
  out.push(...validateFields(raw, FLEX_FIELDS, 'up.', ' in the upside'));
  out.push(...validateFields(raw, FLEX_FIELDS, 'down.', ' in the downside'));
  out.push(...validateFields(raw, ALTERNATIVE_FIELDS, 'a.', ' for alternative A'));
  out.push(...validateFields(raw, ALTERNATIVE_FIELDS, 'b.', ' for alternative B'));
  if (out.length) return out;
  // Every combination must leave a cost that is not negative.
  const v = (k: string) => raw[k] as number;
  for (const alt of ['a', 'b'] as const) {
    for (const sc of ['', 'up.', 'down.'] as const) {
      const vc = v('variableCost') * (1 + (sc ? v(`${sc}variableCost`) : 0) / 100) + v(`${alt}.variableCostChange`);
      const fc = v('fixedCosts') * (1 + (sc ? v(`${sc}fixedCosts`) : 0) / 100) + v(`${alt}.fixedCostChange`);
      const where = sc === '' ? 'in the base case' : sc === 'up.' ? 'in the upside' : 'in the downside';
      if (vc < 0 && !out.some((p) => p.field === `${alt}.variableCostChange`)) out.push({ field: `${alt}.variableCostChange`, message: `This change would make the variable cost per unit negative ${where}.` });
      if (fc < 0 && !out.some((p) => p.field === `${alt}.fixedCostChange`)) out.push({ field: `${alt}.fixedCostChange`, message: `This change would make the fixed costs negative ${where}.` });
    }
  }
  return out;
}

/** The form's figures as the model's input. Call only after validateForecast has found nothing. */
export function forecastInput(raw: Raw, text: Record<string, string>): ForecastInput {
  const n = (k: string) => raw[k] ?? 0;
  const flex = (p: string): Flex => ({ volume: n(`${p}.volume`), growth: n(`${p}.growth`), price: n(`${p}.price`), variableCost: n(`${p}.variableCost`), fixedCosts: n(`${p}.fixedCosts`) });
  const alt = (p: 'a' | 'b'): Alternative => ({
    name: ALT_NAME(text, p),
    investment: n(`${p}.investment`),
    borrowing: n(`${p}.borrowing`),
    variableCostChange: n(`${p}.variableCostChange`),
    fixedCostChange: n(`${p}.fixedCostChange`),
    volumeChange: n(`${p}.volumeChange`),
  });
  return {
    drivers: {
      years: n('years'),
      firstYear: n('firstYear'),
      volume: n('volume'),
      volumeGrowth: n('volumeGrowth'),
      price: n('price'),
      priceGrowth: n('priceGrowth'),
      variableCost: n('variableCost'),
      costInflation: n('costInflation'),
      fixedCosts: n('fixedCosts'),
      capex: n('capex'),
      assetLife: n('assetLife'),
      existingLife: n('existingLife'),
      debtorDays: n('debtorDays'),
      stockDays: n('stockDays'),
      creditorDays: n('creditorDays'),
      interestRate: n('interestRate'),
      repayment: n('repayment'),
      taxRate: n('taxRate'),
      payout: n('payout'),
    },
    opening: {
      nonCurrentAssets: n('o.nonCurrentAssets'),
      stock: n('o.stock'),
      debtors: n('o.debtors'),
      cash: n('o.cash'),
      creditors: n('o.creditors'),
      borrowings: n('o.borrowings'),
      shareCapital: n('o.shareCapital'),
    },
    scenarios: { upside: flex('up'), downside: flex('down') },
    alternatives: { a: alt('a'), b: alt('b') },
  };
}

/** The input as the form's fields: the inverse of forecastInput, for the defaults and for saved work. */
export function forecastFields(input: ForecastInput): { raw: Record<string, number>; text: Record<string, string> } {
  const raw: Record<string, number> = {};
  for (const [k, v] of Object.entries(input.drivers)) raw[k] = v;
  for (const [k, v] of Object.entries(input.opening)) raw[`o.${k}`] = v;
  for (const [k, v] of Object.entries(input.scenarios.upside)) raw[`up.${k}`] = v;
  for (const [k, v] of Object.entries(input.scenarios.downside)) raw[`down.${k}`] = v;
  const text: Record<string, string> = {};
  for (const p of ['a', 'b'] as const) {
    const a = input.alternatives[p];
    text[`${p}.name`] = a.name;
    raw[`${p}.investment`] = a.investment;
    raw[`${p}.borrowing`] = a.borrowing;
    raw[`${p}.variableCostChange`] = a.variableCostChange;
    raw[`${p}.fixedCostChange`] = a.fixedCostChange;
    raw[`${p}.volumeChange`] = a.volumeChange;
  }
  return { raw, text };
}
