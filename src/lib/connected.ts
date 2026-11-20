/**
 * Connected learning: everything on the platform that serves one subtopic,
 * found from each item's own course links, never typed by hand. Two halves:
 *
 * - `toolPages()`, the index of the platform's tool and desk pages with the
 *   subtopics each one's own data names. Subtopic pages list their tools from
 *   it, and every tool page links back to its subtopic from it.
 * - `connectedLearning()`, the groups a subtopic page shows: revision,
 *   practice, cases, decisions and simulations, frameworks, the Boardroom
 *   Briefings, Business Intelligence (real-world) and Advanced Management
 *   (enrichment), each item labelled by its standing.
 *
 * Pure functions with no `astro:content` import, so the unit tests use them.
 * src/lib/connected-content.ts gathers the inputs at build time.
 */
import type { SubtopicTools, TopicConnection } from './connections-schema';
import { codeOrder, connectionsHref, connectionsOf } from './connections';
import { bankTopicHref } from './bank-address';

/* ---------- The tool index ---------- */

export type Standing = 'ib' | 'toolkit' | 'enrichment' | 'mixed';

/** A tool or desk page and the subtopics it serves. */
export interface ToolPage {
  href: string;
  title: string;
  room: string;
  roomHref: string;
  /** The subtopics the tool's own data says it serves, the first being the one it serves most. */
  codes: string[];
  /** Subtopics the tool's guide names as related reading, which it does not claim to serve. */
  related: string[];
  standing: Standing;
  level: 'SL/HL' | 'HL';
}

/** The inputs of the tool index: only the fields it reads, so the tests can pass the YAML as it is. */
export interface ToolSources {
  /** The platform's tool pages by address, with their titles and rooms (src/lib/framework-lab.ts, applyTools()). */
  directory: Map<string, { href: string; title: string; room: string; roomHref: string }>;
  interactives: Record<string, { page?: string; syllabus: string[]; level?: string; guide?: unknown }>;
  calculations: Record<string, { page: string; syllabus: Array<{ code: string }>; level?: string }>;
  /** The Financial Laboratory's calculators. */
  lab: Array<{ id: string; subtopic: string; level: 'SL/HL' | 'HL' }>;
  /** The Strategy Studio's tools. */
  studio: Array<{ slug: string; title: string; status: { kind: 'ib-toolkit' | 'enrichment'; level?: 'SL/HL' | 'HL'; subtopics: string[] } }>;
  /** The Entrepreneurship and Innovation Lab's tools. */
  labTools: Array<{ id: string; ib: { status: 'ib-toolkit' | 'enrichment' | 'mixed'; links: Array<{ code: string }> } }>;
  /** Advanced financial analysis, beyond the course. */
  advanced: Array<{ id: string; name: string; ibUses: Array<{ code: string }> }>;
}

const uniq = (xs: string[]) => [...new Set(xs)];

/** An address without its fragment, with a trailing slash. */
export function pagePath(href: string): string {
  const path = href.split('#')[0]?.split('?')[0] ?? '';
  return path.endsWith('/') ? path : `${path}/`;
}

/** Read a guide's status and related subtopics without depending on each room's guide schema. */
function guideOf(guide: unknown): { status?: string; related: string[] } {
  if (!guide || typeof guide !== 'object') return { related: [] };
  const g = guide as { status?: unknown; related?: { subtopics?: unknown } };
  const related = Array.isArray(g.related?.subtopics) ? g.related.subtopics.filter((x): x is string => typeof x === 'string') : [];
  return { status: typeof g.status === 'string' ? g.status : undefined, related };
}

/**
 * Every tool and desk page with the subtopics its own data names. A page's
 * codes come, in this order, from the interactions placed on it and the
 * calculations worked on it (the Finance Desk, the Market Studio, People and
 * Culture, the Operations Floor, the Case Room), the Financial Laboratory's
 * catalogue, the Strategy Studio's and the Entrepreneurship Lab's own status,
 * and advanced financial analysis's uses of the course. Where several items
 * on one page name different subtopics, the one named most comes first.
 */
