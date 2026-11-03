/**
 * The competitor positioning map (4.2, AO2 and AO4): the reader's own axes
 * and rivals, built on the same model as the Porto position map (market.ts).
 *
 * Gaps are found two ways. The quadrant count says which quarter of the map,
 * split at the middle of the scale, has no seller. The open-space search finds
 * the largest circles that fit on the map without touching a seller or the
 * edge: a grid of candidate centres, each with the distance to the nearest
 * seller or edge as its radius, keeping the largest that do not overlap. An
 * open space is a question for research, never proof of demand, and the gap
 * test asks the four questions the 4.2 notes ask of any gap.
 */
import { mapModel, quadrantLabel, type MapAttribute, type MapModel } from './market';
import { asList, asNum, asObj, asOneOf, asStr, listWords, safeId, uniqueIds, type Check } from './market-kit';
import { fmtNumber } from './format';

export interface Axis {
  label: string;
  low: string;
  high: string;
}

export interface MapBrandRow {
  id: string;
  name: string;
  x: number;
  y: number;
  note: string;
}

export type Answer = 'yes' | 'no' | 'unsure';
export const TEST_QUESTIONS = [
  { id: 'demand', q: 'Do enough customers want this combination?', why: 'An empty space may be empty because nobody wants it.' },
  { id: 'deliver', q: 'Can the business deliver it at a profit?', why: 'Some combinations cost more to provide than customers will pay.' },
  { id: 'fit', q: 'Does it fit the brand and what the business does best?', why: 'A move that confuses customers about the brand can cost more than it earns.' },
  { id: 'rivals', q: 'Would rivals be slow to follow?', why: 'If a rival can fill the space next month, the advantage is brief.' },
] as const;
export type TestId = (typeof TEST_QUESTIONS)[number]['id'];

export const SCALES = [
  { value: '0-10', min: 0, max: 10, label: '0 to 10' },
  { value: '1-10', min: 1, max: 10, label: '1 to 10' },
  { value: '1-5', min: 1, max: 5, label: '1 to 5' },
] as const;
export type ScaleId = (typeof SCALES)[number]['value'];

export interface MapState {
  market: string;
  scale: ScaleId;
  x: Axis;
  y: Axis;
  focus: string;
  brands: MapBrandRow[];
  test: Record<TestId, Answer> & { note: string };
}

export const scaleOf = (id: ScaleId) => SCALES.find((s) => s.value === id) ?? SCALES[0];

export function attributes(s: MapState): { xa: MapAttribute; ya: MapAttribute } {
  return { xa: { id: 'x', label: s.x.label || 'Across', low: s.x.low || 'low', high: s.x.high || 'high' }, ya: { id: 'y', label: s.y.label || 'Up', low: s.y.low || 'low', high: s.y.high || 'high' } };
}

export function model(s: MapState): MapModel {
  const sc = scaleOf(s.scale);
  return mapModel(
    s.brands.map((b) => ({ id: b.id, name: b.name || 'Unnamed', scores: { x: b.x, y: b.y } })),
    'x',
    'y',
    { min: sc.min, max: sc.max },
  );
}

export interface Space {
  x: number;
  y: number;
  r: number;
}

/** The largest open circles on the map, most open first. */
export function openSpaces(points: Array<{ x: number; y: number }>, scale: { min: number; max: number }, count = 2): Space[] {
  const range = scale.max - scale.min;
  if (!(range > 0)) return [];
  const step = range / 40;
  const cands: Space[] = [];
  for (let i = 1; i < 40; i += 1) {
    for (let j = 1; j < 40; j += 1) {
      const x = scale.min + i * step;
      const y = scale.min + j * step;
      let r = Math.min(x - scale.min, scale.max - x, y - scale.min, scale.max - y);
      for (const p of points) r = Math.min(r, Math.hypot(p.x - x, p.y - y));
      cands.push({ x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000, r });
    }
  }
  cands.sort((a, b) => b.r - a.r || a.x - b.x || b.y - a.y);
  const chosen: Space[] = [];
  for (const c of cands) {
    if (chosen.length >= count) break;
    if (c.r < range * 0.1) break;
    if (chosen.every((k) => Math.hypot(k.x - c.x, k.y - c.y) >= (k.r + c.r) * 0.9)) chosen.push(c);
  }
  return chosen;
}

/** Pairs of sellers close enough to compete head to head: within a fifth of the scale. */
export function clusters(points: Array<{ id: string; name: string; x: number; y: number }>, scale: { min: number; max: number }): Array<{ a: string; b: string; d: number }> {
  const limit = (scale.max - scale.min) * 0.2;
  const out: Array<{ a: string; b: string; d: number }> = [];
  for (let i = 0; i < points.length; i += 1)
    for (let j = i + 1; j < points.length; j += 1) {
      const p = points[i];
      const q = points[j];
      if (!p || !q) continue;
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d <= limit) out.push({ a: p.name, b: q.name, d });
    }
  return out.sort((a, b) => a.d - b.d);
}

