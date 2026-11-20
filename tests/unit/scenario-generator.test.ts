/**
 * The Business Scenario Generator (src/lib/scenario-generator/): a scenario is the same
 * every time for the same code; every family makes valid scenarios across
 * many seeds, with feedback on every choice, exactly one best answer to each
 * question and a calculation that checks; the families cover the five units,
 * many industries, places and sizes, and name only real subtopics and toolkit
 * tools at the right level; and the checking, the summary and the stored
 * record behave, including on damaged input. One scenario is worked by hand.
 */
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CODE, FAMILIES, build, facets, filtered, parseCode, readFilters, scenarioFor } from '../../src/lib/scenario-generator';
import { problems } from '../../src/lib/scenario-generator/engine';
import { PLACES, TOOLKIT } from '../../src/lib/scenario-generator/kit';
import { analysisVerdict, answerWords, calcResult, choiceResult, evidenceResult, fmtAnswer, readNumber, sortResult, stepVerdicts, wordCount, type Answers } from '../../src/lib/scenario-generator/check';
import { feedbackHtml, headHtml, scenarioHtml, summaryHtml, type RenderContext } from '../../src/lib/scenario-generator/render';
import { LIMIT, emptyRecord, find, readRecord, upsert } from '../../src/lib/scenario-generator/store';
import { STEP_IDS, type Scenario } from '../../src/lib/scenario-generator/types';
import { loadCorpus } from './helpers/corpus';

const SEEDS = 120;
const ctx: RenderContext = { subtopics: {}, tools: {} };
/** Each family's scenarios for seeds 1 to SEEDS, built once and shared by the tests. */
const BUILT = new Map<string, Scenario[]>();
const all = (f: (typeof FAMILIES)[number]) => {
  let v = BUILT.get(f.id);
  if (!v) {
    v = Array.from({ length: SEEDS }, (_, i) => build(f, i + 1));
    BUILT.set(f.id, v);
  }
  return v;
};

