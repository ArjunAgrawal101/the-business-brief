/**
 * The Stakeholder Impact Simulator's rules. A teaching model, not a forecast:
 * every business is fictional, and every score is the model's own judgement
 * on a scale of about minus five to plus five, never a measurement.
 *
 * A decision (src/lib/stakeholder-impact/decisions.ts) gives each of the seven
 * stakeholder groups a base effect in the first year (`short`) and after it
 * (`long`), from -3 (serious harm) to +3 (large gain), with its reason. The
 * reader then chooses how the decision is carried out, and four rules apply,
 * in this order:
 *
 * 1. Scale. Every effect, and every cost to the owners below, is multiplied by
 *    0.5 (small), 1 (moderate) or 1.5 (large). A larger scale never shrinks an
 *    effect and never changes its direction.
 * 2. Speed. Harm in the first year to every group except the owners is
 *    multiplied by 0.6 (phased), 1 (standard) or 1.4 (fast): doing it quickly
 *    concentrates the disruption. The owners' gains in the first year are
 *    multiplied by 0.6, 1 or 1.25: moving fast brings the gains forward. Effects
 *    after the first year do not depend on speed.
 * 3. Mitigation (compensation, retraining, notice, help to adjust). For each
 *    group the decision marks as mitigable, harm in the first year is
 *    multiplied by 1 - 0.3m and harm after it by 1 - 0.2m, where m is 0 (none),
 *    1 (standard) or 2 (generous). Gains are never changed. The owners pay:
 *    their first-year effect falls by m x the decision's mitigation cost x the
 *    scale factor.
 * 4. Communication. For the groups that must plan around the decision
 *    (employees, customers, suppliers and the local community), harm in the
 *    first year is multiplied by 1 - 0.1k, where k is 0 (minimal), 1 (timely)
 *    or 2 (early and open). Where the decision names an early-notice cost (staff
 *    or customers leaving before the change), the owners' first-year effect
 *    falls by k x that cost x the scale factor.
 *
 * A group's overall effect is the mean of the two periods. Its direction,
 * size and timescale are read from the two figures (`describe`), and its
 * interest in the decision rises with the size of the effect; its power is
 * fixed by the decision. Power and interest place it on the power-interest
 * grid with the Strategy Studio's own rule (`quadrantOf`). The consistency
 * properties these rules promise are checked by tests/unit/stakeholder-impact.test.ts.
 */
import { andList, count } from '../strategy/common';
import { QUADRANTS, quadrantOf, type Quadrant } from '../strategy/stakeholders';

export const GROUPS = ['employees', 'customers', 'owners', 'suppliers', 'government', 'community', 'society'] as const;
export type Group = (typeof GROUPS)[number];

export const GROUP_INFO: Record<Group, { name: string; short: string; kind: 'internal' | 'external' }> = {
  employees: { name: 'Employees', short: 'employees', kind: 'internal' },
  customers: { name: 'Customers', short: 'customers', kind: 'external' },
  owners: { name: 'Owners and shareholders', short: 'the owners', kind: 'internal' },
  suppliers: { name: 'Suppliers', short: 'suppliers', kind: 'external' },
  government: { name: 'Government', short: 'the government', kind: 'external' },
  community: { name: 'Local communities', short: 'the local community', kind: 'external' },
  society: { name: 'Wider society', short: 'wider society', kind: 'external' },
};

/** The rules above in the words the page uses, so the page and the model never disagree. */
export const RULES: Array<{ name: string; text: string }> = [
  {
    name: 'Each decision sets the starting effects',
    text: 'For every group, the decision gives an effect in the first year and an effect after it, from −3 (serious harm) to +3 (a large gain), with the reason. These are the model’s judgements about a fictional business, not measurements.',
  },
  {
    name: 'Scale multiplies everything',
    text: 'A small change halves every effect and a large one multiplies it by one and a half, including what the owners pay for mitigation. A bigger change never shrinks an effect or turns a loss into a gain.',
  },
  {
    name: 'Speed concentrates or spreads the first-year harm',
    text: 'Done fast, first-year harm to every group except the owners is 40% greater; phased, it is 40% smaller. The owners’ first-year gains move the other way: a quarter larger when fast, 40% smaller when phased. Effects after the first year do not depend on speed.',
  },
  {
    name: 'Mitigation softens the loss and costs the owners',
    text: 'For the groups a decision can help (with redundancy pay, retraining, notice or support), standard mitigation cuts their first-year harm by 30% and their later harm by 20%; generous mitigation doubles both cuts. Gains are never changed. The owners pay for it in the first year.',
  },
  {
    name: 'Communication helps those who must plan',
    text: 'Timely communication cuts the first-year harm to employees, customers, suppliers and the local community by 10%, and early, open communication by 20%. For some decisions early notice has a cost to the owners, such as staff leaving before the change; the page says when.',
  },
  {
    name: 'Reading the result',
    text: 'A group gains or loses only when an effect reaches a quarter of a point. Size is small below 1, moderate below 2 and large above. Interest rises with the size of the effect; power is set by the decision. A group with power of 6 or more is high power, and the same for interest, as in the Strategy Studio’s stakeholder map.',
  },
];

