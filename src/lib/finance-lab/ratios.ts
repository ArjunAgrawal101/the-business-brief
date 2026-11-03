/**
 * The lab's ratio calculators: the guide's profitability and liquidity ratios
 * (3.5) and, at HL, its efficiency ratios and gearing (3.6), each for two
 * years. Every value and working comes from src/lib/ratios.ts, which follows
 * the formula sheet (p. 64); this module chooses the inputs, compares the
 * years and says what the result means.
 */
import { fmtNumber, round } from '../format';
import {
  RATIOS,
  VERDICT_TEXT,
  derive,
  describeChange,
  fmtChange,
  fmtRatio,
  profitOrLoss,
  ratioWorkings,
  valueFromInputs,
  verdict,
  type RatioId,
} from '../ratios';
import { ACCOUNTS, OPENING_STOCK } from './business';
import { ratioBarsSvg } from './charts';
import { RATIO_FIELDS, YEARS, validateFields, type YearKey } from './fields';
import type { Figure, LabReport, Problem, Raw, SensitivityBlock, Settings, WorkingBlock } from './types';
import { money } from './util';

export type RatioLabId = 'gross-profit-margin' | 'profit-margin' | 'roce' | 'current-ratio' | 'acid-test-ratio' | 'gearing-ratio' | 'stock-turnover' | 'debtor-days' | 'creditor-days';

export const RATIO_LAB_IDS: RatioLabId[] = ['gross-profit-margin', 'profit-margin', 'roce', 'current-ratio', 'acid-test-ratio', 'gearing-ratio', 'stock-turnover', 'debtor-days', 'creditor-days'];

/** The figures for one year: the keys of the calculator's fields. */
export type YearFigures = Record<string, number>;
export type RatioState = Record<YearKey, YearFigures>;

function yearDefaults(y: YearKey): Record<string, number> {
  const s = ACCOUNTS[y];
  const d = derive(s);
  return {
    salesRevenue: s.salesRevenue,
    costOfSales: s.costOfSales,
    pbit: d.pbit,
    nonCurrentLiabilities: d.nonCurrentLiabilities,
    equity: d.totalEquity,
    currentAssets: d.currentAssets,
    currentLiabilities: d.currentLiabilities,
    stock: s.stock,
    openingStock: OPENING_STOCK[y],
    closingStock: s.stock,
    debtors: s.debtors,
    creditors: s.tradeCreditors,
  };
}

/** Each calculator's default figures, taken from Emberly's two statements. */
export function ratioDefaults(id: RatioLabId): RatioState {
  const pick = (y: YearKey) => Object.fromEntries((RATIO_FIELDS[id] ?? []).map((f) => [f.key, yearDefaults(y)[f.key] ?? 0]));
  return { previous: pick('previous'), latest: pick('latest') };
}

export function validateRatio(id: RatioLabId, raw: Raw): Problem[] {
  const specs = RATIO_FIELDS[id] ?? [];
  const out: Problem[] = [];
  for (const y of YEARS) {
    out.push(...validateFields(raw, specs, `${y.key}.`, ` for the ${y.label.toLowerCase()}`));
    if (id === 'acid-test-ratio') {
      const ca = raw[`${y.key}.currentAssets`];
      const st = raw[`${y.key}.stock`];
      if (typeof ca === 'number' && typeof st === 'number' && st > ca && !out.some((p) => p.field === `${y.key}.stock`)) {
        out.push({ field: `${y.key}.stock`, message: `Stock is part of current assets, so it cannot be more than current assets for the ${y.label.toLowerCase()}.` });
      }
    }
  }
  return out;
}

export function ratioState(id: RatioLabId, raw: Raw): RatioState {
  const d = ratioDefaults(id);
  const read = (y: YearKey) => Object.fromEntries((RATIO_FIELDS[id] ?? []).map((f) => [f.key, raw[`${y}.${f.key}`] ?? d[y][f.key] ?? 0]));
  return { previous: read('previous'), latest: read('latest') };
}

