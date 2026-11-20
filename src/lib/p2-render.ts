/**
 * HTML for Paper 2 practice questions, shared by the server render and the
 * browser script so a generated question looks the same either way. Every
 * string is escaped: nothing typed or generated can become markup.
 *
 * A question is one of three forms: a single figure (the answer box), a
 * choice (radio buttons: the lines of a worked answer, or months, or
 * statements), or a grid (a statement, forecast or schedule with cells to
 * fill). Each has its own answer form, feedback and working, below.
 */
import { fmtNumber } from './format';
import { esc } from './markup';
import { lineChartSvg } from './p2-figures';
import { TASK_LABELS, type CellResult, type GridQuestion, type ChoiceQuestion } from './p2-tasks';
import { formulaSource, isChoice, isGrid, taskOf, type AnswerUnit, type AnyFeedback, type AnyQuestion, type Feedback, type Figure, type PracticeQuestion, type Table } from './p2-practice';

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

/**
 * A chart in a scrolling region that keeps it readable on a narrow screen.
 * The SVG's own ids are replaced with ones made from `uid`, so the same
 * question can appear twice on a page without repeating an id.
 */
export function figureHtml(f: Figure, uid: string): string {
  const own = /aria-labelledby="([^"\s]+)-t /.exec(f.svg)?.[1];
  const svg = own ? f.svg.split(`${own}-t`).join(`${uid}-fig-t`).split(`${own}-d`).join(`${uid}-fig-d`) : f.svg;
  return `<figure class="pp-fig"><div class="pp-fig__scroll" role="region" aria-label="${esc(f.caption)}" tabindex="0">${svg}</div><figcaption class="pp-fig__cap">${esc(f.caption)}</figcaption></figure>`;
}

/** The question itself: who, the figures, any chart, and what to do. `uid` keeps ids unique on the page. */
export function questionHtml(q: AnyQuestion, uid: string): string {
  return [
    `<p class="pp-q__intro">${esc(q.intro)}</p>`,
    ...(q.figure ? [figureHtml(q.figure, uid)] : []),
    ...q.tables.map((t, i) => tableHtml(t, `${uid}-t${i}`)),
    `<p class="pp-q__prompt"><span class="pp-q__ask">${esc(q.prompt)}</span> <span class="pp-q__marks">[${q.marks} ${q.marks === 1 ? 'mark' : 'marks'}]</span></p>`,
  ].join('');
}

/** "Calculate", "Find the slip", "Read the data" or "Construct". */
export const taskLabel = (q: AnyQuestion): string => TASK_LABELS[taskOf(q)];

/* ------------------------------------------------------------------ */
/* Answer forms                                                        */
/* ------------------------------------------------------------------ */

/**
 * The answer form for a question. A single figure gets the answer box; a
 * choice, a group of radio buttons; a grid, a table with a box in each cell to
 * fill and a place beside it for the cell's mark. `main` gives the box the
 * page's own id (pp-answer), for the question at the top of the page.
 */
export function answerHtml(q: AnyQuestion, uid: string, main = false): string {
  if (isChoice(q)) return choiceHtml(q, uid);
  if (isGrid(q)) return gridHtml(q, uid);
  const id = main ? 'pp-answer' : `${uid}-in`;
  const hint = main ? 'pp-answer-hint' : `${uid}-hint`;
  return `<label for="${id}" class="pp-answer__label">Your answer</label><div class="pp-answer__row"><span class="pp-answer__fix" data-prefix aria-hidden="true">${esc(q.prefix)}</span><input class="input input--num pp-answer__in" id="${id}" name="answer" inputmode="decimal" autocomplete="off" aria-describedby="${hint}${main ? ' pp-feedback' : ''}" data-number /><span class="pp-answer__fix" data-suffix aria-hidden="true">${esc(q.suffix)}</span></div><span class="field__hint" id="${hint}" data-hint>For example ${esc(q.example)}. ${esc(q.toleranceText)}</span>`;
}

function choiceHtml(q: ChoiceQuestion, uid: string): string {
  const slip = q.task === 'spot';
  return `<fieldset class="pp-choice${slip ? ' pp-choice--lines' : ''}"><legend class="pp-choice__legend">${esc(q.optionsCaption)}</legend>${q.options
    .map((o) => `<label class="pp-choice__opt" for="${uid}-o-${esc(o.id)}"><input type="radio" name="${uid}-opt" id="${uid}-o-${esc(o.id)}" value="${esc(o.id)}" data-choice /><span class="pp-choice__text">${esc(o.text)}</span><span class="pp-choice__mark" data-choice-mark></span></label>`)
    .join('')}</fieldset>`;
}

