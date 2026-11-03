/**
 * Content schemas for the Entrepreneurship and Innovation Lab: its learning
 * briefings and the data behind its six tools. Kept beside the Lab's code so
 * the shared schema file is untouched; registered as collections in
 * src/content.config.ts and checked by src/lib/integrity-lab.ts.
 *
 * Like src/lib/schemas.ts, this module imports nothing from astro:content, so
 * the unit tests can validate the YAML with it directly.
 */
import { z } from 'astro/zod';
import { CANVAS_BLOCKS, ENTRY_KINDS } from './canvas';
import { FUNDING_KINDS } from './costs';

const md = z.string().trim().min(1);
const slugId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const code = z.string().regex(/^\d\.\d$/);

/* ------------------------------------------------------------------ */
/* Briefings                                                           */
/* ------------------------------------------------------------------ */

const briefingSection = z.object({
  id: slugId,
  title: z.string(),
  /** IB subtopics whose content statements the section covers. Empty for enrichment alone. */
  ib: z.array(code).default([]),
  /** True when the section goes beyond the IB syllabus. A section is IB, enrichment, or both. */
  enrichment: z.boolean().default(false),
  /** Subtopics an enrichment section connects to without being part of them. */
  connects: z.array(code).default([]),
  body: md,
  points: z.array(z.object({ term: z.string(), text: md })).default([]),
  table: z
    .object({
      caption: z.string(),
      /** The header of the first column, which labels the rows. */
      corner: z.string(),
      columns: z.array(z.string()).min(1),
      rows: z.array(z.object({ label: z.string(), cells: z.array(z.string()) })).min(1),
    })
    .optional(),
  /** A worked example about a fictional business. */
  example: z.object({ title: z.string(), text: md }).optional(),
  formulas: z.array(z.object({ name: z.string(), expression: z.string(), note: z.string().optional() })).default([]),
  callout: z.object({ tone: z.enum(['caution', 'framework', 'exam', 'enrichment']), title: z.string(), text: md }).optional(),
});

