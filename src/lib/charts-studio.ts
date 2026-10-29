/**
 * SVG charts for the Market Studio and the Operations Floor, built as strings
 * so that the same function draws the default state on the server and every
 * change in the browser. Like the other charts on the platform, each has a
 * title and a description, and its data is also offered as a table.
 */
import { niceCeil, niceStep } from './charts';
import { fmtNumber } from './format';
import type { MapAttribute, MapModel, MarketModel, Quadrant } from './market';
import type { StockRun } from './operations';
import { esc } from './markup';

const INK = '#111417';
const COBALT = '#315CFF';
const SLATE = '#65717C';
const GREEN = '#2F7565';
const SIGNAL = '#B84A4A';
const RULE = '#DCD6CA';
const MUTED = '#5A6670';
const BRASS = '#C79A45';

const r1 = (n: number) => Math.round(n * 10) / 10;
const svg = (w: number, h: number, id: string, title: string, desc: string, body: string) =>
  `<svg viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}-t ${id}-d" class="chart" focusable="false"><title id="${id}-t">${esc(title)}</title><desc id="${id}-d">${esc(desc)}</desc>${body}</svg>`;

/* ---------- Market share: paired bars ---------- */

export function marketShareSvg(m: MarketModel, o: { id: string; focus: string; periods: { last: string; now: string } }): string {
  const W = 600;
  const rowH = 52;
  const T = 34;
  const L = 178;
  const R = 70;
  const H = T + m.firms.length * rowH + 30;
  const max = niceCeil(Math.max(...m.firms.flatMap((f) => [f.shareLast ?? 0, f.shareNow ?? 0]), 1), 4);
  const x = (v: number) => L + (v / max) * (W - L - R);
  const parts: string[] = [];
  const step = niceStep(max, 4);
  for (let v = 0; v <= max + 1e-9; v += step) {
    parts.push(`<line x1="${r1(x(v))}" y1="${T - 6}" x2="${r1(x(v))}" y2="${H - 26}" stroke="${RULE}"/>`);
    parts.push(`<text x="${r1(x(v))}" y="${H - 10}" text-anchor="middle" class="ch-tick">${esc(fmtNumber(v))}%</text>`);
  }
  // Key: the earlier year is an outlined bar, the later year a solid one, so the difference never rests on colour alone.
  parts.push(`<rect x="${L}" y="8" width="14" height="10" fill="#fff" stroke="${SLATE}" stroke-width="1.5"/>`);
  parts.push(`<text x="${L + 20}" y="17" class="ch-note" fill="${INK}">${esc(o.periods.last)}</text>`);
  parts.push(`<rect x="${L + 70}" y="8" width="14" height="10" fill="${INK}"/>`);
  parts.push(`<text x="${L + 90}" y="17" class="ch-note" fill="${INK}">${esc(o.periods.now)}</text>`);
  m.firms.forEach((f, k) => {
    const y0 = T + k * rowH;
    const focus = f.id === o.focus;
    const fill = focus ? COBALT : INK;
    parts.push(`<text x="${L - 10}" y="${y0 + 22}" text-anchor="end" class="ch-label" fill="${focus ? COBALT : INK}">${esc(f.name)}</text>`);
    if (f.group) parts.push(`<text x="${L - 10}" y="${y0 + 37}" text-anchor="end" class="ch-note" fill="${MUTED}">a group, not one firm</text>`);
    const a = f.shareLast ?? 0;
    const b = f.shareNow ?? 0;
    parts.push(`<rect x="${L}" y="${y0 + 6}" width="${r1(Math.max(0.5, x(a) - L))}" height="14" fill="#fff" stroke="${focus ? COBALT : SLATE}" stroke-width="1.5"/>`);
    parts.push(`<text x="${r1(x(a)) + 6}" y="${y0 + 17}" class="ch-note" fill="${MUTED}">${esc(fmtNumber(a, 1))}%</text>`);
    parts.push(`<rect x="${L}" y="${y0 + 24}" width="${r1(Math.max(0.5, x(b) - L))}" height="14" fill="${fill}"/>`);
    parts.push(`<text x="${r1(x(b)) + 6}" y="${y0 + 35}" class="ch-label" fill="${fill}">${esc(fmtNumber(b, 1))}%</text>`);
  });
  parts.push(`<line x1="${L}" y1="${T - 6}" x2="${L}" y2="${H - 26}" stroke="${INK}" stroke-width="1.25"/>`);
  const f = m.firms.find((x) => x.id === o.focus);
  const desc = `Market share of each seller in ${o.periods.last} and ${o.periods.now}. ${m.firms
    .map((x) => `${x.name}: ${fmtNumber(x.shareLast ?? 0, 1)}% then ${fmtNumber(x.shareNow ?? 0, 1)}%`)
    .join('; ')}.${f ? ` ${f.name} is highlighted.` : ''}`;
  return svg(W, H, o.id, 'Market share by seller', desc, parts.join(''));
}

