/**
 * The Financial Laboratory against values worked by hand. Every expected figure
 * below was calculated independently of the code (by hand and in a separate
 * Python script), not copied from the code's output. The guide's own worked
 * layouts (figures 10 and 11, p. 63) are used as tests too.
 */
import { describe, expect, it } from 'vitest';
import { budgetReport, fmtBudget, fmtVariance, variance, type BudgetLine } from '../../src/lib/budget';
import { customForecast, rollForward } from '../../src/lib/cashflow';
import { marginOfSafetyShare, marginOfSafetyValue, operatingLeverage } from '../../src/lib/finance';
import { formulaDiscountFactor, irr, npv, npvByFormula, signChange, type Project } from '../../src/lib/investment';
import { balances, costOfSalesFromStock, derive, profitOrLoss } from '../../src/lib/ratios';
import { BREAK_EVEN_BUILDERS, BREAK_EVEN_DEFAULTS, breakEvenState, validateBreakEven, type BreakEvenState } from '../../src/lib/finance-lab/breakeven';
import { BUDGET_DEFAULTS, buildBudget, validateBudget } from '../../src/lib/finance-lab/budget';
import { ACCOUNTS, BREAK_EVEN, CASH_FLOW, OPENING_STOCK, PROFIT_AND_LOSS, PROJECT, SETTINGS } from '../../src/lib/finance-lab/business';
import { buildCash, CASH_DEFAULTS, cashState, forecastOf, monthLabels, validateCash } from '../../src/lib/finance-lab/cash';
import { GROUPS, LAB, labEntry, labForRegister } from '../../src/lib/finance-lab/catalogue';
import { arrBarsSvg, cashLineSvg, contributionBarsSvg, discountedSvg, npvProfileSvg, ratioBarsSvg, varianceBarsSvg, waterfallSvg } from '../../src/lib/finance-lab/charts';
import { checkValue, cleanSettings, fillLabel } from '../../src/lib/finance-lab/fields';
import { cashGridHtml, budgetGridHtml, yearsHtml } from '../../src/lib/finance-lab/forms';
import { FORMULAS, linear } from '../../src/lib/finance-lab/formulas';
import { buildArr, buildNpv, buildPayback, INVESTMENT_DEFAULTS, validateInvestment, type InvestmentState } from '../../src/lib/finance-lab/investment';
import { buildRatio, RATIO_LAB_IDS, ratioDefaults, ratioState, validateRatio } from '../../src/lib/finance-lab/ratios';
import { defaultReport } from '../../src/lib/finance-lab/registry';
import { formulaHtml, regionsHtml } from '../../src/lib/finance-lab/render';
import { buildStatement, fmtStatement, STATEMENT_DEFAULTS, statementLines, validateStatement } from '../../src/lib/finance-lab/statement';
import type { FieldSpec, LabReport } from '../../src/lib/finance-lab/types';
import { csvCell, toCsv } from '../../src/lib/finance-lab/util';
import { loadCorpus } from './helpers/corpus';

const S = SETTINGS;
const c = loadCorpus();
const be = (over: Partial<BreakEvenState> = {}): BreakEvenState => ({ ...BREAK_EVEN_DEFAULTS, ...over });
const fig = (r: LabReport, label: string) => r.figures.find((f) => f.label === label)?.value;

describe('the example business hangs together', () => {
  it('both statements balance and retained earnings carry forward', () => {
    expect(balances(ACCOUNTS.previous)).toBe(true);
    expect(balances(ACCOUNTS.latest)).toBe(true);
    // 120,200 + this year's retained profit of 36,700 = 156,900
    expect(ACCOUNTS.previous.retainedEarnings + derive(ACCOUNTS.latest).retainedProfit).toBe(ACCOUNTS.latest.retainedEarnings);
  });

  it('stock, cost of sales, cash and the profit and loss defaults agree', () => {
    expect(OPENING_STOCK.latest).toBe(ACCOUNTS.previous.stock);
    expect(costOfSalesFromStock(PROFIT_AND_LOSS.openingStock, PROFIT_AND_LOSS.purchases, PROFIT_AND_LOSS.closingStock)).toBe(541500);
    expect(PROFIT_AND_LOSS.costOfSales).toBe(ACCOUNTS.latest.costOfSales);
    expect(PROFIT_AND_LOSS.closingStock).toBe(ACCOUNTS.latest.stock);
    expect(PROFIT_AND_LOSS.salesRevenue).toBe(ACCOUNTS.latest.salesRevenue);
    expect(CASH_FLOW.opening).toBe(ACCOUNTS.latest.cash);
    expect(CASH_FLOW.outflows.find((l) => l.id === 'out-9')?.values[0]).toBe(ACCOUNTS.latest.tax);
  });
});

