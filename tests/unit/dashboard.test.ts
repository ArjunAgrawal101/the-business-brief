import { describe, expect, it } from 'vitest';
import { courseChartSvg, dashboardView, familyOf, humanize, ratingWords, ratingsOf, selfCheck, shortDate, workLink, type DashConfig, type DashQuestion } from '../../src/lib/dashboard';
import { emptyLog, emptySaved, recordVisit, toggleSaved, updateChecks } from '../../src/lib/learner';

const T0 = new Date('2026-11-03T09:00:00.000Z');

const q = (over: Partial<DashQuestion> = {}): DashQuestion => ({ id: 'q1', title: 'Break-even quantity', url: '/exam-desk/practice/#q-q1', marks: 3, kind: 'calculation', points: [1, 1, 1], criteria: [], codes: ['5.5'], ...over });

describe('stored items by family', () => {
  it('knows the platform\'s own items, and treats anything else as a room tool\'s work', () => {
    const cases: Array<[string, string]> = [
      ['bb:level', 'preference'],
      ['bb:learner', 'learner'],
      ['bb:saved', 'saved'],
      ['bb:q:q-costs-p2-beq', 'question'],
      ['bb:quiz:ix-costs-classifier-atelier', 'quiz'],
      ['bb:dr:marigold-growth', 'decision'],
      ['bb:rc:notes-1-4', 'retrieval'],
      ['bb:case-lab:ix-halden-diagnosis', 'lab'],
      ['bb:boardroom:kestle-cycles', 'simulation'],
      ['bb:case:tausi-beverages', 'case-decision'],
      ['bb:studio:ix-x:note', 'tool'],
      ['bb:ff:ix-y', 'tool'],
      ['bb:ia-plan', 'tool'],
      ['bb:p3:plan', 'tool'],
      ['bb:ck:ia-self-a', 'checklist'],
      ['bb:strategy:swot', 'work'],
      ['bb:ops:stock-control', 'work'],
      ['bb:bank', 'work'],
    ];
    for (const [k, f] of cases) expect(familyOf(k), k).toBe(f);
  });
});

describe('a practice question\'s self-check', () => {
  it('adds the ticked points, each once, capped at the question\'s marks', () => {
    expect(selfCheck(q(), { answer: '550 mugs', points: [0, 2] })).toEqual({ answered: true, marked: true, score: 2, state: 'Self-marked: 2 of 3 marks' });
    expect(selfCheck(q({ points: [2, 2, 2] }), { points: [0, 1, 2, 1] })?.score).toBe(3);
    expect(selfCheck(q(), { answer: 'x', points: [7, -1, 'a'] })?.state).toBe('Answered, not yet self-marked');
  });

  it('reads a level and the criteria', () => {
    const lv = q({ kind: 'levels', marks: 10, points: [] });
    expect(selfCheck(lv, { level: '5-6' })?.state).toBe('Self-marked: the 5 to 6 marks level, of 10');
    expect(selfCheck(lv, { level: '0' })?.state).toBe('Self-marked: the 0 marks level, of 10');
    expect(selfCheck(lv, { level: '<b>' })).toBeNull();
    const cr = q({ kind: 'criteria', marks: 25, points: [], criteria: [{ id: 'A', marks: 2 }, { id: 'B', marks: 6 }, { id: 'C', marks: 9 }, { id: 'D', marks: 8 }] });
    expect(selfCheck(cr, { crit: { A: 2, B: 9 } })).toMatchObject({ score: 8, state: 'Self-marked: 8 of 25 marks, 2 of 4 criteria still to mark' });
  });

  it('says nothing when nothing was written or marked', () => {
    expect(selfCheck(q(), null)).toBeNull();
    expect(selfCheck(q(), '{oops')).toBeNull();
    expect(selfCheck(q(), { answer: '   ', points: [] })).toBeNull();
  });
});

