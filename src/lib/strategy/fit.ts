/**
 * Strategic fit check (enrichment: not in the IB guide). It tests a chosen
 * strategy at three levels:
 *
 * - external fit: how well the strategy answers the key factors in its
 *   environment (each weighted by importance and rated from -2, works against
 *   it, to +2, exploits or defends against it), the match between capabilities
 *   and environment that Andrews (1971) put at the heart of strategy;
 * - capability readiness: for each capability the strategy needs, the level
 *   the business has against the level it needs, weighted by importance;
 * - internal consistency: a McKinsey 7S check (Waterman, Peters and Phillips,
 *   1980) of how far the six other elements support the strategy, with the
 *   conflicts between elements the reader records.
 *
 * Fit is judged by the weakest level, not by an average, because a strategy
 * that suits the market but cannot be delivered still fails. The bands and
 * that rule are the platform's teaching convention.
 */
import { esc } from '../markup';
import { fmtNumber, round } from '../format';
import { type Check, andList, fileSlug, ident, int, list, nextId, obj, oneOf, orDash, str, textDoc, textSection, toCsv } from './common';
import { C, r1, svgDoc, txt } from './svg';
import { button, chartRegion, checksHtml, field, ratingOptions, select, tableRegion } from './ui';

export type ElementId = 'structure' | 'systems' | 'values' | 'style' | 'staff' | 'skills';
export type Node7 = 'strategy' | ElementId;
export type FactorKind = 'opportunity' | 'threat';
export type Route = 'build' | 'borrow' | 'buy' | 'none';
export type Level = 'external' | 'readiness' | 'alignment';
export type Band = 'good' | 'partial' | 'poor';

export interface EnvFactor {
  id: string;
  factor: string;
  kind: FactorKind;
  importance: number;
  /** How the strategy answers the factor: -2 works against it, 0 neutral, +2 exploits it or defends against it. */
  fit: number;
  note: string;
}

export interface Capability {
  id: string;
  name: string;
  importance: number;
  current: number;
  required: number;
  route: Route;
  note: string;
}

export interface ElementState {
  now: string;
  needs: string;
  /** How far the element as it is supports the strategy, 1 (works against it) to 5 (fully supports it). */
  support: number;
}

export interface Conflict {
  id: string;
  a: Node7;
  b: Node7;
  note: string;
}

export interface FitState {
  business: string;
  strategy: string;
  environment: EnvFactor[];
  capabilities: Capability[];
  elements: Record<ElementId, ElementState>;
  conflicts: Conflict[];
}

export const ELEMENTS: Record<ElementId, { name: string; hard: boolean; prompt: string }> = {
  structure: { name: 'Structure', hard: true, prompt: 'How the organization is divided up, and who reports to whom.' },
  systems: { name: 'Systems', hard: true, prompt: 'The processes and routines: budgets, pay and bonuses, recruitment, information.' },
  values: { name: 'Shared values', hard: false, prompt: 'What people believe the organization stands for; the centre of the model.' },
  style: { name: 'Style', hard: false, prompt: 'How leaders actually behave and where they spend their time.' },
  staff: { name: 'Staff', hard: false, prompt: 'The people: how many, of what kinds, and how they are developed.' },
  skills: { name: 'Skills', hard: false, prompt: 'What the organization as a whole is distinctively good at.' },
};
export const ELEMENT_IDS = Object.keys(ELEMENTS) as ElementId[];
export const NODE_NAMES: Record<Node7, string> = { strategy: 'Strategy', ...Object.fromEntries(ELEMENT_IDS.map((e) => [e, ELEMENTS[e].name])) } as Record<Node7, string>;
const NODE_IDS = Object.keys(NODE_NAMES) as Node7[];

export const ROUTES: Record<Route, string> = { build: 'Build it in house', borrow: 'Borrow it through a partner', buy: 'Buy it, by hiring or acquisition', none: 'No gap to close' };
const ROUTE_IDS = Object.keys(ROUTES) as Route[];
const KINDS: FactorKind[] = ['opportunity', 'threat'];

export const FIT_WORDS: Record<string, string> = { '-2': 'Works against it', '-1': 'Fits it poorly', '0': 'Neutral', '1': 'Answers it', '2': 'Exploits it or defends well' };
export const LEVEL_WORDS = ['None', 'Weak', 'Basic', 'Good', 'Strong'] as const;
export const SUPPORT_WORDS = ['Works against it', 'Pulls against it', 'Neutral', 'Supports it', 'Fully supports it'] as const;
export const IMPORTANCE_WORDS = ['Minor', 'Some', 'Moderate', 'High', 'Critical'] as const;
export const LIMITS = { factors: 10, capabilities: 10, conflicts: 10 };

export const LEVELS: Record<Level, { name: string; bands: Record<Band, { name: string; rule: string }> }> = {
  external: {
    name: 'External fit',
    bands: {
      good: { name: 'Strong', rule: '+40% or more' },
      partial: { name: 'Partial', rule: '0% to +40%' },
      poor: { name: 'Poor', rule: 'below 0%' },
    },
  },
  readiness: {
    name: 'Capability readiness',
    bands: {
      good: { name: 'Ready', rule: '80% or more' },
      partial: { name: 'Gaps to close', rule: '60% to 80%' },
      poor: { name: 'Major gaps', rule: 'below 60%' },
    },
  },
  alignment: {
    name: '7S alignment',
    bands: {
      good: { name: 'Aligned', rule: 'average support 4 or more' },
      partial: { name: 'Partly aligned', rule: 'average support 3 to 4' },
      poor: { name: 'Misaligned', rule: 'average support below 3' },
    },
  },
};
const LEVEL_IDS = Object.keys(LEVELS) as Level[];
export const BAND_CSS: Record<Band, string> = { good: 'sx-band--good', partial: 'sx-band--medium', poor: 'sx-band--high' };
const BAND_RANK: Record<Band, number> = { good: 2, partial: 1, poor: 0 };

