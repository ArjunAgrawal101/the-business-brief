/**
 * The audience pathways, the enrichment maps and the teachers' lesson library:
 * every figure they show is checked here against a value worked by hand, and
 * the honesty rules their pages promise are checked against the real content.
 */
import { describe, expect, it } from 'vitest';
import { asCorpus, loadCorpus } from './helpers/corpus';
import { checkPathways } from '../../src/lib/integrity-pathways';
import { cashRun, codeKey, firstSentence, hoursRows, partWorking, plainMeaning, plainText, resolveTarget, routeHours, stageHours, taskMarks } from '../../src/lib/pathways';
import {
  allocate,
  briefLesson,
  groupSizes,
  LESSON_LENGTHS,
  lessonsFor,
  lessonTotal,
  notesLessons,
  outlineFrames,
  outlineText,
  phaseMinutes,
  planSummary,
  sectionsPerLesson,
} from '../../src/lib/lessons';
import { lessonLibrary } from '../../src/lib/lesson-sources';
import { hoursAxis, hoursChartSvg, hoursSummary } from '../../src/lib/hours-chart';
import type { GlossaryEntry, Pathway } from '../../src/lib/schemas';

const loaded = loadCorpus();
const c = asCorpus(loaded);
const pathways = Object.entries(loaded.pathways) as Array<[string, Pathway]>;
const pathway = (id: string) => {
  const p = loaded.pathways[id];
  if (!p) throw new Error(`no pathway ${id}`);
  return p as Pathway;
};
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

describe('the pathways', () => {
  it('are seven, in order, each with a route, an assessment note and what it leaves out', () => {
    expect(pathways.map(([id]) => id)).toEqual(['ib-dp', 'secondary', 'undergraduate', 'mba', 'teachers', 'entrepreneurs', 'independent']);
    for (const [id, p] of pathways) {
      expect(p.stages.length, id).toBeGreaterThanOrEqual(3);
      expect(p.assessment, id).toBeDefined();
      expect(p.leavesOut.length, id).toBeGreaterThanOrEqual(3);
      expect(p.depth && p.terminology, id).toBeTruthy();
    }
  });

  it('pass every rule their pages promise', () => {
    expect(checkPathways(pathways, c).map((p) => `${p.where}: ${p.message}`)).toEqual([]);
  });

  it('use a different kind of assessment on each qualification route', () => {
    expect(pathway('ib-dp').assessment?.provenance).toBe('ib-requirement');
    expect(pathway('secondary').assessment?.provenance).toBe('original-practice');
    expect(pathway('undergraduate').assessment?.provenance).toBe('aa-framework');
  });

  it('say plainly that the secondary route is mapped to no syllabus', () => {
    const s = pathway('secondary');
    expect(s.intro).toMatch(/not mapped to any specific syllabus/);
    expect(s.stages.every((st) => st.syllabus.length === 0)).toBe(true);
  });

  it('reject a secondary link to HL material, an IB code off the IB route and an unmarked HL link', () => {
    const bad = clone(pathway('secondary'));
    bad.stages[0]!.items.push({ label: 'NPV', href: '/topics/investment-appraisal/#net-present-value', kind: 'Notes', level: 'SL/HL' });
    bad.stages[0]!.syllabus.push('1.1');
    const msgs = checkPathways([['secondary', bad]], c).map((p) => p.message);
    expect(msgs.some((m) => /must be marked level: HL/.test(m))).toBe(true);
    expect(msgs.some((m) => /uses SL material only/.test(m))).toBe(true);
    expect(msgs.some((m) => /only the IB DP route is mapped/.test(m))).toBe(true);
  });

  it('reject an enrichment map on the IB DP route and a link to a missing map', () => {
    const bad = clone(pathway('ib-dp'));
    bad.stages[0]!.items.push({ label: 'Strategy', href: '/mindmaps/enrichment/strategy-formulation/', kind: 'Enrichment map', level: 'SL/HL' });
    bad.stages[0]!.items.push({ label: 'Nothing', href: '/mindmaps/no-such-map/', kind: 'Mindmap', level: 'SL/HL' });
    const msgs = checkPathways([['ib-dp', bad]], c).map((p) => p.message);
    expect(msgs.some((m) => /kept off the ib-dp route/.test(m))).toBe(true);
    expect(msgs.some((m) => /does not lead to existing content/.test(m))).toBe(true);
  });

  it('resolve links to the content they name', () => {
    expect(resolveTarget('/topics/production-planning/#supply-chain', c)).toMatchObject({ kind: 'subtopic', code: '5.6', level: 'HL', section: { id: 'supply-chain', level: 'HL' } });
    expect(resolveTarget('/topics/business-objectives/#porters-generic-strategies', c)).toMatchObject({ kind: 'subtopic', section: { level: 'HL' } });
    expect(resolveTarget('/mindmaps/enrichment/leading-change/', c)).toEqual({ kind: 'enrichment-map', id: 'leading-change', exists: true });
    expect(resolveTarget('/toolkit/force-field-analysis/', c)).toMatchObject({ kind: 'toolkit', exists: true, level: 'HL' });
    // A guide still planned (or, once every guide is written, a tool that does not exist) is not a live link.
    const planned = Object.entries(c.tools).find(([, t]) => t.status !== 'complete')?.[0] ?? 'no-such-tool';
    expect(resolveTarget(`/toolkit/${planned}/`, c)).toMatchObject({ kind: 'toolkit', exists: false });
    expect(resolveTarget('/assessment/paper-3/', c)).toEqual({ kind: 'page', path: '/assessment/paper-3/' });
  });
});

