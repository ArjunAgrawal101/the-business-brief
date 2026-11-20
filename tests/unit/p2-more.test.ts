import { describe, expect, it } from 'vitest';
import {
  ALL_IDS,
  GROUP_IDS,
  KINDS,
  KIND_IDS,
  META,
  SEED_MAX,
  SEED_MIN,
  TASK_IDS,
  allKindsFor,
  checkAny,
  emptyP2,
  formulaSource,
  generateAny,
  isChoice,
  isGrid,
  parseCode,
  parseP2,
  recordAttempt,
  score,
  type AnyQuestion,
  type PracticeQuestion,
} from '../../src/lib/p2-practice';
import { ownValue, type GridQuestion, type NumberCell } from '../../src/lib/p2-tasks';
import { ELSEWHERE, SHEET, STATEMENTS } from '../../src/lib/p2-coverage';
import { answerHtml, answerStaticHtml, figureHtml, questionHtml, workingAnyHtml } from '../../src/lib/p2-render';
import { schedule } from '../../src/lib/plan';

const num = (kind: string, seed: number): PracticeQuestion => {
  const q = generateAny(kind, seed);
  if (isChoice(q) || isGrid(q)) throw new Error(`${kind} is not a single figure`);
  return q;
};
const cell = (q: AnyQuestion, label: string) => q.tables.flatMap((t) => t.rows).find((r) => r.label === label)?.cells;
const NEW = ALL_IDS.slice(KIND_IDS.indexOf('break-even-change'));

