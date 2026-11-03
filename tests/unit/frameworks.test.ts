/**
 * The frameworks library: every entry validates, names its standing honestly
 * and resolves its references; the glossary's framework links resolve; and
 * the figures drawn for the library compute what they show.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { frameworkSchema, FRAMEWORK_GROUPS, type Framework } from '../../src/lib/framework-schema';
import { grouped, inLibraryOrder, levelKey, matrix, resolveRef, standing, frameworksForTerm } from '../../src/lib/frameworks';
import { checkFrameworks, checkGlossaryDepth } from '../../src/lib/integrity-frameworks';
import { DIAGRAMS } from '../../src/lib/diagrams';
import { asCorpus, loadCorpus } from './helpers/corpus';

const DIR = new URL('../../src/content/frameworks/', import.meta.url).pathname;

function loadFrameworks(): Record<string, Framework> {
  if (!existsSync(DIR)) return {};
  return Object.fromEntries(
    readdirSync(DIR)
      .filter((f) => f.endsWith('.yaml'))
      .sort()
      .map((f) => {
        const r = frameworkSchema.safeParse(parse(readFileSync(join(DIR, f), 'utf8')));
        if (!r.success) throw new Error(`frameworks/${f}: ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
        return [f.replace(/\.yaml$/, ''), r.data];
      }),
  );
}

const sample = (over: Partial<Framework>): Framework =>
  frameworkSchema.parse({
    name: 'Sample',
    summary: 'A sample.',
    question: 'What?',
    group: 'strategy',
    status: 'enrichment',
    qualifications: ['mba'],
    diagram: 'five-forces',
    explanation: 'Explained.',
    purpose: 'For testing.',
    steps: ['One.', 'Two.', 'Three.'],
    example: { fictional: true, business: 'Testco', title: 'A test', body: 'Body.', result: 'Result.' },
    advantages: ['Good.', 'Also good.'],
    limitations: ['Bad.', 'Also bad.'],
    exercise: { prompt: 'Try it.', guidance: ['Hint one.', 'Hint two.'] },
    order: 1,
    ...over,
  });

describe('the frameworks library', () => {
  const c = loadCorpus();
  const fw = loadFrameworks();

  it('has no broken references and labels every framework honestly', () => {
    expect(checkFrameworks(fw, asCorpus(c)).map((p) => `${p.where}: ${p.message}`)).toEqual([]);
  });

  it('resolves every framework a glossary term names', () => {
    expect(checkGlossaryDepth(asCorpus(c), fw).map((p) => `${p.where}: ${p.message}`)).toEqual([]);
  });

  it('gives every IB toolkit tool a framework page that links to its guide', () => {
    const toolkit = Object.entries(c.tools).filter(([, t]) => t.ibStatus === 'ib-toolkit');
    for (const [id] of toolkit) expect(Object.values(fw).some((f) => f.status === 'toolkit' && f.tool === id), id).toBe(true);
  });

  it('covers the frameworks the brief names', () => {
    const want = [
      'maslows-hierarchy-of-needs', 'herzbergs-motivation-hygiene-theory', 'scientific-management', 'mcclellands-acquired-needs-theory',
      'self-determination-theory', 'equity-theory', 'expectancy-theory', 'product-life-cycle', 'bcg-matrix', 'porters-generic-strategies',
      'hofstedes-cultural-dimensions', 'five-forces', 'value-chain', 'mckinsey-7s', 'business-model-canvas', 'balanced-scorecard', 'pestle',
      'kotter-eight-steps', 'lewin-change-model', 'mendelow-matrix', 'raci-matrix', 'smart-objectives',
    ];
    for (const id of want) expect(fw[id], id).toBeDefined();
  });

  it('places every framework in a group, in library order', () => {
    const groups = grouped(fw);
    expect(groups.map((g) => g.id)).toEqual([...FRAMEWORK_GROUPS]);
    expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(Object.keys(fw).length);
    expect(inLibraryOrder(fw).map(([id]) => id).sort()).toEqual(Object.keys(fw).sort());
    const m = matrix(fw);
    const cells = Object.values(m).flatMap((row) => Object.values(row));
    expect(cells.reduce((n, cell) => n + cell.length, 0)).toBe(Object.keys(fw).length);
  });
});

describe('framework labels and links', () => {
  const c = loadCorpus();
  it('states the standing with the guide page', () => {
    expect(standing(sample({ status: 'syllabus', guidePages: '26', qualifications: ['ib'] }))).toBe('Named in the IB syllabus, guide p. 26');
    expect(standing(sample({ status: 'toolkit', guidePages: '14 to 15', qualifications: ['ib'] }))).toBe('An IB toolkit tool, guide pp. 14 to 15');
    expect(standing(sample({}))).toBe('Enrichment: beyond the IB course');
  });

  it('keys the level filter', () => {
    expect(levelKey(sample({}))).toBe('beyond');
    expect(levelKey(sample({ status: 'toolkit', level: 'HL', qualifications: ['ib'] }))).toBe('hl');
    expect(levelKey(sample({ status: 'syllabus', qualifications: ['ib'] }))).toBe('sl');
  });

  it('resolves a reference to a framework first, then a tool, then a diagram', () => {
    const ctx = { frameworks: { 'swot-analysis': sample({ name: 'SWOT page' }) }, tools: c.tools, diagrams: DIAGRAMS };
    expect(resolveRef('swot-analysis', ctx)).toMatchObject({ kind: 'framework', href: '/frameworks/swot-analysis/', title: 'SWOT page' });
    expect(resolveRef('ansoff-matrix', ctx)).toMatchObject({ kind: 'tool', href: '/toolkit/ansoff-matrix/' });
    expect(resolveRef('maslow-hierarchy', ctx)).toMatchObject({ kind: 'diagram', href: '/diagrams/#diagram-maslow-hierarchy' });
    expect(resolveRef('no-such-thing', ctx)).toBeUndefined();
    const planned = Object.entries(c.tools).find(([, t]) => t.status === 'planned');
    if (planned) expect(resolveRef(planned[0], { ...ctx, frameworks: {} })?.href).toBe(`/toolkit/#tool-${planned[0]}`);
  });

  it('lists a term\'s frameworks without repeats, including frameworks that name the term', () => {
    const g = c.glossary['swot-analysis']!;
    const ctx = { frameworks: { 'swot-analysis': sample({ terms: ['swot-analysis'] }) }, tools: c.tools, diagrams: DIAGRAMS };
    const list = frameworksForTerm('swot-analysis', { ...g, frameworks: ['swot-analysis', 'swot'] }, ctx);
    expect(list.map((l) => `${l.kind}:${l.id}`)).toEqual(['framework:swot-analysis', 'diagram:swot']);
  });

  it('rejects a framework that misstates its standing', () => {
    const msgs = (f: Framework) => checkFrameworks({ x: f }, asCorpus(c)).map((p) => p.message);
    expect(msgs(sample({ qualifications: ['ib'] }))).toContain('an enrichment framework cannot carry the "ib" qualification');
    expect(msgs(sample({ status: 'syllabus', qualifications: ['ib'] }))).toContain('a syllabus framework gives the guide page that names it');
    expect(msgs(sample({ status: 'toolkit', qualifications: ['ib'], guidePages: '14', sources: ['ib-bm-guide-2024'] }))).toContain('a toolkit framework names its tool, whose guide holds the full treatment');
    expect(msgs(sample({ diagram: 'nope' }))).toContain('diagram "nope" is not in the library');
  });
});
