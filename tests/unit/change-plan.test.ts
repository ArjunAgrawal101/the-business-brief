import { describe, expect, it } from 'vitest';
import { APPROACH_FOR, REASONS, and, approachesFor, changeCsvRows, planSteps, quadrant, readChange, readForces, resistance, risk, validateChange, type ChangeInputs, type Stakeholder } from '../../src/lib/change-plan';
import { forceFieldSvg, leverOptionsHtml, resistanceHtml, stakeholderMapHtml, stepsHtml } from '../../src/lib/change-plan-view';
import { loadTool } from './helpers/room-tool';

// Wenlow Care (fictional): two 12-hour shifts a day instead of three 8-hour shifts.
const DRIVING = [
  { label: 'Fewer handovers, fewer errors in care notes', strength: 4 },
  { label: 'Agency costs of short evening shifts', strength: 4 },
  { label: 'More full days off for staff', strength: 3 },
  { label: 'Longer shifts attract some applicants', strength: 2 },
];
const RESTRAINING = [
  { label: 'Childcare does not fit 12-hour days', strength: 4 },
  { label: 'Fear that tired staff give worse care', strength: 4 },
  { label: 'Loss of the evening shift premium', strength: 3 },
  { label: 'Staff told, not consulted', strength: 3 },
];
const PEOPLE: Stakeholder[] = [
  { name: 'Care workers with young children', power: 'low', interest: 'high', stance: 'opposes', reason: 'routine' },
  { name: 'Senior carers who lead each shift', power: 'high', interest: 'high', stance: 'opposes', reason: 'disagree' },
  { name: 'Union branch', power: 'high', interest: 'high', stance: 'opposes', reason: 'security' },
  { name: 'Home managers', power: 'high', interest: 'high', stance: 'supports', reason: 'none' },
  { name: 'Night staff', power: 'low', interest: 'high', stance: 'neutral', reason: 'unknown' },
  { name: "Residents' families", power: 'low', interest: 'high', stance: 'neutral', reason: 'communication' },
  { name: 'Care regulator', power: 'high', interest: 'low', stance: 'neutral', reason: 'none' },
];
const PLAN: ChangeInputs = { change: 'Move care staff from three 8-hour shifts a day to two 12-hour shifts', driving: DRIVING, restraining: RESTRAINING, stakeholders: PEOPLE, lever: 3 };

describe('the worked example', () => {
  it('is the Wenlow Care plan, as the YAML gives it', () => {
    const t = loadTool('people-change-plan', 'change-planner');
    expect(t.driving).toEqual(DRIVING);
    expect(t.restraining).toEqual(RESTRAINING);
    expect(t.stakeholders).toEqual(PEOPLE);
    expect(t.lever).toBe(3);
    expect(t.guide.storageKey).toBe('people:change-plan');
    expect(validateChange(t)).toEqual([]);
  });
});

describe('force field analysis, worked by hand', () => {
  it('totals 4 + 4 + 3 + 2 = 13 driving against 4 + 4 + 3 + 3 = 14 restraining', () => {
    const f = readForces(DRIVING, RESTRAINING, null);
    expect(f.summary.driving).toBe(13);
    expect(f.summary.restraining).toBe(14);
    expect(f.summary.balance).toBe('restraining');
    expect(f.lever).toBeNull();
  });
  it('weakens the lack of consultation from 3 to 1, which tips the balance: 13 against 12', () => {
    const f = readForces(DRIVING, RESTRAINING, 3);
    expect(f.lever?.from).toBe(3);
    expect(f.lever?.to).toBe(1);
    expect(f.lever?.after.restraining).toBe(12);
    expect(f.lever?.after.balance).toBe('driving');
  });
  it('never weakens a force below 1, and ignores a choice that is not on the list', () => {
    expect(readForces(DRIVING, [{ label: 'x', strength: 2 }], 0).lever?.to).toBe(1);
    expect(readForces(DRIVING, RESTRAINING, 9).lever).toBeNull();
  });
});

describe('stakeholder mapping', () => {
  it('places each group by power and interest', () => {
    expect(quadrant({ power: 'high', interest: 'high' })).toBe('manage-closely');
    expect(quadrant({ power: 'high', interest: 'low' })).toBe('keep-satisfied');
    expect(quadrant({ power: 'low', interest: 'high' })).toBe('keep-informed');
    expect(quadrant({ power: 'low', interest: 'low' })).toBe('monitor');
  });
  it('draws four labelled boxes with every stakeholder in one of them', () => {
    const html = stakeholderMapHtml(PEOPLE);
    PEOPLE.forEach((p) => expect(html).toContain(p.name.replace("'", '&#39;')));
    expect(html.indexOf('Manage closely')).toBeLessThan(html.indexOf('Keep satisfied'));
    expect(html).toContain('Nobody here.'); // nobody has low power and low interest
  });
});

