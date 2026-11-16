/**
 * The Strategy Studio tools added with the Framework Application Lab:
 * scenario planning, stakeholder salience and the strategic fit check. Every
 * figure in their worked examples is worked here by hand, the rules behind
 * each verdict are pinned, and the examples are checked against the rest of
 * the Northvale Cycles engagement, so the tools agree with one another.
 */
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import * as sc from '../../src/lib/strategy/scenarios';
import * as sal from '../../src/lib/strategy/salience';
import * as fit from '../../src/lib/strategy/fit';
import * as forces from '../../src/lib/strategy/forces';
import * as ansoff from '../../src/lib/strategy/ansoff';
import * as bcg from '../../src/lib/strategy/bcg';
import * as tree from '../../src/lib/strategy/tree';

const entry = (file: string) => parse(readFileSync(new URL(`../../src/content/studio/${file}.yaml`, import.meta.url), 'utf8')) as { example: { data: unknown }; inUse: string };
const example = (file: string) => entry(file).example.data;

describe('scenario planner', () => {
  const s = sc.normalize(example('scenarios'));

  it('sorts driving forces by impact and uncertainty, with 4 or more counting as high', () => {
    expect(sc.classify({ impact: 4, uncertainty: 4 })).toBe('critical');
    expect(sc.classify({ impact: 5, uncertainty: 3 })).toBe('predetermined');
    expect(sc.classify({ impact: 3, uncertainty: 5 })).toBe('watch');
    expect(sc.classify({ impact: 3, uncertainty: 3 })).toBe('background');
    expect(s.drivers.map((d) => sc.classify(d))).toEqual(['critical', 'critical', 'predetermined', 'background', 'watch', 'watch']);
  });

  it('suggests the two weightiest critical uncertainties, which the example chose', () => {
    // d1: 5 x 4 = 20; d2: 4 x 4 = 16
    expect(s.drivers.slice(0, 2).map(sc.weight)).toEqual([20, 16]);
    expect(sc.suggestedAxes(s)).toEqual(['d1', 'd2']);
    expect([s.axisA, s.axisB]).toEqual(['d1', 'd2']);
  });

  it('labels each future by the ends of the two axes', () => {
    expect(sc.quadPoles(s, 'a1b1')).toEqual(['Van charges stay in the three cities already planned', 'Prices keep rising, as they did by 9% last year']);
    expect(sc.quadPoles(s, 'a2b2')).toEqual(['Van-free centres spread to most large cities', 'Prices fall as battery costs drop and new suppliers enter']);
    expect(sc.QUADS.map((q) => sc.scenarioName(s, q))).toEqual(['Slow lane', 'Price war', 'Squeezed boom', 'Cargo boom']);
    expect(sc.signposts(s.scenarios.a2b1)).toHaveLength(3);
    expect(sc.signposts({ name: '', story: '', implications: '', signposts: '- one\n\n* two \n' })).toEqual(['one', 'two']);
  });

  it('tests each option in the four futures: robust, contingent or fragile', () => {
    const t = sc.tests(s);
    expect(t.map((x) => [x.o.id, x.verdict, x.worst, x.best, x.average])).toEqual([
      // The staged fleet plan: 3, 3, 4, 4; average 3.5
      ['o2', 'robust', 3, 4, 3.5],
      // City bikes abroad: 3 in every future
      ['o3', 'robust', 3, 3, 3],
      // All in on fleets: 2, 3, 4, 5; a bet on the futures where van-free centres spread
      ['o1', 'contingent', 2, 5, 3.5],
      // The online relaunch: 2, 2, 2, 3
      ['o4', 'fragile', 2, 3, 2.25],
    ]);
    expect(t.find((x) => x.o.id === 'o1')?.strong).toEqual(['a2b1', 'a2b2']);
    expect(sc.verdictOf(3, 3)).toBe('robust');
    expect(sc.verdictOf(2, 4)).toBe('contingent');
    expect(sc.verdictOf(1, 3)).toBe('fragile');
  });

  it('reads the result without calling any future the likeliest', () => {
    const r = sc.reading(s);
    expect(r).toContain('Four futures built on how far cities restrict vans and the price of motors and batteries, to 2030.');
    expect(r).toContain('Every one of them includes growth in city deliveries.');
    expect(r).toContain('"Fleet bikes, staged: a paid trial first and a second motor supplier" and "City bikes for dealers abroad" hold up in all four.');
    expect(r).toContain('is a bet on "Squeezed boom" and "Cargo boom"');
    expect(r).toContain('Scenarios are not forecasts');
    expect(sc.headline(s)).toBe('Four futures on how far cities restrict vans and the price of motors and batteries; robust in all four: Fleet bikes, staged: a paid trial first and a second motor supplier and City bikes for dealers abroad.');
    expect(sc.checks(s)).toEqual([]);
  });

  it('checks the axes', () => {
    const same = { ...s, axisB: 'd1' };
    expect(sc.checks(same).some((c) => c.level === 'error' && c.text.includes('same driver'))).toBe(true);
    const weak = { ...s, axisB: 'd5' };
    expect(sc.checks(weak).some((c) => c.text.includes('is not rated a critical uncertainty'))).toBe(true);
    const sameKind = sc.normalize({ ...s, drivers: s.drivers.map((d) => (d.id === 'd2' ? { ...d, category: 'political' } : d)) });
    expect(sc.checks(sameKind).some((c) => c.text.includes('Both axes are political forces'))).toBe(true);
    const noEnds = sc.normalize({ ...s, drivers: s.drivers.map((d) => (d.id === 'd1' ? { ...d, pole2: '' } : d)) });
    expect(sc.checks(noEnds).some((c) => c.text.includes('Name both ends of How far cities restrict vans'))).toBe(true);
    expect(sc.reading({ ...s, axisA: '' })).toContain('Choose two different critical uncertainties');
  });

  it('reads damaged saved work safely', () => {
    const n = sc.normalize({ drivers: [{ id: 'd1', impact: 9, uncertainty: -3, category: 'nonsense' }], axisA: 'd9', axisB: 7, options: [{ ratings: { a1b1: 12 } }] });
    expect(n.drivers[0]).toMatchObject({ impact: 5, uncertainty: 1, category: 'economic' });
    expect([n.axisA, n.axisB]).toEqual(['', '']);
    expect(n.options[0]?.ratings).toEqual({ a1b1: 5, a1b2: 3, a2b1: 3, a2b2: 3 });
    expect(sc.problems(sc.blank()).length).toBeGreaterThan(0);
  });

  it('draws the matrix with a description that names both axes and all four futures', () => {
    const svg = sc.matrixSvg(s, 't');
    expect(svg).toContain('How far cities restrict vans (from Van charges stay in the three cities already planned to Van-free centres spread to most large cities)');
    for (const name of ['Slow lane', 'Price war', 'Squeezed boom', 'Cargo boom']) expect(svg).toContain(name);
    expect(sc.wrap('one two three four five', 9)).toEqual(['one two', 'three', 'four five']);
  });
});

