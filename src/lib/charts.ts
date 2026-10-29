/**
 * SVG charts, built as strings so that the same function renders the chart on
 * the server (the default state) and in the browser (after every change).
 * Each chart has a title and a description for assistive technology, and every
 * chart on the platform also offers its data as a table beside it.
 */
import type { BreakEvenModel } from './breakeven';
import type { OptionResult, TreeOption } from './decision-tree';
import type { ScalePoint } from './scale';
import { fmtMoney, fmtNumber } from './format';
import { esc } from './markup';

const INK = '#111417';
const COBALT = '#315CFF';
const SLATE = '#65717C';
const GREEN = '#2F7565';
const SIGNAL = '#B84A4A';
const RULE = '#DCD6CA';
const MUTED = '#5A6670';

/** A step of 1, 2, 2.5 or 5 times a power of ten giving about `target` intervals. */
export function niceStep(range: number, target = 5): number {
  if (!(range > 0)) return 1;
  const raw = range / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const m = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return m * pow;
}

export function niceCeil(value: number, target = 5): number {
  if (!(value > 0)) return 1;
  const step = niceStep(value, target);
  return Math.ceil(value / step) * step;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

interface BreakEvenChartOptions {
  currency: string;
  unitsLabel: string;
  periodLabel: string;
  id: string;
}

export function breakEvenSvg(m: BreakEvenModel, o: BreakEvenChartOptions): string {
  const W = 560;
  const H = 360;
  const L = 70;
  const R = 108;
  const T = 26;
  const B = 50;
  const i = m.inputs;
  const xmax = niceCeil(Math.max(i.capacity, i.quantity, m.beq ?? 0, 1) * 1.05);
  const tr = (q: number) => i.price * q;
  const tc = (q: number) => i.fixedCosts + m.unitVariableCost * q;
  const ymax = niceCeil(Math.max(tr(xmax), tc(xmax), i.fixedCosts, 1) * 1.04);
  const x = (q: number) => L + (q / xmax) * (W - L - R);
  const y = (v: number) => H - B - (v / ymax) * (H - T - B);
  const xs = niceStep(xmax, 5);
  const ys = niceStep(ymax, 5);
  const parts: string[] = [];

  // Grid and axes
  for (let v = 0; v <= ymax + 1e-9; v += ys) {
    parts.push(`<line x1="${L}" y1="${r1(y(v))}" x2="${W - R}" y2="${r1(y(v))}" stroke="${RULE}" stroke-width="1"/>`);
    parts.push(`<text x="${L - 8}" y="${r1(y(v)) + 4}" text-anchor="end" class="ch-tick">${esc(fmtNumber(v))}</text>`);
  }
  for (let q = 0; q <= xmax + 1e-9; q += xs) {
    parts.push(`<line x1="${r1(x(q))}" y1="${H - B}" x2="${r1(x(q))}" y2="${H - B + 5}" stroke="${INK}" stroke-width="1"/>`);
    parts.push(`<text x="${r1(x(q))}" y="${H - B + 19}" text-anchor="middle" class="ch-tick">${esc(fmtNumber(q))}</text>`);
  }
  parts.push(`<line x1="${L}" y1="${T - 6}" x2="${L}" y2="${H - B}" stroke="${INK}" stroke-width="1.25"/>`);
  parts.push(`<line x1="${L}" y1="${H - B}" x2="${W - R + 8}" y2="${H - B}" stroke="${INK}" stroke-width="1.25"/>`);
  parts.push(`<text x="${(L + W - R) / 2}" y="${H - 8}" text-anchor="middle" class="ch-axis">${esc(`${o.unitsLabel} a ${o.periodLabel}`)}</text>`);
  parts.push(`<text x="14" y="${(T + H - B) / 2}" text-anchor="middle" class="ch-axis" transform="rotate(-90 14 ${(T + H - B) / 2})">${esc(`${o.currency} a ${o.periodLabel}`)}</text>`);

  // Profit and loss regions between the two lines
  const be = m.beqExact !== null && m.beqExact <= xmax ? m.beqExact : null;
  if (be !== null) {
    parts.push(`<polygon points="${x(0)},${y(tc(0))} ${r1(x(be))},${r1(y(tr(be)))} ${x(0)},${y(0)}" fill="${SIGNAL}" fill-opacity="0.1"/>`);
    parts.push(`<polygon points="${r1(x(be))},${r1(y(tr(be)))} ${x(xmax)},${r1(y(tr(xmax)))} ${x(xmax)},${r1(y(tc(xmax)))}" fill="${GREEN}" fill-opacity="0.14"/>`);
    // Label each region where it is tallest: the loss near zero output, the profit towards the right.
    const lx = Math.min(be * 0.3, ((30 / (W - L - R)) * xmax));
    parts.push(`<text x="${r1(x(lx))}" y="${r1((y(tc(lx)) + y(tr(lx))) / 2) + 4}" text-anchor="middle" class="ch-region" fill="${SIGNAL}">Loss</text>`);
    let px = be + (xmax - be) * 0.75;
    if (Math.abs(x(px) - x(i.capacity)) < 34) px = be + (xmax - be) * 0.5;
    parts.push(`<text x="${r1(x(px))}" y="${r1((y(tc(px)) + y(tr(px))) / 2) + 4}" text-anchor="middle" class="ch-region" fill="${GREEN}">Profit</text>`);
  } else if (m.beqExact === null) {
    parts.push(`<polygon points="${x(0)},${y(tc(0))} ${x(xmax)},${r1(y(tc(xmax)))} ${x(xmax)},${r1(y(tr(xmax)))} ${x(0)},${y(0)}" fill="${SIGNAL}" fill-opacity="0.1"/>`);
  }

  // Lines
  parts.push(`<line x1="${x(0)}" y1="${r1(y(i.fixedCosts))}" x2="${x(xmax)}" y2="${r1(y(i.fixedCosts))}" stroke="${SLATE}" stroke-width="1.5" stroke-dasharray="6 5"/>`);
  parts.push(`<line x1="${x(0)}" y1="${r1(y(tc(0)))}" x2="${x(xmax)}" y2="${r1(y(tc(xmax)))}" stroke="${INK}" stroke-width="2.5"/>`);
  parts.push(`<line x1="${x(0)}" y1="${r1(y(0))}" x2="${x(xmax)}" y2="${r1(y(tr(xmax)))}" stroke="${COBALT}" stroke-width="2.5"/>`);
  const endLabels = [
    { v: tr(xmax), text: 'Total revenue', color: COBALT },
    { v: tc(xmax), text: 'Total cost', color: INK },
    { v: i.fixedCosts, text: 'Fixed costs', color: MUTED },
  ].sort((a, b) => b.v - a.v);
  let lastY = -Infinity;
  for (const lbl of endLabels) {
    let ly = y(lbl.v) + 4;
    if (ly - lastY < 15) ly = lastY + 15;
    lastY = ly;
    parts.push(`<text x="${W - R + 8}" y="${r1(ly)}" class="ch-label" fill="${lbl.color}">${esc(lbl.text)}</text>`);
  }

  // Capacity and forecast
  if (i.capacity <= xmax) {
    parts.push(`<line x1="${r1(x(i.capacity))}" y1="${T}" x2="${r1(x(i.capacity))}" y2="${H - B}" stroke="${MUTED}" stroke-width="1" stroke-dasharray="2 3"/>`);
    parts.push(`<text x="${r1(x(i.capacity)) - 4}" y="${T + 10}" text-anchor="end" class="ch-note">Capacity ${esc(fmtNumber(i.capacity))}</text>`);
  }
  if (i.quantity > 0 && i.quantity <= xmax) {
    parts.push(`<line x1="${r1(x(i.quantity))}" y1="${T + 18}" x2="${r1(x(i.quantity))}" y2="${H - B}" stroke="${INK}" stroke-width="1" stroke-dasharray="4 3"/>`);
    parts.push(`<text x="${r1(x(i.quantity)) + 4}" y="${T + 30}" class="ch-note">Forecast ${esc(fmtNumber(i.quantity))}</text>`);
  }

  // Margin of safety bracket
  if (m.beq !== null && m.mos !== null && m.mos > 0 && i.quantity <= xmax) {
    const by = H - B - 14;
    parts.push(`<path d="M${r1(x(m.beq))} ${by - 5}V${by}H${r1(x(i.quantity))}V${by - 5}" fill="none" stroke="${GREEN}" stroke-width="1.5"/>`);
    const label = `Margin of safety ${esc(fmtNumber(m.mos))}`;
    const narrow = x(i.quantity) - x(m.beq) < 130;
    parts.push(
      narrow
        ? `<text x="${r1(x(i.quantity)) + 6}" y="${by + 4}" class="ch-note" fill="${GREEN}">${label}</text>`
        : `<text x="${r1((x(m.beq) + x(i.quantity)) / 2)}" y="${by - 8}" text-anchor="middle" class="ch-note" fill="${GREEN}">${label}</text>`,
    );
  }

  // Break-even point
  if (be !== null && m.beq !== null) {
    parts.push(`<line x1="${r1(x(be))}" y1="${r1(y(tr(be)))}" x2="${r1(x(be))}" y2="${H - B}" stroke="${INK}" stroke-width="1" stroke-dasharray="1 3"/>`);
    parts.push(`<circle cx="${r1(x(be))}" cy="${r1(y(tr(be)))}" r="5.5" fill="${COBALT}" stroke="#fff" stroke-width="2"/>`);
    // Above and to the left of the point both lines fall away, so the label sits clear of them.
    const left = x(be) - 120 > L;
    parts.push(
      `<text x="${r1(x(be)) + (left ? -10 : 10)}" y="${r1(y(tr(be))) - 14}" text-anchor="${left ? 'end' : 'start'}" class="ch-label" fill="${INK}">Break-even ${esc(fmtNumber(m.beq))}</text>`,
    );
  }

  const desc =
    m.beq === null
      ? `Total cost is above total revenue at every output, so there is no break-even point. Forecast sales are ${fmtNumber(i.quantity)} ${o.unitsLabel} a ${o.periodLabel}.`
      : `Total revenue and total cost meet at ${fmtNumber(m.beq)} ${o.unitsLabel} a ${o.periodLabel} (the break-even point, rounded up). Forecast sales of ${fmtNumber(i.quantity)} give a margin of safety of ${fmtNumber(m.mos ?? 0)} and a ${m.profitAtForecast >= 0 ? 'profit' : 'loss'} of ${fmtMoney(Math.abs(m.profitAtForecast), o.currency, 2)}. Capacity is ${fmtNumber(i.capacity)}.`;

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${o.id}-t ${o.id}-d" class="chart" focusable="false"><title id="${o.id}-t">Break-even chart</title><desc id="${o.id}-d">${esc(desc)}</desc>${parts.join('')}</svg>`;
}

interface TreeChartOptions {
  currency: string;
  unit: string;
  id: string;
}

export function decisionTreeSvg(options: TreeOption[], results: OptionResult[], o: TreeChartOptions): string {
  const rowH = 46;
  const leaves = options.reduce((n, op) => n + op.outcomes.length, 0);
  const H = Math.max(160, leaves * rowH + 30);
  const W = 600;
  const parts: string[] = [];
  const money = (v: number) => `${o.currency}${fmtNumber(v, Number.isInteger(v) ? 0 : 1)}${o.unit}`;
  const dx = 24;
  const dy = H / 2;
  parts.push(`<rect x="${dx - 11}" y="${dy - 11}" width="22" height="22" fill="${INK}"/>`);
  let leaf = 0;
  options.forEach((op, oi) => {
    const first = leaf;
    leaf += op.outcomes.length;
    const cy = 15 + ((first + leaf) / 2) * rowH;
    const cx = 250;
    const res = results[oi];
    parts.push(`<path d="M${dx + 11} ${dy} L${dx + 40} ${dy} L${cx - 70} ${cy} L${cx - 10} ${cy}" fill="none" stroke="${INK}" stroke-width="1.5"/>`);
    parts.push(`<text x="${cx - 70}" y="${cy - 8}" class="ch-label" fill="${INK}">${esc(op.label)}</text>`);
    parts.push(`<text x="${cx - 70}" y="${cy + 16}" class="ch-note" fill="${MUTED}">Cost ${esc(money(op.cost))}</text>`);
    parts.push(`<circle cx="${cx}" cy="${cy}" r="10" fill="#fff" stroke="${INK}" stroke-width="1.5"/>`);
    if (res) {
      parts.push(
        `<text x="${cx}" y="${cy - 16}" text-anchor="middle" class="ch-note" fill="${res.valid ? COBALT : SIGNAL}">${res.valid ? `EV ${esc(money(Math.round(res.expectedValue * 10) / 10))}` : 'Check probabilities'}</text>`,
      );
    }
    op.outcomes.forEach((out, k) => {
      const ly = 15 + (first + k + 0.5) * rowH;
      parts.push(`<path d="M${cx + 10} ${cy} L${cx + 50} ${cy} L${cx + 110} ${ly} L${W - 150} ${ly}" fill="none" stroke="${SLATE}" stroke-width="1.25"/>`);
      parts.push(`<text x="${cx + 116}" y="${ly - 6}" class="ch-note" fill="${INK}">${esc(out.label)} (p = ${esc(String(out.probability))})</text>`);
      parts.push(`<text x="${W - 144}" y="${ly + 4}" class="ch-label" fill="${INK}">${esc(money(out.payoff))}</text>`);
    });
  });
  const desc = results
    .map((r) => (r.valid ? `${r.label}: expected value ${money(Math.round(r.expectedValue * 10) / 10)}` : `${r.label}: ${r.problems.join(' ')}`))
    .join('. ');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${o.id}-t ${o.id}-d" class="chart" focusable="false"><title id="${o.id}-t">Decision tree</title><desc id="${o.id}-d">${esc(desc)}</desc>${parts.join('')}</svg>`;
}

interface ScaleChartOptions {
  currency: string;
  id: string;
  current: number;
  marks: Array<{ outlets: number; label: string }>;
}

export function scaleSvg(curve: ScalePoint[], o: ScaleChartOptions): string {
  const W = 560;
  const H = 300;
  const L = 64;
  const R = 24;
  const T = 30;
  const B = 46;
  const n = curve.length;
  const totals = curve.map((p) => p.total);
  const ymin = Math.floor((Math.min(...totals) - 6) / 10) * 10;
  const ymax = Math.ceil((Math.max(...totals) + 4) / 10) * 10;
  const x = (k: number) => L + ((k - 1) / (n - 1)) * (W - L - R);
  const y = (v: number) => H - B - ((v - ymin) / (ymax - ymin)) * (H - T - B);
  const parts: string[] = [];
  const ys = niceStep(ymax - ymin, 4);
  for (let v = ymin; v <= ymax + 1e-9; v += ys) {
    parts.push(`<line x1="${L}" y1="${r1(y(v))}" x2="${W - R}" y2="${r1(y(v))}" stroke="${RULE}"/>`);
    parts.push(`<text x="${L - 8}" y="${r1(y(v)) + 4}" text-anchor="end" class="ch-tick">${esc(o.currency)}${esc(fmtNumber(v))}</text>`);
  }
  for (let k = 1; k <= n; k += k < 4 ? 1 : 4) {
    const kk = k === 1 ? 1 : k;
    parts.push(`<text x="${r1(x(kk))}" y="${H - B + 18}" text-anchor="middle" class="ch-tick">${kk}</text>`);
  }
  parts.push(`<line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" stroke="${INK}" stroke-width="1.25"/>`);
  parts.push(`<line x1="${L}" y1="${T - 6}" x2="${L}" y2="${H - B}" stroke="${INK}" stroke-width="1.25"/>`);
  parts.push(`<text x="${(L + W - R) / 2}" y="${H - 8}" text-anchor="middle" class="ch-axis">Restaurants in the chain</text>`);
  parts.push(`<text x="12" y="${(T + H - B) / 2}" text-anchor="middle" class="ch-axis" transform="rotate(-90 12 ${(T + H - B) / 2})">Average cost a meal</text>`);
  parts.push(`<path d="${curve.map((p, k) => `${k ? 'L' : 'M'}${r1(x(p.outlets))} ${r1(y(p.total))}`).join(' ')}" fill="none" stroke="${INK}" stroke-width="2.5"/>`);
  for (const mk of o.marks) {
    const p = curve[mk.outlets - 1];
    if (!p) continue;
    parts.push(`<circle cx="${r1(x(p.outlets))}" cy="${r1(y(p.total))}" r="4" fill="#fff" stroke="${INK}" stroke-width="1.5"/>`);
    parts.push(`<text x="${r1(x(p.outlets))}" y="${r1(y(p.total)) + 20}" text-anchor="middle" class="ch-note" fill="${MUTED}">${esc(mk.label)}</text>`);
  }
  const cur = curve[o.current - 1];
  if (cur) {
    parts.push(`<line x1="${r1(x(cur.outlets))}" y1="${T - 6}" x2="${r1(x(cur.outlets))}" y2="${H - B}" stroke="${COBALT}" stroke-width="1" stroke-dasharray="3 3"/>`);
    parts.push(`<circle cx="${r1(x(cur.outlets))}" cy="${r1(y(cur.total))}" r="6.5" fill="${COBALT}" stroke="#fff" stroke-width="2"/>`);
    const anchorRight = cur.outlets < n * 0.6;
    parts.push(
      `<text x="${r1(x(cur.outlets)) + (anchorRight ? 10 : -10)}" y="${T + 4}" text-anchor="${anchorRight ? 'start' : 'end'}" class="ch-label" fill="${COBALT}">${cur.outlets} restaurants: ${esc(o.currency)}${esc(fmtNumber(cur.total, 0))} a meal</text>`,
    );
  }
  const desc = `Average cost a meal falls from ${o.currency}${fmtNumber(curve[0]?.total ?? 0, 0)} with one restaurant to a low of ${o.currency}${fmtNumber(Math.min(...totals), 0)}, then rises to ${o.currency}${fmtNumber(curve[n - 1]?.total ?? 0, 0)} with ${n}. The vertical axis starts at ${o.currency}${fmtNumber(ymin)}.`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${o.id}-t ${o.id}-d" class="chart" focusable="false"><title id="${o.id}-t">Average cost and the size of the chain</title><desc id="${o.id}-d">${esc(desc)}</desc>${parts.join('')}</svg>`;
}
