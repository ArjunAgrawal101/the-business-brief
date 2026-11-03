/**
 * Integrity checks for the Entrepreneurship and Innovation Lab: its briefings,
 * the data behind its six tools, and its entry in the room register
 * (src/content/data/modules.yaml). Every reference must resolve, every IB code
 * must be a real subtopic, every idea must say whether it is IB content, every
 * tool's example must be a valid input to its own model, and the room's
 * register entry must list exactly what the room holds.
 *
 * The Lab's pages load their content through src/lib/lab/content.ts, which
 * runs these checks and fails the build on any problem; the unit tests run
 * them too (tests/unit/lab-content.test.ts).
 */
import type { Corpus, Problem } from './integrity';
import type { Briefing, LabTool } from './lab/schemas';
import { CANVAS_BLOCKS, MAX_ENTRIES_PER_BLOCK } from './lab/canvas';
import { toDraft, validateCosts } from './lab/costs';
import { validateFeasibility } from './lab/feasibility';
import { DIGEST_SECTIONS } from './lab/plan';
import { validateStreams, type StreamDraft } from './lab/revenue';
import { validateUnit } from './lab/unit-economics';

export interface LabRoom {
  href?: string;
  items: Array<{ kind: string; title: string; href: string; text: string }>;
  syllabus: string[];
}

export interface LabContent {
  briefings: Record<string, Briefing>;
  tools: Record<string, LabTool>;
  room: LabRoom | undefined;
}

export const LAB_ROOT = '/entrepreneurship-lab/';
export const labHref = (id: string) => `${LAB_ROOT}${id}/`;

const TOOL_KINDS: Array<LabTool['kind']> = ['canvas', 'costs', 'revenue', 'unit-economics', 'feasibility', 'plan'];

