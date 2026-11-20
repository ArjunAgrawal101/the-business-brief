/**
 * Charts for Paper 2 practice: a line chart (the break-even chart and the
 * stock control chart are both drawn with it) and a bar chart of balances.
 * They are SVG strings, so the server and the browser draw the same chart.
 * Colours come from classes styled in src/styles/p2-practice.css with the
 * site's tokens, never from colours written here. Each chart has a title and
 * a description, and every question that shows one also gives its figures in
 * a table, so nothing depends on seeing the chart. Lines are told apart by
 * their labels and dash patterns as well as their colour.
 */
import { esc } from './markup';
import { fmtNumber } from './format';

export interface Axis {
  max: number;
  /** The gap between gridlines. */
  step: number;
  label: string;
}

export interface Series {
  /** A class suffix for the line's colour: p2f-line--<tone>. */
  tone: 'revenue' | 'cost' | 'fixed' | 'stock' | 'level' | 'buffer';
  label: string;
  points: Array<[number, number]>;
  dashed?: boolean;
}

export interface Marker {
  /** A vertical marker at an x value, or a horizontal one at a y value. */
  at: number;
  axis: 'x' | 'y';
  label: string;
}

const W = 600;
const H = 380;
const L = 78;
const R = 132;
const T = 24;
const B = 56;
const r1 = (n: number) => Math.round(n * 10) / 10;

function frame(id: string, title: string, desc: string, body: string): string {
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${esc(id)}-t ${esc(id)}-d" class="p2f" focusable="false"><title id="${esc(id)}-t">${esc(title)}</title><desc id="${esc(id)}-d">${esc(desc)}</desc>${body}</svg>`;
}

/** Gridlines every step, ticks labelled, axes and their titles. */
function axes(x: Axis, y: Axis, sx: (v: number) => number, sy: (v: number) => number, yFmt: (v: number) => string): string {
  const parts: string[] = [];
  for (let v = 0; v <= y.max + 1e-9; v += y.step) {
    parts.push(`<line class="p2f-grid" x1="${L}" y1="${r1(sy(v))}" x2="${W - R}" y2="${r1(sy(v))}"/>`);
    parts.push(`<text class="p2f-tick" x="${L - 8}" y="${r1(sy(v)) + 4}" text-anchor="end">${esc(yFmt(v))}</text>`);
  }
  for (let v = 0; v <= x.max + 1e-9; v += x.step) {
    parts.push(`<line class="p2f-grid p2f-grid--v" x1="${r1(sx(v))}" y1="${T}" x2="${r1(sx(v))}" y2="${H - B}"/>`);
    parts.push(`<text class="p2f-tick" x="${r1(sx(v))}" y="${H - B + 20}" text-anchor="middle">${esc(fmtNumber(v))}</text>`);
  }
  parts.push(`<line class="p2f-axis" x1="${L}" y1="${T - 6}" x2="${L}" y2="${H - B}"/>`);
  parts.push(`<line class="p2f-axis" x1="${L}" y1="${H - B}" x2="${W - R + 8}" y2="${H - B}"/>`);
  parts.push(`<text class="p2f-title" x="${(L + W - R) / 2}" y="${H - 12}" text-anchor="middle">${esc(x.label)}</text>`);
  parts.push(`<text class="p2f-title" x="16" y="${(T + H - B) / 2}" text-anchor="middle" transform="rotate(-90 16 ${(T + H - B) / 2})">${esc(y.label)}</text>`);
  return parts.join('');
}

