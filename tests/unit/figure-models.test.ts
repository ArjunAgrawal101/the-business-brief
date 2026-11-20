/**
 * The arithmetic behind the diagrams a reader can change (src/lib/figure-models.ts)
 * and their readings in words (src/lib/figures/live.ts), against figures worked by hand.
 */
import { describe, expect, it } from 'vitest';
import {
  CASH_BASE,
  CASH_DEFAULTS,
  LEAN_PROCESS,
  PROJECTS,
  TIDEWATER,
  cashTimeline,
  compareProjects,
  dashboardRatios,
  flowSummary,
  hierarchy,
  ratioMovements,
  ratioProblems,
} from '../../src/lib/figure-models';
import { LIVE, defaults, readingHtml } from '../../src/lib/figures/live';
import { DIAGRAMS } from '../../src/lib/diagrams';
import { volumeShare } from '../../src/lib/figures/unit45-more';

const round2 = (v: number | null) => (v === null ? null : Math.round(v * 100) / 100);

describe('span of control and levels of hierarchy', () => {
  it('builds the levels from the front line up, rounding each up', () => {
    expect(hierarchy(64, 4)).toEqual({ levels: [1, 4, 16, 64], managers: 21, total: 85, chain: 3 });
    expect(hierarchy(64, 8)).toEqual({ levels: [1, 8, 64], managers: 9, total: 73, chain: 2 });
    expect(hierarchy(64, 2).levels).toEqual([1, 2, 4, 8, 16, 32, 64]);
    expect(hierarchy(64, 2).managers).toBe(63);
    // 100 staff with a span of 7: 15 managers above them (100 ÷ 7 = 14.3, rounded up), 3 above those, then 1.
    expect(hierarchy(100, 7)).toEqual({ levels: [1, 3, 15, 100], managers: 19, total: 119, chain: 3 });
    // A span as wide as the front line: one manager, two levels.
    expect(hierarchy(12, 12)).toEqual({ levels: [1, 12], managers: 1, total: 13, chain: 1 });
  });

  it('refuses a front line or a span it cannot use', () => {
    expect(() => hierarchy(1, 4)).toThrow();
    expect(() => hierarchy(64, 1)).toThrow();
    expect(() => hierarchy(64.5, 4)).toThrow();
  });

  it('reads the structure in words, with the effect of delayering', () => {
    const r = LIVE.span.read({ frontLine: 64, span: 4 });
    expect(r.problems).toEqual([]);
    expect(r.rows).toContainEqual(['Managers above the front line', '21']);
    expect(r.reading).toContain('Doubling the span to 8 would leave 3 levels and 9 managers: 1 level fewer and 12 fewer managers');
    expect(LIVE.span.read({ frontLine: 64, span: 25 }).problems.map((p) => p.key)).toEqual(['span']);
    expect(LIVE.span.read({ frontLine: Number.NaN, span: 4 }).problems.map((p) => p.key)).toEqual(['frontLine']);
  });
});

