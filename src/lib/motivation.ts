/**
 * The motivation analysis (2.4): a job or a workforce rated on the factors
 * the motivation theories look at, read through each theory the guide names,
 * and matched to the financial and non-financial rewards that fit. Taylor,
 * Maslow and Herzberg are for SL and HL; McClelland, Deci and Ryan, equity
 * theory and expectancy theory are HL only (guide, p. 26).
 *
 * The ratings are judgements from 1 (the job provides this poorly) to 5 (very
 * well). Which factor speaks to which theory, the threshold of 3 for a need
 * "met", and the expectancy index are the platform's teaching model, labelled
 * as such on the page: the theories themselves set no numbers.
 */

export const FACTORS = [
  { id: 'pay', label: 'Pay compared with similar jobs elsewhere', hl: false },
  { id: 'security', label: 'Job security', hl: false },
  { id: 'conditions', label: 'Working conditions: safety, comfort and hours', hl: false },
  { id: 'relationships', label: 'Relationships with colleagues and a sense of belonging', hl: false },
  { id: 'supervision', label: 'Fair and supportive supervision', hl: false },
  { id: 'recognition', label: 'Recognition and feedback for good work', hl: false },
  { id: 'responsibility', label: 'Responsibility and a say in how the work is done', hl: false },
  { id: 'work', label: 'Interesting, varied work', hl: false },
  { id: 'growth', label: 'Training and the chance of promotion', hl: false },
  { id: 'purpose', label: 'A sense that the work makes a difference', hl: false },
  { id: 'fairness', label: 'Pay and treatment seen as fair beside colleagues', hl: true },
  { id: 'expectancy', label: 'Targets that effort can actually reach', hl: true },
  { id: 'instrumentality', label: 'Good performance reliably rewarded', hl: true },
  { id: 'valence', label: 'Rewards that staff actually value', hl: true },
] as const;

export type FactorId = (typeof FACTORS)[number]['id'];
export type Ratings = Record<FactorId, number>;
export type Need = 'achievement' | 'affiliation' | 'power' | 'unknown';

export interface JobFacts {
  /** Each person's output can be counted. */
  countable: boolean;
  /** Pay could follow the sales each person makes. */
  sales: boolean;
  /** The work is done in teams. */
  teams: boolean;
  /** The business is a company that could offer shares to staff. */
  shares: boolean;
}

export interface MotivationInputs {
  ratings: Ratings;
  job: JobFacts;
  need: Need;
}

/** A need or factor counts as met at 3 or more on the 1 to 5 scale: the platform's threshold. */
export const MET = 3;

const avg = (r: Ratings, ids: FactorId[]) => ids.reduce((n, id) => n + (r[id] ?? 0), 0) / ids.length;
const label = (id: FactorId) => FACTORS.find((f) => f.id === id)?.label.toLowerCase() ?? id;

export function validateRatings(r: Partial<Record<FactorId, number | null>>): FactorId[] {
  return FACTORS.filter((f) => {
    const v = r[f.id];
    return v === null || v === undefined || !Number.isInteger(v) || v < 1 || v > 5;
  }).map((f) => f.id);
}

/* ---------- Maslow ---------- */

export const MASLOW = [
  { id: 'physiological', label: 'Physiological', factors: ['pay'] as FactorId[] },
  { id: 'safety', label: 'Safety', factors: ['security', 'conditions'] as FactorId[] },
  { id: 'social', label: 'Social', factors: ['relationships'] as FactorId[] },
  { id: 'esteem', label: 'Esteem', factors: ['recognition', 'responsibility', 'growth'] as FactorId[] },
  { id: 'self-actualization', label: 'Self-actualization', factors: ['work', 'purpose'] as FactorId[] },
] as const;

export interface MaslowReading {
  levels: Array<{ id: string; label: string; score: number; met: boolean }>;
  /** The lowest level not met, which Maslow would say drives behaviour now. */
  lowestUnmet: string | null;
  reading: string;
}

