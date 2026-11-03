/**
 * Option appraisal and recommendation memo. Options are scored from 1 to 5
 * against criteria weighted from 0 to 5; the weighted totals rank them, and
 * the ranking is tested for sensitivity to the weights with the same
 * functions the Operations Floor uses for location scoring
 * (weightedScores and sensitivity in src/lib/operations.ts). The memo puts
 * the engagement in one document: situation, options, evaluation,
 * recommendation, risks and implementation. Weighted scoring is a decision
 * method, not one of the guide's toolkit tools; the memo's structure is the
 * platform's own.
 */
import { esc } from '../markup';
import { fmtNumber, round } from '../format';
import { sensitivity, weightedScores, type LocFactor, type LocSite, type SiteResult } from '../operations';
import { type Check, count, andList, fileSlug, ident, int, list, nextId, obj, orDash, str, textDoc, textSection, toCsv } from './common';
import { button, checksHtml, field, ratingOptions, select, tableRegion } from './ui';

export interface Criterion {
  id: string;
  label: string;
  weight: number;
  /** What a score of 5 means, so that "risk" and "cash" are scored the right way round. */
  high: string;
}

export interface AppOption {
  id: string;
  name: string;
  summary: string;
  scores: Record<string, number>;
}

export interface Step {
  id: string;
  action: string;
  owner: string;
  when: string;
}

export interface Memo {
  to: string;
  from: string;
  date: string;
  situation: string;
  evidence: string;
  recommend: string;
  why: string;
  risks: string;
  steps: Step[];
  review: string;
}

export interface AppraisalState {
  business: string;
  question: string;
  criteria: Criterion[];
  options: AppOption[];
  memo: Memo;
}

export const MAX_SCORE = 5;
export const MAX_WEIGHT = 5;
export const SCORE_WORDS = ['Very poor', 'Poor', 'Adequate', 'Good', 'Very good'] as const;
export const WEIGHT_WORDS = ['Ignore', 'Minor', 'Some', 'Moderate', 'Major', 'Critical'] as const;
export const LIMITS = { criteria: 8, options: 5, steps: 10 };

/* ---------- Reading saved work ---------- */

export function normalize(raw: unknown): AppraisalState {
  const r = obj(raw);
  const used = new Set<string>();
  const criteria = list(r.criteria, LIMITS.criteria).map((c) => {
    const x = obj(c);
    return { id: ident(x.id, used, 'c'), label: str(x.label, 100), weight: int(x.weight, 0, MAX_WEIGHT, 3), high: str(x.high, 160) };
  });
  const options = list(r.options, LIMITS.options).map((o) => {
    const x = obj(o);
    const sc = obj(x.scores);
    return { id: ident(x.id, used, 'o'), name: str(x.name, 100), summary: str(x.summary, 400), scores: Object.fromEntries(criteria.map((c) => [c.id, int(sc[c.id], 1, MAX_SCORE, 3)])) };
  });
  const m = obj(r.memo);
  const stepIds = new Set<string>();
  const recommend = typeof m.recommend === 'string' && options.some((o) => o.id === m.recommend) ? m.recommend : '';
  return {
    business: str(r.business, 120),
    question: str(r.question, 300),
    criteria,
    options,
    memo: {
      to: str(m.to, 120),
      from: str(m.from, 120),
      date: str(m.date, 40),
      situation: str(m.situation, 1500),
      evidence: str(m.evidence, 2500),
      recommend,
      why: str(m.why, 1500),
      risks: str(m.risks, 1500),
      steps: list(m.steps, LIMITS.steps).map((st) => {
        const x = obj(st);
        return { id: ident(x.id, stepIds, 's'), action: str(x.action, 200), owner: str(x.owner, 80), when: str(x.when, 60) };
      }),
      review: str(m.review, 1000),
    },
  };
}

export function blank(): AppraisalState {
  return normalize({
    criteria: [
      { id: 'c1', label: '', weight: 3, high: '' },
      { id: 'c2', label: '', weight: 3, high: '' },
    ],
    options: [
      { id: 'o1', name: '', summary: '', scores: {} },
      { id: 'o2', name: '', summary: '', scores: {} },
    ],
    memo: { steps: [{ id: 's1', action: '', owner: '', when: '' }] },
  });
}

const allIds = (s: AppraisalState) => [...s.criteria.map((c) => c.id), ...s.options.map((o) => o.id)];

