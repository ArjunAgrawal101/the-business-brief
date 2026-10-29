/**
 * Investment appraisal against figures worked by hand with the guide's
 * discount table (p. 66), for the two Halden Distribution projects in
 * src/content/interactives/finance-investment-halden.yaml.
 */
import { describe, expect, it } from 'vitest';
import {
  DISCOUNT_TABLE,
  RATES,
  appraise,
  arr,
  cumulative,
  discountFactor,
  fmtPayback,
  npv,
  payback,
  projectInputs,
  readAppraisals,
  validateProject,
  type Project,
} from '../../src/lib/investment';
import { buildWorking } from '../../src/lib/finance';
import { loadCorpus } from './helpers/corpus';

const c = loadCorpus();
const desk = c.interactives['finance-investment-halden'];
if (desk?.component !== 'investment-appraisal') throw new Error('investment desk missing');
const [A, B] = desk.projects.map((p) => ({ id: p.id, label: p.label, capitalCost: p.capitalCost, returns: p.returns })) as [Project, Project];

describe('the discount table', () => {
  it('holds the guide’s factors, each within rounding of 1 ÷ (1 + r)^t but one', () => {
    expect(DISCOUNT_TABLE[10]).toEqual([0.9091, 0.8264, 0.7513, 0.683, 0.6209, 0.5645, 0.5132, 0.4665, 0.4241, 0.3855]);
    expect(discountFactor(8, 5)).toBe(0.6806);
    expect(discountFactor(20, 10)).toBe(0.1615);
    for (const r of RATES) {
      for (let t = 1; t <= 10; t++) {
        if (r === 6 && t === 8) continue;
        expect(Math.abs(discountFactor(r, t) - 1 / (1 + r / 100) ** t), `${r}% year ${t}`).toBeLessThanOrEqual(0.00005);
      }
    }
  });

  it('keeps the one factor the guide prints differently from the formula: 6% in year 8', () => {
    // The guide prints 0.6271; 1 ÷ 1.06^8 = 0.627412, which is 0.6274 to four places.
    // The platform uses the printed figure, because that is the table an examination provides.
    expect(discountFactor(6, 8)).toBe(0.6271);
    expect(Math.round((1 / 1.06 ** 8) * 10000) / 10000).toBe(0.6274);
  });

  it('covers ten years only', () => {
    expect(() => discountFactor(10, 11)).toThrow(/years 1 to 10/);
  });
});

describe('Project A: the pack-and-label line', () => {
  it('cumulative cash flow and payback', () => {
    // −600,000; −600,000 + 90,000 = −510,000; −360,000; −180,000; 0; 180,000; 330,000
    expect(cumulative(A)).toEqual([-600000, -510000, -360000, -180000, 0, 180000, 330000]);
    expect(payback(A)).toEqual({ years: 4, months: 0, total: 4, inYear: 4 });
    expect(fmtPayback(payback(A))).toBe('4 years');
  });

  it('ARR as the guide defines it', () => {
    // ((930,000 − 600,000) ÷ 6) ÷ 600,000 × 100 = 55,000 ÷ 600,000 × 100 = 9.1667
    expect(arr(A)).toBeCloseTo(9.166667, 6);
  });

  it('NPV at 4, 10 and 20 per cent', () => {
    // 10%: 81,819 + 123,960 + 135,234 + 122,940 + 111,762 + 84,675 = 660,390; − 600,000 = 60,390
    expect(npv(A, 10)).toBeCloseTo(60390, 6);
    // 20%: 74,997 + 104,160 + 104,166 + 86,814 + 72,342 + 50,235 = 492,714; − 600,000 = −107,286
    expect(npv(A, 20)).toBeCloseTo(-107286, 6);
    // 4%: 86,535 + 138,690 + 160,020 + 153,864 + 147,942 + 118,545 = 805,596; − 600,000 = 205,596
    expect(npv(A, 4)).toBeCloseTo(205596, 6);
  });
});