export function maslow(r: Ratings): MaslowReading {
  const levels = MASLOW.map((l) => {
    const score = avg(r, l.factors);
    return { id: l.id, label: l.label, score, met: score >= MET };
  });
  const lowest = levels.find((l) => !l.met) ?? null;
  const reading = lowest
    ? `The lowest need not met is ${lowest.label.toLowerCase()} (${lowest.score.toFixed(1)} out of 5). Maslow would expect it to drive behaviour now, so rewards aimed at higher needs will do less until it is met.`
    : 'Every level is at least partly met, so the higher needs, esteem and self-actualization, are where further motivation would come from.';
  return { levels, lowestUnmet: lowest?.id ?? null, reading };
}

/* ---------- Herzberg ---------- */

export const HYGIENE: FactorId[] = ['pay', 'security', 'conditions', 'relationships', 'supervision'];
export const MOTIVATORS: FactorId[] = ['recognition', 'responsibility', 'work', 'growth'];

export type Quadrant = 'motivated-content' | 'content-unmotivated' | 'motivated-complaining' | 'demotivated';

export const QUADRANT_LABEL: Record<Quadrant, string> = {
  'motivated-content': 'Few complaints and real motivation',
  'content-unmotivated': 'Few complaints, but little drive',
  'motivated-complaining': 'Motivated, but with grievances',
  demotivated: 'Grievances and little drive',
};

export interface HerzbergReading {
  hygiene: number;
  motivators: number;
  quadrant: Quadrant;
  /** The weakest hygiene factor and the weakest motivator. */
  worstHygiene: FactorId;
  worstMotivator: FactorId;
  reading: string;
}

const worst = (r: Ratings, ids: FactorId[]) => ids.reduce((a, b) => ((r[b] ?? 0) < (r[a] ?? 0) ? b : a), ids[0] as FactorId);

export function herzberg(r: Ratings): HerzbergReading {
  const hygiene = avg(r, HYGIENE);
  const motivators = avg(r, MOTIVATORS);
  const quadrant: Quadrant = hygiene >= MET ? (motivators >= MET ? 'motivated-content' : 'content-unmotivated') : motivators >= MET ? 'motivated-complaining' : 'demotivated';
  const wh = worst(r, HYGIENE);
  const wm = worst(r, MOTIVATORS);
  const text = {
    'motivated-content': 'Hygiene factors are in place, so there is little to complain about, and the motivators give people reasons to work well.',
    'content-unmotivated': `Hygiene factors are good enough to prevent dissatisfaction, but the motivators are weak, so people may stay without putting in real effort. Herzberg's answer is job enrichment, starting with ${label(wm)}.`,
    'motivated-complaining': `The work itself motivates, but poor hygiene factors cause dissatisfaction, starting with ${label(wh)}. Fixing them will not add motivation, but it will stop the complaints and resignations they cause.`,
    demotivated: `Both scales are low. Herzberg would fix the hygiene factors first, starting with ${label(wh)}, to end the dissatisfaction, then build the motivators, starting with ${label(wm)}.`,
  }[quadrant];
  return { hygiene, motivators, quadrant, worstHygiene: wh, worstMotivator: wm, reading: text };
}

/* ---------- Taylor ---------- */

export function taylor(job: JobFacts, r: Ratings): { fits: boolean; reading: string } {
  if (!job.countable) {
    return { fits: false, reading: "Taylor's method needs output that can be counted for each person, to set a standard and pay by the piece. Here it cannot, so his approach has little to offer beyond clearer methods and training." };
  }
  const caution = r.responsibility < MET || r.work < MET ? ' The job already offers little say or variety, so tighter standards and close monitoring risk deepening the demotivation: the criticism made of digital Taylorism, an HL idea in subtopic 5.9.' : '';
  return { fits: true, reading: `Output can be counted, so Taylor would study the job, set a standard method and target, train people in it and pay a piece rate for output above the standard.${caution} Watch quality: pay for speed can raise errors.` };
}

/* ---------- HL: Deci and Ryan, equity, expectancy, McClelland ---------- */