export function newCriterion(s: AppraisalState): Criterion {
  const c = { id: nextId('c', allIds(s)), label: '', weight: 3, high: '' };
  for (const o of s.options) o.scores[c.id] = 3;
  return c;
}

export function newOption(s: AppraisalState): AppOption {
  return { id: nextId('o', allIds(s)), name: '', summary: '', scores: Object.fromEntries(s.criteria.map((c) => [c.id, 3])) };
}

export function newStep(s: AppraisalState): Step {
  return { id: nextId('s', s.memo.steps.map((x) => x.id)), action: '', owner: '', when: '' };
}

/* ---------- The appraisal ---------- */

const sites = (s: AppraisalState): LocSite[] => s.options.map((o, i) => ({ id: o.id, name: o.name.trim() || `Option ${i + 1}`, scores: o.scores }));
const factors = (s: AppraisalState): LocFactor[] => s.criteria.map((c, i) => ({ id: c.id, label: c.label.trim() || `Criterion ${i + 1}`, weight: c.weight }));
const weightsOf = (s: AppraisalState) => Object.fromEntries(s.criteria.map((c) => [c.id, c.weight]));

export function ranking(s: AppraisalState, weights = weightsOf(s)): SiteResult[] {
  return weightedScores(sites(s), factors(s), weights, MAX_SCORE);
}

export const maxTotal = (s: AppraisalState) => s.criteria.reduce((n, c) => n + c.weight * MAX_SCORE, 0);

export function flips(s: AppraisalState) {
  return sensitivity(sites(s), factors(s), weightsOf(s), MAX_SCORE, MAX_WEIGHT);
}

/** The leader or leaders if every criterion counted the same. */
export function equalWeightLeaders(s: AppraisalState): SiteResult[] {
  return ranking(s, Object.fromEntries(s.criteria.map((c) => [c.id, 1]))).filter((r) => r.rank === 1);
}

const nameOf = (s: AppraisalState, id: string) => sites(s).find((x) => x.id === id)?.name ?? id;
const critName = (s: AppraisalState, id: string) => factors(s).find((x) => x.id === id)?.label.toLowerCase() ?? id;

export function sensitivityReading(s: AppraisalState): string {
  const r = ranking(s);
  const top = r.filter((x) => x.rank === 1);
  if (!r.length || maxTotal(s) === 0) return 'Give at least one criterion a weight above zero.';
  const second = r.find((x) => x.rank > 1);
  const lead = top.length > 1 ? `${andList(top.map((x) => x.name))} tie for first place with ${fmtNumber(top[0]?.total ?? 0)} points.` : `${top[0]?.name} ranks first with ${fmtNumber(top[0]?.total ?? 0)} points${second ? `, ${fmtNumber((top[0]?.total ?? 0) - second.total)} ahead of ${second.name}` : ''}.`;
  const f = flips(s);
  const fl = f.length
    ? ` The ranking changes if ${andList(f.map((x) => `the weight on ${critName(s, x.factor)} moves from ${s.criteria.find((c) => c.id === x.factor)?.weight ?? 0} to ${x.weight}${x.leaders.length > 1 ? ` (${andList(x.leaders.map((l) => nameOf(s, l)))} would tie)` : ` (${nameOf(s, x.leaders[0] ?? '')} would lead)`}`))}.`
    : ' No single change of weight, from 0 to 5, changes the option ranked first.';
  const eq = equalWeightLeaders(s);
  const eqText = s.criteria.length > 1 ? ` With equal weights, ${eq.length > 1 ? `${andList(eq.map((x) => x.name))} would tie` : `${eq[0]?.name} would lead`}.` : '';
  const verdict = f.length ? ' The recommendation therefore rests on the weights: say why they are right for this business.' : ' That makes the ranking more persuasive, though the scores themselves are still judgements.';
  return `${lead}${fl}${eqText}${verdict}`;
}

