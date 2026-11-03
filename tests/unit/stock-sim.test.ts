import { describe, expect, it } from 'vitest';
import { planWarnings, readPlan, simulatePlan, stockArea, stockCsvRows, suggestedReorderLevel, validatePlan, weekList, type StockSimInputs } from '../../src/lib/stock-sim';
import { stockOutIntervals, stockSimSvg, stockSimRowsHtml } from '../../src/lib/stock-sim-view';
import { simulateStock } from '../../src/lib/operations';
import { loadTool } from './helpers/room-tool';

// Wrenhurst Cycles' gear sets (fictional), as in the notes on production planning.
const BUSY = [200, 200, 200, 200, 200, 200, 250, 250, 250, 250, 200, 200, 200, 200, 200, 200];
const BASE: StockSimInputs = {
  opening: 1000,
  leadTime: 2,
  buffer: 200,
  reorderLevel: 600,
  reorderQty: 800,
  demand: BUSY,
  late: { order: 2, extraWeeks: 1 },
  costs: { holding: 0.06, ordering: 96, shortage: 200 },
};
const UNITS = { one: 'gear set', many: 'gear sets' };

describe('the plan in the notes, with steady demand', () => {
  it('reorders at 600 every four weeks and never touches the buffer', () => {
    const r = simulatePlan({ ...BASE, demand: Array(16).fill(200), late: null });
    expect(r.run.orders.map((o) => [o.placed, o.arrives])).toEqual([
      [2, 4],
      [6, 8],
      [10, 12],
      [14, 16],
    ]);
    // Each delivery arrives just as stock reaches the buffer.
    expect(r.run.minStock).toBe(200);
    expect(r.stockOutWeeks).toEqual([]);
    expect(r.belowBufferWeeks).toEqual([]);
    expect(r.serviceLevel).toBe(100);
    expect(r.suggestedReorderLevel).toBe(600);
    expect(r.maxStock).toBe(1000);
  });
  it('reaches zero, but no further, when one delivery is a week late', () => {
    // The notes: the 200-set buffer covers exactly one week's delay at normal usage.
    const r = simulatePlan({ ...BASE, demand: Array(16).fill(200), late: { order: 2, extraWeeks: 1 } });
    expect(r.run.minStock).toBe(0);
    expect(r.unmetTotal).toBe(0);
  });
});

describe('a busy spell and a late delivery, worked by hand', () => {
  const r = simulatePlan(BASE);
  it('places the orders at weeks 2, 6, 9.8 and 13.75', () => {
    // Order 2 is placed at 6 and arrives at 9, a week late; stock then reaches 600 again at 9 + 200 ÷ 250 = 9.8,
    // and after the delivery at 11.8 lifts it to 990, at 11.8 + 390 ÷ 200 = 13.75.
    expect(r.run.orders.map((o) => o.placed)).toEqual([2, 6, 9.8, 13.75]);
    expect(r.run.orders[1]?.arrives).toBe(9);
    expect(r.ordersPlaced).toBe(4);
  });
  it('runs out at week 8.4 and misses 150 gear sets of demand in week 9', () => {
    // From 600 at week 6: 350 at week 7, 100 at week 8, zero at 8 + 100 ÷ 250 = 8.4; 0.6 × 250 = 150 unmet.
    expect(r.run.minStock).toBe(0);
    expect(r.run.minAt).toBe(8.4);
    expect(r.stockOutWeeks).toEqual([9]);
    expect(r.unmetTotal).toBe(150);
    expect(r.run.rows[8]?.unmet).toBe(150);
    expect(r.run.rows[8]?.used).toBe(100);
    // 3,400 demanded, 3,250 met
    expect(r.demandTotal).toBe(3400);
    expect(r.serviceLevel).toBeCloseTo((3250 / 3400) * 100, 10);
  });
  it('averages 540.94 gear sets of stock: an area of 8,655 unit-weeks over 16 weeks', () => {
    expect(stockArea(r.run.points)).toBeCloseTo(8655, 9);
    expect(r.averageStock).toBeCloseTo(540.9375, 9);
  });
  it('costs $519.30 to hold, $384 to order and $30,000 in lost contribution', () => {
    expect(r.holdingCost).toBeCloseTo(519.3, 9);
    expect(r.orderingCost).toBe(384);
    expect(r.shortageCost).toBe(30000);
    expect(r.totalCost).toBeCloseTo(30903.3, 9);
  });
  it('suggests a reorder level of 625: 200 + 212.5 × 2', () => {
    expect(suggestedReorderLevel(200, BUSY, 2)).toBe(625);
    expect(r.suggestedReorderLevel).toBe(625);
  });
  it('says where stock ran out and what it cost', () => {
    const t = readPlan(r, UNITS, '$');
    expect(t.reading).toContain('Stock runs out in week 9: 150 gear sets of demand cannot be met (4.4% of the total), costing $30,000');
    expect(t.implication).toContain('about 0.9 weeks of average demand');
  });
  it('flags the stock-out on the chart and in the table', () => {
    expect(stockOutIntervals(r.run.points)).toEqual([[8.4, 9]]);
    const svg = stockSimSvg(r, { id: 's', units: UNITS });
    expect(svg).toContain('>Stock-out<');
    expect(svg).toContain('Stock runs out in week 9, and 150 gear sets of demand cannot be met.');
    expect(svg).toContain('Order 2 arrives 1 week late');
    expect(stockSimRowsHtml(r)).toContain('class="is-out"');
  });
});

