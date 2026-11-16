/**
 * The Framework Application Lab: every framework explains how it is built,
 * when to use it, how to read it, what it justifies and the usual mistakes,
 * in words of its own; every framework's application mode names tools that
 * exist; the hub files every framework under a question; and the checks
 * catch a broken application.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { DECISION_IDS, frameworkSchema, type Framework } from '../../src/lib/framework-schema';
import { ADVANCED, JUDGEMENT, applicationOf, applyHref, applyTools, byDecision, partKey } from '../../src/lib/framework-lab';
import { checkApplications } from '../../src/lib/integrity-frameworks';
import { loadCorpus } from './helpers/corpus';

const DIR = new URL('../../src/content/frameworks/', import.meta.url).pathname;
const STUDIO = new URL('../../src/content/studio/', import.meta.url).pathname;

const fw: Record<string, Framework> = Object.fromEntries(
  readdirSync(DIR)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => [f.replace(/\.yaml$/, ''), frameworkSchema.parse(parse(readFileSync(join(DIR, f), 'utf8')))]),
);
const studio = readdirSync(STUDIO)
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => parse(readFileSync(join(STUDIO, f), 'utf8')) as { type: string; slug?: string })
  .filter((d) => d.type === 'tool')
  .map((d) => d.slug as string);
const c = loadCorpus();
const tools = applyTools(c.modules);

/** Every sentence of the fields the Lab added, for a framework. */
function sentences(f: Framework): string[] {
  const texts = [
    ...f.structure.map((p) => p.text),
    ...f.situations.suits,
    ...f.situations.poorFit,
    f.interpretation,
    ...f.implications.justifies,
    ...f.implications.doesNotJustify,
    ...f.mistakes.flatMap((m) => [m.mistake, m.fix]),
  ];
  return texts.flatMap((t) => t.split(/(?<=[.!?])\s+/)).map((x) => x.trim().toLowerCase()).filter((x) => x.length >= 50);
}

describe('every framework, applied', () => {
  it('has the 35 frameworks of the library', () => {
    expect(Object.keys(fw)).toHaveLength(35);
  });

  it('sets out its structure, situations, reading, implications and mistakes in full', () => {
    for (const [id, f] of Object.entries(fw)) {
      expect(f.structure.length, id).toBeGreaterThanOrEqual(4);
      expect(f.situations.suits.length, id).toBeGreaterThanOrEqual(2);
      expect(f.situations.poorFit.length, id).toBeGreaterThanOrEqual(1);
      expect(f.interpretation.split(/\s+/).length, id).toBeGreaterThanOrEqual(60);
      expect(f.implications.justifies.length + f.implications.doesNotJustify.length, id).toBeGreaterThanOrEqual(4);
      expect(f.mistakes.length, id).toBeGreaterThanOrEqual(3);
      expect(f.decisions.length, id).toBeGreaterThanOrEqual(1);
    }
  });

  it('writes each framework in words of its own: no long sentence is shared between two frameworks', () => {
    const seen = new Map<string, string>();
    const shared: string[] = [];
    for (const [id, f] of Object.entries(fw)) {
      for (const s of new Set(sentences(f))) {
        const other = seen.get(s);
        if (other && other !== id) shared.push(`${id} and ${other}: ${s}`);
        seen.set(s, id);
      }
    }
    expect(shared).toEqual([]);
  });

  it('gives every part of a framework its own field in the worksheet', () => {
    for (const [id, f] of Object.entries(fw)) {
      const keys = f.structure.map((p) => partKey(p.name));
      expect(new Set(keys).size, id).toBe(keys.length);
      expect(keys.every((k) => k.length > 'part:'.length), id).toBe(true);
    }
  });

  it('cites only academic works in the register as the works it comes from', () => {
    for (const [id, f] of Object.entries(fw)) for (const r of f.references) expect(c.sources[r]?.kind, `${id}: ${r}`).toBe('academic');
    for (const id of ['five-forces', 'porters-generic-strategies', 'bcg-matrix', 'mckinsey-7s', 'ansoff-matrix', 'balanced-scorecard']) expect(fw[id]?.references.length, id).toBeGreaterThan(0);
    expect(fw['five-forces']?.references).toEqual(['porter-1979', 'porter-1980']);
    expect(fw['bcg-matrix']?.references).toEqual(['henderson-1970']);
    expect(fw['mckinsey-7s']?.references).toContain('waterman-peters-phillips-1980');
  });
});

