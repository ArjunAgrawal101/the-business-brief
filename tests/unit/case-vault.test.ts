/**
 * The Case Vault's pure functions: ISO weeks and the weekly rotation (checked
 * against dates worked by hand), the filters, the sorts and the query string.
 * Then the archive itself: every case loads into the vault, and the
 * classification is complete for every case that carries it.
 */
import { describe, expect, it } from 'vitest';
import {
  caseOfTheWeek,
  countText,
  facetCounts,
  featureNote,
  filterCases,
  filtersFromQuery,
  fold,
  isoWeek,
  NO_FILTERS,
  queryFromFilters,
  renderFeature,
  rotationOrder,
  servesTopic,
  sortCases,
  toVaultCase,
  weekIndex,
  weekLabel,
  weekMonday,
  weekRange,
  type VaultCase,
  type VaultFilters,
} from '../../src/lib/case-vault';
import { isClassified } from '../../src/lib/integrity-cases';
import { loadCorpus } from './helpers/corpus';

const day = (y: number, m: number, d: number) => ({ y, m, d });

describe('ISO weeks', () => {
  it('numbers weeks as ISO 8601 does, across the ends of years', () => {
    // 1 January 2026 is a Thursday, so week 1 of 2026 runs from Monday 29 December 2025.
    expect(isoWeek(day(2026, 1, 1))).toEqual({ year: 2026, week: 1 });
    expect(isoWeek(day(2025, 12, 29))).toEqual({ year: 2026, week: 1 });
    expect(isoWeek(day(2025, 12, 28))).toEqual({ year: 2025, week: 52 });
    // 309 days after 29 December 2025: 44 whole weeks, so week 45.
    expect(isoWeek(day(2026, 11, 3))).toEqual({ year: 2026, week: 45 });
    expect(isoWeek(day(2026, 11, 8))).toEqual({ year: 2026, week: 45 });
    expect(isoWeek(day(2026, 11, 9))).toEqual({ year: 2026, week: 46 });
    // A year that starts on a Thursday has 53 weeks: 1 January 2027 (a Friday) is in week 53 of 2026.
    expect(isoWeek(day(2027, 1, 1))).toEqual({ year: 2026, week: 53 });
    expect(isoWeek(day(2027, 1, 4))).toEqual({ year: 2027, week: 1 });
    // 2020 was a leap year starting on a Wednesday: also 53 weeks.
    expect(isoWeek(day(2021, 1, 3))).toEqual({ year: 2020, week: 53 });
    // 1 January 2025 is a Wednesday, so Monday 30 December 2024 starts week 1 of 2025.
    expect(isoWeek(day(2024, 12, 30))).toEqual({ year: 2025, week: 1 });
    expect(isoWeek(day(2024, 1, 1))).toEqual({ year: 2024, week: 1 });
  });

  it('finds the Monday of the week, and counts weeks from the rotation’s first Monday', () => {
    expect(weekMonday(day(2026, 11, 3))).toEqual(day(2026, 11, 2));
    expect(weekMonday(day(2026, 11, 2))).toEqual(day(2026, 11, 2));
    expect(weekMonday(day(2027, 1, 3))).toEqual(day(2026, 12, 28));
    expect(weekIndex(day(2024, 1, 1))).toBe(0);
    expect(weekIndex(day(2024, 1, 7))).toBe(0);
    expect(weekIndex(day(2024, 1, 8))).toBe(1);
    expect(weekIndex(day(2023, 12, 31))).toBe(-1);
    // 1 January 2024 to 2 November 2026 is 366 + 365 + 305 = 1,036 days, or 148 weeks.
    expect(weekIndex(day(2026, 11, 3))).toBe(148);
  });

  it('writes the week in words, whichever months and years it spans', () => {
    expect(weekLabel({ year: 2026, week: 45 })).toBe('Week 45 of 2026');
    expect(weekRange(day(2026, 11, 2))).toBe('2 to 8 November 2026');
    expect(weekRange(day(2026, 3, 30))).toBe('30 March to 5 April 2026');
    expect(weekRange(day(2026, 12, 28))).toBe('28 December 2026 to 3 January 2027');
  });
});

