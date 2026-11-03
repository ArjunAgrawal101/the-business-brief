import { describe, expect, it } from 'vitest';
import {
  NO_FILTERS,
  bankCsv,
  drawSet,
  emptyState,
  fmtClock,
  fmtDuration,
  fmtPace,
  inPace,
  marksBand,
  matches,
  matchesQuery,
  minutesPerMark,
  parseDuration,
  parseState,
  progressBy,
  questionType,
  rate,
  recordSet,
  setSeconds,
  totals,
  type Facets,
  type Pace,
} from '../../src/lib/bank';
import { buildBank, facetsOf, readCaseQuestion, subtopicPage } from '../../src/lib/bank-build';
import { checkIntegrity } from '../../src/lib/integrity';
import { asCorpus, loadCorpus } from './helpers/corpus';

const real = loadCorpus();

/** A copy of the corpus with one set of notes carrying exam questions, and one case carrying analysis questions. */
function withFixtures() {
  const c = structuredClone(asCorpus(real));
  const [nid, n] = Object.entries(c.notes)[0]!;
  n.exam = [
    { q: 'Define the term *stakeholder*.', marks: 2, command: 'define', level: 'SL/HL', paper: '1', answer: 'An individual or group with an interest in the organization.' },
    { q: 'Calculate the mean of 4, 5 and 9.', marks: 2, command: 'calculate', level: 'SL/HL', paper: '2', answer: '18 ÷ 3 = 6.' },
    { q: 'Discuss whether the firm should grow.', marks: 10, command: 'discuss', level: 'HL', answer: 'Both sides, weighed, then a judgement.' },
  ];
  const [cid, cs] = Object.entries(c.cases)[0]!;
  const ex = cs.exhibits[0]!.id;
  (cs as unknown as Record<string, unknown>).analysisQuestions = [
    { id: 'aq-1', commandTerm: 'Explain', ao: 'AO2', marks: 4, level: 'SL/HL', syllabus: ['3.3'], exhibits: [ex], prompt: 'Explain two costs.', guidance: 'Two costs, each explained.' },
    { id: 'aq-2', commandTerm: 'Evaluate', ao: 'AO3', marks: 10, level: 'HL', paper: 'paper-2', syllabus: ['3.8'], exhibits: [], prompt: 'Evaluate the investment.', guidance: 'Weigh payback against NPV.' },
  ];
  return { c, nid, n, cid };
}

