/**
 * The Resources Library's catalogue: everything the platform offers to learn,
 * revise and teach with, filed under the twelve categories of the library.
 * Almost all of it is generated from the content (notes, briefs, revision,
 * mindmaps, diagrams, frameworks, cases, practice, the teacher area and the
 * enrichment material), so it cannot list something that does not exist; the
 * rest is the curated list in src/content/data/resources.yaml.
 *
 * The rules the library promises, which the unit tests hold it to:
 * - a download is offered only when its file exists (in public/ or written by
 *   the build), and its format, size and pages come from the file;
 * - every count shown is computed from the items, never typed;
 * - a category with nothing real in it (lesson presentations) is labelled
 *   "Not yet available" and counts nothing;
 * - every item carries its level (SL and HL, HL only, or HL parts marked) and,
 *   where it matters, its standing (enrichment, fictional, real-world, for
 *   teachers).
 *
 * Pure: the content arrives as arguments, so the unit tests build the same
 * catalogue the pages do without Astro (src/lib/resources.ts runs it there).
 */
import type { Corpus } from '../integrity';
import type { DiagramDef } from '../diagrams';
import type { Framework } from '../framework-schema';
import { RESOURCE_TYPE_LABELS, type ResourceEntry } from '../schemas';
import { LIBRARY_CATEGORIES, type CategoryId } from './categories';
import { codeKey, firstSentence, plainText, subtopicRefs } from '../pathways';
import { ADVANCED as ADV_FINANCE, advancedHref as advFinanceHref } from '../adv-finance/catalogue';
import { checklistCounts, checklistHref, checklists } from '../teachers/checklists';
import { activityHref, activityMinutes, type Activity } from '../teachers/schema';
import { ibFormulas, siteFormulas } from './formula-sheet';
import { factsLine, type FileFacts } from './downloads';
import type { ImageSource } from './previews';
import { fold, type Facets } from './filter';

export type { CategoryId };

export interface CategoryDef {
  id: CategoryId;
  title: string;
  dek: string;
  /** Set when the category has no real files: what is missing, said plainly. */
  missing?: { note: string; link?: { label: string; href: string } };
}

export const CATEGORY_DEFS: Record<CategoryId, Omit<CategoryDef, 'id'>> = {
  notes: { title: 'Topic notes', dek: 'Full notes for each subtopic, from what the guide asks to evaluation and exam practice, and the three topic briefs. Every one is a page that prints.' },
  revision: { title: 'Revision briefs', dek: 'Printable revision for each topic, and the glossary as a page and as a spreadsheet.' },
  mindmaps: { title: 'Mindmaps', dek: 'A map of every subtopic and of each unit. Open one to fold its branches or switch to the revision view, or take it as an SVG file.' },
  diagrams: { title: 'Infographics and diagrams', dek: 'Original diagrams drawn from data, each with a full text description and an SVG file to download. Where a diagram has figures, they are fictional.' },
  formulas: { title: 'Formula sheets', dek: 'The IB formulae sheet exactly as the guide prints it, and apart from it every other formula the platform uses, placed in the course.' },
  assessment: { title: 'Assessment guides', dek: 'The creator’s four assessment guides as PDF files, and the pages on each component, the command terms and the internal assessment.' },
  practice: { title: 'Practice questions', dek: 'Original questions in the style of each paper with mark schemes, worked constructions and calculation practice. None is an IB question.' },
  cases: { title: 'Case studies', dek: 'Fictional businesses with exhibits to analyse and decisions to take, and one briefing on real developments, sourced and dated.' },
  frameworks: { title: 'Framework guides', dek: 'Every framework and toolkit tool: the question it answers, how to use it and its limits, with its diagram and its standing in the course.' },
  teaching: { title: 'Teacher resources', dek: 'For teachers: a checklist of syllabus statements for each subtopic, classroom activities, lesson sequences and the course map.' },
  presentations: {
    title: 'Lesson presentations',
    dek: 'Slide decks for teaching each subtopic.',
    missing: {
      note: 'Not yet available. No slide decks have been made. In the meantime, the lesson library gives every subtopic a presentation outline as text, to build your own slides from.',
      link: { label: 'The lesson library', href: '/pathways/teachers/#lessons' },
    },
  },
  enrichment: { title: 'Enrichment', dek: 'Beyond the IB course, for curious students and for university and MBA learners: enrichment maps, Advanced Management modules and advanced financial analysis. None of it is required or assessed by the IB.' },
};

