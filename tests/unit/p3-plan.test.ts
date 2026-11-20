import { describe, expect, it } from 'vitest';
import {
  MAX_RECS,
  blankPlan,
  blankRec,
  chosenNeeds,
  listOf,
  nextRecId,
  parsePlan,
  planSummary,
  planText,
  reviewPlan,
  tally,
  type Context,
  type Plan,
  type Prompt,
  type Rec,
} from '../../src/lib/p3-plan';
import { stimulusById } from '../../src/lib/p3-stimuli';

const haven = stimulusById('haven');
const water = stimulusById('ripplestone');
if (!haven || !water) throw new Error('stimuli missing');
const HAVEN: Context = { resources: haven.resources.map((r) => r.id), needs: haven.needs };
const WATER: Context = { resources: water.resources.map((r) => r.id), needs: water.needs };

const find = (ps: Prompt[], id: string) => ps.find((p) => p.id === id);
const rec = (id: string, over: Partial<Rec>): Rec => ({ ...blankRec(id), ...over });

/** A coherent plan for Ripplestone Water: every check should be met. */
function goodPlan(): Plan {
  return {
    ...blankPlan(),
    needs: ['n-water', 'c-filters', 'c-operators', 'c-surplus', 'o-clinics'],
    direction: 'market-penetration',
    why: 'More families in the villages already served, then the twelve without a kiosk (R1, R3)',
    recs: [
      rec('a1', {
        text: 'Hold a buffer stock of filter cartridges and add a second supplier',
        fn: 'operations',
        serves: ['c-filters', 'n-water'],
        evidence: ['R4', 'R6'],
        tool: 'force-field',
        uses: 'The surplus of about $410 a kiosk in a dry-season month',
        funding: 'surplus',
        stage: 'first',
        step: 'Grace orders three months of cartridges from both suppliers',
        gain: 'Kiosks stop breaking down, so families keep buying safe water',
        areas: ['finance'],
        tradeoff: 'Cash is tied up in stock, but every working day sells water',
      }),
      rec('a2', {
        text: 'Pay operators a base wage plus their share, with monthly training',
        fn: 'hr',
        serves: ['c-operators'],
        evidence: ['R7'],
        tool: 'motivation',
        uses: 'Operators already in post; one day a month',
        funding: 'surplus',
        stage: 'first',
        step: 'The board sets the base wage at its next meeting',
        gain: 'Operators stay and kiosks stay open',
        areas: ['finance', 'operations'],
        tradeoff: 'Costs rise in the rainy season, when the surplus is only $90, but steadier staff keep kiosks selling',
      }),
      rec('a3', {
        text: 'Launch the family card at $5 a month, promoted by clinic nurses',
        fn: 'marketing',
        serves: ['n-water', 'c-surplus', 'o-clinics'],
        evidence: ['R3', 'R5'],
        tool: 'marketing-mix',
        uses: 'Clinic nurses and the kiosks',
        funding: 'trading',
        stage: 'then',
        after: ['a1'],
        step: 'Pilot the card in two villages for three months',
        gain: 'Steady income all year and water families can afford',
        areas: ['finance'],
        tradeoff: 'Income becomes steadier, while heavy users pay less a can',
      }),
      rec('a4', {
        text: 'Borrow from the microfinance provider to build six kiosks',
        fn: 'finance',
        serves: ['n-water'],
        evidence: ['R2', 'R7'],
        tool: 'investment',
        uses: 'The loan offered, and operators trained as in recommendation 2',
        funding: 'loan',
        stage: 'later',
        after: ['a2', 'a3'],
        step: 'Agree the loan terms once the card pilot has run',
        gain: 'Safe water close to home in six more villages',
        areas: ['operations', 'marketing'],
        tradeoff: 'Repayments at 18% take part of the surplus, but six villages gain safe water',
      }),
    ],
    judgement: 'Reliability first, because a kiosk that breaks down meets no need; growth only once the cash is steady.',
    reviews: [{ measure: 'Days each kiosk is open', target: 'every day', when: 'monthly' }, { measure: '', target: '', when: '' }, { measure: '', target: '', when: '' }],
  };
}

