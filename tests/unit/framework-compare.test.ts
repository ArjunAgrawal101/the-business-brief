/**
 * Framework comparisons (src/lib/compare/, src/content/comparisons/): every
 * curated comparison validates and passes its integrity check, both (or all
 * three) sides are complete on every question, the brief's pairs are there,
 * each side's standing agrees with the curriculum file and the toolkit, and
 * the check catches the mistakes it exists for. Every framework in the
 * library also makes a complete column for the comparison tool.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { comparisonSchema, type Comparison } from '../../src/lib/compare/schema';
import { checkComparisons, statementsOf, type CompareContext, type Statement } from '../../src/lib/compare/integrity';
import { curatedColumn, examAdvice, frameworkColumn, gridHtml, type RenderCtx } from '../../src/lib/compare/render';
import { DIMENSIONS } from '../../src/lib/compare/grid';
import { frameworkSchema, type Framework } from '../../src/lib/framework-schema';
import { loadCorpus } from './helpers/corpus';

const dir = (p: string) => new URL(`../../src/content/${p}/`, import.meta.url).pathname;
const yamls = (p: string) =>
  readdirSync(dir(p))
    .filter((f) => f.endsWith('.yaml'))
    .sort()
    .map((f) => [f.replace(/\.yaml$/, ''), parse(readFileSync(join(dir(p), f), 'utf8'))] as const);

const COMPARISONS: Record<string, Comparison> = Object.fromEntries(
  yamls('comparisons').map(([id, raw]) => {
    const r = comparisonSchema.safeParse(raw);
    if (!r.success) throw new Error(`comparisons/${id}: ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    return [id, r.data];
  }),
);
const FRAMEWORKS: Record<string, Framework> = Object.fromEntries(yamls('frameworks').map(([id, raw]) => [id, frameworkSchema.parse(raw)]));

const c = loadCorpus();
const subs = (c.curricula['ib-dp-bm']?.units ?? []).flatMap((u) => u.subtopics);
const statements: Statement[] = subs.flatMap((s) => s.content.map((x) => ({ code: s.code, title: s.title, page: s.page ?? 0, text: x.text, ao: x.ao, hl: s.level === 'HL' || x.level === 'HL' })));
const ctx: CompareContext = {
  statements,
  subtopics: new Map(subs.map((s) => [s.code, { title: s.title, level: s.level, page: s.page ?? 0 }])),
  tools: Object.fromEntries(Object.entries(c.tools).map(([id, t]) => [id, { name: t.name, level: t.level, status: t.status }])),
  frameworks: FRAMEWORKS,
  glossary: new Set(Object.keys(c.glossary)),
  sources: new Set(Object.keys(c.sources)),
};
const render: RenderCtx = {
  subtopic: (code) => {
    const s = ctx.subtopics.get(code);
    return s ? { code, title: s.title, href: `/topics/${code}/`, hl: s.level === 'HL' } : undefined;
  },
  tool: (id) => (c.tools[id] ? { name: c.tools[id]!.name, href: `/toolkit/${id}/` } : undefined),
  term: (id) => (c.glossary[id] ? { term: c.glossary[id]!.term, href: `/glossary/${id}/` } : undefined),
};

describe('the curated comparisons', () => {
  it('pass their integrity check', () => {
    expect(checkComparisons(COMPARISONS, ctx)).toEqual([]);
  });

  it('cover the brief’s pairs and at least ten more', () => {
    for (const slug of ['ansoff-matrix-vs-bcg-matrix', 'swot-analysis-vs-steeple-analysis', 'autocratic-vs-democratic-leadership', 'internal-vs-external-sources-of-finance', 'job-vs-batch-vs-flow-production', 'profitability-vs-liquidity-ratios'])
      expect(COMPARISONS[slug], slug).toBeDefined();
    expect(Object.keys(COMPARISONS).length).toBeGreaterThanOrEqual(16);
    const orders = Object.values(COMPARISONS).map((x) => x.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('complete every side on every question', () => {
    for (const [slug, cmp] of Object.entries(COMPARISONS))
      for (const side of cmp.sides) {
        const where = `${slug}: ${side.name}`;
        for (const k of ['purpose', 'structure', 'context'] as const) expect(side[k].split(/\s+/).length, `${where} ${k}`).toBeGreaterThanOrEqual(8);
        expect(side.exam.split(/\s+/).length, `${where} exam`).toBeGreaterThanOrEqual(20);
        for (const k of ['strengths', 'limitations', 'mistakes'] as const) {
          expect(side[k].length, `${where} ${k}`).toBeGreaterThanOrEqual(2);
          for (const x of side[k]) expect(x.split(/\s+/).length, `${where} ${k}`).toBeGreaterThanOrEqual(4);
        }
        expect(side.application.fictional).toBe(true);
        expect(side.application.body.split(/\s+/).length, where).toBeGreaterThanOrEqual(25);
        // Each side's standing comes from the curriculum file, the toolkit or the library: never typed.
        expect(Boolean(side.tool || side.framework || side.syllabus.length), where).toBe(true);
        const col = curatedColumn(side, 0, statementsOf(side, ctx).filter((x): x is Statement => Boolean(x)), side.framework ? FRAMEWORKS[side.framework] : undefined, render);
        for (const d of DIMENSIONS) {
          expect(col.cells[d.id].length, `${where} ${d.id}`).toBeGreaterThan(40);
          expect(col.cells[d.id]).not.toMatch(/undefined|NaN|\[object Object\]/);
          expect(col.cells[d.id]).not.toMatch(/[\u2013\u2014]/);
        }
        expect(col.cells.application).toContain('Fictional');
        expect(col.cells.exam).toContain('Recommended strategy');
        expect(col.cells.standing).toMatch(/IB syllabus|IB toolkit/);
      }
  });

  it('state the standing the guide gives: HL only for NPV, QC, QA, TQM, JIT and JIC, SL and HL for payback and ARR', () => {
    const level = (slug: string, name: string) => COMPARISONS[slug]!.sides.find((s) => s.name.startsWith(name))!.level;
    expect(level('payback-vs-arr-vs-npv', 'Payback')).toBe('SL/HL');
    expect(level('payback-vs-arr-vs-npv', 'Average rate')).toBe('SL/HL');
    expect(level('payback-vs-arr-vs-npv', 'Net present')).toBe('HL');
    for (const name of ['Quality control', 'Quality assurance', 'Total quality']) expect(level('quality-control-vs-quality-assurance-vs-tqm', name)).toBe('HL');
    for (const name of ['Just-in-time', 'Just-in-case']) expect(level('jit-vs-jic', name)).toBe('HL');
    expect(level('porters-generic-strategies-vs-ansoff-matrix', 'Porter')).toBe('HL');
    // The statement behind job, batch and flow production is 5.2 at AO3.
    const job = statementsOf(COMPARISONS['job-vs-batch-vs-flow-production']!.sides[0]!, ctx)[0]!;
    expect(job).toMatchObject({ code: '5.2', ao: ['AO3'], hl: false });
  });

  it('say which to use when, for more than one side, and never repeat the PESTLE against STEEPLE page', () => {
    for (const [slug, cmp] of Object.entries(COMPARISONS)) {
      expect(new Set(cmp.choose.map((x) => x.use)).size, slug).toBeGreaterThanOrEqual(2);
      const fws = cmp.sides.map((s) => s.framework);
      expect(fws.includes('pestle') && fws.includes('steeple-analysis'), slug).toBe(false);
    }
    expect(COMPARISONS['swot-analysis-vs-steeple-analysis']!.together).toContain('/frameworks/pestle/');
  });

  it('lay the sides out in a grid of nine questions', () => {
    const cmp = COMPARISONS['job-vs-batch-vs-flow-production']!;
    const cols = cmp.sides.map((s, i) => curatedColumn(s, i, statementsOf(s, ctx).filter((x): x is Statement => Boolean(x)), undefined, render));
    const html = gridHtml(cols);
    expect((html.match(/class="cmp-row"/g) ?? []).length).toBe(9);
    expect((html.match(/class="cmp-cell"/g) ?? []).length).toBe(27);
    expect(html).toContain('data-sides="3"');
    expect(html).toContain('<h2 class="cmp-row__h" id="cmp-standing">Standing in the IB course</h2>');
    expect(gridHtml(cols.slice(0, 2), 3)).toContain('<h3 class="cmp-row__h"');
  });
});

describe('the integrity check catches', () => {
  const base = COMPARISONS['ansoff-matrix-vs-bcg-matrix']!;
  const one = (slug: string, cmp: Comparison) => checkComparisons({ [slug]: cmp }, ctx).map((p) => p.message);
  const withSide = (i: number, over: Partial<Comparison['sides'][number]>): Comparison => ({ ...base, sides: base.sides.map((s, j) => (j === i ? { ...s, ...over } : s)) });

  it('an address that does not name its sides', () => {
    expect(one('ansoff-and-bcg', base).join(' ')).toMatch(/-vs-/);
  });

  it('a level that disagrees with the toolkit or the curriculum', () => {
    expect(one('a-vs-b', withSide(0, { level: 'HL' })).join(' ')).toMatch(/the toolkit gives ansoff-matrix as SL\/HL/);
    const npv = COMPARISONS['payback-vs-arr-vs-npv']!;
    const wrong: Comparison = { ...npv, sides: npv.sides.map((s, j) => (j === 2 ? { ...s, level: 'SL/HL' as const } : s)) };
    expect(one('payback-vs-npv', wrong).join(' ')).toMatch(/HL only, but the side says SL\/HL/);
  });

  it('a statement the curriculum does not have, and unknown references', () => {
    const bad = withSide(1, { syllabus: [{ code: '4.5', statement: 'nothing like this at all' }], terms: ['no-such-term'], subtopics: ['9.9'] });
    const msgs = one('a-vs-b', bad).join(' ');
    expect(msgs).toMatch(/no single statement in 4.5/);
    expect(msgs).toMatch(/unknown glossary term no-such-term/);
    expect(msgs).toMatch(/unknown subtopic 9.9/);
    expect(one('a-vs-b', withSide(0, { framework: 'no-such-framework' })).join(' ')).toMatch(/no framework no-such-framework/);
  });

  it('a repeat of the PESTLE against STEEPLE page, a duplicate pair and a choice of a side that does not exist', () => {
    const pestle = withSide(0, { framework: 'pestle', tool: undefined, level: 'SL/HL' });
    const p2: Comparison = { ...pestle, sides: [pestle.sides[0]!, { ...pestle.sides[1]!, framework: 'steeple-analysis', tool: 'steeple-analysis' }] };
    expect(one('pestle-vs-steeple', p2).join(' ')).toMatch(/already compares PESTLE with STEEPLE/);
    expect(checkComparisons({ 'ansoff-matrix-vs-bcg-matrix': base, 'bcg-matrix-vs-ansoff-matrix': base }, ctx).map((p) => p.message).join(' ')).toMatch(/covers the same ideas/);
    expect(one('a-vs-b', { ...base, choose: [...base.choose, { when: 'Always.', use: 5, why: 'Because.' }] }).join(' ')).toMatch(/names a side that does not exist/);
  });
});

describe('the comparison tool’s columns', () => {
  it('make a complete column for every framework in the library', () => {
    expect(Object.keys(FRAMEWORKS).length).toBeGreaterThanOrEqual(30);
    for (const [id, f] of Object.entries(FRAMEWORKS)) {
      const col = frameworkColumn(id, f, render);
      expect(col.href).toBe(`/frameworks/${id}/`);
      for (const d of DIMENSIONS) {
        expect(col.cells[d.id].length, `${id} ${d.id}`).toBeGreaterThan(40);
        expect(col.cells[d.id]).not.toMatch(/undefined|NaN|\[object Object\]|[\u2013\u2014]/);
      }
      expect(col.cells.context).toContain('Look elsewhere when');
      expect(col.cells.application).toContain('Fictional');
    }
  });

  it('give exam advice by standing, never claiming the course for enrichment', () => {
    expect(examAdvice(FRAMEWORKS['porters-generic-strategies']!)).toMatch(/HL only, so it will not be needed in Paper 1/);
    expect(examAdvice(FRAMEWORKS['swot-analysis']!)).toMatch(/AO2 and AO4/);
    expect(examAdvice(FRAMEWORKS['swot-analysis']!)).not.toMatch(/Paper 1/);
    const enr = examAdvice(FRAMEWORKS['five-forces']!);
    expect(enr).toMatch(/beyond the IB course/);
    expect(enr).not.toMatch(/syllabus content|toolkit tool/);
    expect(examAdvice(FRAMEWORKS['maslows-hierarchy-of-needs']!)).toMatch(/syllabus content/);
  });
});
