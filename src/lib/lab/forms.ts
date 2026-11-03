/**
 * Form markup for the Lab's editable lists, as HTML strings, so the server
 * renders the example and the browser redraws a list after a line is added
 * or removed with exactly the same markup. Every control has a label (hidden
 * when a visible column heading says the same), an error slot tied to it with
 * aria-describedby, and a data-field name that the validation messages use.
 * Every string the learner typed is escaped.
 */
import { esc } from '../markup';
import { FUNDING_KINDS, FUNDING_LABELS, type FundingDraft, type LineDraft } from './costs';
import { RISK_WORDS, type BlockId, type Entry } from './canvas';
import type { StreamDraft } from './revenue';
import type { Criterion } from './feasibility';

const num = (v: number | null, step = '1') => (v === null ? '' : step === '0.01' && !Number.isInteger(v) ? v.toFixed(2) : String(v));

const LIST_WORDS = {
  oneOff: { one: 'One-off cost', what: 'what it is' },
  monthly: { one: 'Monthly outgoing', what: 'what it is' },
  funding: { one: 'Funding source', what: 'where it comes from' },
} as const;

export type CostList = keyof typeof LIST_WORDS;

/** One line of a cost or funding ledger. */
export function costLineHtml(list: CostList, line: LineDraft | FundingDraft, n: number, uid: string, currency: string): string {
  const base = `${uid}-${list}-${line.id}`;
  const w = LIST_WORDS[list];
  const f = (k: string) => `${list}:${line.id}:${k}`;
  const kind =
    list === 'funding'
      ? `<div class="lab-line__kind"><label class="sr-only" for="${base}-kind">${w.one} ${n}: kind of funding</label><select class="select" id="${base}-kind" data-k="kind" data-field="${f('kind')}" aria-describedby="${base}-kind-err">${FUNDING_KINDS.map((k) => `<option value="${k}"${(line as FundingDraft).kind === k ? ' selected' : ''}>${esc(FUNDING_LABELS[k].label)}</option>`).join('')}</select></div>`
      : '';
  const name = line.label.trim() || `${w.one.toLowerCase()} ${n}`;
  return `<li class="lab-line lab-line--${list === 'funding' ? 'funding' : 'cost'}" data-line="${esc(line.id)}">
<div class="lab-line__label"><label class="sr-only" for="${base}-label">${w.one} ${n}: ${w.what}</label><input class="input" id="${base}-label" type="text" maxlength="80" autocomplete="off" placeholder="${list === 'funding' ? 'Where it comes from' : 'What it is'}" value="${esc(line.label)}" data-k="label" data-field="${f('label')}" aria-describedby="${base}-label-err"></div>
<div class="lab-line__amount"><label class="sr-only" for="${base}-amount">${w.one} ${n}: amount</label><div class="affix"><span class="affix__pre" aria-hidden="true" data-cur-label>${esc(currency)}</span><input class="input input--num" id="${base}-amount" type="number" inputmode="decimal" min="0" step="1" value="${num(line.amount)}" data-k="amount" data-field="${f('amount')}" aria-describedby="${base}-amount-err"></div></div>
<button type="button" class="lab-remove js-only" data-remove aria-label="Remove ${esc(name)}"><span aria-hidden="true">×</span></button>
${kind}<span class="field__error" id="${base}-label-err" data-err="${f('label')}"></span><span class="field__error" id="${base}-amount-err" data-err="${f('amount')}"></span>${list === 'funding' ? `<span class="field__error" id="${base}-kind-err" data-err="${f('kind')}"></span>` : ''}
</li>`;
}

/* ---------- Revenue streams ---------- */

const STREAM_FIELDS = {
  units: [
    { k: 'price', label: 'Price per unit or order', pre: true, step: '0.01' },
    { k: 'units', label: 'Units sold in month 1', post: 'units', step: '1' },
    { k: 'growth', label: 'Growth in units each month', post: '%', step: '0.1' },
    { k: 'fee', label: 'Share kept by the channel', post: '%', step: '0.1' },
  ],
  subscription: [
    { k: 'price', label: 'Price per month', pre: true, step: '0.01' },
    { k: 'start', label: 'Subscribers before month 1', post: 'subscribers', step: '1' },
    { k: 'joining', label: 'New subscribers in month 1', post: 'subscribers', step: '1' },
    { k: 'growth', label: 'Growth in new subscribers each month', post: '%', step: '0.1' },
    { k: 'churn', label: 'Subscribers who leave each month', post: '%', step: '0.1' },
    { k: 'fee', label: 'Share kept by the channel', post: '%', step: '0.1' },
  ],
} as const;

