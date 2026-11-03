/** HTML for the questionnaire builder, shared by the server render and the browser script. */
import { esc } from './markup';
import { fmtNumber } from './format';
import { checksHtml, moveButtons, numberField, removeButton, textField } from './market-view';
import { METHOD_LABELS, QTYPE_LABELS, QUESTION_TYPES, hasOptions, questionChecks, samplingNotes, type Question, type QuestionnaireState, type Quota } from './market-research';

export function questionRowHtml(q: Question, i: number, total: number, uid: string): string {
  const id = (k: string) => `${uid}-q-${q.id}-${k}`;
  const n = i + 1;
  const flags = questionChecks(q, n);
  const typeOpts = QUESTION_TYPES.map((t) => `<option value="${t}"${t === q.type ? ' selected' : ''}>${esc(QTYPE_LABELS[t].label)}</option>`).join('');
  const level = flags.some((f) => f.level === 'conflict') ? 'conflict' : flags.some((f) => f.level === 'tension') ? 'tension' : 'clear';
  return `<fieldset class="mk-row mk-q mk-q--${q.type}${hasOptions(q.type) ? ' has-options' : ''}" data-row="${esc(q.id)}" data-level="${level}">
<legend class="mk-row__legend"><span class="mk-row__no">${n}</span> Question ${n} <span class="mk-q__data">${esc(QTYPE_LABELS[q.type].data === 'qualitative' ? 'Qualitative' : 'Quantitative')}</span></legend>
<div class="mk-row__grid">
<div class="field mk-field mk-span-2"><label for="${esc(id('text'))}">Question ${n}: wording</label><textarea class="textarea mk-area" rows="2" maxlength="400" id="${esc(id('text'))}" data-f="text" aria-describedby="${esc(id('flags'))} ${esc(id('text'))}-err">${esc(q.text)}</textarea><span class="field__error" id="${esc(id('text'))}-err"></span></div>
<div class="field mk-field"><label for="${esc(id('type'))}">Type</label><select class="select" id="${esc(id('type'))}" data-f="type">${typeOpts}</select></div>
<label class="mk-check mk-q__req" for="${esc(id('required'))}"><input type="checkbox" id="${esc(id('required'))}" data-f="required"${q.required ? ' checked' : ''} /><span>Answer required</span></label>
<div class="field mk-field mk-span-2 mk-q__options"><label for="${esc(id('options'))}">Options, one per line</label><textarea class="textarea mk-area" rows="${Math.min(6, Math.max(3, q.options.length))}" maxlength="1500" id="${esc(id('options'))}" data-f="options">${esc(q.options.join('\n'))}</textarea></div>
<div class="mk-q__scale mk-span-2">${textField({ id: id('low'), f: 'low', label: 'Label for 1, the low end', value: q.low, max: 40 })}${textField({ id: id('high'), f: 'high', label: 'Label for 5, the high end', value: q.high, max: 40 })}</div>
</div>
<div class="mk-q__flags" id="${esc(id('flags'))}" data-flags>${flags.length ? checksHtml(flags) : '<p class="mk-q__clear small">No flags from the checks.</p>'}</div>
<p class="mk-row__actions">${moveButtons(`question ${n}`, i === 0, i === total - 1)}${removeButton('Remove question', `question ${n}`)}</p>
</fieldset>`;
}

export function quotaRowHtml(q: Quota, i: number, uid: string): string {
  const id = (k: string) => `${uid}-quota-${q.id}-${k}`;
  return `<div class="mk-quota" data-row="${esc(q.id)}">${textField({ id: id('group'), f: 'group', label: `Quota group ${i + 1}`, value: q.group, max: 60, srLabel: true })}${numberField({ id: id('share'), f: 'share', label: `Quota group ${i + 1}: share of the population`, value: q.share, min: 0, max: 100, step: '0.1', suffix: '%', srLabel: true })}${removeButton('Remove', `quota group ${i + 1}`)}</div>`;
}

