/**
 * The shared base of Paper 2 practice: the topics, the shape of a question,
 * the invented businesses, money and number formatting, the typical wrong
 * answers, and the drawing of figures that make sense together (a price above
 * its variable cost, statements that balance, a project that pays back within
 * its life). Every generator, in src/lib/p2-practice.ts, src/lib/p2-calcs.ts
 * and src/lib/p2-tasks.ts, draws on it, so that the same seed always gives the
 * same figures. The businesses are fictional and every figure is simulated.
 */
import type { Labels, Working } from './finance';
import { derive, type Statement } from './ratios';
import { RATES, discountFactor, payback, totalReturns, type Project, type Rate } from './investment';
import { bracket } from './cashflow';
import { fmtMoney, fmtNumber, round } from './format';
import type { Rng } from './random';

/* ------------------------------------------------------------------ */
/* Kinds and groups                                                    */
/* ------------------------------------------------------------------ */

export const GROUPS = {
  'break-even': { label: 'Break-even and contribution', syllabus: '5.5', level: 'SL/HL' },
  profitability: { label: 'Profitability ratios', syllabus: '3.5', level: 'SL/HL' },
  liquidity: { label: 'Liquidity ratios', syllabus: '3.5', level: 'SL/HL' },
  efficiency: { label: 'Efficiency ratios and gearing', syllabus: '3.6', level: 'HL' },
  investment: { label: 'Investment appraisal', syllabus: '3.8', level: 'SL/HL' },
  'cash-flow': { label: 'Cash flow and working capital', syllabus: '3.7', level: 'SL/HL' },
  accounts: { label: 'Final accounts and depreciation', syllabus: '3.4', level: 'SL/HL' },
  budgets: { label: 'Budgets and variances', syllabus: '3.9', level: 'HL' },
  marketing: { label: 'Market share, growth and elasticity', syllabus: '4.1 and 4.5', level: 'SL/HL' },
  people: { label: 'Labour turnover', syllabus: '2.4', level: 'HL' },
  operations: { label: 'Production planning', syllabus: '5.6', level: 'HL' },
  toolkit: { label: 'Toolkit: decision trees and statistics', syllabus: 'toolkit', level: 'SL/HL' },
  'toolkit-hl': { label: 'Toolkit: contribution, critical path and regression', syllabus: 'toolkit', level: 'HL' },
} as const;
export type GroupId = keyof typeof GROUPS;
export const GROUP_IDS = Object.keys(GROUPS) as GroupId[];

export type Level = 'SL/HL' | 'HL';
export type AnswerUnit = 'money' | 'money000' | 'units' | 'percent' | 'ratio' | 'times' | 'days' | 'years';

export interface Table {
  caption: string;
  /** Column headings after the row labels; empty for a two-column list of figures. */
  columns: string[];
  rows: Array<{ label: string; cells: string[]; total?: boolean; heading?: boolean }>;
}

export interface Slip {
  value: number;
  message: string;
  /** A near miss, such as the unrounded figure, rather than an error of method. */
  close?: boolean;
}

export interface PracticeQuestion {
  code: string;
  kind: KindId;
  seed: number;
  group: GroupId;
  level: Level;
  name: string;
  marks: number;
  business: string;
  intro: string;
  tables: Table[];
  prompt: string;
  unit: AnswerUnit;
  /** Shown beside the answer box: "$", "units", "%", "days". */
  suffix: string;
  prefix: string;
  /** An example of the form the answer can take, for the hint. */
  example: string;
  exact: number;
  answer: string;
  tolerance: number;
  toleranceText: string;
  working: Working;
  meaning: string;
  slips: Slip[];
  /** A calculation (the default) or a reading of data from a table or chart. */
  task?: 'calc' | 'read';
  /** A chart the question is read from, drawn in SVG; its figures are in a table as well. */
  figure?: Figure;
  /** Other values marked right, such as an elasticity quoted without its minus sign. */
  alsoRight?: number[];
}

/** A chart for a question, as SVG markup with its own title and description, and a caption. */
export interface Figure {
  svg: string;
  caption: string;
}

export type KindId = string;

export type Made = Omit<PracticeQuestion, 'code' | 'kind' | 'seed' | 'group' | 'level' | 'name' | 'marks'>;

export interface KindDef {
  code: string;
  name: string;
  group: GroupId;
  level: Level;
  marks: number;
  make: (r: Rng) => Made;
  /** A calculation (the default) or a reading of data from a table or chart. */
  task?: 'calc' | 'read';
}


