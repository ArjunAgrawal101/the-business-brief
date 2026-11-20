/**
 * The course connections: how the subtopics of the IB course meet one
 * another. Two layers, both from the content:
 *
 * - worked connections (src/content/data/topic-connections.yaml): a pair of
 *   subtopics, a paragraph on how they meet and an exam-style question;
 * - the links the notes name (each set of notes' `connections`, and for the
 *   three briefs their mindmap's), each with the reason the notes give.
 *
 * Pure functions with no `astro:content` import: the checks, the lists for
 * one subtopic, and the geometry of the map at /ib/connections/, drawn as
 * SVG at build time. The unit tests use them directly.
 */
import type { SubtopicTools, TopicConnection } from './connections-schema';
import { wrap } from './mindmap';

export type Level = 'SL/HL' | 'HL';

/** What the connections need to know about a subtopic. */
export interface SubtopicInfo {
  code: string;
  title: string;
  unit: number;
  unitTitle: string;
  /** The curriculum's level: SL/HL, HL, or SL/HL with HL-only content. */
  level: string;
  /** The assessment objectives of its content statements (AO1 to AO4). */
  aos: string[];
}

export interface Problem {
  where: string;
  message: string;
}

/** A pair of codes as one key, whichever way round they come: "3.5|4.5". */
export function pairKey(a: string, b: string): string {
  return [a, b].sort((x, y) => codeOrder(x) - codeOrder(y)).join('|');
}

/** "3.10" after "3.9": a code's place in the course. */
export function codeOrder(code: string): number {
  const [u, s] = code.split('.').map(Number);
  return (u ?? 0) * 100 + (s ?? 0);
}

/** A code as an address fragment: 3.5 is "3-5". */
export const codeSlug = (code: string): string => code.replace('.', '-');

/** The anchor of a subtopic's entry in the map's list, which the map's nodes and every subtopic page link to. */
export const nodeAnchor = (code: string): string => `t-${codeSlug(code)}`;

/** The anchor of a worked connection in the map's list. */
export const linkAnchor = (id: string): string => `link-${id}`;

export const CONNECTIONS_HREF = '/ib/connections/';

/** The map, opened at a subtopic's entry. */
export const connectionsHref = (code: string): string => `${CONNECTIONS_HREF}#${nodeAnchor(code)}`;

/** A connection is HL when it says so, or when either subtopic is HL only. */
export function connectionLevel(conn: Pick<TopicConnection, 'between' | 'level'>, subs: Map<string, Pick<SubtopicInfo, 'level'>>): Level {
  if (conn.level === 'HL') return 'HL';
  return conn.between.some((code) => subs.get(code)?.level === 'HL') ? 'HL' : 'SL/HL';
}

/** The depth of an assessment objective for the command-term check: AO1 to AO3 rise in demand; AO4 is a separate kind of skill. */
const AO_RANK: Record<string, number> = { AO1: 1, AO2: 2, AO3: 3 };

/**
 * Every rule a worked connection must keep: both codes exist and differ, no
 * pair is joined twice, the command term is in the register, and it asks for
 * no more than the statements it rests on allow (an AO3 term needs an AO3
 * statement at one end; an AO4 term, such as calculate, an AO4 statement).
 * Every subtopic must take part in at least one connection, so the map has no
 * island. The curated tool links must name real subtopics and real tool
 * pages, and add something the tool does not already say for itself.
 */
export function checkConnections(
  conns: Record<string, TopicConnection>,
  subs: SubtopicInfo[],
  commandTerms: Record<string, { term: string; ao: string }>,
  tools?: { pages: Map<string, { codes: string[] }>; extra: Record<string, SubtopicTools> },
): Problem[] {
  const out: Problem[] = [];
  const byCode = new Map(subs.map((s) => [s.code, s]));
  const seen = new Map<string, string>();
  const joined = new Set<string>();
  for (const [id, conn] of Object.entries(conns)) {
    const where = `topic-connections/${id}`;
    const add = (message: string) => out.push({ where, message });
    const [a, b] = conn.between;
    if (a === b) add(`joins ${a} to itself`);
    for (const code of conn.between) {
      if (!byCode.has(code)) add(`subtopic ${code} is not in the curriculum`);
      else joined.add(code);
    }
    const key = pairKey(a, b);
    if (seen.has(key)) add(`joins the same pair as ${seen.get(key)} (${a} and ${b})`);
    else seen.set(key, id);
    const term = commandTerms[conn.question.command];
    if (!term) add(`command term "${conn.question.command}" is not in the register`);
    else {
      const aos = conn.between.flatMap((code) => byCode.get(code)?.aos ?? []);
      if (term.ao === 'AO4') {
        if (!aos.includes('AO4')) add(`"${term.term}" is an AO4 command term, but neither ${a} nor ${b} has an AO4 statement`);
      } else {
        const deepest = Math.max(0, ...aos.map((x) => AO_RANK[x] ?? 0));
        if ((AO_RANK[term.ao] ?? 0) > deepest) add(`"${term.term}" (${term.ao}) asks for more than the statements of ${a} and ${b} allow (at most AO${deepest})`);
      }
      if (term.ao === 'AO4' && !conn.question.answer) add('a calculation needs its worked answer');
    }
  }
  for (const s of subs) if (!joined.has(s.code)) out.push({ where: 'topic-connections', message: `${s.code} ${s.title} takes part in no worked connection` });

  if (tools) {
    for (const [code, entry] of Object.entries(tools.extra)) {
      const where = `subtopic-tools/${code}`;
      if (!byCode.has(code)) out.push({ where, message: `subtopic ${code} is not in the curriculum` });
      const hrefs = new Set<string>();
      for (const t of entry.tools) {
        if (hrefs.has(t.href)) out.push({ where, message: `lists ${t.href} twice` });
        hrefs.add(t.href);
        const page = tools.pages.get(t.href);
        if (!page) out.push({ where, message: `${t.href} is not a tool page on the platform` });
        else if (page.codes.includes(code)) out.push({ where, message: `${t.href} already names ${code} itself, so it needs no entry here` });
      }
    }
  }
  return out;
}