describe('new finance functions', () => {
  it('margin of safety as a share and in value', () => {
    expect(marginOfSafetyShare(3600, 579)).toBeCloseTo(16.0833, 4);
    expect(marginOfSafetyShare(0, 0)).toBeNull();
    expect(marginOfSafetyValue(579, 24)).toBe(13896);
    expect(marginOfSafetyValue(-141, 24)).toBe(-3384);
  });

  it('degree of operating leverage, and not at or below break-even', () => {
    expect(operatingLeverage(34560, 5560)).toBeCloseTo(6.2158, 4);
    expect(operatingLeverage(160000, 40000)).toBe(4); // the notes' Wrenhurst example (5.6)
    expect(operatingLeverage(29000, 0)).toBeNull();
    expect(operatingLeverage(20000, -9000)).toBeNull();
  });

  it('profit or loss subtotals and cost of sales from stock', () => {
    expect(profitOrLoss({ salesRevenue: 958800, costOfSales: 541500, expenses: 332100, interest: 9600, tax: 18900, dividends: 20000 })).toEqual({
      grossProfit: 417300,
      pbit: 85200,
      profitBeforeTax: 75600,
      profitForPeriod: 56700,
      retainedProfit: 36700,
    });
    // The guide's figure 6 (p. 59), $m
    expect(profitOrLoss({ salesRevenue: 1500, costOfSales: 500, expenses: 300, interest: 100, tax: 200, dividends: 150 }).retainedProfit).toBe(250);
    expect(costOfSalesFromStock(60, 380, 70)).toBe(370);
  });
});

describe('budget variances (3.9)', () => {
  it('marks each variance by its effect on profit', () => {
    expect(variance('revenue', 500, 520)).toMatchObject({ difference: 20, amount: 20, mark: 'F' });
    expect(variance('revenue', 40, 35)).toMatchObject({ amount: 5, mark: 'A' });
    expect(variance('cost', 150, 180)).toMatchObject({ amount: 30, mark: 'A' });
    expect(variance('cost', 80, 75)).toMatchObject({ amount: 5, mark: 'F' });
    expect(variance('cost', 15, 15)).toMatchObject({ amount: 0, mark: null });
    expect(variance('cost', 0, 50).share).toBeNull();
    expect(variance('cost', 96000, 104800).share).toBeCloseTo(9.1667, 4);
  });

  it('reproduces the guide’s budget (figure 11, p. 63)', () => {
    const lines: BudgetLine[] = [
      { id: 'a', label: 'Sales revenue', kind: 'revenue', budget: 500, actual: 520 },
      { id: 'b', label: 'Interest earned', kind: 'revenue', budget: 40, actual: 35 },
      { id: 'c', label: 'Salaries and wages', kind: 'cost', budget: 150, actual: 180 },
      { id: 'd', label: 'Materials', kind: 'cost', budget: 80, actual: 75 },
      { id: 'e', label: 'Rent', kind: 'cost', budget: 15, actual: 15 },
      { id: 'f', label: 'Advertising', kind: 'cost', budget: 8, actual: 10 },
      { id: 'g', label: 'Electricity', kind: 'cost', budget: 12, actual: 9 },
    ];
    const b = budgetReport(lines);
    expect(fmtVariance(b.totalRevenue.variance)).toBe('15 [F]');
    expect([b.totalCost.budget, b.totalCost.actual, fmtVariance(b.totalCost.variance)]).toEqual([265, 289, '24 [A]']);
    expect([b.surplus.budget, b.surplus.actual, fmtVariance(b.surplus.variance)]).toEqual([275, 266, '9 [A]']);
    expect(fmtVariance(b.costs.find((r) => r.id === 'e')!)).toBe('0');
    expect(b.ranked[0]?.label).toBe('Salaries and wages');
  });

  it('works the example budget', () => {
    const b = budgetReport(BUDGET_DEFAULTS.lines);
    expect([b.totalRevenue.variance.amount, b.totalRevenue.variance.mark]).toEqual([900, 'F']);
    expect([b.totalCost.variance.amount, b.totalCost.variance.mark]).toEqual([7950, 'A']);
    expect([b.surplus.budget, b.surplus.actual, b.surplus.variance.amount, b.surplus.variance.mark]).toEqual([27600, 20550, 7050, 'A']);
    expect(b.favourableTotal).toBe(9650);
    expect(b.adverseTotal).toBe(16700);
    expect(b.ranked.find((r) => r.mark === 'A')?.label).toBe('Green beans');
    expect(fmtBudget(-1234)).toBe('(1,234)');
  });
});