describe('stakeholder salience', () => {
  const s = sal.normalize(example('stakeholder-salience'));
  const on = (p: sal.PowerBase, l: sal.YesNo, u: sal.YesNo) => ({ power: p, legitimacy: l, urgency: u });

  it('places every combination of the three attributes in its class', () => {
    expect(sal.classOf(on('utilitarian', 'yes', 'yes'))).toBe('definitive');
    expect(sal.classOf(on('coercive', 'yes', 'no'))).toBe('dominant');
    expect(sal.classOf(on('normative', 'no', 'yes'))).toBe('dangerous');
    expect(sal.classOf(on('none', 'yes', 'yes'))).toBe('dependent');
    expect(sal.classOf(on('utilitarian', 'no', 'no'))).toBe('dormant');
    expect(sal.classOf(on('none', 'yes', 'no'))).toBe('discretionary');
    expect(sal.classOf(on('none', 'no', 'yes'))).toBe('demanding');
    expect(sal.classOf(on('none', 'no', 'no'))).toBe('none');
    expect([3, 2, 1, 0].map((n) => sal.SALIENCE[n])).toEqual(['High', 'Moderate', 'Low', 'None']);
  });

  it('shows the class a stakeholder would move to', () => {
    // A dependent stakeholder that gains power becomes definitive; a dormant one that gains urgency becomes dangerous.
    expect(sal.moves(on('none', 'yes', 'yes')).find((m) => m.attribute === 'power')).toEqual({ attribute: 'power', gain: true, to: 'definitive' });
    expect(sal.moves(on('utilitarian', 'no', 'no')).find((m) => m.attribute === 'urgency')).toEqual({ attribute: 'urgency', gain: true, to: 'dangerous' });
    expect(sal.moves(on('utilitarian', 'yes', 'yes')).every((m) => !m.gain)).toBe(true);
  });

  it('classes the worked example as its notes say, with every class present', () => {
    expect(Object.fromEntries(s.stakeholders.map((x) => [x.id, sal.classOf(x)]))).toEqual({
      s1: 'definitive',
      s2: 'definitive',
      s3: 'definitive',
      s4: 'dominant',
      s5: 'dominant',
      s6: 'dependent',
      s7: 'discretionary',
      s8: 'dormant',
      s9: 'dangerous',
      s10: 'demanding',
    });
    expect(sal.prioritized(s).slice(0, 3).map((x) => x.id)).toEqual(['s1', 's2', 's3']);
    expect(sal.checks(s)).toEqual([]);
    expect(sal.headline(s)).toBe('Ten stakeholders judged; definitive: The Marsh family (owners), Assembly staff and Independent dealers; dangerous: A former parts supplier.');
  });

  it('lists the stakeholders one attribute away from definitive or dangerous', () => {
    const w = sal.watchList(s).map((m) => `${m.x.id}:${m.via}:${m.to}`);
    // In order of salience: the dominant bank and council need only urgency; the dangerous former supplier only legitimacy.
    expect(w).toEqual(['s4:urgency:definitive', 's5:urgency:definitive', 's9:legitimacy:definitive', 's6:power:definitive', 's8:urgency:dangerous', 's10:power:dangerous']);
    expect(sal.reading(s)).toContain('Salience is about whose claims managers notice, not whose claims are right');
  });

  it('asks for a plan for definitive and dangerous stakeholders', () => {
    const t = sal.normalize({ ...s, stakeholders: s.stakeholders.map((x) => (x.id === 's1' || x.id === 's9' ? { ...x, plan: '' } : x)) });
    const texts = sal.checks(t).map((c) => c.text);
    expect(texts.some((x) => x.startsWith('The Marsh family (owners) is definitive'))).toBe(true);
    expect(texts.some((x) => x.startsWith('A former parts supplier is dangerous'))).toBe(true);
  });

  it('draws each class in its own region of the three circles', () => {
    for (const c of Object.keys(sal.REGION) as Array<keyof typeof sal.REGION>) expect(sal.inRegion(sal.REGION[c], c), c).toBe(true);
    const svg = sal.vennSvg(s, 't');
    expect(svg).toContain('6 Delivery firms: dependent (legitimacy and urgency)');
  });
});

