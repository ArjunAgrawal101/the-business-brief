/**
 * Paper 2 practice beyond the single answer: three more kinds of task, each
 * generated from a seed with fresh fictional figures and checked the same way.
 *
 * - Find the slip: a worked answer, line by line, with one line where it first
 *   goes wrong. The reader chooses the line; the feedback names the slip, the
 *   corrected line and the right answer.
 * - Read the data: a table or chart, and a statement or month to choose.
 *   (Readings with a figure for an answer are numeric kinds in
 *   src/lib/p2-calcs.ts.)
 * - Construct: a statement, forecast, schedule or chart completed in a grid,
 *   each cell checked. Totals and carried figures are also checked against
 *   the reader's own earlier cells, as examiners apply the own figure rule: a
 *   right method on a wrong figure is credited and said to be so.
 *
 * The arithmetic is the platform's (finance.ts, ratios.ts, investment.ts,
 * budget.ts); layouts follow the guide's statements (pp. 59 to 63). Every
 * business is fictional and every figure simulated. Marks are the platform's.
 */
import { breakEvenExact, targetProfitOutput } from './finance';
import { derive } from './ratios';
import { discountFactor, payback, totalReturns } from './investment';
import { variance } from './budget';
import { bracket } from './cashflow';
import { fmtNumber, round } from './format';
import type { Rng } from './random';
import { barChartSvg } from './p2-figures';
import {
  MONTHS,
  costScenario,
  drawAccounts,
  drawProject,
  n0,
  n2,
  near,
  parseAnswer,
  usd,
  usd2,
  type AnswerUnit,
  type Figure,
  type GroupId,
  type KindId,
  type Level,
  type Slip,
  type Table,
  type Verdict,
} from './p2-base';

/** The possessive: "Kilnsey Vets'", "Danbury Florists'". */
const poss = (name: string) => (/[^s]s$/.test(name) ? `${name}'` : `${name}'s`);

export type TaskType = 'calc' | 'spot' | 'read' | 'build';

export const TASK_LABELS: Record<TaskType, string> = {
  calc: 'Calculate',
  spot: 'Find the slip',
  read: 'Read the data',
  build: 'Construct',
};

interface Head {
  business: string;
  intro: string;
  tables: Table[];
  figure?: Figure;
  prompt: string;
  meaning: string;
}

export interface ChoiceMade extends Head {
  form: 'choice';
  /** The heading above the options: "The working" for a slip. */
  optionsCaption: string;
  options: Array<{ id: string; text: string }>;
  answer: string;
  /** What to say when this option is chosen and it is not the answer. */
  why: Record<string, string>;
  explanation: string[];
  /** For a slip: the working as it should be. */
  corrected?: string[];
  answerText: string;
}

/** How a cell can be worked from the reader's own cells: a sum, a difference (the first less the rest), or a copy. */
export interface OwnRule {
  op: 'sum' | 'diff' | 'copy';
  /** Cell ids, or fixed figures from the question. */
  terms: Array<string | number>;
}

export interface NumberCell {
  id: string;
  kind: 'number';
  label: string;
  unit: AnswerUnit;
  exact: number;
  tolerance: number;
  slips: Slip[];
  own?: OwnRule;
}

export interface PickCell {
  id: string;
  kind: 'pick';
  label: string;
  options: string[];
  answer: string;
}

export type GridCell = NumberCell | PickCell;
export type GridSlot = { text: string } | { cell: string };

export interface GridMade extends Head {
  form: 'grid';
  grid: { caption: string; columns: string[]; rows: Array<{ label: string; slots: GridSlot[]; heading?: boolean; total?: boolean }> };
  cells: GridCell[];
  /** The grid completed, row by row, for the working. */
  solution: string[][];
  explanation: string[];
  answerText: string;
  /** A break-even chart drawn from the grid's own total cost and total revenue rows. */
  chart?: { outputs: number[]; tc: string[]; tr: string[]; fixed: number; unitsLabel: string };
}

export type Made = ChoiceMade | GridMade;

export interface TaskDef {
  code: string;
  name: string;
  group: GroupId;
  level: Level;
  marks: number;
  task: Exclude<TaskType, 'calc'>;
  make: (r: Rng) => Made;
}

interface Meta {
  code: string;
  kind: KindId;
  seed: number;
  group: GroupId;
  level: Level;
  name: string;
  marks: number;
  task: Exclude<TaskType, 'calc'>;
}

export type ChoiceQuestion = ChoiceMade & Meta;
export type GridQuestion = GridMade & Meta;
export type TaskQuestion = ChoiceQuestion | GridQuestion;

/* ------------------------------------------------------------------ */
/* Find the slip                                                       */
/* ------------------------------------------------------------------ */

interface SpotSpec {
  business: string;
  intro: string;
  tables: Table[];
  /** The examination-style question the student answered. */
  question: string;
  right: string[];
  /** The student's lines from the first wrong one on. */
  wrong: string[];
  at: number;
  slip: string;
  rightAnswer: string;
  meaning: string;
}

function spot(o: SpotSpec): ChoiceMade {
  const lines = [...o.right.slice(0, o.at), ...o.wrong];
  const options = lines.map((text, i) => ({ id: `L${i + 1}`, text: `Line ${i + 1}: ${text}` }));
  const why: Record<string, string> = {};
  lines.forEach((_, i) => {
    if (i < o.at) why[`L${i + 1}`] = `Line ${i + 1} is right: it matches the method and the figures. The first slip comes later.`;
    else if (i > o.at) why[`L${i + 1}`] = `Line ${i + 1} follows correctly from the line before it. The slip is earlier: find the first line that goes wrong.`;
  });
  return {
    form: 'choice',
    business: o.business,
    intro: o.intro,
    tables: o.tables,
    prompt: `A student answered: “${o.question}” Their working is below. Which line holds the first slip?`,
    optionsCaption: "The student's working",
    options,
    answer: `L${o.at + 1}`,
    why,
    explanation: [`The slip is in line ${o.at + 1}: ${o.slip}`, `It should read: ${o.right[o.at] ?? ''}`, `The right answer is ${o.rightAnswer}.`],
    corrected: o.right,
    answerText: `Line ${o.at + 1}`,
    meaning: o.meaning,
  };
}

const spotBreakEven: TaskDef = {
  code: 'SPB',
  name: 'Find the slip: break-even',
  group: 'break-even',
  level: 'SL/HL',
  marks: 2,
  task: 'spot',
  make: (r) => {
    const s = costScenario(r, { fractional: true });
    const u = s.m.units;
    const intro = `${s.m.name} sells ${u} at ${usd(s.P)} each. Each costs ${usd(s.V)} in variable costs to make, and fixed costs are ${usd(s.F)} a year.`;
    const exactQ = breakEvenExact(s.F, s.P, s.V) as number;
    const beq = Math.ceil(round(exactQ, 9));
    if (r.chance(0.55)) {
      const mos = s.Q - beq;
      const right = [
        `Contribution per unit = ${usd2(s.P)} − ${usd2(s.V)} = ${usd2(s.c)}`,
        `Break-even quantity = ${usd(s.F)} ÷ ${usd2(s.c)} = ${n2(exactQ)}`,
        `Rounded up: ${n0(beq)} ${u}`,
        `Margin of safety = ${n0(s.Q)} − ${n0(beq)} = ${n0(mos)} ${u}`,
      ];
      const slips = [
        () => {
          const c2 = round(s.P + s.V, 2);
          const q2 = Math.ceil(round(s.F / c2, 9));
          return { at: 0, slip: 'the variable cost was added to the price. Contribution is the price minus the variable cost.', wrong: [`Contribution per unit = ${usd2(s.P)} + ${usd2(s.V)} = ${usd2(c2)}`, `Break-even quantity = ${usd(s.F)} ÷ ${usd2(c2)} = ${n2(s.F / c2)}`, `Rounded up: ${n0(q2)} ${u}`, `Margin of safety = ${n0(s.Q)} − ${n0(q2)} = ${n0(s.Q - q2)} ${u}`] };
        },
        () => {
          const q2 = Math.ceil(round(s.F / s.P, 9));
          return { at: 1, slip: 'the fixed costs were divided by the selling price. Divide by the contribution per unit.', wrong: [`Break-even quantity = ${usd(s.F)} ÷ ${usd2(s.P)} = ${n2(s.F / s.P)}`, `Rounded up: ${n0(q2)} ${u}`, `Margin of safety = ${n0(s.Q)} − ${n0(q2)} = ${n0(s.Q - q2)} ${u}`] };
        },
        () => ({ at: 2, slip: `${n2(exactQ)} was rounded down. One ${s.m.unit} fewer than break-even still makes a loss, so break-even is rounded up.`, wrong: [`Rounded: ${n0(Math.floor(exactQ))} ${u}`, `Margin of safety = ${n0(s.Q)} − ${n0(Math.floor(exactQ))} = ${n0(s.Q - Math.floor(exactQ))} ${u}`] }),
        () => ({ at: 3, slip: 'the subtraction is the wrong way round. The margin of safety is forecast sales minus the break-even quantity.', wrong: [`Margin of safety = ${n0(beq)} − ${n0(s.Q)} = ${fmtNumber(beq - s.Q, 0)} ${u}`] }),
      ];
      const k = r.pick(slips)();
      return {
        ...spot({ business: s.m.name, intro: `${intro} It forecasts sales of ${n0(s.Q)} ${u}.`, tables: [], question: `Calculate the margin of safety for ${s.m.name}, in ${u}. [2]`, right, ...k, rightAnswer: `${n0(mos)} ${u}`, meaning: `Sales could fall by ${n0(mos)} ${u} before ${s.m.name} makes a loss.` }),
      };
    }
    const T = Math.max(1000, Math.round((s.F * r.step(0.2, 0.8, 0.05)) / 1000) * 1000);
    const x = (s.F + T) / s.c;
    const n = targetProfitOutput(s.F, T, s.P, s.V) as number;
    const right = [
      `Contribution per unit = ${usd2(s.P)} − ${usd2(s.V)} = ${usd2(s.c)}`,
      `Fixed costs + target profit = ${usd(s.F)} + ${usd(T)} = ${usd(s.F + T)}`,
      `Target profit output = ${usd(s.F + T)} ÷ ${usd2(s.c)} = ${n2(x)}`,
      `Rounded up: ${n0(n)} ${u}`,
    ];
    const slips = [
      () => {
        const y = (s.F - T) / s.c;
        return { at: 1, slip: 'the target profit was taken away from the fixed costs. The contribution must cover both, so they are added.', wrong: [`Fixed costs − target profit = ${usd(s.F)} − ${usd(T)} = ${usd(s.F - T)}`, `Target profit output = ${usd(s.F - T)} ÷ ${usd2(s.c)} = ${n2(y)}`, `Rounded up: ${n0(Math.ceil(round(y, 9)))} ${u}`] };
      },
      () => {
        const y = (s.F + T) / s.P;
        return { at: 2, slip: 'the total was divided by the selling price. Divide by the contribution per unit.', wrong: [`Target profit output = ${usd(s.F + T)} ÷ ${usd2(s.P)} = ${n2(y)}`, `Rounded up: ${n0(Math.ceil(round(y, 9)))} ${u}`] };
      },
      () => ({ at: 3, slip: 'the output was rounded down, which leaves the business just short of its target. Round a target output up.', wrong: [`Rounded: ${n0(Math.floor(x))} ${u}`] }),
    ].filter((_, i) => i < 2 || Math.abs(x - Math.round(x)) > 1e-9);
    const k = r.pick(slips)();
    return spot({ business: s.m.name, intro: `${intro} Its owners want a profit of ${usd(T)} next year.`, tables: [], question: `Calculate the number of ${u} ${s.m.name} must sell to make a profit of ${usd(T)}. [2]`, right, ...k, rightAnswer: `${n0(n)} ${u}`, meaning: `${s.m.name} must sell ${n0(n)} ${u} to make ${usd(T)} profit.` });
  },
};