/* ---------- Reading saved work ---------- */

export function normalize(raw: unknown): FitState {
  const r = obj(raw);
  const usedF = new Set<string>();
  const usedC = new Set<string>();
  const usedK = new Set<string>();
  const el = obj(r.elements);
  return {
    business: str(r.business, 120),
    strategy: str(r.strategy, 400),
    environment: list(r.environment, LIMITS.factors).map((x0) => {
      const x = obj(x0);
      return { id: ident(x.id, usedF, 'e'), factor: str(x.factor, 160), kind: oneOf(x.kind, KINDS, 'opportunity'), importance: int(x.importance, 1, 5, 3), fit: int(x.fit, -2, 2, 0), note: str(x.note, 400) };
    }),
    capabilities: list(r.capabilities, LIMITS.capabilities).map((x0) => {
      const x = obj(x0);
      return { id: ident(x.id, usedC, 'c'), name: str(x.name, 160), importance: int(x.importance, 1, 5, 3), current: int(x.current, 1, 5, 3), required: int(x.required, 1, 5, 4), route: oneOf(x.route, ROUTE_IDS, 'none'), note: str(x.note, 400) };
    }),
    elements: Object.fromEntries(
      ELEMENT_IDS.map((e) => {
        const x = obj(el[e]);
        return [e, { now: str(x.now, 400), needs: str(x.needs, 400), support: int(x.support, 1, 5, 3) }];
      }),
    ) as Record<ElementId, ElementState>,
    conflicts: list(r.conflicts, LIMITS.conflicts).map((x0) => {
      const x = obj(x0);
      return { id: ident(x.id, usedK, 'k'), a: oneOf(x.a, NODE_IDS, 'strategy'), b: oneOf(x.b, NODE_IDS, 'systems'), note: str(x.note, 400) };
    }),
  };
}

export function newFactor(s: Pick<FitState, 'environment'>): EnvFactor {
  return { id: nextId('e', s.environment.map((x) => x.id)), factor: '', kind: 'opportunity', importance: 3, fit: 0, note: '' };
}

export function newCapability(s: Pick<FitState, 'capabilities'>): Capability {
  return { id: nextId('c', s.capabilities.map((x) => x.id)), name: '', importance: 3, current: 3, required: 4, route: 'none', note: '' };
}

export function newConflict(s: Pick<FitState, 'conflicts'>): Conflict {
  return { id: nextId('k', s.conflicts.map((x) => x.id)), a: 'strategy', b: 'systems', note: '' };
}

export function blank(): FitState {
  const base = normalize({});
  return { ...base, environment: [newFactor(base)], capabilities: [newCapability(base)] };
}

/* ---------- The model ---------- */

const namedFactors = (s: FitState) => s.environment.filter((x) => x.factor.trim());
const namedCaps = (s: FitState) => s.capabilities.filter((x) => x.name.trim());

/** External fit, from -1 to +1: the importance-weighted fit, against the best possible. Null with no factors. */
export function externalFit(s: FitState): number | null {
  const f = namedFactors(s);
  const max = f.reduce((n, x) => n + x.importance * 2, 0);
  return max ? f.reduce((n, x) => n + x.importance * x.fit, 0) / max : null;
}

/** Capability readiness, from 0 to 1: the importance-weighted share of the required levels already held. Null with no capabilities. */
export function readiness(s: FitState): number | null {
  const c = namedCaps(s);
  const need = c.reduce((n, x) => n + x.importance * x.required, 0);
  return need ? c.reduce((n, x) => n + x.importance * Math.min(x.current, x.required), 0) / need : null;
}

/** The average support of the six elements, from 1 to 5. */
export function averageSupport(s: FitState): number {
  return ELEMENT_IDS.reduce((n, e) => n + s.elements[e].support, 0) / ELEMENT_IDS.length;
}

export function band(level: Level, s: FitState): Band | null {
  if (level === 'external') {
    const v = externalFit(s);
    if (v === null) return null;
    const x = round(v, 6);
    return x >= 0.4 ? 'good' : x >= 0 ? 'partial' : 'poor';
  }
  if (level === 'readiness') {
    const v = readiness(s);
    if (v === null) return null;
    const x = round(v, 6);
    return x >= 0.8 ? 'good' : x >= 0.6 ? 'partial' : 'poor';
  }
  const a = round(averageSupport(s), 6);
  return a >= 4 ? 'good' : a >= 3 ? 'partial' : 'poor';
}

/** The weakest of the three levels, which sets the verdict; every level at the lowest band is named. */
export function weakest(s: FitState): { band: Band; levels: Level[] } | null {
  const bands = LEVEL_IDS.map((l) => ({ l, b: band(l, s) }));
  if (bands.some((x) => x.b === null)) return null;
  const low = Math.min(...bands.map((x) => BAND_RANK[x.b as Band]));
  const b = (Object.keys(BAND_RANK) as Band[]).find((k) => BAND_RANK[k] === low) as Band;
  return { band: b, levels: bands.filter((x) => BAND_RANK[x.b as Band] === low).map((x) => x.l) };
}

export interface Gap {
  c: Capability;
  gap: number;
  /** Importance times the gap: the order in which to close them. */
  weighted: number;
}

/** Capabilities short of what the strategy needs, the largest weighted gap first. */
export function gaps(s: FitState): Gap[] {
  return namedCaps(s)
    .map((c, i) => ({ c, i, gap: Math.max(0, c.required - c.current) }))
    .filter((x) => x.gap > 0)
    .map((x) => ({ ...x, weighted: x.gap * x.c.importance }))
    .sort((a, b) => b.weighted - a.weighted || a.i - b.i)
    .map(({ c, gap, weighted }) => ({ c, gap, weighted }));
}