describe('the resistance to expect', () => {
  it('rates opposition by power: high where it could block the change', () => {
    expect(risk(PEOPLE[1] as Stakeholder)).toBe('high');
    expect(risk(PEOPLE[0] as Stakeholder)).toBe('medium');
    expect(risk(PEOPLE[3] as Stakeholder)).toBe('ally');
    expect(risk(PEOPLE[6] as Stakeholder)).toBe('watch');
    expect(risk({ power: 'low', interest: 'low', stance: 'neutral' })).toBe('low');
  });
  it('lists the riskiest first, keeping the order given within a level', () => {
    expect(resistance(PEOPLE).map((r) => r.name)).toEqual(['Senior carers who lead each shift', 'Union branch', 'Care workers with young children', 'Night staff', "Residents' families", 'Care regulator', 'Home managers']);
  });
  it('matches each reason to the approaches that fit it', () => {
    REASONS.forEach((r) => expect(APPROACH_FOR[r.id]).toBeDefined());
    expect(approachesFor(PEOPLE[2] as Stakeholder)).toEqual(['negotiation', 'education', 'participation']); // a key player, so also involved
    expect(approachesFor(PEOPLE[0] as Stakeholder)).toEqual(['facilitation', 'participation']);
    expect(approachesFor(PEOPLE[6] as Stakeholder)).toEqual(['education']); // no reason given: explain
    expect(approachesFor(PEOPLE[3] as Stakeholder)).toEqual([]); // supporters need no answer
  });
  it('leaves allies out of the list of resistance', () => {
    expect(resistanceHtml(PEOPLE)).not.toContain('Home managers');
    expect(resistanceHtml([PEOPLE[3] as Stakeholder])).toContain('Nobody is expected to resist');
  });
});

describe('the steps to take', () => {
  const steps = planSteps(PLAN);
  it('explains first, then involves, negotiates, supports, pilots and reviews', () => {
    expect(steps.map((s) => s.id)).toEqual(['explain', 'involve', 'negotiate', 'support', 'pilot', 'review']);
  });
  it('names who each step is for', () => {
    const by = Object.fromEntries(steps.map((s) => [s.id, s.who]));
    expect(by.involve).toEqual(['Senior carers who lead each shift', 'Union branch', 'Care workers with young children', "Residents' families"]);
    expect(by.negotiate).toEqual(['Union branch']);
    expect(by.support).toEqual(['Care workers with young children', 'Night staff']);
    expect(steps[0]?.what).toContain("Take particular care to explain it to Union branch, Night staff, Residents' families and Care regulator.");
    expect(steps[0]?.what).toContain('Ask Home managers to help make the case.');
  });
  it('drops the pilot when the driving forces lead clearly and nobody powerful opposes', () => {
    const easy = planSteps({ ...PLAN, driving: [{ label: 'a', strength: 5 }, { label: 'b', strength: 5 }], restraining: [{ label: 'c', strength: 2 }], stakeholders: [{ name: 'Staff', power: 'low', interest: 'high', stance: 'neutral', reason: 'unknown' }] });
    expect(easy.map((s) => s.id)).toEqual(['explain', 'support', 'review']);
  });
  it('renders the steps in order, each with its approach and drawback', () => {
    const html = stepsHtml(PLAN);
    expect(html.indexOf('Explain the change')).toBeLessThan(html.indexOf('Review it'));
    expect(html).toContain('Negotiation and agreement.');
    expect(html).toContain('Its drawback:');
  });
});

describe('the reading, the checks and the files', () => {
  it('counts the opposition and the forces', () => {
    const r = readChange(PLAN);
    expect(r.reading).toBe('Three stakeholders are expected to oppose the change, and two of them have the power to block it. The restraining forces (14) outweigh the driving forces (13).');
    expect(r.implication).toBe('Plan for the reasons behind the opposition: disagreement with the plan itself; a threat to jobs, pay or status; routines and arrangements disrupted. Each calls for a different approach, so a single announcement will not be enough.');
    expect(readChange({ ...PLAN, stakeholders: [PEOPLE[3] as Stakeholder] }).reading).toContain('No stakeholder is expected to oppose the change');
  });
  it('joins lists in plain English', () => {
    expect(and([])).toBe('');
    expect(and(['a'])).toBe('a');
    expect(and(['a', 'b', 'c'])).toBe('a, b and c');
  });
  it('refuses an empty change, unnamed forces and stakeholders, and impossible strengths', () => {
    const p = validateChange({ change: ' ', driving: [{ label: '', strength: 3 }], restraining: [{ label: 'x', strength: 7 }], stakeholders: [{ name: '', power: 'high', interest: 'low', stance: 'opposes', reason: 'none' }] });
    expect(p.map((x) => `${x.field}${x.index ?? ''}${x.part ?? ''}`)).toEqual(['change', 'driving0label', 'restraining0strength', 'stakeholders0name']);
    expect(validateChange({ ...PLAN, driving: [] }).map((x) => x.field)).toEqual(['driving']);
    expect(validateChange({ ...PLAN, stakeholders: [{ ...(PEOPLE[0] as Stakeholder), stance: 'maybe' }] })[0]?.message).toContain('stance');
  });
  it('writes forces, stakeholders and steps to the CSV', () => {
    const rows = changeCsvRows(PLAN);
    expect(rows[0]).toEqual(['The change', PLAN.change]);
    expect(rows.find((r) => r[0] === 'Total restraining')?.[2]).toBe('14');
    expect(rows.filter((r) => r.length === 8).length).toBe(1 + PEOPLE.length);
    expect(rows[rows.length - 1]?.[0]).toBe('6. Review it, and keep what works');
  });
  it('draws the diagram with its result in words, and the weakened force from 3 to 1', () => {
    const svg = forceFieldSvg(DRIVING, RESTRAINING, 3, 'f');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('Driving forces, total 13');
    expect(svg).toContain('would make the restraining total 12');
    expect(svg).toContain('3 to 1');
    expect(leverOptionsHtml(RESTRAINING, 3)).toContain('<option value="3" selected>4. Staff told, not consulted</option>');
  });
});
