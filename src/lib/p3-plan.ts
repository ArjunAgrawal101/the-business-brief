/**
 * The Paper 3 plan builder: its model, its steps and its coherence checks.
 *
 * A plan is built in five steps: the human need and the challenges it answers
 * (chosen from the stimulus, or written in), one direction for the whole
 * organization, the recommendations (each tied to what it is for, to the
 * evidence and to the tool that shaped it), how each will work (what it uses,
 * how it is paid for, when it happens, what it depends on and its first
 * step), and the evaluation (its expected impact on the other areas, the
 * trade-off, a judgement on the plan as a whole and how progress is checked).
 *
 * The checks are prompts, never marks: they count and connect what a plan
 * says, against the four criteria of question 3 (guide, pp. 48-49); the
 * quality of the reasoning is what earns the marks.
 *
 * Saved as { v: 2, ... } under bb:p3:plan (Haven Lunchbox, on the Paper 3
 * page) and bb:p3:plan:<stimulus> (the practice stimuli). The first version,
 * { direction, why, actions }, is read and upgraded.
 */
import type { Need } from './p3-stimuli';

export const FUNCTIONS = ['marketing', 'operations', 'hr', 'finance'] as const;
export const STAGES = ['first', 'then', 'later'] as const;
export const DIRECTIONS = ['', 'market-penetration', 'product-development', 'market-development', 'diversification'] as const;
/** The guide's toolkit (pp. 14-15), with the syllabus theories plans most often apply. */
export const TOOLS = [
  '',
  'ansoff',
  'force-field',
  'gantt',
  'swot',
  'steeple',
  'bcg',
  'porter',
  'business-plan',
  'decision-tree',
  'statistics',
  'circular',
  'hofstede',
  'contribution',
  'cpa',
  'regression',
  'marketing-mix',
  'motivation',
  'break-even',
  'cash-flow',
  'investment',
  'finance-sources',
  'other',
] as const;
export const FUNDING = ['', 'capacity', 'surplus', 'trading', 'loan', 'leasing', 'partner', 'grant', 'donation'] as const;

export type Fn = (typeof FUNCTIONS)[number];
export type Stage = (typeof STAGES)[number];
export type Direction = (typeof DIRECTIONS)[number];
export type Tool = (typeof TOOLS)[number];
export type Funding = (typeof FUNDING)[number];
export type NeedKind = Need['kind'];
export type Criterion = 'A' | 'B' | 'C' | 'D' | 'All';
export type Status = 'met' | 'open' | 'warn';
export type StepNo = 1 | 2 | 3 | 4 | 5;

