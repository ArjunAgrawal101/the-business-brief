/**
 * The workforce planning tool (2.1, with labour turnover from 2.4 at HL):
 * staff now, the staff needed each year, people leaving and retiring, and the
 * recruitment that closes the gap. Pure functions, shared by the page, its
 * script and the tests.
 *
 * Labour turnover is the platform's one calculation (src/lib/finance.ts): the
 * standard form, number of employees leaving ÷ average number of employees ×
 * 100. The guide names labour turnover (HL, AO2 and AO4) but its list of
 * formulas does not give one.
 *
 * The projection, in the platform's words: each year starts with last year's
 * staff; expected leavers are the leaving rate applied to the staff at the
 * start of the year, rounded to whole people; retirements are entered year by
 * year, so they are left out of the leaving rate to avoid counting them twice.
 */
import { labourTurnover } from './finance';
import { fmtNumber } from './format';

export interface PlanYear {
  label: string;
  /** Staff needed during the year, as a headcount. */
  demand: number;
  /** Retirements expected in the year. */
  retirements: number;
}

export interface WorkforceInputs {
  staffNow: number;
  /** Leavers other than retirements, per cent of the staff at the start of each year. */
  rate: number;
  years: PlanYear[];
  /** The most people the business can recruit in a year, or null for no limit. */
  recruitLimit: number | null;
}

export interface PlanRow {
  label: string;
  start: number;
  leavers: number;
  retirements: number;
  /** Staff left before anyone is recruited. */
  available: number;
  demand: number;
  /** Demand minus available staff: positive is a shortage, negative a surplus. */
  gap: number;
  recruit: number;
  /** Posts left unfilled because the recruitment limit binds. */
  shortfall: number;
  surplus: number;
  end: number;
}

export interface WorkforcePlan {
  inputs: WorkforceInputs;
  rows: PlanRow[];
  totalRecruit: number;
  totalLeavers: number;
  totalRetirements: number;
  totalShortfall: number;
  /** Net change in demand over the plan: the last year's demand minus staff now. */
  growth: number;
  /** Hires that replace leavers and retirements rather than add to the workforce. */
  replacement: number;
  /** Replacement as a share of all recruitment, per cent. */
  replacementShare: number | null;
}

export function planWorkforce(i: WorkforceInputs): WorkforcePlan {
  const rows: PlanRow[] = [];
  let start = i.staffNow;
  for (const y of i.years) {
    const leavers = Math.round((i.rate / 100) * start);
    const retirements = Math.min(y.retirements, Math.max(0, start - leavers));
    const available = start - leavers - retirements;
    const gap = y.demand - available;
    const wanted = Math.max(0, gap);
    const recruit = i.recruitLimit === null ? wanted : Math.min(wanted, i.recruitLimit);
    const end = available + recruit;
    rows.push({ label: y.label, start, leavers, retirements, available, demand: y.demand, gap, recruit, shortfall: wanted - recruit, surplus: Math.max(0, -gap), end });
    start = end;
  }
  const totalRecruit = rows.reduce((n, r) => n + r.recruit, 0);
  const last = i.years[i.years.length - 1];
  const growth = (last?.demand ?? i.staffNow) - i.staffNow;
  const replacement = Math.max(0, totalRecruit - Math.max(0, growth));
  return {
    inputs: i,
    rows,
    totalRecruit,
    totalLeavers: rows.reduce((n, r) => n + r.leavers, 0),
    totalRetirements: rows.reduce((n, r) => n + r.retirements, 0),
    totalShortfall: rows.reduce((n, r) => n + r.shortfall, 0),
    growth,
    replacement,
    replacementShare: totalRecruit > 0 ? (replacement / totalRecruit) * 100 : null,
  };
}

/** Last year's labour turnover, and the leaving rate without retirements, for the projection. */
export interface TurnoverInputs {
  start: number;
  end: number;
  leavers: number;
  retired: number;
}

