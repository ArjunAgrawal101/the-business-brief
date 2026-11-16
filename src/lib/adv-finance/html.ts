/**
 * Markup shared by the advanced tools, used by the server for the worked
 * example and by the browser after every change, so the two never differ.
 * Text from a report is escaped; reading text may use the light marks of
 * src/lib/markup.ts (bold and italic), and every name a reader types is
 * cleaned of those marks before it reaches a sentence.
 */
import { bracket } from '../cashflow';
import { esc, inline } from '../markup';
import { tableHtml } from '../finance-lab/render';
import type { TableSpec } from '../finance-lab/types';

export { tableHtml };

/** Where a figure sits against the IB course. */
export type Standing = 'ib' | 'hl' | 'beyond';

export const STANDING_TAG: Record<Standing, string> = {
  ib: '<span class="tag tag--ib">IB</span>',
  hl: '<span class="tag tag--hl">IB HL</span>',
  beyond: '<span class="tag tag--enrichment">Beyond the IB course</span>',
};

export interface Fig {
  label: string;
  value: string;
  note?: string;
  standing?: Standing;
}

export function figuresHtml(figs: Fig[]): string {
  return figs
    .map((f) => `<div class="fig"><dt>${esc(f.label)}${f.standing ? ` ${STANDING_TAG[f.standing]}` : ''}</dt><dd><span class="fig__v">${esc(f.value)}</span>${f.note ? `<span class="fig__n">${esc(f.note)}</span>` : ''}</dd></div>`)
    .join('');
}

export function headlineHtml(h: { label: string; value: string; note?: string }): string {
  return `<p class="fl-hero__label">${esc(h.label)}</p><p class="fl-hero__value">${esc(h.value)}</p>${h.note ? `<p class="fl-hero__note">${esc(h.note)}</p>` : ''}`;
}

/** Paragraphs of reading text, each allowed the light marks. */
export const paras = (texts: string[]): string => texts.filter(Boolean).map((t) => `<p>${inline(t)}</p>`).join('');

export const bullets = (texts: string[]): string => `<ul class="fl-actions">${texts.map((t) => `<li>${inline(t)}</li>`).join('')}</ul>`;

export interface StatementRow {
  label: string;
  values: Array<number | null>;
  /** line: an item; head: a heading across the table; total: a subtotal with a rule above; final: the last line, double-ruled; note: small text. */
  kind?: 'line' | 'head' | 'total' | 'final' | 'less';
}

/**
 * A statement over several years, in the layout of the guide's financial
 * statements: negative figures in brackets, subtotals ruled. The line names
 * stay in view while the years scroll sideways on a narrow screen.
 */
export function statementHtml(o: { id: string; title: string; caption: string; columns: string[]; rows: StatementRow[]; unit: string; note?: string }): string {
  const span = o.columns.length + 1;
  const head = `<tr><th scope="col" class="af-st__unit">${esc(o.unit)}</th>${o.columns.map((c) => `<th scope="col" class="n">${esc(c)}</th>`).join('')}</tr>`;
  const body = o.rows
    .map((r) => {
      if (r.kind === 'head') return `<tr class="af-st__head"><th scope="colgroup" colspan="${span}">${esc(r.label)}</th></tr>`;
      const cls = r.kind && r.kind !== 'line' ? ` class="af-st__${r.kind}"` : '';
      const cells = r.values.map((v) => `<td class="n">${v === null ? '' : esc(bracket(v, 0))}</td>`).join('');
      return `<tr${cls}><th scope="row">${esc(r.label)}</th>${cells}</tr>`;
    })
    .join('');
  return `<div class="table-scroll af-st-wrap" role="region" aria-labelledby="${esc(o.id)}" tabindex="0"><table class="table af-st"><caption id="${esc(o.id)}"><span class="af-st__title">${esc(o.title)}</span> <span class="af-st__cap">${esc(o.caption)}</span></caption><thead>${head}</thead><tbody>${body}</tbody></table></div>${o.note ? `<p class="small muted af-st__note">${inline(o.note)}</p>` : ''}`;
}

/** A chart in its scrolling frame, with a caption and its figures as a table in a disclosure. */
export function chartFigureHtml(o: { svg: string; label: string; caption: string; table: TableSpec }): string {
  return `<figure class="fl-chart af-chart"><div class="chart-scroll" role="region" aria-label="${esc(o.label)}" tabindex="0">${o.svg}</div><figcaption class="exhibit__source"><b>Chart</b> ${esc(o.caption)}</figcaption><details class="disclosure fl-chart__table"><summary>The chart’s figures as a table</summary><div class="disclosure__body">${tableHtml(o.table, `${o.label}: the figures`)}</div></details></figure>`;
}

/** A reading: the platform's interpretation, in a ruled panel. */
export const readingHtml = (text: string): string => `<p class="fl-sens__reading"><strong>Reading.</strong> ${inline(text)}</p>`;

/** The reader's figures as a definition list, for print and for readers without JavaScript. */
export const givenHtml = (rows: Array<{ label: string; value: string }>): string => rows.map((g) => `<div><dt>${esc(g.label)}</dt><dd>${esc(g.value)}</dd></div>`).join('');
