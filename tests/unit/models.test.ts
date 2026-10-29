/**
 * The models behind the interactions: break-even, the special order, decision
 * trees, the scale explorer, force fields and the Decision Room's formatting.
 */
import { describe, expect, it } from 'vitest';
import { breakEvenModel, readBreakEven, validateInputs } from '../../src/lib/breakeven';
import { evaluateOption, evaluateTree, expectedValueWorking, leaderRanges, sharedStates, treeMoney } from '../../src/lib/decision-tree';
import { compareMetric, formatMetric } from '../../src/lib/decision-room';
import { rangesText } from '../../src/lib/tree-view';
import { summarize, weaken } from '../../src/lib/force-field';
import { dominantEffect, lowestCost, scalePoint } from '../../src/lib/scale';
import { specialOrderModel, validateSpecialOrder } from '../../src/lib/special-order';
import { loadCorpus } from './helpers/corpus';

const c = loadCorpus();
const ix = c.interactives;

describe('break-even model', () => {
  const be = ix['costs-break-even-atelier'];
  if (be?.component !== 'break-even-workspace') throw new Error('break-even interaction missing');
  const d = { ...be.defaults, priceShare: be.defaults.priceShare ?? 0 };

  it('reproduces the case at €22 from November', () => {
    const m = breakEvenModel(d);
    expect(m.unitVariableCost).toBeCloseTo(7.18, 9);
    expect(m.contribution).toBeCloseTo(14.82, 9);
    expect(m.beq).toBe(550);
    expect(m.mos).toBe(90);
    expect(m.mosShare).toBeCloseTo(14.0625, 9);
    expect(m.profitAtForecast).toBeCloseTo(1344.8, 6);
    expect(m.targetOutput).toBe(685);
    expect(m.targetWithinCapacity).toBe(true);
  });

  it('reproduces each scenario', () => {
    const expected: Record<string, { beq: number; profit: number }> = {
      before: { beq: 534, profit: 1616.8 },
      'raise-24': { beq: 487, profit: 1736.6 },
      'premium-25': { beq: 477, profit: 1778 },
      'cut-marketing': { beq: 531, profit: 1180.2 },
    };
    for (const s of be.scenarios) {
      const m = breakEvenModel({ ...d, ...s.set });
      expect(m.beq, s.id).toBe(expected[s.id]?.beq);
      expect(m.profitAtForecast, s.id).toBeCloseTo(expected[s.id]?.profit ?? NaN, 6);
    }
  });

  it('reads a loss-making price plainly', () => {
    // At €6 a mug, €6.30 of variable cost plus the 4% fee is more than the price.
    const m = breakEvenModel({ ...d, price: 6 });
    expect(m.hasBreakEven).toBe(false);
    expect(readBreakEven(m, '€', be.labels).implication).toMatch(/selling more only deepens the loss/);
  });

  it('validates what a person types', () => {
    expect(validateInputs({ ...d })).toEqual([]);
    expect(validateInputs({ ...d, price: null }).map((p) => p.field)).toEqual(['price']);
    expect(validateInputs({ ...d, fixedCosts: -1 }).map((p) => p.field)).toEqual(['fixedCosts']);
    expect(validateInputs({ ...d, priceShare: 140 }).map((p) => p.field)).toEqual(['priceShare']);
    expect(validateInputs({ ...d, targetProfit: -500 })).toEqual([]);
  });
});

describe('special order model', () => {
  const so = ix['costs-special-order-atelier'];
  if (so?.component !== 'special-order') throw new Error('special order interaction missing');
  const d = so.defaults;

  it('adds €1,395 in November, with spare capacity', () => {
    const m = specialOrderModel(d);
    expect(m.displaced).toBe(0);
    expect(m.change).toBe(1395);
    expect(m.minimumPrice).toBe(6.35);
    expect(m.belowFullCost).toBe(true);
  });

  it('loses money in December, when it displaces 120 shop mugs', () => {
    const m = specialOrderModel({ ...d, regularSales: 1020 });
    expect(m.displaced).toBe(120);
    expect(m.lostContribution).toBeCloseTo(1778.4, 9);
    expect(m.change).toBeCloseTo(-383.4, 9);
    expect(m.minimumPrice).toBe(12.28);
  });

  it('never displaces more than the order itself', () => {
    expect(specialOrderModel({ ...d, regularSales: 1300 }).displaced).toBe(300);
  });

  it('matches every scenario in the content', () => {
    const expected: Record<string, number> = { december: -383.4, counter: 1995, bigger: 1465.4 };
    for (const s of so.scenarios) expect(specialOrderModel({ ...d, ...s.set }).change, s.id).toBeCloseTo(expected[s.id] ?? NaN, 9);
  });

  it('validates inputs', () => {
    expect(validateSpecialOrder(d)).toEqual([]);
    expect(validateSpecialOrder({ ...d, quantity: 2.5 }).map((p) => p.field)).toEqual(['quantity']);
  });
});

