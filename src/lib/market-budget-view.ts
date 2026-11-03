/** HTML and charts for the budget allocation tool, shared by the server render and the browser script. */
import { esc } from './markup';
import { fmtMoney, fmtNumber } from './format';
import { C, responseSvg } from './market-charts';
import { fig, numberField, removeButton, textField } from './market-view';
import { customers, type BudgetChannel, type BudgetState, type BudgetView } from './market-budget';

const COLOURS = [C.ink, C.cobalt, C.green, C.gold, C.signal, '#6A4C93', '#2E6B8F', '#A4552A', '#5B6678', '#1E355F'];
const DASHES = ['', '7 4', '2 3', '10 3 2 3', '4 2', '', '7 4', '2 3', '10 3 2 3', '4 2'];

export function budgetRowHtml(c: BudgetChannel, i: number, uid: string, s: BudgetState): string {
  const id = (k: string) => `${uid}-bc-${c.id}-${k}`;
  const who = c.name.trim() || `channel ${i + 1}`;
  return `<tr data-row="${esc(c.id)}">
<td>${textField({ id: id('name'), f: 'name', label: `Channel ${i + 1}: name`, value: c.name, srLabel: true, max: 60 })}</td>
<td class="n">${numberField({ id: id('spend'), f: 'spend', label: `${who}: your spend`, value: c.spend, min: 0, step: '10', srLabel: true, prefix: s.currency })}</td>
<td class="n">${numberField({ id: id('audience'), f: 'audience', label: `${who}: audience it could reach`, value: c.audience, min: 1, step: '10', srLabel: true })}</td>
<td class="n">${numberField({ id: id('k'), f: 'k', label: `${who}: spend that reaches about two thirds of it`, value: c.k, min: 1, step: '10', srLabel: true, prefix: s.currency })}</td>
<td class="n">${numberField({ id: id('conversion'), f: 'conversion', label: `${who}: share of people reached who buy`, value: c.conversion, min: 0, max: 100, step: '0.1', srLabel: true, suffix: '%' })}</td>
<td class="mk-cell-act">${removeButton('Remove', who)}</td>
</tr>`;
}

export function budgetFiguresHtml(v: BudgetView, s: BudgetState): string {
  const m = (x: number) => fmtMoney(x, s.currency, 0);
  const gain = v.suggested.customers - v.yours.customers;
  return [
    fig('Your split spends', esc(m(v.yours.spend)), v.unallocated >= 0 ? `${m(v.unallocated)} left of ${m(s.budget)}` : `${m(-v.unallocated)} over the budget`),
    fig('New customers, your split', esc(fmtNumber(v.yours.customers, 0)), `reaching about ${fmtNumber(v.yours.reach, 0)} people, some more than once`),
    fig('Average cost per customer', esc(v.yours.cpa === null ? 'n/a' : fmtMoney(v.yours.cpa, s.currency, 2)), 'spend ÷ new customers'),
    fig('Suggested split', esc(fmtNumber(v.suggested.customers, 0)), gain > 0.5 ? `about ${fmtNumber(gain, 0)} more customers for the same budget` : 'no better than yours on this model'),
  ].join('');
}

export function budgetResultRowsHtml(v: BudgetView, s: BudgetState): string {
  const money2 = (x: number | null) => (x === null ? 'n/a' : esc(fmtMoney(x, s.currency, 2)));
  return v.yours.results
    .map((r, i) => {
      const g = v.suggested.results[i];
      return `<tr><th scope="row">${esc(r.name || 'Unnamed')}</th><td class="n">${esc(fmtMoney(r.spend, s.currency, 0))}</td><td class="n">${esc(fmtNumber(r.reach, 0))}</td><td class="n">${esc(fmtNumber(r.customers, 1))}</td><td class="n">${money2(r.cpa)}</td><td class="n"><b>${money2(r.marginalCpa)}</b></td><td class="n">${esc(fmtNumber(r.first100, 1))} then ${esc(fmtNumber(r.next100, 1))}</td><td class="n">${esc(fmtMoney(g?.spend ?? 0, s.currency, 0))}</td></tr>`;
    })
    .join('');
}

export function responseChart(s: BudgetState, id: string): string {
  const xMax = Math.max(s.budget, ...s.channels.map((c) => c.spend), 1);
  const curves = s.channels.map((c, i) => ({ label: c.name || `Channel ${i + 1}`, f: (x: number) => customers(c, x), at: c.spend, color: COLOURS[i % COLOURS.length] ?? C.ink, dash: DASHES[i % DASHES.length] || undefined }));
  const desc = `New customers each channel would win for any spend from nothing to ${fmtMoney(xMax, s.currency, 0)}, on the model's assumptions. Every curve rises steeply at first and then flattens: diminishing returns. ${s.channels
    .map((c) => `${c.name || 'A channel'}: ${fmtNumber(customers(c, c.spend), 1)} customers at your spend of ${fmtMoney(c.spend, s.currency, 0)}, and at most ${fmtNumber((c.audience * c.conversion) / 100, 0)} however much is spent`)
    .join('; ')}.`;
  return responseSvg({ id, title: 'Response curves: new customers by spend', desc, curves, xMax, xLabel: `Spend in the channel (${s.currency})`, yLabel: 'New customers', xFormat: (v) => fmtMoney(v, s.currency, 0) });
}

/** The sentence that makes the diminishing returns explicit, for the channel with the largest gap between its first and its next hundred. */
export function diminishingHtml(v: BudgetView, s: BudgetState): string {
  const used = v.yours.results.filter((r) => r.spend > 0);
  if (!used.length) return '';
  const r = used.reduce((a, b) => (b.first100 - b.next100 > a.first100 - a.next100 ? b : a));
  return esc(`Diminishing returns: the first ${fmtMoney(100, s.currency, 0)} on ${r.name} wins about ${fmtNumber(r.first100, 1)} customers; at your spend of ${fmtMoney(r.spend, s.currency, 0)}, the next ${fmtMoney(100, s.currency, 0)} wins about ${fmtNumber(r.next100, 1)}.`);
}
