/**
 * Data access for the frameworks library and the glossary's links into it.
 * Loads the frameworks once per build, checks them and the glossary's
 * framework references against the main corpus, and throws on any problem,
 * so no page can be built with a broken reference. Server-side only.
 */
import { getCollection } from 'astro:content';
import { corpus } from './content';
import { DIAGRAMS } from './diagrams';
import type { Framework } from './framework-schema';
import { checkFrameworks, checkGlossaryDepth } from './integrity-frameworks';
import type { RefContext } from './frameworks';

export interface Library {
  frameworks: Record<string, Framework>;
  /** What a glossary reference resolves against. */
  refs: RefContext;
}

let loaded: Promise<Library> | null = null;

export function library(): Promise<Library> {
  loaded ??= (async () => {
    const [list, c] = await Promise.all([getCollection('frameworks'), corpus()]);
    const frameworks = Object.fromEntries(list.map((e) => [e.id, e.data]));
    const problems = [...checkFrameworks(frameworks, c), ...checkGlossaryDepth(c, frameworks)];
    if (problems.length) throw new Error(`Frameworks library: ${problems.length} integrity problem(s):\n${problems.map((p) => `  ${p.where}: ${p.message}`).join('\n')}`);
    return { frameworks, refs: { frameworks, tools: c.tools, diagrams: DIAGRAMS } };
  })();
  return loaded;
}
