/**
 * What Paper 2 practice covers, checked against the guide. Two lists:
 *
 * - SHEET: every formula on the formulae sheet given in the examination
 *   (guide, pp. 64 to 66), with its level and page, and the kinds that
 *   practise it.
 * - STATEMENTS: every syllabus statement whose depth of teaching includes a
 *   calculation or a construction from figures (AO4, pp. 25 to 35), the
 *   price elasticity of demand (4.5, HL), and the toolkit's tools with a
 *   calculation (p. 14), each with the kinds that practise it.
 *
 * The statements are paraphrased, not quoted. tests/unit/p2-more.test.ts holds
 * the lists to the registry: every kind named exists, every kind is listed
 * somewhere, every formula and statement has practice, and an HL-only
 * statement is practised only by HL kinds.
 */
import type { KindId } from './p2-base';

export interface SheetFormula {
  name: string;
  level: 'SL/HL' | 'HL';
  page: string;
  kinds: KindId[];
}

export const SHEET: SheetFormula[] = [
  { name: 'Gross profit margin', level: 'SL/HL', page: '64', kinds: ['gross-profit-margin', 'slip-ratio', 'read-ratio-table'] },
  { name: 'Profit margin', level: 'SL/HL', page: '64', kinds: ['profit-margin', 'slip-ratio', 'read-ratio-table'] },
  { name: 'Return on capital employed (ROCE)', level: 'SL/HL', page: '64', kinds: ['roce', 'slip-ratio'] },
  { name: 'Current ratio', level: 'SL/HL', page: '64', kinds: ['current-ratio', 'slip-ratio', 'read-ratio-table'] },
  { name: 'Acid test (quick) ratio', level: 'SL/HL', page: '64', kinds: ['acid-test-ratio', 'slip-ratio', 'read-ratio-table'] },
  { name: 'Stock turnover (number of times)', level: 'HL', page: '64', kinds: ['stock-turnover-times'] },
  { name: 'Stock turnover (number of days)', level: 'HL', page: '64', kinds: ['stock-turnover-days', 'slip-hl'] },
  { name: 'Debtor days ratio', level: 'HL', page: '64', kinds: ['debtor-days'] },
  { name: 'Creditor days ratio', level: 'HL', page: '64', kinds: ['creditor-days'] },
  { name: 'Gearing ratio', level: 'HL', page: '64', kinds: ['gearing-ratio'] },
  { name: 'Average rate of return (ARR)', level: 'SL/HL', page: '65', kinds: ['average-rate-of-return', 'slip-investment'] },
  { name: 'Net present value (NPV), with the discount table', level: 'HL', page: '65 to 66', kinds: ['net-present-value', 'slip-hl'] },
  { name: 'Capacity utilization rate', level: 'HL', page: '65', kinds: ['capacity-utilization'] },
  { name: 'Productivity rate', level: 'HL', page: '65', kinds: ['productivity-rate'] },
];

export interface QuantStatement {
  /** The subtopic code, or "Toolkit". */
  code: string;
  /** The statement, paraphrased. */
  text: string;
  level: 'SL/HL' | 'HL';
  /** Where an SL/HL statement has an HL-only part. */
  note?: string;
  kinds: KindId[];
}

