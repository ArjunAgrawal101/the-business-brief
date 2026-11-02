/**
 * Drawing primitives for the diagram library. Every diagram is SVG built from
 * data in these functions, so shapes, scales and labels are exact and the same
 * code serves the page, print and the downloadable file. Colours are the
 * brand's; text colours meet WCAG AA on white.
 */

export const C = {
  ink: '#0b1a33',
  ink2: '#1e355f',
  body: '#252d3a',
  slate: '#566173',
  muted: '#8a94a5',
  gold: '#b39350',
  goldText: '#76591f',
  goldWash: '#f3ead6',
  cobalt: '#2f55e4',
  cobaltText: '#2448d0',
  cobaltWash: '#e8edfd',
  signal: '#a8463f',
  signalText: '#9e3f38',
  signalWash: '#f5e7e5',
  green: '#2f6f5e',
  greenText: '#2b6a59',
  greenWash: '#e5efea',
  paper: '#f6f1e7',
  sunk: '#ece5d4',
  hair: '#e3dac8',
  rule: '#cdc2ab',
  white: '#ffffff',
} as const;

export type Tone = 'ink' | 'gold' | 'cobalt' | 'signal' | 'green' | 'slate';

/** Line and fill colours, text colour and wash for each tone. */
export const TONES: Record<Tone, { line: string; text: string; wash: string }> = {
  ink: { line: C.ink, text: C.ink, wash: C.paper },
  gold: { line: C.gold, text: C.goldText, wash: C.goldWash },
  cobalt: { line: C.cobalt, text: C.cobaltText, wash: C.cobaltWash },
  signal: { line: C.signal, text: C.signalText, wash: C.signalWash },
  green: { line: C.green, text: C.greenText, wash: C.greenWash },
  slate: { line: C.slate, text: C.slate, wash: C.sunk },
};

export const SANS = 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
export const SERIF = '"Source Serif 4", Georgia, "Times New Roman", serif';

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const r = (n: number) => Math.round(n * 10) / 10;

/** Groups thousands: 20000 becomes 20,000. */
export const num = (n: number, dp = 0) => n.toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp });

/* ------------------------------------------------------------------ */
/* The frame                                                           */
/* ------------------------------------------------------------------ */

export interface Frame {
  id: string;
  w: number;
  h: number;
  title: string;
  desc: string;
}

const TONE_KEYS = Object.keys(TONES) as Tone[];

/** Arrowheads, one per tone, so they match the line they end. */
function markers(id: string): string {
  return TONE_KEYS.map(
    (t) =>
      `<marker id="${id}-ah-${t}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,0.8 L10,5 L0,9.2 z" fill="${TONES[t].line}"/></marker>`,
  ).join('');
}

export function frame(f: Frame, body: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f.w} ${f.h}" width="${f.w}" height="${f.h}" role="img" aria-labelledby="${f.id}-t ${f.id}-d" font-family="${esc(SANS)}" font-size="13" fill="${C.body}">` +
    `<title id="${f.id}-t">${esc(f.title)}</title><desc id="${f.id}-d">${esc(f.desc)}</desc>` +
    `<defs>${markers(f.id)}</defs>${body}</svg>`
  );
}

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

export interface TextOpts {
  size?: number;
  weight?: number;
  fill?: string;
  anchor?: 'start' | 'middle' | 'end';
  serif?: boolean;
  italic?: boolean;
  /** Small capitals look: upper case with tracking. */
  label?: boolean;
  lh?: number;
  rotate?: number;
  baseline?: 'middle' | 'auto';
}

function textAttrs(o: TextOpts): string {
  const a: string[] = [];
  if (o.size && o.size !== 13) a.push(`font-size="${o.size}"`);
  if (o.weight && o.weight !== 400) a.push(`font-weight="${o.weight}"`);
  if (o.fill) a.push(`fill="${o.fill}"`);
  if (o.anchor && o.anchor !== 'start') a.push(`text-anchor="${o.anchor}"`);
  if (o.serif) a.push(`font-family="${esc(SERIF)}"`);
  if (o.italic) a.push(`font-style="italic"`);
  if (o.label) a.push(`letter-spacing="0.08em"`);
  if (o.baseline === 'middle') a.push(`dominant-baseline="central"`);
  return a.join(' ');
}

