/**
 * The mindmap engine: lays out a map and draws it as SVG markup.
 *
 * Pure functions, no DOM: the build uses them to put a complete map in the
 * page (it works without JavaScript and prints as it looks), and the browser
 * uses the same functions to redraw the map when the reader collapses a
 * branch or switches to the revision view.
 *
 * The layout is a balanced two-sided tree. The centre sits at (0, 0); the
 * branches are split between right and left so the two sides carry similar
 * height; each node is centred on the span of its children. Branch heads are
 * framed; every other node sits on a fine line that continues its branch's
 * connector, as a hand-drawn mindmap does.
 */
import type { MindNode, Mindmap } from './schemas';

export type BranchKind = Mindmap['branches'][number]['kind'];

/** One colour per kind of branch, chosen to read as a family on ivory (each at least 3:1 against it). */
export const BRANCH_COLOURS: Record<BranchKind, string> = {
  concept: '#1e355f',
  types: '#2e6b8f',
  theory: '#6a4c93',
  tool: '#8a6b2a',
  calculation: '#2f6f5e',
  application: '#a4552a',
  evaluation: '#a8463f',
  connection: '#5b6678',
};

export const BRANCH_LABELS: Record<BranchKind, string> = {
  concept: 'Core ideas',
  types: 'Types and forms',
  theory: 'Theories and models',
  tool: 'Tools',
  calculation: 'Calculations',
  application: 'Applications',
  evaluation: 'Evaluation',
  connection: 'Connections',
};

/** Markers for kinds of node, drawn before the label. */
const MARKERS: Partial<Record<MindNode['kind'], { glyph: string; colour: string }>> = {
  advantage: { glyph: '+', colour: '#2b6a59' },
  limitation: { glyph: '−', colour: '#9e3f38' },
  example: { glyph: 'e.g.', colour: '#566173' },
  formula: { glyph: 'ƒ', colour: '#76591f' },
  definition: { glyph: '=', colour: '#1e355f' },
  question: { glyph: '?', colour: '#566173' },
};

export interface LaidNode {
  id: string;
  depth: number;
  side: 1 | -1;
  /** Left edge, top edge, width and height of the node's box. */
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
  label: string;
  kind: string;
  branch: BranchKind;
  colour: string;
  formula?: string;
  term?: string;
  level: 'SL/HL' | 'HL';
  note?: string;
  /** Children exist (whether shown or not), so the node can be collapsed. */
  parent: boolean;
  collapsed: boolean;
}

export interface Link {
  from: string;
  to: string;
  d: string;
  colour: string;
  depth: number;
}

export interface Layout {
  nodes: LaidNode[];
  links: Link[];
  bounds: { x: number; y: number; w: number; h: number };
}

export interface LayoutOptions {
  /** Ids of nodes whose children are hidden. */
  collapsed?: Set<string>;
  /** Show only the branches and the nodes marked core. */
  revision?: boolean;
}

/* ---------- Text measure: an estimate tuned to the faces used ---------- */

const STYLE = {
  root: { size: 21, lh: 25, chars: 16, charW: 0.56, padX: 22, padY: 16, minW: 150 },
  branch: { size: 15.5, lh: 19, chars: 21, charW: 0.55, padX: 14, padY: 10, minW: 110 },
  node: { size: 13.5, lh: 17, chars: 28, charW: 0.535, padX: 4, padY: 6, minW: 40 },
  leaf: { size: 12.75, lh: 16, chars: 30, charW: 0.53, padX: 4, padY: 5, minW: 40 },
} as const;

type StyleKey = keyof typeof STYLE;
const styleFor = (depth: number): StyleKey => (depth === 0 ? 'root' : depth === 1 ? 'branch' : depth === 2 ? 'node' : 'leaf');