function gridHtml(q: GridQuestion, uid: string): string {
  const cells = new Map(q.cells.map((c) => [c.id, c]));
  const cols = q.grid.columns;
  const head = `<thead><tr>${cols.map((c, i) => (i === 0 ? `<th scope="col"><span class="sr-only">Line</span></th>` : `<th scope="col" class="n">${esc(c)}</th>`)).join('')}</tr></thead>`;
  const body = q.grid.rows
    .map((r) => {
      if (r.heading) return `<tr class="pp-t__head"><td colspan="${cols.length}">${esc(r.label)}</td></tr>`;
      const tds = r.slots
        .map((sl) => {
          if ('text' in sl) return `<td class="n">${esc(sl.text)}</td>`;
          const c = cells.get(sl.cell);
          if (!c) return '<td></td>';
          const id = `${uid}-c-${c.id}`;
          const label = c.label;
          if (c.kind === 'pick')
            return `<td class="pp-cell"><select class="select pp-cell__in" id="${id}" data-cell="${esc(c.id)}" aria-label="${esc(label)}" aria-describedby="${id}-m"><option value="">Choose</option>${c.options.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select><span class="pp-cell__m" id="${id}-m" data-cell-mark></span></td>`;
          return `<td class="pp-cell"><input class="input input--num pp-cell__in" id="${id}" inputmode="decimal" autocomplete="off" data-cell="${esc(c.id)}" aria-label="${esc(label)}" aria-describedby="${id}-m" /><span class="pp-cell__m" id="${id}-m" data-cell-mark></span></td>`;
        })
        .join('');
      return `<tr${r.total ? ' class="is-total"' : ''}><th scope="row">${esc(r.label)}</th>${tds}</tr>`;
    })
    .join('');
  const extra = q.cells.filter((c) => !q.grid.rows.some((r) => r.slots.some((sl) => 'cell' in sl && sl.cell === c.id)));
  const extraHtml = extra.length
    ? `<div class="pp-grid__extra">${extra
        .map((c) => {
          const id = `${uid}-c-${c.id}`;
          return `<div class="field pp-grid__field"><label for="${id}">${esc(c.label)}</label><input class="input input--num pp-cell__in" id="${id}" inputmode="decimal" autocomplete="off" data-cell="${esc(c.id)}" aria-describedby="${id}-m" /><span class="pp-cell__m" id="${id}-m" data-cell-mark></span></div>`;
        })
        .join('')}</div>`
    : '';
  const chart = q.chart ? `<div class="pp-grid__chart" data-grid-chart hidden></div>` : '';
  return `<div class="table-scroll pp-grid" role="region" aria-labelledby="${uid}-g" tabindex="0"><table class="table pp-grid__table"><caption id="${uid}-g">${esc(q.grid.caption)}</caption>${head}<tbody>${body}</tbody></table></div>${extraHtml}<p class="field__hint pp-grid__hint">Enter whole figures; a negative figure with a minus sign or in brackets. Each cell is marked when you check.</p>${chart}`;
}

/* ------------------------------------------------------------------ */
/* The working                                                         */
/* ------------------------------------------------------------------ */

/** The full working in the Finance Desk's layout, the reading of the result and the typical wrong answers. */
export function workingHtml(q: PracticeQuestion): string {
  const w = q.working;
  const given = w.given.map((g) => `<li>${esc(g.label)}: <span class="num">${esc(g.value)}</span></li>`).join('');
  const steps = w.steps.map((s) => `<div>${esc(s)}</div>`).join('');
  const slips = q.slips
    .map((s) => `<li><span class="pp-slip__v num">${esc(fmtValue(s.value, q.unit))}</span><span>${s.close ? '<b>Nearly.</b> ' : ''}${esc(s.message)}</span></li>`)
    .join('');
  const src = formulaSource(q.kind);
  return `<dl class="working">
<dt>Given</dt><dd><ul>${given}</ul></dd>
<dt>Formula</dt><dd class="w-math">${esc(w.formula)}</dd>
<dt>Substitution</dt><dd class="w-math">${esc(w.substitution)}</dd>
<dt>Working</dt><dd class="w-math">${steps}</dd>
<dt>Answer</dt><dd><span class="w-answer">${esc(q.answer)}</span>${w.note ? `<p class="small muted pp-note">${esc(w.note)}</p>` : ''}</dd>
<dt>Unit</dt><dd>${esc(w.unit)}</dd>
<dt>What it means</dt><dd>${esc(q.meaning)}</dd>
</dl><p class="pp-src${src.sheet ? ' pp-src--sheet' : ''}"><span class="pp-src__k">${src.sheet ? 'On the formulae sheet' : 'Learn this formula'}</span> ${esc(src.text)}</p>${
    slips
      ? `<div class="pp-slips"><p class="label">Typical wrong answers, and the error behind each</p><ul>${slips}</ul></div>`
      : ''
  }<p class="small muted pp-tol">${esc(q.toleranceText)}</p>`;
}

