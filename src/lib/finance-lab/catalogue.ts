/**
 * The Financial Laboratory's catalogue: every calculator, in order, with its
 * group, level, subtopic and where its formula comes from. The lab index, each
 * calculator page and the Finance Desk read it, so a calculator is named and
 * labelled the same way everywhere.
 *
 * Scope follows the IB Business management guide (first assessment 2024):
 * subtopic content statements pp. 28 to 34, the formula sheet pp. 64 to 65
 * and the discount table p. 66. Anything beyond them is labelled enrichment
 * where it appears.
 */

export type GroupId = 'costs' | 'statements' | 'ratios' | 'cash' | 'investment';
export type Family = 'breakeven' | 'statement' | 'ratios' | 'cash' | 'budget' | 'investment';

export interface LabGroup {
  id: GroupId;
  name: string;
  /** Subtopic codes the group serves. */
  subtopics: string[];
  dek: string;
}

export const GROUPS: LabGroup[] = [
  { id: 'costs', name: 'Costs and break-even', subtopics: ['5.5'], dek: 'Contribution, the break-even point, the margin of safety and the output a target profit needs.' },
  { id: 'statements', name: 'Profit and statements', subtopics: ['3.4'], dek: 'A statement of profit or loss built line by line in the layout the IB uses.' },
  { id: 'ratios', name: 'Ratios', subtopics: ['3.5', '3.6'], dek: 'The guide’s profitability and liquidity ratios, and at HL its efficiency ratios and gearing, across two years.' },
  { id: 'cash', name: 'Cash and budgets', subtopics: ['3.7', '3.9'], dek: 'A cash flow forecast with opening and closing balances, and at HL budget variances.' },
  { id: 'investment', name: 'Investment', subtopics: ['3.8'], dek: 'Payback, the average rate of return and, at HL, net present value with the guide’s discount factors.' },
];

/** Where a calculator's formula comes from. */
export type FormulaSource = 'sheet' | 'standard' | 'layout';

export interface LabEntry {
  id: string;
  name: string;
  /** The question the calculator answers. */
  question: string;
  group: GroupId;
  family: Family;
  level: 'SL/HL' | 'HL';
  subtopic: string;
  source: FormulaSource;
  /** One sentence on where the formula comes from, with the guide's page. */
  sourceNote: string;
  /** Anything a reader should know about its place in the syllabus. */
  scopeNote?: string;
  /** The Finance Desk workspace where the same idea is worked on a case. */
  desk: { href: string; label: string };
  /** The calculation register's id, where the register has one. */
  register?: string;
  description: string;
}

const STANDARD_BE = 'The guide’s formula sheet (pp. 64 to 65) has no break-even formulas, so this is the standard form used in the platform’s notes on 5.5.';
const SHEET_RATIOS = 'As printed on the guide’s formula sheet (p. 64), including its definitions.';

