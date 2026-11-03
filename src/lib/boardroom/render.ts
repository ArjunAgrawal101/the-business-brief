/**
 * HTML fragments for the Boardroom, shared by the server render (the board
 * pack and the narrated casebook) and the browser (the live simulation), so
 * the two can never show different figures or words. Every piece of content
 * text passes through esc(), inline() or rich().
 */
import { esc, inline, rich } from '../markup';
import { fmtNumber } from '../format';
import type { KpiId, PeriodResult } from './engine';
import { describeSeries, sparkline } from './charts';
import { fmtKpi, fmtMoneyCompact, kpiChange, kpiUnit, KPI_DEFS } from './kpis';
import { describeEffects, explain, fillTokens, FLAG_WORDS, flow, FUNCTION_LABELS, type NarrateContext } from './narrate';
import type { GoalResult, PathSummary, RoundRun } from './scenario';
import type { Effects, EventVariant, OptionDef, RoundDef } from './schema';
import { ROLE_TITLES, type FunctionId, type RoleId } from './roles';

type H = 2 | 3 | 4 | 5 | 6;
const h = (level: number) => `h${Math.min(6, Math.max(2, level))}` as `h${H}`;

/** The lead role of a round, as the part of the business a decision starts in. */
export const LEAD_FUNCTION: Record<RoleId, FunctionId> = { ceo: 'marketing', finance: 'finance', marketing: 'marketing', operations: 'operations', hr: 'people' };

export const ROLE_LEAD_LABEL: Record<RoleId, string> = { ceo: 'the chief executive', finance: 'finance', marketing: 'marketing', operations: 'operations', hr: 'human resources' };

/* ------------------------------------------------------------------ */
/* The dashboard                                                       */
/* ------------------------------------------------------------------ */

/**
 * The KPI tiles: value, change on the period before in words and figures,
 * and a sparkline over every period so far. `split` is the index of the first
 * decision period (history is drawn lighter).
 */
