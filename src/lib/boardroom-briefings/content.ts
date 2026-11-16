/**
 * Data access for the Boardroom Briefings' pages. Loads the series once per
 * build, checks it against the corpus, the frameworks library and the
 * platform's tools (./integrity.ts), and throws on any problem, so no
 * briefing can be published with a broken reference, an unsourced claim or a
 * figure that does not add up. Server-side only: the browser script never
 * imports this module.
 */
import { getCollection } from 'astro:content';
import { corpus } from '../content';
import { library } from '../frameworks-content';
import type { Corpus } from '../integrity';
import type { Framework } from '../framework-schema';
import { checkBoardroomBriefings } from './integrity';
import type { BoardroomBriefing } from './schema';
import type { ToolRegistry } from './series';

export interface Series {
  /** Briefings in series order. */
  list: Array<[string, BoardroomBriefing]>;
  c: Corpus;
  frameworks: Record<string, Framework>;
  registry: ToolRegistry;
}

let loaded: Promise<Series> | null = null;

export function series(): Promise<Series> {
  loaded ??= (async () => {
    const [entries, c, lib, labBriefings, labTools] = await Promise.all([
      getCollection('boardroomBriefings'),
      corpus(),
      library(),
      getCollection('briefings'),
      getCollection('labTools'),
    ]);
    const items = Object.fromEntries(entries.map((e) => [e.id, e.data]));
    const registry: ToolRegistry = {
      toolkit: Object.fromEntries(Object.entries(c.tools).map(([id, t]) => [id, { name: t.name, status: t.status, level: t.level }])),
      studio: lib.studio.map((s) => ({ slug: s.slug, title: s.title })),
      lab: Object.fromEntries([...labBriefings.map((e) => [e.id, e.data.title] as const), ...labTools.map((e) => [e.id, e.data.title] as const)]),
    };
    const problems = checkBoardroomBriefings(items, { c, frameworks: lib.frameworks, registry });
    if (problems.length) {
      throw new Error(`The Boardroom Briefings: ${problems.length} integrity problem(s):\n${problems.map((p) => `  ${p.where}: ${p.message}`).join('\n')}`);
    }
    return { list: Object.entries(items).sort((a, b) => a[1].number - b[1].number), c, frameworks: lib.frameworks, registry };
  })();
  return loaded;
}
