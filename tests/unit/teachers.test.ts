/**
 * The Teacher resource area: the topic checklists are exactly the syllabus
 * statements of the curriculum file, with their depth and level, and the CSV
 * holds every one of them, quoted safely; every subtopic has discussion
 * prompts from one place; every classroom activity is built on a fictional
 * case whose stakeholders it names, teaches real subtopics, marks HL material
 * and adds up to a lesson; and the lesson sequences are the lesson library's
 * own plans, counted per unit beside the guide's hours.
 */
import { describe, expect, it } from 'vitest';
import { activities, c, teacherPathway } from './helpers/library';
import { AO_NAMES, CHECKLIST_CSV_HEAD, checklistCounts, checklists, checklistsCsv, slRows } from '../../src/lib/teachers/checklists';
import { activityCase, checkActivities, stakeholderFor } from '../../src/lib/teachers/integrity';
import { activityMinutes, type Activity } from '../../src/lib/teachers/schema';
import { promptsBySubtopic } from '../../src/lib/teachers/prompts';
import { lessonAnchor, lessonHours, sequenceRows, unitPlans } from '../../src/lib/teachers/sequences';
import { lessonLibrary } from '../../src/lib/lesson-sources';
import { LESSON_LENGTHS, lessonsFor } from '../../src/lib/lessons';
import { csvCell } from '../../src/lib/library/glossary-csv';
import type { Curriculum } from '../../src/lib/schemas';

const cur = c.curricula['ib-dp-bm'] as Curriculum;
const lists = checklists(cur);
const subs = cur.units.flatMap((u) => u.subtopics.map((s) => ({ ...s, unit: u.number })));

/** Parse one CSV line written by csvCell: quoted cells, doubled quotes, commas between. */
function cells(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] !== '"') throw new Error(`unquoted cell at ${i} in ${line}`);
    let v = '';
    i += 1;
    for (;;) {
      if (line[i] === '"' && line[i + 1] === '"') {
        v += '"';
        i += 2;
      } else if (line[i] === '"') {
        i += 1;
        break;
      } else {
        v += line[i];
        i += 1;
      }
    }
    out.push(v);
    if (line[i] === ',') i += 1;
  }
  return out;
}

describe('the topic checklists', () => {
  it('are one per subtopic, in course order, each with exactly its statements, depth and level', () => {
    expect(lists.map((l) => l.code)).toEqual(subs.map((s) => s.code));
    for (const l of lists) {
      const s = subs.find((x) => x.code === l.code)!;
      expect(l.rows.map((r) => r.text), l.code).toEqual(s.content.map((x) => x.text));
      expect(l.rows.map((r) => r.ao), l.code).toEqual(s.content.map((x) => x.ao));
      expect(l.rows.map((r) => r.level), l.code).toEqual(s.content.map((x) => x.level));
      expect(l.rows.map((r) => r.n)).toEqual(l.rows.map((_, i) => i + 1));
      expect(l.rows.length, l.code).toBeGreaterThan(0);
    }
  });

  it('count 143 statements in all, and mark the HL-only ones', () => {
    expect(lists.reduce((n, l) => n + l.rows.length, 0)).toBe(143);
    const production = lists.find((l) => l.code === '5.6')!;
    expect(checklistCounts(production)).toEqual({ statements: 7, hl: 7 });
    const motivation = lists.find((l) => l.code === '2.4')!;
    expect(checklistCounts(motivation)).toEqual({ statements: 9, hl: 5 });
  });

  it('give an SL class only the statements it is taught', () => {
    expect(slRows(lists.find((l) => l.code === '5.6')!)).toEqual([]);
    expect(slRows(lists.find((l) => l.code === '2.4')!)).toHaveLength(4);
    expect(slRows(lists.find((l) => l.code === '5.5')!)).toHaveLength(4);
  });

  it('name the assessment objectives as the guide does', () => {
    expect(AO_NAMES).toEqual({
      AO1: 'Knowledge and understanding',
      AO2: 'Application and analysis',
      AO3: 'Synthesis and evaluation',
      AO4: 'Use and application of appropriate skills',
    });
    for (const l of lists) for (const r of l.rows) for (const a of r.ao) expect(Object.keys(AO_NAMES)).toContain(a);
  });
});

