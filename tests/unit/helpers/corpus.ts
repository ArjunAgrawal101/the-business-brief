/**
 * Loads the whole content corpus straight from the YAML files, validating each
 * entry with the same Zod schemas the Astro build uses. Tests use this so that
 * they check exactly what the site would publish, without running Astro.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { z } from 'astro/zod';
import type { Corpus } from '../../../src/lib/integrity';
import {
  assessmentSchema,
  calculationSchema,
  caseSchema,
  claimSchema,
  commandTermSchema,
  conceptSchema,
  curriculumSchema,
  decisionSchema,
  glossarySchema,
  interactiveSchema,
  moduleSchema,
  pathwaySchema,
  questionSchema,
  sourceSchema,
  toolSchema,
  topicSchema,
} from '../../../src/lib/schemas';

const ROOT = new URL('../../../src/content/', import.meta.url).pathname;

const yamlFiles = (dir: string) =>
  readdirSync(join(ROOT, dir))
    .filter((f) => f.endsWith('.yaml'))
    .sort();

function strict<S extends z.ZodType>(schema: S, data: unknown, where: string): z.infer<S> {
  const r = schema.safeParse(data);
  if (!r.success) throw new Error(`${where}: ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  return r.data;
}

/** One entry per file; the id is the file name. */
function perFile<S extends z.ZodType>(dir: string, schema: S) {
  return Object.fromEntries(
    yamlFiles(dir).map((f) => {
      const id = f.replace(/\.yaml$/, '');
      return [id, strict(schema, parse(readFileSync(join(ROOT, dir, f), 'utf8')), `${dir}/${f}`)];
    }),
  );
}

/** Several entries per file, each with an id. */
function lists<S extends z.ZodType>(dir: string, schema: S) {
  const out: Record<string, z.infer<S>> = {};
  for (const f of yamlFiles(dir)) {
    for (const item of parse(readFileSync(join(ROOT, dir, f), 'utf8')) as Array<Record<string, unknown>>) {
      const id = String(item.id);
      if (id in out) throw new Error(`Duplicate id ${id} in ${dir}/${f}`);
      out[id] = strict(schema, item, `${dir}/${f}#${id}`);
    }
  }
  return out;
}

/** A single file holding a list of entries with ids. */
function fileList<S extends z.ZodType>(path: string, schema: S) {
  const out: Record<string, z.infer<S>> = {};
  for (const item of parse(readFileSync(join(ROOT, path), 'utf8')) as Array<Record<string, unknown>>) {
    const id = String(item.id);
    if (id in out) throw new Error(`Duplicate id ${id} in ${path}`);
    out[id] = strict(schema, item, `${path}#${id}`);
  }
  return out;
}

export function loadCorpus() {
  return {
    topics: perFile('topics', topicSchema),
    cases: perFile('cases', caseSchema),
    decisions: perFile('decisions', decisionSchema),
    tools: perFile('tools', toolSchema),
    interactives: perFile('interactives', interactiveSchema),
    curricula: perFile('curricula', curriculumSchema),
    questions: lists('questions', questionSchema),
    glossary: lists('glossary', glossarySchema),
    calculations: fileList('data/calculations.yaml', calculationSchema),
    assessment: fileList('data/assessment.yaml', assessmentSchema),
    commandTerms: fileList('data/command-terms.yaml', commandTermSchema),
    concepts: fileList('data/concepts.yaml', conceptSchema),
    pathways: fileList('data/pathways.yaml', pathwaySchema),
    modules: fileList('data/modules.yaml', moduleSchema),
    sources: fileList('data/sources.yaml', sourceSchema),
    claims: fileList('data/claims.yaml', claimSchema),
  };
}

export type LoadedCorpus = ReturnType<typeof loadCorpus>;
export const asCorpus = (c: LoadedCorpus) => c as unknown as Corpus;
