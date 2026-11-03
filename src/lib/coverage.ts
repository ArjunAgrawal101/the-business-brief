/**
 * Coverage: what the platform has for each subtopic of the course, computed
 * from the content itself so that no page can claim material that does not
 * exist. Used by the home page, the topic library, the course map and the
 * coverage tracker.
 */
import type { Corpus } from './integrity';
import { DIAGRAMS } from './diagrams';
import type { Curriculum } from './schemas';

export type Subtopic = Curriculum['units'][number]['subtopics'][number];
export type Unit = Curriculum['units'][number];
/**
 * complete: full notes or a complete brief. partial: the subtopic's page has
 * material (its mindmap, key terms, diagrams or tools) but its notes are still
 * to be written. planned: nothing yet beyond the guide's statements.
 */
export type CoverageState = 'complete' | 'partial' | 'planned';

export interface SubtopicCoverage {
  unit: Unit;
  subtopic: Subtopic;
  state: CoverageState;
  /** A complete brief written for this subtopic. */
  brief: boolean;
  /** A brief for another subtopic that also teaches part of this one. */
  inBrief?: string;
  notes: boolean;
  mindmap: boolean;
  /** Glossary entries tagged to this subtopic. */
  terms: number;
  /** Library diagrams that serve this subtopic. */
  diagrams: number;
  /** Interactions placed on a page and tagged to this subtopic. */
  interactions: number;
  /** Worked calculations tagged to this subtopic. */
  calculations: number;
  /** Original practice questions tagged to this subtopic. */
  questions: number;
  /** The subtopic's statements were checked against the guide. */
  verified: boolean;
}

export const STATE_LABEL: Record<CoverageState, string> = { complete: 'Complete', partial: 'Partly built', planned: 'Planned' };

export function curriculumOf(c: Corpus): Curriculum {
  const cur = c.curricula['ib-dp-bm'];
  if (!cur) throw new Error('The IB DP Business Management curriculum is missing.');
  return cur;
}

export function subtopicCoverage(c: Corpus): SubtopicCoverage[] {
  const cur = curriculumOf(c);
  return cur.units.flatMap((unit) =>
    unit.subtopics.map((subtopic) => {
      const code = subtopic.code;
      const interactions = Object.values(c.interactives).filter((it) => it.syllabus.includes(code) && it.page).length;
      const calculations = Object.values(c.calculations).filter((k) => k.syllabus.some((x) => x.code === code)).length;
      const questions = Object.values(c.questions).filter((q) => q.syllabus.includes(code)).length;
      const own = subtopic.topic ? c.topics[subtopic.topic] : undefined;
      const brief = Boolean(own && own.code === code);
      const inBrief = own && !brief ? subtopic.topic : undefined;
      const notes = Object.values(c.notes).some((n) => n.code === code);
      const mindmap = Object.values(c.mindmaps).some((m) => m.scope === 'subtopic' && m.code === code);
      const terms = Object.values(c.glossary).filter((g) => g.subtopics.includes(code)).length;
      const diagrams = Object.values(DIAGRAMS).filter((d) => d.syllabus.includes(code)).length;
      const state: CoverageState = brief || notes ? 'complete' : mindmap || terms || diagrams || interactions || calculations ? 'partial' : 'planned';
      return { unit, subtopic, state, brief, inBrief, notes, mindmap, terms, diagrams, interactions, calculations, questions, verified: subtopic.verification === 'primary' };
    }),
  );
}

/**
 * The headline figures, from the same rows: the home page, the topic library,
 * the coverage tracker and the menu all quote these, so they always agree.
 * A subtopic is complete when it has full notes or its own complete brief.
 */
export interface CoverageSummary {
  total: number;
  complete: number;
  partial: number;
  planned: number;
  /** Complete with full notes. */
  withNotes: number;
  /** Complete through a brief written for it (and no notes yet). */
  withBriefs: number;
  verified: number;
}

export function coverageSummary(c: Corpus): CoverageSummary {
  const rows = subtopicCoverage(c);
  const n = (f: (r: SubtopicCoverage) => boolean) => rows.filter(f).length;
  return {
    total: rows.length,
    complete: n((r) => r.state === 'complete'),
    partial: n((r) => r.state === 'partial'),
    planned: n((r) => r.state === 'planned'),
    withNotes: n((r) => r.notes),
    withBriefs: n((r) => r.brief && !r.notes),
    verified: n((r) => r.verified),
  };
}

export function countBy<T>(list: T[], pick: (t: T) => string): Record<string, number> {
  return list.reduce<Record<string, number>>((acc, t) => {
    const k = pick(t);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}