/** The named inputs src/lib/ratios.ts takes, for one of the guide's ratios. */
function inputsFor(r: RatioId, f: YearFigures): Record<string, number> {
  const v = (k: string) => f[k] ?? 0;
  switch (r) {
    case 'gross-profit-margin':
      return { grossProfit: profitOrLoss({ salesRevenue: v('salesRevenue'), costOfSales: v('costOfSales'), expenses: 0, interest: 0, tax: 0, dividends: 0 }).grossProfit, salesRevenue: v('salesRevenue') };
    case 'profit-margin':
      return { pbit: v('pbit'), salesRevenue: v('salesRevenue') };
    case 'roce':
      return { pbit: v('pbit'), nonCurrentLiabilities: v('nonCurrentLiabilities'), equity: v('equity') };
    case 'current-ratio':
      return { currentAssets: v('currentAssets'), currentLiabilities: v('currentLiabilities') };
    case 'acid-test-ratio':
      return { currentAssets: v('currentAssets'), stock: v('stock'), currentLiabilities: v('currentLiabilities') };
    case 'gearing-ratio':
      return { nonCurrentLiabilities: v('nonCurrentLiabilities'), equity: v('equity') };
    case 'stock-turnover-times':
    case 'stock-turnover-days':
      return { costOfSales: v('costOfSales'), openingStock: v('openingStock'), closingStock: v('closingStock') };
    case 'debtor-days':
      return { debtors: v('debtors'), salesRevenue: v('salesRevenue') };
    case 'creditor-days':
      return { creditors: v('creditors'), costOfSales: v('costOfSales') };
  }
}

/** The guide's ratio (or, for stock turnover, ratios) behind each calculator. */
const RATIOS_FOR: Record<RatioLabId, RatioId[]> = {
  'gross-profit-margin': ['gross-profit-margin'],
  'profit-margin': ['profit-margin'],
  roce: ['roce'],
  'current-ratio': ['current-ratio'],
  'acid-test-ratio': ['acid-test-ratio'],
  'gearing-ratio': ['gearing-ratio'],
  'stock-turnover': ['stock-turnover-times', 'stock-turnover-days'],
  'debtor-days': ['debtor-days'],
  'creditor-days': ['creditor-days'],
};

/** A change to one or more inputs, for the sensitivity table. */
interface Nudge {
  label: string;
  /** The change in a few words, for the reading. */
  short: string;
  apply: (f: YearFigures, k: number) => YearFigures;
}

const one = (key: string, label: string, short = label.toLowerCase()): Nudge => ({ label, short, apply: (f, k) => ({ ...f, [key]: round((f[key] ?? 0) * (1 + k), 6) }) });