const spotRatio: TaskDef = {
  code: 'SPR',
  name: 'Find the slip: ratio analysis',
  group: 'profitability',
  level: 'SL/HL',
  marks: 2,
  task: 'spot',
  make: (r) => {
    const a = drawAccounts(r);
    const s = a.s;
    const d = derive(s);
    const pick = r.pick(['roce', 'acid', 'gpm', 'pm', 'current'] as const);
    const head = { business: a.name, intro: `${a.name} is a private limited company. Its figures for 2026 are below, in $000.` };
    if (pick === 'roce') {
      const roce = (d.pbit / d.capitalEmployed) * 100;
      const right = [`Capital employed = non-current liabilities + equity = ${n0(d.nonCurrentLiabilities)} + ${n0(d.totalEquity)} = ${n0(d.capitalEmployed)}`, `ROCE = ${n0(d.pbit)} ÷ ${n0(d.capitalEmployed)} × 100 = ${n2(roce)}%`];
      const k = r.chance(0.5)
        ? { at: 0, slip: 'capital employed was taken as equity alone. The guide defines it as non-current liabilities plus equity (p. 64).', wrong: [`Capital employed = equity = ${n0(d.totalEquity)}`, `ROCE = ${n0(d.pbit)} ÷ ${n0(d.totalEquity)} × 100 = ${n2((d.pbit / d.totalEquity) * 100)}%`] }
        : { at: 1, slip: 'the profit for the period was used. ROCE uses profit before interest and tax.', wrong: [`ROCE = ${n0(d.profitForPeriod)} ÷ ${n0(d.capitalEmployed)} × 100 = ${n2((d.profitForPeriod / d.capitalEmployed) * 100)}%`] };
      return spot({ ...head, tables: [{ caption: `${a.name}: extracts, 2026 ($000)`, columns: [], rows: [['Profit before interest and tax', d.pbit], ['Profit for the period', d.profitForPeriod], ['Non-current liabilities', d.nonCurrentLiabilities], ['Total equity', d.totalEquity]].map(([l, v]) => ({ label: l as string, cells: [n0(v as number)] })) }], question: `Calculate the return on capital employed (ROCE) of ${a.name} for 2026. [2]`, right, ...k, rightAnswer: `${n2(roce)}%`, meaning: `${a.name} earns ${n2(roce)}% profit before interest and tax on its long-term finance.` });
    }
    if (pick === 'acid') {
      const x = (d.currentAssets - s.stock) / d.currentLiabilities;
      const right = [`Current assets − stock = ${n0(d.currentAssets)} − ${n0(s.stock)} = ${n0(d.currentAssets - s.stock)}`, `Acid test ratio = ${n0(d.currentAssets - s.stock)} ÷ ${n0(d.currentLiabilities)} = ${n2(x)} : 1`];
      const k = r.chance(0.5) && d.currentLiabilities - s.stock > 0
        ? { at: 0, slip: 'the stock was taken away from current liabilities. It comes off current assets.', wrong: [`Current liabilities − stock = ${n0(d.currentLiabilities)} − ${n0(s.stock)} = ${n0(d.currentLiabilities - s.stock)}`, `Acid test ratio = ${n0(d.currentAssets)} ÷ ${n0(d.currentLiabilities - s.stock)} = ${n2(d.currentAssets / (d.currentLiabilities - s.stock))} : 1`] }
        : { at: 1, slip: 'the ratio is upside down. Liquid assets go on top, current liabilities below.', wrong: [`Acid test ratio = ${n0(d.currentLiabilities)} ÷ ${n0(d.currentAssets - s.stock)} = ${n2(d.currentLiabilities / (d.currentAssets - s.stock))} : 1`] };
      return spot({ ...head, tables: [{ caption: `${a.name}: current assets and liabilities at 31 December 2026 ($000)`, columns: [], rows: [['Current assets', d.currentAssets], ['of which stock', s.stock], ['Current liabilities', d.currentLiabilities]].map(([l, v]) => ({ label: l as string, cells: [n0(v as number)] })) }], question: `Calculate the acid test (quick) ratio of ${a.name}. [2]`, right, ...k, rightAnswer: `${n2(x)} : 1`, meaning: `Without selling stock, ${a.name} can cover its current liabilities ${n2(x)} times.` });
    }
    if (pick === 'gpm') {
      const x = (d.grossProfit / s.salesRevenue) * 100;
      const right = [`Gross profit = ${n0(s.salesRevenue)} − ${n0(s.costOfSales)} = ${n0(d.grossProfit)}`, `Gross profit margin = ${n0(d.grossProfit)} ÷ ${n0(s.salesRevenue)} × 100 = ${n2(x)}%`];
      const k = r.chance(0.5)
        ? { at: 0, slip: 'the expenses were taken away as well, which gives profit before interest and tax. Gross profit is sales revenue minus cost of sales only.', wrong: [`Gross profit = ${n0(s.salesRevenue)} − ${n0(s.costOfSales)} − ${n0(s.expenses)} = ${n0(d.pbit)}`, `Gross profit margin = ${n0(d.pbit)} ÷ ${n0(s.salesRevenue)} × 100 = ${n2((d.pbit / s.salesRevenue) * 100)}%`] }
        : { at: 1, slip: 'gross profit was divided by the cost of sales. The margin is a share of sales revenue.', wrong: [`Gross profit margin = ${n0(d.grossProfit)} ÷ ${n0(s.costOfSales)} × 100 = ${n2((d.grossProfit / s.costOfSales) * 100)}%`] };
      return spot({ ...head, tables: [{ caption: `${a.name}: extracts, 2026 ($000)`, columns: [], rows: [['Sales revenue', s.salesRevenue], ['Cost of sales', s.costOfSales], ['Expenses', s.expenses]].map(([l, v]) => ({ label: l as string, cells: [n0(v as number)] })) }], question: `Calculate the gross profit margin of ${a.name} for 2026. [2]`, right, ...k, rightAnswer: `${n2(x)}%`, meaning: `${n2(x)}% of each dollar of sales is left after the cost of sales.` });
    }
    if (pick === 'pm') {
      const x = (d.pbit / s.salesRevenue) * 100;
      const right = [`Profit before interest and tax = ${n0(d.grossProfit)} − ${n0(s.expenses)} = ${n0(d.pbit)}`, `Profit margin = ${n0(d.pbit)} ÷ ${n0(s.salesRevenue)} × 100 = ${n2(x)}%`];
      const k = r.chance(0.5)
        ? { at: 0, slip: 'the interest was taken away too, which gives profit before tax. The profit margin uses profit before interest and tax.', wrong: [`Profit before interest and tax = ${n0(d.grossProfit)} − ${n0(s.expenses)} − ${n0(s.interest)} = ${n0(d.profitBeforeTax)}`, `Profit margin = ${n0(d.profitBeforeTax)} ÷ ${n0(s.salesRevenue)} × 100 = ${n2((d.profitBeforeTax / s.salesRevenue) * 100)}%`] }
        : { at: 1, slip: 'the profit was divided by gross profit. The profit margin is a share of sales revenue.', wrong: [`Profit margin = ${n0(d.pbit)} ÷ ${n0(d.grossProfit)} × 100 = ${n2((d.pbit / d.grossProfit) * 100)}%`] };
      return spot({ ...head, tables: [{ caption: `${a.name}: extracts, 2026 ($000)`, columns: [], rows: [['Sales revenue', s.salesRevenue], ['Gross profit', d.grossProfit], ['Expenses', s.expenses], ['Interest', s.interest]].map(([l, v]) => ({ label: l as string, cells: [n0(v as number)] })) }], question: `Calculate the profit margin of ${a.name} for 2026. [2]`, right, ...k, rightAnswer: `${n2(x)}%`, meaning: `${n2(x)}% of each dollar of sales is left as profit before interest and tax.` });
    }
    const x = d.currentAssets / d.currentLiabilities;
    const right = [`Current assets = ${n0(s.cash)} + ${n0(s.debtors)} + ${n0(s.stock)} = ${n0(d.currentAssets)}`, `Current ratio = ${n0(d.currentAssets)} ÷ ${n0(d.currentLiabilities)} = ${n2(x)} : 1`];
    const k = r.chance(0.5)
      ? { at: 0, slip: 'the stock was left out of current assets. The current ratio uses all of them; leaving out stock is the acid test.', wrong: [`Current assets = ${n0(s.cash)} + ${n0(s.debtors)} = ${n0(s.cash + s.debtors)}`, `Current ratio = ${n0(s.cash + s.debtors)} ÷ ${n0(d.currentLiabilities)} = ${n2((s.cash + s.debtors) / d.currentLiabilities)} : 1`] }
      : { at: 1, slip: 'the ratio is upside down. Current assets go on top.', wrong: [`Current ratio = ${n0(d.currentLiabilities)} ÷ ${n0(d.currentAssets)} = ${n2(d.currentLiabilities / d.currentAssets)} : 1`] };
    return spot({ ...head, tables: [{ caption: `${a.name}: at 31 December 2026 ($000)`, columns: [], rows: [['Cash', s.cash], ['Debtors', s.debtors], ['Stock', s.stock], ['Current liabilities', d.currentLiabilities]].map(([l, v]) => ({ label: l as string, cells: [n0(v as number)] })) }], question: `Calculate the current ratio of ${a.name}. [2]`, right, ...k, rightAnswer: `${n2(x)} : 1`, meaning: `Current assets cover current liabilities ${n2(x)} times.` });
  },
};

