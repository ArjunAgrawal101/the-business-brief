/**
 * The schemas for the course connections: the worked connections between two
 * subtopics that the map at /ib/connections/ draws and every subtopic page
 * lists (src/content/data/topic-connections.yaml), and the tools a subtopic
 * can use that do not name it themselves (src/content/data/subtopic-tools.yaml).
 * The checks that need the rest of the content are in src/lib/connections.ts.
 *
 * This module imports nothing from `astro:content`, so tests can use it too.
 */
import { z } from 'astro/zod';

/** A subtopic code such as 3.5. Whether it exists is checked against the curriculum. */
const code = z.string().regex(/^[1-5]\.[1-9]$/, 'a subtopic code such as 3.5');

/** An original exam-style question on a connection: a command term from the register, its marks and, for a calculation, the worked answer. */
export const connectionQuestionSchema = z
  .object({
    /** A command term id from src/content/data/command-terms.yaml. */
    command: z.string(),
    marks: z.number().int().min(1).max(20),
    prompt: z.string().min(20),
    /** The worked answer, for a calculation; recomputed by the unit tests with the platform's own functions. */
    answer: z.string().optional(),
  })
  .strict();

export const topicConnectionSchema = z
  .object({
    /** The entry's id, which the loader also reads; it names the connection's anchor (#link-<id>). */
    id: z.string().regex(/^[a-z0-9-]+$/),
    /** The two subtopics the connection joins, in the order the title reads. */
    between: z.tuple([code, code]),
    /** One of the connections the topic library leads with. */
    featured: z.boolean().default(false),
    title: z.string().min(8),
    /** One paragraph: how and why the two subtopics meet, in the platform's own words. */
    explanation: z.string().min(200),
    question: connectionQuestionSchema,
    /** HL when the connection rests on HL-only content. A connection with an HL-only subtopic at either end is HL whatever this says. */
    level: z.enum(['SL/HL', 'HL']).default('SL/HL'),
  })
  .strict();

export type TopicConnection = z.infer<typeof topicConnectionSchema>;

/**
 * Tools that serve a subtopic although their own data does not name it: an
 * existing tool, by its address, and one sentence on what to use it for in
 * this subtopic. The entry's id is the subtopic's code.
 */
export const subtopicToolsSchema = z
  .object({
    /** The subtopic's code. */
    id: code,
    tools: z
      .array(
        z
          .object({
            href: z.string().regex(/^\/[a-z0-9/-]+\/$/, 'a page on the site, with a trailing slash'),
            use: z.string().min(30),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export type SubtopicTools = z.infer<typeof subtopicToolsSchema>;
