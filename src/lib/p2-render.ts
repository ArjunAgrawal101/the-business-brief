/**
 * HTML for Paper 2 practice questions, shared by the server render and the
 * browser script so a generated question looks the same either way. Every
 * string is escaped: nothing typed or generated can become markup.
 */
import { fmtNumber } from './format';
import { esc } from './markup';
import type { AnswerUnit, Feedback, PracticeQuestion, Table } from './p2-practice';

/** A value in the question's own unit: "$1,250", "18.25%", "42.50 days", "2.40 years". */
export function fmtValue(v: number, unit: AnswerUnit): string {
  const dp = (x: number) => (Number.isInteger(Math.round(x * 1e6) / 1e6) ? 0 : 2);
  const sign = v < 0 ? '−' : '';
  const a = Math.abs(v);
  switch (unit) {
    case 'money':
      return `${sign}$${fmtNumber(a, dp(a))}`;
    case 'money000':
      return `${sign}${fmtNumber(a, dp(a))} ($000)`;
    case 'units':
      return `${sign}${fmtNumber(a, dp(a))}`;
    case 'percent':
      return `${sign}${fmtNumber(a, 2)}%`;
    case 'ratio':
      return `${sign}${fmtNumber(a, 2)}`;
    case 'times':
      return `${sign}${fmtNumber(a, 2)} times`;
    case 'days':
      return `${sign}${fmtNumber(a, 2)} days`;
    case 'years':
      return `${sign}${fmtNumber(a, 2)} years`;
  }
}

function tableHtml(t: Table, id: string): string {
  const cols = t.columns.length;
  const head = cols
    ? `<thead><tr>${t.columns.map((c, i) => (i === 0 ? `<th scope="col"><span class="sr-only">Item</span></th>` : `<th scope="col" class="n">${esc(c)}</th>`)).join('')}</tr></thead>`
    : '';
  const width = Math.max(cols ? cols - 1 : 1, ...t.rows.map((r) => r.cells.length));
  const body = t.rows
    .map((r) => {
      if (r.heading) return `<tr class="pp-t__head"><td colspan="${width + 1}">${esc(r.label)}</td></tr>`;
      return `<tr${r.total ? ' class="is-total"' : ''}><th scope="row">${esc(r.label)}</th>${r.cells.map((c) => `<td class="n">${esc(c)}</td>`).join('')}</tr>`;
    })
    .join('');
  return `<div class="table-scroll pp-t" role="region" aria-labelledby="${id}" tabindex="0"><table class="table"><caption id="${id}">${esc(t.caption)}</caption>${head}<tbody>${body}</tbody></table></div>`;
}

/** The question itself: who, the figures, and what to calculate. `uid` keeps ids unique on the page. */
export function questionHtml(q: PracticeQuestion, uid: string): string {
  return [
    `<p class="pp-q__intro">${esc(q.intro)}</p>`,
    ...q.tables.map((t, i) => tableHtml(t, `${uid}-t${i}`)),
    `<p class="pp-q__prompt"><span class="pp-q__ask">${esc(q.prompt)}</span> <span class="pp-q__marks">[${q.marks} ${q.marks === 1 ? 'mark' : 'marks'}]</span></p>`,
  ].join('');
}

/** The full working in the Finance Desk's layout, the reading of the result and the typical wrong answers. */
export function workingHtml(q: PracticeQuestion): string {
  const w = q.working;
  const given = w.given.map((g) => `<li>${esc(g.label)}: <span class="num">${esc(g.value)}</span></li>`).join('');
  const steps = w.steps.map((s) => `<div>${esc(s)}</div>`).join('');
  const slips = q.slips
    .map((s) => `<li><span class="pp-slip__v num">${esc(fmtValue(s.value, q.unit))}</span><span>${s.close ? '<b>Nearly.</b> ' : ''}${esc(s.message)}</span></li>`)
    .join('');
  return `<dl class="working">
<dt>Given</dt><dd><ul>${given}</ul></dd>
<dt>Formula</dt><dd class="w-math">${esc(w.formula)}</dd>
<dt>Substitution</dt><dd class="w-math">${esc(w.substitution)}</dd>
<dt>Working</dt><dd class="w-math">${steps}</dd>
<dt>Answer</dt><dd><span class="w-answer">${esc(q.answer)}</span>${w.note ? `<p class="small muted pp-note">${esc(w.note)}</p>` : ''}</dd>
<dt>Unit</dt><dd>${esc(w.unit)}</dd>
<dt>What it means</dt><dd>${esc(q.meaning)}</dd>
</dl>${
    slips
      ? `<div class="pp-slips"><p class="label">Typical wrong answers, and the error behind each</p><ul>${slips}</ul></div>`
      : ''
  }<p class="small muted pp-tol">${esc(q.toleranceText)}</p>`;
}

/** The verdict on an answer, in words first. */
export function feedbackHtml(f: Feedback, q: PracticeQuestion): string {
  const tone = f.verdict === 'right' ? 'right' : f.verdict === 'close' ? 'partial' : 'wrong';
  const yours = f.value === null ? '' : `<p class="small">Your answer: <span class="num">${esc(fmtValue(f.value, q.unit))}</span>. The answer: <span class="num">${esc(q.answer)}</span>.</p>`;
  return `<div class="feedback feedback--${tone}"><p class="feedback__verdict">${esc(f.headline)}</p><p>${esc(f.detail)}</p>${f.verdict === 'invalid' ? '' : yours}</div>`;
}
