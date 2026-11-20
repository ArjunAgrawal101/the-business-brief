/**
 * The internal assessment tools added for research methodology, evidence
 * analysis and word count planning: each check against the guide (with its
 * page), the TSM, the IA research guide or the platform, and each reader of
 * saved work against damaged input.
 */
import { describe, expect, it } from 'vitest';
import { PRIMARY_IDS, attachments, checkMethod, emptyMethod, methodSummary, parseMethod, type MethodPlan } from '../../src/lib/ia-method';
import { blankItem, emptyEvidence, evidenceCsv, itemAdvice, levelOf, parseEvidence, summarizeEvidence, type EvidenceItem } from '../../src/lib/ia-evidence';
import { NOT_COUNTED, SUGGESTED, emptyWords, parseWords, suggestedSections, summarizeWords, type Section } from '../../src/lib/ia-words';
import { IA_LIMITS } from '../../src/lib/ia';

const plan = (over: Partial<MethodPlan> = {}): MethodPlan => ({ ...emptyMethod(), ...over });
const withSurvey = (who: string, size: number | null) => ({ ...emptyMethod().primary, survey: { use: true, who, size } });

describe('the research methodology planner', () => {
  it('asks for a plan before anything is chosen, citing the guide', () => {
    const c = checkMethod(plan());
    expect(c[0]).toMatchObject({ status: 'advice', standing: 'ib', source: 'Guide, p. 53' });
  });

  it('names what to attach for primary research, as the guide asks', () => {
    const p = plan({ primary: withSurvey('cyclists near the site', 60) });
    const c = checkMethod(p);
    expect(c.find((x) => x.text.startsWith('A survey or questionnaire: attach'))).toMatchObject({ standing: 'ib', source: 'Guide, p. 54' });
    expect(attachments(p)).toEqual(['A survey or questionnaire: a blank copy of the questionnaire, and a tally or summary of the responses.']);
  });

  it('asks who and how many, and notes a small survey as the platform’s advice', () => {
    expect(checkMethod(plan({ primary: withSurvey('', null) })).some((x) => x.text.includes('say who you will ask') && x.standing === 'strategy')).toBe(true);
    const small = checkMethod(plan({ primary: withSurvey('friends', 12) })).find((x) => x.text.startsWith('A survey of 12'));
    expect(small?.standing).toBe('strategy');
    expect(checkMethod(plan({ primary: withSurvey('cyclists', 60) })).some((x) => x.text.startsWith('A survey of'))).toBe(false);
  });

  it('refuses textbooks as supporting documents, and warns on a single company’s material', () => {
    expect(checkMethod(plan({ secondary: ['press', 'textbook'] })).find((x) => x.status === 'problem')).toMatchObject({ standing: 'ib', source: 'Guide, p. 55' });
    expect(checkMethod(plan({ secondary: ['website'] })).some((x) => x.text.startsWith('Only the organization’s own material') && x.source === 'Guide, p. 54')).toBe(true);
    expect(checkMethod(plan({ secondary: ['transcript'] })).some((x) => x.text.includes('essential points'))).toBe(true);
  });

  it('gives the TSM’s advice on the form of the question as advice, under its own label', () => {
    const c = checkMethod(plan({ mainly: 'primary', form: 'backward', primary: withSurvey('cyclists', 60) }));
    expect(c.find((x) => x.source === 'TSM, p. 70')).toMatchObject({ status: 'advice', standing: 'tsm' });
    expect(checkMethod(plan({ mainly: 'primary', form: 'forward', primary: withSurvey('cyclists', 60) })).some((x) => x.source === 'TSM, p. 70')).toBe(false);
  });

  it('covers classmates on the same organization and an extended essay in business management', () => {
    const c = checkMethod(plan({ sameOrg: true, ee: true, eeSameOrg: true, secondary: ['press'] }));
    expect(c.some((x) => x.text.includes('own individual research, interpretation and analysis') && x.source === 'Guide, p. 54')).toBe(true);
    expect(c.some((x) => x.text.includes('different research approaches') && x.source === 'Guide, pp. 52 and 54')).toBe(true);
    expect(c.find((x) => x.text.includes('same organization. The guide says'))?.status).toBe('problem');
  });

  it('wants the method explained in the introduction, and briefly', () => {
    expect(checkMethod(plan()).some((x) => x.text.startsWith('Note how your introduction') && x.source === 'Guide, p. 55')).toBe(true);
    const long = checkMethod(plan({ intro: Array.from({ length: 150 }, () => 'word').join(' ') })).find((x) => x.text.includes('150 words'));
    expect(long).toMatchObject({ standing: 'examiner', source: 'IA research guide, p. 5' });
  });

  it('reads saved work defensively and summarizes the plan for the teacher', () => {
    expect(parseMethod('nonsense')).toEqual(emptyMethod());
    const p = parseMethod({ form: 'sideways', mainly: 'both', primary: { survey: { use: true, who: 'cyclists', size: -3 }, bogus: { use: true } }, secondary: ['press', 'press', 'gossip'], ee: false, eeSameOrg: true });
    expect(p.form).toBe('');
    expect(p.mainly).toBe('both');
    expect(p.primary.survey).toEqual({ use: true, who: 'cyclists', size: null });
    expect(Object.keys(p.primary)).toEqual(PRIMARY_IDS);
    expect(p.secondary).toEqual(['press']);
    expect(p.eeSameOrg).toBe(false);
    const text = methodSummary(plan({ primary: withSurvey('cyclists', 60), secondary: ['accounts'] }));
    expect(text).toContain('- A survey or questionnaire: cyclists, 60 people');
    expect(text).toContain('- Business accounts or financial reports');
  });
});