describe('the plan builder: the steps of a coherent plan', () => {
  it('asks for every step when the plan is empty', () => {
    const p = reviewPlan(blankPlan(), WATER);
    expect(find(p, 'need')?.status).toBe('open');
    expect(find(p, 'direction')?.status).toBe('open');
    expect(find(p, 'recs')?.status).toBe('open');
    expect(find(p, 'resources')?.text).toMatch(/^0 of 7 resources/);
    expect(find(p, 'tools')?.status).toBe('warn');
    expect(find(p, 'judgement')?.status).toBe('open');
    expect(find(p, 'review')?.status).toBe('open');
    expect(p.every((x) => x.step >= 1 && x.step <= 5)).toBe(true);
    expect(tally(p).met).toBe(0);
  });

  it('meets every check for a plan tied to the need, resource-based, integrated, sequenced and evaluated', () => {
    const p = reviewPlan(goodPlan(), WATER);
    const notMet = p.filter((x) => x.status !== 'met');
    expect(notMet, JSON.stringify(notMet, null, 1)).toEqual([]);
    expect(p.map((x) => x.id)).toEqual(
      expect.arrayContaining(['need', 'challenges', 'direction', 'tied', 'need-served', 'resources', 'tools', 'resource-based', 'steps', 'order', 'links', 'impact', 'integration', 'tradeoffs', 'judgement', 'review']),
    );
    // Every step has a check.
    expect(new Set(p.map((x) => x.step))).toEqual(new Set([1, 2, 3, 4, 5]));
  });
});

