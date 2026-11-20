import { describe, expect, it } from 'vitest';
import {
  BOX_DAYS,
  CARDS_KEY,
  NO_FILTERS,
  addDays,
  answer,
  currentCard,
  daysBetween,
  defaultLevel,
  dueCount,
  dueWords,
  emptyCards,
  filtersFromQuery,
  isDay,
  localDay,
  matchesFilters,
  mergeCards,
  parseCards,
  queryFromFilters,
  queueFor,
  rateCard,
  recallIds,
  recallIsHL,
  resetCards,
  schedule,
  shuffled,
  startSession,
  statusOf,
  summarize,
  summaryWords,
  tallyOf,
  unitOfCode,
  withoutHLMark,
  type CardsState,
  type DeckCard,
} from '../../src/lib/flashcards';
import { checkImport, planWorkspaceImport } from '../../src/lib/workspace';
import { EXPORT_FORMAT, EXPORT_VERSION } from '../../src/lib/learner';

/** A moment at a local time, so the tests mean the same day in any time zone. */
const at = (y: number, m: number, d: number, hh = 9, mm = 0) => new Date(y, m - 1, d, hh, mm);

const card = (id: string, over: Partial<DeckCard> = {}): DeckCard => ({
  id,
  kind: 'term',
  codes: ['3.5'],
  level: 'SL/HL',
  title: id,
  front: '<p>front</p>',
  prompt: 'Define the term.',
  back: '<p>back</p>',
  ...over,
});

describe('local calendar days', () => {
  it('reads the day where the reader is, not in UTC', () => {
    expect(localDay(at(2026, 11, 20, 0, 5))).toBe('2026-11-20');
    expect(localDay(at(2026, 11, 20, 23, 55))).toBe('2026-11-20');
    expect(localDay(at(2027, 1, 3))).toBe('2027-01-03');
  });

  it('keeps the local day in a time zone far from UTC', () => {
    const before = process.env.TZ;
    try {
      process.env.TZ = 'America/Los_Angeles';
      // 03:00 UTC on 21 November is still the evening of 20 November in Los Angeles.
      expect(localDay(new Date('2026-11-21T03:00:00Z'))).toBe('2026-11-20');
      process.env.TZ = 'Asia/Kolkata';
      // 20:00 UTC on 20 November is already 21 November in India.
      expect(localDay(new Date('2026-11-20T20:00:00Z'))).toBe('2026-11-21');
    } finally {
      process.env.TZ = before;
    }
  });

  it('adds whole days across months, years, leap days and clock changes', () => {
    expect(addDays('2026-11-20', 1)).toBe('2026-11-21');
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-25', 16)).toBe('2027-01-10');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    // The last Sunday of March and October, when European clocks change.
    expect(addDays('2027-03-27', 2)).toBe('2027-03-29');
    expect(addDays('2026-10-24', 8)).toBe('2026-11-01');
    expect(addDays('2026-11-20', -20)).toBe('2026-10-31');
    expect(daysBetween('2026-11-20', '2026-12-06')).toBe(16);
    expect(daysBetween('2026-11-20', '2026-11-19')).toBe(-1);
  });

  it('knows a real day from a malformed one', () => {
    expect(isDay('2026-11-20')).toBe(true);
    expect(isDay('2028-02-29')).toBe(true);
    for (const bad of ['2027-02-29', '2026-13-01', '2026-11-31', '20-11-2026', '2026-1-5', '', null, 20261120]) expect(isDay(bad), String(bad)).toBe(false);
  });

  it('says when a card is due in words', () => {
    expect(dueWords('2026-11-20', '2026-11-20')).toBe('today');
    expect(dueWords('2026-11-18', '2026-11-20')).toBe('today');
    expect(dueWords('2026-11-21', '2026-11-20')).toBe('tomorrow');
    expect(dueWords('2026-11-24', '2026-11-20')).toBe('in 4 days');
  });
});