describe('building the question bank from the corpus', () => {
  const bank = buildBank(asCorpus(real));

  it('includes every question in the questions collection, with no problems', () => {
    expect(bank.problems).toEqual([]);
    const fromQuestions = bank.items.filter((i) => i.source === 'question');
    expect(fromQuestions.length).toBe(Object.keys(real.questions).length);
    expect(new Set(bank.items.map((i) => i.id)).size).toBe(bank.items.length);
  });

  it('includes the exam-style practice of every set of notes', () => {
    const expected = Object.values(real.notes).reduce((s, n) => s + n.exam.length, 0);
    expect(bank.items.filter((i) => i.source === 'note').length).toBe(expected);
  });

  it('resolves command terms written by name to their ids, with the AO the guide gives them', () => {
    for (const it of bank.items) {
      const term = real.commandTerms[it.command];
      expect(term, it.id).toBeDefined();
      expect(it.ao).toBe(term?.ao);
      expect(it.units.length).toBeGreaterThan(0);
    }
    const beq = bank.items.find((i) => i.id === 'q-q-costs-p2-beq');
    expect(beq?.command).toBe('calculate');
    expect(beq?.type).toBe('calculation');
    expect(beq?.units).toEqual([5, 3]);
    expect(beq?.paper).toBe('paper-2');
  });

  it('lists the bank in syllabus order', () => {
    const firsts = bank.items.map((i) => i.codes[0] ?? '');
    const key = (c: string) => Number(c.split('.')[0]) * 100 + Number(c.split('.')[1]);
    for (let k = 1; k < firsts.length; k++) expect(key(firsts[k]!)).toBeGreaterThanOrEqual(key(firsts[k - 1]!));
  });

  it('reads note exam questions: the paper, the level, the command term and the page they live on', () => {
    const { c, nid, n } = withFixtures();
    const b = buildBank(c);
    expect(b.problems).toEqual([]);
    const items = b.items.filter((i) => i.id.startsWith(`n-${nid}-`));
    expect(items.map((i) => i.paper)).toEqual(['paper-1', 'paper-2', 'general']);
    expect(items.map((i) => i.type)).toEqual(['definition', 'calculation', 'evaluation']);
    expect(items[2]?.level).toBe('HL');
    expect(items[2]?.band).toBe('10+');
    expect(items[0]?.href).toBe(`${subtopicPage(b.subtopics, n.code)}#nv-exam-h`);
    expect(items[0]?.guidance).toContain('interest in the organization');
  });

  it('reads analysis questions from a case file when it carries them', () => {
    const { c, cid } = withFixtures();
    const b = buildBank(c);
    expect(b.problems).toEqual([]);
    // Other case files may carry analysis questions of their own; these are the fixture's.
    const items = b.items.filter((i) => i.id.startsWith(`c-${cid}-`));
    expect(items.map((i) => i.id)).toEqual([`c-${cid}-aq-1`, `c-${cid}-aq-2`]);
    expect(items[0]?.command).toBe('explain');
    expect(items[0]?.exhibits.length).toBe(1);
    expect(items[1]?.paper).toBe('paper-2');
    expect(items[1]?.level).toBe('HL');
  });

  it('reports a case question it cannot read, so the build fails instead of dropping it', () => {
    const { c } = withFixtures();
    const cs = Object.values(c.cases)[0]!;
    (cs as unknown as Record<string, unknown>).analysisQuestions = [{ id: 'bad', commandTerm: 'Explain', marks: 4, level: 'SL/HL', syllabus: ['3.3'], exhibits: [], prompt: 'Explain.', guidance: 'G.' }];
    expect(buildBank(c).problems.map((p) => p.message).join(' ')).toContain('no assessment objective');
    expect(readCaseQuestion({ id: 'x', commandTerm: 'Ponder', ao: 'AO2', marks: 2, syllabus: ['1.1'], prompt: 'P', guidance: 'G' })).toMatchObject({ commandTerm: 'Ponder' });
    (cs as unknown as Record<string, unknown>).analysisQuestions = [{ id: 'x', commandTerm: 'Ponder', ao: 'AO2', marks: 2, level: 'SL/HL', syllabus: ['1.1'], exhibits: [], prompt: 'P', guidance: 'G' }];
    expect(buildBank(c).problems.map((p) => p.message)).toContain('command term "Ponder" is not in the register');
    expect(checkIntegrity(c).some((p) => p.message.includes('Ponder'))).toBe(true);
  });
});

describe('classifying questions', () => {
  it('names the kind of response from the command term, the AO and the question flags', () => {
    expect(questionType('define', 'AO1')).toBe('definition');
    expect(questionType('describe', 'AO1')).toBe('explanation');
    expect(questionType('explain', 'AO2')).toBe('explanation');
    expect(questionType('explain', 'AO2', { calculation: true })).toBe('calculation');
    expect(questionType('evaluate', 'AO3')).toBe('evaluation');
    expect(questionType('to-what-extent', 'AO3')).toBe('evaluation');
    expect(questionType('calculate', 'AO4')).toBe('calculation');
    expect(questionType('construct', 'AO4')).toBe('construction');
  });

  it('bands marks: 2, 4, 6 and 10', () => {
    expect([1, 2, 3, 4, 5, 6, 9, 10, 17].map(marksBand)).toEqual(['1-2', '1-2', '3-5', '3-5', '3-5', '6-9', '6-9', '10+', '10+']);
  });
});

const f = (over: Partial<Facets>): Facets => ({
  id: 'x',
  units: [3],
  codes: ['3.3'],
  paper: 'paper-2',
  level: 'SL/HL',
  command: 'calculate',
  ao: 'AO4',
  marks: 2,
  band: '1-2',
  type: 'calculation',
  source: 'question',
  title: 'Break-even quantity',
  text: 'break-even quantity calculate the break-even quantity atelier barro 3.3 costs and revenues',
  ...over,
});