export function checks(s: AppraisalState): Check[] {
  const out: Check[] = [];
  if (s.options.filter((o) => o.name.trim()).length < 2) out.push({ level: 'warning', text: 'Compare at least two options. One option is a proposal, not an appraisal.' });
  if (maxTotal(s) === 0) out.push({ level: 'error', text: 'Every weight is zero, so nothing is being compared.' });
  const unclear = s.criteria.filter((c) => c.label.trim() && !c.high.trim());
  if (unclear.length) out.push({ level: 'info', text: `Say what a 5 means for ${andList(unclear.map((c) => `"${c.label.trim()}"`))}. For criteria such as risk or cost, a high score must mean the better outcome (low risk, low cost).` });
  const r = ranking(s);
  const top = r.filter((x) => x.rank === 1).map((x) => x.id);
  const m = s.memo;
  if (!m.recommend) out.push({ level: 'warning', text: 'Choose the option the memo recommends.' });
  else if (!top.includes(m.recommend)) out.push({ level: 'warning', text: `The memo recommends ${nameOf(s, m.recommend)}, which the weighted scores rank below ${andList(top.map((id) => nameOf(s, id)))}. Judgement can overrule the scores, but the memo must say why.` });
  if (!m.risks.trim()) out.push({ level: 'warning', text: 'Name the main risks of the recommendation and how each will be managed.' });
  if (!m.steps.some((x) => x.action.trim())) out.push({ level: 'warning', text: 'Add implementation steps, each with an owner and a date.' });
  const loose = m.steps.filter((x) => x.action.trim() && (!x.owner.trim() || !x.when.trim()));
  if (loose.length) out.push({ level: 'info', text: `${loose.length === 1 ? 'One step has' : `${count(loose.length, true)} steps have`} no owner or no date. A step that belongs to nobody, or to no time, tends not to happen.` });
  if (!m.review.trim()) out.push({ level: 'info', text: 'Say what would change the recommendation: the evidence that would make you think again.' });
  return out;
}

export function headline(s: AppraisalState): string {
  const r = ranking(s);
  const top = r[0];
  if (!top || maxTotal(s) === 0) return 'No options compared yet.';
  return `${top.name} ranks first (${fmtNumber(top.total)} of ${fmtNumber(maxTotal(s))}); ${flips(s).length ? 'the ranking is sensitive to the weights' : 'the ranking holds under any single change of weight'}.${s.memo.recommend ? ` The memo recommends ${nameOf(s, s.memo.recommend)}.` : ''}`;
}

/* ---------- The memo ---------- */

const paras = (t: string) =>
  t
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);

export function evaluationSummary(s: AppraisalState): string {
  const r = ranking(s);
  if (!r.length || maxTotal(s) === 0) return '';
  const crit = andList(s.criteria.filter((c) => c.weight > 0).map((c) => `${c.label.trim().toLowerCase() || 'unnamed'} (weight ${c.weight})`));
  return `Each option was scored from 1 to 5 against ${s.criteria.filter((c) => c.weight > 0).length} weighted criteria: ${crit}. ${r.map((x) => `${x.name} scored ${fmtNumber(x.total)} of ${fmtNumber(maxTotal(s))} (${fmtNumber(x.share, 0)}%)`).join('; ')}. ${sensitivityReading(s)}`;
}

export function memoHtml(s: AppraisalState): string {
  const m = s.memo;
  const rec = s.options.find((o) => o.id === m.recommend);
  const sec = (n: number, title: string, body: string) => `<section class="sx-memo__sec"><h5 class="sx-memo__h"><span class="sx-memo__n" aria-hidden="true">${n}</span> ${esc(title)}</h5>${body}</section>`;
  const text = (t: string, empty: string) => (paras(t).length ? paras(t).map((p) => `<p>${esc(p)}</p>`).join('') : `<p class="muted">${esc(empty)}</p>`);
  const steps = m.steps.filter((x) => x.action.trim());
  return `<article class="sx-memo" aria-label="Recommendation memo"><header class="sx-memo__head"><p class="sx-memo__kind">Memo</p><dl class="sx-memo__meta"><div><dt>To</dt><dd>${esc(orDash(m.to))}</dd></div><div><dt>From</dt><dd>${esc(orDash(m.from))}</dd></div><div><dt>Date</dt><dd>${esc(orDash(m.date))}</dd></div><div><dt>Subject</dt><dd class="sx-memo__subject">${esc(orDash(s.question, 'The decision'))}</dd></div></dl></header>${sec(1, 'Situation', text(m.situation, 'Describe the situation the decision responds to.'))}${sec(
    2,
    'Options considered',
    s.options.some((o) => o.name.trim()) ? `<ol class="sx-memo__opts">${s.options.filter((o) => o.name.trim()).map((o) => `<li><strong>${esc(o.name.trim())}.</strong> ${esc(o.summary.trim())}</li>`).join('')}</ol>` : '<p class="muted">No options yet.</p>',
  )}${sec(3, 'Evaluation', `<p>${esc(evaluationSummary(s))}</p>${text(m.evidence, '')}`)}${sec(
    4,
    'Recommendation',
    rec ? `<p class="sx-memo__rec">Recommended: ${esc(rec.name.trim() || 'the chosen option')}.</p>${text(m.why, 'Say why this option, on this evidence.')}` : '<p class="muted">Choose the option to recommend.</p>',
  )}${sec(5, 'Risks and how they will be managed', text(m.risks, 'Name the main risks and the response to each.'))}${sec(
    6,
    'Implementation',
    steps.length
      ? `<div class="table-scroll" role="region" aria-label="Implementation steps" tabindex="0"><table class="table sx-memo__steps"><thead><tr><th scope="col" class="n">Step</th><th scope="col">Action</th><th scope="col">Owner</th><th scope="col">When</th></tr></thead><tbody>${steps.map((x, i) => `<tr><td class="n num">${i + 1}</td><th scope="row">${esc(x.action.trim())}</th><td>${esc(orDash(x.owner))}</td><td>${esc(orDash(x.when))}</td></tr>`).join('')}</tbody></table></div>`
      : '<p class="muted">Add the steps, each with an owner and a date.</p>',
  )}${sec(7, 'What would change this recommendation', text(m.review, 'Say what evidence would make you think again.'))}<footer class="sx-memo__foot">Drafted with the Strategy Studio, The Business Brief. The analysis supports a judgement; it does not make it.</footer></article>`;
}

