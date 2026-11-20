import { describe, expect, it } from 'vitest';
import {
  ageInMonths,
  checkDocuments,
  dateFinding,
  daysBefore,
  earliestAllowed,
  monthIndex,
  publishedRange,
  selfMarkTotal,
  submissionMonth,
  threeYearRule,
  wordStatus,
  type SupportingDoc,
} from '../../src/lib/ia';

const doc = (over: Partial<SupportingDoc> = {}): SupportingDoc => ({
  title: 'Annual report',
  publisher: 'Firm',
  published: '2026-01',
  kind: 'secondary',
  pages: 4,
  selected: true,
  ...over,
});

const problems = (docs: SupportingDoc[], submission = '2027-04') => checkDocuments(docs, submission).filter((f) => f.severity === 'problem');

describe('dates', () => {
  it('parses year and month', () => {
    expect(monthIndex('2027-04')).toBe(2027 * 12 + 3);
    expect(monthIndex('2027-13')).toBeNull();
    expect(monthIndex('April 2027')).toBeNull();
  });

  it('counts the three years back from submission', () => {
    expect(earliestAllowed('2027-04')).toBe('2024-04');
    expect(earliestAllowed('2027-01')).toBe('2024-01');
    expect(ageInMonths('2024-04', '2027-04')).toBe(36);
  });

  it('finds the date two weeks before a deadline, across a month boundary', () => {
    expect(daysBefore('2027-03-05', 14)).toBe('2027-02-19');
    expect(daysBefore('not a date', 14)).toBeNull();
  });
});

describe('the three-year rule, to the month (guide, p. 54)', () => {
  it('reads a month, or a year whose month is not known', () => {
    expect(publishedRange('2025-03')).toEqual({ from: 2025 * 12 + 2, to: 2025 * 12 + 2 });
    expect(publishedRange(' 2025 ')).toEqual({ from: 2025 * 12, to: 2025 * 12 + 11 });
    expect(publishedRange('March 2025')).toBeNull();
    expect(publishedRange('2025-13')).toBeNull();
  });

  it('counts from the month of submission: the same month three years earlier still counts, the month before does not', () => {
    // Submitting in April 2027, the earliest allowed is April 2024.
    expect(threeYearRule('2024-04', '2027-04')).toBe('within');
    expect(threeYearRule('2024-03', '2027-04')).toBe('too-old');
    expect(threeYearRule('2027-04', '2027-04')).toBe('within');
    expect(threeYearRule('2027-05', '2027-04')).toBe('after');
    // October submissions count back to October.
    expect(threeYearRule('2023-10', '2026-10')).toBe('within');
    expect(threeYearRule('2023-09', '2026-10')).toBe('too-old');
  });

  it('judges a year without its month only when every month of it falls on one side', () => {
    expect(threeYearRule('2025', '2027-04')).toBe('within');
    expect(threeYearRule('2023', '2027-04')).toBe('too-old');
    expect(threeYearRule('2024', '2027-04')).toBe('unclear');
    expect(threeYearRule('2027', '2027-04')).toBe('unclear');
    expect(threeYearRule('2028', '2027-04')).toBe('after');
  });

  it('says when a date or the submission is missing or cannot be read', () => {
    expect(threeYearRule('', '2027-04')).toBe('missing');
    expect(threeYearRule('soon', '2027-04')).toBe('unreadable');
    expect(threeYearRule('2026-01', '')).toBe('no-submission');
  });

  it('words the finding for the reader, naming the earliest month allowed', () => {
    expect(dateFinding('Survey', '2024-03', '2027-04')?.text).toBe('Survey: published more than three years before submission (the earliest allowed is April 2024).');
    expect(dateFinding('Survey', '2024', '2027-04')?.severity).toBe('advice');
    expect(dateFinding('Survey', '2024', '2027-04')?.text).toContain('Add the month');
    expect(dateFinding('Survey', '2026-01', '2027-04')).toBeNull();
    expect(submissionMonth(2027, 'april')).toBe('2027-04');
    expect(submissionMonth(2026, 'october')).toBe('2026-10');
  });
});

describe('supporting documents', () => {
  const five = [1, 2, 3, 4, 5].map((k) => doc({ title: `D${k}`, publisher: `P${k}` }));

  it('accepts five recent, short documents from different publishers', () => {
    expect(problems(five)).toEqual([]);
  });

  it('requires three to five, and warns that more than five caps criterion B at 1, as the guide sets it', () => {
    expect(problems(five.slice(0, 2))[0]?.text).toMatch(/three to five/);
    const six = problems([...five, doc({ title: 'D6', publisher: 'P6' })])[0];
    expect(six?.text).toMatch(/criterion B to 1 mark/);
    expect(six?.source).toBe('Guide, p. 57');
  });

  it('advises four or five when only three are chosen', () => {
    const f = checkDocuments(five.slice(0, 3), '2027-04');
    expect(f.some((x) => x.severity === 'advice' && /at least four/.test(x.text))).toBe(true);
  });

  it('ignores documents that are listed but not selected', () => {
    expect(problems([...five, doc({ selected: false, published: '2010-01' })])).toEqual([]);
  });

  it('rejects a document older than three years at submission, and accepts one exactly three years old', () => {
    expect(problems([...five.slice(0, 4), doc({ title: 'Old', publisher: 'X', published: '2024-03' })])[0]?.text).toMatch(/more than three years/);
    expect(problems([...five.slice(0, 4), doc({ title: 'Edge', publisher: 'X', published: '2024-04' })])).toEqual([]);
  });

  it('allows one transcript but not two', () => {
    expect(problems([...five.slice(0, 4), doc({ kind: 'transcript', publisher: 'X' })])).toEqual([]);
    const two = [...five.slice(0, 3), doc({ kind: 'transcript', publisher: 'X' }), doc({ kind: 'transcript', publisher: 'Y' })];
    expect(problems(two)[0]?.text).toMatch(/At most one/);
  });

  it('rejects a textbook as a supporting document', () => {
    expect(problems([...five.slice(0, 4), doc({ kind: 'textbook', publisher: 'X' })])[0]?.text).toMatch(/not accepted/);
  });

  it('advises when every document comes from one publisher, or a document is long', () => {
    const same = [1, 2, 3, 4].map((k) => doc({ title: `D${k}`, publisher: ' Firm ' }));
    expect(checkDocuments(same, '2027-04').some((f) => /same publisher/.test(f.text))).toBe(true);
    expect(checkDocuments([...five.slice(0, 4), doc({ pages: 9, publisher: 'X' })], '2027-04').some((f) => /five A4 pages/.test(f.text))).toBe(true);
  });
});

describe('word count and self-marking', () => {
  it('reports words left and words over', () => {
    expect(wordStatus(1750).text).toBe('50 words left.');
    expect(wordStatus(1800).severity).toBe('ok');
    expect(wordStatus(1801).severity).toBe('problem');
  });

  it('caps each criterion at its maximum', () => {
    const criteria = [
      { id: 'A', marks: 5 },
      { id: 'B', marks: 4 },
    ];
    expect(selfMarkTotal({ A: 9, B: 3 }, criteria)).toBe(8);
    expect(selfMarkTotal({}, criteria)).toBe(0);
  });
});
