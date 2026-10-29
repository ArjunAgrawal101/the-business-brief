import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import type { Loader } from 'astro/loaders';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parse } from 'yaml';
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
} from './lib/schemas';

/**
 * Loads every `.yaml` file in a folder, each holding a list of entries with an
 * `id`. Used where several small entries belong together in one file (the
 * practice questions for a topic, the glossary terms for a topic). An id that
 * appears twice anywhere in the folder fails the build.
 */
function yamlList(folder: string): Loader {
  const dir = resolve(folder);
  return {
    name: 'yaml-list',
    load: async ({ store, parseData, generateDigest, watcher, logger }) => {
      const run = async () => {
        store.clear();
        const seen = new Map<string, string>();
        const files = readdirSync(dir)
          .filter((f) => f.endsWith('.yaml'))
          .sort();
        for (const name of files) {
          const path = join(dir, name);
          const rel = relative(process.cwd(), path);
          const items = parse(readFileSync(path, 'utf8')) as Array<Record<string, unknown>>;
          if (!Array.isArray(items)) throw new Error(`${rel} must contain a list of entries`);
          for (const item of items) {
            const id = String(item.id ?? '');
            if (!id) throw new Error(`${rel}: an entry has no id`);
            if (seen.has(id)) throw new Error(`Duplicate id "${id}" in ${rel} and ${seen.get(id)}`);
            seen.set(id, rel);
            const data = await parseData({ id, data: item, filePath: rel });
            store.set({ id, data, filePath: rel, digest: generateDigest(data) });
          }
        }
        logger.info(`${seen.size} entries from ${files.length} files in ${relative(process.cwd(), dir)}`);
      };
      await run();
      watcher?.add(dir);
      watcher?.on('change', async (changed) => {
        if (changed.startsWith(dir)) await run();
      });
    },
  };
}

const yamlFiles = (base: string) => glob({ pattern: '*.yaml', base });

export const collections = {
  topics: defineCollection({ loader: yamlFiles('./src/content/topics'), schema: topicSchema }),
  cases: defineCollection({ loader: yamlFiles('./src/content/cases'), schema: caseSchema }),
  decisions: defineCollection({ loader: yamlFiles('./src/content/decisions'), schema: decisionSchema }),
  tools: defineCollection({ loader: yamlFiles('./src/content/tools'), schema: toolSchema }),
  interactives: defineCollection({ loader: yamlFiles('./src/content/interactives'), schema: interactiveSchema }),
  curricula: defineCollection({ loader: yamlFiles('./src/content/curricula'), schema: curriculumSchema }),
  questions: defineCollection({ loader: yamlList('./src/content/questions'), schema: questionSchema }),
  glossary: defineCollection({ loader: yamlList('./src/content/glossary'), schema: glossarySchema }),
  calculations: defineCollection({ loader: file('./src/content/data/calculations.yaml'), schema: calculationSchema }),
  assessment: defineCollection({ loader: file('./src/content/data/assessment.yaml'), schema: assessmentSchema }),
  commandTerms: defineCollection({ loader: file('./src/content/data/command-terms.yaml'), schema: commandTermSchema }),
  concepts: defineCollection({ loader: file('./src/content/data/concepts.yaml'), schema: conceptSchema }),
  pathways: defineCollection({ loader: file('./src/content/data/pathways.yaml'), schema: pathwaySchema }),
  modules: defineCollection({ loader: file('./src/content/data/modules.yaml'), schema: moduleSchema }),
  sources: defineCollection({ loader: file('./src/content/data/sources.yaml'), schema: sourceSchema }),
  claims: defineCollection({ loader: file('./src/content/data/claims.yaml'), schema: claimSchema }),
};
