/**
 * Integrity checks for the Strategy Studio (src/content/studio). A tool's
 * label in the IB course must agree with the guide's toolkit as the platform
 * records it (src/content/tools): a tool called a toolkit tool must be one, at
 * the same level, and a tool not in the toolkit must be labelled enrichment.
 * Every subtopic, Decision Room and toolkit guide named must exist, and every
 * worked example must be valid data for its tool. Run by the studio pages
 * (src/lib/strategy/content.ts) and by tests/unit/strategy-content.test.ts.
 */
import type { Corpus, Problem } from './integrity';
import type { StudioEntry } from './schemas-strategy';
import { lib } from './strategy/registry';

type Needed = Pick<Corpus, 'tools' | 'curricula' | 'decisions'>;

export function checkStudio(entries: Array<[string, StudioEntry]>, c: Needed): Problem[] {
  const out: Problem[] = [];
  const codes = new Set(Object.values(c.curricula).flatMap((cu) => cu.units.flatMap((u) => u.subtopics.map((s) => s.code))));
  const engagements = entries.filter(([, e]) => e.type === 'engagement');
  if (engagements.length !== 1) out.push({ where: 'studio', message: `expected one engagement entry, found ${engagements.length}` });
  const seen = { slug: new Map<string, string>(), order: new Map<number, string>(), kind: new Map<string, string>() };

  for (const [id, e] of entries) {
    const where = `studio/${id}`;
    const add = (message: string) => out.push({ where, message });
    if (e.type === 'engagement') {
      e.reading.forEach((r) => codes.has(r.code) || add(`reading names subtopic ${r.code}, which is not in the curriculum`));
      e.decisionRooms.forEach((d) => c.decisions[d.id] || add(`Decision Room "${d.id}" does not exist`));
      continue;
    }
    for (const [key, value] of [
      ['slug', e.slug],
      ['order', e.order],
      ['kind', e.kind],
    ] as const) {
      const map = seen[key] as Map<string | number, string>;
      const other = map.get(value);
      if (other) add(`${key} "${value}" is also used by studio/${other}`);
      map.set(value, id);
    }
    if (id !== e.slug) add(`the file name should match the slug "${e.slug}"`);

    const st = e.status;
    st.subtopics.forEach((code) => codes.has(code) || add(`subtopic ${code} is not in the curriculum`));
    if (st.kind === 'ib-toolkit') {
      const t = st.toolkit ? c.tools[st.toolkit] : undefined;
      if (!st.toolkit || !t) add(`a toolkit tool must name its entry in src/content/tools (got "${st.toolkit ?? ''}")`);
      else {
        if (t.ibStatus !== 'ib-toolkit') add(`"${st.toolkit}" is not recorded as an IB toolkit tool`);
        if (st.level !== t.level) add(`level ${st.level ?? '(none)'} does not match the toolkit's ${t.level} for "${st.toolkit}"`);
      }
    } else {
      if (st.level) add('an enrichment tool has no IB level; remove "level"');
      if (st.toolkit && c.tools[st.toolkit]?.ibStatus === 'ib-toolkit') add(`"${st.toolkit}" is an IB toolkit tool, so this tool cannot be labelled enrichment`);
      if (!/not (in|part of|named in) the (guide|IB course)/i.test(st.text)) add('an enrichment tool must say plainly that it is not in the guide');
    }
    for (const r of e.read) {
      const m = /^\/toolkit\/([a-z0-9-]+)\//.exec(r.href);
      if (m && m[1]) {
        const t = c.tools[m[1]];
        if (!t) add(`toolkit guide "${m[1]}" does not exist`);
        else if (t.status !== 'complete') add(`toolkit guide "${m[1]}" is planned, so it has no page to link`);
      }
    }
    try {
      lib(e.kind)
        .verify(e.example.data)
        .forEach((p) => add(`worked example: ${p}`));
    } catch (err) {
      add(String(err instanceof Error ? err.message : err));
    }
  }
  return out;
}
