/**
 * HTML fragments for the executive simulation, shared by the server (the
 * brief, the evidence, the worked example and its debrief) and the browser
 * (the learner's own years and debrief), so the two can never show different
 * figures or words. The dashboard reuses the Boardroom's tiles, sparklines and
 * statement styles. Every piece of content text passes through esc(),
 * inline() or rich().
 */
import { esc, inline, rich } from '../markup';
import { fmtNumber } from '../format';
import { describeSeries, sparkline } from '../boardroom/charts';
import { thousands } from '../boardroom/view';
import type { KpiId, State, YearResult } from './engine';
import { barsSvg } from './charts';
import { fmtKpi, fmtMoneyCompact, kpiChange, kpiUnit, KPI_DEFS, type Area } from './kpis';
import { AREA_LABELS, describeLevers, explainYear, type NarrateContext } from './narrate';
import type { Attribution, GoalResult, LeverProblem, PlanSummary } from './sim';
import type { Levers, Rules } from './schema';
import { BUDGET_LEVERS, LEVER_HINTS, LEVER_IDS, LEVER_LABELS, ROLE_TITLES, type LeverId, type RoleId } from './roles';

type H = 2 | 3 | 4 | 5 | 6;
const h = (level: number) => `h${Math.min(6, Math.max(2, level))}` as `h${H}`;

/* ------------------------------------------------------------------ */
/* The dashboard                                                       */
/* ------------------------------------------------------------------ */

/**
 * KPI tiles: the latest value, its change on the year before in figures and
 * words, and a sparkline over every year so far. `split` is the index of the
 * first plan year (the history is drawn lighter).
 */
export function kpiTiles(years: YearResult[], ids: KpiId[], pinned: KpiId[], ctx: NarrateContext, idPrefix: string, split: number): string {
  const now = years[years.length - 1];
  const prev = years[years.length - 2];
  if (!now) return '';
  const labels = years.map((y) => y.label);
  const tiles = ids.map((id) => {
    const def = KPI_DEFS[id];
    const values = years.map((y) => y.kpis[id]);
    const fmt = (v: number) => fmtKpi(id, v, ctx);
    const change = prev ? kpiChange(id, prev.kpis[id], now.kpis[id], ctx) : undefined;
    const mine = pinned.includes(id);
    const unit = kpiUnit(id, ctx);
    const spark = sparkline(values, {
      id: `${idPrefix}-${id}`,
      title: `${def.label}, ${labels[0]} to ${labels[labels.length - 1]}`,
      desc: describeSeries(def.label, labels, values, fmt),
      split: split > 0 && split < values.length ? split : undefined,
    });
    return `<li class="bb-kpi${mine ? ' is-pinned' : ''}" data-kpi="${id}">
<p class="bb-kpi__label">${esc(def.short)}${mine ? '<span class="bb-kpi__mine">Your measure</span>' : ''}</p>
<p class="bb-kpi__value">${esc(fmt(now.kpis[id]))}${unit ? `<span class="bb-kpi__unit">${esc(unit)}</span>` : ''}</p>
<p class="bb-kpi__change bb-kpi__change--${change?.verdict ?? 'same'}">${
      change && prev
        ? `<span class="sr-only">Change from ${esc(prev.label)}: </span>${change.verdict === 'same' ? 'No change' : `<span class="num">${esc(change.text)}</span> <span class="bb-kpi__word">${esc(change.words)}</span>`}`
        : '<span class="bb-kpi__word">Starting position</span>'
    }</p>
${spark}
</li>`;
  });
  const cols = ids.length >= 6 ? Math.ceil(ids.length / 2) : ids.length;
  return `<ul class="bb-kpis" role="list" style="--cols:${cols}">${tiles.join('')}</ul>`;
}

