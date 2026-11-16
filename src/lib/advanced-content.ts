/**
 * Data access for Advanced Management and Strategy: loads the modules once
 * per build, checks them against the source register, the frameworks library
 * and the IB course, and throws on any problem, so no page is built with a
 * broken reference or an unsourced claim. Server-side only.
 */
import { getCollection } from 'astro:content';
import { corpus } from './content';
import { library as frameworkLibrary } from './frameworks-content';
import { subtopicIndex } from './integrity-learning';
import { checkAdvanced } from './integrity-advanced';
import { DOMAINS, inOrder } from './advanced';
import type { AdvancedDomain, AdvancedModule } from './advanced-schema';
import type { Source } from './schemas';

export interface AdvancedLibrary {
  /** Every module, in domain order then module order. */
  modules: Array<{ id: string; data: AdvancedModule }>;
  byDomain: Record<AdvancedDomain, Array<{ id: string; data: AdvancedModule }>>;
  sources: Record<string, Source>;
}

let loaded: Promise<AdvancedLibrary> | null = null;

export function advancedLibrary(): Promise<AdvancedLibrary> {
  loaded ??= (async () => {
    const [list, c, fw] = await Promise.all([getCollection('advanced'), corpus(), frameworkLibrary()]);
    const modules = inOrder(list.map((e) => ({ id: e.id, data: e.data })));
    const problems = checkAdvanced(Object.fromEntries(modules.map((m) => [m.id, m.data])), {
      sources: c.sources,
      frameworks: new Set(Object.keys(fw.frameworks)),
      subtopics: new Set(subtopicIndex(c).keys()),
    });
    if (problems.length) throw new Error(`Advanced Management: ${problems.length} integrity problem(s):\n${problems.map((p) => `  ${p.where}: ${p.message}`).join('\n')}`);
    const byDomain = Object.fromEntries(DOMAINS.map((d) => [d.id, modules.filter((m) => m.data.domain === d.id)])) as AdvancedLibrary['byDomain'];
    return { modules, byDomain, sources: c.sources };
  })();
  return loaded;
}

/** A citation as a reader expects it: author (year), title, publisher. */
export function citation(s: Source): string {
  const who = s.author ? `${s.author}${s.year ? ` (${s.year})` : ''}. ` : s.year ? `(${s.year}). ` : '';
  return `${who}${s.title}${s.publisher ? `. ${s.publisher}` : ''}.`;
}
