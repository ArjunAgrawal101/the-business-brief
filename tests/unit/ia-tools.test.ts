import { describe, expect, it } from 'vitest';
import {
  STAGES,
  TOOL_RULES,
  blankEntry,
  checkQuestion,
  checkSet,
  conceptFit,
  documentsCsv,
  emptyProgress,
  evaluateSource,
  parseProgress,
  planTimeline,
  progressSummary,
  questionForm,
  recommendTools,
  setStage,
  submissionNote,
  timelineCsv,
  timelineIcs,
  type DocEntry,
  type Timeline,
} from '../../src/lib/ia-tools';
import { loadCorpus } from './helpers/corpus';

// Parsed once, outside any test, so a busy machine does not time a test out on reading the YAML.
const corpus = loadCorpus();

describe('the key concept guide', () => {
  it('weighs the signs in the issue towards each concept, strongest first', () => {
    expect(conceptFit(['move', 'respond', 'people'])).toEqual([
      { concept: 'change', score: 2 },
      { concept: 'ethics', score: 1 },
      { concept: 'sustainability', score: 1 },
      { concept: 'creativity', score: 0 },
    ]);
    expect(conceptFit([]).every((x) => x.score === 0)).toBe(true);
  });

  it('reads the form of a research question', () => {
    expect(questionForm('Should Harbour Cycles open a second workshop?')).toBe('forward');
    expect(questionForm('How can Harbour Cycles reach student riders?')).toBe('forward');
    expect(questionForm("How effectively has Harbour Cycles' loyalty card raised repeat sales?")).toBe('backward');
    expect(questionForm('Why did Harbour Cycles lose its biggest contract?')).toBe('backward');
    expect(questionForm('To what extent is the new workshop worth it?')).toBe('extent');
    expect(questionForm('Harbour Cycles and its future')).toBe('unclear');
  });

  it('checks the form of the question against the guide, never its quality', () => {
    const good = checkQuestion('Should Harbour Cycles open a second workshop?', 'Harbour Cycles', 'change');
    expect(good.filter((c) => c.status === 'problem')).toEqual([]);
    expect(good.some((c) => c.text.includes('names Harbour Cycles'))).toBe(true);
    expect(good.some((c) => c.text.includes('must be stated on the title page') && c.source === 'Guide, p. 53')).toBe(true);
    const weak = checkQuestion('The sustainability of Harbour Cycles', 'Harbour', 'ethics');
    expect(weak.find((c) => c.text.includes('question mark'))?.status).toBe('advice');
    expect(weak.find((c) => c.text.includes('only one of the four'))?.status).toBe('problem');
    expect(checkQuestion('Should Northgate Bakery open on Sundays?', 'Harbour Cycles', 'change').some((c) => c.text.includes('does not name Harbour Cycles'))).toBe(true);
    expect(checkQuestion('', '', '')).toHaveLength(1);
  });
});

const doc = (over: Partial<DocEntry>): DocEntry => ({ ...blankEntry(), title: 'Accounts', origin: 'Harbour Cycles', voice: 'organization', published: '2026-03', purpose: 'report', named: true, method: true, sourced: true, relevance: 'costs of the workshop', data: 'repair revenue by month', pages: 4, ...over });

