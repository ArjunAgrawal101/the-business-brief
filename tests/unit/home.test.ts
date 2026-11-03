import { describe, expect, it } from 'vitest';
import { CHALLENGES, isoWeek } from '../../src/lib/home';
import { PREVIEW_DEFAULTS, previewChart, previewLines, previewModel } from '../../src/lib/home-preview';

describe('ISO week', () => {
  it('matches known dates', () => {
    expect(isoWeek(new Date(2026, 10, 3))).toBe(45); // Tuesday 3 November 2026
    expect(isoWeek(new Date(2026, 0, 1))).toBe(1); // Thursday 1 January 2026
    expect(isoWeek(new Date(2027, 0, 1))).toBe(53); // Friday 1 January 2027 belongs to 2026's week 53
    expect(isoWeek(new Date(2024, 11, 30))).toBe(1); // Monday 30 December 2024 starts week 1 of 2025
  });
});

describe('the weekly financial challenges', () => {
  it('state answers worked by hand', () => {
    const [be, pb, mos, target] = CHALLENGES;
    // $90,000 ÷ ($40 − $25) = 6,000 units
    expect(be!.answer).toBe('6,000 units');
    // $100,000: after two years $30,000 remains, recovered 30/50 × 12 = 7.2 months into year 3
    expect(pb!.answer).toBe('2 years and 7.2 months');
    // 8,000 − 6,000 = 2,000 units; $15 × 8,000 − $90,000 = $30,000
    expect(mos!.answer).toBe('2,000 units; profit of $30,000');
    // ($90,000 + $30,000) ÷ $15 = 8,000 units; 6,000 × $40 = $240,000
    expect(target!.answer).toBe('8,000 units; break-even revenue $240,000');
  });
});

describe('the live break-even preview', () => {
  it('works the default figures', () => {
    const m = previewModel(PREVIEW_DEFAULTS);
    expect(m).toMatchObject({ ok: true, contribution: 15, breakEven: 6000, breakEvenRevenue: 240000, margin: 2000, profitAtOutput: 30000 });
    expect(previewLines(PREVIEW_DEFAULTS).map((l) => l.value)).toEqual(['$40 − $25 = $15', '$90,000 ÷ $15 = 6,000 units', '$240,000', '2,000 units', '$30,000']);
  });

  it('rounds break-even up to a whole unit', () => {
    expect(previewModel({ price: 10, variableCost: 7, fixedCosts: 1000, output: 400 }).breakEven).toBe(334);
  });

  it('explains when no output breaks even, and when inputs are invalid', () => {
    expect(previewModel({ price: 20, variableCost: 20, fixedCosts: 500, output: 10 })).toMatchObject({ ok: false });
    expect(previewModel({ price: Number.NaN, variableCost: 1, fixedCosts: 1, output: 1 })).toMatchObject({ ok: false });
    expect(previewLines({ price: 5, variableCost: 9, fixedCosts: 100, output: 10 })[0]!.label).toBe('Check the inputs');
  });

  it('draws an accessible chart that names the result', () => {
    const svg = previewChart(PREVIEW_DEFAULTS, 'x');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('cross at 6,000 units');
    expect(svg).toContain('makes $30,000');
  });
});