describe('the Leitner schedule', () => {
  const today = '2026-11-20';

  it('waits 1, 2, 4, 8 and 16 days in boxes 1 to 5', () => {
    expect(BOX_DAYS).toEqual({ 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 });
  });

  it('treats a card never seen as in box 1', () => {
    expect(schedule(undefined, 'again', today)).toEqual({ box: 1, due: '2026-11-20' });
    expect(schedule(undefined, 'hard', today)).toEqual({ box: 1, due: '2026-11-21' });
    expect(schedule(undefined, 'good', today)).toEqual({ box: 2, due: '2026-11-22' });
    expect(schedule(undefined, 'easy', today)).toEqual({ box: 3, due: '2026-11-24' });
  });

  it('sends Again to box 1, due today; keeps Hard in its box; moves Good up one and Easy up two', () => {
    expect(schedule(4, 'again', today)).toEqual({ box: 1, due: today });
    expect(schedule(3, 'hard', today)).toEqual({ box: 3, due: '2026-11-24' });
    expect(schedule(3, 'good', today)).toEqual({ box: 4, due: '2026-11-28' });
    expect(schedule(2, 'easy', today)).toEqual({ box: 4, due: '2026-11-28' });
  });

  it('never moves a card past box 5', () => {
    expect(schedule(4, 'easy', today)).toEqual({ box: 5, due: '2026-12-06' });
    expect(schedule(5, 'good', today)).toEqual({ box: 5, due: '2026-12-06' });
    expect(schedule(5, 'easy', today)).toEqual({ box: 5, due: '2026-12-06' });
    expect(schedule(5, 'hard', today)).toEqual({ box: 5, due: '2026-12-06' });
  });

  it('records a rating in exactly the stored shape, without changing the state it was given', () => {
    const before = emptyCards();
    const now = at(2026, 11, 20, 18, 30);
    const after = rateCard(before, { id: 'formula:current-ratio', codes: ['3.5'], title: 'Current ratio: what it measures' }, 'good', now);
    expect(before.cards).toEqual({});
    expect(after).toEqual({
      v: 1,
      cards: { 'formula:current-ratio': { box: 2, due: '2026-11-22', seen: 1, last: now.toISOString(), rating: 'good', codes: ['3.5'], title: 'Current ratio: what it measures' } },
    });
    const again = rateCard(after, { id: 'formula:current-ratio', codes: ['3.5'], title: 'Current ratio: what it measures' }, 'again', at(2026, 11, 22));
    expect(again.cards['formula:current-ratio']).toMatchObject({ box: 1, due: '2026-11-22', seen: 2, rating: 'again' });
  });

  it('follows a card through a fortnight of reviews', () => {
    const meta = { id: 'term:liquidity', codes: ['3.5', '3.7'], title: 'Liquidity' };
    let s = rateCard(emptyCards(), meta, 'good', at(2026, 11, 20));
    expect(s.cards[meta.id]).toMatchObject({ box: 2, due: '2026-11-22' });
    s = rateCard(s, meta, 'good', at(2026, 11, 22));
    expect(s.cards[meta.id]).toMatchObject({ box: 3, due: '2026-11-26' });
    s = rateCard(s, meta, 'hard', at(2026, 11, 26));
    expect(s.cards[meta.id]).toMatchObject({ box: 3, due: '2026-11-30' });
    s = rateCard(s, meta, 'easy', at(2026, 11, 30));
    expect(s.cards[meta.id]).toMatchObject({ box: 5, due: '2026-12-16', seen: 4 });
    expect(statusOf(s.cards[meta.id], '2026-12-15')).toBe('later');
    expect(statusOf(s.cards[meta.id], '2026-12-16')).toBe('due');
    expect(statusOf(undefined, '2026-12-16')).toBe('new');
  });
});

