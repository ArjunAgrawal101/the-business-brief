/**
 * The Paper 2 answer builder: every calculation the course asks for, laid out
 * as an examiner wants to see it: the formula, the substitution, the working,
 * and the answer with its unit, rounded once, at the end. The arithmetic comes
 * from the platform's tested finance modules, so a figure here always matches
 * the Finance Desk. Defaults use the Paper 2 guide's invented Kestrel Kayaks.
 */
import { acidTestRatio, averageStock, creditorDays, currentRatio, debtorDays, gearingRatio, grossProfitMargin, profitMargin, roce, stockTurnoverDays, stockTurnoverTimes } from './ratios';
import { arr, discountFactor, fmtPayback, npv, payback, presentValues, type Rate } from './investment';
import { growthRate, marketShare } from './market';

export type FieldUnit = 'money' | 'units' | 'number' | 'percent' | 'years';

export interface Field {
  id: string;
  label: string;
  unit: FieldUnit;
  value: number;
}

export interface Solution {
  substitution: string;
  working: string[];
  answer: string;
  value: number;
  check?: string;
  meaning?: string;
}

export interface Calc {
  id: string;
  name: string;
  group: string;
  level: 'SL/HL' | 'HL';
  formula: string;
  fields: Field[];
  /** Returns a solution, or a message saying why the figures cannot give one. */
  solve: (v: Record<string, number>) => Solution | string;
  /** Where marks are lost on this calculation. */
  errors: string[];
}

/* ---------- Formatting: one rounding, at the end ---------- */

const grouped = (n: number, dp: number) =>
  n.toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp });
/** Money: whole dollars when exact, otherwise two decimal places. */
export const money = (n: number) => {
  const neg = n < 0;
  const a = Math.abs(n);
  const s = `$${grouped(a, Number.isInteger(Math.round(a * 100) / 100) ? 0 : 2)}`;
  return neg ? `−${s}` : s;
};
export const num = (n: number, dp = 2) => {
  const s = grouped(Math.abs(n), dp);
  return n < 0 ? `−${s}` : s;
};
/** A long working figure, shown to four decimal places with "..." when it continues. */
export const working = (n: number) => {
  const r = Math.round(n * 10000) / 10000;
  const exact = Math.abs(r - n) < 1e-12;
  return `${num(r, Number.isInteger(r) ? 0 : Math.min(4, (String(r).split('.')[1] ?? '').length))}${exact ? '' : '...'}`;
};
const pct = (n: number) => `${num(n, 2)}%`;

/* ---------- The calculations ---------- */

const KESTREL = { price: 500, vc: 300, fc: 60000, forecast: 400, target: 20000 };

