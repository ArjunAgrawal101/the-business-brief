/**
 * Coverage: what the platform has for each subtopic of the course, computed
 * from the content itself so that no page can claim material that does not
 * exist. Used by the home page, the topic library, the course map and the
 * coverage tracker.
 */
import type { Corpus } from './integrity';
import type { Curriculum } from './schemas';

export type Subtopic = Curriculum['units'][number]['subtopics'][number];
export type Unit = Curriculum['units'][number];
export type CoverageState = 'brief' | 'tools' | 'planned';

export interface SubtopicCoverage {
  unit: Unit;
  subtopic: Subtopic;
  state: CoverageState;
  /** Interactions placed on a page and tagged to this subtopic. */
  interactions: number;
  /** Worked calculations tagged to this subtopic. */
  calculations: number;
  /** Original practice questions tagged to this subtopic. */
  questions: number;
}

export function curriculumOf(c: Corpus): Curriculum {
  const cur = c.curricula['ib-dp-bm'];
  if (!cur) throw new Error('The IB DP Business Management curriculum is missing.');
  return cur;
}

export function subtopicCoverage(c: Corpus): SubtopicCoverage[] {
  const cur = curriculumOf(c);
  return cur.units.flatMap((unit) =>
    unit.subtopics.map((subtopic) => {
      const interactions = Object.values(c.interactives).filter((it) => it.syllabus.includes(subtopic.code) && it.page).length;
      const calculations = Object.values(c.calculations).filter((k) => k.syllabus.some((x) => x.code === subtopic.code)).length;
      const questions = Object.values(c.questions).filter((q) => q.syllabus.includes(subtopic.code)).length;
      const state: CoverageState = subtopic.topic ? 'brief' : interactions || calculations ? 'tools' : 'planned';
      return { unit, subtopic, state, interactions, calculations, questions };
    }),
  );
}

export function countBy<T>(list: T[], pick: (t: T) => string): Record<string, number> {
  return list.reduce<Record<string, number>>((acc, t) => {
    const k = pick(t);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}
