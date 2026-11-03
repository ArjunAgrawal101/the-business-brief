import { describe, expect, it } from 'vitest';
import {
  GROUP_IDS,
  KINDS,
  KIND_IDS,
  SEED_MAX,
  SEED_MIN,
  check,
  drawAccounts,
  drawProject,
  drawSet,
  emptyP2,
  generate,
  kindsFor,
  parseAnswer,
  parseCode,
  parseP2,
  recordAttempt,
  recordTimed,
  score,
  type PracticeQuestion,
} from '../../src/lib/p2-practice';
import { balances, derive } from '../../src/lib/ratios';
import { payback, totalReturns } from '../../src/lib/investment';
import { rng } from '../../src/lib/random';

const cell = (q: PracticeQuestion, label: string) => q.tables.flatMap((t) => t.rows).find((r) => r.label === label)?.cells;

describe('Paper 2 practice: questions checked against figures worked by hand', () => {
  it('break-even quantity, rounded up (BEQ-12345)', () => {
    const q = generate('break-even-quantity', 12345);
    // $147,100 ÷ ($8.50 − $2.95) = 147,100 ÷ 5.55 = 26,504.50..., rounded up to 26,505 bags.
    expect([cell(q, 'Fixed costs per year'), cell(q, 'Selling price per bag of coffee'), cell(q, 'Variable cost per bag of coffee')]).toEqual([['$147,100'], ['$8.50'], ['$2.95']]);
    expect(q.exact).toBe(26505);
    expect(q.working.steps).toContain('147,100.00 ÷ 5.55 = 26,504.50');
    expect(check(q, '26,505').verdict).toBe('right');
    expect(check(q, '26504.50').verdict).toBe('close');
    expect(check(q, '26504').detail).toContain('Rounded down');
    expect(check(q, '17,306').detail).toContain('divided by the selling price');
  });

  it('margin of safety from the rounded break-even (MOS-12345)', () => {
    const q = generate('margin-of-safety', 12345);
    // $96,400 ÷ ($90 − $36) = 1,785.19, so 1,786 jumpers; 2,570 − 1,786 = 784.
    expect(cell(q, 'Fixed costs per year')).toEqual(['$96,400']);
    expect(cell(q, 'Forecast sales next year')).toEqual(['2,570 jumpers']);
    expect(q.exact).toBe(784);
    expect(check(q, '784 jumpers').verdict).toBe('right');
    expect(check(q, '784.81').verdict).toBe('close');
    expect(check(q, '-784').detail).toContain('wrong way round');
  });

  it('a loss at an output below break-even (PRO-12345)', () => {
    const q = generate('profit', 12345);
    // ($570 − $314) × 960 − $378,000 = 245,760 − 378,000 = −132,240.
    expect(q.exact).toBe(-132240);
    expect(check(q, '(132,240)').verdict).toBe('right');
    expect(check(q, '−132240').verdict).toBe('right');
    expect(check(q, '132,240').detail).toContain('sign');
    expect(check(q, '245,760').detail).toContain('total contribution');
  });

  it('target price, rounded up to the cent (TPR-12345)', () => {
    const q = generate('target-price', 12345);
    // ($32,400 + $24,000) ÷ 3,940 + $22 = 14.3147 + 22 = 36.3147, rounded up to $36.32.
    expect(q.exact).toBe(36.32);
    expect(check(q, '$36.32').verdict).toBe('right');
    expect(check(q, '14.31').detail).toContain('variable cost was left out');
  });

  it('gross profit margin, ROCE and stock turnover from statements that balance', () => {
    const gpm = generate('gross-profit-margin', 12345);
    // 1,512 ÷ 2,520 × 100 = 60%.
    expect(cell(gpm, 'Gross profit')).toEqual(['1,512']);
    expect(gpm.exact).toBeCloseTo(60, 10);
    expect(check(gpm, '60%').verdict).toBe('right');
    expect(check(gpm, '0.6').detail).toContain('fraction');
    const roce = generate('roce', 12345);
    // 264 ÷ (597 + 727) × 100 = 19.94%.
    expect(roce.exact).toBeCloseTo((264 / 1324) * 100, 10);
    expect(check(roce, '19.9').verdict).toBe('right');
    expect(check(roce, '36.31').detail).toContain('equity alone');
    const st = generate('stock-turnover-times', 12345);
    // 1,421 ÷ ((122 + 128) ÷ 2) = 11.368 times.
    expect(st.exact).toBeCloseTo(11.368, 10);
    expect(st.level).toBe('HL');
  });

  it('payback, ARR and NPV with the guide’s discount factors', () => {
    const pb = generate('payback-period', 12345);
    // $535,000: $176,000 left after year 1, recovered in year 2: 176,000 ÷ 304,000 = 0.5789 of a year, 6.9 months.
    expect(pb.exact).toBeCloseTo(1 + 176000 / 304000, 6);
    expect(pb.answer).toBe('1 year and 6.9 months (1.58 years)');
    expect(check(pb, '1 year 7 months').verdict).toBe('right');
    expect(check(pb, '1.58').verdict).toBe('right');
    expect(check(pb, '2').detail).toContain('whole of year 2');
    const a = generate('average-rate-of-return', 12345);
    // ((238,000 − 170,000) ÷ 6) ÷ 170,000 × 100 = 6.67%.
    expect(a.exact).toBeCloseTo((68000 / 6 / 170000) * 100, 10);
    expect(check(a, '6.67').verdict).toBe('right');
    expect(check(a, '40').detail).toContain('Divide the total profit by the 6 years');
    const n = generate('net-present-value', 12345);
    // 180,000 × 0.9615 + 158,000 × 0.9246 + 158,000 × 0.8890 + 101,000 × 0.8548 + 180,000 × 0.8219 + 187,000 × 0.7903 − 540,000 = 301,681.70.
    expect(n.exact).toBe(301681.7);
    expect(check(n, '301,682').verdict).toBe('right');
    expect(check(n, '841,681.70').detail).toContain('total present value');
    expect(n.level).toBe('HL');
  });

  it('a closing balance carried through the months, and working capital (CFB-12345, WCP-12345)', () => {
    const q = generate('closing-balance', 12345);
    // August: 15,000 + 36,500 − 25,500 = 26,000. September: 26,000 + 32,000 − 29,250 = 28,750.
    expect(q.exact).toBe(28750);
    expect(check(q, '28,750').verdict).toBe('right');
    expect(check(q, '2,750').detail).toContain('net cash flow');
    expect(check(q, '26,000').detail).toContain('opening balance');
    const w = generate('working-capital', 12345);
    // 1,155 − 812 = 343 ($000).
    expect(w.exact).toBe(343);
    expect(check(w, '343').verdict).toBe('right');
    expect(check(w, '343,000').detail).toContain('in $000');
  });
});

