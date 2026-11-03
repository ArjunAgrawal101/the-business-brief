/**
 * HTML fragments for the Entrepreneurship and Innovation Lab, used by the
 * server render and by the browser scripts, so a tool reads the same before
 * and after its script runs. Every string from the learner is escaped.
 */
import { fmtMoney, fmtNumber } from '../format';
import { esc } from '../markup';
import { CANVAS_BLOCKS, LENS_WORDS, RISK_WORDS, type BlockId, type Canvas, type RankedAssumption } from './canvas';
import { FUNDING_LABELS, HORIZON, type CostModel } from './costs';
import { VERDICT_WORDS as FEAS_WORDS, type Assessment, type Criterion, type Idea } from './feasibility';
import type { RevenueModel, Sensitivity } from './revenue';
import { swatchSvg } from './charts';
import { VERDICT_WORDS as UNIT_WORDS, verdict, type UnitModel } from './unit-economics';

const fig = (k: string, v: string, note?: string) =>
  `<div class="fig"><dt>${esc(k)}</dt><dd><span class="fig__v">${v}</span>${note ? `<span class="fig__n">${esc(note)}</span>` : ''}</dd></div>`;

const signed = (v: number, currency: string, d = 0) => (v < 0 ? `<span class="lab-neg">${esc(fmtMoney(v, currency, d))}</span>` : esc(fmtMoney(v, currency, d)));

/* ---------- Start-up costs ---------- */

export function costFiguresHtml(m: CostModel, currency: string): string {
  const money = (v: number) => esc(fmtMoney(v, currency, 0));
  return [
    fig('One-off costs', money(m.oneOffTotal), 'paid before trading starts'),
    fig('Monthly outgoings', money(m.monthlyTotal), 'including loan repayments'),
    fig('Funding', money(m.fundingTotal)),
    fig('Cash at launch', signed(m.cashAtLaunch, currency), 'funding minus one-off costs'),
    fig('Runway with expected sales', m.runOut === null ? `${HORIZON}+ months` : `${m.runway} ${m.runway === 1 ? 'month' : 'months'}`, m.runOut === null ? `lasts all ${HORIZON} months shown` : `runs out in month ${m.runOut}`),
    fig('Runway with no sales', m.zeroSalesRunway === null ? 'Not limited' : `${esc(fmtNumber(m.zeroSalesRunway, 1))} months`, 'cash at launch ÷ monthly outgoings'),
    fig('Sales cover outgoings', m.breakEvenMonth === null ? 'Not yet' : `Month ${m.breakEvenMonth}`, m.breakEvenMonth === null ? `not within ${HORIZON} months` : 'first month contribution ≥ outgoings'),
    fig('Funding gap', m.gap > 0 ? money(m.gap) : 'None', m.gap > 0 ? 'to stay above zero' : `cash stays above zero for ${HORIZON} months`),
  ].join('');
}

export function costTableHtml(m: CostModel, currency: string): string {
  const money = (v: number) => signed(v, currency);
  return m.months
    .map(
      (r) =>
        `<tr${m.runOut === r.month ? ' class="is-focus"' : ''}><th scope="row">${r.month}${m.runOut === r.month ? '<span class="sr-only"> (cash runs out)</span>' : ''}</th><td class="n">${money(r.opening)}</td><td class="n">${money(-r.outgoings)}</td><td class="n">${esc(fmtMoney(r.contribution, currency, 0))}</td><td class="n">${money(r.closing)}</td><td class="n">${money(r.noSales)}</td></tr>`,
    )
    .join('');
}

export function mixHtml(m: CostModel, currency: string): string {
  if (!m.mix.length) return '<p class="small muted">No funding entered yet.</p>';
  return `<ul class="lab-mix" role="list">${m.mix
    .map(
      (x) =>
        `<li><span class="lab-mix__head"><span class="lab-mix__label">${esc(FUNDING_LABELS[x.kind].label)}</span><span class="num">${esc(fmtMoney(x.amount, currency, 0))} · ${esc(fmtNumber(x.share, 0))}%</span></span><span class="lab-bar" aria-hidden="true"><span style="width:${Math.min(100, Math.max(0, x.share)).toFixed(1)}%"></span></span><span class="small muted">${esc(FUNDING_LABELS[x.kind].note)}</span></li>`,
    )
    .join('')}</ul>`;
}

/* ---------- Revenue ---------- */

