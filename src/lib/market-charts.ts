/**
 * SVG charts for the Market Studio instruments, built as strings so the same
 * function draws the worked example on the server and every change in the
 * browser. Like every chart on the platform, each has a title and a
 * description that states the result, and each instrument also gives the
 * figures as a table. Series differ by line style and label as well as by
 * colour, so no reading depends on colour alone.
 */
import { niceCeil, niceStep } from './charts';
import { fmtNumber } from './format';
import { esc } from './markup';

export const C = {
  ink: '#0B1A33',
  body: '#252D3A',
  muted: '#566173',
  rule: '#E3DAC8',
  ruleStrong: '#CDC2AB',
  cobalt: '#2F55E4',
  cobaltText: '#2448D0',
  gold: '#B39350',
  goldText: '#76591F',
  green: '#2F6F5E',
  greenText: '#2B6A59',
  signal: '#A8463F',
  signalText: '#9E3F38',
  wash: '#F6F1E7',
  washGold: '#F3EAD6',
  washCobalt: '#E8EDFD',
};

const r1 = (n: number) => Math.round(n * 10) / 10;

export function svgFrame(w: number, h: number, id: string, title: string, desc: string, body: string, cls = 'chart'): string {
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${esc(id)}-t ${esc(id)}-d" class="${cls}" focusable="false"><title id="${esc(id)}-t">${esc(title)}</title><desc id="${esc(id)}-d">${esc(desc)}</desc>${body}</svg>`;
}

/* ---------- Horizontal bars ---------- */

export interface HBar {
  label: string;
  value: number;
  /** Text shown at the end of the bar. */
  valueText: string;
  /** Drawn solid and marked in words; others are outlined. */
  emphasis?: boolean;
  tag?: string;
}

export function hbarSvg(o: { id: string; title: string; desc: string; rows: HBar[]; max: number; axisLabel?: string; tickSuffix?: string }): string {
  const W = 620;
  const rowH = 40;
  const T = 14;
  const L = 196;
  const R = 92;
  const H = T + Math.max(1, o.rows.length) * rowH + 34;
  const max = o.max > 0 ? o.max : 1;
  const x = (v: number) => L + (Math.max(0, v) / max) * (W - L - R);
  const p: string[] = [];
  const step = niceStep(max, 4);
  for (let v = 0; v <= max + 1e-9; v += step) {
    p.push(`<line x1="${r1(x(v))}" y1="${T - 4}" x2="${r1(x(v))}" y2="${H - 30}" stroke="${C.rule}"/>`);
    p.push(`<text x="${r1(x(v))}" y="${H - 14}" text-anchor="middle" class="ch-tick">${esc(fmtNumber(v, step < 1 ? 1 : 0))}${esc(o.tickSuffix ?? '')}</text>`);
  }
  o.rows.forEach((b, i) => {
    const y = T + i * rowH;
    const label = b.label.length > 28 ? `${b.label.slice(0, 27)}…` : b.label;
    p.push(`<text x="${L - 10}" y="${y + 17}" text-anchor="end" class="ch-label" fill="${C.ink}">${esc(label)}</text>`);
    if (b.tag) p.push(`<text x="${L - 10}" y="${y + 31}" text-anchor="end" class="ch-note" fill="${b.emphasis ? C.cobaltText : C.muted}">${esc(b.tag)}</text>`);
    const w = Math.max(1, x(b.value) - L);
    p.push(b.emphasis ? `<rect x="${L}" y="${y + 6}" width="${r1(w)}" height="18" fill="${C.ink}"/>` : `<rect x="${L}" y="${y + 6}" width="${r1(w)}" height="18" fill="#fff" stroke="${C.ink}" stroke-width="1.5"/>`);
    p.push(`<text x="${r1(L + w + 6)}" y="${y + 20}" class="ch-label" fill="${C.ink}">${esc(b.valueText)}</text>`);
  });
  p.push(`<line x1="${L}" y1="${T - 4}" x2="${L}" y2="${H - 30}" stroke="${C.ink}" stroke-width="1.25"/>`);
  if (o.axisLabel) p.push(`<text x="${(L + W - R) / 2}" y="${H - 1}" text-anchor="middle" class="ch-note" fill="${C.muted}">${esc(o.axisLabel)}</text>`);
  return svgFrame(W, H, o.id, o.title, o.desc, p.join(''));
}

