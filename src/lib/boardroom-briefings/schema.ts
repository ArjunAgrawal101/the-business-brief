/**
 * The Boardroom Briefings: an editorial case series on how businesses make
 * management decisions. One YAML file per briefing in
 * src/content/boardroom-briefings/, registered as the `boardroomBriefings`
 * collection in src/content.config.ts and checked by ./integrity.ts.
 *
 * A briefing is read in two editions. The Student edition is the case: the
 * summary of the decision, the business, its context, the evidence, the
 * figures, the people with a stake, the options, the board's criteria and the
 * questions, with the recommendation withheld. The Analysis edition is the
 * worked discussion: what the evidence shows, the assumptions, the
 * trade-offs, every option judged, the recommendation, how to implement it,
 * how to tell whether it is working, and the limits of the analysis.
 *
 * Like src/lib/schemas.ts, this module imports nothing from astro:content, so
 * the unit tests validate the YAML with it directly.
 */
import { z } from 'astro/zod';
import { BUSINESS_FUNCTIONS, conceptId, exhibitSchema, INDUSTRIES, level } from '../schemas';

const md = z.string().trim().min(1);
const slugId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'lower-case words joined by hyphens');
const code = z.string().regex(/^\d\.\d$/, 'a subtopic code such as 3.8');
const ids = z.array(z.string()).default([]);
/** Options are lettered, as in a board paper: A, B, C. */
const optionId = z.string().regex(/^[A-E]$/, 'a capital letter from A to E');

/** The kind of decision each briefing is about: the series' second axis, after the industry. */
export const DECISION_TYPES = [
  'market-entry',
  'acquisition',
  'profit-recovery',
  'automation',
  'crisis-leadership',
  'growth-and-funding',
  'competitive-response',
  'vertical-integration',
  'capital-allocation',
  'reputation-recovery',
] as const;
export type DecisionType = (typeof DECISION_TYPES)[number];

/**
 * A check that recomputes cells of an exhibit table from other cells
 * (./figures.ts). A row check works the named row from other rows, column by
 * column; a column check works the named column from other columns, row by
 * row. `{Label}` names a row in a row check and a column in a column check;
 * `{ex-2|Row|Column}` names a cell of any exhibit in the briefing.
 */
export const exhibitCheckSchema = z.union([
  z.strictObject({
    row: z.string(),
    is: z.string(),
    /** The columns to check, by label; every numeric column when omitted. */
    columns: z.array(z.string()).optional(),
  }),
  z.strictObject({
    column: z.string(),
    is: z.string(),
    /** The rows to check, by their first cell; every row when omitted. */
    rows: z.array(z.string()).optional(),
  }),
]);
export type ExhibitCheck = z.infer<typeof exhibitCheckSchema>;

/** An exhibit as the Case Vault draws it, with the checks that recompute its figures. */
export const briefingExhibitSchema = exhibitSchema
  .extend({
    checks: z.array(exhibitCheckSchema).default([]),
  })
  .strict();
export type BriefingExhibit = z.infer<typeof briefingExhibitSchema>;

/** One of the briefing's own figures, quoted in its text. With `is`, it is worked from the exhibits; without, it is a stated input. */
export const briefingFigureSchema = z.strictObject({
  id: slugId,
  label: z.string(),
  value: z.number(),
  is: z.string().optional(),
  /** Decimals the value is stated to; taken from the value as written when omitted. */
  decimals: z.number().int().min(0).max(4).optional(),
});
export type BriefingFigure = z.infer<typeof briefingFigureSchema>;

const rating = z.enum(['high', 'medium', 'low']);

