import { describe, expect, it } from 'vitest';
import { CRITERIA, STIMULI, stimulusById, stimulusWords } from '../../src/lib/p3-stimuli';

const num = (s: string) => Number(s.replace(/[$,]/g, ''));
const practice = STIMULI.filter((s) => s.id !== 'haven');

describe('the Paper 3 practice stimuli', () => {
  it('has at least two new stimuli, each fictional and unique', () => {
    expect(practice.length).toBeGreaterThanOrEqual(2);
    expect(new Set(STIMULI.map((s) => s.id)).size).toBe(STIMULI.length);
    expect(new Set(STIMULI.map((s) => s.organization)).size).toBe(STIMULI.length);
    for (const s of STIMULI) {
      expect(s.fictional).toBe(true);
      expect(s.setting).toMatch(/invented/);
      expect(stimulusById(s.id)).toBe(s);
    }
  });

  it('has the form the guide gives the stimulus: an introduction, a visual of a product and five or six excerpts', () => {
    for (const s of practice) {
      expect(s.resources[0]?.kind, s.id).toBe('Text');
      const visuals = s.resources.filter((r) => r.kind === 'Visual');
      expect(visuals, s.id).toHaveLength(1);
      expect(visuals[0]?.visual?.labels.length).toBeGreaterThanOrEqual(3);
      const excerpts = s.resources.filter((r) => r.kind !== 'Text' && r.kind !== 'Visual');
      expect(excerpts.length, s.id).toBeGreaterThanOrEqual(5);
      expect(excerpts.length, s.id).toBeLessThanOrEqual(6);
      for (const kind of ['Email', 'Social media', 'Newspaper', 'Table'] as const) expect(excerpts.some((r) => r.kind === kind), `${s.id} ${kind}`).toBe(true);
      expect(s.resources.map((r) => r.id)).toEqual(s.resources.map((_, i) => `R${i + 1}`));
    }
  });

  it('keeps each stimulus within the 750 words a report gives as the limit', () => {
    for (const s of practice) {
      const words = stimulusWords(s);
      expect(words, s.id).toBeGreaterThan(350);
      expect(words, s.id).toBeLessThanOrEqual(750);
    }
  });

  it('sets the three questions of the paper: 2, 6 and 17 marks, with their command terms', () => {
    for (const s of practice) {
      expect(s.questions.map((q) => [q.number, q.marks, q.command])).toEqual([
        [1, 2, 'describe'],
        [2, 6, 'explain'],
        [3, 17, 'recommend'],
      ]);
      expect(s.questions.reduce((n, q) => n + q.marks, 0)).toBe(25);
      for (const q of s.questions) expect(q.guidance.length, `${s.id} q${q.number}`).toBeGreaterThan(0);
    }
    expect(CRITERIA.map((c) => [c.id, c.marks])).toEqual([
      ['A', 4],
      ['B', 4],
      ['C', 6],
      ['D', 3],
    ]);
    expect(CRITERIA.reduce((n, c) => n + c.marks, 0)).toBe(17);
  });

  it('offers a human need and challenges in the areas question 2 names, citing resources that exist', () => {
    for (const s of STIMULI) {
      const ids = new Set(s.resources.map((r) => r.id));
      expect(s.needs.some((n) => n.kind === 'need'), s.id).toBe(true);
      expect(new Set(s.needs.map((n) => n.id)).size).toBe(s.needs.length);
      for (const n of s.needs) {
        expect(n.resources.length, n.id).toBeGreaterThan(0);
        for (const r of n.resources) expect(ids.has(r), `${s.id} ${n.id} ${r}`).toBe(true);
        if (n.kind === 'challenge') expect(n.fn, n.id).toBeDefined();
      }
    }
    for (const s of practice) {
      const q2 = s.questions.find((q) => q.number === 2)?.prompt ?? '';
      const areas = { operations: /operations/, hr: /human resources/, finance: /finance/, marketing: /marketing/ } as const;
      for (const [fn, re] of Object.entries(areas)) if (re.test(q2)) expect(s.needs.some((n) => n.kind === 'challenge' && n.fn === fn), `${s.id} ${fn}`).toBe(true);
    }
  });

  it('cites only resources that exist, in its guidance and model plan', () => {
    for (const s of STIMULI) {
      const ids = new Set(s.resources.map((r) => r.id));
      const text = [...s.questions.flatMap((q) => q.guidance), s.model.direction, s.model.first, s.model.then, s.model.later, s.model.throughout, ...s.model.tradeoffs].join(' ');
      for (const m of text.matchAll(/\bR(\d+)\b/g)) expect(ids.has(`R${m[1]}`), `${s.id} cites R${m[1]}`).toBe(true);
    }
  });

  it('has tables whose figures add up', () => {
    const water = stimulusById('ripplestone')?.resources.find((r) => r.kind === 'Table')?.table;
    expect(water).toBeDefined();
    const row = (label: RegExp) => water?.rows.find((r) => label.test(r[0] ?? '')) ?? [];
    for (const col of [1, 2]) {
      const cans = num(row(/^Cans sold/)[col] ?? '');
      const sales = num(row(/^Sales revenue/)[col] ?? '');
      const share = num(row(/^Operator/)[col] ?? '');
      const parts = num(row(/^Filters/)[col] ?? '');
      const repairs = num(row(/^Repairs/)[col] ?? '');
      const surplus = num(row(/^Surplus/)[col] ?? '');
      // $0.25 a can (R1), and the operator's 20% share of sales.
      expect(sales).toBeCloseTo(cans * 0.25, 2);
      expect(share).toBeCloseTo(sales * 0.2, 2);
      expect(surplus).toBe(sales - share - parts - repairs);
      expect(surplus).toBeGreaterThan(0);
    }

    const laptops = stimulusById('relay')?.resources.find((r) => r.kind === 'Table')?.table;
    expect(laptops).toBeDefined();
    const lrow = (label: RegExp) => laptops?.rows.find((r) => label.test(r[0] ?? '')) ?? [];
    for (const col of [1, 2, 3, 4]) {
      const low = num(lrow(/at \$120/)[col] ?? '');
      const high = num(lrow(/at \$260/)[col] ?? '');
      expect(num(lrow(/in all/)[col] ?? '')).toBe(low + high);
    }
    // Donations fall every quarter while sales rise: the challenge the guidance names.
    const donated = (lrow(/donated/).slice(1) as string[]).map(num);
    expect(donated).toEqual([...donated].sort((a, b) => b - a));
    expect(donated[0]).toBe(640);
    expect(donated[3]).toBe(430);
  });

  it('builds its model plans from figures that agree with the stimulus', () => {
    const water = stimulusById('ripplestone');
    // Six kiosks at $6,000 each come within the $40,000 loan the board was offered (R7).
    expect(water?.model.later).toMatch(/\$36,000/);
    expect(6 * 6000).toBe(36000);
    expect(36000).toBeLessThanOrEqual(40000);
  });
});