/** A line chart with labelled lines and markers, on axes from zero. */
export function lineChartSvg(o: { id: string; title: string; desc: string; x: Axis; y: Axis; series: Series[]; markers?: Marker[]; yFmt?: (v: number) => string }): string {
  const sx = (v: number) => L + (v / o.x.max) * (W - L - R);
  const sy = (v: number) => H - B - (v / o.y.max) * (H - T - B);
  const parts = [axes(o.x, o.y, sx, sy, o.yFmt ?? ((v) => fmtNumber(v)))];
  for (const m of o.markers ?? []) {
    if (m.axis === 'x') {
      parts.push(`<line class="p2f-marker" x1="${r1(sx(m.at))}" y1="${T + 14}" x2="${r1(sx(m.at))}" y2="${H - B}"/>`);
      parts.push(`<text class="p2f-note" x="${r1(sx(m.at)) + 5}" y="${T + 10}">${esc(m.label)}</text>`);
    } else {
      parts.push(`<line class="p2f-marker" x1="${L}" y1="${r1(sy(m.at))}" x2="${W - R}" y2="${r1(sy(m.at))}"/>`);
    }
  }
  for (const s of o.series) {
    const d = s.points.map(([a, b], i) => `${i ? 'L' : 'M'}${r1(sx(a))} ${r1(sy(b))}`).join('');
    parts.push(`<path class="p2f-line p2f-line--${s.tone}${s.dashed ? ' p2f-line--dashed' : ''}" d="${d}" fill="none"/>`);
  }
  // End labels for the lines and the horizontal markers, kept apart so they never overlap.
  const labels = [
    ...o.series.map((s) => ({ v: s.points[s.points.length - 1]?.[1] ?? 0, text: s.label, tone: s.tone as string })),
    ...(o.markers ?? []).filter((m) => m.axis === 'y').map((m) => ({ v: m.at, text: m.label, tone: 'marker' })),
  ].sort((a, b) => b.v - a.v);
  let last = -Infinity;
  for (const lb of labels) {
    let y = sy(lb.v) + 4;
    if (y - last < 16) y = last + 16;
    last = y;
    parts.push(`<text class="p2f-label p2f-label--${lb.tone}" x="${W - R + 10}" y="${r1(y)}">${esc(lb.text)}</text>`);
  }
  return frame(o.id, o.title, o.desc, parts.join(''));
}

/** A bar chart of values that may be negative, with the zero line drawn and each bar's value written. */
export function barChartSvg(o: { id: string; title: string; desc: string; labels: string[]; values: number[]; step: number; yLabel: string; fmt: (v: number) => string }): string {
  const hi = Math.max(0, ...o.values);
  const lo = Math.min(0, ...o.values);
  const top = Math.ceil(hi / o.step) * o.step || o.step;
  const bottom = Math.floor(lo / o.step) * o.step;
  const sy = (v: number) => T + ((top - v) / (top - bottom)) * (H - T - B);
  const band = (W - L - 40) / o.labels.length;
  const parts: string[] = [];
  for (let v = bottom; v <= top + 1e-9; v += o.step) {
    parts.push(`<line class="p2f-grid" x1="${L}" y1="${r1(sy(v))}" x2="${W - 40}" y2="${r1(sy(v))}"/>`);
    parts.push(`<text class="p2f-tick" x="${L - 8}" y="${r1(sy(v)) + 4}" text-anchor="end">${esc(o.fmt(v))}</text>`);
  }
  parts.push(`<line class="p2f-axis" x1="${L}" y1="${T - 6}" x2="${L}" y2="${H - B}"/>`);
  o.values.forEach((v, i) => {
    const x = L + i * band + band * 0.2;
    const w = band * 0.6;
    const y0 = sy(0);
    const y1 = sy(v);
    parts.push(`<rect class="p2f-bar${v < 0 ? ' p2f-bar--neg' : ''}" x="${r1(x)}" y="${r1(Math.min(y0, y1))}" width="${r1(w)}" height="${r1(Math.max(1, Math.abs(y1 - y0)))}"/>`);
    parts.push(`<text class="p2f-note" x="${r1(x + w / 2)}" y="${r1(v < 0 ? y1 + 15 : y1 - 6)}" text-anchor="middle">${esc(o.fmt(v))}</text>`);
    parts.push(`<text class="p2f-tick" x="${r1(x + w / 2)}" y="${H - B + 20}" text-anchor="middle">${esc(o.labels[i] ?? '')}</text>`);
  });
  parts.push(`<line class="p2f-axis" x1="${L}" y1="${r1(sy(0))}" x2="${W - 40}" y2="${r1(sy(0))}"/>`);
  parts.push(`<text class="p2f-title" x="16" y="${(T + H - B) / 2}" text-anchor="middle" transform="rotate(-90 16 ${(T + H - B) / 2})">${esc(o.yLabel)}</text>`);
  return frame(o.id, o.title, o.desc, parts.join(''));
}