/* ---------- Lines over periods, with optional bands ---------- */

export interface LineSeries {
  label: string;
  values: Array<number | null>;
  color: string;
  dash?: string;
  width?: number;
  /** Mark each point with a small square. */
  dots?: boolean;
}

export interface Band {
  from: number;
  to: number;
  label: string;
}

export function lineSvg(o: {
  id: string;
  title: string;
  desc: string;
  /** Labels for the x positions (years, weeks, spend levels). */
  xLabels: string[];
  series: LineSeries[];
  bands?: Band[];
  yLabel: string;
  xLabel: string;
  yFormat?: (v: number) => string;
  /** Vertical markers at x indexes, such as a payback year or a current spend. */
  markers?: Array<{ at: number; label: string; color?: string }>;
  height?: number;
}): string {
  const W = 660;
  const H = o.height ?? 340;
  const L = 74;
  const R = 128;
  const T = o.bands?.length ? 48 : 20;
  const B = 48;
  const n = o.xLabels.length;
  const all = o.series.flatMap((s) => s.values.filter((v): v is number => v !== null && Number.isFinite(v)));
  const lo = Math.min(0, ...all);
  const hi = Math.max(0, ...all);
  const span = hi - lo || 1;
  const step = niceStep(span, 5);
  const yMin = Math.floor(lo / step) * step;
  const yMax = Math.max(niceCeil(hi, 5), Math.ceil(hi / step) * step, yMin + step);
  const x = (i: number) => (n <= 1 ? L + (W - L - R) / 2 : L + (i / (n - 1)) * (W - L - R));
  const y = (v: number) => T + ((yMax - v) / (yMax - yMin)) * (H - T - B);
  const fmt = o.yFormat ?? ((v: number) => fmtNumber(v));
  const p: string[] = [];
  // Bands (stages), alternately tinted, labelled along the top. A label too wide for its band moves up a row, and
  // two narrow bands side by side take alternate rows, so labels never overlap.
  let lastRow = 0;
  (o.bands ?? []).forEach((b, k) => {
    const x0 = b.from <= 0 ? L : (x(b.from - 1) + x(b.from)) / 2;
    const x1 = b.to >= n - 1 ? W - R : (x(b.to) + x(b.to + 1)) / 2;
    if (k % 2 === 0) p.push(`<rect x="${r1(x0)}" y="${T}" width="${r1(x1 - x0)}" height="${H - T - B}" fill="${C.wash}"/>`);
    const narrow = b.label.length * 7.5 + 6 > x1 - x0;
    const row = narrow && lastRow === 0 ? 1 : 0;
    lastRow = narrow ? row : 0;
    const ty = row ? T - 24 : T - 8;
    p.push(`<line x1="${r1(x0)}" y1="${row ? T - 36 : T - 20}" x2="${r1(x0)}" y2="${H - B}" stroke="${C.ruleStrong}" stroke-dasharray="2 3"/>`);
    p.push(`<text x="${r1((x0 + x1) / 2)}" y="${ty}" text-anchor="middle" class="ch-region" fill="${C.muted}">${esc(b.label)}</text>`);
  });
  for (let v = yMin; v <= yMax + 1e-9; v += step) {
    const yy = y(v);
    p.push(`<line x1="${L}" y1="${r1(yy)}" x2="${W - R}" y2="${r1(yy)}" stroke="${Math.abs(v) < 1e-9 ? C.ink : C.rule}"${Math.abs(v) < 1e-9 ? ' stroke-width="1.25"' : ''}/>`);
    p.push(`<text x="${L - 8}" y="${r1(yy) + 4}" text-anchor="end" class="ch-tick">${esc(fmt(v))}</text>`);
  }
  const every = n > 14 ? Math.ceil(n / 13) : 1;
  o.xLabels.forEach((lab, i) => {
    if (i % every !== 0 && i !== n - 1) return;
    p.push(`<text x="${r1(x(i))}" y="${H - B + 18}" text-anchor="middle" class="ch-tick">${esc(lab)}</text>`);
  });
  p.push(`<line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}" stroke="${C.ink}" stroke-width="1.25"/>`);
  p.push(`<text x="${(L + W - R) / 2}" y="${H - 8}" text-anchor="middle" class="ch-axis">${esc(o.xLabel)}</text>`);
  p.push(`<text x="16" y="${(T + H - B) / 2}" text-anchor="middle" class="ch-axis" transform="rotate(-90 16 ${(T + H - B) / 2})">${esc(o.yLabel)}</text>`);
  (o.markers ?? []).forEach((m) => {
    if (m.at < 0 || m.at > n - 1) return;
    const xx = x(m.at);
    p.push(`<line x1="${r1(xx)}" y1="${T}" x2="${r1(xx)}" y2="${H - B}" stroke="${m.color ?? C.gold}" stroke-width="1.5" stroke-dasharray="5 4"/>`);
    p.push(`<text x="${r1(xx + 5)}" y="${T + 14}" class="ch-note" fill="${m.color === C.cobalt ? C.cobaltText : C.goldText}">${esc(m.label)}</text>`);
  });
  // Series, then their labels at the right-hand end, nudged apart so they never overlap.
  const ends: Array<{ y: number; label: string; color: string }> = [];
  for (const s of o.series) {
    const pts = s.values.map((v, i) => (v === null || !Number.isFinite(v) ? null : [x(i), y(v)] as [number, number]));
    let d = '';
    pts.forEach((pt, i) => {
      if (!pt) return;
      d += `${d && pts[i - 1] ? 'L' : 'M'}${r1(pt[0])} ${r1(pt[1])}`;
    });
    if (d) p.push(`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width ?? 2.4}"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''} stroke-linejoin="round" stroke-linecap="round"/>`);
    if (s.dots) pts.forEach((pt) => pt && p.push(`<rect x="${r1(pt[0] - 2.5)}" y="${r1(pt[1] - 2.5)}" width="5" height="5" fill="${s.color}"/>`));
    const last = [...pts].reverse().find(Boolean);
    if (last) ends.push({ y: last[1], label: s.label, color: s.color });
  }
  ends.sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i += 1) {
    const prev = ends[i - 1];
    const cur = ends[i];
    if (prev && cur && cur.y - prev.y < 15) cur.y = prev.y + 15;
  }
  ends.forEach((e) => p.push(`<text x="${W - R + 8}" y="${r1(e.y + 4)}" class="ch-label" fill="${textColour(e.color)}">${esc(e.label)}</text>`));
  return svgFrame(W, H, o.id, o.title, o.desc, p.join(''));
}