/** One line of text, or several when the string holds line breaks. */
export function text(x: number, y: number, s: string, o: TextOpts = {}): string {
  const lines = s.split('\n');
  const size = o.size ?? 13;
  const lh = o.lh ?? size * 1.3;
  const content = o.label ? s.toUpperCase() : s;
  const rot = o.rotate ? ` transform="rotate(${o.rotate} ${r(x)} ${r(y)})"` : '';
  if (lines.length === 1) return `<text x="${r(x)}" y="${r(y)}" ${textAttrs(o)}${rot}>${esc(content)}</text>`;
  const spans = (o.label ? content : s)
    .split('\n')
    .map((l, i) => `<tspan x="${r(x)}" ${i === 0 ? '' : `dy="${r(lh)}"`}>${esc(l)}</tspan>`)
    .join('');
  return `<text x="${r(x)}" y="${r(y)}" ${textAttrs(o)}${rot}>${spans}</text>`;
}

/** Breaks a string into lines of at most `max` characters, at spaces. */
export function wrap(s: string, max: number): string[] {
  const out: string[] = [];
  for (const para of s.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      if (!line) line = word;
      else if ((line + ' ' + word).length <= max) line += ' ' + word;
      else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

/** Wrapped text, centred vertically on y when `middle` is set. */
export function para(x: number, y: number, s: string, max: number, o: TextOpts & { middle?: boolean } = {}): string {
  const lines = wrap(s, max);
  const size = o.size ?? 13;
  const lh = o.lh ?? size * 1.3;
  const top = o.middle ? y - ((lines.length - 1) * lh) / 2 + size * 0.35 : y;
  return text(x, top, lines.join('\n'), { ...o, lh });
}

/* ------------------------------------------------------------------ */
/* Shapes                                                              */
/* ------------------------------------------------------------------ */

export interface ShapeOpts {
  fill?: string;
  stroke?: string;
  sw?: number;
  rx?: number;
  dash?: string;
  opacity?: number;
}

function shapeAttrs(o: ShapeOpts): string {
  const a = [`fill="${o.fill ?? 'none'}"`];
  if (o.stroke) a.push(`stroke="${o.stroke}" stroke-width="${o.sw ?? 1}"`);
  if (o.dash) a.push(`stroke-dasharray="${o.dash}"`);
  if (o.opacity !== undefined) a.push(`opacity="${o.opacity}"`);
  return a.join(' ');
}

export const rect = (x: number, y: number, w: number, h: number, o: ShapeOpts = {}) =>
  `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}"${o.rx ? ` rx="${o.rx}"` : ''} ${shapeAttrs(o)}/>`;

export const circle = (cx: number, cy: number, rad: number, o: ShapeOpts = {}) => `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(rad)}" ${shapeAttrs(o)}/>`;

export const path = (d: string, o: ShapeOpts = {}) => `<path d="${d}" ${shapeAttrs({ ...o, stroke: o.stroke ?? (o.fill ? undefined : C.ink) })} stroke-linejoin="round" stroke-linecap="round"/>`;

export const poly = (pts: Array<[number, number]>, o: ShapeOpts = {}) => `<polygon points="${pts.map(([x, y]) => `${r(x)},${r(y)}`).join(' ')}" ${shapeAttrs(o)}/>`;

export interface LineOpts {
  tone?: Tone;
  stroke?: string;
  sw?: number;
  dash?: string;
  arrow?: 'end' | 'start' | 'both';
}

/** A straight line; arrowheads take the tone's colour. */
export function line(id: string, x1: number, y1: number, x2: number, y2: number, o: LineOpts = {}): string {
  const tone = o.tone ?? 'ink';
  const stroke = o.stroke ?? TONES[tone].line;
  const m = o.arrow
    ? `${o.arrow !== 'start' ? ` marker-end="url(#${id}-ah-${tone})"` : ''}${o.arrow !== 'end' ? ` marker-start="url(#${id}-ah-${tone})"` : ''}`
    : '';
  return `<line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}" stroke="${stroke}" stroke-width="${o.sw ?? 1.4}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''} stroke-linecap="round"${m}/>`;
}

/** A path with arrowheads, for curved connectors. */
export function arrowPath(id: string, d: string, o: LineOpts = {}): string {
  const tone = o.tone ?? 'ink';
  const stroke = o.stroke ?? TONES[tone].line;
  const m = `${o.arrow !== 'start' ? ` marker-end="url(#${id}-ah-${tone})"` : ''}${o.arrow === 'start' || o.arrow === 'both' ? ` marker-start="url(#${id}-ah-${tone})"` : ''}`;
  return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${o.sw ?? 1.4}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''} stroke-linecap="round" stroke-linejoin="round"${m}/>`;
}

export interface BoxOpts {
  tone?: Tone;
  /** Filled in the tone's wash (default), solid in the tone's colour, or white. */
  style?: 'wash' | 'solid' | 'outline' | 'plain';
  size?: number;
  weight?: number;
  serif?: boolean;
  max?: number;
  sub?: string;
  subSize?: number;
  rx?: number;
  align?: 'middle' | 'start';
  dash?: string;
}

/** A box with a centred, wrapped label and an optional second line. */
export function box(x: number, y: number, w: number, h: number, label: string, o: BoxOpts = {}): string {
  const t = TONES[o.tone ?? 'ink'];
  const style = o.style ?? 'wash';
  const fill = style === 'solid' ? t.line : style === 'wash' ? t.wash : style === 'outline' ? C.white : 'none';
  const ink = style === 'solid' ? C.white : t.text === C.ink ? C.ink : t.text;
  const size = o.size ?? 13;
  const max = o.max ?? Math.max(6, Math.floor(w / (size * 0.56)));
  const lines = wrap(label, max);
  const subLines = o.sub ? wrap(o.sub, Math.max(6, Math.floor(w / ((o.subSize ?? 11) * 0.55)))) : [];
  const lh = size * 1.25;
  const slh = (o.subSize ?? 11) * 1.3;
  const blockH = lines.length * lh + (subLines.length ? 4 + subLines.length * slh : 0);
  const align = o.align ?? 'middle';
  const tx = align === 'middle' ? x + w / 2 : x + 10;
  let y0 = y + h / 2 - blockH / 2 + size * 0.95;
  const parts = [rect(x, y, w, h, { fill, stroke: style === 'plain' ? undefined : t.line, sw: style === 'solid' ? 0 : 1.2, rx: o.rx ?? 3, dash: o.dash })];
  parts.push(text(tx, y0, lines.join('\n'), { size, weight: o.weight ?? 600, fill: ink, anchor: align, serif: o.serif, lh }));
  if (subLines.length) {
    y0 += lines.length * lh + 2;
    parts.push(text(tx, y0, subLines.join('\n'), { size: o.subSize ?? 11, fill: style === 'solid' ? 'rgba(255,255,255,0.86)' : C.slate, anchor: align, lh: slh }));
  }
  return parts.join('');
}

/** A rounded tag. */
export function pill(x: number, y: number, label: string, o: { tone?: Tone; size?: number; anchor?: 'start' | 'middle' } = {}): string {
  const t = TONES[o.tone ?? 'gold'];
  const size = o.size ?? 10.5;
  const w = label.length * size * 0.66 + 14;
  const x0 = o.anchor === 'middle' ? x - w / 2 : x;
  return rect(x0, y - size - 3, w, size + 8, { fill: t.wash, stroke: t.line, sw: 1, rx: (size + 8) / 2 }) + text(x0 + w / 2, y + 0.5, label, { size, weight: 700, fill: t.text, anchor: 'middle', label: true });
}

/** A numbered circle, for steps. */
export function badge(cx: number, cy: number, n: string | number, o: { tone?: Tone; rad?: number } = {}): string {
  const t = TONES[o.tone ?? 'ink'];
  const rad = o.rad ?? 11;
  return circle(cx, cy, rad, { fill: t.line }) + text(cx, cy + rad * 0.38, String(n), { size: rad * 1.05, weight: 700, fill: C.white, anchor: 'middle' });
}

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */

export interface Axes {
  /** Plot area in SVG units. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Data ranges. */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export const sx = (a: Axes, v: number) => a.x + ((v - a.x0) / (a.x1 - a.x0)) * a.w;
export const sy = (a: Axes, v: number) => a.y + a.h - ((v - a.y0) / (a.y1 - a.y0)) * a.h;

export interface AxesOpts {
  xLabel: string;
  yLabel: string;
  xTicks?: Array<{ v: number; label: string }>;
  yTicks?: Array<{ v: number; label: string }>;
  grid?: boolean;
  /** Draw the horizontal axis at this data value (for charts that go below zero). */
  xAxisAt?: number;
  origin?: boolean;
}

export function axes(id: string, a: Axes, o: AxesOpts): string {
  const p: string[] = [];
  const baseY = sy(a, o.xAxisAt ?? a.y0);
  if (o.grid) {
    for (const t of o.yTicks ?? []) p.push(line(id, a.x, sy(a, t.v), a.x + a.w, sy(a, t.v), { stroke: C.hair, sw: 1 }));
    for (const t of o.xTicks ?? []) p.push(line(id, sx(a, t.v), a.y, sx(a, t.v), a.y + a.h, { stroke: C.hair, sw: 1 }));
  }
  p.push(line(id, a.x, a.y + a.h + 0.5, a.x, a.y - 8, { sw: 1.4, arrow: 'end' }));
  p.push(line(id, a.x, baseY, a.x + a.w + 10, baseY, { sw: 1.4, arrow: 'end' }));
  for (const t of o.yTicks ?? []) {
    p.push(line(id, a.x - 4, sy(a, t.v), a.x, sy(a, t.v), { sw: 1 }));
    p.push(text(a.x - 8, sy(a, t.v) + 4, t.label, { size: 11, fill: C.slate, anchor: 'end' }));
  }
  for (const t of o.xTicks ?? []) {
    p.push(line(id, sx(a, t.v), baseY, sx(a, t.v), baseY + 4, { sw: 1 }));
    p.push(text(sx(a, t.v), baseY + 17, t.label, { size: 11, fill: C.slate, anchor: 'middle' }));
  }
  p.push(text(a.x + a.w + 12, baseY + (o.xTicks?.length ? 34 : 20), o.xLabel, { size: 12, weight: 600, fill: C.ink, anchor: 'end' }));
  p.push(text(a.x - 2, a.y - 16, o.yLabel, { size: 12, weight: 600, fill: C.ink, anchor: 'start' }));
  if (o.origin) p.push(text(a.x - 8, a.y + a.h + 16, 'O', { size: 11, fill: C.slate, anchor: 'end' }));
  return p.join('');
}

/** A polyline through data points. */
export function plot(a: Axes, pts: Array<[number, number]>, o: ShapeOpts & { sw?: number } = {}): string {
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r(sx(a, x))},${r(sy(a, y))}`).join(' ');
  return `<path d="${d}" fill="${o.fill ?? 'none'}" stroke="${o.stroke ?? C.ink}" stroke-width="${o.sw ?? 2}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''} stroke-linejoin="round" stroke-linecap="round"${o.opacity !== undefined ? ` opacity="${o.opacity}"` : ''}/>`;
}

