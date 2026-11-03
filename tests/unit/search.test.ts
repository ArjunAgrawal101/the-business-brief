import { describe, expect, it } from 'vitest';
import { EMPTY_STATE, countWords, highlight, matches, normalize, parseState, passes, queryWords, rank, stateQuery, wordForms } from '../../src/lib/search';
import { buildSearchIndex, clip, navKind, type SearchLinks } from '../../src/lib/search-index';
import { NAV } from '../../src/lib/navigation';
import { asCorpus, loadCorpus } from './helpers/corpus';

const hay = (s: string) => ` ${normalize(s)}`;

describe('matching a query', () => {
  it('normalizes case, accents and punctuation', () => {
    expect(normalize('Break-even (BEQ)')).toBe('break even beq');
    expect(normalize('  Café   Résumé ')).toBe('cafe resume');
    expect(queryWords('Break-even break   EVEN')).toEqual(['break', 'even']);
    expect(queryWords('a b c d e f g h i j')).toHaveLength(8);
  });

  it('matches each word at the start of a word, so a fragment inside a word does not count', () => {
    expect(matches(hay('Gearing ratio'), ['ratio'])).toBe(true);
    expect(matches(hay('Operations management'), ['ratio'])).toBe(false);
    expect(matches(hay('Costs and revenues'), ['even'])).toBe(false);
    expect(matches(hay('Break-even analysis'), queryWords('break even'))).toBe(true);
    expect(matches(hay('Break-even analysis'), queryWords('analysis break'))).toBe(true);
    expect(matches(hay('Break-even analysis'), queryWords('break profit'))).toBe(false);
  });

  it('lets a plural find its singular', () => {
    expect(wordForms('policies')).toEqual(['policies', 'policie', 'policy']);
    expect(matches(hay('Gearing ratio'), ['ratios'])).toBe(true);
    expect(matches(hay('Dividend policy'), ['policies'])).toBe(true);
    expect(matches(hay('Sole trader'), ['businesses'])).toBe(false);
    expect(matches(hay('Small business'), ['businesses'])).toBe(true);
  });

  it('ranks the whole title, then its start, then the phrase, then the words, then hidden keys, then the text', () => {
    const words = queryWords('break even');
    const r = (title: string, keys = '') => rank(normalize(title), normalize(keys), words);
    const order = [
      r('Break-even'),
      r('Break-even analysis'),
      r('The break-even chart'),
      r('Even a break'),
      r('Margin of safety', 'break even'),
      r('Margin of safety'),
    ];
    expect([...order].sort((a, b) => b - a)).toEqual(order);
    expect(r('Break-even quantity')).toBeGreaterThan(r('Break-even quantity from November'));
    expect(rank('anything', '', [])).toBe(0);
  });
});

describe('filters and the address', () => {
  const e = { kind: 'formulas' as const, units: ['3', '5'], hl: false };
  const hlOnly = { kind: 'definitions' as const, units: ['3'], hl: true };

  it('filters by kind, unit and level', () => {
    expect(passes(e, EMPTY_STATE)).toBe(true);
    expect(passes(e, { ...EMPTY_STATE, kind: 'notes' })).toBe(false);
    expect(passes(e, { ...EMPTY_STATE, kind: 'notes' }, true)).toBe(true);
    expect(passes(e, { ...EMPTY_STATE, unit: '5' })).toBe(true);
    expect(passes(e, { ...EMPTY_STATE, unit: '1' })).toBe(false);
    expect(passes(hlOnly, { ...EMPTY_STATE, level: 'sl' })).toBe(false);
    expect(passes(hlOnly, { ...EMPTY_STATE, level: 'hl' })).toBe(true);
    expect(passes(e, { ...EMPTY_STATE, level: 'hl' })).toBe(false);
  });

  it('reads the state from the address and ignores what it does not know', () => {
    expect(parseState('?q=gearing&kind=formulas&unit=3&level=hl')).toEqual({ q: 'gearing', kind: 'formulas', unit: '3', level: 'hl' });
    expect(parseState('?kind=spells&unit=9&level=expert')).toEqual(EMPTY_STATE);
    expect(parseState('')).toEqual(EMPTY_STATE);
  });

  it('writes the state back in a fixed order, without empty values', () => {
    expect(stateQuery({ q: ' break-even ', kind: 'formulas', unit: '', level: 'sl' })).toBe('?q=break-even&kind=formulas&level=sl');
    expect(stateQuery(EMPTY_STATE)).toBe('');
    const s = { q: 'cash flow', kind: 'tools' as const, unit: 'toolkit', level: '' as const };
    expect(parseState(stateQuery(s))).toEqual(s);
  });

  it('marks matched words at the start of words, and escapes the title', () => {
    expect(highlight('Break-even analysis', ['break', 'even'])).toBe('<mark>Break</mark>-<mark>even</mark> analysis');
    expect(highlight('Costs and revenues', ['even'])).toBe('Costs and revenues');
    expect(highlight('Ratios <b>', ['ratio'])).toBe('<mark>Ratio</mark>s &lt;b&gt;');
    expect(highlight('Gearing ratio', ['ratios'])).toBe('Gearing <mark>ratio</mark>');
    expect(highlight('Marketing mix', ['market', 'marketing'])).toBe('<mark>Marketing</mark> mix');
  });

  it('counts in words', () => {
    expect(countWords(1, 'formulas')).toBe('1 formula');
    expect(countWords(1200, '')).toBe('1,200 results');
    expect(countWords(1, '')).toBe('1 result');
  });
});