/** A worked connection seen from one of its subtopics. */
export interface ConnectionEnd {
  id: string;
  /** The subtopic at the other end. */
  other: string;
  conn: TopicConnection;
}

/** The worked connections a subtopic takes part in, in course order of the other end. */
export function connectionsOf(code: string, conns: Record<string, TopicConnection>): ConnectionEnd[] {
  return Object.entries(conns)
    .filter(([, c]) => c.between.includes(code))
    .map(([id, conn]) => ({ id, other: conn.between[0] === code ? conn.between[1] : conn.between[0], conn }))
    .sort((x, y) => codeOrder(x.other) - codeOrder(y.other));
}

/** The worked connections in course order: by the earlier of their two codes, then the later. */
export function connectionsInOrder(conns: Record<string, TopicConnection>): Array<[string, TopicConnection]> {
  const lo = (c: TopicConnection) => Math.min(...c.between.map(codeOrder));
  const hi = (c: TopicConnection) => Math.max(...c.between.map(codeOrder));
  return Object.entries(conns).sort(([, a], [, b]) => Number(b.featured) - Number(a.featured) || lo(a) - lo(b) || hi(a) - hi(b));
}

/** One subtopic's link to another as its notes (or, for a brief, its mindmap) name it. */
export interface NoteLink {
  from: string;
  to: string;
  text: string;
}

/** A pair of subtopics the notes link, with each side's reason. */
export interface NotePair {
  a: string;
  b: string;
  reasons: Array<{ from: string; text: string }>;
}

/** The links the notes name, as pairs: a link named from both sides is one pair with both reasons. Links to unknown codes or to the subtopic itself are dropped. */
export function notePairs(links: NoteLink[], codes: Set<string>): Map<string, NotePair> {
  const out = new Map<string, NotePair>();
  for (const l of links) {
    if (l.from === l.to || !codes.has(l.from) || !codes.has(l.to)) continue;
    const key = pairKey(l.from, l.to);
    const [a, b] = key.split('|') as [string, string];
    const pair = out.get(key) ?? { a, b, reasons: [] };
    if (!pair.reasons.some((r) => r.from === l.from)) pair.reasons.push({ from: l.from, text: l.text });
    out.set(key, pair);
  }
  return out;
}

/** The notes' links for one subtopic that no worked connection already covers, with the reason its own notes give where they give one. */
export function noteLinksOf(code: string, pairs: Map<string, NotePair>, conns: Record<string, TopicConnection>): Array<{ other: string; text: string }> {
  const worked = new Set(Object.values(conns).map((c) => pairKey(c.between[0], c.between[1])));
  const out: Array<{ other: string; text: string }> = [];
  for (const [key, p] of pairs) {
    if (worked.has(key) || (p.a !== code && p.b !== code)) continue;
    const other = p.a === code ? p.b : p.a;
    const own = p.reasons.find((r) => r.from === code) ?? p.reasons[0];
    if (own) out.push({ other, text: own.text });
  }
  return out.sort((x, y) => codeOrder(x.other) - codeOrder(y.other));
}

/* ---------- The map ---------- */

export interface MapUnitInput {
  number: number;
  title: string;
  subtopics: Array<{ code: string; title: string; hl: boolean }>;
}

export interface MapNode {
  code: string;
  unit: number;
  title: string;
  hl: boolean;
  /** The node's angle in radians, clockwise from the top. */
  angle: number;
  x: number;
  y: number;
  /** The label: its lines, where it starts and how it is turned so that it reads outwards from the node and left to right. */
  lines: string[];
  lx: number;
  ly: number;
  rotate: number;
  anchor: 'start' | 'end';
}

export interface MapEdge {
  id: string;
  a: string;
  b: string;
  kind: 'worked' | 'notes';
  /** An SVG path: a curve drawn in towards the centre, more deeply the further apart its ends. */
  d: string;
}

export interface MapUnitArc {
  number: number;
  title: string;
  /** An SVG path along the ring, under the unit's nodes. */
  d: string;
  /** Where the unit's label sits, inside the ring at the middle of its arc. */
  lx: number;
  ly: number;
}