describe('the IB DP route', () => {
  const cur = c.curricula['ib-dp-bm']!;
  const ib = pathway('ib-dp');

  it("adds up to the guide's recommended hours: 150 at SL and 240 at HL (pp. 21 to 22)", () => {
    expect(routeHours(ib.stages, cur)).toEqual({ sl: 150, hl: 240 });
    expect(cur.hours?.total).toEqual({ sl: 150, hl: 240 });
  });

  it('gives each stage its hours from the curriculum', () => {
    // Units: 20/20, 20/35, 30/45, 30/35, 15/45; toolkit 10/35; Paper 1 research 5/5; IA 20/20 (guide pp. 21 to 22).
    expect(hoursRows(ib.stages, cur).map((r) => [r.sl, r.hl])).toEqual([
      [20, 20],
      [20, 35],
      [30, 45],
      [30, 35],
      [15, 45],
      [10, 35],
      [5, 5],
      [20, 20],
    ]);
    const exams = ib.stages.find((s) => s.id === 'exams')!;
    expect(stageHours(exams, cur)).toBeNull();
  });

  it('describes the chart in words that state its result', () => {
    expect(hoursSummary(hoursRows(ib.stages, cur))).toBe(
      'The route takes 150 hours at SL and 240 at HL. HL adds the most time to Unit 5 (15 hours at SL, 45 at HL) and the business management toolkit (10 hours at SL, 35 at HL). Unit 1, Paper 1 research and the internal assessment take the same time at both levels.',
    );
  });

  it('draws one bar per stage and level on a clean axis', () => {
    expect(hoursAxis(45)).toEqual({ top: 45, step: 15 });
    expect(hoursAxis(18)).toEqual({ top: 20, step: 5 });
    expect(hoursAxis(33)).toEqual({ top: 40, step: 10 });
    const svg = hoursChartSvg(hoursRows(ib.stages, cur), { title: 'Hours', idPrefix: 'h' });
    expect(svg.match(/<path /g)?.length).toBe(16);
    expect(svg).toContain('role="img"');
    expect(svg).toContain('<desc id="h-d">The route takes 150 hours');
    // 45 hours is the axis top, so the longest bar is the full 268 units, its last 4 rounded.
    expect(svg).toMatch(/M0 [0-9.]+H264Q268/);
    // 15 hours is a third of it: 89.3 units.
    expect(svg).toMatch(/M0 [0-9.]+H85\.3Q89\.3/);
  });

  it('covers all five units and every subtopic through its stages', () => {
    const units = ib.stages.flatMap((s) => s.syllabus);
    expect(units).toEqual(['unit-1', 'unit-2', 'unit-3', 'unit-4', 'unit-5']);
  });
});

describe('the secondary practice', () => {
  const tasks = pathway('secondary').practice;
  const task = (id: string) => tasks.find((t) => t.id === id)!;

  it('works Harbour Bikes by the finance functions: contribution $12, break-even 200 hires, profit $2,400', () => {
    const t = task('harbour-bikes');
    // 15 − 3 = 12; 2,400 ÷ 12 = 200 exactly; 400 × 15 − (2,400 + 400 × 3) = 6,000 − 3,600 = 2,400.
    expect(partWorking(t, t.parts[0]!)?.value).toBe(12);
    expect(partWorking(t, t.parts[1]!)?.value).toBe(200);
    expect(partWorking(t, t.parts[2]!)?.value).toBe(2400);
    expect(partWorking(t, t.parts[3]!)).toBeNull();
    expect(taskMarks(t)).toBe(9);
  });

  it("runs Lantern Street Kitchen's cash month by month", () => {
    const t = task('lantern-street-kitchen');
    // June: 5,200 − 4,700 = 500, 1,800 + 500 = 2,300. July: 3,900 − 5,600 = −1,700, 2,300 − 1,700 = 600. August: 6,100 − 4,900 = 1,200, 600 + 1,200 = 1,800.
    expect(cashRun(t.cash!.opening, t.cash!.months)).toEqual([
      { month: 'June', opening: 1800, inflows: 5200, outflows: 4700, net: 500, closing: 2300 },
      { month: 'July', opening: 2300, inflows: 3900, outflows: 5600, net: -1700, closing: 600 },
      { month: 'August', opening: 600, inflows: 6100, outflows: 4900, net: 1200, closing: 1800 },
    ]);
    expect(partWorking(t, t.parts[0]!)?.value).toBe(-1700);
    expect(partWorking(t, t.parts[1]!)?.value).toBe(600);
  });

  it('keeps money in cents', () => {
    expect(cashRun(100.1, [{ month: 'A', inflows: 0.2, outflows: 0.1 }])[0]).toMatchObject({ net: 0.1, closing: 100.2 });
  });
});

