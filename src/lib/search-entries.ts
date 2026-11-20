/**
 * Every entry the site can be searched for, built from the content and the
 * navigation (src/lib/search-index.ts). Shared by the search page, which
 * lists them all, and /search.json, the compact index the header's search
 * box loads to suggest results as the reader types.
 */
import { corpus, href, modulesInOrder, pathwaysInOrder } from './content';
import { subtopicHref } from './learning';
import { DIAGRAMS } from './diagrams';
import { library } from './resources';
import { library as frameworkLibrary } from './frameworks-content';
import { advancedLibrary } from './advanced-content';
import { DOMAIN_BY_ID, advancedHref } from './advanced';
import { series as briefingSeries } from './boardroom-briefings/content';
import { briefingHref as seriesHref, issueNo } from './boardroom-briefings/series';
import { plain } from './markup';
import { NAV } from './navigation';
import { buildSearchIndex, type SearchLinks } from './search-index';
import type { SearchEntry } from './search';

let cached: Promise<SearchEntry[]> | undefined;

/** The site's search entries, built once per build. */
export function siteSearchEntries(): Promise<SearchEntry[]> {
  cached ??= build();
  return cached;
}

async function build(): Promise<SearchEntry[]> {
  const c = await corpus();
  const links: SearchLinks = {
    subtopic: (code) => subtopicHref(c, code),
    topic: href.topic,
    case: href.case,
    decision: href.decision,
    toolEntry: (id) => href.toolEntry(id, c.tools[id]),
    question: href.question,
    glossary: href.glossary,
    mindmap: href.mindmap,
    commandTerm: href.commandTerm,
    concept: href.concept,
    revision: href.revision,
    calculation: href.calculation,
    pathway: href.pathway,
  };
  return buildSearchIndex({
    c,
    nav: NAV,
    links,
    modules: (await modulesInOrder()).map((m) => m.data),
    library: (await library())
      .filter((r) => r.curated)
      .map((r) => ({ title: r.title, summary: r.summary, typeLabel: r.typeLabel, level: r.level, units: r.units, subtopics: r.subtopics, href: r.details ?? r.primary.href })),
    diagrams: DIAGRAMS,
    pathways: (await pathwaysInOrder()).map((p) => ({ id: p.id, name: p.data.name, promise: p.data.promise })),
    frameworks: (await frameworkLibrary()).frameworks,
    advanced: (await advancedLibrary()).modules.map((m) => ({ url: advancedHref(m.data.domain, m.id), title: m.data.title, dek: plain(m.data.dek), domain: DOMAIN_BY_ID[m.data.domain].name, covers: m.data.covers })),
    boardroomBriefings: (await briefingSeries()).list.map(([id, b]) => ({
      url: seriesHref(id),
      title: `${issueNo(b.number)}: ${b.question}`,
      text: plain(b.dek),
      keys: `${b.title} ${b.company.name} ${b.industry} ${b.decisionType} ${b.functions.join(' ')}`,
      codes: b.course.subtopics.map((s) => s.code),
    })),
  });
}