export interface MapLayout {
  size: number;
  cx: number;
  cy: number;
  radius: number;
  nodeRadius: number;
  fontSize: number;
  lineHeight: number;
  nodes: MapNode[];
  edges: MapEdge[];
  units: MapUnitArc[];
}

export interface MapOptions {
  /** The ring's radius, in the drawing's units. */
  radius?: number;
  nodeRadius?: number;
  /** Empty slots between one unit and the next. */
  gap?: number;
  /** Characters per label line, and the label's type size. */
  wrapAt?: number;
  fontSize?: number;
  lineHeight?: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Lays the subtopics out on a ring, unit by unit in course order with a gap
 * between units, starting at the top and running clockwise. Each label reads
 * outwards along its node's radius, turned on the left half so that it still
 * reads left to right. Edges are quadratic curves whose control point lies on
 * the bisector of their two ends, nearer the centre the further apart the
 * ends are, so links across the course pass through the middle and links
 * between neighbours stay near the ring.
 */
export function layoutMap(units: MapUnitInput[], edges: Array<{ id: string; a: string; b: string; kind: 'worked' | 'notes' }>, o: MapOptions = {}): MapLayout {
  const radius = o.radius ?? 320;
  const nodeRadius = o.nodeRadius ?? 18;
  const gap = o.gap ?? 1.5;
  const wrapAt = o.wrapAt ?? 18;
  const fontSize = o.fontSize ?? 15;
  const lineHeight = o.lineHeight ?? 16;
  const labelGap = 12;
  const charW = fontSize * 0.56;
  const count = units.reduce((s, u) => s + u.subtopics.length, 0);
  const slots = count + gap * units.length;
  const step = (Math.PI * 2) / Math.max(1, slots);
  const labelsOf = (title: string, hl: boolean) => wrap(hl ? `${title} (HL)` : title, wrapAt);
  const longest = Math.max(0, ...units.flatMap((u) => u.subtopics.map((s) => Math.max(...labelsOf(s.title, s.hl).map((l) => l.length)))));
  const half = Math.ceil(radius + nodeRadius + labelGap + longest * charW + 16);
  const size = half * 2;
  const cx = half;
  const cy = half;
  const at = (angle: number, r: number) => ({ x: cx + r * Math.sin(angle), y: cy - r * Math.cos(angle) });

  const nodes: MapNode[] = [];
  const arcs: MapUnitArc[] = [];
  let slot = gap / 2;
  for (const u of units) {
    const first = slot;
    for (const s of u.subtopics) {
      const angle = (slot + 0.5) * step;
      const p = at(angle, radius);
      const lines = labelsOf(s.title, s.hl);
      // Turned along the radius; on the left half the text is turned half round so that it reads left to right, ending at the node.
      const deg = (angle * 180) / Math.PI - 90;
      const left = angle > Math.PI;
      const l = at(angle, radius + nodeRadius + labelGap);
      nodes.push({ code: s.code, unit: u.number, title: s.title, hl: s.hl, angle, x: r1(p.x), y: r1(p.y), lines, lx: r1(l.x), ly: r1(l.y), rotate: r1(left ? deg - 180 : deg), anchor: left ? 'end' : 'start' });
      slot += 1;
    }
    const from = at(first * step + step * 0.15, radius);
    const to = at(slot * step - step * 0.15, radius);
    const large = (slot - first) * step > Math.PI ? 1 : 0;
    const mid = at(((first + slot) / 2) * step, radius - nodeRadius - 40);
    arcs.push({ number: u.number, title: u.title, d: `M ${r1(from.x)} ${r1(from.y)} A ${radius} ${radius} 0 ${large} 1 ${r1(to.x)} ${r1(to.y)}`, lx: r1(mid.x), ly: r1(mid.y) });
    slot += gap;
  }

  const byCode = new Map(nodes.map((n) => [n.code, n]));
  const out: MapEdge[] = [];
  for (const e of edges) {
    const na = byCode.get(e.a);
    const nb = byCode.get(e.b);
    if (!na || !nb) continue;
    let d = Math.abs(na.angle - nb.angle);
    if (d > Math.PI) d = Math.PI * 2 - d;
    const inner = radius - nodeRadius - 2;
    const pa = at(na.angle, inner);
    const pb = at(nb.angle, inner);
    // The bisector of the two ends; when they are opposite, the curve passes through the centre.
    const bx = Math.sin(na.angle) + Math.sin(nb.angle);
    const by = -Math.cos(na.angle) - Math.cos(nb.angle);
    const len = Math.hypot(bx, by);
    const depth = inner * Math.cos(d / 2) * 0.42;
    const c = len < 1e-6 ? { x: cx, y: cy } : { x: cx + (bx / len) * depth, y: cy + (by / len) * depth };
    out.push({ id: e.id, a: e.a, b: e.b, kind: e.kind, d: `M ${r1(pa.x)} ${r1(pa.y)} Q ${r1(c.x)} ${r1(c.y)} ${r1(pb.x)} ${r1(pb.y)}` });
  }
  return { size, cx, cy, radius, nodeRadius, fontSize, lineHeight, nodes, edges: out, units: arcs };
}
