/**
 * HTML and SVG for the stock control simulator, rendered on the server for
 * the worked example and in the browser after every change.
 */
import { niceCeil, niceStep } from './charts';
import { esc } from './markup';
import { fmtMoney, fmtNumber } from './format';
import { weekList, type StockSimResult, type StockUnits } from './stock-sim';
import { P, r1, svgChart } from './tool-palette';

const n = (v: number) => fmtNumber(v, Number.isInteger(Math.round(v * 10) / 10) ? 0 : 1);

/** Intervals in which stock stood at zero, from the stock line. */
export function stockOutIntervals(points: Array<[number, number]>): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let k = 1; k < points.length; k += 1) {
    const p = points[k - 1];
    const q = points[k];
    if (!p || !q) continue;
    if (p[1] <= 1e-9 && q[1] <= 1e-9 && q[0] - p[0] > 1e-9) {
      const last = out[out.length - 1];
      if (last && Math.abs(last[1] - p[0]) < 1e-9) last[1] = q[0];
      else out.push([p[0], q[0]]);
    }
  }
  return out;
}

export function stockSimSvg(r: StockSimResult, o: { id: string; units: StockUnits }): string {
  const W = 700;
  const H = 430;
  const L = 60;
  const R = 150;
  const T = 26;
  const B1 = 262;
  const S0 = 300;
  const S1 = 378;
  const weeks = r.weeks;
  const run = r.run;
  const ymax = niceCeil(Math.max(r.maxStock, r.inputs.reorderLevel, ...run.points.map((p) => p[1]), 1) * 1.08, 5);
  const x = (t: number) => L + (t / Math.max(1, weeks)) * (W - L - R);
  const y = (v: number) => B1 - (v / ymax) * (B1 - T);
  const parts: string[] = [];
  const ys = niceStep(ymax, 5);
  for (let v = 0; v <= ymax + 1e-9; v += ys) {
    parts.push(`<line x1="${L}" y1="${r1(y(v))}" x2="${W - R}" y2="${r1(y(v))}" stroke="${P.hair}"/>`);
    parts.push(`<text x="${L - 8}" y="${r1(y(v)) + 4}" text-anchor="end" class="ch-tick">${esc(fmtNumber(v))}</text>`);
  }
  // Stock-outs: shaded across the chart and labelled, so they never rest on colour alone.
  const outs = stockOutIntervals(run.points);
  for (const [a, b] of outs) {
    parts.push(`<rect x="${r1(x(a))}" y="${T}" width="${r1(Math.max(2, x(b) - x(a)))}" height="${B1 - T}" fill="${P.signal}" fill-opacity="0.13"/>`);
    parts.push(`<line x1="${r1(x(a))}" y1="${B1}" x2="${r1(x(b))}" y2="${B1}" stroke="${P.signal}" stroke-width="5"/>`);
    parts.push(`<text x="${r1((x(a) + x(b)) / 2)}" y="${T + 12}" text-anchor="middle" class="ch-label" fill="${P.signalText}">Stock-out</text>`);
  }
  // The buffer zone and the three levels, each named in words at the right.
  parts.push(`<rect x="${L}" y="${r1(y(r.inputs.buffer))}" width="${W - L - R}" height="${r1(B1 - y(r.inputs.buffer))}" fill="${P.green}" fill-opacity="0.07"/>`);
  const levels = [
    { v: r.maxStock, label: `Maximum ${n(r.maxStock)}`, color: P.slate, dash: '2 4' },
    { v: r.inputs.reorderLevel, label: `Reorder level ${n(r.inputs.reorderLevel)}`, color: P.cobaltText, dash: '7 5' },
    { v: r.inputs.buffer, label: `Buffer ${n(r.inputs.buffer)}`, color: P.greenText, dash: '' },
  ];
  let lastY = -Infinity;
  for (const lv of [...levels].sort((a, b) => b.v - a.v)) {
    parts.push(`<line x1="${L}" y1="${r1(y(lv.v))}" x2="${W - R}" y2="${r1(y(lv.v))}" stroke="${lv.color}" stroke-width="1.5"${lv.dash ? ` stroke-dasharray="${lv.dash}"` : ''}/>`);
    let ly = y(lv.v) + 4;
    if (ly - lastY < 15) ly = lastY + 15;
    lastY = ly;
    parts.push(`<text x="${W - R + 8}" y="${r1(ly)}" class="ch-label" fill="${lv.color}">${esc(lv.label)}</text>`);
  }
  parts.push(`<path d="${run.points.map((p, k) => `${k ? 'L' : 'M'}${r1(x(p[0]))} ${r1(y(p[1]))}`).join(' ')}" fill="none" stroke="${P.navy}" stroke-width="2.5" stroke-linejoin="round"/>`);
  // Each order: a numbered mark where it was placed.
  run.orders.forEach((ord, k) => {
    if (ord.placed > weeks) return;
    const cx = x(ord.placed);
    const cy = y(ord.level);
    parts.push(`<circle cx="${r1(cx)}" cy="${r1(cy)}" r="8" fill="${P.cobalt}" stroke="#fff" stroke-width="1.5"/>`);
    parts.push(`<text x="${r1(cx)}" y="${r1(cy + 4)}" text-anchor="middle" class="ch-note stk-sim__no" fill="#fff">${k + 1}</text>`);
  });
  const late = r.inputs.late && r.inputs.late.extraWeeks > 0 ? run.orders[r.inputs.late.order - 1] : undefined;
  if (late && late.arrives <= weeks) {
    const lx = x(late.arrives);
    parts.push(`<text x="${r1(lx + 6)}" y="${r1(y(r.inputs.reorderQty) - 6)}" class="ch-note" fill="${P.signalText}">Order ${r.inputs.late?.order} arrives ${n(r.inputs.late?.extraWeeks ?? 0)} ${r.inputs.late?.extraWeeks === 1 ? 'week' : 'weeks'} late</text>`);
  }
  parts.push(`<line x1="${L}" y1="${T - 6}" x2="${L}" y2="${B1}" stroke="${P.navy}" stroke-width="1.25"/>`);
  parts.push(`<line x1="${L}" y1="${B1}" x2="${W - R + 6}" y2="${B1}" stroke="${P.navy}" stroke-width="1.25"/>`);
  parts.push(`<text x="14" y="${(T + B1) / 2}" text-anchor="middle" class="ch-axis" transform="rotate(-90 14 ${(T + B1) / 2})">${esc(`Stock (${o.units.many})`)}</text>`);
  // Demand each week, on its own strip under the stock line.
  const dmax = niceCeil(Math.max(1, ...r.inputs.demand), 2);
  const bw = ((W - L - R) / Math.max(1, weeks)) * 0.62;
  parts.push(`<text x="${L}" y="${S0 - 12}" class="ch-region" fill="${P.slate}">Demand each week</text>`);
  parts.push(`<text x="${L - 8}" y="${S0 + 4}" text-anchor="end" class="ch-tick">${esc(fmtNumber(dmax))}</text>`);
  parts.push(`<text x="${L - 8}" y="${S1 + 4}" text-anchor="end" class="ch-tick">0</text>`);
  parts.push(`<line x1="${L}" y1="${S0}" x2="${W - R}" y2="${S0}" stroke="${P.hair}"/>`);
  r.inputs.demand.forEach((d, k) => {
    const h = (d / dmax) * (S1 - S0);
    const cx = x(k + 0.5);
    const out = r.run.rows[k]?.unmet ?? 0;
    const above = d > r.averageDemand + 1e-9;
    parts.push(`<rect x="${r1(cx - bw / 2)}" y="${r1(S1 - h)}" width="${r1(bw)}" height="${r1(h)}" fill="${above ? P.gold : P.navy700}" fill-opacity="${above ? 0.9 : 0.55}"${out > 1e-9 ? ` stroke="${P.signal}" stroke-width="2"` : ''}/>`);
  });
  parts.push(`<line x1="${L}" y1="${S1}" x2="${W - R + 6}" y2="${S1}" stroke="${P.navy}" stroke-width="1.25"/>`);
  const step = weeks > 16 ? 2 : 1;
  for (let t = 0; t <= weeks; t += step) {
    parts.push(`<line x1="${r1(x(t))}" y1="${S1}" x2="${r1(x(t))}" y2="${S1 + 5}" stroke="${P.navy}"/>`);
    parts.push(`<text x="${r1(x(t))}" y="${S1 + 19}" text-anchor="middle" class="ch-tick">${t}</text>`);
  }
  parts.push(`<text x="${(L + W - R) / 2}" y="${H - 8}" text-anchor="middle" class="ch-axis">Weeks</text>`);
  parts.push(`<text x="${W - R + 8}" y="${S0 + 22}" class="ch-note" fill="${P.brassText}">Gold: above</text>`);
  parts.push(`<text x="${W - R + 8}" y="${S0 + 37}" class="ch-note" fill="${P.brassText}">the average</text>`);
  if (r.stockOutWeeks.length) parts.push(`<text x="${W - R + 8}" y="${S0 + 56}" class="ch-note" fill="${P.signalText}">Outlined: stock-out</text>`);
  const u = (v: number) => `${n(v)} ${Math.abs(v - 1) < 1e-9 ? o.units.one : o.units.many}`;
  const desc = `Stock over ${weeks} weeks, starting at ${u(r.inputs.opening)}. Orders of ${u(r.inputs.reorderQty)} are placed at the reorder level of ${u(r.inputs.reorderLevel)} and arrive after ${n(r.inputs.leadTime)} weeks${late ? `, except order ${r.inputs.late?.order}, which arrives ${n(r.inputs.late?.extraWeeks ?? 0)} weeks late` : ''}. The buffer is ${u(r.inputs.buffer)}. ${r.ordersPlaced} orders are placed. The lowest stock is ${u(r.run.minStock)}. ${
    r.stockOutWeeks.length ? `Stock runs out in ${weekList(r.stockOutWeeks)}, and ${u(r.unmetTotal)} of demand cannot be met.` : 'Stock never runs out.'
  } Weekly demand ranges from ${u(Math.min(...r.inputs.demand))} to ${u(Math.max(...r.inputs.demand))}.`;
  return svgChart({ w: W, h: H, id: o.id, title: 'Stock control chart: the plan week by week', desc, body: parts.join(''), minWidth: 560, maxWidth: W * 1.25 });
}