describe('filtering and searching', () => {
  it('applies every filter, and all words of the search', () => {
    const q = f({});
    expect(matches(q, NO_FILTERS)).toBe(true);
    expect(matches(q, { ...NO_FILTERS, unit: 3 })).toBe(true);
    expect(matches(q, { ...NO_FILTERS, unit: 4 })).toBe(false);
    expect(matches(q, { ...NO_FILTERS, code: '3.3', paper: 'paper-2', ao: 'AO4', band: '1-2', type: 'calculation', command: 'calculate' })).toBe(true);
    expect(matches(q, { ...NO_FILTERS, paper: 'paper-1' })).toBe(false);
    expect(matches(q, { ...NO_FILTERS, query: 'Barro break-even' })).toBe(true);
    expect(matches(q, { ...NO_FILTERS, query: 'barro payback' })).toBe(false);
  });

  it('reads the level filter as SL (hide HL only) or HL only', () => {
    const hl = f({ level: 'HL' });
    expect(matches(hl, { ...NO_FILTERS, level: 'SL' })).toBe(false);
    expect(matches(hl, { ...NO_FILTERS, level: 'HL' })).toBe(true);
    expect(matches(f({}), { ...NO_FILTERS, level: 'HL' })).toBe(false);
  });

  it('filters by your own progress', () => {
    const s = rate(emptyState(), 'x', 2, '2026-11-03');
    expect(matches(f({}), { ...NO_FILTERS, status: 'new' }, s)).toBe(false);
    expect(matches(f({}), { ...NO_FILTERS, status: 'attempted' }, s)).toBe(true);
    expect(matches(f({}), { ...NO_FILTERS, status: 'not-secure' }, s)).toBe(true);
    expect(matches(f({}), { ...NO_FILTERS, status: 'secure' }, rate(s, 'x', 3, '2026-11-03'))).toBe(true);
  });

  it('ignores accents, case and markdown in the search', () => {
    expect(matchesQuery('The café’s **gross** margin', 'CAFE GROSS')).toBe(true);
    expect(matchesQuery('anything', '   ')).toBe(true);
  });
});

describe('saved progress', () => {
  it('counts the first rating of a day as an attempt, and treats a change that day as a correction', () => {
    let s = rate(emptyState(), 'a', 1, '2026-11-01');
    s = rate(s, 'a', 2, '2026-11-01');
    expect(s.items.a).toEqual({ attempts: 1, rating: 2, last: '2026-11-01' });
    s = rate(s, 'a', 3, '2026-11-03');
    expect(s.items.a).toEqual({ attempts: 2, rating: 3, last: '2026-11-03' });
  });

  it('reads saved data defensively, dropping anything malformed', () => {
    expect(parseState(null)).toEqual(emptyState());
    expect(parseState('nonsense')).toEqual(emptyState());
    const s = parseState({ items: { a: { attempts: 2, rating: 3, last: '2026-11-03' }, b: { attempts: 'x' }, c: { attempts: 1, rating: 7 } }, sets: [{ at: 'x', pace: 'paper-9', ids: [] }] });
    expect(s.items).toEqual({ a: { attempts: 2, rating: 3, last: '2026-11-03' }, c: { attempts: 1, rating: null, last: '' } });
    expect(s.sets).toEqual([]);
  });

  it('records a timed set and the ratings given in it', () => {
    const s = recordSet(emptyState(), { at: '2026-11-03T10:00:00Z', pace: 'paper-1', ids: ['a', 'b'], marks: 6, allowed: 1080, used: 900, ratings: [3, null] }, '2026-11-03');
    expect(s.sets).toHaveLength(1);
    expect(s.items.a?.rating).toBe(3);
    expect(s.items.b).toBeUndefined();
  });

  it('summarizes progress by unit and by command term', () => {
    const items = [f({ id: 'a', units: [3, 5] }), f({ id: 'b', units: [3], command: 'explain' }), f({ id: 'c', units: [1], command: 'explain' })];
    const s = rate(rate(emptyState(), 'a', 3, '2026-11-03'), 'b', 1, '2026-11-03');
    expect(progressBy(items, s, 'unit')).toEqual([
      { key: '3', total: 2, attempted: 2, secure: 1 },
      { key: '5', total: 1, attempted: 1, secure: 1 },
      { key: '1', total: 1, attempted: 0, secure: 0 },
    ]);
    expect(progressBy(items, s, 'command')).toEqual([
      { key: 'calculate', total: 1, attempted: 1, secure: 1 },
      { key: 'explain', total: 2, attempted: 1, secure: 0 },
    ]);
    expect(totals(items, s)).toEqual({ total: 3, attempted: 2, secure: 1, marks: 6 });
  });

  it('exports attempted questions as CSV, quoting commas and quotes', () => {
    const items = [f({ id: 'a', title: 'Costs, "fixed" and variable' }), f({ id: 'b' })];
    const csv = bankCsv(items, rate(emptyState(), 'a', 2, '2026-11-03'), (id) => id.toUpperCase());
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('"Costs, ""fixed"" and variable",Practice question,Paper 2 style,3,3.3,CALCULATE,AO4,2,1,2026-11-03,Partly');
  });
});