export function revenueFiguresHtml(m: RevenueModel, currency: string): string {
  const money = (v: number) => esc(fmtMoney(v, currency, 0));
  const out = [fig('Revenue in the year', money(m.revenue)), fig('Month 1', money(m.first)), fig(`Month ${m.months.length}`, money(m.last), m.multiple === null ? undefined : `${fmtNumber(m.multiple, 1)} times month 1`)];
  if (m.fees > 0) out.push(fig('After channel fees', money(m.net), `fees ${fmtMoney(m.fees, currency, 0)}`));
  if (m.streams.some((s) => s.kind === 'subscription')) out.push(fig(`Subscribers in month ${m.months.length}`, esc(fmtNumber(m.endSubscribers)), `${fmtNumber(m.lost)} cancelled during the year`));
  return out.join('');
}

/** The whole forecast table: a column per stream, then the totals. */
export function revenueTableHtml(m: RevenueModel, currency: string): string {
  const money = (v: number) => esc(fmtMoney(v, currency, 0));
  const hasFees = m.fees > 0;
  const unitWord = (k: string) => (k === 'subscription' ? 'subscribers' : 'units');
  const head = `<thead><tr><th scope="col">Month</th>${m.streams.map((s) => `<th scope="col" class="n">${esc(s.label)}</th>`).join('')}<th scope="col" class="n">Revenue</th>${hasFees ? '<th scope="col" class="n">Channel fees</th><th scope="col" class="n">After fees</th>' : ''}</tr></thead>`;
  const body = m.months
    .map(
      (r) =>
        `<tr><th scope="row">${r.month}</th>${r.streams
          .map((c, i) => `<td class="n">${money(c.revenue)}<span class="lab-sub">${esc(fmtNumber(c.units))} ${unitWord(m.streams[i]?.kind ?? 'units')}</span></td>`)
          .join('')}<td class="n"><strong>${money(r.revenue)}</strong></td>${hasFees ? `<td class="n">${money(-r.fees)}</td><td class="n">${money(r.net)}</td>` : ''}</tr>`,
    )
    .join('');
  const foot = `<tfoot><tr><th scope="row">Year</th>${m.totals.map((t) => `<td class="n">${money(t.revenue)}<span class="lab-sub">${esc(fmtNumber(t.share, 0))}%</span></td>`).join('')}<td class="n">${money(m.revenue)}</td>${hasFees ? `<td class="n">${money(-m.fees)}</td><td class="n">${money(m.net)}</td>` : ''}</tr></tfoot>`;
  return `${head}<tbody>${body}</tbody>${foot}`;
}

export function legendHtml(m: RevenueModel, chartId: string): string {
  return `<ul class="lab-legend" role="list">${m.streams.map((s, i) => `<li>${swatchSvg(i, chartId)}<span>${esc(s.label)}</span></li>`).join('')}</ul>`;
}

export function sensitivityHtml(sens: Sensitivity[], base: number, currency: string): string {
  return sens
    .map(
      (s) =>
        `<tr><th scope="row">${esc(s.label)}</th><td class="n">${esc(fmtMoney(s.revenue, currency, 0))}</td><td class="n">${signed(s.change, currency)}</td><td class="n">${s.changePct === null ? 'n/a' : esc(`${fmtNumber(s.changePct, 1)}%`)}</td></tr>`,
    )
    .join('') + `<tr class="lab-base"><th scope="row">The forecast as entered</th><td class="n">${esc(fmtMoney(base, currency, 0))}</td><td class="n">0</td><td class="n">0%</td></tr>`;
}

/* ---------- Unit economics ---------- */

export function unitFiguresHtml(u: UnitModel, currency: string): string {
  const m2 = (v: number) => esc(fmtMoney(v, currency, 2));
  const v = verdict(u);
  return [
    fig('Customer acquisition cost', u.cac === null ? 'n/a' : m2(u.cac), 'to win one customer'),
    fig('Contribution per customer', m2(u.contribution), u.margin === null ? 'a month' : `a month, ${fmtNumber(u.margin, 1)}% of revenue`),
    fig('Expected lifetime', `${esc(fmtNumber(u.lifetime, 1))} months`, u.capped ? 'the cap applies' : '1 ÷ monthly churn'),
    fig('Lifetime value', m2(u.ltv), 'contribution over the lifetime'),
    fig('LTV to CAC', u.ratio === null ? 'n/a' : `${esc(fmtNumber(u.ratio, 1))} to 1`, UNIT_WORDS[v]),
    fig('CAC payback', u.payback === null ? 'Never' : `${esc(fmtNumber(u.payback, 1))} months`, u.payback !== null && u.payback > u.lifetime ? 'longer than the customer stays' : 'months of contribution to earn it back'),
  ].join('');
}

