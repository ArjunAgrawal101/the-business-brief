/**
 * The change management planner (2.1): the forces for and against a change,
 * the stakeholders it affects, the resistance to expect and the steps to take.
 *
 * Three models are used, each labelled on the page:
 * - force field analysis (Lewin), an HL tool of the guide's toolkit, through
 *   src/lib/force-field.ts;
 * - stakeholder mapping by power and interest, which the guide does not name
 *   (enrichment, as in the notes on stakeholders);
 * - Kotter and Schlesinger's six approaches to resistance, also enrichment,
 *   which organize the guide's "human resource strategies for reducing the
 *   impact of change and resistance to change" (AO3).
 * How a stakeholder's reason for resisting maps to an approach, the levels of
 * risk and the order of the steps are the platform's teaching model.
 */
import { summarize, weaken, type Force, type ForceFieldSummary } from './force-field';

export type Level = 'high' | 'low';
export type Stance = 'supports' | 'neutral' | 'opposes';

/** Why people resist change at work, in the platform's words (glossary: resistance to change). */
export const REASONS = [
  { id: 'none', label: 'No particular reason' },
  { id: 'unknown', label: 'Fear of the unknown' },
  { id: 'security', label: 'A threat to jobs, pay or status' },
  { id: 'routine', label: 'Routines and arrangements disrupted' },
  { id: 'skills', label: 'Lack of skills or confidence' },
  { id: 'communication', label: 'Poor communication, not consulted' },
  { id: 'trust', label: 'Low trust in management' },
  { id: 'disagree', label: 'Disagreement with the plan itself' },
] as const;
export type ReasonId = (typeof REASONS)[number]['id'];

export interface Stakeholder {
  name: string;
  power: Level;
  interest: Level;
  stance: Stance;
  reason: ReasonId;
}

export interface ChangeInputs {
  change: string;
  driving: Force[];
  restraining: Force[];
  stakeholders: Stakeholder[];
  /** The restraining force the reader would weaken first, by its position, or null. */
  lever: number | null;
}

export const LIMITS = { forces: 8, stakeholders: 10, change: 200, label: 90 } as const;

export interface ChangeProblem {
  field: 'change' | 'driving' | 'restraining' | 'stakeholders';
  index?: number;
  part?: 'label' | 'strength' | 'name';
  message: string;
}

const isLevel = (v: unknown): v is Level => v === 'high' || v === 'low';
const isStance = (v: unknown): v is Stance => v === 'supports' || v === 'neutral' || v === 'opposes';
export const isReason = (v: unknown): v is ReasonId => REASONS.some((r) => r.id === v);

export function validateChange(i: { change: string; driving: Array<{ label: string; strength: number | null }>; restraining: Array<{ label: string; strength: number | null }>; stakeholders: Array<{ name: string; power: unknown; interest: unknown; stance: unknown; reason: unknown }> }): ChangeProblem[] {
  const out: ChangeProblem[] = [];
  if (!i.change.trim()) out.push({ field: 'change', message: 'Describe the change in a line.' });
  else if (i.change.length > LIMITS.change) out.push({ field: 'change', message: `Keep the change to ${LIMITS.change} characters.` });
  (['driving', 'restraining'] as const).forEach((side) => {
    const list = i[side];
    if (!list.length) out.push({ field: side, message: `List at least one ${side} force.` });
    if (list.length > LIMITS.forces) out.push({ field: side, message: `List at most ${LIMITS.forces} ${side} forces.` });
    list.forEach((f, k) => {
      if (!f.label.trim()) out.push({ field: side, index: k, part: 'label', message: 'Name the force.' });
      if (f.strength === null || !Number.isInteger(f.strength) || f.strength < 1 || f.strength > 5) out.push({ field: side, index: k, part: 'strength', message: 'Give a strength from 1 to 5, a whole number.' });
    });
  });
  if (!i.stakeholders.length) out.push({ field: 'stakeholders', message: 'List at least one stakeholder.' });
  if (i.stakeholders.length > LIMITS.stakeholders) out.push({ field: 'stakeholders', message: `List at most ${LIMITS.stakeholders} stakeholders.` });
  i.stakeholders.forEach((s, k) => {
    if (!s.name.trim()) out.push({ field: 'stakeholders', index: k, part: 'name', message: 'Name the stakeholder.' });
    if (!isLevel(s.power) || !isLevel(s.interest) || !isStance(s.stance) || !isReason(s.reason)) out.push({ field: 'stakeholders', index: k, message: 'Choose the power, interest, stance and reason.' });
  });
  return out;
}