/* ------------------------------------------------------------------ */
/* Fictional businesses                                                */
/* ------------------------------------------------------------------ */

export interface Maker {
  name: string;
  unit: string;
  units: string;
  /** Price band: lowest, highest and the step prices move in. */
  price: [number, number, number];
  /** Typical break-even output a year. */
  beq: [number, number];
}

/** Invented businesses: none is a real organization, and every figure is simulated. */
export const MAKERS: Maker[] = [
  { name: 'Tarnside Bicycles', unit: 'bicycle', units: 'bicycles', price: [280, 620, 10], beq: [300, 1500] },
  { name: 'Wrenfield Candles', unit: 'candle', units: 'candles', price: [14, 36, 1], beq: [2000, 12000] },
  { name: 'Mossgate Ceramics', unit: 'bowl', units: 'bowls', price: [18, 60, 2], beq: [1500, 9000] },
  { name: 'Hollin and Reed', unit: 'chair', units: 'chairs', price: [120, 340, 10], beq: [400, 2400] },
  { name: 'Saltreach Kayaks', unit: 'kayak', units: 'kayaks', price: [380, 900, 20], beq: [200, 1200] },
  { name: 'Copperbeck Coffee', unit: 'bag of coffee', units: 'bags of coffee', price: [8, 18, 0.5], beq: [6000, 30000] },
  { name: 'Larchwood Prints', unit: 'print', units: 'prints', price: [25, 90, 5], beq: [800, 5000] },
  { name: 'Fernhollow Soap', unit: 'bar of soap', units: 'bars of soap', price: [4, 9, 0.25], beq: [10000, 60000] },
  { name: 'Northgill Tents', unit: 'tent', units: 'tents', price: [90, 260, 10], beq: [600, 3000] },
  { name: 'Ashcombe Bakehouse', unit: 'celebration cake', units: 'celebration cakes', price: [16, 40, 1], beq: [1500, 8000] },
  { name: 'Tidemark Surfboards', unit: 'surfboard', units: 'surfboards', price: [300, 700, 20], beq: [200, 1100] },
  { name: 'Kittiwake Knitwear', unit: 'jumper', units: 'jumpers', price: [45, 120, 5], beq: [900, 5000] },
];

export const COMPANIES = [
  'Brackwater Foods',
  'Elmstead Logistics',
  'Pellow Engineering',
  'Quillon Hotels',
  'Rookhaven Retail',
  'Stourmere Pharmacy',
  'Thornby Motors',
  'Vellacott Textiles',
  'Wexcombe Printing',
  'Yarrow Health Foods',
];

export const PROJECTS: Array<{ a: string; the: string }> = [
  { a: 'a new delivery van', the: 'the new delivery van' },
  { a: 'a second production line', the: 'the second production line' },
  { a: 'solar panels for its workshop', the: 'the solar panels' },
  { a: 'an online shop', the: 'the online shop' },
  { a: 'a new packing machine', the: 'the packing machine' },
  { a: 'a showroom extension', the: 'the showroom extension' },
  { a: 'an automated stock system', the: 'the automated stock system' },
  { a: 'a second workshop', the: 'the second workshop' },
];

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export const LABELS = (m: Maker): Labels => ({ unit: m.unit, units: m.units, period: 'year' });
/** Money in dollars: whole dollars when exact, otherwise cents. */
export const usd = (v: number) => fmtMoney(v, '$', Number.isInteger(round(v, 2)) ? 0 : 2);
export const usd2 = (v: number) => fmtMoney(v, '$', 2);
export const n0 = (v: number) => fmtNumber(v, 0);
export const n2 = (v: number) => fmtNumber(v, 2);
export const plural = (n: number, one: string, many: string) => (Math.abs(n) === 1 ? one : many);
/** A figure in a statement, in $000, with brackets for a negative as the guide prints them. */
export const k = (v: number) => bracket(v, 0);
export const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol + 1e-9;

