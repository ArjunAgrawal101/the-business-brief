/**
 * The marketing campaign planner: objective, audience, message, channels,
 * timeline and key performance indicators (KPIs). It applies the role of
 * marketing planning (4.2) and promotion above, below and through the line
 * (4.5); the timeline is drawn as a Gantt chart, an HL toolkit tool. The
 * funnel estimate is the reader's own arithmetic on their own assumptions,
 * labelled as an estimate.
 */
import { asBool, asInt, asList, asNum, asObj, asOneOf, asStr, listWords, safeId, uniqueIds, type Check } from './market-kit';
import { fmtMoney, fmtNumber } from './format';

export const ROLES = ['awareness', 'consideration', 'conversion', 'loyalty'] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = { awareness: 'Awareness: get noticed', consideration: 'Consideration: give a reason to choose', conversion: 'Conversion: turn interest into a purchase', loyalty: 'Loyalty: bring them back' };
export const ROLE_SHORT: Record<Role, string> = { awareness: 'Awareness', consideration: 'Consideration', conversion: 'Conversion', loyalty: 'Loyalty' };

export type LineKind = 'above' | 'below';
export const LINE_LABELS: Record<LineKind, string> = { above: 'Above the line', below: 'Below the line' };

export interface CampaignChannel {
  id: string;
  name: string;
  line: LineKind;
  role: Role;
  cost: number;
  start: number;
  end: number;
}

export interface CampaignTask {
  id: string;
  name: string;
  cost: number;
  start: number;
  end: number;
}

export type Frequency = 'weekly' | 'monthly' | 'end';
export const FREQ_LABELS: Record<Frequency, string> = { weekly: 'Every week', monthly: 'Every 4 weeks', end: 'At the end' };

export interface Kpi {
  id: string;
  name: string;
  role: Role;
  /** Measures the campaign objective itself. */
  primary: boolean;
  baseline: number;
  target: number;
  unit: string;
  frequency: Frequency;
}

export interface CampaignState {
  name: string;
  business: string;
  currency: string;
  objective: { metric: string; baseline: number; target: number; unit: string; weeks: number };
  audience: string;
  insight: string;
  message: { proposition: string; proof: string; action: string };
  budget: number;
  channels: CampaignChannel[];
  tasks: CampaignTask[];
  kpis: Kpi[];
  funnel: { reach: number; aware: number; trial: number; repeat: number; visits: number; spend: number };
}

export function plannedSpend(s: CampaignState): number {
  return s.channels.reduce((n, c) => n + c.cost, 0) + s.tasks.reduce((n, t) => n + t.cost, 0);
}

/** The objective's change, in per cent of the baseline. */
export function objectiveChange(s: CampaignState): number | null {
  const o = s.objective;
  return o.baseline > 0 ? ((o.target - o.baseline) / o.baseline) * 100 : null;
}

export type CampaignLine = 'above' | 'below' | 'through' | 'none';
/** The campaign as a whole: through the line when it uses both kinds of promotion. */
export function campaignLine(s: CampaignState): CampaignLine {
  const lines = new Set(s.channels.map((c) => c.line));
  return lines.size === 0 ? 'none' : lines.size > 1 ? 'through' : lines.has('above') ? 'above' : 'below';
}

export interface Funnel {
  reach: number;
  aware: number;
  tried: number;
  regulars: number;
  /** Extra sales a week from the regulars. */
  weekly: number;
  /** The weekly gain as a share of the gap the objective sets. */
  coverage: number | null;
}

export function funnel(s: CampaignState): Funnel {
  const f = s.funnel;
  const aware = f.reach * (f.aware / 100);
  const tried = aware * (f.trial / 100);
  const regulars = tried * (f.repeat / 100);
  const weekly = regulars * f.visits * f.spend;
  const gap = s.objective.target - s.objective.baseline;
  return { reach: f.reach, aware, tried, regulars, weekly, coverage: gap > 0 ? (weekly / gap) * 100 : null };
}

