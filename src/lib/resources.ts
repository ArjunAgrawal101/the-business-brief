/**
 * The Resources Library at build time: gathers the content the catalogue is
 * built from (src/lib/library/catalogue.ts) and builds it once per build. A
 * download is listed only when its file exists, in public/ or written by the
 * build, and the build fails on a download whose file is missing.
 *
 * Two parts of the library are built by the revision workstream: a revision
 * sheet at /revision/<slug>/ for every subtopic, and the flashcards at
 * /revision/flashcards/. The library lists them once that work is in the
 * build, which it detects from the flashcards page; until then it lists the
 * three revision briefs that exist (/revision/<topic>/).
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getCollection } from 'astro:content';
import { corpus, pathwaysInOrder } from './content';
import { DIAGRAMS } from './diagrams';
import { library as frameworkLibrary } from './frameworks-content';
import { advancedLibrary } from './advanced-content';
import { DOMAIN_BY_ID, advancedHref } from './advanced';
import { series as briefingSeries } from './boardroom-briefings/content';
import { buildCatalogue, type Catalogue, type LibraryItem } from './library/catalogue';
import { fileFacts } from './library/downloads';
import { pdfPreviews } from './library/previews';
import { checkActivities } from './teachers/integrity';
import { promptLists, promptsBySubtopic, type PromptSet } from './teachers/prompts';
import type { Activity } from './teachers/schema';

export type { LibraryItem };

/** The page files that build the flashcards; any one of them means the revision workstream's pages are in the build. */
const FLASHCARD_PAGES = ['revision/flashcards.astro', 'revision/flashcards/index.astro'];

export function revisionBuilt(root = process.cwd()): { sheets: 'briefs' | 'every-subtopic'; flashcards: boolean } {
  const flashcards = FLASHCARD_PAGES.some((p) => existsSync(join(root, 'src/pages', p)));
  return { sheets: flashcards ? 'every-subtopic' : 'briefs', flashcards };
}

let activitiesLoaded: Promise<Array<[string, Activity]>> | null = null;

/** The classroom activities, checked against the cases and the course; the build fails on any problem. */
export function activities(): Promise<Array<[string, Activity]>> {
  activitiesLoaded ??= (async () => {
    const [list, c] = await Promise.all([getCollection('activities'), corpus()]);
    const byId = Object.fromEntries(list.map((e) => [e.id, e.data]));
    const problems = checkActivities(byId, c);
    if (problems.length) throw new Error(`Classroom activities: ${problems.length} problem(s):\n${problems.map((p) => `  ${p.where}: ${p.message}`).join('\n')}`);
    return Object.entries(byId).sort((a, b) => a[1].order - b[1].order);
  })();
  return activitiesLoaded;
}

let promptsLoaded: Promise<Record<string, PromptSet>> | null = null;

/** Discussion prompts for every subtopic that has them (src/lib/teachers/prompts.ts). */
export function prompts(): Promise<Record<string, PromptSet>> {
  promptsLoaded ??= (async () => {
    const [c, paths] = await Promise.all([corpus(), pathwaysInOrder()]);
    return promptsBySubtopic(paths.find((p) => p.id === 'teachers')?.data.lessons ?? [], c);
  })();
  return promptsLoaded;
}

let built: Promise<Catalogue> | null = null;

export function catalogue(): Promise<Catalogue> {
  built ??= (async () => {
    const [c, curated, fw, adv, briefs, boardroom, executive, acts, ps] = await Promise.all([
      corpus(),
      getCollection('resources'),
      frameworkLibrary(),
      advancedLibrary(),
      briefingSeries(),
      getCollection('boardroom'),
      getCollection('executive'),
      activities(),
      prompts(),
    ]);
    const site = import.meta.env.SITE;
    return buildCatalogue({
      c,
      curated: curated.map((e) => ({ id: e.id, data: e.data })),
      frameworks: fw.frameworks,
      diagrams: DIAGRAMS,
      boardroom: boardroom.map((e) => ({ id: e.id, title: e.data.title, dek: e.data.dek, syllabus: e.data.syllabus, level: e.data.level, order: e.data.order })),
      executive: executive.map((e) => ({ title: e.data.title, dek: e.data.dek })),
      briefings: briefs.list.map(([id, b]) => ({ id, number: b.number, question: b.question, title: b.title, dek: b.dek, subtopics: b.course.subtopics.map((s) => s.code), fictional: b.company.fictional === true })),
      advanced: adv.modules.map((m) => ({ id: m.id, href: advancedHref(m.data.domain, m.id), title: m.data.title, dek: m.data.dek, domain: DOMAIN_BY_ID[m.data.domain].name })),
      activities: acts,
      prompts: promptLists(ps),
      revision: revisionBuilt(),
      facts: (href) => fileFacts(href, { c, site }),
      pdfPreviews: pdfPreviews(),
    });
  })();
  return built;
}

/** Every item in the library, as other pages (search) read it. */
export async function library(): Promise<LibraryItem[]> {
  return (await catalogue()).items;
}
