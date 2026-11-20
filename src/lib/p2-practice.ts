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
 *
 * The kinds defined here are the first set. src/lib/p2-calcs.ts adds the rest
 * of the formulae sheet and the syllabus's other calculations, and
 * src/lib/p2-tasks.ts the tasks that are not one figure: finding the slip in a
 * worked answer, reading data, and constructions completed in a grid. This
 * module joins them into one registry (META), so a code, a timed set and the
 * record (bb:p2-practice) work the same for every kind.
 */
import { breakEvenExact, breakEvenUnits, buildWorking, contributionPerUnit, profit, targetPriceExact, targetProfitOutput, type Working } from './finance';
import { RATIOS, TOLERANCE, derive, fmtRatio, ratioInputs, slips as ratioSlips, statementSlips, valueFromInputs, type RatioId } from './ratios';
import { arr, discountFactor, fmtPayback, npv, payback, presentValues, projectInputs, totalReturns } from './investment';
import { bracket } from './cashflow';
import { fmtMoney, fmtNumber, fmtPercent, round, roundUp } from './format';
import { rng, type Rng } from './random';
import { MORE_KINDS } from './p2-calcs';
import { TASK_LIST, checkChoice, checkGrid, type ChoiceFeedback, type ChoiceQuestion, type GridFeedback, type GridQuestion, type TaskDef, type TaskQuestion, type TaskType } from './p2-tasks';
import {
  LABELS,
  MAKERS,
  MONTHS,
  accountsIntro,
  both,
  costIntro,
  costScenario,
  costTable,
  currentTable,
  drawAccounts,
  drawProject,
  k,
  n0,
  n2,
  near,
  plTable,
  plural,
  positionTable,
  projectIntro,
  projectTable,
  tidySlips,
  usd,
  usd2,
  parseAnswer,
  type Accounts,
  type GroupId,
  type KindDef,
  type KindId,
  type PracticeQuestion,
  type Slip,
  type Table,
  type Verdict,
} from './p2-base';

export {
  COMPANIES,
  GROUPS,
  GROUP_IDS,
  MAKERS,
  drawAccounts,
  drawProject,
  parseAnswer,
  usd,
  type AnswerUnit,
  type Figure,
  type GroupId,
  type KindId,
  type Level,
  type PracticeQuestion,
  type Slip,
  type Table,
  type Verdict,
} from './p2-base';

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

KIND_LIST.push(...MORE_KINDS);

/** Every kind with a single figure for an answer: calculations, and readings of a chart or table. */
export const KINDS: Record<KindId, KindDef> = Object.fromEntries(KIND_LIST);
export const KIND_IDS: KindId[] = KIND_LIST.map(([id]) => id);

/** The tasks that are not one figure: find the slip, choose from the data, construct in a grid. */
export const TASKS: Record<KindId, TaskDef> = Object.fromEntries(TASK_LIST);
export const TASK_IDS: KindId[] = TASK_LIST.map(([id]) => id);

export type { TaskType } from './p2-tasks';

/** What the page, a timed set and the record need to know about any kind. */
export interface KindMeta {
  code: string;
  name: string;
  group: GroupId;
  level: 'SL/HL' | 'HL';
  marks: number;
  task: TaskType;
}

export const META: Record<KindId, KindMeta> = Object.fromEntries([
  ...KIND_LIST.map(([id, d]) => [id, { code: d.code, name: d.name, group: d.group, level: d.level, marks: d.marks, task: d.task ?? 'calc' }] as const),
  ...TASK_LIST.map(([id, d]) => [id, { code: d.code, name: d.name, group: d.group, level: d.level, marks: d.marks, task: d.task }] as const),
]);
export const ALL_IDS: KindId[] = [...KIND_IDS, ...TASK_IDS];

/** Any question: a single figure (PracticeQuestion), a choice or a grid. */
export type AnyQuestion = PracticeQuestion | TaskQuestion;

export const isChoice = (q: AnyQuestion): q is ChoiceQuestion => 'form' in q && q.form === 'choice';
export const isGrid = (q: AnyQuestion): q is GridQuestion => 'form' in q && q.form === 'grid';
export const taskOf = (q: AnyQuestion): TaskType => ('form' in q ? q.task : (q.task ?? 'calc'));

/**
 * Where each kind's formula comes from: the formulae sheet the IB provides in
 * the examination (guide, pp. 64 to 66), or a standard form the guide does
 * not list, which the platform's notes use and a student must learn.
 */
const ON_SHEET: Record<string, string> = {
  'gross-profit-margin': 'p. 64',
  'profit-margin': 'p. 64',
  roce: 'p. 64',
  'current-ratio': 'p. 64',
  'acid-test-ratio': 'p. 64',
  'stock-turnover-times': 'p. 64',
  'stock-turnover-days': 'p. 64',
  'debtor-days': 'p. 64',
  'creditor-days': 'p. 64',
  'gearing-ratio': 'p. 64',
  'average-rate-of-return': 'p. 65',
  'net-present-value': 'p. 65, with the discount table on p. 66',
  'capacity-utilization': 'p. 65',
  'productivity-rate': 'p. 65',
};
const TOOLKIT = new Set(['expected-value', 'mean', 'median', 'interquartile-range', 'standard-deviation', 'special-order', 'absorption-cost', 'total-float', 'free-float', 'regression-forecast']);