describe('a bigger buffer', () => {
  it('protects production through the same busy spell and late delivery, for a little more holding cost', () => {
    const before = simulatePlan(BASE);
    const after = simulatePlan({ ...BASE, buffer: 350, reorderLevel: 750 });
    expect(after.unmetTotal).toBe(0);
    expect(after.holdingCost).toBeGreaterThan(before.holdingCost);
    expect(after.totalCost).toBeLessThan(before.totalCost);
  });
});

describe('the shared simulation', () => {
  it('still gives the original chart its own results when no options are passed', () => {
    const run = simulateStock({ usage: 200, leadTime: 2, buffer: 200, reorderQty: 800, weeks: 8 });
    expect(run.reorderLevel).toBe(600);
    expect(run.rows[0]?.demand).toBe(200);
    expect(run.rows.every((w) => w.unmet === 0)).toBe(true);
  });
  it('starts from the opening stock given, and orders at once if it is at the reorder level', () => {
    const run = simulateStock({ usage: 200, leadTime: 2, buffer: 200, reorderQty: 800, weeks: 4 }, {}, { opening: 600, reorderLevel: 600 });
    expect(run.orders[0]?.placed).toBe(0);
  });
});

describe('checking a plan', () => {
  const raw = { ...BASE.costs, opening: 1000, leadTime: 2, buffer: 200, reorderLevel: 600, reorderQty: 800, demand: BUSY as Array<number | null>, late: { order: 2, extraWeeks: 1 } as { order: number | null; extraWeeks: number | null } | null };
  it('accepts the worked example', () => {
    expect(validatePlan(raw)).toEqual([]);
  });
  it('rejects impossible figures', () => {
    expect(validatePlan({ ...raw, reorderQty: 0 }).map((p) => p.field)).toEqual(['reorderQty']);
    expect(validatePlan({ ...raw, leadTime: 9 }).map((p) => p.field)).toEqual(['leadTime']);
    expect(validatePlan({ ...raw, demand: [200, null, 200, 200] }).map((p) => p.week)).toEqual([2]);
    expect(validatePlan({ ...raw, demand: [200, 200] }).map((p) => p.field)).toEqual(['demand']);
    expect(validatePlan({ ...raw, late: { order: 0, extraWeeks: 1 } }).map((p) => p.field)).toEqual(['lateOrder']);
  });
  it('warns about plans that run but are probably not meant', () => {
    expect(planWarnings({ ...BASE, reorderLevel: 150 })[0]).toContain('below the buffer');
    expect(planWarnings({ ...BASE, reorderLevel: 500 })[0]).toContain('dips into the buffer');
    expect(planWarnings({ ...BASE, reorderQty: 300 }).some((w) => w.includes('runs down with every order'))).toBe(true);
    expect(planWarnings({ ...BASE, reorderLevel: 625 })).toEqual([]);
  });
});

describe('words and files', () => {
  it('lists weeks in plain English', () => {
    expect(weekList([9])).toBe('week 9');
    expect(weekList([9, 10])).toBe('weeks 9 and 10');
    expect(weekList([3, 9, 10])).toBe('weeks 3, 9 and 10');
  });
  it('exports the plan week by week', () => {
    const rows = stockCsvRows(simulatePlan(BASE));
    expect(rows[0]?.[0]).toBe('Week');
    expect(rows[9]).toEqual(['9', '100', '250', '100', '150', '800', '800', '']);
  });
});

describe('the published worked example', () => {
  it('is the plan in the notes, run against the busy spell and the late delivery', () => {
    const t = loadTool('ops-stock-simulator', 'stock-simulator');
    const r = simulatePlan({ ...t.plan, demand: t.demand, late: t.late ?? null, costs: t.costs });
    expect(t.plan).toEqual({ opening: 1000, leadTime: 2, buffer: 200, reorderLevel: 600, reorderQty: 800 });
    expect(r.unmetTotal).toBe(150);
    expect(r.stockOutWeeks).toEqual([9]);
  });
});