export function toolPages(src: ToolSources): Map<string, ToolPage> {
  const out = new Map<string, ToolPage>();
  const tally = new Map<string, Map<string, number>>();
  const levels = new Map<string, Array<string | undefined>>();
  const count = (href: string, codes: string[], level?: string) => {
    const t = tally.get(href) ?? new Map<string, number>();
    codes.forEach((c, i) => t.set(c, (t.get(c) ?? 0) + 10 - Math.min(i, 9) * 0.01));
    tally.set(href, t);
    levels.set(href, [...(levels.get(href) ?? []), level]);
  };
  const base = (href: string): ToolPage | undefined => {
    const d = src.directory.get(href);
    return d ? { href, title: d.title, room: d.room, roomHref: d.roomHref, codes: [], related: [], standing: 'ib', level: 'SL/HL' } : undefined;
  };

  for (const it of Object.values(src.interactives)) {
    if (!it.page) continue;
    const href = pagePath(it.page);
    if (!src.directory.has(href)) continue;
    count(href, it.syllabus, it.level);
    const g = guideOf(it.guide);
    const page = out.get(href) ?? base(href);
    if (!page) continue;
    page.related = uniq([...page.related, ...g.related]);
    if (g.status === 'enrichment') page.standing = 'enrichment';
    if (g.status === 'HL') page.level = 'HL';
    out.set(href, page);
  }
  for (const k of Object.values(src.calculations)) {
    const href = pagePath(k.page);
    if (!src.directory.has(href)) continue;
    count(href, k.syllabus.map((x) => x.code), k.level);
    if (!out.has(href)) out.set(href, base(href)!);
  }
  for (const [href, t] of tally) {
    const page = out.get(href);
    if (!page) continue;
    page.codes = [...t.entries()].sort((a, b) => b[1] - a[1] || codeOrder(a[0]) - codeOrder(b[0])).map(([c]) => c);
    const lv = levels.get(href) ?? [];
    if (lv.length && lv.every((l) => l === 'HL')) page.level = 'HL';
  }
  for (const e of src.lab) {
    const href = `/finance-desk/lab/${e.id}/`;
    const page = base(href);
    if (page) out.set(href, { ...page, codes: [e.subtopic], level: e.level });
  }
  for (const t of src.studio) {
    const href = `/strategy-studio/${t.slug}/`;
    const page = base(href);
    if (page) out.set(href, { ...page, codes: [...t.status.subtopics], standing: t.status.kind === 'ib-toolkit' ? 'toolkit' : 'enrichment', level: t.status.level ?? 'SL/HL' });
  }
  for (const t of src.labTools) {
    const href = `/entrepreneurship-lab/${t.id}/`;
    const page = base(href);
    const standing: Standing = t.ib.status === 'ib-toolkit' ? 'toolkit' : t.ib.status;
    if (page) out.set(href, { ...page, codes: uniq(t.ib.links.map((x) => x.code)), standing });
  }
  for (const a of src.advanced) {
    const href = `/finance-desk/advanced/${a.id}/`;
    out.set(href, { href, title: a.name, room: 'Advanced financial analysis', roomHref: '/finance-desk/advanced/', codes: uniq(a.ibUses.map((x) => x.code)), related: [], standing: 'enrichment', level: 'SL/HL' });
  }
  for (const [href, d] of src.directory) if (!out.has(href)) out.set(href, { ...d, href, codes: [], related: [], standing: 'ib', level: 'SL/HL' });
  return out;
}

/** The subtopics a page serves, for its link back to them: empty when the page is not a tool page or names none. */
export function topicsForPage(path: string, pages: Map<string, ToolPage>): string[] {
  return pages.get(pagePath(path))?.codes ?? [];
}

/** A tool for a subtopic, and why it is listed. */
export interface ToolForTopic extends ToolPage {
  /** serves: the tool names the subtopic; related: its guide names it as related; curated: src/content/data/subtopic-tools.yaml says what to use it for. */
  via: 'serves' | 'related' | 'curated';
  use?: string;
}

