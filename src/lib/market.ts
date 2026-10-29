/**
 * Market Studio models: market share and market growth (subtopic 4.1) and the
 * position map (4.2). Pure functions, shared by the components, their scripts
 * and the unit tests.
 *
 * Market share and market growth are standard definitions. The guide's formula
 * list (pp. 64 to 65) does not include them; the teacher support material's
 * glossary describes both, and notes that share can be measured by value or by
 * volume (TSM, p. 86).
 */
import type { Working } from './finance';
import { fmtNumber } from './format';

/* ---------- Market share and market growth ---------- */

export interface MarketFirm {
  id: string;
  name: string;
  /** Sales in the earlier period. */
  last: number;
  /** Sales in the later period. */
  now: number;
  /** A line that groups many small sellers: counted in the market, but not ranked or named as a leader. */
  group?: boolean;
}

export interface FirmResult extends MarketFirm {
  /** Share of the market in each period, in per cent; null when the market is empty. */
  shareLast: number | null;
  shareNow: number | null;
  /** Change in share, in percentage points. */
  shareChange: number | null;
  /** Growth in the firm's own sales, in per cent; null when it sold nothing before. */
  salesGrowth: number | null;
  /** Rank among named firms by sales, 1 for the largest; 0 for a group line. */
  rankLast: number;
  rankNow: number;
}

export interface MarketModel {
  firms: FirmResult[];
  totalLast: number;
  totalNow: number;
  /** Market growth, in per cent; null when the earlier market was empty. */
  growth: number | null;
  leaderLast: string | null;
  leaderNow: string | null;
}

/** Market share = the firm's sales ÷ total market sales × 100. */
export function marketShare(sales: number, total: number): number | null {
  return total > 0 ? (sales / total) * 100 : null;
}

/** Growth = (this period − last period) ÷ last period × 100. */
export function growthRate(last: number, now: number): number | null {
  return last > 0 ? ((now - last) / last) * 100 : null;
}

/** Rank named firms by sales, 1 for the largest; equal sales share a rank. Group lines get 0. */
function ranks(firms: MarketFirm[], key: 'last' | 'now'): number[] {
  const named = firms.filter((f) => !f.group);
  return firms.map((f) => (f.group ? 0 : 1 + named.filter((g) => g[key] > f[key]).length));
}

export function marketModel(firms: MarketFirm[]): MarketModel {
  const totalLast = firms.reduce((n, f) => n + f.last, 0);
  const totalNow = firms.reduce((n, f) => n + f.now, 0);
  const rl = ranks(firms, 'last');
  const rn = ranks(firms, 'now');
  const out = firms.map((f, i) => {
    const shareLast = marketShare(f.last, totalLast);
    const shareNow = marketShare(f.now, totalNow);
    return {
      ...f,
      shareLast,
      shareNow,
      shareChange: shareLast === null || shareNow === null ? null : shareNow - shareLast,
      salesGrowth: growthRate(f.last, f.now),
      rankLast: rl[i] ?? 0,
      rankNow: rn[i] ?? 0,
    };
  });
  const leader = (key: 'last' | 'now') => {
    const named = firms.filter((f) => !f.group);
    if (!named.length) return null;
    const top = Math.max(...named.map((f) => f[key]));
    const leaders = named.filter((f) => f[key] === top);
    return top > 0 && leaders.length === 1 ? (leaders[0]?.id ?? null) : null;
  };
  return { firms: out, totalLast, totalNow, growth: growthRate(totalLast, totalNow), leaderLast: leader('last'), leaderNow: leader('now') };
}

export interface MarketProblem {
  id: string;
  field: 'last' | 'now';
  message: string;
}

/** Sales must be numbers of zero or more, and each period must have some sales. */
export function validateMarket(firms: Array<{ id: string; last: number | null; now: number | null }>): MarketProblem[] {
  const out: MarketProblem[] = [];
  for (const f of firms) {
    for (const field of ['last', 'now'] as const) {
      const v = f[field];
      if (v === null || !Number.isFinite(v)) out.push({ id: f.id, field, message: 'Enter a number.' });
      else if (v < 0) out.push({ id: f.id, field, message: 'Sales cannot be negative.' });
    }
  }
  if (!out.length) {
    for (const field of ['last', 'now'] as const) {
      if (firms.reduce((n, f) => n + (f[field] ?? 0), 0) <= 0) {
        const first = firms[0];
        if (first) out.push({ id: first.id, field, message: 'The market needs some sales in each year.' });
      }
    }
  }
  return out;
}

