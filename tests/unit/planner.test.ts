import { describe, expect, it } from 'vitest';
import {
  RULES,
  bufferFor,
  buildPlan,
  checkInput,
  clearPlan,
  dayNum,
  dayStr,
  dueSessions,
  emptyPlanner,
  fmtMinutes,
  foldLine,
  gapFor,
  isoWeekday,
  kindCounts,
  dayMonth,
  longDay,
  makePlan,
  shortDay,
  parsePlanner,
  plannerIcs,
  plannerProgress,
  sessionHref,
  sessionTitle,
  sessionsFor,
  setDone,
  weeksOf,
  type PlannerContext,
  type PlannerInput,
  type Session,
} from '../../src/lib/planner';

const CTX: PlannerContext = {
  topics: [
    { code: '1.1', title: 'What is a business?', unit: 1, level: 'SL/HL', url: '/topics/what-is-a-business/' },
    { code: '1.2', title: 'Types of business entities', unit: 1, level: 'SL/HL', url: '/topics/types-of-business-entities/' },
    { code: '1.6', title: 'Multinational companies', unit: 1, level: 'HL', url: '/topics/multinational-companies/' },
    { code: '2.1', title: 'Introduction to human resource management', unit: 2, level: 'SL/HL', url: '/topics/introduction-to-human-resource-management/' },
    { code: '3.5', title: 'Profitability and liquidity ratio analysis', unit: 3, level: 'SL/HL', url: '/topics/profitability-and-liquidity-ratio-analysis/' },
    { code: '3.6', title: 'Debt/equity ratio analysis', unit: 3, level: 'HL', url: '/topics/debt-equity-ratio-analysis/' },
    { code: '4.1', title: 'Introduction to marketing', unit: 4, level: 'SL/HL', url: '/topics/introduction-to-marketing/' },
    { code: '5.5', title: 'Break-even analysis', unit: 5, level: 'SL/HL', url: '/topics/break-even-analysis/' },
  ],
  papers: { 'paper-1': 90, 'paper-2-sl': 90, 'paper-2-hl': 105, 'paper-3': 75 },
  calc: [
    { id: 'break-even', label: 'Break-even and contribution', code: '5.5', hl: false },
    { id: 'profitability', label: 'Profitability ratios', code: '3.5', hl: false },
    { id: 'efficiency', label: 'Efficiency ratios and gearing', code: '3.6', hl: true },
  ],
};

const ALL = CTX.topics.map((t) => t.code);
const SL = CTX.topics.filter((t) => t.level !== 'HL').map((t) => t.code);

/** Monday 23 November 2026. */
const MON = '2026-11-23';
const plus = (day: string, n: number) => dayStr(dayNum(day)! + n);

const input = (over: Partial<PlannerInput> = {}): PlannerInput => ({ start: MON, exam: plus(MON, 63), level: 'HL', hours: 5, days: [1, 2, 3, 4, 5], topics: ALL, weak: [], studied: [], ...over });

const ok = (i: PlannerInput, opts?: Parameters<typeof buildPlan>[2]) => {
  const r = buildPlan(i, CTX, opts);
  if (!r.ok) throw new Error(`${r.field}: ${r.error}`);
  return r;
};

const meetings = (sessions: readonly Session[]) => {
  const out = new Map<string, Session[]>();
  for (const s of sessions) if (s.code && (s.kind === 'learn' || s.kind === 'review' || s.kind === 'retrieve')) out.set(s.code, [...(out.get(s.code) ?? []), s]);
  return out;
};