describe('bb:cards read defensively', () => {
  const good = { box: 2, due: '2026-11-22', seen: 3, last: '2026-11-20T09:00:00.000Z', rating: 'good', codes: ['3.5'], title: 'Current ratio' };

  it('is the key the dashboard reads', () => {
    expect(CARDS_KEY).toBe('bb:cards');
  });

  it('reads the JSON text or the parsed value', () => {
    const v = { v: 1, cards: { 'formula:current-ratio': good } };
    expect(parseCards(v)).toEqual(v);
    expect(parseCards(JSON.stringify(v))).toEqual(v);
  });

  it('never throws, and drops anything it cannot use', () => {
    for (const bad of [null, undefined, '', '{oops', '[]', 42, 'null', { cards: [] }, { cards: 'x' }]) expect(parseCards(bad)).toEqual(emptyCards());
    const r = parseCards({
      v: 1,
      cards: {
        'formula:current-ratio': good,
        'no colon': good,
        'term:x': { ...good, box: 6 },
        'term:y': { ...good, box: 2.5 },
        'term:z': { ...good, due: '2026-02-30' },
        'term:w': { ...good, rating: 'perfect' },
        'term:v': 'good',
        'term:u': { ...good, seen: -4, last: 'yesterday', codes: ['3.5', 'x', 9, '3.5', 'toolkit'], title: `  ${'A'.repeat(300)}  ` },
      },
    });
    expect(Object.keys(r.cards).sort()).toEqual(['formula:current-ratio', 'term:u']);
    expect(r.cards['term:u']).toMatchObject({ seen: 1, last: '', codes: ['3.5', 'toolkit'] });
    expect(r.cards['term:u']?.title).toHaveLength(120);
  });

  it('caps how many cards it keeps, keeping the most recently rated', () => {
    const cards: Record<string, unknown> = {};
    for (let i = 0; i < 6100; i++) cards[`term:t${i}`] = { ...good, last: new Date(Date.UTC(2026, 0, 1) + i * 60_000).toISOString() };
    const r = parseCards({ v: 1, cards });
    expect(Object.keys(r.cards)).toHaveLength(6000);
    expect(r.cards['term:t6099']).toBeDefined();
    expect(r.cards['term:t0']).toBeUndefined();
  });

  it('resets some cards or all of them', () => {
    const s = parseCards({ v: 1, cards: { 'term:a': good, 'term:b': good, 'term:c': good } });
    expect(Object.keys(resetCards(s, ['term:a', 'term:c']).cards)).toEqual(['term:b']);
    expect(resetCards(s)).toEqual(emptyCards());
    expect(Object.keys(s.cards)).toHaveLength(3);
  });

  it('merges two records card by card, the more recent rating winning, and merging twice changes nothing', () => {
    const older = { ...good, box: 4, last: '2026-11-01T09:00:00.000Z' };
    const newer = { ...good, box: 1, rating: 'again', last: '2026-11-19T09:00:00.000Z' };
    const a = parseCards({ v: 1, cards: { 'term:a': older, 'term:b': good } });
    const b = parseCards({ v: 1, cards: { 'term:a': newer, 'term:c': good } });
    const m = mergeCards(a, b);
    expect(Object.keys(m.cards).sort()).toEqual(['term:a', 'term:b', 'term:c']);
    expect(m.cards['term:a']).toMatchObject({ box: 1, rating: 'again' });
    expect(mergeCards(m, b)).toEqual(m);
    expect(mergeCards(b, a).cards['term:a']).toMatchObject({ box: 1 });
  });

  it('is cleaned and combined when a workspace export is imported', () => {
    const file = (cards: unknown) =>
      JSON.stringify({ format: EXPORT_FORMAT, version: EXPORT_VERSION, site: 'x', exported: '2026-11-20T09:00:00.000Z', note: '', items: { 'bb:cards': JSON.stringify(cards) } });
    const check = checkImport(file({ v: 1, cards: { 'term:a': { ...good, last: '2026-11-19T09:00:00.000Z' }, 'term:bad': { box: 9 } } }));
    expect(check.ok).toBe(true);
    if (!check.ok) return;
    const item = check.items.find((i) => i.key === 'bb:cards');
    expect(JSON.parse(item?.value ?? '{}').cards).toEqual({ 'term:a': { ...good, last: '2026-11-19T09:00:00.000Z' } });
    const here = JSON.stringify({ v: 1, cards: { 'term:a': { ...good, box: 5, last: '2026-11-20T09:00:00.000Z' }, 'term:z': good } });
    const plan = planWorkspaceImport({ 'bb:cards': here }, check.items);
    const merged = JSON.parse(plan.find((w) => w.key === 'bb:cards')?.value ?? '{}');
    expect(Object.keys(merged.cards).sort()).toEqual(['term:a', 'term:z']);
    expect(merged.cards['term:a'].box).toBe(5);
  });
});

