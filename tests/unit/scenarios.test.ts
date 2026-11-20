import { describe, expect, it } from 'vitest';
import { bestFor, choicesCsvRows, cleanChoices, readLeadership, readProduction, scoreChoices } from '../../src/lib/scenarios';
import { resultHtml, summaryRowsHtml } from '../../src/lib/scenarios-view';
import { loadTool } from './helpers/room-tool';

const lead = loadTool('people-leadership-scenarios', 'scenario-chooser');
const prod = loadTool('ops-production-methods', 'scenario-chooser');
const titleOf = (t: typeof lead) => (id: string) => t.scenarios.find((s) => s.id === id)?.title ?? id;
const best = (t: typeof lead) => Object.fromEntries(t.scenarios.map((s) => [s.id, bestFor(s, t.options)[0]]));

describe('scoring choices', () => {
  it('gives 2 points for a strong fit, 1 for a workable one and none for a poor one', () => {
    const sc = scoreChoices(lead.scenarios, lead.options, { flood: 'autocratic', release: 'laissez-faire', 'new-starters': 'democratic' });
    // autocratic is strong in the flood (2), laissez-faire workable for the developers (1), democratic poor for new starters (0)
    expect(sc.points).toBe(3);
    expect([sc.strong, sc.workable, sc.weak]).toEqual([1, 1, 1]);
    expect(sc.answered).toBe(3);
    expect(sc.max).toBe(12);
    expect(sc.distinct).toBe(3);
    expect(sc.misses).toEqual([{ scenario: 'new-starters', chosen: 'democratic', strong: ['autocratic'] }]);
  });
  it('ignores choices for unknown scenarios or options', () => {
    expect(scoreChoices(lead.scenarios, lead.options, { nowhere: 'autocratic', flood: 'shouting' }).answered).toBe(0);
    expect(cleanChoices({ flood: 'autocratic', release: 'shouting', nowhere: 'democratic' }, lead.scenarios, lead.options)).toEqual({ flood: 'autocratic' });
    expect(cleanChoices('nonsense', lead.scenarios, lead.options)).toEqual({});
  });
});

describe('reading a pattern of leadership', () => {
  it('calls matching every situation situational leadership', () => {
    const sc = scoreChoices(lead.scenarios, lead.options, best(lead));
    expect(sc.points).toBe(12);
    // Every style the guide lets a leader choose in one situation is the strong fit somewhere.
    expect(sc.distinct).toBe(4);
    expect(readLeadership(sc, lead.options, titleOf(lead)).implication).toContain('situational leadership in practice');
  });
  it('calls one style everywhere the opposite of situational leadership', () => {
    const all = Object.fromEntries(lead.scenarios.map((s) => [s.id, 'autocratic']));
    const sc = scoreChoices(lead.scenarios, lead.options, all);
    expect(sc.distinct).toBe(1);
    // Strong in the flood and for the new starters, poor in the other four
    expect(sc.points).toBe(4);
    const r = readLeadership(sc, lead.options, titleOf(lead));
    expect(r.reading).toContain('You led every situation the same way, autocratic.');
    expect(r.implication).toContain('opposite of situational leadership');
  });
  it('names the better style where a choice was poor', () => {
    const sc = scoreChoices(lead.scenarios, lead.options, { flood: 'democratic', kiosks: 'democratic' });
    expect(readLeadership(sc, lead.options, titleOf(lead)).implication).toContain('in a burst pipe in the chilled store, autocratic would have fitted better than democratic');
  });
});

describe('reading a pattern of production methods', () => {
  it('needs all four methods to match all six products', () => {
    const sc = scoreChoices(prod.scenarios, prod.options, best(prod));
    expect(sc.points).toBe(12);
    expect(sc.distinct).toBe(4);
    expect(readProduction(sc, prod.options, titleOf(prod)).reading).toContain('No method was a poor fit');
  });
  it('explains why flow production is wrong for wedding cakes', () => {
    const sc = scoreChoices(prod.scenarios, prod.options, { 'wedding-cakes': 'flow' });
    expect(readProduction(sc, prod.options, titleOf(prod)).implication).toContain('for wedding cakes, job production fits better than mass or flow production');
  });
});

describe('the published scenarios', () => {
  it('give every scenario an outcome for every option and at least one strong fit', () => {
    for (const t of [lead, prod]) {
      for (const s of t.scenarios) {
        expect(Object.keys(s.outcomes).sort()).toEqual(t.options.map((o) => o.id).sort());
        expect(bestFor(s, t.options).length).toBeGreaterThan(0);
      }
    }
  });
  it('show the consequence and the better choice after a poor fit', () => {
    const s = lead.scenarios.find((x) => x.id === 'flood');
    if (!s) throw new Error('flood scenario missing');
    const html = resultHtml(s, lead.options, 'democratic');
    expect(html).toContain('Poor fit: Democratic');
    expect(html).toContain('Talking while the stock warms');
    expect(html).toContain('Strong fit here: Autocratic.');
    expect(resultHtml(s, lead.options, 'autocratic')).not.toContain('Strong fit here');
  });
  it('summarise and export the choices', () => {
    const rows = summaryRowsHtml(lead.scenarios, lead.options, { flood: 'autocratic' });
    expect(rows).toContain('class="is-strong"');
    expect(rows).toContain('Not chosen yet');
    const csv = choicesCsvRows(prod.scenarios, prod.options, { 'bottled-water': 'flow' }, { scenario: 'Product', choice: 'Method' });
    expect(csv[0]).toEqual(['Product', 'Method', 'Fit', 'Strong fits']);
    expect(csv.find((r) => r[0] === 'Bottled water')).toEqual(['Bottled water', 'Mass or flow production', 'Strong fit', 'Mass or flow production']);
  });
});