describe('timed sets at the paper’s pace', () => {
  const outline = (id: string, level: 'sl' | 'hl') => real.assessment[id]?.outline?.[level];
  const pace = (id: string, level: 'sl' | 'hl', paper: Pace['paper'], slOnly: boolean): Pace => {
    const o = outline(id, level)!;
    return { id: 'paper-1', label: id, minutes: parseDuration(o.duration)!, marks: o.marks, paper, slOnly };
  };

  it('takes each paper’s time and marks from the guide’s outlines: 3, 2.25, 2.1 and 3 minutes a mark', () => {
    expect(parseDuration('1 hour 30 minutes')).toBe(90);
    expect(parseDuration('1 hour 45 minutes')).toBe(105);
    expect(parseDuration('75 minutes')).toBe(75);
    expect(parseDuration('soon')).toBeNull();
    expect(minutesPerMark(pace('paper-1', 'sl', 'paper-1', false))).toBe(3);
    expect(minutesPerMark(pace('paper-2', 'sl', 'paper-2', true))).toBe(2.25);
    expect(minutesPerMark(pace('paper-2', 'hl', 'paper-2', false))).toBe(2.1);
    expect(minutesPerMark(pace('paper-3', 'hl', 'paper-3', false))).toBe(3);
    expect(fmtPace(pace('paper-2', 'sl', 'paper-2', true))).toBe('2.25 minutes a mark');
  });

  it('allows the marks times the pace', () => {
    const p2 = pace('paper-2', 'sl', 'paper-2', true);
    expect(setSeconds(12, p2)).toBe(27 * 60);
    expect(setSeconds(10, pace('paper-2', 'hl', 'paper-2', false))).toBe(21 * 60);
    expect(fmtDuration(27 * 60)).toBe('27 min');
    expect(fmtDuration(4530)).toBe('1 h 15 min 30 s');
    expect(fmtClock(65)).toBe('01:05');
    expect(fmtClock(3723)).toBe('1:02:03');
  });

  it('leaves HL-only questions out of an SL paper, and adds unpaired questions only when asked', () => {
    const sl = pace('paper-2', 'sl', 'paper-2', true);
    expect(inPace(f({ level: 'HL' }), sl, false)).toBe(false);
    expect(inPace(f({}), sl, false)).toBe(true);
    expect(inPace(f({ paper: 'general' }), sl, false)).toBe(false);
    expect(inPace(f({ paper: 'general' }), sl, true)).toBe(true);
  });

  it('draws the same set from the same seed, least practised first', () => {
    const pool = ['a', 'b', 'c', 'd', 'e'].map((id) => f({ id }));
    const one = drawSet(pool, 3, 42, emptyState()).map((x) => x.id);
    expect(drawSet(pool, 3, 42, emptyState()).map((x) => x.id)).toEqual(one);
    expect(new Set(one).size).toBe(3);
    const practised = rate(rate(rate(emptyState(), 'a', 3, '2026-11-01'), 'b', 3, '2026-11-01'), 'c', 3, '2026-11-01');
    expect(drawSet(pool, 2, 7, practised).map((x) => x.id).sort()).toEqual(['d', 'e']);
  });

  it('keeps only what the browser needs in the facets', () => {
    const it0 = buildBank(asCorpus(real)).items[0]!;
    expect(Object.keys(facetsOf(it0)).sort()).toEqual(['ao', 'band', 'codes', 'command', 'id', 'level', 'marks', 'paper', 'source', 'text', 'title', 'type', 'units']);
  });
});
