/**
 * HTML for the Market Studio and Operations Floor tools, rendered both on the
 * server (the default state) and in the browser (after every change), so the
 * two always look the same.
 */
import { fmtMoney, fmtNumber } from './format';
import type { MapAttribute, MapModel, MarketModel } from './market';
import { quadrantLabel } from './market';
import type { CapacityModel, LocFactor, SiteResult, StockRun } from './operations';
import { esc } from './markup';

const fig = (k: string, v: string, note?: string) => `<div class="fig"><dt>${esc(k)}</dt><dd><span class="fig__v">${v}</span>${note ? `<span class="fig__n">${esc(note)}</span>` : ''}</dd></div>`;
const pc = (v: number | null, d = 1) => (v === null ? 'n/a' : `${fmtNumber(v, d)}%`);
const signed = (v: number | null, d = 1) => (v === null ? 'n/a' : `${v > 0.00001 ? '+' : ''}${fmtNumber(v, d)}`);

/* ---------- Market share ---------- */

export function marketFiguresHtml(m: MarketModel, focusId: string, periods: { last: string; now: string }, unit: string): string {
  const f = m.firms.find((x) => x.id === focusId);
  const leader = m.firms.find((x) => x.id === m.leaderNow);
  return [
    fig(`Market in ${periods.last}`, `${esc(fmtNumber(m.totalLast))} ${esc(unit)}`),
    fig(`Market in ${periods.now}`, `${esc(fmtNumber(m.totalNow))} ${esc(unit)}`),
    fig('Market growth', esc(pc(m.growth)), m.growth === null ? undefined : m.growth >= 0 ? 'the market grew' : 'the market shrank'),
    fig(`${f?.name ?? 'Firm'}: share in ${periods.now}`, esc(pc(f?.shareNow ?? null)), f ? `${pc(f.shareLast)} in ${periods.last}` : undefined),
    fig(`${f?.name ?? 'Firm'}: change in share`, `${esc(signed(f?.shareChange ?? null))} pts`, 'percentage points'),
    fig(`${f?.name ?? 'Firm'}: growth in sales`, esc(f?.salesGrowth === null || !f ? 'n/a' : `${signed(f.salesGrowth)}%`)),
    fig('Market leader', esc(leader?.name ?? 'No single leader'), leader ? `${pc(leader.shareNow)} of the market` : undefined),
  ].join('');
}

export function marketTableHtml(m: MarketModel, focusId: string): string {
  const rows = m.firms
    .map(
      (f) =>
        `<tr${f.id === focusId ? ' class="is-focus"' : ''}><th scope="row">${esc(f.name)}${f.group ? ' <span class="small muted">(a group)</span>' : ''}</th><td class="n">${esc(fmtNumber(f.last))}</td><td class="n">${esc(pc(f.shareLast))}</td><td class="n">${esc(fmtNumber(f.now))}</td><td class="n">${esc(pc(f.shareNow))}</td><td class="n">${esc(signed(f.shareChange))}</td><td class="n">${esc(f.salesGrowth === null ? 'n/a' : `${signed(f.salesGrowth)}%`)}</td><td class="n">${f.group ? '' : `${f.rankLast} → ${f.rankNow}`}</td></tr>`,
    )
    .join('');
  return `${rows}<tr class="is-total"><th scope="row">Market</th><td class="n">${esc(fmtNumber(m.totalLast))}</td><td class="n">100%</td><td class="n">${esc(fmtNumber(m.totalNow))}</td><td class="n">100%</td><td class="n"></td><td class="n">${esc(m.growth === null ? 'n/a' : `${signed(m.growth)}%`)}</td><td class="n"></td></tr>`;
}

/* ---------- Position map ---------- */

export function mapTableHtml(m: MapModel, x: MapAttribute, y: MapAttribute, focusId: string): string {
  return m.points
    .map(
      (p) =>
        `<tr${p.id === focusId ? ' class="is-focus"' : ''}><th scope="row">${esc(p.name)}</th><td class="n">${esc(fmtNumber(p.x, 1))}</td><td class="n">${esc(fmtNumber(p.y, 1))}</td><td>${esc(quadrantLabel(p.quadrant, x, y))}</td></tr>`,
    )
    .join('');
}

/* ---------- Capacity and productivity ---------- */

export function capacityFiguresHtml(m: CapacityModel, currency: string, unit: { one: string; many: string }): string {
  const i = m.inputs;
  return [
    fig('Capacity utilization', esc(pc(m.utilization)), `${fmtNumber(i.output)} of ${fmtNumber(i.capacity)} ${unit.many}`),
    fig('Defect rate', esc(pc(m.defectRate, 2)), `${fmtNumber(i.rejected)} of ${fmtNumber(i.made)} ${unit.many} failed inspection`),
    fig('Labour productivity', m.labourProductivity === null ? 'n/a' : `${esc(fmtNumber(m.labourProductivity, 2))}`, `good ${unit.many} a labour hour`),
    fig('Productivity rate', esc(pc(m.productivityRate)), 'output value ÷ input cost × 100'),
    fig(`Fixed cost carried by each ${unit.one}`, m.fixedCostPerUnit === null ? 'n/a' : esc(fmtMoney(m.fixedCostPerUnit, currency, 2)), `${fmtMoney(i.fixedCosts, currency, 0)} ÷ ${fmtNumber(i.output)} ${unit.many}`),
  ].join('');
}

