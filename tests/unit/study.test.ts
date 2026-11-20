import { describe, expect, it } from 'vitest';
import { SIZE_LABELS, STUDY_EARLY, TEXT_SIZES, contentsLabel, currentSection, defaultStudy, parseStudy, readingProgress } from '../../src/lib/study';

describe('study mode preferences', () => {
  it('reads bb:study, falling back to the standard size in daylight', () => {
    expect(TEXT_SIZES).toHaveLength(3);
    expect(SIZE_LABELS).toEqual(['Standard', 'Large', 'Larger']);
    for (const raw of [null, undefined, '', '{oops', '[]', 42, { size: 7, low: 'yes' }]) expect(parseStudy(raw)).toEqual(defaultStudy());
    expect(parseStudy('{"v":1,"size":2,"low":true}')).toEqual({ v: 1, size: 2, low: true });
    expect(parseStudy({ size: 1 })).toEqual({ v: 1, size: 1, low: false });
  });
});

/** Runs the inline script against a stand-in for the page: its own element, the article it closes on, and storage. */
function runEarly(stored: string | null, opts: { throws?: boolean; noRoot?: boolean } = {}) {
  const attrs: Record<string, string> = {};
  const root = {
    setAttribute: (k: string, v: string) => {
      attrs[k] = v;
    },
  };
  const script = {
    getAttribute: (k: string) => (k === 'data-root' ? '.sh-body' : null),
    closest: (sel: string) => (sel === '.sh-body' && !opts.noRoot ? root : null),
  };
  const storage = {
    getItem: (k: string) => {
      if (opts.throws) throw new Error('blocked');
      return k === 'bb:study' ? stored : null;
    },
  };
  new Function('document', 'localStorage', STUDY_EARLY)({ currentScript: script }, storage);
  return attrs;
}

describe('the inline script that applies the choice before the page is drawn', () => {
  it('marks the article and sets its size and light from bb:study', () => {
    expect(runEarly('{"v":1,"size":2,"low":true}')).toEqual({ 'data-study-root': '', 'data-study-size': '2', 'data-study-low': '' });
    expect(runEarly(null)).toEqual({ 'data-study-root': '', 'data-study-size': '0' });
    expect(runEarly('{"size":5,"low":1}')).toEqual({ 'data-study-root': '', 'data-study-size': '0' });
  });

  it('never throws: damaged storage, blocked storage or no article leave the page as it is', () => {
    expect(runEarly('{oops')).toEqual({ 'data-study-root': '' });
    expect(runEarly('null')).toEqual({ 'data-study-root': '', 'data-study-size': '0' });
    expect(runEarly('{}', { throws: true })).toEqual({ 'data-study-root': '' });
    expect(runEarly('{"size":1}', { noRoot: true })).toEqual({});
  });
});

describe('reading progress and the section in view', () => {
  it('runs from 0 when the article starts below the reading line to 1 when its end is in view', () => {
    // An article 3,000 px tall, a window 900 px tall, reading from 72 px down.
    expect(readingProgress(500, 3000, 72, 900)).toBe(0);
    expect(readingProgress(72, 3000, 72, 900)).toBe(0);
    expect(readingProgress(72 - 2172 / 2, 3000, 72, 900)).toBeCloseTo(0.5, 10);
    expect(readingProgress(72 - 2172, 3000, 72, 900)).toBe(1);
    expect(readingProgress(-5000, 3000, 72, 900)).toBe(1);
    // An article shorter than the window: read once it is in view.
    expect(readingProgress(100, 400, 72, 900)).toBe(0);
    expect(readingProgress(50, 400, 72, 900)).toBe(1);
  });

  it('is the last heading past the reading line, or the first', () => {
    expect(currentSection([300, 900, 1500], 72)).toBe(0);
    expect(currentSection([-400, 90, 1500], 72)).toBe(1);
    expect(currentSection([-900, -300, -20], 72)).toBe(2);
    expect(currentSection([], 72)).toBe(0);
  });

  it('labels a heading as it reads, without the words only screen readers hear', () => {
    expect(contentsLabel('Section 05: Break-even   analysis')).toBe('Break-even analysis');
    expect(contentsLabel('  The mindmap ')).toBe('The mindmap');
  });
});