describe('cash flow forecasts (3.7)', () => {
  it('reproduces the guide’s forecast (figure 10, p. 63)', () => {
    const f = customForecast({
      months: ['January', 'February', 'March'],
      opening: 8,
      overdraftLimit: 0,
      inflows: [
        { id: 'a', label: 'Cash sales revenue', values: [300, 300, 300] },
        { id: 'b', label: 'Tax refund', values: [0, 3, 0] },
      ],
      outflows: [
        { id: 'c', label: 'Rent', values: [2, 0, 0] },
        { id: 'd', label: 'Packaging', values: [15, 15, 15] },
        { id: 'e', label: 'Salaries and wages', values: [50, 50, 50] },
        { id: 'f', label: 'Cost of sales', values: [220, 220, 220] },
        { id: 'g', label: 'Heating and lighting', values: [4, 4, 4] },
        { id: 'h', label: 'Delivery', values: [15, 15, 15] },
      ],
    });
    expect(f.totalIn).toEqual([300, 303, 300]);
    expect(f.totalOut).toEqual([306, 304, 304]);
    expect(f.net).toEqual([-6, -1, -4]);
    expect(f.closing).toEqual([2, 1, -3]);
    expect(f.opening).toEqual([8, 2, 1]);
    expect(f.status).toEqual(['credit', 'credit', 'beyond']);
  });

  it('reproduces the notes’ Ridgeway Cycles forecast, with a negative balance', () => {
    const f = customForecast({
      months: ['April', 'May', 'June'],
      opening: 2000,
      overdraftLimit: 2000,
      inflows: [{ id: 'a', label: 'All inflows', values: [9000, 10000, 12000] }],
      outflows: [{ id: 'b', label: 'All outflows', values: [8000, 14500, 8500] }],
    });
    expect(f.closing).toEqual([3000, -1500, 2000]);
    expect(f.status).toEqual(['credit', 'overdraft', 'credit']);
    expect(f.lowest).toEqual({ value: -1500, month: 1 });
    expect(f.firstBeyond).toBeNull();
  });

  it('rolls balances forward in cents, from an overdrawn start', () => {
    const r = rollForward(2, [[10, 0]], [[0, 25]], -5, 10);
    expect(r.closing).toEqual([5, -20]);
    expect(r.status).toEqual(['credit', 'beyond']);
    expect(r.beyond).toBe(1);
    // 0.1 + 0.2 kept exact: one cent of rounding would show here
    expect(customForecast({ months: ['A'], opening: 0.1, overdraftLimit: 0, inflows: [{ id: 'x', label: 'x', values: [0.2] }], outflows: [] }).closing[0]).toBe(0.3);
  });

  it('works the example forecast, and the stress test', () => {
    const f = forecastOf(CASH_DEFAULTS);
    expect(f.closing).toEqual([-6200, -14000, -25700, -24200, -19800, -13200]);
    expect(f.lowest).toEqual({ value: -25700, month: 2 });
    expect(f.firstBeyond).toBe(2);
    expect(f.status.filter((x) => x === 'beyond')).toHaveLength(2);
    const low = forecastOf(CASH_DEFAULTS, 0.9);
    expect(low.closing).toEqual([-14550, -28900, -47950, -54400, -58400, -60600]);
    expect(forecastOf(CASH_DEFAULTS, 1.05).closing.at(-1)).toBe(10500);
    expect(forecastOf(CASH_DEFAULTS, 1.1).lowest).toEqual({ value: -3450, month: 2 });
  });

  it('labels the months from any start, across the year end', () => {
    expect(monthLabels(10, 4)).toEqual(['November', 'December', 'January', 'February']);
  });

  it('checks typed figures', () => {
    const ok = { startMonth: 0, months: 2, opening: 0, overdraftLimit: 0, inflows: [{ id: 'in-1', label: 'Sales', values: [1, 2] }], outflows: [] };
    expect(validateCash(ok)).toEqual([]);
    expect(validateCash({ ...ok, overdraftLimit: -5 }).map((p) => p.field)).toEqual(['overdraftLimit']);
    expect(validateCash({ ...ok, inflows: [{ id: 'in-1', label: ' ', values: [null, -3] }] }).map((p) => p.field)).toEqual(['in-1.label', 'in-1.m0', 'in-1.m1']);
    expect(validateCash({ ...ok, inflows: [] })[0]?.message).toMatch(/at least one/);
    expect(cashState({ ...ok, months: 3 }).inflows[0]?.values).toEqual([1, 2, 0]);
  });
});

