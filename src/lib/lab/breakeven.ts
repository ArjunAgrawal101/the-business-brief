/**
 * The lab's costs and break-even calculators: break-even quantity, break-even
 * revenue, margin of safety, contribution and output for a target profit.
 * Every figure comes from src/lib/finance.ts and src/lib/breakeven.ts, and the
 * chart is the platform's break-even chart (src/lib/charts.ts); this module
 * only chooses what to show and says what it means.
 */
import { breakEvenModel, type BreakEvenModel } from '../breakeven';
import { breakEvenSvg } from '../charts';
import {
  breakEvenRevenue,
  breakEvenUnits,
  buildWorking,
  contributionPerUnit,
  marginOfSafetyShare,
  marginOfSafetyValue,
  operatingLeverage,
  profit,
  targetPriceExact,
  targetProfitOutput,
  totalContribution,
  totalCost,
  totalRevenue,
  type Labels,
  type Working,
} from '../finance';
import { fmtNumber, round, roundUp } from '../format';
import { BREAK_EVEN } from './business';
import { contributionBarsSvg } from './charts';
import { BREAK_EVEN_FIELDS, fillLabel, validateFields } from './fields';
import type { ChartBlock, Figure, LabReport, Problem, Raw, SensitivityBlock, Settings, TableSpec, WorkingBlock } from './types';
import { count, money, money2, nudge, pct, signedPct, STEPS_10 } from './util';

export interface BreakEvenState {
  price: number;
  variableCost: number;
  fixedCosts: number;
  quantity: number;
  capacity: number;
  targetProfit: number;
  expectedSales: number;
}

export const BREAK_EVEN_DEFAULTS: BreakEvenState = { ...BREAK_EVEN };

export type BreakEvenId = 'break-even-quantity' | 'break-even-revenue' | 'margin-of-safety' | 'contribution' | 'target-profit';

export function validateBreakEven(id: BreakEvenId, raw: Raw): Problem[] {
  const problems = validateFields(raw, BREAK_EVEN_FIELDS[id] ?? []);
  const t = raw.targetProfit;
  const f = raw.fixedCosts;
  if (id === 'target-profit' && !problems.some((p) => p.field === 'targetProfit' || p.field === 'fixedCosts') && t !== null && t !== undefined && f !== null && f !== undefined && t < -f) {
    problems.push({ field: 'targetProfit', message: `A target loss larger than fixed costs is reached at zero output. Enter a target profit of ${fmtNumber(-f)} or more.` });
  }
  return problems;
}

/** The state the calculators work from, with any field a calculator does not use taken from the defaults. */
export function breakEvenState(raw: Raw): BreakEvenState {
  const v = (k: keyof BreakEvenState) => {
    const x = raw[k];
    return typeof x === 'number' && Number.isFinite(x) ? x : BREAK_EVEN_DEFAULTS[k];
  };
  return { price: v('price'), variableCost: v('variableCost'), fixedCosts: v('fixedCosts'), quantity: v('quantity'), capacity: v('capacity'), targetProfit: v('targetProfit'), expectedSales: v('expectedSales') };
}

const labels = (s: Settings): Labels => ({ unit: s.unit, units: s.units, period: s.period });

function model(st: BreakEvenState, forecast = st.quantity): BreakEvenModel {
  return breakEvenModel({ price: st.price, variableCost: st.variableCost, priceShare: 0, fixedCosts: st.fixedCosts, quantity: forecast, targetProfit: st.targetProfit, capacity: st.capacity });
}

function given(id: BreakEvenId, st: BreakEvenState, s: Settings) {
  return (BREAK_EVEN_FIELDS[id] ?? []).map((f) => {
    const v = st[f.key as keyof BreakEvenState];
    return { label: fillLabel(f.label, s), value: f.kind === 'money' ? money2(v, s.currency) : count(v, s) };
  });
}

function inputRows(id: BreakEvenId, st: BreakEvenState, s: Settings): Array<Array<string | number>> {
  return (BREAK_EVEN_FIELDS[id] ?? []).map((f) => ['Input', fillLabel(f.label, s), st[f.key as keyof BreakEvenState], f.kind === 'money' ? s.currency.trim() : s.units]);
}

/* ------------------------------------------------------------------ */
/* Shared parts                                                        */
/* ------------------------------------------------------------------ */

function chartBlock(id: string, m: BreakEvenModel, s: Settings, forecastLabel: string, target?: { output: number; profit: number }): ChartBlock {
  const i = m.inputs;
  const svg = breakEvenSvg(m, { currency: s.currency, unitsLabel: s.units, periodLabel: s.period, id: `lab-${id}-chart`, target });
  const points = new Map<number, string[]>();
  const add = (q: number, label: string) => points.set(q, [...(points.get(q) ?? []), label]);
  add(0, 'Zero output');
  if (m.beq !== null) add(m.beq, 'Break-even');
  if (i.quantity > 0) add(i.quantity, forecastLabel);
  if (target && target.output > 0) add(target.output, 'Target profit output');
  add(i.capacity, 'Capacity');
  const rows = [...points.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([q, names]) => {
      const tr = totalRevenue(i.price, q);
      const tc = totalCost(i.fixedCosts, m.unitVariableCost, q);
      return { th: names.join(' and '), cells: [count(q, s), money2(tr, s.currency), money2(tc, s.currency), money2(tr - tc, s.currency)] };
    });
  return {
    svg,
    caption: 'Total revenue (blue line), total cost (black line) and fixed costs (dashed line) against output. Left of the break-even point the gap between the lines is a loss; right of it, a profit. Drawn from the figures entered above.',
    table: { caption: 'The break-even chart’s figures', head: ['Point', 'Output', 'Total revenue', 'Total cost', 'Profit or loss'], rows },
  };
}

