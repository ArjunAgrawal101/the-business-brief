/**
 * HTML and SVG for the investment appraisal desk, rendered on the server for
 * the default state and in the browser after every change.
 */
import { niceStep } from './charts';
import { fmtMoney, fmtNumber } from './format';
import { discountFactor, fmtPayback, type Appraisal, type Rate } from './investment';
import { esc } from './markup';

const INK = '#111417';
const COBALT = '#315CFF';
const RULE = '#DCD6CA';

const money = (v: number, s: string) => fmtMoney(Math.round(v), s, 0);
const pct = (v: number | null) => (v === null ? 'n/a' : `${fmtNumber(v, 2)}%`);

/** The three methods side by side. The NPV row is HL only. */
export function methodsRowsHtml(a: Appraisal, b: Appraisal, rate: Rate, currency: string, prefers: { payback: string | null; arr: string | null; npv: string | null }): string {
  const pref = (p: string | null) => esc(p ?? 'Neither');
  return [
    `<tr><th scope="row">Payback period</th><td class="n">${esc(fmtPayback(a.payback))}</td><td class="n">${esc(fmtPayback(b.payback))}</td><td>${pref(prefers.payback)}</td></tr>`,
    `<tr><th scope="row">Average rate of return</th><td class="n">${esc(pct(a.arr))}</td><td class="n">${esc(pct(b.arr))}</td><td>${pref(prefers.arr)}</td></tr>`,
    `<tr data-level="HL"><th scope="row">Net present value at ${rate}% <span class="tag tag--hl">HL</span></th><td class="n">${a.npv === null ? 'n/a' : esc(money(a.npv, currency))}</td><td class="n">${b.npv === null ? 'n/a' : esc(money(b.npv, currency))}</td><td>${pref(prefers.npv)}</td></tr>`,
  ].join('');
}

/** Net and cumulative cash flow by year for both projects. */
export function cashFlowRowsHtml(a: Appraisal, b: Appraisal, currency: string): string {
  const years = Math.max(a.cumulative.length, b.cumulative.length);
  const rows: string[] = [];
  for (let t = 0; t < years; t++) {
    const cell = (x: Appraisal) => {
      if (t >= x.cumulative.length) return '<td class="n muted">Ended</td><td class="n muted">Ended</td>';
      const flow = t === 0 ? -x.project.capitalCost : (x.project.returns[t - 1] ?? 0);
      return `<td class="n">${esc(money(flow, currency))}</td><td class="n">${esc(money(x.cumulative[t] ?? 0, currency))}</td>`;
    };
    rows.push(`<tr><th scope="row">Year ${t}</th>${cell(a)}${cell(b)}</tr>`);
  }
  return rows.join('');
}

