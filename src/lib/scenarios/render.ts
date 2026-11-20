/**
 * A scenario as HTML, drawn by the same code on the server (the worked
 * scenario every reader sees first, and all of it without JavaScript) and in
 * the browser when the reader generates another or checks a step. Without a
 * script, each step's choices are explained in a closed disclosure and the
 * model answer is open; with one, the feedback appears as each step is checked.
 */
import { esc } from '../markup';
import { EXHIBIT_WORDS, VERDICT_WORDS, analysisVerdict, answerWords, calcResult, choiceResult, evidenceResult, fmtAnswer, sortResult, stepVerdicts, type Answers } from './check';
import { STEP_IDS, STEP_TITLES, UNITS, type Choice, type Exhibit, type Question, type Scenario, type StepId, type Verdict } from './types';

export interface RenderContext {
  subtopics: Record<string, { title: string; href: string; hl: boolean }>;
  /** Each toolkit tool's guide or entry in the toolkit. */
  tools: Record<string, { href: string; name: string }>;
}

const TONE: Record<Verdict, string> = { best: 'right', fair: 'partial', weak: 'wrong' };

function exhibitHtml(e: Exhibit, n: number): string {
  const body =
    e.columns && e.rows
      ? `<div class="table-scroll" role="region" aria-label="Exhibit ${n}: ${esc(e.title)}" tabindex="0"><table class="table sg-table"><thead><tr>${e.columns.map((c, i) => `<th scope="col"${i ? ' class="n"' : ''}>${esc(c)}</th>`).join('')}</tr></thead><tbody>${e.rows
          .map((row) => `<tr>${row.map((cell, i) => (i ? `<td class="n">${esc(cell)}</td>` : `<th scope="row">${esc(cell)}</th>`)).join('')}</tr>`)
          .join('')}</tbody></table></div>`
      : `<p class="sg-exhibit__text">${esc(e.body ?? '')}</p>`;
  return `<section class="sg-exhibit${e.columns && e.columns.length >= 4 ? ' sg-exhibit--wide' : ''}" id="sg-${e.id}" aria-labelledby="sg-${e.id}-h"><h4 class="sg-exhibit__h" id="sg-${e.id}-h"><span class="sg-exhibit__no">Exhibit ${n}</span> ${esc(e.title)}</h4>${body}${e.note ? `<p class="sg-exhibit__note">${esc(e.note)}</p>` : ''}</section>`;
}

/** Every choice with its verdict and reason: the "why each answer fits" disclosure. */
function explained(choices: Array<Pick<Choice, 'text' | 'verdict' | 'why'>>): string {
  return `<ul class="sg-why__list">${choices.map((c) => `<li class="sg-why__item sg-why__item--${TONE[c.verdict]}"><span class="sg-why__verdict">${VERDICT_WORDS[c.verdict]}</span> <span class="sg-why__text">${esc(c.text)}</span><span class="sg-why__reason">${esc(c.why)}</span></li>`).join('')}</ul>`;
}

function nojsWhy(title: string, inner: string): string {
  return `<details class="disclosure sg-why nojs-only"><summary>${esc(title)}</summary><div class="disclosure__body">${inner}</div></details>`;
}

function radios(name: string, q: Question | { prompt: string; choices: Choice[] }, legendClass = 'sg-legend'): string {
  return `<fieldset class="sg-choices" data-group="${name}"><legend class="${legendClass}">${esc(q.prompt)}</legend>${q.choices
    .map((c) => `<label class="sg-opt"><input type="radio" name="sg-${name}" value="${esc(c.id)}"><span>${esc(c.text)}</span></label>`)
    .join('')}</fieldset>`;
}

function actions(step: StepId, label = 'Check this step'): string {
  return `<div class="sg-actions js-only"><button type="button" class="btn btn--primary btn--small" data-check="${step}">${esc(label)}</button><span class="field__error" data-msg="${step}" id="sg-msg-${step}"></span></div><div class="sg-feedback" data-feedback="${step}" tabindex="-1"></div>`;
}

function stepShell(step: StepId, n: number, inner: string): string {
  return `<li class="sg-step" data-step="${step}" id="sg-step-${step}"><h3 class="sg-step__h" id="sg-step-${step}-h"><span class="sg-step__no" aria-hidden="true">${n}</span><span class="sr-only">Step ${n}: </span>${esc(STEP_TITLES[step])}</h3><p class="sg-locked js-only" data-locked hidden>Check step ${n - 1} to open this step.</p><div class="sg-step__body" data-body>${inner}</div></li>`;
}

