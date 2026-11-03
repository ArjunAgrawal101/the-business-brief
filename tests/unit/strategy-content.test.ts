/**
 * The Strategy Studio's content: every entry validates against its schema,
 * passes the studio's integrity check against the rest of the corpus, and the
 * worked examples agree with each other, since they are one engagement.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { checkStudio } from '../../src/lib/integrity-strategy';
import { studioSchema, type StudioEntry, type StudioTool } from '../../src/lib/schemas-strategy';
import { TOOL_LIBS } from '../../src/lib/strategy/registry';
import { asCorpus, loadCorpus } from './helpers/corpus';
import * as bcg from '../../src/lib/strategy/bcg';
import * as tree from '../../src/lib/strategy/tree';
import * as appraisal from '../../src/lib/strategy/appraisal';
import * as forcefield from '../../src/lib/strategy/forcefield';
import * as forces from '../../src/lib/strategy/forces';
import * as steeple from '../../src/lib/strategy/steeple';

const DIR = new URL('../../src/content/studio/', import.meta.url).pathname;
const entries: Array<[string, StudioEntry]> = readdirSync(DIR)
  .filter((f) => f.endsWith('.yaml'))
  .sort()
  .map((f) => {
    const r = studioSchema.safeParse(parse(readFileSync(join(DIR, f), 'utf8')));
    if (!r.success) throw new Error(`${f}: ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    return [f.replace(/\.yaml$/, ''), r.data];
  });
const tools = entries.map(([, e]) => e).filter((e): e is StudioTool => e.type === 'tool');
// Loaded once: reading the whole corpus takes a few seconds.
const corpus = asCorpus(loadCorpus());
const tool = (kind: string) => {
  const t = tools.find((x) => x.kind === kind);
  if (!t) throw new Error(`no ${kind}`);
  return t.example.data;
};

describe('Strategy Studio content', () => {
  it('has the engagement and ten tools, one of each kind', () => {
    expect(entries.filter(([, e]) => e.type === 'engagement')).toHaveLength(1);
    expect(tools).toHaveLength(10);
    expect(new Set(tools.map((t) => t.kind)).size).toBe(10);
    expect(Object.keys(TOOL_LIBS).sort()).toEqual(tools.map((t) => t.kind).sort());
  });

  it('passes the integrity check against the corpus', () => {
    const problems = checkStudio(entries, corpus);
    expect(problems.map((p) => `${p.where}: ${p.message}`)).toEqual([]);
  });

  it('labels each tool as the guide does', () => {
    const level = (kind: string) => tools.find((t) => t.kind === kind)?.status;
    // Toolkit, SL and HL (guide, p. 14)
    for (const k of ['swot', 'steeple', 'ansoff', 'bcg', 'decision-tree']) expect(level(k)).toMatchObject({ kind: 'ib-toolkit', level: 'SL/HL' });
    // Toolkit, HL only (guide, p. 14)
    for (const k of ['porter', 'force-field']) expect(level(k)).toMatchObject({ kind: 'ib-toolkit', level: 'HL' });
    // Not in the guide
    for (const k of ['five-forces', 'stakeholders', 'appraisal']) expect(level(k)?.kind).toBe('enrichment');
    expect(level('swot')?.extensions.map((x) => x.name)).toEqual(['TOWS matrix']);
  });

  it('catches a mislabelled tool', () => {
    const broken = entries.map(([id, e]): [string, StudioEntry] => (e.type === 'tool' && e.kind === 'porter' ? [id, { ...e, status: { ...e.status, level: 'SL/HL' } }] : [id, e]));
    expect(checkStudio(broken, corpus).some((p) => p.message.includes('does not match the toolkit'))).toBe(true);
    const enrich = entries.map(([id, e]): [string, StudioEntry] => (e.type === 'tool' && e.kind === 'bcg' ? [id, { ...e, status: { ...e.status, kind: 'enrichment', level: undefined } }] : [id, e]));
    expect(checkStudio(enrich, corpus).some((p) => p.message.includes('cannot be labelled enrichment'))).toBe(true);
  });

  it('catches a worked example that does not round-trip', () => {
    const typo = entries.map(([id, e]): [string, StudioEntry] => (e.type === 'tool' && e.kind === 'swot' ? [id, { ...e, example: { ...e.example, data: { ...e.example.data, factors: [{ id: 's1', quadrant: 'S', text: 'x', evidence: 'y', wieght: 5 }] } } }] : [id, e]));
    expect(checkStudio(typo, corpus).some((p) => p.message.includes('changes when read back'))).toBe(true);
  });
});

describe('the engagement adds up across the tools', () => {
  const eng = entries.find(([, e]) => e.type === 'engagement')?.[1];
  const facts = eng && eng.type === 'engagement' ? Object.fromEntries(eng.facts.map((f) => [f.label, f.value])) : {};

  it('the BCG revenues sum to the revenue in the client brief', () => {
    const s = bcg.normalize(tool('bcg'));
    const total = s.products.reduce((n, p) => n + (p.revenue ?? 0), 0);
    expect(total).toBe(38);
    expect(facts['Revenue last year']).toContain('€38.0m');
    const cargo = s.products.find((p) => p.id === 'cargo');
    expect(facts['The bright spot']).toContain(`${cargo?.share}% of the segment`);
    expect(facts['The bright spot']).toContain(`grew ${cargo?.growth}%`);
  });

  it('the memo quotes the decision tree, STEEPLE and Five Forces as they compute', () => {
    const memo = appraisal.normalize(tool('appraisal')).memo;
    const t = tree.normalize(tool('decision-tree'));
    const ev = tree.evaluate(t);
    expect(memo.evidence).toContain(`${tree.money(ev.get('root')?.value ?? 0, t)} net of its cost`);
    const sums = tree.optionSummaries(t, ev);
    expect(memo.evidence).toContain(`a ${sums.find((x) => x.node.id === 'fleet')?.lossChance} chance of a loss`);
    expect(memo.risks).toContain(`a ${t.nodes.find((n) => n.id === 'weak')?.prob} chance in the decision tree`);
    const st = steeple.normalize(tool('steeple'));
    const top = steeple.prioritized(st)[0];
    expect(top?.id).toBe('en1');
    expect(memo.evidence).toContain(`score ${steeple.score(top!)} of 25`);
    const ff = forces.normalize(tool('five-forces'));
    expect(forces.attractiveness(forces.average(ff))).toBe('moderate');
    expect(memo.evidence).toContain('moderately attractive');
  });

  it('the force field leads by one point, as its recommended use says', () => {
    const t = forcefield.totals(forcefield.normalize(tool('force-field')));
    expect([t.driving, t.restraining]).toEqual([15, 14]);
    expect(tools.find((x) => x.kind === 'force-field')?.inUse).toContain('15 to 14');
  });

  it('the decision tree figures in the recommended use match the tree', () => {
    const t = tree.normalize(tool('decision-tree'));
    const s = tree.optionSummaries(t, tree.evaluate(t)).find((x) => x.node.id === 'fleet');
    const use = tools.find((x) => x.kind === 'decision-tree')?.inUse ?? '';
    expect(use).toContain(tree.money(s?.net ?? 0, t));
    expect(use).toContain(`losing ${tree.money(-(s?.worst ?? 0), t)}`);
    expect(use).toContain(`${s?.lossChance} chance`);
  });
});
