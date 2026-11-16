/**
 * The advanced mode's charts, drawn as SVG strings by the same functions on
 * the server and in the browser, in the platform's chart language
 * (src/lib/charts.ts and src/lib/finance-lab/charts.ts): navy for structure,
 * cobalt for the figure in focus, grey for context, green and red only where
 * they mean gain and loss, and always a legend, a label or a position that
 * says the same in words. Every chart has a title, a description that states
 * its result, a tooltip on each mark, and its figures in a table beside it.
 */
import { CHART_COLOURS, niceStep } from '../charts';
import { fmtMoney, fmtNumber } from '../format';
import { esc } from '../markup';

export const { INK, COBALT, SLATE, GREEN, SIGNAL, RULE, MUTED } = CHART_COLOURS;
const r1 = (n: number) => Math.round(n * 10) / 10;

function frame(w: number, h: number, id: string, title: string, desc: string, body: string): string {
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}-t ${id}-d" class="chart" focusable="false"><title id="${id}-t">${esc(title)}</title><desc id="${id}-d">${esc(desc)}</desc>${body}</svg>`;
}

const tip = (text: string) => `<title>${esc(text)}</title>`;

/** A scale that includes zero, in nice steps. */
export function scale(lo: number, hi: number, target = 5): { min: number; max: number; step: number } {
  const a = Math.min(0, lo);
  const b = Math.max(0, hi);
  const step = niceStep(b - a || 1, target);
  return { min: Math.floor(a / step + 1e-9) * step, max: Math.ceil(b / step - 1e-9) * step || step, step };
}

/** Compact money for axis ticks: $25k, −$40k, $1.2m. */
export function shortMoney(v: number, cur: string): string {
  const a = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (a >= 1e6) return `${sign}${cur}${fmtNumber(a / 1e6, a % 1e6 === 0 ? 0 : 1)}m`;
  if (a >= 1e4) return `${sign}${cur}${fmtNumber(a / 1e3, a % 1e3 === 0 ? 0 : 1)}k`;
  return `${sign}${cur}${fmtNumber(a)}`;
}

export interface Series {
  label: string;
  values: Array<number | null>;
  colour: string;
  /** A stroke-dasharray, so that series differ by more than colour. */
  dash?: string;
  /** The text of each point's tooltip. */
  text?: Array<string>;
}

/** A legend of line swatches and names, wrapping onto a second row when it runs out of width. */
function legend(items: Array<{ label: string; colour: string; dash?: string; kind?: 'line' | 'bar' }>, x: number, y: number, width: number): { svg: string; rows: number } {
  let cx = x;
  let cy = y;
  let rows = 1;
  const svg = items
    .map((it) => {
      const w = 30 + it.label.length * 6.3;
      if (cx > x && cx + w > x + width) {
        cx = x;
        cy += 18;
        rows += 1;
      }
      const sw =
        it.kind === 'bar'
          ? `<rect x="${cx}" y="${cy - 9}" width="14" height="10" rx="2" fill="${it.colour}"/>`
          : `<line x1="${cx}" y1="${cy - 4}" x2="${cx + 18}" y2="${cy - 4}" stroke="${it.colour}" stroke-width="2.5"${it.dash ? ` stroke-dasharray="${it.dash}"` : ''}/>`;
      const out = `${sw}<text x="${cx + 23}" y="${cy}" class="ch-note" fill="${INK}">${esc(it.label)}</text>`;
      cx += w;
      return out;
    })
    .join('');
  return { svg, rows };
}

