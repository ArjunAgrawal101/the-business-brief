import { describe, expect, it } from 'vitest';
import { ILLUSTRATIVE_CASE, P1_CASES, caseById, fullCase, paperMarks } from '../../src/lib/p1-cases';
import { splitCase, wordCount, type Evidence } from '../../src/lib/p1-workspace';
import {
  MAX_ITEMS,
  READING_SECONDS,
  SECTION_A_SECONDS,
  WRITING_SECONDS,
  addItem,
  answerChecks,
  answersText,
  bandRange,
  compareStakeholders,
  emptyWork,
  fmtRange,
  paperTotal,
  parseWork,
  questionMark,
  toolNotes,
} from '../../src/lib/p1-practice';
import { loadCorpus } from './helpers/corpus';

const corpus = loadCorpus();
const subtopics = corpus.curricula['ib-dp-bm']?.units.flatMap((u) => u.subtopics) ?? [];
const AO_RANK: Record<string, number> = { AO1: 1, AO2: 2, AO3: 3 };

describe('the practice cases follow the guide’s format for Paper 1', () => {
  it('has at least two new cases, in different industries and countries, all fictional', () => {
    expect(P1_CASES.length).toBeGreaterThanOrEqual(2);
    expect(new Set(P1_CASES.map((c) => c.industry)).size).toBe(P1_CASES.length);
    expect(new Set(P1_CASES.map((c) => c.country)).size).toBe(P1_CASES.length);
    for (const c of P1_CASES) {
      expect(c.fictional).toBe(true);
      expect(caseById(c.id)).toBe(c);
    }
  });

  it('releases about the first 200 words, and the full case runs to 800 to 1,000 words (guide, p. 41)', () => {
    for (const c of P1_CASES) {
      const opening = wordCount(c.opening);
      const full = wordCount(fullCase(c));
      expect(opening, c.id).toBeGreaterThanOrEqual(180);
      expect(opening, c.id).toBeLessThanOrEqual(220);
      expect(full, c.id).toBeGreaterThanOrEqual(800);
      expect(full, c.id).toBeLessThanOrEqual(1000);
      // The opening is the start of the case itself: its paragraphs are the case's first paragraphs.
      const o = splitCase(c.opening).map((p) => p.text);
      expect(splitCase(fullCase(c)).slice(0, o.length).map((p) => p.text), c.id).toEqual(o);
      for (const p of splitCase(fullCase(c))) expect(p.sentences.map((s) => p.text.slice(s.start, s.end)).join(' '), c.id).toBe(p.text);
    }
  });

  it('sets a paper in the guide’s structure: Section A for 20 marks, and one of two Section B questions for 10 (guide, p. 43)', () => {
    for (const c of P1_CASES) {
      expect(paperMarks(c), c.id).toEqual({ a: 20, b: 10 });
      const B = c.questions.filter((q) => q.section === 'B');
      expect(B, c.id).toHaveLength(2);
      for (const q of B) expect(q.marks, `${c.id} ${q.id}`).toBe(10);
      expect(new Set(c.questions.map((q) => q.id)).size).toBe(c.questions.length);
    }
  });

  it('uses command terms from the register at the right objectives: AO1, AO2 and AO4 in Section A, AO3 in Section B', () => {
    const used = new Set<string>();
    for (const c of P1_CASES) {
      for (const q of c.questions) {
        const term = corpus.commandTerms[q.command];
        expect(term, `${c.id} ${q.id}: ${q.command}`).toBeDefined();
        used.add(q.command);
        if (q.section === 'A') expect(['AO1', 'AO2', 'AO4'], `${c.id} ${q.id}`).toContain(term?.ao);
        else expect(term?.ao, `${c.id} ${q.id}`).toBe('AO3');
      }
    }
    // Across the paper's structure: knowledge, application, skills and evaluation terms.
    expect(used.size).toBeGreaterThanOrEqual(10);
  });

  it('asks only about SL/HL content, at or below each subtopic’s depth of teaching (guide, pp. 42 to 43)', () => {
    for (const c of P1_CASES) {
      for (const q of c.questions) {
        const ao = corpus.commandTerms[q.command]?.ao ?? '';
        for (const code of q.codes) {
          const s = subtopics.find((x) => x.code === code);
          expect(s, `${c.id} ${q.id} ${code}`).toBeDefined();
          expect(s?.level, `${c.id} ${q.id} ${code}`).not.toBe('HL');
          const depth = new Set((s?.content ?? []).filter((st) => st.level !== 'HL').flatMap((st) => st.ao));
          if (ao === 'AO4') expect(depth.has('AO4'), `${c.id} ${q.id}: ${code} has no AO4 statement`).toBe(true);
          else expect(Math.max(...[...depth].map((a) => AO_RANK[a] ?? 0)), `${c.id} ${q.id}: ${code} is not taught to ${ao}`).toBeGreaterThanOrEqual(AO_RANK[ao] ?? 9);
        }
      }
    }
  });

  it('gives each question guidance that adds up to its marks, evidence that exists, and a plan to build the answer in', () => {
    for (const c of P1_CASES) {
      const n = splitCase(fullCase(c)).length;
      for (const q of c.questions) {
        const where = `${c.id} ${q.id}`;
        if (q.scheme.kind === 'points') expect(q.scheme.points.reduce((s, p) => s + p.marks, 0), where).toBe(q.marks);
        else {
          expect(bandRange(q.scheme.levels[q.scheme.levels.length - 1]?.marks ?? '0')[1], where).toBe(q.marks);
          expect(q.scheme.note, where).toContain('not the IB’s markbands');
          expect(q.scheme.indicative.length, where).toBeGreaterThanOrEqual(3);
        }
        for (const p of q.look) expect(p >= 1 && p <= n, `${where} paragraph ${p}`).toBe(true);
        expect(q.plan.length, where).toBeGreaterThan(0);
        expect(new Set(q.plan.map((s) => s.id)).size, where).toBe(q.plan.length);
        expect(q.errors.length, where).toBeGreaterThan(0);
      }
      for (const s of c.stakeholders) expect(s.para >= 1 && s.para <= n, `${c.id} ${s.name}`).toBe(true);
    }
  });

  it('marks every HL-only tool as no fit for Paper 1, and links every tool to a page that exists', () => {
    for (const c of P1_CASES) {
      for (const t of c.tools) {
        if (t.level === 'HL') expect(t.fit, `${c.id} ${t.id}`).toBe('weak');
        const toolkit = /^\/toolkit\/([a-z-]+)\/$/.exec(t.href)?.[1];
        if (toolkit) expect(corpus.tools[toolkit]?.status, `${c.id} ${t.href}`).toBe('complete');
        else expect(t.href, `${c.id} ${t.id}`).toMatch(/^\/topics\/[a-z-]+\/$/);
      }
      expect(c.tools.some((t) => t.fit === 'strong'), c.id).toBe(true);
    }
  });

  it('keeps the arithmetic in the cases right', () => {
    const v = fullCase(P1_CASES[0]!);
    // Gross profit margin: (15.6 − 9.4) ÷ 15.6 × 100 = 39.74%.
    expect(v).toContain('GH₵15.6 million');
    expect(v).toContain('GH₵9.4 million');
    expect(Math.round(((15.6 - 9.4) / 15.6) * 10000) / 100).toBe(39.74);
    const cair = fullCase(caseById('cairnside')!);
    // Break-even: 46,800 ÷ 60 = 780 members.
    expect(cair).toContain('CA$46,800 a month');
    expect(46800 / 60).toBe(780);
    expect(caseById('cairnside')?.questions.find((q) => q.id === 'q2a')?.scheme).toMatchObject({ answer: '46,800 ÷ 60 = 780 members a month' });
  });

  it('writes no dashes, and leaves the illustrative case unchanged', () => {
    for (const c of P1_CASES) expect(JSON.stringify(c), c.id).not.toMatch(/[\u2013\u2014]|undefined|NaN/);
    expect(ILLUSTRATIVE_CASE.title).toBe('Juniper Juice: the supermarket offer');
  });
});

