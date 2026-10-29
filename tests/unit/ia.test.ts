import { describe, expect, it } from 'vitest';
import { ageInMonths, checkDocuments, daysBefore, earliestAllowed, monthIndex, selfMarkTotal, wordStatus, type SupportingDoc } from '../../src/lib/ia';

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

describe('supporting documents', () => {
  const five = [1, 2, 3, 4, 5].map((k) => doc({ title: `D${k}`, publisher: `P${k}` }));

  it('accepts five recent, short documents from different publishers', () => {
    expect(problems(five)).toEqual([]);
  });

  it('requires three to five, and warns that more than five caps criterion B at 1', () => {
    expect(problems(five.slice(0, 2))[0]?.text).toMatch(/three to five/);
    expect(problems([...five, doc({ title: 'D6', publisher: 'P6' })])[0]?.text).toMatch(/criterion B to 1 mark/);
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