/** Every measure for every year so far, as a table: the figures behind the tiles. */
export function figuresTable(years: YearResult[], ids: KpiId[], ctx: NarrateContext, caption: string, split: number): string {
  const head = years.map((y, i) => `<th scope="col" class="n${i >= split ? ' is-round' : ''}${i === years.length - 1 ? ' is-current' : ''}">${esc(y.label)}</th>`).join('');
  const body = ids
    .map((id) => {
      const unit = kpiUnit(id, ctx);
      return `<tr><th scope="row">${esc(KPI_DEFS[id].label)}${unit ? ` <span class="bb-unit">(${esc(unit)})</span>` : ''}</th>${years
        .map((y, i) => `<td class="n${i >= split ? ' is-round' : ''}${i === years.length - 1 ? ' is-current' : ''}">${esc(fmtKpi(id, y.kpis[id], ctx))}</td>`)
        .join('')}</tr>`;
    })
    .join('');
  return `<div class="table-scroll" role="region" aria-label="${esc(caption)}" tabindex="0"><table class="table bb-figures"><caption class="sr-only">${esc(caption)}</caption><thead><tr><th scope="col">Measure</th>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/* ------------------------------------------------------------------ */
/* Statements                                                          */
/* ------------------------------------------------------------------ */

export interface StatementRow {
  key: string;
  label: string;
  kind?: 'item' | 'subtotal' | 'total' | 'heading';
  indent?: boolean;
  /** Left out when it is zero in every column. */
  optional?: boolean;
}

export interface StatementColumn {
  label: string;
  values: Record<string, number>;
}

export const PL_ROWS: StatementRow[] = [
  { key: 'revenue', label: 'Sales revenue' },
  { key: 'homeRevenue', label: 'of which at home', indent: true, optional: true },
  { key: 'exportRevenue', label: 'of which exports', indent: true, optional: true },
  { key: 'costOfSales', label: 'Cost of sales' },
  { key: 'inputs', label: 'of which materials, delivery and other inputs', indent: true },
  { key: 'returns', label: 'of which returns and remakes', indent: true },
  { key: 'freight', label: 'of which export freight and damage', indent: true, optional: true },
  { key: 'grossProfit', label: 'Gross profit', kind: 'subtotal' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'staff', label: 'of which wages, overtime and recruitment', indent: true },
  { key: 'overheads', label: 'of which overheads', indent: true },
  { key: 'restructuring', label: 'of which the efficiency programme’s one-off costs', indent: true, optional: true },
  { key: 'marketing', label: 'of which marketing', indent: true },
  { key: 'people', label: 'of which the people programme', indent: true, optional: true },
  { key: 'international', label: 'of which international expansion', indent: true, optional: true },
  { key: 'depreciation', label: 'of which depreciation', indent: true },
  { key: 'pbit', label: 'Profit before interest and tax', kind: 'subtotal' },
  { key: 'interest', label: 'Interest' },
  { key: 'pbt', label: 'Profit before tax', kind: 'subtotal' },
  { key: 'tax', label: 'Tax' },
  { key: 'profit', label: 'Profit for the year', kind: 'total' },
  { key: 'dividends', label: 'Dividends', optional: true },
  { key: 'retained', label: 'Retained profit', kind: 'subtotal' },
];

export const CASH_ROWS: StatementRow[] = [
  { key: 'profit', label: 'Profit for the year' },
  { key: 'depreciation', label: 'Add back depreciation' },
  { key: 'debtors', label: 'Change in debtors' },
  { key: 'stock', label: 'Change in stock' },
  { key: 'creditors', label: 'Change in creditors' },
  { key: 'operating', label: 'Cash flow from operating activities', kind: 'subtotal' },
  { key: 'capex', label: 'New machinery', optional: true },
  { key: 'upkeep', label: 'Upkeep of the plant' },
  { key: 'investing', label: 'Cash flow from investing activities', kind: 'subtotal' },
  { key: 'dividends', label: 'Dividends paid', optional: true },
  { key: 'financing', label: 'Cash flow from financing activities', kind: 'subtotal' },
  { key: 'net', label: 'Net cash flow', kind: 'subtotal' },
  { key: 'open', label: 'Opening net cash (cash less overdraft)' },
  { key: 'close', label: 'Closing net cash', kind: 'total' },
];

export const POSITION_ROWS: StatementRow[] = [
  { key: 'nonCurrentAssets', label: 'Non-current assets (net book value)' },
  { key: 'h-current', label: 'Current assets', kind: 'heading' },
  { key: 'cash', label: 'Cash', indent: true },
  { key: 'debtors', label: 'Debtors', indent: true },
  { key: 'stock', label: 'Stock', indent: true },
  { key: 'currentAssets', label: 'Total current assets', kind: 'subtotal' },
  { key: 'totalAssets', label: 'Total assets', kind: 'subtotal' },
  { key: 'h-liab', label: 'Current liabilities', kind: 'heading' },
  { key: 'overdraft', label: 'Bank overdraft', indent: true },
  { key: 'creditors', label: 'Trade creditors', indent: true },
  { key: 'currentLiabilities', label: 'Total current liabilities', kind: 'subtotal' },
  { key: 'loans', label: 'Non-current liabilities: loans' },
  { key: 'netAssets', label: 'Net assets', kind: 'total' },
  { key: 'h-equity', label: 'Equity', kind: 'heading' },
  { key: 'shareCapital', label: 'Share capital', indent: true },
  { key: 'retainedEarnings', label: 'Retained earnings', indent: true },
  { key: 'equity', label: 'Total equity', kind: 'total' },
];

export function plColumn(y: YearResult): StatementColumn {
  const p = y.pl;
  return {
    label: y.label,
    values: {
      revenue: p.revenue,
      homeRevenue: p.exportRevenue ? p.homeRevenue : 0,
      exportRevenue: p.exportRevenue,
      costOfSales: p.costOfSales,
      inputs: p.materials + p.other,
      returns: p.returns,
      freight: p.freight + p.damage,
      grossProfit: p.grossProfit,
      expenses: p.expenses,
      staff: p.wages + p.overtime + p.recruitment,
      overheads: p.overheads,
      restructuring: p.restructuring,
      marketing: p.marketing,
      people: p.people,
      international: p.international,
      depreciation: p.depreciation,
      pbit: p.pbit,
      interest: p.interest,
      pbt: p.pbt,
      tax: p.tax,
      profit: p.profit,
      dividends: p.dividends,
      retained: p.retained,
    },
  };
}

export const cashColumn = (y: YearResult): StatementColumn => ({ label: y.label, values: { ...y.cash } as unknown as Record<string, number> });

export const positionColumn = (y: YearResult, label = `End of ${y.label}`): StatementColumn => ({ label, values: { ...y.position } as unknown as Record<string, number> });

/** The opening position as a column of the statement of financial position. */
export function openingColumn(s: State): StatementColumn {
  const nca = s.assets.reduce((a, x) => a + x.nbv, 0);
  const cash = Math.max(0, s.netCash);
  const overdraft = Math.max(0, -s.netCash);
  const ca = cash + s.debtors + s.stock;
  const cl = overdraft + s.creditors;
  return {
    label: s.label,
    values: {
      nonCurrentAssets: nca,
      cash,
      debtors: s.debtors,
      stock: s.stock,
      currentAssets: ca,
      totalAssets: nca + ca,
      overdraft,
      creditors: s.creditors,
      currentLiabilities: cl,
      loans: s.loans,
      netAssets: nca + ca - cl - s.loans,
      shareCapital: s.shareCapital,
      retainedEarnings: s.retainedEarnings,
      equity: s.shareCapital + s.retainedEarnings,
    },
  };
}

/** A statement in the guide's order, in thousands, losses in brackets. */
export function statementHtml(rows: StatementRow[], columns: StatementColumn[], caption: string, unit: string, id: string): string {
  const shown = rows.filter((r) => r.kind === 'heading' || !r.optional || columns.some((c) => Math.abs(c.values[r.key] ?? 0) >= 500));
  const body = shown
    .map((r) =>
      r.kind === 'heading'
        ? `<tr class="bb-statement__heading"><th scope="row" colspan="${columns.length + 1}">${esc(r.label)}</th></tr>`
        : `<tr class="${[r.kind && r.kind !== 'item' ? `bb-statement__${r.kind}` : '', r.indent ? 'bb-statement__indent' : ''].filter(Boolean).join(' ')}"><th scope="row">${esc(r.label)}</th>${columns
            .map((c) => `<td class="n">${esc(thousands(c.values[r.key] ?? 0))}</td>`)
            .join('')}</tr>`,
    )
    .join('');
  return `<div class="table-scroll" role="region" aria-labelledby="${id}" tabindex="0"><table class="table bb-statement"><caption class="sr-only" id="${id}">${esc(caption)}</caption><thead><tr><th scope="col"><span class="bb-statement__unit">${esc(unit)}</span></th>${columns
    .map((c) => `<th scope="col" class="n">${esc(c.label)}</th>`)
    .join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/** The guide's ratios for each year; the HL-only rows are marked and hidden in the SL view. */
export const RATIO_ROWS: Array<[KpiId, boolean]> = [
  ['gpm', false],
  ['profitMargin', false],
  ['roce', false],
  ['currentRatio', false],
  ['acidTest', false],
  ['stockDays', true],
  ['debtorDays', true],
  ['creditorDays', true],
  ['gearing', true],
];

export function ratiosHtml(years: YearResult[], ctx: NarrateContext, id: string, caption: string): string {
  return `<div class="table-scroll" role="region" aria-labelledby="${id}" tabindex="0"><table class="table bb-figures"><caption class="sr-only" id="${id}">${esc(caption)}</caption><thead><tr><th scope="col">Ratio</th>${years
    .map((y) => `<th scope="col" class="n">${esc(y.label)}</th>`)
    .join('')}</tr></thead><tbody>${RATIO_ROWS.map(
    ([k, hl]) =>
      `<tr${hl ? ' data-level="HL"' : ''}><th scope="row">${esc(KPI_DEFS[k].label)}${hl ? ' <span class="tag tag--hl">HL</span>' : ''}<span class="bb-formula">${esc(KPI_DEFS[k].formula ?? '')}</span></th>${years
        .map((y) => `<td class="n">${esc(fmtKpi(k, y.kpis[k], ctx))}</td>`)
        .join('')}</tr>`,
  ).join('')}</tbody></table></div>`;
}

/* ------------------------------------------------------------------ */
/* Plans                                                               */
/* ------------------------------------------------------------------ */

/** A lever's value in its own terms: "+3%", "5%", "£1.1m". */
export function leverValue(id: LeverId, v: number, ctx: NarrateContext): string {
  if (id === 'price') return v === 0 ? 'No change' : `${v > 0 ? '+' : '−'}${fmtNumber(Math.abs(v), 0)}%`;
  if (id === 'costCut') return v === 0 ? 'None' : `${fmtNumber(v, 0)}% of overheads`;
  return v === 0 ? 'None' : fmtMoneyCompact(v, ctx.symbol);
}

/** A plan as a table: one row per lever, one column per year. */
export function planTableHtml(plan: Array<{ label: string; levers: Levers }>, ctx: NarrateContext, caption: string, budget?: number): string {
  const spend = (l: Levers) => BUDGET_LEVERS.reduce((a, id) => a + l[id], 0);
  return `<div class="table-scroll" role="region" aria-label="${esc(caption)}" tabindex="0"><table class="table ex-plan"><caption class="sr-only">${esc(caption)}</caption><thead><tr><th scope="col">Lever</th>${plan
    .map((p) => `<th scope="col" class="n">${esc(p.label)}</th>`)
    .join('')}</tr></thead><tbody>${LEVER_IDS.map((id) => `<tr><th scope="row">${esc(LEVER_LABELS[id])}</th>${plan.map((p) => `<td class="n">${esc(leverValue(id, p.levers[id], ctx))}</td>`).join('')}</tr>`).join('')}<tr class="ex-plan__total"><th scope="row">Budget spent${
    budget ? ` (of ${esc(fmtMoneyCompact(budget, ctx.symbol))} a year)` : ''
  }</th>${plan.map((p) => `<td class="n">${esc(fmtMoneyCompact(spend(p.levers), ctx.symbol))}</td>`).join('')}</tr></tbody></table></div>`;
}

/* ------------------------------------------------------------------ */
/* A year's results                                                    */
/* ------------------------------------------------------------------ */

const AREAS: Area[] = ['marketing', 'operations', 'people', 'international', 'finance'];

const AREA_KPIS: Record<Area, KpiId[]> = {
  marketing: ['homeDemand', 'marketShare', 'brand', 'price'],
  operations: ['volume', 'load', 'quality', 'returnsRate'],
  people: ['morale', 'turnover', 'skill', 'overtimeHours'],
  international: ['exportVolume', 'exportRevenue', 'exportShare', 'fx'],
  finance: ['revenue', 'pbit', 'profitMargin', 'netCash'],
};

function delta(id: KpiId, now: YearResult, prev: YearResult, ctx: NarrateContext): string {
  const c = kpiChange(id, prev.kpis[id], now.kpis[id], ctx);
  return `<div class="bb-delta bb-delta--${c.verdict}"><dt>${esc(KPI_DEFS[id].short)}</dt><dd><span class="bb-delta__value">${esc(fmtKpi(id, now.kpis[id], ctx))}</span> <span class="bb-delta__change">${
    c.verdict === 'same' ? 'No change' : `${esc(c.text)} <span class="bb-delta__word">${esc(c.words)}</span>`
  }</span></dd></div>`;
}

export interface YearOptions {
  level: number;
  id: string;
  /** The year's news, already filled. */
  news?: { title: string; html: string };
  focusable?: boolean;
  /** The opening position, when the year before is the history's last. */
  heading?: string;
}

/** One year of the plan: what was decided, what happened in each part of the business and why, and the year's statements. */
export function yearResultHtml(r: YearResult, prev: YearResult, ctx: NarrateContext, o: YearOptions): string {
  const L = o.level;
  const why = explainYear(r, prev, ctx);
  const areas = AREAS.filter((a) => a !== 'international' || r.intl.open || r.intl.setupPaid > 0 || r.levers.international > 0);
  return `<article class="ex-year" aria-labelledby="${o.id}-h">
<${h(L)} class="ex-year__title" id="${o.id}-h"${o.focusable ? ' tabindex="-1"' : ''}>${esc(o.heading ?? `${r.label}: what happened`)}</${h(L)}>
<p class="ex-year__plan"><span class="ex-year__label">The plan</span> ${esc(describeLevers(r.levers, ctx).join(' '))}</p>
${o.news ? `<aside class="bb-event ex-news" aria-labelledby="${o.id}-news"><p class="bb-event__kicker">What nobody chose</p><${h(L + 1)} class="bb-event__title" id="${o.id}-news">${esc(o.news.title)}</${h(L + 1)}><div class="prose">${o.news.html}</div></aside>` : ''}
<div class="bb-fns ex-year__areas">${areas
    .map(
      (a) => `<section class="bb-fn ex-area ex-area--${a}" aria-labelledby="${o.id}-${a}"><${h(L + 1)} class="bb-fn__title" id="${o.id}-${a}">${esc(AREA_LABELS[a])}</${h(L + 1)}><dl class="bb-fn__kpis">${AREA_KPIS[a]
        .map((id) => delta(id, r, prev, ctx))
        .join('')}</dl><ul class="bb-fn__why">${why[a].map((l) => `<li>${esc(l)}</li>`).join('')}</ul></section>`,
    )
    .join('')}</div>
<details class="disclosure ex-year__accounts"><summary>The accounts for ${esc(r.label)}</summary><div class="disclosure__body">
${statementHtml(PL_ROWS, [plColumn(prev), plColumn(r)], `Statement of profit or loss, ${prev.label} and ${r.label}, ${ctx.symbol}000`, `${ctx.symbol}000`, `${o.id}-pl`)}
${statementHtml(CASH_ROWS, [cashColumn(r)], `Cash flow, ${r.label}, ${ctx.symbol}000`, `${ctx.symbol}000`, `${o.id}-cf`)}
${statementHtml(POSITION_ROWS, [positionColumn(prev), positionColumn(r)], `Statement of financial position, end of ${prev.label} and end of ${r.label}, ${ctx.symbol}000`, `${ctx.symbol}000`, `${o.id}-sofp`)}
</div></details>
</article>`;
}

/* ------------------------------------------------------------------ */
/* Scorecards                                                          */
/* ------------------------------------------------------------------ */

export function goalValue(g: GoalResult, ctx: NarrateContext): string {
  if (g.value === null) return 'Not reached';
  const [how, id] = g.goal.metric.split(':') as [string, KpiId];
  const def = KPI_DEFS[id];
  if (id === 'headroom' && how === 'min') return g.value >= 0 ? 'Never over the limit' : `${fmtMoneyCompact(-g.value, ctx.symbol)} over the limit at worst`;
  if (how === 'change') {
    const c = kpiChange(id, 0, g.value, ctx);
    return c.verdict === 'same' ? 'No change' : c.text;
  }
  if (how === 'sum' && def?.kind === 'money') return fmtMoneyCompact(g.value, ctx.symbol);
  return def ? fmtKpi(id, g.value, ctx) : fmtNumber(g.value, 1);
}

export function scorecardHtml(role: RoleId, goals: GoalResult[], ctx: NarrateContext, level: number, mine = false): string {
  const met = goals.filter((g) => g.met).length;
  return `<section class="bb-score${mine ? ' is-mine' : ''}"><${h(level)} class="bb-score__title">${esc(ROLE_TITLES[role])}${mine ? ' (your role)' : ''}: ${met} of ${goals.length} goals met</${h(level)}><ul class="bb-score__list">${goals
    .map(
      (g) => `<li class="bb-goal bb-goal--${g.met ? 'met' : 'missed'}"><span class="bb-goal__mark">${g.met ? 'Met' : 'Missed'}</span> <span class="bb-goal__label">${esc(g.goal.label)}</span> <span class="bb-goal__value">${esc(goalValue(g, ctx))}</span></li>`,
    )
    .join('')}</ul></section>`;
}

/* ------------------------------------------------------------------ */
/* Comparing plans                                                     */
/* ------------------------------------------------------------------ */

export interface PlanRow {
  label: string;
  summary: PlanSummary;
  /** The years' labels, for the operating profit by year. */
  years: string[];
  mine?: boolean;
}

const CMP: KpiId[] = ['revenue', 'profitMargin', 'roce', 'marketShare', 'brand', 'quality', 'morale'];

/** Every plan compared on the same figures, worked by the same engine. */
export function comparisonHtml(rows: PlanRow[], ctx: NarrateContext, caption: string): string {
  const years = rows[0]?.years ?? [];
  const head = `<tr><th scope="col">Plan</th><th scope="col" class="n">Profit after tax, ${esc(years[0] ?? '')} to ${esc(years[years.length - 1] ?? '')}</th>${years
    .map((y) => `<th scope="col" class="n">Operating profit, ${esc(y)}</th>`)
    .join('')}<th scope="col" class="n">Lowest net cash</th>${CMP.map((id) => `<th scope="col" class="n">${esc(KPI_DEFS[id].short)}, ${esc(years[years.length - 1] ?? '')}</th>`).join('')}</tr>`;
  const body = rows
    .map(
      (r) =>
        `<tr${r.mine ? ' class="is-yours"' : ''}><th scope="row">${esc(r.label)}</th><td class="n">${esc(fmtMoneyCompact(r.summary.cumProfit, ctx.symbol))}</td>${r.summary.pbit
          .map((v) => `<td class="n">${esc(fmtMoneyCompact(v, ctx.symbol))}</td>`)
          .join('')}<td class="n">${esc(fmtMoneyCompact(r.summary.lowCash, ctx.symbol))}${r.summary.breached ? ' <span class="ex-flag">Over the limit</span>' : ''}</td>${CMP.map((id) => `<td class="n">${esc(fmtKpi(id, r.summary.final[id], ctx))}</td>`).join('')}</tr>`,
    )
    .join('');
  return `<div class="table-scroll" role="region" aria-label="${esc(caption)}" tabindex="0"><table class="table bb-paths ex-compare"><caption class="sr-only">${esc(caption)}</caption><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

/** Profit after tax over the plan, as bars, with the learner's plan marked. */
export function profitBarsHtml(rows: PlanRow[], ctx: NarrateContext, id: string): string {
  const years = rows[0]?.years ?? [];
  const title = `Profit after tax added over ${years[0] ?? ''} to ${years[years.length - 1] ?? ''}, by plan`;
  return `<div class="chart-scroll" role="region" aria-label="${esc(title)}" tabindex="0">${barsSvg(
    rows.map((r) => ({ label: r.label, value: r.summary.cumProfit, mine: r.mine })),
    { id, title, fmt: (v) => fmtMoneyCompact(v, ctx.symbol) },
  )}</div>`;
}

/** What each lever did, holding the others as the plan set them. */
export function attributionHtml(attr: Attribution[], ctx: NarrateContext, caption: string, firstYear: string, lastYear: string): string {
  const used = attr.filter((a) => a.used);
  if (!used.length) return '<p class="small">Every lever stayed at its 2026 level, so there is nothing to separate.</p>';
  const m = (v: number) => kpiChange('pbit', 0, v, ctx).text;
  const pts = (v: number) => (Math.abs(v) < 0.05 ? 'No change' : `${v > 0 ? '+' : '−'}${fmtNumber(Math.abs(v), 1)}`);
  return `<div class="table-scroll" role="region" aria-label="${esc(caption)}" tabindex="0"><table class="table ex-attr"><caption class="sr-only">${esc(caption)}</caption><thead><tr><th scope="col">Lever</th><th scope="col" class="n">Operating profit, ${esc(firstYear)}</th><th scope="col" class="n">Operating profit, ${esc(lastYear)}</th><th scope="col" class="n">Profit after tax, all years</th><th scope="col" class="n">Net cash, ${esc(lastYear)}</th><th scope="col" class="n">Brand, ${esc(lastYear)}</th><th scope="col" class="n">Service quality, ${esc(lastYear)}</th><th scope="col" class="n">Morale, ${esc(lastYear)}</th></tr></thead><tbody>${used
    .map(
      (a) =>
        `<tr><th scope="row">${esc(LEVER_LABELS[a.lever])}</th><td class="n">${esc(m(a.firstPbit))}</td><td class="n">${esc(m(a.finalPbit))}</td><td class="n">${esc(m(a.cumProfit))}</td><td class="n">${esc(m(a.finalNetCash))}</td><td class="n">${esc(pts(a.finalBrand))}</td><td class="n">${esc(pts(a.finalQuality))}</td><td class="n">${esc(pts(a.finalMorale))}</td></tr>`,
    )
    .join('')}</tbody></table></div>`;
}

/** What a stronger or weaker home currency would have done to a plan that sells abroad. */
export function fxHtml(name: string, base: PlanSummary, stronger: PlanSummary, weaker: PlanSummary, shift: number, ctx: NarrateContext): string {
  const m = (v: number) => fmtMoneyCompact(v, ctx.symbol);
  return `<p>${esc(name)}: profit after tax over the plan was ${esc(m(base.cumProfit))}. Had the pound been ${fmtNumber(shift, 0)}% stronger than it was in every year, it would have been ${esc(m(stronger.cumProfit))} (${esc(
    kpiChange('profit', base.cumProfit, stronger.cumProfit, ctx).text,
  )}); ${fmtNumber(shift, 0)}% weaker, ${esc(m(weaker.cumProfit))} (${esc(kpiChange('profit', base.cumProfit, weaker.cumProfit, ctx).text)}).</p>`;
}

/* ------------------------------------------------------------------ */
/* The allocation form (the browser draws it; the casebook shows the worked example's plan instead) */
/* ------------------------------------------------------------------ */

/** The form's figures: percentages as they are, money in thousands. */
export const toField = (id: LeverId, v: number): number => ((BUDGET_LEVERS as readonly string[]).includes(id) ? v / 1000 : v);
export const fromField = (id: LeverId, v: number): number => ((BUDGET_LEVERS as readonly string[]).includes(id) ? Math.round(v * 1000) : v);

export function allocationFormHtml(year: string, values: Levers, rules: Rules, ctx: NarrateContext, problems: LeverProblem[], last?: Levers): string {
  const err = (f: string) => problems.filter((p) => p.field === f).map((p) => p.message).join(' ');
  const field = (id: LeverId) => {
    const money = (BUDGET_LEVERS as readonly string[]).includes(id);
    const b = rules[id];
    const e = err(id);
    const fid = `ex-lever-${id}`;
    const lastText = last ? ` Last year: ${leverValue(id, last[id], ctx)}.` : '';
    return `<div class="field ex-lever${money ? ' ex-lever--money' : ''}">
<label for="${fid}">${esc(LEVER_LABELS[id])} <span class="ex-lever__unit">(${money ? `${esc(ctx.symbol)}000` : '%'})</span></label>
<span class="field__hint" id="${fid}-hint">${esc(LEVER_HINTS[id])}${esc(lastText)}</span>
<input class="input ex-lever__input" type="number" id="${fid}" name="${id}" inputmode="${id === 'price' ? 'text' : 'numeric'}" min="${toField(id, b.min)}" max="${toField(id, b.max)}" step="${toField(id, b.step)}" value="${toField(id, values[id])}" data-lever="${id}" aria-describedby="${fid}-hint${e ? ` ${fid}-err` : ''}"${e ? ' aria-invalid="true"' : ''}>
<span class="field__error" id="${fid}-err" data-err="${id}">${esc(e)}</span>
</div>`;
  };
  const spend = BUDGET_LEVERS.reduce((a, id) => a + values[id], 0);
  const share = Math.min(100, (spend / rules.budget) * 100);
  const over = spend > rules.budget;
  return `<form class="ex-form" data-form novalidate aria-labelledby="ex-form-h">
<h3 class="ex-form__title" id="ex-form-h" tabindex="-1">The plan for ${esc(year)}</h3>
<fieldset class="ex-form__group"><legend>Prices and costs</legend>${field('price')}${field('costCut')}</fieldset>
<fieldset class="ex-form__group"><legend>The budget: up to ${esc(fmtMoneyCompact(rules.budget, ctx.symbol))} this year</legend>${BUDGET_LEVERS.map(field).join('')}</fieldset>
<div class="ex-meter${over ? ' is-over' : ''}" data-meter>
<p class="ex-meter__text" id="ex-meter-text" data-meter-text>Budget allocated: <strong>${esc(fmtMoneyCompact(spend, ctx.symbol))}</strong> of ${esc(fmtMoneyCompact(rules.budget, ctx.symbol))}${
    over ? `, ${esc(fmtMoneyCompact(spend - rules.budget, ctx.symbol))} too much` : `, ${esc(fmtMoneyCompact(rules.budget - spend, ctx.symbol))} left in the bank`
  }.</p>
<div class="ex-meter__track" aria-hidden="true"><span class="ex-meter__fill" style="width:${fmtNumber(share, 1).replace(/,/g, '')}%"></span></div>
<span class="field__error" data-err="budget">${esc(err('budget'))}</span>
</div>
<div class="bb-actions"><button type="submit" class="btn btn--primary" data-act="commit">Commit the plan for ${esc(year)}</button><span class="field__error" data-form-msg role="status"></span></div>
</form>`;
}

/** The headline figures of a plan's last year against the history's last, for the evaluation. */
export function beforeAfterHtml(start: YearResult, end: YearResult, ids: KpiId[], ctx: NarrateContext, caption: string): string {
  return `<div class="table-scroll" role="region" aria-label="${esc(caption)}" tabindex="0"><table class="table bb-range"><caption class="sr-only">${esc(caption)}</caption><thead><tr><th scope="col">Measure</th><th scope="col" class="n">${esc(start.label)}</th><th scope="col" class="n">${esc(end.label)}</th><th scope="col">Change</th></tr></thead><tbody>${ids
    .map((id) => {
      const c = kpiChange(id, start.kpis[id], end.kpis[id], ctx);
      return `<tr><th scope="row">${esc(KPI_DEFS[id].label)}</th><td class="n">${esc(fmtKpi(id, start.kpis[id], ctx))}</td><td class="n">${esc(fmtKpi(id, end.kpis[id], ctx))}</td><td class="ex-change ex-change--${c.verdict}">${c.verdict === 'same' ? 'No change' : `${esc(c.text)}, ${esc(c.words.toLowerCase())}`}</td></tr>`;
    })
    .join('')}</tbody></table></div>`;
}

export { inline, rich };