const spotInvestment: TaskDef = {
  code: 'SPI',
  name: 'Find the slip: investment appraisal',
  group: 'investment',
  level: 'SL/HL',
  marks: 2,
  task: 'spot',
  make: (r) => {
    const pr = drawProject(r);
    const p = pr.p;
    const C = p.capitalCost;
    const tables: Table[] = [{ caption: `${pr.m.name}: net cash flows from ${pr.what.the} ($, fictional, simulated)`, columns: ['', ...p.returns.map((_, i) => `Year ${i + 1}`)], rows: [{ label: 'Net cash flow', cells: p.returns.map((x) => n0(x)) }] }];
    const intro = `${pr.m.name} is considering ${pr.what.a}, costing ${usd(C)} now.`;
    if (r.chance(0.5)) {
      const pb = payback(p);
      if (!pb) throw new Error('No payback');
      const kYear = pb.inYear;
      const cum: number[] = [];
      let run = -C;
      for (let i = 0; i < kYear - 1; i++) {
        run += p.returns[i] as number;
        cum.push(run);
      }
      const need = -(run);
      const rk = p.returns[kYear - 1] as number;
      const months = (need / rk) * 12;
      const right = [
        ...cum.map((x, i) => `Cumulative net cash flow at the end of year ${i + 1} = ${fmtNumber(i === 0 ? -C : (cum[i - 1] as number), 0)} + ${n0(p.returns[i] as number)} = ${fmtNumber(x, 0)}`),
        `Still to recover at the start of year ${kYear} = ${n0(need)}; ${n0(need)} ÷ ${n0(rk)} × 12 = ${fmtNumber(months, 1)} months`,
        `Payback period = ${kYear - 1} ${kYear - 1 === 1 ? 'year' : 'years'} and ${fmtNumber(months, 1)} months`,
      ];
      const at = right.length - 2;
      const next = p.returns[kYear] as number | undefined;
      const options = [
        () => ({ at: right.length - 1, slip: `year ${kYear} was counted in full. The cost is recovered part-way through it, so only ${kYear - 1} whole years pass first.`, wrong: [`Payback period = ${kYear} years and ${fmtNumber(months, 1)} months`] }),
        ...(next !== undefined && next !== rk
          ? [() => ({ at, slip: `the amount still to recover was divided by year ${kYear + 1}'s cash flow. It is recovered from year ${kYear}'s, ${n0(rk)}.`, wrong: [`Still to recover at the start of year ${kYear} = ${n0(need)}; ${n0(need)} ÷ ${n0(next)} × 12 = ${fmtNumber((need / next) * 12, 1)} months`, `Payback period = ${kYear - 1} ${kYear - 1 === 1 ? 'year' : 'years'} and ${fmtNumber((need / next) * 12, 1)} months`] })]
          : []),
      ];
      const k = r.pick(options)();
      return spot({ business: pr.m.name, intro: `${intro} It expects these net cash flows.`, tables, question: `Calculate the payback period for ${pr.what.the}. [2]`, right, ...k, rightAnswer: `${kYear - 1} ${kYear - 1 === 1 ? 'year' : 'years'} and ${fmtNumber(months, 1)} months`, meaning: `${pr.m.name} recovers its ${usd(C)} after ${kYear - 1} years and ${fmtNumber(months, 1)} months, if each year's cash arrives evenly.` });
    }
    const n = p.returns.length;
    const tr = totalReturns(p);
    const prof = tr - C;
    const avg = prof / n;
    const arr = (avg / C) * 100;
    const right = [`Total returns = ${p.returns.map(n0).join(' + ')} = ${n0(tr)}`, `Total profit = ${n0(tr)} − ${n0(C)} = ${n0(prof)}`, `Average profit a year = ${n0(prof)} ÷ ${n} = ${n2(avg)}`, `ARR = ${n2(avg)} ÷ ${n0(C)} × 100 = ${n2(arr)}%`];
    const k = r.pick([
      () => ({ at: 1, slip: 'the capital cost was not taken away. ARR uses the profit: total returns minus the capital cost.', wrong: [`Total profit = ${n0(tr)}`, `Average profit a year = ${n0(tr)} ÷ ${n} = ${n2(tr / n)}`, `ARR = ${n2(tr / n)} ÷ ${n0(C)} × 100 = ${n2((tr / n / C) * 100)}%`] }),
      () => ({ at: 3, slip: 'the average profit was divided by half the capital cost. The guide’s formula divides by the capital cost itself (p. 65).', wrong: [`ARR = ${n2(avg)} ÷ ${n0(C / 2)} × 100 = ${n2((avg / (C / 2)) * 100)}%`] }),
      () => ({ at: 2, slip: `the total profit was not divided by the ${n} years of use.`, wrong: [`Average profit a year = ${n0(prof)}`, `ARR = ${n0(prof)} ÷ ${n0(C)} × 100 = ${n2((prof / C) * 100)}%`] }),
    ])();
    return spot({ business: pr.m.name, intro: `${intro} It expects these net cash flows over ${n} years.`, tables, question: `Calculate the average rate of return (ARR) for ${pr.what.the}. [2]`, right, ...k, rightAnswer: `${n2(arr)}%`, meaning: `On average ${pr.what.the} returns ${n2(arr)}% of its cost each year, after the cost itself is recovered.` });
  },
};

const spotCash: TaskDef = {
  code: 'SPC',
  name: 'Find the slip: cash flow forecast',
  group: 'cash-flow',
  level: 'SL/HL',
  marks: 2,
  task: 'spot',
  make: (r) => {
    const name = r.pick(['Danbury Florists', 'Elmsworth Books', 'Ambleway Cafés', 'Kilnsey Vets', 'Birchmont Opticians']);
    const start = r.int(0, 9);
    const months = [0, 1, 2].map((i) => MONTHS[(start + i) % 12] as string);
    const open = r.step(-3000, 12000, 500);
    const ins = months.map(() => r.step(8000, 30000, 500));
    const outs = months.map(() => r.step(8000, 32000, 500));
    const nets = ins.map((x, i) => x - (outs[i] as number));
    const close: number[] = [];
    let b = open;
    for (const n of nets) {
      b += n;
      close.push(b);
    }
    const f = (v: number) => fmtNumber(v, 0);
    const right = [
      `${months[0]} net cash flow = ${f(ins[0] as number)} − ${f(outs[0] as number)} = ${f(nets[0] as number)}`,
      `${months[0]} closing balance = ${f(open)} + (${f(nets[0] as number)}) = ${f(close[0] as number)}`,
      `${months[1]} opening balance = ${f(close[0] as number)}`,
      `${months[1]} net cash flow = ${f(ins[1] as number)} − ${f(outs[1] as number)} = ${f(nets[1] as number)}`,
      `${months[1]} closing balance = ${f(close[0] as number)} + (${f(nets[1] as number)}) = ${f(close[1] as number)}`,
    ];
    // A slip that leaves its line unchanged (a month with no net cash flow) cannot be found, so it is not offered.
    const k = r.pick([
      () => ({ at: 2, slip: `${months[1]} opened with ${months[0]}'s opening balance. Each month opens with the previous month's closing balance.`, wrong: [`${months[1]} opening balance = ${f(open)}`, `${months[1]} net cash flow = ${f(ins[1] as number)} − ${f(outs[1] as number)} = ${f(nets[1] as number)}`, `${months[1]} closing balance = ${f(open)} + (${f(nets[1] as number)}) = ${f(open + (nets[1] as number))}`] }),
      () => ({ at: 0, slip: 'the outflows were added to the inflows. Net cash flow is inflows minus outflows.', wrong: [`${months[0]} net cash flow = ${f(ins[0] as number)} + ${f(outs[0] as number)} = ${f((ins[0] as number) + (outs[0] as number))}`, `${months[0]} closing balance = ${f(open)} + ${f((ins[0] as number) + (outs[0] as number))} = ${f(open + (ins[0] as number) + (outs[0] as number))}`, `${months[1]} opening balance = ${f(open + (ins[0] as number) + (outs[0] as number))}`, `${months[1]} net cash flow = ${f(ins[1] as number)} − ${f(outs[1] as number)} = ${f(nets[1] as number)}`, `${months[1]} closing balance = ${f(open + (ins[0] as number) + (outs[0] as number))} + (${f(nets[1] as number)}) = ${f(open + (ins[0] as number) + (outs[0] as number) + (nets[1] as number))}`] }),
      () => ({ at: 4, slip: `${months[1]}'s net cash flow was taken away from the opening balance. It is added: a negative net cash flow lowers the balance by itself.`, wrong: [`${months[1]} closing balance = ${f(close[0] as number)} − (${f(nets[1] as number)}) = ${f((close[0] as number) - (nets[1] as number))}`] }),
    ].filter((_, i) => (i === 0 ? nets[0] !== 0 : i === 2 ? nets[1] !== 0 : true)))();
    return spot({
      business: name,
      intro: `${name} has forecast its cash for ${months[0]} and ${months[1]}. The opening balance for ${months[0]} is ${usd(open)}.`,
      tables: [{ caption: `${name}: cash flow forecast ($, fictional, simulated)`, columns: ['', months[0] as string, months[1] as string], rows: [{ label: 'Total cash inflows', cells: [f(ins[0] as number), f(ins[1] as number)] }, { label: 'Total cash outflows', cells: [f(outs[0] as number), f(outs[1] as number)] }] }],
      question: `Calculate the closing balance for ${name} at the end of ${months[1]}. [2]`,
      right,
      ...k,
      rightAnswer: usd(close[1] as number),
      meaning: `${name} ends ${months[1]} ${(close[1] as number) < 0 ? `overdrawn by ${usd(-(close[1] as number))}` : `with ${usd(close[1] as number)} in the bank`}.`,
    });
  },
};