export function nearestRival(points: Array<{ id: string; name: string; x: number; y: number }>, focusId: string): { name: string; d: number } | null {
  const f = points.find((p) => p.id === focusId);
  if (!f) return null;
  let best: { name: string; d: number } | null = null;
  for (const p of points) {
    if (p.id === focusId) continue;
    const d = Math.hypot(p.x - f.x, p.y - f.y);
    if (!best || d < best.d) best = { name: p.name, d };
  }
  return best;
}

/** Where a point sits, in the axes' own words: thirds of each scale are low, middle and high. */
export function describeSpot(x: number, y: number, xa: MapAttribute, ya: MapAttribute, scale: { min: number; max: number }): string {
  const third = (scale.max - scale.min) / 3;
  // Axis ends are often written with a capital ("Low price"); mid-sentence they read in lower case, unless they start with an abbreviation.
  const lower = (t: string) => (/^[A-Z][a-z]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t);
  const part = (v: number, a: MapAttribute) => lower(v < scale.min + third ? a.low : v > scale.max - third ? a.high : `the middle of the ${a.label.toLowerCase()} scale`);
  return `${part(x, xa)}, ${part(y, ya)}`;
}

export function gapVerdict(t: MapState['test']): { verdict: 'promising' | 'evidence' | 'avoid'; text: string } {
  const answers = TEST_QUESTIONS.map((q) => t[q.id]);
  const no = TEST_QUESTIONS.filter((q) => t[q.id] === 'no');
  if (no.length) return { verdict: 'avoid', text: `Probably empty for a good reason: the answer to “${no.map((q) => q.q.replace(/\?$/, '').toLowerCase()).join('” and “')}” is no.` };
  if (answers.some((a) => a === 'unsure')) return { verdict: 'evidence', text: 'Not proven either way: find evidence for the questions you are unsure about, through market research, before moving towards the space.' };
  return { verdict: 'promising', text: 'Worth testing: on your answers the space could be a real opportunity. Test it with research and a small trial before repositioning, because changing customers’ perceptions is slow and costly.' };
}

export interface MapProblem {
  where: string;
  message: string;
}

export function validateMap(s: MapState): MapProblem[] {
  const out: MapProblem[] = [];
  const sc = scaleOf(s.scale);
  if (!s.x.label.trim()) out.push({ where: 'x-label', message: 'Name the attribute across.' });
  if (!s.y.label.trim()) out.push({ where: 'y-label', message: 'Name the attribute up.' });
  if (s.x.label.trim() && s.x.label.trim().toLowerCase() === s.y.label.trim().toLowerCase()) out.push({ where: 'y-label', message: 'The two axes must show different attributes.' });
  if (s.brands.length < 3) out.push({ where: 'brands', message: 'A map needs at least three sellers to compare.' });
  const names = s.brands.map((b) => b.name.trim().toLowerCase());
  s.brands.forEach((b, i) => {
    if (!b.name.trim()) out.push({ where: `${b.id}-name`, message: 'Give the seller a name.' });
    else if (names.indexOf(b.name.trim().toLowerCase()) !== i) out.push({ where: `${b.id}-name`, message: 'Another seller has this name.' });
    for (const k of ['x', 'y'] as const) {
      const v = b[k];
      if (!Number.isFinite(v)) out.push({ where: `${b.id}-${k}`, message: 'Enter a score.' });
      else if (v < sc.min || v > sc.max) out.push({ where: `${b.id}-${k}`, message: `Use a score from ${sc.min} to ${sc.max}.` });
    }
  });
  if (!s.brands.some((b) => b.id === s.focus)) out.push({ where: 'focus', message: 'Choose your own business on the map.' });
  return out;
}

export function mapChecks(s: MapState): Check[] {
  const out: Check[] = [];
  const { xa, ya } = attributes(s);
  const sc = scaleOf(s.scale);
  const mid = (sc.min + sc.max) / 2;
  const onLine = s.brands.filter((b) => b.x === mid || b.y === mid);
  if (onLine.length) out.push({ level: 'note', about: 'Middle line', text: `${listWords(onLine.map((b) => b.name))} ${onLine.length === 1 ? 'sits' : 'sit'} exactly on a middle line, so ${onLine.length === 1 ? 'it is' : 'they are'} counted in the lower part of that axis.` });
  const words = /price|cost|cheap|expensive/i;
  if (words.test(xa.label) && words.test(ya.label)) out.push({ level: 'tension', about: 'Axes', text: 'Both axes are about price: choose a second attribute customers weigh, such as quality, convenience or design.' });
  out.push({ level: 'note', about: 'Perceptions', text: 'The map shows how one sample of customers sees the sellers, not facts about them; another sample or other axes would give another map.' });
  return out;
}

