/**
 * The Boardroom's charts, built as SVG strings so the server (the board pack,
 * the first dashboard) and the browser (the dashboard after each round) draw
 * them with the same code. Every chart has a title and a description that
 * states the result, and every chart's figures are also in a table beside it.
 * Colours come from CSS classes, so a chart reads on the navy dashboard and on
 * the ivory board pack alike.
 */
import { esc } from '../markup';
import { niceStep } from '../charts';

const r1 = (n: number) => Math.round(n * 10) / 10;

export interface SparkOptions {
  /** Unique prefix for the title and description ids. */
  id: string;
  title: string;
  desc: string;
  width?: number;
  height?: number;
  /** Index of the first value that belongs to the decision rounds (the history is drawn lighter). */
  split?: number;
}

/** A sparkline: one series, no axes, the latest value marked. */
export function sparkline(values: number[], o: SparkOptions): string {
  const W = o.width ?? 120;
  const H = o.height ?? 34;
  const pad = 4;
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length < 2) {
    return `<svg class="bb-spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="${o.id}-t ${o.id}-d"><title id="${o.id}-t">${esc(o.title)}</title><desc id="${o.id}-d">${esc(o.desc)}</desc></svg>`;
  }
  let lo = Math.min(...finite);
  let hi = Math.max(...finite);
  if (hi - lo < 1e-9) {
    lo -= 1;
    hi += 1;
  }
  const x = (i: number) => pad + (i / (values.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - lo) / (hi - lo)) * (H - pad * 2);
  const pts = values.map((v, i) => `${r1(x(i))},${r1(y(Number.isFinite(v) ? v : lo))}`);
  const split = o.split ?? 0;
  const past = split > 0 ? pts.slice(0, Math.min(split, pts.length)) : [];
  const ahead = split > 0 ? pts.slice(Math.max(0, split - 1)) : pts;
  const last = values.length - 1;
  const zero = lo < 0 && hi > 0 ? `<line class="bb-spark__zero" x1="${pad}" x2="${W - pad}" y1="${r1(y(0))}" y2="${r1(y(0))}"/>` : '';
  return [
    `<svg class="bb-spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="${o.id}-t ${o.id}-d">`,
    `<title id="${o.id}-t">${esc(o.title)}</title><desc id="${o.id}-d">${esc(o.desc)}</desc>`,
    zero,
    past.length > 1 ? `<polyline class="bb-spark__past" points="${past.join(' ')}"/>` : '',
    ahead.length > 1 ? `<polyline class="bb-spark__line" points="${ahead.join(' ')}"/>` : '',
    `<circle class="bb-spark__dot" cx="${r1(x(last))}" cy="${r1(y(values[last] ?? lo))}" r="3.5"/>`,
    `</svg>`,
  ].join('');
}

export interface TrendOptions {
  id: string;
  title: string;
  desc: string;
  labels: string[];
  /** Formats an axis tick or the end value. */
  fmt: (v: number) => string;
  width?: number;
  height?: number;
}

/** A small line chart with a value axis and period labels, for one measure over the history. */
export function trendChart(values: number[], o: TrendOptions): string {
  const W = o.width ?? 300;
  const H = o.height ?? 150;
  const L = 52;
  const R = 14;
  const T = 14;
  const B = 28;
  let lo = Math.min(0, ...values);
  let hi = Math.max(...values, 0);
  if (hi - lo < 1e-9) hi = lo + 1;
  const step = niceStep(hi - lo, 3);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const x = (i: number) => L + (values.length === 1 ? (W - L - R) / 2 : (i / (values.length - 1)) * (W - L - R));
  const y = (v: number) => H - B - ((v - lo) / (hi - lo)) * (H - T - B);
  const parts: string[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) {
    const yy = r1(y(v));
    parts.push(`<line class="${Math.abs(v) < step / 1e6 ? 'bb-trend__zero' : 'bb-trend__grid'}" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/>`);
    parts.push(`<text class="bb-trend__tick" x="${L - 6}" y="${yy + 3.5}" text-anchor="end">${esc(o.fmt(v))}</text>`);
  }
  o.labels.forEach((lab, i) => {
    parts.push(`<text class="bb-trend__tick" x="${r1(x(i))}" y="${H - 8}" text-anchor="middle">${esc(lab)}</text>`);
  });
  const pts = values.map((v, i) => `${r1(x(i))},${r1(y(v))}`).join(' ');
  parts.push(`<polyline class="bb-trend__line" points="${pts}"/>`);
  values.forEach((v, i) => parts.push(`<circle class="${i === values.length - 1 ? 'bb-trend__end' : 'bb-trend__pt'}" cx="${r1(x(i))}" cy="${r1(y(v))}" r="${i === values.length - 1 ? 4 : 2.5}"/>`));
  return `<svg class="bb-trend" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${o.id}-t ${o.id}-d"><title id="${o.id}-t">${esc(o.title)}</title><desc id="${o.id}-d">${esc(o.desc)}</desc>${parts.join('')}</svg>`;
}

/** A description of a series that states its result: where it started, where it ended, and its low and high. */
export function describeSeries(name: string, labels: string[], values: number[], fmt: (v: number) => string): string {
  if (!values.length) return `${name}: no figures.`;
  const first = values[0] as number;
  const last = values[values.length - 1] as number;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const dir = Math.abs(last - first) < 1e-9 ? 'held at' : last > first ? 'rose to' : 'fell to';
  const range = values.length > 2 && (lo < Math.min(first, last) - 1e-9 || hi > Math.max(first, last) + 1e-9) ? ` It ranged from ${fmt(lo)} to ${fmt(hi)}.` : '';
  return `${name} ${dir === 'held at' ? `held at ${fmt(last)}` : `was ${fmt(first)} in ${labels[0]} and ${dir} ${fmt(last)} in ${labels[labels.length - 1]}`}.${range}`;
}
