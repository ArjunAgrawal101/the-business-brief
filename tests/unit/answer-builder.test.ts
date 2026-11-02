import { describe, expect, it } from 'vitest';
import { CALCS, calcById, type Solution } from '../../src/lib/answer-builder';

const solve = (id: string, over: Record<string, number> = {}): Solution => {
  const c = calcById(id);
  if (!c) throw new Error(id);
  const v = Object.fromEntries(c.fields.map((f) => [f.id, f.value]));
  const r = c.solve({ ...v, ...over });
  if (typeof r === 'string') throw new Error(r);
  return r;
};

describe('the Paper 2 answer builder, on the Paper 2 guide\'s Kestrel Kayaks figures', () => {
  it('finds break-even, the margin of safety and the target profit output', () => {
    expect(solve('contribution').value).toBe(200);
    expect(solve('break-even').answer).toBe('Break-even quantity = 300 units');
    expect(solve('margin-of-safety').answer).toBe('Margin of safety = 100 units');
    // At $450 a kayak: ($60,000 + $20,000) ÷ $150 = 533.3..., rounded up to 534.
    expect(solve('target-output').answer).toBe('Target profit output = 534 units');
    expect(solve('break-even', { fc: 60001 }).value).toBe(301);
  });

  it('works out the profitability and liquidity ratios', () => {
    expect(solve('gpm').answer).toBe('Gross profit margin = 40.00%');
    expect(solve('pm').answer).toBe('Profit margin = 8.42%');
    expect(solve('roce').answer).toBe('ROCE = 10.00%');
    expect(solve('current').answer).toBe('Current ratio = 0.90 : 1');
    expect(solve('acid').answer).toBe('Acid test ratio = 0.50 : 1');
  });

  it('works out the HL efficiency ratios', () => {
    expect(solve('stock-turnover').answer).toBe('Stock turnover = 4.07 times a year, or 89.65 days');
    expect(solve('debtor-days').answer).toBe('Debtor days = 29.97 days');
    expect(solve('creditor-days').answer).toBe('Creditor days = 57.63 days');
    expect(solve('gearing').answer).toBe('Gearing ratio = 25.00%');
  });

  it('appraises the investment with payback, ARR and NPV', () => {
    expect(solve('payback').answer).toBe('Payback period = 2 years and 8 months');
    expect(solve('arr').answer).toBe('ARR = 15.00%');
    // 6,000 × 0.9091 + 8,000 × 0.8264 + 9,000 × 0.7513 + 9,000 × 0.683 − 20,000
    expect(solve('npv').value).toBeCloseTo(4974.5, 6);
    expect(solve('npv').answer).toBe('NPV = $4,974.50');
  });

  it('measures capacity, productivity, share and growth', () => {
    expect(solve('capacity').answer).toBe('Capacity utilization rate = 76.00%');
    expect(solve('productivity').answer).toBe('Productivity rate = 109.20%');
    expect(solve('share').answer).toBe('Market share = 9.50%');
    expect(solve('growth').answer).toBe('Growth = 5.56%');
  });

  it('refuses figures that cannot give an answer, and says why', () => {
    const be = calcById('break-even');
    expect(typeof be?.solve({ fc: 1000, price: 5, vc: 5 })).toBe('string');
    expect(typeof calcById('npv')?.solve({ cost: 100, rate: 7, y1: 50, y2: 50, y3: 50, y4: 50 })).toBe('string');
  });

  it('gives every calculation a formula, fields and the errors to avoid', () => {
    for (const c of CALCS) {
      expect(c.formula.length).toBeGreaterThan(10);
      expect(c.fields.length).toBeGreaterThan(0);
      expect(c.errors.length).toBeGreaterThan(0);
      expect(typeof c.solve(Object.fromEntries(c.fields.map((f) => [f.id, f.value])))).toBe('object');
    }
  });
});