const ev = (over: Partial<EvidenceItem> = {}): EvidenceItem => ({ ...blankItem(), sd: 'SD1', finding: 'Revenue $310,000', ...over });

describe('the evidence analysis guide', () => {
  it('reads a piece of evidence as quoted, used or integrated', () => {
    expect(levelOf(blankItem())).toBe('empty');
    expect(levelOf(ev())).toBe('quoted');
    expect(levelOf(ev({ tool: 'Break-even analysis' }))).toBe('quoted');
    expect(levelOf(ev({ tool: 'Break-even analysis', result: '1,200 repairs a year' }))).toBe('used');
    expect(levelOf(ev({ against: 'SD2' }))).toBe('used');
    expect(levelOf(ev({ tool: 'Break-even analysis', result: '1,200 repairs', assumption: 'Summer footfall only', implication: 'Safe only if winter demand holds' }))).toBe('integrated');
    expect(levelOf(ev({ against: 'SD4', implication: 'The growth may not last' }))).toBe('integrated');
    // Weighed against its own document is no comparison.
    expect(levelOf(ev({ against: 'SD1' }))).toBe('quoted');
  });

  it('attributes the distinction to the IA research guide, and asks for the document', () => {
    const quoted = itemAdvice(ev({ sd: '' }));
    expect(quoted.find((c) => c.text.startsWith('Trace it'))).toMatchObject({ standing: 'examiner', source: 'IA research guide, p. 4' });
    expect(quoted.find((c) => c.text.startsWith('Quoted'))).toMatchObject({ standing: 'examiner', source: 'IA research guide, p. 4' });
    expect(itemAdvice(ev({ tool: 'Ratio analysis' })).some((c) => c.text.startsWith('Say what Ratio analysis showed'))).toBe(true);
    expect(itemAdvice(blankItem())).toEqual([]);
  });

  it('sums the log and names the documents no evidence comes from', () => {
    const items = [ev(), ev({ sd: 'SD2', tool: 'Ratios', result: 'Margin 8%' }), ev({ sd: 'SD3', against: 'SD4', implication: 'Demand may fall' }), blankItem()];
    const s = summarizeEvidence(items, 5);
    expect([s.quoted, s.used, s.integrated]).toEqual([1, 1, 1]);
    expect(s.unused).toEqual(['SD5']);
    expect(s.checks.find((c) => c.text.startsWith('SD5 is not used'))).toMatchObject({ standing: 'ib', source: 'Guide, p. 53' });
    expect(s.checks.find((c) => c.source === 'Guide, p. 58')?.text).toContain('assumptions and implications');
    expect(summarizeEvidence([blankItem()], 3).checks[0]?.text).toContain('Log a piece of evidence');
  });

  it('reads saved work defensively and exports the log', () => {
    expect(parseEvidence(undefined)).toEqual(emptyEvidence());
    const p = parseEvidence({ docs: 9, items: [{ sd: 'SD9', finding: 'x', against: 'SD2' }, null, 'junk'] });
    expect(p.docs).toBe(5);
    expect(p.items).toEqual([{ ...blankItem(), finding: 'x', against: 'SD2' }]);
    const csv = evidenceCsv([ev({ finding: 'Revenue, 2025', tool: 'Ratios', result: '8%' }), blankItem()]).trim().split('\n');
    expect(csv).toHaveLength(2);
    expect(csv[1]).toBe('SD1,"Revenue, 2025",Ratios,8%,,,,Used');
  });
});

