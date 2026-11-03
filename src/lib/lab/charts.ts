/**
 * Charts for the Entrepreneurship and Innovation Lab, built as SVG strings so
 * the server and the browser draw the same thing: the cash runway, revenue by
 * stream, and the payback of one customer. Each has a title and a description
 * that states its result, and the page gives its figures in a table. Colour is
 * never the only signal: lines are labelled in words and the revenue streams
 * also differ in pattern.
 */
import { niceStep } from '../charts';
import { fmtMoney, fmtNumber } from '../format';
import { esc } from '../markup';
import type { CostModel } from './costs';
import type { RevenueModel } from './revenue';
import type { UnitModel } from './unit-economics';

const INK = '#0B1A33';
const COBALT = '#2448D0';
const GOLD = '#8A6B2A';
const SIGNAL = '#9E3F38';
const GREEN = '#2B6A59';
const RULE = '#E3DAC8';
const WASH_RED = '#F5E7E5';

const r1 = (n: number) => Math.round(n * 10) / 10;

interface Frame {
  W: number;
  H: number;
  L: number;
  R: number;
  T: number;
  B: number;
}

function yAxis(f: Frame, lo: number, hi: number, fmt: (v: number) => string, target = 5) {
  const step = niceStep(hi - lo || 1, target);
  const ymin = Math.floor(lo / step) * step;
  const ymax = Math.ceil(hi / step) * step || step;
  const y = (v: number) => f.T + ((ymax - v) / (ymax - ymin || 1)) * (f.H - f.T - f.B);
  const parts: string[] = [];
  for (let v = ymin; v <= ymax + step * 1e-6; v += step) {
    const yy = r1(y(v));
    parts.push(`<line x1="${f.L}" y1="${yy}" x2="${f.W - f.R}" y2="${yy}" stroke="${RULE}" stroke-width="1"/>`);
    parts.push(`<text x="${f.L - 8}" y="${yy + 4}" text-anchor="end" class="ch-tick">${esc(fmt(Math.abs(v) < step * 1e-6 ? 0 : v))}</text>`);
  }
  return { y, parts, ymin, ymax };
}

/* ---------- The cash runway ---------- */

/**
 * The months the runway chart shows: enough to see the cash run out, reach
 * its lowest point and recover, but not so many that steady growth, which
 * compounds, flattens the months that decide the runway. At least 12, at
 * most the whole projection; the table always shows every month.
 */
export function runwaySpan(m: CostModel): number {
  const all = m.months.length;
  const be = m.breakEvenMonth ?? all;
  return Math.min(all, Math.max(12, be + 4, (m.runOut ?? 0) + 4, m.lowest.month + 3));
}

export function runwayCaption(m: CostModel): string {
  const n = runwaySpan(m);
  const span = n < m.months.length ? `The chart shows the first ${n} months, the ones that decide the runway; the table has all ${m.months.length}.` : `The chart and the table show all ${n} months.`;
  return `Cash in the bank at the end of each month with the expected sales (solid blue) and with no sales at all (dashed red). ${span}`;
}