/** The groups that must plan around a decision, whose first-year harm communication softens (rule 4). */
export const PLANNING_GROUPS: readonly Group[] = ['employees', 'customers', 'suppliers', 'community'];

export const PARAMS = {
  scale: {
    label: 'Scale',
    question: 'How big a change?',
    options: [
      { id: 'small', label: 'Small', factor: 0.5 },
      { id: 'moderate', label: 'Moderate', factor: 1 },
      { id: 'large', label: 'Large', factor: 1.5 },
    ],
  },
  speed: {
    label: 'Speed',
    question: 'How quickly is it carried out?',
    options: [
      { id: 'phased', label: 'Phased', factor: 0.6, gain: 0.6 },
      { id: 'standard', label: 'Standard', factor: 1, gain: 1 },
      { id: 'fast', label: 'Fast', factor: 1.4, gain: 1.25 },
    ],
  },
  mitigation: {
    label: 'Compensation and mitigation',
    question: 'How much is done for those who lose?',
    options: [
      { id: 'none', label: 'None', level: 0 },
      { id: 'standard', label: 'Standard', level: 1 },
      { id: 'generous', label: 'Generous', level: 2 },
    ],
  },
  communication: {
    label: 'Communication',
    question: 'When and how openly is it explained?',
    options: [
      { id: 'minimal', label: 'Minimal', level: 0 },
      { id: 'timely', label: 'Timely', level: 1 },
      { id: 'early', label: 'Early and open', level: 2 },
    ],
  },
} as const;

export type Scale = (typeof PARAMS)['scale']['options'][number]['id'];
export type Speed = (typeof PARAMS)['speed']['options'][number]['id'];
export type Mitigation = (typeof PARAMS)['mitigation']['options'][number]['id'];
export type Communication = (typeof PARAMS)['communication']['options'][number]['id'];
export type ParamId = keyof typeof PARAMS;
export const PARAM_IDS = Object.keys(PARAMS) as ParamId[];

export interface Settings {
  scale: Scale;
  speed: Speed;
  mitigation: Mitigation;
  communication: Communication;
}

export const DEFAULT_SETTINGS: Settings = { scale: 'moderate', speed: 'standard', mitigation: 'none', communication: 'timely' };

/** Every value each setting can take, in order from least to most. */
export const ORDER: { [K in ParamId]: Array<Settings[K]> } = {
  scale: PARAMS.scale.options.map((o) => o.id),
  speed: PARAMS.speed.options.map((o) => o.id),
  mitigation: PARAMS.mitigation.options.map((o) => o.id),
  communication: PARAMS.communication.options.map((o) => o.id),
};

export interface GroupEffect {
  /** Base effect in the first year, from -3 to +3. */
  short: number;
  /** Base effect after the first year, from -3 to +3. */
  long: number;
  /** Power over this decision, 1 to 10. */
  power: number;
  /** Interest in this decision before its effects are known, 1 to 10. */
  interest: number;
  /** Why the group is affected, in one sentence. */
  why: string;
  /** What mitigation means for this group, when it can soften the harm (rule 3). */
  mitigation?: string;
}

export interface Conflict {
  /** The group that gains. */
  gains: Group;
  /** The group that loses. */
  loses: Group;
  /** The conflict of interest, shown when the settings make one gain and the other lose. */
  text: string;
}

