/**
 * The Strategy Studio's models, checked against values worked by hand, and
 * their readers of saved work, which must never throw and must give back what
 * they were given.
 */
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { article, count, deepEqual, toCsv } from '../../src/lib/strategy/common';
import * as swot from '../../src/lib/strategy/swot';
import * as steeple from '../../src/lib/strategy/steeple';
import * as forces from '../../src/lib/strategy/forces';
import * as ansoff from '../../src/lib/strategy/ansoff';
import * as bcg from '../../src/lib/strategy/bcg';
import * as porter from '../../src/lib/strategy/porter';
import * as stake from '../../src/lib/strategy/stakeholders';
import * as tree from '../../src/lib/strategy/tree';
import * as ff from '../../src/lib/strategy/forcefield';
import * as app from '../../src/lib/strategy/appraisal';
import { TOOL_LIBS } from '../../src/lib/strategy/registry';

const example = (file: string) => (parse(readFileSync(new URL(`../../src/content/studio/${file}.yaml`, import.meta.url), 'utf8')) as { example: { data: unknown } }).example.data;

describe('common helpers', () => {
  it('writes CSV cells safely', () => {
    expect(toCsv([['a,b', 'say "hi"', 3, null], ['=SUM(A1)', '-2', '+x', '@y']])).toBe('"a,b","say ""hi""",3,\r\n\'=SUM(A1),\'-2,\'+x,\'@y\r\n');
  });

  it('writes small counts in words and chooses a or an', () => {
    expect([count(3, true), count(7), count(12)]).toEqual(['Three', 'seven', '12']);
    expect([article('Ethical'), article('Social'), article('Economic')]).toEqual(['an', 'a', 'an']);
  });

  it('compares plain data structurally', () => {
    expect(deepEqual({ a: [1, { b: 2 }], c: undefined }, { a: [1, { b: 2 }] })).toBe(true);
    expect(deepEqual({ a: [1, 2] }, { a: [2, 1] })).toBe(false);
  });
});

describe('SWOT', () => {
  const s = swot.normalize(example('swot'));

  it('totals the weights in each box', () => {
    // S 5+4+3, W 5+4+3+2, O 5+3+3+2, T 5+4+3+2
    expect(swot.totals(s)).toEqual({ S: 12, W: 14, O: 13, T: 14 });
  });

  it('ranks TOWS options by the weight of the factors they pair', () => {
    // so1 s1 5 + s3 3 + o1 5 + o3 3 = 16; wt1 w1 5 + w3 3 + t1 5 = 13; st1 4 + 5 = 9; wt2 4 + 4 = 8; wo1 2 + 3 = 5
    expect(swot.rankOptions(s).map((o) => [o.option.id, o.weight])).toEqual([
      ['so1', 16],
      ['wt1', 13],
      ['st1', 9],
      ['wt2', 8],
      ['wo1', 5],
    ]);
    expect(swot.unaddressed(s)).toEqual([]);
  });

  it('asks about factors in the wrong box, and not about factors in the right one', () => {
    expect(swot.placementCheck({ quadrant: 'S', text: 'Growing demand for e-bikes' })).toContain('outside');
    expect(swot.placementCheck({ quadrant: 'T', text: 'Our website is slow' })).toContain('inside the business');
    expect(swot.placementCheck({ quadrant: 'O', text: 'Launch a fleet bike' })).toContain('something the business would do');
    expect(swot.placementCheck({ quadrant: 'W', text: 'Costs above direct-online rivals' })).toBe('');
    expect(swot.placementCheck({ quadrant: 'S', text: 'Market leader in cargo bikes' })).toBe('');
    expect(swot.placementCheck({ quadrant: 'T', text: 'A rival cutting prices' })).toBe('');
  });

  it('drops TOWS links that no longer fit when a factor moves box', () => {
    const t = swot.normalize(example('swot'));
    // An SO option can still use o1 as a strength, but not as a threat.
    expect(swot.moveFactor(t, 'o1', 'S')).toBe(0);
    expect(swot.moveFactor(t, 'o1', 'T')).toBe(1);
    expect(t.tows.find((x) => x.id === 'so1')?.links).toEqual(['s1', 's3', 'o3']);
    swot.removeFactor(t, 't1');
    expect(t.tows.find((x) => x.id === 'st1')?.links).toEqual(['s2']);
  });

  it('warns when a heavy threat has no option', () => {
    const t = swot.normalize(example('swot'));
    t.tows = t.tows.filter((x) => x.id !== 'wt2');
    expect(swot.unaddressed(t).map((f) => f.id)).toEqual(['w2', 't2']);
    expect(swot.checks(t).some((c) => c.text.includes('Depends on one motor supplier'))).toBe(true);
  });
});

