/**
 * Loads one room tool's YAML file and validates it with the interaction
 * schema, without loading the whole corpus, so a test of one tool stays fast.
 */
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { interactiveSchema, type Interactive } from '../../../src/lib/schemas';

export function loadTool<C extends Interactive['component']>(id: string, component: C): Extract<Interactive, { component: C }> {
  const raw = parse(readFileSync(new URL(`../../../src/content/interactives/${id}.yaml`, import.meta.url), 'utf8')) as unknown;
  const r = interactiveSchema.safeParse(raw);
  if (!r.success) throw new Error(`${id}: ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  if (r.data.component !== component) throw new Error(`${id} is not a ${component}`);
  return r.data as Extract<Interactive, { component: C }>;
}
