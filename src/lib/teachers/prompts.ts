/**
 * Discussion prompts for every subtopic, from the two places the platform
 * keeps them: the teachers' pathway (src/content/data/pathways.yaml, the
 * `lessons` of the teachers pathway) for subtopics with full notes, and each
 * topic brief's own teaching prompts. A subtopic's prompts come from one place
 * only: the pathway's when it has them, otherwise its brief's. Pure.
 */
import type { Corpus } from '../integrity';

export interface PromptSet {
  code: string;
  prompts: string[];
  /** Where the prompts are kept, for the teacher who wants to adapt them. */
  from: 'pathway' | 'brief';
}

export function promptsBySubtopic(lessons: ReadonlyArray<{ code: string; prompts: string[] }>, c: Corpus): Record<string, PromptSet> {
  const out: Record<string, PromptSet> = {};
  for (const l of lessons) if (l.prompts.length) out[l.code] = { code: l.code, prompts: l.prompts, from: 'pathway' };
  for (const t of Object.values(c.topics)) if (!out[t.code] && t.teaching.prompts.length) out[t.code] = { code: t.code, prompts: t.teaching.prompts, from: 'brief' };
  return out;
}

/** The prompts alone, by code. */
export const promptLists = (sets: Record<string, PromptSet>): Record<string, string[]> => Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, v.prompts]));