/** The working for any question: the eight parts for a figure; the slip and the corrected working for a choice; the completed grid for a construction. */
export function workingAnyHtml(q: AnyQuestion, uid: string): string {
  if (isChoice(q)) {
    const corrected = q.corrected?.length ? `<div class="pp-corrected"><p class="label">The working as it should be</p><ol class="w-math">${q.corrected.map((l) => `<li>${esc(l)}</li>`).join('')}</ol></div>` : '';
    return `<div class="pp-explain"><p class="label">The answer: ${esc(q.answerText)}</p><ul>${q.explanation.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>${corrected}<p class="pp-meaning"><b>What it means.</b> ${esc(q.meaning)}</p>`;
  }
  if (isGrid(q)) {
    const cols = q.grid.columns;
    const rows = q.grid.rows
      .map((r, i) =>
        r.heading
          ? `<tr class="pp-t__head"><td colspan="${cols.length}">${esc(r.label)}</td></tr>`
          : `<tr${r.total ? ' class="is-total"' : ''}><th scope="row">${esc(r.label)}</th>${(q.solution[i] ?? []).map((v) => `<td class="n">${esc(v)}</td>`).join('')}</tr>`,
      )
      .join('');
    const extra = q.solution.slice(q.grid.rows.length);
    return `<div class="table-scroll pp-t" role="region" aria-labelledby="${uid}-sol" tabindex="0"><table class="table"><caption id="${uid}-sol">Completed: ${esc(q.grid.caption)}</caption><thead><tr>${cols.map((c, i) => (i === 0 ? '<th scope="col"><span class="sr-only">Line</span></th>' : `<th scope="col" class="n">${esc(c)}</th>`)).join('')}</tr></thead><tbody>${rows}</tbody></table></div>${
      extra.length ? `<ul class="pp-extra">${extra.map((e) => `<li><b>${esc(e[0] ?? '')}:</b> ${esc(e[1] ?? '')}</li>`).join('')}</ul>` : ''
    }<ul class="pp-explain">${q.explanation.map((e) => `<li>${esc(e)}</li>`).join('')}</ul><p class="pp-meaning"><b>What it means.</b> ${esc(q.meaning)}</p>`;
  }
  return workingHtml(q);
}

/* ------------------------------------------------------------------ */
/* Feedback                                                            */
/* ------------------------------------------------------------------ */

/** The verdict on an answer, in words first. */
export function feedbackHtml(f: Feedback, q: PracticeQuestion): string {
  const tone = f.verdict === 'right' ? 'right' : f.verdict === 'close' ? 'partial' : 'wrong';
  const yours = f.value === null ? '' : `<p class="small">Your answer: <span class="num">${esc(fmtValue(f.value, q.unit))}</span>. The answer: <span class="num">${esc(q.answer)}</span>.</p>`;
  return `<div class="feedback feedback--${tone}"><p class="feedback__verdict">${esc(f.headline)}</p><p>${esc(f.detail)}</p>${f.verdict === 'invalid' ? '' : yours}</div>`;
}

/** The verdict on any answer. A grid's cells are marked in the grid itself (see cellMark). */
export function feedbackAnyHtml(f: AnyFeedback, q: AnyQuestion): string {
  if (f.form === 'number' && !isChoice(q) && !isGrid(q)) return feedbackHtml(f, q);
  const tone = f.verdict === 'right' ? 'right' : f.verdict === 'close' ? 'partial' : 'wrong';
  return `<div class="feedback feedback--${tone}"><p class="feedback__verdict">${esc(f.headline)}</p><p>${esc(f.detail)}</p></div>`;
}