/** The weeks at which KPIs are reviewed: every week, every four weeks, or at the end. */
export function reviewWeeks(s: CampaignState): number[] {
  const w = s.objective.weeks;
  const set = new Set<number>();
  for (const k of s.kpis) {
    if (k.frequency === 'weekly') for (let i = 1; i <= w; i += 1) set.add(i);
    if (k.frequency === 'monthly') for (let i = 4; i <= w; i += 4) set.add(i);
    set.add(w);
  }
  return [...set].sort((a, b) => a - b);
}

export function campaignChecks(s: CampaignState): Check[] {
  const out: Check[] = [];
  const add = (level: Check['level'], about: string, text: string) => out.push({ level, about, text });
  const o = s.objective;
  const money = (v: number) => fmtMoney(v, s.currency, 0);

  if (!o.metric.trim()) add('conflict', 'Objective', 'Name what the campaign will change, such as weekly sales or new customers.');
  if (!(o.baseline > 0)) add('tension', 'Objective', 'Give a starting figure, so the change can be measured.');
  if (!(o.weeks > 0)) add('conflict', 'Objective', 'Set a deadline in weeks.');
  if (o.metric.trim() && o.baseline > 0 && o.weeks > 0 && o.target !== o.baseline) add('fit', 'Objective', `Specific, measurable and with a deadline: from ${fmtNumber(o.baseline)} to ${fmtNumber(o.target)}${o.unit ? ` ${o.unit}` : ''} within ${o.weeks} weeks.`);
  if (o.target === o.baseline) add('conflict', 'Objective', 'The target is the same as the starting figure.');
  if (!s.audience.trim()) add('conflict', 'Audience', 'Say who the campaign is for: a target segment, ideally with a persona.');
  if (!s.message.proposition.trim()) add('conflict', 'Message', 'Write the proposition: what the audience gets.');
  if (!s.message.proof.trim()) add('tension', 'Message', 'Give a reason to believe the proposition.');
  if (!s.message.action.trim()) add('tension', 'Message', 'Add a call to action: what the audience should do next.');

  if (!s.channels.length) add('conflict', 'Channels', 'Add at least one channel.');
  const roles = new Set(s.channels.map((c) => c.role));
  if (s.channels.length && !roles.has('awareness')) add('tension', 'Channels', 'No channel builds awareness: the audience has to notice the campaign first.');
  if (s.channels.length && !roles.has('conversion')) add('tension', 'Channels', 'No channel turns interest into a purchase, such as an offer or a call to action at the point of sale.');
  if (roles.has('awareness') && roles.has('conversion')) add('fit', 'Channels', 'The channels cover the path from noticing the campaign to buying.');
  const line = campaignLine(s);
  if (line === 'through') add('fit', 'Promotion', 'The campaign combines above and below the line methods in one plan with one message: through the line promotion.');
  else if (line === 'above') add('note', 'Promotion', 'Every channel is above the line: mass media reach many people, but are hard to aim and to measure.');
  else if (line === 'below') add('note', 'Promotion', 'Every channel is below the line: targeted and measurable, which suits a defined audience.');

  const spend = plannedSpend(s);
  if (spend > s.budget + 0.005) add('conflict', 'Budget', `Planned spending of ${money(spend)} is over the budget of ${money(s.budget)} by ${money(spend - s.budget)}.`);
  else if (s.budget > 0 && spend < s.budget * 0.9) add('note', 'Budget', `${money(s.budget - spend)} of the budget is not yet allocated.`);
  else if (s.budget > 0) add('fit', 'Budget', `The plan spends ${money(spend)} of the ${money(s.budget)} budget.`);

  const items = [...s.channels.map((c) => ({ name: c.name, start: c.start, end: c.end })), ...s.tasks.map((t) => ({ name: t.name, start: t.start, end: t.end }))];
  const late = items.filter((i) => i.end > o.weeks || i.start < 1);
  if (late.length) add('conflict', 'Timeline', `${listWords(late.map((i) => i.name || 'An item'))} ${late.length === 1 ? 'falls' : 'fall'} outside the ${o.weeks} weeks of the campaign.`);
  const backwards = items.filter((i) => i.end < i.start);
  if (backwards.length) add('conflict', 'Timeline', `${listWords(backwards.map((i) => i.name || 'An item'))} ${backwards.length === 1 ? 'ends' : 'end'} before it starts.`);

  if (!s.kpis.length) add('conflict', 'KPIs', 'Add the measures that will show whether the campaign worked.');
  else if (!s.kpis.some((k) => k.primary)) add('conflict', 'KPIs', 'No KPI measures the objective itself.');
  else add('fit', 'KPIs', 'At least one KPI measures the objective directly.');
  const kpiRoles = new Set(s.kpis.map((k) => k.role));
  const unmeasured = [...roles].filter((r) => !kpiRoles.has(r));
  if (unmeasured.length) add('note', 'KPIs', `No KPI measures ${listWords(unmeasured.map((r) => ROLE_SHORT[r].toLowerCase()))}, so you will not know whether ${unmeasured.length === 1 ? 'that stage' : 'those stages'} worked.`);
  if (s.kpis.length && !s.kpis.some((k) => k.frequency !== 'end')) add('tension', 'KPIs', 'Every KPI is measured only at the end: review some during the campaign, so you can change course.');

  const f = funnel(s);
  if (f.coverage !== null) {
    const text = `On your funnel assumptions the campaign adds about ${money(f.weekly)} a week, ${fmtNumber(f.coverage, 0)}% of the gap between the starting figure and the target.`;
    add(f.coverage < 80 ? 'tension' : f.coverage < 110 ? 'note' : 'fit', 'Estimate', f.coverage < 110 && f.coverage >= 80 ? `${text} It only just reaches the target, so the result depends on the assumptions, above all the share who come back.` : text);
  }
  return out;
}