/** The value of a stream field from a draft of either kind, or the empty string. */
function streamValue(s: StreamDraft, k: string): number | null {
  return (s as unknown as Record<string, number | null>)[k] ?? null;
}

export function streamHtml(s: StreamDraft, n: number, uid: string, currency: string): string {
  const base = `${uid}-s-${s.id}`;
  const group = (kind: 'units' | 'subscription') =>
    `<div class="lab-stream__fields" data-kind-fields="${kind}"${s.kind === kind ? '' : ' hidden'}>${STREAM_FIELDS[kind]
      .map((f) => {
        const id = `${base}-${kind}-${f.k}`;
        const field = `${s.id}:${f.k}`;
        const v = s.kind === kind ? streamValue(s, f.k) : null;
        return `<div class="field"><label for="${id}">${esc(f.label)}</label><div class="affix">${'pre' in f ? `<span class="affix__pre" aria-hidden="true" data-cur-label>${esc(currency)}</span>` : ''}<input class="input input--num" id="${id}" type="number" inputmode="decimal" step="${f.step}" value="${num(v, f.step)}" data-k="${f.k}"${s.kind === kind ? ` data-field="${field}"` : ''} aria-describedby="${id}-err"${s.kind === kind ? '' : ' disabled'}>${'post' in f ? `<span class="affix__post" aria-hidden="true">${esc(f.post)}</span>` : ''}</div><span class="field__error" id="${id}-err"${s.kind === kind ? ` data-err="${field}"` : ''}></span></div>`;
      })
      .join('')}</div>`;
  return `<li class="lab-stream" data-stream="${esc(s.id)}">
<fieldset>
<legend class="lab-stream__legend"><span class="lab-stream__no" aria-hidden="true">${String(n).padStart(2, '0')}</span> Stream ${n}${s.label.trim() ? `: <span data-stream-name>${esc(s.label.trim())}</span>` : ''}</legend>
<div class="lab-stream__top">
<div class="field"><label for="${base}-label">Name of the stream</label><input class="input" id="${base}-label" type="text" maxlength="60" autocomplete="off" value="${esc(s.label)}" data-k="label" data-field="${s.id}:label" aria-describedby="${base}-label-err"><span class="field__error" id="${base}-label-err" data-err="${s.id}:label"></span></div>
<div class="field"><label for="${base}-kind">How customers pay</label><select class="select" id="${base}-kind" data-k="kind"><option value="units"${s.kind === 'units' ? ' selected' : ''}>By the unit or order</option><option value="subscription"${s.kind === 'subscription' ? ' selected' : ''}>By subscription, every month</option></select></div>
</div>
${group('units')}${group('subscription')}
<button type="button" class="btn btn--small lab-stream__remove js-only" data-remove>Remove this stream</button>
</fieldset>
</li>`;
}

/* ---------- Canvas entries ---------- */

export function entryHtml(e: Entry, n: number, uid: string, blockLabel: string): string {
  const base = `${uid}-e-${e.id}`;
  const risks = [5, 4, 3, 2, 1].map((r) => `<option value="${r}"${e.risk === r ? ' selected' : ''}>${r}: ${esc(RISK_WORDS[r] ?? '')}</option>`).join('');
  return `<li class="lab-entry lab-entry--${e.kind}" data-entry="${esc(e.id)}">
<div class="lab-entry__text field"><label for="${base}-text">${esc(blockLabel)}, entry ${n}</label><textarea class="textarea" id="${base}-text" rows="2" maxlength="280" data-k="text">${esc(e.text)}</textarea></div>
<div class="lab-entry__meta">
<div class="field"><label for="${base}-kind">Assumption or evidence?</label><select class="select" id="${base}-kind" data-k="kind"><option value="assumption"${e.kind === 'assumption' ? ' selected' : ''}>Assumption</option><option value="evidence"${e.kind === 'evidence' ? ' selected' : ''}>Evidence</option></select></div>
<div class="field"><label for="${base}-risk">Damage if wrong</label><select class="select" id="${base}-risk" data-k="risk">${risks}</select></div>
</div>
<div class="lab-entry__note field"><label for="${base}-note">${e.kind === 'evidence' ? 'The evidence' : 'How you will test it'}</label><input class="input" id="${base}-note" type="text" maxlength="280" autocomplete="off" value="${esc(e.note)}" data-k="note"></div>
<button type="button" class="btn btn--small lab-entry__remove js-only" data-remove>Remove entry ${n}</button>
</li>`;
}