export const FN_LABEL: Record<Fn, string> = { marketing: 'Marketing', operations: 'Operations', hr: 'Human resources', finance: 'Finance' };
export const STAGE_LABEL: Record<Stage, string> = { first: 'First', then: 'Then', later: 'Later' };
export const KIND_LABEL: Record<NeedKind, string> = { need: 'Human need', challenge: 'Challenge', opportunity: 'Opportunity' };
export const DIRECTION_LABEL: Record<Direction, string> = {
  '': 'Choose a direction',
  'market-penetration': 'Market penetration: existing products, existing market',
  'product-development': 'Product development: new products, existing market',
  'market-development': 'Market development: existing products, new market',
  diversification: 'Diversification: new products, new market',
};
export const TOOL_LABEL: Record<Tool, string> = {
  '': 'No tool',
  ansoff: 'Ansoff matrix',
  'force-field': 'Force field analysis',
  gantt: 'Gantt chart',
  swot: 'SWOT analysis',
  steeple: 'STEEPLE analysis',
  bcg: 'BCG matrix',
  porter: "Porter's generic strategies",
  'business-plan': 'Business plan',
  'decision-tree': 'Decision tree',
  statistics: 'Descriptive statistics',
  circular: 'Circular business models',
  hofstede: "Hofstede's cultural dimensions",
  contribution: 'Contribution: make or buy, contribution and absorption costing',
  cpa: 'Critical path analysis',
  regression: 'Simple linear regression',
  'marketing-mix': 'The seven Ps of the marketing mix',
  motivation: 'A motivation theory',
  'break-even': 'Break-even analysis',
  'cash-flow': 'Cash flow forecast',
  investment: 'Investment appraisal',
  'finance-sources': 'Sources of finance',
  other: 'Another tool or theory',
};
/** The decision each tool informs: a tool earns its place by deciding something. */
export const TOOL_DECIDES: Record<Tool, string> = {
  '': 'Choose the tool or theory that decided this recommendation, if one did.',
  ansoff: 'Which direction of growth, and how risky it is.',
  'force-field': 'Whether a change is likely to succeed, from the forces for and against it in the resources.',
  gantt: 'The order and timing of the actions.',
  swot: 'Which strengths to build on and which threats to guard against. A SWOT that only restates the stimulus decides nothing.',
  steeple: 'Which changes outside the organization the plan must answer.',
  bcg: 'Which products to invest in, keep or drop.',
  porter: 'Whether to compete on low cost or on difference, and for a broad or a narrow market.',
  'business-plan': 'What a new venture needs, and in what order.',
  'decision-tree': 'Which option is worth more once its chances are weighed, from figures in the resources.',
  statistics: 'What the figures show: averages, spread and trends.',
  circular: 'How to keep products and materials in use for longer.',
  hofstede: 'How to adapt the plan to another culture.',
  contribution: 'Whether to make or buy, and whether an order covers its own costs.',
  cpa: 'Which activities cannot be delayed without delaying the whole plan.',
  regression: 'What a trend in the data forecasts, and how far to trust it.',
  'marketing-mix': 'How to price, promote and deliver the service to the people it is for.',
  motivation: 'How to pay, train and keep the people the plan needs.',
  'break-even': 'How many sales cover the costs.',
  'cash-flow': 'Whether the cash lasts while the plan is set up.',
  investment: 'Whether a spend pays back, and how soon.',
  'finance-sources': 'How to pay for the plan, short or long term.',
  other: 'Say in the recommendation which tool or theory, and what it decided.',
};
export const FUNDING_LABEL: Record<Funding, string> = {
  '': 'Choose how it is paid for',
  capacity: 'What it already has: idle capacity, staff time or equipment',
  surplus: 'Surplus kept from trading',
  trading: 'Its own sales: it earns its keep',
  loan: 'A loan or microfinance, repaid from trading',
  leasing: 'Leasing',
  partner: "A partner's help in kind",
  grant: 'A grant',
  donation: 'Donations or an appeal',
};

export const MAX_RECS = 8;
export const MAX_CUSTOM = 2;
export const MAX_REVIEWS = 3;
const MAX_TEXT = 600;

export interface Rec {
  id: string;
  text: string;
  /** The function that leads it. */
  fn: Fn;
  /** The needs, challenges and opportunities it answers, by id. */
  serves: string[];
  /** The resources that are its evidence, by id. */
  evidence: string[];
  tool: Tool;
  /** What it uses of what the organization has: people, capacity, equipment, money. */
  uses: string;
  funding: Funding;
  stage: Stage;
  /** Recommendations that must come first, by id. */
  after: string[];
  /** The first implementation step: who does what first. */
  step: string;
  /** The expected impact. */
  gain: string;
  /** The other areas it affects. */
  areas: Fn[];
  tradeoff: string;
}

export interface Custom {
  id: string;
  kind: NeedKind;
  text: string;
}

export interface Review {
  measure: string;
  target: string;
  when: string;
}

export interface Plan {
  v: 2;
  needs: string[];
  custom: Custom[];
  direction: Direction;
  why: string;
  recs: Rec[];
  judgement: string;
  reviews: Review[];
}

/** What the checks need from the stimulus: its resources and its needs. */
export interface Context {
  resources: string[];
  needs: Need[];
}

export interface Prompt {
  id: string;
  step: StepNo;
  criterion: Criterion;
  status: Status;
  text: string;
}

export const CUSTOM_IDS = Array.from({ length: MAX_CUSTOM }, (_, i) => `x${i + 1}`);

export const blankRec = (id: string): Rec => ({
  id,
  text: '',
  fn: 'marketing',
  serves: [],
  evidence: [],
  tool: '',
  uses: '',
  funding: '',
  stage: 'first',
  after: [],
  step: '',
  gain: '',
  areas: [],
  tradeoff: '',
});

export const blankReview = (): Review => ({ measure: '', target: '', when: '' });

