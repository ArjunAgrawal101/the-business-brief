/**
 * Pure helpers for the audience pathways: where a route's links lead, how long
 * the IB DP route takes, the plain meaning of a glossary term, and the figures
 * in the pathways' own practice tasks. Nothing here imports astro:content, so
 * the pages, the integrity checks and the unit tests share one implementation.
 */
import { buildWorking, type Labels, type Working } from './finance';
import { round } from './format';
import type { Corpus } from './integrity';
import type { Curriculum, GlossaryEntry, Pathway, PathwayTask } from './schemas';

/** The address form of a title: the same rules as slug() in content.ts, which the unit tests cannot load. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Course order for codes: "3.10" sorts after "3.9" (the same rule as learning.ts, which the unit tests cannot load). */
export function codeKey(code: string): number {
  const [a, b] = code.split('.').map(Number);
  return (a ?? 0) * 100 + (b ?? 0);
}

export interface SubtopicRef {
  code: string;
  title: string;
  level: string;
  unit: number;
  slug: string;
}

/** Every IB subtopic with the address of its page. */
export function subtopicRefs(c: Corpus): SubtopicRef[] {
  const cur = c.curricula['ib-dp-bm'];
  return (cur?.units ?? []).flatMap((u) => u.subtopics.map((s) => ({ code: s.code, title: s.title, level: s.level, unit: u.number, slug: slugify(s.title) })));
}

/** What a route's link points at, so that the checks can test level and existence. */
export type Target =
  | { kind: 'subtopic'; code: string; level: string; section?: { id: string; level: 'SL/HL' | 'HL' } }
  | { kind: 'mindmap'; id: string; exists: boolean }
  | { kind: 'enrichment-map'; id: string; exists: boolean }
  | { kind: 'glossary'; id: string; exists: boolean }
  | { kind: 'case'; id: string; exists: boolean }
  | { kind: 'decision'; id: string; exists: boolean }
  | { kind: 'toolkit'; id: string; exists: boolean; level?: string }
  | { kind: 'revision'; id: string; exists: boolean }
  | { kind: 'unknown-topic'; slug: string }
  | { kind: 'page'; path: string };

const has = <T>(d: Record<string, T>, id: string) => Object.prototype.hasOwnProperty.call(d, id);

/** Resolve an internal link against the content. Pages that are not built from content are reported as plain pages. */
export function resolveTarget(href: string, c: Corpus): Target {
  const [path = '', fragment] = href.split('#');
  const parts = path.split('/').filter(Boolean);
  const [first, second, third] = parts;
  if (first === 'topics' && second && !third) {
    const sub = subtopicRefs(c).find((s) => s.slug === second);
    if (!sub) return { kind: 'unknown-topic', slug: second };
    const note = Object.values(c.notes).find((n) => n.code === sub.code);
    const sec = fragment ? note?.sections.find((s) => s.id === fragment) : undefined;
    return { kind: 'subtopic', code: sub.code, level: sub.level, section: sec ? { id: sec.id, level: sec.level } : undefined };
  }
  if (first === 'mindmaps' && second === 'enrichment' && third) return { kind: 'enrichment-map', id: third, exists: has(c.enrichmentMaps, third) };
  if (first === 'mindmaps' && second && !third) return { kind: 'mindmap', id: second, exists: has(c.mindmaps, second) };
  if (first === 'glossary' && second) return { kind: 'glossary', id: second, exists: has(c.glossary, second) };
  if (first === 'cases' && second) return { kind: 'case', id: second, exists: has(c.cases, second) };
  if (first === 'decision-room' && second) return { kind: 'decision', id: second, exists: has(c.decisions, second) };
  if (first === 'toolkit' && second) {
    const tool = c.tools[second];
    return { kind: 'toolkit', id: second, exists: Boolean(tool && tool.status === 'complete'), level: tool?.level };
  }
  if (first === 'revision' && second) return { kind: 'revision', id: second, exists: has(c.topics, second) };
  return { kind: 'page', path };
}

/** True when a link leads to material the guide makes HL only: an HL-only subtopic, an HL section of notes, or an HL-only tool. */
export function isHlTarget(t: Target): boolean {
  if (t.kind === 'subtopic') return t.level === 'HL' || t.section?.level === 'HL';
  if (t.kind === 'toolkit') return t.level === 'HL';
  return false;
}

/* ---------- The IB DP route ---------- */

export interface Hours {
  sl: number;
  hl: number;
}

/** The stages of the IB DP route that are course time but not a unit, named by the stage id. */
const COURSE_TIME: Record<string, 'toolkit' | 'paper1Research' | 'internalAssessment'> = {
  toolkit: 'toolkit',
  'paper-1-research': 'paper1Research',
  'internal-assessment': 'internalAssessment',
};

