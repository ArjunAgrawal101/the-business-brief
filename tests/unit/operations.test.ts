import { describe, expect, it } from 'vitest';
import {
  bufferUse,
  capacityModel,
  lowScores,
  maxStock,
  readCapacity,
  readLocation,
  readStock,
  reorderLevel,
  sensitivity,
  simulateStock,
  utilizationBand,
  validateCapacity,
  validateStock,
  weightedScores,
  type CapacityInputs,
  type LocFactor,
  type LocSite,
} from '../../src/lib/operations';

// Atelier Barro in October (simulated): costs from the case file, Exhibit 1, before the new tariff.
const OCTOBER: CapacityInputs = {
  capacity: 1200,
  output: 640,
  made: 680,
  rejected: 40,
  labourHours: 320,
  // 640 good mugs × €22 = €14,080
  outputValue: 14080,
  // €8,060 of monthly costs + 640 × €6.88 = €12,463.20
  inputCost: 12463.2,
  fixedCosts: 8060,
};

describe('capacity utilization and productivity', () => {
  it('applies the guide formulas and the standard definitions to October', () => {
    const m = capacityModel(OCTOBER);
    // 640 ÷ 1,200 × 100 = 53.33%
    expect(m.utilization).toBeCloseTo(53.3333, 4);
    expect(m.spare).toBe(560);
    // 40 ÷ 680 × 100 = 5.88%
    expect(m.defectRate).toBeCloseTo(5.8824, 4);
    // 640 ÷ 320 = 2 mugs a labour hour
    expect(m.labourProductivity).toBe(2);
    // €14,080 ÷ €12,463.20 × 100 = 112.97%
    expect(m.productivityRate).toBeCloseTo(112.9726, 4);
    // €8,060 ÷ 640 = €12.59 of fixed cost on each mug
    expect(m.fixedCostPerUnit).toBeCloseTo(12.5938, 4);
    expect(utilizationBand(m.utilization ?? 0)).toBe('low');
  });

  it('matches the case for November with the hotel order', () => {
    // 830 regular mugs + 300 for the hotel = 1,130 fired; the case says the kiln is at 94% of capacity
    const m = capacityModel({ ...OCTOBER, output: 1130, made: 1200, rejected: 70, labourHours: 560, outputValue: 21560, inputCost: 16004.4, fixedCosts: 8140 });
    // 1,130 ÷ 1,200 × 100 = 94.17%
    expect(m.utilization).toBeCloseTo(94.1667, 4);
    // Output value 830 × €22 + 300 × €11 = €21,560; inputs €8,140 + 830 × €7.18 + 300 × €5.85 + €150 = €16,004.40;
    // the difference, €5,555.60, is the case's November profit with the order (€4,160.60 + €1,395)
    expect(21560 - 16004.4).toBeCloseTo(5555.6, 6);
    // €21,560 ÷ €16,004.40 × 100 = 134.71%
    expect(m.productivityRate).toBeCloseTo(134.713, 3);
    expect(utilizationBand(m.utilization ?? 0)).toBe('busy');
    expect(readCapacity(m, '€', { one: 'mug', many: 'mugs' }).reading).toContain('94.2% of its capacity, with 70 mugs of spare capacity');
  });

  it('validates the inputs', () => {
    const raw = { ...OCTOBER } as Record<keyof CapacityInputs, number | null>;
    expect(validateCapacity(raw)).toEqual([]);
    expect(validateCapacity({ ...raw, output: 1300 })[0]?.field).toBe('output');
    expect(validateCapacity({ ...raw, rejected: 700 })[0]?.field).toBe('rejected');
    expect(validateCapacity({ ...raw, made: 690 })[0]?.message).toContain('should equal good output');
    expect(validateCapacity({ ...raw, capacity: null })[0]?.message).toBe('Enter a number.');
  });
});