describe('working on a practice case', () => {
  const c = P1_CASES[0]!;
  const ev = (id: string, tag: Evidence['tag'] = 'data'): Evidence => ({ id, tag, text: 'GH₵15.6 million', para: 3, start: 0, end: 15, note: '' });

  it('times the paper at the guide’s durations, with a suggested 60% for Section A', () => {
    expect(READING_SECONDS).toBe(300);
    expect(WRITING_SECONDS).toBe(5400);
    expect(SECTION_A_SECONDS).toBe(3240);
  });

  it('reads saved work defensively, keeping only what belongs to this case', () => {
    expect(parseWork(null, c)).toEqual(emptyWork());
    expect(parseWork('{oops', c)).toEqual(emptyWork());
    const w = parseWork(
      {
        notes: ['a', 7, 'c', 'extra'],
        items: [ev('e1'), { id: 'bad', tag: 'nonsense', text: 'x', para: 0, start: 0, end: 1 }, { ...ev('e2'), end: 0 }],
        stakeholders: [{ name: 'Kojo', interest: 'growth', power: 'Huge', stance: 'For' }],
        tools: ['ansoff-matrix', 'not-a-tool'],
        revealed: true,
        choice: 'q1a',
        answers: { q1a: { slots: { d1: 'Owned by shareholders', zz: 'x' }, items: ['e1', 'gone'] }, q99: { slots: {} } },
        marks: { q1a: { points: [0, 0, 5, -1], level: '3-4' }, q4: { level: '7-8' }, q5: { level: '11-12' } },
        attempts: [{ at: '2026-11-20T10:00:00Z', reading: 300, used: 5000, allowed: 5400 }, { nope: true }],
      },
      c,
    );
    expect(w.notes).toEqual(['a', '', 'c']);
    expect(w.items.map((e) => e.id)).toEqual(['e1']);
    expect(w.stakeholders).toEqual([{ name: 'Kojo', interest: 'growth', power: '', stance: 'For' }]);
    expect(w.tools).toEqual(['ansoff-matrix']);
    expect(w.revealed).toBe(true);
    expect(w.choice).toBeNull();
    expect(w.answers).toEqual({ q1a: { slots: { d1: 'Owned by shareholders', d2: '' }, items: ['e1'] } });
    expect(w.marks.q1a).toEqual({ points: [0], level: null });
    expect(w.marks.q4).toEqual({ points: [], level: '7-8' });
    expect(w.marks.q5).toEqual({ points: [], level: null });
    expect(w.attempts).toHaveLength(1);
  });

  it('adds up a self-mark: points capped at the marks, a level as a range, and Section B only for the question chosen', () => {
    let w = emptyWork();
    w = { ...w, marks: { q1a: { points: [0, 1], level: null }, q1b: { points: [1], level: null }, q4: { points: [], level: '7-8' }, q5: { points: [], level: '9-10' } } };
    let t = paperTotal(c, w);
    expect(t.a).toEqual([3, 3]);
    expect(t.aToMark).toBe(4);
    expect(t.b).toBeNull();
    expect(t.max).toBe(30);
    w = { ...w, choice: 'q4' };
    t = paperTotal(c, w);
    expect(t.b).toEqual([7, 8]);
    expect(t.total).toEqual([10, 11]);
    expect(fmtRange(t.total)).toBe('10 to 11');
    expect(questionMark(c.questions[0]!, undefined)).toBeNull();
  });

  it('says what an answer’s structure still needs, without marking it', () => {
    const calc = c.questions.find((q) => q.id === 'q1b')!;
    expect(answerChecks(calc, undefined, [])[0]?.text).toContain('Nothing written yet');
    const noUnit = answerChecks(calc, { slots: { f: 'gross profit / sales revenue x 100', s: '6.2 / 15.6 x 100', a: '39.74' }, items: [] }, []);
    expect(noUnit.map((k) => k.text).join(' ')).toContain('unit');
    const ok = answerChecks(calc, { slots: { f: 'GPM = gross profit ÷ sales revenue × 100', s: '6.2 ÷ 15.6 × 100', a: '39.74%' }, items: [] }, []);
    expect(ok).toEqual([expect.objectContaining({ status: 'ok' })]);
    const define = c.questions.find((q) => q.id === 'q1a')!;
    expect(answerChecks(define, { slots: { d1: 'Volta Ridge is one', d2: 'owned by Efua' }, items: [] }, [], c.organization).map((k) => k.text).join(' ')).toContain('mentions the case');
    const explain = c.questions.find((q) => q.id === 'q2b')!;
    expect(answerChecks(explain, { slots: { p1: 'Economies of scale lower average cost', p2: 'Secure revenue for five years' }, items: ['e1'] }, [ev('e1')]).map((k) => k.standing)).toContain('ib');
    const ext = c.questions.find((q) => q.id === 'q4')!;
    const thin = answerChecks(ext, { slots: { frame: 'VRC must decide', for: 'More bars spread fixed costs', against: '', weigh: 'Scale matters more', limit: '', judge: 'Accept the contract' }, items: [] }, []);
    const text = thin.map((k) => k.text).join(' ');
    expect(text).toContain('both sides');
    expect(text).toContain('limited to 8 of 10');
    expect(text).toContain('condition');
  });

  it('gives feedback on the tools chosen, and suggests the strong fits left out', () => {
    const notes = toolNotes(c, ['force-field-analysis', 'swot-analysis']);
    expect(notes.find((n) => n.tool.id === 'force-field-analysis')?.text).toContain('Not for Paper 1');
    expect(notes.find((n) => n.tool.id === 'swot-analysis')?.text).toContain('Possible');
    expect(notes.filter((n) => !n.chosen).map((n) => n.tool.id)).toEqual(c.tools.filter((t) => t.fit === 'strong').map((t) => t.id));
  });

  it('matches a stakeholder analysis against the model by key words', () => {
    const { found, missing } = compareStakeholders(c.stakeholders, [
      { name: 'Kojo', interest: '', power: 'High', stance: 'For' },
      { name: 'the cooperative of farmers', interest: '', power: '', stance: '' },
      { name: 'Norrvik', interest: '', power: '', stance: '' },
    ]);
    expect(found.map((s) => s.name)).toEqual(['Kojo Mensah (founder, shareholder)', 'Tsala Hills Growers’ Cooperative', 'Norrvik Confectionery Group']);
    expect(missing.length).toBe(c.stakeholders.length - 3);
    // A shared surname names neither founder; a first name names one.
    expect(compareStakeholders(c.stakeholders, [{ name: 'Efua Mensah', interest: '', power: '', stance: '' }]).found.map((s) => s.name)).toEqual(['Efua Mensah (founder, shareholder)']);
    expect(compareStakeholders(c.stakeholders, [{ name: 'the Mensahs', interest: '', power: '', stance: '' }]).found).toEqual([]);
  });

  it('adds evidence once, up to the cap, and exports the answers as text', () => {
    let w = addItem(emptyWork(), { tag: 'data', text: 'x', para: 1, start: 0, end: 4 }, 'a');
    w = addItem(w, { tag: 'data', text: 'x', para: 1, start: 0, end: 4 }, 'b');
    expect(w.items.map((e) => e.id)).toEqual(['a']);
    let full = emptyWork();
    for (let i = 0; i < MAX_ITEMS + 5; i++) full = addItem(full, { tag: 'tool', text: 'y', para: i, start: 0, end: 2 }, `i${i}`);
    expect(full.items).toHaveLength(MAX_ITEMS);
    const txt = answersText(c, { ...w, choice: 'q5', answers: { q1a: { slots: { d1: 'Shareholders', d2: 'Not sold to the public' }, items: ['a'] } }, marks: { q1a: { points: [0, 1], level: null } } });
    expect(txt).toContain('1 (a) Define the term private limited company. [2]');
    expect(txt).toContain('Self-mark: 2 of 2');
    expect(txt).toContain('Evidence: "x"');
    expect(txt).not.toContain('Discuss whether VRC');
    expect(txt).toContain('not an IB markscheme');
  });
});