export function selfDetermination(r: Ratings): { autonomy: number; competence: number; relatedness: number; weakest: 'autonomy' | 'competence' | 'relatedness'; reading: string } {
  const autonomy = r.responsibility;
  const competence = (r.growth + r.recognition) / 2;
  const relatedness = r.relationships;
  const all = { autonomy, competence, relatedness };
  const weakest = (Object.keys(all) as Array<keyof typeof all>).reduce((a, b) => (all[b] < all[a] ? b : a), 'autonomy');
  const low = all[weakest] < MET;
  const fix = { autonomy: 'empowerment and a say in how the work is done', competence: 'training and useful feedback', relatedness: 'teamwork and supportive leaders' }[weakest];
  return {
    autonomy,
    competence,
    relatedness,
    weakest,
    reading: low ? `The weakest of the three basic needs is ${weakest} (${all[weakest].toFixed(1)} out of 5). Deci and Ryan would expect intrinsic motivation to stay low until it is met, through ${fix}. Controlling rewards and close monitoring would make it worse.` : 'Autonomy, competence and relatedness are all at least partly met, which Deci and Ryan link to lasting, intrinsic motivation.',
  };
}

export function equity(r: Ratings): { reading: string; underRewarded: boolean } {
  const under = r.fairness < MET;
  return {
    underRewarded: under,
    reading: under ? 'Staff are likely to feel under-rewarded beside the people they compare themselves with. Adams would expect them to restore the balance by cutting effort, asking for more, or leaving, whatever else improves. Perceived fairness matters, so open, consistent decisions on pay help.' : 'Staff are unlikely to feel under-rewarded beside others, so equity is not the problem to solve first.',
  };
}

/**
 * An illustrative index only: each belief rescaled from 1 to 5 onto 0 to 1,
 * then multiplied, to show why one weak belief weakens motivation however
 * strong the others are. Vroom's beliefs are not measurable figures.
 */
export function expectancy(r: Ratings): { e: number; i: number; v: number; force: number; weakest: 'expectancy' | 'instrumentality' | 'valence'; reading: string } {
  const s = (x: number) => (x - 1) / 4;
  const e = s(r.expectancy);
  const i = s(r.instrumentality);
  const v = s(r.valence);
  const force = e * i * v;
  const all = { expectancy: e, instrumentality: i, valence: v };
  const weakest = (Object.keys(all) as Array<keyof typeof all>).reduce((a, b) => (all[b] < all[a] ? b : a), 'expectancy');
  const fix = { expectancy: 'reachable targets, training and the right equipment', instrumentality: 'a reward system that reliably pays out for good performance', valence: 'rewards that suit what staff want' }[weakest];
  return { e, i, v, force, weakest, reading: `The illustrative index is ${force.toFixed(2)} on a scale from 0 to 1. The weakest belief is ${weakest}, and because the three combine by multiplication it holds the others back: strengthen it with ${fix}.` };
}

export function mcclelland(need: Need, r: Ratings, job: JobFacts): { reading: string; fit: number | null } {
  if (need === 'unknown') return { fit: null, reading: 'Choose the dominant need of the staff, if the evidence shows one, to see whether the job feeds it.' };
  const fit = need === 'achievement' ? (r.responsibility + r.recognition + r.growth) / 3 : need === 'affiliation' ? r.relationships : (r.responsibility + r.growth) / 2;
  const teams = need === 'affiliation' && job.teams ? ' Working in teams helps.' : '';
  const feeds = { achievement: 'challenging goals, responsibility for results and regular feedback', affiliation: 'teamwork and warm relationships', power: 'responsibility, influence and a route to leadership' }[need];
  return { fit, reading: `Staff driven mainly by ${need} want ${feeds}. The job scores ${fit.toFixed(1)} out of 5 on what feeds that need, so ${fit >= MET ? 'it broadly suits them' : 'it is poorly matched to them, and a change of role or reward would serve them better'}.${teams}` };
}

/* ---------- Rewards that fit ---------- */

export type RewardKind = 'financial' | 'non-financial' | 'training';

