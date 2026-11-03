/**
 * HTML for the Strategy Studio editors, written once and used twice: by the
 * Astro components for the server-rendered worked example, and by the browser
 * scripts when a row is added or removed. Every value is escaped. Every input
 * has a label, and its hint, error and check messages are tied to it with
 * aria-describedby, so a screen reader hears them with the field.
 */
import { esc } from '../markup';

export interface FieldOpts {
  /** The element id; its messages use the ids `${id}-hint`, `${id}-err` and `${id}-chk`. */
  id: string;
  /** Where the value lives in the tool's state, such as "factors.s1.text". */
  k: string;
  label: string;
  /** Label markup already escaped, for a label with a part for screen readers only. Overrides label. */
  labelHtml?: string;
  value: string | number | null;
  /** Numbers are typed as text and read with parseNumber, so "1,200" and a typographic minus work. */
  numeric?: boolean;
  multiline?: boolean;
  rows?: number;
  hint?: string;
  /** Keep the label for screen readers only, where a column heading already says it. */
  srLabel?: boolean;
  maxlength?: number;
  cls?: string;
  pre?: string;
  post?: string;
  /** Room for a non-blocking prompt, such as "Is this internal?". */
  check?: string;
  error?: string;
  placeholder?: string;
  /** Ids of other elements that describe the field, such as a shared error. */
  describedBy?: string;
}

const attrs = (o: Record<string, string | number | boolean | undefined | null>) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(String(v))}"`))
    .join('');

const described = (id: string, hint?: string, check?: boolean) => [hint ? `${id}-hint` : '', `${id}-err`, check ? `${id}-chk` : ''].filter(Boolean).join(' ');

export function numText(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '';
  return String(v);
}

export function field(o: FieldOpts): string {
  const value = typeof o.value === 'number' ? numText(o.value) : (o.value ?? '');
  const common = {
    id: o.id,
    'data-k': o.k,
    'data-t': o.numeric ? 'n' : undefined,
    'aria-describedby': [described(o.id, o.hint, o.check !== undefined), o.describedBy ?? ''].filter(Boolean).join(' '),
    'aria-invalid': o.error ? 'true' : undefined,
    maxlength: o.maxlength ?? (o.numeric ? 16 : o.multiline ? 600 : 160),
    placeholder: o.placeholder,
  };
  const control = o.multiline
    ? `<textarea class="textarea sx-textarea"${attrs({ ...common, rows: o.rows ?? 2 })}>${esc(value)}</textarea>`
    : `<input class="input${o.numeric ? ' input--num' : ''}"${attrs({ ...common, type: 'text', inputmode: o.numeric ? 'decimal' : undefined, autocomplete: 'off', value })} />`;
  const wrapped = o.pre || o.post ? `<div class="affix">${o.pre ? `<span class="affix__pre" aria-hidden="true">${esc(o.pre)}</span>` : ''}${control}${o.post ? `<span class="affix__post" aria-hidden="true">${esc(o.post)}</span>` : ''}</div>` : control;
  return `<div class="field sx-field${o.cls ? ` ${o.cls}` : ''}"><label for="${esc(o.id)}"${o.srLabel ? ' class="sr-only"' : ''}>${o.labelHtml ?? esc(o.label)}</label>${wrapped}${
    o.hint ? `<span class="field__hint" id="${esc(o.id)}-hint">${esc(o.hint)}</span>` : ''
  }<p class="field__error" id="${esc(o.id)}-err" data-err>${esc(o.error ?? '')}</p>${o.check !== undefined ? `<p class="sx-check" id="${esc(o.id)}-chk" data-chk>${o.check ? checkText(o.check) : ''}</p>` : ''}</div>`;
}

/** A prompt shown under a field: a question for the reader, not a verdict. */
export function checkText(text: string): string {
  return text ? `<span class="sx-check__label">Check</span> ${esc(text)}` : '';
}

export interface SelectOpts {
  id: string;
  k: string;
  label: string;
  labelHtml?: string;
  value: string | number;
  options: Array<{ value: string | number; label: string }>;
  hint?: string;
  srLabel?: boolean;
  cls?: string;
  /** Read the value as a whole number. */
  integer?: boolean;
}

