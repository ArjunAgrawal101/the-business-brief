import { describe, expect, it } from 'vitest';
import { calcFamilies, evidenceOf, exercisesOf, p2Codes, plannerContext, practiceQuestions, progressSubtopics, retrievalSets } from '../../src/lib/progress-build';
import { buildBank, subtopicsOf } from '../../src/lib/bank-build';
import { KIND_IDS } from '../../src/lib/p2-practice';
import { CODE_RE } from '../../src/lib/learner';
import { buildPlan } from '../../src/lib/planner';
import { asCorpus, loadCorpus } from './helpers/corpus';

const c = asCorpus(loadCorpus());
const subs = subtopicsOf(c);
const codes = new Set(subs.map((s) => s.code));

describe('what the dashboard and the planner are told about the course', () => {
  it('every subtopic, in syllabus order, with its page and its mindmap', () => {
    const list = progressSubtopics(c);
    expect(list.map((s) => s.code)).toEqual(subs.map((s) => s.code));
    for (const s of list) {
      expect(CODE_RE.test(s.code), s.code).toBe(true);
      expect(s.url).toMatch(/^\/topics\/[a-z0-9-]+\/$/);
      if (s.mindmap) expect(Object.keys(c.mindmaps).map((id) => `/mindmaps/${id}/`)).toContain(s.mindmap);
    }
    // Every subtopic has a map (the integrity check requires one each).
    expect(list.every((s) => s.mindmap)).toBe(true);
  });

  it('places every question, exercise and set of recall cards under subtopics that exist', () => {
    const ev = evidenceOf(c);
    expect(ev.bank.length).toBe(buildBank(c).items.length);
    expect(new Set(ev.bank.map(([id]) => id)).size).toBe(ev.bank.length);
    for (const [, cs] of ev.bank) for (const code of cs) expect(codes.has(code), code).toBe(true);
    expect(ev.questions.length).toBe(Object.keys(c.questions).length);
    expect(practiceQuestions(c).every((q) => q.points.reduce((a, b) => a + b, 0) <= q.marks || q.kind !== 'points')).toBe(true);
    for (const x of [...exercisesOf(c), ...retrievalSets(c)]) for (const code of x.codes) expect(codes.has(code), code).toBe(true);
    expect(retrievalSets(c).length).toBe(Object.keys(c.notes).length + 2 * Object.keys(c.topics).length);
  });

  it('names a subtopic for every kind of Paper 2 calculation, and families at the right level', () => {
    const map = p2Codes();
    expect(Object.keys(map).sort()).toEqual([...KIND_IDS].sort());
    for (const code of Object.values(map)) expect(codes.has(code), code).toBe(true);
    const fams = calcFamilies();
    expect(fams.filter((f) => f.hl).map((f) => f.id)).toEqual(['efficiency']);
    for (const f of fams) expect(codes.has(f.code)).toBe(true);
  });

  it('gives the planner each paper’s time from the guide’s outlines, and a plan can be made from it', () => {
    const ctx = plannerContext(c);
    expect(ctx.papers).toEqual({ 'paper-1': 90, 'paper-2-sl': 90, 'paper-2-hl': 105, 'paper-3': 75 });
    expect(ctx.topics).toHaveLength(subs.length);
    const hlOnly = ctx.topics.filter((t) => t.level === 'HL').length;
    const r = buildPlan({ start: '2026-11-23', exam: '2027-05-04', level: 'SL', hours: 6, days: [1, 2, 3, 4, 5], topics: ctx.topics.map((t) => t.code), weak: [], studied: [] }, ctx);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.input.topics).toHaveLength(subs.length - hlOnly);
      expect(r.plan.notFitted).toEqual([]);
    }
  });
});
