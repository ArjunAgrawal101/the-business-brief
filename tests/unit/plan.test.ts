/**
 * Critical path analysis for the Halden implementation plan, worked by hand.
 *
 *   A listen 1      0-1          C redesign 3 (after A)   1-4
 *   B coach 6       0-6          D retrain 3 (after C)    4-7
 *   E buddies 4 (after D) 7-11   F pilot 2 (after D)      7-9
 *   G roll out 3 (after F, B) 9-12
 *   H readiness 1 (after G, E) 12-13
 *
 * Backward pass from week 13: H 12-13, G 9-12, E 8-12, F 7-9, D 4-7, C 1-4,
 * B 3-9, A 0-1. Total float: B 3, E 1, the rest 0, so the critical path is
 * A, C, D, F, G, H. Free float: B 9 - 6 = 3, E 12 - 11 = 1.
 */
import { describe, expect, it } from 'vitest';
import { schedule, topoOrder, withDuration, type Activity } from '../../src/lib/plan';
import { loadCorpus } from './helpers/corpus';

const PLAN: Activity[] = [
  { id: 'A', label: 'Listen', weeks: 1, after: [] },
  { id: 'B', label: 'Coach', weeks: 6, after: [] },
  { id: 'C', label: 'Redesign', weeks: 3, after: ['A'] },
  { id: 'D', label: 'Retrain', weeks: 3, after: ['C'] },
  { id: 'E', label: 'Buddies', weeks: 4, after: ['D'] },
  { id: 'F', label: 'Pilot', weeks: 2, after: ['D'] },
  { id: 'G', label: 'Roll out', weeks: 3, after: ['F', 'B'] },
  { id: 'H', label: 'Readiness', weeks: 1, after: ['G', 'E'] },
];

describe('critical path analysis', () => {
  const s = schedule(PLAN);
  const get = (id: string) => s.items.find((i) => i.id === id);

  it('finds the earliest and latest times', () => {
    expect(s.finish).toBe(13);
    expect([get('G')?.es, get('G')?.ef]).toEqual([9, 12]);
    expect([get('E')?.ls, get('E')?.lf]).toEqual([8, 12]);
    expect([get('B')?.ls, get('B')?.lf]).toEqual([3, 9]);
  });

  it('finds the float and the critical path', () => {
    expect(get('B')?.totalFloat).toBe(3);
    expect(get('E')?.totalFloat).toBe(1);
    expect(get('B')?.freeFloat).toBe(3);
    expect(get('E')?.freeFloat).toBe(1);
    expect(s.path).toEqual(['A', 'C', 'D', 'F', 'G', 'H']);
  });

  it('moves the finish when a critical activity takes longer, but not a non-critical one within its float', () => {
    expect(schedule(withDuration(PLAN, 'D', 6)).finish).toBe(16);
    expect(schedule(withDuration(PLAN, 'B', 9)).finish).toBe(13);
    expect(schedule(withDuration(PLAN, 'B', 10)).finish).toBe(14);
  });

  it('rejects loops and unknown predecessors', () => {
    expect(() => topoOrder([{ id: 'X', label: '', weeks: 1, after: ['Y'] }])).toThrow(/unknown/);
    expect(() =>
      topoOrder([
        { id: 'X', label: '', weeks: 1, after: ['Y'] },
        { id: 'Y', label: '', weeks: 1, after: ['X'] },
      ]),
    ).toThrow(/loop/);
  });
});

describe('the Halden diagnosis lab plan', () => {
  it('matches the plan worked above', () => {
    const lab = loadCorpus().interactives['halden-diagnosis'];
    if (!lab || lab.component !== 'case-lab') throw new Error('The Halden lab is missing');
    const task = lab.stages.flatMap((st) => st.tasks).find((t) => t.kind === 'plan');
    if (!task || task.kind !== 'plan') throw new Error('No plan task');
    const s = schedule(task.activities);
    expect(s.finish).toBe(13);
    expect(s.path.length).toBe(6);
    expect(task.deadline.week).toBe(14);
    expect(schedule(task.activities.map((a) => (a.id === task.vary.activity ? { ...a, weeks: 5 } : a))).finish).toBe(15);
  });
});
