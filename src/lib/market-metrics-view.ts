/**
 * HTML for the market metrics calculators, shared by the server render and
 * the browser script.
 */
import { fmtMoney, fmtNumber } from './format';
import { esc } from './markup';
import { readMarket } from './market';
import { fig, numberField, removeButton, textField } from './market-view';
import { clvAtRetention, focusGrowth, readClv, type ClvModel, type MetricsFirm, type MetricsState, type MetricsView } from './market-metrics';

const pc = (v: number | null, d = 1) => (v === null ? 'n/a' : `${fmtNumber(v, d)}%`);
const signed = (v: number | null, d = 1) => (v === null ? 'n/a' : `${v > 0.00001 ? '+' : ''}${fmtNumber(v, d)}`);

/** One editable row of the sellers table. */
export function firmRowHtml(f: MetricsFirm, uid: string, s: Pick<MetricsState, 'periods'>, n: number): string {
  const id = (k: string) => `${uid}-firm-${f.id}-${k}`;
  const who = f.name.trim() || `seller ${n}`;
  return `<tr data-row="${esc(f.id)}"${f.group ? ' class="is-group"' : ''}>
<td>${textField({ id: id('name'), f: 'name', label: `Seller ${n}: name`, value: f.name, srLabel: true, max: 60 })}</td>
<td class="n">${numberField({ id: id('last'), f: 'last', label: `${who}: sales in ${s.periods.last}`, value: f.last, min: 0, srLabel: true })}</td>
<td class="n">${numberField({ id: id('now'), f: 'now', label: `${who}: sales in ${s.periods.now}`, value: f.now, min: 0, srLabel: true })}</td>
<td><label class="mk-check mk-check--compact" for="${esc(id('group'))}"><input type="checkbox" id="${esc(id('group'))}" data-f="group"${f.group ? ' checked' : ''} /><span>Group<span class="sr-only"> of many small sellers: ${esc(who)}</span></span></label></td>
<td class="mk-cell-act">${removeButton('Remove', who)}</td>
</tr>`;
}

export function focusOptionsHtml(s: MetricsState): string {
  return s.firms
    .filter((f) => !f.group)
    .map((f) => `<option value="${esc(f.id)}"${f.id === s.focus ? ' selected' : ''}>${esc(f.name || 'Unnamed seller')}</option>`)
    .join('');
}

const amount = (v: number, s: MetricsState) => (s.basis === 'value' && s.symbol ? fmtMoney(v, s.symbol, 0) : `${fmtNumber(v)} ${s.unit}`);

export function metricsFiguresHtml(v: MetricsView, s: MetricsState): string {
  const m = v.model;
  const f = m.firms.find((x) => x.id === s.focus);
  const leader = m.firms.find((x) => x.id === m.leaderNow);
  return [
    fig(`Market in ${s.periods.last}`, esc(amount(m.totalLast, s))),
    fig(`Market in ${s.periods.now}`, esc(amount(m.totalNow, s))),
    fig('Market growth', esc(pc(m.growth)), m.growth === null ? undefined : m.growth >= 0 ? 'the market grew' : 'the market shrank'),
    fig(`${f?.name ?? 'Focus'}: market share`, esc(pc(f?.shareNow ?? null)), f ? `${pc(f.shareLast)} in ${s.periods.last}` : undefined),
    fig(`${f?.name ?? 'Focus'}: change in share`, `${esc(signed(f?.shareChange ?? null))} pts`, 'percentage points'),
    fig(`${f?.name ?? 'Focus'}: sales growth`, esc(f?.salesGrowth === null || !f ? 'n/a' : `${signed(f.salesGrowth)}%`)),
    fig('Relative market share', esc(v.relative === null ? 'n/a' : fmtNumber(v.relative, 2)), v.rival ? `against ${v.rival.name}, the largest rival` : undefined),
    fig('Market leader', esc(leader?.name ?? 'No single leader'), leader ? `${pc(leader.shareNow)} of the market` : undefined),
  ].join('');
}

/** The reading for the market, from market.ts, with a line on relative share. */
export function metricsReading(v: MetricsView, s: MetricsState): { reading: string; implication: string } {
  const r = readMarket(v.model, s.focus, s.periods, s.unit);
  const f = s.firms.find((x) => x.id === s.focus);
  const rel =
    v.relative === null || !f
      ? ''
      : v.relative >= 1
        ? ` Its relative market share is ${fmtNumber(v.relative, 2)}: it sells ${v.relative === 1 ? 'as much as' : `${fmtNumber(v.relative, 2)} times as much as`} its largest rival.`
        : ` Its relative market share is ${fmtNumber(v.relative, 2)}: it sells ${fmtNumber(v.relative * 100, 0)}% as much as ${v.rival?.name ?? 'its largest rival'}.`;
  return { reading: `${r.reading}${rel}`, implication: r.implication };
}

