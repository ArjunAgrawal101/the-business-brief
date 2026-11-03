/**
 * Entrepreneurship and Innovation Lab: unit economics for a business that wins
 * customers and keeps them, such as a subscription. Pure functions shared by
 * the calculator, its script, the business plan digest and the unit tests.
 *
 * None of these measures is on the IB formula list (guide, pp. 64 to 65): they
 * are enrichment, standard in start-up finance. Contribution per customer is
 * the IB's contribution per unit (5.5) applied to a customer for a month, and
 * CAC payback asks the payback question of investment appraisal (3.8) about
 * the cost of winning one customer.
 *
 * Expected lifetime assumes a constant monthly churn rate: if a share c of
 * customers leaves each month, a customer stays 1 ÷ c months on average. The
 * lifetime is capped, because a very low churn rate would otherwise promise
 * customers who stay for decades. Lifetime value here is undiscounted.
 */
import type { Working } from '../finance';
import { fmtMoney, fmtNumber, round } from '../format';

export interface UnitInputs {
  /** Marketing and sales spending in the period. */
  spend: number;
  /** New customers won in the same period. */
  customers: number;
  /** Average revenue per customer per month. */
  revenue: number;
  /** Variable cost of serving one customer for a month. */
  variableCost: number;
  /** Share of customers who leave each month, per cent. */
  churn: number;
  /** The longest lifetime counted, in months. */
  cap: number;
}

export interface UnitModel {
  inputs: UnitInputs;
  /** Customer acquisition cost: spend ÷ customers won. */
  cac: number | null;
  /** Contribution per customer per month: revenue minus variable cost. */
  contribution: number;
  /** Contribution as a share of revenue, per cent. */
  margin: number | null;
  /** Expected lifetime in months, after the cap. */
  lifetime: number;
  /** 1 ÷ churn, before the cap (null when churn is zero). */
  uncapped: number | null;
  capped: boolean;
  /** Lifetime value: contribution per month × expected lifetime. */
  ltv: number;
  /** The common overstatement: revenue, not contribution, × lifetime. */
  ltvRevenue: number;
  /** LTV ÷ CAC. */
  ratio: number | null;
  /** Months of contribution needed to earn back the CAC. Null when contribution is not positive. */
  payback: number | null;
}

export function unitEconomics(i: UnitInputs): UnitModel {
  const cac = i.customers > 0 ? i.spend / i.customers : null;
  const contribution = i.revenue - i.variableCost;
  const uncapped = i.churn > 0 ? 100 / i.churn : null;
  const lifetime = uncapped === null ? i.cap : Math.min(uncapped, i.cap);
  const ltv = contribution * lifetime;
  return {
    inputs: i,
    cac,
    contribution,
    margin: i.revenue > 0 ? (contribution / i.revenue) * 100 : null,
    lifetime,
    uncapped,
    capped: uncapped === null || uncapped > i.cap,
    ltv,
    ltvRevenue: i.revenue * lifetime,
    ratio: cac !== null && cac > 0 ? ltv / cac : null,
    payback: cac !== null && contribution > 0 ? cac / contribution : null,
  };
}

/** Rules of thumb many investors quote for subscription businesses. Not laws, and not IB content. */
export const RULES_OF_THUMB = { ratio: 3, payback: 12 } as const;

export type UnitVerdict = 'loses' | 'thin' | 'healthy' | 'unknown';

export function verdict(u: UnitModel): UnitVerdict {
  if (u.ratio === null) return 'unknown';
  if (u.ratio < 1) return 'loses';
  if (u.ratio < RULES_OF_THUMB.ratio) return 'thin';
  return 'healthy';
}

export const VERDICT_WORDS: Record<UnitVerdict, string> = {
  loses: 'Loses money on each customer',
  thin: 'Covers its acquisition cost, with little to spare',
  healthy: 'Above the 3 to 1 rule of thumb',
  unknown: 'Not enough information',
};

/* ---------- Validation ---------- */

export interface FieldProblem {
  field: keyof UnitInputs;
  message: string;
}

export function validateUnit(raw: Record<keyof UnitInputs, number | null>): FieldProblem[] {
  const out: FieldProblem[] = [];
  (Object.keys(raw) as Array<keyof UnitInputs>).forEach((k) => {
    const v = raw[k];
    if (v === null || !Number.isFinite(v)) out.push({ field: k, message: 'Enter a number.' });
    else if (v < 0) out.push({ field: k, message: 'Cannot be negative.' });
  });
  if (out.length) return out;
  const r = raw as UnitInputs;
  if (!Number.isInteger(r.customers)) out.push({ field: 'customers', message: 'Customers come in whole numbers.' });
  if (r.customers === 0) out.push({ field: 'customers', message: 'Enter the customers that spending won: at least one.' });
  if (r.churn > 100) out.push({ field: 'churn', message: 'Churn is a percentage of customers: 100 at most.' });
  if (r.cap < 1 || r.cap > 120) out.push({ field: 'cap', message: 'Cap the lifetime between 1 and 120 months.' });
  return out;
}

