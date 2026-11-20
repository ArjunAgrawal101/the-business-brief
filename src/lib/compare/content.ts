/**
 * Data access for the framework comparisons: loads the curated comparisons
 * once per build, checks them against the curriculum, the toolkit, the
 * library, the glossary and the source register, and throws on any problem,
 * so no comparison page can be built with a broken reference. Also gives the
 * renderer its links. Server-side only.
 */
import { getCollection } from 'astro:content';
import { corpus, href } from '../content';
import { library } from '../frameworks-content';
import { allSubtopics, subtopicHref } from '../learning';
import { checkComparisons, statementsOf, type CompareContext, type Statement } from './integrity';
import type { RenderCtx } from './render';
import type { Comparison } from './schema';

export interface Comparisons {
  all: Array<[string, Comparison]>;
  ctx: CompareContext;
  render: RenderCtx;
  /** The statements each side of a comparison rests on, by slug. */
  statements: (slug: string) => Statement[][];
}

let loaded: Promise<Comparisons> | null = null;

export function comparisons(): Promise<Comparisons> {
  loaded ??= (async () => {
    const [list, c, lib] = await Promise.all([getCollection('comparisons'), corpus(), library()]);
    const subs = allSubtopics(c);
    const statements: Statement[] = subs.flatMap(({ s }) => s.content.map((x) => ({ code: s.code, title: s.title, page: s.page ?? 0, text: x.text, ao: x.ao, hl: s.level === 'HL' || x.level === 'HL' })));
    const ctx: CompareContext = {
      statements,
      subtopics: new Map(subs.map(({ s }) => [s.code, { title: s.title, level: s.level, page: s.page ?? 0 }])),
      tools: Object.fromEntries(Object.entries(c.tools).map(([id, t]) => [id, { name: t.name, level: t.level, status: t.status }])),
      frameworks: lib.frameworks,
      glossary: new Set(Object.keys(c.glossary)),
      sources: new Set(Object.keys(c.sources)),
    };
    const all = Object.fromEntries(list.map((e) => [e.id, e.data]));
    const problems = checkComparisons(all, ctx);
    if (problems.length) throw new Error(`Framework comparisons: ${problems.length} problem(s):\n${problems.map((p) => `  ${p.where}: ${p.message}`).join('\n')}`);
    const render: RenderCtx = {
      subtopic: (code) => {
        const s = ctx.subtopics.get(code);
        return s ? { code, title: s.title, href: subtopicHref(c, code), hl: s.level === 'HL' } : undefined;
      },
      tool: (id) => {
        const t = c.tools[id];
        return t ? { name: t.name, href: href.toolEntry(id, t) } : undefined;
      },
      term: (id) => {
        const g = c.glossary[id];
        return g ? { term: g.term, href: href.glossary(id) } : undefined;
      },
    };
    return {
      all: Object.entries(all).sort((a, b) => a[1].order - b[1].order || a[0].localeCompare(b[0])),
      ctx,
      render,
      statements: (slug) => (all[slug]?.sides ?? []).map((side) => statementsOf(side, ctx).filter((x): x is Statement => Boolean(x))),
    };
  })();
  return loaded;
}