export const STATEMENTS: QuantStatement[] = [
  { code: '2.4', text: 'Labour turnover', level: 'HL', kinds: ['labour-turnover'] },
  { code: '3.3', text: 'Fixed and variable costs, and total revenue', level: 'SL/HL', kinds: ['total-contribution', 'profit', 'build-break-even'] },
  { code: '3.4', text: 'Final accounts: the statement of profit or loss and the statement of financial position', level: 'SL/HL', kinds: ['retained-profit', 'net-assets', 'build-profit-loss'] },
  { code: '3.4', text: 'Depreciation by the straight line and units of production methods', level: 'HL', kinds: ['straight-line-depreciation', 'net-book-value', 'units-of-production-depreciation', 'build-depreciation', 'slip-hl'] },
  { code: '3.5', text: 'Profitability ratios: gross profit margin, profit margin and ROCE', level: 'SL/HL', kinds: ['gross-profit-margin', 'profit-margin', 'roce', 'slip-ratio', 'read-ratio-table'] },
  { code: '3.5', text: 'Liquidity ratios: current ratio and acid test ratio', level: 'SL/HL', kinds: ['current-ratio', 'acid-test-ratio', 'slip-ratio', 'read-ratio-table'] },
  { code: '3.6', text: 'Efficiency ratios: stock turnover, debtor days, creditor days and gearing', level: 'HL', kinds: ['stock-turnover-times', 'stock-turnover-days', 'debtor-days', 'creditor-days', 'gearing-ratio'] },
  { code: '3.7', text: 'Working capital', level: 'SL/HL', kinds: ['working-capital'] },
  { code: '3.7', text: 'Cash flow forecasts', level: 'SL/HL', kinds: ['closing-balance', 'build-cash-flow', 'slip-cash-flow', 'read-cash-chart'] },
  { code: '3.8', text: 'Investment appraisal: payback period, ARR and NPV', level: 'SL/HL', note: 'NPV is HL only', kinds: ['payback-period', 'average-rate-of-return', 'net-present-value', 'slip-investment'] },
  { code: '3.9', text: 'Constructing a budget, and variances', level: 'HL', kinds: ['budget-variance', 'build-variances'] },
  { code: '4.1', text: 'Market share and market growth', level: 'SL/HL', kinds: ['market-share', 'market-growth'] },
  { code: '4.5', text: 'Price elasticity of demand', level: 'HL', kinds: ['price-elasticity'] },
  {
    code: '5.5',
    text: 'The break-even chart: break-even quantity, profit or loss, margin of safety, target profit output, target profit and target price',
    level: 'SL/HL',
    kinds: ['contribution-per-unit', 'total-contribution', 'break-even-quantity', 'break-even-revenue', 'margin-of-safety', 'profit', 'target-profit-output', 'target-price', 'read-break-even-chart', 'build-break-even', 'slip-break-even'],
  },
  { code: '5.5', text: 'The effects of a change in price or cost on break-even, profit and the margin of safety', level: 'SL/HL', kinds: ['break-even-change'] },
  { code: '5.6', text: 'Stock control charts: lead time, buffer stock, reorder level and reorder quantity', level: 'HL', kinds: ['reorder-level', 'reorder-quantity', 'read-stock-chart'] },
  { code: '5.6', text: 'Capacity utilization rate', level: 'HL', kinds: ['capacity-utilization'] },
  { code: '5.6', text: 'Defect rate', level: 'HL', kinds: ['defect-rate'] },
  { code: '5.6', text: 'Labour productivity, capital productivity, productivity rate and operating leverage', level: 'HL', kinds: ['labour-productivity', 'capital-productivity', 'productivity-rate', 'operating-leverage'] },
  { code: '5.6', text: 'Cost to buy (CTB) and cost to make (CTM)', level: 'HL', kinds: ['make-or-buy'] },
  { code: 'Toolkit', text: 'Decision trees', level: 'SL/HL', kinds: ['expected-value'] },
  { code: 'Toolkit', text: 'Descriptive statistics: mean, median, quartiles and standard deviation, and reading charts', level: 'SL/HL', kinds: ['mean', 'median', 'interquartile-range', 'standard-deviation', 'read-cash-chart'] },
  { code: 'Toolkit', text: 'Contribution: make or buy, contribution costing and absorption costing', level: 'HL', kinds: ['make-or-buy', 'special-order', 'absorption-cost'] },
  { code: 'Toolkit', text: 'Critical path analysis: the critical path, and free and total float', level: 'HL', kinds: ['total-float', 'free-float'] },
  { code: 'Toolkit', text: 'Simple linear regression: the line of best fit and extrapolation', level: 'HL', kinds: ['regression-forecast'] },
];

/** Constructions at AO4 with no calculation, practised in the rooms' tools rather than here. */
export const ELSEWHERE: Array<{ code: string; text: string; href: string; tool: string }> = [
  { code: '2.2', text: 'Organization charts', href: '/people-and-culture/organization-chart/', tool: 'the organization chart tool in People and Culture' },
  { code: '4.2', text: 'Position maps', href: '/market-studio/positioning-map/', tool: 'the positioning map in the Market Studio' },
];