export function runwaySvg(m: CostModel, o: { currency: string; id: string }): string {
  const f: Frame = { W: 640, H: 330, L: 78, R: 18, T: 32, B: 46 };
  const n = runwaySpan(m);
  const rows = m.months.slice(0, n);
  const money = (v: number) => fmtMoney(v, o.currency, 0);
  const balances = [m.cashAtLaunch, ...rows.map((x) => x.closing)];
  const hi = Math.max(0, ...balances);
  const lo = Math.min(0, ...balances);
  // Headroom below the lowest point, so its label sits under it, clear of the line.
  const { y, parts } = yAxis(f, lo < 0 ? lo - 0.22 * (hi - lo) : lo, hi, money);
  const x = (month: number) => f.L + (month / n) * (f.W - f.L - f.R);
  const y0 = r1(y(0));
  const right = (px: number) => px > f.W - f.R - 200;
  /** A label centred on a point, kept inside the plot: about 6.4 px a character. */
  const centred = (px: number, text: string) => {
    const half = (text.length * 6.4) / 2;
    if (px - half < f.L + 4) return { x: f.L + 4, anchor: 'start' };
    if (px + half > f.W - f.R - 4) return { x: f.W - f.R - 4, anchor: 'end' };
    return { x: px, anchor: 'middle' };
  };
  const lowest = rows.reduce((best, r) => (r.closing < best.balance ? { month: r.month, balance: r.closing } : best), { month: 0, balance: m.cashAtLaunch });
  // Below zero: the business needs more money than it has.
  if (lo < 0) {
    parts.push(`<rect x="${f.L}" y="${y0}" width="${r1(f.W - f.L - f.R)}" height="${r1(f.H - f.B - y0)}" fill="${WASH_RED}" fill-opacity="0.65"/>`);
    if (f.H - f.B - y0 > 22) parts.push(`<text x="${f.L + 8}" y="${r1(f.H - f.B - 8)}" class="ch-note" fill="${SIGNAL}">Below zero: more funding needed</text>`);
  }
  const step = n <= 12 ? 2 : 3;
  for (let mo = 0; mo <= n; mo += step) parts.push(`<text x="${r1(x(mo))}" y="${f.H - f.B + 18}" text-anchor="middle" class="ch-tick">${mo}</text>`);
  parts.push(`<text x="${r1((f.L + f.W - f.R) / 2)}" y="${f.H - 6}" text-anchor="middle" class="ch-axis">Month of trading</text>`);
  parts.push(`<text x="14" y="${r1((f.T + f.H - f.B) / 2)}" text-anchor="middle" class="ch-axis" transform="rotate(-90 14 ${r1((f.T + f.H - f.B) / 2)})">${esc(`Cash in the bank, ${o.currency.trim() || 'currency'}`)}</text>`);
  // The month sales first cover the outgoings.
  if (m.breakEvenMonth !== null && m.breakEvenMonth <= n) {
    const bx = r1(x(m.breakEvenMonth));
    parts.push(`<line x1="${bx}" y1="${f.T}" x2="${bx}" y2="${f.H - f.B}" stroke="${GOLD}" stroke-width="1.25" stroke-dasharray="2 4"/>`);
    const end = right(bx);
    parts.push(`<text x="${bx + (end ? -6 : 6)}" y="${f.T - 12}" text-anchor="${end ? 'end' : 'start'}" class="ch-note" fill="${GOLD}">${esc(`Sales cover outgoings from month ${m.breakEvenMonth}`)}</text>`);
  }
  // With no sales: a straight fall to zero, labelled just below the zero line.
  if (m.zeroSalesRunway !== null && m.cashAtLaunch > 0) {
    const zx = Math.min(n, m.zeroSalesRunway);
    const zy = m.cashAtLaunch - m.monthlyTotal * zx;
    parts.push(`<path d="M${r1(x(0))} ${r1(y(m.cashAtLaunch))}L${r1(x(zx))} ${r1(y(zy))}" fill="none" stroke="${SIGNAL}" stroke-width="2" stroke-dasharray="7 5"/>`);
    if (m.zeroSalesRunway <= n) {
      const text = `No sales: ${fmtNumber(m.zeroSalesRunway, 1)} months`;
      const at = centred(r1(x(zx)), text);
      parts.push(`<text x="${r1(at.x)}" y="${y0 + 17}" text-anchor="${at.anchor}" class="ch-note" fill="${SIGNAL}">${esc(text)}</text>`);
    }
  }
  parts.push(`<line x1="${f.L}" y1="${y0}" x2="${f.W - f.R}" y2="${y0}" stroke="${INK}" stroke-width="1.25"/>`);
  // The expected balance.
  const pts = balances.map((b, i) => `${r1(x(i))} ${r1(y(b))}`);
  parts.push(`<path d="M${pts.join('L')}" fill="none" stroke="${COBALT}" stroke-width="2.5" stroke-linejoin="round"/>`);
  const ly = r1(y(m.cashAtLaunch));
  parts.push(`<circle cx="${r1(x(0))}" cy="${ly}" r="4" fill="${COBALT}"/>`);
  parts.push(`<text x="${r1(x(0)) + 9}" y="${m.cashAtLaunch >= 0 ? ly - 9 : ly + 18}" class="ch-label" fill="${INK}">${esc(`At launch ${money(m.cashAtLaunch)}`)}</text>`);
  if (m.runOut !== null && m.runOut <= n) {
    const rx = r1(x(m.runOut));
    const ry = r1(y(m.months[m.runOut - 1]?.closing ?? 0));
    parts.push(`<circle cx="${rx}" cy="${ry}" r="5" fill="#fff" stroke="${SIGNAL}" stroke-width="2"/>`);
    const end = right(rx);
    parts.push(`<text x="${rx + (end ? -9 : 9)}" y="${Math.min(ry, y0) - 10}" text-anchor="${end ? 'end' : 'start'}" class="ch-label" fill="${SIGNAL}">${esc(`Runs out in month ${m.runOut}`)}</text>`);
  }
  if (lowest.balance < 0 && lowest.month > 0 && lowest.month !== m.runOut) {
    const lx = r1(x(lowest.month));
    const lyy = r1(y(lowest.balance));
    parts.push(`<circle cx="${lx}" cy="${lyy}" r="3.5" fill="${INK}"/>`);
    const text = `Lowest ${money(lowest.balance)}, month ${lowest.month}`;
    const at = centred(lx, text);
    parts.push(`<text x="${r1(at.x)}" y="${lyy + 20}" text-anchor="${at.anchor}" class="ch-label" fill="${INK}">${esc(text)}</text>`);
  } else {
    const last = rows[n - 1];
    if (last) parts.push(`<text x="${r1(x(n)) - 4}" y="${r1(y(last.closing)) - 10}" text-anchor="end" class="ch-label" fill="${INK}">${esc(`Month ${n}: ${money(last.closing)}`)}</text>`);
  }
  parts.push(`<line x1="${f.L}" y1="${f.T - 4}" x2="${f.L}" y2="${f.H - f.B}" stroke="${INK}" stroke-width="1.25"/>`);
  const desc = [
    `Cash at launch ${money(m.cashAtLaunch)}.`,
    m.runOut === null ? `With the expected sales the balance stays above zero for all ${m.months.length} months.` : `With the expected sales the balance runs out in month ${m.runOut}${m.lowest.balance < 0 ? ` and reaches its lowest, ${money(m.lowest.balance)}, at the end of month ${m.lowest.month}` : ''}.`,
    m.breakEvenMonth === null ? 'Sales never cover the monthly outgoings in this period.' : `Sales cover the monthly outgoings from month ${m.breakEvenMonth}.`,
    m.zeroSalesRunway === null ? '' : `With no sales the cash would last ${fmtNumber(m.zeroSalesRunway, 1)} months.`,
    n < m.months.length ? `The chart shows months 0 to ${n}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<svg viewBox="0 0 ${f.W} ${f.H}" role="img" aria-labelledby="${o.id}-t ${o.id}-d" class="chart" focusable="false"><title id="${o.id}-t">Cash in the bank month by month, with the expected sales and with none</title><desc id="${o.id}-d">${esc(desc)}</desc>${parts.join('')}</svg>`;
}

/* ---------- Revenue by stream ---------- */

/** Fill, pattern and words for each stream, in order. */
export const STREAM_STYLES = [
  { fill: INK, pattern: 'solid', words: 'solid navy' },
  { fill: COBALT, pattern: 'hatch', words: 'blue with diagonal lines' },
  { fill: GOLD, pattern: 'rows', words: 'gold with horizontal lines' },
  { fill: GREEN, pattern: 'dots', words: 'green with dots' },
] as const;

function patternDefs(id: string): string {
  const s = STREAM_STYLES;
  return `<defs><pattern id="${id}-p1" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="${s[1].fill}"/><line x1="0" y1="0" x2="0" y2="7" stroke="#fff" stroke-width="2.2" stroke-opacity="0.75"/></pattern><pattern id="${id}-p2" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="${s[2].fill}"/><line x1="0" y1="1.5" x2="6" y2="1.5" stroke="#fff" stroke-width="1.6" stroke-opacity="0.7"/></pattern><pattern id="${id}-p3" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="${s[3].fill}"/><circle cx="3" cy="3" r="1.25" fill="#fff" fill-opacity="0.8"/></pattern></defs>`;
}

export function streamFill(i: number, id: string): string {
  return i === 0 ? STREAM_STYLES[0].fill : `url(#${id}-p${i})`;
}

/** A small swatch for the legend, drawn with the same pattern as the bars. */
export function swatchSvg(i: number, id: string): string {
  return `<svg class="lab-swatch" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">${patternDefs(`${id}-s${i}`)}<rect width="16" height="16" fill="${streamFill(i, `${id}-s${i}`)}"/></svg>`;
}

export function revenueSvg(m: RevenueModel, o: { currency: string; id: string }): string {
  const f: Frame = { W: 640, H: 320, L: 74, R: 14, T: 30, B: 44 };
  const money = (v: number) => fmtMoney(v, o.currency, 0);
  const peak = Math.max(1, ...m.months.map((x) => x.revenue));
  const { y, parts } = yAxis(f, 0, peak, money);
  const n = m.months.length;
  const band = (f.W - f.L - f.R) / n;
  const bw = Math.min(30, band * 0.62);
  m.months.forEach((row, i) => {
    const cx = f.L + band * i + band / 2;
    let acc = 0;
    row.streams.forEach((c, si) => {
      if (c.revenue <= 0) return;
      const top = y(acc + c.revenue);
      const bottom = y(acc);
      parts.push(`<rect x="${r1(cx - bw / 2)}" y="${r1(top)}" width="${r1(bw)}" height="${r1(Math.max(0.5, bottom - top))}" fill="${streamFill(si, o.id)}" stroke="#fff" stroke-width="0.75"/>`);
      acc += c.revenue;
    });
    parts.push(`<text x="${r1(cx)}" y="${f.H - f.B + 18}" text-anchor="middle" class="ch-tick">${row.month}</text>`);
    if (i === 0 || i === n - 1) parts.push(`<text x="${r1(cx)}" y="${r1(y(row.revenue)) - 7}" text-anchor="middle" class="ch-label" fill="${INK}">${esc(money(row.revenue))}</text>`);
  });
  parts.push(`<line x1="${f.L}" y1="${r1(y(0))}" x2="${f.W - f.R}" y2="${r1(y(0))}" stroke="${INK}" stroke-width="1.25"/>`);
  parts.push(`<line x1="${f.L}" y1="${f.T - 4}" x2="${f.L}" y2="${f.H - f.B}" stroke="${INK}" stroke-width="1.25"/>`);
  parts.push(`<text x="${r1((f.L + f.W - f.R) / 2)}" y="${f.H - 6}" text-anchor="middle" class="ch-axis">Month</text>`);
  parts.push(`<text x="14" y="${r1((f.T + f.H - f.B) / 2)}" text-anchor="middle" class="ch-axis" transform="rotate(-90 14 ${r1((f.T + f.H - f.B) / 2)})">${esc(`Revenue, ${o.currency.trim() || 'currency'}`)}</text>`);
  const shares = m.totals.map((t, i) => `${t.label} (${STREAM_STYLES[i]?.words ?? 'bar'}) ${fmtNumber(t.share, 0)}%`).join(', ');
  const desc = `Revenue grows from ${money(m.first)} in month 1 to ${money(m.last)} in month ${n}, ${money(m.revenue)} in the year. Share of the year's revenue: ${shares}.`;
  return `<svg viewBox="0 0 ${f.W} ${f.H}" role="img" aria-labelledby="${o.id}-t ${o.id}-d" class="chart" focusable="false"><title id="${o.id}-t">Revenue each month, stacked by stream</title><desc id="${o.id}-d">${esc(desc)}</desc>${patternDefs(o.id)}${parts.join('')}</svg>`;
}

/* ---------- The payback of one customer ---------- */

export function paybackSvg(u: UnitModel, o: { currency: string; id: string }): string {
  const f: Frame = { W: 640, H: 300, L: 74, R: 20, T: 28, B: 44 };
  const money = (v: number) => fmtMoney(v, o.currency, 0);
  const cac = u.cac ?? 0;
  const span = Math.min(60, Math.max(6, Math.ceil(Math.max(u.lifetime, u.payback ?? 0) * 1.2)));
  const top = Math.max(cac, u.ltv, 1);
  const lo = Math.min(0, u.ltv);
  const { y, parts } = yAxis(f, lo, top, money);
  const x = (mo: number) => f.L + (mo / span) * (f.W - f.L - f.R);
  const stepX = span <= 12 ? 1 : span <= 24 ? 3 : span <= 48 ? 6 : 12;
  for (let mo = 0; mo <= span; mo += stepX) parts.push(`<text x="${r1(x(mo))}" y="${f.H - f.B + 18}" text-anchor="middle" class="ch-tick">${mo}</text>`);
  parts.push(`<text x="${r1((f.L + f.W - f.R) / 2)}" y="${f.H - 6}" text-anchor="middle" class="ch-axis">Months since the customer joined</text>`);
  parts.push(`<text x="14" y="${r1((f.T + f.H - f.B) / 2)}" text-anchor="middle" class="ch-axis" transform="rotate(-90 14 ${r1((f.T + f.H - f.B) / 2)})">${esc(`Contribution so far, ${o.currency.trim() || 'currency'}`)}</text>`);
  parts.push(`<line x1="${f.L}" y1="${r1(y(0))}" x2="${f.W - f.R}" y2="${r1(y(0))}" stroke="${INK}" stroke-width="1.25"/>`);
  if (cac > 0) {
    const cy = r1(y(cac));
    parts.push(`<line x1="${f.L}" y1="${cy}" x2="${f.W - f.R}" y2="${cy}" stroke="${SIGNAL}" stroke-width="1.5" stroke-dasharray="7 5"/>`);
    parts.push(`<text x="${f.W - f.R - 4}" y="${cy - 8}" text-anchor="end" class="ch-note" fill="${SIGNAL}">${esc(`Cost to win the customer ${fmtMoney(cac, o.currency, 2)}`)}</text>`);
  }
  const end = Math.min(u.lifetime, span);
  const pts = [`${r1(x(0))} ${r1(y(0))}`, `${r1(x(end))} ${r1(y(u.contribution * end))}`];
  if (end < span) pts.push(`${r1(x(span))} ${r1(y(u.contribution * end))}`);
  parts.push(`<path d="M${pts.join('L')}" fill="none" stroke="${COBALT}" stroke-width="2.5" stroke-linejoin="round"/>`);
  parts.push(`<circle cx="${r1(x(end))}" cy="${r1(y(u.contribution * end))}" r="4" fill="${COBALT}"/>`);
  const ltvAnchor = end > span * 0.6 ? 'end' : 'start';
  parts.push(`<text x="${r1(x(end)) + (ltvAnchor === 'end' ? -8 : 8)}" y="${r1(y(u.contribution * end)) - 10}" text-anchor="${ltvAnchor}" class="ch-label" fill="${INK}">${esc(`Leaves after ${fmtNumber(u.lifetime, 1)} months: ${fmtMoney(u.ltv, o.currency, 2)}`)}</text>`);
  if (u.payback !== null && u.payback <= Math.min(u.lifetime, span) && cac > 0) {
    const px = r1(x(u.payback));
    const py = r1(y(cac));
    parts.push(`<circle cx="${px}" cy="${py}" r="5" fill="#fff" stroke="${GREEN}" stroke-width="2"/>`);
    parts.push(`<text x="${px + 8}" y="${py + 18}" class="ch-label" fill="${GREEN}">${esc(`Paid back after ${fmtNumber(u.payback, 1)} months`)}</text>`);
  }
  parts.push(`<line x1="${f.L}" y1="${f.T - 4}" x2="${f.L}" y2="${f.H - f.B}" stroke="${INK}" stroke-width="1.25"/>`);
  const result =
    u.payback === null
      ? 'Contribution is not positive, so the cost of winning the customer is never earned back.'
      : u.payback > u.lifetime
        ? `The customer leaves after about ${fmtNumber(u.lifetime, 1)} months, before the ${fmtNumber(u.payback, 1)} months needed to earn back the cost of winning them.`
        : `The cost of winning the customer is earned back after ${fmtNumber(u.payback, 1)} months; by the time the customer leaves, after about ${fmtNumber(u.lifetime, 1)} months, they have contributed ${fmtMoney(u.ltv, o.currency, 2)}.`;
  const desc = `One customer who stays the expected lifetime contributes ${fmtMoney(u.contribution, o.currency, 2)} a month. ${cac > 0 ? `Winning them cost ${fmtMoney(cac, o.currency, 2)}. ` : ''}${result}`;
  return `<svg viewBox="0 0 ${f.W} ${f.H}" role="img" aria-labelledby="${o.id}-t ${o.id}-d" class="chart" focusable="false"><title id="${o.id}-t">Contribution from one customer against the cost of winning them</title><desc id="${o.id}-d">${esc(desc)}</desc>${parts.join('')}</svg>`;
}