/** The order the rooms are listed in on a subtopic page. */
export const ROOM_ORDER = [
  'Finance Desk',
  'Financial Laboratory',
  'Strategy Studio',
  'Market Studio',
  'People and Culture',
  'Operations Floor',
  'Entrepreneurship and Innovation Lab',
  'Case Room',
  'Advanced financial analysis',
];

const roomRank = (room: string) => {
  const i = ROOM_ORDER.indexOf(room);
  return i < 0 ? ROOM_ORDER.length : i;
};

/**
 * The tools for a subtopic: those that serve it, those whose guide names it
 * as related, and those the curated list adds with what to use them for.
 * Each tool once, by room in a fixed order, then by how directly it serves the
 * subtopic, then by title.
 */
export function toolsFor(code: string, pages: Map<string, ToolPage>, extra: Record<string, SubtopicTools> = {}): ToolForTopic[] {
  const out = new Map<string, ToolForTopic>();
  for (const p of pages.values()) {
    if (p.codes.includes(code)) out.set(p.href, { ...p, via: 'serves' });
    else if (p.related.includes(code)) out.set(p.href, { ...p, via: 'related' });
  }
  for (const t of extra[code]?.tools ?? []) {
    const p = pages.get(t.href);
    if (p && !out.has(p.href)) out.set(p.href, { ...p, via: 'curated', use: t.use });
  }
  const viaRank = { serves: 0, related: 1, curated: 2 } as const;
  return [...out.values()].sort((a, b) => roomRank(a.room) - roomRank(b.room) || viaRank[a.via] - viaRank[b.via] || a.title.localeCompare(b.title, 'en'));
}

/** The tools for a subtopic grouped by room, in the rooms' order. */
export function toolsByRoom(tools: ToolForTopic[]): Array<{ room: string; roomHref: string; tools: ToolForTopic[] }> {
  const groups = new Map<string, { room: string; roomHref: string; tools: ToolForTopic[] }>();
  for (const t of tools) {
    const g = groups.get(t.room) ?? { room: t.room, roomHref: t.roomHref, tools: [] };
    g.tools.push(t);
    groups.set(t.room, g);
  }
  return [...groups.values()];
}

/* ---------- Connected learning ---------- */

/** The revision sheet and the flashcards for a subtopic, at the addresses the revision pages use. */
export const revisionSheetHref = (slug: string): string => `/revision/${slug}/`;
export const flashcardsHref = (code: string): string => `/revision/flashcards/?topic=${encodeURIComponent(code)}`;

export interface Tag {
  text: string;
  /** A class from the site's tag set: tag--enrichment, tag--external, tag--simulated, tag--hl, tag--ib, tag--plain. */
  css: string;
}

export interface Item {
  href: string;
  title: string;
  /** A short line under the title: a room, a date, a count. */
  note?: string;
  tags: Tag[];
}

export type GroupId = 'revise' | 'bank' | 'cases' | 'decisions' | 'frameworks' | 'tools' | 'briefings' | 'intelligence' | 'advanced' | 'connections';

export interface Group {
  id: GroupId;
  label: string;
  items: Item[];
}

export interface ConnectedInputs {
  subtopics: Array<{ code: string; title: string; slug: string }>;
  tools: Map<string, ToolPage>;
  extraTools: Record<string, SubtopicTools>;
  frameworks: Array<{ id: string; name: string; status: 'syllabus' | 'toolkit' | 'enrichment'; subtopics: string[]; level?: string }>;
  /** The subtopic codes of every question in the bank. */
  bank: Array<{ codes: string[] }>;
  cases: Array<{ id: string; title: string; syllabus: string[]; fictional: boolean }>;
  caseLabs: Array<{ href: string; title: string; syllabus: string[] }>;
  decisions: Array<{ id: string; title: string; codes: string[] }>;
  simulations: Array<{ href: string; title: string; codes: string[] }>;
  briefings: Array<{ id: string; number: number; title: string; codes: string[]; fictional: boolean }>;
  intelligence: Array<{ id: string; title: string; date: string; codes: string[] }>;
  advanced: Array<{ href: string; title: string; domain: string; codes: string[] }>;
  /** A subtopic's mindmap id, by code. */
  mindmaps: Record<string, string>;
  connections: Record<string, TopicConnection>;
  /** Whether the revision sheet and the flashcards exist for a subtopic in this build. */
  revision: { sheet: (code: string, slug: string) => boolean; flashcards: (code: string) => boolean };
}