export interface Decision {
  id: string;
  /** The decision, as a verb phrase: "Automate a production line". */
  title: string;
  business: string;
  place: string;
  /** The fictional business and what it proposes. */
  brief: string;
  /** What each scale means for this decision. */
  scales: Record<Scale, string>;
  effects: Record<Group, GroupEffect>;
  /** The owners' first-year cost of each level of mitigation, before scale. */
  mitigationCost: number;
  /** The owners' first-year cost of each level of early communication, before scale; 0 when there is none. */
  earlyNoticeCost: number;
  /** What the early-notice cost is, when there is one. */
  earlyNotice?: string;
  conflicts: Conflict[];
  /** Questions that close the exercise. */
  prompts: string[];
  /** IB subtopics the decision draws on, besides 1.4. */
  subtopics: string[];
}

export interface GroupResult {
  group: Group;
  short: number;
  long: number;
  overall: number;
  direction: Direction;
  size: Size;
  timescale: string;
  reason: string;
  power: number;
  interest: number;
  quadrant: Quadrant;
}

export type Direction = 'gains' | 'loses' | 'loses-then-gains' | 'gains-then-loses' | 'little';
export type Size = 'negligible' | 'small' | 'moderate' | 'large';

export const DIRECTION_WORDS: Record<Direction, string> = {
  gains: 'Gains',
  loses: 'Loses',
  'loses-then-gains': 'Loses first, gains later',
  'gains-then-loses': 'Gains first, loses later',
  little: 'Little effect',
};

export const SIZE_WORDS: Record<Size, string> = { negligible: 'Negligible', small: 'Small', moderate: 'Moderate', large: 'Large' };

/** Below this, an effect is too small to count as a gain or a loss. */
export const NEGLIGIBLE = 0.25;

const opt = <K extends ParamId>(k: K, id: Settings[K]) => (PARAMS[k].options as ReadonlyArray<{ id: string }>).find((o) => o.id === id) as (typeof PARAMS)[K]['options'][number];
/** Free of floating-point dust, but not rounded for display: the page rounds when it writes a figure. */
const r2 = (n: number) => Math.round(n * 1e6) / 1e6;

export function sizeOf(v: number): Size {
  const a = Math.abs(v);
  if (a < NEGLIGIBLE) return 'negligible';
  if (a < 1) return 'small';
  if (a < 2) return 'moderate';
  return 'large';
}

/** Direction, size and timescale from the two periods' figures. */
export function describe(short: number, long: number): { direction: Direction; size: Size; timescale: string } {
  const s = Math.abs(short) >= NEGLIGIBLE ? Math.sign(short) : 0;
  const l = Math.abs(long) >= NEGLIGIBLE ? Math.sign(long) : 0;
  const size = sizeOf(Math.max(Math.abs(short), Math.abs(long)));
  if (s === 0 && l === 0) return { direction: 'little', size: 'negligible', timescale: 'Not felt to any extent' };
  let direction: Direction;
  if (s !== 0 && l !== 0 && s !== l) direction = s < 0 ? 'loses-then-gains' : 'gains-then-loses';
  else direction = (s || l) > 0 ? 'gains' : 'loses';
  const a = Math.abs(short);
  const b = Math.abs(long);
  const timescale =
    direction === 'loses-then-gains' || direction === 'gains-then-loses'
      ? 'Both: one way in the first year, the other after'
      : l === 0 || a >= 1.5 * b
        ? 'Mainly in the first year'
        : s === 0 || b >= 1.5 * a
          ? 'Mainly after the first year'
          : 'In the first year and after';
  return { direction, size, timescale };
}

/** One group's first-year and later effects under the settings: the four rules in order. */
export function effectOf(d: Decision, g: Group, st: Settings): { short: number; long: number } {
  const e = d.effects[g];
  const scale = opt('scale', st.scale).factor;
  const speed = opt('speed', st.speed);
  const m = opt('mitigation', st.mitigation).level;
  const k = opt('communication', st.communication).level;
  let short = e.short * scale;
  let long = e.long * scale;
  if (g === 'owners') {
    if (short > 0) short *= speed.gain;
    short -= m * d.mitigationCost * scale;
    short -= k * d.earlyNoticeCost * scale;
    return { short: r2(short), long: r2(long) };
  }
  if (short < 0) short *= speed.factor;
  if (e.mitigation) {
    if (short < 0) short *= 1 - 0.3 * m;
    if (long < 0) long *= 1 - 0.2 * m;
  }
  if (short < 0 && PLANNING_GROUPS.includes(g)) short *= 1 - 0.1 * k;
  return { short: r2(short), long: r2(long) };
}