export interface FormulaSource {
  /** On the formulae sheet given in the examination. */
  sheet: boolean;
  text: string;
}

export function formulaSource(kind: KindId): FormulaSource {
  const page = ON_SHEET[kind];
  if (page) return { sheet: true, text: `On the formulae sheet given in the examination (guide, ${page}).` };
  if (TOOLKIT.has(kind)) return { sheet: false, text: 'A toolkit method (guide, p. 14). It is not on the formulae sheet: learn it.' };
  return { sheet: false, text: 'Not on the formulae sheet: the standard form the platform’s notes use. Learn it.' };
}

/* ------------------------------------------------------------------ */
/* Generating, finding and choosing questions                          */
/* ------------------------------------------------------------------ */

export const SEED_MIN = 10000;
export const SEED_MAX = 99999;

export function generate(kind: KindId, seed: number): PracticeQuestion {
  const def = KINDS[kind];
  if (!def) throw new Error(`Unknown kind of question "${kind}"`);
  const made = def.make(rng(seed * 7919 + def.code.charCodeAt(0) * 31 + def.code.charCodeAt(2)));
  return { ...made, code: `${def.code}-${seed}`, kind, seed, group: def.group, level: def.level, name: def.name, marks: def.marks, ...(def.task ? { task: def.task } : {}) };
}

/** Any kind of question from its kind and seed: a single figure, a choice or a grid. */
export function generateAny(kind: KindId, seed: number): AnyQuestion {
  if (KINDS[kind]) return generate(kind, seed);
  const def = TASKS[kind];
  if (!def) throw new Error(`Unknown kind of question "${kind}"`);
  const made = def.make(rng(seed * 7919 + def.code.charCodeAt(0) * 31 + def.code.charCodeAt(2)));
  return { ...made, code: `${def.code}-${seed}`, kind, seed, group: def.group, level: def.level, name: def.name, marks: def.marks, task: def.task } as TaskQuestion;
}

/** "BEQ-48213" back to its kind and seed, or null. Case and spaces do not matter. */
export function parseCode(code: string): { kind: KindId; seed: number } | null {
  const m = /^\s*([a-z]{3})\s*-?\s*(\d{5})\s*$/i.exec(code);
  if (!m) return null;
  const prefix = (m[1] as string).toUpperCase();
  const kind = ALL_IDS.find((id) => META[id]?.code === prefix);
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

/** Every kind a reader can be set, of the chosen task types: HL kinds only for HL. */
export function allKindsFor(groups: readonly GroupId[], level: 'SL' | 'HL', tasks: readonly TaskType[] = ['calc', 'spot', 'read', 'build']): KindId[] {
  return ALL_IDS.filter((id) => {
    const d = META[id];
    return d !== undefined && groups.includes(d.group) && tasks.includes(d.task) && (level === 'HL' || d.level !== 'HL');
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
  if (near(v, q.exact, q.tolerance) || (q.alsoRight ?? []).some((x) => near(v, x, q.tolerance))) {
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

/** The reader's response to any question: typed text, a chosen option, or the grid's cells. */
export type Response = string | null | Record<string, string>;

export type AnyFeedback = ({ form: 'number' } & Feedback) | ({ form: 'choice' } & ChoiceFeedback) | ({ form: 'grid' } & GridFeedback);

/** Checks any question; a grid also says how many of its marks were earned. */
export function checkAny(q: AnyQuestion, response: Response): AnyFeedback {
  if (isChoice(q)) return { form: 'choice', ...checkChoice(q, typeof response === 'string' ? response : null) };
  if (isGrid(q)) return { form: 'grid', ...checkGrid(q, response && typeof response === 'object' ? response : {}) };
  return { form: 'number', ...check(q, typeof response === 'string' ? response : '') };
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
      if (!META[id] || !v || typeof v !== 'object') continue;
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

/**
 * Marks for a set: full marks for a right answer and none otherwise (the
 * platform's rule for practice), except a grid, which earns its marks in
 * proportion to the cells credited (`earned`, when given).
 */
export function score(codes: string[], results: Array<Verdict | 'blank'>, earned: Array<number | null> = []): { marks: number; total: number; right: number } {
  let marks = 0;
  let total = 0;
  let right = 0;
  codes.forEach((code, i) => {
    const p = parseCode(code);
    const m = p ? (META[p.kind]?.marks ?? 0) : 0;
    total += m;
    if (results[i] === 'right') {
      marks += m;
      right++;
    } else if (typeof earned[i] === 'number') marks += Math.min(m, Math.max(0, Math.floor(earned[i] as number)));
  });
  return { marks, total, right };
}
