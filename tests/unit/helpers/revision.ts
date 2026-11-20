/**
 * Loads what quick revision is built from (the corpus, the frameworks library
 * and the revision files) straight from the YAML, validated with the schemas
 * the build uses, so the tests check exactly what the site publishes.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { frameworkSchema, type Framework } from '../../../src/lib/framework-schema';
import { revisionSchema, type RevisionEntry } from '../../../src/lib/revision/schema';
import type { RevisionInput } from '../../../src/lib/revision/build';
import { asCorpus, loadCorpus } from './corpus';

const CONTENT = new URL('../../../src/content/', import.meta.url).pathname;

const yamlIn = (dir: string) =>
  existsSync(join(CONTENT, dir))
    ? readdirSync(join(CONTENT, dir))
        .filter((f) => f.endsWith('.yaml'))
        .sort()
    : [];

function perFile<T>(dir: string, parseOne: (data: unknown, where: string) => T): Record<string, T> {
  return Object.fromEntries(yamlIn(dir).map((f) => [f.replace(/\.yaml$/, ''), parseOne(parse(readFileSync(join(CONTENT, dir, f), 'utf8')), `${dir}/${f}`)]));
}

export function loadFrameworks(): Record<string, Framework> {
  return perFile('frameworks', (data, where) => {
    const r = frameworkSchema.safeParse(data);
    if (!r.success) throw new Error(`${where}: ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    return r.data;
  });
}

export function loadRevision(): Record<string, RevisionEntry> {
  return perFile('revision', (data, where) => {
    const r = revisionSchema.safeParse(data);
    if (!r.success) throw new Error(`${where}: ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    return r.data;
  });
}

/** Everything buildRevision needs, as the build passes it. */
export function revisionInput(): RevisionInput {
  return { c: asCorpus(loadCorpus()), frameworks: loadFrameworks(), revision: loadRevision() };
}