const FICTIONAL: Tag = { text: 'Fictional', css: 'tag--simulated' };
const ENRICHMENT: Tag = { text: 'Enrichment', css: 'tag--enrichment' };
const REAL: Tag = { text: 'Real-world', css: 'tag--external' };
const HL: Tag = { text: 'HL', css: 'tag--hl' };

/** A date as 14 October 2026; a month alone (2026-10) as October 2026. */
export function readableDate(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  if (!y || !m) return d;
  const date = new Date(Date.UTC(y, m - 1, day || 1));
  return date.toLocaleDateString('en-GB', { ...(day ? { day: 'numeric' } : {}), month: 'long', year: 'numeric', timeZone: 'UTC' });
}

const STANDING_TAG: Record<Standing, Tag | undefined> = {
  ib: undefined,
  toolkit: { text: 'IB toolkit', css: 'tag--ib' },
  enrichment: ENRICHMENT,
  mixed: { text: 'IB and enrichment', css: 'tag--plain' },
};

/** The labels a tool carries in a list: its standing beside the course, and HL where only HL needs it. */
export function toolTags(t: Pick<ToolPage, 'standing' | 'level'>): Tag[] {
  return [STANDING_TAG[t.standing], t.level === 'HL' ? HL : undefined].filter((x): x is Tag => Boolean(x));
}

