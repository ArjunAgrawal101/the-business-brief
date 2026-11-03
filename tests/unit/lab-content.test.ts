/**
 * The Entrepreneurship and Innovation Lab's content: every briefing and tool
 * file passes its schema, the Lab's integrity checks find nothing, the room's
 * register entry matches what the room holds, and the checks catch the
 * mistakes they exist to catch.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { loadCorpus, asCorpus } from './helpers/corpus';
import { checkLab, type LabContent } from '../../src/lib/integrity-lab';
import { briefingSchema, labToolSchema, type Briefing, type LabTool } from '../../src/lib/lab/schemas';

const ROOT = new URL('../../src/content/', import.meta.url).pathname;

function load<T>(dir: string, schema: { safeParse: (d: unknown) => { success: boolean; data?: unknown; error?: { issues: Array<{ path: PropertyKey[]; message: string }> } } }): Record<string, T> {
  return Object.fromEntries(
    readdirSync(join(ROOT, dir))
      .filter((f) => f.endsWith('.yaml'))
      .map((f) => {
        const r = schema.safeParse(parse(readFileSync(join(ROOT, dir, f), 'utf8')));
        if (!r.success) throw new Error(`${dir}/${f}: ${r.error?.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
        return [f.replace(/\.yaml$/, ''), r.data as T];
      }),
  );
}

const corpus = loadCorpus();
const lab = (): LabContent => {
  const room = corpus.modules['entrepreneurship-lab'];
  return {
    briefings: load<Briefing>('briefings', briefingSchema),
    tools: load<LabTool>('lab', labToolSchema),
    room: room ? { href: room.href, items: room.items, syllabus: room.syllabus } : undefined,
  };
};

describe('Entrepreneurship and Innovation Lab content', () => {
  it('passes every schema and every integrity check', () => {
    expect(checkLab(lab(), asCorpus(corpus))).toEqual([]);
  });

  it('has six briefings and one tool of each of the six kinds', () => {
    const l = lab();
    expect(Object.keys(l.briefings)).toHaveLength(6);
    expect(Object.values(l.tools).map((t) => t.kind).sort()).toEqual(['canvas', 'costs', 'feasibility', 'plan', 'revenue', 'unit-economics']);
  });

  it('labels every section as IB content, enrichment or both', () => {
    for (const b of Object.values(lab().briefings)) for (const s of b.sections) expect(s.ib.length > 0 || s.enrichment).toBe(true);
  });

  it('marks the Business Model Canvas, the lean start-up and unit economics as enrichment, and the business plan as a toolkit tool', () => {
    const l = lab();
    const ideas = Object.values(l.briefings).flatMap((b) => b.ideas);
    const status = (text: string) => ideas.find((i) => i.idea.includes(text))?.status;
    expect(status('Business Model Canvas')).toBe('enrichment');
    expect(status('lean start-up')).toBe('enrichment');
    expect(status('minimum viable product')).toBe('enrichment');
    expect(status('Customer acquisition cost')).toBe('enrichment');
    expect(status('Venture capital')).toBe('enrichment');
    expect(status('business angels')).toBe('ib');
    expect(Object.values(l.tools).find((t) => t.kind === 'plan')?.ib.status).toBe('ib-toolkit');
    expect(Object.values(l.tools).find((t) => t.kind === 'canvas')?.ib.status).toBe('enrichment');
  });

  it('catches broken references, unlabelled sections and a register entry that does not match the room', () => {
    const l = lab();
    const b = structuredClone(l.briefings['opportunity-and-validation']!);
    b.glossary.push('no-such-term');
    b.tools.push('no-such-tool');
    b.sections[0]!.ib = ['9.9'];
    b.sections[1]!.ib = [];
    b.sections[1]!.enrichment = false;
    b.ideas.push({ idea: 'Invented idea', status: 'ib', codes: [], note: 'x' });
    const room = structuredClone(l.room!);
    room.items = room.items.slice(1);
    room.syllabus = [...room.syllabus, '2.5'];
    const msgs = checkLab({ ...l, briefings: { ...l.briefings, 'opportunity-and-validation': b }, room }, asCorpus(corpus)).map((p) => p.message);
    expect(msgs).toContain('glossary term "no-such-term" does not exist');
    expect(msgs).toContain('tool "no-such-tool" does not exist');
    expect(msgs).toContain('"9.9" is not a subtopic of the IB course');
    expect(msgs).toContain('is neither mapped to an IB subtopic nor marked as enrichment');
    expect(msgs).toContain('is marked as IB content but names no subtopic');
    expect(msgs).toContain('is IB content but gives no page of the guide');
    expect(msgs.some((m) => m.includes('which is not listed in its items'))).toBe(true);
    expect(msgs).toContain('lists 2.5 as served, but no briefing section or tool maps to it');
  });

  it("rejects a tool whose example would not be a valid input to its own model", () => {
    const l = lab();
    const costs = structuredClone(Object.entries(l.tools).find(([, t]) => t.kind === 'costs')!);
    if (costs[1].kind === 'costs') costs[1].growth = 400;
    const msgs = checkLab({ ...l, tools: { ...l.tools, [costs[0]]: costs[1] } }, asCorpus(corpus)).map((p) => p.message);
    expect(msgs.some((m) => m.startsWith('example: growth'))).toBe(true);
  });
});
