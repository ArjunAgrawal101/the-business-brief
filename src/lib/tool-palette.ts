/**
 * Colours and SVG helpers for the charts of the People and Culture and
 * Operations Floor tools. The values are the design tokens in
 * src/styles/tokens.css (an SVG built as a string cannot read CSS variables
 * in every renderer, and the downloads and print need fixed colours), and the
 * room accents of src/styles/rooms.css. Colour never carries meaning alone:
 * every mark that matters is also labelled in words.
 */
import { esc } from './markup';

export const P = {
  navy: '#0b1a33',
  navy700: '#1e355f',
  cobalt: '#2f55e4',
  cobaltText: '#2448d0',
  green: '#2f6f5e',
  greenText: '#2b6a59',
  signal: '#a8463f',
  signalText: '#9e3f38',
  gold: '#b39350',
  gold600: '#8a6b2a',
  brassText: '#76591f',
  slate: '#566173',
  slate500: '#5b6678',
  slate300: '#aeb8c8',
  rule: '#cdc2ab',
  hair: '#e3dac8',
  sunk: '#ece5d4',
  ivory: '#f6f1e7',
  ivory50: '#fbf8f1',
  white: '#ffffff',
  people: '#9a5b3f',
  peopleText: '#8a4f35',
  ops: '#3b6f8f',
  opsText: '#33617d',
} as const;

/** Round to one decimal place for SVG coordinates. */
export const r1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * An SVG chart with its title and description, labelled for screen readers.
 * `minWidth` keeps text legible on narrow screens: the chart then scrolls in
 * its own region instead of shrinking. `maxWidth` stops a small chart from
 * being blown up to the width of a wide screen.
 */
export function svgChart(o: { w: number; h: number; id: string; title: string; desc: string; body: string; minWidth?: number; maxWidth?: number; cls?: string }): string {
  const css = [o.minWidth ? `min-width:${Math.round(o.minWidth)}px` : '', o.maxWidth ? `max-width:${Math.round(o.maxWidth)}px` : ''].filter(Boolean).join(';');
  const style = css ? ` style="${css}"` : '';
  return `<svg viewBox="0 0 ${o.w} ${o.h}" role="img" aria-labelledby="${o.id}-t ${o.id}-d" class="chart${o.cls ? ` ${o.cls}` : ''}" focusable="false"${style}><title id="${o.id}-t">${esc(o.title)}</title><desc id="${o.id}-d">${esc(o.desc)}</desc>${o.body}</svg>`;
}

/** Break a label into lines of at most `max` characters, at spaces. */
export function wrapWords(s: string, max: number, lines = 2): string[] {
  const words = s.trim().split(/\s+/);
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= max) cur += ` ${w}`;
    else {
      out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  if (out.length <= lines) return out.map((l) => (l.length > max ? `${l.slice(0, max - 1)}…` : l));
  const kept = out.slice(0, lines);
  const last = kept[lines - 1] ?? '';
  kept[lines - 1] = `${last.slice(0, Math.max(1, max - 1))}…`;
  return kept;
}
