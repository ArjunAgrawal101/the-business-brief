/**
 * HTML pieces the Market Studio instruments share. Every instrument renders
 * its editable rows and its results from these strings, on the server for
 * the worked example and in the browser after every change, so the two
 * always match and every field has its label, hint and error slot.
 */
import { esc } from './markup';
import { CHECK_WORDS, countChecks, type Check, type CheckLevel } from './market-kit';

export interface FieldOpts {
  /** The id of the element; the error slot is `${id}-err`, a hint `${id}-hint`. */
  id: string;
  /** The name the script reads, as data-f. */
  f: string;
  label: string;
  hint?: string;
  /** Hide the label visually (it stays for screen readers), for compact rows with a visible column head. */
  srLabel?: boolean;
  cls?: string;
}

const labelHtml = (o: FieldOpts) => `<label for="${esc(o.id)}"${o.srLabel ? ' class="sr-only"' : ''}>${esc(o.label)}</label>`;
const hintHtml = (o: FieldOpts) => (o.hint ? `<span class="field__hint" id="${esc(o.id)}-hint">${esc(o.hint)}</span>` : '');
const errHtml = (o: FieldOpts) => `<span class="field__error" id="${esc(o.id)}-err" data-err-for="${esc(o.f)}"></span>`;
const describedBy = (o: FieldOpts) => `aria-describedby="${o.hint ? `${esc(o.id)}-hint ` : ''}${esc(o.id)}-err"`;

export function textField(o: FieldOpts & { value: string; max?: number; placeholder?: string }): string {
  return `<div class="field mk-field${o.cls ? ` ${o.cls}` : ''}">${labelHtml(o)}<input class="input" type="text" id="${esc(o.id)}" data-f="${esc(o.f)}" value="${esc(o.value)}" maxlength="${o.max ?? 200}"${o.placeholder ? ` placeholder="${esc(o.placeholder)}"` : ''} ${describedBy(o)} />${hintHtml(o)}${errHtml(o)}</div>`;
}

export function numberField(o: FieldOpts & { value: number | string; min?: number; max?: number; step?: string; prefix?: string; suffix?: string }): string {
  const input = `<input class="input input--num" type="number" inputmode="decimal" id="${esc(o.id)}" data-f="${esc(o.f)}" value="${esc(String(o.value))}"${o.min !== undefined ? ` min="${o.min}"` : ''}${o.max !== undefined ? ` max="${o.max}"` : ''} step="${o.step ?? 'any'}" ${describedBy(o)} />`;
  const body = o.prefix || o.suffix ? `<span class="affix">${o.prefix ? `<span class="affix__pre">${esc(o.prefix)}</span>` : ''}${input}${o.suffix ? `<span class="affix__post">${esc(o.suffix)}</span>` : ''}</span>` : input;
  return `<div class="field mk-field${o.cls ? ` ${o.cls}` : ''}">${labelHtml(o)}${body}${hintHtml(o)}${errHtml(o)}</div>`;
}

export function selectField(o: FieldOpts & { value: string; options: Array<{ value: string; label: string }> }): string {
  const opts = o.options.map((x) => `<option value="${esc(x.value)}"${x.value === o.value ? ' selected' : ''}>${esc(x.label)}</option>`).join('');
  return `<div class="field mk-field${o.cls ? ` ${o.cls}` : ''}">${labelHtml(o)}<select class="select" id="${esc(o.id)}" data-f="${esc(o.f)}" ${describedBy(o)}>${opts}</select>${hintHtml(o)}${errHtml(o)}</div>`;
}

export function areaField(o: FieldOpts & { value: string; rows?: number; max?: number }): string {
  return `<div class="field mk-field${o.cls ? ` ${o.cls}` : ''}">${labelHtml(o)}<textarea class="textarea mk-area" id="${esc(o.id)}" data-f="${esc(o.f)}" rows="${o.rows ?? 3}" maxlength="${o.max ?? 1200}" ${describedBy(o)}>${esc(o.value)}</textarea>${hintHtml(o)}${errHtml(o)}</div>`;
}

export function checkField(o: { id: string; f: string; label: string; checked: boolean; hint?: string }): string {
  return `<label class="mk-check" for="${esc(o.id)}"><input type="checkbox" id="${esc(o.id)}" data-f="${esc(o.f)}"${o.checked ? ' checked' : ''}${o.hint ? ` aria-describedby="${esc(o.id)}-hint"` : ''} /><span>${esc(o.label)}</span></label>${o.hint ? `<span class="field__hint" id="${esc(o.id)}-hint">${esc(o.hint)}</span>` : ''}`;
}

/** A figure in a results panel, matching the platform's .figs list. */
export function fig(k: string, vHtml: string, note?: string): string {
  return `<div class="fig"><dt>${esc(k)}</dt><dd><span class="fig__v">${vHtml}</span>${note ? `<span class="fig__n">${esc(note)}</span>` : ''}</dd></div>`;
}

/** A list of checks, most serious first, each with its level in words as well as colour. */
export function checksHtml(checks: Check[], empty = 'Nothing to flag.'): string {
  if (!checks.length) return `<p class="small muted mk-checks__empty">${esc(empty)}</p>`;
  const order: CheckLevel[] = ['conflict', 'tension', 'note', 'fit'];
  const sorted = [...checks].sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));
  return `<ul class="mk-checks" role="list">${sorted
    .map((c) => `<li class="mk-check-item mk-check-item--${c.level}"><span class="mk-check-item__level">${esc(CHECK_WORDS[c.level])}</span><span class="mk-check-item__text">${c.about ? `<b>${esc(c.about)}.</b> ` : ''}${esc(c.text)}</span></li>`)
    .join('')}</ul>`;
}

/** "2 problems, 1 check, 5 consistent", for a summary line and the live region. */
export function checksTally(checks: Check[]): string {
  const n = countChecks(checks);
  const part = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
  return [part(n.conflict, 'problem', 'problems'), part(n.tension, 'check', 'checks'), part(n.note, 'note', 'notes'), ...(n.fit ? [part(n.fit, 'consistent link', 'consistent links')] : [])].join(', ');
}

/** A remove button for a row; js-only, because only the script can remove rows. */
export function removeButton(label: string, what: string): string {
  return `<button type="button" class="btn btn--small mk-remove js-only" data-remove aria-label="${esc(`Remove ${what}`)}">${esc(label)}</button>`;
}

/** Move up and down buttons for an ordered list. */
export function moveButtons(what: string, first: boolean, last: boolean): string {
  return `<span class="mk-move js-only"><button type="button" class="btn btn--small" data-move="up" aria-label="${esc(`Move ${what} up`)}"${first ? ' disabled' : ''}>Up</button><button type="button" class="btn btn--small" data-move="down" aria-label="${esc(`Move ${what} down`)}"${last ? ' disabled' : ''}>Down</button></span>`;
}

/** A word scale (for 1 to 5 ratings) shown as filled and empty squares, with the number in words for screen readers. */
export function pips(v: number, max = 5): string {
  const n = Math.max(0, Math.min(max, Math.round(v)));
  return `<span class="mk-pips" aria-hidden="true">${'<i class="on"></i>'.repeat(n)}${'<i></i>'.repeat(max - n)}</span><span class="sr-only">${n} of ${max}</span>`;
}