/** Discount factors and present values by year (HL). */
export function presentValueRowsHtml(a: Appraisal, b: Appraisal, rate: Rate, currency: string): string {
  const years = Math.max(a.project.returns.length, b.project.returns.length);
  const rows: string[] = [];
  for (let t = 1; t <= years; t++) {
    const pv = (x: Appraisal) => (t <= x.project.returns.length ? `<td class="n">${esc(money(x.presentValues[t - 1] ?? 0, currency))}</td>` : '<td class="n muted">Ended</td>');
    rows.push(`<tr><th scope="row">Year ${t}</th><td class="n">${discountFactor(rate, t).toFixed(4)}</td>${pv(a)}${pv(b)}</tr>`);
  }
  const sum = (x: Appraisal) => x.presentValues.reduce((m, v) => m + v, 0);
  rows.push(`<tr class="is-sub"><th scope="row">Sum of present values</th><td></td><td class="n">${esc(money(sum(a), currency))}</td><td class="n">${esc(money(sum(b), currency))}</td></tr>`);
  rows.push(`<tr><th scope="row">Less the capital cost</th><td></td><td class="n">${esc(money(-a.project.capitalCost, currency))}</td><td class="n">${esc(money(-b.project.capitalCost, currency))}</td></tr>`);
  rows.push(`<tr class="is-sub is-strong"><th scope="row">Net present value</th><td></td><td class="n">${a.npv === null ? 'n/a' : esc(money(a.npv, currency))}</td><td class="n">${b.npv === null ? 'n/a' : esc(money(b.npv, currency))}</td></tr>`);
  return rows.join('');
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Cumulative net cash flow of both projects, year 0 to the end of the longer one. */
export function cumulativeSvg(a: Appraisal, b: Appraisal, o: { currency: string; id: string }): string {
  const W = 560;
  const H = 320;
  const L = 78;
  const R = 112;
  const T = 24;
  const B = 46;
  const years = Math.max(a.cumulative.length, b.cumulative.length) - 1;
  const all = [...a.cumulative, ...b.cumulative, 0];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const step = niceStep(hi - lo || 1, 5);
  const ymin = Math.floor(lo / step) * step;
  const ymax = Math.max(step, Math.ceil(hi / step) * step);
  const x = (t: number) => L + (t / Math.max(1, years)) * (W - L - R);
  const y = (v: number) => H - B - ((v - ymin) / (ymax - ymin)) * (H - T - B);
  const parts: string[] = [];
  const short = (v: number) => {
    if (Math.abs(v) < 1e-9) return `${o.currency}0`;
    const k = v / 1000;
    return `${v < 0 ? '−' : ''}${o.currency}${fmtNumber(Math.abs(k), Number.isInteger(k) ? 0 : 1)}k`;
  };
  for (let v = ymin; v <= ymax + 1e-9; v += step) {
    parts.push(`<line x1="${L}" y1="${r1(y(v))}" x2="${W - R}" y2="${r1(y(v))}" stroke="${RULE}" stroke-width="1"/>`);
    parts.push(`<text x="${L - 8}" y="${r1(y(v)) + 4}" text-anchor="end" class="ch-tick">${esc(short(v))}</text>`);
  }
  for (let t = 0; t <= years; t++) {
    parts.push(`<line x1="${r1(x(t))}" y1="${H - B}" x2="${r1(x(t))}" y2="${H - B + 5}" stroke="${INK}" stroke-width="1"/>`);
    parts.push(`<text x="${r1(x(t))}" y="${H - B + 19}" text-anchor="middle" class="ch-tick">${t}</text>`);
  }
  // The zero line: where the cost has been recovered.
  parts.push(`<line x1="${L}" y1="${r1(y(0))}" x2="${W - R + 6}" y2="${r1(y(0))}" stroke="${INK}" stroke-width="1.5"/>`);
  parts.push(`<line x1="${L}" y1="${T - 6}" x2="${L}" y2="${H - B}" stroke="${INK}" stroke-width="1.25"/>`);
  parts.push(`<text x="${(L + W - R) / 2}" y="${H - 8}" text-anchor="middle" class="ch-axis">Year</text>`);
  parts.push(`<text x="14" y="${(T + H - B) / 2}" text-anchor="middle" class="ch-axis" transform="rotate(-90 14 ${(T + H - B) / 2})">Cumulative net cash flow</text>`);

  const series = [
    { ap: a, color: COBALT, dash: '', name: a.project.label },
    { ap: b, color: INK, dash: ' stroke-dasharray="7 4"', name: b.project.label },
  ];
  const ends: Array<{ y: number; text: string; color: string }> = [];
  for (const s of series) {
    const pts = s.ap.cumulative.map((v, t) => `${t ? 'L' : 'M'}${r1(x(t))} ${r1(y(v))}`).join(' ');
    parts.push(`<path d="${pts}" fill="none" stroke="${s.color}" stroke-width="2.5"${s.dash}/>`);
    s.ap.cumulative.forEach((v, t) => parts.push(`<circle cx="${r1(x(t))}" cy="${r1(y(v))}" r="3" fill="#fff" stroke="${s.color}" stroke-width="1.5"/>`));
    const last = s.ap.cumulative.length - 1;
    ends.push({ y: y(s.ap.cumulative[last] ?? 0), text: s.name, color: s.color });
    const pb = s.ap.payback;
    if (pb) {
      parts.push(`<circle cx="${r1(x(pb.total))}" cy="${r1(y(0))}" r="5" fill="${s.color}" stroke="#fff" stroke-width="2"/>`);
    }
  }
  ends.sort((m, n) => m.y - n.y);
  let lastY = -Infinity;
  for (const e of ends) {
    let ly = e.y + 4;
    if (ly - lastY < 15) ly = lastY + 15;
    lastY = ly;
    parts.push(`<text x="${W - R + 10}" y="${r1(ly)}" class="ch-label" fill="${e.color}">${esc(e.text)}</text>`);
  }
  const desc = series
    .map((s) => `${s.name}: from ${money(-s.ap.project.capitalCost, o.currency)} in year 0 to ${money(s.ap.cumulative[s.ap.cumulative.length - 1] ?? 0, o.currency)} at the end of year ${s.ap.cumulative.length - 1}; ${s.ap.payback ? `pays back in ${fmtPayback(s.ap.payback)}` : 'does not pay back within its life'}.`)
    .join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${o.id}-t ${o.id}-d" class="chart" focusable="false"><title id="${o.id}-t">Cumulative net cash flow of the two projects</title><desc id="${o.id}-d">${esc(desc)}</desc>${parts.join('')}</svg>`;
}

/** The chart's key, in words, so that neither colour nor the dots carry meaning alone. */
export function chartKeyHtml(a: Appraisal, b: Appraisal): string {
  const item = (x: Appraisal, cls: string, line: string) =>
    `<li><span class="iad-key__sw iad-key__sw--${cls}" aria-hidden="true"></span>${esc(x.project.label)} (${line}): ${x.payback ? `pays back in ${esc(fmtPayback(x.payback))}, at the filled dot` : 'does not pay back within its life'}</li>`;
  return `${item(a, 'a', 'solid line')}${item(b, 'b', 'dashed line')}`;
}
