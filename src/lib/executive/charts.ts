/**
 * The executive simulation's own chart: one measure compared across plans,
 * as horizontal bars from a zero line, the learner's plan in the accent
 * colour. Drawn as an SVG string so the server (the worked example) and the
 * browser (the learner's debrief) draw it with the same code. Like every chart
 * on the platform it has a title and a description that states the result,
 * and its figures are in the table beside it. The Boardroom's sparklines and
 * trend charts (src/lib/boardroom/charts.ts) are reused for everything else.
 */
import { esc } from '../markup';
import { niceStep } from '../charts';

const r1 = (n: number) => Math.round(n * 10) / 10;

export interface BarItem {
  label: string;
  value: number;
  /** The learner's own plan: drawn in the accent colour and named in the description. */
  mine?: boolean;
}

export interface BarOptions {
  id: string;
  title: string;
  /** Formats a value for the labels and the axis. */
  fmt: (v: number) => string;
  width?: number;
}

/** Horizontal bars with a zero line, labelled in words and figures; negative values run left of zero. */
export function barsSvg(items: BarItem[], o: BarOptions): string {
  const W = o.width ?? 560;
  const rowH = 30;
  const top = 10;
  const labelW = 190;
  const valueW = 76;
  const plotL = labelW + 8;
  const plotR = W - valueW;
  const H = top + items.length * rowH + 26;
  const values = items.map((i) => i.value);
  let lo = Math.min(0, ...values);
  let hi = Math.max(0, ...values);
  if (hi - lo < 1e-9) hi = lo + 1;
  const step = niceStep(hi - lo, 4);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const x = (v: number) => plotL + ((v - lo) / (hi - lo)) * (plotR - plotL);
  const parts: string[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) {
    const xx = r1(x(v));
    const zero = Math.abs(v) < step / 1e6;
    parts.push(`<line class="${zero ? 'ex-bars__zero' : 'ex-bars__grid'}" x1="${xx}" x2="${xx}" y1="${top - 4}" y2="${top + items.length * rowH}"/>`);
    parts.push(`<text class="ex-bars__tick" x="${xx}" y="${H - 8}" text-anchor="middle">${esc(o.fmt(zero ? 0 : v))}</text>`);
  }
  items.forEach((it, i) => {
    const y = top + i * rowH;
    const x0 = x(0);
    const x1 = x(it.value);
    const left = Math.min(x0, x1);
    const w = Math.max(1, Math.abs(x1 - x0));
    parts.push(`<text class="ex-bars__label${it.mine ? ' is-mine' : ''}" x="${labelW}" y="${y + rowH / 2 + 4}" text-anchor="end">${esc(it.label)}</text>`);
    parts.push(`<rect class="ex-bars__bar${it.mine ? ' is-mine' : ''}${it.value < 0 ? ' is-negative' : ''}" x="${r1(left)}" y="${y + 6}" width="${r1(w)}" height="${rowH - 12}"/>`);
    parts.push(`<text class="ex-bars__value" x="${W - 4}" y="${y + rowH / 2 + 4}" text-anchor="end">${esc(o.fmt(it.value))}</text>`);
  });
  const best = [...items].sort((a, b) => b.value - a.value)[0];
  const worst = [...items].sort((a, b) => a.value - b.value)[0];
  const mine = items.find((i) => i.mine);
  const desc = `${items.map((i) => `${i.label}: ${o.fmt(i.value)}`).join('; ')}.${best ? ` Highest: ${best.label}.` : ''}${worst && worst !== best ? ` Lowest: ${worst.label}.` : ''}${mine ? ` Yours is marked.` : ''}`;
  return `<svg class="ex-bars" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${o.id}-t ${o.id}-d"><title id="${o.id}-t">${esc(o.title)}</title><desc id="${o.id}-d">${esc(desc)}</desc>${parts.join('')}</svg>`;
}