describe('the supporting document checklist and source evaluation', () => {
  it('applies the three-year rule from the submission month', () => {
    // Submitting in April 2027, the earliest allowed is April 2024: December 2023 is 40 months before.
    const old = evaluateSource(doc({ published: '2023-12' }), '2027-04');
    expect(old.date.word).toBe('Too old');
    expect(old.date.text).toContain('April 2024');
    expect(evaluateSource(doc({ published: '2024-04' }), '2027-04').date.word).toBe('Within 3 years');
    expect(evaluateSource(doc({ published: '' }), '2027-04').date.status).toBe('missing');
    expect(evaluateSource(doc({ published: '2026-03' }), '').date.status).toBe('check');
  });

  it('questions origin, purpose, reliability and relevance', () => {
    const e = evaluateSource(doc({ purpose: 'persuade', named: false, data: '' }), '2027-04');
    expect(e.origin.word).toBe('Inside view');
    expect(e.purpose.word).toBe('One-sided');
    expect(e.reliability.word).toBe('Some signs');
    expect(e.reliability.text).toContain('who wrote it');
    expect(e.relevance.word).toBe('No data');
    expect(evaluateSource(doc({ kind: 'textbook' }), '2027-04').reliability.word).toBe('Not allowed');
    expect(evaluateSource(doc({ voice: 'own-research', purpose: 'research' }), '2027-04').origin.text).toContain('blank questionnaire');
  });

  it('checks the set: the guide’s count and the balance of voices', () => {
    const two = checkSet([doc({}), doc({ title: 'Survey' })], '2027-04');
    expect(two.some((c) => c.status === 'problem' && c.text.includes('three to five'))).toBe(true);
    expect(two.some((c) => c.text.includes('same voice'))).toBe(true);
    const five = checkSet(
      [doc({}), doc({ voice: 'independent', origin: 'Town council' }), doc({ voice: 'own-research', origin: 'Me' }), doc({ voice: 'sceptic', origin: 'Gazette' }), doc({ voice: 'commercial', origin: 'Agent' })],
      '2027-04',
    );
    expect(five.some((c) => c.status === 'problem')).toBe(false);
    expect(five.some((c) => c.text.includes('different voices'))).toBe(true);
  });

  it('exports the evaluation as CSV with labels SD1, SD2', () => {
    const out = documentsCsv([doc({ title: 'Accounts, 2026' }), doc({ title: 'Survey' })], '2027-04').trim().split('\n');
    expect(out).toHaveLength(3);
    expect(out[1]?.startsWith('SD1,"Accounts, 2026",Harbour Cycles,The organization itself,2026-03')).toBe(true);
  });
});

describe('the business tool selection assistant', () => {
  it('suggests tools that fit the question and can work on the data, leaving HL tools out at SL', () => {
    const sl = recommendTools('finance', ['accounts', 'cash'], 'SL');
    expect(sl.suggested.map((s) => s.rule.id)).toEqual(['ratios', 'cash-flow-forecast']);
    expect(sl.hlOnly.map((s) => s.rule.id)).toEqual(['budgets', 'efficiency-ratios']);
    const hl = recommendTools('finance', ['accounts', 'cash'], 'HL');
    expect(hl.suggested.map((s) => s.rule.id)).toEqual(['budgets', 'ratios', 'efficiency-ratios', 'cash-flow-forecast']);
    expect(hl.hlOnly).toEqual([]);
    expect(hl.suggested[0]?.reason).toContain('Your documents have');
  });

  it('ranks the tools built for the question above those that only support it', () => {
    const inv = recommendTools('invest', ['costs', 'project', 'options', 'market'], 'HL').suggested.map((s) => s.rule.id);
    // Decision trees 3 + 2; break-even and investment appraisal 3 + 1, ahead of the business plan's 2 + 2.
    expect(inv.slice(0, 4)).toEqual(['decision-trees', 'break-even', 'investment-appraisal', 'business-plan']);
    expect(inv.indexOf('investment-appraisal')).toBeLessThan(inv.indexOf('swot-analysis'));
  });

  it('never suggests a tool that has no data to work on', () => {
    expect(recommendTools('invest', [], 'HL').suggested).toEqual([]);
    const people = recommendTools('people', ['staff'], 'SL').suggested.map((s) => s.rule.id);
    expect(people).toContain('motivation');
    expect(people).not.toContain('labour-turnover');
  });

  it('names real toolkit tools at the guide’s level', () => {
    const c = corpus;
    for (const r of TOOL_RULES.filter((x) => x.kind === 'toolkit')) {
      const t = c.tools[r.id];
      expect(t, r.id).toBeDefined();
      expect(t?.level, r.id).toBe(r.level);
    }
    const codes = new Set(Object.values(c.curricula).flatMap((cu) => cu.units.flatMap((u) => u.subtopics.map((s) => s.code))));
    for (const r of TOOL_RULES.filter((x) => x.kind === 'syllabus')) expect(codes.has(r.code ?? ''), r.id).toBe(true);
  });
});

