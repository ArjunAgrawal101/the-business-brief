/**
 * Schemas for the working tools of two rooms, People and Culture and the
 * Operations Floor. Each tool is an interaction (src/content/interactives)
 * with a page of its own, so it reaches search, the course map, the subtopic
 * pages and the Resources Library like every other interaction.
 *
 * Every tool carries a `guide`: its room and address, what it is for, how to
 * use it, its limitations and its syllabus status, which its page renders.
 * Its own fields hold the fictional worked example that is its default state.
 *
 * The schemas are built from the interaction base fields passed in by
 * src/lib/schemas.ts, so this module imports nothing from it.
 */
import { z } from 'astro/zod';

const text = z.string().trim().min(1);
const ids = z.array(z.string()).default([]);
const AO = z.enum(['AO1', 'AO2', 'AO3', 'AO4']);

export const ROOM_TOOL_ROOMS = ['people', 'operations'] as const;

/** What every tool says about itself on its page. */
const guide = z.object({
  room: z.enum(ROOM_TOOL_ROOMS),
  /** The last part of the address: /people-and-culture/<slug>/ or /operations-floor/<slug>/. */
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  /** Order of the tool in its room. */
  order: z.number().int().positive(),
  /** What kind of tool it is, shown as its kicker. */
  kind: z.enum(['Builder', 'Scenarios', 'Analysis', 'Planner', 'Calculator', 'Simulator', 'Exercise', 'Mapper', 'Simulation']),
  /** The question a manager would ask that the tool helps to answer. */
  question: text,
  /** One sentence for the room page and search. */
  summary: text,
  /** The opening paragraph of the tool's page: what it is for. */
  lead: text,
  /** Its status in the IB course: SL and HL, HL only, or enrichment beyond the syllabus. */
  status: z.enum(['SL/HL', 'HL', 'enrichment']),
  /** What the guide asks for, in the platform's words, with its page. */
  statusNote: text,
  /** The guide's depth of teaching for the statements the tool serves. */
  ao: z.array(AO).default([]),
  howTo: z.array(text).min(2),
  limitations: z.array(text).min(2),
  /** How to use the result in an examination answer. */
  inAnswer: text.optional(),
  /** The localStorage key, without the "bb:" prefix that the store adds. */
  storageKey: z.string().regex(/^(people|ops):[a-z0-9-]+$/),
  /** The fictional worked example that is the tool's default state. */
  example: z.object({ name: text, note: text }),
  /** Where to read and practise more: subtopic codes, interactions, cases, Decision Rooms and toolkit tools. */
  related: z
    .object({
      subtopics: ids,
      interactives: ids,
      cases: ids,
      decisions: ids,
      tools: ids,
    })
    .default({ subtopics: [], interactives: [], cases: [], decisions: [], tools: [] }),
});
export type RoomToolGuide = z.infer<typeof guide>;

/* ---------- People and Culture ---------- */

export const ORG_GROUPINGS = ['function', 'product', 'region'] as const;

const orgPost = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: text,
  /** The post this one reports to; the one post at the top has none. */
  reportsTo: z.string().optional(),
  /** How many people hold this post. A post held by several people cannot have reports. */
  count: z.number().int().positive().default(1),
  /** For the posts directly under the top: what the department is grouped by. */
  grouping: z.enum(ORG_GROUPINGS).optional(),
});

/**
 * The schemas, as a tuple to spread into the interaction union. `base` is the
 * interaction base shape (title, purpose, provenance, syllabus, page).
 */
export function roomToolSchemas<B extends z.ZodRawShape>(base: B) {
  return [
    z.object({
      component: z.literal('org-chart-builder'),
      ...base,
      guide,
      organization: text,
      posts: z.array(orgPost).min(2).max(60),
      /** The level removed in the worked example's delayering comparison. */
      delayer: z.number().int().min(2).optional(),
    }),
  ] as const;
}