/** Elements that pull against the strategy (support 2 or less), weakest first. */
export function misfits(s: FitState): ElementId[] {
  return ELEMENT_IDS.filter((e) => s.elements[e].support <= 2).sort((a, b) => s.elements[a].support - s.elements[b].support);
}

/** How many recorded conflicts each element is part of. */
export function conflictCounts(s: FitState): Record<Node7, number> {
  const out = Object.fromEntries(NODE_IDS.map((n) => [n, 0])) as Record<Node7, number>;
  for (const k of s.conflicts) {
    if (k.a === k.b) continue;
    out[k.a] += 1;
    out[k.b] += 1;
  }
  return out;
}

/** The element or elements at the centre of most conflicts, if any conflict is recorded. */
export function centreOfMisfit(s: FitState): Node7[] {
  const c = conflictCounts(s);
  const max = Math.max(...NODE_IDS.map((n) => c[n]));
  return max > 0 ? NODE_IDS.filter((n) => c[n] === max) : [];
}

const pct = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmtNumber(Math.abs(v * 100), 0)}%`;
const pct0 = (v: number) => `${fmtNumber(v * 100, 0)}%`;

export function verdict(s: FitState): string {
  const w = weakest(s);
  if (!w) return 'Add at least one factor in the environment and one capability to judge the fit.';
  if (w.band === 'good') return 'Strong fit: the strategy answers its environment, the capabilities it needs are in place, and the organization is aligned behind it.';
  const what: Record<Level, string> = {
    external: 'The strategy answers its environment poorly: reconsider the strategy itself before investing in delivering it.',
    readiness: 'The capabilities the strategy needs are not ready: close the largest gaps, by building, borrowing or buying them, before or while launching.',
    alignment: 'The organization is not aligned behind the strategy: change the elements that pull against it before asking people to deliver it.',
  };
  return `${w.band === 'poor' ? 'Weak fit' : 'Partial fit'}. ${w.levels.map((l) => what[l]).join(' ')}`;
}

export function checks(s: FitState): Check[] {
  const out: Check[] = [];
  if (!s.strategy.trim()) out.push({ level: 'warning', text: 'State the strategy being tested. Fit is always fit for something.' });
  if (!namedFactors(s).length) out.push({ level: 'error', text: 'Add at least one factor in the environment, such as the opportunities and threats from a SWOT or a STEEPLE scan.' });
  else if (!namedFactors(s).some((x) => x.kind === 'threat')) out.push({ level: 'info', text: 'No threats yet. A strategy that only exploits opportunities has not been tested against what could go wrong.' });
  if (!namedCaps(s).length) out.push({ level: 'error', text: 'Add at least one capability the strategy needs.' });
  const against = namedFactors(s).filter((x) => x.fit < 0 && x.importance >= 4 && !x.note.trim());
  if (against.length) out.push({ level: 'warning', text: `The strategy works against ${andList(against.map((x) => `"${x.factor.trim()}"`))}, which you rate as important. Say in the note how the risk will be managed, or change the strategy.` });
  const noRoute = gaps(s).filter((g) => g.c.route === 'none');
  if (noRoute.length) out.push({ level: 'warning', text: `Choose how to close the gap in ${andList(noRoute.map((g) => `"${g.c.name.trim()}"`))}: build, borrow or buy.` });
  const vague = ELEMENT_IDS.filter((e) => !s.elements[e].now.trim());
  if (vague.length) out.push({ level: 'info', text: `Describe ${andList(vague.map((e) => ELEMENTS[e].name.toLowerCase()))} as ${vague.length === 1 ? 'it is' : 'they are'} now. A 7S judgement without a description is a guess.` });
  if (misfits(s).length && !s.conflicts.length) out.push({ level: 'info', text: 'Some elements pull against the strategy, but no conflict between elements is recorded. Say which elements contradict each other, such as a new structure with the old bonus system.' });
  const self = s.conflicts.filter((k) => k.a === k.b);
  if (self.length) out.push({ level: 'error', text: 'A conflict must be between two different elements.' });
  if (s.elements.values.support <= 2) out.push({ level: 'warning', text: 'Shared values pull against the strategy. Values shape every other element, so this misfit will undo changes elsewhere unless it is addressed first.' });
  return out;
}

export function reading(s: FitState): string {
  const ext = externalFit(s);
  const rdy = readiness(s);
  const avg = averageSupport(s);
  if (ext === null || rdy === null) return verdict(s);
  const g = gaps(s).slice(0, 2);
  const m = misfits(s);
  const centre = centreOfMisfit(s);
  const parts = [
    `External fit ${pct(ext)} (${LEVELS.external.bands[band('external', s) as Band].name.toLowerCase()}), capability readiness ${pct0(rdy)} (${LEVELS.readiness.bands[band('readiness', s) as Band].name.toLowerCase()}) and 7S support averaging ${fmtNumber(avg, 1)} of 5 (${LEVELS.alignment.bands[band('alignment', s) as Band].name.toLowerCase()}).`,
    verdict(s),
    g.length ? `The largest capability ${g.length === 1 ? 'gap is' : 'gaps are'} ${andList(g.map((x) => `${x.c.name.trim().toLowerCase()} (${x.c.current} of the ${x.c.required} needed)`))}.` : 'No capability falls short of what the strategy needs.',
    m.length ? `${andList(m.map((e) => ELEMENTS[e].name))} ${m.length === 1 ? 'pulls' : 'pull'} against the strategy${centre.length ? `, and ${andList(centre.map((n) => NODE_NAMES[n].toLowerCase()))} ${centre.length === 1 ? 'sits' : 'sit'} at the centre of the most conflicts` : ''}.` : 'No element pulls against the strategy.',
    'Fit is judged by the weakest level, not the average: a strategy the organization cannot deliver fails however well it suits the market.',
  ];
  return parts.join(' ');
}

export function headline(s: FitState): string {
  const w = weakest(s);
  if (!w) return 'Fit not judged yet: add the environment and the capabilities.';
  return `${w.band === 'good' ? 'Strong fit' : w.band === 'partial' ? 'Partial fit' : 'Weak fit'}; weakest: ${andList(w.levels.map((l) => LEVELS[l].name.toLowerCase()))}.`;
}

/* ---------- Charts ---------- */

/** The three levels as bars on a common scale, with their bands. */
export function levelsSvg(s: FitState, id: string): string {
  const W = 620;
  const H = 228;
  const L = 176;
  const R = 72;
  const bw = W - L - R;
  const p: string[] = [];
  const rows: Array<{ l: Level; value: number | null; lo: number; hi: number; cuts: number[]; label: string }> = [
    { l: 'external', value: externalFit(s), lo: -1, hi: 1, cuts: [0, 0.4], label: externalFit(s) === null ? 'n/a' : pct(externalFit(s) as number) },
    { l: 'readiness', value: readiness(s), lo: 0, hi: 1, cuts: [0.6, 0.8], label: readiness(s) === null ? 'n/a' : pct0(readiness(s) as number) },
    { l: 'alignment', value: (averageSupport(s) - 1) / 4, lo: 0, hi: 1, cuts: [0.5, 0.75], label: `${fmtNumber(averageSupport(s), 1)} of 5` },
  ];
  rows.forEach((row, i) => {
    const y = 28 + i * 66;
    const x = (v: number) => L + ((v - row.lo) / (row.hi - row.lo)) * bw;
    const b = band(row.l, s);
    p.push(txt(L - 12, y + 16, LEVELS[row.l].name, { anchor: 'end', size: 13, weight: 700, fill: C.ink }));
    p.push(txt(L - 12, y + 32, b ? LEVELS[row.l].bands[b].name : 'Not judged', { anchor: 'end', size: 11.5, fill: b === 'poor' ? C.signalText : b === 'good' ? C.greenText : C.goldText }));
    const [c1, c2] = row.cuts as [number, number];
    p.push(`<rect x="${r1(x(row.lo))}" y="${y}" width="${r1(x(c1) - x(row.lo))}" height="34" fill="${C.signalWash}"/>`);
    p.push(`<rect x="${r1(x(c1))}" y="${y}" width="${r1(x(c2) - x(c1))}" height="34" fill="${C.goldWash}"/>`);
    p.push(`<rect x="${r1(x(c2))}" y="${y}" width="${r1(x(row.hi) - x(c2))}" height="34" fill="${C.greenWash}"/>`);
    p.push(`<rect x="${L}" y="${y}" width="${bw}" height="34" fill="none" stroke="${C.hair}"/>`);
    if (row.value !== null) {
      const v = Math.max(row.lo, Math.min(row.hi, row.value));
      const from = row.lo < 0 ? x(0) : x(row.lo);
      p.push(`<rect x="${r1(Math.min(from, x(v)))}" y="${y + 9}" width="${r1(Math.max(2, Math.abs(x(v) - from)))}" height="16" fill="${C.ink}"/>`);
      p.push(txt(L + bw + 10, y + 22, row.label, { size: 13, weight: 700, fill: C.ink }));
    }
    if (row.lo < 0) p.push(`<line x1="${r1(x(0))}" y1="${y - 4}" x2="${r1(x(0))}" y2="${y + 38}" stroke="${C.ink}" stroke-width="1"/>`);
  });
  const desc = `Strategic fit at three levels. ${rows.map((r) => `${LEVELS[r.l].name}: ${r.label}${band(r.l, s) ? `, ${LEVELS[r.l].bands[band(r.l, s) as Band].name.toLowerCase()}` : ''}`).join('; ')}. ${verdict(s)}`;
  return svgDoc(W, H, id, 'Strategic fit at three levels', desc, p.join(''));
}

/** The seven elements, shared values at the centre, with each element's support and the conflicts recorded between them. */
export function sevenSSvg(s: FitState, id: string): string {
  const W = 560;
  const H = 470;
  const cx = 280;
  const cy = 232;
  const rr = 168;
  const angle: Record<Exclude<Node7, 'values'>, number> = { structure: -90, systems: -30, style: 30, staff: 90, skills: 150, strategy: 210 };
  const pos = (n: Node7): [number, number] => (n === 'values' ? [cx, cy] : [cx + rr * Math.cos((angle[n] * Math.PI) / 180), cy + rr * Math.sin((angle[n] * Math.PI) / 180)]);
  const p: string[] = [];
  // Every pair joined faintly: in the model, every element touches every other.
  for (let i = 0; i < NODE_IDS.length; i++)
    for (let j = i + 1; j < NODE_IDS.length; j++) {
      const [x1, y1] = pos(NODE_IDS[i]!);
      const [x2, y2] = pos(NODE_IDS[j]!);
      p.push(`<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${C.hair}" stroke-width="1"/>`);
    }
  for (const k of s.conflicts) {
    if (k.a === k.b) continue;
    const [x1, y1] = pos(k.a);
    const [x2, y2] = pos(k.b);
    // A line between opposite elements would run through shared values and look like a conflict with it, so it bends round the centre.
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const through = k.a !== 'values' && k.b !== 'values' && Math.hypot(mx - cx, my - cy) < 60;
    if (through) {
      const len = Math.hypot(x2 - x1, y2 - y1) || 1;
      const qx = mx + ((y2 - y1) / len) * 150;
      const qy = my - ((x2 - x1) / len) * 150;
      p.push(`<path d="M${r1(x1)} ${r1(y1)} Q${r1(qx)} ${r1(qy)} ${r1(x2)} ${r1(y2)}" fill="none" stroke="${C.signal}" stroke-width="3" stroke-dasharray="7 4"/>`);
    } else p.push(`<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${C.signal}" stroke-width="3" stroke-dasharray="7 4"/>`);
  }
  const counts = conflictCounts(s);
  for (const n of NODE_IDS) {
    const [x, y] = pos(n);
    const support = n === 'strategy' ? null : s.elements[n].support;
    const fill = support === null ? C.paper : support >= 4 ? C.greenWash : support <= 2 ? C.signalWash : C.white;
    const stroke = support === null ? C.ink : support >= 4 ? C.green : support <= 2 ? C.signal : C.slate;
    p.push(`<circle cx="${r1(x)}" cy="${r1(y)}" r="52" fill="${fill}" stroke="${stroke}" stroke-width="${n === 'values' || n === 'strategy' ? 2.5 : 1.75}"/>`);
    p.push(txt(x, y - 6, NODE_NAMES[n], { anchor: 'middle', serif: true, size: 15, weight: 700, fill: C.ink }));
    p.push(txt(x, y + 12, support === null ? 'Being tested' : `Support ${support} of 5`, { anchor: 'middle', size: 11.5, fill: C.body }));
    if (counts[n]) p.push(txt(x, y + 27, `${counts[n]} conflict${counts[n] === 1 ? '' : 's'}`, { anchor: 'middle', size: 11, weight: 600, fill: C.signalText }));
  }
  const desc = `McKinsey 7S consistency check, shared values at the centre. ${ELEMENT_IDS.map((e) => `${ELEMENTS[e].name}: support ${s.elements[e].support} of 5`).join('; ')}. ${
    s.conflicts.filter((k) => k.a !== k.b).length ? `Conflicts recorded: ${s.conflicts.filter((k) => k.a !== k.b).map((k) => `${NODE_NAMES[k.a]} with ${NODE_NAMES[k.b]}`).join('; ')}.` : 'No conflicts recorded.'
  }`;
  return svgDoc(W, H, id, 'The seven elements and the conflicts between them', desc, p.join(''));
}

