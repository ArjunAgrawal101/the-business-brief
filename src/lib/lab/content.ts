/**
 * Data access for the Entrepreneurship and Innovation Lab's pages. Loads the
 * briefings, the tools and the room's register entry once per build, runs the
 * Lab's integrity checks against the main corpus, and throws on any problem,
 * so no Lab page can be built with a broken reference. Server-side only: the
 * browser scripts never import this module.
 */
import { getCollection } from 'astro:content';
import { corpus, modulesInOrder } from '../content';
import { checkLab, labHref, type LabContent } from '../integrity-lab';
import type { Briefing, LabTool, LabToolOf } from './schemas';

export interface Lab extends LabContent {
  /** Briefings in reading order. */
  briefingList: Array<[string, Briefing]>;
  /** Tools in route order. */
  toolList: Array<[string, LabTool]>;
}

let loaded: Promise<Lab> | null = null;

export function lab(): Promise<Lab> {
  loaded ??= (async () => {
    const [b, t, rooms, c] = await Promise.all([getCollection('briefings'), getCollection('labTools'), modulesInOrder(), corpus()]);
    const data: LabContent = {
      briefings: Object.fromEntries(b.map((e) => [e.id, e.data])),
      tools: Object.fromEntries(t.map((e) => [e.id, e.data])),
      room: rooms.find((r) => r.id === 'entrepreneurship-lab')?.data,
    };
    const problems = checkLab(data, c);
    if (problems.length) throw new Error(`Entrepreneurship and Innovation Lab: ${problems.length} integrity problem(s):\n${problems.map((p) => `  ${p.where}: ${p.message}`).join('\n')}`);
    return {
      ...data,
      briefingList: Object.entries(data.briefings).sort((x, y) => x[1].order - y[1].order),
      toolList: Object.entries(data.tools).sort((x, y) => x[1].order - y[1].order),
    };
  })();
  return loaded;
}

/** The tool of a given kind, with its id. */
export async function toolOf<K extends LabTool['kind']>(kind: K): Promise<[string, LabToolOf<K>]> {
  const l = await lab();
  const found = l.toolList.find(([, t]) => t.kind === kind);
  if (!found) throw new Error(`Lab: no tool of kind ${kind}`);
  return found as [string, LabToolOf<K>];
}

export { labHref };
