/**
 * The lab's investment appraisal calculators (3.8): payback period and
 * average rate of return for SL and HL, net present value for HL only. They
 * share one project, entered year by year, so unequal cash flows are the
 * normal case. Every figure comes from src/lib/investment.ts, with NPV worked
 * from the guide's discount table (p. 66); the internal rate of return is
 * labelled enrichment wherever it appears.
 */
import { buildWorking } from '../finance';
import { fmtNumber, round } from '../format';
import { appraise, discountFactor, fmtPayback, irr, isRate, MAX_YEARS, npv, npvByFormula, projectInputs, RATES, signChange, type Project, type Rate } from '../investment';
import { cumulativeSvg } from '../investment-view';
import { PROJECT } from './business';
import { arrBarsSvg, discountedSvg, npvProfileSvg } from './charts';
import type { LabReport, Problem, Settings, SensitivityBlock } from './types';
import { money, money2, pct, signedPct } from './util';

export type InvestmentId = 'payback-period' | 'average-rate-of-return' | 'net-present-value';

export interface InvestmentState {
  label: string;
  capitalCost: number;
  returns: number[];
  rate: Rate;
}

export const INVESTMENT_DEFAULTS: InvestmentState = { label: PROJECT.label, capitalCost: PROJECT.capitalCost, returns: [...PROJECT.returns], rate: PROJECT.rate };

export interface InvestmentInput {
  label: string;
  capitalCost: number | null;
  returns: Array<number | null>;
  rate: number | null;
}

export function validateInvestment(i: InvestmentInput): Problem[] {
  const out: Problem[] = [];
  if (i.capitalCost === null || !Number.isFinite(i.capitalCost)) out.push({ field: 'cost', message: 'Enter a number for the capital cost.' });
  else if (!(i.capitalCost > 0)) out.push({ field: 'cost', message: 'The capital cost must be more than zero.' });
  if (i.returns.length < 1 || i.returns.length > MAX_YEARS) out.push({ field: 'cost', message: `Give between 1 and ${MAX_YEARS} years of returns; the guide’s discount table covers ${MAX_YEARS} years.` });
  i.returns.forEach((r, k) => {
    if (r === null || !Number.isFinite(r)) out.push({ field: `r${k + 1}`, message: `Enter a number for the net cash flow in year ${k + 1} (0 if there is none, negative if more goes out than comes in).` });
  });
  if (i.rate === null || !isRate(i.rate)) out.push({ field: 'rate', message: 'Choose one of the rates in the guide’s discount table.' });
  return out;
}

export function investmentState(i: InvestmentInput): InvestmentState {
  return {
    label: i.label.trim().replace(/\s+/g, ' ').slice(0, 60) || 'The project',
    capitalCost: i.capitalCost ?? INVESTMENT_DEFAULTS.capitalCost,
    returns: i.returns.slice(0, MAX_YEARS).map((r) => r ?? 0),
    rate: i.rate !== null && isRate(i.rate) ? i.rate : INVESTMENT_DEFAULTS.rate,
  };
}

const project = (st: InvestmentState): Project => ({ id: 'lab', label: st.label, capitalCost: st.capitalCost, returns: st.returns });

function given(st: InvestmentState, s: Settings, withRate: boolean) {
  return [
    { label: 'Project', value: st.label },
    { label: 'Capital cost (year 0)', value: money(st.capitalCost, s.currency) },
    ...st.returns.map((r, k) => ({ label: `Net cash flow, year ${k + 1}`, value: money(r, s.currency) })),
    ...(withRate ? [{ label: 'Discount rate', value: `${st.rate}%` }] : []),
  ];
}

function inputCsv(st: InvestmentState, s: Settings, withRate: boolean): Array<Array<string | number>> {
  return [
    ['Input', 'Project', st.label, ''],
    ['Input', 'Capital cost (year 0)', st.capitalCost, s.currency.trim()],
    ...st.returns.map((r, k) => ['Input', `Net cash flow, year ${k + 1}`, r, s.currency.trim()]),
    ...(withRate ? [['Input', 'Discount rate', st.rate, '%']] : []),
  ];
}