export function stockSimRowsHtml(r: StockSimResult): string {
  return r.run.rows
    .map((w) => {
      const notes = [w.ordered ? 'order placed' : '', w.delivered > 0 ? 'delivery' : '', w.unmet > 1e-9 ? 'stock-out' : w.end < r.inputs.buffer - 1e-9 ? 'below the buffer' : ''].filter(Boolean).join('; ');
      return `<tr${w.unmet > 1e-9 ? ' class="is-out"' : w.end < r.inputs.buffer - 1e-9 ? ' class="is-low"' : ''}><th scope="row">${w.week}</th><td class="n">${esc(n(w.start))}</td><td class="n">${esc(n(w.demand))}</td><td class="n">${esc(n(w.used))}</td><td class="n">${w.unmet > 1e-9 ? `<strong>${esc(n(w.unmet))}</strong>` : '0'}</td><td class="n">${w.delivered ? esc(n(w.delivered)) : ''}</td><td class="n">${esc(n(w.end))}</td><td>${esc(notes)}</td></tr>`;
    })
    .join('');
}

const fig = (k: string, v: string, note?: string) => `<div class="fig"><dt>${esc(k)}</dt><dd><span class="fig__v">${v}</span>${note ? `<span class="fig__n">${esc(note)}</span>` : ''}</dd></div>`;

