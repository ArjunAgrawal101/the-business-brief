/**
 * The Decision Room's logic, shared by the server render and the browser:
 * which choices a round offers, how outcomes combine into the board pack,
 * and how each metric is written and compared.
 */
import type { Decision } from './schemas';
import { fmtMoney, fmtNumber } from './format';

export type MetricValue = number | string;
type Metric = Decision['metrics'][number];
type Round = Decision['rounds'][number];

const CURRENCY = new Set(['€', '₹', '$', '£']);

/** Up to two decimals, trimmed: 12.78, 184.4, 96. */
function flexNumber(v: number): string {
  const r = Math.round(v * 100) / 100;
  const d = Number.isInteger(r) ? 0 : Number.isInteger(Math.round(r * 10 * 100) / 100) ? 1 : 2;
  return fmtNumber(r, d);
}

export function formatMetric(value: MetricValue | undefined, m: Pick<Metric, 'unit'>): string {
  if (value === undefined) return 'Not reported';
  if (typeof value === 'string') return value;
  const unit = m.unit ?? '';
  if (CURRENCY.has(unit)) return fmtMoney(value, unit, Number.isInteger(Math.round(value * 100) / 100) ? 0 : 2);
  const money = unit.match(/^([€₹$£])(m|bn|k)$/);
  if (money) {
    const abs = Math.abs(value);
    const text = Number.isInteger(Math.round(abs * 100) / 100) ? fmtNumber(abs, 0) : fmtNumber(abs, 2);
    return `${value < 0 ? '−' : ''}${money[1]}${text}${money[2]}`;
  }
  if (unit === '%') return `${flexNumber(value)}%`;
  return unit ? `${flexNumber(value)} ${unit}` : flexNumber(value);
}

export interface Comparison {
  text: string;
  verdict: 'better' | 'worse' | 'same' | 'changed' | 'none';
  word: string;
}

export function compareMetric(before: MetricValue | undefined, after: MetricValue | undefined, m: Metric): Comparison {
  if (after === undefined || before === undefined) return { text: '', verdict: 'none', word: '' };
  if (typeof before === 'number' && typeof after === 'number') {
    const diff = Math.round((after - before) * 100) / 100;
    if (diff === 0) return { text: 'No change', verdict: 'same', word: 'No change' };
    const sign = diff > 0 ? '+' : '−';
    const text = `${sign}${formatMetric(Math.abs(diff), m)}`;
    if (m.better === 'context') return { text, verdict: 'changed', word: diff > 0 ? 'Up' : 'Down' };
    const good = m.better === 'higher' ? diff > 0 : diff < 0;
    return { text, verdict: good ? 'better' : 'worse', word: good ? 'Better' : 'Worse' };
  }
  if (String(before) === String(after)) return { text: 'No change', verdict: 'same', word: 'No change' };
  return { text: `Was ${before}`, verdict: 'changed', word: 'Changed' };
}

/** The choices a round offers, given the first-round choice (later rounds may follow from it). */
export function choicesFor(round: Round, firstPick: string | undefined, roundIndex: number) {
  if (roundIndex === 0) return round.choices;
  return round.choices.filter((c) => !c.followsFrom || c.followsFrom === firstPick);
}

/** Baseline values with each committed outcome applied in order. */
export function boardValues(d: Decision, picks: Record<string, string>): Record<string, MetricValue> {
  const values: Record<string, MetricValue> = { ...d.baseline };
  for (const round of d.rounds) {
    const choice = round.choices.find((c) => c.id === picks[round.id]);
    if (!choice) break;
    Object.assign(values, choice.outcome.metrics);
  }
  return values;
}

/** The board pack rows as HTML: metric, now, after, change. */
export function boardRowsHtml(d: Decision, picks: Record<string, string>, esc: (s: string) => string): string {
  const after = boardValues(d, picks);
  const anyPick = d.rounds.some((r) => picks[r.id]);
  return d.metrics
    .map((m) => {
      const now = d.baseline[m.id];
      const cmp = anyPick ? compareMetric(now, after[m.id], m) : { text: '', verdict: 'none', word: '' };
      const afterText = anyPick ? formatMetric(after[m.id], m) : 'Not decided';
      const note = m.note ? `<span class="dr-board__note">${esc(m.note)}</span>` : '';
      return `<tr data-verdict="${cmp.verdict}"><th scope="row">${esc(m.label)}${note}</th><td class="n">${esc(formatMetric(now, m))}</td><td class="n dr-board__after">${esc(afterText)}</td><td class="dr-board__change">${
        cmp.text ? `<span class="num">${esc(cmp.text)}</span>${cmp.word && cmp.verdict !== 'same' ? ` <span class="dr-board__word">${esc(cmp.word)}</span>` : ''}` : ''
      }</td></tr>`;
    })
    .join('');
}
