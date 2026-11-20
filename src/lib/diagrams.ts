/**
 * The diagram library: original diagrams drawn from data as SVG, each with a
 * title, a caption, a full text description (inside the SVG) and the
 * subtopics it serves. Topic notes refer to them by id; the integrity check
 * fails on an id that is not here. The drawing code lives in src/lib/figures.
 *
 * A diagram can also carry:
 * - a layout drawn for phones (`narrow`), shown when its frame is narrow, so
 *   its labels stay readable without scrolling sideways;
 * - parts a reader can explore (`parts`): each is explained on hover, focus or
 *   a first tap, and opens the subtopic that teaches it;
 * - an interaction (`ix`): states to switch between, panels to compare two at
 *   a time, figures to change (the arithmetic in src/lib/figure-models.ts), or
 *   a tree to expand and collapse. src/components/diagrams/Diagram.astro draws
 *   every one complete without JavaScript, and src/scripts/diagram.ts adds the
 *   behaviour.
 */
import type { RenderOpts } from './figures/kit';
import { UNIT1 } from './figures/unit1';
import { UNIT2 } from './figures/unit2';
import { UNIT3 } from './figures/unit3';
import { UNIT4 } from './figures/unit4';
import { UNIT5 } from './figures/unit5';
import { TOOLKIT } from './figures/toolkit';
import { FRAMEWORK_FIGURES } from './figures/frameworks';
import { UNIT1_MORE } from './figures/unit1-more';
import { UNIT2_MORE } from './figures/unit2-more';
import { UNIT3_MORE } from './figures/unit3-more';
import { UNIT45_MORE } from './figures/unit45-more';
import { TOOLKIT_MORE } from './figures/toolkit-more';

export type { RenderOpts } from './figures/kit';

export type DiagramGroup = 'unit-1' | 'unit-2' | 'unit-3' | 'unit-4' | 'unit-5' | 'toolkit' | 'enrichment';

/** One part of a diagram a reader can explore. */
export interface DiagramPart {
  /** Unique within the diagram: the drawing marks the part with data-part. */
  id: string;
  /** The part's name, as the drawing labels it. */
  label: string;
  /** What the part means, in a sentence or two. */
  text: string;
  /** The subtopic that teaches it (a curriculum code), or a page on the site. One of the two is required. */
  code?: string;
  href?: string;
  /** The words of the link to href, such as "SWOT analysis: the framework". */
  hrefLabel?: string;
}

/** A state a diagram can be switched to, drawn in full on the server. */
export interface DiagramState {
  id: string;
  label: string;
  /** A sentence under the drawing that says what this state shows. */
  note: string;
}

/** A panel that can be set beside another. Every panel lists the same facts in the same order. */
export interface DiagramPanel {
  id: string;
  label: string;
  facts: Array<[string, string]>;
}

/** A figure a reader can change in a live diagram. */
export interface LiveInput {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  /** Written before the value, such as "$". */
  prefix?: string;
  /** Written after the value, such as "months" or "%". */
  suffix?: string;
  /** Optional choices shown as a list instead of a number box. */
  options?: Array<{ value: number; label: string }>;
  /** Which group of fields the input belongs to, when there are several. */
  group?: string;
}

export type DiagramIx =
  | { kind: 'switch'; legend: string; states: DiagramState[]; draw: (id: string, state: string, narrow: boolean, o?: RenderOpts) => string }
  | { kind: 'compare'; legend: string; panels: DiagramPanel[]; draw: (id: string, panel: string, o?: RenderOpts) => string; first: [string, string] }
  | { kind: 'live'; model: LiveModelId; inputs: LiveInput[] }
  | { kind: 'tree'; tree: TreeNode };

/** The live diagrams, each with its drawing and reading in src/lib/figures/live.ts. */
export type LiveModelId = 'span' | 'cash' | 'ratios' | 'invest';

/** A node of an expandable decision tree. */
export interface TreeNode {
  id: string;
  /** A question (with answers below it) or an answer that leads to sources. */
  label: string;
  /** Extra words under the label. */
  note?: string;
  /** Answers to a question, or the options an answer leads to. */
  children?: TreeNode[];
  /** At a leaf: the subtopic or page it opens. */
  code?: string;
  href?: string;
  kind: 'question' | 'answer' | 'option';
}