describe('strategic fit check', () => {
  const s = fit.normalize(example('strategic-fit'));

  it('works external fit from importance and fit', () => {
    // (5 x 2 + 4 x 2 + 4 x -1 + 3 x 1 + 3 x 2) / (2 x (5 + 4 + 4 + 3 + 3)) = 23 / 38
    expect(fit.externalFit(s)).toBeCloseTo(23 / 38, 10);
    expect(fit.band('external', s)).toBe('good');
  });

  it('works capability readiness from the levels held and needed', () => {
    // (5x4 + 4x1 + 5x2 + 3x1 + 4x3) / (5x4 + 4x4 + 5x5 + 3x3 + 4x4) = 49 / 86
    expect(fit.readiness(s)).toBeCloseTo(49 / 86, 10);
    expect(fit.band('readiness', s)).toBe('poor');
    expect(fit.gaps(s).map((g) => [g.c.id, g.gap, g.weighted])).toEqual([
      ['c3', 3, 15],
      ['c2', 3, 12],
      ['c4', 2, 6],
      ['c5', 1, 4],
    ]);
  });

  it('checks the 7S elements for support and conflict', () => {
    // (2 + 2 + 4 + 3 + 2 + 3) / 6 = 16 / 6
    expect(fit.averageSupport(s)).toBeCloseTo(16 / 6, 10);
    expect(fit.band('alignment', s)).toBe('poor');
    expect(fit.misfits(s)).toEqual(['structure', 'systems', 'staff']);
    expect(fit.conflictCounts(s)).toEqual({ strategy: 1, structure: 2, systems: 1, values: 0, style: 1, staff: 1, skills: 0 });
    expect(fit.centreOfMisfit(s)).toEqual(['structure']);
  });

  it('judges the fit by its weakest level, not the average', () => {
    expect(fit.weakest(s)).toEqual({ band: 'poor', levels: ['readiness', 'alignment'] });
    expect(fit.headline(s)).toBe('Weak fit; weakest: capability readiness and 7s alignment.');
    const r = fit.reading(s);
    expect(r).toContain('External fit +61% (strong), capability readiness 57% (major gaps) and 7S support averaging 2.7 of 5 (misaligned).');
    expect(r).toContain('Weak fit. The capabilities the strategy needs are not ready: close the largest gaps, by building, borrowing or buying them, before or while launching. The organization is not aligned behind the strategy:');
    expect(r).toContain('The largest capability gaps are servicing fleets within a day (2 of the 5 needed)');
    expect(r).toContain('Structure, Systems and Staff pull against the strategy, and structure sits at the centre of the most conflicts.');
    expect(fit.checks(s)).toEqual([]);
  });

  it('quotes its own figures in the recommended use', () => {
    const use = entry('strategic-fit').inUse;
    expect(use).toContain(`external fit +${Math.round((fit.externalFit(s) as number) * 100)}%`);
    expect(use).toContain(`readiness is ${Math.round((fit.readiness(s) as number) * 100)}%`);
  });

  it('sets the band edges as documented', () => {
    const at = (factors: Array<[number, number]>) => fit.band('external', fit.normalize({ environment: factors.map(([importance, f], i) => ({ id: `e${i + 1}`, factor: `F${i}`, importance, fit: f })) }));
    expect(at([[5, 1]])).toBe('good'); // 5 / 10 = 0.5
    expect(at([[3, 2], [2, -1]])).toBe('good'); // (6 - 2) / 10 = 0.4 exactly: strong
    expect(at([[5, 2], [5, -1]])).toBe('partial'); // (10 - 5) / 20 = 0.25
    expect(at([[5, 2], [5, -2]])).toBe('partial'); // 0 / 20 = 0: still partial
    expect(at([[5, 1], [5, -2]])).toBe('poor'); // -5 / 20
  });

  it('catches a conflict of an element with itself, and values that pull against the strategy', () => {
    const t = fit.normalize({ ...s, conflicts: [{ id: 'k1', a: 'staff', b: 'staff', note: 'x' }], elements: { ...s.elements, values: { ...s.elements.values, support: 2 } } });
    const texts = fit.checks(t).map((c) => c.text);
    const silent = fit.normalize({ ...s, environment: s.environment.map((x) => (x.id === 'e3' ? { ...x, note: '' } : x)) });
    expect(fit.checks(silent).some((c) => c.text.startsWith('The strategy works against "Rising prices for motors and batteries"'))).toBe(true);
    expect(texts).toContain('A conflict must be between two different elements.');
    expect(texts.some((x) => x.startsWith('Shared values pull against the strategy'))).toBe(true);
    expect(fit.verdict(fit.normalize({}))).toContain('Add at least one factor');
  });
});