export function normalizeCampaign(raw: unknown, f: CampaignState): CampaignState | null {
  const o = asObj(raw);
  if (!o) return null;
  const ob = asObj(o.objective) ?? {};
  const msg = asObj(o.message) ?? {};
  const fu = asObj(o.funnel) ?? {};
  const weeks = asInt(ob.weeks, f.objective.weeks, 1, 104);
  const week = (v: unknown, d: number) => asInt(v, d, 1, 104);
  return {
    name: asStr(o.name, f.name, 120),
    business: asStr(o.business, f.business, 80),
    currency: asStr(o.currency, f.currency, 4),
    objective: { metric: asStr(ob.metric, '', 120), baseline: asNum(ob.baseline, 0, 0, 1e12), target: asNum(ob.target, 0, 0, 1e12), unit: asStr(ob.unit, '', 30), weeks },
    audience: asStr(o.audience, '', 300),
    insight: asStr(o.insight, '', 400),
    message: { proposition: asStr(msg.proposition, '', 240), proof: asStr(msg.proof, '', 240), action: asStr(msg.action, '', 160) },
    budget: asNum(o.budget, f.budget, 0, 1e12),
    channels: uniqueIds(
      asList(o.channels, (x, i) => {
        const c = asObj(x);
        if (!c) return null;
        return { id: safeId(c.id, `c${i + 1}`), name: asStr(c.name, '', 80), line: asOneOf(c.line, ['above', 'below'] as const, 'below'), role: asOneOf(c.role, ROLES, 'awareness'), cost: asNum(c.cost, 0, 0, 1e12), start: week(c.start, 1), end: week(c.end, 1) };
      }, 12),
      'c',
    ),
    tasks: uniqueIds(
      asList(o.tasks, (x, i) => {
        const t = asObj(x);
        if (!t) return null;
        return { id: safeId(t.id, `t${i + 1}`), name: asStr(t.name, '', 80), cost: asNum(t.cost, 0, 0, 1e12), start: week(t.start, 1), end: week(t.end, 1) };
      }, 12),
      't',
    ),
    kpis: uniqueIds(
      asList(o.kpis, (x, i) => {
        const k = asObj(x);
        if (!k) return null;
        return { id: safeId(k.id, `k${i + 1}`), name: asStr(k.name, '', 100), role: asOneOf(k.role, ROLES, 'conversion'), primary: asBool(k.primary), baseline: asNum(k.baseline, 0, 0, 1e12), target: asNum(k.target, 0, 0, 1e12), unit: asStr(k.unit, '', 30), frequency: asOneOf(k.frequency, ['weekly', 'monthly', 'end'] as const, 'monthly') };
      }, 10),
      'k',
    ),
    funnel: { reach: asNum(fu.reach, f.funnel.reach, 0, 1e9), aware: asNum(fu.aware, f.funnel.aware, 0, 100), trial: asNum(fu.trial, f.funnel.trial, 0, 100), repeat: asNum(fu.repeat, f.funnel.repeat, 0, 100), visits: asNum(fu.visits, f.funnel.visits, 0, 100), spend: asNum(fu.spend, f.funnel.spend, 0, 1e6) },
  };
}

