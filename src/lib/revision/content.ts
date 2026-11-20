/**
 * Data access for quick revision: loads the revision collection once per
 * build with the corpus and the frameworks library, builds the sheets and the
 * flashcard deck, and throws on any integrity problem, so no revision page or
 * deck can be published with a broken reference. Server-side only.
 */
import { getCollection } from 'astro:content';
import { corpus } from '../content';
import { library } from '../frameworks-content';
import { buildRevision, type RevisionData } from './build';

let loaded: Promise<RevisionData> | null = null;

export function revisionData(): Promise<RevisionData> {
  loaded ??= (async () => {
    const [list, c, lib] = await Promise.all([getCollection('revision'), corpus(), library()]);
    const data = buildRevision({ c, frameworks: lib.frameworks, revision: Object.fromEntries(list.map((e) => [e.id, e.data])) });
    if (data.problems.length) {
      throw new Error(`Quick revision: ${data.problems.length} integrity problem(s):\n${data.problems.map((p) => `  ${p.where}: ${p.message}`).join('\n')}`);
    }
    return data;
  })();
  return loaded;
}
