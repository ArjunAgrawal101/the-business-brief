import { describe, expect, it } from 'vitest';
import {
  byDateDesc,
  dateKey,
  dateParts,
  facetsOf,
  filterSummary,
  filtersFromQuery,
  formatDate,
  itemCount,
  latest,
  matches,
  onOrBefore,
  parseDate,
  queryFromFilters,
  unitOf,
} from '../../src/lib/briefing';

describe('briefing dates', () => {
  it('formats a day and a month the British way', () => {
    expect(formatDate('2025-09-22')).toBe('22 September 2025');
    expect(formatDate('2026-03-01')).toBe('1 March 2026');
    expect(formatDate('2025-10')).toBe('October 2025');
  });

  it('splits a date for the dated list', () => {
    expect(dateParts('2026-06-10')).toEqual({ day: '10', month: 'Jun', year: '2026' });
    expect(dateParts('2025-10')).toEqual({ day: undefined, month: 'Oct', year: '2025' });
  });

  it('rejects dates that do not exist', () => {
    expect(() => parseDate('2026-02-30')).toThrow();
    expect(() => parseDate('2026-13')).toThrow();
    expect(() => parseDate('22/09/2025')).toThrow();
    expect(() => parseDate('2024-02-29')).not.toThrow();
  });

  it('sorts a month before every day in it', () => {
    expect(dateKey('2025-10')).toBe('2025-10-00');
    expect(dateKey('2025-10') < dateKey('2025-10-01')).toBe(true);
    expect(dateKey('2025-09-30') < dateKey('2025-10')).toBe(true);
  });

  it('compares dates only on what both state', () => {
    expect(onOrBefore('2025-09-22', '2025-09-22')).toBe(true);
    expect(onOrBefore('2025-09-23', '2025-09-22')).toBe(false);
    expect(onOrBefore('2025-10', '2025-10-14')).toBe(true);
    expect(onOrBefore('2025-10-14', '2025-10')).toBe(true);
    expect(onOrBefore('2025-11', '2025-10-31')).toBe(false);
    expect(onOrBefore('2024-12-31', '2025-01')).toBe(true);
  });

  it('finds the latest day', () => {
    expect(latest(['2026-11-03', '2026-10-14', '2025-01-01'])).toBe('2026-11-03');
    expect(latest([])).toBeUndefined();
  });

  it('orders items newest first, and by id on the same date', () => {
    const items: Array<[string, { date: string }]> = [
      ['b', { date: '2025-10' }],
      ['a', { date: '2026-06-10' }],
      ['d', { date: '2025-11-06' }],
      ['c', { date: '2025-11-06' }],
    ];
    expect(byDateDesc(items).map(([id]) => id)).toEqual(['a', 'c', 'd', 'b']);
  });
});

describe('briefing facets and filters', () => {
  const item = {
    concepts: { subtopics: [{ code: '3.7' }, { code: '3.2' }, { code: '1.5' }, { code: '3.10' }], tools: [{ id: 'swot-analysis' }] },
    keyConcepts: ['change'],
    categories: ['financial-results', 'corporate-strategy'],
  };

  it('works out an item\'s units in order, with the toolkit when it uses a tool', () => {
    expect(unitOf('3.7')).toBe('3');
    expect(facetsOf(item).units).toEqual(['1', '3', 'toolkit']);
    expect(facetsOf({ ...item, concepts: { ...item.concepts, tools: [] } }).units).toEqual(['1', '3']);
  });

  it('passes an item through filters it meets, and only those', () => {
    const f = facetsOf(item);
    expect(matches(f, {})).toBe(true);
    expect(matches(f, { unit: '3' })).toBe(true);
    expect(matches(f, { unit: '4' })).toBe(false);
    expect(matches(f, { unit: 'toolkit', concept: 'change' })).toBe(true);
    expect(matches(f, { concept: 'ethics' })).toBe(false);
    expect(matches(f, { kind: 'corporate-strategy' })).toBe(true);
    expect(matches(f, { unit: '3', kind: 'innovation' })).toBe(false);
  });

  it('says how many items are showing', () => {
    expect(itemCount(1)).toBe('1 item');
    expect(itemCount(8)).toBe('8 items');
    expect(filterSummary(8, 8)).toBe('Showing all 8 items');
    expect(filterSummary(3, 8)).toBe('Showing 3 of 8 items');
    expect(filterSummary(0, 8)).toBe('No items match these filters, out of 8 items');
  });

  it('reads filters from the address, ignoring values the page does not offer', () => {
    const allowed = { units: ['1', '2', '3', '4', '5', 'toolkit'], concepts: ['change', 'ethics'], kinds: ['innovation'] };
    expect(filtersFromQuery('?unit=3&concept=ethics&kind=innovation', allowed)).toEqual({ unit: '3', concept: 'ethics', kind: 'innovation' });
    expect(filtersFromQuery('?unit=9&concept=<b>&kind=', allowed)).toEqual({ unit: undefined, concept: undefined, kind: undefined });
  });

  it('writes filters back to the address without empty values', () => {
    expect(queryFromFilters({})).toBe('');
    expect(queryFromFilters({ unit: '3' })).toBe('?unit=3');
    expect(queryFromFilters({ unit: 'toolkit', concept: 'ethics', kind: 'innovation' })).toBe('?unit=toolkit&concept=ethics&kind=innovation');
  });
});