const spotHl: TaskDef = {
  code: 'SPH',
  name: 'Find the slip: NPV, efficiency and depreciation',
  group: 'efficiency',
  level: 'HL',
  marks: 2,
  task: 'spot',
  make: (r) => {
    const pick = r.pick(['npv', 'stock', 'nbv'] as const);
    if (pick === 'npv') {
      const pr = drawProject(r);
      const p = pr.p;
      const rate = pr.rate;
      const pvs = p.returns.map((x, i) => round(x * discountFactor(rate, i + 1), 2));
      const tot = round(pvs.reduce((s, x) => s + x, 0), 2);
      const npvV = round(tot - p.capitalCost, 2);
      const right = [...p.returns.map((x, i) => `Year ${i + 1}: ${n0(x)} × ${discountFactor(rate, i + 1).toFixed(4)} = ${n2(pvs[i] as number)}`), `Total present value = ${n2(tot)}`, `NPV = ${n2(tot)} − ${n0(p.capitalCost)} = ${n2(npvV)}`];
      const last = right.length - 1;
      const t = r.int(1, p.returns.length - 1);
      const wrongF = discountFactor(rate, t + 2);
      const pv2 = round((p.returns[t] as number) * wrongF, 2);
      const tot2 = round(tot - (pvs[t] as number) + pv2, 2);
      const k = r.pick([
        () => ({ at: last, slip: 'the capital cost was not taken away: that is the total present value. NPV is the total present value minus the cost.', wrong: [`NPV = ${n2(tot)}`] }),
        () => ({ at: t, slip: `year ${t + 1}'s cash flow was multiplied by the factor for year ${t + 2}. Each year uses its own factor.`, wrong: [`Year ${t + 1}: ${n0(p.returns[t] as number)} × ${wrongF.toFixed(4)} = ${n2(pv2)}`, ...right.slice(t + 1, last - 1), `Total present value = ${n2(tot2)}`, `NPV = ${n2(tot2)} − ${n0(p.capitalCost)} = ${n2(round(tot2 - p.capitalCost, 2))}`] }),
      ])();
      return spot({
        business: pr.m.name,
        intro: `${pr.m.name} is considering ${pr.what.a}, costing ${usd(p.capitalCost)} now, at a discount rate of ${rate}%. The factors are from the guide's table.`,
        tables: [{ caption: `${pr.m.name}: net cash flows and discount factors (fictional, simulated)`, columns: ['', ...p.returns.map((_, i) => `Year ${i + 1}`)], rows: [{ label: 'Net cash flow ($)', cells: p.returns.map((x) => n0(x)) }, { label: `Discount factor at ${rate}%`, cells: p.returns.map((_, i) => discountFactor(rate, i + 1).toFixed(4)) }] }],
        question: `Calculate the net present value (NPV) of ${pr.what.the} at ${rate}%. [3]`,
        right,
        ...k,
        rightAnswer: usd2(npvV),
        meaning: `At ${rate}%, the project's cash flows are worth ${usd(Math.abs(npvV))} ${npvV >= 0 ? 'more' : 'less'} than its cost in today's money.`,
      });
    }
    if (pick === 'stock') {
      const a = drawAccounts(r);
      const s = a.s;
      const avg = (a.opening + s.stock) / 2;
      const days = (avg / s.costOfSales) * 365;
      const right = [`Average stock = (${n0(a.opening)} + ${n0(s.stock)}) ÷ 2 = ${n2(avg)}`, `Stock turnover (days) = ${n2(avg)} ÷ ${n0(s.costOfSales)} × 365 = ${n2(days)} days`];
      const k = r.chance(0.5)
        ? { at: 0, slip: 'the two stock figures were added but not halved. Average stock is their total divided by 2.', wrong: [`Average stock = ${n0(a.opening)} + ${n0(s.stock)} = ${n0(a.opening + s.stock)}`, `Stock turnover (days) = ${n0(a.opening + s.stock)} ÷ ${n0(s.costOfSales)} × 365 = ${n2(((a.opening + s.stock) / s.costOfSales) * 365)} days`] }
        : { at: 1, slip: 'average stock was divided by sales revenue. The guide’s formula uses cost of sales (p. 64).', wrong: [`Stock turnover (days) = ${n2(avg)} ÷ ${n0(s.salesRevenue)} × 365 = ${n2((avg / s.salesRevenue) * 365)} days`] };
      return spot({ business: a.name, intro: `${a.name} is a private limited company. Its figures for 2026 are below, in $000.`, tables: [{ caption: `${a.name}: figures for 2026 ($000)`, columns: [], rows: [['Sales revenue', s.salesRevenue], ['Cost of sales', s.costOfSales], ['Stock at 1 January', a.opening], ['Stock at 31 December', s.stock]].map(([l, v]) => ({ label: l as string, cells: [n0(v as number)] })) }], question: `Calculate the stock turnover of ${a.name} for 2026, in days. [2]`, right, ...k, rightAnswer: `${n2(days)} days`, meaning: `Stock is held for ${n2(days)} days on average.` });
    }
    const cost = r.step(20000, 200000, 1000);
    const life = r.int(4, 8);
    const residual = Math.round((cost * r.step(0.05, 0.2, 0.05)) / 500) * 500;
    const years = r.int(2, life - 1);
    const charge = (cost - residual) / life;
    const nbv = cost - charge * years;
    const firm = r.pick(['Marrowby Hotels', 'Oxlade Travel', 'Pennick Furniture', 'Selsby Textiles']);
    const right = [`Annual depreciation = (${n0(cost)} − ${n0(residual)}) ÷ ${life} = ${n2(charge)}`, `Accumulated depreciation after ${years} years = ${years} × ${n2(charge)} = ${n2(charge * years)}`, `Net book value = ${n0(cost)} − ${n2(charge * years)} = ${n2(nbv)}`];
    const k = r.pick([
      () => ({ at: 0, slip: 'the residual value was ignored. Only cost minus residual value is spread over the life.', wrong: [`Annual depreciation = ${n0(cost)} ÷ ${life} = ${n2(cost / life)}`, `Accumulated depreciation after ${years} years = ${years} × ${n2(cost / life)} = ${n2((cost / life) * years)}`, `Net book value = ${n0(cost)} − ${n2((cost / life) * years)} = ${n2(cost - (cost / life) * years)}`] }),
      () => ({ at: 1, slip: `only one year's depreciation was counted. After ${years} years, ${years} charges have been made.`, wrong: [`Accumulated depreciation after ${years} years = ${n2(charge)}`, `Net book value = ${n0(cost)} − ${n2(charge)} = ${n2(cost - charge)}`] }),
      () => ({ at: 2, slip: 'the residual value was taken off again. It is already allowed for in the yearly charge.', wrong: [`Net book value = ${n0(cost)} − ${n2(charge * years)} − ${n0(residual)} = ${n2(nbv - residual)}`] }),
    ])();
    return spot({ business: firm, intro: `${firm} bought equipment for ${usd(cost)}. It expects to use it for ${life} years and sell it for ${usd(residual)}, and depreciates it by the straight line method.`, tables: [], question: `Calculate the net book value of the equipment after ${years} years. [2]`, right, ...k, rightAnswer: usd2(nbv), meaning: `After ${years} years the equipment is carried at ${usd2(nbv)}.` });
  },
};

/* ------------------------------------------------------------------ */
/* Read the data                                                       */
/* ------------------------------------------------------------------ */

