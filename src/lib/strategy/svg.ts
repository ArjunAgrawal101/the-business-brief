/**
 * SVG helpers for the Strategy Studio charts. Each chart is a string, drawn by
 * the same function on the server and in the browser, with a title and a
 * description that states the result; every chart's figures are also given
 * in a table beside it. Colours are the brand's, from the diagram kit.
 */
import { C, SANS, SERIF } from '../figures/kit';
import { esc } from '../markup';

export { C };
export const r1 = (n: number) => Math.round(n * 10) / 10;

export function svgDoc(w: number, h: number, id: string, title: string, desc: string, body: string): string {
  // Never drawn larger than its own size, so labels keep their size on wide screens.
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}-t ${id}-d" class="chart" style="max-width:${w}px" focusable="false" font-family="${esc(SANS)}"><title id="${id}-t">${esc(title)}</title><desc id="${id}-d">${esc(desc)}</desc>${body}</svg>`;
}

export interface TxtOpts {
  size?: number;
  weight?: number;
  fill?: string;
  anchor?: 'start' | 'middle' | 'end';
  serif?: boolean;
  italic?: boolean;
  rotate?: number;
  cls?: string;
}

export function txt(x: number, y: number, s: string, o: TxtOpts = {}): string {
  const a = [`x="${r1(x)}"`, `y="${r1(y)}"`, `font-size="${o.size ?? 12}"`, `fill="${o.fill ?? C.body}"`];
  if (o.weight) a.push(`font-weight="${o.weight}"`);
  if (o.anchor && o.anchor !== 'start') a.push(`text-anchor="${o.anchor}"`);
  if (o.serif) a.push(`font-family="${esc(SERIF)}"`);
  if (o.italic) a.push('font-style="italic"');
  if (o.rotate) a.push(`transform="rotate(${o.rotate} ${r1(x)} ${r1(y)})"`);
  if (o.cls) a.push(`class="${o.cls}"`);
  return `<text ${a.join(' ')}>${esc(s)}</text>`;
}

/** An arrowhead of a fixed size in pixels, whatever the width of the line it ends. */
export function arrowHead(id: string, colour: string = C.slate, size = 10): string {
  return `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="${size}" markerHeight="${size}" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${colour}"/></marker>`;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** An estimate of a label's width in pixels at a font size, for placing labels without collisions. */
export const textWidth = (s: string, size = 12) => s.length * size * 0.56 + 4;

/**
 * Places a label beside a point: tries right, left, above and below, and takes
 * the first place inside the frame that does not cover another label or point.
 */
export function placeLabel(px: number, py: number, label: string, r: number, frame: Box, taken: Box[], size = 12): { x: number; y: number; anchor: 'start' | 'end' | 'middle' } {
  const w = textWidth(label, size);
  const h = size + 4;
  const candidates: Array<{ bx: number; by: number; x: number; y: number; anchor: 'start' | 'end' | 'middle' }> = [
    { bx: px + r + 5, by: py - h / 2, x: px + r + 6, y: py + size / 3, anchor: 'start' },
    { bx: px - r - 5 - w, by: py - h / 2, x: px - r - 6, y: py + size / 3, anchor: 'end' },
    { bx: px - w / 2, by: py - r - h - 3, x: px, y: py - r - 6, anchor: 'middle' },
    { bx: px - w / 2, by: py + r + 3, x: px, y: py + r + size + 2, anchor: 'middle' },
    { bx: px + r + 5, by: py - h - r / 2, x: px + r + 6, y: py - r / 2 - 3, anchor: 'start' },
    { bx: px + r + 5, by: py + r / 2, x: px + r + 6, y: py + r / 2 + size, anchor: 'start' },
    { bx: px - r - 5 - w, by: py - h - r / 2, x: px - r - 6, y: py - r / 2 - 3, anchor: 'end' },
    { bx: px - r - 5 - w, by: py + r / 2, x: px - r - 6, y: py + r / 2 + size, anchor: 'end' },
  ];
  const inside = (b: Box) => b.x >= frame.x && b.x + b.w <= frame.x + frame.w && b.y >= frame.y && b.y + b.h <= frame.y + frame.h;
  const pick = candidates.find((c) => {
    const b = { x: c.bx, y: c.by, w, h };
    return inside(b) && !taken.some((t) => overlaps(t, b));
  }) ?? candidates.find((c) => inside({ x: c.bx, y: c.by, w, h })) ?? candidates[0]!;
  taken.push({ x: pick.bx, y: pick.by, w, h });
  return { x: pick.x, y: pick.y, anchor: pick.anchor };
}
