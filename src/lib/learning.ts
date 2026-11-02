/**
 * Helpers for the 2.0 learning collections: where each subtopic lives, and the
 * mindmaps and notes in course order.
 */
import { corpus, slug } from './content';
import type { Corpus } from './integrity';
import type { Mindmap, Note } from './schemas';

/** "3.10" sorts after "3.9". */
export function codeKey(code: string): number {
  const [a, b] = code.split('.').map(Number);
  return (a ?? 0) * 100 + (b ?? 0);
}

export function allSubtopics(c: Corpus) {
  const cur = c.curricula['ib-dp-bm'];
  return (cur?.units ?? []).flatMap((u) => u.subtopics.map((s) => ({ unit: u, s })));
}

/** The address of a subtopic's page: its brief when the brief carries its name, otherwise its hub. */
export function subtopicSlug(title: string): string {
  return slug(title);
}

export function subtopicHref(c: Corpus, code: string): string {
  const found = allSubtopics(c).find((x) => x.s.code === code);
  if (!found) return '/topics/';
  const s = subtopicSlug(found.s.title);
  return `/topics/${s}/`;
}

/** Subtopics whose page is a hub (not a brief with the same address). */
export function hubSubtopics(c: Corpus) {
  return allSubtopics(c).filter(({ s }) => !c.topics[subtopicSlug(s.title)]);
}

export function mindmapFor(c: Corpus, code: string): [string, Mindmap] | undefined {
  return Object.entries(c.mindmaps).find(([, m]) => m.scope === 'subtopic' && m.code === code);
}

export function noteFor(c: Corpus, code: string): [string, Note] | undefined {
  return Object.entries(c.notes).find(([, n]) => n.code === code);
}

export async function mindmapsInOrder(): Promise<Array<[string, Mindmap]>> {
  const c = await corpus();
  return Object.entries(c.mindmaps).sort(([, a], [, b]) => a.unit - b.unit || (a.scope === b.scope ? codeKey(a.code) - codeKey(b.code) : a.scope === 'unit' ? -1 : 1));
}