const readCashChart: TaskDef = {
  code: 'RCF',
  name: 'Read a chart of cash balances',
  group: 'cash-flow',
  level: 'SL/HL',
  marks: 2,
  task: 'read',
  make: (r) => {
    for (let tries = 0; tries < 300; tries++) {
      const name = r.pick(['Farrowdale Garden Centre', 'Marrowby Hotels', 'Cresswell Gyms', 'Tallowmere Candles', 'Oxlade Travel']);
      const start = r.int(0, 11);
      const months = Array.from({ length: 6 }, (_, i) => MONTHS[(start + i) % 12] as string);
      const step = r.pick([1000, 2000, 5000]);
      const open = step * r.int(1, 6);
      const nets = months.map(() => step * r.int(-5, 4));
      const close: number[] = [];
      let b = open;
      for (const n of nets) {
        b += n;
        close.push(b);
      }
      const ask = r.pick(['first-negative', 'lowest', 'largest-outflow'] as const);
      let answer = -1;
      if (ask === 'first-negative') answer = close.findIndex((x) => x < 0);
      if (ask === 'lowest') {
        const lo = Math.min(...close);
        if (close.filter((x) => x === lo).length > 1) continue;
        answer = close.indexOf(lo);
      }
      if (ask === 'largest-outflow') {
        const lo = Math.min(...nets);
        if (lo >= 0 || nets.filter((x) => x === lo).length > 1) continue;
        answer = nets.indexOf(lo);
      }
      if (answer < 0 || (ask === 'first-negative' && close.every((x) => x < 0))) continue;
      const fmt = (v: number) => (v < 0 ? `(${fmtNumber(-v, 0)})` : fmtNumber(v, 0));
      const svg = barChartSvg({
        id: `rcf-${start}-${open}`,
        title: `${name}: closing cash balance at the end of each month`,
        desc: `Closing balances: ${months.map((m, i) => `${m} ${(close[i] as number) < 0 ? `overdrawn by $${fmtNumber(-(close[i] as number), 0)}` : `$${fmtNumber(close[i] as number, 0)}`}`).join('; ')}. The opening balance for ${months[0]} was $${fmtNumber(open, 0)}.`,
        labels: months.map((m) => m.slice(0, 3)),
        values: close,
        step: step * 2,
        yLabel: 'Closing balance ($)',
        fmt,
      });
      const prompt =
        ask === 'first-negative'
          ? `In which month is ${name} first overdrawn at the month's end?`
          : ask === 'lowest'
            ? `In which month is ${poss(name)} closing balance lowest?`
            : `In which month does ${name} have its largest net cash outflow?`;
      const why: Record<string, string> = {};
      months.forEach((m, i) => {
        if (i === answer) return;
        why[`M${i}`] =
          ask === 'largest-outflow'
            ? `In ${m} the balance moved by ${fmt(nets[i] as number)} (from ${fmt(i ? (close[i - 1] as number) : open)} to ${fmt(close[i] as number)}). Net cash flow is the change in the balance over the month, not the balance itself.`
            : `${m} closes at ${fmt(close[i] as number)}${ask === 'first-negative' && (close[i] as number) >= 0 ? ', still in credit' : ''}.`;
      });
      return {
        form: 'choice',
        business: name,
        intro: `The chart shows ${poss(name)} forecast closing cash balance at the end of each month. Negative balances (an overdraft) are below the line and in brackets. ${months[0]} opens with $${fmtNumber(open, 0)}.`,
        tables: [{ caption: `${name}: forecast closing balances ($, fictional, simulated)`, columns: ['', ...months.map((m) => m.slice(0, 3))], rows: [{ label: 'Closing balance', cells: close.map(fmt) }] }],
        figure: { svg, caption: `${name}: closing balance by month. Months run along the bottom; bars below the zero line are overdrafts.` },
        prompt,
        optionsCaption: 'Choose a month',
        options: months.map((m, i) => ({ id: `M${i}`, text: m })),
        answer: `M${answer}`,
        why,
        explanation: [
          ask === 'first-negative'
            ? `${months[answer]} is the first month whose bar is below zero: ${fmt(close[answer] as number)}.`
            : ask === 'lowest'
              ? `${months[answer]} has the lowest bar: ${fmt(close[answer] as number)}.`
              : `The net cash flow of a month is the change in the balance: ${months.map((m, i) => `${m.slice(0, 3)} ${fmt(nets[i] as number)}`).join(', ')}. The largest outflow is in ${months[answer]}.`,
        ],
        answerText: months[answer] as string,
        meaning: ask === 'largest-outflow' ? 'The lowest balance and the largest outflow can fall in different months: the balance carries every month before it.' : 'A forecast overdraft is a prompt to arrange finance or change the timing of payments before the month arrives.',
      };
    }
    throw new Error('Could not draw cash balances');
  },
};

interface Ratios {
  gpm: [number, number];
  pm: [number, number];
  cr: [number, number];
  atr: [number, number];
}

const STATEMENTS: Array<{ id: string; text: (x: Ratios) => string; truth: (x: Ratios) => boolean; why: string }> = [
  { id: 'gpm-up', text: () => 'The gross profit margin rose.', truth: (x) => x.gpm[1] > x.gpm[0], why: 'Compare the two gross profit margins.' },
  { id: 'gpm-down', text: () => 'The gross profit margin fell.', truth: (x) => x.gpm[1] < x.gpm[0], why: 'Compare the two gross profit margins.' },
  { id: 'pm-up', text: () => 'The profit margin rose.', truth: (x) => x.pm[1] > x.pm[0], why: 'Compare the two profit margins.' },
  { id: 'liq-up', text: () => 'Liquidity improved on both measures.', truth: (x) => x.cr[1] > x.cr[0] && x.atr[1] > x.atr[0], why: 'Both the current ratio and the acid test must rise for this to hold.' },
  { id: 'liq-down', text: () => 'Liquidity worsened on both measures.', truth: (x) => x.cr[1] < x.cr[0] && x.atr[1] < x.atr[0], why: 'Both the current ratio and the acid test must fall for this to hold.' },
  { id: 'cover', text: () => 'Current assets covered current liabilities in both years.', truth: (x) => x.cr[0] >= 1 && x.cr[1] >= 1, why: 'Covered means a current ratio of at least 1 in each year.' },
  { id: 'quick', text: () => 'Without its stock, the business could cover its current liabilities in 2026.', truth: (x) => x.atr[1] >= 1, why: 'That needs an acid test ratio of at least 1 in 2026.' },
  { id: 'expenses', text: () => 'Expenses took a larger share of sales revenue in 2026 than in 2025.', truth: (x) => x.gpm[1] - x.pm[1] > x.gpm[0] - x.pm[0], why: 'The gap between the gross profit margin and the profit margin is the share of sales taken by expenses.' },
  { id: 'stock', text: () => 'Stock grew relative to current liabilities.', truth: (x) => x.cr[1] - x.atr[1] > x.cr[0] - x.atr[0], why: 'The gap between the current ratio and the acid test is stock divided by current liabilities.' },
];

const readRatioTable: TaskDef = {
  code: 'RRT',
  name: 'Read a table of ratios',
  group: 'liquidity',
  level: 'SL/HL',
  marks: 2,
  task: 'read',
  make: (r) => {
    for (let tries = 0; tries < 400; tries++) {
      const name = r.pick(['Brackwater Foods', 'Quillon Hotels', 'Rookhaven Retail', 'Vellacott Textiles', 'Yarrow Health Foods']);
      const pair = (lo: number, hi: number, st: number): [number, number] => [r.step(lo, hi, st), r.step(lo, hi, st)];
      const gpm = pair(28, 62, 0.1);
      const pm: [number, number] = [round(gpm[0] - r.step(8, 22, 0.1), 1), round(gpm[1] - r.step(8, 22, 0.1), 1)];
      const cr = pair(0.7, 2.4, 0.01);
      const atr: [number, number] = [round(cr[0] - r.step(0.2, 0.8, 0.01), 2), round(cr[1] - r.step(0.2, 0.8, 0.01), 2)];
      const x: Ratios = { gpm, pm, cr, atr };
      if (pm.some((v) => v <= 1) || atr.some((v) => v <= 0.2)) continue;
      if (gpm[0] === gpm[1] || pm[0] === pm[1] || cr[0] === cr[1] || atr[0] === atr[1]) continue;
      if (Math.abs(gpm[1] - pm[1] - (gpm[0] - pm[0])) < 0.5 || Math.abs(cr[1] - atr[1] - (cr[0] - atr[0])) < 0.05) continue;
      const truths = STATEMENTS.filter((st) => st.truth(x));
      const falses = STATEMENTS.filter((st) => !st.truth(x));
      if (!truths.length || falses.length < 3) continue;
      const right = r.pick(truths);
      const pool = [...falses];
      const wrong: typeof STATEMENTS = [];
      while (wrong.length < 3) wrong.push(pool.splice(r.int(0, pool.length - 1), 1)[0] as (typeof STATEMENTS)[number]);
      const opts = [right, ...wrong];
      for (let i = opts.length - 1; i > 0; i--) {
        const j = r.int(0, i);
        [opts[i], opts[j]] = [opts[j] as (typeof STATEMENTS)[number], opts[i] as (typeof STATEMENTS)[number]];
      }
      const show = (v: number, dp: number) => fmtNumber(v, dp);
      const why: Record<string, string> = {};
      for (const o of wrong) why[o.id] = `Not supported. ${o.why}`;
      return {
        form: 'choice',
        business: name,
        intro: `${name} has worked out four ratios for 2025 and 2026.`,
        tables: [
          {
            caption: `${name}: ratios (fictional, simulated figures)`,
            columns: ['', '2025', '2026'],
            rows: [
              { label: 'Gross profit margin (%)', cells: [show(gpm[0], 1), show(gpm[1], 1)] },
              { label: 'Profit margin (%)', cells: [show(pm[0], 1), show(pm[1], 1)] },
              { label: 'Current ratio', cells: [`${show(cr[0], 2)} : 1`, `${show(cr[1], 2)} : 1`] },
              { label: 'Acid test (quick) ratio', cells: [`${show(atr[0], 2)} : 1`, `${show(atr[1], 2)} : 1`] },
            ],
          },
        ],
        prompt: 'Which statement does the table support?',
        optionsCaption: 'Choose one statement',
        options: opts.map((o) => ({ id: o.id, text: o.text(x) })),
        answer: right.id,
        why,
        explanation: [`Supported: “${right.text(x)}” ${right.why}`, `Gross profit margin ${show(gpm[0], 1)}% to ${show(gpm[1], 1)}%; profit margin ${show(pm[0], 1)}% to ${show(pm[1], 1)}%; current ratio ${show(cr[0], 2)} to ${show(cr[1], 2)}; acid test ${show(atr[0], 2)} to ${show(atr[1], 2)}.`],
        answerText: right.text(x),
        meaning: 'A ratio shows a position, not its cause: say what changed, then look in the accounts for why.',
      };
    }
    throw new Error('Could not draw a ratio table');
  },
};

/* ------------------------------------------------------------------ */
/* Construct in a grid                                                 */
/* ------------------------------------------------------------------ */

