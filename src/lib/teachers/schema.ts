/**
 * Classroom activities for the Teacher resource area: a lesson built on one of
 * the platform's fictional cases or Decision Rooms, with roles taken from the
 * case's own stakeholders, timed phases and a debrief. One file per activity
 * in src/content/activities/. The roles name stakeholders by the start of their
 * name in the case, and the page shows each one's interest and concern from
 * the case itself, so the activity can never misstate the case.
 *
 * This module imports nothing from astro:content, so the tests use it too.
 */
import { z } from 'astro/zod';

const md = z.string().trim().min(1);

export const activitySchema = z
  .object({
    title: z.string(),
    /** What the class does, in one or two sentences. */
    summary: md,
    /** The fictional case or Decision Room the lesson is built on. */
    basis: z.object({ kind: z.enum(['case', 'decision']), id: z.string() }),
    /** The IB subtopics it teaches, by code. */
    subtopics: z.array(z.string()).min(1),
    /** HL when any of its subtopics is HL only. */
    level: z.enum(['SL/HL', 'HL']).default('SL/HL'),
    /** The shape of the lesson, such as a board meeting or teams against the clock. */
    format: z.string(),
    /** Students in each group. */
    groupSize: z.number().int().min(2).max(8),
    /** What students read or do before the lesson. */
    prepare: z.array(md).min(1),
    /** The roles: a stakeholder in the case, named by the start of its name there, and what the role does in the lesson. */
    roles: z.array(z.object({ stakeholder: z.string(), task: md })).min(2),
    /** The lesson, phase by phase. */
    phases: z.array(z.object({ minutes: z.number().int().positive(), title: z.string(), what: md })).min(3),
    /** What each group produces. */
    output: md,
    /** The debrief: questions for the teacher to ask, in order. */
    debrief: z.array(md).min(3),
    /** Where to go next on the platform. */
    next: z.array(z.object({ label: z.string(), href: z.string().regex(/^\/[a-z0-9/#-]*$/) })).default([]),
    order: z.number().int(),
  })
  .strict();

export type Activity = z.infer<typeof activitySchema>;

/** The lesson's length, from its phases. */
export const activityMinutes = (a: Activity): number => a.phases.reduce((t, p) => t + p.minutes, 0);

export const activityHref = (id: string): string => `/teachers/activities/${id}/`;
