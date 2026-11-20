/**
 * The Assessment Centre's statements about the IB assessment: the facts the
 * accuracy audit corrected stay corrected, the data files agree with each
 * other, the internal assessment's requirements hold only the guide's musts,
 * and every examiner emphasis on the Centre's pages is attributed to the
 * assessment guide that reports it.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCorpus } from './helpers/corpus';
import { EVERY_PAPER, claimFacts } from '../../src/lib/guides';
import { LABEL_MEANING, LABEL_TEXT } from '../../src/lib/guide-labels';

const c = loadCorpus();
const PAGES = new URL('../../src/pages/assessment/', import.meta.url).pathname;

describe('the corrected facts', () => {
  it('gives Paper 1’s scope as the guide does: no HL extension material and no topics studied at HL only (p. 43)', () => {
    const p1 = c.assessment['paper-1'];
    expect(p1?.facts.some((f) => f.text.includes('topics studied at HL only') && f.location?.includes('43'))).toBe(true);
    expect(c.claims['paper1-structure']?.statement).toContain('topics studied at HL only');
    // The statement is released in advance, not the case.
    expect(p1?.facts.some((f) => f.text.includes('The statement is all that is released'))).toBe(true);
  });

  it('states Paper 3 question 2’s objectives the same way in the data and the claims register, citing both pages', () => {
    const q2 = c.assessment['paper-3']?.sections.find((s) => s.name === 'Question 2');
    expect(q2?.aos).toEqual(['AO1', 'AO2']);
    const fact = c.assessment['paper-3']?.facts.find((f) => f.text.includes('three compulsory questions'));
    expect(fact?.text).toContain('6 marks, AO1 and AO2');
    expect(fact?.location).toBe('Guide, pp. 42 and 47');
    const claim = c.claims['paper3-structure'];
    expect(claim?.statement).toContain('6 marks, AO1 and AO2');
    expect(claim?.note).toContain('p. 47');
    expect(claim?.note).toContain('p. 42');
  });

  it('lists every word-count exclusion the guide gives (p. 56)', () => {
    const s = c.claims['ia-word-count']?.statement ?? '';
    for (const x of ['acknowledgments', 'contents page', 'tables of statistical data', 'diagrams or figures', 'equations, formulae and calculations', 'supporting documents', 'citations', 'references', 'bibliography'])
      expect(s, x).toContain(x);
  });

  it('applies the calculator rule, the formulae copy and reading time to every paper', () => {
    for (const id of EVERY_PAPER) {
      const k = c.claims[id];
      expect(k, id).toBeDefined();
      for (const page of ['/assessment/paper-1/', '/assessment/paper-2/', '/assessment/paper-3/']) expect(k?.usedIn, `${id} on ${page}`).toContain(page);
    }
    expect(c.assessment['paper-2']?.facts.some((f) => /calculator/i.test(f.text))).toBe(false);
    const facts = claimFacts(c.claims, EVERY_PAPER);
    expect(facts.map((f) => f.location)).toEqual(['Guide, p. 41', 'Guide, p. 43', 'Guide, pp. 64 to 66']);
    expect(c.claims['access-arrangements']?.location).toBe('p. 38');
    expect(c.claims['grade-descriptors']?.location).toBe('pp. 37 and 41');
  });
});

describe('the internal assessment’s requirements', () => {
  const ia = c.assessment['internal-assessment'];

  it('hold only the guide’s musts, each with its page', () => {
    expect(ia?.requirements.length).toBeGreaterThan(10);
    for (const r of ia?.requirements ?? []) {
      expect(r, r).toMatch(/\(pp?\. [^)]+\)\.$/);
      expect(r, r).not.toMatch(/recommend|should|good practice|\(what should|\(why did/i);
    }
    expect(ia?.requirements.some((r) => r.includes('translate'))).toBe(true);
    expect(ia?.requirements.some((r) => r.includes('essential points'))).toBe(true);
    expect(ia?.requirements.some((r) => r.includes('individual research'))).toBe(true);
  });

  it('keep the guide’s shoulds and recommendations apart, each with its page', () => {
    expect(ia?.recommendations.length).toBeGreaterThan(5);
    for (const r of ia?.recommendations ?? []) expect(r, r).toMatch(/\(pp?\. [^)]+\)\.$/);
    expect(ia?.recommendations.some((r) => r.includes('five A4 pages'))).toBe(true);
    expect(ia?.recommendations.some((r) => r.includes('Supporting document 1'))).toBe(true);
  });
});

describe('the labels', () => {
  it('name five standings, the teacher support material among them', () => {
    expect(Object.values(LABEL_TEXT)).toEqual(['IB requirement', 'Examiner emphasis', 'Recommended strategy', 'Illustrative example', 'IB teacher support material']);
    expect(LABEL_MEANING.examiner).toContain('attributed to the guide');
    expect(LABEL_MEANING.ib).toContain('decides every requirement');
  });

  it('attribute every examiner emphasis on the Centre’s pages to the assessment guide that reports it', () => {
    const files = [
      ...['paper-1.astro', 'paper-2.astro', 'paper-3.astro', 'internal-assessment.astro'].map((f) => join(PAGES, f)),
      ...readdirSync(join(PAGES, 'internal-assessment')).map((f) => join(PAGES, 'internal-assessment', f)),
    ];
    let seen = 0;
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/<GuideLabel kind="examiner" \/>/g)) {
        seen += 1;
        const block = src.slice(m.index, (m.index ?? 0) + 700);
        expect(block, `${file} at ${m.index}`).toMatch(/\{G\}|assessment guide|IA research guide|CREATOR_GUIDE/);
      }
    }
    expect(seen).toBeGreaterThan(30);
  });

  it('never put the teacher support material or examiner instructions under the IB requirement label', () => {
    for (const f of ['paper-1.astro', 'paper-2.astro', 'paper-3.astro']) {
      const src = readFileSync(join(PAGES, f), 'utf8');
      expect(src, f).not.toMatch(/<GuideLabel kind="ib" \/><\/p>\s*<IbGuidance/);
      expect(src, f).not.toContain('<span class="label">Examiner instructions (2026)</span>');
      expect(src, f).not.toMatch(/label: 'examiner'/);
    }
  });
});
