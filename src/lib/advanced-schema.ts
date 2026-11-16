/**
 * Advanced Management and Strategy: the schema of a module. A module is a
 * piece of undergraduate, MBA or professional study, kept apart from the IB
 * course: it may say which IB subtopics it builds on (`bridge`), but it is
 * never part of the IB syllabus, coverage or practice.
 *
 * Every module has the same eight parts, in this order: a conceptual
 * foundation, an advanced explanation, models and frameworks, real business
 * applications, case studies, a critical evaluation, a decision exercise and
 * further reading. src/lib/integrity-advanced.ts checks that every source
 * exists, that anything presented as real is sourced, and that no module is
 * thin.
 */
import { z } from 'astro/zod';

const md = z.string().trim().min(1);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'lower case words joined by hyphens');
const sourceIds = z.array(z.string().min(1));

export const ADVANCED_DOMAINS = ['strategy', 'finance', 'leadership', 'marketing', 'operations', 'entrepreneurship'] as const;
export type AdvancedDomain = (typeof ADVANCED_DOMAINS)[number];

export const AUDIENCES = ['undergraduate', 'mba', 'professional'] as const;
export type Audience = (typeof AUDIENCES)[number];

const reference = z.object({
  /** An id in the source register (src/content/sources/*.yaml). */
  source: z.string().min(1),
  /** Why it is worth reading, or what it was used for. */
  note: z.string().trim().min(1),
});

export const advancedModuleSchema = z.object({
  domain: z.enum(ADVANCED_DOMAINS),
  title: z.string().trim().min(3),
  /** Its place in the domain, from 1. */
  order: z.number().int().positive(),
  /** One sentence: the question the module answers. */
  dek: md,
  audience: z.array(z.enum(AUDIENCES)).min(1),
  /** The topics of the owner's brief this module covers, such as "Mergers and acquisitions". */
  covers: z.array(z.string().trim().min(2)).min(1),
  /** Estimated reading time in minutes. */
  minutes: z.number().int().min(5).max(120),
  /** The date the module was written or last checked (YYYY-MM-DD). */
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Where the module starts from in the IB course, and how far beyond it it goes. */
  bridge: z.object({
    codes: z.array(z.string()).default([]),
    text: md,
  }),
  /** 1. The conceptual foundation: the idea in plain terms, before the detail. */
  foundation: md,
  /** 2. The advanced explanation, in sections. */
  advanced: z
    .array(
      z.object({
        id: slug,
        title: z.string().trim().min(3),
        body: md,
      }),
    )
    .min(3),
  /** 3. The models and frameworks, each with where it comes from, how to use it and where it fails. */
  models: z
    .array(
      z.object({
        name: z.string().trim().min(2),
        /** The author or authors and year, for example "Porter (1980)". */
        origin: z.string().trim().min(2),
        summary: md,
        use: md,
        limits: md,
        /** A framework in the library, /frameworks/<id>/. */
        framework: slug.optional(),
        /** A tool on the platform that applies it, as an internal address ending in "/". */
        tool: z
          .string()
          .regex(/^\/[a-z0-9/-]*\/(#[a-z0-9-]+)?$/)
          .optional(),
        sources: sourceIds.min(1),
      }),
    )
    .min(2),
  /** 4. Real business applications (sourced) and illustrative ones (labelled). */
  applications: z
    .array(
      z.object({
        title: z.string().trim().min(3),
        kind: z.enum(['real', 'illustrative']),
        body: md,
        sources: sourceIds.default([]),
        /** For a real application: the date the facts describe, for example "2024" or "2025-03". */
        asOf: z.string().optional(),
      }),
    )
    .min(2),
  /** 5. Case studies: a situation, optional exhibit, and questions. */
  cases: z
    .array(
      z.object({
        title: z.string().trim().min(3),
        fictional: z.boolean(),
        situation: md,
        exhibit: z
          .object({
            caption: z.string().trim().min(3),
            columns: z.array(z.string()).min(2),
            rows: z.array(z.array(z.string())).min(1),
            note: z.string().optional(),
          })
          .optional(),
        questions: z.array(md).min(2),
        sources: sourceIds.default([]),
      }),
    )
    .min(1),
  /** 6. Critical evaluation: the debates, the evidence, the limits. */
  evaluation: md,
  /** 7. A decision to make, with options, criteria and guidance. Always fictional. */
  decision: z.object({
    title: z.string().trim().min(3),
    brief: md,
    fictional: z.literal(true),
    options: z.array(z.object({ label: z.string().trim().min(1), text: md })).min(2),
    criteria: z.array(z.string().trim().min(3)).min(2),
    guidance: md,
  }),
  /** 8. Further reading, from the source register. */
  reading: z.array(reference).min(3),
  /** Sources used in writing the module that are not already listed. */
  basis: z.array(reference).default([]),
});

export type AdvancedModule = z.infer<typeof advancedModuleSchema>;
