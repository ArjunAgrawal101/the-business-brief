/**
 * The glossary as a dictionary: who meets a term, what the index searches,
 * which terms are suggested next, and the integrity rules for the
 * dictionary fields and for terms beyond the IB course.
 */
import { describe, expect, it } from 'vitest';
import { glossarySchema, type GlossaryEntry } from '../../src/lib/schemas';
import { backlinks, isDeep, isEnrichment, qualificationsOf, searchText, suggestTerms } from '../../src/lib/glossary';
import { checkGlossaryDepth } from '../../src/lib/integrity-frameworks';
import { asCorpus, loadCorpus } from './helpers/corpus';

const entry = (over: Record<string, unknown>): GlossaryEntry =>
  glossarySchema.parse({ term: 'Term', definition: 'A definition.', subtopics: ['3.3'], provenance: 'subject-knowledge', ...over });

describe('qualifications and scope', () => {
  it('reads an IB term with no qualifications as an IB term', () => {
    expect(qualificationsOf(entry({}))).toEqual(['ib']);
  });

  it('keeps the qualifications an entry lists', () => {
    expect(qualificationsOf(entry({ qualifications: ['ib', 'undergraduate'] }))).toEqual(['ib', 'undergraduate']);
  });

  it('never makes an enrichment term an IB term', () => {
    const g = entry({ subtopics: [], provenance: 'enrichment' });
    expect(isEnrichment(g)).toBe(true);
    expect(qualificationsOf(g)).toEqual([]);
  });

  it('knows a full dictionary entry', () => {
    expect(isDeep(entry({}))).toBe(false);
    expect(isDeep(entry({ simple: 'Plain.', technical: 'Precise.', misconceptions: [{ claim: 'A', correction: 'B' }] }))).toBe(true);
  });

  it('searches names, aliases, the definition and the plain explanation, without markup', () => {
    const t = searchText(entry({ term: 'Gearing ratio', aliases: ['Gearing'], definition: 'The share of **capital employed** from loans.', simple: 'How much is borrowed.' }));
    expect(t).toContain('gearing ratio');
    expect(t).toContain('capital employed');
    expect(t).toContain('how much is borrowed');
    expect(t).not.toContain('*');
  });
});

describe('suggested terms', () => {
  const g: Record<string, GlossaryEntry> = {
    a: entry({ term: 'Break-even quantity', related: ['b'], frameworks: ['break-even-chart'], subtopics: ['5.5'] }),
    b: entry({ term: 'Contribution per unit', related: ['c'], subtopics: ['5.5'] }),
    c: entry({ term: 'Variable cost', subtopics: ['3.3'] }),
    d: entry({ term: 'Break-even revenue', subtopics: ['5.5'], frameworks: ['break-even-chart'] }),
    e: entry({ term: 'Margin of safety', related: ['a'], subtopics: ['5.5'] }),
    f: entry({ term: 'Brand', subtopics: ['4.5'] }),
  };

  it('finds the terms that point back', () => {
    expect(backlinks('a', g)).toEqual(['e']);
  });

  it('leaves out the term itself, its related terms and the terms that point back', () => {
    const ids = suggestTerms('a', g).map((x) => x.id);
    expect(ids).not.toContain('a');
    expect(ids).not.toContain('b');
    expect(ids).not.toContain('e');
  });

  it('ranks a shared framework and a related name above a link two steps away', () => {
    // d: framework 3 + subtopic 1.5 + name 2 + category and scope; c: via b 2 + scope.
    const s = suggestTerms('a', g);
    expect(s.map((x) => x.id)).toEqual(['d', 'c']);
    expect(s[0]!.score).toBeGreaterThan(s[1]!.score);
    expect(s[1]!.reason).toBe('linked through Contribution per unit');
  });

  it('suggests nothing that shares nothing', () => {
    expect(suggestTerms('f', g)).toEqual([]);
  });
});

describe('dictionary fields in the corpus', () => {
  const c = loadCorpus();

  it('pass the dictionary checks', () => {
    expect(checkGlossaryDepth(asCorpus(c)).map((p) => `${p.where}: ${p.message}`)).toEqual([]);
  });

  it('mark every term beyond the IB course as enrichment, with no subtopic and no IB qualification', () => {
    for (const [id, e] of Object.entries(c.glossary).filter(([, e]) => e.provenance === 'enrichment')) {
      expect(e.subtopics, id).toEqual([]);
      expect(e.qualifications.includes('ib'), id).toBe(false);
      expect(e.qualifications.length, id).toBeGreaterThan(0);
    }
  });

  it('reject an enrichment term that claims the IB course or is incomplete', () => {
    const bad = asCorpus({ ...c, glossary: { x: entry({ provenance: 'enrichment', qualifications: ['ib'] }) } });
    const msgs = checkGlossaryDepth(bad).map((p) => p.message);
    expect(msgs).toContain('an enrichment term is beyond the IB course, so it names no IB subtopic');
    expect(msgs).toContain('an enrichment term cannot carry the "ib" qualification');
    expect(msgs).toContain('an enrichment term needs a plain-language explanation (simple)');
    expect(msgs).toContain('an enrichment term needs at least two related terms');
  });

  it('reject an IB term whose qualifications leave out the IB', () => {
    const bad = asCorpus({ ...c, glossary: { x: entry({ qualifications: ['mba'] }) } });
    expect(checkGlossaryDepth(bad).map((p) => p.message)).toEqual(['a term in the IB course must include the "ib" qualification when it lists qualifications']);
  });
});