/* ---------- HTML ---------- */

const importanceOpts = ratingOptions(IMPORTANCE_WORDS);
const levelOpts = ratingOptions(LEVEL_WORDS);
const supportOpts = ratingOptions(SUPPORT_WORDS);
const fitOpts = [-2, -1, 0, 1, 2].map((v) => ({ value: v, label: `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}: ${FIT_WORDS[String(v)]}` }));

function factorRow(x: EnvFactor, n: number, uid: string): string {
  const id = `${uid}-${x.id}`;
  const nm = x.factor.trim() || `factor ${n}`;
  return `<li class="sx-row" data-row="${esc(x.id)}"><p class="sx-row__code" aria-hidden="true">${n}</p><div class="sx-row__body"><div class="sx-grid-2">${field({ id: `${id}-factor`, k: `environment.${x.id}.factor`, label: `Factor ${n}`, value: x.factor, maxlength: 160 })}${select({
    id: `${id}-kind`,
    k: `environment.${x.id}.kind`,
    label: 'Opportunity or threat',
    labelHtml: `Opportunity or threat<span class="sr-only">: ${esc(nm)}</span>`,
    value: x.kind,
    options: KINDS.map((k) => ({ value: k, label: k === 'opportunity' ? 'Opportunity' : 'Threat' })),
  })}</div><div class="sx-grid-2">${select({ id: `${id}-imp`, k: `environment.${x.id}.importance`, label: 'Importance', labelHtml: `Importance<span class="sr-only">: ${esc(nm)}</span>`, value: x.importance, options: importanceOpts, integer: true })}${select({
    id: `${id}-fit`,
    k: `environment.${x.id}.fit`,
    label: 'How the strategy answers it',
    labelHtml: `How the strategy answers it<span class="sr-only">: ${esc(nm)}</span>`,
    value: x.fit,
    options: fitOpts,
    integer: true,
  })}</div>${field({ id: `${id}-note`, k: `environment.${x.id}.note`, label: 'Why', value: x.note, multiline: true, rows: 2, maxlength: 400 })}<div class="sx-row__meta">${button({
    act: 'remove-factor',
    label: 'Remove',
    aria: `Remove factor ${n}: ${nm}`,
    data: { id: x.id },
    cls: 'sx-row__remove',
  })}</div></div></li>`;
}

