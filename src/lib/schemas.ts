/**
 * Content schemas for The Business Brief.
 *
 * Every piece of educational content is structured data validated here, at
 * build time (by Astro) and in the unit tests (by Vitest). The schemas encode
 * the platform's rules: every teaching block carries a provenance label, every
 * syllabus statement carries a verification status, and simulated data are
 * always declared as simulated.
 *
 * This module imports nothing from `astro:content`, so tests can use it too.
 */
import { z } from 'astro/zod';
import { RATIO_IDS, STATEMENT_FIELDS } from './ratios';

/* ------------------------------------------------------------------ */
/* Shared vocabularies                                                 */
/* ------------------------------------------------------------------ */

/** Where a piece of content comes from. Shown on the page as a label. */
export const PROVENANCE = [
  'ib-requirement',
  'subject-knowledge',
  'curriculum-requirement',
  'source-derived',
  'examiner-observation',
  'external-evidence',
  'simulated-data',
  'aa-framework',
  'original-practice',
  'assessment-explanation',
  'enrichment',
] as const;
export const provenance = z.enum(PROVENANCE);
export type Provenance = z.infer<typeof provenance>;

/** How far a factual claim about a requirement has been checked. */
export const VERIFICATION = ['primary', 'recorded', 'corroborated', 'conflicting', 'unverified', 'pedagogical'] as const;
export const verification = z.enum(VERIFICATION);
export type Verification = z.infer<typeof verification>;

/** Level of a single item or block. */
export const level = z.enum(['SL/HL', 'HL']);
export type Level = z.infer<typeof level>;

/** Level of a whole subtopic. */
export const topicLevel = z.enum(['SL/HL', 'HL', 'SL/HL with HL-only content']);
export type TopicLevel = z.infer<typeof topicLevel>;

export const CONCEPTS = ['change', 'creativity', 'ethics', 'sustainability'] as const;
export const conceptId = z.enum(CONCEPTS);
export type ConceptId = z.infer<typeof conceptId>;

export const PATHWAYS = ['ib-dp', 'secondary', 'undergraduate', 'mba', 'teachers', 'entrepreneurs', 'independent'] as const;
export const pathwayId = z.enum(PATHWAYS);
export type PathwayId = z.infer<typeof pathwayId>;

export const AO = ['AO1', 'AO2', 'AO3', 'AO4'] as const;
export const ao = z.enum(AO);

/** Text with light inline formatting: **bold**, *italic*, `code`, [link](/path). Paragraphs are separated by blank lines. */
const md = z.string().trim().min(1);

const ids = z.array(z.string()).default([]);

/* ------------------------------------------------------------------ */
/* Teaching blocks                                                     */
/* ------------------------------------------------------------------ */

const blockBase = {
  id: z.string().optional(),
  level: level.default('SL/HL'),
  provenance,
  sources: ids,
};

export const INTERACTIVE_COMPONENTS = [
  'cost-classifier',
  'break-even-workspace',
  'error-diagnosis',
  'ansoff-placer',
  'decision-tree-lab',
  'force-field-builder',
  'style-matcher',
  'functions-sorter',
  'scale-explorer',
  'special-order',
] as const;

export const block = z.discriminatedUnion('type', [
  z.object({ type: z.literal('prose'), title: z.string().optional(), body: md, ...blockBase }),
  z.object({ type: z.literal('definition'), term: z.string(), body: md, note: md.optional(), ...blockBase }),
  z.object({
    type: z.literal('list'),
    title: z.string().optional(),
    intro: md.optional(),
    style: z.enum(['bullets', 'numbered', 'pairs']).default('bullets'),
    items: z.array(z.object({ label: z.string().optional(), body: md })).min(1),
    ...blockBase,
  }),
  z.object({
    type: z.literal('comparison'),
    title: z.string(),
    caption: md.optional(),
    columns: z.array(z.string()).min(1),
    rows: z.array(z.object({ label: z.string(), cells: z.array(md) })).min(1),
    ...blockBase,
  }),
  z.object({
    type: z.literal('mechanism'),
    title: z.string(),
    intro: md.optional(),
    steps: z.array(md).min(2),
    conclusion: md.optional(),
    ...blockBase,
  }),
  z.object({ type: z.literal('misconception'), claim: md, correction: md, why: md.optional(), ...blockBase }),
  z.object({
    type: z.literal('callout'),
    tone: z.enum(['note', 'exam', 'caution', 'enrichment', 'framework']),
    title: z.string(),
    body: md,
    ...blockBase,
  }),
  z.object({
    type: z.literal('formula'),
    name: z.string(),
    expression: z.string(),
    variables: z.array(z.object({ symbol: z.string(), meaning: z.string() })).default([]),
    note: md.optional(),
    ...blockBase,
  }),
  z.object({
    type: z.literal('worked'),
    title: z.string(),
    calculation: z.string(),
    inputs: z.record(z.string(), z.number()),
    currency: z.string().default(''),
    labels: z.object({ unit: z.string(), units: z.string(), period: z.string() }).optional(),
    context: md.optional(),
    interpretation: md,
    implication: md,
    ...blockBase,
  }),
  z.object({
    type: z.literal('interactive'),
    component: z.enum(INTERACTIVE_COMPONENTS),
    title: z.string(),
    intro: md.optional(),
    ref: z.string().optional(),
    ...blockBase,
  }),
  z.object({
    type: z.literal('exhibit'),
    case: z.string(),
    exhibit: z.string(),
    commentary: md.optional(),
    ...blockBase,
  }),
  z.object({ type: z.literal('example'), title: z.string(), body: md, ...blockBase }),
]);
export type Block = z.infer<typeof block>;

