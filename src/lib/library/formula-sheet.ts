/**
 * The formula sheet (/resources/formula-sheet/), in two parts that are never
 * mixed.
 *
 * 1. The IB formulae sheet: the formulae the guide lists for external
 *    assessment, a copy of which students are given in the examination
 *    (Business management guide, first assessment 2024: ratio analysis on
 *    p. 64, the other formulae on p. 65, the discount table on p. 66). Names,
 *    groups, levels and the fractions are exactly as printed there; the unit
 *    tests pin them, and check that the Financial Laboratory's own copies
 *    (src/lib/finance-lab/formulas.ts) agree.
 *
 * 2. Also used on this site: every other formula the platform's tools, notes
 *    and diagrams use, each marked as beyond the IB formulae sheet and placed
 *    precisely: in the syllabus but not on the sheet (with the subtopic, its
 *    level and the guide's page), a toolkit tool (with its page), a support for
 *    a statement that names no formula, or beyond the IB course altogether.
 *
 * Pure data and functions, no content imports: the page and the tests share it.
 */
import { linear, type Term } from '../finance-lab/formulas';

const frac = (n: Term[] | string, d: Term[] | string): Term => ({ n: typeof n === 'string' ? [n] : n, d: typeof d === 'string' ? [d] : d });

export type Level = 'SL/HL' | 'HL';

export interface SheetFormula {
  name: string;
  rhs: Term[];
  /** The definitions printed under the formula ("where capital employed = ..."). */
  where?: Array<{ name: string; rhs: Term[] }>;
  level: Level;
  /** Printed after the word "or", as an alternative to the formula above it. */
  or?: boolean;
}

export interface SheetGroup {
  title: string;
  /** The level printed with the group's heading. */
  level: Level;
  items: SheetFormula[];
}

export interface SheetPart {
  title: string;
  page: number;
  groups: SheetGroup[];
}

const CE = { name: 'capital employed', rhs: ['non-current liabilities + equity'] };

/** The IB formulae sheet, as the guide prints it (pp. 64 to 65). */
export const IB_SHEET: SheetPart[] = [
  {
    title: 'Formulae for ratio analysis (SL/HL)',
    page: 64,
    groups: [
      {
        title: 'Profitability ratios (SL/HL)',
        level: 'SL/HL',
        items: [
          { name: 'Gross profit margin', rhs: [frac('gross profit', 'sales revenue'), ' × 100'], level: 'SL/HL' },
          { name: 'Profit margin', rhs: [frac('profit before interest and tax', 'sales revenue'), ' × 100'], level: 'SL/HL' },
          { name: 'Return on capital employed (ROCE)', rhs: [frac('profit before interest and tax', 'capital employed'), ' × 100'], where: [CE], level: 'SL/HL' },
        ],
      },
      {
        title: 'Liquidity ratios (SL/HL)',
        level: 'SL/HL',
        items: [
          { name: 'Current ratio', rhs: [frac('current assets', 'current liabilities')], level: 'SL/HL' },
          { name: 'Acid test (quick) ratio', rhs: [frac('current assets − stock', 'current liabilities')], level: 'SL/HL' },
        ],
      },
      {
        title: 'Efficiency ratios (HL only)',
        level: 'HL',
        items: [
          { name: 'Stock turnover (number of times)', rhs: [frac('cost of sales', 'average stock')], level: 'HL' },
          {
            name: 'Stock turnover (number of days)',
            rhs: [frac('average stock', 'cost of sales'), ' × 365'],
            where: [{ name: 'average stock', rhs: [frac('opening stock + closing stock', '2')] }],
            level: 'HL',
            or: true,
          },
          { name: 'Debtor days ratio (number of days)', rhs: [frac('debtors', 'total sales revenue'), ' × 365'], level: 'HL' },
          { name: 'Creditor days ratio (number of days)', rhs: [frac('creditors', 'cost of sales'), ' × 365'], level: 'HL' },
          { name: 'Gearing ratio', rhs: [frac('non-current liabilities', 'capital employed'), ' × 100'], where: [CE], level: 'HL' },
        ],
      },
    ],
  },
  {
    title: 'Other formulae (SL/HL)',
    page: 65,
    groups: [
      {
        title: 'Investment appraisal',
        level: 'SL/HL',
        items: [
          { name: 'Average rate of return (ARR)', rhs: [frac('(total returns − capital cost) ÷ years of use', 'capital cost'), ' × 100'], level: 'SL/HL' },
          { name: 'Net present value (NPV)', rhs: ['∑ present values of return − original cost'], level: 'HL' },
        ],
      },
      {
        title: 'Capacity utilization and productivity (HL only)',
        level: 'HL',
        items: [
          { name: 'Capacity utilization rate', rhs: [frac('actual output', 'productive capacity'), ' × 100'], level: 'HL' },
          { name: 'Productivity rate', rhs: [frac('total output', 'total input'), ' × 100'], level: 'HL' },
        ],
      },
    ],
  },
];