export const blankPlan = (): Plan => ({
  v: 2,
  needs: [],
  custom: CUSTOM_IDS.map((id) => ({ id, kind: 'challenge', text: '' })),
  direction: '',
  why: '',
  recs: [blankRec('a1'), blankRec('a2'), blankRec('a3')],
  judgement: '',
  reviews: Array.from({ length: MAX_REVIEWS }, blankReview),
});

/** The next free recommendation id. */
export function nextRecId(plan: Plan): string {
  const n = plan.recs.reduce((m, r) => Math.max(m, Number(r.id.slice(1)) || 0), 0);
  return `a${n + 1}`;
}

/* ---------- Reading what is stored ---------- */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max = MAX_TEXT) => (typeof v === 'string' ? v.slice(0, max) : '');
const oneOf = <T extends string>(list: readonly T[], v: unknown, fallback: T): T => (typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : fallback);
const ids = (v: unknown, allowed: (s: string) => boolean, max = 20): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && allowed(x)))].slice(0, max) : [];

/**
 * A plan from what is stored: the current shape, or the first version
 * ({ direction, why, actions }) upgraded, or a blank plan. Unknown ids and
 * values are dropped, never trusted.
 */
export function parsePlan(raw: unknown, ctx: Context): Plan {
  const plan = blankPlan();
  if (!isObj(raw)) return plan;
  const resourceOk = (s: string) => ctx.resources.includes(s);
  const needIds = new Set([...ctx.needs.map((n) => n.id), ...CUSTOM_IDS]);
  plan.direction = oneOf(DIRECTIONS, raw.direction, '');
  plan.why = str(raw.why);

  const list = Array.isArray(raw.recs) ? raw.recs : Array.isArray(raw.actions) ? raw.actions : null;
  if (list) {
    const pairs: Array<[Rec, Record<string, unknown>]> = [];
    const taken = new Set<string>();
    for (const [i, item] of list.slice(0, MAX_RECS).entries()) {
      if (!isObj(item)) continue;
      let id = typeof item.id === 'string' && /^a\d{1,3}$/.test(item.id) && !taken.has(item.id) ? item.id : `a${i + 1}`;
      for (let n = i + 2; taken.has(id); n++) id = `a${n}`;
      taken.add(id);
      const fn = oneOf(FUNCTIONS, item.fn, 'marketing');
      pairs.push([
        {
          id,
          text: str(item.text),
          fn,
          serves: ids(item.serves, (s) => needIds.has(s)),
          // The first version kept the evidence as "resources".
          evidence: ids(item.evidence ?? item.resources, resourceOk),
          tool: oneOf(TOOLS, item.tool, ''),
          uses: str(item.uses),
          funding: oneOf(FUNDING, item.funding, ''),
          stage: oneOf(STAGES, item.stage, 'first'),
          after: [],
          step: str(item.step),
          gain: str(item.gain),
          areas: (ids(item.areas, (s) => (FUNCTIONS as readonly string[]).includes(s)) as Fn[]).filter((a) => a !== fn),
          tradeoff: str(item.tradeoff),
        },
        item,
      ]);
    }
    // Dependencies only between recommendations that exist, and never on itself.
    const known = new Set(pairs.map(([r]) => r.id));
    for (const [rec, item] of pairs) rec.after = ids(item.after, (s) => known.has(s) && s !== rec.id);
    if (pairs.length) plan.recs = pairs.map(([r]) => r);
  }

  if (raw.v === 2) {
    plan.needs = ids(raw.needs, (s) => ctx.needs.some((n) => n.id === s));
    if (Array.isArray(raw.custom)) {
      plan.custom = CUSTOM_IDS.map((id) => {
        const c = (raw.custom as unknown[]).find((x) => isObj(x) && x.id === id);
        return { id, kind: isObj(c) ? oneOf(['need', 'challenge', 'opportunity'] as const, c.kind, 'challenge') : 'challenge', text: isObj(c) ? str(c.text, 200) : '' };
      });
    }
    plan.judgement = str(raw.judgement, 1200);
    if (Array.isArray(raw.reviews)) {
      plan.reviews = Array.from({ length: MAX_REVIEWS }, (_, i) => {
        const r = (raw.reviews as unknown[])[i];
        return isObj(r) ? { measure: str(r.measure, 200), target: str(r.target, 200), when: str(r.when, 200) } : blankReview();
      });
    }
  }
  return plan;
}