describe('the application mode', () => {
  it('names only tools that exist, lists each framework\'s studio tool, and files every framework under a question', () => {
    expect(checkApplications(fw, tools, studio).map((p) => `${p.where}: ${p.message}`)).toEqual([]);
  });

  it('knows the tools of every room that can apply a framework', () => {
    for (const href of ['/strategy-studio/scenarios/', '/strategy-studio/stakeholder-salience/', '/strategy-studio/strategic-fit/', '/entrepreneurship-lab/business-model-canvas/', '/market-studio/product-life-cycle/', '/people-and-culture/motivation-analysis/', '/operations-floor/capacity-and-productivity/', '/finance-desk/contribution/', '/finance-desk/lab/contribution/', '/case-room/halden-diagnosis/'])
      expect(tools.has(href), href).toBe(true);
    expect(tools.get('/strategy-studio/scenarios/')).toMatchObject({ title: 'Scenario planner', room: 'Strategy Studio' });
    // Readings, cases and anchors are not tools.
    expect([...tools.keys()].some((h) => h.includes('#') || h.startsWith('/topics/') || h.startsWith('/cases/'))).toBe(false);
  });

  it('links each framework the brief named to its tool', () => {
    const full = (id: string) => applicationOf(fw[id]!, tools).full.map((t) => t.href);
    const part = (id: string) => applicationOf(fw[id]!, tools).part.map((t) => t.href);
    expect(full('swot-analysis')).toContain('/strategy-studio/swot/');
    expect(full('steeple-analysis')).toContain('/strategy-studio/steeple/');
    expect(full('five-forces')).toContain('/strategy-studio/five-forces/');
    expect(full('ansoff-matrix')).toContain('/strategy-studio/ansoff/');
    expect(full('bcg-matrix')).toContain('/strategy-studio/bcg-matrix/');
    expect(full('porters-generic-strategies')).toContain('/strategy-studio/generic-strategies/');
    expect(full('mendelow-matrix')).toContain('/strategy-studio/stakeholder-map/');
    expect(full('decision-trees')).toContain('/strategy-studio/decision-tree/');
    expect(full('force-field-analysis')).toContain('/strategy-studio/force-field/');
    expect(full('business-model-canvas')).toContain('/entrepreneurship-lab/business-model-canvas/');
    expect(full('mckinsey-7s')).toContain('/strategy-studio/strategic-fit/');
    expect(part('mendelow-matrix')).toContain('/strategy-studio/stakeholder-salience/');
    expect(part('steeple-analysis')).toContain('/strategy-studio/scenarios/');
    expect(part('pestle')).toContain('/strategy-studio/scenarios/');
    expect(full('maslows-hierarchy-of-needs')).toContain('/people-and-culture/motivation-analysis/');
    expect(full('product-life-cycle')).toContain('/market-studio/product-life-cycle/');
    expect(full('contribution')).toContain('/finance-desk/lab/contribution/');
  });

  it('opens the application mode from the hub', () => {
    expect(applyHref('swot-analysis')).toBe('/frameworks/swot-analysis/#apply');
    expect(JUDGEMENT).toContain('structure judgement; they do not produce answers');
  });

  it('catches a broken application', () => {
    const base = fw['swot-analysis']!;
    const msgs = (over: Partial<Framework>, extra: Record<string, Framework> = {}) => checkApplications({ ...fw, x: { ...base, ...over }, ...extra }, tools, studio).map((p) => p.message);
    expect(msgs({ apply: [{ href: '/strategy-studio/nope/', scope: 'full', use: 'x' }] }).some((m) => m.includes('not a tool the Lab knows'))).toBe(true);
    expect(msgs({ apply: [{ href: '/strategy-studio/swot/', scope: 'full', use: 'x' }, { href: '/strategy-studio/swot/', scope: 'part', use: 'y' }] }).some((m) => m.includes('listed twice'))).toBe(true);
    expect(msgs({ apply: [] }).some((m) => m.includes('must be listed under apply'))).toBe(true);
    expect(msgs({}, { lab: base }).some((m) => m.includes('address of the Framework Application Lab'))).toBe(true);
    const noFit = Object.fromEntries(Object.entries(fw).map(([id, f]) => [id, { ...f, decisions: f.decisions.filter((d) => d !== 'fit').length ? f.decisions.filter((d) => d !== 'fit') : (['compete'] as Framework['decisions']) }]));
    expect(checkApplications(noFit, tools, studio).map((p) => p.message)).toContain('no framework is filed under this question');
    expect(checkApplications(fw, tools, studio.filter((s) => s !== 'scenarios')).some((p) => p.message.includes('"scenarios" does not exist'))).toBe(true);
  });
});

describe('the hub', () => {
  const groups = byDecision(fw);

  it('files every framework under at least one question, and offers something for every question', () => {
    expect(groups.map((g) => g.id)).toEqual([...DECISION_IDS]);
    for (const g of groups) expect(g.items.length, g.id).toBeGreaterThan(0);
    const filed = new Set(groups.flatMap((g) => g.items.map(([id]) => id)));
    expect([...filed].sort()).toEqual(Object.keys(fw).sort());
  });

  it('points the questions without a framework of their own to the new tools', () => {
    expect(groups.find((g) => g.id === 'uncertain-future')?.tools).toEqual(['scenarios']);
    expect(groups.find((g) => g.id === 'stakeholders')?.tools).toEqual(['stakeholder-map', 'stakeholder-salience']);
    expect(groups.find((g) => g.id === 'fit')?.tools).toEqual(['strategic-fit']);
  });

  it('features the advanced applications the owner named, and the three new tools', () => {
    expect(ADVANCED.map((a) => a.slug)).toEqual(['five-forces', 'ansoff', 'bcg-matrix', 'decision-tree', 'scenarios', 'stakeholder-salience', 'strategic-fit']);
    for (const a of ADVANCED) {
      expect(studio, a.slug).toContain(a.slug);
      if (a.framework) expect(fw[a.framework], a.framework).toBeDefined();
    }
  });
});