describe('words', () => {
  const g = (extra: Record<string, unknown> = {}) => ({ term: 'X', definition: 'The definition.', aliases: [], topics: [], subtopics: ['1.1'], level: 'SL/HL', provenance: 'subject-knowledge', related: [], ...extra }) as unknown as GlossaryEntry;
  it("uses the glossary's simple meaning where it has one, and the definition otherwise", () => {
    expect(plainMeaning(g())).toBe('The definition.');
    expect(plainMeaning(g({ simple: '  Plainly put.  ' }))).toBe('Plainly put.');
    expect(plainMeaning(g({ simple: '' }))).toBe('The definition.');
  });
  it('reduces the light markup to plain text, and finds the first sentence', () => {
    expect(plainText('**Define** a [stakeholder](/glossary/stakeholder/) and *distinguish* it.')).toBe('Define a stakeholder and distinguish it.');
    expect(firstSentence('Cash is king. Profit is opinion.')).toBe('Cash is king.');
    expect(codeKey('3.10')).toBeGreaterThan(codeKey('3.9'));
  });
});

describe('lesson timing', () => {
  it('splits minutes by weight into whole minutes that add up exactly', () => {
    expect(allocate(60, [1, 5, 3, 2, 1])).toEqual([5, 25, 15, 10, 5]);
    // 40 × (1, 5, 3, 2, 1) ÷ 12 = 3.33, 16.67, 10, 6.67, 3.33: floors 3, 16, 10, 6, 3 (38); the two minutes left go to 16.67 and 6.67.
    expect(allocate(40, [1, 5, 3, 2, 1])).toEqual([3, 17, 10, 7, 3]);
    expect(allocate(50, [1, 5, 3, 2, 1])).toEqual([4, 21, 13, 8, 4]);
    expect(allocate(75, [1, 5, 3, 2, 1])).toEqual([6, 31, 19, 13, 6]);
    // 90: 7.5, 37.5, 22.5, 15, 7.5; equal remainders go to the earlier phases.
    expect(allocate(90, [1, 5, 3, 2, 1])).toEqual([8, 38, 22, 15, 7]);
    expect(allocate(10, [1, 1, 1])).toEqual([4, 3, 3]);
    expect(allocate(0, [1, 2])).toEqual([0, 0]);
    expect(allocate(5, [0, 0])).toEqual([0, 0]);
  });

  it('teaches about eight minutes per section, between one and four sections a lesson', () => {
    expect(LESSON_LENGTHS.map(sectionsPerLesson)).toEqual([2, 2, 3, 3, 4]);
    expect(phaseMinutes(60)).toEqual({ starter: 5, teach: 25, apply: 15, check: 10, exit: 5 });
  });

  it('shares sections between as few lessons as possible, as evenly as possible', () => {
    expect(groupSizes(8, 3)).toEqual([3, 3, 2]);
    expect(groupSizes(12, 3)).toEqual([3, 3, 3, 3]);
    expect(groupSizes(7, 2)).toEqual([2, 2, 2, 1]);
    expect(groupSizes(5, 5)).toEqual([5]);
    expect(groupSizes(0, 3)).toEqual([]);
  });

  it("scales a brief's authored sequence to the lesson length", () => {
    const lib = lessonLibrary(c, {});
    const growth = lib.find((e) => e.code === '1.5')!;
    expect(growth.source.kind).toBe('brief');
    if (growth.source.kind !== 'brief') return;
    // Authored: 5, 15, 15, 20, 10, 5 (70 minutes). Scaled to 60: 4.29, 12.86, 12.86, 17.14, 8.57, 4.29, so 4, 13, 13, 17, 9, 4.
    expect(briefLesson(growth.source, 60).steps.map((s) => s.minutes)).toEqual([4, 13, 13, 17, 9, 4]);
  });
});

