/**
 * Data access for pages.
 *
 * Loads every collection once per build, checks the relationship model, and
 * throws if any reference is broken, so a page can never be published with a
 * link to content that does not exist. Pages read content through here.
 */
import { getCollection } from 'astro:content';
import { backlinks, checkIntegrity, type Corpus } from './integrity';
import type { CaseEntry, Decision, Question, Tool, Topic } from './schemas';

const NAMES = [
  'topics',
  'cases',
  'decisions',
  'tools',
  'questions',
  'calculations',
  'glossary',
  'sources',
  'claims',
  'curricula',
  'assessment',
  'commandTerms',
  'concepts',
  'interactives',
] as const;

let loaded: Promise<Corpus> | null = null;

export function corpus(): Promise<Corpus> {
  loaded ??= (async () => {
    const lists = await Promise.all(NAMES.map((n) => getCollection(n)));
    const c = Object.fromEntries(
      NAMES.map((n, i) => [n, Object.fromEntries((lists[i] ?? []).map((e) => [e.id, e.data]))]),
    ) as unknown as Corpus;
    const problems = checkIntegrity(c);
    if (problems.length) {
      throw new Error(`Content integrity check failed (${problems.length}):\n${problems.map((p) => `  ${p.where}: ${p.message}`).join('\n')}`);
    }
    return c;
  })();
  return loaded;
}

export async function usedBy() {
  return backlinks(await corpus());
}

/* ---------- Addresses ---------- */

export const href = {
  topic: (id: string) => `/topics/${id}/`,
  case: (id: string) => `/cases/${id}/`,
  decision: (id: string) => `/decision-room/${id}/`,
  tool: (id: string, tool?: Tool) => (tool && tool.status !== 'complete' ? null : `/toolkit/${id}/`),
  /** A tool's guide when it has one, otherwise its entry in the toolkit index. */
  toolEntry: (id: string, tool?: Tool) => (tool && tool.status !== 'complete' ? `/toolkit/#tool-${id}` : `/toolkit/${id}/`),
  question: (id: string) => `/exam-desk/practice/#q-${id}`,
  glossary: (id: string) => `/glossary/#term-${id}`,
  commandTerm: (term: string) => `/examiner-lens/#ct-${slug(term)}`,
  pathway: (id: string) => `/pathways/${id}/`,
  concept: (id: string) => `/ib/concepts/#${id}`,
  revision: (id: string) => `/revision/${id}/`,
  calculation: (id: string, page: string) => `${page}#calc-${id}`,
  assessment: (id: string) => (id === 'internal-assessment' ? '/ia-studio/' : `/exam-desk/${id}/`),
  source: (id: string) => `/sources/#src-${id}`,
};

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* ---------- Sorted lists ---------- */

export async function topicsInOrder(): Promise<Array<[string, Topic]>> {
  const c = await corpus();
  return Object.entries(c.topics).sort((a, b) => a[1].code.localeCompare(b[1].code, 'en', { numeric: true }));
}

export async function casesInOrder(): Promise<Array<[string, CaseEntry]>> {
  const c = await corpus();
  return Object.entries(c.cases).sort((a, b) => a[1].title.localeCompare(b[1].title));
}

export async function decisionsInOrder(): Promise<Array<[string, Decision]>> {
  const c = await corpus();
  return Object.entries(c.decisions).sort((a, b) => a[1].title.localeCompare(b[1].title));
}

export async function questionsInOrder(): Promise<Array<[string, Question]>> {
  const c = await corpus();
  return Object.entries(c.questions).sort((a, b) => a[1].order - b[1].order);
}

export async function toolsInOrder(): Promise<Array<[string, Tool]>> {
  const c = await corpus();
  return Object.entries(c.tools).sort((a, b) => a[1].order - b[1].order);
}

/* ---------- Collections outside the integrity corpus ---------- */

export async function pathwaysInOrder() {
  return (await getCollection('pathways')).sort((a, b) => a.data.order - b.data.order);
}

export async function modulesInOrder() {
  return (await getCollection('modules')).sort((a, b) => a.data.order - b.data.order);
}

/** Format a date as 29 October 2026. */
export function longDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
