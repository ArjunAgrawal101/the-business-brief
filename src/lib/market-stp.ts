/**
 * The STP planner: segmentation, targeting and positioning (4.2, AO2 and AO4).
 *
 * Segments are rated from 1 to 5 on four criteria, with higher always better
 * (so competition is rated as "competitive space": 5 means few or weak
 * rivals). A weighted total ranks them, with the same weighted scoring and
 * sensitivity test the Operations Floor uses for locations. The scoring is a
 * decision method, not a requirement of the guide; the targeting strategies
 * and the tests of a good segment follow the 4.2 notes. The positioning
 * statement uses a common practitioners' format, which is enrichment.
 */
import { sensitivity, weightedScores, type SiteResult } from './operations';
import { asBool, asInt, asList, asObj, asStr, listWords, safeId, uniqueIds, type Check } from './market-kit';

export const BASES = ['demographic', 'geographic', 'psychographic', 'behavioural'] as const;
export type Base = (typeof BASES)[number];
export const BASE_LABELS: Record<Base, { label: string; examples: string }> = {
  demographic: { label: 'Demographic', examples: 'age, income, occupation, education, family size, stage of life' },
  geographic: { label: 'Geographic', examples: 'country, region, city, urban or rural, climate' },
  psychographic: { label: 'Psychographic', examples: 'lifestyle, values, attitudes, interests, personality' },
  behavioural: { label: 'Behavioural', examples: 'how often they buy, loyalty, occasion, the benefit sought' },
};

export const CRITERIA = ['size', 'growth', 'fit', 'competition'] as const;
export type Criterion = (typeof CRITERIA)[number];
export const CRITERION_LABELS: Record<Criterion, { label: string; low: string; high: string }> = {
  size: { label: 'Size', low: 'very small', high: 'very large' },
  growth: { label: 'Growth', low: 'shrinking', high: 'growing fast' },
  fit: { label: 'Fit with the business', low: 'poor fit with its strengths', high: 'excellent fit' },
  competition: { label: 'Competitive space', low: 'crowded with strong rivals', high: 'few or weak rivals' },
};

export interface Segment {
  id: string;
  name: string;
  /** Who they are and what they need. */
  profile: string;
  bases: Base[];
  size: number;
  growth: number;
  fit: number;
  competition: number;
  /** Can the business reach them through promotion and distribution? */
  reachable: boolean;
  target: boolean;
  /** The evidence behind the ratings. */
  evidence: string;
}

export interface Positioning {
  customers: string;
  need: string;
  brand: string;
  frame: string;
  difference: string;
  proof: string;
}

export interface StpState {
  business: string;
  market: string;
  bases: Base[];
  weights: Record<Criterion, number>;
  segments: Segment[];
  positioning: Positioning;
}

export const MAX_WEIGHT = 5;
export const MAX_RATING = 5;

export interface SegmentResult extends SiteResult {
  target: boolean;
}

export function scoreSegments(s: StpState): SegmentResult[] {
  const sites = s.segments.map((g) => ({ id: g.id, name: g.name || 'Unnamed segment', scores: { size: g.size, growth: g.growth, fit: g.fit, competition: g.competition } }));
  const factors = CRITERIA.map((id) => ({ id }));
  return weightedScores(sites, factors, s.weights, MAX_RATING).map((r) => ({ ...r, target: s.segments.find((g) => g.id === r.id)?.target ?? false }));
}

export function maxTotal(s: StpState): number {
  return CRITERIA.reduce((n, c) => n + (s.weights[c] ?? 0) * MAX_RATING, 0);
}

export type Targeting = 'none' | 'niche' | 'several' | 'mass';

export function targeting(s: StpState): Targeting {
  const t = s.segments.filter((g) => g.target).length;
  if (!t) return 'none';
  if (t === s.segments.length && s.segments.length > 1) return 'mass';
  return t === 1 ? 'niche' : 'several';
}

