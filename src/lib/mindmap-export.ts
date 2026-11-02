/**
 * A mindmap as a standalone, branded SVG: the map, a header with the AA
 * monogram, the platform's name and the map's title, and a footer with its
 * address. Used by the build (the downloadable files) and by the page's
 * download buttons, which also embed the fonts.
 */
import { MONOGRAM } from './brand';
import { esc, layout, renderSvg, type LayoutOptions } from './mindmap';
import type { Mindmap } from './schemas';

export interface ExportOptions extends LayoutOptions {
  /** The map's page, printed in the footer. */
  page: string;
  /** @font-face rules to embed (data URIs), when the file must look exactly like the page. */
  fontCss?: string;
}

export function brandedSvg(id: string, map: Mindmap, o: ExportOptions): string {
  const code = map.scope === 'unit' ? `Unit ${map.unit}` : map.code;
  const full = layout(map, { collapsed: o.collapsed, revision: o.revision });
  const inner = renderSvg(full, { code, title: `Mindmap: ${map.title}`, description: map.summary, idPrefix: `mx-${id}` });
  const b = full.bounds;
  const pad = 40;
  const head = 96;
  const foot = 56;
  const W = Math.round(b.w + pad * 2);
  const H = Math.round(b.h + head + foot);
  const monoH = 44;
  const monoW = (monoH * MONOGRAM.viewBox.w) / MONOGRAM.viewBox.h;
  const mk = monoH / MONOGRAM.viewBox.h;
  const body = inner.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<style>${o.fontCss ?? ''}.x-h{font-family:"Source Serif 4",Georgia,serif;font-weight:600;font-size:26px;fill:#0b1a33}.x-k{font-family:Inter,Arial,sans-serif;font-weight:700;font-size:11px;letter-spacing:.16em;fill:#76591f}.x-f{font-family:Inter,Arial,sans-serif;font-size:11px;fill:#566173}</style>`,
    `<rect width="${W}" height="${H}" fill="#fbf8f1"/>`,
    `<g transform="translate(${pad} 26) scale(${mk}) translate(${-MONOGRAM.viewBox.x} ${-MONOGRAM.viewBox.y})"><path fill-rule="evenodd" fill="#0b1a33" d="${MONOGRAM.a}"/><path fill-rule="evenodd" fill="#b39350" d="${MONOGRAM.b}"/></g>`,
    `<text class="x-k" x="${(pad + monoW + 16).toFixed(1)}" y="42">ARJUN AGRAWAL · THE BUSINESS BRIEF · MINDMAP ${esc(code.toUpperCase())}</text>`,
    `<text class="x-h" x="${(pad + monoW + 16).toFixed(1)}" y="72">${esc(map.title)}${o.revision ? ' (revision view)' : ''}</text>`,
    `<rect x="${pad}" y="${head - 8}" width="${W - pad * 2}" height="1" fill="#b39350"/>`,
    `<svg x="${pad}" y="${head}" width="${Math.round(b.w)}" height="${Math.round(b.h)}" viewBox="${b.x} ${b.y} ${b.w} ${b.h}">${body}</svg>`,
    `<text class="x-f" x="${pad}" y="${H - 22}">${esc(o.page)} · Original teaching material, not an IB publication.</text>`,
    '</svg>',
  ].join('');
}