/* ---------- Reading the result ---------- */

export function readUnit(u: UnitModel, currency: string): { reading: string; implication: string } {
  const money = (v: number) => fmtMoney(v, currency, 2);
  if (u.cac === null) return { reading: 'Enter the customers won to work out the cost of acquiring each one.', implication: '' };
  if (u.contribution <= 0) {
    return {
      reading: `Each customer costs ${money(u.cac)} to win, and serving a customer costs at least as much as the customer pays (${money(u.inputs.variableCost)} against ${money(u.inputs.revenue)} a month).`,
      implication: 'Every customer makes the loss bigger, however long they stay. Raise the price or cut the cost of serving a customer before spending anything more on winning customers.',
    };
  }
  const life = `${fmtNumber(u.lifetime, 1)} months${u.capped ? ' (the cap)' : ''}`;
  const reading = `Winning a customer costs ${money(u.cac)}. Each one contributes ${money(u.contribution)} a month and stays about ${life}, so a customer is worth ${money(u.ltv)} in contribution: ${fmtNumber(u.ratio ?? 0, 1)} times the cost of winning them. The acquisition cost is earned back in ${fmtNumber(u.payback ?? 0, 1)} months.`;
  const leaves = u.payback !== null && u.payback > u.lifetime;
  const implication = leaves
    ? 'On average a customer leaves before earning back what it cost to win them, so faster growth would deepen the losses. Lower the acquisition cost, keep customers longer or raise the contribution first.'
    : verdict(u) === 'thin'
      ? 'Customers repay what they cost to win, but leave little towards fixed costs and profit. Small changes in churn or acquisition cost would decide whether growth is worth paying for.'
      : 'On these figures, spending to win customers pays. The weakest input is usually churn: a new business rarely has a year of data on how long customers stay, so test how the ratio changes if churn is higher than hoped.';
  return { reading, implication };
}

/* ---------- The eight-part workings ---------- */

