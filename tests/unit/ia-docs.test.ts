import { describe, expect, it } from 'vitest';
import { blankDoc, checkDocuments, parseAnalyserState, submissionOf, type Doc } from '../../src/lib/ia-docs';
import { checkDocuments as plannerChecks, type SupportingDoc } from '../../src/lib/ia';

const doc = (over: Partial<Doc> = {}): Doc => ({ ...blankDoc(), title: 'Accounts', published: '2026-01', data: true, ...over });
const five = (): Doc[] => [
  doc({ voice: 'org' }),
  doc({ title: 'Footfall survey', voice: 'independent' }),
  doc({ title: 'Own survey', voice: 'primary' }),
  doc({ title: 'Press report', voice: 'sceptical' }),
  doc({ title: 'Agent listing', voice: 'commercial' }),
];
const find = (checks: ReturnType<typeof checkDocuments>, re: RegExp) => checks.find((c) => re.test(c.text));

describe('the supporting-document checker on the internal assessment page', () => {
  it('accepts five recent documents of your own, with a range of voices', () => {
    const checks = checkDocuments(five(), '2027-04');
    expect(checks.filter((c) => c.ok === false)).toEqual([]);
    expect(find(checks, /documents: the guide asks for three to five/)?.ok).toBe(true);
  });

  it('checks dates to the month, as the planner does', () => {
    const edge = [...five().slice(0, 4), doc({ title: 'Edge', published: '2024-04' })];
    expect(find(checkDocuments(edge, '2027-04'), /within the three years/)?.ok).toBe(true);
    const old = [...five().slice(0, 4), doc({ title: 'Old', published: '2024-03' })];
    const verdict = find(checkDocuments(old, '2027-04'), /more than three years/);
    expect(verdict?.ok).toBe(false);
    expect(verdict?.text).toContain('the earliest allowed is April 2024');
  });

  it('asks for the month when the year alone cannot settle it, and settles it when it can', () => {
    const borderline = checkDocuments([...five().slice(0, 4), doc({ title: 'Year only', published: '2024' })], '2027-04');
    const v = find(borderline, /without a month/);
    expect(v?.ok).toBe(false);
    expect(v?.text).toContain('2024');
    const clear = checkDocuments([...five().slice(0, 4), doc({ title: 'Year only', published: '2025' })], '2027-04');
    expect(find(clear, /within the three years/)?.ok).toBe(true);
  });

  it('gives the same verdict on dates as the planner and the documents tool, for the same documents', () => {
    const dates = ['2024-03', '2024-04', '2026-11', '2027-05', '2023-12', '2027-04'];
    for (const published of dates) {
      for (const submission of ['2027-04', '2026-10']) {
        const page = checkDocuments([doc({ published })], submission).some((c) => c.ok === false && /published more than three years|dated after/.test(c.text));
        const planner = plannerChecks([{ title: 'D', publisher: 'P', published, kind: 'secondary', pages: 1, selected: true } satisfies SupportingDoc], submission).some(
          (f) => f.severity === 'problem' && /more than three years|after the submission/.test(f.text),
        );
        expect(page, `${published} for ${submission}`).toBe(planner);
      }
    }
  });

  it('labels each check by its standing: the guide, or the platform', () => {
    const checks = checkDocuments(five(), '2027-04');
    expect(find(checks, /three to five/)?.standing).toBe('ib');
    expect(find(checks, /three to five/)?.source).toBe('Guide, pp. 53 and 57');
    expect(find(checks, /different voices/)?.standing).toBe('strategy');
    expect(find(checks, /data you can analyse/)?.standing).toBe('strategy');
    expect(checks.every((c) => c.standing !== 'examiner')).toBe(true);
  });

  it('keeps the guide’s rule on balance apart from the platform’s count of voices', () => {
    const all = checkDocuments([doc(), doc({ title: 'B' }), doc({ title: 'C' })], '2027-04');
    const balance = find(all, /from the organization itself/);
    expect(balance?.ok).toBe(false);
    expect(balance?.standing).toBe('ib');
    expect(balance?.source).toBe('Guide, pp. 54 and 57');
    const two = checkDocuments([doc(), doc({ title: 'B', voice: 'independent' }), doc({ title: 'C', voice: 'independent' })], '2027-04');
    expect(find(two, /Not every document speaks for the organization/)?.ok).toBe(true);
    expect(find(two, /2 different voices/)?.ok).toBe('tip');
  });

  it('marks the guide’s musts, shoulds and recommendations for what they are', () => {
    const long = checkDocuments([...five().slice(0, 4), doc({ title: 'Report', long: true })], '2027-04');
    expect(find(long, /longer than five A4 pages/)?.ok).toBe('tip');
    expect(find(long, /highlight the parts you use/)?.why).toContain('Both are musts');
    const transcript = find(checkDocuments([doc({ transcript: true }), doc({ title: 'T2', transcript: true })], '2027-04'), /transcripts/);
    expect(transcript?.ok).toBe(false);
    expect(transcript?.why).toContain('essential points');
  });

  it('reads saved work defensively, including older saves that kept only the year', () => {
    expect(parseAnalyserState(null)).toEqual({ docs: [], year: null, month: 'april' });
    const old = parseAnalyserState({ docs: [{ title: 'Accounts', year: '2025', voice: 'org', data: true }, 'junk', { title: 'X', year: 'soon', voice: 'nobody' }], year: 2027, month: 9 });
    expect(old.year).toBe(2027);
    expect(old.month).toBe('october');
    expect(old.docs).toHaveLength(2);
    expect(old.docs[0]).toMatchObject({ title: 'Accounts', published: '2025', voice: 'org', data: true, long: false });
    expect(old.docs[1]).toMatchObject({ title: 'X', published: '', voice: 'org' });
    expect(submissionOf(old)).toBe('2027-10');
    expect(submissionOf({ docs: [], year: null, month: 'april' })).toBe('');
    const now = parseAnalyserState({ docs: [{ title: 'A', published: '2026-02' }], year: 2027, month: 'april' });
    expect(now.docs[0]?.published).toBe('2026-02');
  });
});
