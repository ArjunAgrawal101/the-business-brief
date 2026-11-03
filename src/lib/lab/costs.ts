/**
 * Entrepreneurship and Innovation Lab: what it costs to start, how the start
 * is funded and how long the money lasts. Pure functions shared by the
 * start-up cost calculator, its script, the business plan digest and the unit
 * tests (tests/unit/lab-models.test.ts).
 *
 * The model is a monthly cash projection, not a profit forecast. One-off costs
 * are paid before trading starts. Monthly outgoings are paid every month and
 * include loan repayments, which take cash out of the business although only
 * their interest is a cost. Sales bring in their contribution (revenue minus
 * variable costs) from the month they start, growing at a steady monthly rate.
 *
 * Runway and burn rate are start-up terms, not IB content. The cash flow
 * forecast in the guide's layout (3.7) is worked on the Finance Desk.
 */
import { fmtMoney, fmtNumber, round } from '../format';

export const FUNDING_KINDS = ['own', 'loan', 'equity', 'grant', 'presales'] as const;
export type FundingKind = (typeof FUNDING_KINDS)[number];

/** What each kind of funding costs the founders: in control, in risk, or in obligations. */
export const FUNDING_LABELS: Record<FundingKind, { label: string; short: string; note: string }> = {
  own: { label: "Founders' own money", short: 'Own money', note: 'Nothing to repay and no one else to answer to, but the founders carry the whole loss if the business fails.' },
  loan: { label: 'Loan', short: 'Loans', note: 'Repaid with interest whatever happens to sales; the founders keep ownership and control.' },
  equity: { label: 'Shares sold to investors', short: 'Equity', note: 'Never repaid, but investors own part of the business, share its profits and usually want a say.' },
  grant: { label: 'Grant or prize', short: 'Grants', note: 'Neither repaid nor owned, but usually tied to conditions on how the money is spent.' },
  presales: { label: 'Pre-sales or rewards crowdfunding', short: 'Pre-sales', note: 'Customers pay in advance, so the business owes them the product: the cash comes with a cost still to be paid.' },
};

/** Months the projection covers. */
export const HORIZON = 24;
/** Most lines a list may hold, so the tool stays readable. */
export const MAX_LINES = 15;

export interface Line {
  id: string;
  label: string;
  amount: number;
}

export interface FundingLine extends Line {
  kind: FundingKind;
}

export interface CostInputs {
  oneOff: Line[];
  monthly: Line[];
  funding: FundingLine[];
  /** Contribution from sales in their first month: revenue minus variable costs. */
  contribution: number;
  /** Growth in contribution, per cent a month. */
  growth: number;
  /** The month sales start; 1 is the first month of trading. */
  salesStart: number;
}

export interface CostMonth {
  month: number;
  opening: number;
  outgoings: number;
  contribution: number;
  closing: number;
  /** The closing balance if there were no sales at all. */
  noSales: number;
}

export interface CostModel {
  inputs: CostInputs;
  oneOffTotal: number;
  monthlyTotal: number;
  fundingTotal: number;
  /** Funding minus one-off costs: the cash in the bank when trading starts. */
  cashAtLaunch: number;
  months: CostMonth[];
  /** The first month whose closing balance is below zero with the expected sales; null if the cash lasts the whole projection. */
  runOut: number | null;
  /** Whole months of trading the cash covers with the expected sales (HORIZON when it lasts the whole projection). */
  runway: number;
  /** Months the cash would last with no sales at all: cash at launch ÷ monthly outgoings. Null when nothing goes out each month. */
  zeroSalesRunway: number | null;
  /** Monthly outgoings minus the contribution in month 1: the net burn when trading starts. */
  netBurn: number;
  /** The first month in which contribution covers that month's outgoings. */
  breakEvenMonth: number | null;
  /** The lowest balance, at launch (month 0) or at the end of a month. */
  lowest: { month: number; balance: number };
  /** Extra funding needed for the balance never to fall below zero within the projection. */
  gap: number;
  mix: Array<{ kind: FundingKind; amount: number; share: number }>;
}

const sum = (lines: Line[]) => lines.reduce((n, l) => n + l.amount, 0);

/** Contribution in a given month: nothing before sales start, then growing at the monthly rate. */
export function contributionIn(i: Pick<CostInputs, 'contribution' | 'growth' | 'salesStart'>, month: number): number {
  if (month < i.salesStart) return 0;
  return i.contribution * (1 + i.growth / 100) ** (month - i.salesStart);
}

