/**
 * The finance functions against values worked out by hand. Each expected value
 * here was calculated independently of the code (by hand and in a separate
 * Python model), not copied from the code's output.
 */
import { describe, expect, it } from 'vitest';
import {
  breakEvenExact,
  breakEvenRevenue,
  breakEvenUnits,
  buildWorking,
  contributionPerUnit,
  labourTurnover,
  marginOfSafety,
  percentChange,
  profit,
  specialOrderGain,
  targetPriceExact,
  targetProfitOutput,
  totalContribution,
  totalCost,
  totalRevenue,
  workings,
} from '../../src/lib/finance';
import { fmtMoney, fmtNumber, fmtPercent, round, roundUp } from '../../src/lib/format';

const MUG = { unit: 'mug', units: 'mugs', period: 'month' };

describe('core arithmetic (Atelier Barro, from November, at €22)', () => {
  it('revenue, cost and profit', () => {
    expect(totalRevenue(22, 640)).toBe(14080);
    expect(totalCost(8140, 7.18, 640)).toBeCloseTo(12735.2, 6);
    expect(profit(22, 7.18, 8140, 640)).toBeCloseTo(1344.8, 6);
  });

  it('contribution', () => {
    expect(contributionPerUnit(22, 7.18)).toBeCloseTo(14.82, 9);
    expect(totalContribution(22, 7.18, 640)).toBeCloseTo(9484.8, 6);
  });

  it('break-even rounds up to a whole unit', () => {
    expect(breakEvenExact(8140, 22, 7.18)).toBeCloseTo(549.2578, 4);
    expect(breakEvenUnits(8140, 22, 7.18)).toBe(550);
    expect(breakEvenUnits(8060, 22, 6.88)).toBe(534); // before the tariff: 533.07
  });

  it('does not round up an exact break-even, even with floating-point noise', () => {
    expect(breakEvenUnits(1000, 15, 5)).toBe(100);
    expect(breakEvenUnits(1482, 22, 7.18)).toBe(100); // 1,482 ÷ 14.82 is exactly 100
  });

  it('has no break-even when contribution is not positive', () => {
    expect(breakEvenExact(1000, 5, 5)).toBeNull();
    expect(breakEvenUnits(1000, 4, 5)).toBeNull();
    expect(breakEvenRevenue(1000, 4, 5)).toBeNull();
  });

  it('break-even revenue, margin of safety and target output', () => {
    expect(breakEvenRevenue(8140, 22, 7.18)).toBeCloseTo(12083.67, 2);
    expect(marginOfSafety(640, 8140, 22, 7.18)).toBe(90);
    expect(targetProfitOutput(8140, 2000, 22, 7.18)).toBe(685); // 684.21 rounded up
  });

  it('target price', () => {
    expect(targetPriceExact(8140, 2000, 6.3, 640)).toBeCloseTo(22.14375, 9);
    expect(targetPriceExact(8140, 2000, 6.3, 0)).toBeNull();
  });

  it('labour turnover and percentage change', () => {
    expect(labourTurnover(28, 54)).toBeCloseTo(51.852, 3);
    expect(labourTurnover(46, 135)).toBeCloseTo(34.074, 3);
    expect(labourTurnover(5, 0)).toBeNull();
    expect(percentChange(12.78, 9.47)).toBeCloseTo(-25.9, 1);
    expect(percentChange(0, 5)).toBeNull();
  });

  it('special order gain', () => {
    expect(specialOrderGain(11, 5.85, 300, 150)).toBeCloseTo(1395, 9);
    expect(specialOrderGain(12.5, 5.85, 300, 150)).toBeCloseTo(1845, 9);
  });
});

describe('formatting', () => {
  it('groups digits, uses a typographic minus and never prints minus zero', () => {
    expect(fmtNumber(1250000)).toBe('1,250,000');
    expect(fmtMoney(-1.8, '€')).toBe('−€1.80');
    expect(fmtMoney(-0.001, '€')).toBe('€0.00');
    expect(fmtNumber(-0.4)).toBe('0');
    expect(fmtPercent(14.0625)).toBe('14.1%');
  });

  it('rounds without floating-point surprises', () => {
    expect(round(1.005, 2)).toBe(1.01);
    expect(roundUp(23.06640625, 2)).toBe(23.07);
    expect(roundUp(23.07, 2)).toBe(23.07);
  });
});