export interface Reward {
  id: string;
  name: string;
  kind: RewardKind;
  fit: 'strong' | 'consider';
  why: string;
  but: string;
  /** The theories that support it. */
  theory: string;
  /** Suggested only because of an HL-only rating (fairness or the expectancy beliefs). */
  hl?: boolean;
}

/**
 * The rewards the guide names that fit the ratings and the job, by the
 * platform's rules: a weak factor (below 3) calls for the rewards that work
 * on it, and the job's facts decide which payment methods are possible.
 */
export function rewards(i: MotivationInputs): Reward[] {
  const r = i.ratings;
  const j = i.job;
  const out: Reward[] = [];
  const low = (id: FactorId) => r[id] < MET;
  if (low('pay')) out.push({ id: 'pay', name: 'Salary or wages at the market rate', kind: 'financial', fit: 'strong', why: `Pay is rated ${r.pay}. Basic pay that matches similar jobs removes a source of dissatisfaction.`, but: 'In Herzberg\u2019s terms it stops complaints rather than motivating, and a rise soon feels normal.', theory: 'Herzberg (hygiene), Maslow (physiological), equity' });
  else if (low('fairness')) out.push({ id: 'pay', name: 'Open, consistent decisions on pay and treatment', kind: 'financial', fit: 'consider', why: `Pay itself is rated ${r.pay}, but fairness beside colleagues only ${r.fairness}. Consistent rules on pay, hours and training remove a sense of injustice that no bonus would fix.`, but: 'Perceptions of fairness are hard to change once they have set in.', theory: 'Equity, Herzberg (hygiene)', hl: true });
  if (j.countable) out.push({ id: 'piece', name: 'Piece rates, with a guaranteed minimum', kind: 'financial', fit: low('work') && low('responsibility') ? 'consider' : 'strong', why: 'Output can be counted for each person, so pay can follow it.', but: 'Pay for speed can raise errors and stress, and it works against autonomy.', theory: 'Taylor' });
  if (j.sales) out.push({ id: 'commission', name: 'Commission on sales', kind: 'financial', fit: 'strong', why: 'Pay could follow the sales each person makes.', but: 'It can encourage pushy selling and rivalry, and income falls when sales fall.', theory: 'Taylor, expectancy' });
  if (low('instrumentality') || low('recognition')) out.push({ id: 'prp', name: 'Performance-related pay', kind: 'financial', fit: 'consider', why: 'A bonus for agreed targets links reward to performance, which strengthens the belief that good work is rewarded.', but: 'It needs targets that are fair to measure, and those who miss out may feel the system is unfair.', theory: 'Expectancy (instrumentality), Herzberg (recognition)', hl: !low('recognition') });
  if (j.teams) out.push({ id: 'profit', name: 'Profit-related pay', kind: 'financial', fit: 'consider', why: 'The work is done in teams, so a bonus from profit gives everyone a shared interest in the result.', but: 'One person’s effort makes little difference to total profit, and in a bad year the bonus disappears.', theory: 'Maslow (social), equity' });
  if (j.shares && (low('security') || low('growth'))) out.push({ id: 'shares', name: 'An employee share ownership scheme', kind: 'financial', fit: 'consider', why: 'Shares reward staying and give staff a stake in the firm’s future.', but: 'The link to effort is weak, and staff savings become tied to their employer.', theory: 'Maslow (safety and esteem)' });
  if (low('conditions') || low('security')) out.push({ id: 'fringe', name: 'Fringe payments', kind: 'financial', fit: 'consider', why: `Conditions are rated ${r.conditions} and security ${r.security}. Benefits such as subsidized meals, transport for night shifts or health cover can matter more than a small rise.`, but: 'They are soon taken for granted.', theory: 'Herzberg (hygiene), Maslow (safety)' });
  if (low('work') || low('responsibility') || low('growth')) out.push({ id: 'enrichment', name: 'Job enrichment', kind: 'non-financial', fit: 'strong', why: `The work itself (${r.work}), responsibility (${r.responsibility}) and growth (${r.growth}) are the motivators. Complete, challenging tasks with responsibility for the result build them.`, but: 'It needs training and support, and staff may expect pay to rise with it.', theory: 'Herzberg (motivators), Maslow (esteem and self-actualization)' });
  if (low('work')) out.push({ id: 'rotation', name: 'Job rotation', kind: 'non-financial', fit: 'consider', why: 'Moving between tasks adds variety and builds a multi-skilled team that can cover absences.', but: 'If every task is dull it only swaps one dull task for another.', theory: 'Herzberg (the work itself)' });
  if (low('work')) out.push({ id: 'enlargement', name: 'Job enlargement', kind: 'non-financial', fit: 'consider', why: 'More tasks of a similar level give more variety.', but: 'Staff may see it as more work for the same pay.', theory: 'Herzberg (the work itself)' });
  if (low('responsibility') || low('supervision')) out.push({ id: 'empowerment', name: 'Empowerment', kind: 'non-financial', fit: 'strong', why: `Responsibility is rated ${r.responsibility}. Authority to make decisions about their own work, with training and trust, meets the need for autonomy.`, but: 'It needs managers willing to let go and a culture that accepts some mistakes.', theory: 'Deci and Ryan (autonomy), Herzberg (responsibility)' });
  if (low('purpose')) out.push({ id: 'purpose', name: 'Purpose: showing the difference the work makes', kind: 'non-financial', fit: 'consider', why: 'Showing staff the effect of their work on customers and the community builds meaning.', but: 'Claims of purpose that do not match how the business behaves breed cynicism.', theory: 'Maslow (self-actualization), Deci and Ryan' });
  if (low('relationships') || j.teams) out.push({ id: 'teamwork', name: 'Teamwork', kind: 'non-financial', fit: low('relationships') ? 'strong' : 'consider', why: `Relationships are rated ${r.relationships}. Teams with shared goals meet social needs and spread skills.`, but: 'Teams can bring conflict and members who rely on others’ effort.', theory: 'Maslow (social), Deci and Ryan (relatedness)' });
  if (low('growth') || low('expectancy')) out.push({ id: 'training', name: 'Training', kind: 'training', fit: 'strong', why: `Training and promotion are rated ${r.growth} and reachable targets ${r.expectancy}. Induction for new starters, then training on the job and off the job, builds competence and the belief that effort will succeed.`, but: 'It costs time and money, and trained staff may be poached.', theory: 'Deci and Ryan (competence), expectancy, Herzberg (growth)', hl: !low('growth') });
  return out;
}

