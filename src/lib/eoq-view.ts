/**
 * The chart and table of the economic order quantity calculator, rendered on
 * the server for the worked example and in the browser after every change.
 */
import { niceCeil, niceStep } from './charts';
import { costAt, tableQuantities, type EoqModel, type EoqUnits } from './eoq';
import { fmtMoney, fmtNumber } from './format';
import { esc } from './markup';
import { P, r1, svgChart } from './tool-palette';

const q0 = (v: number) => fmtNumber(v, Number.isInteger(Math.round(v * 10) / 10) ? 0 : 1);

export function eoqSvg(m: EoqModel, o: { id: string; units: EoqUnits; currency: string }): string {
  const W = 660;
  const H = 384;
  const L = 74;
  const R = 92;
  const T = 24;
  const B = 86;
  const e = m.eoq;
  const i = m.inputs;
  const xmax = niceCeil(Math.max(2.5 * e, i.current * 1.2, (m.discount?.quantity ?? 0) * 1.1), 5);
  const ymax = niceCeil(Math.max(costAt(xmax, i).total, 2 * m.atEoq.total, m.atCurrent.total * 1.1), 5);
  const x = (q: number) => L + (q / xmax) * (W - L - R);
  const y = (v: number) => H - B - (Math.min(v, ymax) / ymax) * (H - T - B);
  const parts: string[] = [];
  const ys = niceStep(ymax, 5);
  for (let v = 0; v <= ymax + 1e-9; v += ys) {
    parts.push(`<line x1="${L}" y1="${r1(y(v))}" x2="${W - R}" y2="${r1(y(v))}" stroke="${P.hair}"/>`);
    parts.push(`<text x="${L - 8}" y="${r1(y(v)) + 4}" text-anchor="end" class="ch-tick">${esc(fmtMoney(v, o.currency, 0))}</text>`);
  }
  const xs = niceStep(xmax, 5);
  for (let q = 0; q <= xmax + 1e-9; q += xs) {
    parts.push(`<line x1="${r1(x(q))}" y1="${H - B}" x2="${r1(x(q))}" y2="${H - B + 5}" stroke="${P.navy}"/>`);
    parts.push(`<text x="${r1(x(q))}" y="${H - B + 19}" text-anchor="middle" class="ch-tick">${esc(fmtNumber(q))}</text>`);
  }
  // The flat bottom: order sizes within 5% of the lowest cost, marked along the axis.
  const [b0, b1] = m.band;
  parts.push(`<rect x="${r1(x(b0))}" y="${T}" width="${r1(Math.max(1, x(Math.min(b1, xmax)) - x(b0)))}" height="${H - T - B}" fill="${P.green}" fill-opacity="0.08"/>`);
  parts.push(`<line x1="${r1(x(b0))}" y1="${H - B + 30}" x2="${r1(x(Math.min(b1, xmax)))}" y2="${H - B + 30}" stroke="${P.green}" stroke-width="3"/>`);
  parts.push(`<text x="${r1((x(b0) + x(Math.min(b1, xmax))) / 2)}" y="${H - B + 46}" text-anchor="middle" class="ch-note" fill="${P.greenText}">Within 5% of the lowest cost</text>`);
  // Three curves, sampled finely from a small order size to the right of the chart.
  const samples = Array.from({ length: 120 }, (_, k) => (xmax * (k + 1)) / 120).filter((q) => q >= e * 0.12);
  const path = (f: (q: number) => number) =>
    samples
      .filter((q) => f(q) <= ymax * 1.0001)
      .map((q, k) => `${k ? 'L' : 'M'}${r1(x(q))} ${r1(y(f(q)))}`)
      .join(' ');
  const curves = [
    { f: (q: number) => costAt(q, i).ordering, color: P.slate, dash: '6 4', w: 1.75, label: 'Ordering' },
    { f: (q: number) => costAt(q, i).cycleHolding, color: P.gold600, dash: '', w: 1.75, label: 'Holding' },
    { f: (q: number) => costAt(q, i).total, color: P.navy, dash: '', w: 2.75, label: 'Total' },
  ];
  const ends: number[] = [];
  for (const c of curves) {
    parts.push(`<path d="${path(c.f)}" fill="none" stroke="${c.color}" stroke-width="${c.w}"${c.dash ? ` stroke-dasharray="${c.dash}"` : ''} stroke-linejoin="round"/>`);
    let ly = y(c.f(xmax)) + 4;
    for (const prev of ends) if (Math.abs(ly - prev) < 14) ly = prev + 14;
    ends.push(ly);
    parts.push(`<text x="${W - R + 8}" y="${r1(ly)}" class="ch-label" fill="${c.color === P.slate ? P.slate : c.color}">${c.label}</text>`);
  }
  // The EOQ, and the reader's own order size on the total cost curve.
  parts.push(`<line x1="${r1(x(e))}" y1="${T}" x2="${r1(x(e))}" y2="${H - B}" stroke="${P.navy}" stroke-dasharray="3 3"/>`);
  parts.push(`<text x="${r1(x(e)) + 6}" y="${T + 12}" class="ch-label" fill="${P.navy}">EOQ ${esc(q0(e))}</text>`);
  parts.push(`<circle cx="${r1(x(e))}" cy="${r1(y(m.atEoq.total))}" r="5" fill="${P.navy}" stroke="#fff" stroke-width="1.5"/>`);
  if (i.current <= xmax) {
    parts.push(`<circle cx="${r1(x(i.current))}" cy="${r1(y(m.atCurrent.total))}" r="6" fill="${P.cobalt}" stroke="#fff" stroke-width="1.5"/>`);
    const right = x(i.current) + 130 < W - R;
    parts.push(`<text x="${r1(x(i.current) + (right ? 9 : -9))}" y="${r1(y(m.atCurrent.total) - 16)}" text-anchor="${right ? 'start' : 'end'}" class="ch-label" fill="${P.cobaltText}">Yours: ${esc(q0(i.current))}, ${esc(fmtMoney(m.atCurrent.total, o.currency, 0))}</text>`);
  }
  parts.push(`<line x1="${L}" y1="${T - 6}" x2="${L}" y2="${H - B}" stroke="${P.navy}" stroke-width="1.25"/>`);
  parts.push(`<line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" stroke="${P.navy}" stroke-width="1.25"/>`);
  parts.push(`<text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle" class="ch-axis">${esc(`Order quantity (${o.units.many})`)}</text>`);
  parts.push(`<text x="16" y="${(T + H - B) / 2}" text-anchor="middle" class="ch-axis" transform="rotate(-90 16 ${(T + H - B) / 2})">Cost a year</text>`);
  const desc = `Yearly ordering cost falls and the yearly cost of holding the stock each order brings rises as the order quantity grows; they are equal, and their total is lowest, at the economic order quantity of ${q0(e)} ${o.units.many}, ${fmtMoney(m.atEoq.total, o.currency, 0)} a year. Order sizes from ${fmtNumber(Math.ceil(b0 - 1e-9))} to ${fmtNumber(Math.floor(b1 + 1e-9))} cost no more than 5% above that. The order size entered, ${q0(i.current)}, costs ${fmtMoney(m.atCurrent.total, o.currency, 0)} a year.${m.atEoq.bufferHolding > 0 ? ` The total includes ${fmtMoney(m.atEoq.bufferHolding, o.currency, 0)} a year for holding the buffer, the same at every order size.` : ''}`;
  return svgChart({ w: W, h: H, id: o.id, title: 'Yearly cost against order quantity', desc, body: parts.join(''), minWidth: 520, maxWidth: W * 1.25 });
}