export function costModel(i: CostInputs, horizon = HORIZON): CostModel {
  const oneOffTotal = sum(i.oneOff);
  const monthlyTotal = sum(i.monthly);
  const fundingTotal = sum(i.funding);
  const cashAtLaunch = fundingTotal - oneOffTotal;
  const months: CostMonth[] = [];
  let balance = cashAtLaunch;
  let runOut: number | null = null;
  let breakEvenMonth: number | null = null;
  let lowest = { month: 0, balance: cashAtLaunch };
  for (let m = 1; m <= horizon; m += 1) {
    const contribution = contributionIn(i, m);
    const opening = balance;
    const closing = opening - monthlyTotal + contribution;
    months.push({ month: m, opening, outgoings: monthlyTotal, contribution, closing, noSales: cashAtLaunch - monthlyTotal * m });
    if (runOut === null && closing < -1e-9) runOut = m;
    if (breakEvenMonth === null && m >= i.salesStart && contribution >= monthlyTotal - 1e-9) breakEvenMonth = m;
    if (closing < lowest.balance - 1e-9) lowest = { month: m, balance: closing };
    balance = closing;
  }
  // Short of the one-off costs: overdrawn before the first month ends.
  if (cashAtLaunch < -1e-9) runOut = runOut === null ? 1 : Math.min(runOut, 1);
  const zeroSalesRunway = monthlyTotal > 0 ? Math.max(0, cashAtLaunch) / monthlyTotal : null;
  const mix = FUNDING_KINDS.map((kind) => {
    const amount = sum(i.funding.filter((f) => f.kind === kind));
    return { kind, amount, share: fundingTotal > 0 ? (amount / fundingTotal) * 100 : 0 };
  }).filter((x) => x.amount > 0);
  return {
    inputs: i,
    oneOffTotal,
    monthlyTotal,
    fundingTotal,
    cashAtLaunch,
    months,
    runOut,
    runway: runOut === null ? horizon : runOut - 1,
    zeroSalesRunway,
    netBurn: monthlyTotal - contributionIn(i, 1),
    breakEvenMonth,
    lowest,
    gap: lowest.balance < 0 ? -lowest.balance : 0,
    mix,
  };
}

/* ---------- Validation of what the learner typed ---------- */

export interface FieldProblem {
  /** "contribution", "growth", "salesStart", or "<list>:<line id>:<amount | label>". */
  field: string;
  message: string;
}

export interface LineDraft {
  id: string;
  label: string;
  amount: number | null;
}

export interface FundingDraft extends LineDraft {
  kind: FundingKind;
}

export interface CostDraft {
  oneOff: LineDraft[];
  monthly: LineDraft[];
  funding: FundingDraft[];
  contribution: number | null;
  growth: number | null;
  salesStart: number | null;
}

export function validateCosts(d: CostDraft): FieldProblem[] {
  const out: FieldProblem[] = [];
  const lines = (list: 'oneOff' | 'monthly' | 'funding', items: LineDraft[]) => {
    if (items.length > MAX_LINES) out.push({ field: `${list}:list`, message: `Use at most ${MAX_LINES} lines; combine small items.` });
    items.forEach((l) => {
      if (l.amount === null || !Number.isFinite(l.amount)) out.push({ field: `${list}:${l.id}:amount`, message: 'Enter an amount, or remove the line.' });
      else if (l.amount < 0) out.push({ field: `${list}:${l.id}:amount`, message: 'An amount cannot be negative.' });
      else if (l.amount > 0 && !l.label.trim()) out.push({ field: `${list}:${l.id}:label`, message: 'Say what this amount is for.' });
    });
  };
  lines('oneOff', d.oneOff);
  lines('monthly', d.monthly);
  lines('funding', d.funding);
  d.funding.forEach((f) => {
    if (!FUNDING_KINDS.includes(f.kind)) out.push({ field: `funding:${f.id}:kind`, message: 'Choose the kind of funding.' });
  });
  if (d.contribution === null || !Number.isFinite(d.contribution)) out.push({ field: 'contribution', message: 'Enter a number: 0 if there are no sales yet.' });
  else if (d.contribution < 0) out.push({ field: 'contribution', message: 'Enter the contribution after variable costs. If each sale loses money, fix the price or the costs first.' });
  if (d.growth === null || !Number.isFinite(d.growth)) out.push({ field: 'growth', message: 'Enter a number: 0 for no growth.' });
  else if (d.growth < -50 || d.growth > 100) out.push({ field: 'growth', message: 'Use a monthly growth rate from −50% to 100%.' });
  if (d.salesStart === null || !Number.isInteger(d.salesStart) || d.salesStart < 1 || d.salesStart > HORIZON) out.push({ field: 'salesStart', message: `Enter a whole month from 1 to ${HORIZON}.` });
  return out;
}

