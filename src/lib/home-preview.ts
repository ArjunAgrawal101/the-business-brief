/**
 * The home page's live break-even preview: the figures and the chart, from
 * the same tested functions the Finance Desk uses. Shared by the server
 * (the default state, for readers without JavaScript) and the browser.
 */
import { breakEvenExact, breakEvenRevenue, breakEvenUnits, contributionPerUnit, marginOfSafety, profit } from './finance';
import { fmtNumber } from './format';

export interface PreviewInputs {
  price: number;
  variableCost: number;
  fixedCosts: number;
  output: number;
}

export const PREVIEW_DEFAULTS: PreviewInputs = { price: 40, variableCost: 25, fixedCosts: 90000, output: 8000 };

export interface PreviewResult {
  ok: boolean;
  /** Why the figures cannot be worked, when they cannot. */
  problem?: string;
  contribution: number;
  breakEven: number | null;
  breakEvenRevenue: number | null;
  margin: number | null;
  profitAtOutput: number;
}

export function previewModel(i: PreviewInputs): PreviewResult {
  const contribution = contributionPerUnit(i.price, i.variableCost);
  const base = { contribution, profitAtOutput: profit(i.price, i.variableCost, i.fixedCosts, i.output) };
  if (![i.price, i.variableCost, i.fixedCosts, i.output].every((n) => Number.isFinite(n) && n >= 0)) {
    return { ok: false, problem: 'Enter numbers of zero or more in every box.', breakEven: null, breakEvenRevenue: null, margin: null, ...base };
  }
  if (!(contribution > 0)) {
    return { ok: false, problem: 'The price must be higher than the variable cost per unit, or no number of sales covers the fixed costs.', breakEven: null, breakEvenRevenue: null, margin: null, ...base };
  }
  return {
    ok: true,
    breakEven: breakEvenUnits(i.fixedCosts, i.price, i.variableCost),
    breakEvenRevenue: breakEvenRevenue(i.fixedCosts, i.price, i.variableCost),
    margin: marginOfSafety(i.output, i.fixedCosts, i.price, i.variableCost),
    ...base,
  };
}

const money = (n: number) => `${n < 0 ? '−' : ''}$${fmtNumber(Math.abs(n), 0)}`;

/** The chart as inline SVG: total revenue, total cost and fixed costs, with break-even and the chosen output marked. */
export function previewChart(i: PreviewInputs, id = 'hp'): string {
  const W = 520;
  const H = 300;
  const L = 64;
  const B = 252;
  const R = W - 18;
  const T = 18;
  const exact = breakEvenExact(i.fixedCosts, i.price, i.variableCost);
  const qMax = Math.max(1, Math.ceil(Math.max(exact ? exact * 1.8 : 0, i.output * 1.25, 10)));
  const yMax = Math.max(1, i.price * qMax, i.fixedCosts + i.variableCost * qMax);
  const x = (q: number) => L + (q / qMax) * (R - L);
  const y = (v: number) => B - (v / yMax) * (B - T);
  const tr = `M${x(0)},${y(0)} L${x(qMax)},${y(i.price * qMax)}`;
  const tc = `M${x(0)},${y(i.fixedCosts)} L${x(qMax)},${y(i.fixedCosts + i.variableCost * qMax)}`;
  const fc = `M${x(0)},${y(i.fixedCosts)} L${x(qMax)},${y(i.fixedCosts)}`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(qMax * f));
  const desc =
    exact === null
      ? 'Total revenue never reaches total cost, because each unit sells for no more than it costs to make.'
      : `Total revenue and total cost cross at ${fmtNumber(Math.ceil(exact - 1e-9), 0)} units, the break-even point; at ${fmtNumber(i.output, 0)} units the business makes ${money(profit(i.price, i.variableCost, i.fixedCosts, i.output))}.`;
  const be = exact !== null && exact <= qMax ? `<g class="hp-be"><line x1="${x(exact).toFixed(1)}" y1="${y(i.price * exact).toFixed(1)}" x2="${x(exact).toFixed(1)}" y2="${B}" /><circle cx="${x(exact).toFixed(1)}" cy="${y(i.price * exact).toFixed(1)}" r="5" /><text x="${(x(exact) + 8).toFixed(1)}" y="${(y(i.price * exact) - 8).toFixed(1)}">Break-even</text></g>` : '';
  const out = i.output <= qMax ? `<g class="hp-out"><line x1="${x(i.output).toFixed(1)}" y1="${T}" x2="${x(i.output).toFixed(1)}" y2="${B}" /><text x="${(x(i.output) + 6).toFixed(1)}" y="${T + 12}">Output</text></g>` : '';
  return `<svg class="hp-chart" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${id}-t ${id}-d"><title id="${id}-t">Break-even chart</title><desc id="${id}-d">${desc}</desc>
<g class="hp-axes"><line x1="${L}" y1="${B}" x2="${R}" y2="${B}" /><line x1="${L}" y1="${T}" x2="${L}" y2="${B}" /></g>
${ticks.map((t) => `<text class="hp-tick" x="${x(t).toFixed(1)}" y="${B + 18}" text-anchor="middle">${fmtNumber(t, 0)}</text>`).join('')}
<text class="hp-tick" x="${L - 8}" y="${B}" text-anchor="end">0</text><text class="hp-tick" x="${L - 8}" y="${T + 4}" text-anchor="end">${money(yMax)}</text>
<text class="hp-axis-label" x="${(L + R) / 2}" y="${H - 4}" text-anchor="middle">Output (units)</text>
<path class="hp-fc" d="${fc}" /><path class="hp-tc" d="${tc}" /><path class="hp-tr" d="${tr}" />${be}${out}
<g class="hp-key"><line x1="${L + 10}" y1="${T + 6}" x2="${L + 30}" y2="${T + 6}" class="hp-tr" /><text x="${L + 36}" y="${T + 10}">Total revenue</text><line x1="${L + 10}" y1="${T + 24}" x2="${L + 30}" y2="${T + 24}" class="hp-tc" /><text x="${L + 36}" y="${T + 28}">Total cost</text><line x1="${L + 10}" y1="${T + 42}" x2="${L + 30}" y2="${T + 42}" class="hp-fc" /><text x="${L + 36}" y="${T + 46}">Fixed costs</text></g>
</svg>`;
}

/** The result lines shown beside the chart. */
export function previewLines(i: PreviewInputs): Array<{ label: string; value: string }> {
  const m = previewModel(i);
  if (!m.ok) return [{ label: 'Check the inputs', value: m.problem ?? '' }];
  return [
    { label: 'Contribution per unit', value: `${money(i.price)} − ${money(i.variableCost)} = ${money(m.contribution)}` },
    { label: 'Break-even quantity', value: `${money(i.fixedCosts)} ÷ ${money(m.contribution)} = ${fmtNumber(m.breakEven ?? 0, 0)} units` },
    { label: 'Break-even revenue', value: money(m.breakEvenRevenue ?? 0) },
    { label: 'Margin of safety', value: `${fmtNumber(m.margin ?? 0, 0)} units` },
    { label: `Profit at ${fmtNumber(i.output, 0)} units`, value: money(m.profitAtOutput) },
  ];
}