describe('stock control', () => {
  // Atelier Barro's clay, in 25 kg bags: 3 a week, 2 weeks' lead time, 4 bags of buffer, orders of 12 bags.
  const PLAN = { usage: 3, leadTime: 2, buffer: 4, reorderQty: 12, weeks: 16 };

  it('computes the reorder level and maximum stock', () => {
    // 4 + 3 × 2 = 10 bags; 4 + 12 = 16 bags
    expect(reorderLevel(PLAN)).toBe(10);
    expect(maxStock(PLAN)).toBe(16);
  });

  it('draws the planned saw-tooth: each delivery arrives as stock reaches the buffer', () => {
    const run = simulateStock(PLAN);
    // Stock falls 16 → 10 in 2 weeks; the order arrives 2 weeks later at 10 − 6 = 4 bags
    expect(run.orders.map((o) => o.placed)).toEqual([2, 6, 10, 14]);
    expect(run.orders.map((o) => o.arrives)).toEqual([4, 8, 12, 16]);
    expect(run.minStock).toBe(4);
    expect(run.shortfall).toBe(0);
    expect(bufferUse(run)).toBe('none');
    expect(run.points).toContainEqual([4, 4]);
    expect(run.points).toContainEqual([4, 16]);
    expect(run.rows[1]).toMatchObject({ week: 2, start: 13, used: 3, end: 10, ordered: true });
  });

  it('uses part of the buffer in the November rush', () => {
    // Usage 4 a week in weeks 5 to 8: stock reaches 10 at week 5.5 (16 − 4 − 2), the order arrives at 7.5,
    // and 2 weeks at 4 bags uses 8, not 6: stock falls to 10 − 8 = 2 bags, so 2 of the 4 buffer bags are used
    const run = simulateStock(PLAN, { usage: [{ from: 5, to: 8, usage: 4 }] });
    expect(run.orders[1]).toEqual({ placed: 5.5, arrives: 7.5, level: 10 });
    expect(run.minStock).toBe(2);
    expect(run.minAt).toBe(7.5);
    expect(bufferUse(run)).toBe('some');
    expect(readStock(simulateStock(PLAN), run, { one: 'bag', many: 'bags' }).reading).toContain('the lowest point is 2 bags, in week 8, so 2 of the 4 bags of buffer stock are used');
  });

  it('uses part of the buffer when an order is a week late', () => {
    // The second order, placed at week 6, arrives at week 9: stock falls to 10 − 3 × 3 = 1 bag
    const run = simulateStock(PLAN, { late: { order: 2, extraWeeks: 1 } });
    expect(run.orders[1]?.arrives).toBe(9);
    expect(run.minStock).toBe(1);
    expect(bufferUse(run)).toBe('some');
  });

  it('records a stock-out and the usage it could not meet', () => {
    // Usage 7 a week from week 5: stock runs out at 6 + 2/7 and the order arrives at 6 + 6/7, so 7 × 4/7 = 4 bags are short
    const run = simulateStock(PLAN, { usage: [{ from: 5, to: 8, usage: 7 }] });
    expect(run.minStock).toBe(0);
    expect(run.shortfall).toBeCloseTo(4, 6);
    expect(bufferUse(run)).toBe('all');
  });

  it('validates the plan', () => {
    const raw = { usage: 3, leadTime: 2, buffer: 4, reorderQty: 12 };
    expect(validateStock(raw)).toEqual([]);
    expect(validateStock({ ...raw, usage: 0 })[0]?.field).toBe('usage');
    // 3 × 5 = 15 bags used during the lead time, more than an order of 12
    expect(validateStock({ ...raw, leadTime: 5 })[0]?.field).toBe('reorderQty');
    expect(validateStock({ ...raw, buffer: -1 })[0]?.message).toBe('Cannot be negative.');
  });
});

describe('location: weighted scoring', () => {
  // Marigold Kitchens' first Mumbai restaurant (simulated): scores from 1 to 10, weights from 0 to 5.
  const FACTORS: LocFactor[] = [
    { id: 'rent', label: 'Rent and running costs', weight: 4 },
    { id: 'customers', label: 'Customers nearby at lunch and dinner', weight: 5 },
    { id: 'produce', label: 'Access to fresh produce and suppliers', weight: 3 },
    { id: 'cooks', label: 'Cooks available to recruit', weight: 2 },
    { id: 'competition', label: 'Little direct competition nearby', weight: 2 },
    { id: 'brand', label: 'Fit with a home-style brand', weight: 3 },
  ];
  const SITES: LocSite[] = [
    { id: 'a', name: 'Site A', scores: { rent: 3, customers: 9, produce: 5, cooks: 6, competition: 3, brand: 7 } },
    { id: 'b', name: 'Site B', scores: { rent: 6, customers: 7, produce: 5, cooks: 5, competition: 6, brand: 3 } },
    { id: 'c', name: 'Site C', scores: { rent: 8, customers: 3, produce: 7, cooks: 7, competition: 7, brand: 7 } },
  ];
  const W = Object.fromEntries(FACTORS.map((f) => [f.id, f.weight]));

  it('totals the weighted scores', () => {
    const r = weightedScores(SITES, FACTORS, W, 10);
    // A: 4×3 + 5×9 + 3×5 + 2×6 + 2×3 + 3×7 = 111; B: 24 + 35 + 15 + 10 + 12 + 9 = 105; C: 32 + 15 + 21 + 14 + 14 + 21 = 117
    expect(r.map((x) => [x.id, x.total])).toEqual([
      ['c', 117],
      ['a', 111],
      ['b', 105],
    ]);
    // The best possible total is (4 + 5 + 3 + 2 + 2 + 3) × 10 = 190, so C has 117 ÷ 190 = 61.6%
    expect(r[0]?.share).toBeCloseTo(61.5789, 4);
  });

  it('finds the weights at which the ranking changes', () => {
    const s = sensitivity(SITES, FACTORS, W, 10);
    // Rent at 2: A = 111 − 6 = 105, C = 117 − 16 = 101. Produce at 0: A = 111 − 15 = 96, C = 117 − 21 = 96, a tie.
    // Competition at 0: A = 111 − 6 = 105, C = 117 − 14 = 103. Brand at 0: B = 105 − 9 = 96, C = 117 − 21 = 96, a tie.
    // Customers is already at the maximum, and lowering it only widens C's lead; cooks cannot close a gap of 6.
    expect(s).toEqual([
      { factor: 'rent', weight: 2, leaders: ['a'] },
      { factor: 'produce', weight: 0, leaders: ['a', 'c'] },
      { factor: 'competition', weight: 0, leaders: ['a'] },
      { factor: 'brand', weight: 0, leaders: ['b', 'c'] },
    ]);
    const r = readLocation(weightedScores(SITES, FACTORS, W, 10), s, SITES, FACTORS, W);
    expect(r.reading).toContain('Site C ranks first with 117 points, 6 ahead of Site A.');
    expect(r.reading).toContain('at a weight of 2 on rent and running costs (now 4), Site A ranks first');
    expect(r.reading).toContain('at a weight of 0 on access to fresh produce and suppliers (now 3), Site A and Site C tie');
  });

  it('flags the low scores a total can hide', () => {
    expect(lowScores(SITES, FACTORS, 3)).toEqual([
      { site: 'a', factor: 'rent', score: 3 },
      { site: 'a', factor: 'competition', score: 3 },
      { site: 'b', factor: 'brand', score: 3 },
      { site: 'c', factor: 'customers', score: 3 },
    ]);
  });
});