function capabilityRow(x: Capability, n: number, uid: string): string {
  const id = `${uid}-${x.id}`;
  const nm = x.name.trim() || `capability ${n}`;
  const sr = (label: string) => `${label}<span class="sr-only">: ${esc(nm)}</span>`;
  return `<li class="sx-row" data-row="${esc(x.id)}"><p class="sx-row__code" aria-hidden="true">${n}</p><div class="sx-row__body">${field({ id: `${id}-name`, k: `capabilities.${x.id}.name`, label: `Capability ${n}`, value: x.name, maxlength: 160 })}<div class="sx-nums sx-nums--3">${select({
    id: `${id}-imp`,
    k: `capabilities.${x.id}.importance`,
    label: 'Importance',
    labelHtml: sr('Importance'),
    value: x.importance,
    options: importanceOpts,
    integer: true,
  })}${select({ id: `${id}-cur`, k: `capabilities.${x.id}.current`, label: 'Level now', labelHtml: sr('Level now'), value: x.current, options: levelOpts, integer: true })}${select({
    id: `${id}-req`,
    k: `capabilities.${x.id}.required`,
    label: 'Level needed',
    labelHtml: sr('Level needed'),
    value: x.required,
    options: levelOpts,
    integer: true,
  })}</div>${select({ id: `${id}-route`, k: `capabilities.${x.id}.route`, label: 'How to close any gap', labelHtml: sr('How to close any gap'), value: x.route, options: ROUTE_IDS.map((r) => ({ value: r, label: ROUTES[r] })) })}${field({
    id: `${id}-note`,
    k: `capabilities.${x.id}.note`,
    label: 'Evidence and plan',
    value: x.note,
    multiline: true,
    rows: 2,
    maxlength: 400,
  })}<div class="sx-row__meta">${button({ act: 'remove-capability', label: 'Remove', aria: `Remove capability ${n}: ${nm}`, data: { id: x.id }, cls: 'sx-row__remove' })}</div></div></li>`;
}