const num = (id: string, label: string, exact: number, unit: AnswerUnit, tolerance: number, slips: Slip[] = [], own?: OwnRule): NumberCell => ({ id, kind: 'number', label, unit, exact, tolerance, slips, own });
const given = (v: string): GridSlot => ({ text: v });
const blank = (id: string): GridSlot => ({ cell: id });

const buildCashFlow: TaskDef = {
  code: 'GCF',
  name: 'Construct a cash flow forecast',
  group: 'cash-flow',
  level: 'SL/HL',
  marks: 5,
  task: 'build',
  make: (r) => {
    for (let tries = 0; tries < 200; tries++) {
      const name = r.pick(['Danbury Florists', 'Tallowmere Candles', 'Brackenfold Bakery', 'Lowther Ceramics', 'Elmsworth Books']);
      const start = r.int(0, 9);
      const months = [0, 1, 2].map((i) => MONTHS[(start + i) % 12] as string);
      const before = MONTHS[(start + 11) % 12] as string;
      const cashShare = r.pick([0.4, 0.5, 0.6, 0.7]);
      const sales = [0, 1, 2, 3].map(() => r.step(10000, 40000, 1000));
      const open = r.step(-2000, 8000, 500);
      const loan = r.chance(0.5) ? r.step(5000, 15000, 1000) : 0;
      const loanAt = r.int(0, 2);
      const materials = months.map(() => r.step(4000, 18000, 500));
      const wages = r.step(5000, 12000, 500);
      const rent = r.step(3000, 9000, 500);
      const cash = sales.slice(1).map((x) => round(x * cashShare, 2));
      const credit = sales.slice(0, 3).map((x) => round(x * (1 - cashShare), 2));
      const loans = months.map((_, i) => (i === loanAt ? loan : 0));
      const ins = months.map((_, i) => (cash[i] as number) + (credit[i] as number) + (loans[i] as number));
      const rents = months.map((_, i) => (i === 0 ? rent : 0));
      const outs = months.map((_, i) => (materials[i] as number) + wages + (rents[i] as number));
      const nets = ins.map((x, i) => x - (outs[i] as number));
      const opens: number[] = [];
      const closes: number[] = [];
      let b = open;
      for (const n of nets) {
        opens.push(b);
        b += n;
        closes.push(b);
      }
      if (!closes.some((x) => x < 0) && r.chance(0.5)) continue;
      const cells: GridCell[] = [];
      months.forEach((m, i) => {
        cells.push(num(`cash${i}`, `Cash sales, ${m}`, cash[i] as number, 'money', 0.5, [{ value: sales[i + 1] as number, message: `That is all of ${m}'s sales. Only ${fmtNumber(cashShare * 100, 0)}% are paid in cash in the month.` }]));
        cells.push(num(`credit${i}`, `Credit sales received, ${m}`, credit[i] as number, 'money', 0.5, [{ value: round((sales[i + 1] as number) * (1 - cashShare), 2), message: `That is the credit part of ${m}'s own sales, which is paid a month later. In ${m} the business receives the credit sales of ${i ? months[i - 1] : before}.` }]));
        cells.push(num(`in${i}`, `Total cash inflows, ${m}`, ins[i] as number, 'money', 0.5, [], { op: 'sum', terms: [`cash${i}`, `credit${i}`, loans[i] as number] }));
        cells.push(num(`out${i}`, `Total cash outflows, ${m}`, outs[i] as number, 'money', 0.5, i === 0 ? [{ value: (materials[i] as number) + wages, message: 'The rent was left out.' }] : []));
        cells.push(num(`net${i}`, `Net cash flow, ${m}`, nets[i] as number, 'money', 0.5, [{ value: (ins[i] as number) + (outs[i] as number), message: 'The outflows were added. Net cash flow is inflows minus outflows.' }], { op: 'diff', terms: [`in${i}`, `out${i}`] }));
        if (i > 0) cells.push(num(`open${i}`, `Opening balance, ${m}`, opens[i] as number, 'money', 0.5, [{ value: open, message: `That is ${months[0]}'s opening balance. Each month opens with the previous month's closing balance.` }], { op: 'copy', terms: [`close${i - 1}`] }));
        cells.push(num(`close${i}`, `Closing balance, ${m}`, closes[i] as number, 'money', 0.5, [{ value: (opens[i] as number) - (nets[i] as number), message: 'The net cash flow was taken away. Closing balance = opening balance + net cash flow.' }], { op: 'sum', terms: [i === 0 ? open : `open${i}`, `net${i}`] }));
      });
      const f = (v: number) => bracket(v, 0);
      const row = (label: string, slots: GridSlot[], extra: { heading?: boolean; total?: boolean } = {}) => ({ label, slots, ...extra });
      const rows = [
        row('Opening balance', [given(f(open)), blank('open1'), blank('open2')]),
        row('Cash inflows', [given(''), given(''), given('')], { heading: true }),
        row('Cash sales', [blank('cash0'), blank('cash1'), blank('cash2')]),
        row('Credit sales received', [blank('credit0'), blank('credit1'), blank('credit2')]),
        ...(loan ? [row('Bank loan received', months.map((_, i) => given(f(loans[i] as number))))] : []),
        row('Total cash inflows', [blank('in0'), blank('in1'), blank('in2')], { total: true }),
        row('Cash outflows', [given(''), given(''), given('')], { heading: true }),
        row('Materials', months.map((_, i) => given(f(materials[i] as number)))),
        row('Wages', months.map(() => given(f(wages)))),
        row('Rent', months.map((_, i) => given(f(rents[i] as number)))),
        row('Total cash outflows', [blank('out0'), blank('out1'), blank('out2')], { total: true }),
        row('Net cash flow', [blank('net0'), blank('net1'), blank('net2')], { total: true }),
        row('Closing balance', [blank('close0'), blank('close1'), blank('close2')], { total: true }),
      ];
      const byId = new Map(cells.map((c) => [c.id, c]));
      const solution = rows.map((rw) => rw.slots.map((sl) => ('text' in sl ? sl.text : f((byId.get(sl.cell) as NumberCell).exact))));
      return {
        form: 'grid',
        business: name,
        intro: `${name} sells for cash and on one month's credit: ${fmtNumber(cashShare * 100, 0)}% of each month's sales are paid in the month and the rest a month later. Sales were ${usd(sales[0] as number)} in ${before}, then ${months.map((m, i) => `${usd(sales[i + 1] as number)} in ${m}`).join(', ')}. The opening balance for ${months[0]} is ${usd(open)}.${loan ? ` A bank loan of ${usd(loan)} will be received in ${months[loanAt]}.` : ''} Rent of ${usd(rent)} is paid each quarter, in ${months[0]}.`,
        tables: [],
        prompt: `Complete the cash flow forecast for ${months[0]} to ${months[2]}, in the guide's layout. Enter a negative figure with a minus sign or in brackets.`,
        grid: { caption: `${name}: cash flow forecast, ${months[0]} to ${months[2]} ($, fictional, simulated)`, columns: ['', ...months], rows },
        cells,
        solution,
        explanation: [
          `Cash sales are ${fmtNumber(cashShare * 100, 0)}% of the month's own sales; credit sales received are the other ${fmtNumber((1 - cashShare) * 100, 0)}% of the previous month's.`,
          `Net cash flow = total cash inflows − total cash outflows; closing balance = opening balance + net cash flow; each closing balance opens the next month.`,
          `Closing balances: ${months.map((m, i) => `${m} ${f(closes[i] as number)}`).join('; ')}.`,
        ],
        answerText: `Closing balance at the end of ${months[2]}: ${usd(closes[2] as number)}`,
        meaning: closes.some((x) => x < 0) ? `The forecast goes overdrawn in ${months[closes.findIndex((x) => x < 0)]}: ${name} needs an overdraft, or to collect or pay at different times.` : `The balance stays in credit throughout: ${name} can meet its payments as they fall due.`,
      };
    }
    throw new Error('Could not draw a forecast');
  },
};