describe('profit and cash, month by month', () => {
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  it('works the example: two months’ credit to customers, suppliers paid at once', () => {
    const t = cashTimeline(CASH_DEFAULTS);
    expect(t.rows.map((r) => r.receipts)).toEqual([0, 0, 8000, 9000, 10000, 11000]);
    expect(t.rows.map((r) => r.payments)).toEqual([6200, 6600, 7000, 7400, 7800, 8200]);
    expect(t.rows.map((r) => r.closing)).toEqual([-2200, -8800, -7800, -6200, -4000, -1200]);
    expect(t.rows.map((r) => r.profit)).toEqual([1800, 2400, 3000, 3600, 4200, 4800]);
    expect(t.profit).toBe(19800);
    expect(t.debtors).toBe(25000);
    expect(t.creditors).toBe(0);
    expect(t.overLimit).toEqual(['February', 'March', 'April']);
    expect(t.lowest).toEqual({ month: 'February', closing: -8800 });
    expect(t.rows.map((r) => r.status)).toEqual(['overdraft', 'over-limit', 'over-limit', 'over-limit', 'overdraft', 'overdraft']);
  });

  it('works cash on delivery with a month’s credit from suppliers', () => {
    const t = cashTimeline({ customerCredit: 0, supplierCredit: 1, opening: 4000, overdraft: 5000 });
    expect(t.rows.map((r) => r.closing)).toEqual([9000, 11800, 15200, 19200, 23800, 29000]);
    expect(t.creditors).toBe(5200);
    expect(t.debtors).toBe(0);
    expect(t.overLimit).toEqual([]);
  });

  it('carries each closing balance into the next month, and reconciles cash to profit', () => {
    for (const cc of [0, 1, 2, 3])
      for (const sc of [0, 1, 2]) {
        const t = cashTimeline({ customerCredit: cc, supplierCredit: sc, opening: 2500, overdraft: 0 });
        t.rows.forEach((r, i) => {
          if (i > 0) expect(r.opening).toBe(t.rows[i - 1]!.closing);
          expect(r.closing).toBe(r.opening + r.receipts - r.payments);
        });
        // Cash = opening + profit − what customers still owe + what is still owed to suppliers (no stock, no depreciation).
        expect(t.closing).toBe(2500 + t.profit - t.debtors + t.creditors);
        expect(t.profit).toBe(sum(CASH_BASE.units) * (CASH_BASE.price - CASH_BASE.materials) - CASH_BASE.fixed * CASH_BASE.units.length);
      }
  });

  it('reads the result in words and names a bad figure', () => {
    const r = LIVE.cash.read({ customerCredit: 2, supplierCredit: 0, opening: 4000, overdraft: 5000 });
    expect(r.reading).toContain('February, March and April');
    expect(r.reading).toContain('opening $4,000 + profit $19,800 − debtors $25,000 + creditors $0 = −$1,200');
    expect(r.table?.rows[1]).toEqual(['February', '0', '6,600', '(8,800)']);
    expect(LIVE.cash.read({ customerCredit: 5, supplierCredit: 0, opening: 4000, overdraft: 5000 }).problems.map((p) => p.key)).toEqual(['customerCredit']);
  });
});

describe('profitability and liquidity at a glance', () => {
  it('matches the ratios worked in the notes on 3.5', () => {
    const a = dashboardRatios(TIDEWATER.a);
    const b = dashboardRatios(TIDEWATER.b);
    expect([a.gpm, a.pm, a.roce, a.current, a.acid].map(round2)).toEqual([55.95, 16.67, 26.67, 2, 1.07]);
    expect([b.gpm, b.pm, b.roce, b.current, b.acid].map(round2)).toEqual([50, 10, 14.34, 1.61, 0.55]);
    expect(Object.values(ratioMovements(a, b))).toEqual(['down', 'down', 'down', 'down', 'down']);
  });

  it('marks a ratio that rose, and one that did not move at two decimal places', () => {
    const a = dashboardRatios(TIDEWATER.a);
    const b = dashboardRatios({ ...TIDEWATER.a, currentAssets: 151, stock: 71 });
    const m = ratioMovements(a, b);
    // 151 ÷ 75 = 2.01; (151 − 71) ÷ 75 = 1.07, as before.
    expect(m.current).toBe('up');
    expect(m.acid).toBe('same');
  });

  it('refuses figures the ratios cannot use', () => {
    expect(ratioProblems(TIDEWATER.b)).toEqual([]);
    expect(ratioProblems({ ...TIDEWATER.b, stock: 300 }).map((p) => p.field)).toEqual(['stock']);
    expect(ratioProblems({ ...TIDEWATER.b, salesRevenue: 0 }).map((p) => p.field)).toEqual(['salesRevenue']);
    expect(ratioProblems({ ...TIDEWATER.b, expenses: -1 }).map((p) => p.field)).toEqual(['expenses']);
  });

  it('reads the movement and the acid test in words', () => {
    const v = defaults((DIAGRAMS['ratio-dashboard']!.ix as { inputs: Array<{ key: string; value: number }> }).inputs);
    const r = LIVE.ratios.read(v);
    expect(r.reading).toContain('lower than in 2025');
    expect(r.reading).toContain('The acid test ratio is below 1');
    expect(r.table?.rows[0]).toEqual(['Gross profit margin', '55.95%', '50.00%', 'Down 5.95 points']);
  });
});

