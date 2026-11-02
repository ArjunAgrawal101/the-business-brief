/**
 * The Paper 3 plan builder's self-review: what a plan uses and covers, against
 * the four criteria of question 3. Prompts, never marks: it counts resources,
 * tools, functions, trade-offs and stages, and flags what reports discourage.
 */
export const FUNCTIONS = ['marketing', 'operations', 'hr', 'finance'] as const;
export const STAGES = ['first', 'then', 'later'] as const;
export const TOOLS = ['', 'ansoff', 'force-field', 'gantt', 'other'] as const;
export type Fn = (typeof FUNCTIONS)[number];
export type Stage = (typeof STAGES)[number];
export type Tool = (typeof TOOLS)[number];

export const FN_LABEL: Record<Fn, string> = { marketing: 'Marketing', operations: 'Operations', hr: 'Human resources', finance: 'Finance' };
export const STAGE_LABEL: Record<Stage, string> = { first: 'First', then: 'Then', later: 'Later' };
export const TOOL_LABEL: Record<Tool, string> = { '': 'No tool', ansoff: 'Ansoff matrix', 'force-field': 'Force field analysis', gantt: 'Gantt chart', other: 'Another tool or theory' };

export interface Action {
  text: string;
  fn: Fn;
  stage: Stage;
  resources: string[];
  tool: Tool;
  gain: string;
  tradeoff: string;
}

export interface Plan {
  direction: string;
  why: string;
  actions: Action[];
}

export interface Prompt {
  criterion: 'A' | 'B' | 'C' | 'D' | 'All';
  status: 'met' | 'open' | 'warn';
  text: string;
}

export const blankAction = (): Action => ({ text: '', fn: 'marketing', stage: 'first', resources: [], tool: '', gain: '', tradeoff: '' });

const filled = (s: string) => s.trim().length > 2;

export function reviewPlan(plan: Plan, resourceIds: string[]): Prompt[] {
  const acts = plan.actions.filter((a) => filled(a.text));
  const out: Prompt[] = [];

  if (!filled(plan.direction) && !filled(plan.why)) out.push({ criterion: 'All', status: 'open', text: 'State one forward-looking direction for the whole organization: question 3 plans what it does next.' });
  else out.push({ criterion: 'All', status: 'met', text: 'A direction for the whole organization is stated.' });

  const used = resourceIds.filter((r) => acts.some((a) => a.resources.includes(r)));
  out.push({
    criterion: 'A',
    status: used.length === resourceIds.length ? 'met' : 'open',
    text: `${used.length} of ${resourceIds.length} resources used as evidence for an action${used.length ? ` (${used.join(', ')})` : ''}. The top level of A refers to all the resource materials.`,
  });

  const tools = [...new Set(acts.map((a) => a.tool).filter((t): t is Exclude<Tool, ''> => t !== ''))];
  out.push({
    criterion: 'B',
    status: tools.length >= 2 ? 'met' : tools.length === 1 ? 'open' : 'warn',
    text: tools.length
      ? `Tools shaping actions: ${tools.map((t) => TOOL_LABEL[t]).join(', ')}. Each should change the plan, not decorate it.`
      : 'No tool shapes an action yet. Naming a tool without using it earns at most 1 of the 4 marks for B (May 2026 report, as the Paper 3 guide cites it).',
  });

  const fns = [...new Set(acts.map((a) => a.fn))];
  const weighed = acts.filter((a) => filled(a.gain) && filled(a.tradeoff)).length;
  out.push({
    criterion: 'C',
    status: fns.length === FUNCTIONS.length && acts.length > 0 && weighed === acts.length ? 'met' : 'open',
    text: `${fns.length} of 4 functions covered${fns.length < 4 ? ` (missing: ${FUNCTIONS.filter((f) => !fns.includes(f)).map((f) => FN_LABEL[f]).join(', ')})` : ''}; ${weighed} of ${acts.length} actions have both an expected impact and a trade-off.`,
  });

  const counts = STAGES.map((s) => acts.filter((a) => a.stage === s).length);
  const oneStage = acts.length > 1 && counts.filter((n) => n > 0).length === 1;
  out.push({
    criterion: 'D',
    status: acts.length >= 3 && counts.every((n) => n > 0) ? 'met' : oneStage ? 'warn' : 'open',
    text: `Sequenced: First ${counts[0]} · Then ${counts[1]} · Later ${counts[2]}.${oneStage ? ' Every action is at one stage: a plan needs an order.' : ''}`,
  });

  const hiresFirst = acts.some((a) => a.fn === 'hr' && a.stage === 'first' && /\b(hire|hiring|recruit|employ|staff)\b/i.test(a.text));
  const financeFirst = acts.some((a) => a.fn === 'finance' && a.stage === 'first');
  if (hiresFirst && !financeFirst) out.push({ criterion: 'D', status: 'warn', text: 'Hiring comes first, but nothing first pays for it: check that the order works.' });

  if (acts.some((a) => /\b(donation|donations|grant|grants|fundrais\w*|appeal)\b/i.test(`${a.text} ${a.gain}`)))
    out.push({ criterion: 'C', status: 'warn', text: 'The plan leans on donations or grants. A social enterprise earns most of its income by trading, and reports discourage plans that rely on gifts.' });

  const disadvantagesOnly = acts.filter((a) => filled(a.tradeoff) && !/\b(but|while|whereas|at the cost of|in exchange|gives up|instead|so|because)\b/i.test(a.tradeoff)).length;
  if (disadvantagesOnly > 0)
    out.push({ criterion: 'C', status: 'open', text: `${disadvantagesOnly} trade-off${disadvantagesOnly === 1 ? ' reads' : 's read'} like a disadvantage. A trade-off names what is gained in one area, what is given up in another, and why it is still worth it.` });

  return out;
}