export function kpiTiles(periods: PeriodResult[], ids: KpiId[], pinned: KpiId[], ctx: NarrateContext, idPrefix: string, split: number): string {
  const now = periods[periods.length - 1];
  const prev = periods[periods.length - 2];
  if (!now) return '';
  const labels = periods.map((p) => p.label);
  const tiles = ids.map((id) => {
    const def = KPI_DEFS[id];
    const values = periods.map((p) => p.kpis[id]);
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
<p class="bb-kpi__value">${esc(fmt(now.kpis[id]))}${unit && def.kind !== 'perUnit' ? `<span class="bb-kpi__unit">${esc(unit)}</span>` : def.kind === 'perUnit' ? `<span class="bb-kpi__unit">${esc(`CO₂e per ${ctx.unit}`)}</span>` : ''}</p>
<p class="bb-kpi__change bb-kpi__change--${change?.verdict ?? 'same'}">${
      change && prev
        ? `<span class="sr-only">Change from ${esc(prev.label)}: </span>${change.verdict === 'same' ? 'No change' : `<span class="num">${esc(change.text)}</span> <span class="bb-kpi__word">${esc(change.words)}</span>`}`
        : '<span class="bb-kpi__word">Starting position</span>'
    }</p>
${spark}
</li>`;
  });
  // Balance the rows on wide screens: ten tiles sit in two rows of five, not seven and three.
  const cols = ids.length >= 6 ? Math.ceil(ids.length / 2) : ids.length;
  return `<ul class="bb-kpis" role="list" style="--cols:${cols}">${tiles.join('')}</ul>`;
}

/** Every measure for every period so far, as a table: the figures behind the charts. */
export function figuresTable(periods: PeriodResult[], ids: KpiId[], ctx: NarrateContext, caption: string, split: number): string {
  const head = periods.map((p, i) => `<th scope="col" class="n${i >= split ? ' is-round' : ''}${i === periods.length - 1 ? ' is-current' : ''}">${esc(p.label)}</th>`).join('');
  const body = ids
    .map((id) => {
      const def = KPI_DEFS[id];
      const unit = kpiUnit(id, ctx);
      return `<tr><th scope="row">${esc(def.label)}${unit ? ` <span class="bb-unit">(${esc(unit)})</span>` : ''}</th>${periods
        .map((p, i) => `<td class="n${i >= split ? ' is-round' : ''}${i === periods.length - 1 ? ' is-current' : ''}">${esc(fmtKpi(id, p.kpis[id], ctx))}</td>`)
        .join('')}</tr>`;
    })
    .join('');
  return `<div class="table-scroll" role="region" aria-label="${esc(caption)}" tabindex="0"><table class="table bb-figures"><caption class="sr-only">${esc(caption)}</caption><thead><tr><th scope="col">Measure</th>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/* ------------------------------------------------------------------ */
/* Rounds: what the board is choosing between                          */
/* ------------------------------------------------------------------ */

/** The five directors' views, with the learner's own desk marked when a role is given. */
export function perspectivesHtml(round: RoundDef, level: number, role?: RoleId, fill: (t: string) => string = (t) => t): string {
  const order: RoleId[] = ['ceo', 'finance', 'marketing', 'operations', 'hr'];
  return `<ul class="bb-table" role="list">${order
    .map(
      (r) => `<li class="bb-seat${r === role ? ' is-you' : ''}${r === round.lead ? ' is-lead' : ''}">
<${h(level)} class="bb-seat__role">${esc(ROLE_TITLES[r])}${r === role ? ' <span class="bb-seat__tag">Your desk</span>' : ''}${r === round.lead ? ' <span class="bb-seat__tag bb-seat__tag--lead">Leads this decision</span>' : ''}</${h(level)}>
<div class="bb-seat__view">${rich(fill(round.perspectives[r]))}</div>
</li>`,
    )
    .join('')}</ul>`;
}

/** What an option involves, written from its effects. */
export function involvesHtml(option: OptionDef, ctx: NarrateContext, id?: string): string {
  const lines = describeEffects(option.effects, ctx);
  const cond = option.when.map((w) => describeEffects(w.effects, ctx)).flat();
  if (!lines.length && !cond.length) return '';
  return `<ul class="bb-involves"${id ? ` id="${id}"` : ''}>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}${
    option.when.length ? option.when.map((w) => `<li class="bb-involves__if">${esc(`Depends on earlier choices: ${w.note}`)}</li>`).join('') : ''
  }</ul>`;
}

/** An event's possible outcomes, for the casebook: which one happens depends on the state of the business. */
export function eventVariantsHtml(round: RoundDef, ctx: NarrateContext, level: number): string {
  const vs = round.event?.variants ?? [];
  if (!vs.length) return '';
  return `<div class="bb-variants">${vs
    .map(
      (v, i) => `<section class="bb-variant">
<p class="bb-variant__when">${esc(vs.length === 1 ? 'Whatever the board decided' : i === vs.length - 1 && !v.if ? 'Otherwise' : variantCondition(v))}</p>
<${h(level)} class="bb-variant__title">${esc(v.title)}</${h(level)}>
<div class="prose small">${rich(stripTokens(v.text))}</div>
<ul class="bb-involves">${describeEffects(v.effects, ctx, { assumptions: true })
        .map((l) => `<li>${esc(l)}</li>`)
        .join('')}</ul>
</section>`,
    )
    .join('')}</div>`;
}

/** Event texts may carry tokens; in the casebook's list of possibilities they are read without figures. */
function stripTokens(text: string): string {
  return text.replace(/\{\{\s*[a-zA-Z]+(?:\.(?:prev|change))?\s*\}\}/g, 'the figure at the time');
}

/** The condition under which an event variant happens, in words. */
export function variantCondition(v: EventVariant): string {
  return v.if ? `If ${conditionWords(v.if)}` : 'Otherwise';
}

function conditionWords(c: NonNullable<EventVariant['if']>): string {
  if ('all' in c) return c.all.map(conditionWords).join(' and ');
  if ('any' in c) return c.any.map(conditionWords).join(' or ');
  if ('not' in c) return `not (${conditionWords(c.not)})`;
  if ('channel' in c) return `the business still sells through ${c.channel}`;
  if ('flag' in c) return FLAG_WORDS[c.flag] ?? `the board chose ${c.flag.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
  const def = KPI_DEFS[c.kpi as KpiId];
  const ops: Record<string, string> = { '<': 'is below', '<=': 'is at most', '>': 'is above', '>=': 'is at least', '==': 'is' };
  return `${def ? def.label.toLowerCase() : c.kpi} ${ops[c.op] ?? c.op} ${def?.kind === 'percent' ? `${fmtNumber(c.value, 1)}%` : fmtNumber(c.value, c.value % 1 ? 2 : 0)}${def?.kind === 'days' ? ' days' : ''} at the end of the round`;
}


/* ------------------------------------------------------------------ */
/* Consequences                                                        */
/* ------------------------------------------------------------------ */

function kpiDelta(id: KpiId, now: PeriodResult, prev: PeriodResult, ctx: NarrateContext): string {
  const c = kpiChange(id, prev.kpis[id], now.kpis[id], ctx);
  return `<div class="bb-delta bb-delta--${c.verdict}"><dt>${esc(KPI_DEFS[id].short)}</dt><dd><span class="bb-delta__value">${esc(fmtKpi(id, now.kpis[id], ctx))}</span> <span class="bb-delta__change">${
    c.verdict === 'same' ? 'No change' : `${esc(c.text)} <span class="bb-delta__word">${esc(c.words)}</span>`
  }</span></dd></div>`;
}

const FN_KPIS: Record<FunctionId, KpiId[]> = {
  marketing: ['revenue', 'volume', 'marketShare', 'brand'],
  operations: ['utilization', 'lostSales', 'productivity', 'defectRate'],
  people: ['headcount', 'morale', 'turnover', 'staffCosts'],
  finance: ['pbit', 'profit', 'netCash', 'acidTest'],
  sustainability: ['emissionsPerUnit', 'emissions'],
};

/** The consequence of one round: the story, how it travelled across the functions, the figures and the theory. */
export function consequenceHtml(rr: RoundRun, prev: PeriodResult, index: number, total: number, ctx: NarrateContext, opts: { level: number; id: string; focusable?: boolean }): string {
  const { round, option, result } = rr;
  const L = opts.level;
  const why = explain(result, prev, ctx);
  const steps = flow(result, prev, LEAD_FUNCTION[round.lead], ctx);
  const fns = (['marketing', 'operations', 'people', 'finance', 'sustainability'] as FunctionId[]).filter((f) => f !== 'sustainability' || ctx.hasSustainability);
  const model: string[] = [];
  if (rr.before) model.push(...describeEffects(rr.before.effects, ctx, { assumptions: true }).map((l) => `Before the round (${rr.before?.title}): ${l}`));
  if (round.given) model.push(...describeEffects(round.given.effects, ctx, { assumptions: true }).map((l) => `Already agreed: ${l}`));
  model.push(...describeEffects(option.effects, ctx, { assumptions: true }));
  for (const w of option.when) if (rr.conditional.includes(w.note)) model.push(...describeEffects(w.effects, ctx, { assumptions: true }).map((l) => `Because of an earlier choice: ${l}`));
  return `<article class="bb-result" aria-labelledby="${opts.id}-h">
<p class="bb-result__kicker">Round ${index + 1} of ${total} · ${esc(round.period)} · The board chose: ${esc(option.label)}</p>
<${h(L)} class="bb-result__headline" id="${opts.id}-h"${opts.focusable ? ' tabindex="-1"' : ''}>${esc(option.outcome.headline)}</${h(L)}>
<div class="prose narrative bb-result__story">${rich(fillTokens(option.outcome.narrative, result.kpis, prev.kpis, ctx))}</div>
${rr.conditional.length ? `<ul class="bb-result__because">${rr.conditional.map((n) => `<li>${inline(n)}</li>`).join('')}</ul>` : ''}
${
  steps.length
    ? `<section class="bb-flow" aria-labelledby="${opts.id}-flow"><${h(L + 1)} class="label label--ink" id="${opts.id}-flow">How the decision travelled</${h(L + 1)}><ol class="bb-flow__list">${steps
        .map((s) => `<li class="bb-flow__step"><span class="bb-flow__fn">${esc(FUNCTION_LABELS[s.fn])}</span> <span class="bb-flow__what">${s.changes.map((c) => `<span class="bb-flow__chg bb-flow__chg--${c.verdict}">${esc(c.text)}</span>`).join(' ')}</span></li>`)
        .join('')}</ol></section>`
    : ''
}
<div class="bb-fns">${fns
    .map(
      (f) => `<section class="bb-fn bb-fn--${f}" aria-labelledby="${opts.id}-${f}"><${h(L + 1)} class="bb-fn__title" id="${opts.id}-${f}">${esc(FUNCTION_LABELS[f])}</${h(L + 1)}><dl class="bb-fn__kpis">${FN_KPIS[f]
        .filter((id) => id !== 'defectRate' || ctx.hasDefects)
        .map((id) => kpiDelta(id, result, prev, ctx))
        .join('')}</dl><ul class="bb-fn__why">${why[f].map((l) => `<li>${esc(l)}</li>`).join('')}</ul></section>`,
    )
    .join('')}</div>
<div class="bb-result__grid">
<section aria-labelledby="${opts.id}-people"><${h(L + 1)} class="label label--ink" id="${opts.id}-people">How people reacted</${h(L + 1)}><ul class="bb-people">${option.outcome.stakeholders
    .map((s) => `<li class="bb-person bb-person--${s.mood}"><span class="bb-person__name">${esc(s.name)}</span> <span class="bb-person__mood">${esc(MOODS[s.mood])}</span> <span class="bb-person__said">${inline(s.reaction)}</span></li>`)
    .join('')}</ul></section>
<section aria-labelledby="${opts.id}-theory"><${h(L + 1)} class="label label--ink" id="${opts.id}-theory">The theory behind it</${h(L + 1)}><div class="prose small">${rich(option.outcome.theory)}</div></section>
</div>
<details class="disclosure bb-model"><summary>How the model treated this round</summary><div class="disclosure__body"><ul class="bb-involves">${model.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div></details>
</article>`;
}

const MOODS = { positive: 'Positive', mixed: 'Mixed', negative: 'Negative' } as const;

/** The event between rounds, as it happened on this path. */
export function eventHtml(v: EventVariant, now: PeriodResult, prev: PeriodResult | undefined, ctx: NarrateContext, opts: { level: number; id: string; focusable?: boolean }): string {
  return `<aside class="bb-event" aria-labelledby="${opts.id}-h">
<p class="bb-event__kicker">Between rounds: what happened next</p>
<${h(opts.level)} class="bb-event__title" id="${opts.id}-h"${opts.focusable ? ' tabindex="-1"' : ''}>${esc(v.title)}</${h(opts.level)}>
<div class="prose">${rich(fillTokens(v.text, now.kpis, prev?.kpis, ctx))}</div>
<p class="bb-event__label">What changes for the next round</p>
<ul class="bb-involves">${describeEffects(v.effects, ctx, { assumptions: true })
    .map((l) => `<li>${esc(l)}</li>`)
    .join('')}</ul>
</aside>`;
}

/* ------------------------------------------------------------------ */
/* Scorecards, paths and the memo                                      */
/* ------------------------------------------------------------------ */

/** Write a goal's achieved value in its KPI's terms. */
export function goalValue(g: GoalResult, ctx: NarrateContext): string {
  if (g.value === null) return 'Not reached';
  const [how, id] = g.goal.metric.split(':') as [string, KpiId];
  const def = KPI_DEFS[id];
  if (id === 'overdraftExcess') return g.value <= 0.5 ? 'Never over the limit' : `${fmtMoneyCompact(g.value, ctx.symbol)} over the limit at worst`;
  if (how === 'change') {
    const c = kpiChange(id, 0, g.value, ctx);
    return c.verdict === 'same' ? 'No change' : c.text;
  }
  if (how === 'sum' && def?.kind === 'money') return fmtMoneyCompact(g.value, ctx.symbol);
  if (def?.kind === 'units') return `${fmtKpi(id, g.value, ctx)} ${g.value === 1 ? ctx.unit : ctx.units}`;
  if (def?.kind === 'people') return `${fmtKpi(id, g.value, ctx)} people`;
  return def ? fmtKpi(id, g.value, ctx) : fmtNumber(g.value, 1);
}

export function scorecardHtml(role: RoleId, goals: GoalResult[], ctx: NarrateContext, level: number, mine = false): string {
  const met = goals.filter((g) => g.met).length;
  return `<section class="bb-score${mine ? ' is-mine' : ''}"><${h(level)} class="bb-score__title">${esc(ROLE_TITLES[role])}${mine ? ' (you)' : ''}: ${met} of ${goals.length} goals met</${h(level)}><ul class="bb-score__list">${goals
    .map(
      (g) => `<li class="bb-goal bb-goal--${g.met ? 'met' : 'missed'}"><span class="bb-goal__mark">${g.met ? 'Met' : 'Missed'}</span> <span class="bb-goal__label">${esc(g.goal.label)}</span> <span class="bb-goal__value">${esc(goalValue(g, ctx))}</span></li>`,
    )
    .join('')}</ul></section>`;
}

export interface NamedPath {
  label: string;
  picks: string[];
  summary: PathSummary;
  yours?: boolean;
}

/** The named paths compared on their final figures and the goals each role met. */
export function pathsTableHtml(paths: NamedPath[], rounds: RoundDef[], roles: Record<RoleId, { goals: unknown[] }>, ctx: NarrateContext, caption: string): string {
  const cols: KpiId[] = ['pbit', 'netCash', 'brand', 'morale', 'marketShare', ...(ctx.hasSustainability ? (['emissionsPerUnit'] as KpiId[]) : [])];
  const order: RoleId[] = ['ceo', 'finance', 'marketing', 'operations', 'hr'];
  const ab: Record<RoleId, string> = { ceo: 'CEO', finance: 'FD', marketing: 'MD', operations: 'OD', hr: 'HRD' };
  const head = `<tr><th scope="col">Path</th><th scope="col" class="n">Profit after tax, all rounds</th>${cols.map((id) => `<th scope="col" class="n">${esc(KPI_DEFS[id].short)}, final</th>`).join('')}<th scope="col">Goals met</th></tr>`;
  const body = paths
    .map((p) => {
      const decisions = p.picks
        .map((id, i) => {
          const label = rounds[i]?.options.find((o) => o.id === id)?.label ?? id;
          return i === 0 ? label : `${label.charAt(0).toLowerCase()}${label.slice(1)}`;
        })
        .join(', then ');
      const goals = order.map((r) => `<span class="bb-path__goal"><abbr title="${esc(ROLE_TITLES[r])}">${ab[r]}</abbr> ${p.summary.goals[r]} of ${roles[r].goals.length}</span>`).join(' ');
      return `<tr${p.yours ? ' class="is-yours"' : ''}><th scope="row"><span class="bb-path__name">${esc(p.label)}</span><span class="bb-path__picks">${esc(decisions)}</span></th><td class="n">${esc(fmtMoneyCompact(p.summary.cumProfit, ctx.symbol))}</td>${cols
        .map((id) => `<td class="n">${esc(fmtKpi(id, p.summary.final[id], ctx))}</td>`)
        .join('')}<td class="bb-path__goals">${goals}</td></tr>`;
    })
    .join('');
  return `<div class="table-scroll" role="region" aria-label="${esc(caption)}" tabindex="0"><table class="table bb-paths"><caption class="sr-only">${esc(caption)}</caption><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

/** Every path's final figures: the lowest and highest the board could have reached, and where a given path sits. */
export function rangeTableHtml(ids: KpiId[], start: PeriodResult, summaries: PathSummary[], ctx: NarrateContext, caption: string, yours?: PathSummary): string {
  const rows = ids
    .map((id) => {
      const vals = summaries.map((s) => s.final[id]);
      const lo = Math.min(...vals);
      const hi = Math.max(...vals);
      const def = KPI_DEFS[id];
      let rank = '';
      if (yours && def.better !== 'context') {
        const sorted = [...vals].sort((a, b) => (def.better === 'higher' ? b - a : a - b));
        const v = yours.final[id];
        const at = sorted.findIndex((x) => (def.better === 'higher' ? x <= v + 1e-9 : x >= v - 1e-9)) + 1;
        rank = `${at} of ${vals.length}`;
      }
      return `<tr><th scope="row">${esc(def.label)}</th><td class="n">${esc(fmtKpi(id, start.kpis[id], ctx))}</td><td class="n">${esc(fmtKpi(id, lo, ctx))}</td><td class="n">${esc(fmtKpi(id, hi, ctx))}</td>${
        yours ? `<td class="n bb-range__yours">${esc(fmtKpi(id, yours.final[id], ctx))}</td><td class="n">${esc(rank || 'Depends on context')}</td>` : ''
      }</tr>`;
    })
    .join('');
  return `<div class="table-scroll" role="region" aria-label="${esc(caption)}" tabindex="0"><table class="table bb-range"><caption class="sr-only">${esc(caption)}</caption><thead><tr><th scope="col">Measure</th><th scope="col" class="n">Before round 1</th><th scope="col" class="n">Lowest final</th><th scope="col" class="n">Highest final</th>${
    yours ? '<th scope="col" class="n">Yours</th><th scope="col" class="n">Your rank</th>' : ''
  }</tr></thead><tbody>${rows}</tbody></table></div>`;
}

export interface MemoInput {
  company: string;
  role: RoleId;
  question: string;
  date: string;
  fields: Array<{ label: string; text: string }>;
  decisions: Array<{ period: string; label: string }>;
  results: Array<{ label: string; before: string; after: string }>;
}

/** The board memo as a document: the learner's own words, the decisions and the results. */
export function memoHtml(m: MemoInput, level: number): string {
  return `<article class="bb-memo" aria-labelledby="bb-memo-h">
<header class="bb-memo__head">
<p class="bb-memo__kicker">Board memo · Fictional company · Simulated figures</p>
<${h(level)} class="bb-memo__title" id="bb-memo-h">${esc(m.question)}</${h(level)}>
<dl class="bb-memo__meta"><div><dt>To</dt><dd>The board of ${esc(m.company)}</dd></div><div><dt>From</dt><dd>${esc(ROLE_TITLES[m.role])}</dd></div><div><dt>Date</dt><dd>${esc(m.date)}</dd></div></dl>
</header>
${m.fields
  .map((f, i) => `<section class="bb-memo__part"><${h(level + 1)}>${i + 1}. ${esc(f.label)}</${h(level + 1)}>${f.text.trim() ? `<div class="bb-memo__text">${plainParas(f.text)}</div>` : '<p class="bb-memo__empty">Not written yet.</p>'}</section>`)
  .join('')}
<section class="bb-memo__part"><${h(level + 1)}>Decisions taken</${h(level + 1)}><ol class="bb-memo__decisions">${m.decisions.map((d) => `<li><strong>${esc(d.period)}:</strong> ${esc(d.label)}</li>`).join('')}</ol></section>
<section class="bb-memo__part"><${h(level + 1)}>Results</${h(level + 1)}><div class="table-scroll" role="region" aria-label="Results in the memo" tabindex="0"><table class="table"><thead><tr><th scope="col">Measure</th><th scope="col" class="n">Before</th><th scope="col" class="n">After</th></tr></thead><tbody>${m.results
    .map((r) => `<tr><th scope="row">${esc(r.label)}</th><td class="n">${esc(r.before)}</td><td class="n">${esc(r.after)}</td></tr>`)
    .join('')}</tbody></table></div></section>
</article>`;
}

/** A learner's own text as escaped paragraphs: no formatting marks are interpreted. */
export function plainParas(text: string): string {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** The same memo as plain text, to copy or download. */
export function memoText(m: MemoInput): string {
  const lines = [
    'BOARD MEMO (fictional company, simulated figures)',
    `To: The board of ${m.company}`,
    `From: ${ROLE_TITLES[m.role]}`,
    `Date: ${m.date}`,
    `Subject: ${m.question}`,
    '',
    ...m.fields.flatMap((f, i) => [`${i + 1}. ${f.label}`, f.text.trim() || '(not written)', '']),
    'Decisions taken',
    ...m.decisions.map((d) => `- ${d.period}: ${d.label}`),
    '',
    'Results (before, after)',
    ...m.results.map((r) => `- ${r.label}: ${r.before}, ${r.after}`),
    '',
    'Written in the Boardroom of The Business Brief. The company is fictional and every figure is simulated.',
  ];
  return lines.join('\n');
}

/** The effects of a round that apply whatever the board decides, in words. */
export function givenHtml(effects: Effects, ctx: NarrateContext): string {
  return `<ul class="bb-involves">${describeEffects(effects, ctx, { assumptions: true })
    .map((l) => `<li>${esc(l)}</li>`)
    .join('')}</ul>`;
}
