/**
 * Curated framework comparisons (src/content/comparisons/<a>-vs-<b>.yaml): two
 * or three ideas set side by side on the same nine questions, with which to
 * use when. A side may be a framework in the library, a tool of the IB
 * toolkit, or a concept from the syllabus that is not a framework (job
 * production, the current ratio); its standing in the course is worked out
 * from the curriculum file and the toolkit, never typed.
 *
 * This module imports nothing from `astro:content`, so tests can use it too.
 */
import { z } from 'astro/zod';

const md = z.string().trim().min(1);

export const sideSchema = z
  .object({
    name: z.string().trim().min(1),
    /** The framework in the library this side is, when it is one. */
    framework: z.string().optional(),
    /** The IB toolkit tool this side is, when it is one (src/content/tools). */
    tool: z.string().optional(),
    /** The syllabus content statements this side rests on: a subtopic, and words from its statement as the curriculum file has it. */
    syllabus: z.array(z.object({ code: z.string(), statement: z.string().trim().min(3) })).default([]),
    /** Further subtopics to link, besides those of the statements. */
    subtopics: z.array(z.string()).default([]),
    /** Glossary terms for this side. */
    terms: z.array(z.string()).default([]),
    /** SL/HL, or HL only: checked against the statements and the toolkit. */
    level: z.enum(['SL/HL', 'HL']),
    purpose: md,
    structure: md,
    /** The context it suits. */
    context: md,
    strengths: z.array(md).min(2),
    limitations: z.array(md).min(2),
    mistakes: z.array(md).min(2),
    /** A business application. Always fictional, and labelled so on the page. */
    application: z.object({ fictional: z.literal(true), business: z.string().trim().min(1), body: md }),
    /** How to use it in an examination answer: the platform's advice, labelled Recommended strategy. */
    exam: md,
  })
  .strict();

export const comparisonSchema = z
  .object({
    title: z.string().trim().min(1),
    /** The question the comparison settles. */
    question: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    order: z.number(),
    sides: z.array(sideSchema).min(2).max(3),
    /** The essential difference, in a paragraph. */
    difference: md,
    /** Which to use when: a situation, the side it calls for (by position, from 0) and why. */
    choose: z.array(z.object({ when: md, use: z.number().int().min(0), why: md })).min(2),
    /** How they work together, when they do. */
    together: md.optional(),
    /** Register sources for what the page says about the course. */
    sources: z.array(z.string()).default(['ib-bm-guide-2024']),
  })
  .strict();

export type Side = z.infer<typeof sideSchema>;
export type Comparison = z.infer<typeof comparisonSchema>;

export { DIMENSIONS, type DimensionId } from './grid';

export const compareHref = (slug: string) => `/frameworks/compare/${slug}/`;