export function stockSimFiguresHtml(r: StockSimResult, u: StockUnits): string {
  return [
    fig('Reorder level', esc(n(r.inputs.reorderLevel)), `suggested ${n(r.suggestedReorderLevel)}: buffer + average demand × lead time`),
    fig('Maximum stock', esc(n(r.maxStock)), 'buffer + reorder quantity'),
    fig('Lowest stock', esc(n(r.run.minStock)), r.run.minStock <= 1e-9 ? 'stock runs out' : r.run.minStock < r.inputs.buffer - 1e-9 ? 'below the buffer' : 'never below the buffer'),
    fig('Weeks with a stock-out', esc(String(r.stockOutWeeks.length)), r.stockOutWeeks.length ? weekList(r.stockOutWeeks) : 'none'),
    fig('Demand not met', esc(`${n(r.unmetTotal)}`), `${u.many}, of ${n(r.demandTotal)} in all`),
    fig('Demand met from stock', esc(`${fmtNumber(r.serviceLevel, 1)}%`)),
    fig('Orders placed', esc(String(r.ordersPlaced))),
    fig('Average stock', esc(n(r.averageStock)), u.many),
  ].join('');
}

export function stockCostRowsHtml(r: StockSimResult, currency: string): string {
  const c = r.inputs.costs;
  const rows: Array<[string, string, string]> = [
    ['Holding', `average stock ${n(r.averageStock)} × ${r.weeks} weeks × ${fmtMoney(c.holding, currency, 2)}`, fmtMoney(r.holdingCost, currency, 2)],
    ['Ordering', `${r.ordersPlaced} orders × ${fmtMoney(c.ordering, currency, 2)}`, fmtMoney(r.orderingCost, currency, 2)],
    ['Running out', `${n(r.unmetTotal)} units short × ${fmtMoney(c.shortage, currency, 2)}`, fmtMoney(r.shortageCost, currency, 2)],
  ];
  return `${rows.map(([k, how, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(how)}</td><td class="n">${esc(v)}</td></tr>`).join('')}<tr class="is-total"><th scope="row">Total</th><td></td><td class="n">${esc(fmtMoney(r.totalCost, currency, 2))}</td></tr>`;
}

/** One number input per week of demand. */
export function demandGridHtml(demand: number[], uid: string): string {
  return demand
    .map(
      (d, k) =>
        `<li class="stk-sim__week"><label for="${uid}-w${k + 1}">Week ${k + 1}</label><input class="input input--num" id="${uid}-w${k + 1}" name="w${k + 1}" data-week="${k + 1}" type="number" inputmode="decimal" min="0" step="1" value="${esc(String(d))}" aria-describedby="${uid}-demand-err"></li>`,
    )
    .join('');
}
