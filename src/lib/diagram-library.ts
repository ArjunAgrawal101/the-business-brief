/**
 * The diagram library as readers browse it: the order of the catalogue, each
 * diagram's address, what a reader can do with it, and where it is used on
 * the platform (the subtopic pages that show it, the notes that teach with
 * it and the frameworks it draws). Used by /diagrams/ and /diagrams/<id>/,
 * and tested in tests/unit/diagram-registry.test.ts.
 */
import { DIAGRAMS, DIAGRAM_GROUPS, type DiagramDef } from './diagrams';
import type { Framework } from './framework-schema';
import type { Note } from './schemas';

/** "3.10" sorts after "3.9" (as in src/lib/learning.ts, which needs the content layer). */
const codeKey = (code: string): number => {
  const [a, b] = code.split('.').map(Number);
  return (a ?? 0) * 100 + (b ?? 0);
};

export const diagramHref = (id: string) => `/diagrams/${id}/`;

/** Every diagram in catalogue order: by group, then by the first subtopic it serves. */
export function diagramsInOrder(): Array<[string, DiagramDef]> {
  const all = Object.entries(DIAGRAMS);
  return DIAGRAM_GROUPS.flatMap((g) => all.filter(([, d]) => d.group === g.id).sort((a, b) => codeKey(a[1].syllabus[0] ?? '0') - codeKey(b[1].syllabus[0] ?? '0')));
}

/** What a reader can do with a diagram beyond looking at it, in a few words; empty for a still drawing. */
export function interactionLabel(d: Pick<DiagramDef, 'ix' | 'parts'>): string {
  switch (d.ix?.kind) {
    case 'live':
      return 'Change the figures';
    case 'compare':
      return 'Compare two side by side';
    case 'switch':
      return 'Switch between views';
    case 'tree':
      return 'Open and close each question';
    default:
      return d.parts?.length ? 'Explore each part' : '';
  }
}

/** The width and height a diagram is drawn at, from its viewBox. */
export function diagramSize(id: string): { w: number; h: number } {
  const svg = DIAGRAMS[id]?.render(`size-${id}`) ?? '';
  const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  return { w: Number(m?.[1] ?? 720), h: Number(m?.[2] ?? 400) };
}

export interface DiagramUses {
  subtopics: Array<{ code: string; title: string; href: string; inNotes: boolean }>;
  notes: Array<{ code: string; subtopic: string; section: string; href: string }>;
  frameworks: Array<{ id: string; name: string; href: string }>;
}

/** What diagramUses needs from the content: the notes, and each subtopic's title and page. */
export interface UsesContext {
  notes: Record<string, Pick<Note, 'code' | 'sections'>>;
  subtopicTitle: (code: string) => string;
  subtopicHref: (code: string) => string;
  frameworks: Record<string, Pick<Framework, 'name' | 'diagram'>>;
}

/**
 * Where a diagram appears for readers: the page of each subtopic it serves
 * (in that subtopic's notes, or with its other diagrams), each notes section
 * that teaches with it, and each framework page that draws it.
 */
export function diagramUses(id: string, ctx: UsesContext): DiagramUses {
  const d = DIAGRAMS[id];
  if (!d) throw new Error(`Diagram "${id}" is not in the library.`);
  const notes = Object.values(ctx.notes).flatMap((n) =>
    n.sections.filter((s) => s.diagram === id).map((s) => ({ code: n.code, subtopic: ctx.subtopicTitle(n.code), section: s.title, href: `${ctx.subtopicHref(n.code)}#${s.id}` })),
  );
  const inNotes = new Set(notes.map((n) => n.code));
  return {
    subtopics: d.syllabus.map((code) => ({ code, title: ctx.subtopicTitle(code), href: ctx.subtopicHref(code), inNotes: inNotes.has(code) })),
    notes,
    frameworks: Object.entries(ctx.frameworks)
      .filter(([, f]) => f.diagram === id)
      .map(([fid, f]) => ({ id: fid, name: f.name, href: `/frameworks/${fid}/` })),
  };
}