/** Break-even quantity or revenue when price and variable cost each change by 10 per cent. */
function priceCostGrid(st: BreakEvenState, s: Settings, what: 'quantity' | 'revenue'): SensitivityBlock {
  const cell = (p: number, v: number) => {
    if (what === 'quantity') {
      const q = breakEvenUnits(st.fixedCosts, p, v);
      return q === null ? 'None' : count(q, s);
    }
    const r = breakEvenRevenue(st.fixedCosts, p, v);
    return r === null ? 'None' : money2(r, s.currency);
  };
  const head = ['Selling price', ...STEPS_10.map((c) => `Variable cost ${c.label} (${money2(nudge(st.variableCost, c.k), s.currency)})`)];
  const rows = STEPS_10.map((r) => ({
    th: `Price ${r.label} (${money2(nudge(st.price, r.k), s.currency)})`,
    cells: STEPS_10.map((c) => cell(nudge(st.price, r.k), nudge(st.variableCost, c.k))),
    baseCell: r.k === 0 ? 1 : undefined,
  }));
  const value = (p: number, v: number) => (what === 'quantity' ? breakEvenUnits(st.fixedCosts, p, v) : breakEvenRevenue(st.fixedCosts, p, v));
  const base = value(st.price, st.variableCost);
  const lowPrice = value(nudge(st.price, -0.1), st.variableCost);
  const highCost = value(st.price, nudge(st.variableCost, 0.1));
  const show = (x: number) => (what === 'quantity' ? count(x, s) : money2(x, s.currency));
  let reading: string;
  if (base === null) {
    reading = 'At the figures entered there is no break-even point, because each unit does not cover its own variable cost. The cells that show a figure are the combinations of price and cost at which one would appear.';
  } else {
    const parts: string[] = [];
    parts.push(lowPrice === null ? 'A 10% cut in price would remove the break-even point altogether' : `A 10% cut in price moves break-even from ${show(base)} to ${show(lowPrice)} (${signedPct(base, lowPrice)})`);
    parts.push(highCost === null ? 'a 10% rise in variable cost would remove it altogether' : `a 10% rise in variable cost moves it to ${show(highCost)} (${signedPct(base, highCost)})`);
    const priceBigger = lowPrice === null || (highCost !== null && lowPrice - base > highCost - base);
    reading = `${parts.join('; ')}. ${priceBigger ? 'Break-even is more sensitive to price than to variable cost here, because a change in price moves contribution per unit by the whole change in price, and price is the larger of the two figures.' : 'Here a change in variable cost moves break-even as much as, or more than, a change in price.'} Both changes work through contribution per unit, the figure break-even divides by.`;
  }
  return {
    title: 'Price and variable cost, 10 per cent either way',
    intro: `Each cell is the ${what === 'quantity' ? 'break-even quantity' : 'break-even revenue'} if the selling price (rows) and the variable cost per unit (columns) change by 10 per cent, with fixed costs as entered. The middle cell is the figures as entered.`,
    table: { caption: `${what === 'quantity' ? 'Break-even quantity' : 'Break-even revenue'} by price and variable cost`, head, rows },
    reading,
  };
}

function sensitivityCsv(sb: SensitivityBlock): Array<Array<string | number>> {
  return sb.table.rows.flatMap((r) => r.cells.map((c, k) => ['Sensitivity', `${r.th}; ${sb.table.head[k + 1] ?? ''}`, c, '']));
}

const contributionWorking = (st: BreakEvenState, s: Settings): WorkingBlock => {
  const c = contributionPerUnit(st.price, st.variableCost);
  return {
    title: 'Contribution per unit',
    working: buildWorking('contribution-per-unit', { price: st.price, variableCost: st.variableCost }, s.currency, labels(s)),
    interpretation: c > 0 ? `Each ${s.unit} sold adds ${money2(c, s.currency)} towards the fixed costs and, once they are covered, to profit.` : `Each ${s.unit} sold adds nothing towards the fixed costs: its variable cost is at least its price.`,
    implication: c > 0 ? 'This is the figure the break-even calculations divide by: the larger it is, the fewer units are needed.' : 'Without a positive contribution there is no break-even point, so price or variable cost has to change first.',
  };
};

/* ------------------------------------------------------------------ */
/* Break-even quantity                                                 */
/* ------------------------------------------------------------------ */

const OPTIONS_NOTE = 'Options for a manager, not IB requirements; each has a cost or a risk to weigh.';
export { OPTIONS_NOTE };

function breakEvenActions(m: BreakEvenModel, s: Settings): string[] {
  const i = m.inputs;
  const out: string[] = [];
  if (!m.hasBreakEven) {
    out.push(`Raise the price or lower the variable cost per ${s.unit} before anything else: until each ${s.unit} covers its own variable cost, selling more only deepens the loss.`);
    out.push('Check whether the product should be sold at all at this price, or only alongside others whose contribution covers the fixed costs.');
    return out;
  }
  if (m.beqWithinCapacity === false) out.push(`Break-even is beyond capacity (${count(i.capacity, s)}): no amount of selling covers the fixed costs until capacity grows or the costs change.`);
  if (m.mos !== null && m.mos < 0) out.push(`Forecast sales are below break-even, so the business expects a loss: it needs more sales, a higher price or lower costs to reach ${count(m.beq ?? 0, s)}.`);
  out.push(`Raise the price, if customers will bear it: contribution per ${s.unit} rises, so fewer ${s.units} are needed. Check first how sales would respond, because break-even shows what must be sold, not what will be.`);
  out.push(`Lower the variable cost per ${s.unit}, for example with a cheaper supplier, bulk buying or less waste, while protecting quality.`);
  out.push('Reduce or delay fixed costs, such as a lease or a salary bill, which lowers break-even without changing any price.');
  return out;
}

