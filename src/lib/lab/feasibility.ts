/**
 * Entrepreneurship and Innovation Lab: the start-up feasibility assessment.
 * One to three ideas are scored against weighted criteria. The weighted totals
 * and the weight sensitivity reuse the tested weighted-scoring functions of
 * the Operations Floor (src/lib/operations.ts); this module adds what a
 * founder needs on top: a pass mark, must-have criteria that no total can
 * outweigh, the weights at which the leading idea crosses the pass mark, and
 * an optimism test.
 *
 * Weighted scoring is a decision-making method, not one of the guide's
 * toolkit tools: enrichment. The scores and weights are judgements, so the
 * tool's job is to make those judgements visible and test how much the answer
 * depends on them.
 */
import { fmtNumber } from '../format';
import { sensitivity, weightedScores, type Sensitivity, type SiteResult } from '../operations';

export interface Criterion {
  id: string;
  label: string;
  weight: number;
  hint?: string;
  /** A criterion no total can outweigh: a score below the floor is a fatal flaw. */
  mustHave?: boolean;
}

export interface Idea {
  id: string;
  name: string;
  summary?: string;
  scores: Record<string, number>;
}

export interface FeasibilitySettings {
  /** Highest score on each criterion. */
  maxScore: number;
  /** Highest weight. */
  maxWeight: number;
  /** The pass mark: a weighted total of at least this share of the maximum, per cent. */
  threshold: number;
  /** A must-have criterion scoring below this is a fatal flaw. */
  floor: number;
}

export const DEFAULT_SETTINGS: FeasibilitySettings = { maxScore: 5, maxWeight: 5, threshold: 60, floor: 2 };

export type Verdict = 'go' | 'fix' | 'weak';

export const VERDICT_WORDS: Record<Verdict, string> = {
  go: 'Worth testing further',
  fix: 'Fix a must-have first',
  weak: 'Below the pass mark',
};

export interface IdeaResult extends SiteResult {
  passes: boolean;
  /** Must-have criteria scored below the floor. */
  flaws: string[];
  verdict: Verdict;
}

export interface ThresholdEdge {
  criterion: string;
  /** The nearest weight at which the leading idea crosses the pass mark. */
  weight: number;
  passes: boolean;
}

export interface Optimism {
  id: string;
  /** The leading idea's share with every score one point lower (never below 1). */
  share: number;
  passes: boolean;
  /** Whether it would still rank first, the other ideas unchanged. */
  leads: boolean;
  /** The idea that would rank first instead, when it no longer leads. */
  overtakenBy: string | null;
}

export interface Assessment {
  results: IdeaResult[];
  /** The highest weighted total possible with these weights. */
  max: number;
  /** For two or more ideas: the nearest weight on each criterion at which a different idea leads. */
  flips: Sensitivity[];
  /** For the leading idea: the nearest weight on each criterion at which it crosses the pass mark. */
  edges: ThresholdEdge[];
  optimism: Optimism | null;
}

const shareOf = (idea: Idea, criteria: Criterion[], weights: Record<string, number>, maxScore: number) => {
  const max = criteria.reduce((n, c) => n + (weights[c.id] ?? 0) * maxScore, 0);
  const total = criteria.reduce((n, c) => n + (weights[c.id] ?? 0) * (idea.scores[c.id] ?? 0), 0);
  return max > 0 ? (total / max) * 100 : 0;
};

export function assess(ideas: Idea[], criteria: Criterion[], weights: Record<string, number>, s: FeasibilitySettings = DEFAULT_SETTINGS): Assessment {
  const ranked = weightedScores(ideas, criteria, weights, s.maxScore);
  const max = criteria.reduce((n, c) => n + (weights[c.id] ?? 0) * s.maxScore, 0);
  const results: IdeaResult[] = ranked.map((r) => {
    const idea = ideas.find((x) => x.id === r.id);
    const flaws = criteria.filter((c) => c.mustHave && (idea?.scores[c.id] ?? 0) < s.floor).map((c) => c.id);
    const passes = max > 0 && r.share >= s.threshold - 1e-9;
    return { ...r, passes, flaws, verdict: flaws.length ? 'fix' : passes ? 'go' : 'weak' };
  });
  const factors = criteria.map((c) => ({ id: c.id, label: c.label, weight: weights[c.id] ?? 0 }));
  const flips = ideas.length > 1 ? sensitivity(ideas, factors, weights, s.maxScore, s.maxWeight) : [];
  const leader = results[0];
  const leadIdea = ideas.find((x) => x.id === leader?.id);
  const edges: ThresholdEdge[] = [];
  let optimism: Optimism | null = null;
  if (leader && leadIdea && max > 0) {
    for (const c of criteria) {
      const cur = weights[c.id] ?? 0;
      let found: ThresholdEdge | null = null;
      for (let d = 1; d <= s.maxWeight && !found; d += 1) {
        for (const w of [cur - d, cur + d]) {
          if (w < 0 || w > s.maxWeight) continue;
          const sh = shareOf(leadIdea, criteria, { ...weights, [c.id]: w }, s.maxScore);
          const passes = sh >= s.threshold - 1e-9;
          if (passes !== leader.passes) {
            found = { criterion: c.id, weight: w, passes };
            break;
          }
        }
      }
      if (found) edges.push(found);
    }
    const lowered: Idea = { ...leadIdea, scores: Object.fromEntries(criteria.map((c) => [c.id, Math.max(1, (leadIdea.scores[c.id] ?? 0) - 1)])) };
    const rerank = weightedScores(
      ideas.map((x) => (x.id === leadIdea.id ? lowered : x)),
      criteria,
      weights,
      s.maxScore,
    );
    const first = rerank[0];
    const leads = rerank.filter((r) => r.rank === 1).some((r) => r.id === leadIdea.id);
    const share = shareOf(lowered, criteria, weights, s.maxScore);
    optimism = { id: leadIdea.id, share, passes: share >= s.threshold - 1e-9, leads, overtakenBy: leads ? null : (first?.id ?? null) };
  }
  return { results, max, flips, edges, optimism };
}