describe('the Case of the Week', () => {
  const order = rotationOrder(['c', 'a', 'b']);

  it('rotates by id, one case a week, and wraps round', () => {
    expect(order).toEqual(['a', 'b', 'c']);
    // Week index 148: 148 = 49 × 3 + 1, so the second case.
    expect(caseOfTheWeek(order, day(2026, 11, 3))).toMatchObject({ id: 'b', position: 1, year: 2026, week: 45 });
    expect(caseOfTheWeek(order, day(2026, 11, 9))?.id).toBe('c');
    expect(caseOfTheWeek(order, day(2026, 11, 16))?.id).toBe('a');
    // Every day of a week gives the same case.
    for (let d = 2; d <= 8; d++) expect(caseOfTheWeek(order, day(2026, 11, d))?.id).toBe('b');
    // Before the first Monday the count is negative, and still lands on a case.
    expect(caseOfTheWeek(order, day(2023, 12, 31))?.id).toBe('c');
    // Across the end of a year the rotation runs on without a jump.
    expect(caseOfTheWeek(order, day(2026, 12, 31))?.id).not.toBe(caseOfTheWeek(order, day(2027, 1, 4))?.id);
    expect(caseOfTheWeek([], day(2026, 11, 3))).toBeNull();
  });

  it('says which week it is for, and never presents the case as news', () => {
    const pick = caseOfTheWeek(order, day(2026, 11, 3));
    if (!pick) throw new Error('no pick');
    expect(featureNote(pick, { basis: 'build', built: day(2026, 11, 3) })).toBe(
      'Week 45 of 2026, 2 to 8 November 2026: the week this page was built (3 November 2026). With JavaScript on, the page chooses the case for the week of your own date.',
    );
    expect(featureNote(pick, { basis: 'reader' })).toBe("Week 45 of 2026, 2 to 8 November 2026: chosen for the week of your device's date.");
    const html = renderFeature(sample[0] as VaultCase, pick, { basis: 'reader' });
    expect(html).toContain('Case of the Week');
    expect(html).toContain('not news');
    expect(html).not.toMatch(/\b(today|latest|breaking|live)\b/i);
    expect(html).toContain('&lt;b&gt;'); // escaped, never raw
    expect(html).not.toContain('#exercise'); // the first sample case has no exercise
    expect(renderFeature(sample[1] as VaultCase, pick, { basis: 'reader' })).toContain('/cases/b/#exercise');
  });
});

const base = (o: Partial<VaultCase>): VaultCase => ({
  id: 'x',
  title: 'X',
  dek: '',
  decision: '',
  href: '/cases/x/',
  location: '',
  industry: '',
  functions: [],
  difficulty: '',
  qualifications: [],
  keyConcepts: [],
  caseType: 'fictional',
  syllabus: [],
  exhibits: 0,
  questions: 0,
  hasExercise: false,
  updated: '2026-10-29',
  text: '',
  ...o,
});
const sample: VaultCase[] = [
  base({ id: 'a', title: 'Alder <b>Retail</b>', industry: 'retail', functions: ['finance'], difficulty: 'intermediate', qualifications: ['ib-dp-sl', 'ib-dp-hl'], keyConcepts: ['sustainability'], syllabus: ['3.5', '3.7'], text: fold('Alder retail Brisbane cash flow') }),
  base({ id: 'b', title: 'Birch Motors', href: '/cases/b/', hasExercise: true, industry: 'automobile', functions: ['finance', 'operations'], difficulty: 'advanced', qualifications: ['ib-dp-hl', 'mba'], keyConcepts: ['change'], syllabus: ['3.8', '5.4'], updated: '2026-11-03', text: fold('Birch motors investment appraisal Monterrey') }),
  base({ id: 'c', title: 'Cedar Clinics', industry: 'healthcare', functions: ['human-resources'], difficulty: 'foundation', qualifications: ['ib-dp-sl', 'ib-dp-hl', 'undergraduate'], keyConcepts: ['ethics', 'sustainability'], syllabus: ['2.4', '2.5'], text: fold('Cedar clinics nurses Inês') }),
  base({ id: 'd', title: 'Dogwood', syllabus: [], caseType: '', text: 'dogwood' }),
];
const f = (o: Partial<VaultFilters>): VaultFilters => ({ ...NO_FILTERS, ...o });
const ids = (list: VaultCase[]) => list.map((x) => x.id);

