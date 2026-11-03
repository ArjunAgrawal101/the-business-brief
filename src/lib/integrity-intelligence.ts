/**
 * Integrity checks for the Business Intelligence Briefing.
 *
 * The briefing makes claims about real organizations, so its rules are
 * stricter than anywhere else on the platform. The build fails unless:
 *
 * - every item has at least one source with an https address, a publisher, a
 *   publication date and an access date, and at least one primary source (a
 *   document the organization published itself);
 * - every source is either dated or says why its page carries no date, was
 *   read on or after the day the briefing began, after it was published and
 *   by the item's check date, and supports at least one fact on the page;
 * - every fact, later development and headline figure cites a source the item
 *   lists, and no fact is dated after the item was checked;
 * - the item's own date is the date of one of its facts, and is in 2025 or later;
 * - no quotation runs past 25 words;
 * - every subtopic, glossary term, toolkit tool and command term it names
 *   exists, and every internal link in its text resolves to a page;
 * - exactly one item is the lead story.
 */
import type { Corpus, Problem } from './integrity';
import type { Intelligence } from './schemas';
import { dateKey, onOrBefore, parseDate } from './briefing';
import { subtopicIndex } from './integrity-learning';

/** The day the briefing began. No source may claim to have been read before it. */
export const BRIEFING_BEGAN = '2026-11-03';

/** The longest quotation the briefing allows, in words. Paraphrase is the rule. */
export const MAX_QUOTE_WORDS = 25;

/** The same rule as slug() in content.ts, which cannot be imported outside Astro. */
function routeSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Index pages that always exist (see docs/ARCHITECTURE.md, Routes). */
const STATIC_ROUTES = [
  '/',
  '/topics/',
  '/mindmaps/',
  '/diagrams/',
  '/glossary/',
  '/assessment/',
  '/resources/',
  '/cases/',
  '/decision-room/',
  '/finance-desk/',
  '/finance-desk/costs-and-revenue/',
  '/finance-desk/break-even/',
  '/finance-desk/contribution/',
  '/finance-desk/ratios/',
  '/finance-desk/cash-flow/',
  '/finance-desk/investment-appraisal/',
  '/rooms/',
  '/case-room/',
  '/strategy-studio/',
  '/market-studio/',
  '/people-and-culture/',
  '/operations-floor/',
  '/toolkit/',
  '/exam-desk/practice/',
  '/examiner-lens/',
  '/revision/',
  '/ib/',
  '/ib/map/',
  '/ib/coverage/',
  '/ib/concepts/',
  '/search/',
  '/sources/',
  '/pathways/',
  '/intelligence/',
];

/** Every internal address an item's text may link to. */
export function briefingRoutes(c: Corpus, items: Record<string, Intelligence>): Set<string> {
  const routes = new Set(STATIC_ROUTES);
  for (const s of subtopicIndex(c).values()) routes.add(`/topics/${routeSlug(s.title)}/`);
  for (const id of Object.keys(c.topics)) routes.add(`/topics/${id}/`);
  for (const id of Object.keys(c.glossary)) routes.add(`/glossary/${id}/`);
  for (const [id, t] of Object.entries(c.tools)) if (t.status === 'complete') routes.add(`/toolkit/${id}/`);
  for (const id of Object.keys(c.mindmaps)) routes.add(`/mindmaps/${id}/`);
  for (const id of Object.keys(c.cases)) routes.add(`/cases/${id}/`);
  for (const id of Object.keys(c.decisions)) routes.add(`/decision-room/${id}/`);
  for (const id of Object.keys(items)) routes.add(`/intelligence/${id}/`);
  return routes;
}

/** Quoted passages in a text: straight or curly double quotes. */
export function quotations(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/“([^”]+)”|"([^"]+)"/g)) out.push((m[1] ?? m[2] ?? '').trim());
  return out;
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** Every link target written in the platform's small markdown: [label](target). */
export function linkTargets(text: string): string[] {
  return [...text.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)].map((m) => m[1] ?? '');
}

