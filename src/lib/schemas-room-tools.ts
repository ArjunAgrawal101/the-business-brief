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

const wholeNumber = z.number().int().nonnegative();

/* ---------- Operations Floor ---------- */

const nonNeg = z.number().nonnegative();

/** One period's figures for the capacity utilization and productivity calculator. */
const periodValues = z.object({
  capacity: z.number().positive(),
  made: nonNeg,
  defects: nonNeg,
  labour: nonNeg,
  capital: nonNeg,
  price: nonNeg,
  inputCost: z.number().positive(),
  fixedCosts: nonNeg,
});

/** Singular and plural names of the unit of output, and the period. */
const unitNames = z.object({ one: text, many: text, period: text });

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
    z.object({
      component: z.literal('workforce-planner'),
      ...base,
      guide,
      organization: text,
      /** Last year's staffing, for labour turnover (HL). */
      lastYear: z.object({ start: wholeNumber, end: wholeNumber, leavers: wholeNumber, retired: wholeNumber }),
      /** A rate to compare the leaving rate with, such as a similar organization's labour turnover. */
      benchmark: z.object({ rate: z.number().min(0).max(100), label: text }).optional(),
      plan: z.object({
        staffNow: wholeNumber,
        /** Leavers other than retirements, per cent of the staff at the start of each year. */
        rate: z.number().min(0).max(100),
        recruitLimit: z.number().int().positive().optional(),
        years: z.array(z.object({ label: text, demand: wholeNumber, retirements: wholeNumber })).min(1).max(6),
      }),
      /** The guide's internal and external factors, and what each means for this plan. */
      factors: z.array(z.object({ name: text, effect: text })).min(3),
    }),
    z.object({
      component: z.literal('capacity-calculator'),
      ...base,
      guide,
      /** The currency symbol shown before money. */
      currency: text,
      units: unitNames,
      /** What capital input is measured in, such as machine hours. */
      capitalLabel: text,
      settings: z.object({ defects: z.enum(['reworked', 'scrapped']), labour: z.enum(['workers', 'hours']) }),
      periods: z.array(z.object({ name: text, values: periodValues })).length(2),
    }),
    z.object({
      component: z.literal('stock-simulator'),
      ...base,
      guide,
      units: z.object({ one: text, many: text }),
      currency: text,
      plan: z.object({
        opening: nonNeg,
        leadTime: z.number().min(0).max(8),
        buffer: nonNeg,
        reorderLevel: nonNeg,
        reorderQty: z.number().positive(),
      }),
      /** Demand in each week, from 4 to 26 weeks. */
      demand: z.array(nonNeg).min(4).max(26),
      /** One order that arrives late in the worked example. */
      late: z.object({ order: z.number().int().min(1).max(20), extraWeeks: z.number().min(0).max(8) }).optional(),
      costs: z.object({ holding: nonNeg, ordering: nonNeg, shortage: nonNeg }),
      /** Where the costs come from. */
      costNote: text,
    }),
    z.object({
      component: z.literal('location-assessment'),
      ...base,
      guide,
      /** The decision, in a sentence or two. */
      decision: text,
      maxScore: z.number().int().positive().default(10),
      maxWeight: z.number().int().positive().default(5),
      /** Scores at or below this are flagged as possible deal-breakers. */
      lowThreshold: z.number().int().nonnegative().default(3),
      factors: z.array(z.object({ id: z.string().regex(/^[a-z0-9-]+$/), label: text, weight: z.number().int().nonnegative() })).min(2).max(10),
      sites: z.array(z.object({ id: z.string().regex(/^[a-z0-9-]+$/), name: text, summary: text, scores: z.record(z.string(), z.number()) })).min(2).max(6),
      /** What the scores leave out, for the judgement. */
      qualitative: z.array(text).min(2),
    }),
    z.object({
      component: z.literal('eoq-calculator'),
      ...base,
      guide,
      units: z.object({ one: text, many: text }),
      currency: text,
      inputs: z.object({
        demand: z.number().positive(),
        orderCost: z.number().positive(),
        holdingCost: z.number().positive(),
        current: z.number().positive(),
        weeks: z.number().positive().max(53),
        buffer: nonNeg,
        price: nonNeg,
      }),
      /** A supplier's quantity discount in the worked example. */
      discount: z.object({ minQty: z.number().positive(), price: nonNeg }).optional(),
      /** The assumptions of the model, listed beside the result. */
      assumptions: z.array(text).min(3),
    }),
  ] as const;
}