/* ---------- Force field analysis (HL toolkit) ---------- */

export interface ForceReading {
  summary: ForceFieldSummary;
  /** The restraining force the reader chose to weaken by 2 points, and the totals after. */
  lever: { index: number; label: string; from: number; to: number; after: ForceFieldSummary } | null;
}

/**
 * The totals, and what weakening the chosen restraining force by 2 points
 * would do to them (a force cannot fall below 1). Which force can be weakened
 * is the reader's judgement, not the strongest by default: a strong force
 * may be beyond a manager's reach.
 */
export function readForces(driving: Force[], restraining: Force[], lever: number | null): ForceReading {
  const summary = summarize(driving, restraining);
  if (lever === null || !restraining[lever]) return { summary, lever: null };
  const w = weaken(driving, restraining, lever);
  return { summary, lever: { index: lever, label: restraining[lever]?.label ?? '', from: w.from, to: w.to, after: w.after } };
}

/* ---------- Stakeholder mapping (enrichment) ---------- */

export type Quadrant = 'manage-closely' | 'keep-satisfied' | 'keep-informed' | 'monitor';

export const QUADRANTS: Record<Quadrant, { label: string; power: Level; interest: Level; what: string }> = {
  'manage-closely': { label: 'Manage closely', power: 'high', interest: 'high', what: 'Consult early and involve in the decision.' },
  'keep-satisfied': { label: 'Keep satisfied', power: 'high', interest: 'low', what: 'Make sure the change does not provoke them.' },
  'keep-informed': { label: 'Keep informed', power: 'low', interest: 'high', what: 'Explain the change and listen.' },
  monitor: { label: 'Monitor', power: 'low', interest: 'low', what: 'Little effort is needed, but watch for changes.' },
};

export function quadrant(s: Pick<Stakeholder, 'power' | 'interest'>): Quadrant {
  if (s.power === 'high') return s.interest === 'high' ? 'manage-closely' : 'keep-satisfied';
  return s.interest === 'high' ? 'keep-informed' : 'monitor';
}

/* ---------- Resistance expected ---------- */

export type Risk = 'high' | 'medium' | 'watch' | 'low' | 'ally';

export const RISK_LABEL: Record<Risk, string> = {
  high: 'High: could block the change',
  medium: 'Medium: could slow it, and could gain power by acting together',
  watch: 'Watch: could turn against it',
  low: 'Low',
  ally: 'An ally: use their support',
};

/** The platform's rule: opposition matters most where there is power to act on it. */
export function risk(s: Pick<Stakeholder, 'power' | 'interest' | 'stance'>): Risk {
  if (s.stance === 'supports') return 'ally';
  if (s.stance === 'opposes') return s.power === 'high' ? 'high' : 'medium';
  return s.power === 'high' || s.interest === 'high' ? 'watch' : 'low';
}

const RISK_ORDER: Risk[] = ['high', 'medium', 'watch', 'low', 'ally'];

/* ---------- Approaches to resistance (Kotter and Schlesinger, enrichment) ---------- */

export type ApproachId = 'education' | 'participation' | 'facilitation' | 'negotiation' | 'manipulation' | 'coercion';