describe('generation', () => {
  it('is deterministic: the same code always gives the same scenario', () => {
    for (const f of FAMILIES)
      for (const seed of [1, 7, 4821, 99999]) {
        const a = build(f, seed);
        const b = build(f, seed);
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
        expect(scenarioFor(`${f.id}-${seed}`)).toEqual(a);
        expect(a.code).toBe(`${f.id}-${seed}`);
      }
  });

  it('makes a valid scenario from every family across many seeds', () => {
    const bad: string[] = [];
    for (const f of FAMILIES) for (const s of all(f)) for (const p of problems(s)) bad.push(`${s.code}: ${p}`);
    expect(bad.slice(0, 20)).toEqual([]);
  });

  it('gives every choice a verdict and feedback that explains it, and every exhibit a reason', () => {
    for (const f of FAMILIES)
      for (const s of all(f).slice(0, 30)) {
        const questions = [s.problem, s.recommend, s.evaluate.stakeholders, s.evaluate.risk, s.evaluate.change, { prompt: s.toolStep.prompt, choices: s.toolStep.choices }];
        for (const q of questions)
          for (const c of q.choices) {
            expect(['best', 'fair', 'weak']).toContain(c.verdict);
            expect(c.why.split(/\s+/).length, `${s.code}: ${c.text}`).toBeGreaterThanOrEqual(7);
          }
        for (const e of s.evidence.exhibits) expect(e.why.split(/\s+/).length).toBeGreaterThanOrEqual(7);
        if (s.analysis.sort) for (const it of s.analysis.sort.items) expect(it.why.length).toBeGreaterThan(30);
      }
  });

  it('varies the business, the figures and the place of the best answer with the seed', () => {
    for (const f of FAMILIES) {
      const ss = all(f).slice(0, 60);
      expect(new Set(ss.map((s) => s.business)).size, f.id).toBeGreaterThanOrEqual(10);
      expect(new Set(ss.map((s) => s.place)).size, f.id).toBeGreaterThanOrEqual(8);
      expect(new Set(ss.map((s) => JSON.stringify(s.evidence.exhibits.map((e) => e.rows ?? e.body)))).size, f.id).toBeGreaterThanOrEqual(30);
      expect(new Set(ss.map((s) => s.problem.choices.findIndex((c) => c.verdict === 'best'))).size, f.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('lets the evidence change the best recommendation in most families', () => {
    let varies = 0;
    for (const f of FAMILIES) {
      const bests = new Set(all(f).map((s) => s.recommend.choices.find((c) => c.verdict === 'best')!.text.split(':')[0]!.replace(/\d[\d,.]*/g, '#').slice(0, 24)));
      if (bests.size > 1) varies += 1;
    }
    expect(varies).toBeGreaterThanOrEqual(20);
  });

  it('labels every scenario fictional and every exhibit simulated', () => {
    const html = scenarioHtml(scenarioFor(DEFAULT_CODE)!, ctx) + headHtml(scenarioFor(DEFAULT_CODE)!, ctx);
    expect(html).toContain('Fictional');
    expect(html).toContain('Simulated data');
    for (const f of FAMILIES) for (const s of all(f).slice(0, 10)) for (const e of s.evidence.exhibits.filter((x) => x.relevant && x.note)) expect(e.note).toMatch(/Simulated/);
  });
});

describe('the families', () => {
  const c = loadCorpus();
  const units = c.curricula['ib-dp-bm']!.units;
  const subtopics = new Map(units.flatMap((u) => u.subtopics.map((s) => [s.code, { level: s.level, unit: u.number }] as const)));

  it('number at least 24, across all five units, with unique ids', () => {
    expect(FAMILIES.length).toBeGreaterThanOrEqual(24);
    expect(new Set(FAMILIES.map((f) => f.id)).size).toBe(FAMILIES.length);
    for (const u of [1, 2, 3, 4, 5]) expect(FAMILIES.filter((f) => f.unit === u).length, `unit ${u}`).toBeGreaterThanOrEqual(4);
  });

  it('cover many industries, several regions of the world and every size of business', () => {
    expect(new Set(FAMILIES.flatMap((f) => f.industries)).size).toBeGreaterThanOrEqual(10);
    const places = new Set<string>();
    const sizes = new Set<string>();
    for (const f of FAMILIES)
      for (const s of all(f).slice(0, 40)) {
        places.add(s.place);
        const m = /micro|small|medium-sized|large/.exec(s.size);
        if (m) sizes.add(m[0]);
      }
    const regions = new Set(PLACES.filter((p) => [...places].some((x) => x.includes(p.city))).map((p) => p.region));
    expect(regions.size).toBe(5);
    expect([...sizes].sort()).toEqual(['large', 'medium-sized', 'micro', 'small']);
  });

  it('name subtopics that exist, in their own unit, and are HL exactly when the tool or every subtopic is HL only', () => {
    for (const f of FAMILIES) {
      for (const code of f.subtopics) expect(subtopics.has(code), `${f.id}: ${code}`).toBe(true);
      expect(f.subtopics.some((code) => subtopics.get(code)?.unit === f.unit), `${f.id} has no subtopic in unit ${f.unit}`).toBe(true);
      const hlOnly = f.subtopics.every((code) => subtopics.get(code)?.level === 'HL');
      expect(f.level, f.id).toBe(TOOLKIT[f.tool]!.level === 'HL' || hlOnly ? 'HL' : 'SL/HL');
    }
  });

  it('offer only the tools of the IB toolkit, at the level the toolkit gives them', () => {
    for (const [id, t] of Object.entries(TOOLKIT)) {
      const y = parse(readFileSync(new URL(`../../src/content/tools/${id}.yaml`, import.meta.url), 'utf8')) as { level: string };
      expect(y.level, id).toBe(t.level);
    }
    expect(Object.keys(TOOLKIT)).toHaveLength(15);
    for (const f of FAMILIES) expect(TOOLKIT[f.tool], f.id).toBeDefined();
    // Every tool in the toolkit is the best answer somewhere.
    expect(new Set(FAMILIES.map((f) => f.tool)).size).toBe(15);
  });

  it('filters by unit, subtopic and tool, and reads the filters from an address', () => {
    const { subtopics: codes, tools } = facets();
    expect(filtered({}).length).toBe(FAMILIES.length);
    expect(filtered({ unit: '2' }).every((f) => f.unit === 2)).toBe(true);
    expect(filtered({ tool: 'decision-trees' }).every((f) => f.tool === 'decision-trees')).toBe(true);
    expect(filtered({ subtopic: '5.6', unit: '5' }).every((f) => f.subtopics.includes('5.6'))).toBe(true);
    expect(filtered({ unit: '1', tool: 'gantt-chart' })).toEqual([]);
    expect(codes).toContain('1.5');
    expect(tools).toContain('swot-analysis');
    expect(readFilters(new URLSearchParams('unit=3&subtopic=9.9&tool=swot-analysis'))).toEqual({ unit: '3', subtopic: undefined, tool: 'swot-analysis' });
  });
});

describe('codes', () => {
  it('read a family and a seed, and refuse anything else', () => {
    expect(parseCode('growth-route-4821', FAMILIES)).toMatchObject({ seed: 4821 });
    expect(parseCode('growth-route-4821', FAMILIES)?.family.id).toBe('growth-route');
    for (const bad of ['', 'growth-route', 'growth-route-0', 'growth-route-100000', 'no-such-family-12', 'growth-route-12a', '<script>-1']) expect(parseCode(bad, FAMILIES), bad).toBeNull();
    expect(scenarioFor('nonsense')).toBeNull();
  });
});

describe('one scenario worked by hand: entry-route-7', () => {
  const s = scenarioFor('entry-route-7')!;

  it('has the figures the exhibits show', () => {
    const t = s.evidence.exhibits.find((e) => e.title.startsWith('The two routes'))!;
    expect(t.rows).toEqual([
      ['Own restaurants', '£380,000', '£1,250,000', '£140,000'],
      ['Franchising', '£70,000', '£700,000', '£225,000'],
    ]);
    expect(s.brief.join(' ')).toContain('0.6');
  });

  it('works the expected values and the choice as a teacher would', () => {
    // Own: 0.6 x 1,250,000 + 0.4 x 140,000 - 380,000 = 750,000 + 56,000 - 380,000 = 426,000.
    expect(s.analysis.calc!.answer).toBe(426000);
    // Franchising: 0.6 x 700,000 + 0.4 x 225,000 - 70,000 = 440,000, within a tenth of 426,000: close, so the lower-risk route is best.
    expect(s.analysis.model[1]).toContain('£440,000');
    expect(s.recommend.choices.find((c) => c.verdict === 'best')!.text).toBe('Franchise to local owners');
    expect(calcResult(s.analysis.calc!, '426,000').status).toBe('right');
    expect(calcResult(s.analysis.calc!, '£426000').status).toBe('right');
    // Forgetting the cost: 806,000.
    const slip = calcResult(s.analysis.calc!, '806000');
    expect(slip.status).toBe('slip');
    expect(slip.message).toMatch(/did not subtract the cost/);
    expect(calcResult(s.analysis.calc!, '500000').status).toBe('wrong');
    expect(calcResult(s.analysis.calc!, 'about four hundred').status).toBe('invalid');
  });
});

describe('checking answers', () => {
  const s: Scenario = scenarioFor(DEFAULT_CODE)!;

  it('reads numbers as people type them', () => {
    expect(readNumber('1,250')).toBe(1250);
    expect(readNumber(' 12.5 ')).toBe(12.5);
    expect(readNumber('£1,250')).toBe(1250);
    expect(readNumber('12.5%')).toBe(12.5);
    expect(readNumber('−40')).toBe(-40);
    expect(readNumber('KSh\u00a01,200')).toBe(1200);
    expect(readNumber('twelve')).toBeNull();
    expect(readNumber('')).toBeNull();
    expect(readNumber('1.2.3')).toBeNull();
  });

  it('writes an answer with its sign before its currency', () => {
    expect(fmtAnswer({ prefix: '£', suffix: '', dp: 0 }, -40000)).toBe('−£40,000');
    expect(fmtAnswer({ prefix: '', suffix: ' years', dp: 1 }, 3.16)).toBe('3.2 years');
  });

  it('marks a choice and names the best answer', () => {
    const bestId = s.problem.choices.find((c) => c.verdict === 'best')!.id;
    const other = s.problem.choices.find((c) => c.verdict !== 'best')!.id;
    expect(choiceResult(s.problem, bestId).picked?.verdict).toBe('best');
    expect(choiceResult(s.problem, other).best.id).toBe(bestId);
    expect(choiceResult(s.problem, undefined).picked).toBeUndefined();
  });

  it('marks the evidence exhibit by exhibit', () => {
    const ex = s.evidence.exhibits;
    const relevant = ex.filter((e) => e.relevant).map((e) => e.id);
    const distractor = ex.find((e) => !e.relevant)!.id;
    expect(evidenceResult(ex, relevant)).toMatchObject({ found: relevant.length, distractors: 0, verdict: 'best' });
    expect(evidenceResult(ex, [...relevant, distractor]).verdict).toBe('fair');
    expect(evidenceResult(ex, [distractor]).verdict).toBe('weak');
    expect(evidenceResult(ex, []).marks.filter((m) => m.mark === 'missed')).toHaveLength(relevant.length);
  });

  it('marks a sort item by item', () => {
    const t = s.analysis.sort!;
    const right = Object.fromEntries(t.items.map((i) => [i.id, i.answer]));
    expect(sortResult(t, right)).toMatchObject({ right: t.items.length, verdict: 'best' });
    const one = { ...right, [t.items[0]!.id]: t.categories.find((c) => c.id !== t.items[0]!.answer)!.id };
    expect(sortResult(t, one).verdict).toBe('fair');
    expect(sortResult(t, {}).verdict).toBe('weak');
  });

  it('gives a verdict for each checked step and a summary in words', () => {
    const best = (q: { choices: Array<{ id: string; verdict: string }> }) => q.choices.find((c) => c.verdict === 'best')!.id;
    const a: Answers = {
      problem: best(s.problem),
      evidence: s.evidence.exhibits.filter((e) => e.relevant).map((e) => e.id),
      tool: s.tool,
      sort: Object.fromEntries(s.analysis.sort!.items.map((i) => [i.id, i.answer])),
      recommend: best(s.recommend),
      justify: 'The home market evidence and the share held point to this route, with a trial first.',
      stakeholders: best(s.evaluate.stakeholders),
      risk: best(s.evaluate.risk),
      change: best(s.evaluate.change),
    };
    const v = stepVerdicts(s, a, [...STEP_IDS]);
    expect(Object.values(v)).toEqual(['best', 'best', 'best', 'best', 'best', 'best']);
    expect(analysisVerdict(s, a)).toBe('best');
    expect(stepVerdicts(s, a, ['problem'])).toEqual({ problem: 'best' });
    expect(answerWords(s, a, 'evidence')).toMatch(/of \d relevant exhibits chosen, 0 distractors/);
    expect(answerWords(s, {}, 'tool')).toBe('No answer');
    const html = summaryHtml(s, a, [...STEP_IDS]);
    expect((html.match(/Best fit/g) ?? []).length).toBe(6);
    expect(wordCount(a.justify)).toBeGreaterThanOrEqual(8);
    expect(wordCount('  ')).toBe(0);
  });
});

describe('the HTML', () => {
  it('draws every family without a leaked value or a dash, with all six steps', () => {
    for (const f of FAMILIES)
      for (const s of all(f).slice(0, 6)) {
        const html = headHtml(s, ctx) + scenarioHtml(s, ctx);
        expect(html).not.toMatch(/undefined|NaN|\[object Object\]/);
        expect(html).not.toMatch(/[–—]/);
        for (const step of STEP_IDS) expect(html).toContain(`data-step="${step}"`);
        expect((html.match(/class="disclosure sg-why nojs-only"/g) ?? []).length).toBe(6);
        expect(html).toContain('The model answer, in outline');
      }
  });

  it('draws the feedback for each step in words', () => {
    const s = scenarioFor('two-machines-12')!;
    const wrong = (q: { choices: Array<{ id: string; verdict: string }> }) => q.choices.find((c) => c.verdict !== 'best')!.id;
    const a: Answers = { problem: wrong(s.problem), evidence: [s.evidence.exhibits[0]!.id], tool: s.toolStep.choices.find((c) => c.verdict !== 'best')!.id, calc: '1', recommend: wrong(s.recommend), stakeholders: wrong(s.evaluate.stakeholders), risk: wrong(s.evaluate.risk), change: wrong(s.evaluate.change) };
    for (const step of STEP_IDS) {
      const html = feedbackHtml(s, step, a, { subtopics: {}, tools: { [s.tool]: { href: '/toolkit/decision-trees/', name: 'Decision trees' } } });
      expect(html.length, step).toBeGreaterThan(100);
      expect(html).not.toMatch(/undefined|NaN/);
    }
    expect(feedbackHtml(s, 'problem', a, ctx)).toContain('The best answer:');
    expect(feedbackHtml(s, 'analysis', a, ctx)).toContain('The working');
    expect(feedbackHtml(s, 'tool', a, { subtopics: {}, tools: { [s.tool]: { href: '/toolkit/decision-trees/', name: 'Decision trees' } } })).toContain('/toolkit/decision-trees/');
  });
});

describe('the stored record, bb:scenarios', () => {
  const entry = (code: string, at = '2026-11-20T10:00:00.000Z') => ({ code, title: `Case ${code}`, answers: { problem: 'a' }, checked: ['problem' as const], verdicts: { problem: 'best' as const }, at });

  it('reads damaged input without throwing', () => {
    expect(readRecord(null).items).toEqual([]);
    expect(readRecord('{oops').items).toEqual([]);
    expect(readRecord({ items: 'no' }).items).toEqual([]);
    const r = readRecord(
      JSON.stringify({
        items: [
          { code: 'growth-route-12', title: 'A', answers: { problem: 'b', evidence: ['ex1', 'bad', 3], calc: '12', sort: { i1: 'penetration', 'bad key!': 'x' }, justify: 'x'.repeat(5000) }, checked: ['problem', 'nope', 'tool'], verdicts: { problem: 'best', tool: 'great', evidence: 'best' }, at: 'not a date' },
          { code: 'growth-route-12', title: 'duplicate' },
          { code: '<script>', title: 'bad' },
          'junk',
        ],
      }),
    );
    expect(r.items).toHaveLength(1);
    const e = r.items[0]!;
    expect(e.answers.evidence).toEqual(['ex1']);
    expect(e.answers.sort).toEqual({ i1: 'penetration' });
    expect(e.answers.justify).toHaveLength(4000);
    expect(e.checked).toEqual(['problem', 'tool']);
    // A verdict counts only for a checked step, and only if it is a verdict.
    expect(e.verdicts).toEqual({ problem: 'best' });
    expect(e.at).toBe(new Date(0).toISOString());
  });

  it('keeps the newest first, one entry per code, at most the limit', () => {
    let r = emptyRecord();
    for (let i = 1; i <= LIMIT + 5; i++) r = upsert(r, entry(`growth-route-${i}`));
    expect(r.items).toHaveLength(LIMIT);
    expect(r.items[0]!.code).toBe(`growth-route-${LIMIT + 5}`);
    r = upsert(r, entry('growth-route-10'));
    expect(r.items[0]!.code).toBe('growth-route-10');
    expect(r.items.filter((e) => e.code === 'growth-route-10')).toHaveLength(1);
    expect(find(r, 'growth-route-10')?.title).toBe('Case growth-route-10');
    expect(r.headline).toMatch(/^0 scenarios worked to the end, 60 started; latest: Case growth-route-10$/);
    expect(readRecord(JSON.stringify(r)).items).toHaveLength(LIMIT);
  });
});
