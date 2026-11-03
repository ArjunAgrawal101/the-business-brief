/**
 * The Strategy Studio collection (src/content/studio): one entry for the
 * engagement that frames the room, and one for each tool. A tool entry holds
 * what the page says about the tool (purpose, how to use it, its limitations
 * and its standing in the IB course) and its worked example. The example's
 * data is checked by src/lib/integrity-strategy.ts: it must survive the
 * tool's own reader of saved work unchanged and pass the tool's checks, so a
 * typing error in the YAML fails the build.
 */
import { z } from 'astro/zod';

export const STUDIO_KINDS = ['swot', 'steeple', 'five-forces', 'ansoff', 'bcg', 'porter', 'stakeholders', 'decision-tree', 'force-field', 'appraisal'] as const;
export type StudioKind = (typeof STUDIO_KINDS)[number];

const stage = z.enum(['diagnose', 'options', 'decide', 'plan']);

/** Where the tool stands in the IB course, checked against the guide. */
const ibStatus = z.object({
  /** ib-toolkit: one of the guide's fifteen toolkit tools (p. 14). enrichment: not in the guide. */
  kind: z.enum(['ib-toolkit', 'enrichment']),
  /** The guide's level for a toolkit tool. */
  level: z.enum(['SL/HL', 'HL']).optional(),
  /** The tool's entry in src/content/tools, whose level and status must agree. */
  toolkit: z.string().optional(),
  /** Subtopics the tool serves (codes in the curriculum). */
  subtopics: z.array(z.string()).default([]),
  /** The status in a sentence or two, with the guide's pages. */
  text: z.string(),
  /** Parts of the tool that go beyond the guide, such as the TOWS matrix. */
  extensions: z.array(z.object({ name: z.string(), text: z.string() })).default([]),
});

const link = z.object({ label: z.string(), href: z.string().startsWith('/'), note: z.string().optional() });

const toolEntry = z.object({
  type: z.literal('tool'),
  kind: z.enum(STUDIO_KINDS),
  /** The page's address under /strategy-studio/ and the storage key bb:strategy:<slug>. */
  slug: z.string().regex(/^[a-z][a-z0-9-]*$/),
  title: z.string(),
  /** A short name for lists and the engagement rail. */
  short: z.string(),
  order: z.number(),
  stage,
  summary: z.string(),
  purpose: z.string(),
  howTo: z.array(z.string()).min(3),
  limitations: z.array(z.string()).min(2),
  status: ibStatus,
  /** Notes, briefs and guides to read alongside the tool. */
  read: z.array(link).default([]),
  example: z.object({
    title: z.string(),
    situation: z.string(),
    /** The tool's state, exactly as the tool saves it. */
    data: z.record(z.string(), z.unknown()),
  }),
  /** What a high-quality answer does with the tool's output, in the platform's words. */
  inUse: z.string(),
  updated: z.string(),
});

const engagementEntry = z.object({
  type: z.literal('engagement'),
  client: z.string(),
  fictional: z.literal(true),
  setting: z.string(),
  question: z.string(),
  situation: z.string(),
  facts: z.array(z.object({ label: z.string(), value: z.string() })).min(3),
  stages: z
    .array(
      z.object({
        id: stage,
        deliverable: z.string(),
        body: z.string(),
      }),
    )
    .length(4),
  principles: z.array(z.object({ title: z.string(), body: z.string() })).min(2),
  /** Subtopics to read, each with why it matters to strategy. */
  reading: z.array(z.object({ code: z.string(), why: z.string() })).min(2),
  decisionRooms: z.array(z.object({ id: z.string(), why: z.string() })).default([]),
  updated: z.string(),
});

export const studioSchema = z.discriminatedUnion('type', [toolEntry, engagementEntry]);

export type StudioEntry = z.infer<typeof studioSchema>;
export type StudioTool = z.infer<typeof toolEntry>;
export type StudioEngagement = z.infer<typeof engagementEntry>;