export function unitWorkings(u: UnitModel, currency: string): Record<'cac' | 'contribution' | 'lifetime' | 'ltv' | 'ratio' | 'payback', Working> {
  const i = u.inputs;
  const m = (v: number) => fmtMoney(v, currency, Number.isInteger(round(v, 2)) ? 0 : 2);
  const n = (v: number, d = 2) => fmtNumber(v, Number.isInteger(round(v, d)) ? 0 : d);
  const note = 'A standard start-up measure. It is not on the IB formula list, so treat it as enrichment.';
  return {
    cac: {
      given: [
        { label: 'Marketing and sales spending', value: m(i.spend) },
        { label: 'New customers won', value: n(i.customers, 0) },
      ],
      formula: 'Customer acquisition cost (CAC) = marketing and sales spending ÷ new customers won',
      substitution: `= ${m(i.spend)} ÷ ${n(i.customers, 0)}`,
      steps: u.cac === null ? ['No customers were won, so CAC cannot be calculated.'] : [`${n(i.spend)} ÷ ${n(i.customers, 0)} = ${fmtNumber(u.cac, 2)}`],
      answer: u.cac === null ? 'n/a' : fmtMoney(u.cac, currency, 2),
      value: u.cac,
      unit: `${currency.trim() || 'currency'} per new customer`,
      note,
    },
    contribution: {
      given: [
        { label: 'Average revenue per customer per month', value: m(i.revenue) },
        { label: 'Variable cost of serving a customer for a month', value: m(i.variableCost) },
      ],
      formula: 'Contribution per customer per month = revenue per customer − variable cost per customer',
      substitution: `= ${m(i.revenue)} − ${m(i.variableCost)}`,
      steps: [`${n(i.revenue)} − ${n(i.variableCost)} = ${fmtNumber(u.contribution, 2)}`, ...(u.margin === null ? [] : [`As a share of revenue: ${fmtNumber(u.contribution, 2)} ÷ ${n(i.revenue)} × 100 = ${fmtNumber(u.margin, 1)}%`])],
      answer: fmtMoney(u.contribution, currency, 2),
      value: u.contribution,
      unit: `${currency.trim() || 'currency'} per customer per month`,
      note: 'The IB’s contribution per unit (5.5), with one customer for one month as the unit.',
    },
    lifetime: {
      given: [
        { label: 'Monthly churn', value: `${n(i.churn)}%` },
        { label: 'Cap on lifetime', value: `${n(i.cap, 0)} months` },
      ],
      formula: 'Expected lifetime = 1 ÷ monthly churn rate (as a decimal), up to the cap',
      substitution: u.uncapped === null ? '= no churn, so the cap applies' : `= 1 ÷ ${fmtNumber(i.churn / 100, 4)}`,
      steps: u.uncapped === null ? [`Churn is zero, so the lifetime is the cap: ${n(i.cap, 0)} months`] : [`1 ÷ ${fmtNumber(i.churn / 100, 4)} = ${fmtNumber(u.uncapped, 2)} months`, ...(u.capped ? [`Above the cap, so ${n(i.cap, 0)} months is used`] : [])],
      answer: `${fmtNumber(u.lifetime, 1)} months`,
      value: u.lifetime,
      unit: 'months a customer stays, on average',
      note: 'Assumes the same share of customers leaves every month.',
    },
    ltv: {
      given: [
        { label: 'Contribution per customer per month', value: fmtMoney(u.contribution, currency, 2) },
        { label: 'Expected lifetime', value: `${fmtNumber(u.lifetime, 2)} months` },
      ],
      formula: 'Lifetime value (LTV) = contribution per customer per month × expected lifetime in months',
      substitution: `= ${fmtMoney(u.contribution, currency, 2)} × ${fmtNumber(u.lifetime, 2)}`,
      steps: [`${fmtNumber(u.contribution, 2)} × ${fmtNumber(u.lifetime, 2)} = ${fmtNumber(u.ltv, 2)}`],
      answer: fmtMoney(u.ltv, currency, 2),
      value: u.ltv,
      unit: `${currency.trim() || 'currency'} of contribution per customer`,
      note: `Measured on contribution, not revenue: revenue × lifetime would give ${fmtMoney(u.ltvRevenue, currency, 2)}, which ignores the cost of serving the customer. Undiscounted.`,
    },
    ratio: {
      given: [
        { label: 'Lifetime value', value: fmtMoney(u.ltv, currency, 2) },
        { label: 'Customer acquisition cost', value: u.cac === null ? 'n/a' : fmtMoney(u.cac, currency, 2) },
      ],
      formula: 'LTV to CAC ratio = lifetime value ÷ customer acquisition cost',
      substitution: u.cac === null ? '= not available' : `= ${fmtMoney(u.ltv, currency, 2)} ÷ ${fmtMoney(u.cac, currency, 2)}`,
      steps: u.ratio === null ? ['CAC is zero or not available, so the ratio cannot be calculated.'] : [`${fmtNumber(u.ltv, 2)} ÷ ${fmtNumber(u.cac ?? 0, 2)} = ${fmtNumber(u.ratio, 2)}`],
      answer: u.ratio === null ? 'n/a' : `${fmtNumber(u.ratio, 1)} to 1`,
      value: u.ratio,
      unit: 'contribution earned for each unit of currency spent winning a customer',
      note: 'Many investors quote 3 to 1 as a healthy ratio for a subscription business: a rule of thumb, not a law.',
    },
    payback: {
      given: [
        { label: 'Customer acquisition cost', value: u.cac === null ? 'n/a' : fmtMoney(u.cac, currency, 2) },
        { label: 'Contribution per customer per month', value: fmtMoney(u.contribution, currency, 2) },
      ],
      formula: 'CAC payback period = customer acquisition cost ÷ contribution per customer per month',
      substitution: u.cac === null ? '= not available' : `= ${fmtMoney(u.cac, currency, 2)} ÷ ${fmtMoney(u.contribution, currency, 2)}`,
      steps: u.payback === null ? ['Contribution is not positive, so the cost of winning a customer is never earned back.'] : [`${fmtNumber(u.cac ?? 0, 2)} ÷ ${fmtNumber(u.contribution, 2)} = ${fmtNumber(u.payback, 2)} months`],
      answer: u.payback === null ? 'Never' : `${fmtNumber(u.payback, 1)} months`,
      value: u.payback,
      unit: 'months',
      note: 'The payback idea of investment appraisal (3.8) applied to one customer. Under 12 months is a commonly quoted rule of thumb.',
    },
  };
}

/** Points for the customer payback chart: cumulative contribution from one customer, month by month. */
export function paybackSeries(u: UnitModel, months: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let m = 0; m <= months; m += 1) out.push([m, u.contribution * Math.min(m, u.lifetime)]);
  return out;
}