export function memoText(s: AppraisalState): string {
  const m = s.memo;
  const rec = s.options.find((o) => o.id === m.recommend);
  return textDoc(`MEMO: ${orDash(s.question, 'the decision')}`, [
    [`To: ${orDash(m.to)}`, `From: ${orDash(m.from)}`, `Date: ${orDash(m.date)}`].join('\n'),
    textSection('1. Situation', paras(m.situation)),
    textSection('2. Options considered', s.options.filter((o) => o.name.trim()).map((o, i) => `${i + 1}. ${o.name.trim()}. ${o.summary.trim()}`)),
    textSection('3. Evaluation', [evaluationSummary(s), ...paras(m.evidence)]),
    textSection('4. Recommendation', rec ? [`Recommended: ${rec.name.trim()}.`, ...paras(m.why)] : ['(not chosen)']),
    textSection('5. Risks and how they will be managed', paras(m.risks)),
    textSection('6. Implementation', m.steps.filter((x) => x.action.trim()).map((x, i) => `${i + 1}. ${x.action.trim()} (owner: ${orDash(x.owner)}; when: ${orDash(x.when)})`)),
    textSection('7. What would change this recommendation', paras(m.review)),
    'Drafted with the Strategy Studio, The Business Brief.',
  ]);
}

/* ---------- HTML ---------- */

const scoreOpts = ratingOptions(SCORE_WORDS);
const weightOpts = WEIGHT_WORDS.map((w, i) => ({ value: i, label: `${i}: ${w}` }));