describe('each recommendation is tied to a need or challenge and to evidence', () => {
  it('names the recommendations that answer nothing, or cite nothing', () => {
    const plan = goodPlan();
    plan.recs[1] = { ...plan.recs[1]!, serves: [] };
    plan.recs[2] = { ...plan.recs[2]!, evidence: [] };
    const tied = find(reviewPlan(plan, WATER), 'tied');
    expect(tied?.status).toBe('open');
    expect(tied?.text).toMatch(/^Recommendation 2 answers no need or challenge you chose; Recommendation 3 cites no resource\./);
  });

  it('does not count a need the plan no longer chooses', () => {
    const plan = goodPlan();
    plan.needs = plan.needs.filter((n) => n !== 'c-operators');
    expect(find(reviewPlan(plan, WATER), 'tied')?.text).toMatch(/Recommendation 2 answers no need/);
  });

  it('warns when no recommendation meets the human need itself, only the challenges', () => {
    const plan = goodPlan();
    plan.recs = plan.recs.map((r) => ({ ...r, serves: r.serves.filter((s) => s !== 'n-water') }));
    plan.recs[3] = { ...plan.recs[3]!, serves: ['c-surplus'] };
    const p = find(reviewPlan(plan, WATER), 'need-served');
    expect(p?.status).toBe('warn');
    expect(p?.text).toMatch(/at most 2 of 6 for C \(May 2025 report/);
  });

  it('counts a need written in the student’s own words', () => {
    const plan = goodPlan();
    plan.needs = ['c-filters', 'c-operators', 'c-surplus', 'o-clinics'];
    plan.custom = [
      { id: 'x1', kind: 'need', text: 'Safe water for children under five' },
      { id: 'x2', kind: 'challenge', text: '' },
    ];
    plan.recs = plan.recs.map((r) => ({ ...r, serves: r.serves.map((s) => (s === 'n-water' ? 'x1' : s)) }));
    expect(chosenNeeds(plan, WATER).map((n) => n.id)).toEqual(['c-filters', 'c-operators', 'c-surplus', 'o-clinics', 'x1']);
    const p = reviewPlan(plan, WATER);
    expect(find(p, 'need')?.status).toBe('met');
    expect(find(p, 'need-served')?.status).toBe('met');
  });

  it('asks for the resources not yet used, and counts those cited for the direction', () => {
    const plan = goodPlan();
    plan.recs[3] = { ...plan.recs[3]!, evidence: ['R7'] };
    plan.why = 'More families in the villages already served';
    const p = find(reviewPlan(plan, WATER), 'resources');
    expect(p?.status).toBe('open');
    expect(p?.text).toMatch(/^5 of 7 resources used/);
    expect(p?.text).toMatch(/Not yet used: R1, R2\./);
  });
});

describe('recommendations are resource-based', () => {
  it('asks what each recommendation uses and how it is paid for', () => {
    const plan = goodPlan();
    plan.recs[0] = { ...plan.recs[0]!, uses: '' };
    plan.recs[2] = { ...plan.recs[2]!, funding: '' };
    const p = find(reviewPlan(plan, WATER), 'resource-based');
    expect(p?.status).toBe('open');
    expect(p?.text).toBe('Still to say: Recommendation 1, what it uses; Recommendation 3, how it is paid for. A feasible plan is one the organization could afford and staff.');
  });

  it('warns when the plan leans on grants or donations, by funding or in words', () => {
    const plan = goodPlan();
    plan.recs[3] = { ...plan.recs[3]!, funding: 'grant' };
    plan.recs[2] = { ...plan.recs[2]!, text: 'Run a donations appeal for new kiosks' };
    const p = find(reviewPlan(plan, WATER), 'gifts');
    expect(p?.status).toBe('warn');
    expect(p?.text).toMatch(/^Recommendation 3 and Recommendation 4 lean on donations or grants/);
  });

  it('asks which trading income repays a loan', () => {
    const plan = goodPlan();
    plan.recs = plan.recs.map((r) => ({ ...r, funding: r.funding === 'loan' ? 'loan' : 'capacity' }));
    expect(find(reviewPlan(plan, WATER), 'loan')?.status).toBe('open');
    expect(find(reviewPlan(goodPlan(), WATER), 'loan')).toBeUndefined();
  });

  it('warns when hiring comes first with nothing first to pay for it', () => {
    const plan: Plan = { ...blankPlan(), recs: [rec('a1', { text: 'Recruit two new staff', fn: 'hr', stage: 'first', funding: 'trading' }), rec('a2', { text: 'Advertise to offices', fn: 'marketing', stage: 'then' })] };
    expect(find(reviewPlan(plan, HAVEN), 'pay-first')?.status).toBe('warn');
    plan.recs[0] = { ...plan.recs[0]!, funding: 'surplus' };
    expect(find(reviewPlan(plan, HAVEN), 'pay-first')).toBeUndefined();
  });
});

describe('marketing, finance, human resources and operations are integrated', () => {
  it('names a missing function', () => {
    const plan = goodPlan();
    plan.recs = plan.recs.filter((r) => r.fn !== 'hr').map((r) => ({ ...r, areas: r.areas.filter((a) => a !== 'hr') }));
    const p = find(reviewPlan(plan, WATER), 'integration');
    expect(p?.status).toBe('open');
    expect(p?.text).toMatch(/^3 of 4 functions in the plan \(missing: Human resources\)/);
  });

  it('asks for links when the four functions stand apart', () => {
    const plan = goodPlan();
    plan.recs = plan.recs.map((r) => ({ ...r, areas: [], after: [] }));
    const p = find(reviewPlan(plan, WATER), 'integration');
    expect(p?.status).toBe('open');
    expect(p?.text).toMatch(/They fall into 4 separate groups: Marketing; Operations; Human resources; Finance\./);
  });

  it('counts a dependency between functions as a link', () => {
    const plan = goodPlan();
    plan.recs = plan.recs.map((r) => ({ ...r, areas: [] }));
    // a3 (marketing) after a1 (operations); a4 (finance) after a2 (hr) and a3 (marketing): one group.
    expect(find(reviewPlan(plan, WATER), 'integration')?.status).toBe('met');
  });

  it('accepts one recommendation carried through all four functions', () => {
    const plan: Plan = { ...goodPlan(), recs: [rec('a1', { ...goodPlan().recs[0], fn: 'marketing', areas: ['operations', 'hr', 'finance'] })] };
    expect(find(reviewPlan(plan, WATER), 'integration')?.status).toBe('met');
  });
});

describe('implementation steps, order and evaluation', () => {
  it('asks for a first step for each recommendation', () => {
    const plan = goodPlan();
    plan.recs[1] = { ...plan.recs[1]!, step: '' };
    plan.recs[3] = { ...plan.recs[3]!, step: ' ' };
    expect(find(reviewPlan(plan, WATER), 'steps')?.text).toMatch(/^Recommendation 2 and Recommendation 4 have no first step yet/);
  });

  it('warns when every recommendation sits at one stage', () => {
    const plan = goodPlan();
    plan.recs = plan.recs.map((r) => ({ ...r, stage: 'first', after: [] }));
    const p = find(reviewPlan(plan, WATER), 'order');
    expect(p?.status).toBe('warn');
    expect(p?.text).toBe('Sequenced: First 4, Then 0, Later 0. Every recommendation is at one stage: a plan needs an order.');
  });

  it('warns when a recommendation depends on one that comes later, or two depend on each other', () => {
    const plan = goodPlan();
    plan.recs[0] = { ...plan.recs[0]!, after: ['a3'] };
    const p = reviewPlan(plan, WATER);
    expect(find(p, 'backwards-a1-a3')?.text).toBe('Recommendation 1 depends on Recommendation 3, which comes later: move one of them.');
    expect(find(p, 'loop')?.text).toBe('Recommendation 1 and Recommendation 3 depend on each other: one of them has to come first.');
    expect(find(p, 'links')).toBeUndefined();
  });

  it('asks for dependencies when there are none', () => {
    const plan = goodPlan();
    plan.recs = plan.recs.map((r) => ({ ...r, after: [] }));
    expect(find(reviewPlan(plan, WATER), 'links')?.status).toBe('open');
  });

  it('asks for the expected impact, a real trade-off, a judgement and a review point', () => {
    const plan = goodPlan();
    plan.recs[0] = { ...plan.recs[0]!, gain: '' };
    plan.recs[1] = { ...plan.recs[1]!, tradeoff: 'It costs money.' };
    plan.recs[2] = { ...plan.recs[2]!, tradeoff: '' };
    plan.judgement = '';
    plan.reviews = plan.reviews.map(() => ({ measure: 'Days open', target: '', when: '' }));
    const p = reviewPlan(plan, WATER);
    expect(find(p, 'impact')?.text).toMatch(/^Recommendation 1 has no expected impact yet/);
    expect(find(p, 'tradeoffs')?.text).toMatch(/^Recommendation 3: no trade-off yet; Recommendation 2: the trade-off reads like a disadvantage\./);
    expect(find(p, 'judgement')?.status).toBe('open');
    expect(find(p, 'review')?.status).toBe('open');
  });

  it('asks why the risk is worth it when the direction is diversification', () => {
    const plan = goodPlan();
    plan.direction = 'diversification';
    expect(find(reviewPlan(plan, WATER), 'risk')?.status).toBe('open');
    plan.why += '; the risk is worth it because';
    expect(find(reviewPlan(plan, WATER), 'risk')).toBeUndefined();
  });

  it('notes that a SWOT has to decide something', () => {
    const plan = goodPlan();
    plan.recs[0] = { ...plan.recs[0]!, tool: 'swot' };
    expect(find(reviewPlan(plan, WATER), 'swot')?.criterion).toBe('A');
  });
});

describe('reading a stored plan', () => {
  it('upgrades the first version of the Haven plan: actions become recommendations and their resources their evidence', () => {
    const v1 = {
      direction: 'market-development',
      why: 'Offices ask for catering (R4)',
      actions: [
        { text: 'Pilot afternoon catering', fn: 'marketing', stage: 'first', resources: ['R1', 'R4', 'R9'], tool: 'ansoff', gain: 'Orders', tradeoff: 'Afternoons only, but lunches are safe' },
        { text: 'Recruit two kitchen staff', fn: 'hr', stage: 'later', resources: ['R6'], tool: 'nonsense', gain: '', tradeoff: '' },
        'not an action',
      ],
    };
    const plan = parsePlan(v1, HAVEN);
    expect(plan.v).toBe(2);
    expect(plan.direction).toBe('market-development');
    expect(plan.recs.map((r) => [r.id, r.text, r.fn, r.stage, r.tool])).toEqual([
      ['a1', 'Pilot afternoon catering', 'marketing', 'first', 'ansoff'],
      ['a2', 'Recruit two kitchen staff', 'hr', 'later', ''],
    ]);
    expect(plan.recs[0]?.evidence).toEqual(['R1', 'R4']);
    expect(plan.recs[0]?.tradeoff).toBe('Afternoons only, but lunches are safe');
    expect(plan.needs).toEqual([]);
  });

  it('keeps a stored plan as it was, and drops what it does not know', () => {
    const stored = { ...goodPlan(), title: 'Paper 3 plan: Ripplestone Water', savedAt: '2026-11-20T10:00:00.000Z' };
    expect(parsePlan(JSON.parse(JSON.stringify(stored)), WATER)).toEqual(goodPlan());
    const messy = {
      v: 2,
      needs: ['n-water', 'n-nothing', 4],
      direction: 'sideways',
      recs: [
        { id: 'a1', text: 'One', fn: 'magic', serves: ['n-water', 'zz'], evidence: ['R7', 'R70'], after: ['a1', 'a2', 'a9'], areas: ['finance', 'marketing', 'x'], funding: 'luck' },
        { id: 'a1', text: 'Two, with the same id' },
      ],
      reviews: 'none',
      custom: [{ id: 'x1', kind: 'wish', text: 'Something' }],
    };
    const plan = parsePlan(messy, WATER);
    expect(plan.needs).toEqual(['n-water']);
    expect(plan.direction).toBe('');
    expect(plan.recs.map((r) => r.id)).toEqual(['a1', 'a2']);
    expect(plan.recs[0]).toMatchObject({ fn: 'marketing', serves: ['n-water'], evidence: ['R7'], after: ['a2'], areas: ['finance'], funding: '' });
    expect(plan.custom[0]).toEqual({ id: 'x1', kind: 'challenge', text: 'Something' });
    expect(plan.reviews).toHaveLength(3);
  });

  it('falls back to a blank plan for anything else, and caps the recommendations', () => {
    for (const raw of [null, undefined, 'x', 42, [], { recs: 'no' }]) expect(parsePlan(raw, WATER)).toEqual(blankPlan());
    const many = { v: 2, recs: Array.from({ length: 20 }, (_, i) => ({ id: `a${i + 1}`, text: `Recommendation ${i + 1}` })) };
    expect(parsePlan(many, WATER).recs).toHaveLength(MAX_RECS);
  });

  it('gives each new recommendation a fresh id', () => {
    const plan = goodPlan();
    expect(nextRecId(plan)).toBe('a5');
    plan.recs = [rec('a7', {})];
    expect(nextRecId(plan)).toBe('a8');
  });
});

describe('the plan as text and in a line', () => {
  it('writes the plan in order, with nothing undefined', () => {
    const text = planText(goodPlan(), WATER, 'Ripplestone Water');
    expect(text).toMatch(/^Plan of action: Ripplestone Water/);
    expect(text.indexOf('\nFirst\n')).toBeLessThan(text.indexOf('\nThen\n'));
    expect(text.indexOf('\nThen\n')).toBeLessThan(text.indexOf('\nLater\n'));
    expect(text).toMatch(/4\. Borrow from the microfinance provider to build six kiosks \(Finance\)/);
    expect(text).toMatch(/After: recommendation 2, recommendation 3/);
    expect(text).toMatch(/Review\n- Days each kiosk is open, target every day, checked monthly/);
    expect(text).not.toMatch(/undefined|NaN|\[object Object\]|\n\n\n/);
    expect(planText(blankPlan(), WATER, 'Ripplestone Water')).toBe('Plan of action: Ripplestone Water');
  });

  it('sums up the plan for the dashboard', () => {
    expect(planSummary(goodPlan())).toBe('Market penetration: 4 recommendations led by 4 of 4 functions');
    expect(planSummary(blankPlan())).toBe('No direction yet: 0 recommendations led by 0 of 4 functions');
  });

  it('joins lists in plain English', () => {
    expect(listOf([])).toBe('');
    expect(listOf(['a'])).toBe('a');
    expect(listOf(['a', 'b'])).toBe('a and b');
    expect(listOf(['a', 'b', 'c'])).toBe('a, b and c');
  });
});
