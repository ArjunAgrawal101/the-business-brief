/**
 * The Financial Laboratory's example business. Every calculator starts from
 * the figures of Emberly Roasters, a fictional coffee roaster, so that the
 * lab reads as one business seen through every tool. The figures are
 * simulated for teaching and hang together: the statements balance, the
 * year-end cash is the forecast's opening balance, and the cost of sales
 * equals opening stock plus purchases less closing stock. tests/unit/lab.test.ts
 * checks each of those links and every default result by hand.
 */
import type { Statement } from '../ratios';
import type { BudgetLine } from '../budget';
import type { Settings } from './types';

export const BUSINESS = {
  name: 'Emberly Roasters',
  /** The business in a sentence, after its name. */
  what: 'a fictional coffee roaster that sells 1 kg bags of roasted coffee to cafés and to online subscribers',
  /** Every page that uses the figures says so. */
  note: 'Emberly Roasters is fictional, and every figure is simulated for teaching.',
} as const;

/** Money in dollars, output in bags, costs and sales per month. */
export const SETTINGS: Settings = { currency: '$', unit: 'bag', units: 'bags', period: 'month' };

/** Break-even, contribution and target profit: one month at current prices and costs. */
export const BREAK_EVEN = {
  price: 24,
  /** Green beans, packaging, roasting energy and delivery for one bag. */
  variableCost: 14.4,
  /** Wages, rent and the roaster lease, marketing, insurance and software. */
  fixedCosts: 29000,
  quantity: 3600,
  capacity: 4500,
  targetProfit: 8000,
  expectedSales: 3600,
} as const;

/** The statements for the years ended 31 December 2024 and 2025, in dollars. */
export const ACCOUNTS: { previous: Statement; latest: Statement; labels: { previous: string; latest: string } } = {
  labels: { previous: '2024', latest: '2025' },
  previous: {
    salesRevenue: 855600,
    costOfSales: 462000,
    expenses: 298500,
    interest: 3200,
    tax: 23000,
    dividends: 24000,
    propertyPlantEquipment: 336000,
    accumulatedDepreciation: 96000,
    cash: 11400,
    debtors: 72700,
    stock: 47200,
    bankOverdraft: 0,
    tradeCreditors: 52100,
    otherShortTermLoans: 19000,
    longTermBorrowings: 80000,
    shareCapital: 100000,
    retainedEarnings: 120200,
  },
  latest: {
    salesRevenue: 958800,
    costOfSales: 541500,
    expenses: 332100,
    interest: 9600,
    tax: 18900,
    dividends: 20000,
    propertyPlantEquipment: 486000,
    accumulatedDepreciation: 128000,
    cash: 8400,
    debtors: 97300,
    stock: 66800,
    bankOverdraft: 0,
    tradeCreditors: 72600,
    otherShortTermLoans: 41000,
    longTermBorrowings: 160000,
    shareCapital: 100000,
    retainedEarnings: 156900,
  },
};

/** Stock at the start of each year: closing stock of the year before. */
export const OPENING_STOCK = { previous: 38900, latest: 47200 } as const;

/** The year to 31 December 2025, as the profit and loss builder starts it. Cost of sales = 47,200 + 561,100 − 66,800 = 541,500. */
export const PROFIT_AND_LOSS = {
  salesRevenue: 958800,
  openingStock: 47200,
  purchases: 561100,
  closingStock: 66800,
  costOfSales: 541500,
  expenses: 332100,
  interest: 9600,
  tax: 18900,
  dividends: 20000,
} as const;

/** A six-month cash flow forecast from 1 January 2026. The opening balance is the cash at 31 December 2025. */
export const CASH_FLOW = {
  startMonth: 0,
  months: 6,
  opening: 8400,
  overdraftLimit: 20000,
  inflows: [
    { id: 'in-1', label: 'Cash sales: online and shop', values: [20500, 19500, 23000, 24500, 26000, 27500] },
    { id: 'in-2', label: 'Receipts from cafés (30 days’ credit)', values: [63000, 46000, 50500, 55000, 58000, 60500] },
  ],
  outflows: [
    { id: 'out-1', label: 'Green beans', values: [36000, 31500, 34000, 35500, 37000, 38500] },
    { id: 'out-2', label: 'Packaging', values: [3600, 3200, 3400, 3600, 3700, 3900] },
    { id: 'out-3', label: 'Wages and salaries', values: [18500, 18500, 18500, 18500, 18500, 18500] },
    { id: 'out-4', label: 'Rent and roaster lease', values: [7000, 7000, 7000, 7000, 7000, 7000] },
    { id: 'out-5', label: 'Energy', values: [2500, 2400, 2200, 2000, 1800, 1700] },
    { id: 'out-6', label: 'Delivery', values: [5200, 4300, 4700, 5000, 5200, 5400] },
    { id: 'out-7', label: 'Marketing', values: [2800, 2800, 2800, 2800, 2800, 2800] },
    { id: 'out-8', label: 'Loan repayments', values: [3600, 3600, 3600, 3600, 3600, 3600] },
    { id: 'out-9', label: 'Tax on 2025 profit', values: [18900, 0, 0, 0, 0, 0] },
    { id: 'out-10', label: 'New grinder', values: [0, 0, 9000, 0, 0, 0] },
  ],
};

/** The budget for the three months to 30 September 2025, with the actual figures. */
export const BUDGET: { period: string; lines: BudgetLine[] } = {
  period: 'the three months to 30 September 2025',
  lines: [
    { id: 'r-1', label: 'Sales to cafés', kind: 'revenue', budget: 168000, actual: 174600 },
    { id: 'r-2', label: 'Online subscriptions', kind: 'revenue', budget: 72000, actual: 66300 },
    { id: 'c-1', label: 'Green beans', kind: 'cost', budget: 96000, actual: 104800 },
    { id: 'c-2', label: 'Packaging', kind: 'cost', budget: 10800, actual: 10400 },
    { id: 'c-3', label: 'Wages and salaries', kind: 'cost', budget: 54000, actual: 55500 },
    { id: 'c-4', label: 'Rent and roaster lease', kind: 'cost', budget: 21000, actual: 21000 },
    { id: 'c-5', label: 'Energy', kind: 'cost', budget: 7200, actual: 6350 },
    { id: 'c-6', label: 'Delivery', kind: 'cost', budget: 14400, actual: 15100 },
    { id: 'c-7', label: 'Marketing', kind: 'cost', budget: 9000, actual: 7200 },
  ],
};

/** A nitrogen-flush packaging line to supply a supermarket chain: cost now, net cash flows for five years. */
export const PROJECT = {
  label: 'Nitrogen-flush packaging line',
  capitalCost: 120000,
  returns: [22000, 30000, 36000, 38000, 34000],
  rate: 8,
} as const;