/** The darker companion of a hue for text, so labels pass contrast. */
export function textColour(c: string): string {
  return c === C.cobalt ? C.cobaltText : c === C.gold ? C.goldText : c === C.green ? C.greenText : c === C.signal ? C.signalText : c;
}

/* ---------- Gantt chart ---------- */

export interface GanttRow {
  label: string;
  start: number;
  end: number;
  /** 'channel' rows are drawn solid; 'task' rows hatched; each also says its kind in the description. */
  kind: 'channel' | 'task';
  note?: string;
}

export function ganttSvg(o: { id: string; title: string; desc: string; weeks: number; rows: GanttRow[]; reviews?: number[]; deadlineLabel?: string }): string {
  const W = 700;
  const rowH = 26;
  const L = 268;
  const R = 18;
  const T = 40;
  const H = T + Math.max(1, o.rows.length) * rowH + 30;
  const wk = Math.max(1, o.weeks);
  const x = (w: number) => L + ((w - 1) / wk) * (W - L - R);
  const p: string[] = [];
  p.push(`<defs><pattern id="${esc(o.id)}-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#fff"/><line x1="0" y1="0" x2="0" y2="6" stroke="${C.ink}" stroke-width="2.2"/></pattern></defs>`);
  const step = wk > 30 ? 5 : wk > 12 ? 2 : 1;
  for (let w = 1; w <= wk; w += 1) {
    const xx = x(w);
    if ((w - 1) % step === 0) {
      p.push(`<line x1="${r1(xx)}" y1="${T - 6}" x2="${r1(xx)}" y2="${H - 26}" stroke="${C.rule}"/>`);
      p.push(`<text x="${r1(xx + ((W - L - R) / wk) / 2)}" y="${T - 12}" text-anchor="middle" class="ch-tick">${w}</text>`);
    }
  }
  p.push(`<text x="${L}" y="14" class="ch-note" fill="${C.muted}">Week</text>`);
  (o.reviews ?? []).forEach((w) => {
    if (w < 1 || w > wk) return;
    const xx = x(w + 1) - 1;
    p.push(`<line x1="${r1(xx)}" y1="${T - 4}" x2="${r1(xx)}" y2="${H - 26}" stroke="${C.gold}" stroke-width="1.25" stroke-dasharray="3 3"/>`);
  });
  o.rows.forEach((r, i) => {
    const y = T + i * rowH;
    const label = r.label.length > 40 ? `${r.label.slice(0, 39)}…` : r.label;
    p.push(`<text x="${L - 10}" y="${y + 16}" text-anchor="end" class="ch-label" fill="${C.ink}">${esc(label)}</text>`);
    const s = Math.max(1, Math.min(wk, r.start));
    const e = Math.max(s, Math.min(wk, r.end));
    const x0 = x(s);
    const x1 = x(e + 1);
    p.push(r.kind === 'channel' ? `<rect x="${r1(x0)}" y="${y + 5}" width="${r1(Math.max(3, x1 - x0 - 1))}" height="15" fill="${C.cobalt}"/>` : `<rect x="${r1(x0)}" y="${y + 5}" width="${r1(Math.max(3, x1 - x0 - 1))}" height="15" fill="url(#${esc(o.id)}-hatch)" stroke="${C.ink}" stroke-width="1"/>`);
  });
  const dl = x(wk + 1) - 1;
  p.push(`<line x1="${r1(dl)}" y1="${T - 6}" x2="${r1(dl)}" y2="${H - 22}" stroke="${C.signal}" stroke-width="2"/>`);
  p.push(`<text x="${r1(dl - 4)}" y="${H - 8}" text-anchor="end" class="ch-note" fill="${C.signalText}">${esc(o.deadlineLabel ?? `Deadline: end of week ${wk}`)}</text>`);
  p.push(`<line x1="${L}" y1="${T - 6}" x2="${L}" y2="${H - 26}" stroke="${C.ink}" stroke-width="1.25"/>`);
  return svgFrame(W, H, o.id, o.title, o.desc, p.join(''));
}

