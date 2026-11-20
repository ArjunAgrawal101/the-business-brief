import { describe, expect, it } from 'vitest';
import {
  QUEUE_MAX,
  WEAK_RULE,
  WEAK_SENTENCE,
  atLevel,
  dueByCode,
  flashcardsHref,
  isDay,
  parseCards,
  pct,
  practiceSummary,
  progressChartSvg,
  readBank,
  readP2,
  resultsByCode,
  revisionQueue,
  scoreOf,
  sheetHref,
  sourcesWords,
  subtopicStates,
  unitProgress,
  weakAreas,
  type EvidenceConfig,
  type ProgressSubtopic,
} from '../../src/lib/progress';
import { emptyLog, parseStudied, recordVisit, setStudied, updateChecks } from '../../src/lib/learner';
import type { DashQuestion } from '../../src/lib/dashboard';

const T0 = new Date('2026-11-20T09:00:00.000Z');
const TODAY = '2026-11-20';

const SUBS: ProgressSubtopic[] = [
  { code: '1.1', title: 'What is a business?', unit: 1, level: 'SL/HL', url: '/topics/what-is-a-business/', mindmap: '/mindmaps/what-is-a-business/' },
  { code: '1.2', title: 'Types of business entities', unit: 1, level: 'SL/HL', url: '/topics/types-of-business-entities/' },
  { code: '1.6', title: 'Multinational companies', unit: 1, level: 'HL', url: '/topics/multinational-companies/' },
  { code: '3.5', title: 'Final accounts', unit: 3, level: 'SL/HL with HL-only content', url: '/topics/final-accounts/' },
  { code: '3.6', title: 'Ratio analysis', unit: 3, level: 'SL/HL', url: '/topics/ratio-analysis/' },
];
const UNITS = [
  { number: 1, title: 'Introduction to business management' },
  { number: 3, title: 'Finance and accounts' },
];

const q = (over: Partial<DashQuestion> = {}): DashQuestion => ({ id: 'q1', title: 'Gearing', url: '/exam-desk/practice/#q-q1', marks: 4, kind: 'points', points: [1, 1, 2], criteria: [], codes: ['3.6'], ...over });

const CFG: EvidenceConfig = {
  bank: [
    ['q-q1', ['3.6'], 'paper-2'],
    ['n-ratios-1', ['3.6'], 'paper-2'],
    ['n-ratios-2', ['3.6', '3.5'], 'general'],
    ['n-what-1', ['1.1'], 'paper-1'],
    ['n-what-2', ['1.1'], 'paper-1'],
  ],
  questions: [q(), q({ id: 'q2', title: 'A levels question', kind: 'levels', marks: 10, points: [], codes: ['1.2'] })],
  exercises: [{ uid: 'ix-sort', title: 'Sort the entities', url: '/topics/types-of-business-entities/#ix-sort', total: 4, codes: ['1.2'] }],
  retrieval: [{ key: 'bb:rc:notes-1-1', title: '1.1 notes', url: '/topics/what-is-a-business/#sh-rev-h', count: 6, codes: ['1.1'] }],
  p2: { 'break-even-quantity': '5.5', 'gearing-ratio': '3.6', 'current-ratio': '3.6' },
};

const card = (over: Record<string, unknown> = {}) => ({ box: 2, due: '2026-11-19', seen: 3, last: '2026-11-17T08:00:00Z', rating: 'good', codes: ['3.6'], title: 'Gearing', ...over });