export function buildBreakEvenQuantity(st: BreakEvenState, s: Settings): LabReport {
  const m = model(st);
  const L = labels(s);
  const c = m.contribution;
  const wB = buildWorking('break-even-quantity', { fixedCosts: st.fixedCosts, price: st.price, variableCost: st.variableCost }, s.currency, L);
  const share = m.beq !== null && st.capacity > 0 ? (m.beq / st.capacity) * 100 : null;
  const figures: Figure[] = [
    { label: `Contribution per ${s.unit}`, value: money2(c, s.currency) },
    { label: 'Break-even revenue', value: m.beRevenue === null ? 'None' : money2(m.beRevenue, s.currency) },
    { label: 'Forecast sales against break-even', value: m.mos === null ? 'n/a' : `${m.mos >= 0 ? '+' : '−'}${count(Math.abs(m.mos), s)}`, note: m.mos === null ? undefined : m.mos >= 0 ? 'above break-even: the margin of safety' : 'below break-even' },
    { label: 'Capacity needed to break even', value: share === null ? 'n/a' : pct(share), note: share === null ? undefined : `break-even ÷ capacity of ${fmtNumber(st.capacity)}` },
  ];
  const working: WorkingBlock[] = [
    contributionWorking(st, s),
    {
      title: 'Break-even quantity',
      working: wB,
      interpretation: m.beq === null ? 'There is no break-even point at these figures.' : `The business must sell ${count(m.beq, s)} a ${s.period} to cover all its costs.`,
      implication:
        m.beq === null
          ? 'Change the price or the variable cost first; fixed costs are not the problem.'
          : m.mos !== null && m.mos >= 0
            ? `Forecast sales of ${count(st.quantity, s)} are above break-even by ${count(m.mos, s)}.`
            : `Forecast sales of ${count(st.quantity, s)} fall short of break-even, so the business expects a loss.`,
    },
  ];
  const meaning =
    m.beq === null
      ? `Each ${s.unit} costs ${money2(st.variableCost, s.currency)} in variable costs, which is not less than its price of ${money2(st.price, s.currency)}, so contribution per ${s.unit} is ${money2(c, s.currency)}. No level of sales covers the fixed costs of ${money(st.fixedCosts, s.currency)}: selling more only adds to the loss.`
      : `Each ${s.unit} sold contributes ${money2(c, s.currency)} towards fixed costs of ${money(st.fixedCosts, s.currency)} a ${s.period}. The business must sell **${count(m.beq, s)}** a ${s.period} to cover all its costs; every ${s.unit} beyond that adds ${money2(c, s.currency)} to profit, and every ${s.unit} short of it leaves part of the fixed costs unpaid.`;
  const compare =
    m.beq === null
      ? 'Compare the price with what rivals charge and the variable cost with what other suppliers ask: one of them has to move before break-even analysis has an answer.'
      : `Compare the break-even quantity with forecast sales: at ${count(st.quantity, s)} the business is ${m.mos !== null && m.mos >= 0 ? `${count(m.mos, s)} above` : `${count(Math.abs(m.mos ?? 0), s)} below`} it. Compare it with capacity: break-even needs ${share === null ? 'n/a' : pct(share)} of the ${count(st.capacity, s)} that can be made${share !== null && share > 100 ? ', so it cannot be reached' : ''}. And compare it with earlier periods: a break-even quantity that rises over time means more sales are needed just to stand still.`;
  return {
    headline:
      m.beq === null || m.beqExact === null
        ? { label: 'Break-even quantity', value: 'No break-even point', note: `Each ${s.unit}’s variable cost is at least its price.` }
        : { label: 'Break-even quantity', value: `${count(m.beq, s)} a ${s.period}`, note: Math.abs(m.beqExact - Math.round(m.beqExact)) < 1e-9 ? 'exact: the division leaves no remainder' : `exactly ${fmtNumber(m.beqExact, 2)}, rounded up` },
    figures,
    workings: working,
    chart: chartBlock('break-even-quantity', m, s, 'Forecast'),
    sensitivity: priceCostGrid(st, s, 'quantity'),
    interpretation: {
      meaning,
      compare,
      benchmarks:
        'There is no ideal break-even quantity: it depends on how the business’s costs are built. A roaster or manufacturer with expensive equipment carries high fixed costs, so it breaks even at a high output but earns a large contribution on every unit beyond it. A business that pays mostly variable costs, such as a reseller that buys stock only when it has orders, breaks even sooner but gains less from each extra sale. The figure also moves over time, as suppliers’ prices, leases and selling prices change, so it is worth recalculating whenever one of them does.',
      actions: breakEvenActions(m, s),
    },
    given: given('break-even-quantity', st, s),
    announce: m.beq === null ? `No break-even point: contribution per ${s.unit} is ${money2(c, s.currency)}.` : `Break-even quantity ${count(m.beq, s)} a ${s.period}. Contribution per ${s.unit} ${money2(c, s.currency)}.`,
    csv: [
      ...inputRows('break-even-quantity', st, s),
      ['Result', `Contribution per ${s.unit}`, round(c, 4), `${s.currency.trim()} per ${s.unit}`],
      ['Result', 'Break-even quantity (exact)', m.beqExact === null ? 'none' : round(m.beqExact, 4), `${s.units} per ${s.period}`],
      ['Result', 'Break-even quantity (whole units, rounded up)', m.beq ?? 'none', `${s.units} per ${s.period}`],
      ['Result', 'Break-even revenue', m.beRevenue === null ? 'none' : round(m.beRevenue, 2), s.currency.trim()],
      ...sensitivityCsv(priceCostGrid(st, s, 'quantity')),
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Break-even revenue                                                  */
/* ------------------------------------------------------------------ */

export function buildBreakEvenRevenue(st: BreakEvenState, s: Settings): LabReport {
  const m = model(st);
  const L = labels(s);
  const c = m.contribution;
  const forecastRevenue = totalRevenue(st.price, st.quantity);
  const wholeRevenue = m.beq === null ? null : totalRevenue(st.price, m.beq);
  const ratio = st.price > 0 ? c / st.price : 0;
  const shareOfForecast = m.beRevenue !== null && forecastRevenue > 0 ? (m.beRevenue / forecastRevenue) * 100 : null;
  const enrichment: Working | null =
    m.beRevenue === null
      ? null
      : {
          given: [
            { label: `Fixed costs per ${s.period}`, value: money(st.fixedCosts, s.currency) },
            { label: `Contribution per ${s.unit}`, value: money2(c, s.currency) },
            { label: `Selling price per ${s.unit}`, value: money2(st.price, s.currency) },
          ],
          formula: 'Break-even revenue = total fixed costs ÷ (contribution per unit ÷ selling price per unit)',
          substitution: `= ${money(st.fixedCosts, s.currency)} ÷ (${money2(c, s.currency)} ÷ ${money2(st.price, s.currency)})`,
          steps: [`${fmtNumber(c, 2)} ÷ ${fmtNumber(st.price, 2)} = ${fmtNumber(ratio, 4)} of each ${s.currency.trim()}1 of sales`, `${fmtNumber(st.fixedCosts, 2)} ÷ ${fmtNumber(ratio, 4)} = ${fmtNumber(st.fixedCosts / ratio, 2)}`],
          answer: money2(st.fixedCosts / ratio, s.currency),
          value: round(st.fixedCosts / ratio, 2),
          unit: `${s.currency.trim()} per ${s.period}`,
          note: 'The same answer by another route: each unit of money taken in sales carries the same share of contribution, so fixed costs are divided by that share.',
        };
  const workings: WorkingBlock[] = [
    {
      title: 'Break-even revenue',
      working: buildWorking('break-even-revenue', { fixedCosts: st.fixedCosts, price: st.price, variableCost: st.variableCost }, s.currency, L),
      interpretation: m.beRevenue === null ? 'There is no break-even revenue at these figures.' : `Sales worth ${money2(m.beRevenue, s.currency)} a ${s.period} cover every cost.`,
      implication:
        m.beRevenue === null
          ? 'Contribution per unit has to become positive before any value of sales covers the fixed costs.'
          : `Using the whole-unit break-even quantity instead gives ${money2(wholeRevenue ?? 0, s.currency)}, the revenue from the first whole number of ${s.units} that makes no loss. Say which you used.`,
    },
  ];
  if (enrichment) {
    workings.push({
      title: 'A check by another route (enrichment)',
      working: enrichment,
      interpretation: `${pct(ratio * 100)} of every ${s.currency.trim()}1 of sales is contribution, so fixed costs are covered once sales reach ${money2(st.fixedCosts / ratio, s.currency)}.`,
      implication: 'This route needs no break-even quantity, which is why businesses that sell many products at different prices use it, with an average contribution share across the mix.',
      scope: 'enrichment',
    });
  }
  return {
    headline: m.beRevenue === null ? { label: 'Break-even revenue', value: 'No break-even point', note: `Each ${s.unit}’s variable cost is at least its price.` } : { label: 'Break-even revenue', value: `${money2(m.beRevenue, s.currency)} a ${s.period}`, note: m.beqExact === null ? undefined : `${fmtNumber(m.beqExact, 2)} ${s.units} at ${money2(st.price, s.currency)}` },
    figures: [
      { label: 'Break-even quantity, exact', value: m.beqExact === null ? 'None' : `${fmtNumber(m.beqExact, 2)} ${s.units}` },
      { label: 'Revenue at the whole-unit break-even', value: wholeRevenue === null ? 'None' : money2(wholeRevenue, s.currency), note: m.beq === null ? undefined : `${count(m.beq, s)} × ${money2(st.price, s.currency)}` },
      { label: 'Forecast sales revenue', value: money2(forecastRevenue, s.currency), note: `${count(st.quantity, s)} × ${money2(st.price, s.currency)}` },
      { label: 'Break-even as a share of forecast revenue', value: shareOfForecast === null ? 'n/a' : pct(shareOfForecast) },
      { label: 'Contribution as a share of the price', value: m.beRevenue === null ? 'n/a' : pct(ratio * 100), scope: 'enrichment', note: 'contribution per unit ÷ price' },
    ],
    workings,
    chart: chartBlock('break-even-revenue', m, s, 'Forecast'),
    sensitivity: priceCostGrid(st, s, 'revenue'),
    interpretation: {
      meaning:
        m.beRevenue === null
          ? `No value of sales covers the costs, because each ${s.unit} costs at least its price to make and sell.`
          : `Sales worth **${money2(m.beRevenue, s.currency)}** a ${s.period} cover all of the business’s costs: below that value it makes a loss, above it a profit. It is the break-even point measured in money rather than in ${s.units}.`,
      compare:
        m.beRevenue === null
          ? 'Compare the price and the variable cost with rivals’ and suppliers’ figures: one of them has to change.'
          : `Compare it with forecast sales revenue of ${money2(forecastRevenue, s.currency)}: break-even is ${shareOfForecast === null ? 'n/a' : pct(shareOfForecast)} of it${shareOfForecast !== null && shareOfForecast > 100 ? ', so the forecast is short of break-even' : ''}. Compare it with the same figure in earlier periods: a rising break-even revenue at an unchanged price means costs have risen.`,
      benchmarks:
        'A revenue target suits a business that tracks its sales in money, week by week in the till or the sales ledger, rather than in units. Like the break-even quantity, there is no ideal value; what matters is the distance between it and the sales the business can realistically make, and that distance shifts whenever prices or costs change. For a business with many products it needs an average contribution share across the whole range, which goes beyond the IB’s single-product model.',
      actions: breakEvenActions(m, s),
    },
    given: given('break-even-revenue', st, s),
    announce: m.beRevenue === null ? 'No break-even point at these figures.' : `Break-even revenue ${money2(m.beRevenue, s.currency)} a ${s.period}.`,
    csv: [
      ...inputRows('break-even-revenue', st, s),
      ['Result', 'Break-even revenue (exact break-even quantity)', m.beRevenue === null ? 'none' : round(m.beRevenue, 2), s.currency.trim()],
      ['Result', 'Revenue at the whole-unit break-even quantity', wholeRevenue === null ? 'none' : round(wholeRevenue, 2), s.currency.trim()],
      ['Result', 'Forecast sales revenue', round(forecastRevenue, 2), s.currency.trim()],
      ...sensitivityCsv(priceCostGrid(st, s, 'revenue')),
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Margin of safety                                                    */
/* ------------------------------------------------------------------ */

export function buildMarginOfSafety(st: BreakEvenState, s: Settings): LabReport {
  const m = model(st);
  const L = labels(s);
  const mos = m.mos;
  const share = mos === null ? null : marginOfSafetyShare(st.quantity, mos);
  const value = mos === null ? null : marginOfSafetyValue(mos, st.price);
  const tc = totalContribution(st.price, st.variableCost, st.quantity);
  const pr = profit(st.price, st.variableCost, st.fixedCosts, st.quantity);
  const dol = operatingLeverage(tc, pr);
  const workings: WorkingBlock[] = [
    {
      title: 'Margin of safety in units and as a share of sales',
      working: buildWorking('margin-of-safety', { fixedCosts: st.fixedCosts, price: st.price, variableCost: st.variableCost, quantity: st.quantity }, s.currency, L),
      interpretation: mos === null ? 'There is no margin of safety without a break-even point.' : mos >= 0 ? `Sales could fall by ${count(mos, s)} before the business makes a loss.` : `Forecast sales are ${count(Math.abs(mos), s)} short of break-even.`,
      implication: mos === null ? 'Contribution per unit has to become positive first.' : mos >= 0 ? `As a share of forecast sales, ${share === null ? 'n/a' : pct(share)} is the figure to compare across periods and businesses.` : 'The business expects a loss unless sales, prices or costs change.',
    },
  ];
  if (mos !== null && value !== null) {
    workings.push({
      title: 'Margin of safety in value (enrichment)',
      working: {
        given: [
          { label: 'Margin of safety', value: count(mos, s) },
          { label: `Selling price per ${s.unit}`, value: money2(st.price, s.currency) },
        ],
        formula: 'Margin of safety in value = margin of safety × selling price per unit',
        substitution: `= ${fmtNumber(mos)} × ${money2(st.price, s.currency)}`,
        steps: [`${fmtNumber(mos)} × ${fmtNumber(st.price, 2)} = ${fmtNumber(value, 2)}`],
        answer: money2(value, s.currency),
        value: round(value, 2),
        unit: `${s.currency.trim()} of sales per ${s.period}`,
        note: `Forecast revenue less exact break-even revenue gives ${money2(totalRevenue(st.price, st.quantity) - (m.beRevenue ?? 0), s.currency)}; the small difference comes from rounding break-even up to a whole ${s.unit}.`,
      },
      interpretation: value >= 0 ? `Sales revenue could fall by ${money2(value, s.currency)} before the business makes a loss.` : `Forecast sales revenue is ${money2(Math.abs(value), s.currency)} short of break-even.`,
      implication: 'A figure in money is easy to track against the sales ledger, but the guide’s margin of safety is in units.',
      scope: 'enrichment',
    });
  }
  if (dol !== null) {
    const after = profit(st.price, st.variableCost, st.fixedCosts, st.quantity * 0.9);
    workings.push({
      title: 'Degree of operating leverage (HL)',
      working: {
        given: [
          { label: `Total contribution at ${count(st.quantity, s)}`, value: money2(tc, s.currency) },
          { label: 'Profit at forecast sales', value: money2(pr, s.currency) },
        ],
        formula: 'Degree of operating leverage = total contribution ÷ profit',
        substitution: `= ${money2(tc, s.currency)} ÷ ${money2(pr, s.currency)}`,
        steps: [`${fmtNumber(tc, 2)} ÷ ${fmtNumber(pr, 2)} = ${fmtNumber(dol, 4)}`],
        answer: fmtNumber(dol, 2),
        value: round(dol, 2),
        unit: 'a multiple: the percentage change in profit for each 1% change in sales',
        note: 'The guide names operating leverage (5.6, HL) but gives no formula; this is the standard measure, as in the platform’s notes on 5.6.',
      },
      interpretation: `A 1% change in sales changes profit by about ${fmtNumber(dol, 2)}%: a 10% fall would cut profit from ${money2(pr, s.currency)} to ${money2(after, s.currency)}.`,
      implication: 'High operating leverage comes with high fixed costs and a thin margin of safety: profit grows fast when sales rise and falls fast when they drop.',
      scope: 'hl',
    });
  }
  // What a fall in sales does: the margin and the profit at each level.
  const changes = [-0.3, -0.2, -0.1, 0, 0.1];
  const sensRows = changes.map((k) => {
    const q = Math.round(st.quantity * (1 + k));
    const mq = m.beq === null ? null : q - m.beq;
    const p = profit(st.price, st.variableCost, st.fixedCosts, q);
    return { k, q, mq, p, row: { th: k === 0 ? 'Sales as forecast' : `Sales ${k > 0 ? '+' : '−'}${Math.abs(k * 100)}%`, cells: [count(q, s), mq === null ? 'n/a' : `${mq < 0 ? '−' : ''}${count(Math.abs(mq), s)}`, mq === null || q <= 0 ? 'n/a' : pct((mq / q) * 100), `${p < 0 ? 'Loss ' : 'Profit '}${money2(Math.abs(p), s.currency)}`], base: k === 0 } };
  });
  // The smallest fall in the table that brings a loss.
  const firstLoss = sensRows.filter((r) => r.p < 0 && r.k < 0).sort((x, y) => y.k - x.k)[0];
  const reading =
    mos === null
      ? 'With no break-even point, every level of sales in the table makes a loss.'
      : mos < 0
        ? `Even at forecast sales the business makes a loss; it would need sales of ${count(m.beq ?? 0, s)} to break even.`
        : `Profit turns into a loss once sales fall by more than ${share === null ? 'n/a' : pct(share)}${firstLoss ? `: at ${count(firstLoss.q, s)} (${signedPct(st.quantity, firstLoss.q, 0)}) the business loses ${money2(Math.abs(firstLoss.p), s.currency)}` : ', a fall larger than any in the table'}. Compare that cushion with how much sales have varied in the past.`;
  const sensitivity: SensitivityBlock = {
    title: 'What a fall in sales does',
    intro: 'The margin of safety and the profit or loss if sales come in above or below the forecast, with price and costs as entered.',
    table: { caption: 'Margin of safety and profit at different levels of sales', head: ['Change in sales', 'Sales', 'Margin of safety', 'Share of sales', 'Profit or loss'], rows: sensRows.map((r) => r.row) },
    reading,
  };
  const actions = breakEvenActions(m, s).slice(0, 2);
  if (mos !== null && mos >= 0) {
    actions.unshift(`Widen the cushion by lowering break-even (a higher price, a lower variable cost or lower fixed costs) or by securing sales, for example with longer contracts from regular customers.`);
    actions.push('Plan for a bad period in advance: know which costs could be cut quickly and which sales could be won back if demand falls.');
  }
  if (dol !== null && dol > 4) actions.push('With high operating leverage, consider turning some fixed costs into variable ones, such as leasing equipment by use or paying part of staff costs by output, if demand is unsteady.');
  return {
    headline:
      mos === null
        ? { label: 'Margin of safety', value: 'Not defined', note: 'There is no break-even point.' }
        : { label: 'Margin of safety', value: `${mos < 0 ? '−' : ''}${count(Math.abs(mos), s)}`, note: share === null ? undefined : mos >= 0 ? `${pct(share)} of forecast sales` : 'Forecast sales are below break-even.' },
    figures: [
      { label: 'Margin of safety in value', value: value === null ? 'n/a' : money2(value, s.currency), scope: 'enrichment' },
      { label: 'Break-even quantity', value: m.beq === null ? 'None' : count(m.beq, s) },
      { label: pr >= 0 ? 'Profit at forecast sales' : 'Loss at forecast sales', value: money2(Math.abs(pr), s.currency) },
      { label: 'Degree of operating leverage', value: dol === null ? 'n/a' : fmtNumber(dol, 2), scope: 'hl', note: dol === null ? 'not meaningful at or below break-even' : 'total contribution ÷ profit' },
    ],
    workings,
    chart: chartBlock('margin-of-safety', m, s, 'Forecast'),
    sensitivity,
    interpretation: {
      meaning:
        mos === null
          ? 'Without a break-even point there is no margin of safety: the business makes a loss at every level of sales.'
          : mos >= 0
            ? `Sales could fall by **${count(mos, s)}** a ${s.period}, ${share === null ? '' : `${pct(share)} of the forecast, `}before the business makes a loss. The figure is only as reliable as the sales forecast it starts from.`
            : `Forecast sales of ${count(st.quantity, s)} are **${count(Math.abs(mos), s)} short** of the break-even quantity of ${count(m.beq ?? 0, s)}, so the business expects a loss of ${money2(Math.abs(pr), s.currency)} a ${s.period}.`,
      compare: `Compare the margin as a percentage, because it is comparable across businesses of different sizes: ${count(Math.abs(mos ?? 0), s)} is a large cushion for a business selling a few hundred and a thin one for a business selling tens of thousands. Compare it with how far sales have swung in the past: if sales have varied by more than ${share === null ? 'the margin' : pct(Math.abs(share))} from one ${s.period} to the next, the cushion may not be enough.`,
      benchmarks:
        'A business with steady, contracted demand, such as a supplier with long-term customers, can run safely with a small margin of safety; one with seasonal or uncertain demand, such as a tourist business or a fashion brand, needs a larger one. The margin moves whenever prices, costs or the forecast change, and new competition or a change in tastes can erode it within a single season.',
      actions,
    },
    given: given('margin-of-safety', st, s),
    announce: mos === null ? 'Margin of safety not defined: there is no break-even point.' : `Margin of safety ${mos < 0 ? 'minus ' : ''}${count(Math.abs(mos), s)}${share === null ? '' : `, ${pct(share)} of forecast sales`}.`,
    csv: [
      ...inputRows('margin-of-safety', st, s),
      ['Result', 'Break-even quantity (whole units)', m.beq ?? 'none', s.units],
      ['Result', 'Margin of safety', mos ?? 'none', s.units],
      ['Result', 'Margin of safety as a share of forecast sales', share === null ? 'n/a' : round(share, 4), '%'],
      ['Result (enrichment)', 'Margin of safety in value', value === null ? 'n/a' : round(value, 2), s.currency.trim()],
      ['Result', 'Profit at forecast sales', round(pr, 2), s.currency.trim()],
      ['Result (HL)', 'Degree of operating leverage', dol === null ? 'n/a' : round(dol, 4), 'multiple'],
      ...sensRows.map((r) => ['Sensitivity', r.row.th, r.q, `${s.units}; profit ${round(r.p, 2)}`]),
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Contribution                                                        */
/* ------------------------------------------------------------------ */

export function buildContribution(st: BreakEvenState, s: Settings): LabReport {
  const m = model(st);
  const L = labels(s);
  const c = contributionPerUnit(st.price, st.variableCost);
  const tcon = totalContribution(st.price, st.variableCost, st.quantity);
  const pr = profit(st.price, st.variableCost, st.fixedCosts, st.quantity);
  const profitWorking: Working = {
    given: [
      { label: 'Total contribution', value: money2(tcon, s.currency) },
      { label: `Fixed costs per ${s.period}`, value: money(st.fixedCosts, s.currency) },
    ],
    formula: 'Profit = total contribution − total fixed costs',
    substitution: `= ${money2(tcon, s.currency)} − ${money(st.fixedCosts, s.currency)}`,
    steps: [`${fmtNumber(tcon, 2)} − ${fmtNumber(st.fixedCosts, 2)} = ${fmtNumber(pr, 2)}`],
    answer: money2(pr, s.currency),
    value: round(pr, 2),
    unit: `${s.currency.trim()} per ${s.period}`,
    note: pr < 0 ? 'A negative figure is a loss: total contribution does not cover the fixed costs.' : 'The same as total revenue − total cost, worked through contribution.',
  };
  const rowsDef = [
    { th: 'As entered', p: st.price, v: st.variableCost, q: st.quantity, base: true },
    { th: 'Price −10%', p: nudge(st.price, -0.1), v: st.variableCost, q: st.quantity },
    { th: 'Price +10%', p: nudge(st.price, 0.1), v: st.variableCost, q: st.quantity },
    { th: 'Variable cost −10%', p: st.price, v: nudge(st.variableCost, -0.1), q: st.quantity },
    { th: 'Variable cost +10%', p: st.price, v: nudge(st.variableCost, 0.1), q: st.quantity },
    { th: 'Sales −10%', p: st.price, v: st.variableCost, q: Math.round(st.quantity * 0.9) },
    { th: 'Sales +10%', p: st.price, v: st.variableCost, q: Math.round(st.quantity * 1.1) },
  ];
  const sens = rowsDef.map((r) => {
    const cu = contributionPerUnit(r.p, r.v);
    const tc = totalContribution(r.p, r.v, r.q);
    const p = profit(r.p, r.v, st.fixedCosts, r.q);
    return { ...r, cu, tc, pr: p, row: { th: r.th, cells: [money2(cu, s.currency), money2(tc, s.currency), money2(p, s.currency), r.base ? 'as entered' : signedPct(pr, p)], base: r.base } };
  });
  const priceDown = sens[1];
  const profitEffect = (from: number, to: number) => (to < 0 ? `turns the profit of ${money2(from, s.currency)} into a loss of ${money2(-to, s.currency)}` : `cuts profit by ${signedPct(from, to).replace('−', '')}, to ${money2(to, s.currency)}`);
  const reading =
    pr > 0 && priceDown && c > 0
      ? `A 10% cut in price reduces contribution per ${s.unit} by ${signedPct(c, priceDown.cu).replace('−', '')}, from ${money2(c, s.currency)} to ${money2(priceDown.cu, s.currency)}, and ${profitEffect(pr, priceDown.pr)}. A small change in price is a large change in contribution, because the whole change falls on the slice of the price left after variable cost.`
      : 'At these figures the business makes a loss or breaks even, so the percentage changes in profit are not meaningful; compare the profit column instead.';
  return {
    headline: { label: `Contribution per ${s.unit}`, value: money2(c, s.currency), note: `Total contribution ${money2(tcon, s.currency)} from ${count(st.quantity, s)}` },
    figures: [
      { label: 'Contribution as a share of the price', value: st.price > 0 ? pct((c / st.price) * 100) : 'n/a', scope: 'enrichment' },
      { label: 'Total contribution', value: money2(tcon, s.currency), note: `${count(st.quantity, s)} × ${money2(c, s.currency)}` },
      { label: `Fixed costs per ${s.period}`, value: money(st.fixedCosts, s.currency) },
      { label: pr >= 0 ? 'Profit' : 'Loss', value: money2(Math.abs(pr), s.currency), note: 'total contribution − fixed costs' },
      { label: 'Break-even quantity', value: m.beq === null ? 'None' : count(m.beq, s) },
    ],
    workings: [
      contributionWorking(st, s),
      {
        title: 'Total contribution',
        working: buildWorking('total-contribution', { price: st.price, variableCost: st.variableCost, quantity: st.quantity }, s.currency, L),
        interpretation: `The ${count(st.quantity, s)} sold contribute ${money2(tcon, s.currency)} a ${s.period} towards fixed costs and profit.`,
        implication: 'Total contribution is the figure to compare with fixed costs: the difference is the profit or the loss.',
      },
      {
        title: 'Profit from contribution',
        working: profitWorking,
        interpretation: pr >= 0 ? `Contribution covers the fixed costs and leaves a profit of ${money2(pr, s.currency)}.` : `Contribution falls ${money2(Math.abs(pr), s.currency)} short of the fixed costs.`,
        implication: 'Any decision can be judged by what it does to total contribution, because fixed costs do not change with it in the short run.',
      },
    ],
    chart: {
      svg: contributionBarsSvg({ price: st.price, variableCost: st.variableCost, quantity: st.quantity, fixedCosts: st.fixedCosts, currency: s.currency, unit: s.unit, units: s.units, id: 'lab-contribution-chart' }),
      caption: `Top: where each ${s.unit}’s price goes, to its variable cost and its contribution. Bottom: what total contribution covers, the fixed costs and then profit (or how far it falls short of them).`,
      table: {
        caption: 'The chart’s figures',
        head: ['Bar', 'Part', 'Amount'],
        rows: [
          { th: `One ${s.unit}`, cells: ['Variable cost', money2(st.variableCost, s.currency)] },
          { th: `One ${s.unit}`, cells: ['Contribution', money2(c, s.currency)] },
          { th: `All ${s.units} sold`, cells: ['Fixed costs', money(st.fixedCosts, s.currency)] },
          { th: `All ${s.units} sold`, cells: [pr >= 0 ? 'Profit' : 'Shortfall (loss)', money2(Math.abs(pr), s.currency)] },
        ],
        numeric: [false, false, true],
      },
    },
    sensitivity: {
      title: 'Price, variable cost and sales, 10 per cent either way',
      intro: 'Contribution and profit when one figure changes by 10 per cent and the others stay as entered.',
      table: { caption: 'Contribution and profit when one figure changes', head: ['Change', `Contribution per ${s.unit}`, 'Total contribution', 'Profit or loss', 'Change in profit'], rows: sens.map((r) => r.row) },
      reading,
    },
    interpretation: {
      meaning:
        c > 0
          ? `Each ${s.unit} adds **${money2(c, s.currency)}**${st.price > 0 ? `, ${pct((c / st.price) * 100)} of its price,` : ''} towards fixed costs and then profit. ${count(st.quantity, s)} contribute ${money2(tcon, s.currency)}, which ${pr >= 0 ? `covers the ${money(st.fixedCosts, s.currency)} of fixed costs and leaves a profit of ${money2(pr, s.currency)}` : `falls ${money2(Math.abs(pr), s.currency)} short of the ${money(st.fixedCosts, s.currency)} of fixed costs`}.`
          : `Each ${s.unit} costs at least its price in variable costs, so it contributes nothing towards fixed costs: total contribution is ${money2(tcon, s.currency)} and the loss is ${money2(Math.abs(pr), s.currency)}.`,
      compare: 'Compare contribution per unit between products, or before and after a change in price or cost, to see which earns most from each sale. Compare total contribution with fixed costs: the gap is the profit or the loss. At HL, contribution is also how a special order or a make-or-buy choice is judged (contribution costing, a toolkit item in the guide).',
      benchmarks:
        'Contribution per unit varies widely between industries. A business selling a specialist or branded product may keep most of its price as contribution, while a reseller of standard goods keeps a thin slice and relies on volume. Neither is better in itself: a thin contribution needs high sales to cover fixed costs, a large one needs fewer. It also shifts over time, as suppliers’ prices and selling prices move, which is how a rise in an input price can turn a profit into a loss with no fall in sales.',
      actions: [
        `Raise contribution per ${s.unit}: a higher price, if customers will accept it, or a lower variable cost through cheaper or better-used inputs.`,
        'Sell more units: total contribution rises with every sale while fixed costs stay put.',
        'Change the mix towards products with a larger contribution per unit, if customers want them.',
        'Reduce fixed costs, which turns more of the same total contribution into profit.',
      ],
    },
    given: given('contribution', st, s),
    announce: `Contribution per ${s.unit} ${money2(c, s.currency)}. Total contribution ${money2(tcon, s.currency)}. ${pr >= 0 ? 'Profit' : 'Loss'} ${money2(Math.abs(pr), s.currency)}.`,
    csv: [
      ...inputRows('contribution', st, s),
      ['Result', `Contribution per ${s.unit}`, round(c, 4), s.currency.trim()],
      ['Result', 'Total contribution', round(tcon, 2), s.currency.trim()],
      ['Result', 'Profit or loss', round(pr, 2), s.currency.trim()],
      ...sens.map((r) => ['Sensitivity', r.th, round(r.pr, 2), `${s.currency.trim()} profit; contribution per unit ${round(r.cu, 4)}`]),
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Output for a target profit                                          */
/* ------------------------------------------------------------------ */

export function buildTargetProfit(st: BreakEvenState, s: Settings): LabReport {
  const L = labels(s);
  const m = model(st, st.expectedSales);
  const c = contributionPerUnit(st.price, st.variableCost);
  const output = targetProfitOutput(st.fixedCosts, st.targetProfit, st.price, st.variableCost);
  const out = output === null ? null : Math.max(0, output);
  const wPrice = buildWorking('target-price', { fixedCosts: st.fixedCosts, targetProfit: st.targetProfit, variableCost: st.variableCost, quantity: st.expectedSales }, s.currency, L);
  const price = wPrice.value;
  const within = out === null ? null : out <= st.capacity;
  const capShare = out === null ? null : (out / st.capacity) * 100;
  const profitAtExpected = profit(st.price, st.variableCost, st.fixedCosts, st.expectedSales);
  const targets = st.targetProfit > 0 ? [0, 0.5, 1, 1.5, 2].map((k) => round(st.targetProfit * k, 2)) : [st.targetProfit, 0, 0.1, 0.2, 0.3].map((k, idx) => (idx < 2 ? k : round(st.fixedCosts * k, 2)));
  const uniq = [...new Set(targets)].sort((a, b) => a - b);
  const sensRows = uniq.map((t) => {
    const o = targetProfitOutput(st.fixedCosts, t, st.price, st.variableCost);
    const oo = o === null ? null : Math.max(0, o);
    const exact = targetPriceExact(st.fixedCosts, t, st.variableCost, st.expectedSales);
    const tp = exact === null ? null : roundUp(exact, 2);
    return { t, o: oo, tp, row: { th: t === 0 ? `${money(0, s.currency)} (break-even)` : money(t, s.currency), cells: [oo === null ? 'Not possible' : count(oo, s), oo === null ? 'n/a' : oo <= st.capacity ? `Yes (${pct((oo / st.capacity) * 100)})` : `No (${pct((oo / st.capacity) * 100)})`, tp === null ? 'n/a' : money2(tp, s.currency)], base: Math.abs(t - st.targetProfit) < 0.005 } };
  });
  const maxProfit = profit(st.price, st.variableCost, st.fixedCosts, st.capacity);
  const reading =
    c <= 0
      ? `With contribution per ${s.unit} at ${money2(c, s.currency)}, no output reaches any target; only the target price column has an answer.`
      : `At ${money2(st.price, s.currency)} the most the business can earn is ${money2(maxProfit, s.currency)} a ${s.period}, at full capacity of ${count(st.capacity, s)}. Any target above that needs a higher price, lower costs or more capacity, however hard it sells.`;
  const actions: string[] = [];
  if (out !== null && within === false) actions.push(`The target needs ${count(out, s)}, more than the ${count(st.capacity, s)} that can be made: lower the target, raise contribution per ${s.unit}, or plan for more capacity.`);
  if (out !== null && out > st.expectedSales) actions.push(`The target needs ${count(out - st.expectedSales, s)} more than expected sales: find out whether marketing, new customers or a new channel could realistically win them.`);
  if (price !== null && price > st.price) actions.push(`The price route needs ${money2(price, s.currency)}, ${signedPct(st.price, price)} on today’s price: test whether customers would still buy ${count(st.expectedSales, s)} at that price, since a higher price usually sells less.`);
  actions.push('Combine routes: a smaller price rise with a modest gain in sales, or a cost saving, may reach the same target with less risk than either route alone.');
  return {
    headline: out === null ? { label: 'Output for the target profit', value: 'Not possible', note: `Contribution per ${s.unit} is not positive.` } : { label: 'Output for the target profit', value: `${count(out, s)} a ${s.period}`, note: output !== null && output < 0 ? 'the target is met at zero output' : `for a profit of ${money(st.targetProfit, s.currency)}; ${within ? 'within capacity' : 'above capacity'}` },
    figures: [
      { label: 'Within capacity?', value: within === null ? 'n/a' : within ? 'Yes' : 'No', note: capShare === null ? undefined : `${pct(capShare)} of ${count(st.capacity, s)}` },
      { label: 'Gap to expected sales', value: out === null ? 'n/a' : `${out - st.expectedSales >= 0 ? '+' : '−'}${count(Math.abs(out - st.expectedSales), s)}`, note: `expected sales ${count(st.expectedSales, s)}` },
      { label: `Target price at ${count(st.expectedSales, s)}`, value: price === null ? 'n/a' : money2(price, s.currency), note: price === null ? undefined : `${signedPct(st.price, price)} on ${money2(st.price, s.currency)}` },
      { label: 'Profit at expected sales and today’s price', value: money2(profitAtExpected, s.currency) },
    ],
    workings: [
      {
        title: 'Target profit output',
        working: buildWorking('target-profit-output', { fixedCosts: st.fixedCosts, targetProfit: st.targetProfit, price: st.price, variableCost: st.variableCost }, s.currency, L),
        interpretation: out === null ? 'No output reaches the target at this price and variable cost.' : `At ${money2(st.price, s.currency)} the business must sell ${count(out, s)} a ${s.period} to make ${money(st.targetProfit, s.currency)}.`,
        implication: out === null ? 'Contribution per unit has to become positive first.' : within ? `That is within capacity (${pct(capShare ?? 0)} of it); the question is whether the market will buy it.` : 'That is beyond capacity, so the target cannot be met by selling more alone.',
      },
      {
        title: 'Target price at expected sales',
        working: wPrice,
        interpretation: price === null ? 'The target price needs expected sales above zero.' : `If sales stay at ${count(st.expectedSales, s)}, the business would need to charge ${money2(price, s.currency)} a ${s.unit}.`,
        implication: 'The answer assumes sales do not fall at the higher price. If they would, the price that meets the target is higher still, or the target is out of reach.',
      },
    ],
    chart: chartBlock('target-profit', m, s, 'Expected sales', out === null || out <= 0 ? undefined : { output: out, profit: profit(st.price, st.variableCost, st.fixedCosts, out) }),
    sensitivity: {
      title: 'A table of targets',
      intro: `The output needed, whether it fits within capacity, and the target price at expected sales of ${count(st.expectedSales, s)}, for a range of target profits.`,
      table: { caption: 'Output and price for each target profit', head: ['Target profit', 'Output needed', 'Within capacity?', 'Target price'], rows: sensRows.map((r) => r.row) },
      reading,
    },
    interpretation: {
      meaning:
        out === null
          ? `At a price of ${money2(st.price, s.currency)} each ${s.unit} adds nothing towards fixed costs, so no output earns any profit; the target can only be reached by raising the price${price === null ? '' : ` to at least ${money2(price, s.currency)} at expected sales`}.`
          : `To earn **${money(st.targetProfit, s.currency)}** a ${s.period} at ${money2(st.price, s.currency)} a ${s.unit}, the business must sell **${count(out, s)}**: ${out >= st.expectedSales ? `${count(out - st.expectedSales, s)} more than` : `${count(st.expectedSales - out, s)} fewer than`} the ${count(st.expectedSales, s)} it expects. Or, if sales stay at ${count(st.expectedSales, s)}, it would need to charge ${price === null ? 'n/a' : money2(price, s.currency)}.`,
      compare: 'Compare the target output with capacity, with past sales and with what market research suggests customers will buy. Compare the target price with competitors’ prices and with what customers have paid before. A target is a plan only if both comparisons hold.',
      benchmarks:
        'What counts as a realistic target depends on the market. A business in a growing market may win extra sales with modest marketing; one in a mature market usually has to take them from rivals, which costs more. Customers of a premium or specialist product may accept a higher price, while customers of a standard product often switch at the first rise. Targets also need revisiting as costs change: the same profit needs more output after a supplier raises its prices.',
      actions,
    },
    given: given('target-profit', st, s),
    announce: out === null ? 'No output reaches the target: contribution per unit is not positive.' : `Target profit output ${count(out, s)} a ${s.period}. Target price ${price === null ? 'not available' : money2(price, s.currency)}.`,
    csv: [
      ...inputRows('target-profit', st, s),
      ['Result', 'Target profit output (rounded up)', out ?? 'not possible', s.units],
      ['Result', 'Target price at expected sales (rounded up to the cent)', price ?? 'n/a', s.currency.trim()],
      ['Result', 'Within capacity', within === null ? 'n/a' : within ? 'yes' : 'no', ''],
      ...sensRows.map((r) => ['Sensitivity', `Target profit ${r.t}`, r.o ?? 'not possible', `${s.units}; target price ${r.tp ?? 'n/a'}`]),
    ],
  };
}

export const BREAK_EVEN_BUILDERS: Record<BreakEvenId, (st: BreakEvenState, s: Settings) => LabReport> = {
  'break-even-quantity': buildBreakEvenQuantity,
  'break-even-revenue': buildBreakEvenRevenue,
  'margin-of-safety': buildMarginOfSafety,
  contribution: buildContribution,
  'target-profit': buildTargetProfit,
};

/** The table spec is exported for the tests. */
export type { TableSpec };