function elementFields(s: FitState, e: ElementId, uid: string): string {
  const x = s.elements[e];
  const id = `${uid}-${e}`;
  return `<fieldset class="sx-q sx-q--element"><legend>${esc(ELEMENTS[e].name)} <span class="muted">(${ELEMENTS[e].hard ? 'hard' : 'soft'} element)</span></legend><p class="sx-q__prompt">${esc(ELEMENTS[e].prompt)}</p><div class="sx-row__body"><div class="sx-grid-2">${field({
    id: `${id}-now`,
    k: `elements.${e}.now`,
    label: 'As it is now',
    value: x.now,
    multiline: true,
    rows: 2,
    maxlength: 400,
  })}${field({ id: `${id}-needs`, k: `elements.${e}.needs`, label: 'As the strategy needs it', value: x.needs, multiline: true, rows: 2, maxlength: 400 })}</div>${select({
    id: `${id}-sup`,
    k: `elements.${e}.support`,
    label: 'How far it supports the strategy now',
    labelHtml: `How far it supports the strategy now<span class="sr-only">: ${esc(ELEMENTS[e].name)}</span>`,
    value: x.support,
    options: supportOpts,
    integer: true,
  })}</div></fieldset>`;
}

function conflictRow(k: Conflict, n: number, uid: string): string {
  const id = `${uid}-${k.id}`;
  const opts = NODE_IDS.map((x) => ({ value: x, label: NODE_NAMES[x] }));
  return `<li class="sx-row" data-row="${esc(k.id)}"><p class="sx-row__code" aria-hidden="true">${n}</p><div class="sx-row__body"><div class="sx-grid-2">${select({ id: `${id}-a`, k: `conflicts.${k.id}.a`, label: `Conflict ${n}: this element`, value: k.a, options: opts })}${select({
    id: `${id}-b`,
    k: `conflicts.${k.id}.b`,
    label: 'pulls against this one',
    labelHtml: `pulls against this one<span class="sr-only"> (conflict ${n})</span>`,
    value: k.b,
    options: opts,
  })}</div>${field({ id: `${id}-note`, k: `conflicts.${k.id}.note`, label: 'How they pull apart', value: k.note, multiline: true, rows: 2, maxlength: 400 })}<div class="sx-row__meta">${button({
    act: 'remove-conflict',
    label: 'Remove',
    aria: `Remove conflict ${n}`,
    data: { id: k.id },
    cls: 'sx-row__remove',
  })}</div></div></li>`;
}

export function editorHtml(s: FitState, uid: string): string {
  return `<div class="sx-context">${field({ id: `${uid}-business`, k: 'business', label: 'Organization', value: s.business, maxlength: 120 })}${field({
    id: `${uid}-strategy`,
    k: 'strategy',
    label: 'The strategy being tested',
    value: s.strategy,
    multiline: true,
    rows: 2,
    maxlength: 400,
  })}</div><fieldset class="sx-q"><legend>A. Fit with the environment</legend><p class="sx-q__prompt">The opportunities and threats that matter most, from your SWOT, STEEPLE or Five Forces. For each, say how well the strategy answers it.</p><ol class="sx-rows" role="list">${s.environment
    .map((x, i) => factorRow(x, i + 1, uid))
    .join('')}</ol>${button({ act: 'add-factor', label: 'Add a factor', cls: 'sx-add', disabled: s.environment.length >= LIMITS.factors })}</fieldset><fieldset class="sx-q"><legend>B. The capabilities it needs</legend><p class="sx-q__prompt">What the business must be able to do for the strategy to work, the level it has now and the level it needs, from 1 (none) to 5 (strong).</p><ol class="sx-rows" role="list">${s.capabilities
    .map((x, i) => capabilityRow(x, i + 1, uid))
    .join('')}</ol>${button({ act: 'add-capability', label: 'Add a capability', cls: 'sx-add', disabled: s.capabilities.length >= LIMITS.capabilities })}</fieldset><fieldset class="sx-q"><legend>C. The 7S consistency check</legend><p class="sx-q__prompt">Describe each of the six other elements as it is and as the strategy needs it, and rate how far it supports the strategy now.</p>${ELEMENT_IDS.map((e) =>
    elementFields(s, e, uid),
  ).join('')}<h4 class="sx-ed__h">Conflicts between elements</h4><p class="sx-q__prompt">Pairs of elements that pull in different directions, such as a new structure with the old bonus system.</p><ol class="sx-rows" role="list">${s.conflicts
    .map((k, i) => conflictRow(k, i + 1, uid))
    .join('')}</ol>${button({ act: 'add-conflict', label: 'Add a conflict', cls: 'sx-add', disabled: s.conflicts.length >= LIMITS.conflicts })}</fieldset>`;
}

const fitWord = (v: number) => FIT_WORDS[String(v)] ?? '';