describe('investment appraisal with unequal cash flows (3.8)', () => {
  const p: Project = { id: 'p', label: 'Line', capitalCost: PROJECT.capitalCost, returns: [...PROJECT.returns] };
  const st: InvestmentState = { ...INVESTMENT_DEFAULTS };

  it('NPV at every rate in the guide’s table', () => {
    expect(npv(p, 4)).toBeCloseTo(21322, 4);
    expect(npv(p, 6)).toBeCloseTo(13188.4, 4);
    expect(npv(p, 8)).toBeCloseTo(5736, 4);
    expect(npv(p, 10)).toBeCloseTo(-1096.4, 4);
    expect(npv(p, 20)).toBeCloseTo(-28010.2, 4);
    expect(signChange(p)).toEqual({ below: 8, above: 10 });
  });

  it('the internal rate of return and the discount formula (enrichment)', () => {
    expect(formulaDiscountFactor(10, 1)).toBeCloseTo(0.909091, 6);
    expect(Math.abs(npvByFormula(p, 8) - (npv(p, 8) ?? 0))).toBeLessThan(5); // the table rounds to four places
    expect(irr(p)).toBeCloseTo(9.668, 3);
    expect(irr({ ...p, returns: [10000, 10000] })).toBeNull(); // never repays the cost
    expect(signChange({ ...p, returns: [100000, 100000] })).toBeNull(); // positive at every table rate
  });

  it('payback, ARR and NPV reports', () => {
    const pb = buildPayback(st, S);
    expect(pb.headline.value).toBe('3 years and 10.1 months');
    expect(fig(pb, 'In years, as a decimal')).toBe('3.84');
    const arr = buildArr(st, S);
    expect(arr.headline.value).toBe('6.67%');
    expect(fig(arr, 'Average profit a year')).toBe('$8,000.00');
    const n = buildNpv(st, S);
    expect(n.headline.value).toBe('$5,736');
    expect(fig(n, 'NPV changes sign')).toBe('between 8% and 10%');
    expect(fig(n, 'Internal rate of return')).toBe('about 9.7%');
    expect(n.sensitivity?.table.rows.map((r) => r.cells[0])).toEqual(['$21,322', '$13,188', '$5,736', '−$1,096', '−$28,010']);
  });

  it('when returns fall short, and with a year of net outflow', () => {
    const short = buildPayback({ ...st, returns: [10000, 10000] }, S);
    expect(short.headline.value).toBe('Not within its life');
    const lower = buildPayback({ ...st, returns: st.returns.map((r) => r * 0.9) }, S);
    expect(lower.headline.value).toBe('4 years and 2.6 months');
    expect(buildArr({ ...st, returns: st.returns.map((r) => r * 0.9) }, S).headline.value).toBe('4.00%');
    // A refit in year 2 costs more than it earns: cumulative −120,000, −80,000, −90,000, −30,000, +30,000
    const dip = buildPayback({ ...st, returns: [40000, -10000, 60000, 60000] }, S);
    expect(dip.headline.value).toBe('3 years and 6 months');
  });

  it('checks typed figures', () => {
    expect(validateInvestment({ label: 'x', capitalCost: 0, returns: [1], rate: 8 }).map((x) => x.field)).toEqual(['cost']);
    expect(validateInvestment({ label: 'x', capitalCost: 10, returns: [null, 2], rate: 7 }).map((x) => x.field)).toEqual(['r1', 'rate']);
    expect(validateInvestment({ label: 'x', capitalCost: 10, returns: Array(11).fill(1), rate: 8 })[0]?.message).toMatch(/10 years/);
  });
});

