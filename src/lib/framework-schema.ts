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

/**
 * The decisions and questions a reader may face, by which the Framework
 * Application Lab (/frameworks/lab/) helps them choose a framework. Each
 * framework names the ones it serves in `decisions`; `tools` are the
 * Strategy Studio tools that answer the question directly, by slug.
 */
export const DECISION_IDS = [
  'position',
  'scan-environment',
  'enter-market',
  'uncertain-future',
  'compete',
  'grow',
  'portfolio',
  'choose-option',
  'business-model',
  'fit',
  'stakeholders',
  'change',
  'motivate',
  'organize',
  'culture',
  'schedule',
  'measure',
  'data',
] as const;
export type DecisionId = (typeof DECISION_IDS)[number];

export const DECISION_INFO: Record<DecisionId, { question: string; situation: string; tools?: string[] }> = {
  position: {
    question: 'Where does the business stand, inside and out, before it decides?',
    situation: 'A decision is coming and you need an honest view of what the business does well and badly, set against what is happening outside it.',
  },
  'scan-environment': {
    question: 'What is changing outside the business, and what could it mean for us?',
    situation: 'Before a launch, an investment or a move into another country, you need the external factors in view and ranked by what they could do to the decision.',
  },
  'enter-market': {
    question: 'Is this market worth entering, or worth staying in?',
    situation: 'A new market is on the table, or profit in the present one is falling and you need to know whether the fault lies in the market or in the business.',
  },
  'uncertain-future': {
    question: 'How do we plan when the future could turn out in very different ways?',
    situation: 'Two or three outside forces could each go either way, the decision will last for years, and a single forecast would be false comfort.',
    tools: ['scenarios'],
  },
  compete: {
    question: 'How will we beat our competitors, and on what basis?',
    situation: 'Rivals are winning customers on price or on something customers value more, and the business has no clear answer to why a buyer should choose it.',
  },
  grow: {
    question: 'Where should the business grow next, and how much risk would each route carry?',
    situation: 'Growth has stalled or the owners want more, and several routes are open: more of the same, new products, new markets or something new altogether.',
  },
  portfolio: {
    question: 'Which products deserve our money, and which should we rethink or drop?',
    situation: 'Cash is limited and several products or units compete for it, some in growing markets and some in declining ones.',
  },
  'choose-option': {
    question: 'Which option should we choose, given the costs and the risks?',
    situation: 'The options are known and their figures can be estimated; the question is which to back, and how confident to be in the choice.',
  },
  'business-model': {
    question: 'Will this business idea work, and will it make money?',
    situation: 'A start-up or a new venture must show how it creates value, reaches customers, covers its costs and survives its riskiest assumptions.',
  },
  fit: {
    question: 'Can our organization actually deliver the strategy we have chosen?',
    situation: 'A strategy suits the market on paper, but the structure, systems, people and capabilities were built for the old one.',
    tools: ['strategic-fit'],
  },
  stakeholders: {
    question: 'Whose support does this decision need, and whose claims come first?',
    situation: 'A decision touches several groups with different power and different claims, and some of them could block it or turn against it.',
    tools: ['stakeholder-map', 'stakeholder-salience'],
  },
  change: {
    question: 'How do we lead a change so that people commit to it and it lasts?',
    situation: 'A new system, structure or way of working is coming, and earlier changes stalled or slid back to the old ways.',
  },
  motivate: {
    question: 'Why are people unmotivated, and what would actually help?',
    situation: 'Labour turnover, absence or errors are rising, or a reward scheme is not changing how people work.',
  },
  organize: {
    question: 'Who should do what, and how should they be led?',
    situation: 'A team, a project or a new site needs clear roles and a way of leading that suits its people and its task.',
  },
  culture: {
    question: 'Will the way we manage and sell travel to another country?',
    situation: 'The business is opening abroad, merging with a foreign firm or managing a team that spans national cultures.',
  },
  schedule: {
    question: 'How long will the project take, and which tasks must not slip?',
    situation: 'A launch, a refit or an implementation has many tasks that depend on one another, and a deadline.',
  },
  measure: {
    question: 'Are we on track, and how would we know?',
    situation: 'Objectives need setting or results need judging, and the measures in use may reward the wrong things.',
  },
  data: {
    question: 'What do the numbers show, and what might happen next?',
    situation: 'Sales, costs or survey results need summarizing, comparing or projecting before anyone acts on them.',
  },
};

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
  /** How it is built: each part (box, axis, stage, element or step of logic) and what it holds. */
  structure: z.array(z.object({ name: z.string().trim().min(1), text: md })).min(2).max(10),
  /** The business situations it suits, and those where another tool serves better. */
  situations: z.object({ suits: z.array(md).min(2), poorFit: z.array(md).min(1) }),
  /** How to read what it produces. */
  interpretation: md,
  /** What its result justifies deciding, and what it does not justify on its own. */
  implications: z.object({ justifies: z.array(md).min(2), doesNotJustify: z.array(md).min(2) }),
  /** Errors commonly made with it, each with the way to avoid it. */
  mistakes: z.array(z.object({ mistake: md, fix: md })).min(3),
  /**
   * The platform's interactive tools that apply it, by page address, with what
   * each does for this framework. `full` applies the framework itself; `part`
   * helps with one part of it. The address must be a tool the Lab knows
   * (src/lib/framework-lab.ts), and the Strategy Studio tool in `studio`, if
   * any, must be listed.
   */
  apply: z
    .array(z.object({ href: z.string().regex(/^\/[a-z0-9/-]*\/$/), scope: z.enum(['full', 'part']), use: md }))
    .default([]),
  /** The decisions and questions the Lab's chooser files it under. */
  decisions: z.array(z.enum(DECISION_IDS)).min(1),
  /** Published works it comes from, by id in the source register. */
  references: ids,
  /** Glossary terms it uses. */
  terms: ids,
  /** Frameworks to read alongside it. */
  related: ids,
  /** Register sources that support statements about the course (the guide, the TSM). */
  sources: ids,
  order: z.number(),
});
export type Framework = z.infer<typeof frameworkSchema>;
