/**
 * Data access for the Business Intelligence Briefing's pages.
 *
 * Loads the briefing once per build, checks it against the rest of the
 * corpus, the frameworks library and the Strategy Studio
 * (src/lib/integrity-intelligence.ts) and throws if anything fails, so no
 * briefing page can be published with an unsourced fact, a source nobody
 * read, a theme left uncovered or a link to a page that does not exist.
 */
import { getCollection } from 'astro:content';
import { corpus } from './content';
import { byDateDesc } from './briefing';
import { checkIntelligence, type BriefingLibrary } from './integrity-intelligence';
import { library } from './frameworks-content';
import type { Framework } from './framework-schema';
import type { Intelligence } from './schemas';

export interface Briefing {
  /** Every item, newest first. */
  items: Array<[string, Intelligence]>;
  /** The frameworks library, for each item's links into it. */
  frameworks: Record<string, Framework>;
  /** The Strategy Studio's tools, to link a toolkit tool to the studio tool that applies it. */
  studio: Array<{ slug: string; toolkit?: string; title: string }>;
}

let loaded: Promise<Briefing> | null = null;

/** The briefing and what its items link to, checked once per build. */
export function briefingData(): Promise<Briefing> {
  loaded ??= (async () => {
    const [c, list, lib] = await Promise.all([corpus(), getCollection('intelligence'), library()]);
    const items = Object.fromEntries(list.map((e) => [e.id, e.data]));
    const refs: BriefingLibrary = { frameworks: lib.frameworks, studio: lib.studio.map((s) => s.slug) };
    const problems = checkIntelligence(items, c, refs);
    if (problems.length) {
      throw new Error(`Briefing integrity check failed (${problems.length}):\n${problems.map((p) => `  ${p.where}: ${p.message}`).join('\n')}`);
    }
    return { items: byDateDesc(Object.entries(items)), frameworks: lib.frameworks, studio: lib.studio };
  })();
  return loaded;
}

/** Every item, newest first. */
export async function briefing(): Promise<Array<[string, Intelligence]>> {
  return (await briefingData()).items;
}

export const briefingHref = (id: string) => `/intelligence/${id}/`;