describe('decision trees', () => {
  const tree = ix['growth-tree-marigold'];
  if (tree?.component !== 'decision-tree-lab') throw new Error('tree interaction missing');

  it('ranks franchising first on the case estimates', () => {
    const r = evaluateTree(tree.options);
    const ev = Object.fromEntries(r.options.map((o) => [o.id, o.expectedValue]));
    expect(ev.organic).toBeCloseTo(42, 9);
    expect(ev.franchise).toBeCloseTo(59, 9);
    expect(ev.stay).toBeCloseTo(31, 9);
    expect(r.bestId).toBe('franchise');
  });

  it('flags probabilities that do not add up to one', () => {
    const bad = evaluateOption({ id: 'x', label: 'X', cost: 0, outcomes: [{ label: 'a', probability: 0.6, payoff: 1 }, { label: 'b', probability: 0.6, payoff: 1 }] });
    expect(bad.valid).toBe(false);
    expect(bad.problems.join(' ')).toMatch(/add up to 1.2/);
  });

  it('finds where the ranking changes', () => {
    expect(sharedStates(tree.options)).toBe(true);
    const ranges = leaderRanges(tree.options);
    expect(ranges.map((r) => r.id)).toEqual(['stay', 'franchise']);
    // Franchising (65p + 20) overtakes staying focused (15p + 22) at p = 0.04.
    expect(ranges[1]?.from).toBeCloseTo(0.04, 12);
    expect(rangesText(ranges, 'Strong demand')).toBe('Stay focused leads when the probability of strong demand is below 0.04; franchising leads above 0.04.');
  });

  it('writes the working with the cost subtracted', () => {
    const op = tree.options.find((o) => o.id === 'franchise');
    if (!op) throw new Error('franchise missing');
    const w = expectedValueWorking(op, '₹', 'm');
    expect(w.answer).toBe('₹59m');
    expect(w.steps.at(-1)).toBe('69 − 10 = 59');
    expect(treeMoney(-12, '₹', 'm')).toBe('−₹12m');
  });
});

describe('scale explorer', () => {
  const s = ix['growth-scale-explorer'];
  if (s?.component !== 'scale-explorer') throw new Error('scale interaction missing');

  it('has a U-shaped average cost with its lowest point at 11 restaurants', () => {
    expect(scalePoint(4, s).total).toBeCloseTo(346.75, 2);
    expect(lowestCost(s).outlets).toBe(11);
    expect(dominantEffect(4, s)).toBe('economies');
    expect(dominantEffect(20, s)).toBe('diseconomies');
  });
});

describe('force field', () => {
  it('sums the judged strengths and shows what weakening one force does', () => {
    const d = [{ label: 'a', strength: 4 }, { label: 'b', strength: 3 }];
    const r = [{ label: 'c', strength: 5 }, { label: 'd', strength: 4 }];
    expect(summarize(d, r)).toMatchObject({ driving: 7, restraining: 9, balance: 'restraining' });
    const w = weaken(d, r, 0);
    expect(w.after.restraining).toBe(7);
    expect(w.after.balance).toBe('level');
    expect(weaken(d, [{ label: 'x', strength: 1 }], 0).to).toBe(1);
  });
});

describe('Decision Room formatting', () => {
  it('writes each kind of measure in its unit', () => {
    expect(formatMetric(12.78, { unit: '₹m' })).toBe('₹12.78m');
    expect(formatMetric(20.4, { unit: '₹m' })).toBe('₹20.40m');
    expect(formatMetric(96, { unit: '₹m' })).toBe('₹96m');
    expect(formatMetric(1616.8, { unit: '€' })).toBe('€1,616.80');
    expect(formatMetric(534, { unit: 'mugs a month' })).toBe('534 mugs a month');
    expect(formatMetric(34.1, { unit: '%' })).toBe('34.1%');
    expect(formatMetric('Full', { unit: '' })).toBe('Full');
  });

  it('judges a change by whether the measure should rise or fall', () => {
    const profitM = { id: 'p', label: 'Profit', unit: '₹m', better: 'higher' as const };
    const debtM = { id: 'd', label: 'Debt', unit: '₹m', better: 'lower' as const };
    expect(compareMetric(12.78, 9.47, profitM)).toMatchObject({ verdict: 'worse', text: '−₹3.31m' });
    expect(compareMetric(0, 52, debtM)).toMatchObject({ verdict: 'worse', text: '+₹52m' });
    expect(compareMetric('Full', 'Low', { ...profitM, better: 'context' })).toMatchObject({ verdict: 'changed' });
  });
});