const buildBreakEven: TaskDef = {
  code: 'GBE',
  name: 'Construct a break-even chart',
  group: 'break-even',
  level: 'SL/HL',
  marks: 4,
  task: 'build',
  make: (r) => {
    for (let tries = 0; tries < 300; tries++) {
      const s = costScenario(r);
      const xstep = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000].find((st) => (s.Q * 1.3) / st <= 5) ?? 2000;
      const outputs = [0, 1, 2, 3, 4, 5].map((i) => i * xstep);
      if ((outputs[5] as number) < s.Q) continue;
      const beq = Math.ceil(round((breakEvenExact(s.F, s.P, s.V) as number), 9));
      if (beq > (outputs[5] as number)) continue;
      const tc = outputs.map((q) => round(s.F + s.V * q, 2));
      const tr = outputs.map((q) => round(s.P * q, 2));
      const cells: GridCell[] = [];
      outputs.forEach((q, i) => {
        cells.push(num(`tc${i}`, `Total costs at ${n0(q)}`, tc[i] as number, 'money', 0.5, [{ value: s.V * q, message: 'That is variable costs only. Total costs add the fixed costs, which are there even at zero output.' }]));
        cells.push(num(`tr${i}`, `Total revenue at ${n0(q)}`, tr[i] as number, 'money', 0.5, [{ value: s.c * q, message: 'That is total contribution. Total revenue is price times output.' }]));
        cells.push(num(`pl${i}`, `Profit or loss at ${n0(q)}`, round((tr[i] as number) - (tc[i] as number), 2), 'money', 0.5, [{ value: round((tc[i] as number) - (tr[i] as number), 2), message: 'The subtraction is the wrong way round: profit is total revenue minus total costs.' }], { op: 'diff', terms: [`tr${i}`, `tc${i}`] }));
      });
      cells.push(num('beq', 'Break-even quantity', beq, 'units', 0, [{ value: Math.floor(s.F / s.c), message: 'Rounded down: break-even is rounded up to a whole unit.' }, { value: s.F / s.P, message: 'The fixed costs were divided by the price. Divide by the contribution per unit.' }]));
      cells.push(num('mos', 'Margin of safety at the forecast', s.Q - beq, 'units', 0, [{ value: beq - s.Q, message: 'The subtraction is the wrong way round.' }], { op: 'diff', terms: [s.Q, 'beq'] }));
      const f = (v: number) => bracket(v, 0);
      const rows = [
        { label: 'Fixed costs', slots: outputs.map(() => given(f(s.F))) },
        { label: 'Total costs', slots: outputs.map((_, i) => blank(`tc${i}`)) },
        { label: 'Total revenue', slots: outputs.map((_, i) => blank(`tr${i}`)) },
        { label: 'Profit or loss', slots: outputs.map((_, i) => blank(`pl${i}`)), total: true },
      ];
      const byId = new Map(cells.map((c) => [c.id, c]));
      const solution = rows.map((rw) => rw.slots.map((sl) => ('text' in sl ? sl.text : f((byId.get(sl.cell) as NumberCell).exact))));
      return {
        form: 'grid',
        business: s.m.name,
        intro: `${s.m.name} sells ${s.m.units} at ${usd(s.P)} each. Each costs ${usd(s.V)} in variable costs and fixed costs are ${usd(s.F)} a year. Forecast sales are ${n0(s.Q)} ${s.m.units}.`,
        tables: [],
        prompt: `Complete the table for the break-even chart, then find the break-even quantity and the margin of safety. The chart is drawn from your own figures when you check.`,
        grid: { caption: `${s.m.name}: costs and revenue by output ($ a year, fictional, simulated)`, columns: ['', ...outputs.map((q) => `${n0(q)} ${s.m.units}`)], rows },
        cells,
        solution: [...solution, ['Break-even quantity', `${n0(beq)} ${s.m.units}`], ['Margin of safety', `${n0(s.Q - beq)} ${s.m.units}`]],
        explanation: [
          `Total costs = fixed costs + variable cost × output; total revenue = price × output; the lines cross at break-even.`,
          `Break-even quantity = ${usd(s.F)} ÷ (${usd2(s.P)} − ${usd2(s.V)}) = ${n2(s.F / s.c)}, rounded up to ${n0(beq)} ${s.m.units}.`,
          `Margin of safety = ${n0(s.Q)} − ${n0(beq)} = ${n0(s.Q - beq)} ${s.m.units}.`,
          'On paper, a full chart also needs a title, labelled axes with units, a proportional scale, named lines, and the break-even point and margin of safety marked.',
        ],
        answerText: `Break-even at ${n0(beq)} ${s.m.units}; margin of safety ${n0(s.Q - beq)} ${s.m.units}`,
        chart: { outputs, tc: outputs.map((_, i) => `tc${i}`), tr: outputs.map((_, i) => `tr${i}`), fixed: s.F, unitsLabel: s.m.units },
        meaning: `Below ${n0(beq)} ${s.m.units} the total cost line is above the revenue line; above it, the gap between them is profit.`,
      };
    }
    throw new Error('Could not draw a break-even chart');
  },
};

const buildProfitLoss: TaskDef = {
  code: 'GPL',
  name: 'Prepare a statement of profit or loss',
  group: 'accounts',
  level: 'SL/HL',
  marks: 4,
  task: 'build',
  make: (r) => {
    const a = drawAccounts(r);
    const s = a.s;
    const d = derive(s);
    const f = (v: number) => bracket(v, 0);
    const cells: GridCell[] = [
      num('gp', 'Gross profit', d.grossProfit, 'money000', 0.5, [{ value: s.salesRevenue + s.costOfSales, message: 'The cost of sales was added. Gross profit is sales revenue minus cost of sales.' }], { op: 'diff', terms: [s.salesRevenue, s.costOfSales] }),
      num('pbit', 'Profit before interest and tax', d.pbit, 'money000', 0.5, [{ value: d.grossProfit - s.expenses - s.interest, message: 'The interest was taken away too early. It comes after profit before interest and tax.' }], { op: 'diff', terms: ['gp', s.expenses] }),
      num('pbt', 'Profit before tax', d.profitBeforeTax, 'money000', 0.5, [], { op: 'diff', terms: ['pbit', s.interest] }),
      num('pfp', 'Profit for the period', d.profitForPeriod, 'money000', 0.5, [{ value: d.profitBeforeTax - s.tax - s.dividends, message: 'The dividends were taken away here. They come after the profit for the period.' }], { op: 'diff', terms: ['pbt', s.tax] }),
      num('ret', 'Retained profit', d.retainedProfit, 'money000', 0.5, [{ value: d.profitForPeriod + s.dividends, message: 'The dividends were added. They are paid out of profit.' }], { op: 'diff', terms: ['pfp', s.dividends] }),
    ];
    const rows = [
      { label: 'Sales revenue', slots: [given(f(s.salesRevenue))] },
      { label: 'Cost of sales', slots: [given(f(-s.costOfSales))] },
      { label: 'Gross profit', slots: [blank('gp')], total: true },
      { label: 'Expenses', slots: [given(f(-s.expenses))] },
      { label: 'Profit before interest and tax', slots: [blank('pbit')], total: true },
      { label: 'Interest', slots: [given(f(-s.interest))] },
      { label: 'Profit before tax', slots: [blank('pbt')], total: true },
      { label: 'Tax', slots: [given(f(-s.tax))] },
      { label: 'Profit for the period', slots: [blank('pfp')], total: true },
      { label: 'Dividends', slots: [given(f(-s.dividends))] },
      { label: 'Retained profit', slots: [blank('ret')], total: true },
    ];
    const byId = new Map(cells.map((c) => [c.id, c]));
    return {
      form: 'grid',
      business: a.name,
      intro: `${a.name} is a private limited company. Prepare its statement of profit or loss for the year ended 31 December 2026, in $000, in the guide's layout: deductions in brackets and a subtotal at each stage.`,
      tables: [],
      prompt: 'Complete each subtotal of the statement.',
      grid: { caption: `${a.name}: statement of profit or loss for the year ended 31 December 2026 ($000)`, columns: ['', '$000'], rows },
      cells,
      solution: rows.map((rw) => rw.slots.map((sl) => ('text' in sl ? sl.text : f((byId.get(sl.cell) as NumberCell).exact)))),
      explanation: [`Each subtotal takes the next deduction from the one above: gross profit ${n0(d.grossProfit)}, profit before interest and tax ${n0(d.pbit)}, profit before tax ${n0(d.profitBeforeTax)}, profit for the period ${n0(d.profitForPeriod)}, retained profit ${n0(d.retainedProfit)}.`, 'The layout follows the guide’s statement of profit or loss for a profit-making entity (figure 6, p. 59).'],
      answerText: `Retained profit ${n0(d.retainedProfit)} ($000)`,
      meaning: `Of ${usd(s.salesRevenue * 1000)} of sales, ${usd(d.retainedProfit * 1000)} stays in the business as retained profit.`,
    };
  },
};

const buildVariances: TaskDef = {
  code: 'GVR',
  name: 'Complete a budget variance statement',
  group: 'budgets',
  level: 'HL',
  marks: 4,
  task: 'build',
  make: (r) => {
    for (let tries = 0; tries < 200; tries++) {
      const firm = r.pick(['Marrowby Hotels', 'Kilnsey Vets', 'Cresswell Gyms', 'Oxlade Travel']);
      const lines = [
        { id: 'r1', label: 'Sales revenue', kind: 'revenue' as const },
        { id: 'c1', label: 'Staff costs', kind: 'cost' as const },
        { id: 'c2', label: 'Supplies', kind: 'cost' as const },
        { id: 'c3', label: 'Marketing', kind: 'cost' as const },
      ].map((l) => {
        const budget = l.kind === 'revenue' ? r.step(80000, 300000, 1000) : r.step(8000, 70000, 500);
        return { ...l, budget, actual: Math.round((budget * r.step(0.85, 1.15, 0.01)) / 100) * 100 };
      });
      if (lines.some((l) => l.actual === l.budget)) continue;
      const vs = lines.map((l) => variance(l.kind, l.budget, l.actual));
      const cost = lines.filter((l) => l.kind === 'cost');
      const bProfit = (lines[0] as (typeof lines)[number]).budget - cost.reduce((s2, l) => s2 + l.budget, 0);
      const aProfit = (lines[0] as (typeof lines)[number]).actual - cost.reduce((s2, l) => s2 + l.actual, 0);
      const pv = variance('revenue', bProfit, aProfit);
      if (!pv.mark || bProfit <= 0) continue;
      const cells: GridCell[] = [];
      lines.forEach((l, i) => {
        const v = vs[i] as ReturnType<typeof variance>;
        cells.push(num(`v${l.id}`, `Variance, ${l.label.toLowerCase()}`, v.amount, 'money', 0.5, [{ value: v.share ?? NaN, message: 'That is a percentage. Enter the variance in dollars.' }]));
        cells.push({ id: `m${l.id}`, kind: 'pick', label: `Favourable or adverse, ${l.label.toLowerCase()}`, options: ['F', 'A'], answer: v.mark ?? 'F' });
      });
      cells.push(num('vp', 'Variance, profit', pv.amount, 'money', 0.5));
      cells.push({ id: 'mp', kind: 'pick', label: 'Favourable or adverse, profit', options: ['F', 'A'], answer: pv.mark });
      const rows = [
        ...lines.map((l) => ({ label: l.label, slots: [given(n0(l.budget)), given(n0(l.actual)), blank(`v${l.id}`), blank(`m${l.id}`)] })),
        { label: 'Profit (revenue − costs)', slots: [given(n0(bProfit)), given(n0(aProfit)), blank('vp'), blank('mp')], total: true },
      ];
      const byId = new Map(cells.map((c) => [c.id, c]));
      const show = (c: GridCell) => (c.kind === 'pick' ? `[${c.answer}]` : n0(c.exact));
      return {
        form: 'grid',
        business: firm,
        intro: `${firm} compares its budget for the quarter with the actual results. Fill in each variance as an amount, and mark it F (favourable) or A (adverse) by its effect on profit.`,
        tables: [],
        prompt: 'Complete the variance statement.',
        grid: { caption: `${firm}: budget and actual, last quarter ($, fictional, simulated)`, columns: ['', 'Budget', 'Actual', 'Variance', 'F or A'], rows },
        cells,
        solution: rows.map((rw) => rw.slots.map((sl) => ('text' in sl ? sl.text : show(byId.get(sl.cell) as GridCell)))),
        explanation: ['Variance = actual − budget, written as an amount and marked by its effect on profit: revenue above budget and costs below budget are favourable.', 'The layout follows the guide’s budget (figure 11, p. 63).'],
        answerText: `Profit variance ${usd(pv.amount)} [${pv.mark}]`,
        meaning: `Profit came in ${usd(pv.amount)} ${pv.mark === 'F' ? 'above' : 'below'} budget. Each line's variance shows where to look for the reason.`,
      };
    }
    throw new Error('Could not draw a budget');
  },
};

