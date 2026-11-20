/**
 * The suggested lesson sequences, seen across the whole course: for every
 * subtopic in the lesson library (src/lib/lesson-sources.ts), how many lessons
 * its sequence takes for an SL and an HL class at each lesson length, and what
 * each lesson covers, worked by the same functions as the lesson library
 * itself (src/lib/lessons.ts), so the two can never disagree. With the
 * guide's recommended hours for each unit beside them, for planning a year.
 * Pure.
 */
import { LESSON_LENGTHS, lessonsFor, type LessonSource } from '../lessons';
import type { Curriculum } from '../schemas';

export interface SequenceRow {
  code: string;
  title: string;
  unit: number;
  level: string;
  from: 'notes' | 'brief';
  /** The subtopic's full timed plans in the lesson library. */
  href: string;
  /** By lesson length: the lessons for an SL and an HL class, and the focus of each HL lesson. */
  byLength: Record<number, { sl: number; hl: number; focus: string[] }>;
}

export const lessonAnchor = (code: string): string => `/pathways/teachers/#lesson-${code.replace('.', '-')}`;

export function sequenceRows(entries: ReadonlyArray<{ code: string; title: string; unit: number; level: string; source: LessonSource }>): SequenceRow[] {
  return entries.map((e) => ({
    code: e.code,
    title: e.title,
    unit: e.unit,
    level: e.level,
    from: e.source.kind,
    href: lessonAnchor(e.code),
    byLength: Object.fromEntries(
      LESSON_LENGTHS.map((len) => {
        const hl = lessonsFor(e.source, len, 'HL');
        return [len, { sl: lessonsFor(e.source, len, 'SL').length, hl: hl.length, focus: hl.map((l) => l.focus) }];
      }),
    ),
  }));
}

export interface UnitPlan {
  unit: number;
  title: string;
  /** Lessons in the sequences for the unit's subtopics. */
  sl: number;
  hl: number;
  /** The guide's recommended teaching hours for the unit. */
  hours?: { sl: number; hl: number };
}

/** Each unit's lessons at a length, beside the guide's recommended hours for it. */
export function unitPlans(rows: SequenceRow[], cur: Curriculum, length: number): UnitPlan[] {
  return cur.units.map((u) => {
    const mine = rows.filter((r) => r.unit === u.number);
    return {
      unit: u.number,
      title: u.title,
      sl: mine.reduce((n, r) => n + (r.byLength[length]?.sl ?? 0), 0),
      hl: mine.reduce((n, r) => n + (r.byLength[length]?.hl ?? 0), 0),
      hours: u.hours,
    };
  });
}

/** Hours of teaching in a number of lessons of a given length, to one decimal place. */
export const lessonHours = (lessons: number, length: number): number => Math.round((lessons * length) / 6) / 10;