describe('the filters', () => {
  it('match on every facet, and combine', () => {
    expect(ids(filterCases(sample, NO_FILTERS))).toEqual(['a', 'b', 'c', 'd']);
    expect(ids(filterCases(sample, f({ industry: 'retail' })))).toEqual(['a']);
    expect(ids(filterCases(sample, f({ function: 'finance' })))).toEqual(['a', 'b']);
    expect(ids(filterCases(sample, f({ function: 'finance', difficulty: 'advanced' })))).toEqual(['b']);
    expect(ids(filterCases(sample, f({ qualification: 'ib-dp-sl' })))).toEqual(['a', 'c']);
    expect(ids(filterCases(sample, f({ concept: 'sustainability' })))).toEqual(['a', 'c']);
    expect(ids(filterCases(sample, f({ type: 'fictional' })))).toEqual(['a', 'b', 'c']);
    expect(ids(filterCases(sample, f({ industry: 'retail', concept: 'change' })))).toEqual([]);
  });

  it('take a subtopic or a whole unit as the topic', () => {
    expect(servesTopic(['3.5', '3.7'], '3.7')).toBe(true);
    expect(servesTopic(['3.5', '3.7'], '3.8')).toBe(false);
    expect(servesTopic(['3.5'], 'unit-3')).toBe(true);
    expect(servesTopic(['2.4'], 'unit-3')).toBe(false);
    expect(servesTopic([], '')).toBe(true);
    expect(ids(filterCases(sample, f({ topic: 'unit-3' })))).toEqual(['a', 'b']);
    expect(ids(filterCases(sample, f({ topic: '2.5' })))).toEqual(['c']);
  });

  it('search every word, ignoring case and accents', () => {
    expect(ids(filterCases(sample, f({ q: 'cash FLOW' })))).toEqual(['a']);
    expect(ids(filterCases(sample, f({ q: 'ines' })))).toEqual(['c']);
    expect(ids(filterCases(sample, f({ q: 'investment brisbane' })))).toEqual([]);
    expect(ids(filterCases(sample, f({ q: '   ' })))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('count each value given the other filters', () => {
    expect(facetCounts(sample, NO_FILTERS, 'industry', ['retail', 'automobile', 'aviation'])).toEqual({ retail: 1, automobile: 1, aviation: 0 });
    // With "finance" chosen, foundation (Cedar) drops out; the difficulty filter itself is ignored when counting difficulties.
    expect(facetCounts(sample, f({ function: 'finance', difficulty: 'advanced' }), 'difficulty', ['foundation', 'intermediate', 'advanced'])).toEqual({ foundation: 0, intermediate: 1, advanced: 1 });
    expect(countText(4, 4)).toBe('All 4 cases');
    expect(countText(1, 4)).toBe('Showing 1 of 4 cases');
    expect(countText(0, 1)).toBe('Showing 0 of 1 case');
  });
});

describe('sorting and the address', () => {
  it('sorts by title, difficulty either way and date, with unrated cases last', () => {
    expect(ids(sortCases(sample, 'title'))).toEqual(['a', 'b', 'c', 'd']);
    expect(ids(sortCases(sample, 'difficulty-up'))).toEqual(['c', 'a', 'b', 'd']);
    expect(ids(sortCases(sample, 'difficulty-down'))).toEqual(['b', 'a', 'c', 'd']);
    expect(ids(sortCases(sample, 'updated'))[0]).toBe('b');
  });

  it('keeps a selection in the query string and reads it back', () => {
    const sel = f({ industry: 'retail', topic: '3.7', q: 'cash flow' });
    const q = queryFromFilters(sel, 'difficulty-up');
    expect(q).toBe('?industry=retail&topic=3.7&q=cash+flow&sort=difficulty-up');
    expect(filtersFromQuery(q)).toEqual({ filters: sel, sort: 'difficulty-up' });
    expect(queryFromFilters(NO_FILTERS)).toBe('');
    expect(filtersFromQuery('?sort=nonsense&colour=red').sort).toBe('title');
    expect(filtersFromQuery('?sort=nonsense&colour=red').filters).toEqual(NO_FILTERS);
  });
});

describe('the archive', () => {
  const c = loadCorpus();
  const all = Object.entries(c.cases).map(([id, cs]) => toVaultCase(id, cs, `/cases/${id}/`));

  it('holds every case, with the decision and the search text', () => {
    expect(all.length).toBeGreaterThanOrEqual(9);
    for (const vc of all) {
      expect(vc.title.length, vc.id).toBeGreaterThan(0);
      expect(vc.decision.length, vc.id).toBeGreaterThan(0);
      expect(vc.text, vc.id).toBe(fold(vc.text));
    }
  });

  it('classifies every case fully, so every filter can find it', () => {
    for (const [id, cs] of Object.entries(c.cases)) {
      expect(isClassified(cs), id).toBe(true);
      expect(cs.industry, id).toBeDefined();
      expect(cs.difficulty, id).toBeDefined();
      expect(cs.caseType, id).toBeDefined();
    }
  });
});
