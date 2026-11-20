/**
 * Topic checklists for teachers: one per subtopic, built from the syllabus
 * statements in the curriculum file (src/content/curricula/ib-dp-bm.yaml),
 * each with the guide's depth of teaching (its assessment objectives) and its
 * level. The statements are the platform's paraphrase, checked against the
 * guide; the guide is the authority. A checklist page prints on its own, and
 * all of them download as one CSV file, written at build time from the same
 * functions (/downloads/topic-checklists.csv).
 *
 * Pure functions with no content imports, so the pages, the endpoint and the
 * unit tests share one implementation.
 */
import { slugify } from '../pathways';
import type { Curriculum } from '../schemas';
import { csvCell } from '../library/glossary-csv';

export type Ao = 'AO1' | 'AO2' | 'AO3' | 'AO4';

/** The guide's names for its assessment objectives (Business management guide, p. 18). */
export const AO_NAMES: Record<Ao, string> = {
  AO1: 'Knowledge and understanding',
  AO2: 'Application and analysis',
  AO3: 'Synthesis and evaluation',
  AO4: 'Use and application of appropriate skills',
};

/** The guide's page for the assessment objectives and for the command terms at each level. */
export const AO_PAGE = 18;
export const COMMAND_TERMS_PAGES = '19 to 20';

export interface ChecklistRow {
  /** The statement's number within its subtopic, from 1. */
  n: number;
  text: string;
  ao: Ao[];
  level: 'SL/HL' | 'HL';
}

export interface Checklist {
  unit: number;
  unitTitle: string;
  code: string;
  title: string;
  slug: string;
  level: string;
  /** The guide's printed page where the subtopic's content begins. */
  page?: number;
  rows: ChecklistRow[];
}

export const LEVEL_WORDS: Record<ChecklistRow['level'], string> = { 'SL/HL': 'SL and HL', HL: 'HL only' };

export const checklistHref = (slug: string): string => `/teachers/checklists/${slug}/`;

/** Every subtopic's checklist, in course order. */
export function checklists(cur: Curriculum): Checklist[] {
  return cur.units.flatMap((u) =>
    u.subtopics.map((s) => ({
      unit: u.number,
      unitTitle: u.title,
      code: s.code,
      title: s.title,
      slug: slugify(s.title),
      level: s.level,
      page: s.page,
      rows: s.content.map((x, i) => ({ n: i + 1, text: x.text, ao: x.ao as Ao[], level: x.level })),
    })),
  );
}

/** How many statements a checklist has, and how many of them are HL only. */
export function checklistCounts(list: Checklist): { statements: number; hl: number } {
  return { statements: list.rows.length, hl: list.rows.filter((r) => r.level === 'HL').length };
}

/** The statements an SL class is taught: none of an HL-only subtopic, and no HL-only statement. */
export function slRows(list: Checklist): ChecklistRow[] {
  return list.level === 'HL' ? [] : list.rows.filter((r) => r.level !== 'HL');
}

export const CHECKLIST_CSV_HEAD = [
  'Unit',
  'Unit title',
  'Subtopic',
  'Subtopic title',
  'Subtopic level',
  'Statement',
  'Content statement',
  'Depth of teaching',
  'Statement level',
  'Guide page',
  'Taught',
  'Checked',
  'Notes',
];

/**
 * Every checklist as one CSV file: a row per content statement, with empty
 * columns for the date it was taught, the date understanding was checked and
 * notes, so a department can keep its own record in a spreadsheet.
 */
export function checklistsCsv(cur: Curriculum): string {
  const rows = checklists(cur).flatMap((cl) =>
    cl.rows.map((r) =>
      [String(cl.unit), cl.unitTitle, cl.code, cl.title, cl.level === 'HL' ? 'HL only' : cl.level === 'SL/HL' ? 'SL and HL' : 'SL and HL, with HL-only content', `${cl.code}.${r.n}`, r.text, r.ao.join(', '), LEVEL_WORDS[r.level], cl.page ? String(cl.page) : '', '', '', '']
        .map(csvCell)
        .join(','),
    ),
  );
  const head = CHECKLIST_CSV_HEAD.map(csvCell).join(',');
  const note = csvCell(
    'Topic checklists from The Business Brief, by Arjun Agrawal. Content statements in the platform\'s words, checked against the IB Business management guide (first assessment 2024), which is the authority; depth of teaching and levels as the guide sets them. Not an IB publication.',
  );
  return `\uFEFF${head}\r\n${rows.join('\r\n')}\r\n${note}\r\n`;
}
