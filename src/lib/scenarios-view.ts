/**
 * HTML for the scenario choices, shared by the server and the browser.
 */
import { esc } from './markup';
import { FIT_LABEL, bestFor, type ChoiceScore, type Scenario, type ScenarioOption } from './scenarios';

const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`);

/** What happens with the option chosen, and what the situation calls for. */
export function resultHtml(s: Scenario & { debrief: string }, options: ScenarioOption[], chosen: string): string {
  const o = s.outcomes[chosen];
  if (!o) return '';
  const label = (id: string) => options.find((x) => x.id === id)?.label ?? id;
  const best = bestFor(s, options);
  return `<div class="sc-result sc-result--${o.fit}"><p class="sc-result__verdict">${FIT_LABEL[o.fit]}: ${esc(label(chosen))}</p><p class="sc-result__headline">${esc(o.headline)}</p><p>${esc(o.consequence)}</p><p class="sc-result__debrief"><strong>What the situation calls for.</strong> ${esc(s.debrief)}</p>${o.fit === 'strong' ? '' : `<p class="sc-result__best">Strong fit here: ${esc(list(best.map(label)))}.</p>`}</div>`;
}

export function summaryRowsHtml(scenarios: Scenario[], options: ScenarioOption[], choices: Record<string, string | undefined>): string {
  const label = (id: string | undefined) => (id ? (options.find((x) => x.id === id)?.label ?? id) : '');
  return scenarios
    .map((s, k) => {
      const c = choices[s.id];
      const o = c ? s.outcomes[c] : undefined;
      return `<tr${o ? ` class="is-${o.fit}"` : ''}><th scope="row"><a href="#sc-${esc(s.id)}">${k + 1}. ${esc(s.title)}</a></th><td>${c ? esc(label(c)) : '<span class="muted">Not chosen yet</span>'}</td><td>${o ? FIT_LABEL[o.fit] : ''}</td><td>${esc(bestFor(s, options).map(label).join(' or '))}</td></tr>`;
    })
    .join('');
}

const fig = (k: string, v: string, note?: string) => `<div class="fig"><dt>${esc(k)}</dt><dd><span class="fig__v">${v}</span>${note ? `<span class="fig__n">${esc(note)}</span>` : ''}</dd></div>`;

export function scoreFiguresHtml(sc: ChoiceScore, noun: { one: string; many: string }): string {
  return [
    fig('Answered', `${sc.answered} of ${sc.total}`),
    fig('Points', `${sc.points} of ${sc.max}`, 'strong 2, workable 1, poor 0'),
    fig('Strong fits', String(sc.strong), `${sc.workable} workable, ${sc.weak} poor`),
    fig(`Different ${noun.many} used`, String(sc.distinct), `of ${Object.keys(sc.counts).length}`),
  ].join('');
}