describe('ratings, dates and names', () => {
  it('counts retrieval ratings', () => {
    const r = ratingsOf({ 0: 2, 1: 1, 2: 0, 3: 2, 4: 9 });
    expect(r).toEqual({ rated: 4, got: 2, partly: 1, notYet: 1 });
    expect(ratingWords(r, 6)).toBe('4 of 6 rated: 2 got it, 1 partly, 1 not yet');
    expect(ratingsOf('nonsense').rated).toBe(0);
  });

  it('writes dates as a reader says them', () => {
    const now = new Date(2026, 10, 3, 15, 0);
    expect(shortDate(new Date(2026, 10, 3, 8, 0).toISOString(), now)).toBe('today');
    expect(shortDate(new Date(2026, 10, 2, 23, 0).toISOString(), now)).toBe('yesterday');
    expect(shortDate(new Date(2026, 9, 29, 12, 0).toISOString(), now)).toBe('29 October');
    expect(shortDate(new Date(2025, 11, 1, 12, 0).toISOString(), now)).toBe('1 December 2025');
    expect(shortDate('not a date', now)).toBe('');
  });

  it('turns a tool\'s id into words', () => {
    expect(humanize('unit-economics')).toBe('Unit economics');
    expect(humanize('swot')).toBe('SWOT');
    expect(humanize('org-chart')).toBe('Org chart');
    expect(humanize('ia-progress')).toBe('IA progress');
  });
});

describe('linking a room tool\'s work back to the tool', () => {
  const rooms = [
    { href: '/finance-desk/', title: 'Finance Desk' },
    { href: '/strategy-studio/', title: 'Strategy Studio' },
    { href: '/people-and-culture/', title: 'People and Culture' },
    { href: '/operations-floor/', title: 'Operations Floor' },
    { href: '/innovation-lab/', title: 'Innovation Lab' },
    { href: '/case-room/', title: 'Case Room' },
    { href: '/cases/', title: 'Case studies' },
  ];
  const pages = [
    { href: '/strategy-studio/swot/', title: 'SWOT' },
    { href: '/operations-floor/stock-control/', title: 'Stock control' },
    { href: '/innovation-lab/unit-economics/', title: 'Unit economics' },
    { href: '/case-room/halden-diagnosis/', title: 'Halden' },
    { href: '/cases/halden-distribution/', title: 'Halden Distribution' },
    { href: '/people-and-culture/organization-chart/', title: 'Organization chart' },
  ];

  it('finds the tool\'s own page under its room', () => {
    expect(workLink('strategy', 'swot', rooms, pages)).toBe('/strategy-studio/swot/');
    expect(workLink('ops', 'stock-control', rooms, pages)).toBe('/operations-floor/stock-control/');
    expect(workLink('lab', 'unit-economics', rooms, pages)).toBe('/innovation-lab/unit-economics/');
    expect(workLink('case', 'halden-distribution', rooms, pages)).toBe('/cases/halden-distribution/');
    expect(workLink('people', 'organization', rooms, pages)).toBe('/people-and-culture/organization-chart/');
  });

  it('falls back to the room, then to a search for the tool', () => {
    expect(workLink('strategy', 'pestle', rooms, pages)).toBe('/strategy-studio/');
    expect(workLink('finance', '', rooms, pages)).toBe('/finance-desk/');
    expect(workLink('bank', '', rooms, pages)).toBe('/search/?q=Bank');
  });
});