describe('the word count planner', () => {
  it('suggests a split within the guide’s limit, in whole tens', () => {
    const s = suggestedSections();
    expect(SUGGESTED.reduce((n, x) => n + x.share, 0)).toBeCloseTo(1);
    const total = s.reduce((n, x) => n + (x.planned ?? 0), 0);
    expect(total).toBeLessThanOrEqual(IA_LIMITS.words);
    // 12%, 26%, 26%, 24% and 12% of 1,800, each rounded down to tens: 210 + 460 + 460 + 430 + 210.
    expect(s.map((x) => x.planned)).toEqual([210, 460, 460, 430, 210]);
    expect(total).toBe(1770);
    expect(s.every((x) => (x.planned ?? 0) % 10 === 0)).toBe(true);
    expect(s.map((x) => x.part)).toEqual(['introduction', 'body', 'body', 'body', 'conclusion']);
  });

  it('checks the plan and the writing against 1,800 words, citing the guide', () => {
    const sections: Section[] = [
      { name: 'Introduction', part: 'introduction', planned: 200, written: 260 },
      { name: 'Analysis', part: 'body', planned: 1300, written: 1400 },
      { name: 'Conclusion', part: 'conclusion', planned: 200, written: 180 },
    ];
    const sum = summarizeWords(sections);
    expect([sum.planned, sum.written, sum.plannedLeft, sum.writtenLeft]).toEqual([1700, 1840, 100, -40]);
    expect(sum.checks.find((c) => c.text.startsWith('You have written 40 words more'))).toMatchObject({ status: 'problem', standing: 'ib', source: 'Guide, p. 56' });
    expect(sum.checks.some((c) => c.text.startsWith('Introduction: 60 words over its plan'))).toBe(true);
    const over = summarizeWords([{ name: 'All', part: 'body', planned: 1900, written: null }]);
    expect(over.checks[0]?.text).toContain('100 words over the limit of 1,800');
    expect(over.checks.some((c) => c.source === 'Guide, p. 55')).toBe(true);
  });

  it('reports a long introduction from the IA research guide, and a thin main body as the platform’s advice', () => {
    const heavy = summarizeWords([
      { name: 'Introduction', part: 'introduction', planned: 600, written: null },
      { name: 'Body', part: 'body', planned: 900, written: null },
      { name: 'Conclusion', part: 'conclusion', planned: 300, written: null },
    ]);
    expect(heavy.checks.find((c) => c.text.startsWith('More than a fifth'))).toMatchObject({ standing: 'examiner', source: 'IA research guide, p. 5' });
    expect(heavy.checks.find((c) => c.text.startsWith('Less than three fifths'))?.standing).toBe('strategy');
  });

  it('lists every exclusion the guide gives, and reads saved work defensively', () => {
    expect(NOT_COUNTED.map((x) => x.id)).toEqual(['acknowledgments', 'contents', 'tables', 'diagrams', 'equations', 'documents', 'citations', 'references', 'bibliography']);
    expect(parseWords(42)).toEqual(emptyWords());
    const p = parseWords({ sections: [{ name: 'Intro', part: 'introduction', planned: 220.7, written: -5 }, 'junk', { part: 'appendix' }], excluded: ['tables', 'tables', 'nonsense'] });
    expect(p.sections).toEqual([
      { name: 'Intro', part: 'introduction', planned: 220, written: null },
      { name: '', part: 'body', planned: null, written: null },
    ]);
    expect(p.excluded).toEqual(['tables']);
  });
});
