/**
 * The Boardroom scenarios for pages: loaded once per build, checked by
 * checkBoardroom (src/lib/integrity-boardroom.ts) against the rest of the
 * corpus, and refused with every problem listed if any check fails, so no
 * Boardroom page can be built from a broken scenario.
 */
import { getCollection } from 'astro:content';
import { corpus } from '../content';
import { checkBoardroom } from '../integrity-boardroom';
import type { Scenario } from './schema';

let loaded: Promise<Array<[string, Scenario]>> | null = null;

export function boardroomScenarios(): Promise<Array<[string, Scenario]>> {
  loaded ??= (async () => {
    const c = await corpus();
    const entries = (await getCollection('boardroom')).map((e) => [e.id, e.data] as [string, Scenario]);
    const subtopics = new Set((c.curricula['ib-dp-bm']?.units ?? []).flatMap((u) => u.subtopics.map((s) => s.code)));
    const problems = checkBoardroom(Object.fromEntries(entries), {
      subtopics,
      glossary: new Set(Object.keys(c.glossary)),
      commandTerms: new Set(Object.keys(c.commandTerms)),
    });
    if (problems.length) {
      throw new Error(`Boardroom integrity check failed (${problems.length}):\n${problems.map((p) => `  ${p.where}: ${p.message}`).join('\n')}`);
    }
    return entries.sort((a, b) => a[1].order - b[1].order);
  })();
  return loaded;
}

export const boardroomHref = (id: string) => `/boardroom/${id}/`;