describe('STEEPLE', () => {
  const s = steeple.normalize(example('steeple'));

  it('scores impact times likelihood and bands the scores', () => {
    expect(steeple.score({ impact: 5, likelihood: 4 })).toBe(20);
    expect([25, 15, 14, 8, 7, 1].map(steeple.band)).toEqual(['act', 'act', 'plan', 'plan', 'watch', 'watch']);
  });

  it('ranks by score, then impact, then the order entered', () => {
    // en1 20; te1 16 and ec1 16; so1 12 (impact 4), ec2 12 (impact 4), so2 12 (impact 3), le1 12 (impact 3); te2 9, po1 9, et1 9; po2 6
    expect(steeple.prioritized(s).map((f) => f.id)).toEqual(['en1', 'te1', 'ec1', 'so1', 'ec2', 'so2', 'le1', 'te2', 'po1', 'et1', 'po2']);
    expect(steeple.reading(s)).toMatch(/^Three factors call for action now/);
  });

  it('asks about factors that read as internal', () => {
    expect(steeple.factorCheck({ text: 'Our staff are skilled' })).toContain('inside the business');
    expect(steeple.factorCheck({ text: 'Open a shop abroad' })).toContain('something the business would do');
    expect(steeple.factorCheck({ text: 'Higher interest rates' })).toBe('');
  });
});

describe('Five Forces', () => {
  const s = forces.normalize(example('five-forces'));

  it('averages the forces and reads the attractiveness', () => {
    // (3 + 3 + 4 + 4 + 3) / 5 = 3.4
    expect(forces.average(s)).toBeCloseTo(3.4, 10);
    expect(forces.attractiveness(forces.average(s))).toBe('moderate');
    expect([2.49, 2.5, 3.5, 3.51].map(forces.attractiveness)).toEqual(['high', 'moderate', 'moderate', 'low']);
    expect(forces.strongest(s)).toEqual(['suppliers', 'buyers']);
  });

  it('shows what a one-point change would do', () => {
    const w = forces.whatIfs(s);
    // Suppliers 4 to 3: (3 + 3 + 3 + 4 + 3) / 5 = 3.2, still moderate
    expect(w.weaker.find((x) => x.id === 'suppliers')).toMatchObject({ to: 3, band: 'moderate', changesBand: false });
    expect(w.weaker.find((x) => x.id === 'suppliers')?.average).toBeCloseTo(3.2, 10);
    // Rivalry 3 to 4: 3.6, unattractive
    expect(w.stronger.find((x) => x.id === 'rivalry')).toMatchObject({ band: 'low', changesBand: true });
  });
});

describe('Ansoff', () => {
  it('places each combination of product and market', () => {
    expect(ansoff.directionOf({ product: 'existing', market: 'existing' })).toBe('penetration');
    expect(ansoff.directionOf({ product: 'new', market: 'existing' })).toBe('product');
    expect(ansoff.directionOf({ product: 'existing', market: 'new' })).toBe('market');
    expect(ansoff.directionOf({ product: 'new', market: 'new' })).toBe('diversification');
  });

  it('orders the options from the lowest usual risk to the highest', () => {
    expect(ansoff.byRisk(ansoff.normalize(example('ansoff'))).map((o) => o.id)).toEqual(['o2', 'o4', 'o1', 'o3', 'o5']);
  });
});

describe('BCG matrix', () => {
  const s = bcg.normalize(example('bcg-matrix'));

  it('computes relative share and places each product', () => {
    expect(bcg.relativeShare(18, 12)).toBe(1.5);
    expect(bcg.place(s).map((x) => [x.p.id, Number(x.relative.toFixed(3)), x.category])).toEqual([
      ['city', 1.5, 'cow'],
      ['commuter', 0.333, 'question'],
      ['cargo', 1.5, 'star'],
      ['kids', 0.25, 'dog'],
      ['road', 0.214, 'dog'],
    ]);
    expect(bcg.categoryOf(1, 5, 5)).toBe('star');
    expect(bcg.categoryOf(0.99, 4.99, 5)).toBe('dog');
  });

  it('works out each product\'s share of revenue', () => {
    // 15, 10.5, 6, 4 and 2.5 of 38
    expect(bcg.place(s).map((x) => Number(x.revenueShare.toFixed(2)))).toEqual([39.47, 27.63, 15.79, 10.53, 6.58]);
  });

  it('gives guidance on the portfolio', () => {
    const g = bcg.guidance(s).join(' ');
    expect(g).toContain('Five products: one star, one question mark, one cash cow and two dogs');
    expect(g).toContain('shrinking market (−1.0% a year)');
    expect(g).toContain('earning 17% of revenue between them');
    expect(g).toContain('In outline the portfolio is balanced');
  });

  it('rejects impossible figures', () => {
    expect(bcg.productErrors({ id: 'x', name: 'X', share: 60, rival: 50, growth: 2, revenue: 1 }).rival).toContain('cannot exceed 100%');
    expect(bcg.productErrors({ id: 'x', name: '', share: null, rival: 10, growth: 2, revenue: -1 })).toMatchObject({ name: expect.any(String), share: expect.any(String), revenue: expect.any(String) });
  });
});

