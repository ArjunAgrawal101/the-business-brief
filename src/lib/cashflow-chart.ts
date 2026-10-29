/**
 * The cash flow chart: each month's closing balance as a bar, measured from
 * zero, with the overdraft limit as a dashed line below it. A bar's colour
 * repeats what its label already says (in credit, overdrawn, beyond the limit),
 * so colour is never the only signal. Built as a string for server and browser.
 */
import { bracket, STATUS_WORDS, type Forecast } from './cashflow';
import { niceStep } from './charts';
import { esc } from './markup';

const INK = '#111417';
const COBALT = '#315CFF';
const BRASS = '#C79A45';
const SIGNAL = '#B84A4A';
const RULE = '#DCD6CA';
const MUTED = '#5A6670';

const r1 = (n: number) => Math.round(n * 10) / 10;

export function cashFlowSvg(f: Forecast, o: { currency: string; id: string; scaleMin?: number; scaleMax?: number }): string {
  const W = 600;
  const H = 330;
  const L = 74;
  const R = 18;
  const T = 24;
  const B = 44;
  const top = Math.max(o.scaleMax ?? 0, ...f.closing, 0);
  const bottom = Math.min(o.scaleMin ?? 0, ...f.closing, -f.limit, 0);
  const step = niceStep(top - bottom, 6);
  const ymax = Math.ceil(top / step) * step || step;
  const ymin = Math.floor(bottom / step) * step;
  const y = (v: number) => T + ((ymax - v) / (ymax - ymin)) * (H - T - B);
  const n = f.months.length;
  const band = (W - L - R) / n;
  const bw = Math.min(54, band * 0.56);
  const parts: string[] = [];

  for (let v = ymin; v <= ymax + 1e-9; v += step) {
    parts.push(`<line x1="${L}" y1="${r1(y(v))}" x2="${W - R}" y2="${r1(y(v))}" stroke="${RULE}" stroke-width="1"/>`);
    parts.push(`<text x="${L - 8}" y="${r1(y(v)) + 4}" text-anchor="end" class="ch-tick">${esc(bracket(v, 0))}</text>`);
  }
  parts.push(`<text x="14" y="${(T + H - B) / 2}" text-anchor="middle" class="ch-axis" transform="rotate(-90 14 ${(T + H - B) / 2})">${esc(`Closing balance, ${o.currency}`)}</text>`);

  // The overdraft limit
  const ly = y(-f.limit);
  parts.push(`<line x1="${L}" y1="${r1(ly)}" x2="${W - R}" y2="${r1(ly)}" stroke="${SIGNAL}" stroke-width="1.5" stroke-dasharray="7 5"/>`);
  parts.push(`<text x="${L + 6}" y="${r1(ly) + 15}" class="ch-note" fill="${SIGNAL}">Overdraft limit ${esc(`(${bracket(f.limit, 0)})`)}</text>`);

  f.closing.forEach((v, i) => {
    const cx = L + band * i + band / 2;
    const y0 = y(0);
    const yv = y(v);
    const st = f.status[i] ?? 'credit';
    const fill = st === 'credit' ? COBALT : st === 'overdraft' ? BRASS : SIGNAL;
    const h = Math.max(1, Math.abs(yv - y0));
    parts.push(`<rect x="${r1(cx - bw / 2)}" y="${r1(Math.min(yv, y0))}" width="${r1(bw)}" height="${r1(h)}" fill="${fill}"${st === 'beyond' ? ` stroke="${INK}" stroke-width="1"` : ''}/>`);
    const above = v >= 0;
    parts.push(`<text x="${r1(cx)}" y="${r1(above ? yv - 7 : yv + 15)}" text-anchor="middle" class="ch-label" fill="${INK}">${esc(bracket(v, 0))}</text>`);
    parts.push(`<text x="${r1(cx)}" y="${H - B + 18}" text-anchor="middle" class="ch-tick">${esc((f.months[i] ?? '').slice(0, 3))}</text>`);
  });
  parts.push(`<line x1="${L}" y1="${r1(y(0))}" x2="${W - R}" y2="${r1(y(0))}" stroke="${INK}" stroke-width="1.25"/>`);
  parts.push(`<line x1="${L}" y1="${T - 6}" x2="${L}" y2="${H - B}" stroke="${INK}" stroke-width="1.25"/>`);
  parts.push(`<text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle" class="ch-axis" fill="${MUTED}">Month</text>`);

  const desc = f.months
    .map((m, i) => `${m}: ${o.currency}${bracket(f.closing[i] ?? 0)}, ${STATUS_WORDS[f.status[i] ?? 'credit'].toLowerCase()}`)
    .join('. ');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${o.id}-t ${o.id}-d" class="chart" focusable="false"><title id="${o.id}-t">Closing balance each month against the overdraft limit</title><desc id="${o.id}-d">${esc(`${desc}. Overdraft limit ${o.currency}${bracket(f.limit, 0)}.`)}</desc>${parts.join('')}</svg>`;
}