describe('new calculations, checked against figures worked by hand', () => {
  it('capacity utilization and the productivity rate, from the formulae sheet (CAP-24680, PRR-24680)', () => {
    const c = num('capacity-utilization', 24680);
    // 24,590 ÷ 42,400 × 100 = 57.995...%.
    expect(cell(c, 'Actual output')).toEqual(['24,590 bottles']);
    expect(c.exact).toBeCloseTo(57.9953, 4);
    expect(checkAny(c, '58.0%').verdict).toBe('right');
    expect(checkAny(c, '42.0').verdict).toBe('wrong');
    const p = num('productivity-rate', 24680);
    // 243,700 ÷ 196,500 × 100 = 124.02%.
    expect(p.exact).toBeCloseTo(124.0204, 4);
    expect(checkAny(p, '1.24').form === 'number' && (checkAny(p, '1.24') as { detail: string }).detail).toContain('before multiplying by 100');
    expect(formulaSource('capacity-utilization').sheet).toBe(true);
  });

  it('labour turnover on the average workforce (LTO-24680)', () => {
    const q = num('labour-turnover', 24680);
    // 16 ÷ ((193 + 207) ÷ 2) × 100 = 16 ÷ 200 × 100 = 8%.
    expect(cell(q, 'Employees who left during the year')).toEqual(['16']);
    expect(q.exact).toBe(8);
    expect(checkAny(q, '8%').verdict).toBe('right');
    expect((checkAny(q, String((16 / 193) * 100)) as { detail: string }).detail).toContain('start of the year');
    expect(formulaSource('labour-turnover').sheet).toBe(false);
  });

  it('price elasticity of demand, accepted with or without its sign (PED-24680)', () => {
    const q = num('price-elasticity', 24680);
    // ((521 − 560) ÷ 560) ÷ ((64.90 − 59) ÷ 59) = −6.964% ÷ 10% = −0.696.
    expect(cell(q, 'Price')).toEqual(['$59', '$64.90']);
    expect(q.exact).toBeCloseTo(-0.6964, 4);
    expect(checkAny(q, '-0.70').verdict).toBe('right');
    expect(checkAny(q, '0.70').verdict).toBe('right');
    expect(checkAny(q, '1.44').verdict).toBe('wrong');
  });

  it('depreciation by both methods, and net book value (SLD, UPD and NBV at 24680)', () => {
    // (237,000 − 23,500) ÷ 6 = 35,583.33.
    expect(num('straight-line-depreciation', 24680).exact).toBe(35583.33);
    // (271,000 − 54,000) ÷ 90,000 × 15,500 = 37,372.22.
    expect(num('units-of-production-depreciation', 24680).exact).toBe(37372.22);
    // 48,000 − 5 × (48,000 − 9,500) ÷ 7 = 48,000 − 27,500 = 20,500.
    const n = num('net-book-value', 24680);
    expect(n.exact).toBe(20500);
    expect((checkAny(n, '27,500') as { detail: string }).detail).toContain('accumulated depreciation');
  });

  it('a budget variance, marked by its effect on profit (VAR-24680)', () => {
    const q = num('budget-variance', 24680);
    // Energy: budget 37,500, actual 40,900: a cost 3,400 above budget, so adverse.
    expect(q.prompt).toContain('energy');
    expect(q.exact).toBe(-3400);
    expect(q.answer).toBe('$3,400 adverse [A]');
    expect((checkAny(q, '3,400') as { detail: string }).detail).toContain('lowers profit');
  });

  it('cost to make against cost to buy (MOB-24680) and the reorder level (ROL-24680)', () => {
    const m = num('make-or-buy', 24680);
    // CTM = 17,500 + 0.90 × 12,000 = 28,300; CTB = 2.31 × 12,000 = 27,720; buying saves 580.
    expect(m.exact).toBe(580);
    expect(m.answer).toContain('by buying');
    expect((checkAny(m, String(Math.abs(27720 - 10800))) as { detail: string }).detail).toContain('fixed costs');
    // 70 + 40 × 2 = 150.
    expect(num('reorder-level', 24680).exact).toBe(150);
    // 1,920 − 480 = 1,440.
    expect(num('reorder-quantity', 24680).exact).toBe(1440);
  });

  it('expected value, the mean, the median, the quartiles and the standard deviation', () => {
    // 0.30 × 1,920,000 + 0.10 × 210,000 + 0.60 × 90,000 − 500,000 = 151,000.
    expect(num('expected-value', 24680).exact).toBe(151000);
    // 401 ÷ 9 = 44.56.
    expect(num('mean', 24680).exact).toBeCloseTo(44.5556, 4);
    // 180, 183, 194, 245, 248, 248, 319, 386: (245 + 248) ÷ 2 = 246.5.
    expect(num('median', 24680).exact).toBe(246.5);
    // 27, 40, 45, 56, 60, 68, 81, 85, 93, 103, 110: 93 − 45 = 48.
    expect(num('interquartile-range', 24680).exact).toBe(48);
    // Mean 303.6; squared deviations sum to 25,619.2; √(25,619.2 ÷ 5) = 71.58.
    const sd = num('standard-deviation', 24680);
    expect(sd.exact).toBeCloseTo(71.581, 3);
    expect((checkAny(sd, String(Math.sqrt(25619.2 / 4))) as { detail: string }).detail).toContain('sample standard deviation');
  });

  it('float on a critical path network, by hand (TFL-24680, FFL-24680)', () => {
    // A 6; B 2 after A; C 2 after A; D 8 after C; E 6 after B, D; F 7 after D; G 4 after E, F.
    // B: earliest start 6, latest start 17 − 2 = 15, so total float 9.
    expect(num('total-float', 24680).exact).toBe(9);
    // A 6; B 7 after A; C 3 after A; D 2 after A; E 5 after B; F 8 after C, E; G 6 after D, F.
    // D finishes at 8 at the earliest; G cannot start before 26: free float 18.
    const f = num('free-float', 24680);
    expect(f.prompt).toContain('activity D');
    expect(f.exact).toBe(18);
  });

  it('a special order on contribution, operating leverage and a break-even change', () => {
    // (576.05 − 533) × 160 − 0 = 6,888.
    expect(num('special-order', 24680).exact).toBe(6888);
    // (90 − 54) × 5,240 = 188,640; 188,640 ÷ (188,640 − 136,600) = 3.62.
    expect(num('operating-leverage', 24680).exact).toBeCloseTo(188640 / 52040, 10);
    // New price $340: 49,500 ÷ (340 − 135) = 241.46, rounded up to 242.
    const b = num('break-even-change', 24680);
    expect(b.exact).toBe(242);
    expect((checkAny(b, '300') as { detail: string }).detail).toContain('before the change');
  });

  it('final accounts: retained profit and net assets (RTP-24680, NAS-24680)', () => {
    // 2,290 − 1,489 − 569 − 30 − 51 − 76 = 75.
    expect(num('retained-profit', 24680).exact).toBe(75);
    // (4,920 − 984 + 154 + 984 + 384) − (185 + 324 + 92 + 1,722) = 5,458 − 2,323 = 3,135.
    const n = num('net-assets', 24680);
    expect(n.exact).toBe(3135);
    expect((checkAny(n, String(3135 + 984)) as { detail: string }).detail).toContain('accumulated depreciation');
  });

  it('market share and growth (MSH-24680, MGR-24680)', () => {
    const s = num('market-share', 24680);
    // Fernbench: 4,143 ÷ (5,039 + 2,800 + 2,986 + 4,143 + 2,298 = 17,266) × 100 = 24.00%.
    expect(s.prompt).toContain('Fernbench');
    expect(s.exact).toBeCloseTo((4143 / 17266) * 100, 10);
    // (17,992 − 15,651) ÷ 15,651 × 100 = 14.96%.
    expect(num('market-growth', 24680).exact).toBeCloseTo((2341 / 15651) * 100, 10);
  });

  it('reading a break-even chart and a stock control chart (RBE-24680, RSC-24680)', () => {
    const r = num('read-break-even-chart', 24680);
    // Total costs rise 18,750 and revenue 25,000 for each 250 candles from 12,500 and 0: they meet at 500.
    expect(r.exact).toBe(500);
    expect(r.figure?.svg).toContain('role="img"');
    expect(r.task).toBe('read');
    const s = num('read-stock-chart', 24680);
    expect(s.figure?.svg).toContain('Reorder level');
    expect(cell(s, 'Delivery received')?.filter((x) => x !== '0').length).toBe(3);
  });
});