describe('the new tools agree with the rest of the engagement', () => {
  const appraisal = example('option-appraisal') as { options: Array<{ name: string }>; memo: { review: string } };
  const map = example('stakeholder-map') as { decision: string; stakeholders: Array<{ name: string }> };
  const steeple = example('steeple') as { factors: Array<{ text: string }> };

  it('tests the option appraisal\'s options in the scenarios', () => {
    const names = sc.normalize(example('scenarios')).options.map((o) => o.name);
    for (const o of appraisal.options.filter((x) => x.name !== 'Fleet cargo bikes for delivery firms')) expect(names).toContain(o.name);
    expect(names).toContain('Fleet cargo bikes for delivery firms, all in');
  });

  it('judges the stakeholder map\'s decision and groups for salience', () => {
    const s = sal.normalize(example('stakeholder-salience'));
    expect(s.decision).toBe(map.decision);
    const names = s.stakeholders.map((x) => x.name);
    for (const x of map.stakeholders.filter((y) => !['Motor supplier', 'Family customers'].includes(y.name))) expect(names).toContain(x.name);
  });

  it('tests fit against factors from the STEEPLE scan', () => {
    const f = fit.normalize(example('strategic-fit'));
    const texts = steeple.factors.map((x) => x.text);
    for (const id of ['e1', 'e3', 'e4', 'e5']) {
      const factor = f.environment.find((x) => x.id === id)?.factor ?? '';
      expect(texts.some((t) => t.toLowerCase().startsWith(factor.toLowerCase().slice(0, 18))), factor).toBe(true);
    }
  });
});

describe('the advanced applications the owner named', () => {
  it('five forces gives an industry attractiveness', () => {
    const s = forces.normalize(example('five-forces'));
    expect(forces.attractiveness(forces.average(s))).toBe('moderate');
    expect(forces.reading(s)).toContain('moderately attractive');
  });

  it('Ansoff compares the options by risk', () => {
    const s = ansoff.normalize(example('ansoff'));
    const order = ansoff.byRisk(s).map((o) => ansoff.DIRECTIONS[ansoff.directionOf(o)].risk);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(ansoff.reading(s)).toContain('The lowest usual risk is');
  });

  it('the BCG matrix draws portfolio implications', () => {
    const s = bcg.normalize(example('bcg-matrix'));
    expect(bcg.guidance(s).join(' ')).toMatch(/cash cow/);
  });

  it('the decision tree rolls back expected monetary values', () => {
    const s = tree.normalize(example('decision-tree'));
    expect(tree.headline(s)).toContain('expected value €2.28m');
  });
});
