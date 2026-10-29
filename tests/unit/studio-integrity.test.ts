import { describe, expect, it } from 'vitest';
import { checkStudioInteractives } from '../../src/lib/integrity-studio';
import { simulateStock, bufferUse } from '../../src/lib/operations';
import { loadCorpus } from './helpers/corpus';
import type { Interactive } from '../../src/lib/schemas';

const corpus = loadCorpus();
const get = <C extends Interactive['component']>(id: string, component: C) => {
  const it = corpus.interactives[id];
  if (!it || it.component !== component) throw new Error(`${id} is not a ${component}`);
  return structuredClone(it) as Extract<Interactive, { component: C }>;
};
const check = (id: string, it: Interactive) => checkStudioInteractives({ [id]: it }).map((p) => p.message);

describe('Market Studio and Operations Floor content', () => {
  it('passes its own checks as published', () => {
    expect(checkStudioInteractives(corpus.interactives as Record<string, Interactive>)).toEqual([]);
  });

  it('rejects a gap note for a part of the map that is not empty', () => {
    const pm = get('market-position-map-porto', 'position-map');
    pm.gaps.push({ poles: { price: 'high', craft: 'high' }, note: 'Wrong.' });
    expect(check('pm', pm)).toContain('the gap note for price high and craft high describes a part of the map that is not empty');
  });

  it('rejects a score on the middle of the scale, which has no clear part of the map', () => {
    const pm = get('market-position-map-porto', 'position-map');
    const first = pm.brands[0];
    if (first) first.scores.price = 5.5;
    expect(check('pm', pm).some((m) => m.includes('exactly the middle of the scale'))).toBe(true);
  });

  it('rejects a month whose units do not add up', () => {
    const cp = get('ops-capacity-atelier', 'capacity-productivity');
    const first = cp.months[0];
    if (first) first.values.rejected = 41;
    expect(check('cp', cp).some((m) => m.includes('is not the output'))).toBe(true);
  });

  it('rejects a site without a score for every factor', () => {
    const loc = get('ops-location-marigold', 'location-scoring');
    const first = loc.sites[0];
    if (first) delete first.scores.rent;
    expect(check('loc', loc)).toContain('Site A has no score for "rent"');
  });

  it('rejects a buffer question that names a missing scenario', () => {
    const st = get('ops-stock-control-atelier', 'stock-control');
    st.rushScenario = 'nothing';
    expect(check('st', st)).toContain('the buffer question\'s scenario "nothing" does not exist');
  });

  it('gives the published rush scenario the answer the page expects: some of the buffer is used', () => {
    const st = get('ops-stock-control-atelier', 'stock-control');
    const rush = st.scenarios.find((s) => s.id === st.rushScenario);
    const run = simulateStock({ ...st.defaults, weeks: st.weeks }, { usage: rush?.usage, late: rush?.late });
    expect(bufferUse(run)).toBe('some');
    expect(run.minStock).toBe(2);
  });
});