const FRAMEWORK_TAG: Record<ConnectedInputs['frameworks'][number]['status'], Tag> = {
  syllabus: { text: 'IB syllabus', css: 'tag--ib' },
  toolkit: { text: 'IB toolkit', css: 'tag--ib' },
  enrichment: ENRICHMENT,
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The groups of links a subtopic page shows, each only when it has
 * something in it. Tools appear here only when `withTools` is set (the topic
 * briefs, which have no tools section of their own); otherwise the group
 * points to the page's own tools section with their number.
 */
export function connectedLearning(code: string, inp: ConnectedInputs, opts: { withTools?: boolean; toolsAnchor?: string } = {}): Group[] {
  const sub = inp.subtopics.find((s) => s.code === code);
  if (!sub) return [];
  const groups: Group[] = [];
  const push = (id: GroupId, label: string, items: Item[]) => {
    if (items.length) groups.push({ id, label, items });
  };

  const revise: Item[] = [];
  const map = inp.mindmaps[code];
  if (map) revise.push({ href: `/mindmaps/${map}/`, title: `The ${code} mindmap`, note: 'Full and revision views, to print or download', tags: [] });
  if (inp.revision.sheet(code, sub.slug)) revise.push({ href: revisionSheetHref(sub.slug), title: 'Revision sheet', note: 'The subtopic on one printable page', tags: [] });
  if (inp.revision.flashcards(code)) revise.push({ href: flashcardsHref(code), title: 'Flashcards', note: `The ${code} cards, to rate as you go`, tags: [] });
  push('revise', 'Revise', revise);

  const n = inp.bank.filter((q) => q.codes.includes(code)).length;
  if (n) push('bank', 'Practise', [{ href: bankTopicHref(code), title: `${plural(n, 'question', 'questions')} on ${code} in the question bank`, note: 'From the practice sets, the notes and the case files, filtered to this subtopic', tags: [] }]);

  push('cases', 'Cases', [
    ...inp.cases.filter((x) => x.syllabus.includes(code)).map((x) => ({ href: `/cases/${x.id}/`, title: x.title, note: 'Case Vault', tags: x.fictional ? [FICTIONAL] : [REAL] })),
    ...inp.caseLabs.filter((x) => x.syllabus.includes(code)).map((x) => ({ href: x.href, title: x.title, note: 'Case Room: a case lab', tags: [FICTIONAL] })),
  ]);

  push('decisions', 'Decisions and simulations', [
    ...inp.decisions.filter((x) => x.codes.includes(code)).map((x) => ({ href: `/decision-room/${x.id}/`, title: x.title, note: 'Decision Room', tags: [FICTIONAL] })),
    ...inp.simulations.filter((x) => x.codes.includes(code)).map((x) => ({ href: x.href, title: x.title, note: 'Boardroom simulation', tags: [FICTIONAL] })),
  ]);

  push(
    'frameworks',
    'Frameworks',
    inp.frameworks
      .filter((f) => f.subtopics.includes(code))
      .sort((a, b) => ['syllabus', 'toolkit', 'enrichment'].indexOf(a.status) - ['syllabus', 'toolkit', 'enrichment'].indexOf(b.status) || a.name.localeCompare(b.name, 'en'))
      .map((f) => ({ href: `/frameworks/${f.id}/`, title: f.name, tags: [FRAMEWORK_TAG[f.status], ...(f.level === 'HL' && f.status !== 'enrichment' ? [HL] : [])] })),
  );

  const tools = toolsFor(code, inp.tools, inp.extraTools);
  if (opts.withTools) push('tools', 'Tools', tools.map((t) => ({ href: t.href, title: t.title, note: t.use ?? t.room, tags: toolTags(t) })));
  else if (tools.length && opts.toolsAnchor) push('tools', 'Tools', [{ href: `#${opts.toolsAnchor}`, title: `${plural(tools.length, 'tool', 'tools')} for ${code}`, note: `In Tools and practice on this page: ${uniq(tools.map((t) => t.room)).join(', ')}`, tags: [] }]);

  push(
    'briefings',
    'Boardroom Briefings',
    inp.briefings.filter((x) => x.codes.includes(code)).sort((a, b) => a.number - b.number).map((x) => ({ href: `/boardroom-briefings/${x.id}/`, title: x.title, note: `Briefing ${x.number}`, tags: x.fictional ? [FICTIONAL] : [REAL] })),
  );

  push(
    'intelligence',
    'Business Intelligence',
    inp.intelligence
      .filter((x) => x.codes.includes(code))
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((x) => ({ href: `/intelligence/${x.id}/`, title: x.title, note: `A real development, ${readableDate(x.date)}, with its sources`, tags: [REAL] })),
  );

  push('advanced', 'Advanced Management', inp.advanced.filter((x) => x.codes.includes(code)).map((x) => ({ href: x.href, title: x.title, note: `${x.domain}: beyond the IB course`, tags: [ENRICHMENT] })));

  const links = connectionsOf(code, inp.connections);
  if (links.length) push('connections', 'Course connections', [{ href: connectionsHref(code), title: `${plural(links.length, 'worked connection', 'worked connections')} on the connections map`, note: `With ${links.map((l) => l.other).join(', ')}`, tags: [] }]);

  return groups;
}

/** How many items each group holds, for the topic library and the coverage tracker. */
export interface Counts {
  tools: number;
  cases: number;
  briefings: number;
  questions: number;
}

/** The true counts for a subtopic: every tool that serves it or its guide relates to it (curated uses included), every case and case lab, every Boardroom Briefing and every question in the bank. */
export function countsFor(code: string, inp: Pick<ConnectedInputs, 'tools' | 'extraTools' | 'cases' | 'caseLabs' | 'briefings' | 'bank'>): Counts {
  return {
    tools: toolsFor(code, inp.tools, inp.extraTools).length,
    cases: inp.cases.filter((x) => x.syllabus.includes(code)).length + inp.caseLabs.filter((x) => x.syllabus.includes(code)).length,
    briefings: inp.briefings.filter((x) => x.codes.includes(code)).length,
    questions: inp.bank.filter((q) => q.codes.includes(code)).length,
  };
}