export function outputsHtml(s: FitState, uid: string): string {
  const ext = externalFit(s);
  const rdy = readiness(s);
  const figs = LEVEL_IDS.map((l) => {
    const b = band(l, s);
    const v = l === 'external' ? (ext === null ? 'n/a' : pct(ext)) : l === 'readiness' ? (rdy === null ? 'n/a' : pct0(rdy)) : `${fmtNumber(averageSupport(s), 1)}`;
    return `<div class="fig"><dt>${esc(LEVELS[l].name)}</dt><dd><span class="fig__v num">${esc(v)}</span><span class="fig__n">${b ? `<span class="sx-band ${BAND_CSS[b]}">${esc(LEVELS[l].bands[b].name)}</span>` : 'not judged'}${l === 'alignment' ? ' (of 5)' : ''}</span></dd></div>`;
  }).join('');
  const factors = namedFactors(s);
  const envTable = factors.length
    ? tableRegion(
        'Fit with the environment',
        `<caption class="sr-only">Each factor in the environment, its importance, how the strategy answers it and the weighted score</caption><thead><tr><th scope="col">Factor</th><th scope="col">Kind</th><th scope="col" class="n">Importance</th><th scope="col" class="n">Fit</th><th scope="col" class="n">Weighted</th></tr></thead><tbody>${factors
          .map(
            (x) =>
              `<tr><th scope="row">${esc(x.factor.trim())}${x.note.trim() ? `<span class="sx-swot__ev">${esc(x.note.trim())}</span>` : ''}</th><td>${x.kind === 'opportunity' ? 'Opportunity' : 'Threat'}</td><td class="n num">${x.importance}</td><td class="n num">${x.fit > 0 ? '+' : x.fit < 0 ? '−' : ''}${Math.abs(x.fit)}<span class="sx-swot__ev">${esc(fitWord(x.fit))}</span></td><td class="n num">${x.importance * x.fit > 0 ? '+' : x.importance * x.fit < 0 ? '−' : ''}${Math.abs(x.importance * x.fit)}</td></tr>`,
          )
          .join('')}</tbody><tfoot><tr><th scope="row" colspan="4">External fit: the weighted total against the best possible (${factors.reduce((n, x) => n + x.importance * 2, 0)})</th><td class="n num"><strong>${ext === null ? 'n/a' : esc(pct(ext))}</strong></td></tr></tfoot>`,
      )
    : '<p class="small muted">No factors yet.</p>';
  const caps = namedCaps(s);
  const capTable = caps.length
    ? tableRegion(
        'Capabilities the strategy needs',
        `<caption class="sr-only">Each capability's importance, its level now and the level needed, and how any gap will be closed</caption><thead><tr><th scope="col">Capability</th><th scope="col" class="n">Importance</th><th scope="col" class="n">Now</th><th scope="col" class="n">Needed</th><th scope="col" class="n">Gap</th><th scope="col">Route</th></tr></thead><tbody>${caps
          .map(
            (x) =>
              `<tr><th scope="row">${esc(x.name.trim())}${x.note.trim() ? `<span class="sx-swot__ev">${esc(x.note.trim())}</span>` : ''}</th><td class="n num">${x.importance}</td><td class="n num">${x.current}</td><td class="n num">${x.required}</td><td class="n num">${Math.max(0, x.required - x.current)}</td><td class="small">${esc(x.required > x.current ? ROUTES[x.route] : 'No gap to close')}</td></tr>`,
          )
          .join('')}</tbody><tfoot><tr><th scope="row" colspan="5">Readiness: the weighted levels held against those needed</th><td class="n num"><strong>${rdy === null ? 'n/a' : esc(pct0(rdy))}</strong></td></tr></tfoot>`,
      )
    : '<p class="small muted">No capabilities yet.</p>';
  const g = gaps(s);
  const gapList = g.length ? `<ol class="sx-working" role="list">${g.map((x) => `<li>${esc(`${x.c.name.trim()}: ${x.c.current} of the ${x.c.required} needed, importance ${x.c.importance} (weighted gap ${x.weighted}). ${x.c.route === 'none' ? 'Route not chosen.' : `${ROUTES[x.c.route]}.`}`)}</li>`).join('')}</ol>` : '<p class="small muted">No gaps: every capability is at the level the strategy needs.</p>';
  const centre = centreOfMisfit(s);
  const conflicts = s.conflicts.filter((k) => k.a !== k.b);
  const elTable = tableRegion(
    'The 7S consistency check',
    `<caption class="sr-only">Each of the six elements as it is, as the strategy needs it, and how far it supports the strategy now</caption><thead><tr><th scope="col">Element</th><th scope="col">Now</th><th scope="col">The strategy needs</th><th scope="col" class="n">Support</th></tr></thead><tbody>${ELEMENT_IDS.map(
      (e) =>
        `<tr><th scope="row">${esc(ELEMENTS[e].name)}<span class="sx-swot__ev">${ELEMENTS[e].hard ? 'Hard' : 'Soft'} element</span></th><td class="small">${esc(orDash(s.elements[e].now))}</td><td class="small">${esc(orDash(s.elements[e].needs))}</td><td class="n num">${s.elements[e].support}<span class="sx-swot__ev">${esc(SUPPORT_WORDS[s.elements[e].support - 1] ?? '')}</span></td></tr>`,
    ).join('')}</tbody><tfoot><tr><th scope="row" colspan="3">Average support</th><td class="n num"><strong>${fmtNumber(averageSupport(s), 1)}</strong></td></tr></tfoot>`,
  );
  const conflictList = conflicts.length
    ? `<ul class="sx-change" role="list">${conflicts.map((k) => `<li><span class="sx-change__force">${esc(NODE_NAMES[k.a])} against ${esc(NODE_NAMES[k.b])}</span><span class="sx-change__note">${esc(orDash(k.note, 'No note yet.'))}</span></li>`).join('')}</ul>${centre.length ? `<p class="small">At the centre of the most conflicts: <strong>${esc(andList(centre.map((n) => NODE_NAMES[n])))}</strong>. Change there first, or the other changes will be pulled back.</p>` : ''}`
    : '<p class="small muted">No conflicts between elements recorded.</p>';
  return `<div class="sx-out__block"><h4 class="sx-out__h">Fit at three levels</h4><p class="small muted">${esc(orDash(s.business, 'Organization not named'))}. ${esc(s.strategy.trim() ? `Strategy: ${s.strategy.trim()}` : 'Strategy not stated.')}</p><dl class="figs sx-figs">${figs}</dl>${chartRegion('Strategic fit chart', levelsSvg(s, `${uid}-levels`))}<p class="sx-reading" data-reading>${esc(reading(s))}</p><ul class="sx-legend" role="list">${LEVEL_IDS.map((l) => `<li><b>${esc(LEVELS[l].name)}:</b> ${(Object.keys(LEVELS[l].bands) as Band[]).map((b) => `${esc(LEVELS[l].bands[b].name.toLowerCase())} ${esc(LEVELS[l].bands[b].rule)}`).join('; ')}</li>`).join('')}<li>The bands are the platform's teaching convention.</li></ul></div><div class="sx-out__block"><h4 class="sx-out__h">A. Fit with the environment</h4>${envTable}</div><div class="sx-out__block"><h4 class="sx-out__h">B. Capability readiness</h4>${capTable}<h5 class="sx-out__h5">The gaps to close, largest first</h5>${gapList}</div><div class="sx-out__block"><h4 class="sx-out__h">C. The 7S consistency check</h4>${chartRegion('McKinsey 7S chart', sevenSSvg(s, `${uid}-7s`))}<ul class="sx-legend" role="list"><li>Green ring: supports the strategy (4 or 5)</li><li>Red ring: pulls against it (2 or less)</li><li>Dashed red line: a conflict you recorded</li></ul>${elTable}<h5 class="sx-out__h5">Conflicts between elements</h5>${conflictList}</div><div class="sx-out__block"><h4 class="sx-out__h">Checks</h4>${checksHtml(checks(s), 'No problems found: the strategy is stated, the environment and capabilities are judged, every gap has a route and every element is described.')}</div>`;
}