/** All the text of an item a reader sees, with where it sits, for the quotation and link checks. */
function texts(it: Intelligence): Array<[string, string]> {
  return [
    ['title', it.title],
    ['dek', it.dek],
    ...it.happened.map((f, i): [string, string] => [`what happened ${i + 1}`, f.text]),
    ...it.since.map((f, i): [string, string] => [`since then ${i + 1}`, f.text]),
    ['why it matters', it.matters],
    ...it.concepts.subtopics.map((s): [string, string] => [`concept ${s.code}`, s.note]),
    ...it.concepts.tools.map((t): [string, string] => [`tool ${t.id}`, t.note]),
    ...it.choices.map((ch, i): [string, string] => [`choice ${i + 1}`, `${ch.option} ${ch.analysis}`]),
    ...it.lessons.map((l, i): [string, string] => [`lesson ${i + 1}`, l]),
    ['question', it.question.prompt],
    ...it.limits.map((l, i): [string, string] => [`limit ${i + 1}`, l]),
  ];
}

function validDate(iso: string): boolean {
  try {
    parseDate(iso);
    return true;
  } catch {
    return false;
  }
}

export function checkIntelligence(items: Record<string, Intelligence>, c: Corpus): Problem[] {
  const out: Problem[] = [];
  const has = <T>(d: Record<string, T>, id: string) => Object.prototype.hasOwnProperty.call(d, id);
  const subs = subtopicIndex(c);
  const routes = briefingRoutes(c, items);

  const leads = Object.entries(items)
    .filter(([, it]) => it.lead)
    .map(([id]) => id);
  if (Object.keys(items).length && leads.length !== 1) {
    out.push({ where: 'intelligence', message: `exactly one item must be the lead story; found ${leads.length}${leads.length ? ` (${leads.join(', ')})` : ''}` });
  }

  for (const [id, it] of Object.entries(items)) {
    const w = `intelligence/${id}`;
    const add = (message: string) => out.push({ where: w, message });

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) add('the file name must be lower-case words joined by hyphens');

    /* Dates */
    const dates = [it.date, it.written, it.checked, ...it.happened.map((f) => f.date), ...it.since.map((f) => f.date), ...it.sources.flatMap((s) => [s.accessed, ...(s.published ? [s.published] : [])])];
    const bad = dates.filter((d) => !validDate(d));
    if (bad.length) {
      add(`these dates do not exist: ${[...new Set(bad)].join(', ')}`);
      continue;
    }
    if (!onOrBefore(it.written, it.checked)) add(`checked on ${it.checked}, before it was written on ${it.written}`);
    if (parseDate(it.date).year < 2025) add(`dated ${it.date}: the briefing covers developments from 2025 onwards`);
    if (!onOrBefore(it.date, it.checked)) add(`dated ${it.date}, after the item was checked on ${it.checked}`);

    /* Sources */
    const sourceIds = new Set<string>();
    for (const s of it.sources) {
      const sw = `source "${s.id}"`;
      if (sourceIds.has(s.id)) add(`${sw} is listed twice`);
      sourceIds.add(s.id);
      if (!s.url.startsWith('https://')) add(`${sw} needs an https address`);
      if (!s.publisher.trim()) add(`${sw} names no publisher`);
      if (!s.published && !s.undated) add(`${sw} has no publication date: give one, or say under "undated" why the page carries none`);
      if (s.published && s.undated) add(`${sw} gives a publication date and also says it is undated`);
      if (!onOrBefore(BRIEFING_BEGAN, s.accessed)) add(`${sw} was accessed on ${s.accessed}, before the briefing began on ${BRIEFING_BEGAN}`);
      if (s.published && !onOrBefore(s.published, s.accessed)) add(`${sw} was accessed on ${s.accessed}, before it was published on ${s.published}`);
      if (!onOrBefore(s.accessed, it.checked)) add(`${sw} was accessed on ${s.accessed}, after the item was checked on ${it.checked}`);
      if (s.primary && s.kind === 'press') add(`${sw} is business press, so it cannot be a primary source`);
      if (!s.primary && s.kind !== 'press') add(`${sw} is the organization's own ${s.kind}, so it is a primary source`);
    }
    if (!it.sources.some((s) => s.url.startsWith('https://') && s.publisher.trim() && s.published && s.accessed)) {
      add('needs at least one source with an address, a publisher, a publication date and an access date');
    }
    if (!it.sources.some((s) => s.primary)) add('needs at least one primary source: a document published by the organization itself');

    /* Facts, later developments and figures */
    const cited = new Set<string>();
    const cite = (where: string, ids: string[]) =>
      ids.forEach((sid) => {
        cited.add(sid);
        if (!sourceIds.has(sid)) add(`${where} cites source "${sid}", which the item does not list`);
      });
    const accessedOn = new Map(it.sources.map((s) => [s.id, s.accessed]));
    const asAtRule = (where: string, f: Intelligence['happened'][number]) => {
      // A fact read from an undated page is dated by the day that page was read.
      if (f.asAt) f.sources.forEach((sid) => accessedOn.has(sid) && accessedOn.get(sid) !== f.date && add(`${where} is marked as at ${f.date}, but source "${sid}" was read on ${accessedOn.get(sid)}`));
    };
    it.happened.forEach((f, i) => {
      cite(`what happened ${i + 1}`, f.sources);
      asAtRule(`what happened ${i + 1}`, f);
      if (!onOrBefore(f.date, it.checked)) add(`what happened ${i + 1} is dated ${f.date}, after the item was checked`);
    });
    it.since.forEach((f, i) => {
      cite(`since then ${i + 1}`, f.sources);
      asAtRule(`since then ${i + 1}`, f);
      if (!onOrBefore(f.date, it.checked)) add(`since then ${i + 1} is dated ${f.date}, after the item was checked`);
      if (!onOrBefore(it.date, f.date)) add(`since then ${i + 1} is dated ${f.date}, before the development itself`);
    });
    it.figures.forEach((g) => cite(`figure "${g.value}"`, [g.source]));
    // Facts read as a dated record, so each list runs in date order.
    for (const [part, list] of [
      ['what happened', it.happened],
      ['since then', it.since],
    ] as const) {
      list.forEach((f, i) => {
        const prev = list[i - 1];
        if (prev && dateKey(f.date) < dateKey(prev.date)) add(`${part} ${i + 1} is dated ${f.date}, before the fact above it (${prev.date}); keep facts in date order`);
      });
    }
    for (const s of it.sources) if (!cited.has(s.id)) add(`source "${s.id}" supports nothing on the page: cite it from a fact or remove it`);
    if (!it.happened.some((f) => f.date === it.date)) add(`no fact under "what happened" carries the item's own date, ${it.date}`);

    /* Concepts, the question and the choices */
    const dupes = (list: string[]) => list.filter((x, i) => list.indexOf(x) !== i);
    it.concepts.subtopics.forEach((s) => {
      const sub = subs.get(s.code);
      if (!sub) add(`subtopic "${s.code}" is not in the IB course`);
      else if (sub.level === 'HL' && s.level !== 'HL') add(`subtopic ${s.code} is HL only, so its connection must be marked level: HL`);
      else if (sub.level === 'SL/HL' && s.level === 'HL') add(`subtopic ${s.code} has no HL-only content, so its connection cannot be marked HL`);
    });
    it.concepts.terms.forEach((t) => has(c.glossary, t) || add(`glossary term "${t}" does not exist`));
    it.concepts.tools.forEach((t) => has(c.tools, t.id) || add(`toolkit tool "${t.id}" does not exist`));
    for (const [what, list] of [
      ['subtopic', it.concepts.subtopics.map((s) => s.code)],
      ['glossary term', it.concepts.terms],
      ['tool', it.concepts.tools.map((t) => t.id)],
      ['kind of development', it.categories],
      ['key concept', it.keyConcepts],
    ] as const) {
      dupes([...list]).forEach((d) => add(`${what} "${d}" is listed twice`));
    }
    if (!has(c.commandTerms, it.question.command)) add(`the question's command term "${it.question.command}" is not in the command term register`);

    /* Quotations and links */
    for (const [where, text] of texts(it)) {
      for (const q of quotations(text)) {
        if (words(q) > MAX_QUOTE_WORDS) add(`${where}: a quotation of ${words(q)} words; keep quotations under ${MAX_QUOTE_WORDS} words, or paraphrase`);
      }
      for (const target of linkTargets(text)) {
        if (target.startsWith('http:')) add(`${where}: the link to ${target} must use https`);
        else if (target.startsWith('/')) {
          const path = target.replace(/[?#].*$/, '');
          if (!path.endsWith('/')) add(`${where}: the link to ${target} must end with a slash`);
          else if (!routes.has(path)) add(`${where}: the link to ${target} does not lead to a page on the platform`);
        } else if (!target.startsWith('https://') && !target.startsWith('#')) add(`${where}: the link target ${target} is neither a page on the platform nor an https address`);
      }
    }
  }
  return out;
}