/** The reason for a group's effect: the decision's own sentence, then what the settings change. */
function reasonFor(d: Decision, g: Group, st: Settings, short: number, long: number): string {
  const e = d.effects[g];
  const parts = [e.why];
  const harmed = short < 0 || long < 0;
  if (g === 'owners') {
    const m = opt('mitigation', st.mitigation).level;
    const k = opt('communication', st.communication).level;
    if (m > 0) parts.push(`${st.mitigation === 'generous' ? 'Generous' : 'Standard'} mitigation for those who lose is paid for by the owners.`);
    if (k > 0 && d.earlyNoticeCost > 0 && d.earlyNotice) parts.push(d.earlyNotice);
    if (st.speed === 'fast' && e.short > 0) parts.push('Moving fast brings the gains forward.');
    if (st.speed === 'phased' && e.short > 0) parts.push('A phased change delays the gains.');
    return parts.join(' ');
  }
  if (harmed && e.mitigation && st.mitigation !== 'none') parts.push(`${st.mitigation === 'generous' ? 'Generous' : 'Standard'} ${e.mitigation} soften the loss.`);
  if (harmed && e.mitigation && st.mitigation === 'none') parts.push(`Nothing is offered to soften the loss, though ${e.mitigation} could.`);
  if (e.short < 0 && st.speed === 'fast') parts.push('Doing it fast concentrates the disruption into a few months.');
  if (e.short < 0 && st.speed === 'phased') parts.push('A phased change spreads the disruption out.');
  if (e.short < 0 && PLANNING_GROUPS.includes(g)) {
    if (st.communication === 'early') parts.push('Early, open communication gives them time to prepare.');
    if (st.communication === 'minimal') parts.push('Minimal communication leaves them to find out late, by rumour.');
  }
  return parts.join(' ');
}

export function groupResult(d: Decision, g: Group, st: Settings): GroupResult {
  const { short, long } = effectOf(d, g, st);
  const overall = r2((short + long) / 2);
  const { direction, size, timescale } = describe(short, long);
  const e = d.effects[g];
  const interest = Math.max(1, Math.min(10, e.interest + Math.round(Math.abs(overall))));
  return { group: g, short, long, overall, direction, size, timescale, reason: reasonFor(d, g, st, short, long), power: e.power, interest, quadrant: quadrantOf({ power: e.power, interest }) };
}

export interface Simulation {
  decision: Decision;
  settings: Settings;
  results: GroupResult[];
  gainers: GroupResult[];
  losers: GroupResult[];
  /** The decision's conflicts that the settings bring about: one side gains while the other loses. */
  conflicts: Conflict[];
  /** One sentence for the live region and the dashboard. */
  headline: string;
  /** What the settings trade off, in words. */
  tradeoffs: string[];
  prompts: string[];
}

export function simulate(d: Decision, st: Settings): Simulation {
  const results = GROUPS.map((g) => groupResult(d, g, st));
  const by = (g: Group) => results.find((r) => r.group === g)!;
  const gainers = results.filter((r) => r.overall >= NEGLIGIBLE).sort((a, b) => b.overall - a.overall);
  const losers = results.filter((r) => r.overall <= -NEGLIGIBLE).sort((a, b) => a.overall - b.overall);
  const conflicts = d.conflicts.filter((c) => by(c.gains).overall >= NEGLIGIBLE && by(c.loses).overall <= -NEGLIGIBLE);
  const name = (r: GroupResult) => GROUP_INFO[r.group].short;
  const headline = `${d.title} at ${d.business}: ${gainers[0] ? `${name(gainers[0])} gain most` : 'no group gains much'}; ${losers[0] ? `${name(losers[0])} lose most` : 'no group loses much'}.`;
  return { decision: d, settings: st, results, gainers, losers, conflicts, headline: headline.charAt(0).toUpperCase() + headline.slice(1), tradeoffs: tradeoffs(d, st, results), prompts: promptsFor(d, st, results) };
}