/* ---------- Feasibility ---------- */

export function rankingHtml(a: Assessment, criteria: Criterion[]): string {
  const label = (id: string) => criteria.find((c) => c.id === id)?.label ?? id;
  return a.results
    .map(
      (r) =>
        `<tr${r.rank === 1 ? ' class="is-focus"' : ''}><th scope="row" class="lab-idea-cell">${esc(r.name)}</th><td class="n">${r.rank}</td><td class="n">${esc(fmtNumber(r.total))} / ${esc(fmtNumber(a.max))}</td><td class="n">${esc(fmtNumber(r.share, 1))}%</td><td class="lab-barcell"><span class="lab-bar" aria-hidden="true"><span style="width:${Math.min(100, Math.max(0, r.share)).toFixed(1)}%"></span></span></td><td><span class="lab-verdict lab-verdict--${r.verdict}">${esc(FEAS_WORDS[r.verdict])}</span>${r.flaws.length ? `<span class="lab-sub">must-have below the floor: ${esc(r.flaws.map(label).join(', ').toLowerCase())}</span>` : ''}</td></tr>`,
    )
    .join('');
}

/* ---------- The canvas ---------- */

export function riskiestHtml(list: RankedAssumption[], labels: Record<BlockId, string>): string {
  if (!list.length) return '<p class="small muted">No assumptions yet. Mark an entry as an assumption to rank it here.</p>';
  return `<ol class="lab-risk-list" role="list">${list
    .map(
      (e) =>
        `<li><span class="lab-risk-list__no" aria-hidden="true">${e.rank}</span><span class="lab-risk-list__body"><span class="lab-risk-list__text">${esc(e.text.trim())}</span><span class="lab-risk-list__meta"><span class="lab-risk lab-risk--${e.risk}">Risk ${e.risk} of 5, ${esc(RISK_WORDS[e.risk]?.toLowerCase() ?? '')}</span> <span>${esc(labels[e.block])}</span> <span>${esc(LENS_WORDS[e.lens])}</span></span>${e.note.trim() ? `<span class="lab-risk-list__test"><b>Test:</b> ${esc(e.note.trim())}</span>` : '<span class="lab-risk-list__test lab-risk-list__test--none">No test written yet: how could you find out cheaply whether this is true?</span>'}</span></li>`,
    )
    .join('')}</ol>`;
}

/** The read-only nine-block canvas: the printed sheet. */
export function boardHtml(c: Canvas, labels: Record<BlockId, string>, order: Record<BlockId, number>): string {
  return CANVAS_BLOCKS.map((b) => {
    const items = c.entries.filter((e) => e.block === b && e.text.trim());
    return `<section class="lab-board__block lab-board__block--${b}" aria-label="${esc(labels[b])}"><h4 class="lab-board__name"><span class="lab-board__no" aria-hidden="true">${order[b]}</span>${esc(labels[b])}</h4>${
      items.length
        ? `<ul class="lab-board__notes" role="list">${items
            .map((e) => `<li class="lab-note lab-note--${e.kind}"><span class="lab-note__text">${esc(e.text.trim())}</span><span class="lab-note__meta">${e.kind === 'assumption' ? 'Assumption' : 'Evidence'} · risk ${e.risk}</span></li>`)
            .join('')}</ul>`
        : '<p class="lab-board__empty">Empty</p>'
    }</section>`;
  }).join('');
}

export function ideaScoresHead(ideas: Idea[]): string {
  return ideas.map((i) => `<th scope="col" class="n">${esc(i.name)}</th>`).join('');
}

/** Rows for the payback chart's table: one customer, month by month. */
export function paybackTableHtml(u: UnitModel, currency: string): string {
  const cac = u.cac ?? 0;
  const span = Math.min(60, Math.max(1, Math.ceil(Math.max(u.lifetime, u.payback ?? 0))));
  const rows: string[] = [];
  for (let m = 0; m <= span; m += 1) {
    const sofar = u.contribution * Math.min(m, u.lifetime);
    rows.push(`<tr><th scope="row">${m}</th><td class="n">${esc(fmtMoney(sofar, currency, 2))}</td><td class="n">${signed(sofar - cac, currency, 2)}</td></tr>`);
  }
  return rows.join('');
}