describe('the flashcards record', () => {
  it('is read when absent, damaged or from another version, without throwing', () => {
    for (const raw of [undefined, null, '', '{oops', '[]', 42, { v: 2, cards: { a: card() } }, { v: 1, cards: [card()] }]) expect(parseCards(raw)).toEqual({ v: 1, cards: [] });
  });

  it('keeps only cards it can read, field by field', () => {
    const cards = parseCards(
      JSON.stringify({
        v: 1,
        cards: {
          'c-good': card(),
          'c-box': card({ box: 9 }),
          'c-boxtext': card({ box: '2' }),
          'bad id!': card(),
          'c-due': card({ due: '2026-02-30', rating: 'superb', codes: ['3.6', '3.6', 'x', 7], last: 'never', seen: -4, title: '  Two\u0000 lines\n here ' }),
          'c-min': { box: 1 },
        },
      }),
    ).cards;
    expect(cards.map((c) => c.id)).toEqual(['c-due', 'c-good', 'c-min']);
    expect(cards[0]).toEqual({ id: 'c-due', box: 2, due: null, seen: 0, last: null, rating: null, codes: ['3.6'], title: 'Two lines here' });
    expect(cards[2]).toEqual({ id: 'c-min', box: 1, due: null, seen: 0, last: null, rating: null, codes: [], title: 'c-min' });
  });

  it('counts the cards due by subtopic: seen cards whose day has come', () => {
    const cards = parseCards({
      v: 1,
      cards: {
        a: card({ due: '2026-11-20', codes: ['3.6'] }),
        b: card({ due: '2026-11-01', codes: ['3.6', '3.5'] }),
        c: card({ due: '2026-11-21', codes: ['3.5'] }),
        d: card({ due: '2026-11-10', codes: ['1.1'], seen: 0 }),
        e: card({ due: '2026-11-15', codes: ['1.1'] }),
      },
    });
    expect(dueByCode(cards, TODAY)).toEqual([
      { code: '3.6', due: 2 },
      { code: '1.1', due: 1 },
      { code: '3.5', due: 1 },
    ]);
  });

  it('names real days only', () => {
    expect(isDay('2026-11-20')).toBe(true);
    for (const d of ['2026-02-29', '2026-13-01', '20-11-2026', '', null]) expect(isDay(d)).toBe(false);
    expect(isDay('2028-02-29')).toBe(true);
  });
});