/** Greedy word wrap to a number of characters per line. */
export function wrap(text: string, chars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (!line) line = word;
    else if ((line + ' ' + word).length <= chars) line += ' ' + word;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function measure(label: string, depth: number, extra: { marker?: string; hl?: boolean; formula?: string }) {
  const s = STYLE[styleFor(depth)];
  const lines = wrap(label, s.chars);
  const longest = Math.max(...lines.map((l) => l.length), extra.formula ? Math.min(extra.formula.length, s.chars + 6) * 0.92 : 0);
  const markerW = extra.marker ? (extra.marker.length + 1) * s.size * 0.55 : 0;
  const hlW = extra.hl ? 30 : 0;
  const w = Math.max(s.minW, Math.round(longest * s.size * s.charW + markerW + hlW + s.padX * 2));
  const formulaLines = extra.formula ? wrap(extra.formula, s.chars + 6) : [];
  const h = Math.round((lines.length + formulaLines.length) * s.lh + s.padY * 2);
  return { lines, w, h, formulaLines };
}

/* ---------- Layout ---------- */

const GAP_X = [64, 44, 34, 30];
const GAP_Y = { branch: 26, node: 6 };

interface Tree {
  id: string;
  depth: number;
  label: string;
  kind: string;
  branch: BranchKind;
  formula?: string;
  term?: string;
  level: 'SL/HL' | 'HL';
  note?: string;
  children: Tree[];
  parent: boolean;
  collapsed: boolean;
  w: number;
  h: number;
  lines: string[];
  span: number;
}

function build(map: Mindmap, opts: LayoutOptions): Tree[] {
  const collapsed = opts.collapsed ?? new Set<string>();
  const keep = (n: MindNode) => !opts.revision || n.core;
  const toTree = (n: MindNode, id: string, depth: number, branch: BranchKind): Tree => {
    const kids = n.children.filter(keep);
    const isCollapsed = collapsed.has(id);
    const m = measure(n.label, depth, { marker: MARKERS[n.kind]?.glyph, hl: n.level === 'HL', formula: n.formula });
    return {
      id,
      depth,
      label: n.label,
      kind: n.kind,
      branch,
      formula: n.formula,
      term: n.term,
      level: n.level,
      note: n.note,
      parent: kids.length > 0,
      collapsed: isCollapsed && kids.length > 0,
      children: isCollapsed ? [] : kids.map((k, i) => toTree(k, `${id}.${i}`, depth + 1, branch)),
      w: m.w,
      h: m.h,
      lines: [...m.lines, ...m.formulaLines],
      span: 0,
    };
  };
  return map.branches.map((b, i) => {
    const id = `b${i}`;
    const kids = b.children.filter(keep);
    const isCollapsed = collapsed.has(id);
    const m = measure(b.label, 1, { hl: b.level === 'HL' });
    return {
      id,
      depth: 1,
      label: b.label,
      kind: b.kind,
      branch: b.kind,
      level: b.level,
      note: b.note,
      parent: kids.length > 0,
      collapsed: isCollapsed && kids.length > 0,
      children: isCollapsed ? [] : kids.map((k, j) => toTree(k, `${id}.${j}`, 2, b.kind)),
      w: m.w,
      h: m.h,
      lines: m.lines,
      span: 0,
    };
  });
}

function span(t: Tree): number {
  const kids = t.children.reduce((s, k) => s + span(k), 0) + Math.max(0, t.children.length - 1) * GAP_Y.node;
  t.span = Math.max(t.h, kids);
  return t.span;
}

/** Column widths per depth, the same on both sides so the map reads as aligned columns. */
function columns(branches: Tree[]): number[] {
  const widths: number[] = [];
  const visit = (t: Tree) => {
    widths[t.depth] = Math.max(widths[t.depth] ?? 0, t.w);
    t.children.forEach(visit);
  };
  branches.forEach(visit);
  return widths;
}

export function layout(map: Mindmap, opts: LayoutOptions = {}): Layout {
  const branches = build(map, opts);
  const root = measure(map.centre, 0, {});
  branches.forEach(span);

  // Split the branches so the two sides carry similar height, keeping their order.
  const heights = branches.map((b) => b.span);
  const total = heights.reduce((a, b) => a + b, 0);
  let k = Math.ceil(branches.length / 2);
  let best = Infinity;
  for (let i = 1; i < branches.length; i += 1) {
    const right = heights.slice(0, i).reduce((a, b) => a + b, 0);
    const diff = Math.abs(total - 2 * right);
    if (diff < best) {
      best = diff;
      k = i;
    }
  }
  const sides: Array<{ side: 1 | -1; list: Tree[] }> = [
    { side: 1, list: branches.slice(0, k) },
    { side: -1, list: branches.slice(k) },
  ];

  const colW = columns(branches);
  // The x of each column's inner edge, measured from the centre.
  const colX: number[] = [];
  colX[1] = root.w / 2 + GAP_X[0]!;
  for (let d = 2; d < colW.length; d += 1) colX[d] = colX[d - 1]! + (colW[d - 1] ?? 0) + (GAP_X[Math.min(d - 1, GAP_X.length - 1)] ?? 30);

  const nodes: LaidNode[] = [];
  const links: Link[] = [];
  const rootNode: LaidNode = {
    id: 'root',
    depth: 0,
    side: 1,
    x: -root.w / 2,
    y: -root.h / 2,
    w: root.w,
    h: root.h,
    lines: root.lines,
    label: map.centre,
    kind: 'root',
    branch: 'concept',
    colour: '#0b1a33',
    level: 'SL/HL',
    parent: true,
    collapsed: false,
  };
  nodes.push(rootNode);

  const place = (t: Tree, side: 1 | -1, top: number, parent: LaidNode) => {
    const cy = top + t.span / 2;
    const inner = colX[t.depth] ?? 0;
    const x = side === 1 ? inner : -inner - t.w;
    const node: LaidNode = {
      id: t.id,
      depth: t.depth,
      side,
      x,
      y: cy - t.h / 2,
      w: t.w,
      h: t.h,
      lines: t.lines,
      label: t.label,
      kind: t.kind,
      branch: t.branch,
      colour: BRANCH_COLOURS[t.branch],
      formula: t.formula,
      term: t.term,
      level: t.level,
      note: t.note,
      parent: t.parent,
      collapsed: t.collapsed,
    };
    nodes.push(node);
    links.push(connector(parent, node));
    const kidsH = t.children.reduce((s, c) => s + c.span, 0) + Math.max(0, t.children.length - 1) * GAP_Y.node;
    let y = cy - kidsH / 2;
    for (const c of t.children) {
      place(c, side, y, node);
      y += c.span + GAP_Y.node;
    }
  };

  for (const { side, list } of sides) {
    const h = list.reduce((s, b) => s + b.span, 0) + Math.max(0, list.length - 1) * GAP_Y.branch;
    let y = -h / 2;
    for (const b of list) {
      place(b, side, y, rootNode);
      y += b.span + GAP_Y.branch;
    }
  }

  const pad = 24;
  const minX = Math.min(...nodes.map((n) => n.x)) - pad;
  const maxX = Math.max(...nodes.map((n) => n.x + n.w)) + pad;
  const minY = Math.min(...nodes.map((n) => n.y)) - pad;
  const maxY = Math.max(...nodes.map((n) => n.y + n.h)) + pad;
  return { nodes, links, bounds: { x: minX, y: minY, w: maxX - minX, h: maxY - minY } };
}

/** The anchor on a node where lines meet it: the outer edge for the parent, the inner edge for the child. */
function anchorY(n: LaidNode): number {
  // Nodes below the branch heads sit on a line under their text.
  return n.depth >= 2 ? n.y + n.h - 3 : n.y + n.h / 2;
}

function connector(from: LaidNode, to: LaidNode): Link {
  const side = to.side;
  const fx = from.depth === 0 ? (side === 1 ? from.x + from.w : from.x) : side === 1 ? from.x + from.w : from.x;
  const fy = anchorY(from);
  const tx = side === 1 ? to.x : to.x + to.w;
  const ty = anchorY(to);
  const mx = (fx + tx) / 2;
  const d = `M${r(fx)} ${r(fy)}C${r(mx)} ${r(fy)} ${r(mx)} ${r(ty)} ${r(tx)} ${r(ty)}`;
  return { from: from.id, to: to.id, d, colour: to.colour, depth: to.depth };
}

const r = (n: number) => Math.round(n * 10) / 10;

/* ---------- Drawing ---------- */

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface RenderOptions {
  /** The code shown above the centre, such as "1.1" or "Unit 1". */
  code: string;
  /** Link nodes that name a glossary term to the term's page. */
  glossaryHref?: (id: string) => string;
  /** Interactive markup: toggles on nodes that have children. */
  interactive?: boolean;
  title: string;
  description: string;
  idPrefix?: string;
}

/**
 * The map's own styles, carried inside the SVG so that it looks the same on
 * the page, in print and when downloaded. Sizes match STYLE above.
 */
export const SVG_STYLE = [
  '.mm-t{font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;fill:#252d3a}',
  '.mm-t--root{font-family:"Source Serif 4",Georgia,serif;font-size:21px;font-weight:600;fill:#f4efe4}',
  '.mm-t--d1{font-family:"Source Serif 4",Georgia,serif;font-size:15.5px;font-weight:620;fill:#0b1a33}',
  '.mm-t--d2{font-size:13.5px;font-weight:560;fill:#0b1a33}',
  '.mm-t--d3{font-size:12.75px;font-weight:440;fill:#252d3a}',
  '.mm-t--formula{font-size:12px;font-weight:600;fill:#76591f;font-variant-numeric:tabular-nums}',
  '.mm-code{font-family:Inter,system-ui,sans-serif;font-size:11px;font-weight:700;letter-spacing:.16em;fill:#76591f}',
  '.mm-mark{font-family:Inter,system-ui,sans-serif;font-weight:700;font-size:13px}',
  '.mm-hl rect{fill:#0b1a33}.mm-hl text{font-family:Inter,system-ui,sans-serif;font-size:9.5px;font-weight:700;letter-spacing:.06em;fill:#f4efe4}',
  '.mm-term .mm-t{text-decoration:underline dotted;text-underline-offset:3px}',
].join('');

export function renderSvg(lay: Layout, o: RenderOptions): string {
  const { x, y, w, h } = lay.bounds;
  const p = o.idPrefix ?? 'mm';
  const out: string[] = [];
  out.push(
    `<svg class="mm-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${r(x)} ${r(y)} ${r(w)} ${r(h)}" width="${Math.round(w)}" height="${Math.round(h)}" role="img" aria-labelledby="${p}-title ${p}-desc" data-bounds="${r(x)} ${r(y)} ${r(w)} ${r(h)}">`,
  );
  out.push(`<title id="${p}-title">${esc(o.title)}</title><desc id="${p}-desc">${esc(o.description)}</desc>`);
  out.push(`<style>${SVG_STYLE}</style>`);

  // Links first, under the nodes.
  out.push('<g class="mm-links" fill="none">');
  for (const l of lay.links) {
    const width = l.depth === 1 ? 3.2 : l.depth === 2 ? 2 : 1.35;
    out.push(`<path d="${l.d}" stroke="${l.colour}" stroke-width="${width}" stroke-linecap="round" data-link="${l.to}"/>`);
  }
  out.push('</g>');

  out.push('<g class="mm-nodes">');
  for (const n of lay.nodes) out.push(drawNode(n, o));
  out.push('</g></svg>');
  return out.join('');
}

function drawNode(n: LaidNode, o: RenderOptions): string {
  const s = STYLE[styleFor(n.depth)];
  const parts: string[] = [];
  if (n.depth === 0) {
    parts.push(`<g class="mm-node mm-root" data-node="root">`);
    parts.push(`<rect x="${r(n.x)}" y="${r(n.y)}" width="${r(n.w)}" height="${r(n.h)}" rx="12" fill="#0b1a33"/>`);
    parts.push(`<rect x="${r(n.x + 4)}" y="${r(n.y + 4)}" width="${r(n.w - 8)}" height="${r(n.h - 8)}" rx="9" fill="none" stroke="#c9a866" stroke-width="1"/>`);
    parts.push(`<text class="mm-code" x="${r(n.x + n.w / 2)}" y="${r(n.y - 9)}" text-anchor="middle">${esc(o.code)}</text>`);
    const top = n.y + s.padY + s.size * 0.82;
    parts.push(
      `<text class="mm-t mm-t--root" x="${r(n.x + n.w / 2)}" y="${r(top)}" text-anchor="middle">${n.lines
        .map((l, i) => `<tspan x="${r(n.x + n.w / 2)}" dy="${i === 0 ? 0 : s.lh}">${esc(l)}</tspan>`)
        .join('')}</text>`,
    );
    parts.push('</g>');
    return parts.join('');
  }

  const toggle = o.interactive && n.parent;
  parts.push(
    `<g class="mm-node mm-d${Math.min(n.depth, 3)}${n.collapsed ? ' is-collapsed' : ''}" data-node="${n.id}"${toggle ? ` data-toggle="${n.id}"` : ''}>`,
  );
  if (n.depth === 1) {
    parts.push(`<rect x="${r(n.x)}" y="${r(n.y)}" width="${r(n.w)}" height="${r(n.h)}" rx="7" fill="#ffffff" stroke="${n.colour}" stroke-width="1.5"/>`);
    const barX = n.side === 1 ? n.x : n.x + n.w - 5;
    parts.push(`<rect x="${r(barX)}" y="${r(n.y)}" width="5" height="${r(n.h)}" rx="2" fill="${n.colour}"/>`);
  } else {
    // The line the node sits on, continuing its connector.
    const ly = n.y + n.h - 3;
    parts.push(`<path d="M${r(n.x)} ${r(ly)}H${r(n.x + n.w)}" stroke="${n.colour}" stroke-width="${n.depth === 2 ? 2 : 1.35}" stroke-linecap="round" fill="none"/>`);
  }

  const marker = MARKERS[n.kind as MindNode['kind']];
  let tx = n.x + s.padX + (n.depth === 1 ? (n.side === 1 ? 6 : 0) : 0);
  const baseline = n.y + s.padY + s.size * 0.8;
  if (marker) {
    parts.push(`<text class="mm-mark" x="${r(tx)}" y="${r(baseline)}" fill="${marker.colour}">${esc(marker.glyph)}</text>`);
    tx += (marker.glyph.length + 1) * s.size * 0.55;
  }
  const labelLines = n.formula ? n.lines.slice(0, n.lines.length - wrap(n.formula, s.chars + 6).length) : n.lines;
  const formulaLines = n.formula ? n.lines.slice(labelLines.length) : [];
  const textClass = `mm-t mm-t--d${Math.min(n.depth, 3)}`;
  const label = `<text class="${textClass}" x="${r(tx)}" y="${r(baseline)}">${labelLines
    .map((l, i) => `<tspan x="${r(tx)}" dy="${i === 0 ? 0 : s.lh}">${esc(l)}</tspan>`)
    .join('')}</text>`;
  if (n.term && o.glossaryHref) parts.push(`<a href="${esc(o.glossaryHref(n.term))}" class="mm-term" tabindex="-1">${label}</a>`);
  else parts.push(label);
  if (formulaLines.length) {
    const fy = baseline + labelLines.length * s.lh;
    parts.push(
      `<text class="mm-t mm-t--formula" x="${r(tx)}" y="${r(fy)}">${formulaLines
        .map((l, i) => `<tspan x="${r(tx)}" dy="${i === 0 ? 0 : s.lh}">${esc(l)}</tspan>`)
        .join('')}</text>`,
    );
  }
  if (n.level === 'HL') {
    const longest = Math.max(...labelLines.map((l) => l.length));
    const hx = Math.min(n.x + n.w - 30, tx + longest * s.size * s.charW + 6);
    parts.push(`<g class="mm-hl"><rect x="${r(hx)}" y="${r(baseline - s.size * 0.78)}" width="24" height="${r(s.size * 0.98)}" rx="3"/><text x="${r(hx + 12)}" y="${r(baseline - 1)}" text-anchor="middle">HL</text></g>`);
  }
  if (toggle) {
    const cx = n.side === 1 ? n.x + n.w + 9 : n.x - 9;
    const cy = n.depth === 1 ? n.y + n.h / 2 : n.y + n.h - 3;
    parts.push(
      `<g class="mm-toggle" transform="translate(${r(cx)} ${r(cy)})"><circle r="7" fill="#ffffff" stroke="${n.colour}" stroke-width="1.3"/><path d="M-3.5 0H3.5${n.collapsed ? 'M0 -3.5V3.5' : ''}" stroke="${n.colour}" stroke-width="1.5" stroke-linecap="round"/></g>`,
    );
  }
  parts.push('</g>');
  return parts.join('');
}

/** Count of nodes in a map (branches included), for summaries. */
export function nodeCount(map: Mindmap): number {
  let n = 0;
  const visit = (list: MindNode[]) => {
    for (const x of list) {
      n += 1;
      visit(x.children);
    }
  };
  map.branches.forEach((b) => {
    n += 1;
    visit(b.children);
  });
  return n;
}

/** Glossary ids named anywhere in a map. */
export function termsIn(map: Mindmap): string[] {
  const out = new Set<string>();
  const visit = (list: MindNode[]) => {
    for (const x of list) {
      if (x.term) out.add(x.term);
      visit(x.children);
    }
  };
  map.branches.forEach((b) => visit(b.children));
  return [...out];
}

/** A small, textless picture of a map's shape: the centre, its branches and their spread. For index tiles. */
export function renderThumb(map: Mindmap): string {
  const collapsed = new Set<string>();
  map.branches.forEach((b, i) => b.children.forEach((_, j) => collapsed.add(`b${i}.${j}`)));
  const lay = layout(map, { collapsed });
  const { x, y, w, h } = lay.bounds;
  const parts: string[] = [`<svg class="mm-thumb" viewBox="${r(x)} ${r(y)} ${r(w)} ${r(h)}" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">`];
  for (const l of lay.links) parts.push(`<path d="${l.d}" fill="none" stroke="${l.colour}" stroke-width="${l.depth === 1 ? 7 : 4}" stroke-linecap="round" opacity="0.9"/>`);
  for (const n of lay.nodes) {
    if (n.depth === 0) parts.push(`<rect x="${r(n.x)}" y="${r(n.y)}" width="${r(n.w)}" height="${r(n.h)}" rx="14" fill="#0b1a33"/>`);
    else if (n.depth === 1) parts.push(`<rect x="${r(n.x)}" y="${r(n.y)}" width="${r(n.w)}" height="${r(n.h)}" rx="8" fill="#fff" stroke="${n.colour}" stroke-width="5"/>`);
    else parts.push(`<path d="M${r(n.x)} ${r(n.y + n.h - 3)}H${r(n.x + n.w)}" stroke="${n.colour}" stroke-width="4" stroke-linecap="round"/>`);
  }
  parts.push('</svg>');
  return parts.join('');
}
