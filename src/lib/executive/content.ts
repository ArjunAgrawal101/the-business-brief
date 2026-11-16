/**
 * The executive simulation for pages: loaded once per build, checked by
 * checkExecutive (src/lib/executive/integrity.ts) against the rest of the
 * corpus, and refused with every problem listed if any check fails, so no
 * page of the simulation can be built from broken content. The Boardroom has
 * one executive simulation; its pages live at /boardroom/executive/.
 */
import { getCollection } from 'astro:content';
import { corpus } from '../content';
import { checkExecutive } from './integrity';
import type { Executive } from './schema';

let loaded: Promise<[string, Executive]> | null = null;

export function executiveSim(): Promise<[string, Executive]> {
  loaded ??= (async () => {
    const c = await corpus();
    const entries = (await getCollection('executive')).map((e) => [e.id, e.data] as [string, Executive]);
    if (entries.length !== 1) throw new Error(`The executive simulation expects one entry in src/content/executive, not ${entries.length}`);
    const problems = checkExecutive(Object.fromEntries(entries), {
      subtopics: new Set((c.curricula['ib-dp-bm']?.units ?? []).flatMap((u) => u.subtopics.map((s) => s.code))),
      glossary: new Set(Object.keys(c.glossary)),
      commandTerms: new Set(Object.keys(c.commandTerms)),
      sources: new Set(Object.keys(c.sources)),
    });
    if (problems.length) throw new Error(`Executive simulation integrity check failed (${problems.length}):\n${problems.map((p) => `  ${p.where}: ${p.message}`).join('\n')}`);
    return entries[0] as [string, Executive];
  })();
  return loaded;
}

export const EXECUTIVE_HREF = '/boardroom/executive/';
export const SIMULATION_HREF = '/boardroom/executive/simulation/';
