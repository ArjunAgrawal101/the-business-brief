/**
 * The Business Intelligence Briefing: every item validates against its schema
 * and passes the integrity check, and the check catches each kind of breach
 * of the sourcing rules (a broken copy of a real item is built for each).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { asCorpus, loadCorpus } from './helpers/corpus';
import { BRIEFING_BEGAN, checkIntelligence, linkTargets, quotations } from '../../src/lib/integrity-intelligence';
import { intelligenceSchema, type Intelligence } from '../../src/lib/schemas';

const DIR = new URL('../../src/content/intelligence/', import.meta.url).pathname;

function loadBriefing(): Record<string, Intelligence> {
  if (!existsSync(DIR)) return {};
  const out: Record<string, Intelligence> = {};
  for (const f of readdirSync(DIR).filter((x) => x.endsWith('.yaml')).sort()) {
    const r = intelligenceSchema.safeParse(parse(readFileSync(join(DIR, f), 'utf8')));
    if (!r.success) throw new Error(`intelligence/${f}: ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    out[f.replace(/\.yaml$/, '')] = r.data;
  }
  return out;
}

const corpus = asCorpus(loadCorpus());
const items = loadBriefing();
const messages = (list: Record<string, Intelligence>) => checkIntelligence(list, corpus).map((p) => `${p.where}: ${p.message}`);

/** A deep copy of the lead item, changed by `edit`, as the only item. */
function broken(edit: (it: Intelligence) => void): string[] {
  const [id, lead] = Object.entries(items).find(([, it]) => it.lead) ?? [];
  if (!id || !lead) throw new Error('no lead item');
  const copy = structuredClone(lead);
  edit(copy);
  return messages({ [id]: copy });
}

describe('the briefing', () => {
  it('publishes between eight and ten items', () => {
    expect(Object.keys(items).length).toBeGreaterThanOrEqual(8);
    expect(Object.keys(items).length).toBeLessThanOrEqual(10);
  });

  it('passes every integrity check', () => {
    expect(messages(items)).toEqual([]);
  });

  it('dates every source on or after the day the briefing began, and links every one with https', () => {
    for (const it of Object.values(items)) {
      for (const s of it.sources) {
        expect(s.accessed >= BRIEFING_BEGAN).toBe(true);
        expect(s.url.startsWith('https://')).toBe(true);
      }
    }
  });

  it('covers every kind of development the brief asks for', () => {
    const kinds = new Set(Object.values(items).flatMap((it) => it.categories));
    for (const k of ['corporate-strategy', 'mergers-and-acquisitions', 'leadership', 'marketing', 'restructuring', 'financial-results', 'innovation', 'entrepreneurship', 'sustainability', 'global-trend']) {
      expect(kinds.has(k as Intelligence['categories'][number]), k).toBe(true);
    }
  });

  it('keeps every development within 2025 and 2026', () => {
    for (const it of Object.values(items)) expect(['2025', '2026']).toContain(it.date.slice(0, 4));
  });
});

describe('the briefing integrity check', () => {
  it('finds quotations and link targets', () => {
    expect(quotations('He said “not now” and "later".')).toEqual(['not now', 'later']);
    expect(linkTargets('See [cash flow](/topics/cash-flow/) and [the guide](https://example.org/a).')).toEqual(['/topics/cash-flow/', 'https://example.org/a']);
  });

  it('rejects a fact that cites a source the item does not list', () => {
    expect(broken((it) => it.happened[0]?.sources.push('nowhere')).join('\n')).toMatch(/cites source "nowhere", which the item does not list/);
  });

  it('rejects a source that supports nothing on the page', () => {
    expect(broken((it) => it.sources.push({ ...it.sources[0]!, id: 'spare' })).join('\n')).toMatch(/source "spare" supports nothing on the page/);
  });

  it('rejects a source with no publication date that does not say why', () => {
    expect(broken((it) => (it.sources = it.sources.map((s) => ({ ...s, published: undefined })))).join('\n')).toMatch(/has no publication date/);
  });

  it('rejects a source read before the briefing began, or before it was published', () => {
    expect(broken((it) => (it.sources[0]!.accessed = '2026-10-01')).join('\n')).toMatch(/before the briefing began/);
    expect(broken((it) => (it.sources[0]!.published = '2026-11-04')).join('\n')).toMatch(/before it was published/);
  });

  it('rejects an address that is not https', () => {
    expect(broken((it) => (it.sources[0]!.url = 'http://www.oracle.com/')).join('\n')).toMatch(/needs an https address/);
  });

  it('rejects business press presented as a primary source', () => {
    expect(broken((it) => (it.sources[0]!.kind = 'press')).join('\n')).toMatch(/cannot be a primary source/);
  });

  it('rejects an item whose own date is not the date of any fact', () => {
    expect(broken((it) => (it.date = '2026-06-11')).join('\n')).toMatch(/no fact under "what happened" carries the item's own date/);
  });

  it('rejects a development from before 2025, and a fact dated after the check', () => {
    expect(broken((it) => (it.date = '2024-12-31')).join('\n')).toMatch(/from 2025 onwards/);
    expect(broken((it) => (it.happened[0]!.date = '2026-12-01')).join('\n')).toMatch(/after the item was checked/);
  });

  it('rejects facts out of date order', () => {
    expect(
      broken((it) => {
        it.happened.reverse();
        it.happened[0]!.date = '2026-06-10';
        it.happened[1]!.date = '2026-06-09';
      }).join('\n'),
    ).toMatch(/keep facts in date order/);
  });

  it('rejects a fact marked as at a day its source was not read', () => {
    expect(broken((it) => (it.since[0]! = { ...it.since[0]!, asAt: true })).join('\n')).toMatch(/is marked as at/);
  });

  it('rejects a quotation longer than 25 words', () => {
    const long = `"${Array.from({ length: 26 }, (_, i) => `word${i}`).join(' ')}"`;
    expect(broken((it) => (it.matters = `${it.matters} ${long}`)).join('\n')).toMatch(/a quotation of 26 words/);
  });

  it('rejects links to pages that do not exist, and links without https', () => {
    expect(broken((it) => (it.matters = `${it.matters} [x](/topics/no-such-subtopic/)`)).join('\n')).toMatch(/does not lead to a page/);
    expect(broken((it) => (it.matters = `${it.matters} [x](http://example.org/)`)).join('\n')).toMatch(/must use https/);
  });

  it('rejects concepts, terms, tools and command terms that do not exist, and unmarked HL subtopics', () => {
    const out = broken((it) => {
      it.concepts.subtopics.push({ code: '9.9', note: 'x', level: 'SL/HL' }, { code: '5.8', note: 'x', level: 'SL/HL' });
      it.concepts.terms.push('no-such-term');
      it.concepts.tools.push({ id: 'no-such-tool', note: 'x' });
      it.question.command = 'ponder';
    }).join('\n');
    expect(out).toMatch(/subtopic "9.9" is not in the IB course/);
    expect(out).toMatch(/subtopic 5.8 is HL only/);
    expect(out).toMatch(/glossary term "no-such-term" does not exist/);
    expect(out).toMatch(/toolkit tool "no-such-tool" does not exist/);
    expect(out).toMatch(/command term "ponder" is not in the command term register/);
  });

  it('requires exactly one lead story', () => {
    const none = Object.fromEntries(Object.entries(items).map(([id, it]) => [id, { ...it, lead: false }]));
    expect(messages(none).join('\n')).toMatch(/exactly one item must be the lead story; found 0/);
  });
});
