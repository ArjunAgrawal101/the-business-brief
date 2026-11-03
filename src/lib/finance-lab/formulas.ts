/**
 * Each calculator's formulas, written as the guide writes them: as fractions
 * where its formula sheet (pp. 64 to 65) prints a fraction, with its own words
 * for each term. Formulas the sheet does not list are marked as standard
 * forms, and anything beyond the syllabus as enrichment. The renderer in
 * src/lib/finance-lab/render.ts draws the fractions and gives screen readers a linear
 * reading of the same formula.
 */
import type { Scope } from './types';

export type Term = string | { n: Term[]; d: Term[] } | { sup: string };

export interface FormulaSpec {
  name: string;
  rhs: Term[];
  where?: Array<{ name: string; rhs: Term[] }>;
  /** Shown beside the formula: where it comes from. */
  note?: string;
  scope?: Scope;
}

const frac = (n: Term[] | string, d: Term[] | string): Term => ({ n: typeof n === 'string' ? [n] : n, d: typeof d === 'string' ? [d] : d });

const CE = { name: 'capital employed', rhs: ['non-current liabilities + equity'] };
const STD = 'Standard form; the guide gives no formula.';
const P64 = 'As printed on the guide’s formula sheet (p. 64).';
const P65 = 'As printed on the guide’s formula sheet (p. 65).';

export const FORMULAS: Record<string, FormulaSpec[]> = {
  'break-even-quantity': [
    { name: 'Break-even quantity', rhs: [frac('total fixed costs', 'contribution per unit')], where: [{ name: 'contribution per unit', rhs: ['selling price per unit − variable cost per unit'] }], note: STD },
  ],
  'break-even-revenue': [
    { name: 'Break-even revenue', rhs: ['break-even quantity × selling price per unit'], where: [{ name: 'break-even quantity', rhs: [frac('total fixed costs', 'contribution per unit')] }], note: STD },
  ],
  'margin-of-safety': [
    { name: 'Margin of safety', rhs: ['actual or forecast output − break-even quantity'], note: STD },
    { name: 'Margin of safety (%)', rhs: [frac('margin of safety', 'actual or forecast output'), ' × 100'], note: STD },
    { name: 'Margin of safety in value', rhs: ['margin of safety × selling price per unit'], note: 'Enrichment: beyond the guide’s list for 5.5.', scope: 'enrichment' },
    { name: 'Degree of operating leverage', rhs: [frac('total contribution', 'profit')], note: 'HL (5.6). The guide names operating leverage but gives no formula; this is the standard measure.', scope: 'hl' },
  ],
  contribution: [
    { name: 'Contribution per unit', rhs: ['selling price per unit − variable cost per unit'], note: STD },
    { name: 'Total contribution', rhs: ['contribution per unit × quantity sold'], note: STD },
    { name: 'Profit', rhs: ['total contribution − total fixed costs'], note: STD },
  ],
  'target-profit': [
    { name: 'Target profit output', rhs: [frac('total fixed costs + target profit', 'contribution per unit')], note: STD },
    { name: 'Target price', rhs: [frac('total fixed costs + target profit', 'expected sales'), ' + variable cost per unit'], note: STD },
  ],
  'profit-and-loss': [
    { name: 'Cost of sales', rhs: ['opening stock + purchases − closing stock'], note: 'For a business that buys goods to resell.' },
    { name: 'Gross profit', rhs: ['sales revenue − cost of sales'], note: 'Each subtotal follows the order of the guide’s statement of profit or loss (figure 6, p. 59).' },
    { name: 'Profit before interest and tax', rhs: ['gross profit − expenses'] },
    { name: 'Profit before tax', rhs: ['profit before interest and tax − interest'] },
    { name: 'Profit for period', rhs: ['profit before tax − tax'] },
    { name: 'Retained profit', rhs: ['profit for period − dividends'] },
  ],
  'gross-profit-margin': [{ name: 'Gross profit margin', rhs: [frac('gross profit', 'sales revenue'), ' × 100'], note: P64 }],
  'profit-margin': [{ name: 'Profit margin', rhs: [frac('profit before interest and tax', 'sales revenue'), ' × 100'], note: P64 }],
  roce: [{ name: 'Return on capital employed (ROCE)', rhs: [frac('profit before interest and tax', 'capital employed'), ' × 100'], where: [CE], note: P64 }],
  'current-ratio': [{ name: 'Current ratio', rhs: [frac('current assets', 'current liabilities')], note: P64 }],
  'acid-test-ratio': [{ name: 'Acid test (quick) ratio', rhs: [frac('current assets − stock', 'current liabilities')], note: P64 }],
  'gearing-ratio': [{ name: 'Gearing ratio', rhs: [frac('non-current liabilities', 'capital employed'), ' × 100'], where: [CE], note: P64 }],
  'stock-turnover': [
    { name: 'Stock turnover (number of times)', rhs: [frac('cost of sales', 'average stock')], note: P64 },
    { name: 'Stock turnover (number of days)', rhs: [frac('average stock', 'cost of sales'), ' × 365'], where: [{ name: 'average stock', rhs: [frac('opening stock + closing stock', '2')] }], note: P64 },
  ],
  'debtor-days': [{ name: 'Debtor days ratio (number of days)', rhs: [frac('debtors', 'total sales revenue'), ' × 365'], note: P64 }],
  'creditor-days': [{ name: 'Creditor days ratio (number of days)', rhs: [frac('creditors', 'cost of sales'), ' × 365'], note: P64 }],
  'cash-flow-forecast': [
    { name: 'Net cash flow', rhs: ['total cash inflows − total cash outflows'] },
    { name: 'Closing balance', rhs: ['opening balance + net cash flow'] },
    { name: 'Opening balance', rhs: ['the previous month’s closing balance'] },
  ],
  'budget-variances': [{ name: 'Variance', rhs: ['actual figure − budgeted figure'], note: 'Shown as an amount marked [F] favourable or [A] adverse, by its effect on profit.' }],
  'payback-period': [
    { name: 'Payback period', rhs: ['years before the cost is recovered + ', frac('amount still to recover', 'net cash flow in the payback year'), ' × 12 months'], note: STD },
  ],
  'average-rate-of-return': [
    { name: 'Average rate of return (ARR)', rhs: [frac('(total returns − capital cost) ÷ years of use', 'capital cost'), ' × 100'], note: P65 },
  ],
  'net-present-value': [
    { name: 'Net present value (NPV)', rhs: ['∑ present values of return − original cost'], note: P65 },
    { name: 'Present value', rhs: ['return in a year × discount factor for that year and rate'], note: 'Standard form; the factors come from the guide’s table (p. 66).' },
    { name: 'Discount factor', rhs: [frac('1', ['(1 + r)', { sup: 'n' }])], note: 'Enrichment: where the table comes from. r is the rate as a decimal, n the year. In an examination, use the table.', scope: 'enrichment' },
  ],
};

/** The formula as one line of text, for screen readers and the CSV. */
export function linear(terms: Term[]): string {
  return terms
    .map((t) => {
      if (typeof t === 'string') return t;
      if ('sup' in t) return `^${t.sup}`;
      return `(${linear(t.n)}) ÷ (${linear(t.d)})`;
    })
    .join('');
}