describe('costs and break-even calculators (5.5)', () => {
  it('break-even quantity and revenue for the example', () => {
    const q = BREAK_EVEN_BUILDERS['break-even-quantity'](be(), S);
    expect(q.headline.value).toBe('3,021 bags a month');
    expect(q.headline.note).toBe('exactly 3,020.83, rounded up');
    expect(fig(q, 'Capacity needed to break even')).toBe('67.1%');
    const r = BREAK_EVEN_BUILDERS['break-even-revenue'](be(), S);
    expect(r.headline.value).toBe('$72,500.00 a month');
    expect(fig(r, 'Revenue at the whole-unit break-even')).toBe('$72,504.00');
  });

  it('the price and variable cost grid, 10 per cent either way', () => {
    const g = BREAK_EVEN_BUILDERS['break-even-quantity'](be(), S).sensitivity!;
    expect(g.table.rows.map((r) => r.cells)).toEqual([
      ['3,357 bags', '4,028 bags', '5,035 bags'],
      ['2,627 bags', '3,021 bags', '3,554 bags'],
      ['2,158 bags', '2,417 bags', '2,747 bags'],
    ]);
    expect(g.table.rows[1]?.baseCell).toBe(1);
  });

  it('margin of safety, its value and operating leverage', () => {
    const m = BREAK_EVEN_BUILDERS['margin-of-safety'](be(), S);
    expect(m.headline).toMatchObject({ value: '579 bags', note: '16.1% of forecast sales' });
    expect(fig(m, 'Margin of safety in value')).toBe('$13,896.00');
    expect(fig(m, 'Degree of operating leverage')).toBe('6.22');
    expect(m.sensitivity?.table.rows.map((r) => r.cells[3])).toEqual(['Loss $4,808.00', 'Loss $1,352.00', 'Profit $2,104.00', 'Profit $5,560.00', 'Profit $9,016.00']);
    expect(m.sensitivity?.reading).toContain('at 2,880 bags (−20%) the business loses $1,352.00');
    const below = BREAK_EVEN_BUILDERS['margin-of-safety'](be({ quantity: 2880 }), S);
    expect(below.headline.value).toBe('−141 bags');
    expect(fig(below, 'Degree of operating leverage')).toBe('n/a');
  });

  it('contribution and profit, and a loss', () => {
    const c = BREAK_EVEN_BUILDERS.contribution(be(), S);
    expect(c.headline).toMatchObject({ value: '$9.60', note: 'Total contribution $34,560.00 from 3,600 bags' });
    expect(fig(c, 'Profit')).toBe('$5,560.00');
    expect(c.sensitivity?.reading).toContain('turns the profit of $5,560.00 into a loss of $3,080.00');
    const loss = BREAK_EVEN_BUILDERS.contribution(be({ quantity: 2000 }), S);
    expect(fig(loss, 'Loss')).toBe('$9,800.00'); // 2,000 × 9.60 − 29,000
  });

  it('target profit output and target price', () => {
    const t = BREAK_EVEN_BUILDERS['target-profit'](be(), S);
    expect(t.headline.value).toBe('3,855 bags a month');
    expect(fig(t, 'Target price at 3,600 bags')).toBe('$24.68');
    expect(t.sensitivity?.reading).toContain('$14,200.00 a month');
    expect(t.sensitivity?.table.rows.map((r) => r.cells[0])).toEqual(['3,021 bags', '3,438 bags', '3,855 bags', '4,271 bags', '4,688 bags']);
  });

  it('zero and negative contribution have no break-even point', () => {
    for (const vc of [24, 30]) {
      const st = be({ variableCost: vc });
      expect(BREAK_EVEN_BUILDERS['break-even-quantity'](st, S).headline.value).toBe('No break-even point');
      expect(BREAK_EVEN_BUILDERS['break-even-revenue'](st, S).headline.value).toBe('No break-even point');
      expect(BREAK_EVEN_BUILDERS['margin-of-safety'](st, S).headline.value).toBe('Not defined');
      expect(BREAK_EVEN_BUILDERS['target-profit'](st, S).headline.value).toBe('Not possible');
    }
    // The grid still finds the break-even point a price rise would create: at $26.40 and $21.60, 29,000 ÷ 4.80 = 6,041.67
    const g = BREAK_EVEN_BUILDERS['break-even-quantity'](be({ variableCost: 24 }), S).sensitivity!;
    expect(g.table.rows[1]?.cells[1]).toBe('None');
    expect(g.table.rows[2]?.cells[0]).toBe('6,042 bags');
  });

  it('uses the reader’s own words for units and the period', () => {
    const words = cleanSettings({ currency: '€', unit: 'loaf', units: 'loaves', period: 'week' }, S);
    const q = BREAK_EVEN_BUILDERS['break-even-quantity'](be(), words);
    expect(q.headline.value).toBe('3,021 loaves a week');
    expect(fig(q, 'Contribution per loaf')).toBe('€9.60');
    expect(cleanSettings({ currency: '<b>', unit: ' ', units: 'x'.repeat(40), period: 'decade' }, S)).toEqual(S);
    expect(fillLabel('Price per {unit}, {units} per {period}', words)).toBe('Price per loaf, loaves per week');
  });

  it('checks typed figures', () => {
    const raw = { price: 0, variableCost: -1, fixedCosts: null, quantity: 2.5, capacity: 4500 };
    expect(validateBreakEven('break-even-quantity', raw).map((p) => p.message)).toEqual([
      'The selling price must be more than zero.',
      'The variable cost per unit cannot be negative.',
      'Enter a number for fixed costs.',
      'Forecast sales must be a whole number.',
    ]);
    expect(validateBreakEven('target-profit', { ...BREAK_EVEN, targetProfit: -30000 }).map((p) => p.field)).toEqual(['targetProfit']);
    expect(breakEvenState({ price: 30 }).variableCost).toBe(BREAK_EVEN.variableCost);
  });
});

