/**
 * Data access for the Business Intelligence Briefing's pages.
 *
 * Loads the briefing once per build, checks it against the rest of the
 * corpus (src/lib/integrity-intelligence.ts) and throws if anything fails, so
 * no briefing page can be published with an unsourced fact, a source nobody
 * read or a link to a page that does not exist.
 */
import { getCollection } from 'astro:content';
import { corpus } from './content';
import { byDateDesc } from './briefing';
import { checkIntelligence } from './integrity-intelligence';
import type { Intelligence } from './schemas';

let loaded: Promise<Array<[string, Intelligence]>> | null = null;

/** Every item, newest first. */
export function briefing(): Promise<Array<[string, Intelligence]>> {
  loaded ??= (async () => {
    const [c, list] = await Promise.all([corpus(), getCollection('intelligence')]);
    const items = Object.fromEntries(list.map((e) => [e.id, e.data]));
    const problems = checkIntelligence(items, c);
    if (problems.length) {
      throw new Error(`Briefing integrity check failed (${problems.length}):\n${problems.map((p) => `  ${p.where}: ${p.message}`).join('\n')}`);
    }
    return byDateDesc(Object.entries(items));
  })();
  return loaded;
}

export const briefingHref = (id: string) => `/intelligence/${id}/`;
