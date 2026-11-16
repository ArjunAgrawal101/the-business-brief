/**
 * Advanced financial management (beyond the IB course) against values worked
 * by hand and textbook-style examples. Every expected figure below was worked
 * independently of the code: by hand where the arithmetic is short, and for
 * the five-year forecasts and the tornado in a separate Python script written
 * from the stated method, not from this code's output.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACCOUNTS, BREAK_EVEN, OPENING_STOCK, PROJECT } from '../../src/lib/finance-lab/business';
import { LAB } from '../../src/lib/finance-lab/catalogue';
import { operatingLeverage } from '../../src/lib/finance';
import { npvByFormula, npv as labNpv, payback, type Project } from '../../src/lib/investment';
import { balances, derive, gearingRatio } from '../../src/lib/ratios';
import { ALTERNATIVES, COST_STRUCTURES, DRIVERS, HISTORY, HISTORY_OPENING_STOCK, OPENING, PROJECTS, WACC_INPUTS } from '../../src/lib/adv-finance/business';
import { appraise, breakEvenChanges, cashFlows, costOfEquity, irr, npvAt, profitabilityIndex, recovery, signChanges, tornado, validateCapital, wacc } from '../../src/lib/adv-finance/capital';
import { buildCapitalReport, rateText } from '../../src/lib/adv-finance/capital-view';
import { ADVANCED, STORAGE_PREFIX, advancedHref } from '../../src/lib/adv-finance/catalogue';
import { compareStructures, indifference, validateCostStructures } from '../../src/lib/adv-finance/cost-structure';
import { buildCostReport } from '../../src/lib/adv-finance/cost-structure-view';
import { depreciationSchedule, forecastFields, forecastInput, openingRetained, runAll, runForecast, validateForecast, type ForecastInput } from '../../src/lib/adv-finance/forecast';
import { buildForecastReport } from '../../src/lib/adv-finance/forecast-view';
import { logMean, measureYears, splitRoe, type YearMeasures } from '../../src/lib/adv-finance/performance';
import { buildPerformanceReport } from '../../src/lib/adv-finance/performance-view';
import {
  CAPITAL_EXAMPLE_FORM,
  capitalFromForm,
  COST_EXAMPLE_FORM,
  costFromForm,
  EXAMPLE_FORECAST,
  FORECAST_EXAMPLE_FORM,
  forecastFromForm,
  PERFORMANCE_EXAMPLE_FORM,
  performanceFromForm,
  readCapitalSaved,
  readCostSaved,
  readForecastSaved,
  readKept,
  readPerformanceSaved,
  toNumber,
} from '../../src/lib/adv-finance/state';
import { loadCorpus } from './helpers/corpus';

const c = loadCorpus();

/* ------------------------------------------------------------------ */
/* The example business                                                */
/* ------------------------------------------------------------------ */

describe('the advanced example joins up with the Financial Laboratory', () => {
  it('the forecast opens from the lab’s 2025 statement of financial position', () => {
    expect(OPENING.nonCurrentAssets).toBe(486000 - 128000);
    expect(OPENING.borrowings).toBe(41000 + 160000);
    expect(OPENING.cash).toBe(ACCOUNTS.latest.cash);
    // Retained earnings are the balancing figure, and they are the lab's.
    expect(openingRetained(OPENING)).toBe(ACCOUNTS.latest.retainedEarnings);
  });

  it('its first year is the lab’s month of 2026 for twelve months, with the 2025 accounts’ rates and days', () => {
    expect(DRIVERS.volume).toBe(3600 * 12);
    expect(DRIVERS.price).toBe(BREAK_EVEN.price);
    expect(DRIVERS.variableCost).toBe(BREAK_EVEN.variableCost);
    expect(DRIVERS.fixedCosts).toBe(29000 * 12);
    // Tax: 18,900 ÷ 75,600 = 25%. Dividends: 20,000 ÷ 56,700 = 35.3%.
    expect((ACCOUNTS.latest.tax / derive(ACCOUNTS.latest).profitBeforeTax) * 100).toBeCloseTo(DRIVERS.taxRate, 6);
    expect(Math.abs((20000 / 56700) * 100 - DRIVERS.payout)).toBeLessThan(0.5);
    // Days at the end of 2025: debtors 97,300 ÷ 958,800 × 365 = 37.04; stock 66,800 ÷ 541,500 × 365 = 45.03; creditors 72,600 ÷ 541,500 × 365 = 48.94.
    expect(Math.round((97300 / 958800) * 365)).toBe(DRIVERS.debtorDays);
    expect(Math.round((66800 / 541500) * 365)).toBe(DRIVERS.stockDays);
    expect(Math.round((72600 / 541500) * 365)).toBe(DRIVERS.creditorDays);
  });

  it('the cost structures change the lab’s month by the forecast’s two alternatives', () => {
    // Automating: $9,000 a year of service contract and $180,000 over 8 years of depreciation, both as a month; $1.10 a bag less.
    expect(COST_STRUCTURES.a.fixedCosts).toBe(BREAK_EVEN.fixedCosts + ALTERNATIVES.a.fixedCostChange / 12 + ALTERNATIVES.a.investment / DRIVERS.assetLife / 12);
    expect(COST_STRUCTURES.a.variableCost).toBeCloseTo(BREAK_EVEN.variableCost + ALTERNATIVES.a.variableCostChange, 10);
    expect(COST_STRUCTURES.b.fixedCosts).toBe(BREAK_EVEN.fixedCosts + ALTERNATIVES.b.fixedCostChange / 12);
    expect(COST_STRUCTURES.b.variableCost).toBeCloseTo(BREAK_EVEN.variableCost + ALTERNATIVES.b.variableCostChange, 10);
  });

  it('the history adds two balanced years before the lab’s, carried forward', () => {
    expect(HISTORY.map((y) => y.label)).toEqual(['2022', '2023', '2024', '2025']);
    expect(HISTORY[2]?.statement).toEqual(ACCOUNTS.previous);
    expect(HISTORY[3]?.statement).toEqual(ACCOUNTS.latest);
    expect(HISTORY[1]?.statement.stock).toBe(OPENING_STOCK.previous);
    HISTORY.forEach((y) => expect(balances(y.statement)).toBe(true));
    for (let i = 1; i < HISTORY.length; i++) {
      const prev = HISTORY[i - 1]!.statement;
      const now = HISTORY[i]!.statement;
      expect(prev.retainedEarnings + derive(now).retainedProfit).toBe(now.retainedEarnings);
    }
    expect(HISTORY_OPENING_STOCK).toBe(27400);
  });

  it('the comparator’s first project is the lab’s, and the cost of debt is the forecast’s interest rate', () => {
    expect(PROJECTS[0]).toEqual({ name: PROJECT.label, outlay: PROJECT.capitalCost, flows: [...PROJECT.returns] });
    expect(WACC_INPUTS.costOfDebt).toBe(DRIVERS.interestRate);
    expect(WACC_INPUTS.taxRate).toBe(DRIVERS.taxRate);
  });
});

