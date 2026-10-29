/**
 * HTML and text for the decision tree lab, shared by the server render and
 * the browser script so the two can never disagree.
 */
import { evaluateOption, expectedValueWorking, treeMoney, type TreeOption, type TreeResult } from './decision-tree';
import { esc } from './markup';
import { workingHtml } from './render';

const r2 = (v: number) => Math.round(v * 100) / 100;

export function treeTableHtml(tree: TreeResult, options: TreeOption[], cur: string, unit: string): string {
  const m = (v: number) => esc(treeMoney(r2(v), cur, unit));
  return tree.options
    .map((r, k) => {
      const op = options[k];
      const lead = r.id === tree.bestId;
      if (!r.valid) {
        return `<tr class="is-invalid"><th scope="row">${esc(r.label)}</th><td colspan="5" class="field__error">${esc(r.problems.join(' '))}</td></tr>`;
      }
      return `<tr${lead ? ' class="is-lead"' : ''}><th scope="row">${esc(r.label)}${lead ? ' <span class="tag tag--plain">Highest</span>' : ''}</th><td class="n">${m(r.expectedPayoff)}</td><td class="n">${op ? m(op.cost) : ''}</td><td class="n"><strong>${m(r.expectedValue)}</strong></td><td class="n">${m(r.worst)}</td><td class="n">${m(r.best)}</td></tr>`;
    })
    .join('');
}

export function treeReading(options: TreeOption[], tree: TreeResult, cur: string, unit: string): string {
  const m = (v: number) => treeMoney(r2(v), cur, unit);
  const valid = tree.options.filter((r) => r.valid);
  if (valid.length < tree.options.length) return 'Fix the probabilities marked in red: at each chance node they must add up to 1.';
  if (tree.tie) return 'Two or more routes have the same expected value, so the numbers alone cannot separate them.';
  const ranked = [...valid].sort((a, b) => b.expectedValue - a.expectedValue);
  const [best, second] = ranked;
  if (!best) return '';
  let text = `On these estimates ${best.label.toLowerCase()} has the highest expected value, ${m(best.expectedValue)}`;
  if (second) text += `, ${m(best.expectedValue - second.expectedValue)} more than ${second.label.toLowerCase()}`;
  text += '.';
  const byPayoff = [...valid].sort((a, b) => b.expectedPayoff - a.expectedPayoff)[0];
  if (byPayoff && byPayoff.id !== best.id) {
    text += ` ${byPayoff.label} has the highest expected payoff (${m(byPayoff.expectedPayoff)}) but also costs ${m(options.find((o) => o.id === byPayoff.id)?.cost ?? 0)}, which is why the cost must be subtracted.`;
  }
  const safest = [...valid].sort((a, b) => b.worst - a.worst)[0];
  if (safest && safest.id !== best.id) text += ` ${safest.label} has the best worst case (${m(safest.worst)}).`;
  return text;
}

export function treeWorkingsHtml(options: TreeOption[], tree: TreeResult, cur: string, unit: string): string {
  return options
    .map((op) => {
      const r = evaluateOption(op);
      const open = op.id === tree.bestId ? ' open' : '';
      const head = `${esc(op.label)}: expected value ${r.valid ? esc(treeMoney(r2(r.expectedValue), cur, unit)) : 'not valid'}`;
      const body = workingHtml(
        expectedValueWorking(op, cur, unit),
        'The average result over many repetitions of this decision, after the cost of the route.',
        'Compare it with the other routes, then with their risks and with the evidence the numbers leave out.',
      );
      return `<details class="disclosure"${open}><summary>${head}</summary><div class="disclosure__body">${body}</div></details>`;
    })
    .join('');
}

/** Feedback on a prediction of the route with the highest expected value. */
export function predictionFeedback(predicted: string, options: TreeOption[], tree: TreeResult, cur: string, unit: string): { verdict: 'right' | 'wrong'; html: string } {
  const m = (v: number) => esc(treeMoney(r2(v), cur, unit));
  const best = tree.options.find((r) => r.id === tree.bestId);
  const pick = tree.options.find((r) => r.id === predicted);
  if (!best || !pick) return { verdict: 'wrong', html: '<p>The tree has no single highest expected value at the moment.</p>' };
  if (pick.id === best.id) {
    return {
      verdict: 'right',
      html: `<p class="feedback__verdict">Right</p><p>${esc(best.label)} has the highest expected value, ${m(best.expectedValue)}. Now ask whether the highest expected value should decide.</p>`,
    };
  }
  const cost = options.find((o) => o.id === pick.id)?.cost ?? 0;
  const forgotCost = pick.expectedPayoff > best.expectedPayoff;
  return {
    verdict: 'wrong',
    html: `<p class="feedback__verdict">Not this time</p><p>${esc(best.label)} has the highest expected value, ${m(best.expectedValue)}, against ${m(pick.expectedValue)} for ${esc(pick.label.toLowerCase())}.${
      forgotCost
        ? ` ${esc(pick.label)} has the higher expected payoff, ${m(pick.expectedPayoff)}, but it costs ${m(cost)}. Forgetting to subtract the cost is the most common error in decision trees.`
        : ''
    }</p>`,
  };
}

/** One sentence on which route leads across the range of the shared probability. */
export function rangesText(ranges: Array<{ label: string; from: number; to: number }>, state: string): string {
  if (!ranges.length) return '';
  const st = state.toLowerCase();
  const p = (v: number) => String(Math.round(v * 100) / 100);
  if (ranges.length === 1) return `${ranges[0]?.label} has the highest expected value whatever the probability of ${st}.`;
  const parts = ranges.map((r, k) => {
    if (k === 0) return `${r.label} leads when the probability of ${st} is below ${p(r.to)}`;
    if (k === ranges.length - 1) return `${r.label.toLowerCase()} leads above ${p(r.from)}`;
    return `${r.label.toLowerCase()} leads between ${p(r.from)} and ${p(r.to)}`;
  });
  return `${parts.join('; ')}.`;
}
