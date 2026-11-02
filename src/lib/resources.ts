/**
 * The Resources Library's catalogue: the curated entries (resources.yaml)
 * and entries generated from the content itself (mindmaps, briefs, notes,
 * revision briefs, cases, Decision Rooms, tools and practice). A download is
 * listed only when its file exists: a file in public/, or one the build
 * itself writes (the glossary CSV and the mindmap SVGs). The build fails on a
 * download whose file is missing.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getCollection } from 'astro:content';
import { corpus, href } from './content';
import { subtopicHref } from './learning';
import { RESOURCE_TYPE_LABELS, type RESOURCE_TYPES } from './schemas';

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export interface LibraryItem {
  id: string;
  title: string;
  summary: string;
  type: ResourceType;
  typeLabel: string;
  qualification: 'ib-dp-bm' | 'general';
  audiences: string[];
  level: 'SL/HL' | 'HL';
  units: number[];
  subtopics: string[];
  component?: string;
  primary: { kind: 'download' | 'page' | 'print'; href: string; label: string; format?: string; size?: string; pages?: number };
  secondary?: { href: string; label: string };
  /** A details page of its own (curated entries). */
  details?: string;
  contents: string[];
  updated: string;
  order: number;
  curated: boolean;
}

/** Files the build writes itself, so they exist in every deployment without being in public/. */
const GENERATED = [/^\/downloads\/glossary\.csv$/, /^\/downloads\/mindmaps\/[a-z0-9-]+\.svg$/];

function fileExists(path: string): boolean {
  if (GENERATED.some((r) => r.test(path))) return true;
  return existsSync(join(process.cwd(), 'public', path));
}

const COMPONENT_OF: Record<string, string> = { 'paper-1': 'paper-1', 'paper-2': 'paper-2', 'paper-3': 'paper-3', 'ia-skill': 'internal-assessment' };
const unitOf = (code: string) => Number(code.split('.')[0]);
const LABEL = (kind: 'download' | 'page' | 'print', format?: string) => (kind === 'download' ? `Download ${format ?? ''}`.trim() : kind === 'print' ? 'Open and print' : 'Open');

let built: Promise<LibraryItem[]> | null = null;