/** The rules every plan keeps, whatever the input. */
function expectSound(i: PlannerInput, r: ReturnType<typeof ok>) {
  const { plan, sessions } = r;
  const from = dayNum(plan.from)!;
  const exam = dayNum(i.exam)!;
  const last = dayNum(plan.last)!;
  expect(last).toBe(exam - plan.buffer - 1);
  expect(plan.buffer).toBe(bufferFor(exam - from));
  const fitted = i.topics.length;
  for (const s of sessions) {
    const d = dayNum(s.date)!;
    // On a study day, between the start and the free days before the examination.
    expect(i.days).toContain(isoWeekday(d));
    expect(d).toBeGreaterThanOrEqual(from);
    expect(d).toBeLessThanOrEqual(last);
    expect(s.minutes).toBe(plan.slot);
    // Nothing HL at SL.
    if (r.input.level === 'SL') {
      expect(s.kind).not.toBe('paper3');
      expect(s.paper).not.toBe('paper-3');
      if (s.code) expect(CTX.topics.find((t) => t.code === s.code)?.level).not.toBe('HL');
      if (s.family) expect(s.family).not.toBe('efficiency');
    }
  }
  // Every study day holds the same number of sessions, so no week asks for more than the hours given.
  const perDay = new Map<string, number>();
  for (const s of sessions) perDay.set(s.date, (perDay.get(s.date) ?? 0) + 1);
  for (const n of perDay.values()) expect(n).toBe(plan.perDay);
  expect(plan.slot * plan.perDay * r.input.days.length).toBeLessThanOrEqual(i.hours * 60);
  // Every subtopic placed is met at least twice, the second time on a later day; no subtopic twice in a day.
  const m = meetings(sessions);
  const single = perDay.size < 2;
  for (const [code, list] of m) {
    if (!single) expect(list.length, code).toBeGreaterThanOrEqual(2);
    expect(list.map((s) => s.n)).toEqual(list.map((_, k) => k + 1));
    for (let k = 1; k < list.length; k++) expect(dayNum(list[k]!.date)!, code).toBeGreaterThan(dayNum(list[k - 1]!.date)!);
  }
  expect(m.size + plan.notFitted.length).toBe(r.input.topics.length);
  expect(fitted).toBeGreaterThanOrEqual(m.size);
}

describe('the rules as numbers', () => {
  it('leaves about one free day a fortnight before the examination, from one to five, none under a week', () => {
    expect([3, 6, 7, 20, 21, 35, 49, 63, 90, 366].map(bufferFor)).toEqual([0, 0, 1, 1, 2, 3, 4, 5, 5, 5]);
  });

  it('retrieves a week after learning, or sooner in a short plan, never under two days', () => {
    expect([5, 10, 20, 34, 35, 100].map(gapFor)).toEqual([2, 2, 4, 6, 7, 7]);
  });

  it('splits a study day into sessions of about 45 minutes, rounded down to five minutes', () => {
    expect(sessionsFor(60)).toEqual({ perDay: 1, slot: 60 });
    expect(sessionsFor(72)).toEqual({ perDay: 2, slot: 35 });
    expect(sessionsFor(120)).toEqual({ perDay: 3, slot: 40 });
    expect(sessionsFor(200)).toEqual({ perDay: 4, slot: 50 });
    expect(sessionsFor(17)).toEqual({ perDay: 1, slot: 15 });
    expect(fmtMinutes(40)).toBe('40 min');
    expect(fmtMinutes(90)).toBe('1 h 30 min');
    expect(fmtMinutes(120)).toBe('2 h');
  });

  it('writes days out the same way everywhere', () => {
    expect(longDay('2027-02-15')).toBe('Monday 15 February 2027');
    expect(shortDay('2026-11-23')).toBe('Mon 23 Nov');
    expect(dayMonth('2026-12-01')).toBe('1 December');
    expect(longDay('soon')).toBe('soon');
    expect(isoWeekday(dayNum('2026-11-22')!)).toBe(7);
  });
});