/** The trade-offs the reader's settings make, read from the results. */
function tradeoffs(d: Decision, st: Settings, results: GroupResult[]): string[] {
  const by = (g: Group) => results.find((r) => r.group === g)!;
  const out: string[] = [];
  const mitigated = GROUPS.filter((g) => g !== 'owners' && d.effects[g].mitigation);
  const names = andList(mitigated.map((g) => GROUP_INFO[g].short));
  if (st.mitigation === 'none' && mitigated.length) out.push(`No mitigation keeps the owners' costs down, but leaves ${names} to carry the full loss.`);
  else if (mitigated.length) out.push(`${st.mitigation === 'generous' ? 'Generous' : 'Standard'} mitigation for ${names} is a cost the owners carry in the first year.`);
  if (st.speed === 'fast') out.push('Speed brings the owners’ gains forward but concentrates the harm to everyone else into a shorter period.');
  else if (st.speed === 'phased') out.push('A phased change spreads the harm out, at the price of slower gains for the owners.');
  if (st.communication === 'early' && d.earlyNoticeCost > 0) out.push(`Early, open communication helps those who must plan, but ${d.earlyNotice ? d.earlyNotice.charAt(0).toLowerCase() + d.earlyNotice.slice(1) : 'it has a cost to the owners.'}`);
  else if (st.communication === 'minimal') out.push('Minimal communication costs nothing now, but leaves those who must plan to find out late.');
  const owners = by('owners');
  if (owners.short < 0 && owners.long > 0) out.push('The owners pay in the first year for a gain later: a judgement about the long term, not a certainty.');
  return out;
}

function promptsFor(d: Decision, st: Settings, results: GroupResult[]): string[] {
  const out = [...d.prompts];
  const worst = [...results].filter((r) => r.group !== 'owners').sort((a, b) => a.overall - b.overall)[0];
  if (worst && worst.overall <= -NEGLIGIBLE) {
    const who = GROUP_INFO[worst.group].short;
    if (st.mitigation === 'none' && d.effects[worst.group].mitigation) out.push(`With no mitigation, ${who} lose most. What is the least the business could offer them that the owners would still accept?`);
    else out.push(`${who.charAt(0).toUpperCase()}${who.slice(1)} still lose most on these settings. Is the decision justified anyway? Weigh it against what the owners gain.`);
  }
  out.push(`Which of your ${count(PARAM_IDS.length)} settings would you change first, and which stakeholder would notice the change most?`);
  return out;
}

/* ---------- Settings from a stored value or an address ---------- */

export function readSettings(v: unknown, fallback: Settings = DEFAULT_SETTINGS): Settings {
  const o = v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const pick = <K extends ParamId>(k: K): Settings[K] => {
    const x = o[k];
    return typeof x === 'string' && (ORDER[k] as string[]).includes(x) ? (x as Settings[K]) : fallback[k];
  };
  return { scale: pick('scale'), speed: pick('speed'), mitigation: pick('mitigation'), communication: pick('communication') };
}

/** The quadrant's name and approach, from the Strategy Studio's stakeholder map. */
export function quadrantInfo(q: Quadrant) {
  return QUADRANTS[q];
}

/* ---------- Kept on this device: bb:stakeholder-impact ---------- */

export const STORAGE_KEY = 'bb:stakeholder-impact';
export const NOTE_MAX = 4000;

export interface Saved {
  v: 1;
  decision: string;
  settings: Settings;
  /** The reader's answer to the evaluation prompts, by decision. */
  notes: Record<string, string>;
  /** The latest simulation's headline, for My Business Workspace. */
  headline: string;
  title: string;
  href: string;
  savedAt: string;
}

/** Read a stored value; anything it cannot use is replaced by the defaults, and it never throws. */
export function readSaved(raw: unknown, decisionIds: readonly string[]): Saved {
  let v: unknown = raw;
  if (typeof raw === 'string') {
    try {
      v = JSON.parse(raw);
    } catch {
      v = null;
    }
  }
  const o = v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const decision = typeof o.decision === 'string' && decisionIds.includes(o.decision) ? o.decision : (decisionIds[0] ?? '');
  const notes: Record<string, string> = {};
  const n = o.notes && typeof o.notes === 'object' && !Array.isArray(o.notes) ? (o.notes as Record<string, unknown>) : {};
  for (const id of decisionIds) if (typeof n[id] === 'string') notes[id] = (n[id] as string).slice(0, NOTE_MAX);
  const savedAt = typeof o.savedAt === 'string' && Number.isFinite(Date.parse(o.savedAt)) ? o.savedAt : '';
  return {
    v: 1,
    decision,
    settings: readSettings(o.settings),
    notes,
    headline: typeof o.headline === 'string' ? o.headline.slice(0, 240) : '',
    title: 'Stakeholder impact simulator',
    href: '/decision-room/stakeholder-impact/',
    savedAt,
  };
}