export function eoqRowsHtml(m: EoqModel, currency: string): string {
  const money = (v: number) => fmtMoney(v, currency, 0);
  const rows = tableQuantities(m).map((q) => costAt(q, m.inputs));
  const eRow = { ...m.atEoq };
  const all = [...rows.filter((r) => Math.abs(r.quantity - m.eoq) > 0.5), eRow].sort((a, b) => a.quantity - b.quantity);
  return all
    .map((r) => {
      const isE = r === eRow;
      const isC = Math.abs(r.quantity - m.inputs.current) < 0.5;
      const tag = isE ? ' <span class="eoq-tag">EOQ</span>' : isC ? ' <span class="eoq-tag eoq-tag--you">Yours</span>' : '';
      return `<tr${isE ? ' class="is-eoq"' : isC ? ' class="is-you"' : ''}><th scope="row" class="n">${esc(q0(r.quantity))}${tag}</th><td class="n">${esc(fmtNumber(r.ordersPerYear, 1))}</td><td class="n">${esc(fmtNumber(r.weeksBetween, 1))}</td><td class="n">${esc(money(r.ordering))}</td><td class="n">${esc(money(r.holding))}</td><td class="n">${esc(money(r.total))}</td></tr>`;
    })
    .join('');
}

const fig = (k: string, v: string, note?: string) => `<div class="fig"><dt>${esc(k)}</dt><dd><span class="fig__v">${v}</span>${note ? `<span class="fig__n">${esc(note)}</span>` : ''}</dd></div>`;

export function eoqFiguresHtml(m: EoqModel, u: EoqUnits, currency: string): string {
  return [
    fig('Economic order quantity', esc(q0(m.eoq)), u.many),
    fig('Orders a year', esc(fmtNumber(m.atEoq.ordersPerYear, 1)), `one about every ${fmtNumber(m.atEoq.weeksBetween, 1)} weeks`),
    fig('Cost a year at the EOQ', esc(fmtMoney(m.atEoq.total, currency, 0)), 'ordering and holding'),
    fig('Cost a year at your quantity', esc(fmtMoney(m.atCurrent.total, currency, 0)), m.extra > 0.005 ? `${fmtMoney(m.extra, currency, 0)} more` : 'the lowest'),
    ...(m.discount ? [fig('Taking the discount', esc(fmtMoney(Math.abs(m.discount.saving), currency, 0)), m.discount.saving > 0 ? 'saved a year, price included' : 'more a year, price included')] : []),
  ].join('');
}
