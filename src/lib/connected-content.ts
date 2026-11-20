/**
 * Data access for the course connections and connected learning: gathers
 * every collection they read once per build, builds the tool index, checks
 * the worked connections and the curated tool links (src/lib/connections.ts)
 * and throws on any problem, so no page can be built with a connection to a
 * subtopic that does not exist or a tool link to a page that is not there.
 * Server-side only.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getCollection } from 'astro:content';
import { corpus, slug } from './content';
import type { Corpus } from './integrity';
import { library } from './frameworks-content';
import { studio } from './strategy/content';
import { lab } from './lab/content';
import { advancedLibrary } from './advanced-content';
import { DOMAINS, advancedHref } from './advanced';
import { briefingData } from './briefing-content';
import { series } from './boardroom-briefings/content';
import { buildBank } from './bank-build';
import { LAB } from './finance-lab/catalogue';
import { ADVANCED } from './adv-finance/catalogue';
import { checkConnections, notePairs, type NoteLink, type NotePair, type SubtopicInfo } from './connections';
import type { SubtopicTools, TopicConnection } from './connections-schema';
import { toolPages, type ConnectedInputs, type ToolPage } from './connected';

export interface Connected {
  subtopics: Array<SubtopicInfo & { slug: string; href: string }>;
  connections: Record<string, TopicConnection>;
  notes: Map<string, NotePair>;
  extraTools: Record<string, SubtopicTools>;
  tools: Map<string, ToolPage>;
  inputs: ConnectedInputs;
}

/**
 * Which revision pages this build has. The revision sheet of every subtopic
 * (/revision/<slug>/) and the flashcards (/revision/flashcards/?topic=<code>)
 * are built in their own part of the platform. Until a route for them exists
 * beside the topic briefs' revision pages ([id].astro), only the briefs'
 * sheets are linked, so a subtopic page never links to a page that is not
 * there. Once the revision pages add a route of their own, every subtopic
 * links to both.
 */
function revisionPages(c: Corpus): ConnectedInputs['revision'] {
  let files: string[];
  try {
    files = readdirSync(join(process.cwd(), 'src/pages/revision'), { recursive: true }).map(String);
  } catch {
    files = [];
  }
  const built = files.some((f) => f.endsWith('.astro') && f !== 'index.astro' && f !== '[id].astro');
  return {
    sheet: (_code, s) => built || Boolean(c.topics[s]),
    flashcards: () => built,
  };
}

let loaded: Promise<Connected> | null = null;

export function connected(): Promise<Connected> {
  loaded ??= (async () => {
    const [c, lib, st, lb, adv, intel, bb, boardroom, executive, conList, toolList] = await Promise.all([
      corpus(),
      library(),
      studio(),
      lab(),
      advancedLibrary(),
      briefingData(),
      series(),
      getCollection('boardroom'),
      getCollection('executive'),
      getCollection('topicConnections'),
      getCollection('subtopicTools'),
    ]);
    const connections = Object.fromEntries(conList.map((e) => [e.id, e.data]));
    const extraTools = Object.fromEntries(toolList.map((e) => [e.id, e.data]));
    const units = c.curricula['ib-dp-bm']?.units ?? [];
    const subtopics = units.flatMap((u) =>
      u.subtopics.map((s) => ({
        code: s.code,
        title: s.title,
        unit: u.number,
        unitTitle: u.title,
        level: s.level,
        aos: [...new Set(s.content.flatMap((x) => x.ao))],
        slug: slug(s.title),
        href: `/topics/${slug(s.title)}/`,
      })),
    );

    const tools = toolPages({
      directory: lib.tools,
      interactives: c.interactives,
      calculations: c.calculations,
      lab: LAB.map((e) => ({ id: e.id, subtopic: e.subtopic, level: e.level })),
      studio: st.tools.map((t) => ({ slug: t.slug, title: t.title, status: t.status })),
      labTools: lb.toolList.map(([id, t]) => ({ id, ib: t.ib })),
      advanced: ADVANCED.map((a) => ({ id: a.id, name: a.name, ibUses: a.ibUses })),
    });

    // The links the notes name; for a subtopic taught in a brief, its mindmap's.
    const links: NoteLink[] = [];
    for (const n of Object.values(c.notes)) for (const x of n.connections) links.push({ from: n.code, to: x.code, text: x.text });
    for (const m of Object.values(c.mindmaps)) {
      if (m.scope !== 'subtopic' || Object.values(c.notes).some((n) => n.code === m.code)) continue;
      for (const x of m.connections) links.push({ from: m.code, to: x.code, text: x.label });
    }
    const notes = notePairs(links, new Set(subtopics.map((s) => s.code)));

    const problems = checkConnections(
      connections,
      subtopics,
      Object.fromEntries(Object.entries(c.commandTerms).map(([id, t]) => [id, { term: t.term, ao: t.ao }])),
      { pages: tools, extra: extraTools },
    );
    if (problems.length) throw new Error(`Course connections: ${problems.length} integrity problem(s):\n${problems.map((p) => `  ${p.where}: ${p.message}`).join('\n')}`);

    const topicCode = (id: string) => c.topics[id]?.code;
    const execCodes = executive.flatMap((e) => Object.values(e.data.stages).flatMap((s) => s.ib));
    const inputs: ConnectedInputs = {
      subtopics: subtopics.map((s) => ({ code: s.code, title: s.title, slug: s.slug })),
      tools,
      extraTools,
      frameworks: Object.entries(lib.frameworks).map(([id, f]) => ({ id, name: f.name, status: f.status, subtopics: f.subtopics, level: f.level })),
      bank: buildBank(c).items.map((i) => ({ codes: i.codes })),
      cases: Object.entries(c.cases).map(([id, cs]) => ({ id, title: cs.title, syllabus: cs.syllabus ?? [], fictional: cs.kind === 'fictional' })),
      caseLabs: Object.values(c.interactives)
        .filter((it) => it.component === 'case-lab' && it.page)
        .map((it) => ({ href: it.page as string, title: it.title, syllabus: it.syllabus })),
      decisions: Object.entries(c.decisions).map(([id, d]) => ({ id, title: d.title, codes: d.topics.map(topicCode).filter((x): x is string => Boolean(x)) })),
      simulations: [
        ...boardroom.sort((a, b) => a.data.order - b.data.order).map((e) => ({ href: `/boardroom/${e.id}/`, title: e.data.title, codes: e.data.syllabus })),
        ...executive.map((e) => ({ href: '/boardroom/executive/', title: e.data.title, codes: [...new Set(execCodes)] })),
      ],
      briefings: bb.list.map(([id, b]) => ({ id, number: b.number, title: b.title, codes: b.course.subtopics.map((x) => x.code), fictional: b.company.fictional })),
      intelligence: intel.items.map(([id, it]) => ({ id, title: it.title, date: it.date, codes: it.concepts.subtopics.map((x) => x.code) })),
      advanced: adv.modules.map((m) => ({ href: advancedHref(m.data.domain, m.id), title: m.data.title, domain: DOMAINS.find((d) => d.id === m.data.domain)?.name ?? m.data.domain, codes: m.data.bridge.codes })),
      mindmaps: Object.fromEntries(Object.entries(c.mindmaps).filter(([, m]) => m.scope === 'subtopic').map(([id, m]) => [m.code, id])),
      connections,
      revision: revisionPages(c),
    };
    return { subtopics, connections, notes, extraTools, tools, inputs };
  })();
  return loaded;
}