describe('a plan', () => {
  it('fills the study days up to the free days before the examination, week by week', () => {
    const i = input();
    const r = ok(i);
    expect(r.plan).toMatchObject({ from: MON, exam: plus(MON, 63), buffer: 5, last: plus(MON, 57), slot: 60, perDay: 1, gap: 7, notFitted: [], warnings: [] });
    // Weekdays from Monday 23 November to Tuesday 19 January: 8 weeks and two days.
    expect(r.sessions).toHaveLength(42);
    expect(r.sessions.reduce((a, s) => a + s.minutes, 0)).toBe(42 * 60);
    expectSound(i, r);
    // Each week holds the five hours given, no more.
    const state = makePlan(emptyPlanner(), i, CTX, MON, new Date(`${MON}T08:00:00Z`));
    if (!state.ok) throw new Error(state.error);
    const weeks = weeksOf(state.state);
    expect(weeks.map((w) => w.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(weeks.slice(0, 8).every((w) => w.minutes === 300)).toBe(true);
    expect(weeks[8]).toMatchObject({ from: plus(MON, 56), to: plus(MON, 62), minutes: 120 });
  });

  it('meets every subtopic twice, a week apart when there is room, and a third time where there is room', () => {
    const r = ok(input({ hours: 10 }));
    const m = meetings(r.sessions);
    expect(m.size).toBe(ALL.length);
    for (const list of m.values()) {
      expect(list[0]?.kind).toBe('learn');
      expect(list[1]?.kind).toBe('retrieve');
      expect(dayNum(list[1]!.date)! - dayNum(list[0]!.date)!).toBeGreaterThanOrEqual(7);
      expect(list).toHaveLength(3);
      expect(dayNum(list[2]!.date)! - dayNum(list[1]!.date)!).toBeGreaterThanOrEqual(14);
    }
  });

  it('starts the weak subtopics first, then those not yet studied, which are learnt rather than reviewed', () => {
    const r = ok(input({ weak: ['4.1', '2.1'], studied: ['1.1', '1.2', '4.1'] }));
    const firsts = r.sessions.filter((s) => s.n === 1);
    expect(firsts.map((s) => s.code)).toEqual(['4.1', '2.1', '1.6', '3.5', '3.6', '5.5', '1.1', '1.2']);
    expect(firsts.map((s) => s.kind)).toEqual(['review', 'learn', 'learn', 'learn', 'learn', 'learn', 'review', 'review']);
    for (let k = 1; k < firsts.length; k++) expect(firsts[k]!.date >= firsts[k - 1]!.date).toBe(true);
  });

  it('interleaves practice: about one session in four, case practice, calculations and Paper 3 in turn at HL, then timed practice at the end', () => {
    const r = ok(input({ hours: 10 }));
    const final = r.sessions.filter((s) => s.date >= r.plan.finalFrom);
    const before = r.sessions.filter((s) => s.date < r.plan.finalFrom);
    const practice = before.filter((s) => ['case', 'calc', 'paper3', 'timed'].includes(s.kind));
    expect(practice.length).toBeGreaterThanOrEqual(Math.floor(before.length / RULES.practiceEvery));
    expect(practice.slice(0, 6).map((s) => s.kind)).toEqual(['case', 'calc', 'paper3', 'case', 'calc', 'paper3']);
    // Calculations rotate through the families of the subtopics chosen.
    expect(practice.filter((s) => s.kind === 'calc').slice(0, 3).map((s) => s.family)).toEqual(['break-even', 'profitability', 'efficiency']);
    expect(before.some((s) => s.kind === 'timed')).toBe(false);
    // The final fortnight: half the sessions timed, at each paper's pace in turn.
    const timed = final.filter((s) => s.kind === 'timed');
    expect(timed.length).toBeGreaterThanOrEqual(Math.floor(final.length / 2));
    expect(timed.slice(0, 3).map((s) => s.paper)).toEqual(['paper-1', 'paper-2', 'paper-3']);
    expect(r.plan.finalFrom).toBe(plus(r.plan.last, -13));
  });

  it('at SL leaves out the HL-only subtopics, Paper 3 and the HL calculations, and says so', () => {
    const i = input({ level: 'SL', hours: 10 });
    const r = ok(i);
    expectSound(i, r);
    expect(r.input.topics).toEqual(SL);
    expect(r.plan.warnings).toContain('At SL the HL-only subtopics are left out: 1.6, 3.6.');
    const kinds = kindCounts(r.sessions);
    expect(kinds.paper3).toBe(0);
    expect(r.sessions.some((s) => s.paper === 'paper-3')).toBe(false);
    expect(new Set(r.sessions.filter((s) => s.kind === 'timed').map((s) => s.paper))).toEqual(new Set(['paper-1', 'paper-2']));
    // Only HL-only subtopics chosen at SL: nothing to plan.
    expect(buildPlan(input({ level: 'SL', topics: ['1.6', '3.6'] }), CTX)).toMatchObject({ ok: false, field: 'topics' });
  });

  it('keeps its rules for every mix of hours, days, length and level', () => {
    for (const level of ['SL', 'HL'] as const)
      for (const hours of [1, 3, 6, 12, 25])
        for (const days of [[1, 2, 3, 4, 5], [6, 7], [1, 3, 5], [1, 2, 3, 4, 5, 6, 7]])
          for (const span of [2, 5, 9, 16, 30, 61, 150]) {
            if ((hours * 60) / days.length < RULES.minSlot) continue;
            const i = input({ level, hours, days, exam: plus(MON, span), weak: ['5.5'], studied: ['1.1'] });
            const r = buildPlan(i, CTX);
            if (!r.ok) {
              // Only a plan with no study day before the free days is refused here.
              expect(r.field, `${level} ${hours}h ${days} ${span}d`).toBe('days');
              continue;
            }
            expectSound(i, r);
          }
  });

  it('lists the subtopics that do not fit, and still meets every one it places twice', () => {
    const i = input({ hours: 1, days: [6], exam: plus(MON, 28) });
    const r = ok(i);
    expectSound(i, r);
    expect(r.plan.notFitted.length).toBeGreaterThan(0);
    expect(r.plan.warnings[0]).toMatch(/^Your time fits \d of the 8 subtopics twice\. Not fitted: /);
  });
});

describe('dates at the edges', () => {
  it('refuses a missing, impossible or passed examination date, and one more than a year away', () => {
    expect(buildPlan(input({ exam: '' }), CTX)).toMatchObject({ ok: false, field: 'exam' });
    expect(buildPlan(input({ exam: '2027-02-30' }), CTX)).toMatchObject({ ok: false, field: 'exam' });
    expect(buildPlan(input({ exam: plus(MON, -1) }), CTX)).toMatchObject({ ok: false, field: 'exam', error: 'The examination must come after the day you start.' });
    expect(buildPlan(input({ exam: MON }), CTX)).toMatchObject({ ok: false, field: 'exam' });
    expect(buildPlan(input({ exam: plus(MON, 367) }), CTX)).toMatchObject({ ok: false, field: 'exam', error: expect.stringMatching(/within a year/) });
    expect(buildPlan(input({ exam: plus(MON, 366) }), CTX).ok).toBe(true);
    expect(buildPlan(input({ start: 'soon' }), CTX)).toMatchObject({ ok: false, field: 'start' });
  });

  it('refuses no study days, too little time and no subtopics, each against its field', () => {
    expect(buildPlan(input({ days: [] }), CTX)).toMatchObject({ ok: false, field: 'days' });
    expect(buildPlan(input({ days: [9, 0] }), CTX)).toMatchObject({ ok: false, field: 'days' });
    expect(buildPlan(input({ hours: 0.5 }), CTX)).toMatchObject({ ok: false, field: 'hours' });
    expect(buildPlan(input({ hours: 41 }), CTX)).toMatchObject({ ok: false, field: 'hours' });
    expect(buildPlan(input({ hours: 1, days: [1, 2, 3, 4, 5] }), CTX)).toMatchObject({ ok: false, field: 'hours', error: expect.stringMatching(/under 15 minutes/) });
    expect(buildPlan(input({ topics: [] }), CTX)).toMatchObject({ ok: false, field: 'topics' });
    expect(buildPlan(input({ topics: ['9.9'] }), CTX)).toMatchObject({ ok: false, field: 'topics' });
    // A Saturday-only plan for an examination on the next Tuesday: the free day is Monday, Saturday is the one study day.
    expect(buildPlan(input({ days: [7], exam: plus(MON, 5) }), CTX)).toMatchObject({ ok: false, field: 'days' });
  });

  it('with one study day left, meets each subtopic once, weakest first, and says why', () => {
    const r = ok(input({ exam: plus(MON, 1), hours: 10, weak: ['5.5'] }));
    expect(r.plan).toMatchObject({ buffer: 0, last: MON });
    expect(r.sessions.every((s) => s.kind === 'learn' && s.date === MON)).toBe(true);
    expect(r.sessions[0]?.code).toBe('5.5');
    expect(r.plan.warnings).toEqual(expect.arrayContaining([expect.stringMatching(/only one study day/), expect.stringMatching(/less than a week away/)]));
  });

  it('in under a week, keeps no free day; in under two weeks, retrieves sooner and says so', () => {
    const week = ok(input({ exam: plus(MON, 6), hours: 10 }));
    expect(week.plan.buffer).toBe(0);
    expect(week.plan.gap).toBe(2);
    expect(week.plan.warnings.some((w) => /less than a week away/.test(w))).toBe(true);
    const fortnight = ok(input({ exam: plus(MON, 12), hours: 10 }));
    expect(fortnight.plan.buffer).toBe(1);
    expect(fortnight.plan.warnings.some((w) => /under two weeks/.test(w))).toBe(true);
  });

  it('plans from today when the start has passed, and refuses a passed examination', () => {
    const r = ok(input(), { from: plus(MON, 14) });
    expect(r.plan.from).toBe(plus(MON, 14));
    expect(r.sessions[0]!.date >= plus(MON, 14)).toBe(true);
    expect(buildPlan(input(), CTX, { from: plus(MON, 70) })).toMatchObject({ ok: false, field: 'exam', error: expect.stringMatching(/passed/) });
    expect(buildPlan(input(), CTX, { from: plus(MON, 63) })).toMatchObject({ ok: false, field: 'exam', error: expect.stringMatching(/today/) });
  });

  it('cleans the input: unknown days, codes and repeats are dropped', () => {
    const c = checkInput(input({ days: [5, 1, 1, 8], topics: ['3.5', '3.5', 'x', '1.1'], weak: ['3.5', '2.1'], studied: ['1.1', 'nope'] }), CTX);
    expect(c).toMatchObject({ ok: true, input: { days: [1, 5], topics: ['1.1', '3.5'], weak: ['3.5'], studied: ['1.1'] } });
  });
});

describe('the kept plan', () => {
  const now = new Date(`${MON}T08:00:00Z`);
  const first = makePlan(emptyPlanner(), input({ hours: 10 }), CTX, MON, now);
  if (!first.ok) throw new Error(first.error);
  const s1 = first.state;

  it('marks sessions done and counts progress, and lists what is due', () => {
    const [a, b] = s1.sessions;
    let st = setDone(s1, a!.id, true, now);
    st = setDone(st, b!.id, true, now);
    st = setDone(st, 'nope', true, now);
    expect(Object.keys(st.done)).toEqual([a!.id, b!.id]);
    const today = plus(MON, 2);
    const p = plannerProgress(st, today);
    expect(p).toMatchObject({ total: s1.sessions.length, done: 2, topics: ALL.length, twice: 0 });
    expect(p.minutesDone).toBe(a!.minutes + b!.minutes);
    expect(p.overdue.every((s) => s.date < today && !st.done[s.id])).toBe(true);
    expect(p.today.every((s) => s.date === today)).toBe(true);
    expect(p.next?.date).toBe(today);
    expect(dueSessions(st, today).map((s) => s.date).every((d) => d <= today)).toBe(true);
    expect(setDone(st, a!.id, false, now).done[a!.id]).toBeUndefined();
  });

  it('a new plan keeps the sessions done, with their dates, and plans only what is left', () => {
    // Do everything in the first week.
    const week1 = s1.sessions.filter((s) => s.date < plus(MON, 7));
    let st = s1;
    for (const s of week1) st = setDone(st, s.id, true, now);
    const later = plus(MON, 10);
    const next = makePlan(st, input({ hours: 10 }), CTX, later, new Date(`${later}T08:00:00Z`));
    if (!next.ok) throw new Error(next.error);
    const s2 = next.state;
    expect(s2.gen).toBe(2);
    for (const s of week1) {
      expect(s2.sessions.find((x) => x.id === s.id)).toEqual(s);
      expect(s2.done[s.id]).toBeDefined();
    }
    const fresh = s2.sessions.filter((s) => !s2.done[s.id]);
    expect(fresh.every((s) => s.id.startsWith('2-') && s.date >= later)).toBe(true);
    // A subtopic learnt in week 1 is not learnt again: its next meeting is a retrieval.
    const learnt = week1.filter((s) => s.kind === 'learn').map((s) => s.code!);
    expect(learnt.length).toBeGreaterThan(0);
    for (const code of learnt) {
      const again = fresh.filter((s) => s.code === code && s.kind !== 'calc');
      expect(again[0]?.kind, code).toBe('retrieve');
      expect(again[0]?.n).toBe(2);
    }
    // Practice carries on its rotation rather than starting again.
    const donePractice = week1.filter((s) => ['case', 'calc', 'paper3'].includes(s.kind)).length;
    const firstPractice = fresh.find((s) => ['case', 'calc', 'paper3'].includes(s.kind));
    expect(firstPractice?.kind).toBe((['case', 'calc', 'paper3'] as const)[donePractice % 3]);
    expect(weeksOf(s2)[0]).toMatchObject({ n: 0, sessions: week1 });
  });

  it('reads a damaged value safely and keeps a sound one unchanged', () => {
    for (const raw of [null, '', '{oops', '[]', { v: 2 }]) expect(parsePlanner(raw)).toEqual(emptyPlanner());
    expect(parsePlanner(JSON.stringify(s1))).toEqual(s1);
    const hostile = parsePlanner({
      ...s1,
      sessions: [...s1.sessions.slice(0, 2), { id: 'x', date: MON, kind: 'learn', minutes: 40, code: '1.1' }, { id: '9-9', date: MON, kind: 'drop tables', minutes: 40 }, { id: '9-8', date: MON, kind: 'learn', minutes: 40 }, { id: '9-7', date: MON, kind: 'timed', minutes: 40, paper: 'paper-9' }],
      done: { [s1.sessions[0]!.id]: 'yesterday', [s1.sessions[1]!.id]: '2026-11-23T10:00:00Z', ghost: '2026-11-23T10:00:00Z' },
    });
    expect(hostile.sessions.map((s) => s.id)).toEqual(s1.sessions.slice(0, 2).map((s) => s.id));
    expect(Object.keys(hostile.done)).toEqual([s1.sessions[1]!.id]);
    expect(clearPlan(s1)).toMatchObject({ plan: null, sessions: [], done: {}, input: s1.input, gen: s1.gen });
  });

  it('names each session and links it to where it is done', () => {
    const learn = s1.sessions.find((s) => s.kind === 'learn')!;
    expect(sessionTitle(learn, CTX)).toMatch(/^Learn \d\.\d /);
    expect(sessionHref(learn, CTX)).toBe(CTX.topics.find((t) => t.code === learn.code)?.url);
    const retrieve = s1.sessions.find((s) => s.kind === 'retrieve' && s.n === 2)!;
    expect(sessionHref(retrieve, CTX)).toBe(`/revision/flashcards/?topic=${retrieve.code}`);
    expect(sessionTitle({ id: '1-1', date: MON, kind: 'calc', minutes: 40, family: 'break-even', code: '5.5' }, CTX)).toBe('Paper 2 calculations: break-even and contribution');
    expect(sessionTitle({ id: '1-1', date: MON, kind: 'timed', minutes: 40, paper: 'paper-2' }, CTX)).toBe('Timed questions at Paper 2 pace');
    expect(sessionHref({ id: '1-1', date: MON, kind: 'paper3', minutes: 40 }, CTX)).toBe('/assessment/paper-3/#p3-prac-h');
  });

  it('exports the days still to do to a calendar, each day once, with the examination', () => {
    const today = plus(MON, 3);
    const st = setDone(s1, s1.sessions.find((s) => s.date === today)!.id, true, now);
    const ics = plannerIcs(st, CTX, { stamp: '20261123T080000Z', origin: 'https://example.org', today });
    const lines = ics.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines.at(-2)).toBe('END:VCALENDAR');
    const days = new Set(st.sessions.filter((s) => s.date >= today).map((s) => s.date));
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(days.size + 1);
    expect(ics).toContain(`UID:bb-revision-${today.replace(/-/g, '')}@the-business-brief`);
    expect(ics).toContain(`DTSTART;VALUE=DATE:${s1.plan!.exam.replace(/-/g, '')}`);
    expect(ics).toContain('SUMMARY:Examination: your first paper');
    // Commas are escaped; no line is longer than 75 octets.
    expect(ics).toMatch(/SUMMARY:Revision\\, 2 h/);
    for (const l of lines) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(ics).not.toMatch(/undefined|NaN/);
  });

  it('folds long lines at 75 octets without splitting a character', () => {
    const line = `DESCRIPTION:${'é'.repeat(60)}`;
    const folded = foldLine(line).split('\r\n');
    expect(folded.length).toBeGreaterThan(1);
    for (const l of folded) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(folded.map((l, i) => (i ? l.slice(1) : l)).join('')).toBe(line);
  });
});
