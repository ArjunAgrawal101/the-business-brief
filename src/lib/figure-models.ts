/**
 * The arithmetic behind the diagrams a reader can change: the levels a span
 * of control produces (2.2), a cash flow timeline under different credit
 * terms (3.7), a profitability and liquidity dashboard (3.5), two investment
 * projects under three methods (3.8) and the lead time of a process before
 * and after lean production (5.3). Pure functions, no drawing: the build and
 * the browser both call them, and tests/unit/figure-models.test.ts checks
 * every one against figures worked by hand.
 */
import { acidTestRatio, capitalEmployed, currentRatio, grossProfitMargin, profitMargin, roce } from './ratios';
import { appraise, type Appraisal, type Project, type Rate } from './investment';

/* ------------------------------------------------------------------ */
/* Span of control and levels of hierarchy (2.2)                        */
/* ------------------------------------------------------------------ */

export interface Hierarchy {
  /** People at each level, from the top (one person) down to the front line. */
  levels: number[];
  /** Everyone above the front line. */
  managers: number;
  total: number;
  /** Links in the chain of command from the top to the front line. */
  chain: number;
}

/**
 * The structure that gives every manager the same span of control: each level
 * needs one manager for every `span` people below, rounded up, until one
 * person is at the top. A simplification: real spans vary across a business.
 */
export function hierarchy(frontLine: number, span: number): Hierarchy {
  if (!Number.isInteger(frontLine) || frontLine < 2) throw new Error('The front line needs at least two people.');
  if (!Number.isInteger(span) || span < 2) throw new Error('A span of control is at least two.');
  const up = [frontLine];
  while (up[up.length - 1]! > 1) up.push(Math.ceil(up[up.length - 1]! / span));
  const levels = up.reverse();
  const total = levels.reduce((a, b) => a + b, 0);
  return { levels, managers: total - frontLine, total, chain: levels.length - 1 };
}

/* ------------------------------------------------------------------ */
/* A cash flow timeline under different credit terms (3.7)              */
/* ------------------------------------------------------------------ */

/** A fictional new business that sells on credit: Larkfield Cycles, which assembles bicycles. */
export const CASH_BASE = {
  business: 'Larkfield Cycles',
  months: ['January', 'February', 'March', 'April', 'May', 'June'],
  units: [400, 450, 500, 550, 600, 650],
  price: 20,
  /** Materials for each unit, bought in the month the unit is sold. */
  materials: 8,
  /** Rent, wages and other costs paid every month. */
  fixed: 3000,
};

export type CashBase = typeof CASH_BASE;

export interface CashInputs {
  /** Months customers take to pay: 0 is cash on delivery. */
  customerCredit: number;
  /** Months the business takes to pay its suppliers. */
  supplierCredit: number;
  opening: number;
  /** The overdraft the bank has agreed, as a positive amount. */
  overdraft: number;
}

export const CASH_DEFAULTS: CashInputs = { customerCredit: 2, supplierCredit: 0, opening: 4000, overdraft: 5000 };

export type CashStatus = 'in-credit' | 'overdraft' | 'over-limit';

export interface CashMonth {
  month: string;
  revenue: number;
  receipts: number;
  materialsPaid: number;
  fixedPaid: number;
  payments: number;
  net: number;
  opening: number;
  closing: number;
  profit: number;
  cumulativeProfit: number;
  status: CashStatus;
}

export interface CashTimeline {
  rows: CashMonth[];
  profit: number;
  closing: number;
  /** Customers still to pay at the end of the period. */
  debtors: number;
  /** Suppliers still to be paid at the end of the period. */
  creditors: number;
  lowest: { month: string; closing: number };
  /** Months beyond the agreed overdraft. */
  overLimit: string[];
}

const months = (n: number) => Math.round(n);