describe('Generic strategies', () => {
  it('reads the generic strategy from the ratings and scope', () => {
    expect(porter.genericOf({ cost: 2, diff: 3, scope: 'broad' })).toBe('middle');
    expect(porter.genericOf({ cost: 4, diff: 2, scope: 'broad' })).toBe('cost-leadership');
    expect(porter.genericOf({ cost: 4, diff: 3, scope: 'narrow' })).toBe('cost-focus');
    expect(porter.genericOf({ cost: 1, diff: 5, scope: 'narrow' })).toBe('differentiation-focus');
    expect(porter.genericOf({ cost: 3, diff: 4, scope: 'broad' })).toBe('differentiation');
    expect(porter.genericOf({ cost: 5, diff: 5, scope: 'broad' })).toBe('hybrid');
  });

  it('flags a proposed niche that a rival already holds', () => {
    const s = porter.normalize(example('generic-strategies'));
    expect(porter.checks(s).some((c) => c.text.includes('Premium cargo specialist') && c.text.includes('differentiation focus'))).toBe(true);
    expect(porter.reading(s)).toMatch(/^Northvale now: stuck in the middle risk/);
  });
});

describe('Stakeholder map', () => {
  it('places stakeholders by the threshold of 6', () => {
    expect([stake.quadrantOf({ power: 6, interest: 6 }), stake.quadrantOf({ power: 5, interest: 6 }), stake.quadrantOf({ power: 6, interest: 5 }), stake.quadrantOf({ power: 5, interest: 5 })]).toEqual(['manage', 'inform', 'satisfy', 'monitor']);
  });

  it('finds the conflict between powerful stakeholders', () => {
    const c = stake.conflicts(stake.normalize(example('stakeholder-map')));
    expect(c.supporters.map((x) => x.id)).toEqual(['s1', 's8']);
    expect(c.opponents.map((x) => x.id)).toEqual(['s3', 's2']);
  });
});

describe('Decision tree', () => {
  const s = tree.normalize(example('decision-tree'));
  const ev = tree.evaluate(s);

  it('rolls back expected values by hand', () => {
    // Cut the price: 0.5 x 3 + 0.5 x 1 = 2; less 0.3 = 1.7, better than 1.5 for families
    expect(ev.get('cut')?.value).toBeCloseTo(2, 10);
    expect(ev.get('weak')?.value).toBeCloseTo(1.7, 10);
    expect(ev.get('weak')?.best).toBe('cut');
    // Fleet: 0.6 x 6 + 0.4 x 1.7 = 4.28; less 2 = 2.28
    expect(ev.get('fleet')?.value).toBeCloseTo(4.28, 10);
    expect(ev.get('root')?.value).toBeCloseTo(2.28, 10);
    expect(ev.get('root')?.best).toBe('fleet');
    // Online: 0.5 x 3.5 + 0.5 x 1 = 2.25, less 1.2 = 1.05; export: 0.4 x 2.6 + 0.6 x 0.5 = 1.34, less 0.8 = 0.54
    expect(ev.get('root')?.nets.online).toBeCloseTo(1.05, 10);
    expect(ev.get('root')?.nets.export).toBeCloseTo(0.54, 10);
  });

  it('gives the spread of results under the best later choices', () => {
    const fleet = tree.optionSummaries(s, ev).find((x) => x.node.id === 'fleet');
    // 6 - 2 = 4; 3 - 0.3 - 2 = 0.7; 1 - 0.3 - 2 = -1.3 (probability 0.4 x 0.5 = 0.2)
    expect(fleet?.best).toBeCloseTo(4, 10);
    expect(fleet?.worst).toBeCloseTo(-1.3, 10);
    expect(fleet?.lossChance).toBe(0.2);
    expect(tree.reading(s, ev)).toContain('€2.28m net of its cost');
  });

  it('checks that probabilities add up to 1, with the platform\'s own decision-tree check', () => {
    const t = tree.normalize(example('decision-tree'));
    const n = t.nodes.find((x) => x.id === 'onweak');
    if (n) n.prob = 0.4;
    const e = tree.evaluate(t);
    expect(e.get('online')?.problems).toContain('The probabilities add up to 0.9, not 1.');
    expect(e.get('online')?.value).toBeNull();
    expect(tree.messages(t, 'u')['u-onweak-p']).toMatchObject({ invalid: true });
  });

  it('reads a damaged tree safely: one root, no loops, no orphans', () => {
    const t = tree.normalize({ nodes: [{ id: 'a', parent: null, kind: 'end', label: 'A' }, { id: 'b', parent: 'c', kind: 'end' }, { id: 'c', parent: 'b', kind: 'end' }, { id: 'd', parent: 'a', kind: 'end', payoff: 'x' }, { id: 'BAD id', parent: 'a' }] });
    expect(t.nodes.map((n) => [n.id, n.kind])).toEqual([
      ['a', 'decision'],
      ['d', 'end'],
    ]);
    expect(t.nodes[1]).toMatchObject({ cost: null, payoff: null });
  });

  it('grows and ends branches', () => {
    const t = tree.normalize(example('decision-tree'));
    const added = tree.addBranch(t, 'online');
    expect(added?.prob).toBeNull();
    // The new outcome goes after the option's existing branches.
    expect(t.nodes.findIndex((x) => x.id === added?.id)).toBe(t.nodes.findIndex((x) => x.id === 'onweak') + 1);
    const fleet = t.nodes.find((x) => x.id === 'fleet');
    if (fleet) fleet.kind = 'end';
    expect(tree.retype(t, 'fleet').removed).toBe(6);
    expect(t.nodes.find((x) => x.id === 'fleet')).toMatchObject({ kind: 'end', payoff: null });
  });
});

