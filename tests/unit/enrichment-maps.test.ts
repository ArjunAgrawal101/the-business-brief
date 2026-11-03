/**
 * The enrichment maps: management ideas beyond the IB course, for the
 * undergraduate and MBA pathways. They are held to the same bar as an IB map,
 * they can never carry an IB level, and they never count as IB coverage.
 */
import { describe, expect, it } from 'vitest';
import { asCorpus, loadCorpus } from './helpers/corpus';
import { checkEnrichmentMaps } from '../../src/lib/integrity-pathways';
import { subtopicCoverage } from '../../src/lib/coverage';
import { mapCode } from '../../src/lib/mindmap';
import type { Corpus } from '../../src/lib/integrity';

const loaded = loadCorpus();
const c = asCorpus(loaded);
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

describe('the enrichment maps', () => {
  it('are between six and ten, each checked like an IB map', () => {
    const n = Object.keys(loaded.enrichmentMaps).length;
    expect(n).toBeGreaterThanOrEqual(6);
    expect(n).toBeLessThanOrEqual(10);
    expect(checkEnrichmentMaps(c)).toEqual([]);
  });

  it('never count as IB coverage', () => {
    const without = { ...c, enrichmentMaps: {} } as Corpus;
    const strip = (rows: ReturnType<typeof subtopicCoverage>) => rows.map((r) => [r.subtopic.code, r.state, r.mindmap]);
    expect(strip(subtopicCoverage(c))).toEqual(strip(subtopicCoverage(without)));
    const ibSubtopicMaps = Object.values(c.mindmaps).filter((m) => m.scope === 'subtopic').length;
    expect(subtopicCoverage(c).filter((r) => r.mindmap).length).toBe(ibSubtopicMaps);
    for (const id of Object.keys(c.enrichmentMaps)) expect(c.mindmaps[id], id).toBeUndefined();
  });

  it('are labelled Enrichment on the map itself, and IB maps keep their codes', () => {
    expect(mapCode({ scope: 'enrichment' })).toBe('Enrichment');
    expect(mapCode({ scope: 'unit', unit: 3 })).toBe('Unit 3');
    expect(mapCode({ scope: 'subtopic', code: '3.3' })).toBe('3.3');
  });

  it('reject an HL mark, a missing term, a self-reference and an IB map id', () => {
    const [id, m] = Object.entries(c.enrichmentMaps)[0]!;
    const bad = clone(m);
    bad.branches[0]!.children[0]!.level = 'HL';
    bad.branches[0]!.children[0]!.term = 'no-such-term';
    bad.related.push({ map: id, label: 'itself' });
    const ibId = Object.keys(c.mindmaps)[0]!;
    const msgs = checkEnrichmentMaps({ ...c, enrichmentMaps: { [id]: bad, [ibId]: m } } as Corpus).map((p) => p.message);
    expect(msgs.some((x) => /marked HL/.test(x))).toBe(true);
    expect(msgs.some((x) => /does not exist/.test(x))).toBe(true);
    expect(msgs.some((x) => /lists itself/.test(x))).toBe(true);
    expect(msgs.some((x) => /same id as an IB map/.test(x))).toBe(true);
  });
});