const NUDGES: Record<RatioLabId, Nudge[]> = {
  'gross-profit-margin': [
    { label: 'Price (sales revenue changes, cost of sales does not)', short: 'a change in price', apply: (f, k) => ({ ...f, salesRevenue: round((f.salesRevenue ?? 0) * (1 + k), 6) }) },
    one('costOfSales', 'Cost of sales', 'a change in cost of sales'),
    { label: 'Volume (sales revenue and cost of sales change together)', short: 'a change in volume', apply: (f, k) => ({ ...f, salesRevenue: round((f.salesRevenue ?? 0) * (1 + k), 6), costOfSales: round((f.costOfSales ?? 0) * (1 + k), 6) }) },
  ],
  'profit-margin': [
    { label: 'Price (sales revenue and profit rise or fall by the same amount)', short: 'a change in price', apply: (f, k) => ({ ...f, salesRevenue: round((f.salesRevenue ?? 0) * (1 + k), 6), pbit: round((f.pbit ?? 0) + (f.salesRevenue ?? 0) * k, 6) }) },
    one('pbit', 'Profit before interest and tax', 'a change in profit'),
    one('salesRevenue', 'Sales revenue, with profit unchanged', 'a change in sales revenue alone'),
  ],
  roce: [one('pbit', 'Profit before interest and tax', 'a change in profit'), one('nonCurrentLiabilities', 'Non-current liabilities', 'a change in long-term borrowing'), one('equity', 'Total equity', 'a change in equity')],
  'current-ratio': [
    one('currentAssets', 'Current assets', 'a change in current assets'),
    one('currentLiabilities', 'Current liabilities', 'a change in current liabilities'),
    {
      // Lower: pay creditors from cash. Higher: borrow short term and hold the cash. Both sides move by the same amount.
      label: 'Cash and current liabilities together (paying creditors, or borrowing short term)',
      short: 'paying creditors or borrowing short term',
      apply: (f, k) => {
        const d = k * (f.currentLiabilities ?? 0);
        return { ...f, currentAssets: round((f.currentAssets ?? 0) + d, 6), currentLiabilities: round((f.currentLiabilities ?? 0) + d, 6) };
      },
    },
  ],
  'acid-test-ratio': [
    one('currentAssets', 'Current assets, with stock unchanged', 'a change in current assets'),
    { label: 'Stock, bought or sold for cash (current assets unchanged)', short: 'buying or selling stock for cash', apply: (f, k) => ({ ...f, stock: round((f.stock ?? 0) * (1 + k), 6) }) },
    one('currentLiabilities', 'Current liabilities', 'a change in current liabilities'),
  ],
  'gearing-ratio': [one('nonCurrentLiabilities', 'Non-current liabilities', 'a change in long-term borrowing'), one('equity', 'Total equity', 'a change in equity')],
  'stock-turnover': [one('costOfSales', 'Cost of sales', 'a change in cost of sales'), one('closingStock', 'Closing stock', 'a change in closing stock'), one('openingStock', 'Opening stock', 'a change in opening stock')],
  'debtor-days': [one('debtors', 'Debtors', 'a change in debtors'), one('salesRevenue', 'Sales revenue', 'a change in sales revenue')],
  'creditor-days': [one('creditors', 'Creditors', 'a change in creditors'), one('costOfSales', 'Cost of sales', 'a change in cost of sales')],
};

/* ------------------------------------------------------------------ */
/* What each ratio means                                               */
/* ------------------------------------------------------------------ */

interface Content {
  meaning: (v: number, s: Settings, f: YearFigures) => string;
  /** Why the ratio cannot be calculated. */
  none: string;
  compare: string;
  benchmarks: string;
  /** Options when the ratio has moved the wrong way or is weak; the first ones are the most direct. */
  actions: string[];
  /** One line on what the sensitivity table shows. */
  insight: string;
  /** For a ratio where higher is neither better nor worse: what to check when it rises or falls. */
  judgement?: { rose: string; fell: string };
}

const per = (cur: string, v: number) => `${cur}${fmtNumber(v, 2)}`;