/* ---------- Funnel ---------- */

export interface FunnelStage {
  label: string;
  value: number;
  note?: string;
}

export function funnelSvg(o: { id: string; title: string; desc: string; stages: FunnelStage[]; compact?: boolean }): string {
  // Each stage: its name and note above, the bar centred below it, the number at the bar's right. Widths are to scale
  // (linear), with a minimum so a small stage is still visible.
  const W = o.compact ? 320 : 620;
  const rowH = o.compact ? 48 : 58;
  const T = 4;
  const H = T + o.stages.length * rowH + 2;
  const top = Math.max(1, ...o.stages.map((s) => s.value));
  const LW = o.compact ? 0 : 200;
  const valW = o.compact ? 46 : 64;
  const maxW = W - LW - valW - 8;
  const cx = LW + maxW / 2;
  const shades = [C.ink, '#1E355F', '#2C4675', C.cobalt];
  const p: string[] = [];
  o.stages.forEach((s, i) => {
    const w = Math.max(6, (Math.max(0, s.value) / top) * maxW);
    const y = T + i * rowH;
    const barY = o.compact ? y + 22 : y + 12;
    const barH = o.compact ? 16 : 24;
    p.push(`<rect x="${r1(cx - w / 2)}" y="${barY}" width="${r1(w)}" height="${barH}" fill="${shades[Math.min(3, i)] ?? C.ink}"/>`);
    if (o.compact) {
      p.push(`<text x="0" y="${y + 15}" class="ch-label" fill="${C.ink}">${esc(s.label)}${s.note ? `<tspan class="ch-note" fill="${C.muted}" font-weight="400"> · ${esc(s.note)}</tspan>` : ''}</text>`);
    } else {
      p.push(`<text x="0" y="${y + 22}" class="ch-label" fill="${C.ink}">${esc(s.label)}</text>`);
      if (s.note) p.push(`<text x="0" y="${y + 38}" class="ch-note" fill="${C.muted}">${esc(s.note)}</text>`);
    }
    p.push(`<text x="${r1(cx + w / 2 + 8)}" y="${barY + barH / 2 + 4}" class="ch-label" fill="${C.ink}">${esc(fmtNumber(s.value, Number.isInteger(s.value) ? 0 : 1))}</text>`);
  });
  return svgFrame(W, H, o.id, o.title, o.desc, p.join(''), o.compact ? 'chart chart--compact' : 'chart');
}