export type Level = 'SL/HL' | 'HL' | 'mixed';
export type Format = 'pdf' | 'csv' | 'svg' | 'print' | 'page' | 'interactive';
export type Audience = 'students' | 'teachers' | 'independent';
/** What an item is, beyond the IB course content it covers: shown as a tag. */
export type Standing = 'enrichment' | 'fictional' | 'real-world' | 'teacher' | 'original-practice';

export const FORMAT_LABELS: Record<Format, string> = {
  pdf: 'PDF',
  csv: 'CSV spreadsheet',
  svg: 'SVG image',
  print: 'Printable page',
  page: 'Web page',
  interactive: 'Interactive',
};
export const LEVEL_LABELS: Record<Level, string> = { 'SL/HL': 'SL and HL', HL: 'HL only', mixed: 'SL and HL, HL parts marked' };
export const STANDING_LABELS: Record<Standing, string> = {
  enrichment: 'Enrichment, beyond the course',
  fictional: 'Fictional',
  'real-world': 'Real-world, sourced and dated',
  teacher: 'For teachers',
  'original-practice': 'Original practice',
};

export interface LibraryLink {
  href: string;
  label: string;
  format: Format;
  /** A file to download: its facts, measured from the file. */
  file?: FileFacts;
}

export type Preview =
  | { kind: 'image'; src: string; width: number; height: number; webp?: string; avif?: string }
  | { kind: 'contents'; items: string[]; total: number }
  | { kind: 'formulas'; items: string[]; note: string }
  | { kind: 'none' };

export interface LibraryItem {
  id: string;
  title: string;
  summary: string;
  category: CategoryId;
  /** What it is, in a few words: "Full notes", "Unit map", "Classroom activity". */
  kind: string;
  /** The subtopic code to show beside it, when it is about one subtopic. */
  code?: string;
  level: Level;
  scope: 'ib' | 'enrichment';
  standing?: Standing;
  audiences: Audience[];
  units: number[];
  subtopics: string[];
  component?: string;
  primary: LibraryLink;
  more: LibraryLink[];
  preview: Preview;
  /** Words the search reads that are not shown: contents, section titles, branch names. */
  keywords: string[];
  printable: boolean;
  /** Its own details page in the library (curated entries). */
  details?: string;
  updated?: string;
  order: number;
  curated: boolean;
}

export interface Category extends CategoryDef {
  count: number;
  available: boolean;
}

export interface Catalogue {
  items: LibraryItem[];
  categories: Category[];
  /** Resources listed: items in available categories only. */
  total: number;
  /** Distinct files offered for download. */
  downloads: number;
}

export interface CatalogueInput {
  c: Corpus;
  curated: Array<{ id: string; data: ResourceEntry }>;
  frameworks: Record<string, Framework>;
  diagrams: Record<string, DiagramDef>;
  boardroom: Array<{ id: string; title: string; dek: string; syllabus: string[]; level: 'SL/HL' | 'HL'; order: number }>;
  executive: Array<{ title: string; dek: string }>;
  briefings: Array<{ id: string; number: number; question: string; title: string; dek: string; subtopics: string[]; fictional: boolean }>;
  /** The Advanced Management modules, in the order of their domains and then of each domain's modules. */
  advanced: Array<{ id: string; href: string; title: string; dek: string; domain: string }>;
  activities: Array<[string, Activity]>;
  /** Discussion prompts by subtopic code (the teachers' pathway and the briefs). */
  prompts: Record<string, string[]>;
  /**
   * What the revision workstream has built: the three revision briefs only,
   * or a revision sheet at /revision/<slug>/ for every subtopic; and whether
   * the flashcards at /revision/flashcards/ exist.
   */
  revision: { sheets: 'briefs' | 'every-subtopic'; flashcards: boolean };
  /** The facts of a download, or null when no such file exists. */
  facts: (href: string) => FileFacts | null;
  /** The first-page image of a PDF. */
  pdfPreviews: Record<string, ImageSource>;
}

const unitOf = (code: string) => Number(code.split('.')[0]);
const unitsOf = (codes: string[], extra: number[] = []) => [...new Set([...extra, ...codes.map(unitOf)])].filter((u) => u >= 1 && u <= 5).sort((a, b) => a - b);
const levelOf = (l: string): Level => (l === 'HL' ? 'HL' : l === 'SL/HL' ? 'SL/HL' : 'mixed');
const ALL: Audience[] = ['students', 'teachers', 'independent'];

/** The download link for a file, with its facts; throws if the file does not exist, so a missing download fails the build. */
function download(input: CatalogueInput, href: string, label: string, where: string): LibraryLink {
  const file = input.facts(href);
  if (!file) throw new Error(`Resources Library: "${where}" offers a download that does not exist: ${href}`);
  const format: Format = file.format === 'PDF' ? 'pdf' : file.format === 'CSV' ? 'csv' : 'svg';
  return { href, label, format, file };
}