/** The discount table: HL only, given in the paper when a question needs it (guide, p. 66). */
export const DISCOUNT_TABLE_PAGE = 66;

/** Every formula on the IB sheet, in the order printed. */
export const ibFormulas = (): SheetFormula[] => IB_SHEET.flatMap((p) => p.groups.flatMap((g) => g.items));

/* ------------------------------------------------------------------ */
/* Also used on this site                                              */
/* ------------------------------------------------------------------ */

/**
 * Where a formula stands, if it is not on the IB formulae sheet:
 * - `syllabus`: the guide names the idea in a subtopic's content (with AO4
 *   where it asks for calculation), but gives no formula for it;
 * - `toolkit`: part of a toolkit tool in the guide's figure 5;
 * - `supports`: the arithmetic behind a statement that names no formula;
 * - `beyond`: beyond the IB course (enrichment), used by the platform's tools.
 */
export type Placement =
  | { kind: 'syllabus'; code: string; level: Level; page: number; note?: string }
  | { kind: 'toolkit'; tool: string; level: Level; page: number; note?: string }
  | { kind: 'supports'; code: string; page: number; note: string }
  | { kind: 'beyond'; note: string };

export interface SiteFormula {
  name: string;
  rhs: Term[];
  /** Further lines of the same working, such as each subtotal of a statement. */
  lines?: Array<{ name: string; rhs: Term[] }>;
  placement: Placement;
  /** The pages on this site that use it. */
  used: Array<{ label: string; href: string }>;
}

export interface SiteGroup {
  title: string;
  items: SiteFormula[];
}

const LAB = (id: string, label: string) => ({ label: `Financial Laboratory: ${label}`, href: `/finance-desk/lab/${id}/` });
const BREAK_EVEN = { label: 'Finance Desk: break-even workspace', href: '/finance-desk/break-even/' };
const NOTES = (slug: string, label: string) => ({ label: `Notes: ${label}`, href: `/topics/${slug}/` });
const OPS = (slug: string, label: string) => ({ label: `Operations Floor: ${label}`, href: `/operations-floor/${slug}/` });
const ADV = (id: string, label: string) => ({ label: `Advanced financial analysis: ${label}`, href: `/finance-desk/advanced/${id}/` });