export function readMap(s: MapState): { reading: string; implication: string } {
  const sc = scaleOf(s.scale);
  const scale = { min: sc.min, max: sc.max };
  const { xa, ya } = attributes(s);
  const m = model(s);
  const pts = s.brands.map((b) => ({ id: b.id, name: b.name, x: b.x, y: b.y }));
  const spaces = openSpaces(pts, scale);
  const cl = clusters(pts, scale);
  const near = nearestRival(pts, s.focus);
  const focus = s.brands.find((b) => b.id === s.focus);
  const parts: string[] = [];
  if (spaces[0]) parts.push(`The largest open space is around ${describeSpot(spaces[0].x, spaces[0].y, xa, ya, scale)}.`);
  if (spaces[1]) parts.push(`The next is around ${describeSpot(spaces[1].x, spaces[1].y, xa, ya, scale)}.`);
  parts.push(m.empty.length ? `Split at the middle of the scale, no seller is in the ${listWords(m.empty.map((q) => quadrantLabel(q, xa, ya).toLowerCase()))} part.` : 'Split at the middle of the scale, every quarter of the map has at least one seller.');
  if (cl.length) parts.push(`${listWords(cl.slice(0, 2).map((c) => `${c.a} and ${c.b}`))} sit close together, so they compete head to head.`);
  if (focus && near) parts.push(`${focus.name}'s nearest rival is ${near.name}, ${fmtNumber(near.d, 1)} points away on this scale.`);
  const implication = spaces.length
    ? 'Each open space is a question, not an answer: test it with the four questions below before moving towards it.'
    : 'The map is crowded: a business that wants to stand out may need a different attribute customers value, rather than a new place on these two.';
  return { reading: parts.join(' '), implication };
}

export function normalizeMap(raw: unknown, f: MapState): MapState | null {
  const o = asObj(raw);
  if (!o) return null;
  const scale = asOneOf(o.scale, ['0-10', '1-10', '1-5'] as const, f.scale);
  const sc = scaleOf(scale);
  const axis = (v: unknown, d: Axis): Axis => {
    const a = asObj(v) ?? {};
    return { label: asStr(a.label, d.label, 40), low: asStr(a.low, d.low, 40), high: asStr(a.high, d.high, 40) };
  };
  const brands = uniqueIds(
    asList(o.brands, (x, i) => {
      const b = asObj(x);
      if (!b) return null;
      return { id: safeId(b.id, `b${i + 1}`), name: asStr(b.name, '', 40), x: asNum(b.x, (sc.min + sc.max) / 2, sc.min, sc.max), y: asNum(b.y, (sc.min + sc.max) / 2, sc.min, sc.max), note: asStr(b.note, '', 160) };
    }, 12),
    'b',
  );
  if (!brands.length) return null;
  const t = asObj(o.test) ?? {};
  const ans = (v: unknown) => asOneOf(v, ['yes', 'no', 'unsure'] as const, 'unsure');
  const focus = asStr(o.focus, '', 40);
  return {
    market: asStr(o.market, f.market, 160),
    scale,
    x: axis(o.x, f.x),
    y: axis(o.y, f.y),
    focus: brands.some((b) => b.id === focus) ? focus : (brands[0]?.id ?? ''),
    brands,
    test: { demand: ans(t.demand), deliver: ans(t.deliver), fit: ans(t.fit), rivals: ans(t.rivals), note: asStr(t.note, '', 600) },
  };
}

export function mapCsvRows(s: MapState): Array<Array<string | number>> {
  const { xa, ya } = attributes(s);
  const sc = scaleOf(s.scale);
  const m = model(s);
  const spaces = openSpaces(s.brands, { min: sc.min, max: sc.max });
  return [
    ['Seller', `${xa.label} (${sc.label})`, `${ya.label} (${sc.label})`, 'Part of the map', 'Note', 'Your business'],
    ...m.points.map((p) => [p.name, p.x, p.y, quadrantLabel(p.quadrant, xa, ya), s.brands.find((b) => b.id === p.id)?.note ?? '', p.id === s.focus ? 'Yes' : '']),
    [],
    ['Open space', `Centre ${xa.label}`, `Centre ${ya.label}`, 'Radius', 'Where'],
    ...spaces.map((sp, i) => [`Open space ${i + 1}`, Number(sp.x.toFixed(2)), Number(sp.y.toFixed(2)), Number(sp.r.toFixed(2)), describeSpot(sp.x, sp.y, xa, ya, { min: sc.min, max: sc.max })]),
    [],
    ['Gap test', 'Answer'],
    ...TEST_QUESTIONS.map((q) => [q.q, s.test[q.id]]),
    ['Note', s.test.note],
  ];
}

export function mapSummary(s: MapState): string {
  const r = readMap(s);
  const v = gapVerdict(s.test);
  return [
    `Positioning map: ${s.market}`,
    `Across: ${s.x.label} (${s.x.low} to ${s.x.high}). Up: ${s.y.label} (${s.y.low} to ${s.y.high}). Scale ${scaleOf(s.scale).label}.`,
    ...s.brands.map((b) => `${b.name}${b.id === s.focus ? ' (your business)' : ''}: ${b.x} across, ${b.y} up`),
    r.reading,
    `Gap test: ${v.text}`,
    s.test.note ? `Note: ${s.test.note}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