describe('results by subtopic', () => {
  const log = updateChecks(emptyLog(), { uid: 'ix-sort', total: 4, results: { a: 'right', b: 'partial', c: 'wrong' }, picks: { 'a:g': 'x', 'b:g': 'y', 'c:g': 'z' }, url: '/topics/types-of-business-entities/#ix-sort', title: 'Sort' }, T0);
  const items: Record<string, string> = {
    'bb:learner': JSON.stringify(log),
    'bb:quiz:ix-sort': JSON.stringify({ 'a:g': 'x', 'b:g': 'y', 'c:g': 'z' }),
    'bb:bank': JSON.stringify({ v: 1, items: { 'q-q1': { attempts: 2, rating: 1, last: '2026-11-19' }, 'n-ratios-2': { attempts: 1, rating: 2, last: '2026-11-19' }, 'n-what-1': { attempts: 1, rating: 3, last: '2026-11-18' }, 'n-what-2': { attempts: 1, rating: null, last: '' }, unknown: { attempts: 1, rating: 3 } }, sets: [{ at: '2026-11-19T10:00:00Z' }] }),
    'bb:q:q1': JSON.stringify({ answer: 'x', points: [0] }),
    'bb:q:q2': JSON.stringify({ answer: 'y', level: '5-6' }),
    'bb:p2-practice': JSON.stringify({ v: 1, kinds: { 'gearing-ratio': { tried: 4, right: 1 }, 'break-even-quantity': { tried: 2, right: 2 }, nonsense: { tried: 9, right: 9 } }, timed: [{ at: '2026-11-19T10:00:00Z', marks: 4, total: 8 }] }),
    'bb:cards': JSON.stringify({ v: 1, cards: { a: card({ rating: 'again' }), b: card({ rating: 'hard', due: '2026-11-25' }), c: card({ rating: 'easy', codes: ['1.1'] }) } }),
    'bb:rc:notes-1-1': JSON.stringify({ 0: 2, 1: 1, 2: 0, 3: 7 }),
  };

  it('places every kind of result under its subtopics, as a value from 0 to 1', () => {
    const r = resultsByCode(items, CFG);
    const t36 = r.get('3.6')!;
    // Bank: not yet (0) and partly (0.5); question q1: 1 of 4 marks (0.25); P2 gearing: 1 right in 4; cards: again (0) and hard (0.5).
    expect(t36.by.bank).toEqual({ n: 2, sum: 0.5 });
    expect(t36.by.questions).toEqual({ n: 1, sum: 0.25 });
    expect(t36.by.p2).toEqual({ n: 4, sum: 1 });
    expect(t36.by.cards).toEqual({ n: 2, sum: 0.5 });
    expect(t36.n).toBe(9);
    expect(t36.sum).toBeCloseTo(2.25, 10);
    // A bank question on two subtopics counts for both.
    expect(r.get('3.5')?.by.bank).toEqual({ n: 1, sum: 0.5 });
    // Levels count their top mark: the 5 to 6 level of 10 is 0.6. The exercise: right, partly, wrong.
    expect(r.get('1.2')?.by).toEqual({ questions: { n: 1, sum: 0.6 }, exercises: { n: 3, sum: 1.5 } });
    // Recall cards: got it, partly, not yet (a rating of 7 is not one); the bank's secure answer; the easy card. The unrated attempt does not count.
    expect(r.get('1.1')?.by).toEqual({ bank: { n: 1, sum: 1 }, cards: { n: 1, sum: 1 }, recall: { n: 3, sum: 1.5 } });
    expect(r.get('5.5')?.by).toEqual({ p2: { n: 2, sum: 2 } });
    expect(scoreOf(r.get('1.1'))).toBeCloseTo(0.7, 10);
  });

  it('counts nothing when nothing is kept, and survives damaged items', () => {
    expect(resultsByCode({}, CFG).size).toBe(0);
    expect(resultsByCode({ 'bb:bank': '{oops', 'bb:cards': '[]', 'bb:p2-practice': 'null', 'bb:q:q1': '42', 'bb:rc:notes-1-1': '"x"' }, CFG).size).toBe(0);
    expect(readBank('{"items":{"a":{"attempts":"3"}}}')).toEqual({ items: {}, sets: 0 });
    expect(readP2({ kinds: { 'gearing-ratio': { tried: 2, right: 5 } }, timed: [{ at: 'x', marks: 9, total: 4 }, { marks: 1, total: 2 }] }, CFG.p2)).toEqual({ kinds: { 'gearing-ratio': { tried: 2, right: 2 } }, timed: [{ marks: 4, total: 4 }] });
  });

  it('finds the weak areas by the stated rule, at the reader’s level, weakest first', () => {
    expect(WEAK_SENTENCE).toContain(`at least ${WEAK_RULE.min} results`);
    expect(WEAK_SENTENCE).toContain(`under ${pct(WEAK_RULE.below)}`);
    expect(WEAK_SENTENCE.split('. ')).toHaveLength(1);
    const r = resultsByCode(items, CFG);
    const weak = weakAreas(r, SUBS, 'HL');
    // 3.6 averages 0.25 over 9 results; 1.2 averages 0.525 over 4; 1.1 is 0.7 (not weak); 3.5 has 1 result (too few).
    expect(weak.map((w) => [w.code, w.n, Math.round(w.score * 1000) / 1000])).toEqual([
      ['3.6', 9, 0.25],
      ['1.2', 4, 0.525],
    ]);
    expect(sourcesWords(weak[0]!.by)).toBe('question bank 25% of 2, practice questions 25% of 1, paper 2 calculations 25% of 4, flashcards 25% of 2');
    // An HL-only subtopic is not weak for an SL reader.
    const hlOnly = new Map([['1.6', { code: '1.6', n: 5, sum: 0, by: {} }]]);
    expect(weakAreas(hlOnly, SUBS, 'HL').map((w) => w.code)).toEqual(['1.6']);
    expect(weakAreas(hlOnly, SUBS, 'SL')).toEqual([]);
    // Exactly at the line is not weak; one result short is not weak.
    expect(weakAreas(new Map([['1.1', { code: '1.1', n: 5, sum: 3, by: {} }]]), SUBS, 'HL')).toEqual([]);
    expect(weakAreas(new Map([['1.1', { code: '1.1', n: 2, sum: 0, by: {} }]]), SUBS, 'HL')).toEqual([]);
  });

  it('sums up practice performance source by source', () => {
    const p = practiceSummary(items, CFG, TODAY);
    expect(p.bank).toEqual({
      attempted: 4,
      total: 5,
      attempts: 5,
      secure: 1,
      partly: 1,
      notYet: 1,
      sets: 1,
      byPaper: [
        { paper: 'paper-1', attempted: 2, secure: 1, total: 2 },
        { paper: 'paper-2', attempted: 1, secure: 0, total: 2 },
        { paper: 'general', attempted: 1, secure: 0, total: 1 },
      ],
    });
    expect(p.questions).toEqual({ answered: 2, marked: 2, total: 2, marks: 7, of: 14 });
    expect(p.p2).toEqual({ tried: 6, right: 3, timed: 1, marks: 4, total: 8 });
    expect(p.cards).toEqual({ reviewed: 3, due: 2, again: 1, hard: 1, good: 0, easy: 1 });
    expect(p.recall).toEqual({ rated: 3, got: 1, partly: 1, notYet: 1 });
    expect(p.exercises).toEqual({ checked: 3, right: 1, partial: 1, wrong: 1 });
    expect(p.attempted).toBe(4 + 2 + 6);
  });
});