export const LAB: LabEntry[] = [
  {
    id: 'break-even-quantity',
    name: 'Break-even quantity',
    question: 'How many units must be sold before every cost is covered?',
    group: 'costs',
    family: 'breakeven',
    level: 'SL/HL',
    subtopic: '5.5',
    source: 'standard',
    sourceNote: STANDARD_BE,
    desk: { href: '/finance-desk/break-even/', label: 'Break-even workspace (Atelier Barro)' },
    register: 'break-even-quantity',
    description: 'Calculate the break-even quantity from your own price, variable cost and fixed costs, with the working, a break-even chart and a price and cost sensitivity table.',
  },
  {
    id: 'break-even-revenue',
    name: 'Break-even revenue',
    question: 'What value of sales covers every cost?',
    group: 'costs',
    family: 'breakeven',
    level: 'SL/HL',
    subtopic: '5.5',
    source: 'standard',
    sourceNote: STANDARD_BE,
    scopeNote: 'The guide names the break-even quantity or point. Break-even revenue is the same point measured in money, read from the chart’s vertical axis.',
    desk: { href: '/finance-desk/break-even/', label: 'Break-even workspace (Atelier Barro)' },
    register: 'break-even-revenue',
    description: 'Calculate break-even revenue from your own figures, with the working, a break-even chart and how the answer moves with price and variable cost.',
  },
  {
    id: 'margin-of-safety',
    name: 'Margin of safety',
    question: 'How far can sales fall before the business makes a loss?',
    group: 'costs',
    family: 'breakeven',
    level: 'SL/HL',
    subtopic: '5.5',
    source: 'standard',
    sourceNote: STANDARD_BE,
    scopeNote: 'The margin of safety in units is in the syllabus. In value it is enrichment. The degree of operating leverage is HL (5.6).',
    desk: { href: '/finance-desk/break-even/', label: 'Break-even workspace (Atelier Barro)' },
    register: 'margin-of-safety',
    description: 'Calculate the margin of safety in units, as a percentage and in value, and at HL the degree of operating leverage, with a table of what a fall in sales does to profit.',
  },
  {
    id: 'contribution',
    name: 'Contribution per unit and total contribution',
    question: 'What does each sale add towards fixed costs and profit?',
    group: 'costs',
    family: 'breakeven',
    level: 'SL/HL',
    subtopic: '5.5',
    source: 'standard',
    sourceNote: STANDARD_BE,
    desk: { href: '/finance-desk/break-even/', label: 'Break-even workspace (Atelier Barro)' },
    register: 'total-contribution',
    description: 'Calculate contribution per unit, total contribution and profit from your own price, costs and sales, with a chart of where each sale’s money goes.',
  },
  {
    id: 'target-profit',
    name: 'Output for a target profit',
    question: 'How many units, or what price, would earn a chosen profit?',
    group: 'costs',
    family: 'breakeven',
    level: 'SL/HL',
    subtopic: '5.5',
    source: 'standard',
    sourceNote: STANDARD_BE,
    desk: { href: '/finance-desk/break-even/', label: 'Break-even workspace (Atelier Barro)' },
    register: 'target-profit-output',
    description: 'Calculate the output needed for a target profit and the target price at expected sales, checked against capacity, with a table of targets.',
  },
  {
    id: 'profit-and-loss',
    name: 'Profit and loss builder',
    question: 'What profit is left at each stage, from sales revenue to retained profit?',
    group: 'statements',
    family: 'statement',
    level: 'SL/HL',
    subtopic: '3.4',
    source: 'layout',
    sourceNote: 'The layout and line names of the guide’s statement of profit or loss for a profit-making entity (figure 6, p. 59). The subtotals follow from its order; the formula sheet does not list them.',
    desk: { href: '/finance-desk/ratios/', label: 'Ratio desk (Halden Distribution’s accounts)' },
    description: 'Build a statement of profit or loss in the IB layout from your own figures, with every subtotal worked, the two margins, a waterfall chart and a sales sensitivity table.',
  },
  {
    id: 'gross-profit-margin',
    name: 'Gross profit margin',
    question: 'What share of each sale is left after the cost of the goods sold?',
    group: 'ratios',
    family: 'ratios',
    level: 'SL/HL',
    subtopic: '3.5',
    source: 'sheet',
    sourceNote: SHEET_RATIOS,
    desk: { href: '/finance-desk/ratios/', label: 'Ratio desk (Halden Distribution)' },
    register: 'gross-profit-margin',
    description: 'Calculate the gross profit margin for two years from your own figures, with the working, a comparison chart and what moves the ratio.',
  },
  {
    id: 'profit-margin',
    name: 'Profit margin',
    question: 'What share of each sale is left after all the costs of running the business?',
    group: 'ratios',
    family: 'ratios',
    level: 'SL/HL',
    subtopic: '3.5',
    source: 'sheet',
    sourceNote: SHEET_RATIOS,
    desk: { href: '/finance-desk/ratios/', label: 'Ratio desk (Halden Distribution)' },
    register: 'profit-margin',
    description: 'Calculate the profit margin for two years from profit before interest and tax and sales revenue, with the working and a comparison chart.',
  },
  {
    id: 'roce',
    name: 'Return on capital employed (ROCE)',
    question: 'What return does the long-term finance in the business earn?',
    group: 'ratios',
    family: 'ratios',
    level: 'SL/HL',
    subtopic: '3.5',
    source: 'sheet',
    sourceNote: SHEET_RATIOS,
    desk: { href: '/finance-desk/ratios/', label: 'Ratio desk (Halden Distribution)' },
    register: 'roce',
    description: 'Calculate ROCE for two years with the guide’s definition of capital employed, with the working and what each figure does to the ratio.',
  },
  {
    id: 'current-ratio',
    name: 'Current ratio',
    question: 'Can the assets that turn into cash within a year cover the debts due within a year?',
    group: 'ratios',
    family: 'ratios',
    level: 'SL/HL',
    subtopic: '3.5',
    source: 'sheet',
    sourceNote: SHEET_RATIOS,
    desk: { href: '/finance-desk/ratios/', label: 'Ratio desk (Halden Distribution)' },
    register: 'current-ratio',
    description: 'Calculate the current ratio for two years from your own figures, with the working, a comparison chart and what improves liquidity.',
  },
  {
    id: 'acid-test-ratio',
    name: 'Acid test (quick) ratio',
    question: 'Can short-term debts be paid without selling any stock?',
    group: 'ratios',
    family: 'ratios',
    level: 'SL/HL',
    subtopic: '3.5',
    source: 'sheet',
    sourceNote: SHEET_RATIOS,
    desk: { href: '/finance-desk/ratios/', label: 'Ratio desk (Halden Distribution)' },
    register: 'acid-test-ratio',
    description: 'Calculate the acid test ratio for two years from your own figures, with the working and how stock changes the picture.',
  },
  {
    id: 'gearing-ratio',
    name: 'Gearing ratio',
    question: 'How much of the long-term finance is borrowed?',
    group: 'ratios',
    family: 'ratios',
    level: 'HL',
    subtopic: '3.6',
    source: 'sheet',
    sourceNote: SHEET_RATIOS,
    desk: { href: '/finance-desk/ratios/', label: 'Ratio desk (Halden Distribution)' },
    register: 'gearing-ratio',
    description: 'Calculate the gearing ratio for two years with the guide’s definition of capital employed (HL), with the working and what a change in borrowing does.',
  },
  {
    id: 'stock-turnover',
    name: 'Stock turnover',
    question: 'How quickly does stock sell? (Also called inventory turnover.)',
    group: 'ratios',
    family: 'ratios',
    level: 'HL',
    subtopic: '3.6',
    source: 'sheet',
    sourceNote: 'As printed on the guide’s formula sheet (p. 64), in both its forms, number of times and number of days, with average stock = (opening stock + closing stock) ÷ 2. The guide calls it stock turnover; inventory turnover is the same ratio.',
    desk: { href: '/finance-desk/ratios/', label: 'Ratio desk (Halden Distribution)' },
    scopeNote: 'The 365 in the formula assumes a full year’s figures.',
    register: 'stock-turnover-times',
    description: 'Calculate stock (inventory) turnover in times and in days for two years with the guide’s average stock (HL), with the working and a comparison chart.',
  },
  {
    id: 'debtor-days',
    name: 'Debtor days',
    question: 'How long do customers take to pay?',
    group: 'ratios',
    family: 'ratios',
    level: 'HL',
    subtopic: '3.6',
    source: 'sheet',
    sourceNote: SHEET_RATIOS,
    desk: { href: '/finance-desk/ratios/', label: 'Ratio desk (Halden Distribution)' },
    scopeNote: 'The 365 in the formula assumes a full year’s figures.',
    register: 'debtor-days',
    description: 'Calculate debtor days for two years from your own figures (HL), with the working and what a change in credit control does to cash.',
  },
  {
    id: 'creditor-days',
    name: 'Creditor days',
    question: 'How long does the business take to pay its suppliers?',
    group: 'ratios',
    family: 'ratios',
    level: 'HL',
    subtopic: '3.6',
    source: 'sheet',
    sourceNote: SHEET_RATIOS,
    desk: { href: '/finance-desk/ratios/', label: 'Ratio desk (Halden Distribution)' },
    scopeNote: 'The 365 in the formula assumes a full year’s figures.',
    register: 'creditor-days',
    description: 'Calculate creditor days for two years from your own figures (HL), with the working and the trade-off between cash and supplier goodwill.',
  },
  {
    id: 'cash-flow-forecast',
    name: 'Cash flow forecast',
    question: 'Will the business have enough cash at the end of each month?',
    group: 'cash',
    family: 'cash',
    level: 'SL/HL',
    subtopic: '3.7',
    source: 'layout',
    sourceNote: 'The layout of the guide’s cash flow forecast (figure 10, p. 63), with negative figures in brackets. The formula sheet gives no cash flow formulas; these follow from the layout.',
    desk: { href: '/finance-desk/cash-flow/', label: 'Cash flow lab (Atelier Barro)' },
    register: 'closing-balance',
    description: 'Build a cash flow forecast of up to twelve months with your own inflows and outflows, opening and closing balances, an overdraft limit, a balance chart and a stress test.',
  },
  {
    id: 'budget-variances',
    name: 'Budget variances',
    question: 'Where did the results differ from the budget, and was each difference good or bad for profit?',
    group: 'cash',
    family: 'budget',
    level: 'HL',
    subtopic: '3.9',
    source: 'layout',
    sourceNote: 'The layout of the guide’s budget (figure 11, p. 63), with each variance marked [F] favourable or [A] adverse. The guide gives no variance formula; the standard one is used.',
    desk: { href: '/finance-desk/', label: 'Finance Desk' },
    description: 'Calculate budget variances from your own budgeted and actual figures (HL), each marked favourable or adverse, with totals, a variance chart and what to investigate first.',
  },
  {
    id: 'payback-period',
    name: 'Payback period',
    question: 'How long does a project take to repay its cost?',
    group: 'investment',
    family: 'investment',
    level: 'SL/HL',
    subtopic: '3.8',
    source: 'standard',
    sourceNote: 'The guide’s formula sheet gives no formula for payback, so the standard method is used, assuming each year’s cash arrives evenly through the year.',
    desk: { href: '/finance-desk/investment-appraisal/', label: 'Investment appraisal desk (Halden Distribution)' },
    register: 'payback-period',
    description: 'Calculate the payback period of a project with equal or unequal cash flows, with the cumulative cash flow worked year by year and charted.',
  },
  {
    id: 'average-rate-of-return',
    name: 'Average rate of return (ARR)',
    question: 'What average yearly profit does a project earn on its cost?',
    group: 'investment',
    family: 'investment',
    level: 'SL/HL',
    subtopic: '3.8',
    source: 'sheet',
    sourceNote: 'As printed on the guide’s formula sheet (p. 65).',
    desk: { href: '/finance-desk/investment-appraisal/', label: 'Investment appraisal desk (Halden Distribution)' },
    register: 'average-rate-of-return',
    description: 'Calculate the average rate of return of a project from its cost and yearly returns, with the working, a chart of the returns and how the answer moves with the estimates.',
  },
  {
    id: 'net-present-value',
    name: 'Net present value (NPV)',
    question: 'Are a project’s future returns worth more today than its cost?',
    group: 'investment',
    family: 'investment',
    level: 'HL',
    subtopic: '3.8',
    source: 'sheet',
    sourceNote: 'As printed on the guide’s formula sheet (p. 65), with the discount factors of the guide’s table (p. 66).',
    scopeNote: 'NPV is HL only. The internal rate of return shown with it is enrichment, beyond the syllabus.',
    desk: { href: '/finance-desk/investment-appraisal/', label: 'Investment appraisal desk (Halden Distribution)' },
    register: 'net-present-value',
    description: 'Calculate the net present value of a project with the guide’s discount factors (HL), with the present values charted and NPV at every rate in the guide’s table.',
  },
];

export const LAB_IDS = LAB.map((e) => e.id);

export function labEntry(id: string): LabEntry {
  const e = LAB.find((x) => x.id === id);
  if (!e) throw new Error(`No calculator "${id}" in the Financial Laboratory`);
  return e;
}

export const labHref = (id: string): string => `/finance-desk/lab/${id}/`;

/** The calculators of a group, in order. */
export const inGroup = (g: GroupId): LabEntry[] => LAB.filter((e) => e.group === g);

/** The calculator worked with the same idea as a register calculation, if any. */
export function labForRegister(registerId: string): LabEntry | undefined {
  const direct = LAB.find((e) => e.register === registerId);
  if (direct) return direct;
  const map: Record<string, string> = {
    'contribution-per-unit': 'contribution',
    'target-price': 'target-profit',
    'stock-turnover-days': 'stock-turnover',
    'net-cash-flow': 'cash-flow-forecast',
    profit: 'contribution',
  };
  return map[registerId] ? LAB.find((e) => e.id === map[registerId]) : undefined;
}