export function editorHtml(s: AppraisalState, uid: string): string {
  const crit = s.criteria
    .map((c, i) => {
      const id = `${uid}-${c.id}`;
      return `<li class="sx-row sx-row--plain" data-row="${esc(c.id)}"><div class="sx-row__body"><div class="sx-grid-2">${field({ id: `${id}-label`, k: `criteria.${c.id}.label`, label: `Criterion ${i + 1}`, value: c.label, maxlength: 100 })}${select({
        id: `${id}-w`,
        k: `criteria.${c.id}.weight`,
        label: 'Weight',
        labelHtml: `Weight<span class="sr-only"> of criterion ${i + 1}</span>`,
        value: c.weight,
        options: weightOpts,
        integer: true,
      })}</div>${field({ id: `${id}-high`, k: `criteria.${c.id}.high`, label: 'What a score of 5 means', value: c.high, maxlength: 160 })}<div class="sx-row__meta">${button({ act: 'remove-criterion', label: 'Remove', aria: `Remove criterion ${i + 1}: ${c.label.trim() || 'unnamed'}`, data: { id: c.id }, cls: 'sx-row__remove' })}</div></div></li>`;
    })
    .join('');
  const opts = s.options
    .map((o, i) => {
      const id = `${uid}-${o.id}`;
      return `<li class="sx-row" data-row="${esc(o.id)}"><p class="sx-row__code" aria-hidden="true">${String.fromCharCode(65 + i)}</p><div class="sx-row__body">${field({ id: `${id}-name`, k: `options.${o.id}.name`, label: `Option ${String.fromCharCode(65 + i)}`, value: o.name, maxlength: 100 })}${field({
        id: `${id}-sum`,
        k: `options.${o.id}.summary`,
        label: 'What it involves',
        value: o.summary,
        multiline: true,
        rows: 2,
        maxlength: 400,
      })}<div class="sx-row__meta">${button({ act: 'remove-option', label: 'Remove', aria: `Remove option ${String.fromCharCode(65 + i)}: ${o.name.trim() || 'unnamed'}`, data: { id: o.id }, cls: 'sx-row__remove' })}</div></div></li>`;
    })
    .join('');
  const matrix = s.criteria.length && s.options.length
    ? tableRegion(
        'Score each option',
        `<caption class="sr-only">Score each option from 1 (very poor) to 5 (very good) on each criterion</caption><thead><tr><th scope="col">Criterion</th>${s.options.map((o, i) => `<th scope="col">${String.fromCharCode(65 + i)}<span class="sx-matrix__opt">${esc(o.name.trim() || `Option ${String.fromCharCode(65 + i)}`)}</span></th>`).join('')}</tr></thead><tbody>${s.criteria
          .map(
            (c, ci) =>
              `<tr><th scope="row">${esc(c.label.trim() || `Criterion ${ci + 1}`)}<span class="sx-swot__ev">Weight ${c.weight}${c.high.trim() ? `; 5 means: ${esc(c.high.trim())}` : ''}</span></th>${s.options
                .map((o, oi) =>
                  select({
                    id: `${uid}-${o.id}-${c.id}`,
                    k: `options.${o.id}.scores.${c.id}`,
                    label: 'Score',
                    labelHtml: `<span class="sr-only">Score for ${esc(o.name.trim() || `option ${String.fromCharCode(65 + oi)}`)} on ${esc(c.label.trim() || `criterion ${ci + 1}`)}</span>`,
                    value: o.scores[c.id] ?? 3,
                    options: scoreOpts,
                    integer: true,
                    cls: 'sx-matrix__cell',
                  }),
                )
                .map((html) => `<td>${html}</td>`)
                .join('')}</tr>`,
          )
          .join('')}</tbody>`,
        'table sx-matrix',
      )
    : '<p class="small muted">Add criteria and options to score them.</p>';
  const m = s.memo;
  const steps = m.steps
    .map(
      (x, i) =>
        `<li class="sx-row sx-row--plain" data-row="${esc(x.id)}"><div class="sx-row__body sx-step">${field({ id: `${uid}-${x.id}-action`, k: `memo.steps.${x.id}.action`, label: `Step ${i + 1}`, value: x.action, maxlength: 200 })}<div class="sx-grid-2">${field({
          id: `${uid}-${x.id}-owner`,
          k: `memo.steps.${x.id}.owner`,
          label: 'Owner',
          labelHtml: `Owner<span class="sr-only"> of step ${i + 1}</span>`,
          value: x.owner,
          maxlength: 80,
        })}${field({ id: `${uid}-${x.id}-when`, k: `memo.steps.${x.id}.when`, label: 'When', labelHtml: `When<span class="sr-only"> step ${i + 1} happens</span>`, value: x.when, maxlength: 60 })}</div><div class="sx-row__meta">${button({ act: 'remove-step', label: 'Remove', aria: `Remove step ${i + 1}`, data: { id: x.id }, cls: 'sx-row__remove' })}</div></div></li>`,
    )
    .join('');
  return `<div class="sx-context">${field({ id: `${uid}-business`, k: 'business', label: 'Organization', value: s.business, maxlength: 120 })}${field({
    id: `${uid}-question`,
    k: 'question',
    label: 'The question',
    value: s.question,
    multiline: true,
    rows: 2,
    maxlength: 300,
  })}</div><div class="sx-grid-2"><fieldset class="sx-q"><legend>Criteria and weights</legend><p class="sx-q__prompt">What matters in this decision, and how much (0 to 5)? Agree the weights before you look at the totals.</p><ol class="sx-rows" role="list">${crit}</ol>${button({
    act: 'add-criterion',
    label: 'Add a criterion',
    cls: 'sx-add',
    disabled: s.criteria.length >= LIMITS.criteria,
  })}</fieldset><fieldset class="sx-q"><legend>Options</legend><p class="sx-q__prompt">Two to five distinct options. Include doing nothing if it is a real choice.</p><ol class="sx-rows" role="list">${opts}</ol>${button({ act: 'add-option', label: 'Add an option', cls: 'sx-add', disabled: s.options.length >= LIMITS.options })}</fieldset></div><fieldset class="sx-q"><legend>Scores</legend><p class="sx-q__prompt">Score each option from 1 (very poor) to 5 (very good) on each criterion.</p>${matrix}</fieldset><fieldset class="sx-q sx-q--memo" id="${uid}-memo-ed"><legend>The memo</legend><div class="sx-nums sx-nums--3">${field({ id: `${uid}-to`, k: 'memo.to', label: 'To', value: m.to, maxlength: 120 })}${field({ id: `${uid}-from`, k: 'memo.from', label: 'From', value: m.from, maxlength: 120 })}${field({
    id: `${uid}-date`,
    k: 'memo.date',
    label: 'Date',
    value: m.date,
    maxlength: 40,
  })}</div>${field({ id: `${uid}-situation`, k: 'memo.situation', label: '1. Situation', value: m.situation, multiline: true, rows: 3, maxlength: 1500 })}<p class="sx-memo-note">2. The options considered are taken from your options above, with what each involves.</p>${field({
    id: `${uid}-evidence`,
    k: 'memo.evidence',
    label: '3. Evidence from your analysis',
    value: m.evidence,
    multiline: true,
    rows: 4,
    maxlength: 2500,
    hint: 'The weighted scores and their sensitivity are added for you. One point per line.',
  })}<p class="sx-import-line">${button({ act: 'import-evidence', label: 'Add headlines from my saved tools' })}</p>${select({
    id: `${uid}-recommend`,
    k: 'memo.recommend',
    label: '4. Recommended option',
    value: m.recommend,
    options: [{ value: '', label: 'Choose an option' }, ...s.options.map((o, i) => ({ value: o.id, label: o.name.trim() || `Option ${String.fromCharCode(65 + i)}` }))],
  })}${field({ id: `${uid}-why`, k: 'memo.why', label: 'Why this option', value: m.why, multiline: true, rows: 3, maxlength: 1500 })}${field({
    id: `${uid}-risks`,
    k: 'memo.risks',
    label: '5. Risks and how they will be managed',
    value: m.risks,
    multiline: true,
    rows: 4,
    maxlength: 1500,
    hint: 'One risk per line, with the response.',
  })}<fieldset class="sx-q sx-q--inner"><legend>6. Implementation</legend><ol class="sx-rows" role="list">${steps}</ol>${button({ act: 'add-step', label: 'Add a step', cls: 'sx-add', disabled: m.steps.length >= LIMITS.steps })}</fieldset>${field({
    id: `${uid}-review`,
    k: 'memo.review',
    label: '7. What would change this recommendation',
    value: m.review,
    multiline: true,
    rows: 3,
    maxlength: 1000,
  })}</fieldset>`;
}