describe('studied, completed and progress by unit', () => {
  let log = recordVisit(emptyLog(), { kind: 'topic', url: '/topics/what-is-a-business/', title: '1.1' }, T0);
  log = recordVisit(log, { kind: 'mindmap', url: '/mindmaps/what-is-a-business/', title: '1.1 map' }, new Date(T0.getTime() + 60_000));
  const studied = setStudied(setStudied(parseStudied(null), '1.1', true, T0), '1.6', true, T0);
  const results = new Map([['3.6', { code: '3.6', n: 2, sum: 1, by: { bank: { n: 2, sum: 1 } } }]]);
  const states = subtopicStates(SUBS, log, studied, results);

  it('a subtopic is studied when opened, practised or marked complete, and completed only when marked', () => {
    expect(states.map((s) => [s.code, s.studied, s.completed, s.visited, s.practised])).toEqual([
      ['1.1', true, true, true, false],
      ['1.2', false, false, false, false],
      ['1.6', true, true, false, false],
      ['3.5', false, false, false, false],
      ['3.6', true, false, false, true],
    ]);
    expect(states[0]?.lastVisit).toBe(new Date(T0.getTime() + 60_000).toISOString());
  });

  it('counts each unit out of the subtopics at the reader’s level', () => {
    expect(unitProgress(UNITS, SUBS, states, 'HL')).toEqual([
      { number: 1, title: UNITS[0]!.title, total: 3, studied: 2, completed: 2 },
      { number: 3, title: UNITS[1]!.title, total: 2, studied: 1, completed: 0 },
    ]);
    expect(unitProgress(UNITS, SUBS, states, 'SL')[0]).toMatchObject({ total: 2, studied: 1, completed: 1 });
    expect(atLevel({ level: 'SL/HL with HL-only content' }, 'SL')).toBe(true);
  });

  it('draws the units as squares, with a title and a description that state the result', () => {
    const svg = progressChartSvg(unitProgress(UNITS, SUBS, states, 'SL'), SUBS, states, 'SL');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('<title id="pgc-title">Subtopics at SL: 2 of 4 studied, 1 completed</title>');
    expect(svg).toContain('Unit 1: 1 of 2 studied, 1 completed. Unit 3: 1 of 2 studied, 0 completed.');
    expect(svg.match(/class="pgc-cell /g)).toHaveLength(4);
    expect(svg.match(/class="pgc-fill"/g)).toHaveLength(1);
    expect(svg.match(/class="pgc-half"/g)).toHaveLength(1);
    expect(svg).not.toMatch(/undefined|NaN/);
  });
});

describe('the revision queue', () => {
  const log = recordVisit(emptyLog(), { kind: 'topic', url: '/topics/what-is-a-business/', title: '1.1' }, T0);
  const base = {
    today: TODAY,
    level: 'SL' as const,
    subtopics: SUBS,
    states: subtopicStates(SUBS, log, parseStudied(null), new Map()),
    weak: [],
    cards: parseCards(null),
    plan: [],
  };

  it('with nothing kept, suggests the subtopics at the reader’s level not yet opened', () => {
    const items = revisionQueue(base);
    expect(items.map((i) => [i.kind, i.code, i.links[0]?.href])).toEqual([
      ['new', '1.2', '/topics/types-of-business-entities/'],
      ['new', '3.5', '/topics/final-accounts/'],
    ]);
    expect(items[0]?.why).toBe('Not opened yet, and on the SL course');
  });

  it('puts planned sessions first, then cards due, then weak areas, then new subtopics, one item a subtopic', () => {
    const cards = parseCards({ v: 1, cards: { a: card({ due: '2026-11-18', codes: ['3.6'] }), b: card({ due: '2026-11-20', codes: ['3.6'] }), c: card({ due: '2026-11-19', codes: ['1.2'] }), d: card({ due: '2026-11-19', codes: [] }) } });
    const weak = [
      { code: '3.6', title: 'Ratio analysis', url: '/topics/ratio-analysis/', n: 5, score: 0.2, by: {} },
      { code: '3.5', title: 'Final accounts', url: '/topics/final-accounts/', n: 4, score: 0.4, by: {} },
    ];
    const plan = [
      { date: '2026-11-19', title: 'Retrieve 1.1 What is a business?', href: '/revision/flashcards/?topic=1.1', minutes: 40, code: '1.1' },
      { date: TODAY, title: 'Case practice in the style of Paper 1', href: '/assessment/paper-1/#p1-prac-h', minutes: 40 },
    ];
    const items = revisionQueue({ ...base, cards, weak, plan });
    expect(items.map((i) => [i.kind, i.code ?? ''])).toEqual([
      ['plan', '1.1'],
      ['plan', ''],
      ['cards', '3.6'],
      ['cards', '1.2'],
      ['weak', '3.5'],
    ]);
    expect(items[0]?.why).toBe('In your plan for Thursday 19 November, not yet done (40 minutes)');
    expect(items[1]?.why).toBe('In your plan for today (40 minutes)');
    expect(items[2]).toMatchObject({ title: 'Review 2 flashcards on 3.6 Ratio analysis', links: [{ label: 'Review them', href: '/revision/flashcards/?topic=3.6' }] });
    expect(items[4]?.links.map((l) => l.href)).toEqual(['/revision/final-accounts/', '/revision/flashcards/?topic=3.5']);
    expect(items[4]?.why).toBe('A weak area: 4 results average 40%');
    expect(items.length).toBeLessThanOrEqual(QUEUE_MAX);
  });

  it('links to the flashcards and revision sheets by the subtopic’s code and address', () => {
    expect(flashcardsHref('3.5')).toBe('/revision/flashcards/?topic=3.5');
    expect(flashcardsHref('<x>')).toBe('/revision/flashcards/');
    expect(flashcardsHref()).toBe('/revision/flashcards/');
    expect(sheetHref('/topics/break-even-analysis/')).toBe('/revision/break-even-analysis/');
    expect(sheetHref('javascript:alert(1)')).toBe('/revision/');
  });
});