/* ---------- Position map ---------- */

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export function positionMapSvg(
  m: MapModel,
  xa: MapAttribute,
  ya: MapAttribute,
  o: { id: string; focus: string; scale: { min: number; max: number }; highlight?: Quadrant | null },
): string {
  const W = 560;
  const H = 520;
  const L = 64;
  const R = 24;
  const T = 30;
  const B = 64;
  const { min, max } = o.scale;
  const x = (v: number) => L + ((v - min) / (max - min)) * (W - L - R);
  const y = (v: number) => H - B - ((v - min) / (max - min)) * (H - T - B);
  const parts: string[] = [];
  const mx = x(m.mid);
  const my = y(m.mid);
  // The quadrant the learner has just identified, shaded after the check.
  if (o.highlight) {
    const [qx, qy] = o.highlight.split('-');
    const rx = qx === 'high' ? mx : L;
    const ry = qy === 'high' ? T : my;
    parts.push(`<rect x="${r1(rx)}" y="${r1(ry)}" width="${r1(qx === 'high' ? W - R - mx : mx - L)}" height="${r1(qy === 'high' ? my - T : H - B - my)}" fill="${BRASS}" fill-opacity="0.16"/>`);
  }
  parts.push(`<rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="none" stroke="${INK}" stroke-width="1.25"/>`);
  parts.push(`<line x1="${r1(mx)}" y1="${T}" x2="${r1(mx)}" y2="${H - B}" stroke="${SLATE}" stroke-width="1" stroke-dasharray="4 4"/>`);
  parts.push(`<line x1="${L}" y1="${r1(my)}" x2="${W - R}" y2="${r1(my)}" stroke="${SLATE}" stroke-width="1" stroke-dasharray="4 4"/>`);
  // Axis ends, in the attributes' own words.
  parts.push(`<text x="${L}" y="${H - B + 20}" class="ch-note" fill="${MUTED}">${esc(xa.low)}</text>`);
  parts.push(`<text x="${W - R}" y="${H - B + 20}" text-anchor="end" class="ch-note" fill="${MUTED}">${esc(xa.high)}</text>`);
  parts.push(`<text x="${(L + W - R) / 2}" y="${H - 18}" text-anchor="middle" class="ch-axis">${esc(xa.label)}</text>`);
  parts.push(`<text x="${L - 10}" y="${H - B}" text-anchor="start" class="ch-note" fill="${MUTED}" transform="rotate(-90 ${L - 10} ${H - B})">${esc(ya.low)}</text>`);
  parts.push(`<text x="${L - 10}" y="${T}" text-anchor="end" class="ch-note" fill="${MUTED}" transform="rotate(-90 ${L - 10} ${T})">${esc(ya.high)}</text>`);
  parts.push(`<text x="18" y="${(T + H - B) / 2}" text-anchor="middle" class="ch-axis" transform="rotate(-90 18 ${(T + H - B) / 2})">${esc(ya.label)}</text>`);
  // Points, then labels placed where they do not collide with each other or the points.
  const placed: Box[] = m.points.map((p) => ({ x: x(p.x) - 7, y: y(p.y) - 7, w: 14, h: 14 }));
  const sorted = [...m.points].sort((a, b) => (a.id === o.focus ? -1 : b.id === o.focus ? 1 : 0));
  for (const p of sorted) {
    const focus = p.id === o.focus;
    const px = x(p.x);
    const py = y(p.y);
    parts.push(`<circle cx="${r1(px)}" cy="${r1(py)}" r="${focus ? 7 : 5.5}" fill="${focus ? COBALT : '#fff'}" stroke="${focus ? '#fff' : INK}" stroke-width="2"/>`);
    if (focus) parts.push(`<circle cx="${r1(px)}" cy="${r1(py)}" r="10" fill="none" stroke="${COBALT}" stroke-width="1.5"/>`);
    const w = p.name.length * 6.6 + 4;
    const h = 14;
    const candidates: Array<{ bx: number; by: number; anchor: 'start' | 'end' | 'middle' }> = [
      { bx: px + 12, by: py - 7, anchor: 'start' },
      { bx: px - 12 - w, by: py - 7, anchor: 'end' },
      { bx: px - w / 2, by: py - 26, anchor: 'middle' },
      { bx: px - w / 2, by: py + 12, anchor: 'middle' },
      { bx: px + 12, by: py - 24, anchor: 'start' },
      { bx: px + 12, by: py + 10, anchor: 'start' },
    ];
    const inside = (c: Box) => c.x >= L + 2 && c.x + c.w <= W - R - 2 && c.y >= T + 2 && c.y + c.h <= H - B - 2;
    const pick =
      candidates.find((c) => {
        const box = { x: c.bx, y: c.by, w, h };
        return inside(box) && !placed.some((b) => overlaps(b, box));
      }) ?? candidates[0];
    if (!pick) continue;
    placed.push({ x: pick.bx, y: pick.by, w, h });
    const tx = pick.anchor === 'start' ? pick.bx : pick.anchor === 'end' ? pick.bx + w : pick.bx + w / 2;
    parts.push(`<text x="${r1(tx)}" y="${r1(pick.by + 11)}" text-anchor="${pick.anchor}" class="ch-label" fill="${focus ? COBALT : INK}">${esc(p.name)}</text>`);
  }
  const desc = `Position map with ${xa.label.toLowerCase()} across, from ${xa.low} to ${xa.high}, and ${ya.label.toLowerCase()} up, from ${ya.low} to ${ya.high}. The dashed lines mark the middle of the scale. ${m.points
    .map((p) => `${p.name}: ${fmtNumber(p.x, 1)} across, ${fmtNumber(p.y, 1)} up`)
    .join('; ')}.`;
  return svg(W, H, o.id, 'Position map', desc, parts.join(''));
}