/** A draft that passed validation, as model inputs. */
export function fromDraft(d: CostDraft): CostInputs {
  const line = (l: LineDraft): Line => ({ id: l.id, label: l.label.trim(), amount: l.amount ?? 0 });
  return {
    oneOff: d.oneOff.map(line),
    monthly: d.monthly.map(line),
    funding: d.funding.map((f) => ({ ...line(f), kind: f.kind })),
    contribution: d.contribution ?? 0,
    growth: d.growth ?? 0,
    salesStart: d.salesStart ?? 1,
  };
}

export function toDraft(i: CostInputs): CostDraft {
  return { oneOff: i.oneOff.map((l) => ({ ...l })), monthly: i.monthly.map((l) => ({ ...l })), funding: i.funding.map((l) => ({ ...l })), contribution: i.contribution, growth: i.growth, salesStart: i.salesStart };
}

/* ---------- Reading the result ---------- */

const months = (n: number, d = 0) => `${fmtNumber(n, d)} ${round(n, d) === 1 ? 'month' : 'months'}`;

export function readCosts(m: CostModel, currency: string): { reading: string; implication: string } {
  const money = (v: number) => fmtMoney(v, currency, 0);
  const parts: string[] = [];
  if (m.cashAtLaunch >= 0) parts.push(`Funding of ${money(m.fundingTotal)} covers the one-off costs of ${money(m.oneOffTotal)}, leaving ${money(m.cashAtLaunch)} when trading starts.`);
  else parts.push(`Funding of ${money(m.fundingTotal)} falls ${money(-m.cashAtLaunch)} short of the one-off costs of ${money(m.oneOffTotal)}, so the business is short of cash before it trades.`);
  if (m.zeroSalesRunway !== null) parts.push(`Monthly outgoings are ${money(m.monthlyTotal)}: with no sales at all, the cash would last ${months(m.zeroSalesRunway, 1)}.`);
  else parts.push('Nothing goes out each month, so only the one-off costs draw on the funding.');
  parts.push(
    m.runOut === null
      ? `With the expected contribution, the cash lasts all ${HORIZON} months shown.`
      : `With the expected contribution, the cash runs out in month ${m.runOut}: a runway of ${months(m.runway)}.`,
  );
  parts.push(
    m.breakEvenMonth === null
      ? `Contribution never covers the monthly outgoings within the ${HORIZON} months.`
      : `Contribution first covers the month's outgoings in month ${m.breakEvenMonth}.`,
  );
  const implication =
    m.gap > 0
      ? `To stay above zero for the ${HORIZON} months projected, the plan needs about ${money(m.gap)} more, lower outgoings or faster growth: the lowest balance is ${money(m.lowest.balance)}${m.lowest.month ? ` at the end of month ${m.lowest.month}` : ' at launch'}. Founders usually raise more than the gap, because sales tend to arrive later and grow more slowly than planned.`
      : 'On these figures the cash never runs out. The no-sales line is the stress test: it shows how long the founders would have to put things right if sales stalled.';
  return { reading: parts.join(' '), implication };
}

/** One sentence on what the funding mix costs the founders in control and risk. */
export function readMix(m: CostModel): string {
  if (!m.mix.length) return 'No funding has been entered yet.';
  const pct = (k: FundingKind) => m.mix.find((x) => x.kind === k)?.share ?? 0;
  const bits: string[] = [];
  if (pct('loan') > 0) bits.push(`${fmtNumber(pct('loan'), 0)}% is borrowed and must be repaid whatever happens to sales`);
  if (pct('equity') > 0) bits.push(`${fmtNumber(pct('equity'), 0)}% was raised by selling shares, so investors share the ownership and the profits`);
  if (pct('presales') > 0) bits.push(`${fmtNumber(pct('presales'), 0)}% is customers' money paid in advance, owed back as products`);
  if (pct('own') > 0) bits.push(`${fmtNumber(pct('own'), 0)}% is the founders' own money, at risk if the business fails`);
  if (pct('grant') > 0) bits.push(`${fmtNumber(pct('grant'), 0)}% comes from grants, with conditions attached`);
  return `Of the funding, ${bits.join('; ')}.`;
}
