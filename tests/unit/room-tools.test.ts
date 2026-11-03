import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { checkRoomTools } from '../../src/lib/integrity-room-tools';
import { ROOM_INFO, roomTools, toolHref } from '../../src/lib/room-tools';
import { interactiveSchema, moduleSchema, type Interactive } from '../../src/lib/schemas';
import { loadCorpus } from './helpers/corpus';

const dir = new URL('../../src/content/interactives/', import.meta.url);
const interactives: Record<string, Interactive> = Object.fromEntries(
  readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => [f.replace(/\.yaml$/, ''), interactiveSchema.parse(parse(readFileSync(new URL(f, dir), 'utf8')))]),
);
const modules = (parse(readFileSync(new URL('../../src/content/data/modules.yaml', import.meta.url), 'utf8')) as Array<Record<string, unknown>>).map((m) => ({ id: String(m.id), ...moduleSchema.parse(m) }));

describe('the room tools', () => {
  it('pass their own integrity checks as published', { timeout: 60_000 }, () => {
    expect(checkRoomTools(loadCorpus())).toEqual([]);
  });

  for (const room of ['people', 'operations'] as const) {
    const mod = modules.find((m) => m.id === ROOM_INFO[room].module);
    const tools = roomTools({ interactives }, room);
    it(`are each listed in ${ROOM_INFO[room].name}'s entry in modules.yaml`, () => {
      expect(mod).toBeDefined();
      for (const [, t] of tools) expect(mod?.items.some((i) => i.href === toolHref(t)), t.title).toBe(true);
    });
    it(`name only subtopics that ${ROOM_INFO[room].name} says it serves`, () => {
      for (const [, t] of tools) if (t.guide.status !== 'enrichment') for (const code of t.syllabus) expect(mod?.syllabus, `${t.title} serves ${code}`).toContain(code);
    });
    it(`are not also listed as planned in ${ROOM_INFO[room].name}`, () => {
      for (const [, t] of tools) expect(mod?.planned.some((p) => p.toLowerCase().includes(t.title.toLowerCase().replace(/ \(.*\)$/, ''))), t.title).toBe(false);
    });
  }
});
