/**
 * The diagram library: original diagrams drawn from data as SVG, each with a
 * title, a caption, a full text description (inside the SVG) and the
 * subtopics it serves. Topic notes refer to them by id; the integrity check
 * fails on an id that is not here. The drawing code lives in src/lib/figures.
 */
import { UNIT1 } from './figures/unit1';
import { UNIT2 } from './figures/unit2';
import { UNIT3 } from './figures/unit3';
import { UNIT4 } from './figures/unit4';
import { UNIT5 } from './figures/unit5';
import { TOOLKIT } from './figures/toolkit';
import { FRAMEWORK_FIGURES } from './figures/frameworks';

export type DiagramGroup = 'unit-1' | 'unit-2' | 'unit-3' | 'unit-4' | 'unit-5' | 'toolkit' | 'enrichment';

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
  render: (id: string) => string;
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

export const DIAGRAMS: Record<string, DiagramDef> = { ...UNIT1, ...UNIT2, ...UNIT3, ...UNIT4, ...UNIT5, ...TOOLKIT, ...FRAMEWORK_FIGURES };

/** The text description inside a rendered diagram, for a visible disclosure. */
export function describe(svg: string): string {
  const m = /<desc[^>]*>([\s\S]*?)<\/desc>/.exec(svg);
  return (m?.[1] ?? '').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
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
