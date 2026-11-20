/**
 * Loads what the course connections and connected learning read, straight
 * from the YAML files and the code catalogues, as the build does, so the
 * tests check exactly what the site publishes without running Astro.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { subtopicToolsSchema, topicConnectionSchema, type SubtopicTools, type TopicConnection } from '../../../src/lib/connections-schema';
import { applyTools } from '../../../src/lib/framework-lab';
import { LAB } from '../../../src/lib/finance-lab/catalogue';
import { ADVANCED } from '../../../src/lib/adv-finance/catalogue';
import { toolPages, type ToolSources } from '../../../src/lib/connected';
import type { SubtopicInfo } from '../../../src/lib/connections';
import { loadCorpus, type LoadedCorpus } from './corpus';

const ROOT = new URL('../../../src/content/', import.meta.url).pathname;

/** The site's slug() rule (src/lib/content.ts imports astro:content, which the tests cannot load). */
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function list<T>(path: string, parseOne: (x: unknown) => T): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of parse(readFileSync(join(ROOT, path), 'utf8')) as Array<Record<string, unknown>>) {
    const id = String(item.id);
    if (id in out) throw new Error(`Duplicate id ${id} in ${path}`);
    out[id] = parseOne(item);
  }
  return out;
}

export const loadConnections = (): Record<string, TopicConnection> => list('data/topic-connections.yaml', (x) => topicConnectionSchema.parse(x));
export const loadSubtopicTools = (): Record<string, SubtopicTools> => list('data/subtopic-tools.yaml', (x) => subtopicToolsSchema.parse(x));

/** Every subtopic of the course with what the connections need: title, unit, level and the AOs of its statements. */
export function subtopicsOf(c: LoadedCorpus): Array<SubtopicInfo & { slug: string }> {
  return (c.curricula['ib-dp-bm']?.units ?? []).flatMap((u) =>
    u.subtopics.map((s) => ({ code: s.code, title: s.title, unit: u.number, unitTitle: u.title, level: s.level, aos: [...new Set(s.content.flatMap((x) => x.ao))], slug: slug(s.title) })),
  );
}

const yamlDir = (dir: string) =>
  readdirSync(join(ROOT, dir))
    .filter((f) => f.endsWith('.yaml'))
    .sort()
    .map((f) => [f.replace(/\.yaml$/, ''), parse(readFileSync(join(ROOT, dir, f), 'utf8')) as Record<string, unknown>] as const);

/** The tool index's inputs, from the same files and catalogues the build reads. */
export function toolSources(c: LoadedCorpus = loadCorpus()): ToolSources {
  const studio = yamlDir('studio')
    .filter(([, d]) => d.type === 'tool')
    .map(([, d]) => {
      const st = (d.status ?? {}) as { kind?: string; level?: string; subtopics?: string[] };
      return { slug: String(d.slug), title: String(d.title), status: { kind: st.kind === 'ib-toolkit' ? ('ib-toolkit' as const) : ('enrichment' as const), level: st.level === 'HL' ? ('HL' as const) : st.level === 'SL/HL' ? ('SL/HL' as const) : undefined, subtopics: st.subtopics ?? [] } };
    });
  const labTools = yamlDir('lab').map(([id, d]) => {
    const ib = (d.ib ?? {}) as { status?: string; links?: Array<{ code: string }> };
    return { id, ib: { status: (ib.status ?? 'enrichment') as 'ib-toolkit' | 'enrichment' | 'mixed', links: ib.links ?? [] } };
  });
  return {
    directory: applyTools(c.modules),
    interactives: c.interactives as unknown as ToolSources['interactives'],
    calculations: c.calculations,
    lab: LAB.map((e) => ({ id: e.id, subtopic: e.subtopic, level: e.level })),
    studio,
    labTools,
    advanced: ADVANCED.map((a) => ({ id: a.id, name: a.name, ibUses: a.ibUses })),
  };
}

export const loadToolPages = (c: LoadedCorpus = loadCorpus()) => toolPages(toolSources(c));
