/**
 * The figures drawn for the frameworks library compute what they show: the
 * factor counts of PEST, PESTLE and STEEPLE, the SMART example's target and
 * the RACI matrix's rules.
 */
import { describe, expect, it } from 'vitest';
import { RACI_EXAMPLE, factorCounts, raciProblems, smartExample } from '../../src/lib/figures/frameworks';

describe('figures drawn for the library', () => {
  it('counts the factors of PEST, PESTLE and STEEPLE', () => {
    expect(factorCounts()).toEqual({ pest: 4, pestle: 6, steeple: 7 });
  });

  it('works the SMART example: $40,000 raised by 15% is $46,000', () => {
    expect(smartExample()).toEqual({ from: 40000, pct: 15, to: 46000 });
  });

  it('checks a RACI matrix: one person accountable and someone responsible for every task', () => {
    expect(raciProblems(RACI_EXAMPLE)).toEqual([]);
    const broken = { roles: ['Owner', 'Manager'], tasks: [{ task: 'Hire', cells: ['A', 'A'] as const }, { task: 'Pay', cells: ['C', 'I'] as const }, { task: 'Plan', cells: ['R'] as const }] };
    expect(raciProblems({ roles: broken.roles, tasks: broken.tasks.map((t) => ({ task: t.task, cells: [...t.cells] })) })).toEqual([
      'Hire: 2 people are accountable',
      'Hire: no one is responsible for doing the work',
      'Pay: no one is accountable',
      'Pay: no one is responsible for doing the work',
      'Plan: 1 letter for 2 roles',
      'Plan: no one is accountable',
    ]);
  });
});