/* ---------- Response curves (diminishing returns) ---------- */

export interface ResponseCurve {
  label: string;
  /** y for a given x, such as customers won for a spend. */
  f: (x: number) => number;
  /** The current x, marked on the curve. */
  at: number;
  color: string;
  dash?: string;
}

export function responseSvg(o: { id: string; title: string; desc: string; curves: ResponseCurve[]; xMax: number; xLabel: string; yLabel: string; xFormat: (v: number) => string }): string {
  const W = 700;
  const H = 360;
  const L = 64;
  const R = 196;
  const T = 18;
  const B = 50;
  const xMax = o.xMax > 0 ? niceCeil(o.xMax, 5) : 1;
  const samples = 60;
  const ys = o.curves.flatMap((c) => Array.from({ length: samples + 1 }, (_, i) => c.f((xMax * i) / samples)));
  const yMax = niceCeil(Math.max(1, ...ys), 5);
  const x = (v: number) => L + (v / xMax) * (W - L - R);
  const y = (v: number) => T + (1 - v / yMax) * (H - T - B);
  const p: string[] = [];
  const xs = niceStep(xMax, 5);
  const yst = niceStep(yMax, 5);
  for (let v = 0; v <= yMax + 1e-9; v += yst) {
    p.push(`<line x1="${L}" y1="${r1(y(v))}" x2="${W - R}" y2="${r1(y(v))}" stroke="${v === 0 ? C.ink : C.rule}"${v === 0 ? ' stroke-width="1.25"' : ''}/>`);
    p.push(`<text x="${L - 8}" y="${r1(y(v)) + 4}" text-anchor="end" class="ch-tick">${esc(fmtNumber(v))}</text>`);
  }
  for (let v = 0; v <= xMax + 1e-9; v += xs) p.push(`<text x="${r1(x(v))}" y="${H - B + 18}" text-anchor="middle" class="ch-tick">${esc(o.xFormat(v))}</text>`);
  p.push(`<line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}" stroke="${C.ink}" stroke-width="1.25"/>`);
  p.push(`<text x="${(L + W - R) / 2}" y="${H - 8}" text-anchor="middle" class="ch-axis">${esc(o.xLabel)}</text>`);
  p.push(`<text x="16" y="${(T + H - B) / 2}" text-anchor="middle" class="ch-axis" transform="rotate(-90 16 ${(T + H - B) / 2})">${esc(o.yLabel)}</text>`);
  const ends: Array<{ y: number; label: string; color: string }> = [];
  for (const c of o.curves) {
    const d = Array.from({ length: samples + 1 }, (_, i) => {
      const xv = (xMax * i) / samples;
      return `${i ? 'L' : 'M'}${r1(x(xv))} ${r1(y(c.f(xv)))}`;
    }).join('');
    p.push(`<path d="${d}" fill="none" stroke="${c.color}" stroke-width="2.2"${c.dash ? ` stroke-dasharray="${c.dash}"` : ''}/>`);
    const at = Math.min(xMax, Math.max(0, c.at));
    p.push(`<circle cx="${r1(x(at))}" cy="${r1(y(c.f(at)))}" r="5" fill="#fff" stroke="${c.color}" stroke-width="2.5"/>`);
    ends.push({ y: y(c.f(xMax)), label: c.label, color: c.color });
  }
  ends.sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i += 1) {
    const prev = ends[i - 1];
    const cur = ends[i];
    if (prev && cur && cur.y - prev.y < 15) cur.y = prev.y + 15;
  }
  ends.forEach((e) => {
    const label = e.label.length > 29 ? `${e.label.slice(0, 28)}…` : e.label;
    p.push(`<text x="${W - R + 8}" y="${r1(e.y + 4)}" class="ch-label" fill="${textColour(e.color)}">${esc(label)}</text>`);
  });
  return svgFrame(W, H, o.id, o.title, o.desc, p.join(''));
}