describe('ratio calculators (3.5, and 3.6 at HL)', () => {
  const head = (id: (typeof RATIO_LAB_IDS)[number]) => buildRatio(id, ratioDefaults(id), S).headline.value;

  it('the latest year of each ratio', () => {
    expect(head('gross-profit-margin')).toBe('43.52%');
    expect(head('profit-margin')).toBe('8.89%');
    expect(head('roce')).toBe('20.44%');
    expect(head('current-ratio')).toBe('1.52');
    expect(head('acid-test-ratio')).toBe('0.93');
    expect(head('gearing-ratio')).toBe('38.38%');
    expect(head('stock-turnover')).toBe('9.50 times');
    expect(head('debtor-days')).toBe('37.04 days');
    expect(head('creditor-days')).toBe('48.94 days');
  });

  it('the previous year, the change and the verdict', () => {
    const g = buildRatio('gross-profit-margin', ratioDefaults('gross-profit-margin'), S);
    expect(fig(g, 'GPM, previous year')).toBe('46.00%');
    expect(g.headline.note).toBe('−2.48 percentage points on the previous year; worse');
    const s = buildRatio('stock-turnover', ratioDefaults('stock-turnover'), S);
    expect(fig(s, 'Stock turnover (days), latest year')).toBe('38.42 days');
    expect(fig(s, 'Stock turnover (days), previous year')).toBe('34.01 days');
    expect(buildRatio('gearing-ratio', ratioDefaults('gearing-ratio'), S).headline.note).toContain('a matter of judgement');
  });

  it('what moves the ratio', () => {
    const g = buildRatio('gross-profit-margin', ratioDefaults('gross-profit-margin'), S).sensitivity!;
    expect(g.table.rows[0]?.cells).toEqual(['37.25%', '48.66%']); // price 10% lower and higher
    expect(g.table.rows[2]?.cells).toEqual(['43.52%', '43.52%']); // volume leaves the margin unchanged
    const a = buildRatio('acid-test-ratio', ratioDefaults('acid-test-ratio'), S).sensitivity!;
    // Stock 10% higher, bought for cash: (172,500 − 73,480) ÷ 113,600
    expect(a.table.rows[1]?.cells[1]).toBe('0.87');
    const c = buildRatio('current-ratio', ratioDefaults('current-ratio'), S).sensitivity!;
    // Paying 11,360 of creditors from cash: 161,140 ÷ 102,240
    expect(c.table.rows[2]?.cells[0]).toBe('1.58');
  });

  it('zero denominators are not defined, not an error', () => {
    const st = ratioDefaults('current-ratio');
    const r = buildRatio('current-ratio', { ...st, latest: { ...st.latest, currentLiabilities: 0 } }, S);
    expect(r.headline.value).toBe('n/a');
    expect(r.interpretation.meaning).toMatch(/cannot be calculated/);
    const roce = ratioDefaults('roce');
    expect(buildRatio('roce', { ...roce, latest: { ...roce.latest, equity: -160000 } }, S).headline.value).toBe('n/a');
    const gp = ratioDefaults('gross-profit-margin');
    expect(buildRatio('gross-profit-margin', { ...gp, latest: { salesRevenue: 0, costOfSales: 0 } }, S).headline.value).toBe('n/a');
    // A loss on trading is a negative margin, not an error: (100 − 120) ÷ 100
    expect(buildRatio('gross-profit-margin', { ...gp, latest: { salesRevenue: 100, costOfSales: 120 } }, S).headline.value).toBe('−20.00%');
  });

  it('checks typed figures', () => {
    const raw = { 'previous.currentAssets': 100, 'previous.stock': 150, 'previous.currentLiabilities': 50, 'latest.currentAssets': null, 'latest.stock': 0, 'latest.currentLiabilities': -1 };
    expect(validateRatio('acid-test-ratio', raw).map((p) => p.field)).toEqual(['previous.stock', 'latest.currentAssets', 'latest.currentLiabilities']);
    expect(validateRatio('profit-margin', { 'previous.salesRevenue': 1, 'previous.pbit': -5, 'latest.salesRevenue': 1, 'latest.pbit': -9 })).toEqual([]);
    expect(ratioState('roce', { 'latest.pbit': 1 }).latest.pbit).toBe(1);
  });
});