export interface TurnoverResult {
  average: number;
  /** Labour turnover, all leavers: the platform's formula. */
  turnover: number | null;
  /** Leavers other than retirements, per cent of average staff. */
  leavingRate: number | null;
}

export function turnoverFrom(t: TurnoverInputs): TurnoverResult {
  const average = (t.start + t.end) / 2;
  return { average, turnover: labourTurnover(t.leavers, average), leavingRate: labourTurnover(Math.max(0, t.leavers - t.retired), average) };
}

/* ---------- Checks ---------- */

export type WorkforceField = 'staffNow' | 'rate' | 'recruitLimit' | 'demand' | 'retirements' | 'label' | 'start' | 'end' | 'leavers' | 'retired';

export interface WorkforceProblem {
  field: WorkforceField;
  /** For a year's fields: its position, counting from 0. */
  year?: number;
  message: string;
}

export const MAX_YEARS = 6;

export function validateWorkforce(raw: {
  staffNow: number | null;
  rate: number | null;
  recruitLimit: number | null | 'none';
  years: Array<{ label: string; demand: number | null; retirements: number | null }>;
}): WorkforceProblem[] {
  const out: WorkforceProblem[] = [];
  const whole = (v: number | null, field: WorkforceField, year?: number, max = 1_000_000) => {
    if (v === null || !Number.isFinite(v)) out.push({ field, year, message: 'Enter a whole number.' });
    else if (v < 0) out.push({ field, year, message: 'Cannot be negative.' });
    else if (!Number.isInteger(v)) out.push({ field, year, message: 'Use whole people.' });
    else if (v > max) out.push({ field, year, message: `Use ${fmtNumber(max)} or fewer.` });
  };
  whole(raw.staffNow, 'staffNow');
  if (raw.rate === null || !Number.isFinite(raw.rate)) out.push({ field: 'rate', message: 'Enter a percentage.' });
  else if (raw.rate < 0 || raw.rate > 100) out.push({ field: 'rate', message: 'Use a rate from 0 to 100%.' });
  if (raw.recruitLimit !== 'none') whole(raw.recruitLimit, 'recruitLimit');
  if (raw.years.length < 1 || raw.years.length > MAX_YEARS) out.push({ field: 'demand', message: `Plan from 1 to ${MAX_YEARS} years.` });
  raw.years.forEach((y, k) => {
    if (!y.label.trim()) out.push({ field: 'label', year: k, message: 'Name the year.' });
    whole(y.demand, 'demand', k);
    whole(y.retirements, 'retirements', k);
  });
  return out;
}

export function validateTurnover(raw: Record<'start' | 'end' | 'leavers' | 'retired', number | null>): WorkforceProblem[] {
  const out: WorkforceProblem[] = [];
  (['start', 'end', 'leavers', 'retired'] as const).forEach((f) => {
    const v = raw[f];
    if (v === null || !Number.isFinite(v)) out.push({ field: f, message: 'Enter a whole number.' });
    else if (v < 0) out.push({ field: f, message: 'Cannot be negative.' });
    else if (!Number.isInteger(v)) out.push({ field: f, message: 'Use whole people.' });
  });
  if (out.length) return out;
  const r = raw as Record<'start' | 'end' | 'leavers' | 'retired', number>;
  if (r.start + r.end <= 0) out.push({ field: 'start', message: 'The average number of employees must be above zero.' });
  if (r.retired > r.leavers) out.push({ field: 'retired', message: 'Retirements are part of the leavers, so they cannot be more.' });
  return out;
}

/* ---------- Options ---------- */

export type Fit = 'strong' | 'consider' | 'unlikely';

export interface WorkforceOption {
  id: string;
  name: string;
  fit: Fit;
  why: string;
  /** What to weigh against it. */
  but: string;
  hl?: boolean;
}

/**
 * Which human resource options suit the plan, by the platform's rules: each
 * option's fit follows from the numbers (a gap, a surplus, high turnover, many
 * retirements, a recruitment limit), and its reason says which.
 */
