/**
 * The advanced mode's example business: Emberly Roasters, the Financial
 * Laboratory's fictional coffee roaster, followed beyond the IB course. Every
 * figure is simulated for teaching, and the figures join up with the lab's:
 *
 * - the forecast opens from the lab's statement of financial position at
 *   31 December 2025 (src/lib/finance-lab/business.ts), and its first year
 *   uses the lab's month of 2026 (a price of $24.00 a bag, a variable cost of
 *   $14.40 and fixed costs of $29,000 a month), with the 2025 accounts' tax
 *   rate, payout and working capital days;
 * - the cost structures change the lab's month by the same amounts as the
 *   forecast's two alternatives (automating or outsourcing the packing);
 * - the history adds 2022 and 2023 before the lab's 2024 and 2025 accounts,
 *   with retained earnings and stock carried from year to year.
 *
 * tests/unit/adv-finance.test.ts checks every one of those links.
 */
import { ACCOUNTS, BREAK_EVEN, BUSINESS, OPENING_STOCK, PROJECT } from '../finance-lab/business';
import type { Statement } from '../ratios';

export { BUSINESS };


/* ------------------------------------------------------------------ */
/* The integrated forecast                                             */
/* ------------------------------------------------------------------ */

/** The statement of financial position at 31 December 2025, as the forecast reads it. Borrowings are the lab's other short-term loans and long-term borrowings together. */
export const OPENING = {
  nonCurrentAssets: ACCOUNTS.latest.propertyPlantEquipment - ACCOUNTS.latest.accumulatedDepreciation,
  stock: ACCOUNTS.latest.stock,
  debtors: ACCOUNTS.latest.debtors,
  cash: ACCOUNTS.latest.cash - ACCOUNTS.latest.bankOverdraft,
  creditors: ACCOUNTS.latest.tradeCreditors,
  borrowings: ACCOUNTS.latest.otherShortTermLoans + ACCOUNTS.latest.longTermBorrowings,
  shareCapital: ACCOUNTS.latest.shareCapital,
} as const;

/** The year-one drivers: the lab's month of 2026 for a year, the 2025 accounts' rates and days. */
export const DRIVERS = {
  years: 5,
  firstYear: 2026,
  volume: BREAK_EVEN.quantity * 12,
  volumeGrowth: 4,
  price: BREAK_EVEN.price,
  priceGrowth: 2,
  variableCost: BREAK_EVEN.variableCost,
  costInflation: 2.5,
  fixedCosts: BREAK_EVEN.fixedCosts * 12,
  capex: 15000,
  assetLife: 8,
  existingLife: 10,
  debtorDays: 37,
  stockDays: 45,
  creditorDays: 49,
  interestRate: 6,
  repayment: 40200,
  taxRate: 25,
  payout: 35,
} as const;

/** How each scenario moves the drivers: per cent changes, and percentage points for growth. */
export const SCENARIOS = {
  upside: { volume: 3, growth: 1.5, price: 1, variableCost: 0, fixedCosts: 0 },
  downside: { volume: -5, growth: -2, price: -1, variableCost: 1, fixedCosts: 0 },
} as const;

/** The two ways of packing the coffee, as changes to the year-one drivers. */
export const ALTERNATIVES = {
  a: { name: 'Automate the packing', investment: 180000, borrowing: 150000, variableCostChange: -1.1, fixedCostChange: 9000, volumeChange: 0 },
  b: { name: 'Outsource the packing', investment: 0, borrowing: 0, variableCostChange: 0.5, fixedCostChange: -40800, volumeChange: 0 },
} as const;

/* ------------------------------------------------------------------ */
/* Capital budgeting                                                   */
/* ------------------------------------------------------------------ */

/** The inputs to the weighted average cost of capital. Rates in per cent. */
export const WACC_INPUTS = {
  riskFree: 4,
  beta: 1.2,
  marketPremium: 5,
  costOfDebt: DRIVERS.interestRate,
  taxRate: DRIVERS.taxRate,
  /** An estimate: the shares are not listed, so their market value is a judgement. */
  equityValue: 600000,
  /** The loans, at roughly the $201,000 the accounts show. */
  debtValue: 200000,
} as const;

/** Three projects competing for the same money: the lab's packaging line and two more. */
export const PROJECTS = [
  { name: PROJECT.label, outlay: PROJECT.capitalCost, flows: [...PROJECT.returns] },
  { name: 'Second roaster for supermarket orders', outlay: 180000, flows: [36000, 38000, 40000, 42000, 44000, 44000, 44000, 44000] },
  { name: 'Café kiosk at the roastery', outlay: 45000, flows: [28000, 25000, 14000] },
] as const;

/* ------------------------------------------------------------------ */
/* Break-even scenarios                                                */
/* ------------------------------------------------------------------ */

/** A month: the lab's price, forecast and capacity, with the packing done two ways. */
export const COST_STRUCTURES = {
  price: BREAK_EVEN.price,
  forecast: BREAK_EVEN.quantity,
  capacity: BREAK_EVEN.capacity,
  /** Fixed costs up by the service contract ($750 a month) and the machine's depreciation ($180,000 over 8 years: $1,875 a month); variable cost $1.10 a bag below the lab's $14.40. */
  a: { name: 'Automate the packing', fixedCosts: BREAK_EVEN.fixedCosts + 750 + 1875, variableCost: 13.3 },
  /** Fixed costs down by $3,400 a month; a co-packer's fee of $1.10 a bag less $0.60 of packing labour saved, so $0.50 above the lab's $14.40. */
  b: { name: 'Outsource the packing', fixedCosts: BREAK_EVEN.fixedCosts - 3400, variableCost: 14.9 },
} as const;

/* ------------------------------------------------------------------ */
/* The performance dashboard                                           */
/* ------------------------------------------------------------------ */

/** Stock at 31 December 2021, so the first year's average stock can be worked. */
export const HISTORY_OPENING_STOCK = 27400;

/** Four years of accounts. 2024 and 2025 are the lab's; 2022 and 2023 come before them. */
export const HISTORY: Array<{ label: string; statement: Statement }> = [
  {
    label: '2022',
    statement: {
      salesRevenue: 640000,
      costOfSales: 332000,
      expenses: 230000,
      interest: 4500,
      tax: 18375,
      dividends: 18000,
      propertyPlantEquipment: 210000,
      accumulatedDepreciation: 44000,
      cash: 2250,
      debtors: 52000,
      stock: 31600,
      bankOverdraft: 0,
      tradeCreditors: 33800,
      otherShortTermLoans: 10000,
      longTermBorrowings: 75000,
      shareCapital: 100000,
      retainedEarnings: 33050,
    },
  },
  {
    label: '2023',
    statement: {
      salesRevenue: 742000,
      costOfSales: 393000,
      expenses: 262000,
      interest: 4000,
      tax: 20750,
      dividends: 20000,
      propertyPlantEquipment: 260000,
      accumulatedDepreciation: 68000,
      cash: 7900,
      debtors: 62000,
      stock: OPENING_STOCK.previous,
      bankOverdraft: 0,
      tradeCreditors: 41500,
      otherShortTermLoans: 14000,
      longTermBorrowings: 70000,
      shareCapital: 100000,
      retainedEarnings: 75300,
    },
  },
  { label: ACCOUNTS.labels.previous, statement: { ...ACCOUNTS.previous } },
  { label: ACCOUNTS.labels.latest, statement: { ...ACCOUNTS.latest } },
];

/** Money in dollars throughout, as in the lab. */
export const CURRENCY = '$';
