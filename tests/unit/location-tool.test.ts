import { describe, expect, it } from 'vitest';
import { assessLocation, contributionRowsHtml, locationCsvRows, locationSvg, lowListHtml, matrixHtml, validateMatrix, type LocationMatrix } from '../../src/lib/location-tool';
import { loadTool } from './helpers/room-tool';

const load = (): LocationMatrix => {
  const t = loadTool('ops-location-assessment', 'location-assessment');
  return { factors: t.factors, sites: t.sites.map((s) => ({ id: s.id, name: s.name, scores: s.scores })), maxScore: t.maxScore, maxWeight: t.maxWeight, lowThreshold: t.lowThreshold };
};

describe('the worked example, scored by hand', () => {
  const m = load();
  const r = assessLocation(m);
  it('totals weight × score for each site', () => {
    // A: 3×4 + 4×3 + 5×8 + 4×10 + 3×8 + 2×5 + 3×9 = 12 + 12 + 40 + 40 + 24 + 10 + 27 = 165
    // B: 3×6 + 4×5 + 5×8 + 4×6 + 3×9 + 2×7 + 3×8 = 18 + 20 + 40 + 24 + 27 + 14 + 24 = 167
    // C: 3×9 + 4×9 + 5×7 + 4×2 + 3×5 + 2×6 + 3×4 = 27 + 36 + 35 + 8 + 15 + 12 + 12 = 145
    expect(r.results.map((s) => [s.name, s.total, s.rank])).toEqual([
      ['Site B', 167, 1],
      ['Site A', 165, 2],
      ['Site C', 145, 3],
    ]);
    // The most possible: (3 + 4 + 5 + 4 + 3 + 2 + 3) × 10 = 240
    expect(r.maxTotal).toBe(240);
    expect(r.leaders).toEqual(['site-b']);
  });
  it('finds the weights that change the answer', () => {
    // Lead time: A gains 4 a point of weight over B, so a weight of 5 puts A first (175 against 173).
    expect(r.reading.reading).toContain('at a weight of 5 on lead time to the assembly line (now 4), Site A ranks first');
    // Labour costs: B gains 2 a point over A, so a weight of 3 makes them tie.
    expect(r.reading.reading).toContain('at a weight of 3 on labour costs (now 4), Site A and Site B tie');
    expect(r.reading.implication).toContain('A close ranking means the decision rests on the weights');
  });
  it('flags the scores of 3 or below', () => {
    expect(r.low).toEqual([
      { site: 'site-a', factor: 'labour', score: 3 },
      { site: 'site-c', factor: 'lead-time', score: 2 },
    ]);
    expect(lowListHtml(m, r)).toContain('<strong>Site C</strong>: lead time to the assembly line, 2 out of 10');
  });
});

describe('checking a matrix', () => {
  it('accepts the worked example', () => {
    expect(validateMatrix(load())).toEqual([]);
  });
  it('rejects scores out of range, weights that are not whole, blank names and all-zero weights', () => {
    const m = load();
    m.sites[0]!.scores.land = 11;
    m.factors[1]!.weight = 2.5;
    m.sites[1]!.name = ' ';
    const kinds = validateMatrix(m).map((p) => p.kind);
    expect(kinds).toEqual(expect.arrayContaining(['score', 'weight', 'site']));
    const zero = load();
    zero.factors.forEach((f) => (f.weight = 0));
    expect(validateMatrix(zero).some((p) => p.kind === 'matrix')).toBe(true);
    const one = load();
    one.sites = one.sites.slice(0, 1);
    expect(validateMatrix(one).some((p) => p.message.includes('at least two sites'))).toBe(true);
  });
});

describe('the views and the file', () => {
  const m = load();
  const r = assessLocation(m);
  it('shows the working and the ranking', () => {
    const html = contributionRowsHtml(m, r);
    expect(html).toContain('Weighted total');
    expect(html).toContain('<strong>167</strong>');
    expect(html).toContain('class="n is-low"');
    const svg = locationSvg(r, 'l');
    expect(svg).toContain('Site B 167 (rank 1); Site A 165 (rank 2); Site C 145 (rank 3)');
  });
  it('gives every input in the matrix a label', () => {
    const html = matrixHtml(m, 'u', []);
    const inputs = (html.match(/<input /g) ?? []).length;
    const labels = (html.match(/<label /g) ?? []).length;
    expect(inputs).toBe(labels);
    // 7 factors × (name + weight) + 3 site names + 21 scores
    expect(inputs).toBe(7 * 2 + 3 + 21);
  });
  it('exports scores, weighted scores and totals', () => {
    const rows = locationCsvRows(m, r);
    expect(rows[0]?.length).toBe(2 + 3 + 3);
    expect(rows[rows.length - 1]?.slice(-3)).toEqual(['165', '167', '145']);
  });
});