export function workforceOptions(p: WorkforcePlan, benchmark: number | null): WorkforceOption[] {
  const staff = p.inputs.staffNow || 1;
  const years = p.rows.length || 1;
  const recruitRate = (p.totalRecruit / years / staff) * 100;
  const surplus = p.rows.some((r) => r.surplus > 0);
  const highTurnover = benchmark !== null ? p.inputs.rate > benchmark : p.inputs.rate > 15;
  const manyRetire = (p.totalRetirements / years / staff) * 100 >= 2;
  const limited = p.totalShortfall > 0;
  const rate = fmtNumber(p.inputs.rate, 1);
  const out: WorkforceOption[] = [
    {
      id: 'retention',
      name: 'Keep more of the staff you have',
      fit: highTurnover || (p.replacementShare ?? 0) > 50 ? 'strong' : 'consider',
      why: `${p.replacementShare === null ? 'Every hire' : `${fmtNumber(p.replacementShare, 0)}% of the hires`} would replace people who leave or retire${highTurnover ? `, and the leaving rate of ${rate}% is above ${benchmark !== null ? `the benchmark of ${fmtNumber(benchmark, 1)}%` : '15%'}` : ''}. Better induction, training, rotas and recognition cut the recruitment needed.`,
      but: 'Retention takes time and management effort, and some turnover brings fresh skills and ideas.',
    },
    {
      id: 'external',
      name: 'Recruit from outside',
      fit: p.totalRecruit > 0 ? 'strong' : 'unlikely',
      why: p.totalRecruit > 0 ? `The plan needs ${fmtNumber(p.totalRecruit)} hires over ${years} ${years === 1 ? 'year' : 'years'}, about ${fmtNumber(recruitRate, 0)}% of today's staff each year.` : 'The plan needs no new staff.',
      but: 'External recruitment costs money and time, and every new starter needs an induction.',
    },
    {
      id: 'internal',
      name: 'Promote and transfer from within',
      fit: p.totalRecruit > 0 ? 'consider' : 'unlikely',
      why: 'Filling senior posts from inside is quicker and cheaper and rewards loyalty, and the entry-level posts it frees are easier to fill.',
      but: 'It brings in no new skills, and the post someone leaves still has to be filled.',
      hl: true,
    },
    {
      id: 'training',
      name: 'Train and upskill',
      fit: p.totalRecruit > 0 || p.growth > 0 ? 'strong' : 'consider',
      why: 'New starters need induction, and on-the-job and off-the-job training let existing staff move into the skilled posts that are hardest to fill.',
      but: 'Training costs money and time away from the job, and trained staff may be poached.',
    },
    {
      id: 'flexible',
      name: 'Offer flexible working',
      fit: manyRetire || limited || highTurnover ? 'strong' : 'consider',
      why: `Flexi-time, part-time and term-time contracts widen the pool of applicants and keep people who might otherwise leave${manyRetire ? ', including older staff who could phase their retirement' : ''}.`,
      but: 'Rotas and handovers get harder to manage, and not every job can be done flexibly.',
    },
    {
      id: 'temporary',
      name: 'Use temporary, agency or gig workers',
      fit: limited ? 'strong' : 'consider',
      why: limited ? `Recruitment cannot keep up: ${fmtNumber(p.totalShortfall)} ${p.totalShortfall === 1 ? 'post stays' : 'posts stay'} unfilled at the limit you set. Temporary and agency staff cover the gap while recruitment catches up.` : 'Temporary and agency staff cover peaks and vacancies without permanent contracts.',
      but: 'They cost more per hour, know the work less well and may be less committed, which matters where quality and continuity of care count.',
    },
    {
      id: 'outsourcing',
      name: 'Outsource work that is not core',
      fit: limited ? 'consider' : 'unlikely',
      why: 'Handing work such as catering, cleaning or payroll to a specialist firm reduces the number of posts the business must fill itself.',
      but: 'The business loses some control over quality, and contracts can cost more than they save.',
    },
    {
      id: 'redeployment',
      name: 'Redeploy staff',
      fit: surplus ? 'strong' : 'consider',
      why: surplus ? 'In at least one year the business has more staff than it needs. Moving them to where demand is growing keeps their skills and avoids redundancy.' : 'Moving staff between sites, shifts or roles matches people to where demand is, if one part of the business shrinks while another grows.',
      but: 'People may not want to move, and they may need retraining for the new role.',
    },
    {
      id: 'wastage',
      name: 'Let natural wastage reduce staff',
      fit: surplus ? 'strong' : 'unlikely',
      why: surplus ? 'Not replacing some leavers brings the workforce down to what is needed without redundancies.' : 'Only useful when the business has more staff than it needs, which this plan does not.',
      but: 'It is slow, and the people who leave may be the ones the business most wants to keep.',
    },
  ];
  return out;
}