/** The estimates scaled up or down: the returns, or the capital cost. */
const scaled = (st: InvestmentState, returnsBy: number, costBy = 0): Project => ({ ...project(st), returns: st.returns.map((r) => round(r * (1 + returnsBy), 6)), capitalCost: round(st.capitalCost * (1 + costBy), 6) });

const ESTIMATES = [
  { label: 'Returns 20% lower', r: -0.2, c: 0 },
  { label: 'Returns 10% lower', r: -0.1, c: 0 },
  { label: 'As entered', r: 0, c: 0 },
  { label: 'Returns 10% higher', r: 0.1, c: 0 },
  { label: 'Capital cost 10% higher', r: 0, c: 0.1 },
  { label: 'Capital cost 10% lower', r: 0, c: -0.1 },
];

const WEIGH_THE_REST = 'Weigh what the figures leave out before deciding: the fit with the business’s objectives, how risky the estimates are, and the effect on staff, customers and the environment.';
const ESTIMATES_NOTE = ' Every method rests on estimates of future cash flows, which grow less reliable the further ahead they look.';

/* ------------------------------------------------------------------ */
/* Payback                                                             */
/* ------------------------------------------------------------------ */

export function buildPayback(st: InvestmentState, s: Settings): LabReport {
  const p = project(st);
  const ap = appraise(p, st.rate);
  const c = s.currency;
  const pb = ap.payback;
  const end = ap.cumulative[ap.cumulative.length - 1] ?? 0;
  const total = p.returns.reduce((a, b) => a + b, 0);
  const sens = ESTIMATES.map((e) => {
    const q = appraise(scaled(st, e.r, e.c), st.rate);
    return { e, q, row: { th: e.label, cells: [fmtPayback(q.payback), q.payback ? fmtNumber(q.payback.total, 2) : 'n/a'], base: e.r === 0 && e.c === 0 } };
  });
  const lower = sens[1]?.q.payback ?? null;
  const actions = [
    'Set a maximum payback for the business and compare the project with it, and with the other projects competing for the same money.',
    pb && pb.total > p.returns.length * 0.75 ? 'Payback comes late in the project’s life, leaving little time for profit after it: treat the estimates for the later years with extra care.' : 'Check the later years too: payback ignores everything after the cost is recovered.',
    'Reduce the cash at risk: lease rather than buy, or phase the investment so that later stages go ahead only if the first one pays.',
    'Use payback alongside the average rate of return and, at HL, net present value.',
  ];
  return {
    headline: { label: 'Payback period', value: fmtPayback(pb), note: pb ? `${fmtNumber(pb.total, 2)} years; recovered during year ${pb.inYear}` : 'The returns never add up to the capital cost.' },
    figures: [
      { label: 'In years, as a decimal', value: pb ? fmtNumber(pb.total, 2) : 'n/a' },
      { label: 'Cost recovered during', value: pb ? `year ${pb.inYear} of ${p.returns.length}` : 'not within its life' },
      { label: 'Cumulative net cash flow at the end', value: money(end, c), note: `year ${p.returns.length}` },
      { label: 'Total returns', value: money(total, c), note: `against a cost of ${money(st.capitalCost, c)}` },
    ],
    workings: [
      {
        title: 'Payback period',
        working: buildWorking('payback-period', projectInputs(p), c),
        interpretation: pb ? `The project repays its ${money(st.capitalCost, c)} cost in ${fmtPayback(pb)}.` : 'The project does not repay its cost within its life.',
        implication: pb ? `After that, the remaining returns, ${money(end, c)} by the end of year ${p.returns.length}, are what the project adds over its cost, before allowing for the time value of money.` : 'On these estimates the project loses money, whatever the method.',
      },
    ],
    chart: {
      svg: cumulativeSvg(ap, null, { currency: c, id: 'lab-payback-period-chart' }),
      caption: 'Cumulative net cash flow from year 0, when the cost is paid. The project pays back where the line crosses zero, marked with a filled dot.',
      table: {
        caption: 'Net and cumulative cash flow by year',
        head: ['Year', 'Net cash flow', 'Cumulative net cash flow'],
        rows: ap.cumulative.map((cum, t) => ({ th: `Year ${t}`, cells: [money(t === 0 ? -st.capitalCost : (p.returns[t - 1] ?? 0), c), money(cum, c)] })),
      },
    },
    sensitivity: {
      title: 'If the estimates are wrong',
      intro: 'The payback period when every year’s return, or the capital cost, is higher or lower than entered.',
      table: { caption: 'Payback period under different estimates', head: ['Estimate', 'Payback period', 'In years'], rows: sens.map((x) => x.row) },
      reading: pb ? `If every return came in 10% lower, payback would stretch to ${fmtPayback(lower)}${lower === null ? '' : ` (${signedPct(pb.total, lower.total)})`}. A project whose payback is close to the end of its life can fail to pay back at all on slightly worse figures.` : 'On the figures entered the project does not pay back; the table shows how much better the estimates would have to be.',
    },
    interpretation: {
      meaning: pb ? `The project repays its ${money(st.capitalCost, c)} cost in **${fmtPayback(pb)}**, ${pb.inYear === 1 ? 'within its first year' : `during year ${pb.inYear}`} of a ${p.returns.length}-year life. Payback measures speed and risk, not profit: it says how long the money is at risk, and nothing about the returns after that.` : `The returns, ${money(total, c)} in all, never add up to the ${money(st.capitalCost, c)} cost, so the project does not pay back within its life.`,
      compare: 'Compare the payback period with the maximum the business will accept, with the project’s working life (payback near the end of the life leaves little profit after it), and with other projects competing for the same money. A business short of cash will weigh payback heavily.',
      benchmarks: 'How quick a payback a business wants depends on its industry and its position. In a fast-changing market, such as technology, a business may want its money back within two or three years, before the product dates; one buying long-lived assets, such as buildings or heavy machinery, can accept longer. Higher interest rates and economic uncertainty usually push businesses towards shorter paybacks.',
      actions,
    },
    given: given(st, s, false),
    announce: pb ? `Payback period ${fmtPayback(pb)}.` : 'The project does not pay back within its life.',
    csv: [...inputCsv(st, s, false), ['Result', 'Payback period (years)', pb ? round(pb.total, 4) : 'none', 'years'], ['Result', 'Cumulative net cash flow at the end', round(end, 2), c.trim()], ...sens.map((x) => ['Sensitivity', x.e.label, x.q.payback ? round(x.q.payback.total, 4) : 'none', 'years'])],
  };
}

