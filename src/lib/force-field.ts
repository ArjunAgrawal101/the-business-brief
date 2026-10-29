/**
 * Force field analysis as the learner's own weighing: totals of judged
 * strengths, and what weakening one restraining force would do to them.
 */
export interface Force {
  label: string;
  strength: number;
}

export interface ForceFieldSummary {
  driving: number;
  restraining: number;
  balance: 'driving' | 'restraining' | 'level';
  sentence: string;
}

export function summarize(driving: Force[], restraining: Force[]): ForceFieldSummary {
  const d = driving.reduce((s, f) => s + f.strength, 0);
  const r = restraining.reduce((s, f) => s + f.strength, 0);
  const balance = d > r ? 'driving' : r > d ? 'restraining' : 'level';
  const sentence =
    balance === 'driving'
      ? `On your weighting the driving forces (${d}) outweigh the restraining forces (${r}). The change looks achievable, but the restraining forces have not gone away: each still needs a plan.`
      : balance === 'restraining'
        ? `On your weighting the restraining forces (${r}) outweigh the driving forces (${d}). The change is unlikely to succeed unless some restraining forces are weakened or driving forces strengthened.`
        : `On your weighting the forces are level (${d} each). The change could stall: weakening even one restraining force would tip the balance.`;
  return { driving: d, restraining: r, balance, sentence };
}

/** What weakening one restraining force by `by` points would do to the totals. */
export function weaken(driving: Force[], restraining: Force[], index: number, by = 2): { before: ForceFieldSummary; after: ForceFieldSummary; from: number; to: number } {
  const target = restraining[index];
  const from = target?.strength ?? 0;
  const to = Math.max(1, from - by);
  const changed = restraining.map((f, k) => (k === index ? { ...f, strength: to } : f));
  return { before: summarize(driving, restraining), after: summarize(driving, changed), from, to };
}
