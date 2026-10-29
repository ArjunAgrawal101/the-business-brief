/**
 * Decision trees: expected values for options with uncertain outcomes.
 *
 * A decision tree in this classroom form has one decision node; each option
 * costs something up front and leads to a chance node whose outcomes have
 * probabilities and payoffs. The expected value of an option is the
 * probability-weighted payoff minus its cost. The expected value is an average
 * over many imagined repetitions: it is not what will happen this time.
 */
import type { Working } from './finance';
import { fmtNumber, round } from './format';

export interface Outcome {
  label: string;
  probability: number;
  payoff: number;
}

export interface TreeOption {
  id: string;
  label: string;
  cost: number;
  outcomes: Outcome[];
}

export interface OptionResult {
  id: string;
  label: string;
  expectedPayoff: number;
  expectedValue: number;
  worst: number;
  best: number;
  probabilitySum: number;
  valid: boolean;
  problems: string[];
}

const EPS = 1e-9;

export function evaluateOption(option: TreeOption): OptionResult {
  const problems: string[] = [];
  const sum = option.outcomes.reduce((s, o) => s + o.probability, 0);
  if (option.outcomes.length < 2) problems.push('A chance node needs at least two outcomes.');
  if (option.outcomes.some((o) => o.probability < 0 || o.probability > 1)) problems.push('Each probability must be between 0 and 1.');
  if (Math.abs(sum - 1) > 1e-6) problems.push(`The probabilities add up to ${round4(sum)}, not 1.`);
  const expectedPayoff = option.outcomes.reduce((s, o) => s + o.probability * o.payoff, 0);
  const net = option.outcomes.map((o) => o.payoff - option.cost);
  return {
    id: option.id,
    label: option.label,
    expectedPayoff,
    expectedValue: expectedPayoff - option.cost,
    worst: net.length ? Math.min(...net) : 0,
    best: net.length ? Math.max(...net) : 0,
    probabilitySum: sum,
    valid: problems.length === 0,
    problems,
  };
}

export interface TreeResult {
  options: OptionResult[];
  bestId: string | null;
  tie: boolean;
}

export function evaluateTree(options: TreeOption[]): TreeResult {
  const results = options.map(evaluateOption);
  const valid = results.filter((r) => r.valid);
  if (!valid.length) return { options: results, bestId: null, tie: false };
  const top = Math.max(...valid.map((r) => r.expectedValue));
  const leaders = valid.filter((r) => Math.abs(r.expectedValue - top) < EPS);
  return { options: results, bestId: leaders.length === 1 ? (leaders[0]?.id ?? null) : null, tie: leaders.length > 1 };
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

/** A number with as many decimals as it needs, up to two: 0.6, 59, 12.5, 1.25. */
function flex(v: number): string {
  const d = Number.isInteger(round(v, 2)) ? 0 : Number.isInteger(round(v * 10, 2)) ? 1 : 2;
  return fmtNumber(v, d);
}

/** Money in the tree's unit, such as ₹59m or −₹12m. */
export function treeMoney(v: number, currency: string, unit: string): string {
  const s = flex(Math.abs(v));
  return `${v < 0 && Number(s.replace(/,/g, '')) !== 0 ? '−' : ''}${currency}${s}${unit}`;
}

/** The eight-part working for one option's expected value. Interpretation and implication are added by the caller. */
export function expectedValueWorking(op: TreeOption, currency: string, unit: string): Working {
  const r = evaluateOption(op);
  const m = (v: number) => treeMoney(v, currency, unit);
  const terms = op.outcomes.map((o) => ({ o, value: o.probability * o.payoff }));
  const base: Working = {
    given: [
      ...op.outcomes.map((o) => ({ label: `${o.label}: probability and payoff`, value: `${flex(o.probability)} and ${m(o.payoff)}` })),
      { label: `Cost of ${op.label.toLowerCase()}`, value: m(op.cost) },
    ],
    formula: 'Expected value = Σ (probability × payoff) − cost of the option',
    substitution: `= ${terms.map((t) => `(${flex(t.o.probability)} × ${m(t.o.payoff)})`).join(' + ')} − ${m(op.cost)}`,
    steps: [
      ...terms.map((t) => `${flex(t.o.probability)} × ${flex(t.o.payoff)} = ${flex(t.value)}`),
      `${terms.map((t) => flex(t.value)).join(' + ')} = ${flex(r.expectedPayoff)}`,
      `${flex(r.expectedPayoff)} − ${flex(op.cost)} = ${flex(r.expectedValue)}`,
    ],
    answer: m(round(r.expectedValue, 2)),
    value: round(r.expectedValue, 2),
    unit: unit === 'm' ? `${currency} millions, expected value of the option` : `${currency}, expected value of the option`,
  };
  if (!r.valid) return { ...base, answer: 'Not valid', value: null, error: r.problems.join(' ') };
  return base;
}

/**
 * For trees in which every option faces the same two states (strong and weak
 * demand, say), each expected value is a straight line in the probability p of
 * the first state. This finds exactly where the lines cross and which option
 * leads between the crossings, so the page can say how sensitive the ranking is.
 */
export function leaderRanges(options: TreeOption[]): Array<{ id: string; label: string; from: number; to: number }> {
  const lines = options
    .filter((op) => op.outcomes.length >= 2)
    .map((op) => {
      const [a, b] = op.outcomes as [Outcome, Outcome];
      // EV(p) = p·a + (1 − p)·b − cost = slope·p + intercept
      return { op, slope: a.payoff - b.payoff, intercept: b.payoff - op.cost };
    });
  if (!lines.length) return [];
  const cuts = new Set<number>([0, 1]);
  for (let i = 0; i < lines.length; i++)
    for (let j = i + 1; j < lines.length; j++) {
      const li = lines[i];
      const lj = lines[j];
      if (!li || !lj || li.slope === lj.slope) continue;
      const p = (lj.intercept - li.intercept) / (li.slope - lj.slope);
      if (p > 0 && p < 1) cuts.add(p);
    }
  const points = [...cuts].sort((x, y) => x - y);
  const out: Array<{ id: string; label: string; from: number; to: number }> = [];
  for (let k = 0; k < points.length - 1; k++) {
    const from = points[k] ?? 0;
    const to = points[k + 1] ?? 1;
    const mid = (from + to) / 2;
    const best = lines.reduce((top, l) => (l.slope * mid + l.intercept > top.slope * mid + top.intercept + 1e-12 ? l : top));
    const last = out[out.length - 1];
    if (last && last.id === best.op.id) last.to = to;
    else out.push({ id: best.op.id, label: best.op.label, from, to });
  }
  return out;
}

/** True when every option has exactly two outcomes with the same labels, in the same order. */
export function sharedStates(options: TreeOption[]): boolean {
  const first = options[0]?.outcomes.map((o) => o.label).join('|');
  return options.length > 1 && options.every((op) => op.outcomes.length === 2 && op.outcomes.map((o) => o.label).join('|') === first);
}