export interface DiagramDef {
  title: string;
  caption?: string;
  /** IB subtopic codes the diagram teaches. Empty for an enrichment diagram, which is beyond the course. */
  syllabus: string[];
  level: 'SL/HL' | 'HL';
  group: DiagramGroup;
  /** The figures in the diagram are invented for teaching. */
  fictional?: boolean;
  /** Draws the diagram; the id keeps its internal references unique on a page. */
  render: (id: string, o?: RenderOpts) => string;
  /** Draws it again for a phone: about 300 units wide, with no text under 14 units. */
  narrow?: (id: string, o?: RenderOpts) => string;
  /** A one-sentence text alternative; the full description is in the drawing's desc. */
  alt?: string;
  /** Parts a reader can point to, focus or tap for an explanation, each opening where it is taught. */
  parts?: DiagramPart[];
  /** An interaction beyond exploring parts. */
  ix?: DiagramIx;
  /** What the reader can do with it, in one line under the title. */
  howTo?: string;
}

export const DIAGRAM_GROUPS: Array<{ id: DiagramGroup; title: string }> = [
  { id: 'unit-1', title: 'Unit 1: Introduction to business management' },
  { id: 'unit-2', title: 'Unit 2: Human resource management' },
  { id: 'unit-3', title: 'Unit 3: Finance and accounts' },
  { id: 'unit-4', title: 'Unit 4: Marketing' },
  { id: 'unit-5', title: 'Unit 5: Operations management' },
  { id: 'toolkit', title: 'The business management toolkit' },
  { id: 'enrichment', title: 'Enrichment: frameworks beyond the syllabus' },
];

export const DIAGRAMS: Record<string, DiagramDef> = {
  ...UNIT1,
  ...UNIT1_MORE,
  ...UNIT2,
  ...UNIT2_MORE,
  ...UNIT3,
  ...UNIT3_MORE,
  ...UNIT4,
  ...UNIT5,
  ...UNIT45_MORE,
  ...TOOLKIT,
  ...TOOLKIT_MORE,
  ...FRAMEWORK_FIGURES,
};

/** The text description inside a rendered diagram, for a visible disclosure. */
export function describe(svg: string): string {
  const m = /<desc[^>]*>([\s\S]*?)<\/desc>/.exec(svg);
  return (m?.[1] ?? '').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** The short text alternative inside a rendered diagram's title, after its name (empty when it has none). */
export function altOf(id: string): string {
  return DIAGRAMS[id]?.alt ?? '';
}

/** A standalone file: the same drawing with a white background and the platform's credit line. */
export function standalone(id: string): string {
  const d = DIAGRAMS[id];
  if (!d) throw new Error(`Diagram "${id}" is not in the library.`);
  const svg = d.render(`dl-${id}`);
  const m = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svg);
  const w = Number(m?.[1] ?? 720);
  const h = Number(m?.[2] ?? 400);
  const pad = 24;
  const foot = 30;
  const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const head = /^<svg[^>]*>/.exec(svg)?.[0] ?? '';
  const attrs = head.replace(/viewBox="[^"]*"/, '').replace(/width="[^"]*"/, '').replace(/height="[^"]*"/, '').replace(/^<svg/, '').replace(/>$/, '');
  const W = w + pad * 2;
  const H = h + pad * 2 + foot;
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n<svg${attrs} viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<rect width="${W}" height="${H}" fill="#ffffff"/>` +
    `<g transform="translate(${pad} ${pad})">${inner}</g>` +
    `<line x1="${pad}" y1="${H - foot - 6}" x2="${W - pad}" y2="${H - foot - 6}" stroke="#e3dac8"/>` +
    `<text x="${pad}" y="${H - 14}" font-size="11" fill="#566173">Arjun Agrawal | The Business Brief. ${d.title}. Original teaching diagram${d.fictional ? '; the figures are fictional' : ''}.</text>` +
    `</svg>`
  );
}
