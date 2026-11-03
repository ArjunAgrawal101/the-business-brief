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
import { studio } from './strategy/content';

export interface Library {
  frameworks: Record<string, Framework>;
  /** The Strategy Studio's tools, to link a framework to the tool that applies it. */
  studio: Array<{ slug: string; toolkit?: string; title: string }>;
  /** What a glossary reference resolves against. */
  refs: RefContext;
}

let loaded: Promise<Library> | null = null;

export function library(): Promise<Library> {
  loaded ??= (async () => {
    const [list, c, st] = await Promise.all([getCollection('frameworks'), corpus(), studio()]);
    const frameworks = Object.fromEntries(list.map((e) => [e.id, e.data]));
    const studioTools = st.tools.map((t) => ({ slug: t.slug, toolkit: t.status.toolkit, title: t.title }));
    const problems = [...checkFrameworks(frameworks, c, studioTools), ...checkGlossaryDepth(c, frameworks)];
    if (problems.length) throw new Error(`Frameworks library: ${problems.length} integrity problem(s):\n${problems.map((p) => `  ${p.where}: ${p.message}`).join('\n')}`);
    return { frameworks, studio: studioTools, refs: { frameworks, tools: c.tools, diagrams: DIAGRAMS } };
  })();
  return loaded;
}
