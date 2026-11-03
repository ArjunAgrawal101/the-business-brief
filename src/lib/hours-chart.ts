/**
 * The IB DP route's course time as a chart: the guide's recommended hours for
 * each stage, SL against HL, as paired horizontal bars. One axis (hours), a
 * legend beside it on the page, the value at each bar's tip, and the figures
 * in a table under it. Colours were checked with the data-visualization
 * palette validator: both pass the lightness, chroma, colour-blind and
 * contrast checks on the white sheet the chart sits on.
 */

export const SERIES = {
  sl: { label: 'Standard Level (SL)', colour: '#2b5c9e' },
  hl: { label: 'Higher Level (HL)', colour: '#b3842a' },
} as const;

export interface HoursRow {
  label: string;
  sl: number;
  hl: number;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r1 = (n: number) => Math.round(n * 10) / 10;

/** A clean axis maximum and its tick step: multiples of 5, 10 or 15 hours. */
export function hoursAxis(max: number): { top: number; step: number } {
  const step = max <= 20 ? 5 : max <= 40 ? 10 : 15;
  return { top: Math.max(step, Math.ceil(max / step) * step), step };
}

/** A stage's name in running text: "Unit 5" for a unit, otherwise the title before any colon, without a capital "The". */
export function shortName(label: string): string {
  const unit = label.match(/^Unit \d+/);
  if (unit) return unit[0];
  return (label.split(':')[0] ?? label).replace(/^The /, 'the ');
}

const andList = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** What the chart shows, in words: the totals, where HL adds the most time, and where the levels are equal. */
export function hoursSummary(rows: HoursRow[]): string {
  const sl = rows.reduce((t, r) => t + r.sl, 0);
  const hl = rows.reduce((t, r) => t + r.hl, 0);
  const extra = rows
    .map((r) => ({ ...r, d: r.hl - r.sl }))
    .filter((r) => r.d > 0)
    .sort((a, b) => b.d - a.d || rows.indexOf(a) - rows.indexOf(b));
  const same = rows.filter((r) => r.sl === r.hl);
  const most = extra.slice(0, 2).map((r) => `${shortName(r.label)} (${r.sl} hours at SL, ${r.hl} at HL)`);
  const parts = [`The route takes ${sl} hours at SL and ${hl} at HL.`];
  if (most.length) parts.push(`HL adds the most time to ${andList(most)}.`);
  if (same.length) parts.push(`${capital(andList(same.map((r) => shortName(r.label))))} ${same.length === 1 ? 'takes' : 'take'} the same time at both levels.`);
  return parts.join(' ');
}

/** Paired bars, one row per stage: the stage's name above its SL and HL bars. */
export function hoursChartSvg(rows: HoursRow[], o: { title: string; idPrefix: string }): string {
  const W = 340;
  const barMax = 268;
  const bar = 12;
  const gap = 2;
  const labelH = 19;
  const rowH = labelH + bar * 2 + gap + 16;
  const axisH = 26;
  const H = rows.length * rowH + axisH;
  const { top, step } = hoursAxis(Math.max(...rows.map((r) => Math.max(r.sl, r.hl)), 1));
  const x = (h: number) => (h / top) * barMax;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const plotBottom = rows.length * rowH;
  // A bar square at the baseline with a 4 px rounded data end.
  const barPath = (y: number, w: number) => {
    const rr = Math.min(4, w / 2, bar / 2);
    return `M0 ${r1(y)}H${r1(w - rr)}Q${r1(w)} ${r1(y)} ${r1(w)} ${r1(y + rr)}V${r1(y + bar - rr)}Q${r1(w)} ${r1(y + bar)} ${r1(w - rr)} ${r1(y + bar)}H0Z`;
  };
  const parts: string[] = [
    `<svg class="hc" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${o.idPrefix}-t ${o.idPrefix}-d" xmlns="http://www.w3.org/2000/svg">`,
    `<title id="${o.idPrefix}-t">${esc(o.title)}</title>`,
    `<desc id="${o.idPrefix}-d">${esc(hoursSummary(rows))}</desc>`,
  ];
  for (const t of ticks) {
    const tx = r1(x(t));
    parts.push(`<line x1="${tx}" x2="${tx}" y1="0" y2="${plotBottom}" stroke="#e3dac8" stroke-width="1"/>`);
    parts.push(`<text class="hc-tick" x="${tx}" y="${plotBottom + 16}" text-anchor="${t === 0 ? 'start' : 'middle'}">${t}${t === top ? ' h' : ''}</text>`);
  }
  rows.forEach((r, i) => {
    const y0 = i * rowH;
    parts.push(`<text class="hc-label" x="0" y="${y0 + 13}">${esc(r.label)}</text>`);
    (['sl', 'hl'] as const).forEach((k, j) => {
      const y = y0 + labelH + j * (bar + gap);
      const w = Math.max(x(r[k]), 2);
      parts.push(`<path d="${barPath(y, w)}" fill="${SERIES[k].colour}"><title>${esc(`${r.label}: ${r[k]} hours at ${k.toUpperCase()}`)}</title></path>`);
      parts.push(`<text class="hc-value" x="${r1(w + 5)}" y="${y + bar - 2}">${r[k]}</text>`);
    });
  });
  parts.push('</svg>');
  return parts.join('');
}