export const CALCS: Calc[] = [
  {
    id: 'contribution',
    name: 'Contribution per unit',
    group: 'Break-even',
    level: 'SL/HL',
    formula: 'Contribution per unit = price − variable cost per unit',
    fields: [
      { id: 'price', label: 'Selling price per unit ($)', unit: 'money', value: KESTREL.price },
      { id: 'vc', label: 'Variable cost per unit ($)', unit: 'money', value: KESTREL.vc },
    ],
    solve: ({ price = 0, vc = 0 }) => {
      const c = price - vc;
      return {
        substitution: `= ${money(price)} − ${money(vc)}`,
        working: [`= ${money(c)}`],
        answer: `Contribution per unit = ${money(c)}`,
        value: c,
        meaning: c > 0 ? `Each unit sold adds ${money(c)} towards fixed costs, and then profit.` : 'A zero or negative contribution means no level of sales can cover the fixed costs.',
      };
    },
    errors: ['Subtracting the total variable cost instead of the cost per unit.', 'Leaving out the $ sign.'],
  },
  {
    id: 'break-even',
    name: 'Break-even quantity',
    group: 'Break-even',
    level: 'SL/HL',
    formula: 'Break-even quantity = fixed costs ÷ contribution per unit',
    fields: [
      { id: 'fc', label: 'Fixed costs ($)', unit: 'money', value: KESTREL.fc },
      { id: 'price', label: 'Selling price per unit ($)', unit: 'money', value: KESTREL.price },
      { id: 'vc', label: 'Variable cost per unit ($)', unit: 'money', value: KESTREL.vc },
    ],
    solve: ({ fc = 0, price = 0, vc = 0 }) => {
      const c = price - vc;
      if (c <= 0) return 'The price must be above the variable cost per unit, or the business never breaks even.';
      const q = fc / c;
      const up = Math.ceil(q - 1e-9);
      return {
        substitution: `= ${money(fc)} ÷ (${money(price)} − ${money(vc)})`,
        working: [`= ${money(fc)} ÷ ${money(c)}`, `= ${working(q)}`],
        answer: `Break-even quantity = ${num(up, 0)} units`,
        value: up,
        check: `Check: ${num(up, 0)} × ${money(c)} = ${money(up * c)}, which covers ${money(fc)} of fixed costs.`,
        meaning: Number.isInteger(q) ? undefined : `Rounded up: ${working(q)} units would leave a small loss, so the business needs ${num(up, 0)}.`,
      };
    },
    errors: ['Dividing by the price instead of the contribution per unit.', 'Rounding down: break-even quantity is rounded up to a whole unit.', 'Giving the answer in $ when units were asked for.'],
  },
  {
    id: 'margin-of-safety',
    name: 'Margin of safety',
    group: 'Break-even',
    level: 'SL/HL',
    formula: 'Margin of safety = actual (or forecast) output − break-even quantity',
    fields: [
      { id: 'q', label: 'Actual or forecast output (units)', unit: 'units', value: KESTREL.forecast },
      { id: 'fc', label: 'Fixed costs ($)', unit: 'money', value: KESTREL.fc },
      { id: 'price', label: 'Selling price per unit ($)', unit: 'money', value: KESTREL.price },
      { id: 'vc', label: 'Variable cost per unit ($)', unit: 'money', value: KESTREL.vc },
    ],
    solve: ({ q = 0, fc = 0, price = 0, vc = 0 }) => {
      const c = price - vc;
      if (c <= 0) return 'The price must be above the variable cost per unit to find a break-even quantity.';
      const be = Math.ceil(fc / c - 1e-9);
      const m = q - be;
      return {
        substitution: `Break-even = ${money(fc)} ÷ ${money(c)} = ${num(be, 0)} units; margin of safety = ${num(q, 0)} − ${num(be, 0)}`,
        working: [`= ${num(m, 0)} units`],
        answer: `Margin of safety = ${num(m, 0)} units`,
        value: m,
        meaning: m >= 0 ? `Sales could fall by ${num(m, 0)} units${q > 0 ? `, ${pct((m / q) * 100)} of the forecast,` : ''} before the business makes a loss.` : `Output is ${num(-m, 0)} units below break-even: a loss.`,
      };
    },
    errors: ['Working out break-even first is part of the method: show it.', 'Subtracting the wrong way round.', 'Mixing units and $: say which the answer is in.'],
  },
  {
    id: 'target-output',
    name: 'Target profit output',
    group: 'Break-even',
    level: 'SL/HL',
    formula: 'Target profit output = (fixed costs + target profit) ÷ contribution per unit',
    fields: [
      { id: 'fc', label: 'Fixed costs ($)', unit: 'money', value: KESTREL.fc },
      { id: 'target', label: 'Target profit ($)', unit: 'money', value: KESTREL.target },
      { id: 'price', label: 'Selling price per unit ($)', unit: 'money', value: 450 },
      { id: 'vc', label: 'Variable cost per unit ($)', unit: 'money', value: KESTREL.vc },
    ],
    solve: ({ fc = 0, target = 0, price = 0, vc = 0 }) => {
      const c = price - vc;
      if (c <= 0) return 'The price must be above the variable cost per unit.';
      const q = (fc + target) / c;
      const up = Math.ceil(q - 1e-9);
      return {
        substitution: `= (${money(fc)} + ${money(target)}) ÷ (${money(price)} − ${money(vc)})`,
        working: [`= ${money(fc + target)} ÷ ${money(c)}`, `= ${working(q)}`],
        answer: `Target profit output = ${num(up, 0)} units`,
        value: up,
        meaning: Number.isInteger(q) ? undefined : `Rounded up, because ${working(q)} units would fall just short of the target.`,
      };
    },
    errors: ['Leaving out the fixed costs and dividing only the target profit.', 'Rounding down.'],
  },
  {
    id: 'gpm',
    name: 'Gross profit margin',
    group: 'Profitability and liquidity',
    level: 'SL/HL',
    formula: 'Gross profit margin = gross profit ÷ sales revenue × 100',
    fields: [
      { id: 'gp', label: 'Gross profit ($)', unit: 'money', value: 76000 },
      { id: 'rev', label: 'Sales revenue ($)', unit: 'money', value: 190000 },
    ],
    solve: ({ gp = 0, rev = 0 }) => {
      const r = grossProfitMargin(gp, rev);
      if (r === null) return 'Sales revenue must be above zero.';
      return { substitution: `= ${money(gp)} ÷ ${money(rev)} × 100`, working: [`= ${working(r)}`], answer: `Gross profit margin = ${pct(r)}`, value: r };
    },
    errors: ['Using profit before interest and tax instead of gross profit.', 'Leaving out the % sign: a missing % has scored zero.'],
  },
  {
    id: 'pm',
    name: 'Profit margin',
    group: 'Profitability and liquidity',
    level: 'SL/HL',
    formula: 'Profit margin = profit before interest and tax ÷ sales revenue × 100',
    fields: [
      { id: 'pbit', label: 'Profit before interest and tax ($)', unit: 'money', value: 16000 },
      { id: 'rev', label: 'Sales revenue ($)', unit: 'money', value: 190000 },
    ],
    solve: ({ pbit = 0, rev = 0 }) => {
      const r = profitMargin(pbit, rev);
      if (r === null) return 'Sales revenue must be above zero.';
      return { substitution: `= ${money(pbit)} ÷ ${money(rev)} × 100`, working: [`= ${working(r)}`], answer: `Profit margin = ${pct(r)}`, value: r };
    },
    errors: ['Using profit for the period (after tax) instead of profit before interest and tax.', 'Rounding before the last step.'],
  },
  {
    id: 'roce',
    name: 'Return on capital employed (ROCE)',
    group: 'Profitability and liquidity',
    level: 'SL/HL',
    formula: 'ROCE = profit before interest and tax ÷ capital employed × 100, where capital employed = non-current liabilities + total equity',
    fields: [
      { id: 'pbit', label: 'Profit before interest and tax ($)', unit: 'money', value: 16000 },
      { id: 'ncl', label: 'Non-current liabilities ($)', unit: 'money', value: 40000 },
      { id: 'eq', label: 'Total equity ($)', unit: 'money', value: 120000 },
    ],
    solve: ({ pbit = 0, ncl = 0, eq = 0 }) => {
      const r = roce(pbit, ncl, eq);
      if (r === null) return 'Capital employed must be above zero.';
      return { substitution: `= ${money(pbit)} ÷ (${money(ncl)} + ${money(eq)}) × 100`, working: [`= ${money(pbit)} ÷ ${money(ncl + eq)} × 100`, `= ${working(r)}`], answer: `ROCE = ${pct(r)}`, value: r };
    },
    errors: ['Using total assets, or equity alone, as capital employed.', 'Using profit after interest and tax.'],
  },
  {
    id: 'current',
    name: 'Current ratio',
    group: 'Profitability and liquidity',
    level: 'SL/HL',
    formula: 'Current ratio = current assets ÷ current liabilities',
    fields: [
      { id: 'ca', label: 'Current assets ($)', unit: 'money', value: 72000 },
      { id: 'cl', label: 'Current liabilities ($)', unit: 'money', value: 80000 },
    ],
    solve: ({ ca = 0, cl = 0 }) => {
      const r = currentRatio(ca, cl);
      if (r === null) return 'Current liabilities must be above zero.';
      return {
        substitution: `= ${money(ca)} ÷ ${money(cl)}`,
        working: [`= ${working(r)}`],
        answer: `Current ratio = ${num(r, 2)} : 1`,
        value: r,
        meaning: r < 1 ? 'Below 1: current assets would not cover current liabilities.' : 'Current assets cover current liabilities; whether that is comfortable depends on how quickly the assets turn into cash.',
      };
    },
    errors: ['Writing the answer as a percentage: it is a ratio, x : 1.', 'Including non-current assets.'],
  },
  {
    id: 'acid',
    name: 'Acid test (quick) ratio',
    group: 'Profitability and liquidity',
    level: 'SL/HL',
    formula: 'Acid test ratio = (current assets − stock) ÷ current liabilities',
    fields: [
      { id: 'ca', label: 'Current assets ($)', unit: 'money', value: 72000 },
      { id: 'stock', label: 'Stock ($)', unit: 'money', value: 32000 },
      { id: 'cl', label: 'Current liabilities ($)', unit: 'money', value: 80000 },
    ],
    solve: ({ ca = 0, stock = 0, cl = 0 }) => {
      const r = acidTestRatio(ca, stock, cl);
      if (r === null) return 'Current liabilities must be above zero.';
      return { substitution: `= (${money(ca)} − ${money(stock)}) ÷ ${money(cl)}`, working: [`= ${money(ca - stock)} ÷ ${money(cl)}`, `= ${working(r)}`], answer: `Acid test ratio = ${num(r, 2)} : 1`, value: r };
    },
    errors: ['Forgetting to take stock away from current assets.', 'Writing it as a percentage.'],
  },
  {
    id: 'stock-turnover',
    name: 'Stock turnover',
    group: 'Efficiency (HL)',
    level: 'HL',
    formula: 'Stock turnover (number of times) = cost of sales ÷ average stock; stock turnover (days) = average stock ÷ cost of sales × 365, where average stock = (opening stock + closing stock) ÷ 2',
    fields: [
      { id: 'cos', label: 'Cost of sales ($)', unit: 'money', value: 114000 },
      { id: 'open', label: 'Opening stock ($)', unit: 'money', value: 26000 },
      { id: 'close', label: 'Closing stock ($)', unit: 'money', value: 30000 },
    ],
    solve: ({ cos = 0, open = 0, close = 0 }) => {
      const times = stockTurnoverTimes(cos, open, close);
      const days = stockTurnoverDays(cos, open, close);
      if (times === null || days === null) return 'Cost of sales and average stock must be above zero.';
      const avg = averageStock(open, close);
      return {
        substitution: `Average stock = (${money(open)} + ${money(close)}) ÷ 2 = ${money(avg)}`,
        working: [`Times: ${money(cos)} ÷ ${money(avg)} = ${working(times)}`, `Days: ${money(avg)} ÷ ${money(cos)} × 365 = ${working(days)}`],
        answer: `Stock turnover = ${num(times, 2)} times a year, or ${num(days, 2)} days`,
        value: times,
      };
    },
    errors: ['Using closing stock instead of average stock.', 'Using sales revenue instead of cost of sales.'],
  },
  {
    id: 'debtor-days',
    name: 'Debtor days',
    group: 'Efficiency (HL)',
    level: 'HL',
    formula: 'Debtor days = debtors ÷ total sales revenue × 365',
    fields: [
      { id: 'debtors', label: 'Debtors ($)', unit: 'money', value: 15600 },
      { id: 'rev', label: 'Total sales revenue ($)', unit: 'money', value: 190000 },
    ],
    solve: ({ debtors = 0, rev = 0 }) => {
      const d = debtorDays(debtors, rev);
      if (d === null) return 'Sales revenue must be above zero.';
      return { substitution: `= ${money(debtors)} ÷ ${money(rev)} × 365`, working: [`= ${working(d)}`], answer: `Debtor days = ${num(d, 2)} days`, value: d };
    },
    errors: ['Multiplying by 100 instead of 365.', 'Leaving out the unit: days.'],
  },
  {
    id: 'creditor-days',
    name: 'Creditor days',
    group: 'Efficiency (HL)',
    level: 'HL',
    formula: 'Creditor days = creditors ÷ cost of sales × 365',
    fields: [
      { id: 'creditors', label: 'Creditors ($)', unit: 'money', value: 18000 },
      { id: 'cos', label: 'Cost of sales ($)', unit: 'money', value: 114000 },
    ],
    solve: ({ creditors = 0, cos = 0 }) => {
      const d = creditorDays(creditors, cos);
      if (d === null) return 'Cost of sales must be above zero.';
      return { substitution: `= ${money(creditors)} ÷ ${money(cos)} × 365`, working: [`= ${working(d)}`], answer: `Creditor days = ${num(d, 2)} days`, value: d };
    },
    errors: ['Dividing by sales revenue instead of cost of sales.'],
  },
  {
    id: 'gearing',
    name: 'Gearing ratio',
    group: 'Efficiency (HL)',
    level: 'HL',
    formula: 'Gearing ratio = non-current liabilities ÷ capital employed × 100, where capital employed = non-current liabilities + total equity',
    fields: [
      { id: 'ncl', label: 'Non-current liabilities ($)', unit: 'money', value: 40000 },
      { id: 'eq', label: 'Total equity ($)', unit: 'money', value: 120000 },
    ],
    solve: ({ ncl = 0, eq = 0 }) => {
      const g = gearingRatio(ncl, eq);
      if (g === null) return 'Capital employed must be above zero.';
      return { substitution: `= ${money(ncl)} ÷ (${money(ncl)} + ${money(eq)}) × 100`, working: [`= ${money(ncl)} ÷ ${money(ncl + eq)} × 100`, `= ${working(g)}`], answer: `Gearing ratio = ${pct(g)}`, value: g };
    },
    errors: ['Dividing by equity alone.', 'Including current liabilities.'],
  },
  {
    id: 'payback',
    name: 'Payback period',
    group: 'Investment appraisal',
    level: 'SL/HL',
    formula: 'Payback period: the time for cumulative net cash flow to recover the capital cost; within the payback year, months = (cost still to recover ÷ that year\'s net cash flow) × 12',
    fields: [
      { id: 'cost', label: 'Capital cost ($)', unit: 'money', value: 20000 },
      { id: 'y1', label: 'Net cash flow, year 1 ($)', unit: 'money', value: 6000 },
      { id: 'y2', label: 'Net cash flow, year 2 ($)', unit: 'money', value: 8000 },
      { id: 'y3', label: 'Net cash flow, year 3 ($)', unit: 'money', value: 9000 },
      { id: 'y4', label: 'Net cash flow, year 4 ($)', unit: 'money', value: 9000 },
    ],
    solve: (v) => {
      const returns = [v.y1 ?? 0, v.y2 ?? 0, v.y3 ?? 0, v.y4 ?? 0];
      const p = { id: 'p', label: 'Project', capitalCost: v.cost ?? 0, returns };
      const pb = payback(p);
      if (!pb) return 'The capital cost is not recovered within these four years.';
      let cum = -(v.cost ?? 0);
      const steps = returns.map((r, i) => {
        cum += r;
        return `End of year ${i + 1}: ${money(cum)}`;
      });
      const before = -((v.cost ?? 0) - returns.slice(0, pb.inYear - 1).reduce((a, b) => a + b, 0));
      const flow = returns[pb.inYear - 1] ?? 0;
      return {
        substitution: `Cumulative net cash flow, starting from −${money(v.cost ?? 0)} at year 0`,
        working: [...steps, `Months into year ${pb.inYear} = ${money(-before)} ÷ ${money(flow)} × 12 = ${working(pb.months)}`],
        answer: `Payback period = ${fmtPayback(pb)}`,
        value: pb.total,
        meaning: 'Time periods are rounded up in practice: the cost is not recovered until the end of that month.',
      };
    },
    errors: ['Treating the payback year\'s cash as if it all arrived at the start of the year.', 'Giving years as a decimal without saying so, or rounding months down.'],
  },
  {
    id: 'arr',
    name: 'Average rate of return (ARR)',
    group: 'Investment appraisal',
    level: 'SL/HL',
    formula: 'ARR = ((total returns − capital cost) ÷ years of usage) ÷ capital cost × 100',
    fields: [
      { id: 'cost', label: 'Capital cost ($)', unit: 'money', value: 20000 },
      { id: 'y1', label: 'Net cash flow, year 1 ($)', unit: 'money', value: 6000 },
      { id: 'y2', label: 'Net cash flow, year 2 ($)', unit: 'money', value: 8000 },
      { id: 'y3', label: 'Net cash flow, year 3 ($)', unit: 'money', value: 9000 },
      { id: 'y4', label: 'Net cash flow, year 4 ($)', unit: 'money', value: 9000 },
    ],
    solve: (v) => {
      const returns = [v.y1 ?? 0, v.y2 ?? 0, v.y3 ?? 0, v.y4 ?? 0];
      const cost = v.cost ?? 0;
      const r = arr({ id: 'p', label: 'Project', capitalCost: cost, returns });
      if (r === null) return 'The capital cost must be above zero.';
      const total = returns.reduce((a, b) => a + b, 0);
      return {
        substitution: `= ((${money(total)} − ${money(cost)}) ÷ 4) ÷ ${money(cost)} × 100`,
        working: [`= (${money(total - cost)} ÷ 4) ÷ ${money(cost)} × 100`, `= ${money((total - cost) / 4)} ÷ ${money(cost)} × 100`, `= ${working(r)}`],
        answer: `ARR = ${pct(r)}`,
        value: r,
      };
    },
    errors: ['Forgetting to subtract the capital cost from total returns.', 'Dividing by the wrong number of years.'],
  },
  {
    id: 'npv',
    name: 'Net present value (NPV)',
    group: 'Investment appraisal',
    level: 'HL',
    formula: "NPV = sum of the present values of the returns − the original cost, using the discount factors in the guide's table",
    fields: [
      { id: 'cost', label: 'Capital cost ($)', unit: 'money', value: 20000 },
      { id: 'rate', label: 'Discount rate (%): 4, 6, 8, 10 or 20', unit: 'percent', value: 10 },
      { id: 'y1', label: 'Net cash flow, year 1 ($)', unit: 'money', value: 6000 },
      { id: 'y2', label: 'Net cash flow, year 2 ($)', unit: 'money', value: 8000 },
      { id: 'y3', label: 'Net cash flow, year 3 ($)', unit: 'money', value: 9000 },
      { id: 'y4', label: 'Net cash flow, year 4 ($)', unit: 'money', value: 9000 },
    ],
    solve: (v) => {
      const rate = v.rate ?? 10;
      if (![4, 6, 8, 10, 20].includes(rate)) return "The guide's discount table gives factors for 4%, 6%, 8%, 10% and 20% only.";
      const returns = [v.y1 ?? 0, v.y2 ?? 0, v.y3 ?? 0, v.y4 ?? 0];
      const cost = v.cost ?? 0;
      const p = { id: 'p', label: 'Project', capitalCost: cost, returns };
      const pvs = presentValues(p, rate as Rate);
      const n = npv(p, rate as Rate);
      if (n === null) return 'Enter the returns for each year.';
      const total = pvs.reduce((a, b) => a + b, 0);
      return {
        substitution: returns.map((r, i) => `${money(r)} × ${discountFactor(rate as Rate, i + 1)}`).join(' + ') + ` − ${money(cost)}`,
        working: [...pvs.map((pv, i) => `Year ${i + 1}: ${money(Math.round(pv * 100) / 100)}`), `Total present value = ${money(Math.round(total * 100) / 100)}`],
        answer: `NPV = ${money(Math.round(n * 100) / 100)}`,
        value: n,
        meaning: n >= 0 ? `Positive at ${rate}%: the returns are worth more today than the cost.` : `Negative at ${rate}%: the returns are worth less today than the cost.`,
      };
    },
    errors: ['Giving the total present value as the NPV, without subtracting the cost.', 'Discounting the capital cost, which is paid now.'],
  },
  {
    id: 'capacity',
    name: 'Capacity utilization rate',
    group: 'Operations (HL)',
    level: 'HL',
    formula: 'Capacity utilization rate = actual output ÷ productive capacity × 100',
    fields: [
      { id: 'out', label: 'Actual output (units)', unit: 'units', value: 380 },
      { id: 'cap', label: 'Productive capacity (units)', unit: 'units', value: 500 },
    ],
    solve: ({ out = 0, cap = 0 }) => {
      if (cap <= 0) return 'Productive capacity must be above zero.';
      const r = (out / cap) * 100;
      return { substitution: `= ${num(out, 0)} ÷ ${num(cap, 0)} × 100`, working: [`= ${working(r)}`], answer: `Capacity utilization rate = ${pct(r)}`, value: r };
    },
    errors: ['Dividing capacity by output.', 'Leaving out the % sign.'],
  },
  {
    id: 'productivity',
    name: 'Productivity rate',
    group: 'Operations (HL)',
    level: 'HL',
    formula: 'Productivity rate = total output ÷ total input × 100',
    fields: [
      { id: 'out', label: 'Total output (value, $)', unit: 'money', value: 190000 },
      { id: 'inp', label: 'Total input (value, $)', unit: 'money', value: 174000 },
    ],
    solve: ({ out = 0, inp = 0 }) => {
      if (inp <= 0) return 'Total input must be above zero.';
      const r = (out / inp) * 100;
      return { substitution: `= ${money(out)} ÷ ${money(inp)} × 100`, working: [`= ${working(r)}`], answer: `Productivity rate = ${pct(r)}`, value: r };
    },
    errors: ['Measuring output and input in different units without saying how they were valued.'],
  },
  {
    id: 'share',
    name: 'Market share',
    group: 'Marketing',
    level: 'SL/HL',
    formula: "Market share = the firm's sales ÷ total sales in the market × 100",
    fields: [
      { id: 'firm', label: "The firm's sales ($)", unit: 'money', value: 190000 },
      { id: 'market', label: 'Total market sales ($)', unit: 'money', value: 2000000 },
    ],
    solve: ({ firm = 0, market = 0 }) => {
      const r = marketShare(firm, market);
      if (r === null) return 'Total market sales must be above zero.';
      return { substitution: `= ${money(firm)} ÷ ${money(market)} × 100`, working: [`= ${working(r)}`], answer: `Market share = ${pct(r)}`, value: r };
    },
    errors: ["Using the firm's growth instead of its sales.", 'Mixing value and volume figures.'],
  },
  {
    id: 'growth',
    name: 'Market (or sales) growth',
    group: 'Marketing',
    level: 'SL/HL',
    formula: 'Growth = (this period − last period) ÷ last period × 100',
    fields: [
      { id: 'last', label: 'Last period ($)', unit: 'money', value: 180000 },
      { id: 'now', label: 'This period ($)', unit: 'money', value: 190000 },
    ],
    solve: ({ last = 0, now = 0 }) => {
      const r = growthRate(last, now);
      if (r === null) return 'The last period must be above zero.';
      return { substitution: `= (${money(now)} − ${money(last)}) ÷ ${money(last)} × 100`, working: [`= ${money(now - last)} ÷ ${money(last)} × 100`, `= ${working(r)}`], answer: `Growth = ${pct(r)}`, value: r, meaning: 'A change in a percentage, such as a share moving from 20% to 25%, is 5 percentage points, not 5%.' };
    },
    errors: ['Dividing by this period instead of the last.', 'Calling a rise from 20% to 25% a 5% increase: it is 5 percentage points, or a 25% increase.'],
  },
];

export const calcById = (id: string) => CALCS.find((c) => c.id === id);