const pc = (v: number | null, d = 1) => (v === null ? 'n/a' : `${fmtNumber(v, d)}%`);
const pp = (v: number) => `${fmtNumber(Math.abs(v), 1)} percentage ${Math.abs(Number(v.toFixed(1))) === 1 ? 'point' : 'points'}`;

/**
 * A plain-language reading for one firm. It catches the cases that most often
 * mislead: sales rising while share falls, and sales falling while share rises.
 */
export function readMarket(m: MarketModel, focusId: string, periods: { last: string; now: string }, unit: string): { reading: string; implication: string } {
  const f = m.firms.find((x) => x.id === focusId);
  const name = (id: string | null) => m.firms.find((x) => x.id === id)?.name ?? '';
  if (!f || f.shareLast === null || f.shareNow === null || m.growth === null) {
    return { reading: 'Enter sales for both years to compare shares.', implication: '' };
  }
  const market = `The market ${m.growth > 0.05 ? `grew by ${pc(m.growth)}` : m.growth < -0.05 ? `shrank by ${pc(Math.abs(m.growth))}` : 'stayed the same size'}, from ${fmtNumber(m.totalLast)} to ${fmtNumber(m.totalNow)} ${unit}.`;
  const change = f.shareChange ?? 0;
  const flat = Math.abs(change) < 0.05;
  const sales = f.salesGrowth === null ? `${f.name} had no sales in ${periods.last}` : `${f.name}'s sales ${f.salesGrowth > 0.05 ? `rose by ${pc(f.salesGrowth)}` : f.salesGrowth < -0.05 ? `fell by ${pc(Math.abs(f.salesGrowth))}` : 'did not change'}`;
  const share = flat ? `its share held at ${pc(f.shareNow)}` : `its share ${change > 0 ? 'rose' : 'fell'} from ${pc(f.shareLast)} to ${pc(f.shareNow)}, ${pp(change)}`;
  let twist = '';
  if (!flat && f.salesGrowth !== null && f.salesGrowth > 0.05 && change < 0) twist = ' Growing sales are not the same as a growing share: the market grew faster than the firm did.';
  else if (!flat && f.salesGrowth !== null && f.salesGrowth < -0.05 && change > 0) twist = ' Falling sales can still mean a rising share: the market shrank faster than the firm did.';
  const leaderChange =
    m.leaderNow && m.leaderLast && m.leaderNow !== m.leaderLast
      ? ` ${name(m.leaderNow)} has taken market leadership from ${name(m.leaderLast)}.`
      : m.leaderNow
        ? ` ${name(m.leaderNow)} is the market leader${m.leaderNow === focusId ? '' : ` with ${pc(m.firms.find((x) => x.id === m.leaderNow)?.shareNow ?? null)}`}.`
        : '';
  const overtaken = f.group ? [] : m.firms.filter((x) => !x.group && x.id !== focusId && x.rankLast > f.rankLast && x.rankNow < f.rankNow).map((x) => x.name);
  const passed = overtaken.length ? ` ${overtaken.join(' and ')} overtook ${f.name}.` : '';
  const reading = `${market} ${sales}, and ${share}.${twist}${leaderChange}${passed}`;
  const up = (f.salesGrowth ?? 0) > 0.05;
  const implication = flat
    ? `${f.name} is keeping pace with its market. Whether that is good depends on its objectives: holding share in a growing market still means more sales.`
    : change < 0
      ? up
        ? `${f.name} is growing, but more slowly than its market. Ask why: the gap may be a choice (a premium position that does not chase volume) or a warning (customers moving to faster-growing rivals).`
        : `${f.name} is losing ground to its rivals. Ask whether the cause is price, the product, where it is sold, or a rival's move.`
      : up
        ? `${f.name} is growing faster than its market, winning customers from rivals or reaching new ones first. Ask whether the gain is profitable and whether it will last.`
        : `${f.name} is shrinking more slowly than its market. A rising share of a falling market can still mean falling revenue and profit.`;
  return { reading, implication };
}