export function select(o: SelectOpts): string {
  const opts = o.options.map((x) => `<option value="${esc(String(x.value))}"${String(x.value) === String(o.value) ? ' selected' : ''}>${esc(x.label)}</option>`).join('');
  return `<div class="field sx-field${o.cls ? ` ${o.cls}` : ''}"><label for="${esc(o.id)}"${o.srLabel ? ' class="sr-only"' : ''}>${o.labelHtml ?? esc(o.label)}</label><select class="select"${attrs({
    id: o.id,
    'data-k': o.k,
    'data-t': o.integer ? 'i' : undefined,
    'aria-describedby': o.hint ? `${o.id}-hint` : undefined,
  })}>${opts}</select>${o.hint ? `<span class="field__hint" id="${esc(o.id)}-hint">${esc(o.hint)}</span>` : ''}</div>`;
}

export interface RadioOpts {
  name: string;
  k: string;
  legend: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  srLegend?: boolean;
  cls?: string;
}

/** A small group of radio buttons, each at least 44 px tall. */
export function radios(o: RadioOpts): string {
  return `<fieldset class="sx-radios${o.cls ? ` ${o.cls}` : ''}"><legend${o.srLegend ? ' class="sr-only"' : ''}>${esc(o.legend)}</legend><div class="sx-radios__opts">${o.options
    .map(
      (x) =>
        `<label class="opt"><input type="radio" id="${esc(`${o.name}-${x.value}`)}" name="${esc(o.name)}" value="${esc(x.value)}" data-k="${esc(o.k)}"${x.value === o.value ? ' checked' : ''} /><span class="opt__text">${esc(x.label)}</span></label>`,
    )
    .join('')}</div></fieldset>`;
}

export interface ButtonOpts {
  act: string;
  label: string;
  /** A fuller name for screen readers, such as "Remove factor: Leads the cargo segment". */
  aria?: string;
  data?: Record<string, string>;
  cls?: string;
  disabled?: boolean;
}

/** A button that needs the script, so it is hidden until the script runs. */
export function button(o: ButtonOpts): string {
  const data = Object.entries(o.data ?? {})
    .map(([k, v]) => ` data-${k}="${esc(v)}"`)
    .join('');
  return `<button type="button" class="btn btn--small js-only${o.cls ? ` ${o.cls}` : ''}" data-act="${esc(o.act)}"${data}${o.aria ? ` aria-label="${esc(o.aria)}"` : ''}${o.disabled ? ' disabled' : ''}>${esc(o.label)}</button>`;
}

/** A labelled rating scale from 1 to 5 as a select, with words for each point. */
export function ratingOptions(words: readonly string[]): Array<{ value: number; label: string }> {
  return words.map((w, i) => ({ value: i + 1, label: `${i + 1}: ${w}` }));
}

/** Dots for a rating, with the number in words for screen readers. */
export function dots(n: number, max = 5): string {
  const v = Math.max(0, Math.min(max, Math.round(n)));
  return `<span class="sx-dots" aria-hidden="true">${'<i class="on"></i>'.repeat(v)}${'<i></i>'.repeat(max - v)}</span><span class="sr-only">${v} of ${max}</span>`;
}

/** A short note under a group of rows, or nothing. */
export function note(text: string, cls = 'small muted'): string {
  return text ? `<p class="${cls}">${esc(text)}</p>` : '';
}

/** A list of checks as HTML, worst first. */
export function checksHtml(checks: Array<{ level: 'error' | 'warning' | 'info'; text: string }>, empty = 'No problems found.'): string {
  if (!checks.length) return `<p class="sx-checks__none">${esc(empty)}</p>`;
  const order = { error: 0, warning: 1, info: 2 } as const;
  const words = { error: 'Fix', warning: 'Check', info: 'Note' } as const;
  return `<ul class="sx-checks" role="list">${[...checks]
    .sort((a, b) => order[a.level] - order[b.level])
    .map((c) => `<li class="sx-checks__item sx-checks__item--${c.level}"><span class="sx-checks__label">${words[c.level]}</span> <span>${esc(c.text)}</span></li>`)
    .join('')}</ul>`;
}

/** A table wrapped in a focusable scroll region, for narrow screens. */
export function tableRegion(label: string, inner: string, cls = 'table'): string {
  return `<div class="table-scroll" role="region" aria-label="${esc(label)}" tabindex="0"><table class="${cls}">${inner}</table></div>`;
}

/** A chart wrapped in a focusable scroll region. */
export function chartRegion(label: string, svg: string): string {
  return `<div class="chart-scroll sx-chart" role="region" aria-label="${esc(label)}" tabindex="0">${svg}</div>`;
}