describe('the profit and loss builder (3.4)', () => {
  it('builds the statement from stock and purchases, or from cost of sales', () => {
    const r = buildStatement(STATEMENT_DEFAULTS, S);
    expect(r.headline.value).toBe('$56,700');
    expect(fig(r, 'Gross profit margin')).toBe('43.52%');
    expect(fig(r, 'Profit margin')).toBe('8.89%');
    expect(fig(r, 'Share of sales taken by expenses')).toBe('34.64%');
    expect(r.extra).toContain('(541,500)');
    expect(statementLines({ ...STATEMENT_DEFAULTS, stockMode: 0, costOfSales: 500000 }).costOfSales).toBe(500000);
    expect(r.sensitivity?.reading).toContain('to $43,470');
  });

  it('shows losses and deductions in brackets', () => {
    expect(fmtStatement(1234)).toBe('1,234');
    expect(fmtStatement(1234, true)).toBe('(1,234)');
    expect(fmtStatement(-500)).toBe('(500)');
    expect(fmtStatement(0, true)).toBe('0');
    const loss = buildStatement({ ...STATEMENT_DEFAULTS, expenses: 500000 }, S);
    expect(loss.headline.value).toBe('−$111,200'); // 417,300 − 500,000 − 9,600 − 18,900
  });

  it('checks typed figures', () => {
    const { entity: _entity, period: _period, ...raw } = STATEMENT_DEFAULTS;
    expect(validateStatement({ ...raw, closingStock: 700000 }).map((p) => p.field)).toEqual(['closingStock']);
    expect(validateStatement({ ...raw, stockMode: 0, costOfSales: null }).map((p) => p.field)).toEqual(['costOfSales']);
    expect(validateStatement({ ...raw, tax: -1 })[0]?.message).toBe('Tax cannot be negative.');
  });
});

describe('budget and cash calculators', () => {
  it('the budget report', () => {
    const r = buildBudget(BUDGET_DEFAULTS, S);
    expect(r.headline).toMatchObject({ value: '$7,050 [A]', note: 'adverse: profit below budget' });
    expect(r.extra).toContain('Excess of revenues over (under) costs');
    expect(r.interpretation.actions.join(' ')).toContain('the saving on marketing may explain part of the shortfall in online subscriptions');
    expect(validateBudget({ period: 'x', lines: [{ id: 'r-1', label: '', kind: 'revenue', budget: -1, actual: null }] }).map((p) => p.field)).toEqual(['r-1.label', 'r-1.budget', 'r-1.actual']);
  });

  it('the cash report', () => {
    const r = buildCash(CASH_DEFAULTS, S);
    expect(r.headline).toMatchObject({ value: '−$25,700.00', note: 'March; beyond the overdraft limit' });
    expect(fig(r, 'Months beyond the overdraft limit')).toBe('2');
    expect(r.sensitivity?.reading).toContain('−$60,600.00 in June, beyond the limit in 5 months');
    expect(r.workings.map((w) => w.title)).toEqual(['The first month: January’s closing balance', 'The critical month: March’s closing balance']);
  });
});