/* ------------------------------------------------------------------ */
/* Topics: the learning experiences                                    */
/* ------------------------------------------------------------------ */

export const SECTION_KINDS = ['situation', 'learn', 'evidence', 'tools', 'decide', 'evaluate', 'assess', 'teach'] as const;

export const topicSchema = z.object({
  title: z.string(),
  code: z.string().regex(/^[1-5]\.\d$/),
  unit: z.string(),
  qualification: z.literal('ib-dp-bm'),
  level: topicLevel,
  status: z.enum(['complete', 'draft']),
  summary: z.string(),
  decisionQuestion: z.string(),
  situation: md,
  whyItMatters: md,
  syllabus: z.object({
    verification,
    note: md,
    items: z.array(z.object({ text: z.string(), level, verification })).min(1),
  }),
  objectives: z.array(z.object({ text: z.string(), level: level.default('SL/HL') })).min(3),
  sections: z
    .array(
      z.object({
        id: z.string(),
        kind: z.enum(SECTION_KINDS),
        title: z.string(),
        dek: md.optional(),
        blocks: z.array(block).min(1),
      }),
    )
    .min(4),
  conceptLens: z
    .array(z.object({ concept: conceptId, question: z.string(), insight: md }))
    .length(4),
  lenses: z
    .array(z.object({ pathway: pathwayId, title: z.string(), body: md, provenance }))
    .default([]),
  teaching: z.object({
    sequence: z.array(z.object({ minutes: z.number().int().positive(), activity: md })).min(3),
    prompts: z.array(z.string()).min(3),
    notes: md.optional(),
  }),
  revision: z.object({
    keyPoints: z.array(md).min(4),
    retrieval: z.array(z.object({ q: z.string(), a: md })).min(5),
    traps: z.array(md).min(3),
  }),
  related: z.object({
    cases: ids,
    decisions: ids,
    tools: ids,
    calculations: ids,
    questions: ids,
    topics: ids,
    glossary: ids,
  }),
  syllabusLinks: z.array(z.string()).default([]),
  sources: ids,
  updated: z.coerce.date(),
});
export type Topic = z.infer<typeof topicSchema>;

/* ------------------------------------------------------------------ */
/* Cases                                                               */
/* ------------------------------------------------------------------ */

const cell = z.union([z.string(), z.number()]);

export const exhibitSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.enum(['table', 'kpis', 'list', 'quote']),
  provenance,
  note: md.optional(),
  columns: z
    .array(
      z.object({
        label: z.string(),
        numeric: z.boolean().default(false),
        /** plain: as written; money: whole numbers without decimals, others with two; d1 and d2: fixed decimals. */
        format: z.enum(['plain', 'money', 'd1', 'd2']).default('plain'),
      }),
    )
    .optional(),
  rows: z.array(z.array(cell)).optional(),
  footer: z.array(cell).optional(),
  /** When true, the footer must equal the column sums of the numeric columns (checked by tests). */
  footerIsSum: z.boolean().default(false),
  items: z.array(z.object({ label: z.string(), value: z.string(), note: z.string().optional() })).optional(),
  quote: z.object({ text: md, attribution: z.string() }).optional(),
  source: md,
});
export type Exhibit = z.infer<typeof exhibitSchema>;

export const caseSchema = z.object({
  title: z.string(),
  dek: z.string(),
  kind: z.enum(['fictional', 'real']),
  dataStatus: z.enum(['simulated', 'real', 'mixed']),
  organization: z.object({
    name: z.string(),
    sector: z.string(),
    location: z.string(),
    size: z.string(),
    legalForm: z.string().optional(),
  }),
  currency: z.object({ code: z.string(), symbol: z.string(), unit: z.string() }),
  decision: z.string(),
  brief: md,
  narrative: z.array(md).min(3),
  exhibits: z.array(exhibitSchema).min(3),
  constraints: z.array(md).min(2),
  stakeholders: z
    .array(
      z.object({
        name: z.string(),
        interest: md,
        influence: z.enum(['high', 'medium', 'low']),
        stake: z.enum(['high', 'medium', 'low']),
        concern: md,
      }),
    )
    .min(3),
  options: z
    .array(
      z.object({
        id: z.string(),
        /** Cases with more than one decision group their options, for example "Pricing" and "The hotel order". */
        group: z.string().optional(),
        label: z.string(),
        summary: md,
        requires: md,
        upside: md,
        risks: md,
        evidence: ids,
      }),
    )
    .min(3),
  analysis: z.object({
    data: z.array(md).min(2),
    insight: z.array(md).min(2),
    options: z.array(md).min(2),
    recommendation: md,
    caveat: md,
  }),
  method: md,
  topics: ids,
  tools: ids,
  concepts: z.array(conceptId).default([]),
  calculations: ids,
  questions: ids,
  decisionRoom: z.string().optional(),
  sources: ids,
  updated: z.coerce.date(),
});
export type CaseEntry = z.infer<typeof caseSchema>;

/* ------------------------------------------------------------------ */
/* Decision Rooms                                                      */
/* ------------------------------------------------------------------ */

const metricValue = z.union([z.number(), z.string()]);