describe('card ids for recall questions', () => {
  it('are built from the code and the start of the question, and are unique within a set', () => {
    const ids = recallIds('3.5', ['Why does the acid test ratio leave out stock?', 'Why does the acid test ratio leave out stock?', 'What does ROCE measure?']);
    expect(ids).toEqual(['recall:3-5-why-does-the-acid-test-ratio-leave-out-stock', 'recall:3-5-why-does-the-acid-test-ratio-leave-out-stock-2', 'recall:3-5-what-does-roce-measure']);
  });

  it('keep their id when a question is added before them', () => {
    const qs = ['What is a stakeholder?', 'Name three internal stakeholders.'];
    const a = recallIds('1.4', qs);
    const b = recallIds('1.4', ['A new first question?', ...qs]);
    expect(b.slice(1)).toEqual(a);
  });

  it('cut a long question at a word boundary', () => {
    const [id] = recallIds('2.4', ['A firm employed 120 people at the start of the year and 140 at the end, and 26 left during the year. Calculate labour turnover.']);
    expect(id).toBe('recall:2-4-a-firm-employed-120-people-at-the-start-of-the');
    expect((id ?? '').length).toBeLessThanOrEqual('recall:2-4-'.length + 48);
  });

  it('read the HL mark in the question text', () => {
    for (const q of ['(HL) Name McClelland’s three needs.', '(HL only) A machine costs $20,000.', 'HL only. Why is the cost not discounted?', 'HL only: a 10% price rise.']) {
      expect(recallIsHL(q), q).toBe(true);
    }
    expect(recallIsHL('What is labour turnover (HL)?')).toBe(false);
    expect(withoutHLMark('(HL) Name the three needs.')).toBe('Name the three needs.');
    expect(withoutHLMark('HL only: a 10% price rise.')).toBe('a 10% price rise.');
  });
});

describe('filters', () => {
  const cards = [
    card('term:a'),
    card('term:b', { codes: ['3.6'], level: 'HL' }),
    card('framework:c', { kind: 'framework', codes: ['1.3', '4.2'] }),
    card('framework:d', { kind: 'framework', codes: ['1.3'], enrichment: true }),
    card('formula:e', { kind: 'formula', codes: ['4.3', 'toolkit'], level: 'HL' }),
  ];
  const ids = (f: typeof NO_FILTERS) => cards.filter((c) => matchesFilters(c, f)).map((c) => c.id);

  it('leave out enrichment until it is asked for', () => {
    expect(ids(NO_FILTERS)).toEqual(['term:a', 'term:b', 'framework:c', 'formula:e']);
    expect(ids({ ...NO_FILTERS, enrichment: true })).toContain('framework:d');
  });

  it('filter by unit, subtopic, kind and level', () => {
    expect(unitOfCode('3.5')).toBe('3');
    expect(unitOfCode('toolkit')).toBe('toolkit');
    expect(ids({ ...NO_FILTERS, unit: '3' })).toEqual(['term:a', 'term:b']);
    expect(ids({ ...NO_FILTERS, unit: '4' })).toEqual(['framework:c', 'formula:e']);
    expect(ids({ ...NO_FILTERS, unit: 'toolkit' })).toEqual(['formula:e']);
    expect(ids({ ...NO_FILTERS, code: '1.3' })).toEqual(['framework:c']);
    expect(ids({ ...NO_FILTERS, kind: 'formula' })).toEqual(['formula:e']);
    expect(ids({ ...NO_FILTERS, level: 'sl' })).toEqual(['term:a', 'framework:c']);
    expect(ids({ ...NO_FILTERS, level: 'hl' })).toEqual(['term:b', 'formula:e']);
  });

  it('read ?topic= and the rest from the address, ignoring what the deck does not know', () => {
    const codes = new Set(['3.5', '3.6', 'toolkit']);
    expect(filtersFromQuery('?topic=3.5', { codes })).toEqual({ ...NO_FILTERS, code: '3.5', unit: '3', levelSet: false });
    expect(filtersFromQuery('?topic=9.9&unit=4&type=formula&level=HL&enrichment=1', { codes })).toEqual({ unit: '4', code: '', kind: 'formula', level: 'hl', enrichment: true, levelSet: true });
    expect(filtersFromQuery('?type=nonsense&unit=7&level=x', { codes })).toEqual({ ...NO_FILTERS, levelSet: false });
    expect(filtersFromQuery('?topic=toolkit', { codes })).toMatchObject({ code: 'toolkit', unit: 'toolkit' });
  });

  it('write the address back, a subtopic implying its unit', () => {
    expect(queryFromFilters(NO_FILTERS)).toBe('');
    expect(queryFromFilters({ ...NO_FILTERS, unit: '3', code: '3.5' })).toBe('?topic=3.5');
    expect(queryFromFilters({ ...NO_FILTERS, unit: '2', kind: 'distinction', level: 'sl', enrichment: true })).toBe('?unit=2&type=distinction&level=sl&enrichment=1');
    const round = { ...NO_FILTERS, code: '3.6', unit: '3', kind: 'recall' as const, level: 'hl' as const };
    const { levelSet: _set, ...back } = filtersFromQuery(queryFromFilters(round), { codes: new Set(['3.6']) });
    expect(back).toEqual(round);
  });

  it('start an SL reader on SL cards, unless they asked for an HL-only subtopic', () => {
    expect(defaultLevel('SL', false)).toBe('sl');
    expect(defaultLevel('SL', true)).toBe('all');
    expect(defaultLevel('HL', false)).toBe('all');
    expect(defaultLevel(null, false)).toBe('all');
  });
});

