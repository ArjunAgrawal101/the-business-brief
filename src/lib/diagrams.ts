/**
 * The diagram library: original diagrams drawn from data as SVG, each with a
 * title, a caption and the subtopics it serves. Topic notes refer to them by
 * id; the integrity check fails on an id that is not here.
 */
export interface DiagramDef {
  title: string;
  caption?: string;
  /** IB subtopic codes the diagram teaches. */
  syllabus: string[];
  render: () => string;
}

export const DIAGRAMS: Record<string, DiagramDef> = {};