/* ---------- Stock control chart ---------- */

export function stockChartSvg(run: StockRun, o: { id: string; unit: { one: string; many: string }; plan?: StockRun | null }): string {
  const W = 620;
  const H = 340;
  const L = 52;
  const R = 150;
  const T = 26;
  const B = 50;
  const weeks = run.plan.weeks;
  const ymax = niceCeil(Math.max(run.maxStock, ...run.points.map((p) => p[1])) * 1.12, 5);
  const x = (t: number) => L + (t / weeks) * (W - L - R);
  const y = (v: number) => H - B - (v / ymax) * (H - T - B);
  const parts: string[] = [];
  const ys = niceStep(ymax, 5);
  for (let v = 0; v <= ymax + 1e-9; v += ys) {
    parts.push(`<line x1="${L}" y1="${r1(y(v))}" x2="${W - R}" y2="${r1(y(v))}" stroke="${RULE}"/>`);
    parts.push(`<text x="${L - 8}" y="${r1(y(v)) + 4}" text-anchor="end" class="ch-tick">${esc(fmtNumber(v))}</text>`);
  }
  for (let t = 0; t <= weeks; t += weeks > 12 ? 2 : 1) {
    parts.push(`<line x1="${r1(x(t))}" y1="${H - B}" x2="${r1(x(t))}" y2="${H - B + 5}" stroke="${INK}"/>`);
    parts.push(`<text x="${r1(x(t))}" y="${H - B + 19}" text-anchor="middle" class="ch-tick">${t}</text>`);
  }
  parts.push(`<line x1="${L}" y1="${T - 6}" x2="${L}" y2="${H - B}" stroke="${INK}" stroke-width="1.25"/>`);
  parts.push(`<line x1="${L}" y1="${H - B}" x2="${W - R + 6}" y2="${H - B}" stroke="${INK}" stroke-width="1.25"/>`);
  parts.push(`<text x="${(L + W - R) / 2}" y="${H - 10}" text-anchor="middle" class="ch-axis">Weeks</text>`);
  parts.push(`<text x="14" y="${(T + H - B) / 2}" text-anchor="middle" class="ch-axis" transform="rotate(-90 14 ${(T + H - B) / 2})">Stock (${esc(o.unit.many)})</text>`);

  // Reference levels: buffer (solid green), reorder level (dashed cobalt), maximum (dotted slate), each labelled in words.
  const levels = [
    { v: run.maxStock, label: `Maximum stock ${fmtNumber(run.maxStock)}`, color: SLATE, dash: '2 4' },
    { v: run.reorderLevel, label: `Reorder level ${fmtNumber(run.reorderLevel, Number.isInteger(run.reorderLevel) ? 0 : 1)}`, color: COBALT, dash: '7 5' },
    { v: run.plan.buffer, label: `Buffer stock ${fmtNumber(run.plan.buffer)}`, color: GREEN, dash: '' },
  ];
  let lastY = -Infinity;
  for (const lv of [...levels].sort((a, b) => b.v - a.v)) {
    parts.push(`<line x1="${L}" y1="${r1(y(lv.v))}" x2="${W - R}" y2="${r1(y(lv.v))}" stroke="${lv.color}" stroke-width="1.5"${lv.dash ? ` stroke-dasharray="${lv.dash}"` : ''}/>`);
    let ly = y(lv.v) + 4;
    if (ly - lastY < 15) ly = lastY + 15;
    lastY = ly;
    parts.push(`<text x="${W - R + 8}" y="${r1(ly)}" class="ch-label" fill="${lv.color === SLATE ? MUTED : lv.color}">${esc(lv.label)}</text>`);
  }
  // Below the buffer: the area where the business is drawing on its insurance.
  parts.push(`<rect x="${L}" y="${r1(y(run.plan.buffer))}" width="${W - L - R}" height="${r1(H - B - y(run.plan.buffer))}" fill="${GREEN}" fill-opacity="0.07"/>`);

  // The planned line, faint, when a scenario is shown on top of it.
  if (o.plan) {
    parts.push(`<path d="${o.plan.points.map((p, k) => `${k ? 'L' : 'M'}${r1(x(p[0]))} ${r1(y(p[1]))}`).join(' ')}" fill="none" stroke="${SLATE}" stroke-width="1.25" stroke-dasharray="3 3"/>`);
  }
  parts.push(`<path d="${run.points.map((p, k) => `${k ? 'L' : 'M'}${r1(x(p[0]))} ${r1(y(p[1]))}`).join(' ')}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`);

  // The first order: when it was placed, the lead time (a bracket along the foot of the chart, clear of the
  // stock line), and the delivery of the reorder quantity (labelled above the maximum, clear of the levels).
  const first = run.orders[0];
  if (first && first.arrives <= weeks) {
    const ax = x(first.placed);
    const bx = x(first.arrives);
    const by = H - B - 12;
    parts.push(`<path d="M${r1(ax)} ${r1(y(first.level))}V${r1(by - 4)}M${r1(bx)} ${r1(y(run.plan.buffer))}V${r1(by - 4)}" stroke="${COBALT}" stroke-width="1" stroke-dasharray="2 3" fill="none"/>`);
    parts.push(`<circle cx="${r1(ax)}" cy="${r1(y(first.level))}" r="4.5" fill="${COBALT}" stroke="#fff" stroke-width="1.5"/>`);
    parts.push(`<path d="M${r1(ax)} ${r1(by - 5)}V${r1(by)}H${r1(bx)}V${r1(by - 5)}" fill="none" stroke="${COBALT}" stroke-width="1.5"/>`);
    parts.push(`<text x="${r1((ax + bx) / 2)}" y="${r1(by - 8)}" text-anchor="middle" class="ch-note" fill="${COBALT}">Lead time ${esc(fmtNumber(run.plan.leadTime, Number.isInteger(run.plan.leadTime) ? 0 : 1))} ${run.plan.leadTime === 1 ? 'week' : 'weeks'}</text>`);
    const before = run.points.find((p) => Math.abs(p[0] - first.arrives) < 1e-6)?.[1] ?? 0;
    const after = before + run.plan.reorderQty;
    parts.push(`<path d="M${r1(bx + 8)} ${r1(y(before))}V${r1(y(after) + 2)}" stroke="${INK}" stroke-width="1.25" fill="none"/>`);
    parts.push(`<path d="M${r1(bx + 4)} ${r1(y(after) + 8)}L${r1(bx + 8)} ${r1(y(after) + 1)}L${r1(bx + 12)} ${r1(y(after) + 8)}" stroke="${INK}" stroke-width="1.25" fill="none"/>`);
    parts.push(`<text x="${r1(bx + 4)}" y="${r1(y(after) - 9)}" class="ch-note" fill="${INK}">Delivery: reorder quantity ${esc(fmtNumber(run.plan.reorderQty))}</text>`);
  }
  // The lowest point, when the buffer is used.
  if (run.minStock < run.plan.buffer - 1e-9) {
    parts.push(`<circle cx="${r1(x(run.minAt))}" cy="${r1(y(run.minStock))}" r="5" fill="${run.minStock <= 1e-9 ? SIGNAL : BRASS}" stroke="#fff" stroke-width="1.5"/>`);
    parts.push(`<text x="${r1(x(run.minAt))}" y="${r1(y(run.minStock)) + 18}" text-anchor="middle" class="ch-note" fill="${run.minStock <= 1e-9 ? SIGNAL : INK}">${run.minStock <= 1e-9 ? 'Stock runs out' : `Lowest ${esc(fmtNumber(run.minStock, Number.isInteger(run.minStock) ? 0 : 1))}`}</text>`);
  }
  const u = (n: number) => `${fmtNumber(n, Number.isInteger(n) ? 0 : 1)} ${n === 1 ? o.unit.one : o.unit.many}`;
  const desc = `Stock over ${weeks} weeks, starting at the maximum of ${u(run.maxStock)}. Orders are placed at the reorder level of ${u(run.reorderLevel)} and arrive after ${fmtNumber(run.plan.leadTime, 1)} weeks. The buffer is ${u(run.plan.buffer)}. The lowest stock is ${u(run.minStock)}${run.shortfall > 0 ? `, and ${u(run.shortfall)} of usage could not be met` : ''}.`;
  return svg(W, H, o.id, 'Stock control chart', desc, parts.join(''));
}