describe('Force field', () => {
  it('totals the forces and tests weakening one, with the platform\'s force-field functions', () => {
    const s = ff.normalize(example('force-field'));
    expect(ff.totals(s)).toMatchObject({ driving: 15, restraining: 14, balance: 'driving' });
    const t = ff.test(s);
    expect(t).toMatchObject({ from: 4, to: 2 });
    expect(t?.after.restraining).toBe(12);
  });
});

describe('Option appraisal', () => {
  const s = app.normalize(example('option-appraisal'));

  it('weights the scores by hand', () => {
    // Fleet 5x5 + 4x5 + 3x3 + 3x2 + 2x2 = 64; export 5x2 + 4x3 + 3x4 + 3x4 + 2x4 = 54; online 5x3 + 4x2 + 3x3 + 3x3 + 2x3 = 47
    expect(app.ranking(s).map((r) => [r.id, r.total, r.rank])).toEqual([
      ['fleet', 64, 1],
      ['export', 54, 2],
      ['online', 47, 3],
    ]);
    expect(app.maxTotal(s)).toBe(85);
  });

  it('tests the ranking for sensitivity to the weights', () => {
    // Profit weight 1: fleet 44, export 46; at 2 fleet still leads (49 to 48)
    expect(app.flips(s)).toEqual([{ factor: 'profit', weight: 1, leaders: ['export'] }]);
    // Equal weights: fleet 5+5+3+2+2 = 17, export 2+3+4+4+4 = 17
    expect(app.equalWeightLeaders(s).map((r) => r.id).sort()).toEqual(['export', 'fleet']);
    expect(app.sensitivityReading(s)).toContain('moves from 5 to 1');
  });

  it('asks the memo to explain a recommendation the scores do not support', () => {
    const t = app.normalize(example('option-appraisal'));
    t.memo.recommend = 'online';
    expect(app.checks(t).some((c) => c.level === 'warning' && c.text.includes('rank below'))).toBe(true);
    expect(app.memoText(t)).toContain('Recommended: Relaunch commuter e-bikes online.');
  });
});

describe('every tool reads saved work safely', () => {
  const files: Record<string, string> = { swot: 'swot', steeple: 'steeple', 'five-forces': 'five-forces', ansoff: 'ansoff', bcg: 'bcg-matrix', porter: 'generic-strategies', stakeholders: 'stakeholder-map', 'decision-tree': 'decision-tree', 'force-field': 'force-field', appraisal: 'option-appraisal' };
  for (const [kind, lib] of Object.entries(TOOL_LIBS)) {
    it(`${kind}: never throws on damaged input, and the example round-trips`, () => {
      for (const junk of [null, 7, 'x', [], { factors: 'no' }, { nodes: [{ id: 1 }] }, { criteria: [{}], options: [{ scores: 'x' }] }]) expect(() => lib.view(junk, 'u')).not.toThrow();
      expect(lib.verify(example(files[kind] ?? kind))).toEqual([]);
    });
  }
});