export const boardroomBriefingSchema = z.strictObject({
  /** Its number in the series, from 1. */
  number: z.number().int().positive(),
  /** The series question the briefing answers, as a reader would ask it. */
  question: z.string().endsWith('?'),
  /** The headline: this business and its decision. */
  title: z.string(),
  /** The standfirst under the headline. */
  dek: z.string(),
  decisionType: z.enum(DECISION_TYPES),
  industry: z.enum(INDUSTRIES),
  functions: z.array(z.enum(BUSINESS_FUNCTIONS)).min(1),
  /** The one or two IB key concepts the decision turns on. */
  keyConcepts: z.array(conceptId).min(1).max(2),
  updated: z.coerce.date(),

  company: z.strictObject({
    name: z.string(),
    /** True for an invented organization; its figures are then simulated, and every exhibit says so. */
    fictional: z.boolean(),
    sector: z.string(),
    location: z.string(),
    size: z.string(),
    ownership: z.string(),
  }),
  /** The money the figures are in, and the unit of the exhibits: "thousand" means £000. */
  currency: z.strictObject({ code: z.string(), symbol: z.string(), unit: z.enum(['one', 'thousand', 'million']) }),

  /* ---------------- The Student edition ---------------- */

  /** The executive summary, as the Student edition gives it: the situation, the decision and what rides on it. */
  summary: z.strictObject({ situation: md, decision: md, stakes: md }),
  /** Business background: the company's story so far. */
  background: z.array(md).min(2),
  /** Strategic context: the industry and the forces on the decision, in general terms and with no figures. */
  context: z.array(md).min(2),
  /** Relevant evidence: the company's own data, established research (cited) and how the market works (in general terms). */
  evidence: z
    .array(
      z.strictObject({
        kind: z.enum(['company', 'research', 'market']),
        title: z.string(),
        body: md,
        /** Exhibits the item rests on (company evidence). */
        exhibits: ids,
        /** Register sources (research must cite at least one). */
        sources: ids,
      }),
    )
    .min(3),
  /** Financial information: a summary and the exhibits that hold the figures. */
  financials: z.strictObject({ summary: md, exhibits: z.array(z.string()).min(1) }),
  exhibits: z.array(briefingExhibitSchema).min(3),
  /** Figures the text quotes that are not cells of an exhibit: worked results (with `is`) and stated inputs. */
  figures: z.array(briefingFigureSchema).default([]),
  /** Stakeholder implications: who has a stake, what they want, and what the decision would mean for them. */
  stakeholders: z
    .array(
      z.strictObject({
        name: z.string(),
        side: z.enum(['internal', 'external']),
        interest: rating,
        power: rating,
        wants: md,
        implications: md,
      }),
    )
    .min(4),
  options: z
    .array(
      z.strictObject({
        id: optionId,
        label: z.string(),
        summary: md,
        requires: md,
        upside: md,
        risks: md,
        /** Exhibits that bear on it. */
        evidence: ids,
      }),
    )
    .min(3)
    .max(5),
  /** The board's criteria for judging the options, each with its weight in per cent (the weights add up to 100). */
  criteria: z
    .array(
      z.strictObject({
        id: slugId,
        criterion: z.string(),
        weight: z.number().int().positive(),
        measure: md,
      }),
    )
    .min(3)
    .max(6),
  /** Discussion questions: IB-style questions with command terms and marks, and seminar questions beyond the course. */
  questions: z.strictObject({
    course: z
      .array(
        z.strictObject({
          id: slugId,
          command: z.string(),
          marks: z.number().int().positive(),
          level: level.default('SL/HL'),
          subtopics: z.array(code).min(1),
          prompt: md,
          /** For the Analysis edition: what a strong answer does, with any working. */
          notes: md,
        }),
      )
      .min(3),
    seminar: z.array(z.strictObject({ id: slugId, prompt: md, notes: md })).min(2),
  }),

  /* ---------------- The Analysis edition ---------------- */

  analysis: z.strictObject({
    /** The executive summary, as the Analysis edition gives it: the recommendation and why, in a paragraph. */
    verdict: md,
    /** What the evidence shows, worked. */
    evidence: z.array(md).min(3),
    /** The assumptions the analysis rests on, each with how to test it. */
    assumptions: z.array(z.strictObject({ assumption: md, test: md })).min(3),
    tradeoffs: z.array(z.strictObject({ title: z.string(), body: md })).min(2),
    /** Every option judged against the evidence, once each. */
    alternatives: z.array(z.strictObject({ option: optionId, fit: z.enum(['strong', 'conditional', 'weak']), body: md })),
    /** Each option scored from 1 to 5 against each criterion; the weighted score is worked by the integrity check. */
    scores: z.array(z.strictObject({ option: optionId, scores: z.record(z.string(), z.number().int().min(1).max(5)), total: z.number() })),
    recommendation: z.strictObject({
      option: optionId,
      decision: md,
      reasons: z.array(md).min(2),
      conditions: md,
      /** Required when the recommended option does not have the highest weighted score: why judgement overrides the scores. */
      departsFromScores: md.optional(),
    }),
    implementation: z.array(z.strictObject({ when: z.string(), action: md, owner: z.string() })).min(3),
    /** How to tell whether the decision is working: the evaluation criteria applied after the decision. */
    measures: z.array(z.strictObject({ measure: z.string(), target: md, review: z.string() })).min(3),
    limitations: z.array(md).min(2),
    /** What would change the recommendation. */
    changeMind: z.array(md).min(2),
    /** Worked tables of the analysis's own (a scenario, a sensitivity). */
    exhibits: z.array(briefingExhibitSchema).default([]),
  }),

  /* ---------------- Connections: the course and beyond ---------------- */

  /** The IB course: subtopics the briefing exercises, with how, and the course glossary terms it uses. */
  course: z.strictObject({
    subtopics: z.array(z.strictObject({ code, note: md, level: level.default('SL/HL') })).min(2),
    terms: ids,
  }),
  /** Frameworks from the library (src/content/frameworks), each with how it applies here. */
  frameworks: z.array(z.strictObject({ id: z.string(), use: md })).min(2),
  /** The platform's tools the briefing uses. */
  tools: z
    .array(
      z.strictObject({
        kind: z.enum(['toolkit', 'studio', 'calculator', 'lab']),
        id: z.string(),
        use: md,
      }),
    )
    .min(2),
  /** Ideas beyond the IB course, for undergraduate, MBA and professional readers: labelled enrichment on the page. */
  beyond: z
    .array(
      z.strictObject({
        idea: z.string(),
        body: md,
        /** Glossary terms beyond the course that name the idea. */
        terms: ids,
        sources: ids,
      }),
    )
    .min(1),
  /** Every register source the briefing relies on. */
  sources: z.array(z.string()).min(1),
  /** How the briefing and its figures were made. */
  method: md,
});
export type BoardroomBriefing = z.infer<typeof boardroomBriefingSchema>;
export type BriefingOption = BoardroomBriefing['options'][number];
export type BriefingCriterion = BoardroomBriefing['criteria'][number];