const n0 = (v: number) => fmtNumber(v, Number.isInteger(v) ? 0 : 2);

/** The eight-part working for one firm's share of the market in the later period. */
export function shareWorking(m: MarketModel, focusId: string, period: string, unit: string): Working {
  const f = m.firms.find((x) => x.id === focusId);
  const sales = f?.now ?? 0;
  const share = marketShare(sales, m.totalNow);
  const ratio = m.totalNow > 0 ? sales / m.totalNow : 0;
  return {
    given: [
      { label: `${f?.name ?? 'The firm'}'s sales in ${period}`, value: `${n0(sales)} ${unit}` },
      { label: `Total market sales in ${period}`, value: `${n0(m.totalNow)} ${unit}` },
    ],
    formula: "Market share = the firm's sales ÷ total market sales × 100",
    substitution: `= ${n0(sales)} ÷ ${n0(m.totalNow)} × 100`,
    steps: share === null ? ['The market has no sales, so share cannot be calculated.'] : [`${n0(sales)} ÷ ${n0(m.totalNow)} = ${fmtNumber(ratio, 4)}`, `${fmtNumber(ratio, 4)} × 100 = ${fmtNumber(share, 2)}%`],
    answer: share === null ? 'n/a' : `${fmtNumber(share, 1)}%`,
    value: share,
    unit: `per cent of the market, measured in ${unit}`,
    note: "A standard definition. The guide's formula list (pp. 64 to 65) does not include it.",
  };
}

/** The interpretation and implication shown with the market growth working. */
export function growthReading(m: MarketModel): { interpretation: string; implication: string } {
  const g = m.growth;
  return {
    interpretation: g === null ? 'Growth cannot be calculated without sales in the earlier period.' : `The market ${g < -0.05 ? `shrank by ${fmtNumber(Math.abs(g), 1)}%` : g > 0.05 ? `grew by ${fmtNumber(g, 1)}%` : 'stayed the same size'}.`,
    implication: 'Compare every seller with this figure: a firm whose sales grow more slowly than the market loses share, and one whose sales fall more slowly than the market gains it.',
  };
}

/** The eight-part working for the growth of the whole market. */
export function growthWorking(m: MarketModel, periods: { last: string; now: string }, unit: string): Working {
  const g = m.growth;
  return {
    given: [
      { label: `Market sales in ${periods.last}`, value: `${n0(m.totalLast)} ${unit}` },
      { label: `Market sales in ${periods.now}`, value: `${n0(m.totalNow)} ${unit}` },
    ],
    formula: 'Market growth = (sales this period − sales last period) ÷ sales last period × 100',
    substitution: `= (${n0(m.totalNow)} − ${n0(m.totalLast)}) ÷ ${n0(m.totalLast)} × 100`,
    steps:
      g === null
        ? ['The market had no sales in the earlier period, so growth cannot be calculated.']
        : [`${n0(m.totalNow)} − ${n0(m.totalLast)} = ${fmtNumber(m.totalNow - m.totalLast)}`, `${fmtNumber(m.totalNow - m.totalLast)} ÷ ${n0(m.totalLast)} = ${fmtNumber((m.totalNow - m.totalLast) / m.totalLast, 4)}`, `${fmtNumber((m.totalNow - m.totalLast) / m.totalLast, 4)} × 100 = ${fmtNumber(g, 2)}%`],
    answer: g === null ? 'n/a' : `${fmtNumber(g, 1)}%`,
    value: g,
    unit: 'per cent a year',
    note: "A standard definition. The guide's formula list (pp. 64 to 65) does not include it.",
  };
}

/* ---------- Position map ---------- */

export interface MapAttribute {
  id: string;
  label: string;
  /** What a low and a high score mean, for the ends of the axis. */
  low: string;
  high: string;
}

export interface MapBrand {
  id: string;
  name: string;
  scores: Record<string, number>;
}