describe('the checklists CSV', () => {
  const csv = checklistsCsv(cur);
  const lines = csv.split('\r\n');

  it('opens with a byte order mark and the header, and ends with the attribution and a line break', () => {
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(cells(lines[0]!.slice(1))).toEqual(CHECKLIST_CSV_HEAD);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(cells(lines[lines.length - 2]!)[0]).toMatch(/^Topic checklists from The Business Brief, by Arjun Agrawal\. .*Not an IB publication\.$/);
  });

  it('holds a row for every statement, each with the columns of the header', () => {
    const rows = lines.slice(1, -2).map(cells);
    expect(rows).toHaveLength(143);
    for (const r of rows) expect(r).toHaveLength(CHECKLIST_CSV_HEAD.length);
    const first = rows[0]!;
    expect(first.slice(0, 10)).toEqual(['1', 'Introduction to business management', '1.1', 'What is a business?', 'SL and HL', '1.1.1', 'The nature of business', 'AO1', 'SL and HL', '23']);
    expect(first.slice(10)).toEqual(['', '', '']);
    const turnover = rows.find((r) => r[6] === 'Labour turnover')!;
    expect(turnover.slice(2, 10)).toEqual(['2.4', 'Motivation and demotivation', 'SL and HL, with HL-only content', '2.4.3', 'Labour turnover', 'AO2, AO4', 'HL only', '26']);
  });

  it('quotes every cell, so commas and quotation marks in a statement survive', () => {
    expect(csvCell('Taylor, Maslow and "Herzberg"')).toBe('"Taylor, Maslow and ""Herzberg"""');
    const culture = lines.find((l) => l.includes('Gods of management'))!;
    expect(cells(culture)[6]).toBe('Types of organizational culture, such as Charles Handy\'s "Gods of management"');
  });

  it('has no dash or leaked value', () => {
    expect(csv).not.toMatch(/[\u2013\u2014]|undefined|NaN|\[object Object\]/);
  });
});

describe('the discussion prompts', () => {
  const sets = promptsBySubtopic(teacherPathway().lessons, c);

  it('cover every subtopic, from the teachers’ pathway or, failing that, the subtopic’s brief', () => {
    expect(Object.keys(sets).sort()).toEqual(subs.map((s) => s.code).sort());
    for (const s of subs) expect(sets[s.code]!.prompts.length, s.code).toBeGreaterThanOrEqual(3);
    for (const t of Object.values(c.topics)) expect(sets[t.code]).toEqual({ code: t.code, prompts: t.teaching.prompts, from: 'brief' });
    expect(sets['5.6']?.from).toBe('pathway');
  });

  it('are questions, written once each', () => {
    const all = Object.values(sets).flatMap((s) => s.prompts);
    for (const p of all) expect(p, p).toMatch(/\?$/);
    expect(new Set(all).size).toBe(all.length);
    for (const p of all) expect(p, p).not.toMatch(/[\u2013\u2014]/);
  });
});

