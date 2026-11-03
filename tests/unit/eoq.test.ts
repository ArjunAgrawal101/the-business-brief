import { describe, expect, it } from 'vitest';
import { costAt, discountCheck, eoq, eoqModel, eoqWorking, flatBand, readEoq, tableQuantities, validateEoq, type EoqInputs } from '../../src/lib/eoq';
import { eoqRowsHtml, eoqSvg } from '../../src/lib/eoq-view';
import { loadTool } from './helpers/room-tool';

// Wrenhurst Cycles' gear sets (fictional): 200 a week over 50 weeks.
const BASE: EoqInputs = { demand: 10000, orderCost: 96, holdingCost: 3, current: 1200, weeks: 50, buffer: 200, price: 30, discount: { minQty: 2000, price: 29.4 } };
const UNITS = { one: 'gear set', many: 'gear sets' };

describe('the economic order quantity', () => {
  it('is √(2 × 10,000 × 96 ÷ 3) = √640,000 = 800', () => {
    expect(eoq(10000, 96, 3)).toBe(800);
    expect(Number.isNaN(eoq(10000, 96, 0))).toBe(true);
  });
  it('makes yearly ordering cost equal the cost of holding the stock each order brings', () => {
    const c = costAt(800, BASE);
    // 10,000 ÷ 800 = 12.5 orders, × $96 = $1,200; 800 ÷ 2 × $3 = $1,200
    expect(c.ordersPerYear).toBe(12.5);
    expect(c.ordering).toBe(1200);
    expect(c.cycleHolding).toBe(1200);
    // The buffer of 200 adds 200 × $3 = $600 at any order size.
    expect(c.bufferHolding).toBe(600);
    expect(c.total).toBe(3000);
    // 50 weeks ÷ 12.5 orders = an order every 4 weeks, the cycle in the notes
    expect(c.weeksBetween).toBe(4);
  });
  it('finds that orders of 1,200 cost $200 a year more', () => {
    const m = eoqModel(BASE);
    // 10,000 ÷ 1,200 × 96 = 800; (600 + 200) × 3 = 2,400; total 3,200
    expect(m.atCurrent.ordering).toBeCloseTo(800, 10);
    expect(m.atCurrent.holding).toBe(2400);
    expect(m.atCurrent.total).toBeCloseTo(3200, 10);
    expect(m.extra).toBeCloseTo(200, 10);
    expect(m.extraShare).toBeCloseTo(200 / 3000, 10);
  });
});

describe('how flat the bottom is', () => {
  it('puts every order size from 584 to 1,096 within 5% of the lowest cost', () => {
    const [a, b] = flatBand(800, 0.05);
    // x = 1.05 ± √(1.05² − 1) = 1.05 ± 0.320156: 0.729844 and 1.370156
    expect(a).toBeCloseTo(583.875, 2);
    expect(b).toBeCloseTo(1096.125, 2);
    // Check by cost: at the band's edges, ordering plus cycle holding is exactly 5% above $2,400.
    const cycle = (q: number) => (10000 / q) * 96 + (q / 2) * 3;
    expect(cycle(a)).toBeCloseTo(2520, 6);
    expect(cycle(b)).toBeCloseTo(2520, 6);
  });
});

describe('the quantity discount', () => {
  it('saves $4,920 a year once the price is included', () => {
    const d = discountCheck(BASE, 800);
    if (!d) throw new Error('discount expected');
    // At the EOQ: $3,000 + 10,000 × $30 = $303,000. At 2,000: 5 × $96 = $480 + (1,000 + 200) × $3 = $3,600, + 10,000 × $29.40.
    expect(d.atEoq).toBe(303000);
    expect(d.atDiscount).toBeCloseTo(298080, 6);
    expect(d.saving).toBeCloseTo(4920, 6);
    expect(d.quantity).toBe(2000);
    expect(discountCheck({ ...BASE, discount: null }, 800)).toBeNull();
  });
  it('does not pay when the price cut is small', () => {
    const d = discountCheck({ ...BASE, discount: { minQty: 2000, price: 29.95 } }, 800);
    // 2,000: 4,080 + 299,500 = 303,580 against 303,000
    expect(d?.saving).toBeCloseTo(-580, 6);
  });
});

describe('words, workings and checks', () => {
  const m = eoqModel(BASE);
  it('reads the result in words', () => {
    const r = readEoq(m, UNITS, '$');
    expect(r.reading).toContain('The economic order quantity is 800 gear sets: 12.5 orders a year, one about every 4.0 weeks.');
    expect(r.reading).toContain('The buffer adds $600 a year whatever the order size, for a total of $3,000.');
    expect(r.reading).toContain('$200 (6.7%) more');
    expect(r.implication).toContain('between 584 and 1,096 gear sets');
    expect(r.implication).toContain('saves $4,920 a year');
  });
  it('works the formula in eight parts', () => {
    const w = eoqWorking(m, UNITS, '$');
    expect(w.formula).toBe('EOQ = √(2 × D × S ÷ H)');
    expect(w.steps).toEqual(['2 × 10,000 × 96 = 1,920,000', '÷ 3 = 640,000', '√640,000 = 800.00']);
    expect(w.answer).toBe('800 gear sets');
    expect(w.note).toContain('Enrichment');
  });
  it('rejects figures the formula cannot use', () => {
    const raw = { ...BASE, minQty: 2000, discountPrice: 29.4 };
    expect(validateEoq(raw, true)).toEqual([]);
    expect(validateEoq({ ...raw, holdingCost: 0 }, true).map((p) => p.field)).toEqual(['holdingCost']);
    expect(validateEoq({ ...raw, discountPrice: 31 }, true).map((p) => p.field)).toEqual(['discountPrice']);
    expect(validateEoq({ ...raw, discountPrice: 31 }, false)).toEqual([]);
  });
  it('tabulates a spread of order sizes with the EOQ and the reader’s own', () => {
    expect(tableQuantities(m)).toEqual([200, 400, 600, 800, 1000, 1200, 1600, 2000]);
    const html = eoqRowsHtml(m, '$');
    expect(html).toContain('class="is-eoq"');
    expect(html).toContain('Yours');
  });
  it('describes the chart with its result', () => {
    const svg = eoqSvg(m, { id: 'e', units: UNITS, currency: '$' });
    expect(svg).toContain('role="img"');
    expect(svg).toContain('they are equal, and their total is lowest, at the economic order quantity of 800 gear sets, $3,000 a year');
  });
});

describe('the published worked example', () => {
  it('is labelled enrichment and gives the notes’ reorder quantity', () => {
    const t = loadTool('ops-eoq', 'eoq-calculator');
    expect(t.provenance).toBe('enrichment');
    expect(t.guide.status).toBe('enrichment');
    expect(eoq(t.inputs.demand, t.inputs.orderCost, t.inputs.holdingCost)).toBe(800);
  });
});
