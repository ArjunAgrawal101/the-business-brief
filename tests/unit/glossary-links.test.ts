/**
 * The glossary's links and search: every related term checked (and the
 * check catching each fault it exists for), every formula term linked to the
 * calculator, tool, worked calculation or formula sheet section where it is
 * worked, and the search that matches the starts of words and forgives a
 * slip in a term's name only when nothing matches exactly.
 */
import { describe, expect, it } from 'vitest';
import { loadCorpus } from './helpers/corpus';
import { loadToolPages } from './helpers/connections';
import { FORMULA_TARGETS, checkRelated, editDistance, findTerms, fold, formulaLink, isEnrichment, matchesQuery, slipsAllowed } from '../../src/lib/glossary';
import { LAB } from '../../src/lib/finance-lab/catalogue';
import type { GlossaryEntry } from '../../src/lib/schemas';

const c = loadCorpus();
const glossary = c.glossary as Record<string, GlossaryEntry>;
const ctx = { lab: LAB.map((e) => ({ id: e.id, name: e.name })), calculations: c.calculations };
const pages = loadToolPages(c);

describe('related terms', () => {
  it('all pass the check: every term has some, each exists, none twice or itself, and IB terms lead to IB terms', () => {
    expect(checkRelated(glossary)).toEqual([]);
    for (const [id, g] of Object.entries(glossary)) expect(g.related.length, id).toBeGreaterThan(0);
  });

  it('are checked for every fault', () => {
    const base = glossary['gearing-ratio']!;
    const beyondTerm = Object.entries(glossary).find(([, g]) => isEnrichment(g))![0];
    const bad: Record<string, GlossaryEntry> = {
      ...glossary,
      'gearing-ratio': { ...base, related: ['gearing-ratio', 'no-such-term', 'equity', 'equity'] },
      'current-ratio': { ...glossary['current-ratio']!, related: [] },
      'acid-test-ratio': { ...glossary['acid-test-ratio']!, related: [beyondTerm] },
    };
    const messages = checkRelated(bad).map((p) => `${p.where}: ${p.message}`);
    expect(messages).toContain('glossary/gearing-ratio: lists itself as related');
    expect(messages).toContain('glossary/gearing-ratio: related term "no-such-term" does not exist');
    expect(messages).toContain('glossary/gearing-ratio: lists "equity" twice');
    expect(messages).toContain('glossary/current-ratio: has no related terms');
    expect(messages).toContain('glossary/acid-test-ratio: is an IB term whose related terms are all beyond the course');
  });
});

describe('formula links', () => {
  it('name only real terms, real calculators, real worked calculations and real pages', () => {
    const toolkitGuides = new Set(Object.entries(c.tools).filter(([, t]) => t.status === 'complete').map(([id]) => `/toolkit/${id}/`));
    for (const [id, t] of Object.entries(FORMULA_TARGETS)) {
      expect(glossary[id], id).toBeDefined();
      if ('lab' in t) expect(LAB.some((e) => e.id === t.lab), id).toBe(true);
      if ('calc' in t) expect(c.calculations[t.calc], id).toBeDefined();
      if ('page' in t) expect(pages.has(t.page) || toolkitGuides.has(t.page), `${id}: ${t.page}`).toBe(true);
    }
  });

  it('link every IB term with a formula, except the few no calculator or formula sheet entry covers', () => {
    const unlinked = Object.entries(glossary)
      .filter(([id, g]) => g.formula && !isEnrichment(g) && !formulaLink(id, ctx))
      .map(([id]) => id)
      .sort();
    expect(unlinked).toEqual(['added-value', 'contribution-pricing', 'cost-plus-pricing', 'equity', 'expectancy-theory', 'net-assets', 'net-book-value']);
  });

  it('go to the calculator first, then a room’s tool, the worked calculation or the formula sheet', () => {
    expect(formulaLink('return-on-capital-employed', ctx)).toEqual({ href: '/finance-desk/lab/roce/', label: 'Work it out in the Financial Laboratory: Return on capital employed (ROCE)', beyond: false });
    expect(formulaLink('break-even-quantity', ctx)?.href).toBe('/finance-desk/lab/break-even-quantity/');
    expect(formulaLink('market-share', ctx)?.href).toBe('/market-studio/market-metrics/');
    expect(formulaLink('defect-rate', ctx)?.href).toBe('/operations-floor/capacity-and-productivity/');
    expect(formulaLink('labour-turnover', ctx)?.href).toBe('/topics/leadership-and-management/#calc-labour-turnover');
    expect(formulaLink('price-elasticity-of-demand', ctx)?.href).toBe('/resources/formula-sheet/#fs-learn');
    expect(formulaLink('standard-deviation', ctx)?.label).toBe('See it worked in the toolkit guide to descriptive statistics');
    expect(formulaLink('economic-order-quantity', ctx)?.beyond).toBe(true);
    expect(formulaLink('motivation', ctx)).toBeUndefined();
  });
});

describe('search', () => {
  const entry = (id: string) => ({ names: fold([glossary[id]!.term, ...glossary[id]!.aliases].join(' ')), text: fold(`${glossary[id]!.definition} ${glossary[id]!.simple ?? ''}`) });

  it('matches the start of a word, not the middle', () => {
    expect(matchesQuery('liquid', entry('liquidity'))).toBe(true);
    expect(matchesQuery('ratio', { names: 'operations', text: '' })).toBe(false);
    expect(matchesQuery('break even', entry('break-even-quantity'))).toBe(true);
    expect(matchesQuery('ratios', entry('current-ratio'))).toBe(true);
    expect(matchesQuery('', entry('current-ratio'))).toBe(true);
  });

  it('forgives a slip in a term’s name only when asked, and never in a word of three letters', () => {
    expect(matchesQuery('liqudity', entry('liquidity'))).toBe(false);
    expect(matchesQuery('liqudity', entry('liquidity'), true)).toBe(true);
    expect(matchesQuery('gearring', entry('gearing-ratio'), true)).toBe(true);
    expect(matchesQuery('motivaton', entry('motivation'), true)).toBe(true);
    expect(matchesQuery('ROCE', entry('return-on-capital-employed'))).toBe(true);
    expect(slipsAllowed('cot')).toBe(0);
    expect(slipsAllowed('cost')).toBe(1);
    expect(slipsAllowed('liquidity')).toBe(2);
  });

  it('uses slips as a fallback: an exact match keeps the results precise', () => {
    const items = Object.keys(glossary);
    const exact = findTerms('cost', items, entry);
    expect(exact.slipped).toBe(false);
    expect(exact.found).not.toContain('customer-lifetime-value');
    const slipped = findTerms('liqudity', items, entry);
    expect(slipped.slipped).toBe(true);
    expect(slipped.found).toContain('liquidity');
    expect(findTerms('qqqqzzzz', items, entry)).toEqual({ found: [], slipped: false });
  });

  it('measures edit distance with a swap of neighbours as one edit', () => {
    expect(editDistance('gearing', 'gearing')).toBe(0);
    expect(editDistance('geraing', 'gearing')).toBe(1);
    expect(editDistance('liqudity', 'liquidity')).toBe(1);
    expect(editDistance('stock', 'stack')).toBe(1);
    expect(editDistance('abc', 'abcdef', 2)).toBe(3);
  });

  it('folds case, accents and punctuation', () => {
    expect(fold('Break-even (BEQ) café')).toBe('break even beq cafe');
  });
});