describe('finding the slip and reading the data', () => {
  it('marks the first wrong line, and says why the other lines are not it (SPB-12345)', () => {
    const q = generateAny('slip-break-even', 12345);
    if (!isChoice(q)) throw new Error('not a choice');
    // $310 − $202 = $108; 43,600 ÷ 108 = 403.70, rounded up to 404; the student wrote 404 − 570.
    expect(q.answer).toBe('L4');
    expect(q.options[3]?.text).toContain('404 − 570');
    expect(checkAny(q, 'L4').verdict).toBe('right');
    const wrong = checkAny(q, 'L1');
    expect(wrong.verdict).toBe('wrong');
    expect((wrong as { detail: string }).detail).toContain('Line 1 is right');
    expect(checkAny(q, null).verdict).toBe('invalid');
    expect(q.corrected?.[3]).toBe('Margin of safety = 570 − 404 = 166 bicycles');
  });

  it('builds every slip question so that the lines before the slip are the right working', () => {
    for (const kind of ['slip-break-even', 'slip-ratio', 'slip-investment', 'slip-cash-flow', 'slip-hl']) {
      for (let i = 0; i < 40; i++) {
        const q = generateAny(kind, SEED_MIN + i * 977);
        if (!isChoice(q)) throw new Error('not a choice');
        const at = Number(q.answer.slice(1)) - 1;
        const lines = q.options.map((o) => o.text.replace(/^Line \d+: /, ''));
        expect(lines.slice(0, at), q.code).toEqual(q.corrected?.slice(0, at));
        expect(lines[at], q.code).not.toBe(q.corrected?.[at]);
      }
    }
  });

  it('asks about cash balances that the chart and the table both show (RCF-12345)', () => {
    const q = generateAny('read-cash-chart', 12345);
    if (!isChoice(q)) throw new Error('not a choice');
    // Closing balances 35,000, 15,000, (10,000), 10,000, (5,000), (20,000): first overdrawn in September.
    expect(cell(q, 'Closing balance')).toEqual(['35,000', '15,000', '(10,000)', '10,000', '(5,000)', '(20,000)']);
    expect(q.answerText).toBe('September');
    expect(q.figure?.svg).toContain('overdrawn by $10,000');
  });

  it('offers exactly one statement the ratio table supports', () => {
    for (let i = 0; i < 60; i++) {
      const q = generateAny('read-ratio-table', SEED_MIN + i * 613);
      if (!isChoice(q)) throw new Error('not a choice');
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options.map((o) => o.id)).size).toBe(4);
      expect(q.options.filter((o) => o.id === q.answer)).toHaveLength(1);
      const r = (label: string) => (cell(q, label) ?? []).map((x) => Number(x.replace(/ : 1$/, '')));
      const [cr0 = 0, cr1 = 0] = r('Current ratio');
      const [at0 = 0, at1 = 0] = r('Acid test (quick) ratio');
      expect(at0, q.code).toBeLessThan(cr0);
      expect(at1, q.code).toBeLessThan(cr1);
    }
  });
});