/** A preview from a written SVG: the real drawing, at its own proportions. */
function svgPreview(link: LibraryLink): Preview {
  const f = link.file;
  return f?.width && f.height ? { kind: 'image', src: link.href, width: f.width, height: f.height } : { kind: 'none' };
}

/** A download's facts in a line: "PDF, 5 pages, 1.0 MB". */
export const linkFacts = (l: LibraryLink): string => (l.file ? factsLine(l.file) : FORMAT_LABELS[l.format]);

export function buildCatalogue(input: CatalogueInput): Catalogue {
  const { c } = input;
  const subs = subtopicRefs(c);
  const subByCode = new Map(subs.map((s) => [s.code, s]));
  const items: LibraryItem[] = [];
  const push = (it: Omit<LibraryItem, 'keywords' | 'curated' | 'more' | 'printable'> & Partial<Pick<LibraryItem, 'keywords' | 'curated' | 'more' | 'printable'>>) =>
    items.push({ keywords: [], curated: false, more: [], printable: false, ...it });

  /* ---------- Curated entries ---------- */
  for (const { id, data: r } of input.curated) {
    const primary: LibraryLink =
      r.access.kind === 'download'
        ? download(input, r.access.href, 'Download', `resources.yaml#${id}`)
        : { href: r.access.href, label: r.access.kind === 'print' ? 'Open and print' : 'Open', format: r.access.kind === 'print' ? 'print' : 'page' };
    const pdf = input.pdfPreviews[r.access.href];
    let preview: Preview = pdf ? { kind: 'image', src: pdf.src, width: pdf.width, height: pdf.height, webp: pdf.webp, avif: pdf.avif } : r.contents.length ? { kind: 'contents', items: r.contents, total: r.contents.length } : { kind: 'none' };
    if (r.type === 'formula-sheet') {
      const ib = ibFormulas();
      preview = { kind: 'formulas', items: ib.slice(0, 4).map((f) => f.name), note: `${ib.length} formulae on the IB sheet, and ${siteFormulas().length} more used on this site` };
    }
    push({
      id,
      title: r.title,
      summary: plainText(r.summary),
      category: r.category,
      kind: RESOURCE_TYPE_LABELS[r.type],
      level: r.level,
      scope: 'ib',
      standing: r.audiences.includes('teachers') && !r.audiences.includes('students') ? 'teacher' : r.type === 'practice' || r.type === 'worked-solutions' ? 'original-practice' : undefined,
      audiences: r.audiences,
      units: unitsOf(r.subtopics, r.units),
      subtopics: r.subtopics,
      component: r.component,
      primary,
      preview,
      keywords: r.contents,
      printable: r.access.kind === 'print',
      // A curated download gets a details page, with its first page where it has one; a page is opened directly.
      details: r.access.kind === 'download' ? `/resources/${id}/` : undefined,
      updated: r.updated,
      order: r.order,
      curated: true,
    });
  }

  /* ---------- Topic notes and briefs ---------- */
  for (const s of subs) {
    const note = Object.values(c.notes).find((n) => n.code === s.code);
    const briefs = Object.entries(c.topics).filter(([, t]) => t.code === s.code);
    if (note) {
      push({
        id: `notes-${s.slug}`,
        title: `${s.code} ${s.title}`,
        code: s.code,
        summary: firstSentence(note.introduction),
        category: 'notes',
        kind: 'Full notes',
        level: levelOf(note.level),
        scope: 'ib',
        audiences: ALL,
        units: [s.unit],
        subtopics: [s.code],
        primary: { href: `/topics/${s.slug}/`, label: 'Read the notes', format: 'page' },
        preview: { kind: 'contents', items: note.sections.map((x) => (x.level === 'HL' ? `${x.title} (HL)` : x.title)), total: note.sections.length },
        keywords: note.sections.flatMap((x) => [x.title, ...x.points.map((p) => p.term)]),
        printable: true,
        updated: note.updated,
        order: codeKey(s.code),
      });
    }
    for (const [tid, t] of briefs) {
      push({
        id: `brief-${tid}`,
        title: `${t.code} ${t.title}`,
        code: t.code,
        summary: plainText(t.summary),
        category: 'notes',
        kind: 'Topic brief',
        level: levelOf(t.level),
        scope: 'ib',
        audiences: ALL,
        units: [s.unit],
        subtopics: [t.code],
        primary: { href: `/topics/${tid}/`, label: 'Read the brief', format: 'page' },
        preview: { kind: 'contents', items: t.sections.map((x) => x.title), total: t.sections.length },
        keywords: t.sections.map((x) => x.title),
        printable: true,
        order: codeKey(t.code) + 0.5,
      });
    }
  }

  /* ---------- Revision ---------- */
  if (input.revision.sheets === 'every-subtopic') {
    for (const s of subs) {
      push({
        id: `revision-${s.slug}`,
        title: `${s.code} ${s.title}`,
        code: s.code,
        summary: `The revision sheet for ${s.code} ${s.title}, made to be printed.`,
        category: 'revision',
        kind: 'Revision sheet',
        level: levelOf(s.level),
        scope: 'ib',
        audiences: ['students', 'teachers'],
        units: [s.unit],
        subtopics: [s.code],
        primary: { href: `/revision/${s.slug}/`, label: 'Open and print', format: 'print' },
        preview: { kind: 'none' },
        printable: true,
        // Before the glossary, which the category also holds.
        order: codeKey(s.code) - 10_000,
      });
    }
  } else {
    for (const [tid, t] of Object.entries(c.topics)) {
      push({
        id: `revision-${tid}`,
        title: `${t.code} ${t.title}`,
        code: t.code,
        summary: `One printable page: ${t.revision.keyPoints.length} key points, ${t.revision.traps.length} traps and ${t.revision.retrieval.length} questions to answer from memory.`,
        category: 'revision',
        kind: 'Revision brief',
        level: levelOf(t.level),
        scope: 'ib',
        audiences: ['students', 'teachers'],
        units: [unitOf(t.code)],
        subtopics: [t.code],
        primary: { href: `/revision/${tid}/`, label: 'Open and print', format: 'print' },
        preview: { kind: 'none' },
        keywords: t.revision.keyPoints.map(plainText),
        printable: true,
        order: codeKey(t.code) - 10_000,
      });
    }
  }
  if (input.revision.flashcards) {
    push({
      id: 'flashcards',
      title: 'Flashcards',
      summary: 'Cards for revising the course by recall, subtopic by subtopic.',
      category: 'revision',
      kind: 'Flashcards',
      level: 'mixed',
      scope: 'ib',
      audiences: ['students'],
      units: [1, 2, 3, 4, 5],
      subtopics: [],
      primary: { href: '/revision/flashcards/', label: 'Open the flashcards', format: 'interactive' },
      preview: { kind: 'none' },
      order: -20_000,
    });
  }

  /* ---------- Mindmaps ---------- */
  for (const [id, m] of Object.entries(c.mindmaps)) {
    const svg = download(input, `/downloads/mindmaps/${id}.svg`, 'Download', `mindmap ${id}`);
    push({
      id: `mindmap-${id}`,
      title: m.scope === 'unit' ? `Unit ${m.unit}: ${m.title}` : `${m.code} ${m.title}`,
      code: m.scope === 'subtopic' ? m.code : undefined,
      summary: plainText(m.summary),
      category: 'mindmaps',
      kind: m.scope === 'unit' ? 'Unit map' : 'Subtopic map',
      level: levelOf(m.level),
      scope: 'ib',
      audiences: ALL,
      units: [m.unit],
      subtopics: m.scope === 'subtopic' ? [m.code] : [],
      primary: { href: `/mindmaps/${id}/`, label: 'Open the map', format: 'page' },
      more: [svg],
      preview: svgPreview(svg),
      keywords: m.branches.map((b) => b.label),
      printable: true,
      order: m.unit * 100 + (m.scope === 'unit' ? 0 : codeKey(m.code) % 100),
    });
  }

  /* ---------- Diagrams ---------- */
  const groupOrder = ['unit-1', 'unit-2', 'unit-3', 'unit-4', 'unit-5', 'toolkit', 'enrichment'];
  Object.entries(input.diagrams)
    .sort((a, b) => groupOrder.indexOf(a[1].group) - groupOrder.indexOf(b[1].group))
    .forEach(([id, d], i) => {
      const svg = download(input, `/downloads/diagrams/${id}.svg`, 'Download', `diagram ${id}`);
      const enrichment = d.group === 'enrichment';
      push({
        id: `diagram-${id}`,
        title: d.title,
        code: d.syllabus.length === 1 ? d.syllabus[0] : undefined,
        summary: d.caption ?? '',
        category: 'diagrams',
        kind: enrichment ? 'Enrichment diagram' : d.group === 'toolkit' ? 'Toolkit diagram' : 'Diagram',
        level: d.level,
        scope: enrichment ? 'enrichment' : 'ib',
        standing: enrichment ? 'enrichment' : undefined,
        audiences: ALL,
        units: unitsOf(d.syllabus, d.group.startsWith('unit-') ? [Number(d.group.slice(5))] : []),
        subtopics: d.syllabus,
        primary: { href: `/diagrams/#diagram-${id}`, label: 'Open with its description', format: 'page' },
        more: [svg],
        preview: svgPreview(svg),
        order: i,
      });
    });

  /* ---------- Practice: the sets in the style of each paper ---------- */
  const styles: Array<[string, string, string]> = [
    ['paper-1', 'Paper 1', 'paper-1'],
    ['paper-2', 'Paper 2', 'paper-2'],
    ['paper-3', 'Paper 3', 'paper-3'],
  ];
  for (const [style, name, component] of styles) {
    const qs = Object.values(c.questions).filter((q) => q.paperStyle === style);
    if (!qs.length) continue;
    const codes = [...new Set(qs.flatMap((q) => q.syllabus))].sort((a, b) => codeKey(a) - codeKey(b));
    push({
      id: `practice-${style}`,
      title: `${name}-style practice questions`,
      summary: `${qs.length} original ${qs.length === 1 ? 'question' : 'questions'} in the style of ${name}, each with a mark scheme and the common errors to avoid. None is an IB question.`,
      category: 'practice',
      kind: RESOURCE_TYPE_LABELS.practice,
      level: style === 'paper-3' ? 'HL' : qs.some((q) => q.level === 'HL') ? 'mixed' : 'SL/HL',
      scope: 'ib',
      standing: 'original-practice',
      audiences: ['students', 'teachers'],
      units: unitsOf(codes),
      subtopics: codes,
      component,
      primary: { href: '/exam-desk/practice/', label: 'Practise', format: 'interactive' },
      preview: { kind: 'contents', items: qs.slice(0, 3).map((q) => q.title), total: qs.length },
      keywords: qs.map((q) => q.title),
      order: 100 + styles.findIndex((x) => x[0] === style),
    });
  }

  /* ---------- Case studies ---------- */
  Object.entries(c.cases)
    .sort((a, b) => a[1].title.localeCompare(b[1].title))
    .forEach(([id, cs], i) => {
      const codes = cs.syllabus ?? [];
      push({
        id: `case-${id}`,
        title: cs.title,
        summary: cs.dek,
        category: 'cases',
        kind: 'Case file',
        level: 'SL/HL',
        scope: 'ib',
        standing: cs.kind === 'fictional' ? 'fictional' : 'real-world',
        audiences: ALL,
        units: unitsOf(codes),
        subtopics: codes,
        primary: { href: `/cases/${id}/`, label: 'Open the case file', format: 'page' },
        preview: { kind: 'contents', items: cs.exhibits.map((e, n) => `Exhibit ${n + 1}: ${e.title}`), total: cs.exhibits.length },
        keywords: [cs.decision, cs.organization.sector, cs.organization.location],
        printable: true,
        order: i,
      });
    });
  Object.entries(c.decisions)
    .sort((a, b) => a[1].title.localeCompare(b[1].title))
    .forEach(([id, d], i) => {
      const codes = d.topics.map((t) => c.topics[t]?.code).filter((x): x is string => Boolean(x));
      push({
        id: `decision-${id}`,
        title: `Decision Room: ${d.title}`,
        summary: d.dek,
        category: 'cases',
        kind: 'Decision Room',
        level: 'SL/HL',
        scope: 'ib',
        standing: 'fictional',
        audiences: ALL,
        units: unitsOf(codes),
        subtopics: codes,
        primary: { href: `/decision-room/${id}/`, label: 'Enter the room', format: 'interactive' },
        preview: { kind: 'contents', items: d.rounds.map((r, n) => `Round ${n + 1}: ${r.title}`), total: d.rounds.length },
        order: 100 + i,
      });
    });
  for (const it of Object.entries(c.interactives).filter(([, x]) => x.component === 'case-lab' && x.page)) {
    const [id, x] = it;
    push({
      id: `caselab-${id}`,
      title: x.title,
      summary: plainText(x.purpose),
      category: 'cases',
      kind: 'Case lab',
      level: 'SL/HL',
      scope: 'ib',
      standing: 'fictional',
      audiences: ALL,
      units: unitsOf(x.syllabus),
      subtopics: x.syllabus,
      primary: { href: x.page ?? '/case-room/', label: 'Open the case lab', format: 'interactive' },
      preview: { kind: 'none' },
      order: 200,
    });
  }
  for (const b of [...input.boardroom].sort((a, z) => a.order - z.order)) {
    push({
      id: `boardroom-${b.id}`,
      title: b.title,
      summary: b.dek,
      category: 'cases',
      kind: 'Boardroom simulation',
      level: b.level,
      scope: 'ib',
      standing: 'fictional',
      audiences: ALL,
      units: unitsOf(b.syllabus),
      subtopics: [...b.syllabus].sort((x, y) => codeKey(x) - codeKey(y)),
      primary: { href: `/boardroom/${b.id}/`, label: 'Take a seat', format: 'interactive' },
      preview: { kind: 'none' },
      order: 300 + b.order,
    });
  }
  input.executive.forEach((e, i) =>
    push({
      id: i ? `boardroom-executive-${i}` : 'boardroom-executive',
      title: e.title,
      summary: e.dek,
      category: 'cases',
      kind: 'Executive simulation',
      level: 'SL/HL',
      scope: 'ib',
      standing: 'fictional',
      audiences: ALL,
      units: [],
      subtopics: [],
      primary: { href: '/boardroom/executive/', label: 'Read the company brief', format: 'interactive' },
      preview: { kind: 'none' },
      order: 400 + i,
    }),
  );
  for (const b of [...input.briefings].sort((a, z) => a.number - z.number)) {
    push({
      id: `briefing-${b.id}`,
      title: b.question,
      summary: `${b.title}. ${b.dek}`,
      category: 'cases',
      kind: `Boardroom Briefing No. ${String(b.number).padStart(2, '0')}`,
      level: 'SL/HL',
      scope: 'ib',
      standing: b.fictional ? 'fictional' : 'real-world',
      audiences: ALL,
      units: unitsOf(b.subtopics),
      subtopics: [...b.subtopics].sort((x, y) => codeKey(x) - codeKey(y)),
      primary: { href: `/boardroom-briefings/${b.id}/`, label: 'Read the briefing', format: 'page' },
      preview: { kind: 'none' },
      printable: true,
      order: 500 + b.number,
    });
  }
  push({
    id: 'intelligence',
    title: 'The Business Intelligence Briefing',
    summary: 'Real developments in business, each fact dated and tied to its sources, with the management concepts that explain them, the choices the organizations faced and what a student or manager can learn.',
    category: 'cases',
    kind: 'Real-world briefing',
    level: 'SL/HL',
    scope: 'ib',
    standing: 'real-world',
    audiences: ALL,
    units: [],
    subtopics: [],
    primary: { href: '/intelligence/', label: 'Read the briefing', format: 'page' },
    preview: { kind: 'none' },
    order: 600,
  });

  /* ---------- Framework guides ---------- */
  const STATUS_KIND = { syllabus: 'Syllabus framework', toolkit: 'Toolkit tool', enrichment: 'Enrichment framework' } as const;
  const statusOrder = ['syllabus', 'toolkit', 'enrichment'];
  Object.entries(input.frameworks)
    .sort((a, b) => statusOrder.indexOf(a[1].status) - statusOrder.indexOf(b[1].status) || a[1].name.localeCompare(b[1].name))
    .forEach(([id, f], i) => {
      const enrichment = f.status === 'enrichment';
      const svg = download(input, `/downloads/diagrams/${f.diagram}.svg`, 'Download its diagram', `framework ${id}`);
      push({
        id: `framework-${id}`,
        title: f.name,
        summary: `${f.summary} ${f.question}`,
        category: 'frameworks',
        kind: STATUS_KIND[f.status],
        level: f.level,
        scope: enrichment ? 'enrichment' : 'ib',
        standing: enrichment ? 'enrichment' : undefined,
        audiences: ALL,
        units: unitsOf(f.subtopics),
        subtopics: [...f.subtopics].sort((x, y) => codeKey(x) - codeKey(y)),
        primary: { href: `/frameworks/${id}/`, label: 'Read the guide', format: 'page' },
        more: [svg],
        preview: svgPreview(svg),
        keywords: [...f.aliases, f.group],
        printable: true,
        order: 100 + i,
      });
    });

  /* ---------- Teacher resources ---------- */
  const cur = c.curricula['ib-dp-bm'];
  const lists = cur ? checklists(cur) : [];
  const withPrompts = subs.filter((s) => (input.prompts[s.code] ?? []).length > 0);
  const promptCount = withPrompts.reduce((n, s) => n + (input.prompts[s.code]?.length ?? 0), 0);
  const TEACH = { audiences: ['teachers'] as Audience[], standing: 'teacher' as const, scope: 'ib' as const };
  push({
    ...TEACH,
    id: 'teacher-area',
    title: 'The Teacher resource area',
    summary: 'Everything for teaching the course in one place: lesson sequences, discussion prompts, classroom activities, topic checklists and the files to download.',
    category: 'teaching',
    kind: 'For teachers',
    level: 'SL/HL',
    units: [],
    subtopics: [],
    primary: { href: '/teachers/', label: 'Open', format: 'page' },
    preview: { kind: 'none' },
    order: -10,
  });
  push({
    ...TEACH,
    id: 'discussion-prompts',
    title: 'Discussion prompts by subtopic',
    summary: `${promptCount} prompts for class discussion across ${withPrompts.length} subtopics, by unit, written to open a lesson or test a judgement.`,
    category: 'teaching',
    kind: 'Discussion prompts',
    level: 'SL/HL',
    units: [1, 2, 3, 4, 5],
    subtopics: withPrompts.map((s) => s.code),
    primary: { href: '/teachers/#prompts', label: 'Open', format: 'page' },
    preview: { kind: 'none' },
    printable: true,
    order: -8,
  });
  const csv = download(input, '/downloads/topic-checklists.csv', 'Download', 'topic checklists');
  const statements = lists.reduce((n, l) => n + l.rows.length, 0);
  push({
    ...TEACH,
    id: 'topic-checklists-csv',
    title: 'Every topic checklist as a spreadsheet',
    summary: `All ${statements} syllabus statements, one row each, with their depth of teaching, their level and the guide’s page, and empty columns to record when each was taught and checked.`,
    category: 'teaching',
    kind: 'Spreadsheet',
    level: 'SL/HL',
    units: [1, 2, 3, 4, 5],
    subtopics: [],
    primary: csv,
    preview: { kind: 'none' },
    order: -6,
  });
  for (const [id, a] of [...input.activities].sort((x, y) => x[1].order - y[1].order)) {
    push({
      ...TEACH,
      id: `activity-${id}`,
      title: a.title,
      summary: plainText(a.summary),
      category: 'teaching',
      kind: `Classroom activity, ${activityMinutes(a)} minutes`,
      level: a.level,
      units: unitsOf(a.subtopics),
      subtopics: [...a.subtopics].sort((x, y) => codeKey(x) - codeKey(y)),
      primary: { href: activityHref(id), label: 'Open and print', format: 'print' },
      preview: { kind: 'contents', items: a.phases.map((p) => `${p.minutes} min: ${p.title}`), total: a.phases.length },
      keywords: [a.format],
      printable: true,
      order: 30 + a.order,
    });
  }
  for (const l of lists) {
    const n = checklistCounts(l);
    push({
      ...TEACH,
      id: `checklist-${l.slug}`,
      title: `${l.code} ${l.title}`,
      code: l.code,
      summary: `${n.statements} syllabus ${n.statements === 1 ? 'statement' : 'statements'} with the depth of teaching${n.hl ? `, ${n.hl} of them HL only` : ''}, to tick off as they are taught and checked.`,
      category: 'teaching',
      kind: 'Topic checklist',
      level: levelOf(l.level),
      units: [l.unit],
      subtopics: [l.code],
      primary: { href: checklistHref(l.slug), label: 'Open and print', format: 'print' },
      preview: { kind: 'none' },
      keywords: l.rows.map((r) => r.text),
      printable: true,
      order: 100 + codeKey(l.code),
    });
  }

  /* ---------- Enrichment ---------- */
  Object.entries(c.enrichmentMaps)
    .sort((a, b) => a[1].title.localeCompare(b[1].title))
    .forEach(([id, m], i) => {
      const svg = download(input, `/downloads/mindmaps/enrichment/${id}.svg`, 'Download', `enrichment map ${id}`);
      push({
        id: `enrichment-map-${id}`,
        title: m.title,
        summary: plainText(m.summary),
        category: 'enrichment',
        kind: `Enrichment map: ${m.field}`,
        level: 'SL/HL',
        scope: 'enrichment',
        standing: 'enrichment',
        audiences: ALL,
        units: [],
        subtopics: [],
        primary: { href: `/mindmaps/enrichment/${id}/`, label: 'Open the map', format: 'page' },
        more: [svg],
        preview: svgPreview(svg),
        keywords: m.branches.map((b) => b.label),
        printable: true,
        order: i,
      });
    });
  for (const t of ADV_FINANCE) {
    push({
      id: `adv-finance-${t.id}`,
      title: t.name,
      summary: t.description,
      category: 'enrichment',
      kind: 'Advanced financial analysis',
      level: 'SL/HL',
      scope: 'enrichment',
      standing: 'enrichment',
      audiences: ALL,
      units: [],
      subtopics: [],
      primary: { href: advFinanceHref(t.id), label: 'Open the tool', format: 'interactive' },
      preview: { kind: 'none' },
      keywords: [t.question, ...t.beyond],
      order: 100 + ADV_FINANCE.indexOf(t),
    });
  }
  input.advanced.forEach((m, i) => {
    push({
      id: `advanced-${m.id}`,
      title: m.title,
      summary: plainText(m.dek),
      category: 'enrichment',
      kind: `Advanced Management: ${m.domain}`,
      level: 'SL/HL',
      scope: 'enrichment',
      standing: 'enrichment',
      audiences: ALL,
      units: [],
      subtopics: [],
      primary: { href: m.href, label: 'Read the module', format: 'page' },
      preview: { kind: 'none' },
      printable: true,
      order: 200 + i,
    });
  });

  /* ---------- Order, categories and counts ---------- */
  const catIndex = (id: CategoryId) => LIBRARY_CATEGORIES.indexOf(id);
  items.sort((a, b) => catIndex(a.category) - catIndex(b.category) || a.order - b.order || a.title.localeCompare(b.title));
  const seen = new Set<string>();
  for (const it of items) {
    if (seen.has(it.id)) throw new Error(`Resources Library: two items share the id "${it.id}"`);
    seen.add(it.id);
    for (const code of it.subtopics) if (!subByCode.has(code)) throw new Error(`Resources Library: "${it.id}" names an unknown subtopic ${code}`);
  }
  const listed = items.filter((it) => !CATEGORY_DEFS[it.category].missing);
  const categories: Category[] = LIBRARY_CATEGORIES.map((id) => {
    const def = CATEGORY_DEFS[id];
    const count = def.missing ? 0 : items.filter((it) => it.category === id).length;
    return { id, ...def, dek: id === 'revision' ? revisionDek(input) : def.dek, count, available: !def.missing && count > 0 };
  });
  const downloads = new Set(listed.flatMap((it) => [it.primary, ...it.more]).filter((l) => l.file).map((l) => l.href));
  return { items: listed, categories, total: listed.length, downloads: downloads.size };
}