/* ---------- Words ---------- */

export function readWorkforce(p: WorkforcePlan, org: string): { reading: string; implication: string } {
  const first = p.rows[0];
  const lastRow = p.rows[p.rows.length - 1];
  if (!first || !lastRow) return { reading: 'Add at least one year to the plan.', implication: '' };
  const yrs = p.rows.length;
  const parts = [`To go from ${fmtNumber(p.inputs.staffNow)} staff to the ${fmtNumber(lastRow.demand)} needed in ${lastRow.label}, ${org} must recruit ${fmtNumber(p.totalRecruit)} people over ${yrs} ${yrs === 1 ? 'year' : 'years'}.`];
  if (p.replacementShare !== null && p.totalRecruit > 0) {
    parts.push(`Only ${fmtNumber(Math.max(0, Math.min(p.growth, p.totalRecruit)))} of them are for growth; ${fmtNumber(p.replacement)} (${fmtNumber(p.replacementShare, 0)}%) replace the ${fmtNumber(p.totalLeavers)} expected leavers and ${fmtNumber(p.totalRetirements)} retirements.`);
  }
  if (p.totalShortfall > 0) parts.push(`At the recruitment limit, ${fmtNumber(p.totalShortfall)} ${p.totalShortfall === 1 ? 'post stays' : 'posts stay'} unfilled.`);
  const surplus = p.rows.filter((r) => r.surplus > 0);
  if (surplus.length) parts.push(`In ${surplus.map((r) => r.label).join(' and ')} there are more staff than needed: ${surplus.map((r) => fmtNumber(r.surplus)).join(' and ')}.`);
  const implication =
    p.replacementShare !== null && p.replacementShare > 50
      ? 'Most of the recruitment replaces people who leave. Cutting the leaving rate would do more to close the gap than any recruitment campaign, and it would save the cost of hiring and inducting each replacement.'
      : p.totalRecruit === 0
        ? 'The workforce already covers demand. Watch the leaving rate and the retirements: either can turn a surplus into a gap within a year.'
        : 'Most of the recruitment is for growth, so the plan rests on the demand forecast: if it is wrong, the business will have too many or too few staff.';
  return { reading: parts.join(' '), implication };
}

/** The recruitment a lower leaving rate would save over the plan. */
export function retentionSaving(i: WorkforceInputs, lowerRate: number): { recruit: number; saved: number } {
  const base = planWorkforce(i);
  const better = planWorkforce({ ...i, rate: lowerRate });
  return { recruit: better.totalRecruit, saved: base.totalRecruit - better.totalRecruit };
}

export function workforceCsvRows(p: WorkforcePlan): string[][] {
  return [
    ['Year', 'Staff at the start', 'Expected leavers', 'Retirements', 'Staff available', 'Staff needed', 'Recruitment', 'Unfilled', 'Surplus', 'Staff at the end'],
    ...p.rows.map((r) => [r.label, String(r.start), String(r.leavers), String(r.retirements), String(r.available), String(r.demand), String(r.recruit), String(r.shortfall), String(r.surplus), String(r.end)]),
  ];
}