export const TARGETING_TEXT: Record<Targeting, { label: string; text: string }> = {
  none: { label: 'No target chosen yet', text: 'Choose at least one segment to target.' },
  niche: { label: 'One segment: a niche strategy', text: 'All the marketing goes to one clearly defined group. It suits a small business with specialist strengths, but leaves it exposed to a change in that one group.' },
  several: { label: 'Several segments, each with its own mix', text: 'Each target needs a mix of its own, which costs more than one mix but fits each group better. Check that the business can afford and run them all.' },
  mass: { label: 'Every segment: mass marketing', text: 'Targeting every segment with one broad mix is mass marketing. It brings scale, but a mix designed for everyone may fully satisfy no one.' },
};

/** The full positioning statement in the common format, leaving out parts not yet written. */
export function positioningStatement(p: Positioning): string {
  const who = p.customers.trim();
  const need = p.need.trim();
  const brand = p.brand.trim() || 'the brand';
  const frame = p.frame.trim();
  const diff = p.difference.trim();
  const proof = p.proof.trim();
  let out = who ? `For ${who}${need ? ` who ${need}` : ''}, ` : '';
  out += `${out ? brand : brand.charAt(0).toUpperCase() + brand.slice(1)} is ${frame ? `the ${frame}` : 'the choice'}`;
  out += diff ? ` that ${diff}` : '';
  out += proof ? `, because ${proof}` : '';
  return `${out.replace(/[.\s]+$/, '')}.`;
}

/** Words of four or more letters in a segment's name (singular), for checking the statement names the target. */
const keywords = (name: string) =>
  name
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 4 && !['from', 'with', 'that', 'they', 'their', 'people', 'customers', 'who', 'the', 'and'].includes(w))
    .map((w) => w.replace(/s$/, ''));

export function stpChecks(s: StpState): Check[] {
  const out: Check[] = [];
  const add = (level: Check['level'], text: string, about?: string) => out.push({ level, text, about });
  const named = (g: Segment, i: number) => g.name.trim() || `Segment ${i + 1}`;

  if (!s.bases.length) add('conflict', 'Choose at least one basis for segmenting the market.', 'Bases');
  if (s.segments.length < 2) add('conflict', 'Segmentation divides a market into at least two groups.', 'Segments');
  s.segments.forEach((g, i) => {
    if (!g.name.trim()) add('conflict', 'Give the segment a name.', `Segment ${i + 1}`);
    if (!g.bases.length) add('conflict', 'Say which basis defines this segment.', named(g, i));
    else {
      const off = g.bases.filter((b) => !s.bases.includes(b));
      if (off.length) add('note', `It uses ${listWords(off.map((b) => BASE_LABELS[b].label.toLowerCase()))} segmentation, which is not among the bases you chose.`, named(g, i));
    }
    if (!g.evidence.trim()) add('note', 'No evidence recorded for its ratings: say where the figures come from.', named(g, i));
  });
  const unused = s.bases.filter((b) => !s.segments.some((g) => g.bases.includes(b)));
  if (unused.length && s.segments.length) add('note', `No segment uses ${listWords(unused.map((b) => BASE_LABELS[b].label.toLowerCase()))} segmentation yet.`, 'Bases');
  if (s.bases.length > 1) add('fit', 'Combining bases describes segments more precisely than one basis alone.', 'Bases');

  const targets = s.segments.filter((g) => g.target);
  const results = scoreSegments(s);
  if (!targets.length) add('conflict', 'No segment is chosen as a target.', 'Targeting');
  targets.forEach((g) => {
    const i = s.segments.indexOf(g);
    if (!g.reachable) add('conflict', 'It cannot be reached through promotion and distribution, so it cannot be targeted.', named(g, i));
    if (g.fit <= 2) add('tension', 'A target with a poor fit with the business’s strengths is hard to serve well.', named(g, i));
    if (g.size <= 1) add('tension', 'Rated very small: check it is large enough to be profitable.', named(g, i));
    if (g.competition <= 1) add('tension', 'Crowded with strong rivals: the business needs a clear reason for customers to switch.', named(g, i));
  });
  // A target ranked below a segment that was not chosen needs a reason.
  for (const t of targets) {
    const tr = results.find((r) => r.id === t.id);
    const passed = results.filter((r) => !r.target && tr && r.total > tr.total);
    if (passed.length && tr) add('note', `${listWords(passed.map((p) => p.name))} ${passed.length === 1 ? 'scores' : 'score'} higher but ${passed.length === 1 ? 'is' : 'are'} not a target: say why, for example capacity, image or cost.`, t.name || 'Target');
  }
  if (targets.length > 3) add('tension', 'More than three targets: each needs its own mix, which few businesses can afford.', 'Targeting');
  if (targets.length && targets.every((g) => g.reachable && g.fit >= 3)) add('fit', 'Every target is reachable and fits the business’s strengths.', 'Targeting');

  const p = s.positioning;
  if (!p.customers.trim()) add('conflict', 'Say which customers the position is for.', 'Positioning');
  else if (targets.length) {
    const said = p.customers.toLowerCase();
    const missing = targets.filter((g) => {
      const k = keywords(g.name);
      return k.length > 0 && !k.some((w) => said.includes(w));
    });
    if (missing.length) add('tension', `The statement does not seem to name ${listWords(missing.map((g) => g.name))}, which you chose as a target.`, 'Positioning');
    else add('fit', 'The statement names the segments you chose to target.', 'Positioning');
  }
  if (!p.difference.trim()) add('conflict', 'A position needs a point of difference from rivals.', 'Positioning');
  if (!p.proof.trim()) add('tension', 'Give customers a reason to believe the difference.', 'Positioning');
  if (!p.frame.trim()) add('note', 'Name the kind of product or business customers compare it with.', 'Positioning');
  return out;
}