/** The revision category says what it holds, which depends on what the revision workstream has built. */
function revisionDek(input: CatalogueInput): string {
  const sheets = input.revision.sheets === 'every-subtopic' ? 'A revision sheet to print for every subtopic' : 'A revision brief to print for each topic brief';
  return `${sheets}${input.revision.flashcards ? ', flashcards to revise by recall,' : ''} and the glossary as a page and as a spreadsheet.`;
}

/** Every download the catalogue offers, by address. */
export function catalogueDownloads(cat: Catalogue): LibraryLink[] {
  const out = new Map<string, LibraryLink>();
  for (const it of cat.items) for (const l of [it.primary, ...it.more]) if (l.file) out.set(l.href, l);
  return [...out.values()];
}

/** The text the search reads for an item, lower-cased. */
export function searchText(it: LibraryItem): string {
  const preview = it.preview.kind === 'contents' || it.preview.kind === 'formulas' ? it.preview.items : [];
  return [it.title, it.summary, it.kind, CATEGORY_DEFS[it.category].title, ...it.subtopics, ...preview, ...it.keywords, ...[it.primary, ...it.more].map((l) => FORMAT_LABELS[l.format])]
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Words the search should find that an item's card does not show: its
 * keywords, the rest of its contents, its category and its formats. The page
 * puts them on the item, and the browser adds them to the card's own text, so
 * the search text is not sent twice.
 */
export function hiddenWords(it: LibraryItem, shown: number): string {
  const rest = it.preview.kind === 'contents' ? it.preview.items.slice(shown) : [];
  return [...it.keywords, ...rest, CATEGORY_DEFS[it.category].title, ...itemFormats(it).map((f) => FORMAT_LABELS[f])].join(' ');
}

/** What the browser needs to search and filter an item: its facets and its text, folded for the search. */
export function facetsOf(it: LibraryItem): Facets {
  return {
    id: it.id,
    category: it.category,
    units: it.units,
    subtopics: it.subtopics,
    level: it.level,
    formats: itemFormats(it),
    audiences: it.audiences,
    scope: it.scope,
    text: fold(searchText(it)),
    order: it.order,
    title: it.title,
  };
}

/** The formats an item offers, for the format filter. */
export function itemFormats(it: LibraryItem): Format[] {
  const out = new Set<Format>([it.primary.format, ...it.more.map((l) => l.format)]);
  if (it.printable) out.add('print');
  return [...out];
}