const CONTENT: Record<RatioLabId, Content> = {
  'gross-profit-margin': {
    meaning: (v, s) => `Of every ${s.currency}1 of sales, **${per(s.currency, v / 100)}** (${fmtNumber(v, 2)}%) is left after paying for the goods or services sold. That is what remains for the expenses, interest, tax and the owners.`,
    none: 'Sales revenue is zero, so there is no margin to measure.',
    compare: 'Compare it with the business’s own trend over several years, with competitors in the same industry and with its target. The gap between this margin and the profit margin is the share of each sale that the expenses take.',
    benchmarks: 'Gross margins differ widely by industry. A supermarket or a fuel retailer works on a thin margin and relies on volume, while a software or design business, whose cost of sales is small, keeps most of each sale. Within one business the margin moves with prices, input costs and the mix of products sold, so its movement over time often says more than its level.',
    actions: [
      'Raise prices, if customers will accept it; the risk is lost sales, so the margin can rise while gross profit falls.',
      'Cut the cost of sales: cheaper or bulk-bought inputs, less waste, a more productive process; protect quality and the supplier relationship.',
      'Shift the mix towards products with a larger margin, if customers want them.',
    ],
    insight: 'Selling more at the same price and the same cost per unit leaves the margin unchanged: volume changes gross profit, not the margin.',
  },
  'profit-margin': {
    meaning: (v, s) => `Of every ${s.currency}1 of sales, **${per(s.currency, v / 100)}** (${fmtNumber(v, 2)}%) is left as profit before interest and tax, after the cost of sales and every expense of running the business.`,
    none: 'Sales revenue is zero, so there is no margin to measure.',
    compare: 'Compare it with the gross profit margin: if the gross margin holds steady while this one falls, the expenses are growing faster than sales. Compare it across years, with competitors and with the business’s targets.',
    benchmarks: 'Like the gross margin, it varies by industry and over time. A business that is investing in marketing, staff or new premises can show a lower margin for a while on purpose, and a recession squeezes margins across a whole industry. The guide uses profit before interest and tax, so the margin is not affected by how the business is financed.',
    actions: [
      'Control expenses such as rent, energy and overheads; cuts that go too deep, for example in marketing or training, can lower next year’s sales.',
      'Raise prices or cut the cost of sales, which lifts both margins.',
      'Grow sales to spread fixed expenses over more revenue, if the extra sales do not need heavy discounts.',
    ],
    insight: 'A price rise lifts the margin more than the same change in sales volume would, because the whole increase in revenue falls to profit.',
  },
  roce: {
    meaning: (v, s) => `Each ${s.currency}100 of long-term finance, from lenders and owners together, earned **${per(s.currency, v)}** of profit before interest and tax in the year.`,
    none: 'Capital employed is zero or negative, so ROCE cannot be calculated. Negative equity means losses have used up the owners’ stake, a sign of serious financial trouble.',
    compare: 'Compare it with what the same money could earn elsewhere, such as interest on savings, and with the interest rate the business pays on its loans: a ROCE below the cost of borrowing is a warning sign. Compare it across years: ROCE often dips just after an investment, because the capital arrives before the profit it is meant to earn.',
    benchmarks: 'Capital-intensive businesses, such as manufacturers and utilities, tie up large sums in assets and often show a lower ROCE than service businesses with few assets. Interest rates change what counts as a good return: a ROCE that looked strong when borrowing was cheap can look thin when rates rise.',
    actions: [
      'Raise profit before interest and tax through prices or costs, without adding capital.',
      'Use the existing capital harder, for example by selling more from the same equipment.',
      'Sell assets the business does not need and use the money to repay long-term loans, which lowers capital employed; check the assets will not be needed later.',
    ],
    insight: 'ROCE falls when capital employed grows faster than profit, as it does when a business borrows or issues shares to invest before the investment pays.',
  },
  'current-ratio': {
    meaning: (v, s) => `For every ${s.currency}1 due within a year, the business has **${per(s.currency, v)}** of current assets: cash, debtors and stock that will turn into cash, or be used up, within a year.`,
    none: 'Current liabilities are zero, so the ratio cannot be calculated: the business owes nothing due within a year.',
    compare: 'Compare it with the acid test ratio: a wide gap means much of the cover is stock, which has to be sold first. Compare it across years and with similar businesses, and read it beside the cash flow forecast, which shows timing that a single day’s balance sheet cannot.',
    benchmarks: 'A current ratio of about 1.5 to 2 is often called comfortable, but that is a rule of thumb, not an IB rule, and normal levels differ by industry. A supermarket sells for cash, holds stock for days and pays its suppliers later, so it can run safely below 1, while a manufacturer or a builder paid at the end of each project needs more. A very high ratio is not always good news: it can mean idle cash, stock piling up or customers slow to pay.',
    actions: [
      'Turn a bank overdraft into a long-term loan: current liabilities fall, so the ratio rises, though the debt and its interest remain.',
      'Raise long-term finance, or retain more profit, and hold it as cash.',
      'Sell non-current assets the business does not need, or use sale and leaseback; collecting debts faster helps cash but leaves the ratio unchanged.',
    ],
    insight: 'When the ratio is above 1, paying creditors from cash raises it, because both sides fall by the same amount; below 1 the same payment lowers it.',
  },
  'acid-test-ratio': {
    meaning: (v, s) => `Without selling any stock, the business has **${per(s.currency, v)}** of liquid assets, mainly cash and debtors, for every ${s.currency}1 due within a year.`,
    none: 'Current liabilities are zero, so the ratio cannot be calculated.',
    compare: 'Compare it with the current ratio: the gap between them is the stock. Compare it across years: a falling acid test ratio while the current ratio holds steady means stock is building up while cash and debtors shrink.',
    benchmarks: 'About 1 is often treated as the line below which a business relies on selling stock to pay its debts, again a rule of thumb rather than an IB rule. A business whose stock sells quickly for cash, such as a café or a grocer, can run safely well below 1; one whose stock is slow to sell needs a higher figure.',
    actions: [
      'Sell surplus or slow-moving stock for cash: the acid test ratio rises, the current ratio does not; discounts lower the gross margin.',
      'Turn short-term borrowing into long-term borrowing, which raises both liquidity ratios.',
      'Raise long-term finance or sell an asset the business does not need.',
    ],
    insight: 'Buying or selling stock for cash leaves current assets unchanged but moves this ratio, because cash counts in it and stock does not.',
  },
  'gearing-ratio': {
    meaning: (v) => `**${fmtNumber(v, 2)}%** of the business’s long-term finance is borrowed; the rest, ${fmtNumber(100 - v, 2)}%, is the owners’ equity.`,
    none: 'Capital employed is zero or negative, so gearing cannot be calculated: losses have used up the owners’ equity.',
    compare: 'Compare it across years and with similar businesses, and with how easily profit covers the interest: gearing matters most when profit is uncertain or interest rates are rising.',
    benchmarks: 'Above about 50% a business is often described as highly geared, but that is a convention, not an IB rule. A business with steady cash flows and assets to secure loans, such as a property company or a utility, can carry high gearing safely; a young business with uncertain sales cannot. The same gearing becomes riskier when interest rates rise.',
    actions: [
      'To lower gearing: issue shares, retain more profit, or repay loans from the sale of assets the business does not need.',
      'To use more borrowing: a loan can be cheaper than new equity and keeps control with the owners, if profit comfortably covers the interest.',
      'Match the decision to the risk: high gearing magnifies returns to owners in good years and losses in bad ones.',
    ],
    insight: 'Gearing rises when borrowing grows faster than equity; retained profit lowers it slowly, a share issue at once.',
    judgement: {
      rose: 'Gearing has risen: check that profit covers the interest comfortably, and that the borrowing pays for assets that will earn more than it costs.',
      fell: 'Gearing has fallen: the business carries less financial risk, but check whether cheaper borrowed money could have funded profitable growth.',
    },
  },
  'stock-turnover': {
    meaning: (v) => `Stock is used and replaced **${fmtNumber(v, 2)} times** a year on average.`,
    none: 'Average stock or cost of sales is zero, so turnover cannot be calculated.',
    compare: 'Compare it across years and with similar businesses, and with how long the product lasts: a slower turnover than before can mean slow-selling or ageing stock, or a deliberate build-up before a busy season.',
    benchmarks: 'A business selling perishable goods, such as a bakery or a grocer, turns its stock over many times a year; a jeweller or a car dealer may turn it over only a few times. A service business may hold almost no stock, so the ratio tells it little.',
    actions: [
      'Hold less stock: order more often in smaller amounts, or move towards just-in-time where suppliers are reliable.',
      'Clear slow-moving lines, even at a discount, to release cash.',
      'Improve demand forecasting; the risk of cutting stock too far is running out and losing sales.',
    ],
    insight: 'The guide uses average stock, so a change in either opening or closing stock moves the ratio.',
  },
  'debtor-days': {
    meaning: (v) => `Customers take **${fmtNumber(v, 2)} days** on average to pay what they owe.`,
    none: 'Sales revenue is zero, so debtor days cannot be calculated.',
    compare: 'Compare it with the credit period the business offers, such as 30 days: a figure well above it means customers are paying late. Compare it with creditor days: a business that waits longer for its customers than it takes to pay its suppliers is, in effect, financing its customers.',
    benchmarks: 'A business that sells for cash, such as a shop, has few debtors; one that sells to other businesses usually gives credit, often a month or two. The guide divides by total sales revenue, so a business that sells partly for cash collects its credit sales more slowly than the ratio suggests.',
    actions: [
      'Chase late payers and invoice promptly.',
      'Shorten credit terms, or offer a small discount for prompt payment; customers may move to rivals with better terms.',
      'Use debt factoring for cash now, at the cost of the factor’s fee.',
    ],
    insight: 'Debtors are a balance on one day; a large sale just before the year end can raise debtor days without any change in how fast customers pay.',
  },
  'creditor-days': {
    meaning: (v) => `The business takes **${fmtNumber(v, 2)} days** on average to pay its suppliers.`,
    none: 'Cost of sales is zero, so creditor days cannot be calculated.',
    compare: 'Compare it with the credit terms suppliers offer, and with debtor days: paying suppliers later than customers pay you keeps cash in the business.',
    benchmarks: 'A large retailer may negotiate long credit periods from its suppliers; a small business may be given little credit at all. Paying later keeps cash in the business, but suppliers may withdraw credit, raise prices or put orders on hold if payments are late, and paying small suppliers late raises ethical questions.',
    actions: [
      'Negotiate longer credit terms with suppliers, agreed in advance rather than taken by paying late.',
      'Pay on time where a discount for prompt payment is worth more than the cash held.',
      'Treat a sharp rise as a warning sign: it can mean the business is struggling to pay.',
    ],
    insight: 'A higher figure is neither good nor bad in itself: it is cash kept, at the cost of goodwill and possibly of discounts.',
    judgement: {
      rose: 'Creditor days have risen: check whether that is longer credit the suppliers agreed to, or late payment, which costs goodwill and can be a sign of strain.',
      fell: 'Creditor days have fallen: suppliers are paid sooner, which builds goodwill and may earn discounts, but uses cash the business could have kept for longer.',
    },
  },
};