/** Quadrants named x first, then y: "high-low" means high on the x axis and low on the y axis. */
export type Quadrant = 'high-high' | 'low-high' | 'low-low' | 'high-low';
export const QUADRANTS: Quadrant[] = ['high-high', 'low-high', 'low-low', 'high-low'];

export interface MapPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  quadrant: Quadrant;
}

export interface MapModel {
  points: MapPoint[];
  counts: Record<Quadrant, number>;
  empty: Quadrant[];
  mid: number;
}

export function quadrantOf(x: number, y: number, mid: number): Quadrant {
  return `${x > mid ? 'high' : 'low'}-${y > mid ? 'high' : 'low'}` as Quadrant;
}

export function mapModel(brands: MapBrand[], xAttr: string, yAttr: string, scale: { min: number; max: number }): MapModel {
  const mid = (scale.min + scale.max) / 2;
  const points = brands.map((b) => {
    const x = b.scores[xAttr] ?? mid;
    const y = b.scores[yAttr] ?? mid;
    return { id: b.id, name: b.name, x, y, quadrant: quadrantOf(x, y, mid) };
  });
  const counts = { 'high-high': 0, 'low-high': 0, 'low-low': 0, 'high-low': 0 } as Record<Quadrant, number>;
  points.forEach((p) => (counts[p.quadrant] += 1));
  return { points, counts, empty: QUADRANTS.filter((q) => counts[q] === 0), mid };
}

/** "High price, low craftsmanship", from the attributes' own words for each end. */
export function quadrantLabel(q: Quadrant, x: MapAttribute, y: MapAttribute): string {
  const [qx, qy] = q.split('-') as ['high' | 'low', 'high' | 'low'];
  const a = qx === 'high' ? x.high : x.low;
  const b = qy === 'high' ? y.high : y.low;
  return `${a.charAt(0).toUpperCase()}${a.slice(1)}, ${b}`;
}

export interface GapNote {
  /** The end of each of two attributes that the note describes, for example { price: 'high', craft: 'low' }. */
  poles: Record<string, 'high' | 'low'>;
  note: string;
}

/** The note for a quadrant on a pair of axes, in either order. */
export function gapNote(q: Quadrant, xId: string, yId: string, notes: GapNote[]): string | null {
  const [qx, qy] = q.split('-') as ['high' | 'low', 'high' | 'low'];
  const hit = notes.find((n) => Object.keys(n.poles).length === 2 && n.poles[xId] === qx && n.poles[yId] === qy);
  return hit?.note ?? null;
}

/** Feedback on the learner's choice of the empty part of the map; 'none' means "no part is empty". */
export function judgeGap(m: MapModel, chosen: Quadrant | 'none', x: MapAttribute, y: MapAttribute, notes: GapNote[] = []): { verdict: 'right' | 'wrong'; text: string } {
  const emptyLabels = m.empty.map((q) => quadrantLabel(q, x, y).toLowerCase());
  if (chosen === 'none') {
    return m.empty.length === 0
      ? { verdict: 'right', text: 'Right: on these axes every part of the map has at least one seller. There may still be space between the points; try another pair of attributes.' }
      : { verdict: 'wrong', text: `Not quite: no seller in this sample is seen as ${emptyLabels.join('; or as ')}.` };
  }
  const label = quadrantLabel(chosen, x, y).toLowerCase();
  const inIt = m.points.filter((p) => p.quadrant === chosen).map((p) => p.name);
  if (inIt.length === 0) {
    const note = gapNote(chosen, x.id, y.id, notes);
    const others = m.empty.filter((q) => q !== chosen).map((q) => quadrantLabel(q, x, y).toLowerCase());
    return {
      verdict: 'right',
      text: `Right: no seller in this sample is seen as ${label}.${others.length ? ` Another part is empty too: ${others.join('; ')}.` : ''} ${note ?? 'An empty space is a question, not an answer: is it empty because nobody has thought of it, or because nobody wants it?'}`,
    };
  }
  return {
    verdict: 'wrong',
    text: `Not empty: customers see ${inIt.join(', ')} as ${label}. ${emptyLabels.length ? `On these axes the empty part is ${emptyLabels.join('; ')}.` : 'On these axes every part of the map has at least one seller.'}`,
  };
}