export function outputsHtml(s: AppraisalState): string {
  const r = ranking(s);
  const max = maxTotal(s);
  const rankTable = r.length
    ? tableRegion(
        'Weighted ranking',
        `<caption class="sr-only">Each option's weighted total: the sum of weight times score</caption><thead><tr><th scope="col" class="n">Rank</th><th scope="col">Option</th><th scope="col" class="n">Total</th><th scope="col" class="n">% of maximum</th><th scope="col" class="sx-bar-cell"><span class="sr-only">Bar</span></th></tr></thead><tbody>${r
          .map((x) => `<tr${x.rank === 1 ? ' class="is-best"' : ''}><td class="n num">${x.rank}</td><th scope="row">${esc(x.name)}</th><td class="n num"><strong>${fmtNumber(x.total)}</strong> <span class="muted">of ${fmtNumber(max)}</span></td><td class="n num">${fmtNumber(x.share, 0)}%</td><td class="sx-bar-cell" aria-hidden="true"><span class="sx-meter${x.rank === 1 ? ' sx-meter--lead' : ''}"><span style="width:${round(x.share, 1)}%"></span></span></td></tr>`)
          .join('')}</tbody>`,
      )
    : '';
  const working = s.criteria.length && s.options.length
    ? tableRegion(
        'Weighted scores by criterion',
        `<caption class="sr-only">Weight times score for each criterion and option</caption><thead><tr><th scope="col">Criterion</th><th scope="col" class="n">Weight</th>${s.options.map((o, i) => `<th scope="col" class="n">${esc(o.name.trim() || `Option ${String.fromCharCode(65 + i)}`)}</th>`).join('')}</tr></thead><tbody>${s.criteria
          .map((c, ci) => `<tr><th scope="row">${esc(c.label.trim() || `Criterion ${ci + 1}`)}</th><td class="n num">${c.weight}</td>${s.options.map((o) => `<td class="n num">${c.weight} × ${o.scores[c.id] ?? 3} = ${c.weight * (o.scores[c.id] ?? 3)}</td>`).join('')}</tr>`)
          .join('')}</tbody><tfoot><tr><th scope="row">Total</th><td class="n num">${s.criteria.reduce((n, c) => n + c.weight, 0)}</td>${s.options.map((o) => `<td class="n num"><strong>${fmtNumber(r.find((x) => x.id === o.id)?.total ?? 0)}</strong></td>`).join('')}</tr></tfoot>`,
      )
    : '';
  return `<div class="sx-out__block"><h4 class="sx-out__h">The weighted ranking</h4>${rankTable}<p class="sx-reading" data-reading>${esc(sensitivityReading(s))}</p><details class="disclosure"><summary>The working: weight times score</summary><div class="disclosure__body">${working}<p class="small muted">The most an option could score is the sum of the weights times ${MAX_SCORE}, which is ${fmtNumber(max)}. Weighted scoring is a decision-making method; it is not one of the guide's toolkit tools.</p></div></details></div><div class="sx-out__block"><h4 class="sx-out__h">Checks</h4>${checksHtml(checks(s), 'No problems found: the options are compared, the memo recommends the leading option, and its risks, steps and review are written.')}</div><div class="sx-out__block sx-memo-block" data-memo><h4 class="sx-out__h">The recommendation memo</h4><p class="sx-memo-actions js-only"><button type="button" class="btn btn--small" data-memo-act="copy">Copy the memo</button> <button type="button" class="btn btn--small" data-memo-act="print">Print the memo</button></p>${memoHtml(s)}</div>`;
}

