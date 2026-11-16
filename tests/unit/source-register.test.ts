/**
 * The source register is one list across its files: each document or work is
 * entered once and cited from there, so the sources page never lists the same
 * report or book twice under different ids. Two entries are the same when they
 * share an address, or a title and a year.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

interface Entry {
  id: string;
  title?: string;
  year?: string | number;
  url?: string;
  availability?: string;
  _file: string;
}

const dir = new URL('../../src/content/sources/', import.meta.url);
const entries: Entry[] = readdirSync(dir)
  .filter((f) => f.endsWith('.yaml'))
  .flatMap((f) => ((parse(readFileSync(new URL(f, dir), 'utf8')) as Entry[] | null) ?? []).map((e) => ({ ...e, _file: f })));

const groups = (key: (e: Entry) => string | undefined) => {
  const m = new Map<string, string[]>();
  for (const e of entries) {
    const k = key(e);
    if (k) m.set(k, [...(m.get(k) ?? []), `${e.id} (${e._file})`]);
  }
  return [...m.entries()].filter(([, ids]) => ids.length > 1);
};
const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

describe('the source register', () => {
  it('has unique ids across its files', () => {
    expect(groups((e) => e.id)).toEqual([]);
  });

  it('enters each document once, by its address', () => {
    expect(groups((e) => (e.url ? e.url.trim().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').toLowerCase() : undefined))).toEqual([]);
  });

  it('enters each work once, by its title and year', () => {
    expect(groups((e) => (e.title ? `${norm(e.title)} ${e.year ?? ''}` : undefined))).toEqual([]);
  });

  it('says how far each web source was read', () => {
    for (const e of entries.filter((x) => x.availability === 'web')) expect(e.url, e.id).toBeTruthy();
  });
});