/** The ranking, and whether a single change of weight would change the segment ranked first. */
export function readStp(s: StpState): { reading: string; implication: string } {
  const results = scoreSegments(s);
  const max = maxTotal(s);
  if (!results.length || max === 0) return { reading: 'Add segments and give at least one criterion a weight above zero.', implication: '' };
  const top = results.filter((r) => r.rank === 1);
  const second = results.find((r) => r.rank > 1);
  const pct = (r: SiteResult) => `${Math.round(r.share)}%`;
  const lead =
    top.length > 1
      ? `${listWords(top.map((r) => r.name))} tie for first place with ${top[0]?.total} of ${max} points.`
      : `The highest-scoring segment is ${top[0]?.name}, with ${top[0]?.total} of ${max} points (${top[0] ? pct(top[0]) : ''})${second ? `, ${(top[0]?.total ?? 0) - second.total} ahead of ${second.name}` : ''}.`;
  const factors = CRITERIA.map((id) => ({ id, label: CRITERION_LABELS[id].label, weight: s.weights[id] }));
  const sites = s.segments.map((g) => ({ id: g.id, name: g.name || 'Unnamed segment', scores: { size: g.size, growth: g.growth, fit: g.fit, competition: g.competition } }));
  const sens = sensitivity(sites, factors, s.weights, MAX_RATING, MAX_WEIGHT);
  const name = (id: string) => s.segments.find((g) => g.id === id)?.name || 'Unnamed segment';
  const flips = sens.map((x) => `a weight of ${x.weight} on ${CRITERION_LABELS[x.factor as Criterion].label.toLowerCase()} (now ${s.weights[x.factor as Criterion]}) would put ${x.leaders.length > 1 ? `${listWords(x.leaders.map(name))} level` : `${name(x.leaders[0] ?? '')} first`}`);
  const reading = `${lead} ${flips.length ? `The ranking rests on the weights: ${flips.join('; ')}.` : 'No single change of weight changes the segment ranked first.'}`;
  const t = targeting(s);
  const implication = `${TARGETING_TEXT[t].label}. ${TARGETING_TEXT[t].text}`;
  return { reading, implication };
}