/** Keeps only slips that are finite and distinct from the right answer and from each other. */
export function tidySlips(list: Slip[], exact: number, tolerance: number): Slip[] {
  const out: Slip[] = [];
  for (const s of list) {
    if (!Number.isFinite(s.value)) continue;
    if (near(s.value, exact, Math.max(tolerance, 1e-6))) continue;
    if (out.some((o) => near(o.value, s.value, 1e-6))) continue;
    out.push(s);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Break-even and contribution (5.5)                                   */
/* ------------------------------------------------------------------ */

export interface CostScenario {
  m: Maker;
  P: number;
  V: number;
  c: number;
  F: number;
  Q: number;
}

/** A price, a variable cost, fixed costs and a forecast that make sense together. */
export function costScenario(r: Rng, opts: { wholeBreakEven?: boolean; fractional?: boolean } = {}): CostScenario {
  for (let tries = 0; tries < 200; tries++) {
    const m = r.pick(MAKERS);
    const [lo, hi, st] = m.price;
    const P = r.step(lo, hi, st);
    const share = r.step(0.35, 0.7, 0.05);
    const vStep = P < 20 ? 0.05 : 1;
    const V = round(Math.round((P * share) / vStep) * vStep, 2);
    const c = round(P - V, 2);
    if (!(c > 0) || V <= 0) continue;
    const target = r.int(m.beq[0], m.beq[1]);
    let F: number;
    if (opts.wholeBreakEven) {
      const beq = Math.round(target / 10) * 10;
      F = round(beq * c, 2);
      if (!Number.isInteger(F)) continue;
    } else {
      const unit = target * c > 200000 ? 1000 : 100;
      F = Math.max(unit, Math.round((target * c) / unit) * unit);
    }
    const exact = F / c;
    if (opts.fractional && Math.abs(exact - Math.round(exact)) < 0.01) continue;
    const beq = Math.ceil(round(exact, 9));
    const Q = Math.round((beq * r.step(1.12, 1.6, 0.02)) / 10) * 10;
    if (Q <= beq) continue;
    return { m, P, V, c, F, Q };
  }
  throw new Error('Could not draw a cost scenario');
}

export const costIntro = (s: CostScenario, withForecast = true) =>
  `${s.m.name} makes and sells ${s.m.units}. Each ${s.m.unit} sells for ${usd(s.P)} and costs ${usd(s.V)} in variable costs to make. Fixed costs are ${usd(s.F)} a year.${withForecast ? ` The business forecasts sales of ${n0(s.Q)} ${s.m.units} next year.` : ''}`;

export function costTable(s: CostScenario, rows: Array<'P' | 'V' | 'F' | 'Q'>): Table {
  const all = {
    P: { label: `Selling price per ${s.m.unit}`, cells: [usd(s.P)] },
    V: { label: `Variable cost per ${s.m.unit}`, cells: [usd(s.V)] },
    F: { label: 'Fixed costs per year', cells: [usd(s.F)] },
    Q: { label: 'Forecast sales next year', cells: [`${n0(s.Q)} ${s.m.units}`] },
  };
  return { caption: `${s.m.name}: costs and price (fictional, simulated figures)`, columns: [], rows: rows.map((x) => all[x]) };
}

/** A wrong answer in its exact form and rounded up, both pointing to the same error. */
export const both = (value: number, message: string): Slip[] => [
  { value, message },
  { value: Math.ceil(round(value, 9)), message },
];


/* ------------------------------------------------------------------ */
/* Ratios (3.5, 3.6): a statement that balances                        */
/* ------------------------------------------------------------------ */

export interface Accounts {
  name: string;
  s: Statement;
  opening: number;
}

/** A year's statements in $000 that balance, with ratios in a believable range. */
export function drawAccounts(r: Rng): Accounts {
  for (let tries = 0; tries < 400; tries++) {
    const name = r.pick(COMPANIES);
    const salesRevenue = r.step(400, 9000, 10);
    const costOfSales = Math.round(salesRevenue * r.step(0.38, 0.7, 0.01));
    const gross = salesRevenue - costOfSales;
    const expenses = Math.round(gross * r.step(0.45, 0.85, 0.01));
    const pbit = gross - expenses;
    if (pbit < salesRevenue * 0.03) continue;
    const interest = Math.max(1, Math.round(pbit * r.step(0.04, 0.18, 0.01)));
    const pbt = pbit - interest;
    const tax = Math.round(pbt * r.step(0.18, 0.26, 0.01));
    const pfp = pbt - tax;
    const dividends = Math.round(pfp * r.step(0.2, 0.6, 0.05));
    const propertyPlantEquipment = Math.round(salesRevenue * r.step(0.45, 1.2, 0.05));
    const accumulatedDepreciation = Math.round(propertyPlantEquipment * r.step(0.15, 0.4, 0.05));
    const cash = Math.round(salesRevenue * r.step(0.01, 0.08, 0.005));
    const debtors = Math.round(salesRevenue * r.step(0.04, 0.16, 0.005));
    const stock = Math.round(costOfSales * r.step(0.06, 0.22, 0.005));
    const bankOverdraft = r.chance(0.4) ? Math.round(salesRevenue * r.step(0.005, 0.04, 0.005)) : 0;
    const tradeCreditors = Math.round(costOfSales * r.step(0.05, 0.16, 0.005));
    const otherShortTermLoans = r.chance(0.35) ? Math.round(salesRevenue * r.step(0.005, 0.03, 0.005)) : 0;
    const longTermBorrowings = Math.round(salesRevenue * r.step(0.08, 0.55, 0.01));
    const shareCapital = Math.round(salesRevenue * r.step(0.08, 0.35, 0.01));
    const nonCurrentAssets = propertyPlantEquipment - accumulatedDepreciation;
    const netAssets = nonCurrentAssets + cash + debtors + stock - bankOverdraft - tradeCreditors - otherShortTermLoans - longTermBorrowings;
    const retainedEarnings = netAssets - shareCapital;
    if (retainedEarnings < salesRevenue * 0.03) continue;
    const s: Statement = {
      salesRevenue,
      costOfSales,
      expenses,
      interest,
      tax,
      dividends,
      propertyPlantEquipment,
      accumulatedDepreciation,
      cash,
      debtors,
      stock,
      bankOverdraft,
      tradeCreditors,
      otherShortTermLoans,
      longTermBorrowings,
      shareCapital,
      retainedEarnings,
    };
    const d = derive(s);
    const cr = d.currentAssets / d.currentLiabilities;
    if (cr < 0.55 || cr > 3.2) continue;
    if (d.capitalEmployed <= 0) continue;
    const opening = Math.round(stock * r.step(0.75, 1.3, 0.01));
    if (opening <= 0 || stock <= 0) continue;
    return { name, s, opening };
  }
  throw new Error('Could not draw a set of accounts');
}

export function plTable(a: Accounts): Table {
  const d = derive(a.s);
  return {
    caption: `${a.name}: statement of profit or loss for the year ended 31 December 2026 ($000)`,
    columns: [],
    rows: [
      { label: 'Sales revenue', cells: [k(a.s.salesRevenue)] },
      { label: 'Cost of sales', cells: [k(-a.s.costOfSales)] },
      { label: 'Gross profit', cells: [k(d.grossProfit)], total: true },
      { label: 'Expenses', cells: [k(-a.s.expenses)] },
      { label: 'Profit before interest and tax', cells: [k(d.pbit)], total: true },
      { label: 'Interest', cells: [k(-a.s.interest)] },
      { label: 'Profit before tax', cells: [k(d.profitBeforeTax)], total: true },
      { label: 'Tax', cells: [k(-a.s.tax)] },
      { label: 'Profit for the period', cells: [k(d.profitForPeriod)], total: true },
    ],
  };
}

export function currentTable(a: Accounts): Table {
  const d = derive(a.s);
  const rows: Table['rows'] = [
    { label: 'Cash', cells: [k(a.s.cash)] },
    { label: 'Debtors', cells: [k(a.s.debtors)] },
    { label: 'Stock', cells: [k(a.s.stock)] },
    { label: 'Current assets', cells: [k(d.currentAssets)], total: true },
    ...(a.s.bankOverdraft ? [{ label: 'Bank overdraft', cells: [k(a.s.bankOverdraft)] }] : []),
    { label: 'Trade creditors', cells: [k(a.s.tradeCreditors)] },
    ...(a.s.otherShortTermLoans ? [{ label: 'Other short-term loans', cells: [k(a.s.otherShortTermLoans)] }] : []),
    { label: 'Current liabilities', cells: [k(d.currentLiabilities)], total: true },
  ];
  return { caption: `${a.name}: extract from the statement of financial position at 31 December 2026 ($000)`, columns: [], rows };
}

export function positionTable(a: Accounts): Table {
  const d = derive(a.s);
  return {
    caption: `${a.name}: statement of financial position at 31 December 2026, summarized ($000)`,
    columns: [],
    rows: [
      { label: 'Non-current assets', cells: [k(d.nonCurrentAssets)] },
      { label: 'Current assets', cells: [k(d.currentAssets)] },
      { label: 'Total assets', cells: [k(d.totalAssets)], total: true },
      { label: 'Current liabilities', cells: [k(d.currentLiabilities)] },
      { label: 'Non-current liabilities: long-term borrowings', cells: [k(d.nonCurrentLiabilities)] },
      { label: 'Net assets', cells: [k(d.netAssets)], total: true },
      { label: 'Share capital', cells: [k(a.s.shareCapital)] },
      { label: 'Retained earnings', cells: [k(a.s.retainedEarnings)] },
      { label: 'Total equity', cells: [k(d.totalEquity)], total: true },
    ],
  };
}


export const accountsIntro = (a: Accounts) => `${a.name} is a private limited company. The figures below are from its accounts for 2026, in thousands of dollars.`;

/* ------------------------------------------------------------------ */
/* Investment appraisal (3.8)                                          */
/* ------------------------------------------------------------------ */

export interface Proposal {
  m: Maker;
  /** The project with "a" and with "the". */
  what: { a: string; the: string };
  p: Project;
  rate: Rate;
}

/** A project whose cost is recovered within its life and whose returns vary from year to year. */
export function drawProject(r: Rng): Proposal {
  for (let tries = 0; tries < 300; tries++) {
    const m = r.pick(MAKERS);
    const what = r.pick(PROJECTS);
    const cost = r.step(40000, 600000, 5000);
    const years = r.int(3, 6);
    const base = (cost * r.step(1.15, 1.7, 0.05)) / years;
    const unit = cost >= 200000 ? 1000 : 500;
    const returns = Array.from({ length: years }, () => Math.round((base * r.step(0.7, 1.35, 0.05)) / unit) * unit);
    if (returns.some((x) => x <= 0)) continue;
    const p: Project = { id: 'project', label: what.the, capitalCost: cost, returns };
    const pb = payback(p);
    if (!pb || pb.inYear >= years || pb.total < 1) continue;
    if (totalReturns(p) < cost * 1.12) continue;
    const rate = r.pick([6, 8, 8, 10, 10, 4, 20].filter((x): x is Rate => (RATES as readonly number[]).includes(x)));
    return { m, what, p, rate };
  }
  throw new Error('Could not draw a project');
}

export function projectTable(pr: Proposal, withFactors: boolean): Table {
  const years = pr.p.returns.map((_, i) => `Year ${i + 1}`);
  const rows: Table['rows'] = [{ label: 'Net cash flow ($)', cells: pr.p.returns.map((x) => n0(x)) }];
  if (withFactors) rows.push({ label: `Discount factor at ${pr.rate}%`, cells: pr.p.returns.map((_, i) => discountFactor(pr.rate, i + 1).toFixed(4)) });
  return { caption: `${pr.m.name}: forecast net cash flows from ${pr.what.the} (fictional, simulated figures)`, columns: ['', ...years], rows };
}

export const projectIntro = (pr: Proposal) =>
  `${pr.m.name} is considering ${pr.what.a}, at a capital cost of ${usd(pr.p.capitalCost)} paid now. It expects these net cash flows over the ${pr.p.returns.length} years of its life.`;

/* ------------------------------------------------------------------ */
/* Reading an answer                                                   */
/* ------------------------------------------------------------------ */

/**
 * Reads an answer typed by a person: "1,250", "$1,250.50", "(2,400)" or
 * "−2,400" for a negative, "18.5%", "1.6 : 1", "42 days", and for payback
 * "2.5", "2 years 6 months" or "2 years and 6.5 months". Returns null when
 * it is not a number.
 */
export function parseAnswer(raw: string, unit: AnswerUnit): number | null {
  let s = raw.trim().toLowerCase().replace(/[\u2212\u2013]/g, '-').replace(/\u00a0/g, ' ');
  if (!s) return null;
  if (unit === 'years') {
    const ym = /^(\d+(?:\.\d+)?)\s*(?:years?|yrs?|y)\b\s*(?:and\s*|,\s*)?(?:(\d+(?:\.\d+)?)\s*(?:months?|mths?|m)\b)?\.?$/.exec(s);
    if (ym) return Number(ym[1]) + (ym[2] ? Number(ym[2]) / 12 : 0);
    const mo = /^(\d+(?:\.\d+)?)\s*(?:months?|mths?|m)\.?$/.exec(s);
    if (mo) return Number(mo[1]) / 12;
  }
  let negative = false;
  const br = /^\((.*)\)$/.exec(s);
  if (br) {
    negative = true;
    s = br[1] as string;
  }
  s = s
    .replace(/\s*:\s*1$/, '')
    .replace(/us\$|\$|£|€/g, '')
    .replace(/[%a-z\s.]*$/, '')
    .replace(/[,\s]/g, '');
  if (s.startsWith('-')) {
    negative = !negative;
    s = s.slice(1);
  }
  if (s.startsWith('$')) s = s.slice(1);
  if (!/^\d*\.?\d+$/.test(s)) return null;
  const v = Number(s);
  return Number.isFinite(v) ? (negative ? -v : v) : null;
}

export type Verdict = 'right' | 'close' | 'wrong' | 'invalid';