/* ---------- Export ---------- */

export function toText(s: AppraisalState): string {
  const r = ranking(s);
  return textDoc(`Option appraisal: ${orDash(s.business, 'organization not named')}`, [
    textSection('Question', [orDash(s.question)]),
    textSection('Criteria and weights', s.criteria.map((c) => `- ${orDash(c.label)}: weight ${c.weight}${c.high.trim() ? ` (5 means: ${c.high.trim()})` : ''}`)),
    textSection('Scores (1 to 5)', s.options.map((o) => `- ${orDash(o.name)}: ${s.criteria.map((c) => `${c.label.trim() || c.id} ${o.scores[c.id] ?? 3}`).join(', ')}`)),
    textSection('Weighted ranking', r.map((x) => `${x.rank}. ${x.name}: ${fmtNumber(x.total)} of ${fmtNumber(maxTotal(s))} (${fmtNumber(x.share, 0)}%)`)),
    textSection('Sensitivity', [sensitivityReading(s)]),
    memoText(s),
  ]);
}

export function toCsvText(s: AppraisalState): string {
  const r = ranking(s);
  return toCsv([
    ['Criterion', 'Weight', ...s.options.map((o) => o.name.trim() || o.id)],
    ...s.criteria.map((c) => [c.label.trim() || c.id, c.weight, ...s.options.map((o) => o.scores[c.id] ?? 3)]),
    ['Weighted total', maxTotal(s), ...s.options.map((o) => r.find((x) => x.id === o.id)?.total ?? 0)],
    ['Rank', '', ...s.options.map((o) => r.find((x) => x.id === o.id)?.rank ?? '')],
  ]);
}

export function fileName(s: AppraisalState): string {
  return `${fileSlug(s.business)}-option-appraisal`;
}

export function problems(s: AppraisalState): string[] {
  const out = checks(s)
    .filter((c) => c.level !== 'info')
    .map((c) => c.text);
  s.criteria.forEach((c) => (c.label.trim() && c.high.trim()) || out.push(`criterion ${c.id} needs a label and a meaning for 5`));
  s.options.forEach((o) => (o.name.trim() && o.summary.trim()) || out.push(`option ${o.id} needs a name and a summary`));
  return out;
}
