import { describe, expect, it } from 'vitest';
import { compactEntry, editsFor, prepare, suggest, withinEdits, type CompactIndex } from '../../src/lib/suggest';
import { buildSearchIndex, type SearchLinks } from '../../src/lib/search-index';
import { NAV } from '../../src/lib/navigation';
import { asCorpus, loadCorpus } from './helpers/corpus';

describe('edit distance', () => {
  it('counts insertions, deletions, substitutions and swapped neighbours', () => {
    expect(withinEdits('liquidity', 'liqudity', 1)).toBe(true);
    expect(withinEdits('gearing', 'gaering', 1)).toBe(true);
    expect(withinEdits('gearing', 'gearings', 1)).toBe(true);
    expect(withinEdits('gearing', 'bearing', 1)).toBe(true);
    expect(withinEdits('gearing', 'gear', 1)).toBe(false);
    expect(withinEdits('motivation', 'motvaton', 2)).toBe(true);
    expect(withinEdits('motivation', 'mtvaton', 2)).toBe(false);
  });

  it('allows no slip in a short word, one up to seven letters and two from eight', () => {
    expect(editsFor('roce')).toBe(0);
    expect(editsFor('ratio')).toBe(1);
    expect(editsFor('liquidity')).toBe(2);
  });
});

describe('header suggestions', () => {
  const c = loadCorpus();
  const corpus = asCorpus(c);
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  const subs = (c.curricula['ib-dp-bm']?.units ?? []).flatMap((u) => u.subtopics);
  const links: SearchLinks = {
    subtopic: (code) => `/topics/${slug(subs.find((s) => s.code === code)?.title ?? code)}/`,
    topic: (id) => `/topics/${id}/`,
    case: (id) => `/cases/${id}/`,
    decision: (id) => `/decision-room/${id}/`,
    toolEntry: (id) => `/toolkit/${id}/`,
    question: (id) => `/assessment/question-bank/#q-${id}`,
    glossary: (id) => `/glossary/${id}/`,
    mindmap: (id) => `/mindmaps/${id}/`,
    commandTerm: (t) => `/examiner-lens/#ct-${slug(t)}`,
    concept: (id) => `/ib/concepts/#${id}`,
    revision: (id) => `/revision/${id}/`,
    calculation: (id, page) => `${page}#calc-${id}`,
    pathway: (id) => `/pathways/${id}/`,
  };
  const entries = buildSearchIndex({ c: corpus, nav: NAV, links });
  const raw: CompactIndex = JSON.parse(JSON.stringify({ v: 1, e: entries.map(compactEntry) }));
  const index = prepare(raw);

  it('keeps every entry through the compact form', () => {
    expect(index).toHaveLength(entries.length);
    expect(index.every((e) => e.url.startsWith('/'))).toBe(true);
  });

  it('puts the glossary term first for a one-word term, ahead of notes and questions', () => {
    const top = suggest(index, 'liquidity', 8);
    expect(top.length).toBeGreaterThan(0);
    expect(['definitions', 'subtopics', 'formulas']).toContain(top[0]!.kind);
    expect(top.slice(0, 3).some((s) => /liquidity/i.test(s.title))).toBe(true);
  });

  it('still finds a term typed with a slip', () => {
    const top = suggest(index, 'liqudity', 8);
    expect(top.some((s) => /liquidity/i.test(s.title))).toBe(true);
    expect(top.find((s) => /liquidity/i.test(s.title))?.fuzzy).toBe(true);
  });

  it('finds a subtopic by its name and ranks it first', () => {
    const top = suggest(index, 'break-even analysis', 5);
    expect(top[0]?.kind).toBe('subtopics');
  });

  it('finds the business strategy simulation and the Paper 2 pages from the menu', () => {
    expect(suggest(index, 'strategy simulation', 8).some((s) => s.url === '/boardroom/executive/')).toBe(true);
    const p2 = suggest(index, 'paper 2 practice', 8).map((s) => s.url);
    expect(p2).toContain('/assessment/paper-2/practice/');
  });

  it('returns each address once, at most n, and nothing for an empty query', () => {
    const top = suggest(index, 'ratio', 6);
    expect(top.length).toBeLessThanOrEqual(6);
    expect(new Set(top.map((s) => s.url)).size).toBe(top.length);
    expect(suggest(index, '   ', 6)).toEqual([]);
  });

  it('drops malformed entries instead of failing', () => {
    expect(prepare({ v: 1, e: [['A', 'http://x.example/', 'Page', 0, '', 0, ''], ['B', '/b/', 'Page', 99, '', 0, ''], 'junk', ['C', '/c/', 'Page', 0, '1.1', 1, 'more words']] })).toHaveLength(1);
    expect(prepare(null)).toEqual([]);
  });
});