/* ---------- Reading the result ---------- */

export function readAssessment(a: Assessment, ideas: Idea[], criteria: Criterion[], weights: Record<string, number>, s: FeasibilitySettings = DEFAULT_SETTINGS): { reading: string; implication: string } {
  const name = (id: string) => ideas.find((x) => x.id === id)?.name ?? id;
  const label = (id: string) => criteria.find((c) => c.id === id)?.label.toLowerCase() ?? id;
  if (a.max <= 0) return { reading: 'Give at least one criterion a weight above zero.', implication: '' };
  const top = a.results.filter((r) => r.rank === 1);
  const lead = a.results[0];
  if (!lead) return { reading: 'Add an idea to assess.', implication: '' };
  const parts: string[] = [];
  parts.push(
    top.length > 1
      ? `${top.map((r) => r.name).join(' and ')} tie for first place with ${fmtNumber(lead.share, 0)}% of the maximum.`
      : `${lead.name} scores ${fmtNumber(lead.share, 0)}% of the maximum${a.results.length > 1 ? `, ranked first of ${a.results.length}` : ''}, ${lead.passes ? 'above' : 'below'} the pass mark of ${s.threshold}%.`,
  );
  const flawed = a.results.filter((r) => r.flaws.length);
  if (flawed.length) parts.push(`${flawed.map((r) => `${r.name} fails the must-have on ${r.flaws.map(label).join(' and ')}`).join('; ')}: no total can make up for that.`);
  if (a.flips.length) {
    parts.push(
      `The ranking depends on the weights: ${a.flips
        .map((f) => `at a weight of ${f.weight} on ${label(f.factor)} (now ${weights[f.factor] ?? 0}), ${f.leaders.length > 1 ? `${f.leaders.map(name).join(' and ')} tie` : `${name(f.leaders[0] ?? '')} leads`}`)
        .join('; ')}.`,
    );
  } else if (a.results.length > 1) parts.push('No single change of weight changes the idea ranked first.');
  if (a.edges.length) {
    parts.push(`${lead.name} would ${lead.passes ? 'fall below' : 'reach'} the pass mark ${a.edges.map((e) => `at a weight of ${e.weight} on ${label(e.criterion)}`).join(', or ')}.`);
  }
  let implication = '';
  if (a.optimism) {
    const o = a.optimism;
    implication = `Optimism test: if every score for ${name(o.id)} is one point too generous, it falls to ${fmtNumber(o.share, 0)}% of the maximum and ${o.passes ? 'still passes' : 'no longer passes'}${a.results.length > 1 ? (o.leads ? ', and it still ranks first' : `, and ${name(o.overtakenBy ?? '')} would rank first instead`) : ''}. ${
      o.passes && o.leads ? 'The case for it survives a founder’s usual optimism.' : 'The case rests on scores a founder is likely to overrate, so gather evidence for the closest calls before committing.'
    }`;
  }
  return { reading: parts.join(' '), implication };
}

/* ---------- Validation of the learner's ideas and weights ---------- */

export interface FieldProblem {
  field: string;
  message: string;
}

export function validateFeasibility(ideas: Array<{ id: string; name: string; scores: Record<string, number | null> }>, criteria: Criterion[], weights: Record<string, number | null>, s: FeasibilitySettings = DEFAULT_SETTINGS): FieldProblem[] {
  const out: FieldProblem[] = [];
  if (!ideas.length) out.push({ field: 'ideas', message: 'Add at least one idea.' });
  for (const idea of ideas) {
    if (!idea.name.trim()) out.push({ field: `${idea.id}:name`, message: 'Name the idea.' });
    for (const c of criteria) {
      const v = idea.scores[c.id];
      if (v === null || v === undefined || !Number.isInteger(v) || v < 1 || v > s.maxScore) out.push({ field: `${idea.id}:${c.id}`, message: `Score from 1 to ${s.maxScore}.` });
    }
  }
  for (const c of criteria) {
    const w = weights[c.id];
    if (w === null || w === undefined || !Number.isInteger(w) || w < 0 || w > s.maxWeight) out.push({ field: `w:${c.id}`, message: `Weight from 0 to ${s.maxWeight}.` });
  }
  return out;
}