/** The working for relative market share, in the same eight parts. */
export function relativeWorkingParts(v: MetricsView, s: MetricsState): { formula: string; sub: string; answer: string } | null {
  const f = s.firms.find((x) => x.id === s.focus);
  if (!f || !v.rival || v.relative === null) return null;
  return {
    formula: "Relative market share = the firm's sales ÷ the largest rival's sales",
    sub: `= ${fmtNumber(f.now)} ÷ ${fmtNumber(v.rival.now)} = ${fmtNumber(v.relative, 2)}`,
    answer: fmtNumber(v.relative, 2),
  };
}

export function relativeWorkingHtml(v: MetricsView, s: MetricsState): string {
  const p = relativeWorkingParts(v, s);
  if (!p) return '<p class="small muted">Relative market share needs a focus business and at least one named rival.</p>';
  const f = s.firms.find((x) => x.id === s.focus);
  return `<dl class="working">
<dt>Given</dt><dd><ul><li>${esc(f?.name ?? '')}: <span class="num">${esc(amount(f?.now ?? 0, s))}</span></li><li>${esc(v.rival?.name ?? '')}, the largest named rival: <span class="num">${esc(amount(v.rival?.now ?? 0, s))}</span></li></ul></dd>
<dt>Formula</dt><dd class="w-math">${esc(p.formula)}</dd>
<dt>Substitution</dt><dd class="w-math">${esc(p.sub)}</dd>
<dt>Answer</dt><dd><span class="w-answer">${esc(p.answer)}</span><p class="small muted" style="margin-top:0.35rem">Equivalently, its share divided by the rival's share. The BCG matrix, a toolkit tool, uses relative market share on one axis; the guide's formula list does not include it.</p></dd>
<dt>Unit</dt><dd>A ratio: above 1 means the business leads its market</dd>
</dl>`;
}

/* ---------- Customer lifetime value ---------- */

export function clvFiguresHtml(k: ClvModel, sym: string): string {
  return [
    fig('Margin a year per customer', esc(fmtMoney(k.annualMargin, sym, 2))),
    fig('Expected years as a customer', esc(fmtNumber(k.lifetime, 2)), '1 ÷ (1 − retention rate)'),
    fig('Customer lifetime value', esc(fmtMoney(k.clv, sym, 2)), 'in today’s money'),
    fig('Value less acquisition cost', esc(fmtMoney(k.net, sym, 2))),
    fig('Value ÷ acquisition cost', esc(k.ratio === null ? 'n/a' : `${fmtNumber(k.ratio, 1)} times`)),
    fig('Months to repay acquisition', esc(k.paybackMonths === null ? 'n/a' : fmtNumber(k.paybackMonths, 1)), 'months of margin, not discounted'),
  ].join('');
}

export function clvRowsHtml(k: ClvModel, sym: string): string {
  return k.rows
    .map(
      (r) =>
        `<tr><th scope="row">Year ${r.year}</th><td class="n">${esc(fmtNumber(r.survival * 100, 1))}%</td><td class="n">${esc(fmtMoney(r.margin, sym, 2))}</td><td class="n">${esc(fmtNumber(r.factor, 3))}</td><td class="n">${esc(fmtMoney(r.pv, sym, 2))}</td><td class="n">${esc(fmtMoney(r.cumulative, sym, 2))}</td></tr>`,
    )
    .join('');
}

export function clvReadingHtml(k: ClvModel, sym: string): { reading: string; implication: string; sensitivity: string } {
  const r = readClv(k, sym);
  const c = k.inputs;
  const up = Math.min(99, c.retention + 10);
  const down = Math.max(0, c.retention - 10);
  const sensitivity = `At ${fmtNumber(up, 0)}% retention the value would be ${fmtMoney(clvAtRetention(c, up), sym, 2)}; at ${fmtNumber(down, 0)}%, ${fmtMoney(clvAtRetention(c, down), sym, 2)}.`;
  return { ...r, sensitivity };
}

/** One line for the live region after a change. */
export function metricsAnnouncement(v: MetricsView, s: MetricsState): string {
  const f = v.model.firms.find((x) => x.id === s.focus);
  const g = focusGrowth(s);
  return `Market growth ${pc(v.model.growth)}. ${f ? `${f.name}: share ${pc(f.shareNow)}, sales growth ${pc(g)}.` : ''} Lifetime value ${fmtMoney(v.clv.clv, s.symbol, 2)}.`;
}
