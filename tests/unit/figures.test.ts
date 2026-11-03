/**
 * The diagram library's numbers, checked against values worked by hand, and
 * the library's integrity: every diagram renders, names real subtopics and
 * carries a text description.
 */
import { describe, expect, it } from 'vitest';
import { DIAGRAMS, describe as descOf, standalone } from '../../src/lib/diagrams';
import { cpa, describeData, regression, REG, STATS_DATA } from '../../src/lib/figures/toolkit';
import { appraise, depreciation, financialPosition, forecast, profitOrLoss, variances } from '../../src/lib/figures/unit3';
import { marketFigures } from '../../src/lib/figures/unit4';
import { loadCorpus } from './helpers/corpus';

describe('diagram calculations', () => {
  it('works the critical path network', () => {
    const r = cpa([
      { id: 'A', from: 1, to: 2, d: 3 },
      { id: 'B', from: 2, to: 3, d: 4 },
      { id: 'C', from: 2, to: 4, d: 2 },
      { id: 'D', from: 3, to: 5, d: 5 },
      { id: 'E', from: 4, to: 5, d: 3 },
      { id: 'F', from: 5, to: 6, d: 2 },
    ]);
    expect(r.est).toEqual({ 1: 0, 2: 3, 3: 7, 4: 5, 5: 12, 6: 14 });
    expect(r.lft).toEqual({ 1: 0, 2: 3, 3: 7, 4: 9, 5: 12, 6: 14 });
    expect(r.duration).toBe(14);
    const f = Object.fromEntries(r.floats.map((a) => [a.id, [a.total, a.free]]));
    expect(f).toEqual({ A: [0, 0], B: [0, 0], C: [4, 0], D: [0, 0], E: [4, 4], F: [0, 0] });
  });

  it('fits the least-squares line', () => {
    const r = regression(REG.x, REG.y);
    // Sxy = 112.5, Sxx = 42, Syy = 317.875 by hand.
    expect(r.b).toBeCloseTo(112.5 / 42, 10);
    expect(r.a).toBeCloseTo(30.375 - (112.5 / 42) * 5.5, 10);
    expect(r.r).toBeCloseTo(112.5 / Math.sqrt(42 * 317.875), 10);
    expect(r.r).toBeGreaterThan(0.97);
  });

  it('describes the data set', () => {
    const d = describeData(STATS_DATA);
    expect(d.mean).toBeCloseTo(251 / 11, 10);
    expect(d.median).toBe(21);
    expect(d.q1).toBe(15);
    expect(d.q3).toBe(28);
    expect(d.modes).toEqual([15]);
    expect(d.min).toBe(12);
    expect(d.max).toBe(42);
  });

  it('builds the statement of profit or loss', () => {
    expect(profitOrLoss()).toEqual({ grossProfit: 200, pbit: 80, pbt: 70, tax: 14, profitForPeriod: 56, retained: 36 });
  });

  it('balances the statement of financial position', () => {
    const f = financialPosition();
    expect(f.currentAssets).toBe(150);
    expect(f.totalAssets).toBe(450);
    expect(f.totalLiabilities).toBe(200);
    expect(f.netAssets).toBe(250);
    expect(f.equity).toBe(f.netAssets);
    expect(f.retainedEarnings).toBe(100);
  });

  it('depreciates by both methods to the residual value', () => {
    const d = depreciation();
    expect(d.sl).toBe(9000);
    expect(d.perUnit).toBe(0.5);
    expect(d.nbvSL).toEqual([50000, 41000, 32000, 23000, 14000, 5000]);
    expect(d.nbvUP).toEqual([50000, 35000, 22500, 15000, 9000, 5000]);
  });

  it('carries each closing balance into the next month', () => {
    const rows = forecast();
    expect(rows.map((r) => r.net)).toEqual([-2000, -5000, 5000]);
    expect(rows.map((r) => r.closing)).toEqual([3000, -2000, 3000]);
    expect(rows[1]!.opening).toBe(rows[0]!.closing);
    expect(rows[2]!.opening).toBe(rows[1]!.closing);
  });

  it('works payback and ARR', () => {
    const r = appraise();
    expect(r.cum).toEqual([-100, -70, -35, 5, 45, 75]);
    expect(r.payback).toBeCloseTo(2.875, 10);
    expect(r.arr).toBeCloseTo(15, 10);
  });

  it('labels variances by their effect on profit', () => {
    const v = variances();
    expect(v.rows.map((r) => `${r.amount}${r.flag}`)).toEqual(['12F', '6A', '1F', '0']);
    expect(v.profit).toEqual({ budget: 40, actual: 47, amount: 7, flag: 'F' });
  });

  it('works market share and growth', () => {
    const m = marketFigures();
    expect(m.totalLast).toBe(40);
    expect(m.totalNow).toBeCloseTo(44, 10);
    expect(m.growth).toBeCloseTo(10, 10);
    expect(m.shares[1]!.last).toBeCloseTo(25, 10);
    expect(m.shares[1]!.now).toBeCloseTo(27.5, 10);
  });
});

describe('the diagram library', () => {
  const c = loadCorpus();
  const codes = new Set((c.curricula['ib-dp-bm']?.units ?? []).flatMap((u) => u.subtopics.map((s) => s.code)));

  it.each(Object.entries(DIAGRAMS))('%s renders, describes itself and names real subtopics', (id, d) => {
    const svg = d.render(`t-${id}`);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain(`aria-labelledby="t-${id}-t t-${id}-d"`);
    expect(descOf(svg).length).toBeGreaterThan(80);
    // An enrichment diagram is beyond the course: it names no subtopic, so it never counts as IB coverage.
    if (d.group === 'enrichment') expect(d.syllabus, `${id} is enrichment`).toEqual([]);
    else expect(d.syllabus.length).toBeGreaterThan(0);
    for (const code of d.syllabus) expect(codes.has(code), `${id}: ${code}`).toBe(true);
    // No en or em dashes in what readers see.
    expect(/[–—]/.test(svg)).toBe(false);
    expect(standalone(id)).toContain('The Business Brief');
  });
});