const CFG: DashConfig = {
  units: [
    { number: 1, title: 'Introduction to business management' },
    { number: 3, title: 'Finance and accounts' },
  ],
  subtopics: [
    { code: '1.1', title: 'What is a business?', unit: 1, url: '/topics/what-is-a-business/', level: 'SL/HL', state: 'complete', mindmap: '/mindmaps/m-1-1/', cards: ['bb:rc:notes-1-1'], cardCount: 6 },
    { code: '1.2', title: 'Types of business entities', unit: 1, url: '/topics/types-of-business-entities/', level: 'SL/HL', state: 'partial', cards: [], cardCount: 0 },
    { code: '3.3', title: 'Costs and revenues', unit: 3, url: '/topics/costs-and-revenues/', level: 'SL/HL', state: 'complete', cards: ['bb:rc:costs-and-revenues', 'bb:rc:rev-costs-and-revenues'], cardCount: 5 },
  ],
  questions: [q({ codes: ['3.3'] })],
  exercises: [{ uid: 'ix-costs', title: 'Classify the costs', url: '/topics/costs-and-revenues/#ix-costs', total: 4, codes: ['3.3'] }],
  labs: [{ uid: 'ix-lab', title: 'A case lab', url: '/case-room/lab/#ix-lab', stages: 5, codes: ['1.2'] }],
  decisions: [{ id: 'dr1', title: 'A Decision Room', url: '/decision-room/dr1/', rounds: ['r1', 'r2'], codes: ['3.3'] }],
  retrieval: [
    { key: 'bb:rc:notes-1-1', title: '1.1 notes', url: '/topics/what-is-a-business/#sh-rev-h', count: 6, codes: ['1.1'] },
    { key: 'bb:rc:costs-and-revenues', title: '3.3 brief', url: '/topics/costs-and-revenues/#revision', count: 5, codes: ['3.3'] },
  ],
  tools: [
    { keys: ['bb:ia-plan'], title: 'Your research project plan', url: '/ia-studio/', detail: 'Your plan', room: 'Assessment Centre' },
    { keys: ['bb:studio:ix-map', 'bb:studio:ix-map:note'], title: 'Position map', url: '/market-studio/#ix-map', detail: 'Your choices and your note', room: 'Market Studio' },
  ],
  roomTools: [
    { key: 'bb:strategy:ansoff', title: 'Ansoff planner', url: '/strategy-studio/ansoff/', room: 'Strategy Studio' },
    { key: 'bb:strategy:swot', title: 'SWOT builder', url: '/strategy-studio/swot/', room: 'Strategy Studio' },
    { key: 'bb:lab:unit-economics', title: 'Unit economics calculator', url: '/entrepreneurship-lab/unit-economics/', room: 'Entrepreneurship and Innovation Lab', summary: 'bb:lab:summary:unit' },
  ],
  simulations: [{ id: 'kestle', title: 'Kestle Cycles', url: '/boardroom/kestle/', rounds: 4, codes: ['1.2'] }],
  caseDecisions: [{ id: 'tausi', title: 'Tausi Beverages', url: '/cases/tausi/#exercise', codes: ['4.2'] }],
  checklists: [{ prefix: 'ia-', title: 'Internal assessment checklists', href: '/assessment/internal-assessment/', room: 'Assessment Centre' }],
  rooms: [{ href: '/strategy-studio/', title: 'Strategy Studio' }],
  pages: [{ href: '/strategy-studio/swot/', title: 'SWOT' }],
  starts: {
    topic: { href: '/topics/what-is-a-business/', title: '1.1 What is a business?' },
    mindmap: { href: '/mindmaps/m-1-1/', title: '1.1 map' },
    case: { href: '/cases/c/', title: 'A case' },
    framework: { href: '/toolkit/swot-analysis/', title: 'SWOT analysis' },
    tool: { href: '/finance-desk/', title: 'Finance Desk' },
  },
  totals: { mindmaps: 42, cases: 3, frameworks: 6 },
  ia: { href: '/ia-studio/', steps: 10 },
};