describe('the generator, across many seeds', () => {
  // Generation formats every figure with Intl, about 1 to 4 ms a question in Node: 80 seeds of 23 kinds take a few seconds.
  const seeds = Array.from({ length: 80 }, (_, i) => SEED_MIN + i * 1093);

  it('gives the same question for the same code, and reads its code back', () => {
    for (const kind of KIND_IDS) {
      const a = generate(kind, 54321);
      expect(generate(kind, 54321)).toEqual(a);
      expect(parseCode(a.code)).toEqual({ kind, seed: 54321 });
      expect(parseCode(a.code.toLowerCase().replace('-', ' '))).toEqual({ kind, seed: 54321 });
    }
    expect(parseCode('XYZ-12345')).toBeNull();
    expect(parseCode('BEQ-123')).toBeNull();
  }, 30_000);

  it('always produces a well-formed question whose own answer is marked right and whose slips are not', () => {
    for (const kind of KIND_IDS) {
      for (const seed of seeds) {
        const q = generate(kind, seed);
        const where = `${q.code}`;
        expect(Number.isFinite(q.exact), where).toBe(true);
        expect(q.tables.length, where).toBeGreaterThan(0);
        const text = [q.intro, q.prompt, q.answer, q.meaning, ...q.tables.flatMap((t) => [t.caption, ...t.rows.flatMap((r) => [r.label, ...r.cells])])].join(' ');
        expect(text, where).not.toMatch(/NaN|undefined|Infinity|\[object/);
        expect(check(q, String(q.exact)).verdict, where).toBe('right');
        for (const s of q.slips) {
          expect(Math.abs(s.value - q.exact), `${where} slip ${s.message}`).toBeGreaterThan(q.tolerance);
          expect(check(q, String(s.value)).verdict, `${where} slip ${s.message}`).not.toBe('right');
        }
        expect(q.working.answer, where).not.toBe('');
        expect(q.working.error, where).toBeUndefined();
      }
    }
  }, 60_000);

  it('keeps break-even questions sensible: a positive contribution, sales above break-even for the margin of safety', () => {
    for (const seed of seeds) {
      const m = generate('margin-of-safety', seed);
      expect(m.exact, m.code).toBeGreaterThan(0);
      const b = generate('break-even-quantity', seed);
      expect(Number.isInteger(b.exact), b.code).toBe(true);
      expect(b.exact, b.code).toBeGreaterThan(0);
    }
  }, 30_000);

  it('draws accounts that balance and projects that pay back within their life', () => {
    for (const seed of seeds) {
      const a = drawAccounts(rng(seed));
      expect(balances(a.s), `accounts ${seed}`).toBe(true);
      const d = derive(a.s);
      expect(d.pbit).toBeGreaterThan(0);
      expect(a.s.retainedEarnings).toBeGreaterThan(0);
      const p = drawProject(rng(seed));
      const pb = payback(p.p);
      expect(pb, `project ${seed}`).not.toBeNull();
      expect((pb?.inYear ?? 99) < p.p.returns.length).toBe(true);
      expect(totalReturns(p.p)).toBeGreaterThan(p.p.capitalCost);
    }
  });
});

describe('reading and checking answers', () => {
  it('reads the forms people type', () => {
    expect(parseAnswer('1,250', 'units')).toBe(1250);
    expect(parseAnswer('$1,250.50', 'money')).toBe(1250.5);
    expect(parseAnswer('(2,400)', 'money')).toBe(-2400);
    expect(parseAnswer('−2,400', 'money')).toBe(-2400);
    expect(parseAnswer('-$2,400', 'money')).toBe(-2400);
    expect(parseAnswer('18.5%', 'percent')).toBe(18.5);
    expect(parseAnswer('1.6 : 1', 'ratio')).toBe(1.6);
    expect(parseAnswer('42.5 days', 'days')).toBe(42.5);
    expect(parseAnswer('550 mugs', 'units')).toBe(550);
    expect(parseAnswer('2 years 6 months', 'years')).toBe(2.5);
    expect(parseAnswer('2 years and 3 months', 'years')).toBe(2.25);
    expect(parseAnswer('2y 6m', 'years')).toBe(2.5);
    expect(parseAnswer('9 months', 'years')).toBe(0.75);
    expect(parseAnswer('2.5', 'years')).toBe(2.5);
    expect(parseAnswer('', 'money')).toBeNull();
    expect(parseAnswer('about half', 'percent')).toBeNull();
    expect(parseAnswer('1.2.3', 'units')).toBeNull();
  });

  it('asks for a number when the answer is not one', () => {
    const q = generate('current-ratio', 22222);
    expect(check(q, 'healthy').verdict).toBe('invalid');
    expect(check(q, 'healthy').headline).toBe('Enter a number.');
  });

  it('accepts answers within the stated tolerance only', () => {
    const q = generate('profit-margin', 12345);
    // Exact 355 ÷ 1,810 × 100 = 19.6133%: 19.61 and 19.6 are within 0.05, 19.5 is not.
    expect(check(q, '19.61').verdict).toBe('right');
    expect(check(q, '19.6').verdict).toBe('right');
    expect(check(q, '19.5').verdict).toBe('wrong');
  });
});

describe('choosing questions and keeping scores', () => {
  it('sets HL-only calculations only for HL', () => {
    const sl = kindsFor(GROUP_IDS, 'SL');
    const hl = kindsFor(GROUP_IDS, 'HL');
    expect(sl).not.toContain('net-present-value');
    expect(sl).not.toContain('debtor-days');
    expect(sl).toContain('payback-period');
    expect(hl).toEqual(KIND_IDS);
    expect(kindsFor(['efficiency'], 'SL')).toEqual([]);
    expect(KIND_IDS.filter((k) => KINDS[k]?.level === 'HL').sort()).toEqual(['creditor-days', 'debtor-days', 'gearing-ratio', 'net-present-value', 'stock-turnover-days', 'stock-turnover-times']);
  });

  it('draws a timed set from a seed, spreading it across the kinds chosen', () => {
    const kinds = kindsFor(['break-even', 'liquidity'], 'SL');
    const set = drawSet(kinds, kinds.length * 2, 777);
    expect(drawSet(kinds, kinds.length * 2, 777)).toEqual(set);
    for (const k of kinds) expect(set.filter((x) => x.kind === k)).toHaveLength(2);
    for (const x of set) expect(x.seed >= SEED_MIN && x.seed <= SEED_MAX).toBe(true);
  });

  it('counts attempts by kind, records timed sets and scores them', () => {
    let s = recordAttempt(emptyP2(), 'break-even-quantity', 'right');
    s = recordAttempt(s, 'break-even-quantity', 'close');
    s = recordAttempt(s, 'break-even-quantity', 'invalid');
    expect(s.kinds['break-even-quantity']).toEqual({ tried: 2, right: 1 });
    const codes = [generate('break-even-quantity', 11111).code, generate('net-present-value', 22222).code];
    expect(score(codes, ['right', 'wrong'])).toEqual({ marks: 2, total: 5, right: 1 });
    s = recordTimed(s, { at: '2026-11-03T09:00:00Z', level: 'HL', codes, results: ['right', 'blank'], marks: 2, total: 5, allowed: 630, used: 400 });
    expect(s.timed).toHaveLength(1);
    expect(s.kinds['break-even-quantity']).toEqual({ tried: 3, right: 2 });
    expect(s.kinds['net-present-value']).toBeUndefined();
  });

  it('reads saved scores defensively', () => {
    expect(parseP2(undefined)).toEqual(emptyP2());
    const s = parseP2({ kinds: { 'break-even-quantity': { tried: 3, right: 9 }, nonsense: { tried: 1 } }, timed: [{ at: 'x', level: 'XL', codes: [], results: [] }] });
    expect(s.kinds).toEqual({ 'break-even-quantity': { tried: 3, right: 3 } });
    expect(s.timed).toEqual([]);
  });
});
