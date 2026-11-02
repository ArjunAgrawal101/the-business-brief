import { describe, expect, it } from 'vitest';
import { blankAction, reviewPlan, type Plan } from '../../src/lib/p3-plan';

const R = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'];

describe('the Paper 3 plan review', () => {
  it('asks for a direction, resources, tools, functions and an order when the plan is empty', () => {
    const p = reviewPlan({ direction: '', why: '', actions: [blankAction()] }, R);
    expect(p.find((x) => x.criterion === 'All')?.status).toBe('open');
    expect(p.find((x) => x.criterion === 'A')?.text).toMatch(/^0 of 6 resources/);
    expect(p.find((x) => x.criterion === 'B')?.status).toBe('warn');
  });

  it('credits a plan that uses every resource, two tools, four functions and three stages', () => {
    const plan: Plan = {
      direction: 'market-development',
      why: 'Existing food, a new market of offices',
      actions: [
        { text: 'Pilot afternoon catering for two offices', fn: 'marketing', stage: 'first', resources: ['R1', 'R4', 'R5'], tool: 'ansoff', gain: 'Offices already ask for catering', tradeoff: 'Afternoon-only service protects lunches but gives up the most valuable orders' },
        { text: 'Cook catering in the quiet afternoons', fn: 'operations', stage: 'first', resources: ['R2'], tool: 'gantt', gain: 'Idle capacity used', tradeoff: 'Capacity rises while the team works more shifts' },
        { text: 'Price every order to cover its costs', fn: 'finance', stage: 'then', resources: ['R3'], tool: 'other', gain: 'Trading income offsets the fall in sales', tradeoff: 'Higher prices win fewer orders, but every order adds to the surplus' },
        { text: 'Recruit two paid kitchen staff from local families', fn: 'hr', stage: 'later', resources: ['R6'], tool: '', gain: 'Overtime ends', tradeoff: 'Output slows while they train, because training takes time' },
      ],
    };
    const p = reviewPlan(plan, R);
    expect(p.filter((x) => x.status === 'met').map((x) => x.criterion).sort()).toEqual(['A', 'All', 'B', 'C', 'D']);
    expect(p.some((x) => x.status === 'warn')).toBe(false);
  });

  it('warns when the plan leans on grants or puts everything at one stage', () => {
    const plan: Plan = {
      direction: 'x',
      why: '',
      actions: [
        { ...blankAction(), text: 'Apply for a council grant', fn: 'finance', stage: 'first' },
        { ...blankAction(), text: 'Run a donations appeal', fn: 'marketing', stage: 'first' },
      ],
    };
    const p = reviewPlan(plan, R);
    expect(p.some((x) => x.status === 'warn' && /donations or grants/.test(x.text))).toBe(true);
    expect(p.some((x) => x.status === 'warn' && /one stage/.test(x.text))).toBe(true);
  });
});
