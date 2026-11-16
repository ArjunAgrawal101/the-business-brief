/**
 * The advanced financial analysis mode of the Finance Desk: four tools
 * beyond the IB course, for undergraduates, MBA students, professionals and
 * teachers. Each entry says which parts of the IB course the tool uses (with
 * the subtopic, whose guide page the curriculum file records) and which parts
 * go beyond it, so that every page can say so in the same words.
 */

export type ToolId = 'integrated-forecast' | 'capital-budgeting' | 'break-even-scenarios' | 'performance-dashboard';

export interface IbUse {
  /** A subtopic code, or "toolkit" for an IB toolkit tool. */
  code: string;
  level: 'SL/HL' | 'HL';
  /** What the course covers that the tool uses, in the platform's words. */
  what: string;
  /** Where the guide says so, when it is not the subtopic's own page: the formula sheet, a layout, the toolkit. */
  where?: string;
}

export interface AdvancedTool {
  id: ToolId;
  name: string;
  /** The question the tool answers. */
  question: string;
  /** A sentence for the index and the meta description. */
  description: string;
  /** localStorage key, without the "bb:" every key carries. */
  storageKey: string;
  ibUses: IbUse[];
  beyond: string[];
  /** Financial Laboratory calculators that work the IB part with the reader's own figures. */
  lab: string[];
  /** Finance Desk workspaces on a case. */
  desk: Array<{ href: string; label: string }>;
  /** Source register ids. */
  sources: string[];
}

export const ADVANCED_HREF = '/finance-desk/advanced/';
export const STORAGE_PREFIX = 'finance:advanced:';
export const advancedHref = (id: ToolId): string => `${ADVANCED_HREF}${id}/`;