describe('the eight-part workings', () => {
  it('every working builder produces all eight parts that come from the calculation', () => {
    const samples: Record<string, Record<string, number>> = {
      'contribution-per-unit': { price: 22, variableCost: 7.18 },
      'total-contribution': { price: 22, variableCost: 7.18, quantity: 640 },
      'total-cost': { fixedCosts: 8140, variableCost: 7.18, quantity: 640 },
      'total-revenue': { price: 22, quantity: 640 },
      profit: { price: 22, variableCost: 7.18, fixedCosts: 8140, quantity: 640 },
      'break-even-quantity': { fixedCosts: 8140, price: 22, variableCost: 7.18 },
      'break-even-revenue': { fixedCosts: 8140, price: 22, variableCost: 7.18 },
      'margin-of-safety': { fixedCosts: 8140, price: 22, variableCost: 7.18, quantity: 640 },
      'target-profit-output': { fixedCosts: 8140, targetProfit: 2000, price: 22, variableCost: 7.18 },
      'target-price': { fixedCosts: 8140, targetProfit: 2000, variableCost: 6.3, quantity: 640, priceShare: 4 },
      'labour-turnover': { leavers: 28, averageEmployees: 54 },
      'special-order': { orderPrice: 11, variableCost: 5.85, quantity: 300, extraFixedCosts: 150 },
      'expected-value': { cost: 10, p1: 0.6, x1: 95, p2: 0.4, x2: 30 },
    };
    expect(Object.keys(samples).sort()).toEqual(Object.keys(workings).sort());
    for (const [id, inputs] of Object.entries(samples)) {
      const w = buildWorking(id, inputs, '€', MUG);
      expect(w.given.length, id).toBeGreaterThan(0);
      expect(w.formula, id).toMatch(/=/);
      expect(w.substitution, id).toMatch(/^=/);
      expect(w.steps.length, id).toBeGreaterThan(0);
      expect(w.answer, id).not.toBe('');
      expect(w.unit, id).not.toBe('');
      expect(w.error, id).toBeUndefined();
    }
  });

  it('break-even quantity explains the rounding with the loss one unit short', () => {
    const w = buildWorking('break-even-quantity', { fixedCosts: 8140, price: 22, variableCost: 7.18 }, '€', MUG);
    expect(w.answer).toBe('550 mugs');
    expect(w.value).toBe(550);
    expect(w.note).toContain('549');
    expect(w.note).toContain('€3.82');
  });

  it('target price allows for costs that are a share of the price', () => {
    const w = buildWorking('target-price', { fixedCosts: 8140, targetProfit: 2000, variableCost: 6.3, quantity: 640, priceShare: 4 }, '€', MUG);
    expect(w.value).toBe(23.07);
    // At €23.07 the target is met; at €23.06 it is not.
    const at = (p: number) => (p - (6.3 + 0.04 * p)) * 640 - 8140;
    expect(at(23.07)).toBeGreaterThanOrEqual(2000);
    expect(at(23.06)).toBeLessThan(2000);
  });

  it('special order subtracts the contribution of displaced sales', () => {
    const w = buildWorking('special-order', { orderPrice: 11, variableCost: 5.85, quantity: 300, extraFixedCosts: 150, displaced: 120, regularContribution: 14.82 }, '€', MUG);
    expect(w.value).toBeCloseTo(-383.4, 9);
    expect(w.answer).toBe('−€383.40');
  });

  it('labour turnover is given to one decimal place', () => {
    expect(buildWorking('labour-turnover', { leavers: 28, averageEmployees: 54 }, '').answer).toBe('51.9%');
  });

  it('reports invalid inputs instead of failing silently', () => {
    expect(() => buildWorking('profit', { price: 22 }, '€')).toThrow(/Missing or invalid input/);
    expect(() => buildWorking('no-such-calculation', {}, '€')).toThrow(/Unknown calculation/);
    const w = buildWorking('break-even-quantity', { fixedCosts: 100, price: 5, variableCost: 6 }, '€', MUG);
    expect(w.error).toBeTruthy();
  });
});