/**
 * Month by month: receipts arrive `customerCredit` months after each sale and
 * materials are paid for `supplierCredit` months after they are used. The
 * business starts trading in the first month, so nothing earlier is owed in
 * either direction. Profit counts each sale in the month it is made.
 */
export function cashTimeline(i: CashInputs, base: CashBase = CASH_BASE): CashTimeline {
  const cc = months(i.customerCredit);
  const sc = months(i.supplierCredit);
  if (cc < 0 || sc < 0) throw new Error('Credit is a number of months, zero or more.');
  const revenue = base.units.map((u) => u * base.price);
  const materials = base.units.map((u) => u * base.materials);
  const rows: CashMonth[] = [];
  let opening = i.opening;
  let cumulativeProfit = 0;
  base.months.forEach((month, m) => {
    const receipts = m - cc >= 0 ? revenue[m - cc]! : 0;
    const materialsPaid = m - sc >= 0 ? materials[m - sc]! : 0;
    const payments = materialsPaid + base.fixed;
    const net = receipts - payments;
    const closing = opening + net;
    const profit = revenue[m]! - materials[m]! - base.fixed;
    cumulativeProfit += profit;
    const status: CashStatus = closing >= 0 ? 'in-credit' : closing >= -i.overdraft ? 'overdraft' : 'over-limit';
    rows.push({ month, revenue: revenue[m]!, receipts, materialsPaid, fixedPaid: base.fixed, payments, net, opening, closing, profit, cumulativeProfit, status });
    opening = closing;
  });
  const n = base.months.length;
  const debtors = revenue.slice(Math.max(0, n - cc)).reduce((a, b) => a + b, 0);
  const creditors = materials.slice(Math.max(0, n - sc)).reduce((a, b) => a + b, 0);
  const last = rows[rows.length - 1]!;
  const lowest = rows.reduce((lo, r) => (r.closing < lo.closing ? r : lo), rows[0]!);
  return {
    rows,
    profit: last.cumulativeProfit,
    closing: last.closing,
    debtors,
    creditors,
    lowest: { month: lowest.month, closing: lowest.closing },
    overLimit: rows.filter((r) => r.status === 'over-limit').map((r) => r.month),
  };
}

/* ------------------------------------------------------------------ */
/* Profitability and liquidity at a glance (3.5)                        */
/* ------------------------------------------------------------------ */

/** The figures the five ratios need, in $000. */
export interface RatioFigures {
  salesRevenue: number;
  costOfSales: number;
  expenses: number;
  nonCurrentLiabilities: number;
  equity: number;
  currentAssets: number;
  stock: number;
  currentLiabilities: number;
}

/** Tidewater Outdoors Ltd, the fictional retailer in the notes on 3.5, in 2025 and 2026 ($000). */
export const TIDEWATER: { business: string; years: [string, string]; a: RatioFigures; b: RatioFigures } = {
  business: 'Tidewater Outdoors Ltd',
  years: ['2025', '2026'],
  a: { salesRevenue: 840, costOfSales: 370, expenses: 330, nonCurrentLiabilities: 120, equity: 405, currentAssets: 150, stock: 70, currentLiabilities: 75 },
  b: { salesRevenue: 1050, costOfSales: 525, expenses: 420, nonCurrentLiabilities: 300, equity: 432, currentAssets: 190, stock: 125, currentLiabilities: 118 },
};

export type DashboardRatioId = 'gpm' | 'pm' | 'roce' | 'current' | 'acid';

export const DASHBOARD_RATIOS: Array<{ id: DashboardRatioId; name: string; kind: 'percent' | 'ratio'; family: 'Profitability' | 'Liquidity' }> = [
  { id: 'gpm', name: 'Gross profit margin', kind: 'percent', family: 'Profitability' },
  { id: 'pm', name: 'Profit margin', kind: 'percent', family: 'Profitability' },
  { id: 'roce', name: 'ROCE', kind: 'percent', family: 'Profitability' },
  { id: 'current', name: 'Current ratio', kind: 'ratio', family: 'Liquidity' },
  { id: 'acid', name: 'Acid test ratio', kind: 'ratio', family: 'Liquidity' },
];