/* ------------------------------------------------------------------ */
/* The integrated forecast                                             */
/* ------------------------------------------------------------------ */

/** A small business worked by hand over three years. */
const SMALL: ForecastInput = {
  drivers: {
    years: 3,
    firstYear: 2030,
    volume: 1000,
    volumeGrowth: 10,
    price: 10,
    priceGrowth: 0,
    variableCost: 6,
    costInflation: 0,
    fixedCosts: 2000,
    capex: 300,
    assetLife: 3,
    existingLife: 5,
    debtorDays: 36.5,
    stockDays: 73,
    creditorDays: 36.5,
    interestRate: 10,
    repayment: 100,
    taxRate: 20,
    payout: 50,
  },
  opening: { nonCurrentAssets: 1000, stock: 100, debtors: 200, cash: 50, creditors: 150, borrowings: 400, shareCapital: 500 },
  scenarios: { upside: { volume: 10, growth: 0, price: 0, variableCost: 0, fixedCosts: 0 }, downside: { volume: -10, growth: 0, price: 0, variableCost: 0, fixedCosts: 0 } },
  alternatives: {
    a: { name: 'Machine', investment: 600, borrowing: 600, variableCostChange: -1, fixedCostChange: 200, volumeChange: 0 },
    b: { name: 'Contractor', investment: 0, borrowing: 0, variableCostChange: 1, fixedCostChange: -500, volumeChange: 0 },
  },
};