/* ------------------------------------------------------------------ */
/* The report                                                          */
/* ------------------------------------------------------------------ */

export function buildRatio(id: RatioLabId, st: RatioState, s: Settings): LabReport {
  const ids = RATIOS_FOR[id];
  const main = ids[0] as RatioId;
  const def = RATIOS[main];
  const unit = s.currency.trim();
  const value = (r: RatioId, y: YearKey) => valueFromInputs(r, inputsFor(r, st[y]));
  const a = value(main, 'previous');
  const b = value(main, 'latest');
  const v = verdict(def, a, b);
  const content = CONTENT[id];
  const workings: WorkingBlock[] = [];
  for (const y of ['latest', 'previous'] as const) {
    const label = y === 'latest' ? 'latest year' : 'previous year';
    if (id === 'gross-profit-margin') {
      const sr = st[y].salesRevenue ?? 0;
      const cos = st[y].costOfSales ?? 0;
      const gp = sr - cos;
      workings.push({
        title: `Gross profit, ${label}`,
        working: {
          given: [
            { label: `Sales revenue (${unit})`, value: fmtNumber(sr) },
            { label: `Cost of sales (${unit})`, value: fmtNumber(cos) },
          ],
          formula: 'Gross profit = sales revenue − cost of sales',
          substitution: `= ${fmtNumber(sr)} − ${fmtNumber(cos)}`,
          steps: [`${fmtNumber(sr)} − ${fmtNumber(cos)} = ${fmtNumber(gp)}`],
          answer: money(gp, s.currency),
          value: gp,
          unit: s.currency.trim() || 'currency',
        },
        interpretation: gp >= 0 ? `Trading leaves ${money(gp, s.currency)} after the cost of the goods sold.` : 'Cost of sales is more than sales revenue: the business loses money on trading itself.',
        implication: 'The margin below puts this in proportion to sales.',
        collapsed: y === 'previous',
      });
    }
    for (const r of ids) {
      const w = ratioWorkings[r](inputsFor(r, st[y]), unit);
      const val = value(r, y);
      workings.push({
        title: `${RATIOS[r].name}, ${label}`,
        working: w,
        interpretation: val === null ? content.none : content.meaning(val, s, st[y]).replace(/\*\*/g, ''),
        implication: y === 'latest' ? describeChange(RATIOS[r], value(r, 'previous'), value(r, 'latest'), 'the previous year', 'the latest year') : 'Compare it with the latest year’s working above.',
        collapsed: y === 'previous',
      });
    }
  }
  // Sensitivity: each input, or pair of inputs, 10 per cent either way, for the latest year.
  const base = b;
  const sensRows = NUDGES[id].map((n) => {
    const lo = valueFromInputs(main, inputsFor(main, n.apply(st.latest, -0.1)));
    const hi = valueFromInputs(main, inputsFor(main, n.apply(st.latest, 0.1)));
    return { n, lo, hi, row: { th: n.label, cells: [fmtRatio(lo, def.kind), fmtRatio(hi, def.kind)] } };
  });
  const spread = (r: { lo: number | null; hi: number | null }) => (r.lo === null || r.hi === null ? -1 : Math.abs(r.hi - r.lo));
  const most = [...sensRows].sort((x, y) => spread(y) - spread(x))[0];
  const sensitivity: SensitivityBlock = {
    title: 'What moves the ratio',
    intro: `The latest year’s ${def.name.toLowerCase()} (${fmtRatio(base, def.kind)}) when one figure, or one pair of figures, changes by 10 per cent and the rest stay as entered.`,
    table: { caption: `${def.name}, latest year, after a 10% change`, head: ['Change', '10% lower', '10% higher'], rows: sensRows.map((r) => r.row) },
    reading: base === null ? content.none : `${most && spread(most) > 0 ? `Of these, ${most.n.short} moves it most: from ${fmtRatio(most.lo, def.kind)} at 10% lower to ${fmtRatio(most.hi, def.kind)} at 10% higher. ` : ''}${content.insight}`,
  };
  // The headline shows the main ratio for the latest year, so the figures start from the previous year.
  const figures: Figure[] = ids.flatMap((r, k) => {
    const fa = value(r, 'previous');
    const fb = value(r, 'latest');
    const latest: Figure = { label: `${RATIOS[r].short}, latest year`, value: fmtRatio(fb, RATIOS[r].kind), note: fmtChange(fa, fb, RATIOS[r].kind) === 'n/a' ? undefined : `${fmtChange(fa, fb, RATIOS[r].kind)} on the previous year` };
    const previous: Figure = { label: `${RATIOS[r].short}, previous year`, value: fmtRatio(fa, RATIOS[r].kind) };
    return k === 0 ? [previous] : [latest, previous];
  });
  figures.push({ label: 'Change, other things equal', value: VERDICT_TEXT[v], note: def.better === 'depends' ? 'whether higher is better depends on the business' : def.better === 'higher' ? 'higher is better' : 'lower is better' });
  if (id === 'roce' || id === 'gearing-ratio') {
    const ce = (st.latest.nonCurrentLiabilities ?? 0) + (st.latest.equity ?? 0);
    figures.push({ label: 'Capital employed, latest year', value: money(ce, s.currency), note: 'non-current liabilities + equity' });
  }
  const dir = v === 'worse' || (b !== null && weak(id, b));
  const rose = a !== null && b !== null && b > a;
  const first =
    v === 'judgement' && content.judgement
      ? content.judgement[rose ? 'rose' : 'fell']
      : v === 'better'
        ? 'The ratio has improved: check that the cause will last, and what it cost to achieve.'
        : 'The ratio is unchanged: compare it with similar businesses to judge whether its level is right.';
  const actions = dir && v !== 'judgement' ? content.actions : [first, ...content.actions.slice(0, 2)];
  const changeText = describeChange(def, a, b, 'the previous year', 'the latest year');
  const headlineNote = a === null || b === null ? undefined : `${fmtChange(a, b, def.kind)} on the previous year; ${VERDICT_TEXT[v].toLowerCase()}`;
  const secondary = id === 'stock-turnover' ? valueFromInputs('stock-turnover-days', inputsFor('stock-turnover-days', st.latest)) : null;
  return {
    headline: { label: `${def.name}, latest year`, value: fmtRatio(b, def.kind), note: id === 'stock-turnover' ? `${fmtRatio(secondary, 'days')} on average; ${headlineNote ?? ''}`.replace(/; $/, '') : headlineNote },
    figures,
    workings,
    chart: {
      svg: ratioBarsSvg({
        name: def.name,
        values: [
          { label: 'Previous year', value: a, text: fmtRatio(a, def.kind) },
          { label: 'Latest year', value: b, text: fmtRatio(b, def.kind) },
        ],
        id: `fl-${id}-chart`,
        better: def.better,
        unit: def.kind === 'percent' ? '%' : def.kind === 'days' ? ' days' : def.kind === 'times' ? '×' : '',
      }),
      caption: `${def.name} in each year, measured from zero. The latest year is the darker bar.`,
      table: {
        caption: `${def.name} by year`,
        head: ['Year', ...ids.map((r) => RATIOS[r].name)],
        rows: (['previous', 'latest'] as const).map((y) => ({ th: y === 'latest' ? 'Latest year' : 'Previous year', cells: ids.map((r) => fmtRatio(value(r, y), RATIOS[r].kind)) })),
      },
    },
    sensitivity,
    interpretation: {
      meaning: b === null ? content.none : `${content.meaning(b, s, st.latest)}${id === 'stock-turnover' && secondary !== null ? ` On average an item sits in stock for **${fmtNumber(secondary, 2)} days** before it is used or sold.` : ''}`,
      compare: `${changeText} ${content.compare}`,
      benchmarks: content.benchmarks,
      actions,
    },
    given: YEARS.flatMap((y) => (RATIO_FIELDS[id] ?? []).map((f) => ({ label: `${f.label}, ${y.label.toLowerCase()}`, value: money(st[y.key][f.key] ?? 0, s.currency) }))),
    announce: `${def.name}: latest year ${fmtRatio(b, def.kind)}, previous year ${fmtRatio(a, def.kind)}.`,
    csv: [
      ...YEARS.flatMap((y) => (RATIO_FIELDS[id] ?? []).map((f) => ['Input', `${f.label}, ${y.label.toLowerCase()}`, st[y.key][f.key] ?? 0, unit])),
      ...ids.flatMap((r) => (['previous', 'latest'] as const).map((y) => ['Result', `${RATIOS[r].name}, ${y} year`, (() => { const x = value(r, y); return x === null ? 'not defined' : round(x, 4); })(), RATIOS[r].kind === 'percent' ? '%' : RATIOS[r].kind])),
      ...sensRows.flatMap((r) => [
        ['Sensitivity', `${r.n.label}, 10% lower`, r.lo === null ? 'not defined' : round(r.lo, 4), def.kind],
        ['Sensitivity', `${r.n.label}, 10% higher`, r.hi === null ? 'not defined' : round(r.hi, 4), def.kind],
      ]),
    ],
  };
}

/** A level that deserves a closer look even if it has improved (rules of thumb, stated as such in the text). */
function weak(id: RatioLabId, v: number): boolean {
  if (id === 'current-ratio') return v < 1;
  if (id === 'acid-test-ratio') return v < 0.8;
  if (id === 'gearing-ratio') return v > 50;
  if (id === 'gross-profit-margin' || id === 'profit-margin' || id === 'roce') return v < 0;
  return false;
}