export const ADVANCED: AdvancedTool[] = [
  {
    id: 'integrated-forecast',
    name: 'Integrated forecast',
    question: 'Will the plan make a profit, and can the business pay for it, year by year?',
    description: 'A three to five year forecast built from drivers: a statement of profit or loss, a statement of cash flows and a balance sheet that balances every year, with base, upside and downside scenarios and two strategic alternatives side by side.',
    storageKey: `${STORAGE_PREFIX}forecast`,
    ibUses: [
      { code: '3.4', level: 'SL/HL', what: 'The statement of profit or loss and the statement of financial position, and their layouts.', where: 'layouts pp. 59 to 63' },
      { code: '3.4', level: 'HL', what: 'Depreciation by the straight line method, used here for every asset.' },
      { code: '3.7', level: 'SL/HL', what: 'The difference between profit and cash flow, working capital, cash flow forecasts, and the relationship between investment, profit and cash flow.' },
      { code: '3.5', level: 'SL/HL', what: 'The profit margin, ROCE and the current ratio, reported for each forecast year.' },
      { code: '3.6', level: 'HL', what: 'Debtor days, creditor days and stock turnover in days, used here to set the year-end balances; the gearing ratio.' },
    ],
    beyond: [
      'A statement of cash flows built from profit (the indirect method). The IB’s cash flow forecast lists receipts and payments instead.',
      'Linking the three statements so that the balance sheet balances in every year.',
      'Forecasting several years from drivers: volume, price, growth, costs, capital expenditure and working capital days.',
      'Base, upside and downside scenarios, and two strategic alternatives compared through every statement.',
      'Interest cover, net debt and the degree of operating leverage for each year.',
    ],
    lab: ['profit-and-loss', 'cash-flow-forecast', 'debtor-days', 'creditor-days', 'stock-turnover'],
    desk: [
      { href: '/finance-desk/cash-flow/', label: 'Cash flow lab (Atelier Barro)' },
      { href: '/finance-desk/ratios/', label: 'Ratio desk (Halden Distribution)' },
    ],
    sources: ['adv-fin-koller-goedhart-wessels-2020', 'adv-fin-brealey-myers-allen-2020', 'ib-bm-guide-2024', 'method-adv-finance'],
  },
  {
    id: 'capital-budgeting',
    name: 'Capital budgeting comparator',
    question: 'Which project adds most value, and how much do the answers depend on the estimates and the discount rate?',
    description: 'Two or three projects compared by net present value at any discount rate, internal rate of return, payback, discounted payback and the profitability index, with a tornado chart of what moves NPV and a WACC helper that sets the discount rate.',
    storageKey: `${STORAGE_PREFIX}capital`,
    ibUses: [
      { code: '3.8', level: 'SL/HL', what: 'Investment appraisal by the payback period and the average rate of return (ARR).', where: 'ARR on the formula sheet, p. 65' },
      { code: '3.8', level: 'HL', what: 'Net present value, worked with the guide’s table of discount factors at 4, 6, 8, 10 and 20%.', where: 'formula sheet p. 65; discount table p. 66' },
    ],
    beyond: [
      'Net present value at any discount rate, from the formula 1 ÷ (1 + r)^t rather than the guide’s table.',
      'The internal rate of return, found by a search that cannot fail to converge, with its limits when cash flows change sign more than once.',
      'Discounted payback and the profitability index.',
      'Sensitivity analysis shown as a tornado chart, and the change in each estimate that would bring NPV to zero.',
      'The weighted average cost of capital, with the cost of equity by the capital asset pricing model.',
    ],
    lab: ['payback-period', 'average-rate-of-return', 'net-present-value'],
    desk: [{ href: '/finance-desk/investment-appraisal/', label: 'Investment appraisal desk (Halden Distribution)' }],
    sources: ['adv-fin-brealey-myers-allen-2020', 'adv-fin-sharpe-1964', 'adv-fin-lorie-savage-1955', 'ib-bm-guide-2024', 'method-adv-finance'],
  },
  {
    id: 'break-even-scenarios',
    name: 'Break-even scenarios',
    question: 'Which cost structure earns more, at what volume does the answer change, and which carries more risk?',
    description: 'Two cost structures side by side, higher fixed and lower variable costs against the reverse: break-even, margin of safety, degree of operating leverage and the indifference volume at which one becomes better.',
    storageKey: `${STORAGE_PREFIX}break-even`,
    ibUses: [
      { code: '5.5', level: 'SL/HL', what: 'Contribution, the break-even quantity, the margin of safety, and the effects of changes in price or cost, by chart and by calculation.' },
      { code: '5.6', level: 'HL', what: 'Operating leverage, named in the guide without a formula; cost to make against cost to buy.' },
      { code: 'toolkit', level: 'HL', what: 'Contribution, a toolkit tool that includes make or buy analysis.', where: 'toolkit, p. 14' },
    ],
    beyond: [
      'Comparing two whole cost structures side by side at the same price.',
      'The indifference volume: the volume at which the two earn the same profit, and which earns more on either side of it.',
      'The degree of operating leverage as a formula (total contribution ÷ profit), and its link to the margin of safety.',
    ],
    lab: ['break-even-quantity', 'margin-of-safety', 'contribution'],
    desk: [
      { href: '/finance-desk/break-even/', label: 'Break-even workspace (Atelier Barro)' },
      { href: '/finance-desk/contribution/', label: 'Contribution decisions (HL)' },
    ],
    sources: ['adv-fin-brealey-myers-allen-2020', 'ib-bm-guide-2024', 'method-adv-finance'],
  },
  {
    id: 'performance-dashboard',
    name: 'Financial performance dashboard',
    question: 'What has driven the return to the owners over several years, and how far can each measure be trusted?',
    description: 'Several years of accounts read through the DuPont analysis of return on equity, the cash conversion cycle, interest cover and gearing, beside the IB’s own ratios, with a reading of each movement and the limits of each measure.',
    storageKey: `${STORAGE_PREFIX}performance`,
    ibUses: [
      { code: '3.5', level: 'SL/HL', what: 'The gross profit margin, the profit margin, ROCE, the current ratio and the acid test ratio.', where: 'formula sheet p. 64' },
      { code: '3.6', level: 'HL', what: 'Stock turnover, debtor days, creditor days and the gearing ratio, with the guide’s definitions of average stock and capital employed.', where: 'formula sheet p. 64' },
    ],
    beyond: [
      'Return on equity, and the DuPont split into net profit margin, asset turnover and the equity multiplier, with the extended split of the margin.',
      'How much of each change in return on equity each factor accounts for.',
      'The cash conversion cycle: stock days plus debtor days less creditor days.',
      'Interest cover, and all borrowing as a share of equity beside the guide’s gearing ratio.',
    ],
    lab: ['roce', 'profit-margin', 'gearing-ratio', 'debtor-days', 'creditor-days', 'stock-turnover'],
    desk: [{ href: '/finance-desk/ratios/', label: 'Ratio desk (Halden Distribution)' }],
    sources: ['adv-fin-richards-laughlin-1980', 'adv-fin-koller-goedhart-wessels-2020', 'ib-bm-guide-2024', 'method-adv-finance'],
  },
];

/** The subtopic codes a tool builds on, in the course's order, with the toolkit last. */
export function ibCodes(t: AdvancedTool): string[] {
  return [...new Set(t.ibUses.map((u) => u.code))].sort((a, b) => (a === 'toolkit' ? 1 : b === 'toolkit' ? -1 : a.localeCompare(b, 'en', { numeric: true })));
}

export function advancedTool(id: string): AdvancedTool {
  const t = ADVANCED.find((x) => x.id === id);
  if (!t) throw new Error(`No advanced tool "${id}"`);
  return t;
}