export const CELL_WORDS: Record<CellResult['verdict'], string> = {
  right: 'Right',
  own: 'Own figure: method credited',
  close: 'Nearly',
  wrong: 'Not yet',
  blank: 'Empty',
  invalid: 'Not a number',
};

/** The words beside a grid cell once it is checked: its verdict, then why. */
export function cellMark(c: CellResult): string {
  return c.verdict === 'right' ? 'Right' : `${CELL_WORDS[c.verdict]}. ${c.message}`;
}

/**
 * A break-even chart drawn from the reader's own total cost and total revenue
 * cells, beside the fixed costs, so a wrong figure shows as a bent line. A
 * point is left out when its cell cannot be read.
 */
export function gridChartHtml(q: GridQuestion, read: (id: string) => number | null, uid: string): string {
  const ch = q.chart;
  if (!ch) return '';
  const pts = (ids: string[]) => ids.map((id, i) => [ch.outputs[i] ?? 0, read(id)] as const).filter((p): p is readonly [number, number] => p[1] !== null).map(([x, y]) => [x, y] as [number, number]);
  const tc = pts(ch.tc);
  const tr = pts(ch.tr);
  const xmax = ch.outputs[ch.outputs.length - 1] ?? 1;
  const top = Math.max(ch.fixed, ...tc.map((p) => p[1]), ...tr.map((p) => p[1]), 1);
  const steps = [1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000, 200000, 250000, 500000, 1000000];
  const ystep = steps.find((s) => top / s <= 8) ?? 1000000;
  const svg = lineChartSvg({
    id: `${uid}-bec`,
    title: 'Your break-even chart, from your figures',
    desc: `Fixed costs ${fmtNumber(ch.fixed)} at every output. Your total costs: ${tc.map(([x, y]) => `${fmtNumber(x)} gives ${fmtNumber(y)}`).join('; ') || 'none entered'}. Your total revenue: ${tr.map(([x, y]) => `${fmtNumber(x)} gives ${fmtNumber(y)}`).join('; ') || 'none entered'}.`,
    x: { max: xmax, step: ch.outputs[1] ?? xmax, label: `Output (${ch.unitsLabel} a year)` },
    y: { max: Math.ceil((top * 1.05) / ystep) * ystep, step: ystep, label: 'Costs and revenue ($)' },
    series: [
      { tone: 'fixed', label: 'Fixed costs', points: [[0, ch.fixed], [xmax, ch.fixed]], dashed: true },
      ...(tc.length > 1 ? [{ tone: 'cost' as const, label: 'Your total costs', points: tc }] : []),
      ...(tr.length > 1 ? [{ tone: 'revenue' as const, label: 'Your total revenue', points: tr }] : []),
    ],
  });
  return figureHtml({ svg, caption: 'Your break-even chart, drawn from the figures in your grid. Where your lines cross is your break-even point; on paper, label it and mark the margin of safety.' }, `${uid}-chart`);
}

/** A choice or grid task as print: the options as a list and the grid with its gaps, for the worked set, where nothing is checked. */
export function answerStaticHtml(q: AnyQuestion, uid: string): string {
  if (isChoice(q)) return `<div class="pp-static"><p class="label">${esc(q.optionsCaption)}</p><ol class="pp-static__list">${q.options.map((o) => `<li>${esc(o.text)}</li>`).join('')}</ol></div>`;
  if (!isGrid(q)) return '';
  const cols = q.grid.columns;
  const rows = q.grid.rows
    .map((r) =>
      r.heading
        ? `<tr class="pp-t__head"><td colspan="${cols.length}">${esc(r.label)}</td></tr>`
        : `<tr${r.total ? ' class="is-total"' : ''}><th scope="row">${esc(r.label)}</th>${r.slots.map((sl) => ('text' in sl ? `<td class="n">${esc(sl.text)}</td>` : '<td class="n pp-static__gap"><span class="sr-only">To complete</span><span aria-hidden="true">?</span></td>')).join('')}</tr>`,
    )
    .join('');
  return `<div class="table-scroll pp-t" role="region" aria-labelledby="${uid}-sg" tabindex="0"><table class="table"><caption id="${uid}-sg">To complete: ${esc(q.grid.caption)}</caption><thead><tr>${cols.map((c, i) => (i === 0 ? '<th scope="col"><span class="sr-only">Line</span></th>' : `<th scope="col" class="n">${esc(c)}</th>`)).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
}