export function headHtml(s: Scenario, ctx: RenderContext): string {
  const subs = s.subtopics
    .map((code) => {
      const t = ctx.subtopics[code];
      return t ? `<a href="${esc(t.href)}">${esc(`${code} ${t.title}`)}</a>${t.hl ? ' <span class="sg-hl">HL</span>' : ''}` : esc(code);
    })
    .join(', ');
  return `<header class="sg-head"><p class="sg-head__kicker"><span class="tag tag--simulated">Fictional</span><span class="sg-code">Scenario <span data-code-text>${esc(s.code)}</span></span>${s.level === 'HL' ? '<span class="tag tag--hl">HL</span>' : '<span class="tag tag--plain">SL and HL</span>'}</p><h2 class="sg-title" id="sg-title" tabindex="-1">${esc(s.title)}</h2><p class="sg-meta">${esc(s.industry)} · ${esc(s.place)} · ${esc(s.size)}</p><p class="sg-course">Unit ${s.unit}, ${esc(UNITS[s.unit])}: ${subs}</p></header>`;
}

export function scenarioHtml(s: Scenario, ctx: RenderContext): string {
  const ex = s.evidence.exhibits;
  const brief = `<div class="sg-brief"><p class="sg-role">${esc(s.role)}</p><div class="prose">${s.brief.map((p) => `<p>${esc(p)}</p>`).join('')}</div><p class="sg-question"><span class="sg-question__label">The decision</span> ${esc(s.question)}</p></div>`;
  const pack = `<section class="sg-pack" aria-labelledby="sg-pack-h"><h3 class="sg-pack__h" id="sg-pack-h">The evidence pack <span class="tag tag--simulated">Simulated data</span></h3><div class="sg-pack__grid">${ex.map((e, i) => exhibitHtml(e, i + 1)).join('')}</div></section>`;

  const problem = stepShell('problem', 1, `${radios('problem', s.problem)}${actions('problem')}${nojsWhy('Why each answer fits or not', explained(s.problem.choices))}`);

  const evidence = stepShell(
    'evidence',
    2,
    `<fieldset class="sg-choices" data-group="evidence"><legend class="sg-legend">${esc(s.evidence.prompt)}</legend>${ex
      .map((e, i) => `<label class="sg-opt sg-opt--check"><input type="checkbox" name="sg-evidence" value="${e.id}"><span>Exhibit ${i + 1}: ${esc(e.title)}</span></label>`)
      .join('')}</fieldset>${actions('evidence')}${nojsWhy(
      'Which exhibits matter, and why',
      `<ul class="sg-why__list">${ex.map((e, i) => `<li class="sg-why__item sg-why__item--${e.relevant ? 'right' : 'wrong'}"><span class="sg-why__verdict">${e.relevant ? 'Relevant' : 'Distractor'}</span> <span class="sg-why__text">Exhibit ${i + 1}: ${esc(e.title)}</span><span class="sg-why__reason">${esc(e.why)}</span></li>`).join('')}</ul>`,
    )}`,
  );

  const tool = stepShell(
    'tool',
    3,
    `${radios('tool', { prompt: s.toolStep.prompt, choices: s.toolStep.choices })}${actions('tool')}${nojsWhy('Why each tool fits or not', explained(s.toolStep.choices))}`,
  );

  const a = s.analysis;
  const calc = a.calc
    ? `<div class="field sg-calc"><label for="sg-calc">${esc(a.calc.prompt)}</label><span class="field__hint" id="sg-calc-hint">Type the figure only${a.calc.dp ? `, to ${a.calc.dp} decimal place${a.calc.dp === 1 ? '' : 's'}` : ''}. Working out on paper first is wise.</span><span class="sg-calc__row">${a.calc.prefix ? `<span class="sg-calc__unit" aria-hidden="true">${esc(a.calc.prefix.trim())}</span>` : ''}<input id="sg-calc" class="input input--num sg-calc__input" type="text" inputmode="decimal" autocomplete="off" aria-describedby="sg-calc-hint sg-msg-analysis" data-calc>${a.calc.suffix ? `<span class="sg-calc__unit" aria-hidden="true">${esc(a.calc.suffix.trim())}</span>` : ''}</span></div>`
    : '';
  const sort = a.sort
    ? `<fieldset class="sg-sort" data-group="sort"><legend class="sg-legend">${esc(a.sort.prompt)}</legend>${a.sort.items
        .map(
          (it) =>
            `<div class="sg-sort__row"><label for="sg-sort-${it.id}" class="sg-sort__text">${esc(it.text)}</label><select id="sg-sort-${it.id}" class="select sg-sort__select" data-sort="${it.id}"><option value="">Choose…</option>${a.sort!.categories.map((c) => `<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('')}</select></div>`,
        )
        .join('')}</fieldset>`
    : '';
  const nojsAnalysis = [
    a.calc ? `<p><strong>${esc(fmtAnswer(a.calc, a.calc.answer))}.</strong> ${esc(a.calc.meaning)}</p><ol class="sg-working">${a.calc.working.map((w) => `<li>${esc(w)}</li>`).join('')}</ol>` : '',
    a.sort ? `<ul class="sg-why__list">${a.sort.items.map((it) => `<li class="sg-why__item sg-why__item--right"><span class="sg-why__verdict">${esc(a.sort!.categories.find((c) => c.id === it.answer)?.label ?? '')}</span> <span class="sg-why__text">${esc(it.text)}</span><span class="sg-why__reason">${esc(it.why)}</span></li>`).join('')}</ul>` : '',
    `<ul class="sg-model-points">${a.model.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>`,
  ].join('');
  const analysis = stepShell(
    'analysis',
    4,
    `<div class="sg-prompt"><p class="sg-legend">Work through it in this order:</p><ol class="sg-prompt__steps">${a.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>${calc}${sort}<div class="field sg-notes js-only"><label for="sg-notes">Your analysis notes</label><span class="field__hint">Optional. Kept on this device with your answers.</span><textarea id="sg-notes" class="textarea" rows="3" maxlength="4000" data-notes></textarea></div>${actions('analysis', a.calc ? 'Check the calculation' : 'Check the analysis')}${nojsWhy('The model analysis', nojsAnalysis)}`,
  );

  const recommend = stepShell(
    'recommend',
    5,
    `${radios('recommend', s.recommend)}<div class="field sg-justify js-only"><label for="sg-justify">${esc(s.recommend.justify)}</label><span class="field__hint" id="sg-justify-hint">At least eight words. Kept on this device.</span><textarea id="sg-justify" class="textarea" rows="4" maxlength="4000" aria-describedby="sg-justify-hint sg-msg-recommend" data-justify></textarea></div>${actions('recommend')}${nojsWhy(
      'Why each recommendation fits or not',
      `${explained(s.recommend.choices)}<p class="sg-criteria__h">A strong justification:</p><ul class="sg-criteria">${s.recommend.criteria.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>`,
    )}`,
  );

  const evaluate = stepShell(
    'evaluate',
    6,
    `${(['stakeholders', 'risk', 'change'] as const).map((k) => radios(k, s.evaluate[k])).join('')}${actions('evaluate', 'Check the evaluation')}${nojsWhy(
      'Why each judgement fits or not',
      (['stakeholders', 'risk', 'change'] as const).map((k) => `<p class="sg-criteria__h">${esc(s.evaluate[k].prompt)}</p>${explained(s.evaluate[k].choices)}`).join(''),
    )}`,
  );

  const model = `<section class="sg-end" data-end aria-labelledby="sg-model-h"><h3 class="sg-end__h" id="sg-model-h" tabindex="-1">The model answer, in outline</h3><p class="sg-locked js-only" data-end-locked hidden>The model answer opens when you have checked all six steps.</p><div data-end-body><dl class="sg-model">${modelRows(s)}</dl><div data-summary></div></div></section>`;

  return `${brief}${pack}<ol class="sg-steps" role="list">${problem}${evidence}${tool}${analysis}${recommend}${evaluate}</ol>${model}`;
}

function modelRows(s: Scenario): string {
  const rows: Array<[StepId, string]> = [
    ['problem', s.model.problem],
    ['evidence', s.model.evidence],
    ['tool', s.model.tool],
    ['analysis', s.model.analysis],
    ['recommend', s.model.recommendation],
    ['evaluate', s.model.evaluation],
  ];
  return rows.map(([k, v], i) => `<div class="sg-model__row"><dt><span class="sg-model__no" aria-hidden="true">${i + 1}</span>${esc(STEP_TITLES[k])}</dt><dd>${esc(v)}</dd></div>`).join('');
}

/* ---------- Feedback, drawn in the browser as each step is checked ---------- */

function verdictBox(v: Verdict, lead: string, body: string): string {
  return `<div class="feedback feedback--${TONE[v]} sg-fb"><p class="feedback__verdict">${esc(lead)}</p>${body}</div>`;
}

function choiceFeedback(q: Question, picked: string | undefined): string {
  const { picked: c, best } = choiceResult(q, picked);
  if (!c) return '';
  const others = q.choices.filter((x) => x.id !== c.id);
  const bestLine = c.verdict === 'best' ? '' : `<p class="sg-fb__best"><strong>The best answer:</strong> ${esc(best.text)}. ${esc(best.why)}</p>`;
  return verdictBox(c.verdict, VERDICT_WORDS[c.verdict], `<p>${esc(c.why)}</p>${bestLine}<details class="sg-fb__more"><summary>Why the other answers fit ${c.verdict === 'best' ? 'less well' : 'as they do'}</summary>${explained(others)}</details>`);
}

export function feedbackHtml(s: Scenario, step: StepId, a: Answers, ctx: RenderContext): string {
  switch (step) {
    case 'problem':
      return choiceFeedback(s.problem, a.problem);
    case 'evidence': {
      const r = evidenceResult(s.evidence.exhibits, a.evidence ?? []);
      const lead = `${r.found} of ${r.relevant} relevant ${r.relevant === 1 ? 'exhibit' : 'exhibits'} chosen${r.distractors ? `, and ${r.distractors} ${r.distractors === 1 ? 'distractor' : 'distractors'}` : ', and no distractors'}`;
      const list = `<ul class="sg-why__list">${r.marks
        .map((m) => {
          const n = s.evidence.exhibits.indexOf(m.exhibit) + 1;
          const tone = m.mark === 'found' || m.mark === 'rightly-left' ? 'right' : 'wrong';
          return `<li class="sg-why__item sg-why__item--${tone}"><span class="sg-why__verdict">${EXHIBIT_WORDS[m.mark]}</span> <span class="sg-why__text">Exhibit ${n}: ${esc(m.exhibit.title)}</span><span class="sg-why__reason">${esc(m.exhibit.why)}</span></li>`;
        })
        .join('')}</ul>`;
      return verdictBox(r.verdict, lead, list);
    }
    case 'tool': {
      const html = choiceFeedback({ prompt: s.toolStep.prompt, choices: s.toolStep.choices }, a.tool);
      const t = ctx.tools[s.tool];
      return t ? html.replace(/<\/div>$/, `<p class="sg-fb__link">Read the toolkit guide: <a href="${esc(t.href)}">${esc(t.name)}</a></p></div>`) : html;
    }
    case 'analysis': {
      const parts: string[] = [];
      if (s.analysis.calc) {
        const r = calcResult(s.analysis.calc, a.calc ?? '');
        parts.push(`<p>${esc(r.message)}</p><p class="sg-fb__sub">The working</p><ol class="sg-working">${s.analysis.calc.working.map((w) => `<li>${esc(w)}</li>`).join('')}</ol>`);
      }
      if (s.analysis.sort) {
        const t = s.analysis.sort;
        const r = sortResult(t, a.sort);
        parts.push(
          `<p>${r.right} of ${t.items.length} placed correctly.</p><ul class="sg-why__list">${t.items
            .map((it, i) => {
              const ok = r.items[i]!.right;
              const right = t.categories.find((c) => c.id === it.answer)?.label ?? '';
              const pickedLabel = t.categories.find((c) => c.id === r.items[i]!.picked)?.label;
              return `<li class="sg-why__item sg-why__item--${ok ? 'right' : 'wrong'}"><span class="sg-why__verdict">${ok ? 'Right' : pickedLabel ? `Not ${esc(pickedLabel.toLowerCase())}` : 'Not placed'}</span> <span class="sg-why__text">${esc(it.text)}</span><span class="sg-why__reason">${ok ? '' : `It belongs in ${esc(right.toLowerCase())}. `}${esc(it.why)}</span></li>`;
            })
            .join('')}</ul>`,
        );
      }
      const verdict = analysisVerdict(s, a);
      parts.push(`<p class="sg-fb__sub">The model analysis</p><ul class="sg-model-points">${s.analysis.model.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>`);
      return verdictBox(verdict, VERDICT_WORDS[verdict], parts.join(''));
    }
    case 'recommend': {
      const html = choiceFeedback(s.recommend, a.recommend);
      return html.replace(/<\/div>$/, `<p class="sg-fb__sub">Check your justification. A strong one:</p><ul class="sg-criteria">${s.recommend.criteria.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>`);
    }
    case 'evaluate':
      return (['stakeholders', 'risk', 'change'] as const).map((k) => `<p class="sg-fb__q">${esc(s.evaluate[k].prompt)}</p>${choiceFeedback(s.evaluate[k], a[k])}`).join('');
  }
}

/** The reader's answers and verdicts, step by step: the summary at the end. */
export function summaryHtml(s: Scenario, a: Answers, checked: readonly StepId[]): string {
  const v = stepVerdicts(s, a, checked);
  const rows = STEP_IDS.map(
    (k, i) => `<tr><th scope="row">${i + 1}. ${esc(STEP_TITLES[k])}</th><td>${esc(answerWords(s, a, k))}</td><td class="sg-summary__v sg-summary__v--${v[k] ? TONE[v[k]!] : 'none'}">${v[k] ? VERDICT_WORDS[v[k]!] : 'Not checked'}</td></tr>`,
  ).join('');
  return `<h3 class="sg-end__h">Your summary, step by step</h3><div class="table-scroll" role="region" aria-label="Your summary, step by step" tabindex="0"><table class="table sg-summary"><thead><tr><th scope="col">Step</th><th scope="col">Your answer</th><th scope="col">Verdict</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