describe('the classroom activities', () => {
  const list = activities();
  const byId = Object.fromEntries(list);

  it('pass every check: real fictional cases, roles the cases name, real subtopics, HL marked, a lesson long', () => {
    expect(list.length).toBeGreaterThanOrEqual(6);
    expect(checkActivities(byId, c)).toEqual([]);
  });

  it('take each role from the case, so the page shows the stakeholder’s own interest and concern', () => {
    for (const [id, a] of list) {
      const caseId = activityCase(a, c)!;
      for (const r of a.roles) {
        const [s] = stakeholderFor(c, caseId, r.stakeholder);
        expect(s?.interest, `${id}: ${r.stakeholder}`).toBeTruthy();
        expect(s?.concern, `${id}: ${r.stakeholder}`).toBeTruthy();
      }
      expect(a.roles.length, id).toBeLessThanOrEqual(a.groupSize);
    }
  });

  it('add their phases up to the lesson length shown', () => {
    const bellbird = byId['bellbird-board-meeting']!;
    expect(activityMinutes(bellbird)).toBe(8 + 8 + 14 + 8 + 12);
    for (const [, a] of list) expect(activityMinutes(a)).toBe(a.phases.reduce((t, p) => t + p.minutes, 0));
  });

  it('catch the mistakes the checks exist for', () => {
    const base = JSON.parse(JSON.stringify(byId['bellbird-board-meeting'])) as Activity;
    const bad = (patch: Partial<Activity>) => checkActivities({ x: { ...base, ...patch } }, c).map((p) => p.message);
    expect(bad({ basis: { kind: 'case', id: 'no-such-case' } }).some((m) => /does not exist/.test(m))).toBe(true);
    expect(bad({ roles: [...base.roles, { stakeholder: 'Someone invented', task: 'Talks.' }] }).some((m) => /exactly one stakeholder/.test(m))).toBe(true);
    expect(bad({ subtopics: ['9.9'] }).some((m) => /unknown subtopic/.test(m))).toBe(true);
    expect(bad({ subtopics: ['3.9'] }).some((m) => /must be marked level: HL/.test(m))).toBe(true);
    expect(bad({ phases: [{ minutes: 5, title: 'A', what: 'B' }, { minutes: 5, title: 'C', what: 'D' }, { minutes: 5, title: 'E', what: 'F' }] }).some((m) => /15 minutes/.test(m))).toBe(true);
    // A role names a stakeholder from the start of the name, in whole words.
    expect(stakeholderFor(c, 'bellbird-home-and-garden', 'Jim Marsh')).toHaveLength(1);
    expect(stakeholderFor(c, 'bellbird-home-and-garden', 'Jim Mars')).toHaveLength(0);
    expect(stakeholderFor(c, 'bellbird-home-and-garden', 'Marsh')).toHaveLength(0);
  });
});

describe('the lesson sequences', () => {
  const sets = promptsBySubtopic(teacherPathway().lessons, c);
  const lib = lessonLibrary(c, Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, v.prompts])));
  const rows = sequenceRows(lib);

  it('cover every subtopic, at every lesson length, with the lesson library’s own plans', () => {
    expect(rows.map((r) => r.code)).toEqual(subs.map((s) => s.code));
    for (const r of rows) {
      const e = lib.find((x) => x.code === r.code)!;
      for (const len of LESSON_LENGTHS) {
        expect(r.byLength[len]!.hl, `${r.code} at ${len}`).toBe(lessonsFor(e.source, len, 'HL').length);
        expect(r.byLength[len]!.sl, `${r.code} at ${len}`).toBe(lessonsFor(e.source, len, 'SL').length);
        expect(r.byLength[len]!.focus).toEqual(lessonsFor(e.source, len, 'HL').map((l) => l.focus));
      }
      expect(r.href).toBe(lessonAnchor(r.code));
    }
  });

  it('give an HL-only subtopic no lessons for an SL class, and fewer lessons when lessons are longer', () => {
    for (const r of rows.filter((x) => x.level === 'HL')) expect(r.byLength[60]!.sl, r.code).toBe(0);
    for (const r of rows) expect(r.byLength[90]!.hl, r.code).toBeLessThanOrEqual(r.byLength[40]!.hl);
  });

  it('total each unit and set it beside the guide’s recommended hours', () => {
    const plans = unitPlans(rows, cur, 60);
    for (const p of plans) {
      const mine = rows.filter((r) => r.unit === p.unit);
      expect(p.hl).toBe(mine.reduce((n, r) => n + r.byLength[60]!.hl, 0));
      expect(p.sl).toBe(mine.reduce((n, r) => n + r.byLength[60]!.sl, 0));
    }
    expect(plans.map((p) => p.hours)).toEqual(cur.units.map((u) => u.hours));
    expect(lessonHours(15, 60)).toBe(15);
    expect(lessonHours(20, 40)).toBe(13.3);
    expect(lessonAnchor('3.5')).toBe('/pathways/teachers/#lesson-3-5');
  });
});