export function campaignCsvRows(s: CampaignState): Array<Array<string | number>> {
  return [
    ['Campaign', s.name],
    ['Objective', `${s.objective.metric}: from ${s.objective.baseline} to ${s.objective.target} ${s.objective.unit} within ${s.objective.weeks} weeks`],
    ['Audience', s.audience],
    ['Proposition', s.message.proposition],
    ['Reason to believe', s.message.proof],
    ['Call to action', s.message.action],
    ['Budget', s.budget],
    [],
    ['Item', 'Kind', 'Line', 'Role', 'Cost', 'Start week', 'End week'],
    ...s.channels.map((c) => [c.name, 'Channel', LINE_LABELS[c.line], ROLE_SHORT[c.role], c.cost, c.start, c.end]),
    ...s.tasks.map((t) => [t.name, 'Task', '', '', t.cost, t.start, t.end]),
    ['Total planned', '', '', '', plannedSpend(s), '', ''],
    [],
    ['KPI', 'Stage', 'Measures the objective', 'Baseline', 'Target', 'Unit', 'Reviewed'],
    ...s.kpis.map((k) => [k.name, ROLE_SHORT[k.role], k.primary ? 'Yes' : 'No', k.baseline, k.target, k.unit, FREQ_LABELS[k.frequency]]),
  ];
}

export function campaignSummary(s: CampaignState): string {
  const f = funnel(s);
  const ch = objectiveChange(s);
  return [
    `Campaign: ${s.name} (${s.business})`,
    `Objective: ${s.objective.metric} from ${fmtNumber(s.objective.baseline)} to ${fmtNumber(s.objective.target)}${ch === null ? '' : ` (${ch >= 0 ? '+' : ''}${fmtNumber(ch, 0)}%)`} within ${s.objective.weeks} weeks.`,
    `Audience: ${s.audience}`,
    `Message: ${s.message.proposition} ${s.message.proof ? `Because ${s.message.proof.replace(/^because\s+/i, '')}.` : ''} ${s.message.action}`.replace(/\s+/g, ' ').trim(),
    `Budget: ${fmtMoney(s.budget, s.currency, 0)}; planned ${fmtMoney(plannedSpend(s), s.currency, 0)}.`,
    'Channels:',
    ...s.channels.map((c) => `- ${c.name} (${LINE_LABELS[c.line].toLowerCase()}, ${ROLE_SHORT[c.role].toLowerCase()}): ${fmtMoney(c.cost, s.currency, 0)}, weeks ${c.start} to ${c.end}`),
    ...(s.tasks.length ? ['Tasks:', ...s.tasks.map((t) => `- ${t.name}: ${fmtMoney(t.cost, s.currency, 0)}, weeks ${t.start} to ${t.end}`)] : []),
    'KPIs:',
    ...s.kpis.map((k) => `- ${k.name}: ${fmtNumber(k.baseline)} to ${fmtNumber(k.target)} ${k.unit} (${FREQ_LABELS[k.frequency].toLowerCase()})${k.primary ? ', measures the objective' : ''}`),
    `Funnel estimate: ${fmtNumber(f.reach)} reached, ${fmtNumber(f.aware)} aware, ${fmtNumber(f.tried)} try it, ${fmtNumber(f.regulars, 1)} come back; about ${fmtMoney(f.weekly, s.currency, 0)} a week.`,
  ].join('\n');
}