/* ---------- Feasibility: criteria rows with a weight and a score per idea ---------- */

export interface IdeaDraft {
  id: string;
  name: string;
  scores: Record<string, number>;
}

export function criteriaRowsHtml(criteria: Criterion[], weights: Record<string, number>, ideas: IdeaDraft[], uid: string, maxWeight: number): string {
  return criteria
    .map((c) => {
      const base = `${uid}-c-${c.id}`;
      const w = weights[c.id] ?? 0;
      const scores = ideas
        .map((i, n) => {
          const id = `${base}-${i.id}`;
          const v = i.scores[c.id] ?? 3;
          return `<div class="lab-crit__score field"><label for="${id}"><span class="sr-only">${esc(c.label)}: score for </span><span data-idea-name="${esc(i.id)}">${esc(i.name.trim() || `Idea ${n + 1}`)}</span></label><select class="select" id="${id}" data-score="${esc(i.id)}" data-crit="${esc(c.id)}">${[5, 4, 3, 2, 1].map((s) => `<option value="${s}"${v === s ? ' selected' : ''}>${s}</option>`).join('')}</select></div>`;
        })
        .join('');
      return `<li class="lab-crit" data-crit-row="${esc(c.id)}">
<div class="lab-crit__about"><span class="lab-crit__name" id="${base}-name">${esc(c.label)}</span>${c.mustHave ? ' <span class="tag tag--plain lab-crit__must">Must-have</span>' : ''}<span class="field__hint" id="${base}-hint">${esc(c.hint ?? '')}</span></div>
<div class="lab-crit__weight field"><label for="${base}-w">Weight <span class="sr-only">of ${esc(c.label)}</span></label><div class="lab-crit__slider"><input id="${base}-w" type="range" min="0" max="${maxWeight}" step="1" value="${w}" data-weight="${esc(c.id)}" aria-describedby="${base}-hint" aria-valuetext="Weight ${w} of ${maxWeight}"><output class="num" for="${base}-w" data-wout="${esc(c.id)}">${w}</output></div></div>
<div class="lab-crit__scores">${scores}</div>
</li>`;
    })
    .join('');
}

export function blockOrderMap(order: BlockId[]): Record<BlockId, number> {
  return Object.fromEntries(order.map((b, i) => [b, i + 1])) as Record<BlockId, number>;
}

/** One idea in the feasibility assessment: its name and a line about it. */
export function ideaHtml(i: IdeaDraft & { summary?: string }, n: number, uid: string): string {
  const base = `${uid}-i-${i.id}`;
  return `<li class="lab-idea" data-idea="${esc(i.id)}">
<span class="lab-idea__no" aria-hidden="true">${String.fromCharCode(64 + n)}</span>
<div class="field"><label for="${base}-name">Idea ${n}: name</label><input class="input" id="${base}-name" type="text" maxlength="40" autocomplete="off" value="${esc(i.name)}" data-k="name" data-field="${esc(i.id)}:name" aria-describedby="${base}-name-err"><span class="field__error" id="${base}-name-err" data-err="${esc(i.id)}:name"></span></div>
<div class="field"><label for="${base}-summary">Who it serves and how</label><input class="input" id="${base}-summary" type="text" maxlength="120" autocomplete="off" value="${esc(i.summary ?? '')}" data-k="summary"></div>
<button type="button" class="btn btn--small lab-idea__remove js-only" data-remove>Remove idea ${n}</button>
</li>`;
}