export const APPROACHES: Record<ApproachId, { name: string; when: string; drawback: string }> = {
  education: { name: 'Education and communication', when: 'People lack information, or have been given the wrong idea.', drawback: 'It takes time when many people are involved, and it does not work if they distrust the message.' },
  participation: { name: 'Participation and involvement', when: 'People disagree with the plan, know things the planners do not, or have the power to resist.', drawback: 'It is slow, and the people involved may shape the change in ways managers did not intend.' },
  facilitation: { name: 'Facilitation and support', when: 'People resist because of fear, a lack of skills or the difficulty of adjusting.', drawback: 'Training, time off and support cost money, and they may still not be enough.' },
  negotiation: { name: 'Negotiation and agreement', when: 'A group clearly loses from the change and has the power to resist.', drawback: 'It can be expensive, and other groups may then expect to negotiate too.' },
  manipulation: { name: 'Manipulation and co-optation', when: 'Other approaches have failed or cost too much.', drawback: 'People who feel manipulated stop trusting managers, which makes the next change harder. It raises ethical questions.' },
  coercion: { name: 'Explicit and implicit coercion', when: 'Speed is essential and the managers making the change hold great power.', drawback: 'It is quick, but it breeds resentment, and people may leave or resist in quieter ways.' },
};

/** The approaches that fit a reason for resisting: the platform's mapping. */
export const APPROACH_FOR: Record<ReasonId, ApproachId[]> = {
  none: [],
  unknown: ['education', 'facilitation'],
  security: ['negotiation', 'education'],
  routine: ['facilitation', 'participation'],
  skills: ['facilitation'],
  communication: ['education', 'participation'],
  trust: ['participation', 'education'],
  disagree: ['participation'],
};

/** What to do for one stakeholder, with the approaches that fit. */
export function approachesFor(s: Stakeholder): ApproachId[] {
  if (s.stance === 'supports') return [];
  const fit = [...APPROACH_FOR[s.reason]];
  // A powerful group that is closely involved is worth involving, whatever its reason.
  if (quadrant(s) === 'manage-closely' && !fit.includes('participation')) fit.push('participation');
  if (!fit.length) fit.push('education');
  return fit;
}

export interface ResistanceRow {
  index: number;
  name: string;
  risk: Risk;
  quadrant: Quadrant;
  reason: ReasonId;
  approaches: ApproachId[];
}

/** Every stakeholder who does not support the change, the riskiest first. Allies come last. */
export function resistance(stakeholders: Stakeholder[]): ResistanceRow[] {
  return stakeholders
    .map((s, index) => ({ index, name: s.name, risk: risk(s), quadrant: quadrant(s), reason: s.reason, approaches: approachesFor(s) }))
    .sort((a, b) => RISK_ORDER.indexOf(a.risk) - RISK_ORDER.indexOf(b.risk) || a.index - b.index);
}

/* ---------- The steps to take ---------- */

export interface Step {
  id: string;
  title: string;
  /** Who the step is for; empty for a step that is for everyone. */
  who: string[];
  what: string;
  approach: ApproachId | null;
}

const names = (rows: ResistanceRow[]) => rows.map((r) => r.name);
/** A list in a sentence: "a", "a and b", "a, b and c". */
export const and = (xs: string[]): string => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : (xs[0] ?? ''));
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const count = (n: number) => WORDS[n] ?? String(n);

/**
 * The plan, in the platform's order: explain first, involve the people who
 * can shape or block the change, negotiate where people lose, train and
 * support, pilot when the forces are close or resistance is high, then review.
 */
export function planSteps(i: ChangeInputs): Step[] {
  const rows = resistance(i.stakeholders);
  const resisting = rows.filter((r) => r.risk !== 'ally');
  const uses = (a: ApproachId) => resisting.filter((r) => r.approaches.includes(a));
  const allies = rows.filter((r) => r.risk === 'ally');
  const forces = readForces(i.driving, i.restraining, null);
  const steps: Step[] = [
    {
      id: 'explain',
      title: 'Explain the change and the reasons for it, early',
      who: [],
      what: `Tell everyone affected what will change, why and when, before rumours do it for you.${uses('education').length ? ` Take particular care to explain it to ${and(names(uses('education')))}.` : ''}${allies.length ? ` Ask ${and(names(allies))} to help make the case.` : ''}`,
      approach: 'education',
    },
  ];
  if (uses('participation').length)
    steps.push({ id: 'involve', title: 'Involve the people who can shape or block it', who: names(uses('participation')), what: 'Ask them to help design how the change is made, and act on what they find. They may see flaws in the plan that managers have missed.', approach: 'participation' });
  if (uses('negotiation').length)
    steps.push({ id: 'negotiate', title: 'Negotiate where people stand to lose', who: names(uses('negotiation')), what: 'Agree what they will get in return, such as protected pay for a period, a guarantee of no compulsory redundancies or a bonus for adopting the change.', approach: 'negotiation' });
  if (uses('facilitation').length)
    steps.push({ id: 'support', title: 'Train and support people through it', who: names(uses('facilitation')), what: 'Give training in the new ways of working, time to adjust and help with what the change disrupts, such as flexible hours or redeployment.', approach: 'facilitation' });
  const close = forces.summary.balance !== 'driving' || forces.summary.driving - forces.summary.restraining <= 2;
  if (close || resisting.some((r) => r.risk === 'high'))
    steps.push({ id: 'pilot', title: 'Pilot it before making it everywhere', who: [], what: `${forces.summary.balance === 'driving' ? 'The driving forces lead only narrowly' : 'The restraining forces are at least as strong as the driving forces'}${resisting.some((r) => r.risk === 'high') ? ', and powerful stakeholders oppose it' : ''}. Try the change in one place, learn from it, then introduce it in stages.`, approach: null });
  steps.push({ id: 'review', title: 'Review it, and keep what works', who: [], what: 'Set a date to check how the change is going against what it was meant to achieve, listen to the people it affects, and adjust the plan before treating it as settled.', approach: null });
  return steps;
}