/* ------------------------------------------------------------------ */
/* Average rate of return                                              */
/* ------------------------------------------------------------------ */

export function buildArr(st: InvestmentState, s: Settings): LabReport {
  const p = project(st);
  const ap = appraise(p, st.rate);
  const c = s.currency;
  const n = p.returns.length;
  const total = p.returns.reduce((a, b) => a + b, 0);
  const profitTotal = total - st.capitalCost;
  const avg = profitTotal / Math.max(1, n);
  const v = ap.arr;
  const sens = ESTIMATES.map((e) => {
    const q = appraise(scaled(st, e.r, e.c), st.rate);
    return { e, q, row: { th: e.label, cells: [q.arr === null ? 'n/a' : `${fmtNumber(q.arr, 2)}%`, money(q.project.returns.reduce((a, b) => a + b, 0) - q.project.capitalCost, c)], base: e.r === 0 && e.c === 0 } };
  });
  const tenDown = sens[1]?.q.arr ?? null;
  return {
    headline: { label: 'Average rate of return', value: v === null ? 'n/a' : `${fmtNumber(v, 2)}%`, note: `a year, on a capital cost of ${money(st.capitalCost, c)}` },
    figures: [
      { label: 'Total returns', value: money(total, c), note: `over ${n} ${n === 1 ? 'year' : 'years'}` },
      { label: 'Total profit', value: money(profitTotal, c), note: 'total returns − capital cost' },
      { label: 'Average profit a year', value: money2(avg, c) },
      { label: 'Capital cost', value: money(st.capitalCost, c) },
    ],
    workings: [
      {
        title: 'Average rate of return',
        working: buildWorking('average-rate-of-return', projectInputs(p), c),
        interpretation: v === null ? 'The ARR cannot be calculated.' : `On average the project earns a profit of ${fmtNumber(v, 2)}% of its cost each year.`,
        implication: v !== null && v < 0 ? 'A negative ARR means the returns do not even repay the cost.' : 'Compare it with the business’s target return and with the cost of the money that would pay for the project.',
      },
    ],
    chart: {
      svg: arrBarsSvg({ returns: p.returns, capitalCost: st.capitalCost, currency: c, id: 'lab-average-rate-of-return-chart' }),
      caption: 'Each year’s net cash flow, with the average return (dashed) and the capital cost spread evenly over the years (dotted). The band between the two lines is the average profit a year that the ARR divides by the cost.',
      table: {
        caption: 'The returns behind the ARR',
        head: ['Year', 'Net cash flow'],
        rows: [...p.returns.map((r, k) => ({ th: `Year ${k + 1}`, cells: [money(r, c)] })), { th: 'Average return a year', cells: [money2(total / Math.max(1, n), c)], strong: true }, { th: 'Capital cost spread over the years', cells: [money2(st.capitalCost / Math.max(1, n), c)] }, { th: 'Average profit a year', cells: [money2(avg, c)], strong: true }],
      },
    },
    sensitivity: {
      title: 'If the estimates are wrong',
      intro: 'The average rate of return when every year’s return, or the capital cost, is higher or lower than entered.',
      table: { caption: 'ARR under different estimates', head: ['Estimate', 'ARR', 'Total profit'], rows: sens.map((x) => x.row) },
      reading: v === null ? '' : `If every return came in 10% lower, the ARR would fall to ${tenDown === null ? 'n/a' : `${fmtNumber(tenDown, 2)}%`}. The ARR is sensitive to the estimates because the profit it averages is the small difference between two large figures, total returns and the cost.`,
    },
    interpretation: {
      meaning: v === null ? 'The ARR cannot be calculated from these figures.' : `On average the project earns a profit of **${fmtNumber(v, 2)}%** of its cost each year: ${money2(avg, c)} a year on ${money(st.capitalCost, c)}. The ARR counts every year’s return equally, so ${c}1 in year ${n} weighs as much as ${c}1 in year 1.`,
      compare: 'Compare the ARR with the business’s target rate of return, with the interest rate on any loan that would pay for the project, with other projects competing for the money, and with the business’s return on capital employed: a project below the current ROCE would dilute the return on the business as a whole.',
      benchmarks: 'The return a business should require depends on risk and on the cost of money. A project in an unfamiliar market, or with uncertain sales, should promise more than a safe replacement of existing equipment, and when interest rates rise the bar rises with them. Because ARR ignores when the returns arrive, two projects with the same ARR can carry very different risks.' + ESTIMATES_NOTE,
      actions: [
        'Compare the ARR with a target the business sets in advance, not with a figure chosen after seeing the result.',
        'Look at timing as well: a project whose returns come late is riskier than its ARR suggests; payback and, at HL, NPV show it.',
        `Test the estimates: a 10% fall in every year’s return would take the ARR from ${v === null ? 'n/a' : `${fmtNumber(v, 2)}%`} to ${tenDown === null ? 'n/a' : `${fmtNumber(tenDown, 2)}%`}.`,
        WEIGH_THE_REST,
      ],
    },
    given: given(st, s, false),
    announce: v === null ? 'The ARR cannot be calculated.' : `Average rate of return ${fmtNumber(v, 2)}% a year.`,
    csv: [...inputCsv(st, s, false), ['Result', 'Average rate of return', v === null ? 'n/a' : round(v, 4), '%'], ['Result', 'Average profit a year', round(avg, 2), c.trim()], ...sens.map((x) => ['Sensitivity', x.e.label, x.q.arr === null ? 'n/a' : round(x.q.arr, 4), '%'])],
  };
}