export const SITE_FORMULAS: SiteGroup[] = [
  {
    title: 'Costs, revenue and break-even',
    items: [
      {
        name: 'Total revenue',
        rhs: ['selling price per unit × quantity sold'],
        placement: { kind: 'syllabus', code: '3.3', level: 'SL/HL', page: 29, note: 'The guide names total revenue and revenue streams.' },
        used: [{ label: 'Finance Desk: costs and revenue', href: '/finance-desk/costs-and-revenue/' }, BREAK_EVEN],
      },
      {
        name: 'Total cost',
        rhs: ['total fixed costs + (variable cost per unit × quantity)'],
        placement: { kind: 'syllabus', code: '3.3', level: 'SL/HL', page: 28, note: 'The guide names fixed and variable costs.' },
        used: [{ label: 'Finance Desk: costs and revenue', href: '/finance-desk/costs-and-revenue/' }, BREAK_EVEN],
      },
      {
        name: 'Average (unit) cost',
        rhs: [frac('total cost', 'output')],
        placement: { kind: 'supports', code: '1.5', page: 24, note: 'Economies and diseconomies of scale are changes in average cost; the guide names no formula for it.' },
        used: [{ label: 'The growth brief’s scale explorer', href: '/topics/growth-and-evolution/' }, NOTES('operations-methods', '5.2 Operations methods')],
      },
      {
        name: 'Contribution per unit',
        rhs: ['selling price per unit − variable cost per unit'],
        lines: [{ name: 'Total contribution', rhs: ['contribution per unit × quantity sold'] }],
        placement: { kind: 'syllabus', code: '5.5', level: 'SL/HL', page: 34, note: 'The guide names total contribution and contribution per unit.' },
        used: [BREAK_EVEN, LAB('contribution', 'contribution')],
      },
      {
        name: 'Profit or loss',
        rhs: ['total contribution − total fixed costs'],
        lines: [{ name: 'or', rhs: ['total revenue − total costs'] }],
        placement: { kind: 'syllabus', code: '5.5', level: 'SL/HL', page: 34 },
        used: [BREAK_EVEN, LAB('contribution', 'contribution')],
      },
      {
        name: 'Break-even quantity',
        rhs: [frac('total fixed costs', 'contribution per unit')],
        placement: { kind: 'syllabus', code: '5.5', level: 'SL/HL', page: 34, note: 'Round up to a whole unit: one unit fewer leaves a loss.' },
        used: [BREAK_EVEN, LAB('break-even-quantity', 'break-even quantity')],
      },
      {
        name: 'Break-even revenue',
        rhs: ['break-even quantity × selling price per unit'],
        placement: { kind: 'syllabus', code: '5.5', level: 'SL/HL', page: 34, note: 'The guide names the break-even quantity or point; this is the same point measured in money.' },
        used: [BREAK_EVEN, LAB('break-even-revenue', 'break-even revenue')],
      },
      {
        name: 'Margin of safety',
        rhs: ['actual or forecast output − break-even quantity'],
        lines: [{ name: 'as a percentage', rhs: [frac('margin of safety', 'actual or forecast output'), ' × 100'] }],
        placement: { kind: 'syllabus', code: '5.5', level: 'SL/HL', page: 34, note: 'The guide names the margin of safety; the percentage is a standard way of giving it.' },
        used: [BREAK_EVEN, LAB('margin-of-safety', 'margin of safety')],
      },
      {
        name: 'Target profit output',
        rhs: [frac('total fixed costs + target profit', 'contribution per unit')],
        lines: [{ name: 'Target price', rhs: [frac('total fixed costs + target profit', 'expected sales'), ' + variable cost per unit'] }],
        placement: { kind: 'syllabus', code: '5.5', level: 'SL/HL', page: 34, note: 'The guide names target profit output, target profit and target price.' },
        used: [BREAK_EVEN, LAB('target-profit', 'output for a target profit')],
      },
      {
        name: 'Degree of operating leverage',
        rhs: [frac('total contribution', 'profit')],
        placement: { kind: 'syllabus', code: '5.6', level: 'HL', page: 35, note: 'The guide names operating leverage but gives no formula; this is the standard measure.' },
        used: [LAB('margin-of-safety', 'margin of safety'), OPS('capacity-and-productivity', 'capacity and productivity'), ADV('break-even-scenarios', 'break-even scenarios')],
      },
      {
        name: 'Special order: change in profit',
        rhs: ['(order price − variable cost per unit) × quantity − extra fixed costs of the order'],
        placement: { kind: 'toolkit', tool: 'Contribution', level: 'HL', page: 14, note: 'Contribution costing, when there is spare capacity and regular sales are unaffected.' },
        used: [{ label: 'Finance Desk: contribution decisions', href: '/finance-desk/contribution/' }],
      },
      {
        name: 'Margin of safety in value',
        rhs: ['margin of safety × selling price per unit'],
        placement: { kind: 'beyond', note: 'The syllabus names the margin of safety in units.' },
        used: [LAB('margin-of-safety', 'margin of safety')],
      },
    ],
  },
  {
    title: 'Final accounts',
    items: [
      {
        name: 'Gross profit',
        rhs: ['sales revenue − cost of sales'],
        lines: [
          { name: 'Profit before interest and tax', rhs: ['gross profit − expenses'] },
          { name: 'Profit before tax', rhs: ['profit before interest and tax − interest'] },
          { name: 'Profit for the period', rhs: ['profit before tax − tax'] },
          { name: 'Retained profit', rhs: ['profit for the period − dividends'] },
        ],
        placement: { kind: 'syllabus', code: '3.4', level: 'SL/HL', page: 29, note: 'Each subtotal follows the order of the guide’s statement of profit or loss (figure 6, p. 59).' },
        used: [LAB('profit-and-loss', 'profit and loss builder'), { label: 'Finance Desk: ratio desk', href: '/finance-desk/ratios/' }],
      },
      {
        name: 'Cost of sales',
        rhs: ['opening stock + purchases − closing stock'],
        placement: { kind: 'supports', code: '3.4', page: 29, note: 'Cost of sales is a line of the statement of profit or loss; for a business that buys goods to resell, this is how it is found.' },
        used: [LAB('profit-and-loss', 'profit and loss builder')],
      },
      {
        name: 'Straight line depreciation (a year)',
        rhs: [frac('cost − residual value', 'useful life in years')],
        placement: { kind: 'syllabus', code: '3.4', level: 'HL', page: 29 },
        used: [NOTES('final-accounts', '3.4 Final accounts'), ADV('integrated-forecast', 'integrated forecast')],
      },
      {
        name: 'Units of production depreciation (per unit)',
        rhs: [frac('cost − residual value', 'expected total units over the asset’s life')],
        lines: [{ name: 'Depreciation for the year', rhs: ['depreciation per unit × units produced in the year'] }],
        placement: { kind: 'syllabus', code: '3.4', level: 'HL', page: 29 },
        used: [NOTES('final-accounts', '3.4 Final accounts')],
      },
    ],
  },
  {
    title: 'Cash flow and budgets',
    items: [
      {
        name: 'Working capital',
        rhs: ['current assets − current liabilities'],
        placement: { kind: 'syllabus', code: '3.7', level: 'SL/HL', page: 29 },
        used: [{ label: 'Finance Desk: cash flow lab', href: '/finance-desk/cash-flow/' }, NOTES('cash-flow', '3.7 Cash flow')],
      },
      {
        name: 'Net cash flow',
        rhs: ['total cash inflows − total cash outflows'],
        lines: [{ name: 'Closing balance', rhs: ['opening balance + net cash flow'] }],
        placement: { kind: 'syllabus', code: '3.7', level: 'SL/HL', page: 29, note: 'From the layout of a cash flow forecast; the opening balance is the previous month’s closing balance.' },
        used: [{ label: 'Finance Desk: cash flow lab', href: '/finance-desk/cash-flow/' }, LAB('cash-flow-forecast', 'cash flow forecast')],
      },
      {
        name: 'Budget variance',
        rhs: ['actual figure − budgeted figure'],
        placement: { kind: 'syllabus', code: '3.9', level: 'HL', page: 30, note: 'Marked favourable [F] or adverse [A] by its effect on profit, not by its sign.' },
        used: [LAB('budget-variances', 'budget variances'), NOTES('budgets', '3.9 Budgets')],
      },
    ],
  },
  {
    title: 'Investment appraisal',
    items: [
      {
        name: 'Payback period',
        rhs: ['years before the cost is recovered + ', frac('amount still to recover', 'net cash flow in the payback year'), ' × 12 months'],
        placement: { kind: 'syllabus', code: '3.8', level: 'SL/HL', page: 30, note: 'The guide names payback but prints no formula for it.' },
        used: [{ label: 'Finance Desk: investment appraisal', href: '/finance-desk/investment-appraisal/' }, LAB('payback-period', 'payback period')],
      },
      {
        name: 'Present value',
        rhs: ['return in a year × discount factor for that year and rate'],
        placement: { kind: 'syllabus', code: '3.8', level: 'HL', page: 30, note: 'The working inside NPV; the factors come from the discount table (p. 66).' },
        used: [{ label: 'Finance Desk: investment appraisal', href: '/finance-desk/investment-appraisal/' }, LAB('net-present-value', 'net present value')],
      },
      {
        name: 'Discount factor',
        rhs: [frac('1', ['(1 + r)', { sup: 'n' }])],
        placement: { kind: 'beyond', note: 'Where the table comes from: r is the rate as a decimal and n the year. In the examination, use the table.' },
        used: [LAB('net-present-value', 'net present value'), ADV('capital-budgeting', 'capital budgeting comparator')],
      },
    ],
  },
  {
    title: 'People',
    items: [
      {
        name: 'Labour turnover',
        rhs: [frac('number of employees leaving', 'average number of employees'), ' × 100'],
        placement: { kind: 'syllabus', code: '2.4', level: 'HL', page: 26 },
        used: [{ label: 'People and Culture: workforce planning', href: '/people-and-culture/workforce-planning/' }, NOTES('motivation-and-demotivation', '2.4 Motivation and demotivation')],
      },
    ],
  },
  {
    title: 'Marketing',
    items: [
      {
        name: 'Market share',
        rhs: [frac('the business’s sales', 'total market sales'), ' × 100'],
        placement: { kind: 'syllabus', code: '4.1', level: 'SL/HL', page: 31 },
        used: [{ label: 'Market Studio: market metrics', href: '/market-studio/market-metrics/' }, NOTES('introduction-to-marketing', '4.1 Introduction to marketing')],
      },
      {
        name: 'Market growth',
        rhs: [frac('sales this period − sales last period', 'sales last period'), ' × 100'],
        placement: { kind: 'syllabus', code: '4.1', level: 'SL/HL', page: 31 },
        used: [{ label: 'Market Studio: market metrics', href: '/market-studio/market-metrics/' }, NOTES('introduction-to-marketing', '4.1 Introduction to marketing')],
      },
      {
        name: 'Relative market share',
        rhs: [frac('the business’s market share', 'the largest rival’s market share')],
        placement: { kind: 'toolkit', tool: 'Boston Consulting Group (BCG) matrix', level: 'SL/HL', page: 14, note: 'One axis of the matrix.' },
        used: [{ label: 'Market Studio: market metrics', href: '/market-studio/market-metrics/' }, { label: 'Strategy Studio: BCG matrix', href: '/strategy-studio/bcg-matrix/' }],
      },
      {
        name: 'Price elasticity of demand',
        rhs: [frac('percentage change in quantity demanded', 'percentage change in price')],
        placement: { kind: 'syllabus', code: '4.5', level: 'HL', page: 32 },
        used: [NOTES('the-seven-ps-of-the-marketing-mix', '4.5 The seven Ps of the marketing mix')],
      },
      {
        name: 'Cost-plus price',
        rhs: ['unit cost + (unit cost × mark-up % ÷ 100)'],
        placement: { kind: 'syllabus', code: '4.5', level: 'SL/HL', page: 32, note: 'The guide names cost-plus (mark-up) pricing.' },
        used: [NOTES('the-seven-ps-of-the-marketing-mix', '4.5 The seven Ps of the marketing mix')],
      },
      {
        name: 'Customer lifetime value',
        rhs: [frac('yearly margin from the customer', '1 + discount rate − retention rate')],
        placement: { kind: 'beyond', note: 'Rates as decimals, with the first year’s margin counted at the end of the year.' },
        used: [{ label: 'Market Studio: market metrics', href: '/market-studio/market-metrics/' }],
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        name: 'Labour productivity',
        rhs: [frac('total output', 'number of workers (or labour hours)')],
        lines: [{ name: 'Capital productivity', rhs: [frac('total output', 'capital input (such as machine hours)')] }],
        placement: { kind: 'syllabus', code: '5.6', level: 'HL', page: 35 },
        used: [OPS('capacity-and-productivity', 'capacity and productivity'), NOTES('production-planning', '5.6 Production planning')],
      },
      {
        name: 'Defect rate',
        rhs: [frac('units that fail the quality standard', 'units made'), ' × 100'],
        placement: { kind: 'syllabus', code: '5.6', level: 'HL', page: 35 },
        used: [OPS('capacity-and-productivity', 'capacity and productivity'), NOTES('production-planning', '5.6 Production planning')],
      },
      {
        name: 'Cost to make (CTM)',
        rhs: ['total fixed costs of making + (variable cost per unit × quantity)'],
        lines: [{ name: 'Cost to buy (CTB)', rhs: ['supplier price per unit × quantity'] }],
        placement: { kind: 'syllabus', code: '5.6', level: 'HL', page: 35 },
        used: [NOTES('production-planning', '5.6 Production planning'), ADV('break-even-scenarios', 'break-even scenarios')],
      },
      {
        name: 'Reorder level',
        rhs: ['buffer stock + (usage per period × lead time in periods)'],
        lines: [{ name: 'Maximum stock level', rhs: ['buffer stock + reorder quantity'] }],
        placement: { kind: 'syllabus', code: '5.6', level: 'HL', page: 35, note: 'The guide names lead time, buffer stock, reorder level and reorder quantity on stock control charts.' },
        used: [OPS('stock-control', 'stock control'), NOTES('production-planning', '5.6 Production planning')],
      },
      {
        name: 'Weighted score',
        rhs: ['the sum of (the weight of each factor × the option’s score on that factor)'],
        placement: { kind: 'beyond', note: 'A standard way of comparing options, such as locations (5.4); the guide names no method.' },
        used: [OPS('location-assessment', 'location assessment'), { label: 'Strategy Studio: option appraisal', href: '/strategy-studio/option-appraisal/' }],
      },
      {
        name: 'Economic order quantity',
        rhs: ['√(', frac('2 × yearly demand × cost of placing an order', 'cost of holding one unit for a year'), ')'],
        placement: { kind: 'beyond', note: 'An operations model the guide does not include.' },
        used: [OPS('economic-order-quantity', 'economic order quantity')],
      },
    ],
  },
  {
    title: 'The toolkit',
    items: [
      {
        name: 'Expected value',
        rhs: ['∑ (probability of each outcome × its payoff) − cost of the option'],
        placement: { kind: 'toolkit', tool: 'Decision trees', level: 'SL/HL', page: 14 },
        used: [{ label: 'Strategy Studio: decision tree', href: '/strategy-studio/decision-tree/' }, { label: 'Toolkit: decision trees', href: '/toolkit/decision-trees/' }],
      },
      {
        name: 'Mean',
        rhs: [frac('total of the values', 'number of values')],
        placement: { kind: 'toolkit', tool: 'Descriptive statistics', level: 'SL/HL', page: 14, note: 'The guide also names the mode, median, quartiles and standard deviation.' },
        used: [{ label: 'Diagram: descriptive statistics', href: '/diagrams/#diagram-descriptive-statistics' }, { label: 'Toolkit: descriptive statistics', href: '/toolkit/descriptive-statistics/' }],
      },
      {
        name: 'Total float',
        rhs: ['latest start − earliest start'],
        lines: [{ name: 'Free float', rhs: ['earliest start of the next activity − earliest finish of this one'] }],
        placement: { kind: 'toolkit', tool: 'Critical path analysis', level: 'HL', page: 15, note: 'The guide names the calculation of free and total float.' },
        used: [{ label: 'Toolkit: critical path analysis', href: '/toolkit/critical-path-analysis/' }, { label: 'Case Room: the Halden diagnosis', href: '/case-room/halden-diagnosis/' }],
      },
      {
        name: 'Line of best fit',
        rhs: ['y = a + bx'],
        placement: { kind: 'toolkit', tool: 'Simple linear regression', level: 'HL', page: 15, note: 'The guide names scatter diagrams, the line of best fit, correlation and extrapolation, but no equation; a is the intercept and b the gradient.' },
        used: [{ label: 'Diagram: simple linear regression', href: '/diagrams/#diagram-linear-regression' }, NOTES('sales-forecasting', '4.3 Sales forecasting')],
      },
      {
        name: 'Least-squares gradient',
        rhs: [frac('∑ (x − x̄)(y − ȳ)', '∑ (x − x̄)²')],
        lines: [
          { name: 'Intercept', rhs: ['a = ȳ − b x̄'] },
          { name: 'Correlation coefficient', rhs: [frac('∑ (x − x̄)(y − ȳ)', '√(∑ (x − x̄)² × ∑ (y − ȳ)²)')] },
        ],
        placement: { kind: 'beyond', note: 'How the platform’s regression diagram calculates its line and correlation; the guide does not ask for the calculation.' },
        used: [{ label: 'Diagram: simple linear regression', href: '/diagrams/#diagram-linear-regression' }],
      },
    ],
  },
  {
    title: 'Beyond the course: advanced financial analysis',
    items: [
      {
        name: 'Return on equity (ROE)',
        rhs: [frac('profit for the period', 'equity'), ' × 100'],
        lines: [{ name: 'The DuPont split', rhs: ['ROE = net profit margin × asset turnover × equity multiplier'] }],
        placement: { kind: 'beyond', note: 'Beside the guide’s own ratios, never in place of them.' },
        used: [ADV('performance-dashboard', 'financial performance dashboard')],
      },
      {
        name: 'Cash conversion cycle',
        rhs: ['stock days + debtor days − creditor days'],
        lines: [{ name: 'Interest cover', rhs: [frac('profit before interest and tax', 'interest')] }],
        placement: { kind: 'beyond', note: 'Built from the guide’s efficiency ratios (HL).' },
        used: [ADV('performance-dashboard', 'financial performance dashboard')],
      },
      {
        name: 'Profitability index',
        rhs: [frac('present value of the returns', 'initial outlay')],
        lines: [{ name: 'Internal rate of return', rhs: ['the discount rate at which NPV = 0, found by search'] }],
        placement: { kind: 'beyond', note: 'With NPV at any rate and discounted payback.' },
        used: [ADV('capital-budgeting', 'capital budgeting comparator')],
      },
      {
        name: 'Weighted average cost of capital',
        rhs: ['(share of equity × cost of equity) + (share of debt × cost of debt × (1 − tax rate))'],
        lines: [{ name: 'Cost of equity (CAPM)', rhs: ['risk-free rate + beta × market risk premium'] }],
        placement: { kind: 'beyond', note: 'Sets a discount rate; shares by market value.' },
        used: [ADV('capital-budgeting', 'capital budgeting comparator')],
      },
      {
        name: 'Indifference volume',
        rhs: [frac('difference in fixed costs', 'difference in contribution per unit')],
        placement: { kind: 'beyond', note: 'The volume at which two cost structures earn the same profit.' },
        used: [ADV('break-even-scenarios', 'break-even scenarios')],
      },
    ],
  },
];