/** Saved or imported state made safe; null when unusable. */
export function normalizeStp(raw: unknown, fallback: StpState): StpState | null {
  const o = asObj(raw);
  if (!o) return null;
  const bases = asList(o.bases, (b) => (BASES.includes(b as Base) ? (b as Base) : null), 4);
  const w = asObj(o.weights) ?? {};
  const segments = uniqueIds(
    asList(o.segments, (x, i) => {
      const g = asObj(x);
      if (!g) return null;
      return {
        id: safeId(g.id, `s${i + 1}`),
        name: asStr(g.name, '', 60),
        profile: asStr(g.profile, '', 400),
        bases: asList(g.bases, (b) => (BASES.includes(b as Base) ? (b as Base) : null), 4),
        size: asInt(g.size, 3, 1, 5),
        growth: asInt(g.growth, 3, 1, 5),
        fit: asInt(g.fit, 3, 1, 5),
        competition: asInt(g.competition, 3, 1, 5),
        reachable: asBool(g.reachable, true),
        target: asBool(g.target),
        evidence: asStr(g.evidence, '', 300),
      };
    }, 8),
    's',
  );
  if (!segments.length) return null;
  const p = asObj(o.positioning) ?? {};
  const fp = fallback.positioning;
  return {
    business: asStr(o.business, fallback.business, 80),
    market: asStr(o.market, fallback.market, 200),
    bases: [...new Set(bases)],
    weights: Object.fromEntries(CRITERIA.map((c) => [c, asInt(w[c], fallback.weights[c], 0, MAX_WEIGHT)])) as Record<Criterion, number>,
    segments,
    positioning: {
      customers: asStr(p.customers, fp.customers, 200),
      need: asStr(p.need, fp.need, 200),
      brand: asStr(p.brand, fp.brand, 80),
      frame: asStr(p.frame, fp.frame, 120),
      difference: asStr(p.difference, fp.difference, 240),
      proof: asStr(p.proof, fp.proof, 240),
    },
  };
}

export function stpCsvRows(s: StpState): Array<Array<string | number>> {
  const results = scoreSegments(s);
  const max = maxTotal(s);
  return [
    ['Segment', 'Profile', 'Bases', ...CRITERIA.map((c) => `${CRITERION_LABELS[c].label} (1 to 5, weight ${s.weights[c]})`), 'Weighted total', `Out of`, 'Rank', 'Reachable', 'Target', 'Evidence'],
    ...s.segments.map((g) => {
      const r = results.find((x) => x.id === g.id);
      return [g.name, g.profile, g.bases.map((b) => BASE_LABELS[b].label).join('; '), g.size, g.growth, g.fit, g.competition, r?.total ?? 0, max, r?.rank ?? '', g.reachable ? 'Yes' : 'No', g.target ? 'Yes' : 'No', g.evidence];
    }),
    [],
    ['Positioning statement', positioningStatement(s.positioning)],
  ];
}

export function stpSummary(s: StpState): string {
  const results = scoreSegments(s);
  const max = maxTotal(s);
  const t = targeting(s);
  return [
    `STP plan: ${s.business}`,
    `Market: ${s.market}`,
    `Bases: ${s.bases.map((b) => BASE_LABELS[b].label).join(', ') || 'none chosen'}`,
    `Weights: ${CRITERIA.map((c) => `${CRITERION_LABELS[c].label} ${s.weights[c]}`).join(', ')}`,
    'Segments, ranked:',
    ...results.map((r) => `${r.rank}. ${r.name}: ${r.total} of ${max}${r.target ? ' (target)' : ''}`),
    `Targeting: ${TARGETING_TEXT[t].label}`,
    `Positioning: ${positioningStatement(s.positioning)}`,
  ].join('\n');
}

export function blankSegment(id: string): Segment {
  return { id, name: '', profile: '', bases: [], size: 3, growth: 3, fit: 3, competition: 3, reachable: true, target: false, evidence: '' };
}

export const isBase = (v: string): v is Base => (BASES as readonly string[]).includes(v);