describe('the lesson library', () => {
  const lib = lessonLibrary(c, Object.fromEntries(pathway('teachers').lessons.map((l) => [l.code, l.prompts])));

  it('has a sequence for every subtopic with notes or a brief, in course order', () => {
    const withNotes = Object.values(c.notes).map((n) => n.code);
    const withBriefs = Object.values(c.topics).map((t) => t.code);
    const expected = [...new Set([...withNotes, ...withBriefs])].sort((a, b) => codeKey(a) - codeKey(b));
    expect(lib.map((e) => e.code)).toEqual(expected);
  });

  it('carries the discussion prompts written for each subtopic, and a brief its own', () => {
    for (const l of pathway('teachers').lessons) expect(lib.find((e) => e.code === l.code)?.source.prompts, l.code).toEqual(l.prompts);
    for (const e of lib.filter((x) => x.source.kind === 'brief')) expect(e.source.prompts.length, e.code).toBeGreaterThanOrEqual(3);
  });

  it('fills every lesson exactly, at every length, for SL and HL classes', () => {
    for (const e of lib)
      for (const len of LESSON_LENGTHS)
        for (const level of ['SL', 'HL'] as const) for (const l of lessonsFor(e.source, len, level)) expect(lessonTotal(l), `${e.code} ${len} ${level}`).toBe(len);
  });

  it('never puts HL material in an SL lesson', () => {
    for (const e of lib)
      for (const len of LESSON_LENGTHS)
        for (const l of lessonsFor(e.source, len, 'SL')) {
          expect(l.steps.some((s) => s.hl), `${e.code} ${len}`).toBe(false);
          if (e.source.kind === 'notes') {
            const hlTitles = e.source.sections.filter((s) => s.level === 'HL').map((s) => s.title);
            expect(l.steps.some((s) => hlTitles.includes(s.title)), `${e.code} ${len}`).toBe(false);
          }
        }
  });

  it('splits the notes into lessons by the stated rule', () => {
    const src = (code: string) => {
      const s = lib.find((e) => e.code === code)!.source;
      if (s.kind !== 'notes') throw new Error(`${code} is not notes`);
      return s;
    };
    // 5.5 has six sections: two lessons of three at 60 minutes, three of two at 40.
    expect(notesLessons(src('5.5'), 60, 'HL').map((l) => l.steps.filter((s) => s.phase === 'teach').length)).toEqual([3, 3]);
    expect(notesLessons(src('5.5'), 40, 'SL').length).toBe(3);
    // 2.4 has twelve sections, five of them HL: seven for SL (3, 2, 2), twelve for HL (3, 3, 3, 3).
    expect(notesLessons(src('2.4'), 60, 'SL').map((l) => l.steps.filter((s) => s.phase === 'teach').length)).toEqual([3, 2, 2]);
    expect(notesLessons(src('2.4'), 60, 'HL').map((l) => l.steps.filter((s) => s.phase === 'teach').length)).toEqual([3, 3, 3, 3]);
    // 5.6 is HL only: nothing for an SL class.
    expect(notesLessons(src('5.6'), 60, 'SL')).toEqual([]);
    expect(planSummary(src('5.6'), 60, 'SL')).toBe('HL only: not taken at SL');
    expect(planSummary(src('5.5'), 60, 'HL')).toBe('2 lessons of 60 minutes');
  });

  it('links every step to a real place on the platform', () => {
    for (const e of lib)
      for (const l of lessonsFor(e.source, 60, 'HL'))
        for (const s of l.steps) {
          if (!s.href) continue;
          const [path, frag] = s.href.split('#');
          const t = resolveTarget(s.href, c);
          expect(t.kind === 'unknown-topic', s.href).toBe(false);
          if (t.kind === 'subtopic' && frag && !/^(ix-|sh-|nv-)/.test(frag)) expect(t.section, s.href).toBeDefined();
          expect(path?.endsWith('/'), s.href).toBe(true);
        }
  });

  it('outlines each subtopic frame by frame, as text only', () => {
    const e = lib.find((x) => x.code === '3.8')!;
    const frames = outlineFrames(e.outline);
    expect(frames[0]?.title).toBe('3.8 Investment appraisal');
    expect(frames.some((f) => f.title === 'Net present value (NPV) (HL)')).toBe(true);
    // Title, objectives, six sections, the decision (the 3.8 notes now have one), weigh it up, check.
    expect(frames.length).toBe(1 + 1 + 6 + 1 + 1 + 1);
    expect(frames.some((f) => /decision/i.test(f.title))).toBe(true);
    const text = outlineText(frames, 'The Business Brief');
    expect(text.startsWith('1. 3.8 Investment appraisal')).toBe(true);
    expect(text).not.toMatch(/\*\*|<[a-z]/);
  });
});