export const decisionSchema = z.object({
  title: z.string(),
  case: z.string(),
  dek: z.string(),
  role: z.string(),
  briefing: md,
  objectives: z.array(z.string()).min(2),
  evidence: ids,
  metrics: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        unit: z.string().default(''),
        better: z.enum(['higher', 'lower', 'context']),
        note: z.string().optional(),
      }),
    )
    .min(3),
  baseline: z.record(z.string(), metricValue),
  rounds: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        question: z.string(),
        help: md.optional(),
        choices: z
          .array(
            z.object({
              id: z.string(),
              label: z.string(),
              detail: md,
              /** In a later round: the first-round choice this follows. Omitted, it follows any first-round choice. */
              followsFrom: z.string().optional(),
              outcome: z.object({
                headline: z.string(),
                narrative: md,
                metrics: z.record(z.string(), metricValue),
                stakeholders: z
                  .array(z.object({ name: z.string(), reaction: md, mood: z.enum(['positive', 'mixed', 'negative']) }))
                  .min(2),
                risks: z.array(md).min(1),
                theory: md,
              }),
            }),
          )
          .min(2),
      }),
    )
    .min(1)
    .max(3),
  debrief: z.object({
    tradeoffs: z.array(md).min(3),
    evidenceThatMatters: z.array(md).min(2),
    changeYourMind: z.array(z.string()).min(2),
    misconceptions: z.array(md).min(1),
    examLink: md,
  }),
  topics: ids,
  questions: ids,
  updated: z.coerce.date(),
});
export type Decision = z.infer<typeof decisionSchema>;

/* ------------------------------------------------------------------ */
/* Toolkit                                                             */
/* ------------------------------------------------------------------ */

export const TOOL_CLASSES = ['situational', 'planning', 'decision-making'] as const;

const toolCommon = {
  name: z.string(),
  /** The TSM's classification (p. 26): situational, planning or decision-making. A tool can fit more than one. */
  classes: z.array(z.enum(TOOL_CLASSES)).min(1),
  /** "tsm" when the TSM classifies the tool itself; "platform" when the class is the platform's reading. */
  classSource: z.enum(['tsm', 'platform']),
  /** Units the guide suggests integrating the tool with (p. 14). */
  units: z.array(z.number().int().min(1).max(5)).min(1),
  /** What the guide says the tool includes, where it says. */
  includes: z.array(z.string()).default([]),
  ibStatus: z.enum(['ib-toolkit', 'pedagogical-framework', 'enrichment']),
  level,
  verification,
  verificationNote: z.string().optional(),
  summary: z.string(),
  order: z.number(),
};

export const toolSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('planned'), ...toolCommon }),
  z.object({
    status: z.literal('complete'),
    ...toolCommon,
    purpose: md,
    whenToUse: z.array(md).min(2),
    construct: z.array(md).min(3),
    evidence: z.array(md).min(2),
    reveals: z.array(md).min(2),
    doesNotReveal: z.array(md).min(2),
    limitations: z.array(md).min(2),
    application: z.object({ case: z.string(), title: z.string(), body: md, result: md }),
    examRelevance: md,
    commonErrors: z.array(md).min(2),
    /** The interaction that applies the tool, by id (src/content/interactives). */
    interactive: z.string().optional(),
    topics: ids,
    cases: ids,
    sources: ids,
    updated: z.coerce.date(),
  }),
]);
export type Tool = z.infer<typeof toolSchema>;

/* ------------------------------------------------------------------ */
/* Calculations                                                        */
/* ------------------------------------------------------------------ */

export const calculationSchema = z.object({
  name: z.string(),
  status: z.enum(['complete', 'planned']),
  group: z.enum(['costs-revenue', 'break-even', 'contribution', 'decision', 'scale', 'people', 'ratios', 'cash-flow', 'investment', 'operations', 'marketing']),
  syllabus: z.array(z.object({ code: z.string(), note: z.string().optional() })).min(1),
  verification,
  level,
  formula: z.string(),
  variables: z.array(z.object({ symbol: z.string(), meaning: z.string(), unit: z.string() })).min(1),
  unit: z.string(),
  interpretation: md,
  errors: z.array(md).min(1),
  /** The page where the calculation is worked interactively. */
  page: z.string().regex(/^\/.*\/$/),
  /** A worked example from a case, shown on the Finance Desk in eight parts. */
  example: z
    .object({
      title: z.string(),
      case: z.string().optional(),
      currency: z.string().default(''),
      labels: z.object({ unit: z.string(), units: z.string(), period: z.string() }).optional(),
      inputs: z.record(z.string(), z.number()).default({}),
      /** For expected values: one option of a decision tree interaction. */
      tree: z.object({ interactive: z.string(), option: z.string() }).optional(),
      interpretation: md,
      implication: md,
    })
    .optional(),
  provenance,
  order: z.number(),
});
export type Calculation = z.infer<typeof calculationSchema>;

/* ------------------------------------------------------------------ */
/* Assessment: original practice questions                             */
/* ------------------------------------------------------------------ */