describe('the research timeline', () => {
  it('counts back from the deadline, keeping the last fortnight for the penultimate draft', () => {
    // 3 November 2026 to 1 March 2027 is 118 days; 104 before the two-week review.
    const t = planTimeline('2026-11-03', '2027-03-01') as Timeline;
    expect(t.days).toBe(118);
    expect(t.warnings).toEqual([]);
    const at = Object.fromEntries(t.milestones.map((m) => [m.id, m.date]));
    expect(at).toEqual({
      requirements: '2026-11-07',
      question: '2026-11-18',
      approved: '2026-11-22',
      concept: '2026-11-28',
      candidates: '2026-12-10',
      selected: '2026-12-17',
      analysis: '2027-01-09',
      draft: '2027-01-23',
      revised: '2027-02-07',
      review: '2027-02-15',
      final: '2027-03-01',
    });
    expect(t.milestones.map((m) => m.id)).toEqual(STAGES.map((s) => s.id));
  });

  it('warns when there is less than six weeks, and refuses impossible dates', () => {
    const short = planTimeline('2027-02-01', '2027-03-01') as Timeline;
    expect(short.warnings[0]).toContain('less than six weeks');
    expect(short.milestones.find((m) => m.id === 'review')?.date).toBe('2027-02-20');
    expect(planTimeline('2027-03-01', '2027-02-01')).toEqual({ error: 'The deadline is before the start date.' });
    expect('error' in planTimeline('2027-02-30', '2027-03-01')).toBe(true);
  });

  it('exports an iCalendar file of all-day events and a CSV', () => {
    const t = planTimeline('2026-11-03', '2027-03-01') as Timeline;
    const ics = timelineIcs(t.milestones, '20261103T090000Z');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(11);
    expect(ics).toContain('DTSTART;VALUE=DATE:20270301\r\nDTEND;VALUE=DATE:20270302');
    expect(ics.split('\r\n').every((l) => l.length <= 75)).toBe(true);
    expect(timelineCsv(t.milestones).split('\n')[1]).toBe('2026-11-07,Read the requirements and the criteria,"With your teacher, from the guide. Note where projects most often lose marks.",Recommended,"TSM, p. 69"');
    expect(submissionNote('may', 2027)).toContain('April 2027');
  });
});

describe('the progress tracker', () => {
  it('summarizes what is done, what is next, and what is overdue against the plan', () => {
    let s = setStage(emptyProgress(), 'requirements', 'done', '2026-11-05');
    s = setStage(s, 'question', 'in-progress', '2026-11-10');
    const plan = planTimeline('2026-11-03', '2027-03-01') as Timeline;
    const sum = progressSummary(s, '2026-11-25', plan);
    expect(sum.done).toBe(1);
    expect(sum.next?.id).toBe('question');
    expect(sum.daysLeft).toBe(96);
    expect(sum.overdue).toEqual(['Choose the organization, the issue and a draft question', 'Question approved by your teacher']);
    expect(s.stages.requirements?.done).toBe('2026-11-05');
  });

  it('reads saved progress defensively', () => {
    expect(parseProgress(null)).toEqual(emptyProgress());
    const p = parseProgress({ stages: { draft: { status: 'done', note: 'Sent', done: '2027-01-20' }, bogus: { status: 'done' } }, words: 1712.6, checks: ['a', 3] });
    expect(p.stages).toEqual({ draft: { status: 'done', note: 'Sent', done: '2027-01-20' } });
    expect(p.words).toBe(1712);
    expect(p.checks).toEqual(['a']);
  });
});