export const briefingSchema = z.object({
  title: z.string(),
  order: z.number().int().positive(),
  /** The step of the founder's route the briefing belongs to, as a short imperative. */
  step: z.string(),
  /** One sentence under the title. */
  dek: z.string(),
  /** The question a founder is answering. */
  question: z.string(),
  introduction: md,
  /** How the briefing relates to the IB course, in a sentence or two. */
  ibSummary: md,
  sections: z.array(briefingSection).min(3),
  /** Each idea the briefing teaches, with its standing in the IB course: the room's register of what is and is not IB content. */
  ideas: z
    .array(
      z.object({
        idea: z.string(),
        status: z.enum(['ib', 'toolkit', 'enrichment']),
        codes: z.array(code).default([]),
        /** The guide's printed page, for IB and toolkit ideas. */
        page: z.number().int().positive().optional(),
        note: z.string(),
      }),
    )
    .min(1),
  misconceptions: z.array(z.object({ claim: z.string(), correction: md })).min(2),
  /** Start-up terms the IB course does not use, defined here rather than in the course glossary. */
  terms: z.array(z.object({ term: z.string(), definition: md })).default([]),
  /** Course glossary terms the briefing uses. */
  glossary: z.array(z.string()).default([]),
  /** The platform's own questions, with short answers. */
  questions: z.array(z.object({ q: z.string(), a: md })).min(3),
  /** Lab tools to use with it, by id. */
  tools: z.array(slugId).min(1),
  basis: z.array(z.object({ source: z.string(), pages: z.string().optional(), note: z.string().optional() })).min(1),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type Briefing = z.infer<typeof briefingSchema>;
export type BriefingSection = z.infer<typeof briefingSection>;

/* ------------------------------------------------------------------ */
/* The six tools                                                       */
/* ------------------------------------------------------------------ */

const labToolBase = {
  title: z.string(),
  order: z.number().int().positive(),
  /** The page's headline: the question the tool helps a founder answer. */
  question: z.string(),
  /** One line, for lists and search. */
  summary: z.string(),
  lead: md,
  /** The briefing that teaches the ideas behind the tool. */
  briefing: slugId,
  ib: z.object({
    status: z.enum(['ib-toolkit', 'enrichment', 'mixed']),
    statement: md,
    links: z.array(z.object({ code, note: z.string() })).default([]),
  }),
  steps: z.array(md).min(2),
  cautions: z.array(md).min(1),
  /** The fictional venture whose figures fill the tool at first. */
  example: z.object({ name: z.string(), summary: md }),
  /** Terms the tool uses, with what each means here. */
  definitions: z.array(z.object({ term: z.string(), text: md })).default([]),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
};

const currency = z.string().min(1).max(4);
const line = z.object({ id: slugId, label: z.string().min(1), amount: z.number().nonnegative() });

export const labToolSchema = z.discriminatedUnion('kind', [
  z.object({
    ...labToolBase,
    kind: z.literal('canvas'),
    blocks: z.array(z.object({ id: z.enum(CANVAS_BLOCKS), label: z.string(), prompt: z.string(), hint: z.string() })),
    entries: z.array(
      z.object({
        id: slugId,
        block: z.enum(CANVAS_BLOCKS),
        text: z.string().min(1).max(280),
        kind: z.enum(ENTRY_KINDS),
        risk: z.number().int().min(1).max(5),
        note: z.string().max(280),
      }),
    ),
  }),
  z.object({
    ...labToolBase,
    kind: z.literal('costs'),
    currency,
    oneOff: z.array(line).min(1),
    monthly: z.array(line).min(1),
    funding: z.array(line.extend({ kind: z.enum(FUNDING_KINDS) })).min(1),
    contribution: z.number().nonnegative(),
    growth: z.number().min(-50).max(100),
    salesStart: z.number().int().min(1).max(24),
  }),
  z.object({
    ...labToolBase,
    kind: z.literal('revenue'),
    currency,
    streams: z
      .array(
        z.discriminatedUnion('kind', [
          z.object({ id: slugId, kind: z.literal('units'), label: z.string(), price: z.number().nonnegative(), units: z.number().int().nonnegative(), growth: z.number().min(-50).max(100), fee: z.number().min(0).max(100) }),
          z.object({ id: slugId, kind: z.literal('subscription'), label: z.string(), price: z.number().nonnegative(), start: z.number().int().nonnegative(), joining: z.number().int().nonnegative(), growth: z.number().min(-50).max(100), churn: z.number().min(0).max(100), fee: z.number().min(0).max(100) }),
        ]),
      )
      .min(1)
      .max(4),
  }),
  z.object({
    ...labToolBase,
    kind: z.literal('unit-economics'),
    currency,
    defaults: z.object({ spend: z.number().nonnegative(), customers: z.number().int().positive(), revenue: z.number().nonnegative(), variableCost: z.number().nonnegative(), churn: z.number().min(0).max(100), cap: z.number().int().min(1).max(120) }),
    scenarios: z
      .array(
        z.object({
          id: slugId,
          label: z.string(),
          note: z.string(),
          changes: z.object({ spend: z.number().optional(), customers: z.number().optional(), revenue: z.number().optional(), variableCost: z.number().optional(), churn: z.number().optional(), cap: z.number().optional() }),
        }),
      )
      .default([]),
  }),
  z.object({
    ...labToolBase,
    kind: z.literal('feasibility'),
    threshold: z.number().min(1).max(100),
    floor: z.number().int().min(1).max(5),
    criteria: z.array(z.object({ id: slugId, label: z.string(), weight: z.number().int().min(0).max(5), hint: z.string(), mustHave: z.boolean().default(false) })).min(3).max(12),
    ideas: z.array(z.object({ id: slugId, name: z.string(), summary: z.string(), scores: z.record(z.string(), z.number().int().min(1).max(5)) })).min(1).max(3),
  }),
  z.object({
    ...labToolBase,
    kind: z.literal('plan'),
    sections: z.array(z.object({ id: slugId, title: z.string(), prompts: z.array(z.string()).min(2), tools: z.array(slugId).default([]), ib: z.array(code).default([]), words: z.number().int().positive() })).min(6),
  }),
]);
export type LabTool = z.infer<typeof labToolSchema>;
export type LabToolOf<K extends LabTool['kind']> = Extract<LabTool, { kind: K }>;