/* ---------- The reading ---------- */

export function readChange(i: ChangeInputs): { reading: string; implication: string } {
  const rows = resistance(i.stakeholders);
  const high = rows.filter((r) => r.risk === 'high');
  const medium = rows.filter((r) => r.risk === 'medium');
  const f = readForces(i.driving, i.restraining, null).summary;
  const opposers = high.length + medium.length;
  const reading = `${opposers === 0 ? 'No stakeholder is expected to oppose the change' : `${opposers === 1 ? 'One stakeholder is' : `${count(opposers)} stakeholders are`} expected to oppose the change`}${high.length ? `, and ${high.length === 1 ? (opposers === 1 ? 'has' : 'one of them has') : `${count(high.length).toLowerCase()} of them have`} the power to block it` : ''}. ${f.balance === 'driving' ? `The driving forces (${f.driving}) outweigh the restraining forces (${f.restraining}).` : f.balance === 'restraining' ? `The restraining forces (${f.restraining}) outweigh the driving forces (${f.driving}).` : `The forces are level, at ${f.driving} each.`}`;
  const reasons = [...new Set(rows.filter((r) => r.risk === 'high' || r.risk === 'medium').map((r) => r.reason).filter((r) => r !== 'none'))];
  const implication = opposers
    ? `Plan for the reasons behind the opposition${reasons.length ? `: ${reasons.map((r) => REASONS.find((x) => x.id === r)?.label.toLowerCase()).join('; ')}` : ''}. Each calls for a different approach, so a single announcement will not be enough.`
    : 'Explain the change clearly and keep listening: support can turn into resistance once the change starts to bite.';
  return { reading, implication };
}

export function changeCsvRows(i: ChangeInputs): string[][] {
  const f = readForces(i.driving, i.restraining, null).summary;
  return [
    ['The change', i.change],
    [],
    ['Force', 'Side', 'Strength (1 to 5)'],
    ...i.driving.map((x) => [x.label, 'driving', String(x.strength)]),
    ...i.restraining.map((x) => [x.label, 'restraining', String(x.strength)]),
    ['Total driving', '', String(f.driving)],
    ['Total restraining', '', String(f.restraining)],
    [],
    ['Stakeholder', 'Power', 'Interest', 'Stance', 'Main reason', 'Map', 'Risk', 'Approaches'],
    ...resistance(i.stakeholders).map((r) => {
      const s = i.stakeholders[r.index] as Stakeholder;
      return [s.name, s.power, s.interest, s.stance, REASONS.find((x) => x.id === s.reason)?.label ?? '', QUADRANTS[r.quadrant].label, RISK_LABEL[r.risk], r.approaches.map((a) => APPROACHES[a].name).join('; ')];
    }),
    [],
    ['Step', 'For', 'What'],
    ...planSteps(i).map((s, k) => [`${k + 1}. ${s.title}`, s.who.join('; ') || 'Everyone affected', s.what]),
  ];
}