describe('queues and sessions', () => {
  const today = '2026-11-20';
  const deck = ['a', 'b', 'c', 'd', 'e', 'f'].map((x) => card(`term:${x}`));
  const rec = (box: 1 | 2 | 3 | 4 | 5, due: string) => ({ box, due, seen: 1, last: '2026-11-01T09:00:00.000Z', rating: 'good' as const, codes: ['3.5'], title: 't' });
  const state: CardsState = {
    v: 1,
    cards: {
      'term:b': rec(3, '2026-11-20'),
      'term:c': rec(1, '2026-11-18'),
      'term:d': rec(2, '2026-11-25'),
      'term:e': rec(1, '2026-11-20'),
      'term:gone': rec(1, '2026-11-01'),
    },
  };

  it('count the selection: new, due today and not yet due, and the boxes of the cards seen', () => {
    expect(tallyOf(deck, state, today)).toEqual({ total: 6, fresh: 2, due: 3, later: 1, boxes: [2, 1, 1, 0, 0] });
    expect(dueCount(state, today)).toBe(4);
    expect(dueCount(state, today, new Set(deck.map((c) => c.id)))).toBe(3);
  });

  it('put the longest overdue first, then the lower boxes, and keep course order for new cards', () => {
    expect(queueFor('due', deck, state, today)).toEqual(['term:c', 'term:e', 'term:b']);
    expect(queueFor('new', deck, state, today)).toEqual(['term:a', 'term:f']);
    expect(queueFor('new', deck, state, today, { newLimit: 1 })).toEqual(['term:a']);
    expect(queueFor('all', deck, state, today)).toEqual(deck.map((c) => c.id));
  });

  it('shuffle with the random source given, keeping every card', () => {
    let seed = 7;
    const rng = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const mixed = queueFor('all', deck, state, today, { shuffle: true, rng });
    expect([...mixed].sort()).toEqual(deck.map((c) => c.id).sort());
    expect(mixed).not.toEqual(deck.map((c) => c.id));
    expect(shuffled([1, 2, 3], () => 0)).toEqual([2, 3, 1]);
  });

  it('bring a card answered Again back once at the end of the session', () => {
    let s = startSession(['term:a', 'term:b', 'term:c']);
    expect(currentCard(s)).toBe('term:a');
    s = answer(s, 'again');
    expect(s.queue).toEqual(['term:b', 'term:c', 'term:a']);
    s = answer(s, 'good');
    s = answer(s, 'again');
    expect(s.queue).toEqual(['term:a', 'term:c']);
    s = answer(s, 'again');
    // Already waiting at the back: not queued twice.
    expect(s.queue).toEqual(['term:c', 'term:a']);
    s = answer(answer(s, 'easy'), 'hard');
    expect(currentCard(s)).toBeUndefined();
    expect(answer(s, 'good')).toBe(s);
    expect(s.log.map((e) => e.rating)).toEqual(['again', 'good', 'again', 'again', 'easy', 'hard']);
  });

  it('sum up a session from the ratings and the boxes they left', () => {
    const now = at(2026, 11, 20);
    let st = emptyCards();
    let s = startSession(['term:a', 'term:b', 'term:c']);
    const rate = (r: 'again' | 'hard' | 'good' | 'easy') => {
      const id = currentCard(s)!;
      st = rateCard(st, { id, codes: ['3.5'], title: id }, r, now);
      s = answer(s, r);
    };
    rate('again');
    rate('good');
    rate('easy');
    rate('hard');
    const sum = summarize(s, st, '2026-11-20');
    expect(sum).toEqual({ answers: 4, cards: 3, tally: { again: 1, hard: 1, good: 1, easy: 1 }, stillDue: 0, next: { day: '2026-11-21', count: 1 }, boxes: [1, 1, 1, 0, 0] });
    expect(summaryWords(sum, '2026-11-20')).toBe('You rated 3 cards (4 answers in all): 1 Again, 1 Hard, 1 Good, 1 Easy. Next: 1 card due tomorrow.');
    expect(summaryWords(summarize(startSession(['term:x']), st, '2026-11-20'), '2026-11-20')).toBe('No cards were rated in this session.');
  });
});