/* ---------- The checks ---------- */

const filled = (s: string) => s.trim().length > 2;
const stageAt = (s: Stage) => STAGES.indexOf(s);
/** "a", "a and b", "a, b and c". */
export function listOf(items: string[]): string {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
/** The resources a piece of text names: "(R4)", "R2 and R6". */
export const refsIn = (text: string, resources: string[]) => resources.filter((r) => new RegExp(`\\b${r}\\b`).test(text));

/** The needs, challenges and opportunities the plan has chosen, from the stimulus and its own. */
export function chosenNeeds(plan: Plan, ctx: Context): Array<{ id: string; kind: NeedKind; text: string }> {
  const fromStimulus = ctx.needs.filter((n) => plan.needs.includes(n.id)).map((n) => ({ id: n.id, kind: n.kind, text: n.text }));
  const own = plan.custom.filter((c) => filled(c.text)).map((c) => ({ id: c.id, kind: c.kind, text: c.text.trim() }));
  return [...fromStimulus, ...own];
}

/** The recommendations with something written. */
export const writtenRecs = (plan: Plan) => plan.recs.filter((r) => filled(r.text));

const TRADE_WORDS = /\b(but|while|whereas|at the cost of|in exchange|gives? up|giving up|instead|so|because|although|though|yet)\b/i;
const GIFT_WORDS = /\b(donations?|donors?|grants?|fundrais\w*|appeal|charity money)\b/i;
const HIRE_WORDS = /\b(hire|hiring|recruit\w*|employ|employing|new staff|more staff)\b/i;

/** Which of the given functions are joined to each other by the links between them. */
function groupsOf(nodes: Fn[], edges: Array<[Fn, Fn]>): Fn[][] {
  const seen = new Set<Fn>();
  const out: Fn[][] = [];
  for (const start of nodes) {
    if (seen.has(start)) continue;
    const group: Fn[] = [];
    const queue = [start];
    seen.add(start);
    while (queue.length) {
      const f = queue.shift() as Fn;
      group.push(f);
      for (const [a, b] of edges) {
        const next = a === f ? b : b === f ? a : null;
        if (next && nodes.includes(next) && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    out.push(FUNCTIONS.filter((x) => group.includes(x)));
  }
  return out;
}

/** A loop of dependencies (a needs b, b needs a), as the recommendations in it, or null. */
function loopIn(recs: Rec[]): Rec[] | null {
  const byId = new Map(recs.map((r) => [r.id, r]));
  const state = new Map<string, 1 | 2>();
  const path: Rec[] = [];
  const visit = (r: Rec): Rec[] | null => {
    state.set(r.id, 1);
    path.push(r);
    for (const id of r.after) {
      const d = byId.get(id);
      if (!d) continue;
      if (state.get(d.id) === 1) return path.slice(path.indexOf(d));
      if (!state.has(d.id)) {
        const found = visit(d);
        if (found) return found;
      }
    }
    state.set(r.id, 2);
    path.pop();
    return null;
  };
  for (const r of recs) {
    if (state.has(r.id)) continue;
    const found = visit(r);
    if (found) return found;
  }
  return null;
}

/**
 * The plan against the four criteria, step by step. Each prompt says what is
 * met, what is still open, and what to rethink (warn).
 */
export function reviewPlan(plan: Plan, ctx: Context): Prompt[] {
  const out: Prompt[] = [];
  const recs = writtenRecs(plan);
  const name = (r: Rec) => `Recommendation ${plan.recs.indexOf(r) + 1}`;
  const names = (list: Rec[]) => listOf(list.map(name));
  const chosen = chosenNeeds(plan, ctx);
  const chosenIds = new Set(chosen.map((n) => n.id));
  const humans = chosen.filter((n) => n.kind === 'need');
  const others = chosen.filter((n) => n.kind !== 'need');

  /* Step 1: the need and the challenges. */
  out.push(
    humans.length
      ? { id: 'need', step: 1, criterion: 'All', status: 'met', text: `The plan meets ${humans.length === 1 ? 'a human need' : `${humans.length} human needs`}: ${humans.map((h) => h.text).join('; ')}.` }
      : { id: 'need', step: 1, criterion: 'All', status: 'open', text: 'Choose the human need the plan meets: question 3 asks for a plan for the organization in meeting it.' },
  );
  out.push(
    others.length
      ? { id: 'challenges', step: 1, criterion: 'C', status: 'met', text: `${others.length} ${others.length === 1 ? 'challenge or opportunity' : 'challenges and opportunities'} to answer on the way.` }
      : { id: 'challenges', step: 1, criterion: 'C', status: 'open', text: 'Choose the challenges that stand in the way of meeting the need, and any opportunity the resources show.' },
  );

  /* Step 2: the direction. */
  const whyRefs = refsIn(plan.why, ctx.resources);
  out.push(
    plan.direction === ''
      ? { id: 'direction', step: 2, criterion: 'All', status: 'open', text: 'Choose one forward-looking direction for the whole organization.' }
      : !filled(plan.why)
        ? { id: 'direction', step: 2, criterion: 'All', status: 'open', text: 'Say why this direction, from the resources.' }
        : !whyRefs.length
          ? { id: 'direction', step: 2, criterion: 'A', status: 'open', text: 'Name the resources that point to this direction, for example "(R4)".' }
          : { id: 'direction', step: 2, criterion: 'All', status: 'met', text: `Direction: ${DIRECTION_LABEL[plan.direction].split(':')[0]}, from ${listOf(whyRefs)}.` },
  );
  if (plan.direction === 'diversification' && !/\brisk/i.test(plan.why))
    out.push({ id: 'risk', step: 2, criterion: 'B', status: 'open', text: 'Diversification is the riskiest corner of the Ansoff matrix: say why the risk is worth taking.' });

  /* Step 3: the recommendations. */
  if (!recs.length) out.push({ id: 'recs', step: 3, criterion: 'All', status: 'open', text: 'Write the first recommendation: what the organization will do.' });
  else {
    const unserved = recs.filter((r) => !r.serves.some((id) => chosenIds.has(id)));
    const unsupported = recs.filter((r) => !r.evidence.some((id) => ctx.resources.includes(id)));
    const parts = [
      unserved.length ? `${names(unserved)} ${unserved.length === 1 ? 'answers' : 'answer'} no need or challenge you chose` : '',
      unsupported.length ? `${names(unsupported)} ${unsupported.length === 1 ? 'cites' : 'cite'} no resource` : '',
    ].filter(Boolean);
    out.push(
      parts.length
        ? { id: 'tied', step: 3, criterion: 'A', status: 'open', text: `${parts.join('; ')}. Tie each recommendation to what it is for and to the evidence for it.` }
        : { id: 'tied', step: 3, criterion: 'A', status: 'met', text: 'Every recommendation answers a need or challenge you chose, with evidence from the resources.' },
    );
    if (humans.length) {
      const forNeed = recs.filter((r) => r.serves.some((id) => humans.some((h) => h.id === id)));
      const unmet = humans.filter((h) => !recs.some((r) => r.serves.includes(h.id)));
      if (!forNeed.length)
        out.push({
          id: 'need-served',
          step: 3,
          criterion: 'C',
          status: 'warn',
          text: 'No recommendation meets the human need itself, only the challenges. Responses that analysed only the question 2 challenges reached at most 2 of 6 for C (May 2025 report, as the Paper 3 guide cites it).',
        });
      else if (unmet.length) out.push({ id: 'need-served', step: 3, criterion: 'C', status: 'open', text: `Nothing in the plan yet meets: ${unmet.map((h) => h.text).join('; ')}.` });
      else out.push({ id: 'need-served', step: 3, criterion: 'C', status: 'met', text: `The human need is met by ${names(forNeed)}.` });
    }
  }

  const used = ctx.resources.filter((id) => recs.some((r) => r.evidence.includes(id)) || whyRefs.includes(id));
  const unused = ctx.resources.filter((id) => !used.includes(id));
  out.push({
    id: 'resources',
    step: 3,
    criterion: 'A',
    status: unused.length ? 'open' : 'met',
    text: `${used.length} of ${ctx.resources.length} resources used as evidence${used.length ? ` (${used.join(', ')})` : ''}.${unused.length ? ` Not yet used: ${unused.join(', ')}.` : ''} The top level of A refers to all the resource materials.`,
  });

  const tools = [...new Set(recs.map((r) => r.tool).filter((t): t is Exclude<Tool, ''> => t !== ''))];
  out.push({
    id: 'tools',
    step: 3,
    criterion: 'B',
    status: tools.length >= 2 ? 'met' : tools.length === 1 ? 'open' : 'warn',
    text: tools.length
      ? `Tools shaping recommendations: ${tools.map((t) => TOOL_LABEL[t]).join(', ')}. Each should change the plan, not decorate it.${tools.length === 1 ? ' A second tool, applied, shows more of the plan was decided with business management thinking.' : ''}`
      : 'No tool shapes a recommendation yet. Naming a tool without using it earns at most 1 of the 4 marks for B (May 2026 report, as the Paper 3 guide cites it).',
  });
  if (tools.includes('swot'))
    out.push({ id: 'swot', step: 3, criterion: 'A', status: 'open', text: 'A SWOT analysis earns its place by deciding something: reports warn against a SWOT that only restates the stimulus.' });

  /* Step 4: making it work. */
  if (recs.length) {
    const gaps = recs
      .map((r) => [name(r), [!filled(r.uses) ? 'what it uses' : '', r.funding === '' ? 'how it is paid for' : ''].filter(Boolean)] as const)
      .filter(([, m]) => m.length > 0);
    out.push(
      gaps.length
        ? { id: 'resource-based', step: 4, criterion: 'C', status: 'open', text: `Still to say: ${gaps.map(([n, m]) => `${n}, ${m.join(' and ')}`).join('; ')}. A feasible plan is one the organization could afford and staff.` }
        : { id: 'resource-based', step: 4, criterion: 'C', status: 'met', text: 'Every recommendation says what it uses and how it is paid for: a plan the organization could afford and staff.' },
    );
    const gifts = recs.filter((r) => r.funding === 'grant' || r.funding === 'donation' || GIFT_WORDS.test(`${r.text} ${r.uses} ${r.gain}`));
    if (gifts.length)
      out.push({
        id: 'gifts',
        step: 4,
        criterion: 'C',
        status: 'warn',
        text: `${names(gifts)} ${gifts.length === 1 ? 'leans' : 'lean'} on donations or grants. A social enterprise earns most of its income by trading, and reports discourage plans that rely on gifts.`,
      });
    if (recs.some((r) => r.funding === 'loan') && !recs.some((r) => r.funding === 'trading' || r.funding === 'surplus'))
      out.push({ id: 'loan', step: 4, criterion: 'C', status: 'open', text: 'A loan is repaid from trading: show which recommendation earns the income that repays it.' });

    const paidFor = (r: Rec) => ['capacity', 'surplus', 'loan', 'leasing', 'partner'].includes(r.funding);
    const hiresFirst = recs.filter((r) => r.fn === 'hr' && r.stage === 'first' && HIRE_WORDS.test(r.text) && !paidFor(r));
    if (hiresFirst.length && !recs.some((r) => r.fn === 'finance' && r.stage === 'first'))
      out.push({ id: 'pay-first', step: 4, criterion: 'D', status: 'warn', text: 'Hiring comes first, but nothing first pays for it: check that the order works.' });

    const noStep = recs.filter((r) => !filled(r.step));
    out.push(
      noStep.length
        ? { id: 'steps', step: 4, criterion: 'D', status: 'open', text: `${names(noStep)} ${noStep.length === 1 ? 'has' : 'have'} no first step yet: say who does what first, so the plan can be carried out.` }
        : { id: 'steps', step: 4, criterion: 'D', status: 'met', text: 'Every recommendation has a first implementation step.' },
    );
  }

  const counts = STAGES.map((s) => recs.filter((r) => r.stage === s).length);
  const oneStage = recs.length > 1 && counts.filter((n) => n > 0).length === 1;
  out.push({
    id: 'order',
    step: 4,
    criterion: 'D',
    status: recs.length >= 3 && counts.every((n) => n > 0) ? 'met' : oneStage ? 'warn' : 'open',
    text: `Sequenced: First ${counts[0]}, Then ${counts[1]}, Later ${counts[2]}.${oneStage ? ' Every recommendation is at one stage: a plan needs an order.' : ''}`,
  });

  const byId = new Map(recs.map((r) => [r.id, r]));
  const links = recs.flatMap((r) => r.after.map((id) => byId.get(id)).filter((d): d is Rec => d !== undefined && d !== r).map((d) => [r, d] as const));
  const loop = loopIn(recs);
  const backwards = links.filter(([r, d]) => stageAt(d.stage) > stageAt(r.stage));
  if (loop) out.push({ id: 'loop', step: 4, criterion: 'D', status: 'warn', text: `${names(loop)} depend on each other: one of them has to come first.` });
  for (const [r, d] of backwards)
    out.push({ id: `backwards-${r.id}-${d.id}`, step: 4, criterion: 'D', status: 'warn', text: `${name(r)} depends on ${name(d)}, which comes later: move one of them.` });
  if (recs.length >= 2 && !links.length)
    out.push({ id: 'links', step: 4, criterion: 'D', status: 'open', text: 'Say what each recommendation depends on, so the order has reasons: a pilot before hiring, hiring before expansion.' });
  else if (links.length && !loop && !backwards.length)
    out.push({ id: 'links', step: 4, criterion: 'D', status: 'met', text: `The order follows ${links.length} ${links.length === 1 ? 'dependency' : 'dependencies'} between recommendations.` });

  /* Step 5: the evaluation. */
  if (recs.length) {
    const noGain = recs.filter((r) => !filled(r.gain));
    out.push(
      noGain.length
        ? { id: 'impact', step: 5, criterion: 'C', status: 'open', text: `${names(noGain)} ${noGain.length === 1 ? 'has' : 'have'} no expected impact yet: what it gains, and for whom.` }
        : { id: 'impact', step: 5, criterion: 'C', status: 'met', text: 'Every recommendation states its expected impact.' },
    );
  }

  const involved = FUNCTIONS.filter((f) => recs.some((r) => r.fn === f || r.areas.includes(f)));
  const edges: Array<[Fn, Fn]> = [];
  for (const r of recs) {
    for (const a of r.areas) if (a !== r.fn) edges.push([r.fn, a]);
    for (const id of r.after) {
      const d = byId.get(id);
      if (d && d.fn !== r.fn) edges.push([r.fn, d.fn]);
    }
  }
  const groups = groupsOf(involved, edges);
  const missing = FUNCTIONS.filter((f) => !involved.includes(f));
  out.push(
    !missing.length && groups.length === 1
      ? { id: 'integration', step: 5, criterion: 'C', status: 'met', text: 'All four functions are in the plan and linked: what one recommendation does reaches into the other areas.' }
      : {
          id: 'integration',
          step: 5,
          criterion: 'C',
          status: 'open',
          text: `${involved.length} of 4 functions in the plan${missing.length ? ` (missing: ${missing.map((f) => FN_LABEL[f]).join(', ')})` : ''}.${
            groups.length > 1
              ? ` They fall into ${groups.length} separate groups: ${groups.map((g) => listOf(g.map((f) => FN_LABEL[f]))).join('; ')}. Link them: say which other areas each recommendation affects, or what it depends on.`
              : ''
          }`,
        },
  );

  if (recs.length) {
    const noTrade = recs.filter((r) => !filled(r.tradeoff));
    const disadvantage = recs.filter((r) => filled(r.tradeoff) && !TRADE_WORDS.test(r.tradeoff));
    const parts = [
      noTrade.length ? `${names(noTrade)}: no trade-off yet` : '',
      disadvantage.length ? `${names(disadvantage)}: the trade-off reads like a disadvantage` : '',
    ].filter(Boolean);
    out.push(
      parts.length
        ? { id: 'tradeoffs', step: 5, criterion: 'C', status: 'open', text: `${parts.join('; ')}. A trade-off names what is gained in one area, what is given up in another, and why it is still worth it.` }
        : { id: 'tradeoffs', step: 5, criterion: 'C', status: 'met', text: 'Every recommendation weighs a trade-off between areas.' },
    );
  }

  out.push(
    filled(plan.judgement)
      ? { id: 'judgement', step: 5, criterion: 'C', status: 'met', text: 'The plan is weighed as a whole.' }
      : { id: 'judgement', step: 5, criterion: 'C', status: 'open', text: 'Weigh the plan as a whole: why it meets the need better than the alternative, and what its success depends on.' },
  );
  const reviews = plan.reviews.filter((r) => filled(r.measure) && filled(r.when));
  out.push(
    reviews.length
      ? { id: 'review', step: 5, criterion: 'D', status: 'met', text: `${reviews.length} review ${reviews.length === 1 ? 'point' : 'points'}: the plan says how it will know it is working.` }
      : { id: 'review', step: 5, criterion: 'D', status: 'open', text: 'Say how the organization will know the plan is working: what it will measure, the target, and when it will check.' },
  );

  return out;
}

/** Met, open and warn prompts, counted. */
export function tally(prompts: Prompt[]): Record<Status, number> {
  return { met: prompts.filter((p) => p.status === 'met').length, open: prompts.filter((p) => p.status === 'open').length, warn: prompts.filter((p) => p.status === 'warn').length };
}

/** One line for the dashboard: the direction and the shape of the plan. */
export function planSummary(plan: Plan): string {
  const recs = writtenRecs(plan);
  const fns = new Set(recs.map((r) => r.fn));
  const dir = plan.direction ? DIRECTION_LABEL[plan.direction].split(':')[0] : 'No direction yet';
  return `${dir}: ${recs.length} ${recs.length === 1 ? 'recommendation' : 'recommendations'} led by ${fns.size} of 4 functions`;
}

/** The plan as plain text, in order: to download or paste into notes. */
export function planText(plan: Plan, ctx: Context, organization: string): string {
  const recs = writtenRecs(plan);
  const chosen = chosenNeeds(plan, ctx);
  const label = (id: string) => chosen.find((n) => n.id === id)?.text ?? '';
  const num = (r: Rec) => plan.recs.indexOf(r) + 1;
  const lines = [`Plan of action: ${organization}`, ''];
  if (chosen.length) {
    lines.push('Meets');
    for (const n of chosen) lines.push(`- ${KIND_LABEL[n.kind]}: ${n.text}`);
    lines.push('');
  }
  if (plan.direction) lines.push(`Direction: ${DIRECTION_LABEL[plan.direction]}`, plan.why.trim() ? `Why: ${plan.why.trim()}` : '', '');
  for (const s of STAGES) {
    const at = recs.filter((r) => r.stage === s);
    if (!at.length) continue;
    lines.push(STAGE_LABEL[s]);
    for (const r of at) {
      lines.push(`${num(r)}. ${r.text.trim()} (${FN_LABEL[r.fn]})`);
      const serves = r.serves.map(label).filter(Boolean);
      if (serves.length) lines.push(`   For: ${serves.join('; ')}`);
      if (r.evidence.length) lines.push(`   Evidence: ${r.evidence.join(', ')}`);
      if (r.tool) lines.push(`   Tool: ${TOOL_LABEL[r.tool]}`);
      if (r.uses.trim() || r.funding) lines.push(`   Uses: ${[r.uses.trim(), r.funding ? `paid for by ${FUNDING_LABEL[r.funding].toLowerCase()}` : ''].filter(Boolean).join('; ')}`);
      const after = r.after.map((id) => plan.recs.findIndex((x) => x.id === id) + 1).filter((n) => n > 0);
      if (after.length) lines.push(`   After: ${after.map((n) => `recommendation ${n}`).join(', ')}`);
      if (r.step.trim()) lines.push(`   First step: ${r.step.trim()}`);
      if (r.gain.trim()) lines.push(`   Expected impact: ${r.gain.trim()}${r.areas.length ? ` (also affects ${r.areas.map((a) => FN_LABEL[a].toLowerCase()).join(', ')})` : ''}`);
      if (r.tradeoff.trim()) lines.push(`   Trade-off: ${r.tradeoff.trim()}`);
    }
    lines.push('');
  }
  if (plan.judgement.trim()) lines.push(`Judgement: ${plan.judgement.trim()}`, '');
  const reviews = plan.reviews.filter((r) => r.measure.trim());
  if (reviews.length) {
    lines.push('Review');
    for (const r of reviews) lines.push(`- ${r.measure.trim()}${r.target.trim() ? `, target ${r.target.trim()}` : ''}${r.when.trim() ? `, checked ${r.when.trim()}` : ''}`);
  }
  return lines
    .filter((l, i, all) => !(l === '' && all[i - 1] === ''))
    .join('\n')
    .trim();
}