/* ---------- Export ---------- */

export function toText(s: FitState): string {
  const ext = externalFit(s);
  const rdy = readiness(s);
  return textDoc(`Strategic fit check (enrichment): ${orDash(s.business, 'organization not named')}`, [
    textSection('Strategy', [orDash(s.strategy)]),
    textSection('Verdict', [reading(s)]),
    textSection(
      `A. Fit with the environment: ${ext === null ? 'not judged' : pct(ext)}`,
      namedFactors(s).map((x) => `- ${x.factor.trim()} [${x.kind}; importance ${x.importance}; fit ${x.fit > 0 ? '+' : ''}${x.fit}, ${fitWord(x.fit).toLowerCase()}]${x.note.trim() ? `\n  ${x.note.trim()}` : ''}`),
    ),
    textSection(
      `B. Capability readiness: ${rdy === null ? 'not judged' : pct0(rdy)}`,
      namedCaps(s).map((x) => `- ${x.name.trim()} [importance ${x.importance}; now ${x.current}, needed ${x.required}]${x.required > x.current ? ` ${ROUTES[x.route]}.` : ''}${x.note.trim() ? `\n  ${x.note.trim()}` : ''}`),
    ),
    textSection(
      `C. 7S consistency: average support ${fmtNumber(averageSupport(s), 1)} of 5`,
      [
        ...ELEMENT_IDS.map((e) => `- ${ELEMENTS[e].name} [support ${s.elements[e].support} of 5]\n  Now: ${orDash(s.elements[e].now)}\n  Needs: ${orDash(s.elements[e].needs)}`),
        ...s.conflicts.filter((k) => k.a !== k.b).map((k) => `- Conflict: ${NODE_NAMES[k.a]} against ${NODE_NAMES[k.b]}${k.note.trim() ? `: ${k.note.trim()}` : ''}`),
      ],
    ),
    textSection('Checks', checks(s).map((c) => `- ${c.text}`)),
    'Made with the Strategy Studio, The Business Brief. The strategic fit check and the McKinsey 7S framework are not part of the IB course. A framework structures judgement; it does not produce the answer.',
  ]);
}

export function toCsvText(s: FitState): string {
  return toCsv([
    ['Level', 'Item', 'Kind', 'Importance', 'Rating', 'Needed', 'Note'],
    ...namedFactors(s).map((x) => ['External fit', x.factor.trim(), x.kind, x.importance, x.fit, '', x.note.trim()]),
    ...namedCaps(s).map((x) => ['Capability', x.name.trim(), ROUTES[x.route], x.importance, x.current, x.required, x.note.trim()]),
    ...ELEMENT_IDS.map((e) => ['7S element', ELEMENTS[e].name, ELEMENTS[e].hard ? 'hard' : 'soft', '', s.elements[e].support, '', `${s.elements[e].now.trim()} | ${s.elements[e].needs.trim()}`]),
    ...s.conflicts.filter((k) => k.a !== k.b).map((k) => ['7S conflict', `${NODE_NAMES[k.a]} against ${NODE_NAMES[k.b]}`, '', '', '', '', k.note.trim()]),
    ['Result', 'External fit', '', '', externalFit(s) === null ? '' : round(externalFit(s) as number, 4), '', ''],
    ['Result', 'Capability readiness', '', '', readiness(s) === null ? '' : round(readiness(s) as number, 4), '', ''],
    ['Result', '7S average support', '', '', round(averageSupport(s), 2), '', ''],
  ]);
}

export function fileName(s: FitState): string {
  return `${fileSlug(s.business)}-strategic-fit`;
}

export function problems(s: FitState): string[] {
  const out: string[] = [];
  if (!s.strategy.trim()) out.push('the worked example needs a strategy');
  if (namedFactors(s).length < 4 || !namedFactors(s).some((x) => x.kind === 'threat')) out.push('the worked example needs at least four factors, including a threat');
  if (namedCaps(s).length < 4 || !gaps(s).length) out.push('the worked example needs at least four capabilities, with a gap to close');
  if (gaps(s).some((g) => g.c.route === 'none')) out.push('every gap in the worked example needs a route');
  ELEMENT_IDS.forEach((e) => (s.elements[e].now.trim() && s.elements[e].needs.trim()) || out.push(`element ${e} needs both descriptions`));
  if (s.conflicts.filter((k) => k.a !== k.b && k.note.trim()).length < 2) out.push('the worked example should record at least two conflicts with notes');
  return out;
}

