/**
 * Form markup for the advanced tools: labelled fields with their hints and
 * error slots, the forecast's groups of drivers, the comparator's projects and
 * the dashboard's grid of accounts. The server renders the worked example with
 * these functions and the browser re-renders a grid with them when the reader
 * adds or removes a project, a year or a column, so the two never differ.
 * Values are kept as the reader typed them, so a half-typed figure survives.
 */
import { esc } from '../markup';
import { fillLabel } from '../finance-lab/fields';
import type { FieldSpec, Settings } from '../finance-lab/types';
import { MAX_YEARS as CAP_MAX_YEARS, OWN_RATE, WACC_FIELDS } from './capital';
import { ACCOUNT_FIELDS, OPENING_STOCK_FIELD } from './performance';

/** A default as it appears in its field: money that is not whole keeps two decimals (14.40, not 14.4). */
export function inputValue(v: number, kind: FieldSpec['kind']): string {
  return kind === 'money' && !Number.isInteger(v) ? v.toFixed(2) : String(v);
}

const idOf = (uid: string, name: string) => `${uid}-${name.replace(/[^a-zA-Z0-9-]/g, '-')}`;

/** One labelled field: a currency before money, a per cent sign after a rate, the unit's name after a count. */
export function fieldHtml(o: { spec: FieldSpec; name: string; value: string; uid: string; currency: string; settings?: Settings; label?: string; wide?: boolean }): string {
  const f = o.spec;
  const id = idOf(o.uid, o.name);
  const label = o.label ?? (o.settings ? fillLabel(f.label, o.settings) : f.label);
  const tpl = o.settings && /\{(unit|units|period)\}/.test(f.label) ? ` data-tpl="${esc(f.label)}"` : '';
  const negative = f.min === undefined || f.min < 0;
  const pre = f.kind === 'money' ? `<span class="affix__pre" aria-hidden="true" data-affix="currency">${esc(o.currency.trim())}</span>` : '';
  const post = f.kind === 'percent' ? '<span class="affix__post" aria-hidden="true">%</span>' : f.kind === 'count' && o.settings ? `<span class="affix__post" aria-hidden="true" data-affix="units">${esc(o.settings.units)}</span>` : '';
  const describedBy = `${id}-err${f.hint ? ` ${id}-hint` : ''}`;
  const input = `<input class="input input--num" type="text"${negative ? '' : ' inputmode="decimal"'} autocomplete="off" id="${id}" name="${esc(o.name)}" value="${esc(o.value)}" data-num aria-invalid="false" aria-describedby="${describedBy}" />`;
  return `<div class="field${o.wide ? ' fl-fields__wide' : ''}"><label for="${id}"><span${tpl}>${esc(label)}</span></label>${pre || post ? `<div class="affix">${pre}${input}${post}</div>` : input}${f.hint ? `<span class="field__hint" id="${id}-hint">${esc(f.hint)}</span>` : ''}<span class="field__error" id="${id}-err" data-err="${esc(o.name)}"></span></div>`;
}

/** A text field, such as a name. */
export function textFieldHtml(o: { name: string; label: string; value: string; uid: string; max?: number; hint?: string; wide?: boolean }): string {
  const id = idOf(o.uid, o.name);
  return `<div class="field${o.wide === false ? '' : ' fl-fields__wide'}"><label for="${id}">${esc(o.label)}</label><input class="input" type="text" autocomplete="off" maxlength="${o.max ?? 48}" id="${id}" name="${esc(o.name)}" value="${esc(o.value)}" data-text aria-describedby="${id}-err${o.hint ? ` ${id}-hint` : ''}" />${o.hint ? `<span class="field__hint" id="${id}-hint">${esc(o.hint)}</span>` : ''}<span class="field__error" id="${id}-err" data-err="${esc(o.name)}"></span></div>`;
}

/* ------------------------------------------------------------------ */
/* The capital budgeting comparator                                    */
/* ------------------------------------------------------------------ */

export interface ProjectValues {
  name: string;
  outlay: string;
  flows: string[];
}