describe('constructions in a grid', () => {
  const fill = (q: GridQuestion) => Object.fromEntries(q.cells.map((c) => [c.id, c.kind === 'pick' ? c.answer : String(c.exact)]));

  it('completes a cash flow forecast worked by hand (GCF-12345)', () => {
    const q = generateAny('build-cash-flow', 12345);
    if (!isGrid(q)) throw new Error('not a grid');
    const ex = (id: string) => (q.cells.find((c) => c.id === id) as NumberCell).exact;
    // 70% of January's $31,000 is cash; 30% of December's $19,000 arrives in January.
    expect([ex('cash0'), ex('credit0'), ex('in0'), ex('out0'), ex('net0'), ex('close0')]).toEqual([21700, 5700, 27400, 26500, 900, 5900]);
    // February: 9,100 + 9,300 + a 6,000 loan = 24,400 in; 4,500 + 10,000 out; 5,900 + 9,900 = 15,800.
    expect([ex('in1'), ex('out1'), ex('open1'), ex('close1')]).toEqual([24400, 14500, 5900, 15800]);
    // March: 24,500 + 3,900 in, 26,000 out, closing 18,200.
    expect(ex('close2')).toBe(18200);
    expect(checkAny(q, fill(q)).verdict).toBe('right');
  });

  it('credits a total that follows from the reader’s own wrong figure, and says so', () => {
    const q = generateAny('build-cash-flow', 12345);
    if (!isGrid(q)) throw new Error('not a grid');
    const v = fill(q);
    v.cash0 = '31000'; // all of January's sales, not the 70% paid in cash
    v.in0 = '36700'; // 31,000 + 5,700: right on the reader's own figure
    v.net0 = '10200'; // 36,700 − 26,500
    v.close0 = '15200'; // 5,000 + 10,200
    v.open1 = '15,200';
    v.close1 = '25100'; // 15,200 + 9,900
    v.open2 = '25100';
    v.close2 = '27500'; // 25,100 + 2,400
    const f = checkAny(q, v);
    if (f.form !== 'grid') throw new Error('not a grid');
    const by = Object.fromEntries(f.cells.map((c) => [c.id, c]));
    expect(by.cash0?.verdict).toBe('wrong');
    expect(by.cash0?.message).toContain('Only 70%');
    for (const id of ['in0', 'net0', 'close0', 'open1', 'close1', 'open2', 'close2']) expect(by[id]?.verdict, id).toBe('own');
    expect(f.verdict).toBe('wrong');
    expect(f.credited).toBe(f.total - 1);
    expect(f.earned).toBe(Math.floor((q.marks * (f.total - 1)) / f.total));
    expect(f.detail).toContain('on your own earlier figures');
  });

  it('works an own-figure rule as a sum, a difference or a copy', () => {
    const read = (id: string) => ({ a: 10, b: 4, c: null })[id] ?? null;
    expect(ownValue({ op: 'sum', terms: ['a', 'b', 6] }, read)).toBe(20);
    expect(ownValue({ op: 'diff', terms: ['a', 'b', 1] }, read)).toBe(5);
    expect(ownValue({ op: 'copy', terms: ['b'] }, read)).toBe(4);
    expect(ownValue({ op: 'sum', terms: ['a', 'c'] }, read)).toBeNull();
  });

  it('marks F and A by their effect on profit, and a blank grid as not yet answered (GVR-12345)', () => {
    const q = generateAny('build-variances', 12345);
    if (!isGrid(q)) throw new Error('not a grid');
    const pick = (id: string) => q.cells.find((c) => c.id === id);
    // Staff costs 46,000 budgeted, 40,000 actual: 6,000 favourable. Supplies 58,500 and 60,800: 2,300 adverse.
    expect(pick('vc1')).toMatchObject({ exact: 6000 });
    expect(pick('mc1')).toMatchObject({ answer: 'F' });
    expect(pick('vc2')).toMatchObject({ exact: 2300 });
    expect(pick('mc2')).toMatchObject({ answer: 'A' });
    expect(checkAny(q, {}).verdict).toBe('invalid');
    const v = fill(q);
    v.mc2 = 'F';
    const f = checkAny(q, v);
    expect(f.form === 'grid' && f.cells.find((c) => c.id === 'mc2')?.message).toContain('adverse');
  });

  it('keeps every grid consistent across many seeds: totals add up, balances carry, schedules end at the residual value', () => {
    for (let i = 0; i < 50; i++) {
      const seed = SEED_MIN + i * 1291;
      for (const kind of ['build-cash-flow', 'build-break-even', 'build-profit-loss', 'build-variances', 'build-depreciation']) {
        const q = generateAny(kind, seed);
        if (!isGrid(q)) throw new Error('not a grid');
        const ex = (id: string) => (q.cells.find((c) => c.id === id) as NumberCell | undefined)?.exact ?? NaN;
        for (const c of q.cells) {
          if (c.kind !== 'number' || !c.own) continue;
          // Every own-figure rule, worked on the right figures, gives the right figure.
          expect(ownValue(c.own, ex), `${q.code} ${c.id}`).toBeCloseTo(c.exact, 6);
        }
        if (kind === 'build-depreciation') {
          const years = q.cells.filter((c) => c.id.startsWith('b')).length;
          expect(ex(`b${years}`), q.code).toBeGreaterThan(0);
          expect(ex(`b${years}`), q.code).toBeLessThan(ex('b1'));
        }
        expect(checkAny(q, fill(q)).verdict, q.code).toBe('right');
      }
    }
  });

  it('draws the reader’s own break-even chart from the grid, leaving out cells it cannot read', async () => {
    const q = generateAny('build-break-even', 12345);
    if (!isGrid(q)) throw new Error('not a grid');
    const { gridChartHtml } = await import('../../src/lib/p2-render');
    const html = gridChartHtml(q, (id) => (id === 'tc0' ? null : (q.cells.find((c) => c.id === id) as NumberCell).exact), 'x');
    expect(html).toContain('Your total revenue');
    expect(html).toContain('Your total costs');
    expect(html).toContain('role="region"');
  });
});