/** Lines over a few years or rates, sharing one vertical scale that includes zero. */
export function linesSvg(o: {
  id: string;
  title: string;
  desc: string;
  x: string[];
  series: Series[];
  tick: (v: number) => string;
  axis?: string;
  /** Shade below zero, for a balance that turns into an overdraft. */
  belowZero?: string;
  width?: number;
  height?: number;
}): string {
  const W = o.width ?? 640;
  const L = 74;
  const R = 24;
  const lg = legend(
    o.series.map((s) => ({ label: s.label, colour: s.colour, dash: s.dash })),
    L,
    20,
    W - L - R,
  );
  const T = 30 + lg.rows * 18;
  const B = 40;
  const H = (o.height ?? 300) + (lg.rows - 1) * 18;
  const all = o.series.flatMap((s) => s.values).filter((v): v is number => v !== null && Number.isFinite(v));
  const sc = scale(Math.min(0, ...all), Math.max(0, ...all), 5);
  const y = (v: number) => T + ((sc.max - v) / (sc.max - sc.min)) * (H - T - B);
  const n = o.x.length;
  const band = (W - L - R) / Math.max(1, n);
  const cx = (i: number) => L + band * i + band / 2;
  const parts: string[] = [lg.svg];
  if (o.belowZero && sc.min < 0) parts.push(`<rect x="${L}" y="${r1(y(0))}" width="${W - L - R}" height="${r1(y(sc.min) - y(0))}" fill="${SIGNAL}" fill-opacity="0.06"/>`);
  for (let v = sc.min; v <= sc.max + 1e-9; v += sc.step) {
    parts.push(`<line x1="${L}" y1="${r1(y(v))}" x2="${W - R}" y2="${r1(y(v))}" stroke="${RULE}" stroke-width="1"/>`);
    parts.push(`<text x="${L - 8}" y="${r1(y(v)) + 4}" text-anchor="end" class="ch-tick">${esc(o.tick(v))}</text>`);
  }
  if (o.belowZero && sc.min < 0) parts.push(`<text x="${W - R - 4}" y="${r1(y(sc.min)) - 6}" text-anchor="end" class="ch-note" fill="${MUTED}">${esc(o.belowZero)}</text>`);
  parts.push(`<line x1="${L}" y1="${r1(y(0))}" x2="${W - R}" y2="${r1(y(0))}" stroke="${INK}" stroke-width="1.25"/>`);
  o.x.forEach((label, i) => parts.push(`<text x="${r1(cx(i))}" y="${H - B + 18}" text-anchor="middle" class="ch-tick">${esc(label)}</text>`));
  if (o.axis) parts.push(`<text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle" class="ch-axis">${esc(o.axis)}</text>`);
  for (const s of o.series) {
    let d = '';
    let pen = false;
    s.values.forEach((v, i) => {
      if (v === null || !Number.isFinite(v)) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${r1(cx(i))} ${r1(y(v))}`;
      pen = true;
    });
    if (d) parts.push(`<path d="${d}" fill="none" stroke="${s.colour}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''}/>`);
    s.values.forEach((v, i) => {
      if (v === null || !Number.isFinite(v)) return;
      parts.push(`<circle cx="${r1(cx(i))}" cy="${r1(y(v))}" r="4" fill="${s.colour}" stroke="#fff" stroke-width="1.5">${tip(s.text?.[i] ?? `${s.label}, ${o.x[i]}: ${o.tick(v)}`)}</circle>`);
    });
  }
  return frame(W, H, o.id, o.title, o.desc, parts.join(''));
}

/** Net present value against the discount rate, one line a project, with the chosen rate marked and each internal rate of return. */
export function npvProfilesSvg(o: {
  id: string;
  projects: Array<{ label: string; points: Array<{ rate: number; npv: number }>; irr: number[]; colour: string; dash?: string }>;
  rate: number;
  /** The discount rate as the page writes it, such as 8.625%. */
  rateLabel: string;
  currency: string;
}): string {
  const W = 640;
  const L = 78;
  const R = 24;
  const lg = legend(
    o.projects.map((p) => ({ label: p.label, colour: p.colour, dash: p.dash })),
    L,
    20,
    W - L - R,
  );
  const T = 30 + lg.rows * 18;
  const B = 46;
  const H = 320 + (lg.rows - 1) * 18;
  const all = o.projects.flatMap((p) => p.points.map((q) => q.npv));
  const sc = scale(Math.min(0, ...all), Math.max(0, ...all), 5);
  const xmax = Math.max(...o.projects.flatMap((p) => p.points.map((q) => q.rate)), 1);
  const x = (r: number) => L + (r / xmax) * (W - L - R);
  const y = (v: number) => T + ((sc.max - v) / (sc.max - sc.min)) * (H - T - B);
  const parts: string[] = [lg.svg];
  for (let v = sc.min; v <= sc.max + 1e-9; v += sc.step) {
    parts.push(`<line x1="${L}" y1="${r1(y(v))}" x2="${W - R}" y2="${r1(y(v))}" stroke="${RULE}" stroke-width="1"/>`);
    parts.push(`<text x="${L - 8}" y="${r1(y(v)) + 4}" text-anchor="end" class="ch-tick">${esc(shortMoney(v, o.currency))}</text>`);
  }
  const xstep = niceStep(xmax, 6);
  for (let r = 0; r <= xmax + 1e-9; r += xstep) parts.push(`<text x="${r1(x(r))}" y="${H - B + 18}" text-anchor="middle" class="ch-tick">${esc(`${fmtNumber(r, xstep < 1 ? 1 : 0)}%`)}</text>`);
  parts.push(`<line x1="${L}" y1="${r1(y(0))}" x2="${W - R}" y2="${r1(y(0))}" stroke="${INK}" stroke-width="1.25"/>`);
  if (o.rate >= 0 && o.rate <= xmax) {
    parts.push(`<line x1="${r1(x(o.rate))}" y1="${T - 4}" x2="${r1(x(o.rate))}" y2="${H - B}" stroke="${INK}" stroke-width="1.25" stroke-dasharray="5 4"/>`);
    const right = o.rate < xmax * 0.7;
    parts.push(`<text x="${r1(x(o.rate) + (right ? 6 : -6))}" y="${T + 10}" text-anchor="${right ? 'start' : 'end'}" class="ch-label" fill="${INK}">${esc(`Discount rate ${o.rateLabel}`)}</text>`);
  }
  for (const p of o.projects) {
    const d = p.points.map((q, i) => `${i ? 'L' : 'M'}${r1(x(q.rate))} ${r1(y(q.npv))}`).join('');
    parts.push(`<path d="${d}" fill="none" stroke="${p.colour}" stroke-width="2.5" stroke-linejoin="round"${p.dash ? ` stroke-dasharray="${p.dash}"` : ''}>${tip(p.label)}</path>`);
    for (const r of p.irr) {
      if (r < 0 || r > xmax) continue;
      parts.push(`<path d="M${r1(x(r))} ${r1(y(0) - 6)}L${r1(x(r) + 5)} ${r1(y(0))}L${r1(x(r))} ${r1(y(0) + 6)}L${r1(x(r) - 5)} ${r1(y(0))}Z" fill="${p.colour}" stroke="#fff" stroke-width="1">${tip(`${p.label}: internal rate of return ${fmtNumber(r, 2)}%`)}</path>`);
    }
    const at = p.points.reduce((best, q) => (Math.abs(q.rate - o.rate) < Math.abs(best.rate - o.rate) ? q : best), p.points[0] ?? { rate: 0, npv: 0 });
    parts.push(`<circle cx="${r1(x(at.rate))}" cy="${r1(y(at.npv))}" r="4.5" fill="${p.colour}" stroke="#fff" stroke-width="1.5">${tip(`${p.label}: NPV ${fmtMoney(at.npv, o.currency, 0)} at ${o.rateLabel}`)}</circle>`);
  }
  parts.push(`<text x="${(L + W - R) / 2}" y="${H - 8}" text-anchor="middle" class="ch-axis">Discount rate (diamonds: where NPV is zero, the internal rate of return)</text>`);
  const desc = `${o.projects
    .map((p) => {
      const at = p.points.reduce((best, q) => (Math.abs(q.rate - o.rate) < Math.abs(best.rate - o.rate) ? q : best), p.points[0] ?? { rate: 0, npv: 0 });
      return `${p.label}: NPV ${fmtMoney(at.npv, o.currency, 0)} at ${o.rateLabel}, ${p.irr.length === 0 ? 'no internal rate of return in the range shown' : `NPV is zero at ${p.irr.map((r) => `${fmtNumber(r, 2)}%`).join(' and ')}`}`;
    })
    .join('. ')}. NPV falls as the rate rises for a project whose cash comes after its cost.`;
  return frame(W, H, o.id, 'Net present value at each discount rate', desc, parts.join(''));
}

/** A tornado: each estimate moved down and up, its effect on NPV as a bar either side of the figure as entered, widest first. */
export function tornadoSvg(o: {
  id: string;
  title: string;
  base: number;
  baseText: string;
  items: Array<{ label: string; low: number; high: number; lowText: string; highText: string; lowNote: string; highNote: string }>;
  currency: string;
}): string {
  const W = 660;
  const rowH = 40;
  const L = 196;
  const R = 26;
  /** Room either side of the bars for the figures at their ends. */
  const PAD = 58;
  const T = 58;
  const B = 40;
  const H = T + o.items.length * rowH + B;
  const vals = o.items.flatMap((i) => [i.low, i.high]).concat(o.base);
  const sc = scale(Math.min(...vals), Math.max(...vals), 5);
  const x = (v: number) => L + PAD + ((v - sc.min) / (sc.max - sc.min)) * (W - L - R - 2 * PAD);
  const parts: string[] = [];
  for (let v = sc.min; v <= sc.max + 1e-9; v += sc.step) {
    parts.push(`<line x1="${r1(x(v))}" y1="${T - 10}" x2="${r1(x(v))}" y2="${H - B}" stroke="${RULE}" stroke-width="1"/>`);
    parts.push(`<text x="${r1(x(v))}" y="${H - B + 17}" text-anchor="middle" class="ch-tick">${esc(shortMoney(v, o.currency))}</text>`);
  }
  if (sc.min < 0) parts.push(`<line x1="${r1(x(0))}" y1="${T - 10}" x2="${r1(x(0))}" y2="${H - B}" stroke="${SIGNAL}" stroke-width="1.25" stroke-dasharray="4 3"/>`);
  parts.push(`<rect x="16" y="9" width="14" height="10" rx="2" fill="${SLATE}" fill-opacity="0.5"/><text x="36" y="18" class="ch-note" fill="${INK}">The estimate lower</text>`);
  parts.push(`<rect x="160" y="9" width="14" height="10" rx="2" fill="${COBALT}" fill-opacity="0.85"/><text x="180" y="18" class="ch-note" fill="${INK}">The estimate higher</text>`);
  o.items.forEach((it, k) => {
    const yy = T + k * rowH;
    parts.push(`<text x="${L - 12}" y="${yy + 17}" text-anchor="end" class="ch-label" fill="${INK}">${esc(it.label)}</text>`);
    const bar = (v: number, colour: string, opacity: number, text: string) => {
      const a = Math.min(x(o.base), x(v));
      const w = Math.abs(x(v) - x(o.base));
      return w < 0.5 ? '' : `<rect x="${r1(a)}" y="${yy + 4}" width="${r1(w)}" height="20" rx="2" fill="${colour}" fill-opacity="${opacity}">${tip(text)}</rect>`;
    };
    parts.push(bar(it.low, SLATE, 0.5, `${it.label}, ${it.lowNote}: NPV ${it.lowText}`));
    parts.push(bar(it.high, COBALT, 0.85, `${it.label}, ${it.highNote}: NPV ${it.highText}`));
    const lo = Math.min(it.low, it.high, o.base);
    const hi = Math.max(it.low, it.high, o.base);
    parts.push(`<text x="${r1(x(lo) - 6)}" y="${yy + 18}" text-anchor="end" class="ch-note" fill="${INK}">${esc(shortMoney(Math.min(it.low, it.high), o.currency))}</text>`);
    parts.push(`<text x="${r1(x(hi) + 6)}" y="${yy + 18}" class="ch-note" fill="${INK}">${esc(shortMoney(Math.max(it.low, it.high), o.currency))}</text>`);
  });
  parts.push(`<line x1="${r1(x(o.base))}" y1="${T - 10}" x2="${r1(x(o.base))}" y2="${H - B}" stroke="${INK}" stroke-width="2"/>`);
  parts.push(`<text x="${r1(x(o.base))}" y="${T - 16}" text-anchor="middle" class="ch-label" fill="${INK}">${esc(`As entered ${o.baseText}`)}</text>`);
  parts.push(`<text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle" class="ch-axis">Net present value</text>`);
  const desc = `NPV as entered ${o.baseText}. ${o.items.map((it) => `${it.label}: ${it.lowNote} ${it.lowText}, ${it.highNote} ${it.highText}`).join('; ')}. The widest bar is the estimate that matters most.`;
  return frame(W, H, o.id, o.title, desc, parts.join(''));
}

/** Profit against volume for two cost structures: where each breaks even, where they cross, and the forecast. */
export function profitVolumeSvg(o: {
  id: string;
  a: { name: string; fixed: number; contribution: number; breakEven: number | null };
  b: { name: string; fixed: number; contribution: number; breakEven: number | null };
  forecast: number;
  capacity: number;
  indifference: number | null;
  currency: string;
  units: string;
}): string {
  const W = 660;
  const L = 82;
  const R = 26;
  const lg = legend(
    [
      { label: o.a.name, colour: INK },
      { label: o.b.name, colour: COBALT, dash: '7 5' },
    ],
    L,
    20,
    W - L - R,
  );
  const T = 34 + lg.rows * 18;
  const B = 48;
  const H = 340 + (lg.rows - 1) * 18;
  const qmax = Math.max(o.capacity, o.forecast, o.indifference !== null && o.indifference > 0 && o.indifference < o.capacity * 2 ? o.indifference * 1.1 : 0, 1);
  const xs = niceStep(qmax, 6);
  const xmax = Math.ceil(qmax / xs - 1e-9) * xs;
  const profit = (s: { fixed: number; contribution: number }, q: number) => s.contribution * q - s.fixed;
  const ends = [profit(o.a, 0), profit(o.b, 0), profit(o.a, xmax), profit(o.b, xmax)];
  const sc = scale(Math.min(...ends), Math.max(...ends), 6);
  const x = (q: number) => L + (q / xmax) * (W - L - R);
  const y = (v: number) => T + ((sc.max - v) / (sc.max - sc.min)) * (H - T - B);
  const parts: string[] = [lg.svg];
  for (let v = sc.min; v <= sc.max + 1e-9; v += sc.step) {
    parts.push(`<line x1="${L}" y1="${r1(y(v))}" x2="${W - R}" y2="${r1(y(v))}" stroke="${RULE}" stroke-width="1"/>`);
    parts.push(`<text x="${L - 8}" y="${r1(y(v)) + 4}" text-anchor="end" class="ch-tick">${esc(shortMoney(v, o.currency))}</text>`);
  }
  for (let q = 0; q <= xmax + 1e-9; q += xs) parts.push(`<text x="${r1(x(q))}" y="${H - B + 18}" text-anchor="middle" class="ch-tick">${esc(fmtNumber(q))}</text>`);
  parts.push(`<rect x="${L}" y="${r1(y(0))}" width="${W - L - R}" height="${r1(y(sc.min) - y(0))}" fill="${SIGNAL}" fill-opacity="0.05"/>`);
  parts.push(`<text x="${W - R - 4}" y="${r1(y(sc.min)) - 6}" text-anchor="end" class="ch-note" fill="${MUTED}">Below the line: a loss</text>`);
  parts.push(`<line x1="${L}" y1="${r1(y(0))}" x2="${W - R}" y2="${r1(y(0))}" stroke="${INK}" stroke-width="1.25"/>`);
  if (o.capacity < xmax) {
    parts.push(`<rect x="${r1(x(o.capacity))}" y="${T}" width="${r1(x(xmax) - x(o.capacity))}" height="${H - T - B}" fill="${SLATE}" fill-opacity="0.08"/>`);
    parts.push(`<text x="${r1(x(o.capacity) + 4)}" y="${T + 12}" class="ch-note" fill="${MUTED}">Above capacity</text>`);
  }
  parts.push(`<line x1="${r1(x(o.forecast))}" y1="${T}" x2="${r1(x(o.forecast))}" y2="${H - B}" stroke="${SLATE}" stroke-width="1.5" stroke-dasharray="3 3"/>`);
  parts.push(`<text x="${r1(x(o.forecast) - 4)}" y="${T + 12}" text-anchor="end" class="ch-note" fill="${INK}">${esc(`Forecast ${fmtNumber(o.forecast)}`)}</text>`);
  const line = (s: typeof o.a, colour: string, dash?: string) =>
    `<path d="M${r1(x(0))} ${r1(y(profit(s, 0)))}L${r1(x(xmax))} ${r1(y(profit(s, xmax)))}" fill="none" stroke="${colour}" stroke-width="2.5"${dash ? ` stroke-dasharray="${dash}"` : ''}>${tip(`${s.name}: profit = ${fmtMoney(s.contribution, o.currency, 2)} × volume − ${fmtMoney(s.fixed, o.currency, 0)}`)}</path>`;
  parts.push(line(o.a, INK));
  parts.push(line(o.b, COBALT, '7 5'));
  const mark = (s: typeof o.a, colour: string) => {
    if (s.breakEven === null || s.breakEven > xmax) return;
    const be = s.fixed / s.contribution;
    parts.push(`<circle cx="${r1(x(be))}" cy="${r1(y(0))}" r="5" fill="#fff" stroke="${colour}" stroke-width="2.5">${tip(`${s.name} breaks even at ${fmtNumber(s.breakEven)} ${o.units}`)}</circle>`);
  };
  mark(o.a, INK);
  mark(o.b, COBALT);
  if (o.indifference !== null && o.indifference > 0 && o.indifference <= xmax) {
    const qi = o.indifference;
    const pi = profit(o.a, qi);
    parts.push(`<path d="M${r1(x(qi))} ${r1(y(pi) - 7)}L${r1(x(qi) + 6)} ${r1(y(pi))}L${r1(x(qi))} ${r1(y(pi) + 7)}L${r1(x(qi) - 6)} ${r1(y(pi))}Z" fill="${INK}" stroke="#fff" stroke-width="1">${tip(`The two earn the same at ${fmtNumber(qi, 1)} ${o.units}: ${fmtMoney(pi, o.currency, 0)}`)}</path>`);
    const right = x(qi) < W - R - 150;
    parts.push(`<text x="${r1(x(qi) + (right ? 10 : -10))}" y="${r1(y(pi) - 10)}" text-anchor="${right ? 'start' : 'end'}" class="ch-label" fill="${INK}">${esc(`Indifference ${fmtNumber(qi, 1)}`)}</text>`);
  }
  parts.push(`<text x="${(L + W - R) / 2}" y="${H - 8}" text-anchor="middle" class="ch-axis">${esc(`Volume (${o.units}); open circles: break-even`)}</text>`);
  const words = (s: typeof o.a) => `${s.name} ${s.breakEven === null ? 'never breaks even' : `breaks even at ${fmtNumber(s.breakEven)} ${o.units}`}`;
  const desc = `${words(o.a)}; ${words(o.b)}. ${o.indifference !== null && o.indifference > 0 ? `The two earn the same profit at ${fmtNumber(o.indifference, 1)} ${o.units}.` : 'The two lines do not cross at a positive volume.'} Forecast ${fmtNumber(o.forecast)} ${o.units}; capacity ${fmtNumber(o.capacity)}.`;
  return frame(W, H, o.id, 'Profit at each volume, for the two cost structures', desc, parts.join(''));
}

/** Several small line charts side by side, one measure each, over the same years. */
export function smallMultiplesSvg(o: { id: string; title: string; desc: string; x: string[]; panels: Array<{ title: string; values: Array<number | null>; text: (v: number) => string; colour?: string }>; columns?: number }): string {
  const cols = o.columns ?? 2;
  const PW = 300;
  const PH = 170;
  const GAP = 24;
  const W = cols * PW + (cols - 1) * GAP;
  const rows = Math.ceil(o.panels.length / cols);
  const H = rows * PH + (rows - 1) * GAP;
  const parts: string[] = [];
  o.panels.forEach((p, k) => {
    const ox = (k % cols) * (PW + GAP);
    const oy = Math.floor(k / cols) * (PH + GAP);
    const vals = p.values.filter((v): v is number => v !== null && Number.isFinite(v));
    const lo = vals.length ? Math.min(...vals) : 0;
    const hi = vals.length ? Math.max(...vals) : 1;
    const sc = scale(Math.min(0, lo), Math.max(hi, 0), 3);
    const L = ox + 46;
    const R = ox + PW - 10;
    const T = oy + 40;
    const B = oy + PH - 26;
    const y = (v: number) => T + ((sc.max - v) / (sc.max - sc.min)) * (B - T);
    const band = (R - L) / Math.max(1, o.x.length);
    const cx = (i: number) => L + band * i + band / 2;
    const colour = p.colour ?? COBALT;
    parts.push(`<text x="${ox}" y="${oy + 16}" class="ch-label" fill="${INK}">${esc(p.title)}</text>`);
    for (let v = sc.min; v <= sc.max + 1e-9; v += sc.step) {
      parts.push(`<line x1="${L}" y1="${r1(y(v))}" x2="${R}" y2="${r1(y(v))}" stroke="${RULE}" stroke-width="1"/>`);
      parts.push(`<text x="${L - 6}" y="${r1(y(v)) + 4}" text-anchor="end" class="ch-tick">${esc(p.text(v))}</text>`);
    }
    parts.push(`<line x1="${L}" y1="${r1(y(0))}" x2="${R}" y2="${r1(y(0))}" stroke="${INK}" stroke-width="1"/>`);
    o.x.forEach((lab, i) => parts.push(`<text x="${r1(cx(i))}" y="${B + 16}" text-anchor="middle" class="ch-tick">${esc(lab)}</text>`));
    let d = '';
    let pen = false;
    p.values.forEach((v, i) => {
      if (v === null || !Number.isFinite(v)) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${r1(cx(i))} ${r1(y(v))}`;
      pen = true;
    });
    if (d) parts.push(`<path d="${d}" fill="none" stroke="${colour}" stroke-width="2.25" stroke-linejoin="round"/>`);
    p.values.forEach((v, i) => {
      if (v === null || !Number.isFinite(v)) return;
      parts.push(`<circle cx="${r1(cx(i))}" cy="${r1(y(v))}" r="3.5" fill="${colour}" stroke="#fff" stroke-width="1.5">${tip(`${p.title}, ${o.x[i]}: ${p.text(v)}`)}</circle>`);
    });
    const lastIdx = p.values.length - 1;
    const last = p.values[lastIdx];
    if (last !== null && last !== undefined && Number.isFinite(last)) parts.push(`<text x="${R}" y="${oy + 16}" text-anchor="end" class="ch-label" fill="${INK}">${esc(`${o.x[lastIdx]}: ${p.text(last)}`)}</text>`);
  });
  return frame(W, H, o.id, o.title, o.desc, parts.join(''));
}

/** The cash conversion cycle each year: days in stock and with debtors above the line, days of supplier credit below, the cycle marked. */
export function cycleSvg(o: { id: string; x: string[]; stock: Array<number | null>; debtors: Array<number | null>; creditors: Array<number | null>; cycle: Array<number | null> }): string {
  const W = 640;
  const L = 60;
  const R = 24;
  const lg = legend(
    [
      { label: 'Stock days', colour: SLATE, kind: 'bar' },
      { label: 'Debtor days', colour: COBALT, kind: 'bar' },
      { label: 'Creditor days (below)', colour: INK, kind: 'bar' },
      { label: 'The cycle', colour: INK, dash: '0' },
    ],
    L,
    20,
    W - L - R,
  );
  const T = 30 + lg.rows * 18;
  const B = 40;
  const H = 320 + (lg.rows - 1) * 18;
  const tops = o.x.map((_, i) => (o.stock[i] ?? 0) + (o.debtors[i] ?? 0));
  const lows = o.creditors.map((c) => -(c ?? 0));
  const sc = scale(Math.min(0, ...lows, ...o.cycle.map((c) => c ?? 0)), Math.max(0, ...tops), 6);
  const y = (v: number) => T + ((sc.max - v) / (sc.max - sc.min)) * (H - T - B);
  const band = (W - L - R) / Math.max(1, o.x.length);
  const bw = Math.min(46, band * 0.46);
  const cx = (i: number) => L + band * i + band / 2;
  const parts: string[] = [lg.svg];
  for (let v = sc.min; v <= sc.max + 1e-9; v += sc.step) {
    parts.push(`<line x1="${L}" y1="${r1(y(v))}" x2="${W - R}" y2="${r1(y(v))}" stroke="${RULE}" stroke-width="1"/>`);
    // Below the line the days are the suppliers', so they are written without a minus sign.
    parts.push(`<text x="${L - 8}" y="${r1(y(v)) + 4}" text-anchor="end" class="ch-tick">${esc(fmtNumber(Math.abs(v)))}</text>`);
  }
  o.x.forEach((lab, i) => {
    const s = o.stock[i] ?? 0;
    const dd = o.debtors[i] ?? 0;
    const c = o.creditors[i] ?? 0;
    const left = cx(i) - bw / 2;
    if (s > 0) parts.push(`<rect x="${r1(left)}" y="${r1(y(s))}" width="${r1(bw)}" height="${r1(y(0) - y(s))}" fill="${SLATE}" fill-opacity="0.55">${tip(`${lab}: stock days ${fmtNumber(s, 1)}`)}</rect>`);
    if (dd > 0) parts.push(`<rect x="${r1(left)}" y="${r1(y(s + dd))}" width="${r1(bw)}" height="${r1(y(s) - y(s + dd))}" fill="${COBALT}" fill-opacity="0.85">${tip(`${lab}: debtor days ${fmtNumber(dd, 1)}`)}</rect>`);
    if (c > 0) parts.push(`<rect x="${r1(left)}" y="${r1(y(0))}" width="${r1(bw)}" height="${r1(y(-c) - y(0))}" fill="${INK}" fill-opacity="0.8">${tip(`${lab}: creditor days ${fmtNumber(c, 1)}`)}</rect>`);
    const cy = o.cycle[i];
    if (cy !== null && cy !== undefined) {
      parts.push(`<line x1="${r1(left - 6)}" y1="${r1(y(cy))}" x2="${r1(left + bw + 6)}" y2="${r1(y(cy))}" stroke="${INK}" stroke-width="3">${tip(`${lab}: cash conversion cycle ${fmtNumber(cy, 1)} days`)}</line>`);
      parts.push(`<text x="${r1(left + bw + 9)}" y="${r1(y(cy)) + 4}" class="ch-note" fill="${INK}">${esc(fmtNumber(cy, 1))}</text>`);
    }
    parts.push(`<text x="${r1(cx(i))}" y="${H - B + 18}" text-anchor="middle" class="ch-tick">${esc(lab)}</text>`);
  });
  parts.push(`<line x1="${L}" y1="${r1(y(0))}" x2="${W - R}" y2="${r1(y(0))}" stroke="${INK}" stroke-width="1.25"/>`);
  parts.push(`<text x="14" y="${(T + H - B) / 2}" text-anchor="middle" class="ch-axis" transform="rotate(-90 14 ${(T + H - B) / 2})">Days</text>`);
  const desc = `${o.x.map((lab, i) => `${lab}: stock ${fmtNumber(o.stock[i] ?? 0, 1)} days, debtors ${fmtNumber(o.debtors[i] ?? 0, 1)}, creditors ${fmtNumber(o.creditors[i] ?? 0, 1)}, a cycle of ${o.cycle[i] === null || o.cycle[i] === undefined ? 'n/a' : fmtNumber(o.cycle[i] as number, 1)} days`).join('; ')}.`;
  return frame(W, H, o.id, 'The cash conversion cycle, year by year', desc, parts.join(''));
}
