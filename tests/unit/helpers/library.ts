/**
 * The inputs of the Resources Library's catalogue, loaded straight from the
 * YAML files and validated with the same schemas the build uses, so the tests
 * build the catalogue the site publishes (src/lib/resources.ts does the same
 * inside Astro).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { asCorpus, loadCorpus } from './corpus';
import { resourceSchema, type Pathway } from '../../../src/lib/schemas';
import { frameworkSchema, type Framework } from '../../../src/lib/framework-schema';
import { activitySchema, type Activity } from '../../../src/lib/teachers/schema';
import { DOMAINS } from '../../../src/lib/advanced';
import { DIAGRAMS } from '../../../src/lib/diagrams';
import type { CatalogueInput } from '../../../src/lib/library/catalogue';
import { fileFacts } from '../../../src/lib/library/downloads';
import { pdfPreviews } from '../../../src/lib/library/previews';
import { promptLists, promptsBySubtopic } from '../../../src/lib/teachers/prompts';

const CONTENT = new URL('../../../src/content/', import.meta.url).pathname;
const yamlIn = (dir: string) =>
  readdirSync(join(CONTENT, dir))
    .filter((f) => f.endsWith('.yaml'))
    .sort()
    .map((f) => [f.replace(/\.yaml$/, ''), parse(readFileSync(join(CONTENT, dir, f), 'utf8'))] as [string, Record<string, unknown>]);

export const loaded = loadCorpus();
export const c = asCorpus(loaded);

export function frameworks(): Record<string, Framework> {
  return Object.fromEntries(yamlIn('frameworks').map(([id, d]) => [id, frameworkSchema.parse(d)]));
}

export function activities(): Array<[string, Activity]> {
  return yamlIn('activities')
    .map(([id, d]) => [id, activitySchema.parse(d)] as [string, Activity])
    .sort((a, b) => a[1].order - b[1].order);
}

export function teacherPathway(): Pathway {
  const p = loaded.pathways.teachers;
  if (!p) throw new Error('no teachers pathway');
  return p as Pathway;
}

export function libraryInput(revision: CatalogueInput['revision'] = { sheets: 'briefs', flashcards: false }): CatalogueInput {
  const curated = (parse(readFileSync(join(CONTENT, 'data/resources.yaml'), 'utf8')) as Array<Record<string, unknown>>).map((r) => ({ id: String(r.id), data: resourceSchema.parse(r) }));
  const domainOrder = DOMAINS.map((d) => d.id as string);
  const advanced = yamlIn('advanced')
    .map(([id, d]) => ({ id, d: d as { domain: string; order: number; title: string; dek: string } }))
    .sort((a, b) => domainOrder.indexOf(a.d.domain) - domainOrder.indexOf(b.d.domain) || a.d.order - b.d.order)
    .map(({ id, d }) => ({ id, href: `/advanced/${d.domain}/${id}/`, title: d.title, dek: d.dek, domain: DOMAINS.find((x) => x.id === d.domain)?.name ?? d.domain }));
  return {
    c,
    curated,
    frameworks: frameworks(),
    diagrams: DIAGRAMS,
    boardroom: yamlIn('boardroom').map(([id, d]) => ({ id, title: String(d.title), dek: String(d.dek), syllabus: d.syllabus as string[], level: d.level as 'SL/HL' | 'HL', order: Number(d.order) })),
    executive: yamlIn('executive').map(([, d]) => ({ title: String(d.title), dek: String(d.dek) })),
    briefings: yamlIn('boardroom-briefings').map(([id, d]) => {
      const b = d as { number: number; question: string; title: string; dek: string; company: { fictional: boolean }; course: { subtopics: Array<{ code: string }> } };
      return { id, number: b.number, question: b.question, title: b.title, dek: b.dek, subtopics: b.course.subtopics.map((s) => s.code), fictional: b.company.fictional };
    }),
    advanced,
    activities: activities(),
    prompts: promptLists(promptsBySubtopic(teacherPathway().lessons, c)),
    revision,
    facts: (href) => fileFacts(href, { c }),
    pdfPreviews: pdfPreviews(),
  };
}