export const questionSchema = z.object({
  title: z.string(),
  qualification: z.literal('ib-dp-bm'),
  level,
  paperStyle: z.enum(['paper-1', 'paper-2', 'paper-3', 'ia-skill', 'general']),
  topic: z.string(),
  syllabus: z.array(z.string()).min(1),
  commandTerm: z.string(),
  ao: ao,
  marks: z.number().int().positive(),
  case: z.string().optional(),
  exhibits: ids,
  stimulus: md.optional(),
  prompt: md,
  skills: z.array(z.string()).min(1),
  requiresCalculation: z.boolean().default(false),
  requiresEvaluation: z.boolean().default(false),
  markscheme: z.object({
    kind: z.enum(['points', 'levels', 'calculation', 'criteria']),
    guidance: md.optional(),
    points: z.array(z.object({ marks: z.number().int().positive(), text: md })).default([]),
    levels: z.array(z.object({ marks: z.string(), descriptor: md })).default([]),
    /** Assessment criteria by name and maximum mark, each with the platform's own self-check prompt (never the IB's descriptors). */
    criteria: z.array(z.object({ id: z.string(), name: z.string(), marks: z.number().int().positive(), prompt: md })).default([]),
    answer: md.optional(),
    exemplar: md.optional(),
  }),
  errors: z.array(md).min(1),
  provenance: z.literal('original-practice'),
  order: z.number(),
});
export type Question = z.infer<typeof questionSchema>;

/* ------------------------------------------------------------------ */
/* Curriculum, assessment structure, command terms                     */
/* ------------------------------------------------------------------ */

const hours = z.object({ sl: z.number().int().nonnegative(), hl: z.number().int().nonnegative() });

export const curriculumSchema = z.object({
  name: z.string(),
  shortName: z.string(),
  awardingBody: z.string(),
  guide: z.string(),
  verification,
  note: md,
  /** Recommended teaching hours outside the units (toolkit, paper 1 research, IA) and in total. */
  hours: z.object({ toolkit: hours, paper1Research: hours, internalAssessment: hours, total: hours }).optional(),
  units: z
    .array(
      z.object({
        id: z.string(),
        number: z.number().int(),
        title: z.string(),
        verification,
        hours: hours.optional(),
        /** The guide page where the unit's content begins. */
        page: z.number().int().positive().optional(),
        /** Toolkit tools the guide suggests integrating with this unit. */
        tools: ids,
        subtopics: z
          .array(
            z.object({
              code: z.string(),
              title: z.string(),
              level: topicLevel,
              verification,
              page: z.number().int().positive().optional(),
              note: z.string().optional(),
              topic: z.string().optional(),
              tools: ids,
              calculations: ids,
              /** Content statements in the platform's words, with the guide's depth of teaching and HL status. */
              content: z
                .array(z.object({ text: z.string(), ao: z.array(ao).min(1), level: level.default('SL/HL') }))
                .default([]),
            }),
          )
          .min(1),
      }),
    )
    .length(5),
  concepts: z.object({ list: z.array(conceptId).length(4), verification, note: z.string() }),
  sources: ids,
});
export type Curriculum = z.infer<typeof curriculumSchema>;

export const assessmentSchema = z.object({
  name: z.string(),
  short: z.string(),
  levels: z.enum(['SL and HL', 'HL only']),
  order: z.number(),
  summary: z.string(),
  facts: z.array(z.object({ text: z.string(), status: verification, sources: ids, location: z.string().optional() })).min(1),
  /** Duration, marks and weighting at each level, from the guide's assessment outlines (pp. 39 to 40). */
  outline: z
    .object({
      sl: z.object({ duration: z.string(), marks: z.number().int(), weight: z.number() }).optional(),
      hl: z.object({ duration: z.string(), marks: z.number().int(), weight: z.number() }).optional(),
    })
    .optional(),
  /** Sections or questions of the component, from the guide. */
  sections: z
    .array(z.object({ name: z.string(), marks: z.string(), task: md, aos: z.array(ao).min(1) }))
    .default([]),
  /** Assessment criteria by name and maximum mark (descriptors are not reproduced). */
  criteria: z.array(z.object({ id: z.string(), name: z.string(), marks: z.number().int().positive() })).default([]),
  requirements: z.array(md).default([]),
  /** Advice from the IB teacher support material, paraphrased, with its page. */
  ibGuidance: z.array(z.object({ text: md, location: z.string() })).default([]),
  notStated: z.array(z.string()).min(1),
  rewards: z.array(md).min(2),
  preparation: z.array(md).min(3),
  errors: z.array(md).min(2),
  questions: ids,
});
export type AssessmentComponent = z.infer<typeof assessmentSchema>;

export const commandTermSchema = z.object({
  term: z.string(),
  ao,
  aoStatus: verification,
  /** The platform's explanation of the term. */
  definition: z.string(),
  /** "platform" when the wording is the platform's; otherwise a source id. */
  definitionSource: z.string(),
  definitionStatus: verification,
  /** The guide page with the official definition. */
  officialPage: z.number().int().positive().optional(),
  guidance: md,
  stem: z.string(),
  pitfall: md,
  order: z.number(),
});
export type CommandTerm = z.infer<typeof commandTermSchema>;

/* ------------------------------------------------------------------ */
/* Concepts, glossary, pathways, modules                               */
/* ------------------------------------------------------------------ */

export const conceptSchema = z.object({
  name: z.string(),
  summary: md,
  questions: z.array(z.string()).min(3),
  inPractice: md,
  provenance,
  order: z.number(),
});

export const glossarySchema = z.object({
  term: z.string(),
  definition: md,
  topics: z.array(z.string()).min(1),
  level: level.default('SL/HL'),
  provenance,
  related: ids,
});

