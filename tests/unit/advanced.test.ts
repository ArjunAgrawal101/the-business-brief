/**
 * Advanced Management and Strategy: every module on disk passes its schema and
 * the integrity checks, and the checks catch the mistakes they exist for: a
 * module off its plan, an unsourced claim presented as real, a source or
 * framework that does not exist, an IB code that does not exist, and a module
 * too thin to teach from.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { advancedModuleSchema, type AdvancedModule } from '../../src/lib/advanced-schema';
import { DOMAINS, MODULE_PLAN, moduleWords } from '../../src/lib/advanced';
import { MIN_WORDS, checkAdvanced, type AdvancedContext } from '../../src/lib/integrity-advanced';
import { subtopicIndex } from '../../src/lib/integrity-learning';
import { asCorpus, loadCorpus } from './helpers/corpus';

const CONTENT = new URL('../../src/content/', import.meta.url).pathname;
const corpus = loadCorpus();
const frameworkIds = new Set(readdirSync(join(CONTENT, 'frameworks')).filter((f) => f.endsWith('.yaml')).map((f) => f.replace(/\.yaml$/, '')));
const ctx: AdvancedContext = { sources: corpus.sources, frameworks: frameworkIds, subtopics: new Set(subtopicIndex(asCorpus(corpus)).keys()) };

function onDisk(): Record<string, AdvancedModule> {
  const dir = join(CONTENT, 'advanced');
  if (!existsSync(dir)) return {};
  return Object.fromEntries(
    readdirSync(dir)
      .filter((f) => f.endsWith('.yaml'))
      .map((f) => [f.replace(/\.yaml$/, ''), advancedModuleSchema.parse(parse(readFileSync(join(dir, f), 'utf8')))]),
  );
}

/** A module that passes every check, with enough words to teach from. */
function valid(): AdvancedModule {
  const sentence = 'Managers weigh the evidence, the options and the risks before they commit the resources of the business to a course of action.';
  const text = (n: number) => Array.from({ length: n }, () => sentence).join(' ');
  return advancedModuleSchema.parse({
    domain: 'finance',
    title: 'Valuation fundamentals',
    order: 5,
    dek: 'What is a business worth?',
    audience: ['mba'],
    covers: ['Valuation fundamentals'],
    minutes: 30,
    updated: '2026-11-16',
    bridge: { codes: ['3.8'], text: text(2) },
    foundation: text(12),
    advanced: [1, 2, 3].map((i) => ({ id: `part-${i}`, title: `Part ${i}`, body: text(12) })),
    models: [1, 2].map((i) => ({ name: `Model ${i}`, origin: 'Author (2000)', summary: text(3), use: text(3), limits: text(3), framework: [...frameworkIds][0], sources: ['ib-bm-guide-2024'] })),
    applications: [
      { title: 'An illustration', kind: 'illustrative', body: text(4) },
      { title: 'Another illustration', kind: 'illustrative', body: text(4) },
    ],
    cases: [{ title: 'A fictional case', fictional: true, situation: text(4), questions: ['Why?', 'What next?'] }],
    evaluation: text(8),
    decision: { title: 'Decide', brief: text(2), fictional: true, options: [{ label: 'A', text: text(1) }, { label: 'B', text: text(1) }], criteria: ['Value', 'Risk'], guidance: text(4) },
    reading: [
      { source: 'hodder-bm-2022', note: 'A reference.' },
      { source: 'hodder-bm-2022', note: 'A reference.' },
      { source: 'hodder-bm-2022', note: 'A reference.' },
    ],
  });
}

const problemsOf = (m: AdvancedModule, id = 'valuation-fundamentals') => checkAdvanced({ [id]: m }, ctx).map((p) => p.message);

describe('the advanced modules on disk', () => {
  const modules = onDisk();

  it('pass the integrity checks', () => {
    expect(checkAdvanced(modules, ctx)).toEqual([]);
  });

  it('each have at least the minimum depth and the eight parts', () => {
    for (const [id, m] of Object.entries(modules)) {
      expect(moduleWords(m), id).toBeGreaterThanOrEqual(MIN_WORDS);
      expect(m.advanced.length, id).toBeGreaterThanOrEqual(3);
      expect(m.models.length, id).toBeGreaterThanOrEqual(2);
      expect(m.reading.length, id).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('the plan', () => {
  it('gives every domain modules, and every module an id unique across domains', () => {
    const ids = DOMAINS.flatMap((d) => MODULE_PLAN[d.id].map((p) => p.id));
    expect(DOMAINS.every((d) => MODULE_PLAN[d.id].length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('the integrity checks catch', () => {
  it('nothing in a valid module', () => {
    expect(problemsOf(valid())).toEqual([]);
  });

  it('a module that is not in its plan, or drops a topic the plan gives it', () => {
    expect(problemsOf(valid(), 'something-else').join()).toContain('is not in the plan');
    const m = valid();
    m.covers = ['Something else'];
    expect(problemsOf(m).join()).toContain('the plan gives it "Valuation fundamentals"');
  });

  it('a real application or case without a source, or a real application without a date', () => {
    const m = valid();
    m.applications[0] = { ...m.applications[0]!, kind: 'real', sources: [] };
    m.cases[0] = { ...m.cases[0]!, fictional: false, sources: [] };
    const msgs = problemsOf(m).join('\n');
    expect(msgs).toContain('presented as real but cites no source');
    expect(msgs).toContain('does not say when its facts date from');
    expect(msgs).toContain('case "A fictional case" is presented as real but cites no source');
  });

  it('a source, framework or IB code that does not exist', () => {
    const m = valid();
    m.models[0] = { ...m.models[0]!, sources: ['no-such-source'], framework: 'no-such-framework' };
    m.bridge.codes = ['9.9'];
    const msgs = problemsOf(m).join('\n');
    expect(msgs).toContain('"no-such-source", which is not in the source register');
    expect(msgs).toContain('framework "no-such-framework"');
    expect(msgs).toContain('IB subtopic "9.9"');
  });

  it('further reading that is an IB document', () => {
    const m = valid();
    m.reading[0] = { source: 'ib-bm-guide-2024', note: 'The guide.' };
    expect(problemsOf(m).join()).toContain('advanced reading must lie beyond the IB course');
  });

  it('a thin module', () => {
    const m = valid();
    m.foundation = 'Short.';
    m.advanced = m.advanced.map((s) => ({ ...s, body: 'Short.' }));
    m.evaluation = 'Short.';
    expect(problemsOf(m).join()).toContain(`a module needs at least ${MIN_WORDS}`);
  });

  it('exhibit rows that do not match their columns, and duplicated sections or options', () => {
    const m = valid();
    m.cases[0] = { ...m.cases[0]!, exhibit: { caption: 'Exhibit', columns: ['A', 'B'], rows: [['1']] } };
    m.advanced[1] = { ...m.advanced[1]!, id: 'part-1' };
    m.decision.options[1] = { ...m.decision.options[1]!, label: 'A' };
    const msgs = problemsOf(m).join('\n');
    expect(msgs).toContain('exhibit row 1 has 1 cells for 2 columns');
    expect(msgs).toContain('section id "part-1" appears twice');
    expect(msgs).toContain('decision option "a" appears twice');
  });
});