/** The projects: each a fieldset with its name, investment and years, with buttons to add and remove years. */
export function projectsHtml(projects: ProjectValues[], uid: string, currency: string): string {
  return projects
    .map((p, i) => {
      const years = p.flows
        .map((v, k) => {
          const name = `p${i}.r${k + 1}`;
          const id = idOf(uid, name);
          return `<li class="field af-year"><label for="${id}">Year ${k + 1}</label><div class="affix"><span class="affix__pre" aria-hidden="true" data-affix="currency">${esc(currency.trim())}</span><input class="input input--num" type="text" autocomplete="off" id="${id}" name="${name}" value="${esc(v)}" data-num aria-invalid="false" aria-describedby="${id}-err" /></div><span class="field__error" id="${id}-err" data-err="${name}"></span></li>`;
        })
        .join('');
      const outlay = fieldHtml({ spec: { key: 'outlay', label: 'Initial investment (year 0)', kind: 'money', min: 0, minExclusive: true, name: 'the initial investment' }, name: `p${i}.outlay`, value: p.outlay, uid, currency });
      const label = textFieldHtml({ name: `p${i}.name`, label: 'Name of the project', value: p.name, uid, max: 48 });
      const canAdd = p.flows.length < CAP_MAX_YEARS;
      return `<fieldset class="af-project" data-project="${i}"><legend class="label label--ink">Project ${i + 1}</legend><div class="fl-fields">${label}${outlay}</div><p class="af-project__years-label" id="${uid}-p${i}-years">Net cash flow each year</p><ol class="af-years" aria-labelledby="${uid}-p${i}-years">${years}</ol><p class="cluster fl-grid__actions"><button type="button" class="btn btn--small" data-act="add-year" data-project="${i}"${canAdd ? '' : ' aria-disabled="true"'}>Add a year to project ${i + 1}</button><button type="button" class="btn btn--small" data-act="remove-year" data-project="${i}"${p.flows.length > 1 ? '' : ' aria-disabled="true"'}>Remove its last year</button>${projects.length > 2 ? `<button type="button" class="btn btn--small" data-act="remove-project" data-project="${i}">Remove project ${i + 1}</button>` : ''}</p></fieldset>`;
    })
    .join('');
}

/** The cost of capital: the seven inputs, and the choice between the WACC and a rate of the reader's own. */
export function rateFieldsHtml(o: { values: Record<string, string>; rateSource: 'wacc' | 'own'; uid: string; currency: string }): string {
  const radios = (['wacc', 'own'] as const)
    .map((v) => `<label class="fl-choice__opt"><input type="radio" name="rateSource" value="${v}"${o.rateSource === v ? ' checked' : ''} data-choice /><span>${v === 'wacc' ? 'Use the WACC worked out below' : 'Use a rate of my own'}</span></label>`)
    .join('');
  const own = fieldHtml({ spec: OWN_RATE, name: 'ownRate', value: o.values.ownRate ?? '', uid: o.uid, currency: o.currency });
  const wacc = WACC_FIELDS.map((f) => fieldHtml({ spec: f, name: `w.${f.key}`, value: o.values[`w.${f.key}`] ?? '', uid: o.uid, currency: o.currency })).join('');
  return `<fieldset class="fl-choice af-choice"><legend>Discount rate</legend>${radios}</fieldset><div class="af-own" data-own${o.rateSource === 'own' ? '' : ' hidden'}>${own}</div><fieldset class="fl-fields af-wacc"><legend class="label label--ink">The weighted average cost of capital</legend>${wacc}</fieldset>`;
}

/* ------------------------------------------------------------------ */
/* The performance dashboard                                           */
/* ------------------------------------------------------------------ */

export interface AccountsValues {
  openingStock: string;
  labels: string[];
  /** By "y<index>.<field>". */
  fields: Record<string, string>;
}

/** The accounts as a grid: one row a line, one column a year, each year's name editable. */
export function accountsGridHtml(v: AccountsValues, uid: string, currency: string, errId: string): string {
  const head = `<tr><th scope="col">Line</th>${v.labels
    .map((l, i) => `<th scope="col" class="n"><label class="sr-only" for="${uid}-y${i}-label">Name of year ${i + 1}</label><input class="input af-grid__year" type="text" autocomplete="off" maxlength="12" id="${uid}-y${i}-label" name="y${i}.label" value="${esc(l)}" data-text aria-describedby="${errId}" /></th>`)
    .join('')}</tr>`;
  const groups = ACCOUNT_FIELDS.map((g) => {
    const rows = g.fields
      .map((f) => {
        const cells = v.labels
          .map((l, i) => {
            const name = `y${i}.${f.key}`;
            return `<td><input class="input input--num fl-grid__cell" type="text"${f.min === undefined ? '' : ' inputmode="decimal"'} autocomplete="off" name="${name}" value="${esc(v.fields[name] ?? '')}" aria-label="${esc(`${f.label}, ${l || `year ${i + 1}`}`)}" aria-describedby="${errId}" aria-invalid="false" data-num /></td>`;
          })
          .join('');
        return `<tr><th scope="row">${esc(f.label)}</th>${cells}</tr>`;
      })
      .join('');
    return `<tbody><tr class="fl-grid__group"><th scope="colgroup" colspan="${v.labels.length + 1}">${esc(g.group)}</th></tr>${rows}</tbody>`;
  }).join('');
  return `<table class="fl-grid af-grid"><caption class="sr-only">Each year’s accounts, in ${esc(currency.trim() || 'currency')}</caption><thead>${head}</thead>${groups}</table>`;
}

export function openingStockHtml(value: string, uid: string, currency: string): string {
  return fieldHtml({ spec: OPENING_STOCK_FIELD, name: 'openingStock', value, uid, currency });
}
