/**
 * The comparison grid: one section per question, each with a cell per side.
 * On wide screens the cells sit side by side under the sides' names; on phones
 * they stack, each carrying its side's name. Kept apart from the rest of the
 * comparison code so that the browser script loads only this and the
 * markup helpers, not the content schemas.
 */
import { esc } from '../markup';

/** The nine questions every comparison answers, in order. */
export const DIMENSIONS = [
  { id: 'standing', label: 'Standing in the IB course' },
  { id: 'purpose', label: 'Purpose' },
  { id: 'structure', label: 'Structure' },
  { id: 'context', label: 'The context it suits' },
  { id: 'strengths', label: 'Strengths' },
  { id: 'limitations', label: 'Limitations' },
  { id: 'mistakes', label: 'Common mistakes' },
  { id: 'application', label: 'A business application' },
  { id: 'exam', label: 'In an examination answer' },
] as const;
export type DimensionId = (typeof DIMENSIONS)[number]['id'];

export interface Column {
  id: string;
  name: string;
  /** The framework page, when the side is in the library. */
  href?: string;
  /** Each question's cell, as HTML. */
  cells: Record<DimensionId, string>;
}

export function gridHtml(cols: Column[], headingLevel: 2 | 3 = 2): string {
  const h = `h${headingLevel}`;
  const head = `<div class="cmp-head" aria-hidden="true" style="--cols:${cols.length}">${cols.map((c) => `<p class="cmp-head__name">${esc(c.name)}</p>`).join('')}</div>`;
  const rows = DIMENSIONS.map(
    (d) =>
      `<section class="cmp-row" data-dim="${d.id}" aria-labelledby="cmp-${d.id}"><${h} class="cmp-row__h" id="cmp-${d.id}">${esc(d.label)}</${h}><div class="cmp-cells" style="--cols:${cols.length}">${cols
        .map((c) => `<div class="cmp-cell" data-side="${esc(c.id)}"><p class="cmp-cell__side">${c.href ? `<a href="${esc(c.href)}">${esc(c.name)}</a>` : esc(c.name)}</p><div class="cmp-cell__body">${c.cells[d.id] ?? ''}</div></div>`)
        .join('')}</div></section>`,
  ).join('');
  return `<div class="cmp-grid" data-sides="${cols.length}">${head}${rows}</div>`;
}