/** Every formula in "Also used on this site", in order. */
export const siteFormulas = (): SiteFormula[] => SITE_FORMULAS.flatMap((g) => g.items);

/** The label for a placement, short enough for the sheet's margin. */
export function placementLabel(p: Placement): string {
  switch (p.kind) {
    case 'syllabus':
      return `In the syllabus, ${p.code}${p.level === 'HL' ? ' (HL only)' : ''}`;
    case 'toolkit':
      return `Toolkit: ${p.tool}${p.level === 'HL' ? ' (HL only)' : ''}`;
    case 'supports':
      return `Supports ${p.code}`;
    case 'beyond':
      return 'Beyond the IB course';
  }
}

/** The full placement, as a sentence, with the guide's page where the guide covers it. */
export function placementText(p: Placement, subtopicTitle: (code: string) => string): string {
  const note = 'note' in p && p.note ? ` ${p.note}` : '';
  switch (p.kind) {
    case 'syllabus':
      return `In the syllabus: ${p.code} ${subtopicTitle(p.code)}, ${p.level === 'HL' ? 'HL only' : 'SL and HL'} (guide, p. ${p.page}). Not on the formulae sheet, so learn it.${note}`;
    case 'toolkit':
      return `Part of the toolkit: ${p.tool}, ${p.level === 'HL' ? 'HL only' : 'SL and HL'} (guide, p. ${p.page}). Not on the formulae sheet.${note}`;
    case 'supports':
      return `Not a syllabus formula: it supports ${p.code} ${subtopicTitle(p.code)} (guide, p. ${p.page}).${note}`;
    case 'beyond':
      return `Beyond the IB course (enrichment): not required or assessed by the IB.${note}`;
  }
}

/* ------------------------------------------------------------------ */
/* Rendering: fractions drawn for the eye, one line for screen readers */
/* ------------------------------------------------------------------ */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function termsHtml(terms: Term[]): string {
  return terms
    .map((t) => {
      if (typeof t === 'string') return esc(t);
      if ('sup' in t) return `<sup>${esc(t.sup)}</sup>`;
      return `<span class="fs-frac"><span class="fs-frac__n">${termsHtml(t.n)}</span><span class="fs-frac__d">${termsHtml(t.d)}</span></span>`;
    })
    .join('');
}

/** A formula's right-hand side as HTML: the fractions as the guide draws them, and the same formula in one line for screen readers. */
export function formulaHtml(terms: Term[]): string {
  return `<span aria-hidden="true">${termsHtml(terms)}</span><span class="sr-only">${esc(linear(terms))}</span>`;
}

/** A formula in one line of text, as screen readers hear it and the tests compare it. */
export const formulaText = (name: string, terms: Term[]): string => `${name} = ${linear(terms)}`;
