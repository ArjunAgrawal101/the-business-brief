/**
 * The frameworks library: one entry per framework, model or tool, each with
 * a diagram from the library, an explanation, a step-by-step method, a
 * fictional example, its strengths and limits, an exercise with guidance,
 * and its links to the glossary, the toolkit and the course.
 *
 * Every framework carries its standing: named in the IB syllabus (with the
 * guide's page), one of the IB toolkit tools (whose full guide lives in the
 * toolkit, not here), or enrichment beyond the course.
 *
 * This module imports nothing from `astro:content`, so tests can use it too.
 */
import { z } from 'astro/zod';
import { level, QUALIFICATION_TAGS } from './schemas';

/** What a framework is for: the groups of the library's index. */
export const FRAMEWORK_GROUPS = ['environment', 'strategy', 'people', 'change', 'performance'] as const;
export type FrameworkGroup = (typeof FRAMEWORK_GROUPS)[number];

export const FRAMEWORK_GROUP_INFO: Record<FrameworkGroup, { title: string; question: string; text: string }> = {
  environment: {
    title: 'Analysing the environment',
    question: 'What is happening around the business, and who can affect it?',
    text: 'Tools for reading a situation before deciding: the forces outside the business, its position inside, and the people with a stake in it.',
  },
  strategy: {
    title: 'Choosing strategy',
    question: 'Where should the business compete, and how will it win?',
    text: 'Frameworks for choosing a direction: where to grow, how to compete, how to make money, and which option carries the better expected return.',
  },
  people: {
    title: 'Organizing people',
    question: 'What moves people, and how should their work be organized?',
    text: 'Theories of motivation and culture, and the frameworks that set out who does what.',
  },
  change: {
    title: 'Managing change',
    question: 'How does the business get from here to there, and bring people with it?',
    text: 'Models for leading change and planning the projects that deliver it.',
  },
  performance: {
    title: 'Measuring performance',
    question: 'How is the business doing, and how would anyone know?',
    text: 'Ways to set targets, read data and judge results, from SMART objectives to the balanced scorecard.',
  },
};

/** A framework's standing in the IB course. */
export const FRAMEWORK_STATUS = ['syllabus', 'toolkit', 'enrichment'] as const;
export type FrameworkStatus = (typeof FRAMEWORK_STATUS)[number];

const md = z.string().trim().min(1);
const ids = z.array(z.string()).default([]);

export const frameworkSchema = z.object({
  name: z.string(),
  /** Other names it goes by; searched, not displayed as headings. */
  aliases: z.array(z.string()).default([]),
  /** One line: what it is. */
  summary: z.string(),
  /** The question the framework helps a manager answer. */
  question: z.string(),
  group: z.enum(FRAMEWORK_GROUPS),
  status: z.enum(FRAMEWORK_STATUS),
  /** The guide's printed page or pages, for a syllabus framework or a toolkit tool, such as "26" or "14 to 15". */
  guidePages: z.string().optional(),
  /** A syllabus framework: the subtopics that name it. A toolkit tool or enrichment: the subtopics it is used with. */
  subtopics: ids,
  /** SL/HL or HL only, as the guide sets it. An enrichment framework is SL/HL. */
  level: level.default('SL/HL'),
  /** Where a learner meets it. Enrichment never carries "ib". */
  qualifications: z.array(z.enum(QUALIFICATION_TAGS)).min(1),
  /** Who it is usually credited to, when it has a known originator. */
  origin: z.string().optional(),
  /** The library diagram that shows it (src/lib/diagrams.ts). */
  diagram: z.string(),
  /** For a toolkit tool: its entry in src/content/tools, whose guide holds the full treatment. */
  tool: z.string().optional(),
  /** The Strategy Studio tool that applies the framework to the reader's own case (src/content/studio), by slug. */
  studio: z.string().optional(),
  /** What it is. */
  explanation: md,
  /** What it is for. */
  purpose: md,
  /** How to use it, step by step. */
  steps: z.array(md).min(3).max(9),
  /** A business example. Always fictional, and labelled so on the page. */
  example: z.object({ fictional: z.literal(true), business: z.string(), title: z.string(), body: md, result: md }),
  advantages: z.array(md).min(2),
  limitations: z.array(md).min(2),
  /** An application exercise, with guidance on what a strong answer does. */
  exercise: z.object({ prompt: md, guidance: z.array(md).min(2) }),
  /** Glossary terms it uses. */
  terms: ids,
  /** Frameworks to read alongside it. */
  related: ids,
  /** Register sources that support statements about the course (the guide, the TSM). */
  sources: ids,
  order: z.number(),
});
export type Framework = z.infer<typeof frameworkSchema>;