/** A smooth curve through points (Catmull-Rom converted to Bézier). */
export function smooth(pts: Array<[number, number]>, tension = 1): string {
  if (pts.length < 2) return '';
  let d = `M${r(pts[0]![0])},${r(pts[0]![1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const c1: [number, number] = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension];
    const c2: [number, number] = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension];
    d += ` C${r(c1[0])},${r(c1[1])} ${r(c2[0])},${r(c2[1])} ${r(p2[0])},${r(p2[1])}`;
  }
  return d;
}

/** A dimension line with end ticks and a label: for margins, gaps and spans. */
export function span(id: string, x1: number, y1: number, x2: number, y2: number, label: string, o: { tone?: Tone; side?: 'above' | 'below' | 'left' | 'right'; size?: number } = {}): string {
  const tone = o.tone ?? 'gold';
  const t = TONES[tone];
  const p = [line(id, x1, y1, x2, y2, { tone, sw: 1.3, arrow: 'both' })];
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const side = o.side ?? 'above';
  const size = o.size ?? 11.5;
  if (side === 'above') p.push(text(mx, my - 7, label, { size, weight: 600, fill: t.text, anchor: 'middle' }));
  if (side === 'below') p.push(text(mx, my + size + 5, label, { size, weight: 600, fill: t.text, anchor: 'middle' }));
  if (side === 'left') p.push(text(mx - 8, my + 4, label, { size, weight: 600, fill: t.text, anchor: 'end' }));
  if (side === 'right') p.push(text(mx + 8, my + 4, label, { size, weight: 600, fill: t.text, anchor: 'start' }));
  return p.join('');
}

/** A small key: coloured swatches and labels in a row. */
export function legend(x: number, y: number, items: Array<{ label: string; stroke?: string; fill?: string; dash?: string }>, gap = 22): string {
  let cx = x;
  const out: string[] = [];
  for (const it of items) {
    if (it.fill) out.push(rect(cx, y - 9, 14, 10, { fill: it.fill, stroke: it.stroke, sw: 1 }));
    else out.push(`<line x1="${r(cx)}" y1="${r(y - 4)}" x2="${r(cx + 18)}" y2="${r(y - 4)}" stroke="${it.stroke ?? C.ink}" stroke-width="2.2"${it.dash ? ` stroke-dasharray="${it.dash}"` : ''}/>`);
    out.push(text(cx + (it.fill ? 20 : 24), y, it.label, { size: 11.5, fill: C.body }));
    cx += (it.fill ? 20 : 24) + it.label.length * 6.3 + gap;
  }
  return out.join('');
}

/** A note that the figures are invented for teaching. */
export const fictionNote = (x: number, y: number, s = 'Fictional figures, for teaching.', anchor: 'start' | 'end' = 'end') => text(x, y, s, { size: 10.5, italic: true, fill: C.slate, anchor });