export function checkLab(lab: LabContent, c: Pick<Corpus, 'curricula' | 'glossary' | 'sources'>): Problem[] {
  const out: Problem[] = [];
  const codes = new Set((c.curricula['ib-dp-bm']?.units ?? []).flatMap((u) => u.subtopics.map((s) => s.code)));
  const code = (x: string, where: string) => codes.has(x) || out.push({ where, message: `"${x}" is not a subtopic of the IB course` });
  const dupes = (list: string[], where: string, what: string) => list.filter((x, i) => list.indexOf(x) !== i).forEach((d) => out.push({ where, message: `${what} "${d}" appears twice` }));
  const usedCodes = new Set<string>();

  /* Briefings */
  const orders = Object.values(lab.briefings)
    .map((b) => b.order)
    .sort((a, b) => a - b);
  orders.forEach((o, i) => o !== i + 1 && out.push({ where: 'briefings', message: `orders must run 1, 2, 3 and so on without gaps or repeats; found ${orders.join(', ')}` }));
  for (const [id, b] of Object.entries(lab.briefings)) {
    const w = `briefings/${id}`;
    if (lab.tools[id]) out.push({ where: w, message: 'has the same id as a tool, so both would claim the same address' });
    dupes(
      b.sections.map((s) => s.id),
      w,
      'section id',
    );
    for (const s of b.sections) {
      const sw = `${w}#${s.id}`;
      if (!s.ib.length && !s.enrichment) out.push({ where: sw, message: 'is neither mapped to an IB subtopic nor marked as enrichment' });
      s.ib.forEach((x) => {
        code(x, sw);
        usedCodes.add(x);
      });
      s.connects.forEach((x) => code(x, sw));
      if (s.table) s.table.rows.forEach((r, i) => r.cells.length !== s.table!.columns.length && out.push({ where: sw, message: `table row ${i + 1} has ${r.cells.length} cells for ${s.table!.columns.length} columns` }));
    }
    for (const idea of b.ideas) {
      const iw = `${w} idea "${idea.idea}"`;
      idea.codes.forEach((x) => code(x, iw));
      if (idea.status === 'ib' && !idea.codes.length) out.push({ where: iw, message: 'is marked as IB content but names no subtopic' });
      if (idea.status !== 'enrichment' && idea.page === undefined) out.push({ where: iw, message: 'is IB content but gives no page of the guide' });
      if (idea.status === 'enrichment' && idea.page !== undefined) out.push({ where: iw, message: 'is enrichment, so it cannot cite a page of the guide as its source' });
    }
    b.glossary.forEach((g) => c.glossary[g] || out.push({ where: w, message: `glossary term "${g}" does not exist` }));
    b.tools.forEach((t) => lab.tools[t] || out.push({ where: w, message: `tool "${t}" does not exist` }));
    b.basis.forEach((x) => c.sources[x.source] || out.push({ where: w, message: `basis source "${x.source}" is not in the sources register` }));
  }

  /* Tools */
  const kinds = Object.values(lab.tools).map((t) => t.kind);
  TOOL_KINDS.forEach((k) => kinds.filter((x) => x === k).length !== 1 && out.push({ where: 'lab', message: `needs exactly one tool of kind "${k}"` }));
  if (Object.keys(lab.tools).length !== Object.keys(lab.briefings).length) out.push({ where: 'lab', message: 'the route pairs each briefing with a tool, so there must be as many tools as briefings' });
  for (const [id, t] of Object.entries(lab.tools)) {
    const w = `lab/${id}`;
    if (!lab.briefings[t.briefing]) out.push({ where: w, message: `briefing "${t.briefing}" does not exist` });
    else if (lab.briefings[t.briefing]?.order !== t.order) out.push({ where: w, message: `is step ${t.order} of the route, so its briefing must be the briefing of order ${t.order}` });
    t.ib.links.forEach((l) => {
      code(l.code, w);
      if (t.ib.status !== 'enrichment') usedCodes.add(l.code);
    });
    if (t.kind === 'canvas') {
      const blocks = t.blocks.map((b) => b.id);
      CANVAS_BLOCKS.forEach((b) => blocks.filter((x) => x === b).length !== 1 && out.push({ where: w, message: `the canvas needs block "${b}" exactly once` }));
      dupes(
        t.entries.map((e) => e.id),
        w,
        'entry id',
      );
      CANVAS_BLOCKS.forEach((b) => t.entries.filter((e) => e.block === b).length > MAX_ENTRIES_PER_BLOCK && out.push({ where: w, message: `block "${b}" holds more than ${MAX_ENTRIES_PER_BLOCK} entries` }));
    }
    if (t.kind === 'costs') {
      (['oneOff', 'monthly', 'funding'] as const).forEach((k) =>
        dupes(
          t[k].map((l) => l.id),
          w,
          `${k} line id`,
        ),
      );
      validateCosts(toDraft(t)).forEach((p) => out.push({ where: w, message: `example: ${p.field}: ${p.message}` }));
    }
    if (t.kind === 'revenue') {
      dupes(
        t.streams.map((s) => s.id),
        w,
        'stream id',
      );
      validateStreams(t.streams as StreamDraft[]).forEach((p) => out.push({ where: w, message: `example: ${p.field}: ${p.message}` }));
    }
    if (t.kind === 'unit-economics') {
      validateUnit(t.defaults).forEach((p) => out.push({ where: w, message: `defaults: ${p.field}: ${p.message}` }));
      dupes(
        t.scenarios.map((s) => s.id),
        w,
        'scenario id',
      );
      t.scenarios.forEach((s) => validateUnit({ ...t.defaults, ...s.changes }).forEach((p) => out.push({ where: w, message: `scenario "${s.id}": ${p.field}: ${p.message}` })));
    }
    if (t.kind === 'feasibility') {
      dupes(
        t.criteria.map((x) => x.id),
        w,
        'criterion id',
      );
      dupes(
        t.ideas.map((x) => x.id),
        w,
        'idea id',
      );
      const weights = Object.fromEntries(t.criteria.map((x) => [x.id, x.weight]));
      validateFeasibility(t.ideas, t.criteria, weights, { maxScore: 5, maxWeight: 5, threshold: t.threshold, floor: t.floor }).forEach((p) => out.push({ where: w, message: `example: ${p.field}: ${p.message}` }));
      t.ideas.forEach((idea) => Object.keys(idea.scores).forEach((k) => t.criteria.some((x) => x.id === k) || out.push({ where: w, message: `idea "${idea.id}" scores "${k}", which is not a criterion` })));
      if (!t.criteria.some((x) => x.weight > 0)) out.push({ where: w, message: 'every weight is zero' });
    }
    if (t.kind === 'plan') {
      const ids = t.sections.map((s) => s.id);
      dupes(ids, w, 'section id');
      DIGEST_SECTIONS.forEach((d) => ids.includes(d) || out.push({ where: w, message: `the outline needs a section "${d}", where the other tools' figures go` }));
      t.sections.forEach((s) => {
        s.tools.forEach((x) => lab.tools[x] || out.push({ where: `${w}#${s.id}`, message: `tool "${x}" does not exist` }));
        s.ib.forEach((x) => code(x, `${w}#${s.id}`));
      });
    }
  }

  /* The room's entry in the register */
  const room = lab.room;
  if (!room) out.push({ where: 'modules.yaml', message: 'has no entry with id entrepreneurship-lab' });
  else {
    const w = 'modules.yaml#entrepreneurship-lab';
    if (room.href !== LAB_ROOT) out.push({ where: w, message: `href must be ${LAB_ROOT}` });
    const expected = new Map<string, string>([...Object.entries(lab.briefings).map(([id, b]) => [labHref(id), b.title] as const), ...Object.entries(lab.tools).map(([id, t]) => [labHref(id), t.title] as const)]);
    const listed = room.items.map((i) => i.href);
    dupes(listed, w, 'item');
    for (const item of room.items) {
      const title = expected.get(item.href);
      if (title === undefined) out.push({ where: w, message: `item ${item.href} is not a briefing or tool of the Lab` });
      else if (title !== item.title) out.push({ where: w, message: `item ${item.href} is titled "${item.title}", but the page is "${title}"` });
    }
    expected.forEach((_t, href) => listed.includes(href) || out.push({ where: w, message: `the room holds ${href}, which is not listed in its items` }));
    room.syllabus.forEach((x) => {
      code(x, w);
      if (!usedCodes.has(x)) out.push({ where: w, message: `lists ${x} as served, but no briefing section or tool maps to it` });
    });
    usedCodes.forEach((x) => room.syllabus.includes(x) || out.push({ where: w, message: `material maps to ${x}, which the room's syllabus list leaves out` }));
  }
  return out;
}
