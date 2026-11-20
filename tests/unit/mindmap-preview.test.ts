/**
 * The mindmap index previews each map by its branches (src/lib/mindmap.ts,
 * branchSummary), and the map is drawn with no text under 13 units, so the
 * readable zoom in the browser (12 ÷ 13) keeps every label at 12 pixels.
 */
import { describe, expect, it } from 'vitest';
import { SVG_STYLE, branchSummary, layout, nodeCount, renderSvg } from '../../src/lib/mindmap';
import { loadCorpus } from './helpers/corpus';

const c = loadCorpus();

describe('a map previewed by its branches', () => {
  it('counts the ideas under each branch and compares each with the largest', () => {
    const leaf = (label: string) => ({ label, kind: 'point' as const, level: 'SL/HL' as const, core: false, children: [] });
    const map = {
      branches: [
        { label: 'One', kind: 'concept' as const, level: 'SL/HL' as const, children: [leaf('a'), { ...leaf('b'), children: [leaf('c'), leaf('d')] }] },
        { label: 'Two', kind: 'tool' as const, level: 'HL' as const, children: [leaf('e')] },
      ],
    };
    const rows = branchSummary(map as never);
    expect(rows.map((r) => [r.label, r.ideas, r.share, r.hl])).toEqual([
      ['One', 4, 1, false],
      ['Two', 1, 0.25, true],
    ]);
    expect(rows[1]!.colour).toBe('#8a6b2a');
  });

  it('accounts for every idea in every map', () => {
    for (const [id, m] of Object.entries(c.mindmaps)) {
      const rows = branchSummary(m);
      expect(rows.length, id).toBe(m.branches.length);
      // Each branch is an idea itself, as nodeCount counts it.
      expect(rows.reduce((n, r) => n + r.ideas, 0) + rows.length, id).toBe(nodeCount(m));
      expect(Math.max(...rows.map((r) => r.share)), id).toBe(1);
    }
  });
});

describe('the drawn map', () => {
  it('sets no text under 13 units, so 12 ÷ 13 is a readable zoom', () => {
    const sizes = [...SVG_STYLE.matchAll(/font-size:([\d.]+)px/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(4);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(13);
    const [id, m] = Object.entries(c.mindmaps)[0]!;
    const svg = renderSvg(layout(m), { code: m.code ?? '', title: m.title, description: m.summary, interactive: true, idPrefix: `t-${id}` });
    expect(svg).not.toMatch(/font-size="(\d|1[0-2])(\.\d+)?"/);
  });
});