const buildDepreciation: TaskDef = {
  code: 'GDP',
  name: 'Complete a depreciation schedule',
  group: 'accounts',
  level: 'HL',
  marks: 3,
  task: 'build',
  make: (r) => {
    for (let tries = 0; tries < 200; tries++) {
      const firm = r.pick(['Pennick Furniture', 'Greywater Pumps', 'Oxlade Travel', 'Marrowby Hotels']);
      const asset = r.pick(['a delivery van', 'a kiln', 'a laser cutter', 'a minibus']);
      const life = r.int(3, 5);
      const cost = r.step(12000, 120000, 1000);
      const residual = Math.round((cost * r.step(0.05, 0.25, 0.05)) / 500) * 500;
      if ((cost - residual) % life !== 0) continue;
      const charge = (cost - residual) / life;
      const cells: GridCell[] = [];
      const rows: GridMade['grid']['rows'] = [];
      for (let y = 1; y <= life; y++) {
        cells.push(num(`d${y}`, `Depreciation, year ${y}`, charge, 'money', 0.5, [{ value: cost / life, message: 'The residual value was ignored. Spread cost minus residual value over the life.' }]));
        cells.push(num(`a${y}`, `Accumulated depreciation, end of year ${y}`, charge * y, 'money', 0.5, [{ value: charge, message: 'Accumulated depreciation adds every year’s charge so far.' }], y === 1 ? { op: 'copy', terms: ['d1'] } : { op: 'sum', terms: [`a${y - 1}`, `d${y}`] }));
        cells.push(num(`b${y}`, `Net book value, end of year ${y}`, cost - charge * y, 'money', 0.5, [{ value: cost - charge * y - residual, message: 'The residual value was taken off again.' }], { op: 'diff', terms: [cost, `a${y}`] }));
        rows.push({ label: `Year ${y}`, slots: [blank(`d${y}`), blank(`a${y}`), blank(`b${y}`)] });
      }
      const byId = new Map(cells.map((c) => [c.id, c]));
      return {
        form: 'grid',
        business: firm,
        intro: `${firm} bought ${asset} for ${usd(cost)}. It expects to use it for ${life} years and then sell it for ${usd(residual)}. It uses the straight line method.`,
        tables: [],
        prompt: 'Complete the depreciation schedule.',
        grid: { caption: `${firm}: depreciation of ${asset} ($, fictional, simulated)`, columns: ['', 'Depreciation for the year', 'Accumulated depreciation', 'Net book value'], rows },
        cells,
        solution: rows.map((rw) => rw.slots.map((sl) => ('text' in sl ? sl.text : n0((byId.get(sl.cell) as NumberCell).exact)))),
        explanation: [`Annual depreciation = (${usd(cost)} − ${usd(residual)}) ÷ ${life} = ${usd(charge)}.`, `Accumulated depreciation grows by ${usd(charge)} a year; net book value = cost − accumulated depreciation, reaching the residual value of ${usd(residual)} at the end of year ${life}.`],
        answerText: `${usd(charge)} a year; net book value ${usd(residual)} after ${life} years`,
        meaning: `The schedule ends at the residual value of ${usd(residual)}: a check that the yearly charge is right.`,
      };
    }
    throw new Error('Could not draw an asset');
  },
};

export const TASK_LIST: Array<[string, TaskDef]> = [
  ['slip-break-even', spotBreakEven],
  ['slip-ratio', spotRatio],
  ['slip-investment', spotInvestment],
  ['slip-cash-flow', spotCash],
  ['slip-hl', spotHl],
  ['read-cash-chart', readCashChart],
  ['read-ratio-table', readRatioTable],
  ['build-cash-flow', buildCashFlow],
  ['build-break-even', buildBreakEven],
  ['build-profit-loss', buildProfitLoss],
  ['build-variances', buildVariances],
  ['build-depreciation', buildDepreciation],
];

/* ------------------------------------------------------------------ */
/* Checking                                                            */
/* ------------------------------------------------------------------ */

export interface ChoiceFeedback {
  verdict: Verdict;
  chosen: string | null;
  headline: string;
  detail: string;
}

export function checkChoice(q: ChoiceQuestion, chosen: string | null): ChoiceFeedback {
  if (!chosen || !q.options.some((o) => o.id === chosen)) return { verdict: 'invalid', chosen: null, headline: 'Choose an answer.', detail: `Choose one of the ${q.options.length} options, then check.` };
  if (chosen === q.answer) return { verdict: 'right', chosen, headline: 'Right.', detail: q.explanation[0] ?? '' };
  return { verdict: 'wrong', chosen, headline: 'Not this one.', detail: `${q.why[chosen] ?? ''} The answer is ${q.answerText}.`.trim() };
}

export type CellVerdict = 'right' | 'own' | 'close' | 'wrong' | 'blank' | 'invalid';

export interface CellResult {
  id: string;
  verdict: CellVerdict;
  message: string;
}

export interface GridFeedback {
  verdict: Verdict;
  cells: CellResult[];
  /** Cells credited: right, or right on the reader's own earlier figures. */
  credited: number;
  total: number;
  /** Marks for the grid: its marks in proportion to the cells credited, rounded down. */
  earned: number;
  headline: string;
  detail: string;
}

/** A value worked from the reader's own cells by a cell's rule, or null when an input is missing. */
export function ownValue(rule: OwnRule, read: (id: string) => number | null): number | null {
  const vals = rule.terms.map((t) => (typeof t === 'number' ? t : read(t)));
  if (vals.some((v) => v === null)) return null;
  const xs = vals as number[];
  if (rule.op === 'copy') return xs[0] ?? null;
  if (rule.op === 'sum') return xs.reduce((s, x) => s + x, 0);
  return (xs[0] ?? 0) - xs.slice(1).reduce((s, x) => s + x, 0);
}

export function checkGrid(q: GridQuestion, values: Record<string, string>): GridFeedback {
  const read = (id: string): number | null => {
    const c = q.cells.find((x) => x.id === id);
    const raw = values[id] ?? '';
    if (!c || c.kind !== 'number') return null;
    return parseAnswer(raw, c.unit);
  };
  const results: CellResult[] = q.cells.map((c) => {
    const raw = (values[c.id] ?? '').trim();
    if (!raw) return { id: c.id, verdict: 'blank', message: 'Not filled in.' };
    if (c.kind === 'pick') {
      return raw.toUpperCase() === c.answer ? { id: c.id, verdict: 'right', message: 'Right.' } : { id: c.id, verdict: 'wrong', message: `It is ${c.answer === 'F' ? 'favourable' : 'adverse'}: judge it by its effect on profit.` };
    }
    const v = parseAnswer(raw, c.unit);
    if (v === null) return { id: c.id, verdict: 'invalid', message: 'Not a number.' };
    if (near(v, c.exact, c.tolerance)) return { id: c.id, verdict: 'right', message: 'Right.' };
    if (c.own) {
      const o = ownValue(c.own, read);
      if (o !== null && near(v, o, c.tolerance)) return { id: c.id, verdict: 'own', message: `Right on your own earlier figures (${fmtNumber(o, Number.isInteger(o) ? 0 : 2)}), so the method is credited; the figure itself should be ${fmtNumber(c.exact, Number.isInteger(c.exact) ? 0 : 2)}.` };
    }
    const slip = c.slips.find((s) => Number.isFinite(s.value) && near(v, s.value, Math.max(c.tolerance, 0.5)));
    return { id: c.id, verdict: slip?.close ? 'close' : 'wrong', message: slip ? slip.message : `It should be ${fmtNumber(c.exact, Number.isInteger(c.exact) ? 0 : 2)}.` };
  });
  const total = results.length;
  const credited = results.filter((x) => x.verdict === 'right' || x.verdict === 'own').length;
  const entered = results.filter((x) => x.verdict !== 'blank').length;
  const allRight = results.every((x) => x.verdict === 'right');
  const earned = Math.floor((q.marks * credited) / total + 1e-9);
  const verdict: Verdict = !entered ? 'invalid' : allRight ? 'right' : results.every((x) => x.verdict === 'right' || x.verdict === 'close') ? 'close' : 'wrong';
  const headline = verdict === 'invalid' ? 'Fill in the grid first.' : verdict === 'right' ? 'All right.' : verdict === 'close' ? 'Nearly.' : `${credited} of ${total} right.`;
  const own = results.filter((x) => x.verdict === 'own').length;
  const detail =
    verdict === 'invalid'
      ? 'Enter a figure in each empty cell, then check.'
      : verdict === 'right'
        ? `Every cell is right: ${q.marks} of ${q.marks} marks.`
        : `${credited} of ${total} cells credited${own ? `, ${own} of them on your own earlier figures` : ''}: ${earned} of ${q.marks} marks by the platform's rule. Each cell is marked in the grid.`;
  return { verdict, cells: results, credited, total, earned, headline, detail };
}