export function library(): Promise<LibraryItem[]> {
  built ??= (async () => {
    const c = await corpus();
    const curated = await getCollection('resources');
    const items: LibraryItem[] = [];

    for (const { id, data: r } of curated) {
      if (r.access.kind === 'download' && !fileExists(r.access.href)) throw new Error(`Resource "${id}" offers a download that does not exist: ${r.access.href}`);
      items.push({
        id,
        title: r.title,
        summary: r.summary,
        type: r.type,
        typeLabel: RESOURCE_TYPE_LABELS[r.type],
        qualification: r.qualification,
        audiences: r.audiences,
        level: r.level,
        units: r.units,
        subtopics: r.subtopics,
        component: r.component,
        primary: { kind: r.access.kind, href: r.access.href, label: LABEL(r.access.kind, r.access.format), format: r.access.format, size: r.access.size, pages: r.access.pages },
        details: r.access.href.startsWith('/resources/') ? r.access.href : `/resources/${id}/`,
        contents: r.contents,
        updated: r.updated,
        order: r.order,
        curated: true,
      });
    }

    let order = 100;
    for (const [id, m] of Object.entries(c.mindmaps).sort((a, b) => a[1].order - b[1].order)) {
      const svg = `/downloads/mindmaps/${id}.svg`;
      items.push({
        id: `mindmap-${id}`,
        title: m.scope === 'unit' ? `Unit ${m.unit}: ${m.title}` : `${m.code} ${m.title}`,
        summary: m.summary,
        type: 'mindmap',
        typeLabel: RESOURCE_TYPE_LABELS.mindmap,
        qualification: 'ib-dp-bm',
        audiences: ['students', 'teachers', 'independent'],
        level: m.level === 'HL' ? 'HL' : 'SL/HL',
        units: [m.unit],
        subtopics: m.scope === 'subtopic' ? [m.code] : [],
        primary: { kind: 'page', href: href.mindmap(id), label: 'Open the map' },
        secondary: { href: svg, label: 'Download SVG' },
        contents: m.branches.map((b) => b.label),
        updated: '2026-11-02',
        order: order++,
        curated: false,
      });
    }

    for (const [id, t] of Object.entries(c.topics)) {
      items.push({
        id: `brief-${id}`,
        title: `${t.code} ${t.title}`,
        summary: t.summary,
        type: 'topic-notes',
        typeLabel: 'Topic brief',
        qualification: 'ib-dp-bm',
        audiences: ['students', 'teachers', 'independent'],
        level: t.level === 'HL' ? 'HL' : 'SL/HL',
        units: [unitOf(t.code)],
        subtopics: [t.code],
        primary: { kind: 'page', href: href.topic(id), label: 'Read the brief' },
        secondary: { href: href.revision(id), label: 'Revision brief' },
        contents: t.sections.map((s) => s.title),
        updated: '2026-10-29',
        order: order++,
        curated: false,
      });
      items.push({
        id: `revision-${id}`,
        title: `${t.code} ${t.title}: revision brief`,
        summary: `One printable page: the key ideas of ${t.title.toLowerCase()}, with retrieval questions.`,
        type: 'revision-brief',
        typeLabel: RESOURCE_TYPE_LABELS['revision-brief'],
        qualification: 'ib-dp-bm',
        audiences: ['students'],
        level: t.level === 'HL' ? 'HL' : 'SL/HL',
        units: [unitOf(t.code)],
        subtopics: [t.code],
        primary: { kind: 'print', href: href.revision(id), label: 'Open and print' },
        contents: [],
        updated: '2026-10-29',
        order: order++,
        curated: false,
      });
    }

    for (const [, n] of Object.entries(c.notes)) {
      items.push({
        id: `notes-${n.code.replace('.', '-')}`,
        title: `${n.code} ${n.title}`,
        summary: n.introduction.split('. ')[0]?.replace(/\.$/, '') + '.',
        type: 'topic-notes',
        typeLabel: RESOURCE_TYPE_LABELS['topic-notes'],
        qualification: 'ib-dp-bm',
        audiences: ['students', 'teachers', 'independent'],
        level: n.level === 'HL' ? 'HL' : 'SL/HL',
        units: [unitOf(n.code)],
        subtopics: [n.code],
        primary: { kind: 'page', href: subtopicHref(c, n.code), label: 'Read the notes' },
        contents: n.sections.map((s) => s.title),
        updated: n.updated,
        order: order++,
        curated: false,
      });
    }

    for (const [id, cs] of Object.entries(c.cases)) {
      items.push({
        id: `case-${id}`,
        title: `${cs.title}: case file`,
        summary: `${cs.decision} A fictional business with ${cs.exhibits.length} exhibits and ${cs.stakeholders.length} stakeholders.`,
        type: 'case-study',
        typeLabel: RESOURCE_TYPE_LABELS['case-study'],
        qualification: 'ib-dp-bm',
        audiences: ['students', 'teachers', 'independent'],
        level: 'SL/HL',
        units: [],
        subtopics: [],
        primary: { kind: 'page', href: href.case(id), label: 'Open the case' },
        contents: cs.exhibits.map((e) => e.title),
        updated: '2026-10-29',
        order: order++,
        curated: false,
      });
    }

    for (const [id, d] of Object.entries(c.decisions)) {
      items.push({
        id: `decision-${id}`,
        title: `Decision Room: ${d.title}`,
        summary: `A decision in ${d.rounds.length} rounds, each with its consequences for the business and its stakeholders.`,
        type: 'interactive',
        typeLabel: RESOURCE_TYPE_LABELS.interactive,
        qualification: 'ib-dp-bm',
        audiences: ['students', 'teachers', 'independent'],
        level: 'SL/HL',
        units: [],
        subtopics: [],
        primary: { kind: 'page', href: href.decision(id), label: 'Enter the room' },
        contents: d.rounds.map((r) => r.title),
        updated: '2026-10-29',
        order: order++,
        curated: false,
      });
    }

    for (const [id, it] of Object.entries(c.interactives)) {
      if (!it.page) continue;
      const codes = it.syllabus;
      items.push({
        id: `tool-${id}`,
        title: it.title,
        summary: it.purpose,
        type: 'interactive',
        typeLabel: RESOURCE_TYPE_LABELS.interactive,
        qualification: 'ib-dp-bm',
        audiences: ['students', 'teachers'],
        level: codes.length && codes.every((x) => ['3.6', '3.9', '4.3', '4.6', '5.3', '5.6', '5.7', '5.8', '5.9', '2.5', '2.7'].includes(x)) ? 'HL' : 'SL/HL',
        units: [...new Set(codes.map(unitOf))].filter((u) => u >= 1 && u <= 5),
        subtopics: codes,
        primary: { kind: 'page', href: `${it.page}#ix-${id}`, label: 'Open the tool' },
        contents: [],
        updated: '2026-10-29',
        order: order++,
        curated: false,
      });
    }

    const styles: Array<[string, string]> = [
      ['paper-1', 'Paper 1'],
      ['paper-2', 'Paper 2'],
      ['paper-3', 'Paper 3'],
    ];
    for (const [style, name] of styles) {
      const qs = Object.values(c.questions).filter((q) => q.paperStyle === style);
      if (!qs.length) continue;
      items.push({
        id: `practice-${style}`,
        title: `${name}-style practice questions`,
        summary: `${qs.length} original questions in the style of ${name}, each with a mark scheme, common errors and a model answer where one helps. None is an IB question.`,
        type: 'practice',
        typeLabel: RESOURCE_TYPE_LABELS.practice,
        qualification: 'ib-dp-bm',
        audiences: ['students', 'teachers'],
        level: style === 'paper-3' ? 'HL' : 'SL/HL',
        units: [...new Set(qs.flatMap((q) => q.syllabus.map(unitOf)))].sort(),
        subtopics: [...new Set(qs.flatMap((q) => q.syllabus))],
        component: COMPONENT_OF[style],
        primary: { kind: 'page', href: '/exam-desk/practice/', label: 'Practise' },
        contents: qs.map((q) => q.title),
        updated: '2026-10-29',
        order: order++,
        curated: false,
      });
    }
    return items;
  })();
  return built;
}
