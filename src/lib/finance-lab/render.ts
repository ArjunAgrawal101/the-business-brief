/**
 * HTML for the lab's reports, used by the server for the default state and by
 * the browser after every change, so the page looks the same either way.
 * Text from a report is escaped and may use the light marks of
 * src/lib/markup.ts (bold and italic); figures typed by the reader only ever
 * reach the page through these escaping functions.
 */
import { esc, inline } from '../markup';
import { workingHtml } from '../render';
import { linear, type FormulaSpec, type Term } from './formulas';
import type { LabReport, Scope, TableSpec, WorkingBlock } from './types';

export type Region = 'headline' | 'figures' | 'workings' | 'chart' | 'sensitivity' | 'meaning' | 'compare' | 'benchmarks' | 'actions' | 'given' | 'extra';

export const SCOPE_TAG: Record<Scope, string> = {
  syllabus: '',
  hl: '<span class="tag tag--hl">HL</span>',
  enrichment: '<span class="tag tag--enrichment">Enrichment</span>',
};

const levelAttr = (scope?: Scope) => (scope === 'hl' ? ' data-level="HL"' : '');

export function tableHtml(t: TableSpec, label: string, cls = ''): string {
  const numeric = t.numeric ?? t.head.map((_, i) => i > 0);
  const head = `<tr>${t.head.map((h, i) => `<th scope="col"${numeric[i] ? ' class="n"' : ''}>${esc(h)}</th>`).join('')}</tr>`;
  const body = t.rows
    .map((r) => {
      const cl = [r.base ? 'is-base' : '', r.strong ? 'is-strong' : ''].filter(Boolean).join(' ');
      const cell = (c: string, i: number) => {
        const cls = [numeric[i + 1] ? 'n' : '', r.baseCell === i ? 'is-base-cell' : ''].filter(Boolean).join(' ');
        return `<td${cls ? ` class="${cls}"` : ''}>${esc(c)}${r.baseCell === i ? '<span class="sr-only"> (the figures as entered)</span>' : ''}</td>`;
      };
      return `<tr${cl ? ` class="${cl}"` : ''}><th scope="row">${esc(r.th)}${r.base ? '<span class="sr-only"> (the figures as entered)</span>' : ''}</th>${r.cells.map(cell).join('')}</tr>`;
    })
    .join('');
  return `<div class="table-scroll" role="region" aria-label="${esc(label)}" tabindex="0"><table class="table fl-table${cls ? ` ${cls}` : ''}"><caption>${esc(t.caption)}</caption><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

function workingBlockHtml(b: WorkingBlock, k: number): string {
  const body = workingHtml(b.working, inline(b.interpretation), inline(b.implication));
  const tag = b.scope ? ` ${SCOPE_TAG[b.scope]}` : '';
  if (b.collapsed) {
    return `<details class="disclosure fl-working fl-working--folded"${levelAttr(b.scope)}><summary>${esc(b.title)}</summary><div class="disclosure__body">${body}</div></details>`;
  }
  return `<section class="fl-working" aria-labelledby="fl-w-${k}"${levelAttr(b.scope)}><h3 class="fl-working__title" id="fl-w-${k}">${esc(b.title)}${tag}</h3>${body}</section>`;
}

/** The HTML for each region of a calculator page. */
export function regionsHtml(r: LabReport, name: string): Record<Region, string> {
  const figures = r.figures
    .map((f) => `<div class="fig"${levelAttr(f.scope)}><dt>${esc(f.label)}${f.scope && f.scope !== 'syllabus' ? ` ${SCOPE_TAG[f.scope]}` : ''}</dt><dd><span class="fig__v">${esc(f.value)}</span>${f.note ? `<span class="fig__n">${esc(f.note)}</span>` : ''}</dd></div>`)
    .join('');
  const chart = r.chart
    ? `<figure class="fl-chart"><div class="chart-scroll" role="region" aria-label="${esc(name)}: chart" tabindex="0">${r.chart.svg}</div><figcaption class="exhibit__source"><b>Chart</b> ${esc(r.chart.caption)}</figcaption><details class="disclosure fl-chart__table"><summary>The chart’s figures as a table</summary><div class="disclosure__body">${tableHtml(r.chart.table, `${name}: the chart’s figures`)}</div></details></figure>`
    : '';
  const sens = r.sensitivity
    ? `<p class="fl-sens__intro">${inline(r.sensitivity.intro)}</p>${tableHtml(r.sensitivity.table, `${name}: ${r.sensitivity.title}`, 'fl-sens__table')}${r.sensitivity.svg ? `<div class="chart-scroll fl-sens__chart" role="region" aria-label="${esc(r.sensitivity.title)}: chart" tabindex="0">${r.sensitivity.svg}</div>` : ''}<p class="fl-sens__reading"><strong>Reading.</strong> ${inline(r.sensitivity.reading)}</p>`
    : '';
  return {
    headline: `<p class="fl-hero__label">${esc(r.headline.label)}</p><p class="fl-hero__value">${esc(r.headline.value)}</p>${r.headline.note ? `<p class="fl-hero__note">${esc(r.headline.note)}</p>` : ''}`,
    figures,
    workings: r.workings.map(workingBlockHtml).join(''),
    chart,
    sensitivity: sens,
    meaning: `<p>${inline(r.interpretation.meaning)}</p>`,
    compare: `<p>${inline(r.interpretation.compare)}</p>`,
    benchmarks: `<p>${inline(r.interpretation.benchmarks)}</p>`,
    actions: `<ul class="fl-actions">${r.interpretation.actions.map((a) => `<li>${inline(a)}</li>`).join('')}</ul>`,
    given: r.given.map((g) => `<div><dt>${esc(g.label)}</dt><dd>${esc(g.value)}</dd></div>`).join(''),
    extra: r.extra ?? '',
  };
}

/* ------------------------------------------------------------------ */
/* Formulas                                                            */
/* ------------------------------------------------------------------ */

function termsHtml(terms: Term[]): string {
  return terms
    .map((t) => {
      if (typeof t === 'string') return esc(t);
      if ('sup' in t) return `<sup>${esc(t.sup)}</sup>`;
      return `<span class="fl-frac"><span class="fl-frac__n">${termsHtml(t.n)}</span><span class="fl-frac__d">${termsHtml(t.d)}</span></span>`;
    })
    .join('');
}

export function formulaHtml(f: FormulaSpec): string {
  const where = (f.where ?? [])
    .map((w) => `<p class="fl-formula__where"><span aria-hidden="true">where ${esc(w.name)} = ${termsHtml(w.rhs)}</span><span class="sr-only">where ${esc(w.name)} = ${esc(linear(w.rhs))}</span></p>`)
    .join('');
  const tag = f.scope ? SCOPE_TAG[f.scope] : '';
  return `<div class="fl-formula${f.scope ? ` fl-formula--${f.scope}` : ''}"${levelAttr(f.scope)}><p class="fl-formula__eq"><span aria-hidden="true"><span class="fl-formula__lhs">${esc(f.name)}</span> = <span class="fl-formula__rhs">${termsHtml(f.rhs)}</span></span><span class="sr-only">${esc(f.name)} = ${esc(linear(f.rhs))}</span></p>${where}${f.note || tag ? `<p class="fl-formula__note">${tag}${tag && f.note ? ' ' : ''}${f.note ? esc(f.note) : ''}</p>` : ''}</div>`;
}