/* ------------------------------------------------------------------ */
/* Net present value                                                   */
/* ------------------------------------------------------------------ */

export function buildNpv(st: InvestmentState, s: Settings): LabReport {
  const p = project(st);
  const ap = appraise(p, st.rate);
  const c = s.currency;
  const v = ap.npv;
  const sumPv = ap.presentValues.reduce((a, b) => a + b, 0);
  const rates = RATES.map((r) => ({ rate: r, npv: npv(p, r) ?? 0 }));
  const change = signChange(p);
  const rIrr = irr(p);
  const curve = Array.from({ length: 51 }, (_, k) => ({ rate: k * 0.5, npv: npvByFormula(p, k * 0.5) }));
  const sensitivity: SensitivityBlock = {
    title: 'The discount rate',
    intro: 'NPV at each rate in the guide’s discount table. The rate stands for what the money could earn elsewhere, plus an allowance for risk, so it is itself a judgement.',
    table: { caption: 'NPV at each of the guide’s rates', head: ['Discount rate', 'Net present value', 'On NPV alone'], rows: rates.map((x) => ({ th: `${x.rate}%`, cells: [money(Math.round(x.npv), c), x.npv > 0 ? 'Worth more than it costs' : x.npv < 0 ? 'Worth less than it costs' : 'Exactly covers its cost'], base: x.rate === st.rate })), numeric: [false, true, false] },
    reading: change
      ? `NPV is positive at ${change.below}% and negative at ${change.above}%, so the project’s return lies between the two: the decision depends on which rate the business requires.${rIrr !== null ? ` The internal rate of return, the rate at which NPV is exactly zero, is about ${fmtNumber(rIrr, 1)}% (enrichment: worked from the discount formula, not the table).` : ''}`
      : (v ?? 0) > 0
        ? `NPV is positive at every rate in the table${rIrr !== null ? `; it would reach zero only at about ${fmtNumber(rIrr, 1)}% (the internal rate of return, enrichment)` : ''}.`
        : 'NPV is negative even at the lowest rate in the table: on these estimates the project does not repay its cost in today’s money.',
    svg: npvProfileSvg({ points: rates, curve, selected: st.rate, irr: rIrr, currency: c, id: 'lab-net-present-value-profile' }),
  };
  return {
    headline: { label: `Net present value at ${st.rate}%`, value: v === null ? 'n/a' : money(Math.round(v * 100) / 100, c), note: v === null ? undefined : v >= 0 ? 'the returns are worth more today than the cost' : 'the returns are worth less today than the cost' },
    figures: [
      { label: 'Sum of present values', value: money2(sumPv, c) },
      { label: 'Original cost', value: money(st.capitalCost, c) },
      { label: 'NPV changes sign', value: change ? `between ${change.below}% and ${change.above}%` : (v ?? 0) > 0 ? 'not within the table' : 'negative at every rate' },
      { label: 'Internal rate of return', value: rIrr === null ? 'n/a' : `about ${fmtNumber(rIrr, 1)}%`, scope: 'enrichment', note: 'the rate at which NPV is zero' },
      { label: 'Payback, for comparison', value: fmtPayback(ap.payback) },
    ],
    workings: [
      {
        title: `Net present value at ${st.rate}%`,
        working: buildWorking('net-present-value', projectInputs(p, st.rate), c),
        interpretation: v === null ? 'NPV cannot be calculated.' : `At ${st.rate}%, the returns are worth ${money2(sumPv, c)} in today’s money, ${money2(Math.abs(v), c)} ${v >= 0 ? 'more' : 'less'} than the cost.`,
        implication: v === null ? '' : v >= 0 ? 'On NPV alone the project adds value at this rate; the decision still weighs risk and what the figures leave out.' : 'On NPV alone the project destroys value at this rate: the money would earn more elsewhere.',
      },
    ],
    chart: {
      svg: discountedSvg({ returns: p.returns, presentValues: ap.presentValues, rate: st.rate, currency: c, id: 'lab-net-present-value-chart' }),
      caption: `Each year’s net cash flow (grey) and its present value at ${st.rate}% (blue). The gap grows with time: money received later is worth less today.`,
      table: {
        caption: `Present values at ${st.rate}%`,
        head: ['Year', 'Net cash flow', 'Discount factor', 'Present value'],
        rows: [
          ...p.returns.map((r, k) => ({ th: `Year ${k + 1}`, cells: [money(r, c), discountFactor(st.rate, k + 1).toFixed(4), money2(ap.presentValues[k] ?? 0, c)] })),
          { th: 'Sum of present values', cells: ['', '', money2(sumPv, c)], strong: true },
          { th: 'Less the original cost', cells: ['', '', money(-st.capitalCost, c)] },
          { th: 'Net present value', cells: ['', '', v === null ? 'n/a' : money2(v, c)], strong: true },
        ],
      },
    },
    sensitivity,
    interpretation: {
      meaning: v === null ? 'NPV cannot be calculated from these figures.' : `At a discount rate of ${st.rate}%, the project’s returns are worth ${money2(sumPv, c)} in today’s money. Taking away the ${money(st.capitalCost, c)} cost leaves an NPV of **${money2(v, c)}**: ${v >= 0 ? 'on these estimates the project earns more than the rate the money could earn elsewhere' : 'on these estimates the money would earn more elsewhere at this rate'}.`,
      compare: `Compare the NPV with other projects’ NPVs at the same rate, and look at the rate itself: ${change ? `the NPV turns negative between ${change.below}% and ${change.above}%, so a business that requires ${change.above}% would reject a project that one requiring ${change.below}% would accept` : 'the table shows how much the answer depends on it'}. Compare the size of the NPV with the size of the investment: a small positive NPV on a large cost leaves little room for error.`,
      benchmarks: 'The right rate reflects what the money could earn elsewhere and the risk of the project, so it differs between businesses and over time: when interest rates rise, or when a project is riskier, a higher rate is used and NPV falls. The guide’s table gives five rates, and an examination uses the table; in practice a business chooses its own rate.' + ESTIMATES_NOTE,
      actions: [
        'Agree the discount rate before appraising, so that it is not chosen to fit the answer.',
        `Test the estimates as well as the rate: ${pct(10, 0)} lower returns would change the NPV by about ${money(Math.round(sumPv * 0.1), c)}.`,
        'Compare projects of different sizes with care: a larger NPV may simply come from a larger investment.',
        WEIGH_THE_REST,
      ],
    },
    given: given(st, s, true),
    announce: v === null ? 'NPV cannot be calculated.' : `Net present value at ${st.rate}%: ${money2(v, c)}.`,
    csv: [...inputCsv(st, s, true), ['Result', `Net present value at ${st.rate}%`, v === null ? 'n/a' : round(v, 2), c.trim()], ['Result', 'Sum of present values', round(sumPv, 2), c.trim()], ...rates.map((x) => ['Sensitivity', `NPV at ${x.rate}%`, round(x.npv, 2), c.trim()]), ['Result (enrichment)', 'Internal rate of return', rIrr === null ? 'n/a' : round(rIrr, 4), '%']],
  };
}

export const INVESTMENT_BUILDERS: Record<InvestmentId, (st: InvestmentState, s: Settings) => LabReport> = {
  'payback-period': buildPayback,
  'average-rate-of-return': buildArr,
  'net-present-value': buildNpv,
};