describe('the dashboard view', () => {
  it('shows nothing, and says so, when nothing is kept', () => {
    const v = dashboardView({}, CFG);
    expect(v.any).toBe(false);
    expect(v.figures).toMatchObject({ explored: 0, practised: 0, subtopics: 3, answered: 0, labStages: 0, labStagesAll: 5, roomsDone: 0, rooms: 1, saved: 0 });
    expect(v.course.rows.map((r) => r.words)).toEqual(['Not started', 'Not started', 'Not started']);
    expect(v.work).toEqual([]);
  });

  it('a preference alone is not activity', () => {
    expect(dashboardView({ 'bb:level': 'SL' }, CFG).any).toBe(false);
  });

  it('reads every kind of stored work into its section', () => {
    let log = recordVisit(emptyLog(), { kind: 'topic', url: '/topics/what-is-a-business/', title: '1.1 What is a business?' }, T0);
    log = recordVisit(log, { kind: 'mindmap', url: '/mindmaps/m-1-1/', title: '1.1 map' }, T0);
    const picks = { 'a:g': 'x', 'b:g': 'y', 'c:g': 'z' };
    log = updateChecks(log, { uid: 'ix-costs', total: 4, results: { a: 'right', b: 'wrong' }, picks, url: '/topics/costs-and-revenues/#ix-costs', title: 'x' }, T0);
    log = updateChecks(log, { uid: 'ix-elsewhere', total: 2, results: { p: 'partial' }, picks: { 'p:g': 'one' }, url: '/assessment/paper-1/#ix-elsewhere', title: 'Sort the evidence, on Paper 1' }, T0);
    const saved = toggleSaved(emptySaved(), { url: '/glossary/gearing-ratio/', title: 'Gearing ratio', kind: 'term' }, T0).list;
    const items: Record<string, string> = {
      'bb:learner': JSON.stringify(log),
      'bb:saved': JSON.stringify(saved),
      'bb:q:q1': JSON.stringify({ answer: '550', points: [0, 1] }),
      'bb:quiz:ix-costs': JSON.stringify(picks),
      'bb:quiz:ix-elsewhere': JSON.stringify({ 'p:g': 'one' }),
      'bb:case-lab:ix-lab': JSON.stringify({ done: ['problem', 'cause', 'cause'] }),
      'bb:dr:dr1': JSON.stringify({ picks: { r1: 'grow', r2: 'franchise' } }),
      'bb:rc:notes-1-1': JSON.stringify({ 0: 2, 1: 0 }),
      'bb:ia-plan': JSON.stringify({ fields: { 'done-1': 'on', 'done-3': 'on', 'note-1': 'x' } }),
      'bb:studio:ix-map:note': '"My note"',
      'bb:ck:ia-self-a': '["1","2"]',
      'bb:ck:ia-submit': '["4"]',
      'bb:strategy:swot': JSON.stringify({ tool: 'swot', savedAt: T0.toISOString(), headline: 'Three strengths, two threats' }),
      'bb:lab:canvas': JSON.stringify({ canvas: '{}' }),
      'bb:lab:summary:canvas': '"Nine blocks filled"',
      'bb:lab:unit-economics': JSON.stringify({ currency: '$', values: { spend: '100' } }),
      'bb:lab:summary:unit': JSON.stringify({ cac: 20, ltv: 90 }),
      'bb:boardroom:kestle': JSON.stringify({ role: 'hr', picks: ['eco', 'local'] }),
      'bb:case:tausi': JSON.stringify({ choice: 'prune', reasons: 'Drop the dog.', committed: '3 November 2026' }),
    };
    const v = dashboardView(items, CFG);
    expect(v.any).toBe(true);
    expect(v.practice.questions).toEqual([{ title: 'Break-even quantity', href: '/exam-desk/practice/#q-q1', state: 'Self-marked: 2 of 3 marks', done: true }]);
    expect(v.practice.exercises[0]).toMatchObject({ title: 'Classify the costs', state: 'Checked 2 of 4: 1 right, 0 partly right, 1 not yet right' });
    // Checked on a page the build does not list: shown with the recorder's own title and link.
    expect(v.practice.exercises).toHaveLength(2);
    expect(v.practice.exercises[1]).toMatchObject({ title: 'Sort the evidence, on Paper 1', href: '/assessment/paper-1/#ix-elsewhere', state: 'Checked 1 of 2: 0 right, 1 partly right, 0 not yet right' });
    expect(v.practice.labs[0]).toMatchObject({ state: '2 of 5 stages done', done: false });
    expect(v.practice.decisions[0]).toMatchObject({ state: 'Every decision made', done: true });
    expect(v.practice.retrieval[0]).toMatchObject({ state: '2 of 6 rated: 1 got it, 0 partly, 1 not yet' });
    expect(v.figures).toMatchObject({ answered: 1, marked: 1, labStages: 2, roomsDone: 1, saved: 1, mindmaps: 1, cases: 0 });
    expect(v.figures.checked).toMatchObject({ checked: 3, right: 1, partial: 1, wrong: 1 });
    expect(v.figures.cards).toEqual({ rated: 2, got: 1, partly: 0, notYet: 1 });

    const [r11, r12, r33] = v.course.rows;
    expect(r11).toMatchObject({ read: true, mindmap: true, status: 'practised', words: 'Read · Mindmap viewed · 2 of 6 cards rated' });
    expect(r12).toMatchObject({ status: 'practised', words: '2 activities' });
    expect(r33).toMatchObject({ status: 'practised', words: '1 question answered · 2 activities' });
    expect(v.course.units).toEqual([
      { number: 1, title: 'Introduction to business management', total: 2, complete: 1, explored: 2, practised: 2 },
      { number: 3, title: 'Finance and accounts', total: 1, complete: 1, explored: 1, practised: 1 },
    ]);
    expect(v.figures).toMatchObject({ explored: 3, practised: 3, complete: 2, completeExplored: 2 });

    expect(v.visits.topic.map((x) => x.url)).toEqual(['/topics/what-is-a-business/']);
    expect(v.work.map((w) => [w.title, w.href, w.detail])).toEqual([
      ['Your research project plan', '/ia-studio/', '2 of 10 steps done'],
      ['Position map', '/market-studio/#ix-map', 'Your choices and your note'],
      ['Internal assessment checklists', '/assessment/internal-assessment/', '3 items ticked in 2 lists'],
      ['Canvas', '/search/?q=Canvas', 'Nine blocks filled'],
      ['Unit economics calculator', '/entrepreneurship-lab/unit-economics/', 'Your work is kept here.'],
      ['SWOT builder', '/strategy-studio/swot/', 'Three strengths, two threats'],
    ]);
    expect(v.work.find((w) => w.title === 'SWOT builder')).toMatchObject({ where: 'Strategy Studio', when: T0.toISOString() });
    expect(v.workGroups.map((g) => [g.room, g.items.length])).toEqual([
      ['Assessment Centre', 2],
      ['Market Studio', 1],
      ['Lab', 1],
      ['Entrepreneurship and Innovation Lab', 1],
      ['Strategy Studio', 1],
    ]);
    expect(v.figures).toMatchObject({ analyses: 1, analysesAll: 2, work: 6 });
    expect(v.practice.simulations).toEqual([{ title: 'Kestle Cycles', href: '/boardroom/kestle/', state: '2 of 4 rounds decided', done: false }]);
    expect(v.practice.cases).toEqual([{ title: 'Tausi Beverages', href: '/cases/tausi/#exercise', state: 'Decided on 3 November 2026', done: true }]);
    expect(v.figures).toMatchObject({ caseDecisions: 1, caseDecisionsAll: 1, simulationsDone: 0, simulations: 1 });
  });

  it('counts a verdict only while the answer it was given for still stands', () => {
    const picks = { 'a:g': 'x' };
    const log = updateChecks(emptyLog(), { uid: 'ix-costs', total: 4, results: { a: 'right' }, picks, url: '/t/#ix-costs', title: 't' }, T0);
    const changed = dashboardView({ 'bb:learner': JSON.stringify(log), 'bb:quiz:ix-costs': JSON.stringify({ 'a:g': 'y' }) }, CFG);
    expect(changed.practice.exercises[0]).toMatchObject({ state: '1 of 4 answered, none checked yet' });
    expect(changed.figures.checked.checked).toBe(0);
  });

  it('draws the course as squares, with a title and a description that state the result', () => {
    const log = recordVisit(emptyLog(), { kind: 'topic', url: '/topics/what-is-a-business/', title: '1.1' }, T0);
    const v = dashboardView({ 'bb:learner': JSON.stringify(log), 'bb:rc:costs-and-revenues': '{"0":2}' }, CFG);
    const svg = courseChartSvg(v.course.units, v.course.rows, CFG.subtopics);
    expect(svg).toContain('role="img"');
    expect(svg).toContain('<title id="dbc-title">Subtopics explored: 2 of 3, of which 1 practised</title>');
    expect(svg).toContain('Unit 1: 1 of 2 explored, 0 practised. Unit 3: 1 of 1 explored, 1 practised.');
    expect(svg.match(/class="dbc-fill"/g)).toHaveLength(1);
    expect(svg.match(/class="dbc-half"/g)).toHaveLength(1);
    expect(svg.match(/class="dbc-cell /g)).toHaveLength(3);
  });
});