describe('Project B: voice picking', () => {
  it('payback in years and months', () => {
    // −240,000; −130,000; −30,000; +30,000 in year 3; 30,000 ÷ 60,000 = 0.5 of a year = 6 months
    expect(payback(B)).toEqual({ years: 2, months: 6, total: 2.5, inYear: 3 });
    expect(fmtPayback(payback(B))).toBe('2 years and 6 months');
  });

  it('ARR and NPV', () => {
    // ((300,000 − 240,000) ÷ 4) ÷ 240,000 × 100 = 15,000 ÷ 240,000 × 100 = 6.25
    expect(arr(B)).toBeCloseTo(6.25, 9);
    // 10%: 100,001 + 82,640 + 45,078 + 20,490 = 248,209; − 240,000 = 8,209
    expect(npv(B, 10)).toBeCloseTo(8209, 6);
    // 20%: 91,663 + 69,440 + 34,722 + 14,469 = 210,294; − 240,000 = −29,706
    expect(npv(B, 20)).toBeCloseTo(-29706, 6);
  });

  it('a larger first-year return brings payback into year 2', () => {
    // −240,000 + 150,000 = −90,000; 90,000 ÷ 100,000 = 0.9 of year 2 = 10.8 months
    const p = { ...B, returns: [150000, 100000, 60000, 30000] };
    expect(payback(p)?.total).toBeCloseTo(1.9, 9);
    expect(fmtPayback(payback(p))).toBe('1 year and 10.8 months');
  });
});

describe('edge cases', () => {
  it('a project that never pays back', () => {
    const p: Project = { id: 'x', label: 'X', capitalCost: 100, returns: [20, 20] };
    expect(payback(p)).toBeNull();
    expect(fmtPayback(null)).toBe('Not within its life');
    expect(buildWorking('payback-period', projectInputs(p), '£').error).toMatch(/does not pay back/);
  });

  it('months that round to twelve are shown as the next whole year', () => {
    // 500 ÷ 501 × 12 = 11.976 months, which rounds to 12.0
    expect(fmtPayback(payback({ id: 'x', label: 'X', capitalCost: 1000, returns: [500, 501] }))).toBe('2 years');
  });

  it('validation names the field', () => {
    expect(validateProject({ id: 'a', capitalCost: 0, returns: [1] })[0]?.field).toBe('a-cost');
    expect(validateProject({ id: 'a', capitalCost: 10, returns: [1, null] })[0]?.field).toBe('a-r2');
  });

  it('NPV needs a rate from the table', () => {
    expect(buildWorking('net-present-value', { cost: 100, rate: 12, r1: 120 }, '£').error).toMatch(/discount table/);
  });
});

describe('the workings and the readings', () => {
  it('payback, ARR and NPV workings give the answers worked by hand', () => {
    expect(buildWorking('payback-period', projectInputs(B), '£').answer).toBe('2 years and 6 months');
    expect(buildWorking('average-rate-of-return', projectInputs(A), '£').answer).toBe('9.17%');
    const w = buildWorking('net-present-value', projectInputs(A, 10), '£');
    expect(w.answer).toBe('£60,390');
    expect(w.steps[0]).toBe('Year 1: 90,000 × 0.9091 = 81,819');
  });

  it('the methods disagree at 10%: payback prefers B, ARR and NPV prefer A', () => {
    const r = readAppraisals(appraise(A, 10), appraise(B, 10), 10, '£');
    expect(r.prefers).toEqual({ payback: 'Project B', arr: 'Project A', npv: 'Project A' });
    expect(r.agreement).toMatch(/^The methods disagree/);
  });

  it('at 20% neither project is worth its cost', () => {
    const r = readAppraisals(appraise(A, 20), appraise(B, 20), 20, '£');
    expect(r.npv).toMatch(/neither project is worth its cost/);
    expect(r.npv).toMatch(/Project B loses less/);
  });

  it('SL readings leave NPV out', () => {
    const r = readAppraisals(appraise(A, 10), appraise(B, 10), 10, '£', false);
    expect(r.prefers.npv).toBeNull();
    expect(r.agreement).not.toMatch(/NPV/);
  });

  it('the worked examples in the calculation register are Project A', () => {
    expect(c.calculations['payback-period']?.example?.inputs).toEqual(projectInputs(A));
    expect(c.calculations['average-rate-of-return']?.example?.inputs).toEqual(projectInputs(A));
    expect(c.calculations['net-present-value']?.example?.inputs).toEqual(projectInputs(A, 10));
  });
});