export const pathwaySchema = z.object({
  name: z.string(),
  audience: z.string(),
  promise: z.string(),
  status: z.enum(['live', 'partial', 'planned']),
  order: z.number(),
  intro: md,
  available: z.array(z.object({ label: z.string(), href: z.string(), note: z.string() })).min(1),
  planned: z.array(z.string()).default([]),
  principles: z.array(md).min(2),
  caution: md.optional(),
});

export const moduleSchema = z.object({
  name: z.string(),
  purpose: z.string(),
  status: z.enum(['live', 'partial', 'planned']),
  href: z.string().optional(),
  contains: z.array(z.string()).default([]),
  order: z.number(),
  /** A longer introduction for the room's own page. */
  lead: z.string().optional(),
  /** What the room holds, for its page: each item must be a working page or anchor. */
  items: z
    .array(
      z.object({
        kind: z.enum(['Brief', 'Case', 'Case lab', 'Decision Room', 'Interaction', 'Workspace', 'Guide', 'Calculation', 'Planner', 'Practice']),
        title: z.string(),
        href: z.string().startsWith('/'),
        text: z.string(),
        level: z.enum(['SL/HL', 'HL']).default('SL/HL'),
      }),
    )
    .default([]),
  /** Syllabus subtopics the room's material serves (codes in the IB curriculum). */
  syllabus: z.array(z.string()).default([]),
  /** What is planned for the room and not yet built. Never linked. */
  planned: z.array(z.string()).default([]),
});

/* ------------------------------------------------------------------ */
/* Sources and claims                                                  */
/* ------------------------------------------------------------------ */

export const sourceSchema = z.object({
  title: z.string(),
  author: z.string().optional(),
  publisher: z.string().optional(),
  year: z.string().optional(),
  kind: z.enum([
    'ib-official',
    'ib-record',
    'ib-other-subject',
    'creator',
    'academic',
    'organization',
    'press',
    'secondary-education',
    'method',
  ]),
  availability: z.enum(['supplied', 'not-available', 'referenced', 'web-search', 'repository']),
  url: z.url().optional(),
  accessed: z.string().optional(),
  note: md,
});

export const claimSchema = z.object({
  statement: z.string(),
  sources: z.array(z.string()).min(1),
  location: z.string().optional(),
  status: verification,
  checked: z.string(),
  usedIn: z.array(z.string()).min(1),
  note: z.string().optional(),
});

/* ------------------------------------------------------------------ */
/* Interactions: the data behind each learning interaction             */
/* ------------------------------------------------------------------ */

const interactiveBase = {
  title: z.string(),
  /** What the learner must understand, decide and learn from it (shown to teachers; documented in docs/INTERACTIONS.md). */
  purpose: z.string(),
  provenance,
  /** IB subtopics the interaction serves, for the coverage map. */
  syllabus: z.array(z.string()).default([]),
  /** The page where the interaction lives; its anchor is #ix-<id>. */
  page: z.string().regex(/^\/.*\/$/).optional(),
};

export const ANSOFF = ['market-penetration', 'product-development', 'market-development', 'diversification'] as const;
export const STYLES = ['autocratic', 'paternalistic', 'democratic', 'laissez-faire', 'situational'] as const;
export const FUNCTIONS = ['planning', 'organizing', 'commanding', 'coordinating', 'controlling'] as const;

/** A task inside a case lab stage. */
const labOption = z.object({ value: z.string(), label: z.string() });
const labTask = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('sort'),
    id: z.string(),
    question: z.string(),
    categories: z.array(labOption).min(2),
    items: z
      .array(
        z.object({
          id: z.string(),
          text: z.string(),
          right: z.array(z.string()).min(1),
          partial: z.array(z.string()).default([]),
          explanation: md,
          evidence: ids,
        }),
      )
      .min(2),
  }),
  z.object({
    kind: z.literal('choose'),
    id: z.string(),
    question: z.string(),
    options: z.array(labOption).min(2),
    right: z.array(z.string()).min(1),
    partial: z.array(z.string()).default([]),
    answer: z.string(),
    explanation: md,
  }),
  z.object({
    kind: z.literal('plan'),
    id: z.string(),
    question: z.string(),
    deadline: z.object({ week: z.number().int().positive(), label: z.string() }),
    activities: z.array(z.object({ id: z.string(), label: z.string(), weeks: z.number().int().positive(), after: ids })).min(3),
    /** One activity whose duration the learner can change. */
    vary: z.object({ activity: z.string(), label: z.string(), weeks: z.array(z.number().int().positive()).min(2) }),
  }),
  z.object({
    kind: z.literal('exhibit'),
    id: z.string(),
    title: z.string(),
    columns: z.array(z.string()).min(2),
    rows: z.array(z.array(z.union([z.string(), z.number()]))).min(1),
    note: z.string().optional(),
  }),
]);
export type LabTask = z.infer<typeof labTask>;

/** The line items of one year's statement of profit or loss and statement of financial position. */
const statementFigures = z.object({
  salesRevenue: z.number().nonnegative(),
  costOfSales: z.number().nonnegative(),
  expenses: z.number().nonnegative(),
  interest: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  dividends: z.number().nonnegative(),
  propertyPlantEquipment: z.number().nonnegative(),
  accumulatedDepreciation: z.number().nonnegative(),
  cash: z.number().nonnegative(),
  debtors: z.number().nonnegative(),
  stock: z.number().nonnegative(),
  bankOverdraft: z.number().nonnegative(),
  tradeCreditors: z.number().nonnegative(),
  otherShortTermLoans: z.number().nonnegative(),
  longTermBorrowings: z.number().nonnegative(),
  shareCapital: z.number().nonnegative(),
  retainedEarnings: z.number(),
});

