/**
 * Paper 2 calculation practice. Each question is generated from a seed, with
 * new fictional figures, and worked by the platform's tested finance
 * functions (src/lib/finance.ts, ratios.ts, investment.ts and cashflow.ts),
 * so its answer and working always match the Finance Desk. A question's code
 * ("BEQ-48213") is its kind and its seed: the same code always gives the same
 * question.
 *
 * Every question carries its exact answer, the tolerance it is marked to, the
 * full working, and the typical wrong answers with the error behind each, so
 * the checker can say not only that an answer is wrong but why it is likely
 * to be wrong. The businesses are fictional and their figures simulated.
 * Mark allocations are the platform's, for practice; they are not IB marks.
 */
import { breakEvenExact, breakEvenUnits, buildWorking, contributionPerUnit, profit, targetPriceExact, targetProfitOutput, type Labels, type Working } from './finance';
import { RATIOS, TOLERANCE, derive, fmtRatio, ratioInputs, slips as ratioSlips, statementSlips, valueFromInputs, type RatioId, type Statement } from './ratios';
import { RATES, arr, discountFactor, fmtPayback, npv, payback, presentValues, projectInputs, totalReturns, type Project, type Rate } from './investment';
import { bracket } from './cashflow';
import { fmtMoney, fmtNumber, fmtPercent, round, roundUp } from './format';
import { rng, type Rng } from './random';

/* ------------------------------------------------------------------ */
/* Kinds and groups                                                    */
/* ------------------------------------------------------------------ */

export const GROUPS = {
  'break-even': { label: 'Break-even and contribution', syllabus: '5.5', level: 'SL/HL' },
  profitability: { label: 'Profitability ratios', syllabus: '3.5', level: 'SL/HL' },
  liquidity: { label: 'Liquidity ratios', syllabus: '3.5', level: 'SL/HL' },
  efficiency: { label: 'Efficiency ratios and gearing', syllabus: '3.6', level: 'HL' },
  investment: { label: 'Investment appraisal', syllabus: '3.8', level: 'SL/HL' },
  'cash-flow': { label: 'Cash flow and working capital', syllabus: '3.7', level: 'SL/HL' },
} as const;
export type GroupId = keyof typeof GROUPS;
export const GROUP_IDS = Object.keys(GROUPS) as GroupId[];

export type Level = 'SL/HL' | 'HL';
export type AnswerUnit = 'money' | 'money000' | 'units' | 'percent' | 'ratio' | 'times' | 'days' | 'years';

export interface Table {
  caption: string;
  /** Column headings after the row labels; empty for a two-column list of figures. */
  columns: string[];
  rows: Array<{ label: string; cells: string[]; total?: boolean; heading?: boolean }>;
}

export interface Slip {
  value: number;
  message: string;
  /** A near miss, such as the unrounded figure, rather than an error of method. */
  close?: boolean;
}

export interface PracticeQuestion {
  code: string;
  kind: KindId;
  seed: number;
  group: GroupId;
  level: Level;
  name: string;
  marks: number;
  business: string;
  intro: string;
  tables: Table[];
  prompt: string;
  unit: AnswerUnit;
  /** Shown beside the answer box: "$", "units", "%", "days". */
  suffix: string;
  prefix: string;
  /** An example of the form the answer can take, for the hint. */
  example: string;
  exact: number;
  answer: string;
  tolerance: number;
  toleranceText: string;
  working: Working;
  meaning: string;
  slips: Slip[];
}

type Made = Omit<PracticeQuestion, 'code' | 'kind' | 'seed' | 'group' | 'level' | 'name' | 'marks'>;

interface KindDef {
  code: string;
  name: string;
  group: GroupId;
  level: Level;
  marks: number;
  make: (r: Rng) => Made;
}

/* ------------------------------------------------------------------ */
/* Fictional businesses                                                */
/* ------------------------------------------------------------------ */

interface Maker {
  name: string;
  unit: string;
  units: string;
  /** Price band: lowest, highest and the step prices move in. */
  price: [number, number, number];
  /** Typical break-even output a year. */
  beq: [number, number];
}

/** Invented businesses: none is a real organization, and every figure is simulated. */
export const MAKERS: Maker[] = [
  { name: 'Tarnside Bicycles', unit: 'bicycle', units: 'bicycles', price: [280, 620, 10], beq: [300, 1500] },
  { name: 'Wrenfield Candles', unit: 'candle', units: 'candles', price: [14, 36, 1], beq: [2000, 12000] },
  { name: 'Mossgate Ceramics', unit: 'bowl', units: 'bowls', price: [18, 60, 2], beq: [1500, 9000] },
  { name: 'Hollin and Reed', unit: 'chair', units: 'chairs', price: [120, 340, 10], beq: [400, 2400] },
  { name: 'Saltreach Kayaks', unit: 'kayak', units: 'kayaks', price: [380, 900, 20], beq: [200, 1200] },
  { name: 'Copperbeck Coffee', unit: 'bag of coffee', units: 'bags of coffee', price: [8, 18, 0.5], beq: [6000, 30000] },
  { name: 'Larchwood Prints', unit: 'print', units: 'prints', price: [25, 90, 5], beq: [800, 5000] },
  { name: 'Fernhollow Soap', unit: 'bar of soap', units: 'bars of soap', price: [4, 9, 0.25], beq: [10000, 60000] },
  { name: 'Northgill Tents', unit: 'tent', units: 'tents', price: [90, 260, 10], beq: [600, 3000] },
  { name: 'Ashcombe Bakehouse', unit: 'celebration cake', units: 'celebration cakes', price: [16, 40, 1], beq: [1500, 8000] },
  { name: 'Tidemark Surfboards', unit: 'surfboard', units: 'surfboards', price: [300, 700, 20], beq: [200, 1100] },
  { name: 'Kittiwake Knitwear', unit: 'jumper', units: 'jumpers', price: [45, 120, 5], beq: [900, 5000] },
];

export const COMPANIES = [
  'Brackwater Foods',
  'Elmstead Logistics',
  'Pellow Engineering',
  'Quillon Hotels',
  'Rookhaven Retail',
  'Stourmere Pharmacy',
  'Thornby Motors',
  'Vellacott Textiles',
  'Wexcombe Printing',
  'Yarrow Health Foods',
];

