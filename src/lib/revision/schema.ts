/**
 * The revision collection (src/content/revision/<subtopic slug>.yaml): what a
 * subtopic's revision sheet and its flashcards need beyond what the rest of
 * the content already holds. Everything else on a sheet (key points, terms,
 * formulae, frameworks, most common mistakes, recall questions) is read from
 * the notes, briefs, glossary, calculation register and frameworks library,
 * never typed again here.
 *
 * What a file adds, all written for the platform:
 *  - exercises: three to five short application exercises, each a fictional
 *    stem, a question with a command term and a model answer outline;
 *  - mistakes: common examination mistakes, only where the content holds too
 *    few, shown as the platform's own advice (Recommended strategy);
 *  - formulas: for each formula, a situation in which it is the one to use
 *    (the situation-to-formula card), and what it measures where nothing
 *    else in the content says;
 *  - distinctions, scenarios and evaluations: flashcards on pairs students
 *    confuse, on which concept or tool a fictional situation calls for, and
 *    on claims that fail under some condition.
 *
 * This module imports nothing from `astro:content`, so tests can use it too.
 */
import { z } from 'astro/zod';
import { level } from '../schemas';

const md = z.string().trim().min(1);
/** A card or exercise id: lower case words joined by hyphens. */
const slugId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'use lower case words joined by hyphens');
/** A subtopic code such as "3.5", or "toolkit". */
export const codeSchema = z.string().regex(/^([1-5]\.\d|toolkit)$/, 'a subtopic code such as 3.5, or toolkit');

export const exerciseSchema = z.object({
  id: slugId,
  /** The business the stem is about: an invented name, never a real company. The stem must name it. */
  business: z.string().trim().min(2),
  stem: md,
  /** A command term id (data/command-terms.yaml) at or below the AO level of the subtopic's statements. */
  command: z.string(),
  question: md,
  /** What a strong answer does, point by point: an outline, never a markscheme. */
  outline: z.array(md).min(2).max(6),
  level: level.default('SL/HL'),
}).strict();
export type Exercise = z.infer<typeof exerciseSchema>;

export const mistakeSchema = z
  .object({
    mistake: md,
    fix: md,
    level: level.default('SL/HL'),
  })
  .strict();

export const formulaNoteSchema = z.object({
  /** When this formula is the one to use, as a situation a student might meet. */
  situation: md,
  /** What the formula measures, where the glossary and the calculation register give nothing usable. */
  measures: md.optional(),
}).strict();

export const distinctionSchema = z.object({
  id: slugId,
  /** The two ideas, as the course names them. */
  pair: z.tuple([z.string().trim().min(1), z.string().trim().min(1)]),
  /** Every subtopic the pair belongs to; the file's own code if none is given. */
  codes: z.array(codeSchema).default([]),
  level: level.default('SL/HL'),
  /** The difference that matters, in two or three sentences. */
  difference: md,
  /** A quick test or example that tells them apart. */
  example: md.optional(),
}).strict();
export type Distinction = z.infer<typeof distinctionSchema>;

export const scenarioSchema = z.object({
  id: slugId,
  /** The fictional business, named in the stem. */
  business: z.string().trim().min(2),
  stem: md,
  /** The concept or tool that applies. */
  answer: z.string().trim().min(2),
  /** Why it applies, and what it would show. */
  why: md,
  codes: z.array(codeSchema).default([]),
  level: level.default('SL/HL'),
}).strict();
export type Scenario = z.infer<typeof scenarioSchema>;

export const evaluationSchema = z.object({
  id: slugId,
  /** A claim a student might make, often half true. */
  claim: md,
  /** The counter-argument, or the condition under which the claim fails. */
  counter: md,
  codes: z.array(codeSchema).default([]),
  level: level.default('SL/HL'),
}).strict();
export type Evaluation = z.infer<typeof evaluationSchema>;

export const revisionSchema = z
  .object({
    /** The subtopic: the file is named after its slug. */
    code: codeSchema,
    exercises: z.array(exerciseSchema).min(3).max(5),
    mistakes: z.array(mistakeSchema).default([]),
    /** By formula id (see src/lib/revision/formulae.ts). A formula is described in one file only. */
    formulas: z.record(z.string(), formulaNoteSchema).default({}),
    distinctions: z.array(distinctionSchema).default([]),
    scenarios: z.array(scenarioSchema).default([]),
    evaluations: z.array(evaluationSchema).default([]),
    /** Recall cards that are HL only although their question does not say so, by card id. */
    hlRecall: z.array(z.string()).default([]),
  })
  .strict();
export type RevisionEntry = z.infer<typeof revisionSchema>;