describe('the integrated forecast, worked by hand', () => {
  const run = runForecast(SMALL);
  const [y1, y2, y3] = run.years;

  it('opens with the balancing retained earnings', () => {
    // 1,000 + 100 + 200 + 50 − 150 − 400 − 500 = 300
    expect(run.opening.retainedEarnings).toBe(300);
    expect(run.opening.equity).toBe(800);
  });

  it('year one: the statement of profit or loss', () => {
    expect(y1).toMatchObject({ volume: 1000, revenue: 10000, costOfSales: 6000, grossProfit: 4000, fixedCosts: 2000 });
    // Depreciation: 1,000 ÷ 5 = 200 on the assets owned, 300 ÷ 3 = 100 on the new ones.
    expect(y1?.depreciation).toBe(300);
    expect(y1?.pbit).toBe(1700);
    // Interest 10% × 400; tax 20% × 1,660; dividends half of 1,328.
    expect([y1?.interest, y1?.pbt, y1?.tax, y1?.profit, y1?.dividends, y1?.retained]).toEqual([40, 1660, 332, 1328, 664, 664]);
  });

  it('year one: the statement of cash flows and the overdraft it leads to', () => {
    // Debtors 10,000 × 36.5 ÷ 365 = 1,000; stock 6,000 × 73 ÷ 365 = 1,200; creditors 6,000 × 36.5 ÷ 365 = 600.
    expect([y1?.debtors, y1?.stock, y1?.creditors]).toEqual([1000, 1200, 600]);
    // 1,328 + 300 − 1,100 − 800 + 450 = 178
    expect(y1?.operating).toBe(178);
    expect([y1?.capex, y1?.repayment, y1?.financing, y1?.netCash]).toEqual([300, 100, -764, -886]);
    expect(y1?.closingCash).toBe(-836);
    expect([y1?.cash, y1?.overdraft]).toEqual([0, 836]);
  });

  it('year one: the statement of financial position balances', () => {
    expect(y1).toMatchObject({ nonCurrentAssets: 1000, totalAssets: 3200, totalLiabilities: 1736, netAssets: 1464, retainedEarnings: 964, equity: 1464, difference: 0 });
  });

  it('year two: interest on the overdraft, and rounding half up', () => {
    // Depreciation 200 + (300 + 300) ÷ 3 = 400; interest 10% × (300 + 836) = 113.6, so 114.
    expect([y2?.volume, y2?.revenue, y2?.depreciation, y2?.pbit, y2?.interest]).toEqual([1100, 11000, 400, 2000, 114]);
    // Tax 20% × 1,886 = 377.2, so 377; dividends 50% × 1,509 = 754.5, so 755.
    expect([y2?.tax, y2?.profit, y2?.dividends]).toEqual([377, 1509, 755]);
    expect([y2?.operating, y2?.netCash, y2?.closingCash]).toEqual([1749, 594, -242]);
    expect([y2?.netAssets, y2?.equity]).toEqual([2218, 2218]);
  });

  it('year three: back in the bank, and still balancing', () => {
    expect([y3?.depreciation, y3?.pbit, y3?.interest, y3?.tax, y3?.profit, y3?.dividends]).toEqual([500, 2340, 44, 459, 1837, 919]);
    expect([y3?.operating, y3?.closingCash, y3?.borrowings]).toEqual([2161, 600, 100]);
    expect([y3?.totalAssets, y3?.totalLiabilities, y3?.equity]).toEqual([3962, 826, 3136]);
    expect(run.balances).toBe(true);
    expect(run.totalProfit).toBe(1328 + 1509 + 1837);
    expect(run.lowest).toEqual({ value: -836, index: 0 });
  });

  it('an alternative invests and borrows in year one, and changes the year-one drivers', () => {
    const a = runForecast(SMALL, 'base', 'a').years[0];
    // Capex 300 + 600; depreciation 200 + 900 ÷ 3; interest 10% × (400 + 600).
    expect([a?.capex, a?.borrowing, a?.depreciation, a?.interest]).toEqual([900, 600, 500, 100]);
    expect([a?.unitCost, a?.fixedCosts]).toEqual([5, 2200]);
  });

  it('a scenario moves the drivers by per cent', () => {
    expect(runForecast(SMALL, 'upside').years[0]?.volume).toBe(1100);
    expect(runForecast(SMALL, 'downside').years[0]?.volume).toBe(900);
  });

  it('depreciation never charges more than the assets cost, whatever the rounding', () => {
    // 1,000 over 3 years: 333.33 a year, rounded as a running total: 333, 667, 1,000.
    expect(depreciationSchedule(1000, 3, [0, 0, 0, 0], 5)).toEqual([333, 334, 333, 0]);
    expect(depreciationSchedule(0, 1, [300, 300, 300], 3)).toEqual([100, 200, 300]);
    expect(depreciationSchedule(0, 1, [100, 0, 0, 0], 3).reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe('the integrated forecast for Emberly Roasters', () => {
  const runs = runAll(EXAMPLE_FORECAST);
  const base = runs['base/none'];

  it('2026, the first year, worked by hand', () => {
    const y = base.years[0]!;
    // 43,200 × $24 and 43,200 × $14.40; depreciation 358,000 ÷ 10 + 15,000 ÷ 8.
    expect([y.revenue, y.costOfSales, y.fixedCosts, y.depreciation, y.pbit]).toEqual([1036800, 622080, 348000, 37675, 29045]);
    // Interest 6% × 201,000; tax 25% × 16,985 = 4,246.25; dividends 35% × 12,739 = 4,458.65.
    expect([y.interest, y.tax, y.profit, y.dividends]).toEqual([12060, 4246, 12739, 4459]);
    // Debtors 1,036,800 × 37 ÷ 365 = 105,099.7; stock 622,080 × 45 ÷ 365 = 76,694.8; creditors 622,080 × 49 ÷ 365 = 83,512.1.
    expect([y.debtors, y.stock, y.creditors]).toEqual([105100, 76695, 83512]);
    // 12,739 + 37,675 − 9,895 − 7,800 + 10,912 = 43,631; less 15,000, 40,200 and 4,459.
    expect([y.operating, y.netCash, y.closingCash]).toEqual([43631, -16028, -7628]);
  });

  it('five years: profit, cash and the borrowing repaid', () => {
    expect(base.years.map((y) => y.profit)).toEqual([12739, 22758, 33472, 45262, 58575]);
    expect(base.years.map((y) => y.closingCash)).toEqual([-7628, -14425, -12744, -1904, 19054]);
    expect(base.totalProfit).toBe(172806);
    expect(base.lowest).toEqual({ value: -14425, index: 1 });
    expect(base.last.borrowings).toBe(0);
    expect(base.last.retainedEarnings).toBe(269224);
  });

  it('every scenario with every option balances in every year', () => {
    for (const r of Object.values(runs)) {
      expect(r.balances).toBe(true);
      r.years.forEach((y) => expect(y.totalAssets - y.totalLiabilities).toBe(y.equity));
    }
  });

  it('five-year profit for every scenario and option, against the reference model', () => {
    const totals = Object.fromEntries(Object.entries(runs).map(([k, r]) => [k, r.totalProfit]));
    expect(totals).toEqual({
      'base/none': 172806,
      'base/a': 223903,
      'base/b': 242787,
      'upside/none': 327416,
      'upside/a': 389871,
      'upside/b': 390009,
      'downside/none': -74238,
      'downside/a': -23728,
      'downside/b': 29224,
    });
    expect(runs['base/a'].last.netDebt).toBe(15904);
    expect(runs['downside/none'].lowest.value).toBe(-151221);
  });

  it('automating overtakes outsourcing in the last year of the base case', () => {
    expect(runs['base/a'].last.profit).toBeGreaterThan(runs['base/b'].last.profit);
    expect(runs['base/a'].totalProfit).toBeLessThan(runs['base/b'].totalProfit);
  });

  it('the report reads the base case, with no leaks', () => {
    const r = buildForecastReport(EXAMPLE_FORECAST, { scenario: 'base', option: 'none' }, '$');
    expect(r.headline.value).toBe('−$14,425');
    expect(r.headline.note).toContain('2027');
    const all = Object.values(r.regions).join('');
    expect(all).not.toMatch(/undefined|NaN|\[object Object\]|[–—]/);
    expect(r.regions.meaning).toContain('$172,806 over the 5 years');
    expect(r.regions.options).toContain('Outsource the packing');
    expect(r.regions.matrix).toContain('comes first in every scenario');
    expect(r.regions.scenarios).toContain('<svg');
    expect(r.csv.every((row) => row.every((cell) => cell !== undefined))).toBe(true);
  });

  it('the forecast form checks every field and every combination', () => {
    const { raw, text } = forecastFields(EXAMPLE_FORECAST);
    const asRaw = { ...raw } as Record<string, number | null>;
    expect(validateForecast(asRaw)).toEqual([]);
    expect(forecastInput(asRaw, text)).toEqual(EXAMPLE_FORECAST);
    expect(validateForecast({ ...asRaw, price: null })).toEqual([{ field: 'price', message: 'Enter a number for the selling price.' }]);
    expect(validateForecast({ ...asRaw, years: 6 })[0]?.field).toBe('years');
    expect(validateForecast({ ...asRaw, assetLife: 2.5 })[0]?.message).toBe('The life of new assets must be a whole number.');
    // A saving bigger than the variable cost leaves a negative cost.
    expect(validateForecast({ ...asRaw, 'a.variableCostChange': -20 })).toEqual([{ field: 'a.variableCostChange', message: 'This change would make the variable cost per unit negative in the base case.' }]);
    expect(validateForecast({ ...asRaw, 'up.volume': -95 })[0]?.message).toBe('The change in units in the upside must be at least −90.');
  });
});

/* ------------------------------------------------------------------ */
/* Capital budgeting                                                   */
/* ------------------------------------------------------------------ */

describe('net present value, payback and the profitability index', () => {
  it('a textbook NPV at 10%', () => {
    // 500 ÷ 1.1 + 400 ÷ 1.21 + 300 ÷ 1.331 + 100 ÷ 1.4641 − 1,000 = 454.55 + 330.58 + 225.39 + 68.30 − 1,000 = 78.82
    expect(npvAt([-1000, 500, 400, 300, 100], 10)).toBeCloseTo(78.82, 2);
    expect(npvAt([-1000, 1100], 10)).toBeCloseTo(0, 9);
  });

  it('agrees with the lab’s NPV from the formula, and differs from the guide’s four-place table by a few dollars', () => {
    const lab: Project = { id: 'p', label: PROJECT.label, capitalCost: PROJECT.capitalCost, returns: [...PROJECT.returns] };
    expect(npvAt(cashFlows({ name: 'x', outlay: lab.capitalCost, flows: lab.returns }), 8)).toBeCloseTo(npvByFormula(lab, 8), 9);
    expect(npvAt([-120000, ...PROJECT.returns], 8)).toBeCloseTo(5739.46, 2);
    expect(labNpv(lab, 8)).toBeCloseTo(5736, 6);
  });

  it('payback, discounted payback and when the cumulative cash flow falls back', () => {
    // −120,000 + 22,000 + 30,000 + 36,000 = −32,000 after three years; 32,000 ÷ 38,000 of year four.
    expect(recovery([-120000, ...PROJECT.returns]).years).toBeCloseTo(3 + 32000 / 38000, 9);
    // The same as the lab's payback, worked the same way.
    expect(recovery([-120000, ...PROJECT.returns]).years).toBeCloseTo(payback({ id: 'p', label: 'p', capitalCost: 120000, returns: [...PROJECT.returns] })?.total ?? 0, 6);
    // 1,000 now and 500 a year at 10%: present values 454.55, 413.22, 375.66; 2 + 132.23 ÷ 375.66 = 2.352.
    expect(recovery([-1000, 500 / 1.1, 500 / 1.21, 500 / 1.331]).years).toBeCloseTo(2.352, 9);
    expect(recovery([-100, 150, -100])).toEqual({ years: 100 / 150, inYear: 1, fallsBack: true });
    expect(recovery([-100, 20, 20]).years).toBeNull();
  });

  it('the profitability index is the present value of the cash flows over the outlay', () => {
    const a = appraise({ name: 'A', outlay: 1000, flows: [500, 400, 300, 100] }, 10);
    expect(profitabilityIndex(a.project, 10)).toBeCloseTo(1078.82 / 1000, 5);
    expect(a.pi).toBeCloseTo((a.npv + 1000) / 1000, 12);
  });
});

describe('the internal rate of return, by bracketing and bisection', () => {
  it('finds the rate exactly where it is known', () => {
    expect(irr([-100, 110])).toMatchObject({ status: 'unique', signChanges: 1 });
    expect(irr([-100, 110]).rates[0]).toBeCloseTo(10, 8);
    expect(irr([-100, 0, 121]).rates[0]).toBeCloseTo(10, 8);
    // The textbook project: NPV 78.82 at 10%, zero at 14.49%.
    expect(irr([-1000, 500, 400, 300, 100]).rates[0]).toBeCloseTo(14.4888, 3);
  });

  it('finds a negative rate when the cash never repays the cost', () => {
    // −100 + 50x + 40x² = 0 with x = 1 ÷ (1 + r): x = 1.07518, r = −6.99%.
    const r = irr([-100, 50, 40]);
    expect(r.status).toBe('unique');
    expect(r.rates[0]).toBeCloseTo(-6.9926, 3);
  });

  it('widens the search for a rate beyond 1,000%', () => {
    expect(irr([-1, 100]).rates[0]).toBeCloseTo(9900, 4);
  });

  it('has no rate when the cash flows never change sign', () => {
    expect(irr([100, 50])).toEqual({ status: 'none', rates: [], signChanges: 0 });
    expect(irr([-100, -50, 0])).toEqual({ status: 'none', rates: [], signChanges: 0 });
    expect(signChanges([-5, 0, 0, 3, 0, -1])).toBe(2);
  });

  it('finds both rates when the cash flows change sign twice', () => {
    // −10,000 + 36,000x − 31,500x² = 0: x = 2/3 or 10/21, so r = 50% or 110%.
    const r = irr([-10000, 36000, -31500]);
    expect(r.status).toBe('multiple');
    expect(r.signChanges).toBe(2);
    expect(r.rates).toHaveLength(2);
    expect(r.rates[0]).toBeCloseTo(50, 6);
    expect(r.rates[1]).toBeCloseTo(110, 6);
    // And NPV is negative at the cost of capital, though both rates are far above it.
    expect(npvAt([-10000, 36000, -31500], 10)).toBeCloseTo(-3305.79, 2);
  });

  it('reports none found when the cash flows change sign twice but NPV never reaches zero', () => {
    // −100 + 150x − 100x² has no real root: 150² < 4 × 100 × 100.
    expect(irr([-100, 150, -100])).toEqual({ status: 'none-found', rates: [], signChanges: 2 });
  });
});

describe('the cost of capital and the sensitivity of NPV', () => {
  it('the CAPM and the WACC', () => {
    expect(costOfEquity({ riskFree: 3, beta: 1.5, marketPremium: 6 })).toBe(12);
    // Emberly: 4 + 1.2 × 5 = 10%; 6% × 0.75 = 4.5%; 75% × 10 + 25% × 4.5 = 8.625%.
    expect(wacc({ ...WACC_INPUTS })).toEqual({ costOfEquity: 10, afterTaxDebt: 4.5, weightEquity: 0.75, weightDebt: 0.25, wacc: 8.625 });
    expect(wacc({ ...WACC_INPUTS, equityValue: 0, debtValue: 0 })).toBeNull();
    expect(rateText(8.625)).toBe('8.625%');
    expect(rateText(10)).toBe('10%');
  });

  it('Emberly’s three projects at the WACC', () => {
    const [a, b, k] = PROJECTS.map((p) => appraise({ name: p.name, outlay: p.outlay, flows: [...p.flows] }, 8.625));
    expect(a?.npv).toBeCloseTo(3541.28, 2);
    expect(b?.npv).toBeCloseTo(49956.34, 2);
    expect(k?.npv).toBeCloseTo(12887.21, 2);
    expect(a?.irr.rates[0]).toBeCloseTo(9.6683, 3);
    expect(b?.irr.rates[0]).toBeCloseTo(15.3516, 3);
    expect(k?.irr.rates[0]).toBeCloseTo(25.946, 3);
    // Payback: the kiosk recovers 45,000 with 28,000 and 17,000 of the year-two 25,000.
    expect(k?.payback.years).toBeCloseTo(1 + 17000 / 25000, 9);
    expect(b?.payback.years).toBeCloseTo(4 + 24000 / 44000, 9);
    expect(b?.discountedPayback.years).toBeCloseTo(5.9029, 3);
    expect(k?.pi).toBeCloseTo(1.28638, 5);
  });

  it('the tornado for the second roaster, widest bar first', () => {
    const items = tornado({ name: 'B', outlay: 180000, flows: [36000, 38000, 40000, 42000, 44000, 44000, 44000, 44000] }, 8.625, 0.1);
    expect(items.map((i) => i.id)).toEqual(['flows', 'life', 'outlay', 'rate']);
    const by = Object.fromEntries(items.map((i) => [i.id, i]));
    expect(by.flows?.low).toBeCloseTo(26960.71, 2);
    expect(by.flows?.high).toBeCloseTo(72951.98, 2);
    expect(by.outlay?.low).toBeCloseTo(67956.34, 2);
    expect(by.outlay?.high).toBeCloseTo(31956.34, 2);
    expect(by.life?.low).toBeCloseTo(27256.94, 2);
    expect(by.life?.high).toBeCloseTo(70853.37, 2);
    expect(by.rate?.low).toBeCloseTo(57877.18, 2);
    expect(by.rate?.high).toBeCloseTo(42429.72, 2);
    const be = breakEvenChanges(appraise({ name: 'B', outlay: 180000, flows: [36000, 38000, 40000, 42000, 44000, 44000, 44000, 44000] }, 8.625));
    expect(be.flows).toBeCloseTo(-21.7243, 3);
    expect(be.outlay).toBeCloseTo(27.7535, 3);
  });

  it('the comparator’s form is checked before anything is worked', () => {
    const ok = capitalFromForm(CAPITAL_EXAMPLE_FORM);
    expect(ok.problems).toEqual([]);
    expect(ok.state?.flex).toBe(0.1);
    const bad = validateCapital({ projects: [{ name: 'A', outlay: 0, flows: [1, null] }, { name: 'B', outlay: 10, flows: [] }], rateSource: 'own', raw: { ownRate: 150 } });
    expect(bad.map((p) => p.field)).toEqual(expect.arrayContaining(['p0.outlay', 'p0.r2', 'p1.outlay', 'ownRate', 'w.riskFree']));
  });

  it('the report: NPV prefers the roaster, IRR, PI and payback the kiosk', () => {
    const r = buildCapitalReport(capitalFromForm(CAPITAL_EXAMPLE_FORM).state!, '$');
    expect(r.rate).toBe(8.625);
    expect(r.regions.headline).toContain('$49,956');
    expect(r.regions.meaning).toContain('The methods disagree');
    expect(r.regions.ranks).toContain('1. Second roaster for supermarket orders; 2. Café kiosk at the roastery; 3. Nitrogen-flush packaging line');
    expect(Object.values(r.regions).join('')).not.toMatch(/undefined|NaN|\[object Object\]|[–—]/);
  });
});

/* ------------------------------------------------------------------ */
/* Break-even scenarios                                                */
/* ------------------------------------------------------------------ */

describe('two cost structures side by side', () => {
  const ex = compareStructures({ price: COST_STRUCTURES.price, forecast: COST_STRUCTURES.forecast, capacity: COST_STRUCTURES.capacity, a: { ...COST_STRUCTURES.a }, b: { ...COST_STRUCTURES.b } });

  it('each structure’s break-even, margin of safety, profit and operating leverage', () => {
    // A: contribution 24 − 13.30 = 10.70; 31,625 ÷ 10.70 = 2,955.6, so 2,956; 3,600 − 2,956 = 644 (17.9%).
    expect(ex.a).toMatchObject({ contribution: 10.7, breakEven: 2956, marginOfSafety: 644, profitAtForecast: 6895, profitAtCapacity: 16525 });
    expect(ex.a.marginOfSafetyShare).toBeCloseTo(17.8889, 4);
    // 38,520 ÷ 6,895
    expect(ex.a.operatingLeverage).toBeCloseTo(5.58666, 5);
    // B: contribution 9.10; 25,600 ÷ 9.10 = 2,813.2, so 2,814; 786 (21.8%); 32,760 ÷ 7,160.
    expect(ex.b).toMatchObject({ breakEven: 2814, marginOfSafety: 786, profitAtForecast: 7160, profitAtCapacity: 15350 });
    expect(ex.b.contribution).toBeCloseTo(9.1, 10);
    expect(ex.b.operatingLeverage).toBeCloseTo(4.575419, 6);
  });

  it('the indifference volume, and which earns more either side of it', () => {
    // (31,625 − 25,600) ÷ (10.70 − 9.10) = 6,025 ÷ 1.60 = 3,765.625
    expect(ex.verdict.kind).toBe('crosses');
    if (ex.verdict.kind === 'crosses') {
      expect(ex.verdict.volume).toBeCloseTo(3765.625, 9);
      expect(ex.verdict.above).toBe('a');
    }
    expect(ex.betterAtForecast).toBe('b');
    expect(ex.gapAtForecast).toBeCloseTo(265, 9);
    expect(ex.switchShare).toBeCloseTo(4.6007, 4);
  });

  it('textbook cases: crossing, the notes’ make or buy, dominance and sameness', () => {
    // 100,000 fixed and 5 a unit against 40,000 and 8, at 10: 60,000 ÷ 3 = 20,000 units.
    const t = indifference({ name: 'A', fixedCosts: 100000, variableCost: 5 }, { name: 'B', fixedCosts: 40000, variableCost: 8 }, 10);
    expect(t).toEqual({ kind: 'crosses', volume: 20000, above: 'a' });
    // The production planning notes (5.6): make at 48,000 + 8 a rack, or buy at 14: equal at 8,000 racks.
    expect(indifference({ name: 'Make', fixedCosts: 48000, variableCost: 8 }, { name: 'Buy', fixedCosts: 0, variableCost: 14 }, 20)).toEqual({ kind: 'crosses', volume: 8000, above: 'a' });
    expect(indifference({ name: 'A', fixedCosts: 100, variableCost: 4 }, { name: 'B', fixedCosts: 200, variableCost: 5 }, 10)).toEqual({ kind: 'dominates', better: 'a' });
    expect(indifference({ name: 'A', fixedCosts: 300, variableCost: 5 }, { name: 'B', fixedCosts: 200, variableCost: 5 }, 10)).toEqual({ kind: 'dominates', better: 'b' });
    expect(indifference({ name: 'A', fixedCosts: 300, variableCost: 5 }, { name: 'B', fixedCosts: 300, variableCost: 5 }, 10)).toEqual({ kind: 'same' });
  });

  it('operating leverage is one over the margin of safety as a share of sales, worked exactly', () => {
    const q = COST_STRUCTURES.forecast;
    const exact = ex.a.breakEvenExact as number;
    expect(ex.a.operatingLeverage).toBeCloseTo(q / (q - exact), 9);
    // The notes' Wrenhurst (5.6): 160,000 ÷ 40,000 = 4.
    expect(operatingLeverage(160000, 40000)).toBe(4);
  });

  it('the profit table stays within capacity and marks the forecast', () => {
    expect(ex.table.every((r) => r.volume <= COST_STRUCTURES.capacity)).toBe(true);
    expect(ex.table.filter((r) => r.base).map((r) => r.volume)).toEqual([3600]);
    expect(ex.table[ex.table.length - 1]).toMatchObject({ volume: 4500, label: 'capacity' });
    expect(ex.table.map((r) => r.volume)).toEqual([...ex.table.map((r) => r.volume)].sort((x, y) => x - y));
  });

  it('the form: forecast above capacity is refused, and the report reads the example', () => {
    expect(validateCostStructures({ price: 24, forecast: 5000, capacity: 4500, 'a.fixedCosts': 1, 'a.variableCost': 1, 'b.fixedCosts': 1, 'b.variableCost': 1 })).toEqual([{ field: 'forecast', message: 'Forecast sales cannot be more than capacity.' }]);
    const { input } = costFromForm(COST_EXAMPLE_FORM);
    const r = buildCostReport(input!, COST_EXAMPLE_FORM.settings, '$');
    expect(r.regions.headline).toContain('3,765.6 bags a month');
    expect(r.regions.meaning).toContain('Outsource the packing earns $265 a month more');
    expect(Object.values(r.regions).join('')).not.toMatch(/undefined|NaN|\[object Object\]|[–—]/);
  });
});

/* ------------------------------------------------------------------ */
/* The performance dashboard                                           */
/* ------------------------------------------------------------------ */

describe('the performance dashboard', () => {
  const ys = measureYears({ openingStock: HISTORY_OPENING_STOCK, years: HISTORY });
  const y = (label: string) => ys.find((x) => x.label === label) as YearMeasures;

  it('a textbook DuPont split', () => {
    const [one] = measureYears({
      openingStock: 0,
      years: [{ label: 'T', statement: { salesRevenue: 100, costOfSales: 50, expenses: 30, interest: 5, tax: 5, dividends: 0, propertyPlantEquipment: 200, accumulatedDepreciation: 50, cash: 10, debtors: 20, stock: 20, bankOverdraft: 0, tradeCreditors: 50, otherShortTermLoans: 0, longTermBorrowings: 100, shareCapital: 40, retainedEarnings: 10 } }],
    });
    // Profit 10 on revenue 100, assets 200, equity 50: 10% × 0.5 × 4 = 20%.
    expect([one?.netMargin, one?.assetTurnover, one?.equityMultiplier, one?.roe]).toEqual([10, 0.5, 4, 20]);
    // Tax burden 10 ÷ 15, interest burden 15 ÷ 20, operating margin 20%.
    expect(one?.taxBurden).toBeCloseTo(2 / 3, 12);
    expect(one?.interestBurden).toBe(0.75);
    expect(one?.operatingMargin).toBe(20);
  });

  it('Emberly’s return on equity and its factors, worked by hand', () => {
    // 2025: 56,700 ÷ 256,900; 56,700 ÷ 958,800; 958,800 ÷ 530,500; 530,500 ÷ 256,900.
    expect(y('2025').roe).toBeCloseTo(22.0708, 4);
    expect(y('2025').netMargin).toBeCloseTo(5.9136, 4);
    expect(y('2025').assetTurnover).toBeCloseTo(1.80735, 5);
    expect(y('2025').equityMultiplier).toBeCloseTo(2.06501, 5);
    // 2022: 55,125 ÷ 133,050.
    expect(y('2022').roe).toBeCloseTo(41.4318, 4);
    for (const m of ys) {
      expect(((m.netMargin as number) * (m.assetTurnover as number) * (m.equityMultiplier as number))).toBeCloseTo(m.roe as number, 9);
      expect((m.taxBurden as number) * (m.interestBurden as number) * (m.operatingMargin as number)).toBeCloseTo(m.netMargin as number, 9);
    }
  });

  it('the cash conversion cycle with the guide’s day measures', () => {
    // 2022: average stock (27,400 + 31,600) ÷ 2 = 29,500, ÷ 332,000 × 365 = 32.43; debtors 52,000 ÷ 640,000 × 365 = 29.66; creditors 33,800 ÷ 332,000 × 365 = 37.16.
    expect(y('2022').stockDays).toBeCloseTo(32.4322, 4);
    expect(y('2022').debtorDays).toBe((52000 / 640000) * 365);
    expect(y('2022').creditorDays).toBeCloseTo(37.1596, 4);
    expect(y('2022').cycle).toBeCloseTo(24.9288, 4);
    // 2025: 38.42 + 37.04 − 48.94 = 26.53.
    expect(y('2025').cycle).toBeCloseTo(26.5253, 4);
  });

  it('interest cover and gearing, the guide’s gearing as the ratio desk works it', () => {
    expect(y('2025').interestCover).toBe(85200 / 9600);
    expect(y('2024').interestCover).toBeCloseTo(29.71875, 9);
    expect(y('2025').gearing).toBe(gearingRatio(160000, 256900));
    expect(y('2025').gearing).toBeCloseTo(38.3785, 4);
    // (41,000 + 160,000) ÷ 256,900
    expect(y('2025').borrowingToEquity).toBeCloseTo(78.2406, 4);
  });

  it('the change in ROE splits exactly into its three factors', () => {
    const s = splitRoe(y('2024'), y('2025'));
    expect(s?.change).toBeCloseTo(-9.2189, 4);
    expect(s?.parts?.margin).toBeCloseTo(-8.1552, 4);
    expect(s?.parts?.turnover).toBeCloseTo(-6.4164, 4);
    expect(s?.parts?.leverage).toBeCloseTo(5.3528, 4);
    const sum = (s?.parts?.margin ?? 0) + (s?.parts?.turnover ?? 0) + (s?.parts?.leverage ?? 0);
    expect(sum).toBeCloseTo(s?.change ?? 0, 10);
    const whole = splitRoe(y('2022'), y('2025'));
    expect(whole?.change).toBeCloseTo(-19.3609, 4);
    expect(whole?.parts?.leverage).toBeCloseTo(2.6753, 4);
    expect(logMean(5, 5)).toBe(5);
    expect(logMean(1, Math.E)).toBeCloseTo(Math.E - 1, 12);
  });

  it('a loss cannot be split, and the checks catch accounts that do not agree', () => {
    const loss = { ...y('2025'), roe: -5, netMargin: -2 };
    expect(splitRoe(y('2024'), loss)).toEqual({ from: '2024', to: '2025', change: -5 - (y('2024').roe as number), parts: null });
    expect(splitRoe(y('2024'), { ...loss, roe: null })).toBeNull();
    const broken = HISTORY.map((h) => ({ label: h.label, statement: { ...h.statement } }));
    broken[3]!.statement.cash += 1000;
    broken[2]!.statement.retainedEarnings += 10;
    const m = measureYears({ openingStock: HISTORY_OPENING_STOCK, years: broken });
    expect(m[3]?.balances).toBe(false);
    expect(m[3]?.imbalance).toBe(1000);
    expect(m[2]?.retainedGap).toBe(10);
    expect(m[3]?.retainedGap).toBe(-10);
  });

  it('the report reads the example, and warns when the accounts do not agree', () => {
    const r = buildPerformanceReport(performanceFromForm(PERFORMANCE_EXAMPLE_FORM).input!, '$');
    expect(r.regions.headline).toContain('22.1%');
    expect(r.regions.headline).toContain('down from 41.4% in 2022');
    expect(r.regions.checks).toContain('The accounts agree');
    expect(r.regions.readings).toContain('Where it stops');
    expect(r.regions.split).toContain('ROE fell by 9.2 points from 2024 to 2025: the lower net margin accounts for 8.2 points of the fall and the lower asset turnover for 6.4 points; the higher equity multiplier (more leverage) added 5.4 points back.');
    expect(Object.values(r.regions).join('')).not.toMatch(/undefined|NaN|\[object Object\]|[–—]/);
    const bad = performanceFromForm({ ...PERFORMANCE_EXAMPLE_FORM, fields: { ...PERFORMANCE_EXAMPLE_FORM.fields, 'y3.cash': '9400' } });
    expect(buildPerformanceReport(bad.input!, '$').regions.checks).toContain('does not balance');
  });
});

/* ------------------------------------------------------------------ */
/* Saved work and the forms                                            */
/* ------------------------------------------------------------------ */

describe('reading saved work never fails', () => {
  it('numbers as people type them', () => {
    expect(toNumber('1,200')).toBe(1200);
    expect(toNumber(' 22.5 ')).toBe(22.5);
    expect(toNumber('−5')).toBe(-5);
    expect(toNumber('')).toBeNull();
    expect(toNumber('abc')).toBeNull();
  });

  it('the wrapper: only version 1 of a tool’s own shape', () => {
    expect(readKept('not json', readForecastSaved)).toBeNull();
    expect(readKept('{"v":2,"form":{}}', readForecastSaved)).toBeNull();
    expect(readKept(null, readForecastSaved)).toBeNull();
    expect(readKept(JSON.stringify({ v: 1, form: FORECAST_EXAMPLE_FORM }), readForecastSaved)).toEqual(FORECAST_EXAMPLE_FORM);
  });

  it('the forecast: unknown fields dropped, missing ones from the example, a bad view reset', () => {
    const f = readForecastSaved({ fields: { price: 30, bogus: 'x' }, view: { scenario: 'sideways', option: 'b' }, currency: 'DM' });
    expect(f?.fields.price).toBe('30');
    expect(f?.fields.volume).toBe(FORECAST_EXAMPLE_FORM.fields.volume);
    expect(f && 'bogus' in f.fields).toBe(false);
    expect(f?.view).toEqual({ scenario: 'base', option: 'b' });
    expect(f?.currency).toBe('$');
    expect(readForecastSaved([1, 2])).toBeNull();
    expect(forecastFromForm(FORECAST_EXAMPLE_FORM).input).toEqual(EXAMPLE_FORECAST);
  });

  it('the comparator: at least two projects, at most three, years trimmed', () => {
    expect(readCapitalSaved({ projects: [{}] })).toBeNull();
    const many = readCapitalSaved({ projects: Array.from({ length: 5 }, () => ({ name: 'P', outlay: '1', flows: Array.from({ length: 30 }, () => '1') })), focus: '7', flex: '50' });
    expect(many?.projects).toHaveLength(3);
    expect(many?.projects[0]?.flows).toHaveLength(15);
    expect(many?.focus).toBe('best');
    expect(many?.flex).toBe('10');
    expect(readCapitalSaved({ projects: [{ name: 'A' }, { name: 'B', flows: 'x' }] })?.projects[1]?.flows).toEqual(['0']);
  });

  it('the break-even scenarios and the dashboard', () => {
    expect(readCostSaved({ fields: {}, settings: { period: 'fortnight', unit: 'x'.repeat(40) } })?.settings).toEqual({ currency: '$', unit: 'bag', units: 'bags', period: 'month' });
    expect(readPerformanceSaved({ labels: ['a', 'b'] })).toBeNull();
    expect(readPerformanceSaved({ labels: ['1', '2', '3', '4', '5', '6', '7'] })?.labels).toHaveLength(5);
    expect(performanceFromForm(PERFORMANCE_EXAMPLE_FORM).input?.years.map((y) => y.statement)).toEqual(HISTORY.map((h) => h.statement));
  });
});

/* ------------------------------------------------------------------ */
/* The catalogue                                                       */
/* ------------------------------------------------------------------ */

describe('the catalogue of advanced tools', () => {
  it('names real calculators, subtopics and sources, and keys every tool under one prefix', () => {
    const codes = new Set((c.curricula['ib-dp-bm']?.units ?? []).flatMap((u) => u.subtopics.map((s) => s.code)));
    for (const t of ADVANCED) {
      t.lab.forEach((id) => expect(LAB.some((e) => e.id === id), id).toBe(true));
      t.ibUses.forEach((u) => expect(u.code === 'toolkit' || codes.has(u.code), u.code).toBe(true));
      t.sources.forEach((s) => expect(c.sources[s], s).toBeTruthy());
      expect(t.storageKey.startsWith(STORAGE_PREFIX)).toBe(true);
      expect(advancedHref(t.id)).toMatch(/^\/finance-desk\/advanced\/[a-z-]+\/$/);
      expect(`${t.name} ${t.question} ${t.description} ${t.beyond.join(' ')}`).not.toMatch(/[–—]/);
    }
    expect(new Set(ADVANCED.map((t) => t.storageKey)).size).toBe(ADVANCED.length);
  });

  it('the privacy page declares the keys', () => {
    const page = readFileSync(new URL('../../src/pages/privacy.astro', import.meta.url), 'utf8');
    expect(page).toContain(`'bb:${STORAGE_PREFIX}…'`);
  });

  it('every source cited by the mode is a referenced academic work or the method note', () => {
    for (const id of ['adv-fin-brealey-myers-allen-2020', 'adv-fin-koller-goedhart-wessels-2020', 'adv-fin-sharpe-1964', 'adv-fin-lorie-savage-1955', 'adv-fin-richards-laughlin-1980']) {
      expect(c.sources[id]).toMatchObject({ kind: 'academic', availability: 'referenced' });
    }
    expect(c.sources['method-adv-finance']?.kind).toBe('method');
  });
});