const PROJECTS: Array<{ a: string; the: string }> = [
  { a: 'a new delivery van', the: 'the new delivery van' },
  { a: 'a second production line', the: 'the second production line' },
  { a: 'solar panels for its workshop', the: 'the solar panels' },
  { a: 'an online shop', the: 'the online shop' },
  { a: 'a new packing machine', the: 'the packing machine' },
  { a: 'a showroom extension', the: 'the showroom extension' },
  { a: 'an automated stock system', the: 'the automated stock system' },
  { a: 'a second workshop', the: 'the second workshop' },
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const LABELS = (m: Maker): Labels => ({ unit: m.unit, units: m.units, period: 'year' });
/** Money in dollars: whole dollars when exact, otherwise cents. */
export const usd = (v: number) => fmtMoney(v, '$', Number.isInteger(round(v, 2)) ? 0 : 2);
const usd2 = (v: number) => fmtMoney(v, '$', 2);
const n0 = (v: number) => fmtNumber(v, 0);
const n2 = (v: number) => fmtNumber(v, 2);
const plural = (n: number, one: string, many: string) => (Math.abs(n) === 1 ? one : many);
/** A figure in a statement, in $000, with brackets for a negative as the guide prints them. */
const k = (v: number) => bracket(v, 0);
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol + 1e-9;

/** Keeps only slips that are finite and distinct from the right answer and from each other. */
function tidySlips(list: Slip[], exact: number, tolerance: number): Slip[] {
  const out: Slip[] = [];
  for (const s of list) {
    if (!Number.isFinite(s.value)) continue;
    if (near(s.value, exact, Math.max(tolerance, 1e-6))) continue;
    if (out.some((o) => near(o.value, s.value, 1e-6))) continue;
    out.push(s);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Break-even and contribution (5.5)                                   */
/* ------------------------------------------------------------------ */

interface CostScenario {
  m: Maker;
  P: number;
  V: number;
  c: number;
  F: number;
  Q: number;
}

/** A price, a variable cost, fixed costs and a forecast that make sense together. */
function costScenario(r: Rng, opts: { wholeBreakEven?: boolean; fractional?: boolean } = {}): CostScenario {
  for (let tries = 0; tries < 200; tries++) {
    const m = r.pick(MAKERS);
    const [lo, hi, st] = m.price;
    const P = r.step(lo, hi, st);
    const share = r.step(0.35, 0.7, 0.05);
    const vStep = P < 20 ? 0.05 : 1;
    const V = round(Math.round((P * share) / vStep) * vStep, 2);
    const c = round(P - V, 2);
    if (!(c > 0) || V <= 0) continue;
    const target = r.int(m.beq[0], m.beq[1]);
    let F: number;
    if (opts.wholeBreakEven) {
      const beq = Math.round(target / 10) * 10;
      F = round(beq * c, 2);
      if (!Number.isInteger(F)) continue;
    } else {
      const unit = target * c > 200000 ? 1000 : 100;
      F = Math.max(unit, Math.round((target * c) / unit) * unit);
    }
    const exact = F / c;
    if (opts.fractional && Math.abs(exact - Math.round(exact)) < 0.01) continue;
    const beq = Math.ceil(round(exact, 9));
    const Q = Math.round((beq * r.step(1.12, 1.6, 0.02)) / 10) * 10;
    if (Q <= beq) continue;
    return { m, P, V, c, F, Q };
  }
  throw new Error('Could not draw a cost scenario');
}

const costIntro = (s: CostScenario, withForecast = true) =>
  `${s.m.name} makes and sells ${s.m.units}. Each ${s.m.unit} sells for ${usd(s.P)} and costs ${usd(s.V)} in variable costs to make. Fixed costs are ${usd(s.F)} a year.${withForecast ? ` The business forecasts sales of ${n0(s.Q)} ${s.m.units} next year.` : ''}`;

function costTable(s: CostScenario, rows: Array<'P' | 'V' | 'F' | 'Q'>): Table {
  const all = {
    P: { label: `Selling price per ${s.m.unit}`, cells: [usd(s.P)] },
    V: { label: `Variable cost per ${s.m.unit}`, cells: [usd(s.V)] },
    F: { label: 'Fixed costs per year', cells: [usd(s.F)] },
    Q: { label: 'Forecast sales next year', cells: [`${n0(s.Q)} ${s.m.units}`] },
  };
  return { caption: `${s.m.name}: costs and price (fictional, simulated figures)`, columns: [], rows: rows.map((x) => all[x]) };
}

/** A wrong answer in its exact form and rounded up, both pointing to the same error. */
const both = (value: number, message: string): Slip[] => [
  { value, message },
  { value: Math.ceil(round(value, 9)), message },
];

const KIND_LIST: Array<[string, KindDef]> = [
  [
    'contribution-per-unit',
    {
      code: 'CPU',
      name: 'Contribution per unit',
      group: 'break-even',
      level: 'SL/HL',
      marks: 1,
      make: (r) => {
        const s = costScenario(r);
        const w = buildWorking('contribution-per-unit', { price: s.P, variableCost: s.V }, '$', LABELS(s.m));
        const exact = contributionPerUnit(s.P, s.V);
        return {
          business: s.m.name,
          intro: costIntro(s),
          tables: [costTable(s, ['P', 'V', 'F', 'Q'])],
          prompt: `Calculate the contribution per ${s.m.unit}.`,
          unit: 'money',
          prefix: '$',
          suffix: `per ${s.m.unit}`,
          example: '12.50',
          exact,
          answer: usd2(exact),
          tolerance: 0.01,
          toleranceText: 'Accepted to the nearest cent.',
          working: w,
          meaning: `Each ${s.m.unit} sold adds ${usd2(exact)} towards the fixed costs of ${usd(s.F)}, and then to profit.`,
          slips: tidySlips(
            [
              { value: exact * s.Q, message: `That is total contribution on ${n0(s.Q)} ${s.m.units}. The question asks for the contribution of one ${s.m.unit}.` },
              { value: exact - s.F / s.Q, message: 'That also takes away fixed costs per unit, which gives profit per unit at the forecast output. Contribution leaves fixed costs out: it is what each unit adds towards them.' },
              { value: s.V - s.P, message: 'The subtraction is the wrong way round: contribution is the selling price minus the variable cost.' },
              { value: s.P + s.V, message: 'The two figures were added. Contribution is the selling price minus the variable cost per unit.' },
            ],
            exact,
            0.01,
          ),
        };
      },
    },
  ],
  [
    'total-contribution',
    {
      code: 'TCN',
      name: 'Total contribution',
      group: 'break-even',
      level: 'SL/HL',
      marks: 2,
      make: (r) => {
        const s = costScenario(r);
        const w = buildWorking('total-contribution', { price: s.P, variableCost: s.V, quantity: s.Q }, '$', LABELS(s.m));
        const exact = round((s.P - s.V) * s.Q, 2);
        return {
          business: s.m.name,
          intro: costIntro(s),
          tables: [costTable(s, ['P', 'V', 'F', 'Q'])],
          prompt: `Calculate the total contribution for ${s.m.name} if it sells the forecast ${n0(s.Q)} ${s.m.units}.`,
          unit: 'money',
          prefix: '$',
          suffix: '',
          example: '48,600',
          exact,
          answer: usd(exact),
          tolerance: 0.5,
          toleranceText: 'Accepted to the nearest dollar.',
          working: w,
          meaning: `${n0(s.Q)} ${s.m.units} contribute ${usd(exact)}: ${exact >= s.F ? `enough to cover the ${usd(s.F)} of fixed costs, leaving ${usd(exact - s.F)} profit` : `${usd(s.F - exact)} short of the fixed costs`}.`,
          slips: tidySlips(
            [
              { value: s.P - s.V, message: `That is the contribution of one ${s.m.unit}. Total contribution multiplies it by the number sold.` },
              { value: s.P * s.Q, message: 'That is total revenue. Total contribution takes the variable costs away first.' },
              { value: (s.P - s.V) * s.Q - s.F, message: 'That also takes away the fixed costs, which gives profit. Total contribution is before fixed costs.' },
            ],
            exact,
            0.5,
          ),
        };
      },
    },
  ],
  [
    'break-even-quantity',
    {
      code: 'BEQ',
      name: 'Break-even quantity',
      group: 'break-even',
      level: 'SL/HL',
      marks: 2,
      make: (r) => {
        const s = costScenario(r, { fractional: r.chance(0.8) });
        const w = buildWorking('break-even-quantity', { fixedCosts: s.F, price: s.P, variableCost: s.V }, '$', LABELS(s.m));
        const exactQ = breakEvenExact(s.F, s.P, s.V) as number;
        const whole = breakEvenUnits(s.F, s.P, s.V) as number;
        const fractional = Math.abs(exactQ - Math.round(exactQ)) > 1e-9;
        const lossBelow = Math.abs(profit(s.P, s.V, s.F, whole - 1));
        return {
          business: s.m.name,
          intro: costIntro(s),
          tables: [costTable(s, ['P', 'V', 'F', 'Q'])],
          prompt: `Calculate the break-even quantity for ${s.m.name} for the year.`,
          unit: 'units',
          prefix: '',
          suffix: s.m.units,
          example: '1,250',
          exact: whole,
          answer: `${n0(whole)} ${plural(whole, s.m.unit, s.m.units)}`,
          tolerance: 0,
          toleranceText: 'A whole number of units, rounded up.',
          working: w,
          meaning: `${n0(whole)} ${s.m.units} a year is the smallest output at which ${s.m.name} makes no loss.`,
          slips: tidySlips(
            [
              ...(fractional
                ? [
                    { value: exactQ, close: true, message: `That is the exact result of the division, ${n2(exactQ)}. Break-even output is a whole number of ${s.m.units}, rounded up to ${n0(whole)}.` },
                    { value: Math.floor(exactQ), message: `Rounded down: at ${n0(Math.floor(exactQ))} ${s.m.units} the business would still make a loss of ${usd2(lossBelow)}. Break-even output is always rounded up.` },
                  ]
                : []),
              ...both(s.F / s.P, 'The fixed costs were divided by the selling price. Divide by the contribution per unit: price minus variable cost.'),
              ...both(s.F / s.V, 'The fixed costs were divided by the variable cost per unit. Divide by the contribution per unit: price minus variable cost.'),
              { value: exactQ * s.P, message: 'That is break-even revenue, in dollars. The question asks for the quantity: a number of units.' },
            ],
            whole,
            0,
          ),
        };
      },
    },
  ],
  [
    'break-even-revenue',
    {
      code: 'BER',
      name: 'Break-even revenue',
      group: 'break-even',
      level: 'SL/HL',
      marks: 2,
      make: (r) => {
        const s = costScenario(r, { wholeBreakEven: true });
        const w = buildWorking('break-even-revenue', { fixedCosts: s.F, price: s.P, variableCost: s.V }, '$', LABELS(s.m));
        const beq = breakEvenUnits(s.F, s.P, s.V) as number;
        const exact = round(beq * s.P, 2);
        return {
          business: s.m.name,
          intro: costIntro(s),
          tables: [costTable(s, ['P', 'V', 'F', 'Q'])],
          prompt: `Calculate the break-even revenue for ${s.m.name} for the year.`,
          unit: 'money',
          prefix: '$',
          suffix: '',
          example: '180,000',
          exact,
          answer: usd(exact),
          tolerance: 0.5,
          toleranceText: 'Accepted to the nearest dollar.',
          working: w,
          meaning: `Sales of ${usd(exact)} a year, ${n0(beq)} ${s.m.units}, cover every cost: below that, ${s.m.name} makes a loss.`,
          slips: tidySlips(
            [
              { value: beq, message: `That is the break-even quantity in ${s.m.units}. Break-even revenue multiplies it by the selling price.` },
              { value: beq * s.c, message: 'The break-even quantity was multiplied by the contribution per unit, which only gives back the fixed costs. Multiply by the selling price.' },
              { value: beq * s.V, message: 'The break-even quantity was multiplied by the variable cost. Multiply by the selling price.' },
            ],
            exact,
            0.5,
          ),
        };
      },
    },
  ],
  [
    'margin-of-safety',
    {
      code: 'MOS',
      name: 'Margin of safety',
      group: 'break-even',
      level: 'SL/HL',
      marks: 2,
      make: (r) => {
        const s = costScenario(r, { fractional: r.chance(0.7) });
        const w = buildWorking('margin-of-safety', { fixedCosts: s.F, price: s.P, variableCost: s.V, quantity: s.Q }, '$', LABELS(s.m));
        const exactQ = breakEvenExact(s.F, s.P, s.V) as number;
        const beq = breakEvenUnits(s.F, s.P, s.V) as number;
        const mos = s.Q - beq;
        return {
          business: s.m.name,
          intro: costIntro(s),
          tables: [costTable(s, ['P', 'V', 'F', 'Q'])],
          prompt: `Calculate the margin of safety for ${s.m.name}, in ${s.m.units}, at the forecast level of sales.`,
          unit: 'units',
          prefix: '',
          suffix: s.m.units,
          example: '340',
          exact: mos,
          answer: `${n0(mos)} ${plural(mos, s.m.unit, s.m.units)}`,
          tolerance: 0,
          toleranceText: 'A whole number of units, from the break-even quantity rounded up.',
          working: w,
          meaning: `Sales could fall by ${n0(mos)} ${s.m.units}, ${fmtPercent((mos / s.Q) * 100)} of the forecast, before ${s.m.name} makes a loss.`,
          slips: tidySlips(
            [
              { value: s.Q - exactQ, close: true, message: `That uses the unrounded break-even quantity, ${n2(exactQ)}. Round break-even up to ${n0(beq)} ${s.m.units} first, then subtract.` },
              { value: beq - s.Q, message: 'The subtraction is the wrong way round: margin of safety is forecast sales minus break-even output.' },
              { value: beq, message: 'That is the break-even quantity. The margin of safety is how far forecast sales are above it.' },
              { value: (s.Q - beq) * s.P, message: `That is the margin of safety in dollars of revenue. The question asks for it in ${s.m.units}.` },
              { value: ((s.Q - beq) / s.Q) * 100, message: `That is the margin of safety as a percentage of forecast sales. The question asks for it in ${s.m.units}.` },
            ],
            mos,
            0,
          ),
        };
      },
    },
  ],
  [
    'profit',
    {
      code: 'PRO',
      name: 'Profit or loss',
      group: 'break-even',
      level: 'SL/HL',
      marks: 2,
      make: (r) => {
        const s = costScenario(r);
        const beq = breakEvenUnits(s.F, s.P, s.V) as number;
        const Q = r.chance(0.3) ? Math.max(10, Math.round((beq * r.step(0.6, 0.9, 0.05)) / 10) * 10) : s.Q;
        const w = buildWorking('profit', { price: s.P, variableCost: s.V, fixedCosts: s.F, quantity: Q }, '$', LABELS(s.m));
        const exact = round(profit(s.P, s.V, s.F, Q), 2);
        const loss = exact < 0;
        return {
          business: s.m.name,
          intro: `${s.m.name} makes and sells ${s.m.units}. Each ${s.m.unit} sells for ${usd(s.P)} and costs ${usd(s.V)} in variable costs to make. Fixed costs are ${usd(s.F)} a year.`,
          tables: [{ ...costTable({ ...s, Q }, ['P', 'V', 'F']), rows: [...costTable({ ...s, Q }, ['P', 'V', 'F']).rows, { label: 'Sales this year', cells: [`${n0(Q)} ${s.m.units}`] }] }],
          prompt: `Calculate the profit or loss for ${s.m.name} for the year. Show a loss as a negative figure.`,
          unit: 'money',
          prefix: '$',
          suffix: '',
          example: loss ? '−4,200' : '24,600',
          exact,
          answer: loss ? `${usd(exact)} (a loss)` : usd(exact),
          tolerance: 0.5,
          toleranceText: 'Accepted to the nearest dollar. A loss is a negative figure.',
          working: w,
          meaning: loss
            ? `At ${n0(Q)} ${s.m.units}, below break-even at ${n0(beq)}, ${s.m.name} makes a loss of ${usd(-exact)}.`
            : `At ${n0(Q)} ${s.m.units}, above break-even at ${n0(beq)}, ${s.m.name} makes a profit of ${usd(exact)}.`,
          slips: tidySlips(
            [
              { value: (s.P - s.V) * Q, message: 'That is total contribution. Profit also takes away the fixed costs.' },
              { value: s.P * Q - s.F, message: 'The variable costs were left out: profit is total revenue minus fixed costs and all the variable costs.' },
              { value: s.P * Q, message: 'That is total revenue. Profit takes away total costs: fixed costs plus variable costs.' },
              { value: -exact, message: 'The size is right but the sign is not: profit is total revenue minus total costs, so a loss is negative.' },
            ],
            exact,
            0.5,
          ),
        };
      },
    },
  ],
  [
    'target-profit-output',
    {
      code: 'TPO',
      name: 'Target profit output',
      group: 'break-even',
      level: 'SL/HL',
      marks: 2,
      make: (r) => {
        const s = costScenario(r);
        const T = Math.max(1000, Math.round((s.F * r.step(0.2, 0.8, 0.05)) / 1000) * 1000);
        const w = buildWorking('target-profit-output', { fixedCosts: s.F, targetProfit: T, price: s.P, variableCost: s.V }, '$', LABELS(s.m));
        const whole = targetProfitOutput(s.F, T, s.P, s.V) as number;
        const exactQ = (s.F + T) / s.c;
        const fractional = Math.abs(exactQ - Math.round(exactQ)) > 1e-9;
        return {
          business: s.m.name,
          intro: `${costIntro(s, false)} The owners want a profit of ${usd(T)} next year.`,
          tables: [{ ...costTable(s, ['P', 'V', 'F']), rows: [...costTable(s, ['P', 'V', 'F']).rows, { label: 'Target profit next year', cells: [usd(T)] }] }],
          prompt: `Calculate the number of ${s.m.units} ${s.m.name} must sell to make its target profit.`,
          unit: 'units',
          prefix: '',
          suffix: s.m.units,
          example: '2,400',
          exact: whole,
          answer: `${n0(whole)} ${plural(whole, s.m.unit, s.m.units)}`,
          tolerance: 0,
          toleranceText: 'A whole number of units, rounded up so that the target is reached.',
          working: w,
          meaning: `${s.m.name} must sell ${n0(whole)} ${s.m.units} to make ${usd(T)} profit: ${n0(whole - (breakEvenUnits(s.F, s.P, s.V) as number))} more than it needs to break even.`,
          slips: tidySlips(
            [
              ...(fractional
                ? [
                    { value: exactQ, close: true, message: `That is the exact result, ${n2(exactQ)}. The output must be a whole number of ${s.m.units}, rounded up to ${n0(whole)} so the target is reached.` },
                    { value: Math.floor(exactQ), message: 'Rounded down, which leaves the business just short of its target. Round a target output up.' },
                  ]
                : []),
              ...both(s.F / s.c, 'That is the break-even quantity. Add the target profit to the fixed costs before dividing by the contribution per unit.'),
              ...both(T / s.c, 'The fixed costs were left out. The contribution has to cover the fixed costs and the target profit together.'),
              ...both((s.F + T) / s.P, 'That divides by the selling price. Divide by the contribution per unit: price minus variable cost.'),
            ],
            whole,
            0,
          ),
        };
      },
    },
  ],
  [
    'target-price',
    {
      code: 'TPR',
      name: 'Target price',
      group: 'break-even',
      level: 'SL/HL',
      marks: 2,
      make: (r) => {
        const s = costScenario(r);
        const T = Math.max(1000, Math.round((s.F * r.step(0.2, 0.8, 0.05)) / 1000) * 1000);
        const w = buildWorking('target-price', { fixedCosts: s.F, targetProfit: T, variableCost: s.V, quantity: s.Q }, '$', LABELS(s.m));
        const exact = roundUp(targetPriceExact(s.F, T, s.V, s.Q) as number, 2);
        return {
          business: s.m.name,
          intro: `${s.m.name} makes ${s.m.units}. Each costs ${usd(s.V)} in variable costs, fixed costs are ${usd(s.F)} a year, and the business expects to sell ${n0(s.Q)} ${s.m.units} next year. The owners want a profit of ${usd(T)}.`,
          tables: [
            {
              caption: `${s.m.name}: costs and plans (fictional, simulated figures)`,
              columns: [],
              rows: [
                { label: `Variable cost per ${s.m.unit}`, cells: [usd(s.V)] },
                { label: 'Fixed costs per year', cells: [usd(s.F)] },
                { label: 'Expected sales next year', cells: [`${n0(s.Q)} ${s.m.units}`] },
                { label: 'Target profit next year', cells: [usd(T)] },
              ],
            },
          ],
          prompt: `Calculate the price ${s.m.name} must charge for each ${s.m.unit} to make its target profit.`,
          unit: 'money',
          prefix: '$',
          suffix: `per ${s.m.unit}`,
          example: '24.50',
          exact,
          answer: usd2(exact),
          tolerance: 0.01,
          toleranceText: 'Accepted to the nearest cent.',
          working: w,
          meaning: `At ${usd2(exact)} a ${s.m.unit}, selling ${n0(s.Q)} ${s.m.units} covers the fixed costs and earns the ${usd(T)} target, provided the higher price does not reduce sales.`,
          slips: tidySlips(
            [
              { value: (s.F + T) / s.Q, message: `The variable cost was left out. Each ${s.m.unit} must cover its own variable cost as well as its share of the fixed costs and the target.` },
              { value: s.F / s.Q + s.V, message: 'The target profit was left out: that is the price at which the business only breaks even.' },
              { value: T / s.Q + s.V, message: 'The fixed costs were left out. The price must cover them as well as the target profit.' },
            ],
            exact,
            0.01,
          ),
        };
      },
    },
  ],
];

/* ------------------------------------------------------------------ */
/* Ratios (3.5, 3.6): a statement that balances                        */
/* ------------------------------------------------------------------ */

interface Accounts {
  name: string;
  s: Statement;
  opening: number;
}

/** A year's statements in $000 that balance, with ratios in a believable range. */
export function drawAccounts(r: Rng): Accounts {
  for (let tries = 0; tries < 400; tries++) {
    const name = r.pick(COMPANIES);
    const salesRevenue = r.step(400, 9000, 10);
    const costOfSales = Math.round(salesRevenue * r.step(0.38, 0.7, 0.01));
    const gross = salesRevenue - costOfSales;
    const expenses = Math.round(gross * r.step(0.45, 0.85, 0.01));
    const pbit = gross - expenses;
    if (pbit < salesRevenue * 0.03) continue;
    const interest = Math.max(1, Math.round(pbit * r.step(0.04, 0.18, 0.01)));
    const pbt = pbit - interest;
    const tax = Math.round(pbt * r.step(0.18, 0.26, 0.01));
    const pfp = pbt - tax;
    const dividends = Math.round(pfp * r.step(0.2, 0.6, 0.05));
    const propertyPlantEquipment = Math.round(salesRevenue * r.step(0.45, 1.2, 0.05));
    const accumulatedDepreciation = Math.round(propertyPlantEquipment * r.step(0.15, 0.4, 0.05));
    const cash = Math.round(salesRevenue * r.step(0.01, 0.08, 0.005));
    const debtors = Math.round(salesRevenue * r.step(0.04, 0.16, 0.005));
    const stock = Math.round(costOfSales * r.step(0.06, 0.22, 0.005));
    const bankOverdraft = r.chance(0.4) ? Math.round(salesRevenue * r.step(0.005, 0.04, 0.005)) : 0;
    const tradeCreditors = Math.round(costOfSales * r.step(0.05, 0.16, 0.005));
    const otherShortTermLoans = r.chance(0.35) ? Math.round(salesRevenue * r.step(0.005, 0.03, 0.005)) : 0;
    const longTermBorrowings = Math.round(salesRevenue * r.step(0.08, 0.55, 0.01));
    const shareCapital = Math.round(salesRevenue * r.step(0.08, 0.35, 0.01));
    const nonCurrentAssets = propertyPlantEquipment - accumulatedDepreciation;
    const netAssets = nonCurrentAssets + cash + debtors + stock - bankOverdraft - tradeCreditors - otherShortTermLoans - longTermBorrowings;
    const retainedEarnings = netAssets - shareCapital;
    if (retainedEarnings < salesRevenue * 0.03) continue;
    const s: Statement = {
      salesRevenue,
      costOfSales,
      expenses,
      interest,
      tax,
      dividends,
      propertyPlantEquipment,
      accumulatedDepreciation,
      cash,
      debtors,
      stock,
      bankOverdraft,
      tradeCreditors,
      otherShortTermLoans,
      longTermBorrowings,
      shareCapital,
      retainedEarnings,
    };
    const d = derive(s);
    const cr = d.currentAssets / d.currentLiabilities;
    if (cr < 0.55 || cr > 3.2) continue;
    if (d.capitalEmployed <= 0) continue;
    const opening = Math.round(stock * r.step(0.75, 1.3, 0.01));
    if (opening <= 0 || stock <= 0) continue;
    return { name, s, opening };
  }
  throw new Error('Could not draw a set of accounts');
}

function plTable(a: Accounts): Table {
  const d = derive(a.s);
  return {
    caption: `${a.name}: statement of profit or loss for the year ended 31 December 2026 ($000)`,
    columns: [],
    rows: [
      { label: 'Sales revenue', cells: [k(a.s.salesRevenue)] },
      { label: 'Cost of sales', cells: [k(-a.s.costOfSales)] },
      { label: 'Gross profit', cells: [k(d.grossProfit)], total: true },
      { label: 'Expenses', cells: [k(-a.s.expenses)] },
      { label: 'Profit before interest and tax', cells: [k(d.pbit)], total: true },
      { label: 'Interest', cells: [k(-a.s.interest)] },
      { label: 'Profit before tax', cells: [k(d.profitBeforeTax)], total: true },
      { label: 'Tax', cells: [k(-a.s.tax)] },
      { label: 'Profit for the period', cells: [k(d.profitForPeriod)], total: true },
    ],
  };
}

function currentTable(a: Accounts): Table {
  const d = derive(a.s);
  const rows: Table['rows'] = [
    { label: 'Cash', cells: [k(a.s.cash)] },
    { label: 'Debtors', cells: [k(a.s.debtors)] },
    { label: 'Stock', cells: [k(a.s.stock)] },
    { label: 'Current assets', cells: [k(d.currentAssets)], total: true },
    ...(a.s.bankOverdraft ? [{ label: 'Bank overdraft', cells: [k(a.s.bankOverdraft)] }] : []),
    { label: 'Trade creditors', cells: [k(a.s.tradeCreditors)] },
    ...(a.s.otherShortTermLoans ? [{ label: 'Other short-term loans', cells: [k(a.s.otherShortTermLoans)] }] : []),
    { label: 'Current liabilities', cells: [k(d.currentLiabilities)], total: true },
  ];
  return { caption: `${a.name}: extract from the statement of financial position at 31 December 2026 ($000)`, columns: [], rows };
}

function positionTable(a: Accounts): Table {
  const d = derive(a.s);
  return {
    caption: `${a.name}: statement of financial position at 31 December 2026, summarized ($000)`,
    columns: [],
    rows: [
      { label: 'Non-current assets', cells: [k(d.nonCurrentAssets)] },
      { label: 'Current assets', cells: [k(d.currentAssets)] },
      { label: 'Total assets', cells: [k(d.totalAssets)], total: true },
      { label: 'Current liabilities', cells: [k(d.currentLiabilities)] },
      { label: 'Non-current liabilities: long-term borrowings', cells: [k(d.nonCurrentLiabilities)] },
      { label: 'Net assets', cells: [k(d.netAssets)], total: true },
      { label: 'Share capital', cells: [k(a.s.shareCapital)] },
      { label: 'Retained earnings', cells: [k(a.s.retainedEarnings)] },
      { label: 'Total equity', cells: [k(d.totalEquity)], total: true },
    ],
  };
}

const RATIO_TEXT: Record<RatioId, (v: string, a: Accounts) => string> = {
  'gross-profit-margin': (v) => `${v} of every dollar of sales is left after the cost of sales.`,
  'profit-margin': (v) => `${v} of every dollar of sales is left as profit before interest and tax.`,
  roce: (v) => `The business earns ${v} profit before interest and tax on the long-term finance invested in it.`,
  'current-ratio': (v) => `Current assets cover current liabilities ${v} times.`,
  'acid-test-ratio': (v) => `Leaving out stock, liquid assets cover current liabilities ${v} times.`,
  'stock-turnover-times': (v) => `The business uses and replaces its average stock ${v} in the year.`,
  'stock-turnover-days': (v) => `Stock is held for ${v} on average before it is used or sold.`,
  'debtor-days': (v) => `Customers take ${v} on average to pay.`,
  'creditor-days': (v) => `The business takes ${v} on average to pay its suppliers.`,
  'gearing-ratio': (v) => `${v} of the long-term finance is borrowed rather than provided by the owners.`,
};

const RATIO_ASK: Record<RatioId, (name: string) => string> = {
  'gross-profit-margin': (n) => `the gross profit margin of ${n} for 2026`,
  'profit-margin': (n) => `the profit margin of ${n} for 2026`,
  roce: (n) => `the return on capital employed (ROCE) of ${n} for 2026`,
  'current-ratio': (n) => `the current ratio of ${n} at 31 December 2026`,
  'acid-test-ratio': (n) => `the acid test (quick) ratio of ${n} at 31 December 2026`,
  'stock-turnover-times': (n) => `the stock turnover of ${n} for 2026, as a number of times`,
  'stock-turnover-days': (n) => `the stock turnover of ${n} for 2026, in days`,
  'debtor-days': (n) => `the debtor days of ${n} for 2026`,
  'creditor-days': (n) => `the creditor days of ${n} for 2026`,
  'gearing-ratio': (n) => `the gearing ratio of ${n} at 31 December 2026`,
};

function ratioKind(id: RatioId, code: string, tables: (a: Accounts) => Table[], intro: (a: Accounts) => string): [string, KindDef] {
  const def = RATIOS[id];
  return [
    id,
    {
      code,
      name: def.name,
      group: def.group,
      level: def.level,
      marks: 2,
      make: (r) => {
        const a = drawAccounts(r);
        const inputs = ratioInputs(id, a.s, a.opening);
        const exact = valueFromInputs(id, inputs) as number;
        const w = buildWorking(id, inputs, '$000');
        const shown = fmtRatio(exact, def.kind);
        const slipList = [...ratioSlips(id, inputs), ...statementSlips(id, a.s)]
          .filter((x): x is Slip => x.value !== null)
          .map((x) => ({ value: x.value, message: x.message }));
        return {
          business: a.name,
          intro: intro(a),
          tables: tables(a),
          prompt: `Calculate ${RATIO_ASK[id](a.name)}.`,
          unit: def.kind === 'percent' ? 'percent' : def.kind === 'ratio' ? 'ratio' : def.kind === 'times' ? 'times' : 'days',
          prefix: '',
          suffix: def.kind === 'percent' ? '%' : def.kind === 'ratio' ? ': 1' : def.kind === 'times' ? 'times' : 'days',
          example: def.kind === 'percent' ? '18.25' : def.kind === 'ratio' ? '1.45' : def.kind === 'times' ? '6.10' : '42.50',
          exact,
          answer: def.kind === 'ratio' ? `${shown} : 1` : shown,
          tolerance: TOLERANCE,
          toleranceText: 'Accepted within 0.05 of the exact value, so rounding to one or two decimal places is fine.',
          working: w,
          meaning: RATIO_TEXT[id](shown, a),
          slips: tidySlips(slipList, exact, TOLERANCE),
        };
      },
    },
  ];
}

const accountsIntro = (a: Accounts) => `${a.name} is a private limited company. The figures below are from its accounts for 2026, in thousands of dollars.`;

KIND_LIST.push(
  ratioKind('gross-profit-margin', 'GPM', (a) => [plTable(a)], accountsIntro),
  ratioKind('profit-margin', 'PMG', (a) => [plTable(a)], accountsIntro),
  ratioKind('roce', 'ROC', (a) => [plTable(a), positionTable(a)], accountsIntro),
  ratioKind('current-ratio', 'CUR', (a) => [currentTable(a)], accountsIntro),
  ratioKind('acid-test-ratio', 'ATR', (a) => [currentTable(a)], accountsIntro),
  ratioKind(
    'stock-turnover-times',
    'STT',
    (a) => [
      {
        caption: `${a.name}: figures for 2026 ($000)`,
        columns: [],
        rows: [
          { label: 'Sales revenue', cells: [k(a.s.salesRevenue)] },
          { label: 'Cost of sales', cells: [k(a.s.costOfSales)] },
          { label: 'Stock at 1 January 2026', cells: [k(a.opening)] },
          { label: 'Stock at 31 December 2026', cells: [k(a.s.stock)] },
        ],
      },
    ],
    accountsIntro,
  ),
  ratioKind(
    'stock-turnover-days',
    'STD',
    (a) => [
      {
        caption: `${a.name}: figures for 2026 ($000)`,
        columns: [],
        rows: [
          { label: 'Sales revenue', cells: [k(a.s.salesRevenue)] },
          { label: 'Cost of sales', cells: [k(a.s.costOfSales)] },
          { label: 'Stock at 1 January 2026', cells: [k(a.opening)] },
          { label: 'Stock at 31 December 2026', cells: [k(a.s.stock)] },
        ],
      },
    ],
    accountsIntro,
  ),
  ratioKind(
    'debtor-days',
    'DDY',
    (a) => [
      {
        caption: `${a.name}: figures for 2026 ($000)`,
        columns: [],
        rows: [
          { label: 'Sales revenue', cells: [k(a.s.salesRevenue)] },
          { label: 'Cost of sales', cells: [k(a.s.costOfSales)] },
          { label: 'Debtors at 31 December 2026', cells: [k(a.s.debtors)] },
          { label: 'Trade creditors at 31 December 2026', cells: [k(a.s.tradeCreditors)] },
        ],
      },
    ],
    accountsIntro,
  ),
  ratioKind(
    'creditor-days',
    'CDY',
    (a) => [
      {
        caption: `${a.name}: figures for 2026 ($000)`,
        columns: [],
        rows: [
          { label: 'Sales revenue', cells: [k(a.s.salesRevenue)] },
          { label: 'Cost of sales', cells: [k(a.s.costOfSales)] },
          { label: 'Debtors at 31 December 2026', cells: [k(a.s.debtors)] },
          { label: 'Trade creditors at 31 December 2026', cells: [k(a.s.tradeCreditors)] },
        ],
      },
    ],
    accountsIntro,
  ),
  ratioKind('gearing-ratio', 'GEA', (a) => [positionTable(a)], accountsIntro),
);

/* ------------------------------------------------------------------ */
/* Investment appraisal (3.8)                                          */
/* ------------------------------------------------------------------ */

interface Proposal {
  m: Maker;
  /** The project with "a" and with "the". */
  what: { a: string; the: string };
  p: Project;
  rate: Rate;
}

/** A project whose cost is recovered within its life and whose returns vary from year to year. */
export function drawProject(r: Rng): Proposal {
  for (let tries = 0; tries < 300; tries++) {
    const m = r.pick(MAKERS);
    const what = r.pick(PROJECTS);
    const cost = r.step(40000, 600000, 5000);
    const years = r.int(3, 6);
    const base = (cost * r.step(1.15, 1.7, 0.05)) / years;
    const unit = cost >= 200000 ? 1000 : 500;
    const returns = Array.from({ length: years }, () => Math.round((base * r.step(0.7, 1.35, 0.05)) / unit) * unit);
    if (returns.some((x) => x <= 0)) continue;
    const p: Project = { id: 'project', label: what.the, capitalCost: cost, returns };
    const pb = payback(p);
    if (!pb || pb.inYear >= years || pb.total < 1) continue;
    if (totalReturns(p) < cost * 1.12) continue;
    const rate = r.pick([6, 8, 8, 10, 10, 4, 20].filter((x): x is Rate => (RATES as readonly number[]).includes(x)));
    return { m, what, p, rate };
  }
  throw new Error('Could not draw a project');
}

function projectTable(pr: Proposal, withFactors: boolean): Table {
  const years = pr.p.returns.map((_, i) => `Year ${i + 1}`);
  const rows: Table['rows'] = [{ label: 'Net cash flow ($)', cells: pr.p.returns.map((x) => n0(x)) }];
  if (withFactors) rows.push({ label: `Discount factor at ${pr.rate}%`, cells: pr.p.returns.map((_, i) => discountFactor(pr.rate, i + 1).toFixed(4)) });
  return { caption: `${pr.m.name}: forecast net cash flows from ${pr.what.the} (fictional, simulated figures)`, columns: ['', ...years], rows };
}

const projectIntro = (pr: Proposal) =>
  `${pr.m.name} is considering ${pr.what.a}, at a capital cost of ${usd(pr.p.capitalCost)} paid now. It expects these net cash flows over the ${pr.p.returns.length} years of its life.`;

KIND_LIST.push(
  [
    'payback-period',
    {
      code: 'PBK',
      name: 'Payback period',
      group: 'investment',
      level: 'SL/HL',
      marks: 2,
      make: (r) => {
        const pr = drawProject(r);
        const pb = payback(pr.p);
        if (!pb) throw new Error('No payback');
        const w = buildWorking('payback-period', projectInputs(pr.p), '$');
        const avg = totalReturns(pr.p) / pr.p.returns.length;
        return {
          business: pr.m.name,
          intro: projectIntro(pr),
          tables: [projectTable(pr, false)],
          prompt: `Calculate the payback period for ${pr.what.the}.`,
          unit: 'years',
          prefix: '',
          suffix: 'years',
          example: '2.5, or 2 years 6 months',
          exact: pb.total,
          answer: `${fmtPayback(pb)} (${n2(pb.total)} years)`,
          tolerance: 1 / 12,
          toleranceText: 'Accepted within one month of the exact payback period, so years and whole months are fine.',
          working: w,
          meaning: `${pr.m.name} recovers the ${usd(pr.p.capitalCost)} cost of ${pr.what.the} after ${fmtPayback(pb)}, assuming each year's cash arrives evenly.`,
          slips: tidySlips(
            [
              { value: pb.inYear, message: `That counts the whole of year ${pb.inYear}. The cost is recovered part-way through it: work out the fraction of the year's cash flow still needed, and turn it into months.` },
              { value: pb.years, message: `That stops at the last full year. Add the part of year ${pb.inYear} needed to recover what is left.` },
              { value: pr.p.capitalCost / avg, message: 'That divides the cost by the average annual cash flow, which only works when every year’s cash flow is the same. Use the cumulative cash flow instead.' },
            ],
            pb.total,
            1 / 12,
          ),
        };
      },
    },
  ],
  [
    'average-rate-of-return',
    {
      code: 'ARR',
      name: 'Average rate of return (ARR)',
      group: 'investment',
      level: 'SL/HL',
      marks: 2,
      make: (r) => {
        const pr = drawProject(r);
        const w = buildWorking('average-rate-of-return', projectInputs(pr.p), '$');
        const exact = arr(pr.p) as number;
        const n = pr.p.returns.length;
        const tr = totalReturns(pr.p);
        const C = pr.p.capitalCost;
        return {
          business: pr.m.name,
          intro: projectIntro(pr),
          tables: [projectTable(pr, false)],
          prompt: `Calculate the average rate of return (ARR) for ${pr.what.the}.`,
          unit: 'percent',
          prefix: '',
          suffix: '%',
          example: '14.25',
          exact,
          answer: `${n2(exact)}%`,
          tolerance: 0.051,
          toleranceText: 'Accepted within 0.05 percentage points of the exact value.',
          working: w,
          meaning: `On average, ${pr.what.the} returns ${n2(exact)}% of its capital cost each year, after recovering the cost itself.`,
          slips: tidySlips(
            [
              { value: ((tr - C) / C) * 100, message: `That is total profit over the whole life as a share of the cost. Divide the total profit by the ${n} years of use first.` },
              { value: (tr / n / C) * 100, message: 'The capital cost was not taken away from the total returns. ARR uses the average profit: total returns minus the capital cost, divided by the years of use.' },
              { value: ((tr - C) / n / (C / 2)) * 100, message: 'That divides by half the capital cost, the average investment. The guide’s formula divides the average profit by the capital cost.' },
              { value: (tr - C) / n / C, message: 'That is the fraction before multiplying by 100. ARR is a percentage.' },
            ],
            exact,
            0.051,
          ),
        };
      },
    },
  ],
  [
    'net-present-value',
    {
      code: 'NPV',
      name: 'Net present value (NPV)',
      group: 'investment',
      level: 'HL',
      marks: 3,
      make: (r) => {
        const pr = drawProject(r);
        const w = buildWorking('net-present-value', { ...projectInputs(pr.p), rate: pr.rate }, '$');
        const exact = round(npv(pr.p, pr.rate) as number, 2);
        const pvs = presentValues(pr.p, pr.rate);
        const sumPv = pvs.reduce((s, x) => s + x, 0);
        const early = pr.p.returns.reduce((s, x, i) => s + x * (i === 0 ? 1 : discountFactor(pr.rate, i)), 0);
        return {
          business: pr.m.name,
          intro: `${projectIntro(pr)} The business uses a discount rate of ${pr.rate}%; the discount factors are from the guide's table.`,
          tables: [projectTable(pr, true)],
          prompt: `Calculate the net present value (NPV) of ${pr.what.the} at a discount rate of ${pr.rate}%.`,
          unit: 'money',
          prefix: '$',
          suffix: '',
          example: '12,345.60',
          exact,
          answer: usd2(exact),
          tolerance: 5,
          toleranceText: 'Accepted within $5 of the exact value, to allow for rounding each present value.',
          working: w,
          meaning:
            exact >= 0
              ? `At ${pr.rate}%, the cash flows are worth ${usd(Math.round(exact))} more, in today's money, than the ${usd(pr.p.capitalCost)} they cost.`
              : `At ${pr.rate}%, the cash flows are worth ${usd(Math.round(-exact))} less, in today's money, than the ${usd(pr.p.capitalCost)} they cost.`,
          slips: tidySlips(
            [
              { value: sumPv, message: 'That is the total present value of the cash flows. Take away the capital cost to find the NPV.' },
              { value: totalReturns(pr.p) - pr.p.capitalCost, message: 'The cash flows were not discounted. Multiply each year’s cash flow by its discount factor first.' },
              { value: early - pr.p.capitalCost, message: 'Each year was discounted with the factor for the year before, starting year 1 at 1. Year 1 uses the year 1 factor.' },
            ],
            exact,
            5,
          ),
        };
      },
    },
  ],
);

/* ------------------------------------------------------------------ */
/* Cash flow and working capital (3.7)                                 */
/* ------------------------------------------------------------------ */

KIND_LIST.push(
  [
    'closing-balance',
    {
      code: 'CFB',
      name: 'Closing balance in a cash flow forecast',
      group: 'cash-flow',
      level: 'SL/HL',
      marks: 2,
      make: (r) => {
        for (let tries = 0; tries < 200; tries++) {
          const m = r.pick(MAKERS);
          const start = r.int(0, 9);
          const months = [0, 1, 2].map((i) => MONTHS[(start + i) % 12] as string);
          const opening = r.step(-4000, 18000, 500);
          const sales = months.map(() => r.step(9000, 38000, 500));
          const otherAt = r.int(0, 2);
          const otherLabel = r.pick(['Sale of old equipment', 'Owner investment', 'Grant received']);
          const other = months.map((_, i) => (i === otherAt ? r.step(1000, 6000, 500) : 0));
          const materials = sales.map((x) => Math.round((x * r.step(0.3, 0.55, 0.05)) / 100) * 100);
          const wages = r.step(5000, 12000, 500);
          const rent = r.step(1500, 4000, 250);
          const marketing = months.map(() => r.step(500, 3500, 250));
          const ins = months.map((_, i) => (sales[i] as number) + (other[i] as number));
          const outs = months.map((_, i) => (materials[i] as number) + wages + rent + (marketing[i] as number));
          const asked: number = r.chance(0.65) ? 2 : 1;
          const closings: number[] = [];
          let bal = opening;
          for (let i = 0; i < 3; i++) {
            bal = round(bal + (ins[i] as number) - (outs[i] as number), 2);
            closings.push(bal);
          }
          const nets = ins.map((x, i) => x - (outs[i] as number));
          if (!nets.some((x) => x < 0) && r.chance(0.6)) continue;
          const exact = closings[asked] as number;
          const prev = asked === 0 ? opening : (closings[asked - 1] as number);
          const monthWorkings = months.slice(0, asked + 1).map((_, i) => buildWorking('closing-balance', { opening: i === 0 ? opening : (closings[i - 1] as number), inflows: ins[i] as number, outflows: outs[i] as number }, '$'));
          const steps = monthWorkings.flatMap((mw, i) => [`${months[i]}: ${mw.steps.join('; ')}`]);
          const w: Working = {
            given: [
              { label: `Opening balance, ${months[0]}`, value: usd(opening) },
              ...months.slice(0, asked + 1).flatMap((mo, i) => [
                { label: `Total cash inflows, ${mo}`, value: usd(ins[i] as number) },
                { label: `Total cash outflows, ${mo}`, value: usd(outs[i] as number) },
              ]),
            ],
            formula: 'Closing balance = opening balance + total cash inflows − total cash outflows; each month opens with the previous month’s closing balance',
            substitution: `${months[asked]}: = ${usd(prev)} + ${usd(ins[asked] as number)} − ${usd(outs[asked] as number)}`,
            steps,
            answer: usd2(exact),
            value: exact,
            unit: `dollars at the end of ${months[asked]}`,
            note: exact < 0 ? `A negative closing balance is written in brackets in a forecast: (${n0(-exact)}). It means an overdraft.` : undefined,
          };
          const table: Table = {
            caption: `${m.name}: cash flow forecast ($, fictional, simulated figures)`,
            columns: months,
            rows: [
              { label: 'Opening balance', cells: [bracket(opening, 0), '', ''] },
              { label: 'Cash inflows', cells: ['', '', ''], heading: true },
              { label: 'Cash sales', cells: sales.map((x) => bracket(x, 0)) },
              { label: otherLabel, cells: other.map((x) => (x ? bracket(x, 0) : '0')) },
              { label: 'Cash outflows', cells: ['', '', ''], heading: true },
              { label: 'Raw materials', cells: materials.map((x) => bracket(x, 0)) },
              { label: 'Wages', cells: months.map(() => bracket(wages, 0)) },
              { label: 'Rent', cells: months.map(() => bracket(rent, 0)) },
              { label: 'Marketing', cells: marketing.map((x) => bracket(x, 0)) },
            ],
          };
          const monthNet = nets[asked] as number;
          return {
            business: m.name,
            intro: `${m.name} has drawn up a cash flow forecast for ${months[0]} to ${months[2]}, in the guide's layout. Only the opening balance for ${months[0]} is given: work out each month's totals and balances.`,
            tables: [table],
            prompt: `Calculate the closing balance for ${m.name} at the end of ${months[asked]}. Show a negative balance as a negative figure.`,
            unit: 'money',
            prefix: '$',
            suffix: '',
            example: exact < 0 ? '−2,500' : '6,500',
            exact,
            answer: exact < 0 ? `${usd(exact)}, shown as (${n0(-exact)}) in the forecast` : usd(exact),
            tolerance: 0.5,
            toleranceText: 'Accepted to the nearest dollar. A negative balance is accepted as −2,500 or (2,500).',
            working: w,
            meaning:
              exact < 0
                ? `${m.name} would be ${usd(-exact)} overdrawn at the end of ${months[asked]}: it needs an overdraft or a change to the timing of its payments.`
                : `${m.name} would have ${usd(exact)} in the bank at the end of ${months[asked]}.`,
            slips: tidySlips(
              [
                { value: monthNet, message: `That is ${months[asked]}'s net cash flow. Add it to the opening balance for ${months[asked]}.` },
                ...(asked > 0 ? [{ value: prev, message: `That is the closing balance for ${months[asked - 1]}, which is ${months[asked]}'s opening balance. Carry on one more month.` }] : []),
                ...(asked > 0 ? [{ value: opening + monthNet, message: `That adds ${months[asked]}'s net cash flow to ${months[0]}'s opening balance. Each month opens with the previous month's closing balance.` }] : []),
                { value: opening + ins.slice(0, asked + 1).reduce((s, x) => s + x, 0) + outs.slice(0, asked + 1).reduce((s, x) => s + x, 0), message: 'The outflows were added instead of taken away.' },
                { value: -exact, message: 'The size is right but the sign is not: a balance below zero is negative, written in brackets in a forecast.' },
              ],
              exact,
              0.5,
            ),
          };
        }
        throw new Error('Could not draw a cash flow forecast');
      },
    },
  ],
  [
    'working-capital',
    {
      code: 'WCP',
      name: 'Working capital',
      group: 'cash-flow',
      level: 'SL/HL',
      marks: 2,
      make: (r) => {
        const a = drawAccounts(r);
        const d = derive(a.s);
        const exact = d.currentAssets - d.currentLiabilities;
        const w: Working = {
          given: [
            { label: 'Current assets ($000)', value: k(d.currentAssets) },
            { label: 'Current liabilities ($000)', value: k(d.currentLiabilities) },
          ],
          formula: 'Working capital = current assets − current liabilities',
          substitution: `= ${n0(d.currentAssets)} − ${n0(d.currentLiabilities)}`,
          steps: [`${n0(d.currentAssets)} − ${n0(d.currentLiabilities)} = ${fmtNumber(exact, 0)}`],
          answer: `${fmtNumber(exact, 0)} ($000)`,
          value: exact,
          unit: 'thousands of dollars ($000)',
          note: exact < 0 ? 'Negative working capital: current liabilities are larger than current assets.' : undefined,
        };
        return {
          business: a.name,
          intro: accountsIntro(a),
          tables: [currentTable(a)],
          prompt: `Calculate the working capital of ${a.name} at 31 December 2026, in $000.`,
          unit: 'money000',
          prefix: '$',
          suffix: '000',
          example: '245',
          exact,
          answer: `${fmtNumber(exact, 0)} ($000), that is ${fmtMoney(exact * 1000, '$', 0)}`,
          tolerance: 0.5,
          toleranceText: 'Accepted to the nearest $1,000, given in $000 like the accounts.',
          working: w,
          meaning:
            exact >= 0
              ? `${a.name} has ${fmtMoney(exact * 1000, '$', 0)} more in current assets than it owes within a year: a buffer for paying its short-term debts.`
              : `${a.name} owes ${fmtMoney(-exact * 1000, '$', 0)} more within a year than its current assets: it may struggle to pay its short-term debts.`,
          slips: tidySlips(
            [
              { value: -exact, message: 'The subtraction is the wrong way round: working capital is current assets minus current liabilities.' },
              { value: d.currentAssets / d.currentLiabilities, message: 'That is the current ratio. Working capital is the difference between the two, not their ratio.' },
              { value: d.currentAssets - a.s.stock - d.currentLiabilities, message: 'Stock was taken out of current assets, as in the acid test. Working capital uses all the current assets.' },
              { value: exact * 1000, message: 'That is the answer in dollars. The question asks for it in $000, like the accounts.' },
            ],
            exact,
            0.5,
          ),
        };
      },
    },
  ],
);

export type KindId = string;
export const KINDS: Record<KindId, KindDef> = Object.fromEntries(KIND_LIST);
export const KIND_IDS: KindId[] = KIND_LIST.map(([id]) => id);

/* ------------------------------------------------------------------ */
/* Generating, finding and choosing questions                          */
/* ------------------------------------------------------------------ */

export const SEED_MIN = 10000;
export const SEED_MAX = 99999;

export function generate(kind: KindId, seed: number): PracticeQuestion {
  const def = KINDS[kind];
  if (!def) throw new Error(`Unknown kind of question "${kind}"`);
  const made = def.make(rng(seed * 7919 + def.code.charCodeAt(0) * 31 + def.code.charCodeAt(2)));
  return { ...made, code: `${def.code}-${seed}`, kind, seed, group: def.group, level: def.level, name: def.name, marks: def.marks };
}

/** "BEQ-48213" back to its kind and seed, or null. Case and spaces do not matter. */
export function parseCode(code: string): { kind: KindId; seed: number } | null {
  const m = /^\s*([a-z]{3})\s*-?\s*(\d{5})\s*$/i.exec(code);
  if (!m) return null;
  const prefix = (m[1] as string).toUpperCase();
  const kind = KIND_IDS.find((id) => KINDS[id]?.code === prefix);
  const seed = Number(m[2]);
  return kind && seed >= SEED_MIN && seed <= SEED_MAX ? { kind, seed } : null;
}

/** The kinds a reader can be set: HL kinds only for HL. */
export function kindsFor(groups: readonly GroupId[], level: 'SL' | 'HL'): KindId[] {
  return KIND_IDS.filter((id) => {
    const d = KINDS[id];
    return d !== undefined && groups.includes(d.group) && (level === 'HL' || d.level !== 'HL');
  });
}

/** The next question's kind and seed: a different kind from the last one where possible. */
export function nextPick(kinds: readonly KindId[], r: Rng, previous?: KindId): { kind: KindId; seed: number } {
  if (!kinds.length) throw new Error('No kinds of question to choose from');
  const pool = kinds.length > 1 && previous ? kinds.filter((x) => x !== previous) : kinds;
  return { kind: r.pick(pool), seed: r.int(SEED_MIN, SEED_MAX) };
}

/** A timed set: n questions spread across the chosen kinds, from one seed. */
export function drawSet(kinds: readonly KindId[], n: number, seed: number): Array<{ kind: KindId; seed: number }> {
  const r = rng(seed);
  const out: Array<{ kind: KindId; seed: number }> = [];
  const bag: KindId[] = [];
  const shuffled = () => {
    const xs = [...kinds];
    for (let i = xs.length - 1; i > 0; i--) {
      const j = r.int(0, i);
      [xs[i], xs[j]] = [xs[j] as KindId, xs[i] as KindId];
    }
    return xs;
  };
  for (let i = 0; i < n; i++) {
    if (!bag.length) bag.push(...shuffled());
    const kind = bag.shift() as KindId;
    out.push({ kind, seed: r.int(SEED_MIN, SEED_MAX) });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Checking an answer                                                  */
/* ------------------------------------------------------------------ */

/**
 * Reads an answer typed by a person: "1,250", "$1,250.50", "(2,400)" or
 * "−2,400" for a negative, "18.5%", "1.6 : 1", "42 days", and for payback
 * "2.5", "2 years 6 months" or "2 years and 6.5 months". Returns null when
 * it is not a number.
 */
export function parseAnswer(raw: string, unit: AnswerUnit): number | null {
  let s = raw.trim().toLowerCase().replace(/[\u2212\u2013]/g, '-').replace(/\u00a0/g, ' ');
  if (!s) return null;
  if (unit === 'years') {
    const ym = /^(\d+(?:\.\d+)?)\s*(?:years?|yrs?|y)\b\s*(?:and\s*|,\s*)?(?:(\d+(?:\.\d+)?)\s*(?:months?|mths?|m)\b)?\.?$/.exec(s);
    if (ym) return Number(ym[1]) + (ym[2] ? Number(ym[2]) / 12 : 0);
    const mo = /^(\d+(?:\.\d+)?)\s*(?:months?|mths?|m)\.?$/.exec(s);
    if (mo) return Number(mo[1]) / 12;
  }
  let negative = false;
  const br = /^\((.*)\)$/.exec(s);
  if (br) {
    negative = true;
    s = br[1] as string;
  }
  s = s
    .replace(/\s*:\s*1$/, '')
    .replace(/us\$|\$|£|€/g, '')
    .replace(/[%a-z\s.]*$/, '')
    .replace(/[,\s]/g, '');
  if (s.startsWith('-')) {
    negative = !negative;
    s = s.slice(1);
  }
  if (s.startsWith('$')) s = s.slice(1);
  if (!/^\d*\.?\d+$/.test(s)) return null;
  const v = Number(s);
  return Number.isFinite(v) ? (negative ? -v : v) : null;
}

export type Verdict = 'right' | 'close' | 'wrong' | 'invalid';

export interface Feedback {
  verdict: Verdict;
  value: number | null;
  slip?: Slip;
  headline: string;
  detail: string;
}

/** How close a typed answer must be to a typical wrong answer to be recognized as that error. */
const slipTolerance = (q: PracticeQuestion) => Math.max(q.tolerance, q.unit === 'money' || q.unit === 'money000' ? 0.5 : 0.051);

export function check(q: PracticeQuestion, raw: string): Feedback {
  const v = parseAnswer(raw, q.unit);
  if (v === null) {
    return { verdict: 'invalid', value: null, headline: 'Enter a number.', detail: `For example ${q.example}. Units and commas are fine.` };
  }
  if (near(v, q.exact, q.tolerance)) {
    return { verdict: 'right', value: v, headline: 'Right.', detail: `The answer is ${q.answer}. ${q.toleranceText}` };
  }
  const st = slipTolerance(q);
  const slip = q.slips.find((x) => near(v, x.value, st));
  if (slip?.close) return { verdict: 'close', value: v, slip, headline: 'Nearly.', detail: slip.message };
  if (slip) return { verdict: 'wrong', value: v, slip, headline: 'Not this time.', detail: slip.message };
  return {
    verdict: 'wrong',
    value: v,
    headline: 'Not this time.',
    detail: `The answer is ${q.answer}. Compare your steps with the working below, and check which figures the formula uses.`,
  };
}

/* ------------------------------------------------------------------ */
/* Saved scores: bb:p2-practice                                        */
/* ------------------------------------------------------------------ */

export interface TimedRecord {
  at: string;
  level: 'SL' | 'HL';
  codes: string[];
  results: Array<Verdict | 'blank'>;
  marks: number;
  total: number;
  allowed: number;
  used: number;
}

export interface P2State {
  v: 1;
  kinds: Record<string, { tried: number; right: number }>;
  timed: TimedRecord[];
}

export const MAX_TIMED = 40;

export const emptyP2 = (): P2State => ({ v: 1, kinds: {}, timed: [] });

export function parseP2(raw: unknown): P2State {
  const out = emptyP2();
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as { kinds?: unknown; timed?: unknown };
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.floor(x)) : 0);
  if (r.kinds && typeof r.kinds === 'object') {
    for (const [id, v] of Object.entries(r.kinds as Record<string, unknown>)) {
      if (!KINDS[id] || !v || typeof v !== 'object') continue;
      const x = v as { tried?: unknown; right?: unknown };
      const tried = num(x.tried);
      if (tried) out.kinds[id] = { tried, right: Math.min(tried, num(x.right)) };
    }
  }
  if (Array.isArray(r.timed)) {
    for (const t of r.timed) {
      if (!t || typeof t !== 'object') continue;
      const x = t as Partial<TimedRecord>;
      if (typeof x.at !== 'string' || (x.level !== 'SL' && x.level !== 'HL') || !Array.isArray(x.codes) || !Array.isArray(x.results)) continue;
      out.timed.push({
        at: x.at,
        level: x.level,
        codes: x.codes.filter((c): c is string => typeof c === 'string'),
        results: x.results.map((v) => (v === 'right' || v === 'close' || v === 'wrong' || v === 'invalid' ? v : 'blank')),
        marks: num(x.marks),
        total: num(x.total),
        allowed: num(x.allowed),
        used: num(x.used),
      });
    }
    out.timed = out.timed.slice(-MAX_TIMED);
  }
  return out;
}

/** Counts one checked answer against its kind. Only the first check of each question counts. */
export function recordAttempt(state: P2State, kind: KindId, verdict: Verdict): P2State {
  if (verdict === 'invalid') return state;
  const prev = state.kinds[kind] ?? { tried: 0, right: 0 };
  return { ...state, kinds: { ...state.kinds, [kind]: { tried: prev.tried + 1, right: prev.right + (verdict === 'right' ? 1 : 0) } } };
}

export function recordTimed(state: P2State, rec: TimedRecord): P2State {
  let next = state;
  rec.codes.forEach((code, i) => {
    const p = parseCode(code);
    const v = rec.results[i];
    if (p && v && v !== 'blank') next = recordAttempt(next, p.kind, v);
  });
  return { ...next, timed: [...next.timed, rec].slice(-MAX_TIMED) };
}

/** Marks for a set: full marks for a right answer, none otherwise (the platform's rule for practice). */
export function score(codes: string[], results: Array<Verdict | 'blank'>): { marks: number; total: number; right: number } {
  let marks = 0;
  let total = 0;
  let right = 0;
  codes.forEach((code, i) => {
    const p = parseCode(code);
    const m = p ? (KINDS[p.kind]?.marks ?? 0) : 0;
    total += m;
    if (results[i] === 'right') {
      marks += m;
      right++;
    }
  });
  return { marks, total, right };
}
