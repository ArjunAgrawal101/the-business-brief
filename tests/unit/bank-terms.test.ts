import { describe, expect, it } from 'vitest';
import { buildBank } from '../../src/lib/bank-build';
import { checkIntegrity, levelsTop, pointsTotal } from '../../src/lib/integrity';
import { asCorpus, loadCorpus } from './helpers/corpus';

const real = loadCorpus();
const corpus = asCorpus(real);
const bank = buildBank(corpus);
const subtopics = real.curricula['ib-dp-bm']?.units.flatMap((u) => u.subtopics) ?? [];
const RANK: Record<string, number> = { AO1: 1, AO2: 2, AO3: 3 };
/** The fifteen terms the bank had never used, and the questions written for them. */
const NEW_TERMS = ['list', 'state', 'demonstrate', 'suggest', 'compare', 'compare-and-contrast', 'contrast', 'examine', 'justify', 'annotate', 'complete', 'determine', 'draw', 'label', 'plot'];
const fresh = Object.entries(real.questions).filter(([id]) => id.startsWith('q-ct-'));
const termId = (name: string) => Object.keys(real.commandTerms).find((k) => real.commandTerms[k]?.term === name) ?? '';

/**
 * Whether a subtopic is taught to the depth a command term needs (guide, p. 42): a
 * term may be used at its own level or below, so an AO1 to AO3 term needs a
 * content statement at that level or above, and an AO4 term needs a statement
 * taught at AO4.
 */
function deepEnough(code: string, ao: string): boolean {
  const content = subtopics.find((s) => s.code === code)?.content ?? [];
  if (ao === 'AO4') return content.some((c) => c.ao.includes('AO4'));
  return content.some((c) => c.ao.some((a) => (RANK[a] ?? 0) >= (RANK[ao] ?? 9)));
}

describe('the question bank uses every command term', () => {
  it('has a question for every command term in the glossary, counted from the bank itself', () => {
    const used = new Map<string, number>();
    for (const it of bank.items) used.set(it.command, (used.get(it.command) ?? 0) + 1);
    const unused = Object.keys(real.commandTerms).filter((t) => !used.has(t));
    expect(unused).toEqual([]);
    expect([...used.values()].reduce((s, n) => s + n, 0)).toBe(bank.items.length);
  });

  it('has new questions for each of the fifteen terms never used before', () => {
    const terms = new Set(fresh.map(([, q]) => termId(q.commandTerm)));
    expect([...terms].sort()).toEqual([...NEW_TERMS].sort());
    expect(bank.problems).toEqual([]);
    expect(checkIntegrity(corpus).filter((p) => p.where.includes('q-ct-'))).toEqual([]);
  });

  it('sets each new question at its term’s AO, on a subtopic taught to that depth', () => {
    for (const [id, q] of fresh) {
      const term = real.commandTerms[termId(q.commandTerm)];
      expect(term, id).toBeDefined();
      expect(q.ao, id).toBe(term?.ao);
      for (const code of q.syllabus) expect(deepEnough(code, q.ao), `${id} on ${code} at ${q.ao}`).toBe(true);
    }
  });

  it('keeps HL content out of Paper 1 and gives every question a mark scheme that adds up', () => {
    for (const [id, q] of fresh) {
      const hlOnly = q.syllabus.every((code) => subtopics.find((s) => s.code === code)?.level === 'HL');
      if (hlOnly) expect(q.level, `${id} is on an HL-only subtopic`).toBe('HL');
      if (q.level === 'HL') expect(q.paperStyle, id).not.toBe('paper-1');
      const ms = q.markscheme;
      if (ms.kind === 'levels') expect(levelsTop(q), id).toBe(q.marks);
      else expect(pointsTotal(q), id).toBe(q.marks);
      if (q.requiresCalculation) expect(ms.answer, id).toBeTruthy();
      expect(q.errors.length, id).toBeGreaterThan(0);
      expect(q.stimulus ?? q.prompt, id).not.toMatch(/undefined|NaN|\[object Object\]|[–—]/);
    }
  });

  it('labels every invented organization in a new question as fictional', () => {
    for (const [id, q] of fresh) if (q.stimulus) expect(q.stimulus, id).toMatch(/fictional/);
  });

  it('leaves no subtopic with fewer questions than the thinnest had before the new ones', () => {
    // The new questions were written for the subtopics with fewest questions at the time. The notes have gained
    // questions since, so which subtopics are thinnest moves; what lasts is that none is left thinner than before.
    const others = bank.items.filter((i) => !i.id.startsWith('q-q-ct-'));
    const count = (code: string) => others.filter((i) => i.codes.includes(code)).length;
    const fewest = Math.min(...subtopics.map((s) => count(s.code)));
    for (const [id, q] of fresh) expect(subtopics.some((s) => s.code === q.syllabus[0]), id).toBe(true);
    for (const s of subtopics) expect(bank.items.filter((i) => i.codes.includes(s.code)).length, s.code).toBeGreaterThanOrEqual(fewest);
  });

  it('counts the same questions whichever way the bank is cut', () => {
    const byPaper = ['paper-1', 'paper-2', 'paper-3', 'ia-skill', 'general'].map((p) => bank.items.filter((i) => i.paper === p).length);
    expect(byPaper.reduce((s, n) => s + n, 0)).toBe(bank.items.length);
    const byUnitFirst = [1, 2, 3, 4, 5].map((u) => bank.items.filter((i) => i.units[0] === u).length);
    expect(byUnitFirst.reduce((s, n) => s + n, 0)).toBe(bank.items.length);
    const marks = bank.items.reduce((s, i) => s + i.marks, 0);
    expect(marks).toBe(bank.items.reduce((s, i) => s + (Number.isInteger(i.marks) && i.marks > 0 ? i.marks : Number.NaN), 0));
  });
});