/** A bar of capacity: output used, spare capacity, and the busy zone marked from 85%. */
export function capacityBarStudioHtml(m: CapacityModel, unit: { many: string }): string {
  const i = m.inputs;
  const used = i.capacity > 0 ? Math.min(100, (i.output / i.capacity) * 100) : 0;
  return `<div class="cpu__track" role="img" aria-label="${esc(`${fmtNumber(used, 1)}% of capacity used: ${fmtNumber(i.output)} of ${fmtNumber(i.capacity)} ${unit.many}`)}">
<span class="cpu__used" style="width:${used.toFixed(2)}%"></span>
<span class="cpu__mark" style="left:85%"><span>85%</span></span>
</div>
<ul class="cpu__key"><li><span class="cpu__sw cpu__sw--used"></span>Used: ${esc(fmtNumber(i.output))} ${esc(unit.many)}</li><li><span class="cpu__sw cpu__sw--spare"></span>Spare: ${esc(fmtNumber(m.spare))} ${esc(unit.many)}</li><li><span class="cpu__sw cpu__sw--mark"></span>From 85%: little room for a rush order or a breakdown</li></ul>`;
}

/* ---------- Stock control ---------- */

export function stockFiguresHtml(run: StockRun, unit: { one: string; many: string }): string {
  const u = (n: number) => `${esc(fmtNumber(n, Number.isInteger(n) ? 0 : 1))} ${esc(n === 1 ? unit.one : unit.many)}`;
  const cycle = run.plan.reorderQty / run.plan.usage;
  return [
    fig('Reorder level', u(run.reorderLevel), `${fmtNumber(run.plan.buffer)} + ${fmtNumber(run.plan.usage, 1).replace(/\.0$/, '')} × ${fmtNumber(run.plan.leadTime, 1).replace(/\.0$/, '')}`),
    fig('Maximum stock', u(run.maxStock), `${fmtNumber(run.plan.buffer)} + ${fmtNumber(run.plan.reorderQty)}`),
    fig('Weeks an order lasts', esc(fmtNumber(cycle, Number.isInteger(cycle) ? 0 : 1)), 'reorder quantity ÷ usage a week'),
    fig('Lowest stock', u(run.minStock), run.minStock < run.plan.buffer - 1e-9 ? 'below the buffer' : 'never below the buffer'),
  ].join('');
}

export function stockTableHtml(run: StockRun): string {
  const n = (v: number) => esc(fmtNumber(v, Number.isInteger(v) ? 0 : 1));
  return run.rows
    .map(
      (r) =>
        `<tr${r.end < run.plan.buffer - 1e-9 ? ' class="is-low"' : ''}><th scope="row">${r.week}</th><td class="n">${n(r.start)}</td><td class="n">${n(r.used)}</td><td class="n">${r.delivered ? n(r.delivered) : ''}</td><td class="n">${n(r.end)}</td><td>${r.ordered ? 'Order placed' : ''}${r.end < run.plan.buffer - 1e-9 ? `${r.ordered ? '; ' : ''}below the buffer` : ''}</td></tr>`,
    )
    .join('');
}

/* ---------- Location ---------- */

export function locationTableHtml(results: SiteResult[], maxTotal: number): string {
  return results
    .map(
      (r) =>
        `<tr${r.rank === 1 ? ' class="is-focus"' : ''}><th scope="row" class="loc__site-cell">${esc(r.name)}</th><td class="n">${r.rank}</td><td class="n">${esc(fmtNumber(r.total))}</td><td class="n">${esc(fmtNumber(r.share, 1))}%</td><td class="loc__barcell"><span class="loc__bar" aria-hidden="true"><span style="width:${maxTotal > 0 ? ((r.total / maxTotal) * 100).toFixed(2) : '0'}%"></span></span></td></tr>`,
    )
    .join('');
}

export function lowScoresHtml(flags: Array<{ site: string; factor: string; score: number }>, sites: Array<{ id: string; name: string }>, factors: LocFactor[], threshold: number, maxScore: number): string {
  if (!flags.length) return `<p class="small muted">No score is ${threshold} or below.</p>`;
  const name = (id: string) => sites.find((s) => s.id === id)?.name ?? id;
  const label = (id: string) => factors.find((f) => f.id === id)?.label.toLowerCase() ?? id;
  return `<ul class="loc__flags">${flags.map((f) => `<li><strong>${esc(name(f.site))}</strong>: ${esc(label(f.factor))}, ${f.score} out of ${maxScore}</li>`).join('')}</ul>`;
}