describe('the catalogue, formulas, charts and export', () => {
  it('twenty calculators, each with formulas, in five groups', () => {
    expect(LAB).toHaveLength(20);
    expect(new Set(LAB.map((e) => e.id)).size).toBe(20);
    for (const e of LAB) {
      expect(FORMULAS[e.id]?.length, e.id).toBeGreaterThan(0);
      expect(GROUPS.some((g) => g.id === e.group)).toBe(true);
    }
    expect(LAB.filter((e) => e.level === 'HL').map((e) => e.id)).toEqual(['gearing-ratio', 'stock-turnover', 'debtor-days', 'creditor-days', 'budget-variances', 'net-present-value']);
    expect(labForRegister('stock-turnover-days')?.id).toBe('stock-turnover');
    expect(() => labEntry('nope')).toThrow();
  });

  it('names only calculations and subtopics that exist, and HL subtopics only at HL', () => {
    const subs = (c.curricula['ib-dp-bm']?.units ?? []).flatMap((u) => u.subtopics);
    for (const e of LAB) {
      if (e.register) expect(c.calculations[e.register], `${e.id} register`).toBeDefined();
      const sub = subs.find((x) => x.code === e.subtopic);
      expect(sub, `${e.id} subtopic`).toBeDefined();
      if (sub?.level === 'HL') expect(e.level, e.id).toBe('HL');
    }
    for (const g of GROUPS) for (const code of g.subtopics) expect(subs.some((x) => x.code === code), code).toBe(true);
  });

  it('every default report is complete and every chart is accessible', () => {
    for (const e of LAB) {
      const r = defaultReport(e.id);
      expect(r.workings.length, e.id).toBeGreaterThan(0);
      expect(r.interpretation.actions.length, e.id).toBeGreaterThan(0);
      expect(r.csv.length, e.id).toBeGreaterThan(0);
      const html = Object.values(regionsHtml(r, e.name)).join('');
      expect(html, e.id).not.toMatch(/NaN|undefined|Infinity/);
      if (r.chart) expect(r.chart.svg, e.id).toMatch(/role="img" aria-labelledby="[^"]+-t [^"]+-d"/);
    }
  });

  it('charts survive edge cases', () => {
    const svgs = [
      contributionBarsSvg({ price: 10, variableCost: 12, quantity: 100, fixedCosts: 500, currency: '$', unit: 'cup', units: 'cups', id: 'a' }),
      contributionBarsSvg({ price: 10, variableCost: 4, quantity: 0, fixedCosts: 0, currency: '$', unit: 'cup', units: 'cups', id: 'b' }),
      ratioBarsSvg({ name: 'Margin', values: [{ label: 'A', value: -5, text: '−5%' }, { label: 'B', value: null, text: 'n/a' }], id: 'c', better: 'higher' }),
      cashLineSvg(customForecast({ months: ['May'], opening: 0, overdraftLimit: 0, inflows: [], outflows: [] }), { currency: '$', id: 'd' }),
      varianceBarsSvg(budgetReport([{ id: 'x', label: 'Only line', kind: 'cost', budget: 0, actual: 0 }]), { currency: '$', id: 'e' }),
      waterfallSvg([{ label: 'Sales revenue', value: 0, kind: 'total' }], { currency: '$', id: 'f' }),
      arrBarsSvg({ returns: [-500, 0], capitalCost: 100, currency: '$', id: 'g' }),
      discountedSvg({ returns: [0], presentValues: [0], rate: 8, currency: '$', id: 'h' }),
      npvProfileSvg({ points: [{ rate: 4, npv: 0 }], curve: [{ rate: 0, npv: 0 }], selected: 4, irr: null, currency: '$', id: 'i' }),
    ];
    for (const s of svgs) {
      expect(s).not.toMatch(/NaN|Infinity|undefined/);
      expect(s).toMatch(/<title id="[a-z]-t">/);
    }
  });

  it('escapes whatever the reader types', () => {
    const st = { ...CASH_DEFAULTS, inflows: [{ id: 'in-1', label: '<img src=x onerror=alert(1)>', values: [1, 1, 1, 1, 1, 1] }] };
    const html = Object.values(regionsHtml(buildCash(st, S), 'Cash flow forecast')).join('') + cashGridHtml({ startMonth: 0, months: 1, inflows: [{ id: 'in-1', label: '"><b class=pwn>', values: ['1'] }], outflows: [] }, 'e');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b class=pwn>');
    expect(html).toContain('&quot;&gt;&lt;b class=pwn&gt;');
    expect(budgetGridHtml({ lines: [{ id: 'r', label: '<i>', kind: 'revenue', budget: '1', actual: '2' }] }, 'e')).toContain('&lt;i&gt;');
    expect(yearsHtml(['"1'], 'u', '$')).toContain('value="&quot;1"');
  });

  it('formulas render as fractions with a linear reading', () => {
    const gpm = FORMULAS['gross-profit-margin']?.[0];
    expect(gpm && linear(gpm.rhs)).toBe('(gross profit) ÷ (sales revenue) × 100');
    expect(gpm && formulaHtml(gpm)).toContain('<span class="fl-frac__n">gross profit</span>');
  });

  it('CSV cells are quoted and cannot run as formulas', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(csvCell('-5 net')).toBe("'-5 net");
    expect(csvCell(-5)).toBe('-5');
    expect(csvCell(1 / 3)).toBe('0.333333');
    expect(toCsv([['a', 1], ['b', 2]])).toBe('a,1\r\nb,2\r\n');
  });

  it('field checks say what is wrong and what is right', () => {
    const f: FieldSpec = { key: 'k', label: 'K', kind: 'count', min: 1, integer: true, name: 'capacity' };
    expect(checkValue(null, f)).toBe('Enter a number for capacity.');
    expect(checkValue(1.5, f)).toBe('Capacity must be a whole number.');
    expect(checkValue(0, f)).toBe('Capacity must be at least 1.');
    expect(checkValue(5, { ...f, max: 4 })).toBe('Capacity must be no more than 4.');
    expect(checkValue(3, f)).toBeNull();
  });
});