export const interactiveSchema = z.discriminatedUnion('component', [
  z.object({
    component: z.literal('cost-classifier'),
    ...interactiveBase,
    costObject: z.string(),
    items: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          detail: z.string(),
          behaviour: z.enum(['fixed', 'variable', 'semi-variable']),
          directness: z.enum(['direct', 'indirect']),
          explanation: md,
        }),
      )
      .min(5),
  }),
  z.object({
    component: z.literal('error-diagnosis'),
    ...interactiveBase,
    items: z
      .array(
        z.object({
          id: z.string(),
          task: md,
          lines: z.array(z.string()).min(3),
          errorLine: z.number().int().nonnegative(),
          explanation: md,
          correction: md,
        }),
      )
      .min(2),
  }),
  z.object({
    component: z.literal('ansoff-placer'),
    ...interactiveBase,
    items: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          detail: z.string(),
          answer: z.enum(ANSOFF),
          /** Placements that can also be argued, with the reason. */
          arguable: z.array(z.enum(ANSOFF)).default([]),
          explanation: md,
        }),
      )
      .min(3),
  }),
  z.object({
    component: z.literal('decision-tree-lab'),
    ...interactiveBase,
    currency: z.string(),
    unit: z.string(),
    question: z.string(),
    options: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          cost: z.number(),
          outcomes: z.array(z.object({ label: z.string(), probability: z.number(), payoff: z.number() })).min(2),
        }),
      )
      .min(2),
    caution: md,
  }),
  z.object({
    component: z.literal('force-field-builder'),
    ...interactiveBase,
    change: z.string(),
    driving: z.array(z.object({ label: z.string(), strength: z.number().int().min(1).max(5) })).min(2),
    restraining: z.array(z.object({ label: z.string(), strength: z.number().int().min(1).max(5) })).min(2),
    caution: md,
  }),
  z.object({
    component: z.literal('style-matcher'),
    ...interactiveBase,
    scenarios: z
      .array(
        z.object({
          id: z.string(),
          situation: md,
          strong: z.array(z.enum(STYLES)).min(1),
          defensible: z.array(z.enum(STYLES)).default([]),
          explanation: md,
        }),
      )
      .min(4),
  }),
  z.object({
    component: z.literal('functions-sorter'),
    ...interactiveBase,
    items: z
      .array(z.object({ id: z.string(), activity: z.string(), answer: z.enum(FUNCTIONS), explanation: md }))
      .min(5),
  }),
  z.object({
    component: z.literal('scale-explorer'),
    ...interactiveBase,
    mealsPerOutlet: z.number().positive(),
    foodPerMealAt4: z.number().positive(),
    purchasingSavingPerDoubling: z.number().min(0).max(0.2),
    outletFixedPerOutlet: z.number().positive(),
    centralBase: z.number().nonnegative(),
    centralPerOutlet: z.number().nonnegative(),
    coordinationThreshold: z.number().int().positive(),
    coordinationFactor: z.number().nonnegative(),
    maxOutlets: z.number().int().min(8).max(40),
    marks: z.array(z.object({ outlets: z.number().int(), label: z.string() })).default([]),
    currency: z.string(),
  }),
  z.object({
    component: z.literal('break-even-workspace'),
    ...interactiveBase,
    case: z.string(),
    currency: z.string(),
    labels: z.object({ unit: z.string(), units: z.string(), period: z.string() }),
    defaults: z.object({
      price: z.number().positive(),
      /** Variable cost per unit, excluding costs that are a share of the price. */
      variableCost: z.number().nonnegative(),
      /** Costs that are a share of the price, such as card fees, in per cent. */
      priceShare: z.number().min(0).max(100).default(0),
      fixedCosts: z.number().nonnegative(),
      quantity: z.number().nonnegative(),
      targetProfit: z.number(),
      capacity: z.number().positive(),
    }),
    scenarios: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          note: z.string(),
          set: z.object({
            price: z.number().optional(),
            variableCost: z.number().optional(),
            priceShare: z.number().optional(),
            fixedCosts: z.number().optional(),
            quantity: z.number().optional(),
          }),
        }),
      )
      .min(2),
  }),
  z.object({
    component: z.literal('special-order'),
    ...interactiveBase,
    case: z.string(),
    currency: z.string(),
    labels: z.object({ unit: z.string(), units: z.string(), period: z.string() }),
    defaults: z.object({
      orderPrice: z.number().positive(),
      variableCost: z.number().nonnegative(),
      quantity: z.number().int().positive(),
      extraFixedCosts: z.number().nonnegative(),
      regularSales: z.number().nonnegative(),
      capacity: z.number().positive(),
      fullCostPerUnit: z.number().positive(),
      /** Contribution lost on each regular sale the order displaces when capacity runs out. */
      regularContribution: z.number().nonnegative(),
    }),
    scenarios: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          note: z.string(),
          set: z.object({
            orderPrice: z.number().optional(),
            variableCost: z.number().optional(),
            quantity: z.number().optional(),
            extraFixedCosts: z.number().optional(),
            regularSales: z.number().optional(),
          }),
        }),
      )
      .default([]),
    /** Hints shown under particular inputs, keyed by input name. */
    hints: z.record(z.string(), z.string()).default({}),
    questions: z.array(z.string()).min(2),
  }),
  z.object({
    component: z.literal('cash-flow-lab'),
    ...interactiveBase,
    case: z.string(),
    /** The months, the opening balance and every assumption behind the forecast (see src/lib/cashflow.ts). */
    scenario: z.object({
      months: z.array(z.string()).min(3).max(12),
      currency: z.string(),
      opening: z.number(),
      overdraftLimit: z.number().nonnegative(),
      price: z.number().positive(),
      sold: z.array(z.number().int().nonnegative()),
      cardShare: z.number().min(0).max(100),
      perUnit: z.object({ firing: z.number(), materials: z.number(), pieceRate: z.number(), packaging: z.number() }),
      fixed: z.object({ rent: z.number(), lease: z.number(), salaries: z.number(), marketing: z.number(), overheads: z.number(), standingCharge: z.number() }),
      order: z.object({ label: z.string(), units: z.number().int().positive(), price: z.number().positive(), packaging: z.number(), setup: z.number(), month: z.number().int().nonnegative(), paidMonth: z.number().int().nonnegative() }),
      investment: z.object({ label: z.string(), cost: z.number().positive(), month: z.number().int().nonnegative(), lifeYears: z.number().positive() }),
    }),
    /** Ways of paying for the investment: the learner chooses one. */
    finance: z
      .array(
        z.discriminatedUnion('kind', [
          z.object({ id: z.string(), kind: z.literal('buy'), label: z.string(), note: z.string() }),
          z.object({ id: z.string(), kind: z.literal('lease'), label: z.string(), note: z.string(), monthly: z.number().positive() }),
          z.object({ id: z.string(), kind: z.literal('loan'), label: z.string(), note: z.string(), amount: z.number().positive(), repayment: z.number().positive(), interest: z.number().nonnegative() }),
          z.object({ id: z.string(), kind: z.literal('delay'), label: z.string(), note: z.string(), month: z.number().int().nonnegative() }),
          z.object({ id: z.string(), kind: z.literal('none'), label: z.string(), note: z.string() }),
        ]),
      )
      .min(2),
    /** Working capital measures: the learner may combine any of them. */
    measures: z
      .array(
        z.discriminatedUnion('kind', [
          z.object({ id: z.string(), kind: z.literal('deposit'), label: z.string(), note: z.string(), share: z.number().min(0).max(100) }),
          z.object({ id: z.string(), kind: z.literal('credit'), label: z.string(), note: z.string(), months: z.number().int().min(1).max(3) }),
          z.object({ id: z.string(), kind: z.literal('cut-marketing'), label: z.string(), note: z.string(), value: z.number().nonnegative(), from: z.number().int().nonnegative() }),
          z.object({ id: z.string(), kind: z.literal('overdraft'), label: z.string(), note: z.string(), limit: z.number().positive() }),
        ]),
      )
      .default([]),
    /** Questions on the default forecast, checked with the shared quiz engine. */
    questions: z
      .array(
        z.object({
          id: z.string(),
          prompt: md,
          options: z.array(z.object({ value: z.string(), label: z.string() })).min(2),
          right: z.array(z.string()).min(1),
          partial: z.array(z.string()).default([]),
          answer: z.string(),
          explanation: md,
        }),
      )
      .min(1),
  }),
  z.object({
    component: z.literal('case-lab'),
    ...interactiveBase,
    case: z.string(),
    /** Which of the platform's chains of reasoning the stages follow. */
    framework: z.enum(['diagnose', 'analyse']),
    role: z.string(),
    brief: md,
    stages: z
      .array(
        z.object({
          id: z.string(),
          /** The step of the chain: Problem, Cause, Strategy, Implementation, Evaluation (or Data, Insight, Option, Recommendation). */
          step: z.string(),
          title: z.string(),
          prompt: md,
          /** Case exhibits to read for this stage. */
          evidence: ids,
          tasks: z.array(labTask).min(1),
          reflection: z.object({ label: z.string(), hint: z.string() }).optional(),
          /** The platform's own reasoning for the stage, shown beside the learner's in the memo. */
          model: md,
        }),
      )
      .min(3),
    memo: z.object({ title: z.string(), to: z.string() }),
  }),
  /* Market Studio and Operations Floor */
  z.object({
    component: z.literal('market-share-workspace'),
    ...interactiveBase,
    case: z.string(),
    /** What the market is, in a phrase. */
    market: z.string(),
    /** Sales are measured by volume (in `unit`) or by value. */
    basis: z.enum(['volume', 'value']),
    unit: z.string(),
    periods: z.object({ last: z.string(), now: z.string() }),
    /** The firm the reading is about. */
    focus: z.string(),
    firms: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          last: z.number().nonnegative(),
          now: z.number().nonnegative(),
          /** A line grouping many small sellers: counted, but not ranked. */
          group: z.boolean().default(false),
        }),
      )
      .min(3),
    scenarios: z
      .array(z.object({ id: z.string(), label: z.string(), note: z.string(), set: z.record(z.string(), z.object({ last: z.number().optional(), now: z.number().optional() })) }))
      .default([]),
    /** The HL-only AO3 prompt on the importance of market share and market leadership. */
    hlPrompt: z.object({ question: md, points: z.array(md).min(2) }),
  }),
  z.object({
    component: z.literal('position-map'),
    ...interactiveBase,
    case: z.string(),
    survey: md,
    scale: z.object({ min: z.number(), max: z.number() }),
    attributes: z.array(z.object({ id: z.string(), label: z.string(), low: z.string(), high: z.string() })).min(3).max(4),
    defaults: z.object({ x: z.string(), y: z.string() }),
    focus: z.string(),
    brands: z.array(z.object({ id: z.string(), name: z.string(), note: z.string().optional(), scores: z.record(z.string(), z.number()) })).min(4).max(8),
    /** What an empty part of the map means, for the empty parts the data produce: { poles: { price: high, craft: low }, note }. */
    gaps: z.array(z.object({ poles: z.record(z.string(), z.enum(['high', 'low'])), note: md })).default([]),
    caution: md,
  }),
  z.object({
    component: z.literal('capacity-productivity'),
    ...interactiveBase,
    case: z.string(),
    currency: z.string(),
    labels: z.object({ one: z.string(), many: z.string(), period: z.string() }),
    months: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          note: z.string(),
          values: z.object({
            capacity: z.number().positive(),
            output: z.number().nonnegative(),
            made: z.number().nonnegative(),
            rejected: z.number().nonnegative(),
            labourHours: z.number().nonnegative(),
            outputValue: z.number().nonnegative(),
            inputCost: z.number().nonnegative(),
            fixedCosts: z.number().nonnegative(),
          }),
        }),
      )
      .min(2),
    /** How total output and total input are valued for the productivity rate. */
    valueNote: md,
  }),
  z.object({
    component: z.literal('stock-control'),
    ...interactiveBase,
    case: z.string(),
    /** The item held in stock, in a phrase. */
    item: z.string(),
    labels: z.object({ one: z.string(), many: z.string() }),
    defaults: z.object({ usage: z.number().positive(), leadTime: z.number().nonnegative(), buffer: z.number().nonnegative(), reorderQty: z.number().positive() }),
    weeks: z.number().int().min(8).max(26),
    scenarios: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          note: z.string(),
          usage: z.array(z.object({ from: z.number().int().positive(), to: z.number().int().positive(), usage: z.number().nonnegative() })).optional(),
          late: z.object({ order: z.number().int().positive(), extraWeeks: z.number().positive() }).optional(),
        }),
      )
      .min(1),
    /** The scenario the buffer-stock question asks about. */
    rushScenario: z.string(),
  }),
  z.object({
    component: z.literal('location-scoring'),
    ...interactiveBase,
    case: z.string(),
    decision: z.string(),
    /** Scores run from 1 to `maxScore`; weights from 0 to `maxWeight`. */
    maxScore: z.number().int().min(5).max(10),
    maxWeight: z.number().int().min(3).max(10).default(5),
    /** Scores at or below this are flagged as weaknesses to check. */
    lowThreshold: z.number().int().nonnegative(),
    factors: z.array(z.object({ id: z.string(), label: z.string(), weight: z.number().int().nonnegative(), hint: z.string().optional() })).min(3),
    sites: z.array(z.object({ id: z.string(), name: z.string(), summary: z.string(), scores: z.record(z.string(), z.number()) })).min(2),
    caution: md,
  }),
  z.object({
    component: z.literal('ratio-desk'),
    ...interactiveBase,
    case: z.string(),
    /** The company whose accounts these are. */
    entity: z.string(),
    /** The unit the statements are published in, for example "£000". */
    unit: z.string(),
    years: z.array(z.object({ label: z.string(), short: z.string() })).length(2),
    /** The day and month the financial year ends, for example "30 June". */
    yearEnd: z.string(),
    /** Stock at the start of the first year, for its average stock. */
    openingStock: z.number().nonnegative(),
    statements: z.array(statementFigures).length(2),
    notes: z.array(md).default([]),
    /** Why each ratio moved in this case, and why that matters to the business. */
    readings: z.record(z.enum(RATIO_IDS), z.object({ why: md, matters: md })),
    /** What-ifs applied to the second year's accounts. Each must keep the statement of financial position balanced. */
    strategies: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          level,
          note: md,
          adjust: z.partialRecord(z.enum(STATEMENT_FIELDS), z.number()),
        }),
      )
      .min(2),
    prompts: z.object({ profitability: z.array(md).min(2), liquidity: z.array(md).min(2), efficiency: z.array(md).min(2) }),
  }),
  z.object({
    component: z.literal('investment-appraisal'),
    ...interactiveBase,
    case: z.string(),
    currency: z.string(),
    /** The discount rate shown first: one of the rates in the guide's table. */
    rate: z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(10), z.literal(20)]).default(10),
    context: md,
    projects: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          name: z.string(),
          summary: md,
          capitalCost: z.number().positive(),
          returns: z.array(z.number()).min(1).max(10),
        }),
      )
      .length(2),
    /** What the three methods leave out, for the judgement. */
    limits: z.array(md).min(2),
    questions: z.array(z.string()).min(2),
  }),
]);
export type Interactive = z.infer<typeof interactiveSchema>;
export type Assessment = AssessmentComponent;
export type Pathway = z.infer<typeof pathwaySchema>;
export type GlossaryEntry = z.infer<typeof glossarySchema>;
export type Source = z.infer<typeof sourceSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type Concept = z.infer<typeof conceptSchema>;
