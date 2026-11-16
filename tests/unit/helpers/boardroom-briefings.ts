/**
 * Loads the Boardroom Briefings and everything their integrity check resolves
 * against (the corpus, the frameworks library, the Strategy Studio's tools and
 * the Entrepreneurship Lab's pages) straight from the YAML, validated with the
 * schemas the build uses, so the tests check exactly what the site publishes.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { frameworkSchema, type Framework } from '../../../src/lib/framework-schema';
import { boardroomBriefingSchema, type BoardroomBriefing } from '../../../src/lib/boardroom-briefings/schema';
import type { BriefingContext } from '../../../src/lib/boardroom-briefings/integrity';
import { asCorpus, loadCorpus } from './corpus';

const CONTENT = new URL('../../../src/content/', import.meta.url).pathname;

const yamlIn = (dir: string) =>
  existsSync(join(CONTENT, dir))
    ? readdirSync(join(CONTENT, dir))
        .filter((f) => f.endsWith('.yaml'))
        .sort()
    : [];

/** Every briefing, by file name, validated strictly. */
export function loadBriefings(): Record<string, BoardroomBriefing> {
  return Object.fromEntries(
    yamlIn('boardroom-briefings').map((f) => {
      const r = boardroomBriefingSchema.safeParse(parse(readFileSync(join(CONTENT, 'boardroom-briefings', f), 'utf8')));
      if (!r.success) throw new Error(`boardroom-briefings/${f}: ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
      return [f.replace(/\.yaml$/, ''), r.data];
    }),
  );
}

function loadFrameworks(): Record<string, Framework> {
  return Object.fromEntries(
    yamlIn('frameworks').map((f) => {
      const r = frameworkSchema.safeParse(parse(readFileSync(join(CONTENT, 'frameworks', f), 'utf8')));
      if (!r.success) throw new Error(`frameworks/${f}: ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
      return [f.replace(/\.yaml$/, ''), r.data];
    }),
  );
}

const titleOf = (dir: string, f: string) => String((parse(readFileSync(join(CONTENT, dir, f), 'utf8')) as { title?: string }).title ?? f);

/** The context the build passes to the integrity check, read without Astro. */
export function briefingContext(): BriefingContext {
  const c = asCorpus(loadCorpus());
  const studio = yamlIn('studio')
    .map((f) => parse(readFileSync(join(CONTENT, 'studio', f), 'utf8')) as { type?: string; slug?: string; title?: string })
    .filter((d) => d.type === 'tool' && d.slug)
    .map((d) => ({ slug: d.slug as string, title: d.title ?? (d.slug as string) }));
  const lab = Object.fromEntries([...yamlIn('briefings').map((f) => [f.replace(/\.yaml$/, ''), titleOf('briefings', f)]), ...yamlIn('lab').map((f) => [f.replace(/\.yaml$/, ''), titleOf('lab', f)])]);
  return {
    c,
    frameworks: loadFrameworks(),
    registry: {
      toolkit: Object.fromEntries(Object.entries(c.tools).map(([id, t]) => [id, { name: t.name, status: t.status, level: t.level }])),
      studio,
      lab,
    },
  };
}
