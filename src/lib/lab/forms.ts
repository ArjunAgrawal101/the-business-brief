/**
 * Markup for the lab's editable grids: the cash flow forecast's lines and
 * months, the budget's revenue and cost lines, and a project's years. The
 * server renders the example with these functions and the browser re-renders
 * with them when the reader adds or removes a line, a month or a year, so the
 * two never differ. Values are kept as the reader typed them (strings), so a
 * half-typed figure survives a re-render.
 */
import { esc } from '../markup';
import { monthLabels } from './cash';

export interface GridLine {
  id: string;
  label: string;
  values: string[];
}

export interface CashModel {
  startMonth: number;
  months: number;
  inflows: GridLine[];
  outflows: GridLine[];
}

const num = (name: string, value: string, label: string, describedBy: string, negative = false) =>
  `<input class="input input--num lab-grid__cell" type="text" ${negative ? '' : 'inputmode="decimal" '}autocomplete="off" name="${esc(name)}" value="${esc(value)}" aria-label="${esc(label)}" aria-describedby="${esc(describedBy)}" aria-invalid="false" data-num />`;

const removeBtn = (id: string, label: string) =>
  `<button type="button" class="lab-grid__remove" data-act="remove-line" data-line="${esc(id)}" aria-label="${esc(`Remove ${label || 'this line'}`)}"><span aria-hidden="true">×</span></button>`;

function cashRows(lines: GridLine[], kind: 'inflow' | 'outflow', months: string[], errId: string): string {
  return lines
    .map((l, k) => {
      const name = l.label || `${kind === 'inflow' ? 'Inflow' : 'Outflow'} ${k + 1}`;
      const cells = months.map((m, i) => `<td>${num(`${l.id}.m${i}`, l.values[i] ?? '0', `${name}, ${m}`, errId)}</td>`).join('');
      return `<tr data-line="${esc(l.id)}"><th scope="row"><input class="input lab-grid__label" type="text" autocomplete="off" maxlength="60" name="${esc(l.id)}.label" value="${esc(l.label)}" aria-label="${esc(`Name of ${kind} ${k + 1}`)}" aria-describedby="${esc(errId)}" aria-invalid="false" data-text /></th>${cells}<td class="lab-grid__x">${removeBtn(l.id, l.label)}</td></tr>`;
    })
    .join('');
}

/** The forecast's lines as a grid: one row a line, one column a month. */
export function cashGridHtml(m: CashModel, errId: string): string {
  const months = monthLabels(m.startMonth, m.months);
  const span = months.length + 2;
  const head = `<tr><th scope="col">Line</th>${months.map((x) => `<th scope="col" class="n">${esc(x.slice(0, 3))}<span class="sr-only">${esc(x.slice(3))}</span></th>`).join('')}<th scope="col"><span class="sr-only">Remove a line</span></th></tr>`;
  return `<table class="lab-grid"><caption class="sr-only">Cash inflows and outflows by month</caption><thead>${head}</thead><tbody data-lines="inflows"><tr class="lab-grid__group"><th scope="colgroup" colspan="${span}">Cash inflows</th></tr>${cashRows(m.inflows, 'inflow', months, errId)}</tbody><tbody data-lines="outflows"><tr class="lab-grid__group"><th scope="colgroup" colspan="${span}">Cash outflows</th></tr>${cashRows(m.outflows, 'outflow', months, errId)}</tbody></table>`;
}

export interface BudgetModel {
  lines: Array<{ id: string; label: string; kind: 'revenue' | 'cost'; budget: string; actual: string }>;
}

/** The budget's lines as a grid, revenues then costs, as in the guide's layout. */
export function budgetGridHtml(m: BudgetModel, errId: string): string {
  const rows = (kind: 'revenue' | 'cost') =>
    m.lines
      .filter((l) => l.kind === kind)
      .map((l, k) => {
        const name = l.label || `${kind === 'revenue' ? 'Revenue' : 'Cost'} line ${k + 1}`;
        return `<tr data-line="${esc(l.id)}" data-kind="${kind}"><th scope="row"><input class="input lab-grid__label" type="text" autocomplete="off" maxlength="60" name="${esc(l.id)}.label" value="${esc(l.label)}" aria-label="${esc(`Name of ${kind} line ${k + 1}`)}" aria-describedby="${esc(errId)}" aria-invalid="false" data-text /></th><td>${num(`${l.id}.budget`, l.budget, `${name}, budgeted`, errId)}</td><td>${num(`${l.id}.actual`, l.actual, `${name}, actual`, errId)}</td><td class="lab-grid__x">${removeBtn(l.id, l.label)}</td></tr>`;
      })
      .join('');
  const head = '<tr><th scope="col">Line</th><th scope="col" class="n">Budgeted</th><th scope="col" class="n">Actual</th><th scope="col"><span class="sr-only">Remove a line</span></th></tr>';
  return `<table class="lab-grid lab-grid--budget"><caption class="sr-only">Budgeted and actual figures by line</caption><thead>${head}</thead><tbody data-kind="revenue"><tr class="lab-grid__group"><th scope="colgroup" colspan="4">Revenue</th></tr>${rows('revenue')}</tbody><tbody data-kind="cost"><tr class="lab-grid__group"><th scope="colgroup" colspan="4">Costs</th></tr>${rows('cost')}</tbody></table>`;
}

/** A project's years: one field a year, with its error beside it. */
export function yearsHtml(values: string[], uid: string, currency: string): string {
  return values
    .map((v, k) => {
      const id = `${uid}-r${k + 1}`;
      return `<li class="field lab-year"><label for="${id}">Net cash flow, year ${k + 1}</label><div class="affix"><span class="affix__pre" aria-hidden="true" data-affix="currency">${esc(currency.trim())}</span><input class="input input--num" type="text" autocomplete="off" id="${id}" name="r${k + 1}" value="${esc(v)}" aria-describedby="${id}-err" aria-invalid="false" data-num /></div><span class="field__error" id="${id}-err" data-err="r${k + 1}"></span></li>`;
    })
    .join('');
}