export type DashboardValues = Record<DashboardRatioId, number | null>;

/** The five ratios with the guide's formulas (p. 64), from src/lib/ratios.ts. */
export function dashboardRatios(f: RatioFigures): DashboardValues {
  const grossProfit = f.salesRevenue - f.costOfSales;
  const pbit = grossProfit - f.expenses;
  return {
    gpm: grossProfitMargin(grossProfit, f.salesRevenue),
    pm: profitMargin(pbit, f.salesRevenue),
    roce: capitalEmployed(f.nonCurrentLiabilities, f.equity) > 0 ? roce(pbit, f.nonCurrentLiabilities, f.equity) : null,
    current: currentRatio(f.currentAssets, f.currentLiabilities),
    acid: acidTestRatio(f.currentAssets, f.stock, f.currentLiabilities),
  };
}

export type Movement = 'up' | 'down' | 'same' | 'unknown';

/** How each ratio moved from one year to the next, to two decimal places as the guide's answers are given. */
export function ratioMovements(a: DashboardValues, b: DashboardValues): Record<DashboardRatioId, Movement> {
  const out = {} as Record<DashboardRatioId, Movement>;
  for (const { id } of DASHBOARD_RATIOS) {
    const x = a[id];
    const y = b[id];
    if (x === null || y === null) out[id] = 'unknown';
    else {
      const d = Math.round(y * 100) - Math.round(x * 100);
      out[id] = d > 0 ? 'up' : d < 0 ? 'down' : 'same';
    }
  }
  return out;
}

/** Checks on figures typed into the dashboard: each problem names its field. */
export function ratioProblems(f: RatioFigures): Array<{ field: keyof RatioFigures; message: string }> {
  const out: Array<{ field: keyof RatioFigures; message: string }> = [];
  (Object.keys(f) as Array<keyof RatioFigures>).forEach((k) => {
    if (!Number.isFinite(f[k]) || f[k] < 0) out.push({ field: k, message: 'Enter an amount of zero or more.' });
  });
  if (out.length) return out;
  if (f.salesRevenue === 0) out.push({ field: 'salesRevenue', message: 'Sales revenue must be above zero for the margins.' });
  if (f.currentLiabilities === 0) out.push({ field: 'currentLiabilities', message: 'Current liabilities must be above zero for the liquidity ratios.' });
  if (f.stock > f.currentAssets) out.push({ field: 'stock', message: 'Stock is part of current assets, so it cannot be larger than them.' });
  if (f.nonCurrentLiabilities + f.equity === 0) out.push({ field: 'equity', message: 'Capital employed (non-current liabilities plus equity) must be above zero for ROCE.' });
  return out;
}

/* ------------------------------------------------------------------ */
/* Two projects under three methods (3.8)                               */
/* ------------------------------------------------------------------ */

/** Two fictional projects with the same cost: one pays back quickly, the other earns more later ($000). */
export const PROJECTS: [Project, Project] = [
  { id: 'a', label: 'Project A: a delivery van', capitalCost: 100, returns: [50, 40, 20, 10, 10] },
  { id: 'b', label: 'Project B: an online shop', capitalCost: 100, returns: [20, 30, 40, 50, 60] },
];

export type Preference = 'a' | 'b' | 'tie' | 'neither';

export interface ProjectComparison {
  a: Appraisal;
  b: Appraisal;
  /** The project each method prefers: the shorter payback, the higher ARR, the higher NPV. */
  prefer: { payback: Preference; arr: Preference; npv: Preference };
  /** True when the methods do not all prefer the same project. */
  conflict: boolean;
}