type Unit = Curriculum['units'][number];

/** The guide's recommended hours for one stage of the IB DP route: its units, or the course time its id names. */
export function stageHours(stage: Pathway['stages'][number], cur: Curriculum): Hours | null {
  const key = stage.id ? COURSE_TIME[stage.id] : undefined;
  if (key) {
    const h = cur.hours?.[key];
    return h ? { sl: h.sl, hl: h.hl } : null;
  }
  const units = stage.syllabus.map((id) => cur.units.find((u) => u.id === id)).filter((u): u is Unit => u !== undefined);
  if (!units.length || units.some((u) => !u.hours)) return null;
  return units.reduce<Hours>((t, u) => ({ sl: t.sl + (u.hours?.sl ?? 0), hl: t.hl + (u.hours?.hl ?? 0) }), { sl: 0, hl: 0 });
}

/** The whole route's hours: the sum of its stages. On the IB DP route it must equal the guide's total. */
export function routeHours(stages: Pathway['stages'], cur: Curriculum): Hours {
  return stages.reduce<Hours>(
    (t, s) => {
      const h = stageHours(s, cur);
      return h ? { sl: t.sl + h.sl, hl: t.hl + h.hl } : t;
    },
    { sl: 0, hl: 0 },
  );
}

/** The rows of the course-time chart, in route order, with the largest difference between SL and HL. */
export function hoursRows(stages: Pathway['stages'], cur: Curriculum): Array<{ label: string; sl: number; hl: number }> {
  return stages.flatMap((s) => {
    const h = stageHours(s, cur);
    return h ? [{ label: s.title, sl: h.sl, hl: h.hl }] : [];
  });
}

/* ---------- Words ---------- */

/**
 * A term's plain-language meaning: the glossary's simple explanation where it
 * has one, otherwise its definition, which is written in plain language too.
 * (The glossary is gaining a `simple` field; this reads it when it is there.)
 */
export function plainMeaning(g: GlossaryEntry): string {
  const simple = (g as GlossaryEntry & { simple?: unknown }).simple;
  return typeof simple === 'string' && simple.trim() ? simple.trim() : g.definition;
}

/** Markdown reduced to plain text: for outlines that are copied into other tools. */
export function plainText(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The first sentence of a paragraph, for summaries. */
export function firstSentence(md: string): string {
  const text = plainText(md);
  const m = text.match(/^(.+?[.?!])(\s|$)/);
  return (m?.[1] ?? text).trim();
}

/* ---------- Practice tasks ---------- */

export interface CashRow {
  month: string;
  opening: number;
  inflows: number;
  outflows: number;
  net: number;
  closing: number;
}

/** A run of monthly cash flows from an opening balance: each month's net cash flow and closing balance, in cents. */
export function cashRun(opening: number, months: Array<{ month: string; inflows: number; outflows: number }>): CashRow[] {
  const rows: CashRow[] = [];
  let open = round(opening, 2);
  for (const m of months) {
    const net = round(m.inflows - m.outflows, 2);
    const closing = round(open + net, 2);
    rows.push({ month: m.month, opening: open, inflows: m.inflows, outflows: m.outflows, net, closing });
    open = closing;
  }
  return rows;
}

/** The inputs a task part's calculation receives: named figures, or a cash month's figures. */
export function partInputs(task: PathwayTask, part: PathwayTask['parts'][number]): Record<string, number> {
  if (part.month && task.cash) {
    const row = cashRun(task.cash.opening, task.cash.months).find((r) => r.month === part.month);
    if (!row) throw new Error(`no month "${part.month}" in the task's cash flow`);
    return { opening: row.opening, inflows: row.inflows, outflows: row.outflows };
  }
  const out: Record<string, number> = {};
  for (const [input, key] of Object.entries(part.inputs)) {
    const f = task.figures.find((x) => x.key === key);
    if (!f) throw new Error(`input "${input}" names figure "${key}", which the task does not give`);
    out[input] = f.value;
  }
  return out;
}

/** The worked answer to a task part, by the platform's calculation functions; null for a written part. */
export function partWorking(task: PathwayTask, part: PathwayTask['parts'][number]): Working | null {
  if (!part.calculation) return null;
  const labels: Labels | undefined = task.labels;
  return buildWorking(part.calculation, partInputs(task, part), task.currency, labels);
}

/** Total marks of a task: the platform's own allocation, for its size. */
export function taskMarks(task: PathwayTask): number {
  return task.parts.reduce((t, p) => t + p.marks, 0);
}