describe('the search index', () => {
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
    toolEntry: (id) => (c.tools[id]?.status === 'complete' ? `/toolkit/${id}/` : `/toolkit/#tool-${id}`),
    question: (id) => `/exam-desk/practice/#q-${id}`,
    glossary: (id) => `/glossary/${id}/`,
    mindmap: (id) => `/mindmaps/${id}/`,
    commandTerm: (t) => `/examiner-lens/#ct-${slug(t)}`,
    concept: (id) => `/ib/concepts/#${id}`,
    revision: (id) => `/revision/${id}/`,
    calculation: (id, page) => `${page}#calc-${id}`,
    pathway: (id) => `/pathways/${id}/`,
  };
  const modules = [
    { name: 'Test room', purpose: 'A room for the test.', href: '/test-room/', items: [{ kind: 'Workspace', title: 'A room tool', href: '/test-room/tool/', text: 'Does a thing.' }] },
  ];
  const entries = buildSearchIndex({ c: corpus, nav: NAV, links, modules, library: [], diagrams: { 'test-diagram': { title: 'A test diagram', syllabus: ['3.3'], level: 'SL/HL', group: 'unit-3' } } });

  it('lists every subtopic once, at its own page, with its unit and level', () => {
    const list = entries.filter((e) => e.kind === 'subtopics' && e.codes.length === 1);
    expect(list).toHaveLength(subs.length);
    for (const s of subs) {
      const e = list.find((x) => x.codes[0] === s.code);
      expect(e?.url).toBe(links.subtopic(s.code));
      expect(e?.units).toEqual([s.code.split('.')[0]]);
      expect(e?.hl).toBe(s.level === 'HL');
    }
  });

  it('includes every link in the navigation, so new rooms are found without being listed', () => {
    const urls = new Set(entries.map((e) => e.url));
    for (const g of NAV) for (const l of g.links) expect(urls.has(l.href), l.href).toBe(true);
    expect(entries.find((e) => e.url === '/test-room/tool/')?.kind).toBe('tools');
    expect(entries.find((e) => e.url === '/test-room/')?.type).toBe('Room');
  });

  it('finds every calculation by its name among the formulas, once each', () => {
    const formulas = entries.filter((e) => e.kind === 'formulas');
    for (const k of Object.values(c.calculations)) expect(formulas.some((f) => f.title === k.name), k.name).toBe(true);
    const names = formulas.map((f) => normalize(f.title));
    expect(new Set(names).size).toBe(names.length);
    expect(formulas.some((f) => f.type.includes('glossary'))).toBe(true);
  });

  it('holds every glossary term, every section of notes and every practice question', () => {
    expect(entries.filter((e) => e.type === 'Glossary term')).toHaveLength(Object.keys(c.glossary).length);
    const sections = Object.values(c.notes).reduce((n, x) => n + x.sections.length, 0);
    expect(entries.filter((e) => e.kind === 'notes' && e.type === 'Notes')).toHaveLength(sections);
    expect(entries.filter((e) => e.type.startsWith('Practice question'))).toHaveLength(Object.keys(c.questions).length);
    expect(entries.find((e) => e.title === 'A test diagram')).toMatchObject({ kind: 'resources', url: '/diagrams/#diagram-test-diagram', units: ['3'] });
  });

  it('gives every entry a page on this site, a title, known units and short text', () => {
    const seen = new Set<string>();
    for (const e of entries) {
      expect(e.url.startsWith('/') && !e.url.startsWith('//'), e.url).toBe(true);
      expect(e.title.trim().length, e.url).toBeGreaterThan(0);
      for (const u of e.units) expect(['1', '2', '3', '4', '5', 'toolkit']).toContain(u);
      expect(e.text.length).toBeLessThanOrEqual(170);
      const key = `${e.kind}|${e.url}|${e.title}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
  });

  it('sorts menu links into kinds by group and address', () => {
    expect(navKind('tools', '/finance-desk/')).toBe('tools');
    expect(navKind('explore', '/glossary/')).toBe('definitions');
    expect(navKind('explore', '/toolkit/')).toBe('frameworks');
    expect(navKind('explore', '/frameworks/')).toBe('frameworks');
    expect(navKind('practise', '/case-room/')).toBe('cases');
    expect(navKind('practise', '/exam-desk/practice/')).toBe('questions');
    expect(navKind('assess', '/assessment/question-bank/')).toBe('questions');
    expect(navKind('discover', '/resources/')).toBe('resources');
    expect(navKind('discover', '/about/')).toBe('pages');
  });

  it('cuts long text at a word, with an ellipsis', () => {
    expect(clip('short', 20)).toBe('short');
    const cut = clip('The break-even chart shows costs and revenue against output on one graph.', 40);
    expect(cut.length).toBeLessThanOrEqual(40);
    expect(cut.endsWith('…')).toBe(true);
    expect(cut).toBe('The break-even chart shows costs and…');
  });
});

describe('hidden keys', () => {
  it('keep only the words the visible text does not already hold', async () => {
    const { extraWords } = await import('../../src/lib/search');
    expect(extraWords('Gearing gearing ratio, capital employed', 'Gearing ratio: definition')).toBe('capital employed');
    expect(extraWords('', 'anything')).toBe('');
    expect(extraWords('Break-even BEQ', 'Break-even quantity')).toBe('beq');
  });
});