const pick = (a: number | null, b: number | null, higherIsBetter: boolean): Preference => {
  if (a === null && b === null) return 'neither';
  if (a === null) return 'b';
  if (b === null) return 'a';
  const x = Math.round(a * 1e6);
  const y = Math.round(b * 1e6);
  if (x === y) return 'tie';
  return (higherIsBetter ? x > y : x < y) ? 'a' : 'b';
};

export function compareProjects(a: Project, b: Project, rate: Rate): ProjectComparison {
  const A = appraise(a, rate);
  const B = appraise(b, rate);
  const prefer = {
    payback: pick(A.payback?.total ?? null, B.payback?.total ?? null, false),
    arr: pick(A.arr, B.arr, true),
    npv: pick(A.npv, B.npv, true),
  };
  const firm = [prefer.payback, prefer.arr, prefer.npv].filter((x) => x === 'a' || x === 'b');
  return { a: A, b: B, prefer, conflict: new Set(firm).size > 1 };
}

/* ------------------------------------------------------------------ */
/* A process before and after lean production (5.3)                     */
/* ------------------------------------------------------------------ */

export type StepKind = 'value' | 'waiting' | 'moving' | 'checking' | 'storing';

export interface ProcessStep {
  name: string;
  kind: StepKind;
  hours: number;
  /** What lean production changed about the step, after. */
  change?: string;
}

/** A fictional workshop, Fernvale Furniture, making one made-to-order table. */
export const LEAN_PROCESS: { business: string; before: ProcessStep[]; after: ProcessStep[] } = {
  business: 'Fernvale Furniture',
  before: [
    { name: 'Order waits to be scheduled', kind: 'waiting', hours: 16 },
    { name: 'Wait for timber from the store', kind: 'waiting', hours: 8 },
    { name: 'Cut the parts', kind: 'value', hours: 2 },
    { name: 'Carry parts to the joinery shop', kind: 'moving', hours: 3 },
    { name: 'Queue for the joiners', kind: 'waiting', hours: 12 },
    { name: 'Join and assemble', kind: 'value', hours: 4 },
    { name: 'Inspect and rework faults', kind: 'checking', hours: 5 },
    { name: 'Finish and varnish', kind: 'value', hours: 3 },
    { name: 'Store until dispatch', kind: 'storing', hours: 20 },
  ],
  after: [
    { name: 'Order waits to be scheduled', kind: 'waiting', hours: 2, change: 'Orders are scheduled the day they arrive.' },
    { name: 'Wait for timber from the store', kind: 'waiting', hours: 0, change: 'Just-in-time: cut timber arrives when the job starts.' },
    { name: 'Cut the parts', kind: 'value', hours: 2 },
    { name: 'Carry parts to the joinery shop', kind: 'moving', hours: 0.5, change: 'Kaizen: the saw was moved beside the joiners’ benches.' },
    { name: 'Queue for the joiners', kind: 'waiting', hours: 2, change: 'Work is released at the pace the joiners can take it.' },
    { name: 'Join and assemble', kind: 'value', hours: 4 },
    { name: 'Inspect and rework faults', kind: 'checking', hours: 1, change: 'Quality assurance: each person checks their own stage, so faults are not built in.' },
    { name: 'Finish and varnish', kind: 'value', hours: 3 },
    { name: 'Store until dispatch', kind: 'storing', hours: 2, change: 'Just-in-time: tables are made to a delivery date and leave when finished.' },
  ],
};

export interface FlowSummary {
  lead: number;
  valueAdded: number;
  waste: number;
  /** Value-added time as a percentage of the lead time. */
  share: number;
}

export function flowSummary(steps: ProcessStep[]): FlowSummary {
  const lead = steps.reduce((s, x) => s + x.hours, 0);
  const valueAdded = steps.filter((x) => x.kind === 'value').reduce((s, x) => s + x.hours, 0);
  return { lead, valueAdded, waste: lead - valueAdded, share: lead > 0 ? (valueAdded / lead) * 100 : 0 };
}