/** The headline: what to fix first, in the theories' order of priority. */
export function readMotivation(i: MotivationInputs): { reading: string; implication: string } {
  const m = maslow(i.ratings);
  const h = herzberg(i.ratings);
  const rs = rewards(i);
  const strong = rs.filter((x) => x.fit === 'strong').map((x) => x.name.toLowerCase());
  const list = strong.length > 1 ? `${strong.slice(0, -1).join(', ')} and ${strong[strong.length - 1]}` : (strong[0] ?? '');
  return {
    reading: `${QUADRANT_LABEL[h.quadrant]}: hygiene factors average ${h.hygiene.toFixed(1)} and motivators ${h.motivators.toFixed(1)} out of 5. ${m.lowestUnmet ? `The lowest unmet need on Maslow's hierarchy is ${MASLOW.find((l) => l.id === m.lowestUnmet)?.label.toLowerCase()}.` : 'Every level of Maslow’s hierarchy is at least partly met.'}`,
    implication: strong.length ? `The rewards that fit best: ${list}. Fix what causes dissatisfaction first, then build what motivates.` : 'No factor is weak on this rating, so look for what would raise motivation further rather than what to fix.',
  };
}

export function motivationCsvRows(i: MotivationInputs): string[][] {
  return [
    ['Factor', 'Rating (1 to 5)', 'HL only'],
    ...FACTORS.map((f) => [f.label, String(i.ratings[f.id]), f.hl ? 'yes' : '']),
    [],
    ['Reward', 'Kind', 'Fit', 'Why', 'Theory'],
    ...rewards(i).map((r) => [r.name, r.kind, r.fit, r.why, r.theory]),
  ];
}