describe('every new kind, across many seeds', () => {
  const seeds = Array.from({ length: 70 }, (_, i) => SEED_MIN + 31 + i * 1213);

  it('is the same question for the same code, and reads its code back', () => {
    for (const kind of NEW) {
      const a = generateAny(kind, 54321);
      expect(generateAny(kind, 54321)).toEqual(a);
      expect(parseCode(a.code)).toEqual({ kind, seed: 54321 });
    }
    expect(new Set(ALL_IDS.map((id) => META[id]?.code)).size).toBe(ALL_IDS.length);
  });

  it('marks its own answer right and never a typical slip, and leaks no NaN or undefined', () => {
    for (const kind of NEW) {
      for (const seed of seeds) {
        const q = generateAny(kind, seed);
        const where = q.code;
        expect(JSON.stringify(q), where).not.toMatch(/NaN|undefined|Infinity|\[object/);
        if (isChoice(q)) {
          expect(checkAny(q, q.answer).verdict, where).toBe('right');
        } else if (isGrid(q)) {
          expect(q.cells.length, where).toBeGreaterThan(2);
        } else {
          expect(Number.isFinite(q.exact), where).toBe(true);
          expect(checkAny(q, String(q.exact)).verdict, where).toBe('right');
          for (const s of q.slips) expect(checkAny(q, String(s.value)).verdict, `${where} ${s.message}`).not.toBe('right');
          expect(q.working.error, where).toBeUndefined();
        }
      }
    }
  }, 120_000);

  it('draws no impossible figures', () => {
    const n = (s: string | undefined) => Number((s ?? '').replace(/[^0-9.-]/g, ''));
    for (const seed of seeds) {
      const cap = num('capacity-utilization', seed);
      expect(cap.exact, cap.code).toBeGreaterThan(0);
      expect(cap.exact, cap.code).toBeLessThanOrEqual(100);
      const d = num('defect-rate', seed);
      expect(d.exact, d.code).toBeGreaterThan(0);
      expect(d.exact, d.code).toBeLessThan(100);
      const rq = num('reorder-quantity', seed);
      const max = n(cell(rq, 'Maximum stock level')?.[0]);
      const rol = n(cell(rq, 'Reorder level')?.[0]);
      const buf = n(cell(rq, 'Buffer stock')?.[0]);
      expect(buf, rq.code).toBeLessThan(rol);
      expect(rol, rq.code).toBeLessThan(max);
      const ev = num('expected-value', seed);
      const probs = ev.tables[0]?.rows.map((r) => Number(r.cells[0])) ?? [];
      expect(probs.reduce((s, p) => s + p, 0), ev.code).toBeCloseTo(1, 9);
      const nbv = num('net-book-value', seed);
      expect(nbv.exact, nbv.code).toBeGreaterThan(n(cell(nbv, 'Residual value')?.[0]));
      expect(nbv.exact, nbv.code).toBeLessThan(n(cell(nbv, 'Cost')?.[0]));
      const lt = num('labour-turnover', seed);
      expect(lt.exact, lt.code).toBeGreaterThan(0);
      expect(lt.exact, lt.code).toBeLessThan(100);
      const ms = num('market-share', seed);
      expect(ms.exact, ms.code).toBeGreaterThan(0);
      expect(ms.exact, ms.code).toBeLessThan(100);
      const ped = num('price-elasticity', seed);
      expect(ped.exact, ped.code).toBeLessThan(0);
      const iqr = num('interquartile-range', seed);
      expect(iqr.exact, iqr.code).toBeGreaterThanOrEqual(0);
      const sd = num('standard-deviation', seed);
      expect(sd.exact, sd.code).toBeGreaterThan(0);
      for (const kind of ['total-float', 'free-float']) {
        const f = num(kind, seed);
        expect(f.exact, f.code).toBeGreaterThanOrEqual(0);
        const acts = (f.tables[0]?.rows ?? []).map((r) => ({ id: r.label, label: r.cells[0] ?? '', weeks: Number(r.cells[1]), after: r.cells[2] === 'none' ? [] : (r.cells[2] ?? '').split(', ') }));
        expect(schedule(acts).finish, f.code).toBeGreaterThan(0);
      }
      const reg = num('regression-forecast', seed);
      expect(reg.exact, reg.code).toBeGreaterThan(0);
      const be = num('break-even-change', seed);
      expect(Number.isInteger(be.exact), be.code).toBe(true);
      expect(be.exact, be.code).toBeGreaterThan(0);
    }
  }, 60_000);
});

describe('the registry, the record and the scores', () => {
  it('sets HL-only kinds and topics only for HL, and filters by kind of task', () => {
    const sl = allKindsFor(GROUP_IDS, 'SL');
    expect(sl.every((id) => META[id]?.level !== 'HL')).toBe(true);
    expect(allKindsFor(GROUP_IDS, 'HL')).toEqual(ALL_IDS);
    expect(allKindsFor(GROUP_IDS, 'HL', ['spot']).every((id) => META[id]?.task === 'spot')).toBe(true);
    expect(allKindsFor(['budgets', 'operations', 'people', 'toolkit-hl'], 'SL')).toEqual([]);
    expect(TASK_IDS.every((id) => !KINDS[id])).toBe(true);
  });

  it('keeps a record of the new kinds in the same shape, and still reads an old one', () => {
    let s = recordAttempt(emptyP2(), 'build-cash-flow', 'close');
    s = recordAttempt(s, 'slip-ratio', 'right');
    const round = parseP2(JSON.parse(JSON.stringify(s)));
    expect(round.kinds).toEqual({ 'build-cash-flow': { tried: 1, right: 0 }, 'slip-ratio': { tried: 1, right: 1 } });
    expect(round.v).toBe(1);
    expect(parseP2({ v: 1, kinds: { 'break-even-quantity': { tried: 2, right: 1 } }, timed: [] }).kinds).toEqual({ 'break-even-quantity': { tried: 2, right: 1 } });
  });

  it('scores a grid in proportion to the cells credited, and everything else in full or not at all', () => {
    const codes = [generateAny('build-cash-flow', 11111).code, generateAny('slip-ratio', 22222).code, generateAny('mean', 33333).code];
    // GCF is worth 5, SPR 2 and AVG 1: the grid earns 3 of its 5, the slip is right, the mean wrong.
    expect(score(codes, ['wrong', 'right', 'wrong'], [3, null, null])).toEqual({ marks: 5, total: 8, right: 1 });
    expect(score(codes, ['right', 'right', 'right'])).toEqual({ marks: 8, total: 8, right: 3 });
  });

  it('renders every kind of question, with ids made unique for the page', () => {
    for (const kind of ['read-break-even-chart', 'slip-cash-flow', 'build-depreciation', 'margin-of-safety']) {
      const q = generateAny(kind, 24680);
      const html = questionHtml(q, 'u1') + answerHtml(q, 'u1') + workingAnyHtml(q, 'u1') + answerStaticHtml(q, 'u1');
      expect(html, kind).not.toMatch(/undefined|NaN|\[object/);
      expect(html, kind).not.toMatch(/[\u2013\u2014]/);
    }
    const f = num('read-break-even-chart', 24680).figure;
    if (!f) throw new Error('no figure');
    const a = figureHtml(f, 'one');
    const b = figureHtml(f, 'two');
    expect(a).toContain('id="one-fig-t"');
    expect(b).toContain('id="two-fig-t"');
    expect(b).not.toContain('one-fig');
  });
});

describe('what the practice covers, held to the guide’s formulae sheet and the registry', () => {
  it('practises every formula on the formulae sheet with a kind at its level', () => {
    expect(SHEET).toHaveLength(14);
    for (const f of SHEET) {
      expect(f.kinds.length, f.name).toBeGreaterThan(0);
      for (const k of f.kinds) expect(META[k], `${f.name}: ${k}`).toBeDefined();
      const main = f.kinds[0] as string;
      expect(formulaSource(main).sheet, f.name).toBe(true);
      expect(META[main]?.level, f.name).toBe(f.level);
    }
    const onSheet = ALL_IDS.filter((id) => formulaSource(id).sheet);
    expect(onSheet.sort()).toEqual(SHEET.map((f) => f.kinds[0] as string).sort());
  });

  it('lists every kind against a statement, and practises an HL-only statement only with HL kinds', () => {
    const listed = new Set([...SHEET.flatMap((f) => f.kinds), ...STATEMENTS.flatMap((s) => s.kinds)]);
    expect(ALL_IDS.filter((id) => !listed.has(id))).toEqual([]);
    for (const st of STATEMENTS) {
      expect(st.kinds.length, st.text).toBeGreaterThan(0);
      for (const k of st.kinds) expect(META[k], `${st.text}: ${k}`).toBeDefined();
      if (st.level === 'HL') for (const k of st.kinds) expect(META[k]?.level, `${st.text}: ${k}`).toBe('HL');
      else expect(st.kinds.some((k) => META[k]?.level === 'SL/HL'), st.text).toBe(true);
    }
    expect(ELSEWHERE.map((e) => e.code)).toEqual(['2.2', '4.2']);
  });

  it('gives every code a seed in range', () => {
    for (const id of ALL_IDS) expect(parseCode(`${META[id]?.code}-${SEED_MAX}`)).toEqual({ kind: id, seed: SEED_MAX });
  });
});