/** The sampling panel: what the method means, the notes, the quota table and the margin of error. */
export function samplingHtml(s: QuestionnaireState): string {
  const sm = samplingNotes(s);
  const quota = sm.quotas.length
    ? `<div class="table-scroll" role="region" aria-label="Interviews per quota group" tabindex="0"><table class="table"><caption class="sr-only">Interviews in each quota group</caption><thead><tr><th scope="col">Group</th><th scope="col" class="n">Share of population</th><th scope="col" class="n">Interviews</th></tr></thead><tbody>${sm.quotas
        .map((q) => `<tr><th scope="row">${esc(q.group || 'Unnamed group')}</th><td class="n">${esc(fmtNumber(q.share, Number.isInteger(q.share) ? 0 : 1))}%</td><td class="n">${esc(fmtNumber(q.count))}</td></tr>`)
        .join('')}<tr class="is-total"><th scope="row">Sample</th><td class="n">${esc(fmtNumber(sm.quotas.reduce((n, q) => n + q.share, 0), 1))}%</td><td class="n">${esc(fmtNumber(sm.quotas.reduce((n, q) => n + q.count, 0)))}</td></tr></tbody></table></div>`
    : '';
  const moe = sm.moe !== null ? `<p class="mk-moe"><span class="label">Margin of error <span class="tag tag--enrichment">Enrichment</span></span> <span class="mk-moe__v num">±${esc(fmtNumber(sm.moe, 1))}</span> percentage points</p>` : '';
  return `<p><strong>${esc(METHOD_LABELS[s.method])}.</strong> ${esc(sm.method)}</p>${quota}${moe}${checksHtml(sm.notes, 'Nothing to flag about the sample.')}`;
}

/** The data each question will give: counts of quantitative and qualitative questions. */
export function dataMixHtml(s: QuestionnaireState): string {
  const quant = s.questions.filter((q) => QTYPE_LABELS[q.type].data === 'quantitative').length;
  const qual = s.questions.length - quant;
  const flagged = s.questions.filter((q, i) => questionChecks(q, i + 1).some((c) => c.level === 'conflict' || c.level === 'tension')).length;
  return `<div class="fig"><dt>Questions</dt><dd><span class="fig__v">${s.questions.length}</span></dd></div><div class="fig"><dt>Quantitative (closed)</dt><dd><span class="fig__v">${quant}</span><span class="fig__n">numbers to count and compare</span></dd></div><div class="fig"><dt>Qualitative (open)</dt><dd><span class="fig__v">${qual}</span><span class="fig__n">reasons in respondents’ words</span></dd></div><div class="fig"><dt>Questions with flags</dt><dd><span class="fig__v">${flagged}</span><span class="fig__n">${flagged ? 'look again at the wording' : 'none flagged by the rules'}</span></dd></div>`;
}

/** The questionnaire as a respondent would see it. */
export function previewHtml(s: QuestionnaireState): string {
  const items = s.questions
    .map((q) => {
      let body: string;
      if (hasOptions(q.type)) body = `<ul class="mk-pv__opts mk-pv__opts--${q.type}" role="list">${q.options.map((o) => `<li><span class="mk-pv__box" aria-hidden="true"></span>${esc(o)}</li>`).join('')}</ul>`;
      else if (q.type === 'scale') body = `<p class="mk-pv__scale"><span>1 ${esc(q.low)}</span><span aria-hidden="true">2</span><span aria-hidden="true">3</span><span aria-hidden="true">4</span><span>5 ${esc(q.high)}</span></p>`;
      else if (q.type === 'yesno') body = '<ul class="mk-pv__opts" role="list"><li><span class="mk-pv__box" aria-hidden="true"></span>Yes</li><li><span class="mk-pv__box" aria-hidden="true"></span>No</li></ul>';
      else if (q.type === 'number') body = '<p class="mk-pv__line" aria-hidden="true">Number: ____________</p>';
      else body = '<p class="mk-pv__lines" aria-hidden="true"></p>';
      const hint = q.type === 'multi' ? ' <span class="mk-pv__hint">Choose all that apply.</span>' : q.type === 'ranking' ? ' <span class="mk-pv__hint">Number them in order, 1 for the most important.</span>' : '';
      return `<li class="mk-pv__q"><p class="mk-pv__text">${esc(q.text || 'Question not written yet')}${q.required ? '' : ' <span class="mk-pv__hint">(optional)</span>'}${hint}</p>${body}</li>`;
    })
    .join('');
  return `<p class="mk-pv__title">${esc(s.title || 'Questionnaire')}</p><p class="mk-pv__intro">${esc(s.intro)}</p><ol class="mk-pv__list">${items}</ol><p class="mk-pv__thanks">Thank you for your time.</p>`;
}