describe('two projects, three methods', () => {
  it('works payback, ARR and NPV for both projects, and finds that the methods disagree', () => {
    const c = compareProjects(PROJECTS[0], PROJECTS[1], 10);
    expect(c.a.payback?.total).toBeCloseTo(2.5, 10);
    expect(c.b.payback?.total).toBeCloseTo(3.2, 10);
    expect(c.a.arr).toBeCloseTo(6, 10);
    expect(c.b.arr).toBeCloseTo(20, 10);
    // 50 × 0.9091 + 40 × 0.8264 + 20 × 0.7513 + 10 × 0.6830 + 10 × 0.6209 − 100
    expect(c.a.npv).toBeCloseTo(6.576, 10);
    // 20 × 0.9091 + 30 × 0.8264 + 40 × 0.7513 + 50 × 0.6830 + 60 × 0.6209 − 100
    expect(c.b.npv).toBeCloseTo(44.43, 10);
    expect(c.prefer).toEqual({ payback: 'a', arr: 'b', npv: 'b' });
    expect(c.conflict).toBe(true);
  });

  it('uses the guide’s factors at 20%, where A no longer covers its cost', () => {
    const c = compareProjects(PROJECTS[0], PROJECTS[1], 20);
    expect(c.a.npv).toBeCloseTo(-10.143, 10);
    expect(c.b.npv).toBeCloseTo(8.875, 10);
  });

  it('agrees when one project is better on every count, and calls a tie a tie', () => {
    const better = { ...PROJECTS[1], returns: [60, 50, 40, 30, 20] };
    expect(compareProjects(PROJECTS[0], better, 10).conflict).toBe(false);
    expect(compareProjects(PROJECTS[0], { ...PROJECTS[0], id: 'b' }, 10).prefer).toEqual({ payback: 'tie', arr: 'tie', npv: 'tie' });
  });

  it('reads the disagreement in words, and the table marks NPV as HL', () => {
    const v = defaults((DIAGRAMS['investment-compare']!.ix as { inputs: Array<{ key: string; value: number }> }).inputs);
    const r = LIVE.invest.read(v);
    expect(r.reading).toContain('The methods disagree. Payback prefers A; the ARR and NPV prefer B.');
    expect(r.table?.rows.map((row) => row[3])).toEqual(['A', 'B', 'B']);
    expect(r.table?.rows[2]![0]).toBe('NPV at 10% (HL)');
    expect(LIVE.invest.read({ ...v, rate: 12 }).problems.map((p) => p.key)).toEqual(['rate']);
    expect(LIVE.invest.read({ ...v, aCost: 0 }).problems.map((p) => p.key)).toEqual(['aCost']);
  });
});

describe('a process before and after lean production', () => {
  it('adds up the lead time and the share that adds value', () => {
    const before = flowSummary(LEAN_PROCESS.before);
    const after = flowSummary(LEAN_PROCESS.after);
    expect(before).toMatchObject({ lead: 73, valueAdded: 9, waste: 64 });
    expect(before.share).toBeCloseTo((9 / 73) * 100, 10);
    expect(after).toMatchObject({ lead: 16.5, valueAdded: 9, waste: 7.5 });
    expect(after.share).toBeCloseTo((9 / 16.5) * 100, 10);
    // Lean production cuts waste, not the work: every step that adds value is unchanged.
    expect(LEAN_PROCESS.after.filter((s) => s.kind === 'value')).toEqual(LEAN_PROCESS.before.filter((s) => s.kind === 'value'));
  });
});

describe('one market segmented by usage', () => {
  it('works each segment’s share of the drinks sold', () => {
    const segs = [
      { label: 'Daily', count: 9, perMonth: 30, need: '' },
      { label: 'Weekly', count: 21, perMonth: 4, need: '' },
      { label: 'Now and then', count: 18, perMonth: 1, need: '' },
    ];
    // 270 + 84 + 18 = 372 drinks a month.
    expect(volumeShare(segs, 0)).toBeCloseTo((270 / 372) * 100, 10);
    expect(volumeShare(segs, 2)).toBeCloseTo((18 / 372) * 100, 10);
  });
});

describe('the readings as HTML', () => {
  it('escapes what it writes and keeps the table’s header cells', () => {
    const html = readingHtml({ rows: [['A < B', '1 & 2']], table: { caption: 'T', head: ['Month', 'Cash'], rows: [['May', '(4,000)']] }, reading: 'Done.', problems: [] });
    expect(html).toContain('<dt>A &lt; B</dt><dd>1 &amp; 2</dd>');
    expect(html).toContain('<th scope="row">May</th><td>(4,000)</td>');
    expect(html).not.toMatch(/undefined|NaN|\[object Object\]/);
  });
});
