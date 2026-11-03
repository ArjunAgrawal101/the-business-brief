/**
 * Entrepreneurship and Innovation Lab: the Business Model Canvas builder. The
 * canvas, devised by Alexander Osterwalder with Yves Pigneur, sets out a
 * business model in nine blocks. It is not in the IB guide: enrichment. The
 * prompts on the page are the platform's own.
 *
 * Every entry is marked as an assumption (believed, not yet shown) or as
 * evidence (backed by something the founder has seen, measured or signed),
 * and rated for the damage it would do if it were wrong, from 1 to 5. The
 * riskiest assumptions are the ones to test first. Ties are broken in the
 * order a lean start-up tests them: what customers want (desirability), then
 * whether it can pay (viability), then whether it can be done (feasibility).
 *
 * Pure functions, shared by the builder, its script, the business plan digest
 * and the unit tests. Imported files are checked field by field, because a
 * file from anywhere can be loaded.
 */
import { fmtNumber } from '../format';

/** The nine blocks, in the canonical left-to-right layout of the canvas. */
export const CANVAS_BLOCKS = [
  'key-partners',
  'key-activities',
  'key-resources',
  'value-propositions',
  'customer-relationships',
  'channels',
  'customer-segments',
  'cost-structure',
  'revenue-streams',
] as const;
export type BlockId = (typeof CANVAS_BLOCKS)[number];

/** The order in which to fill the canvas, starting from the customer. */
export const FILL_ORDER: BlockId[] = [
  'customer-segments',
  'value-propositions',
  'channels',
  'customer-relationships',
  'revenue-streams',
  'key-resources',
  'key-activities',
  'key-partners',
  'cost-structure',
];

export type Lens = 'desirability' | 'viability' | 'feasibility';

export const LENS: Record<BlockId, Lens> = {
  'customer-segments': 'desirability',
  'value-propositions': 'desirability',
  channels: 'desirability',
  'customer-relationships': 'desirability',
  'revenue-streams': 'viability',
  'cost-structure': 'viability',
  'key-activities': 'feasibility',
  'key-resources': 'feasibility',
  'key-partners': 'feasibility',
};

export const LENS_WORDS: Record<Lens, string> = {
  desirability: 'Do customers want it?',
  viability: 'Can it pay?',
  feasibility: 'Can it be done?',
};

/** Ties between equally risky assumptions are broken in this order. */
export const TEST_ORDER: BlockId[] = ['customer-segments', 'value-propositions', 'channels', 'customer-relationships', 'revenue-streams', 'cost-structure', 'key-activities', 'key-resources', 'key-partners'];

export const ENTRY_KINDS = ['assumption', 'evidence'] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

export const RISK_WORDS: Record<number, string> = {
  1: 'Minor',
  2: 'Low',
  3: 'Moderate',
  4: 'High',
  5: 'Critical',
};

export interface Entry {
  id: string;
  block: BlockId;
  text: string;
  kind: EntryKind;
  /** The damage if this is wrong: 1 minor to 5 critical. */
  risk: number;
  /** For evidence, where it comes from; for an assumption, how it will be tested. */
  note: string;
}

export interface Canvas {
  name: string;
  entries: Entry[];
}

export const MAX_ENTRIES_PER_BLOCK = 8;
export const MAX_TEXT = 280;

export interface RankedAssumption extends Entry {
  rank: number;
  lens: Lens;
}

/** Assumptions with some text, riskiest first; ties by the test order, then by the order written. */
export function riskiest(c: Canvas, limit = 5): RankedAssumption[] {
  return c.entries
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.kind === 'assumption' && e.text.trim())
    .sort((a, b) => b.e.risk - a.e.risk || TEST_ORDER.indexOf(a.e.block) - TEST_ORDER.indexOf(b.e.block) || a.i - b.i)
    .slice(0, limit)
    .map(({ e }, n) => ({ ...e, rank: n + 1, lens: LENS[e.block] }));
}

export interface CanvasSummary {
  entries: number;
  assumptions: number;
  evidence: number;
  /** Assumptions rated 4 or 5. */
  high: number;
  /** Blocks with nothing written yet. */
  empty: BlockId[];
  byBlock: Record<BlockId, { assumptions: number; evidence: number }>;
}

export function summarize(c: Canvas): CanvasSummary {
  const written = c.entries.filter((e) => e.text.trim());
  const byBlock = Object.fromEntries(CANVAS_BLOCKS.map((b) => [b, { assumptions: 0, evidence: 0 }])) as CanvasSummary['byBlock'];
  for (const e of written) byBlock[e.block][e.kind === 'assumption' ? 'assumptions' : 'evidence'] += 1;
  return {
    entries: written.length,
    assumptions: written.filter((e) => e.kind === 'assumption').length,
    evidence: written.filter((e) => e.kind === 'evidence').length,
    high: written.filter((e) => e.kind === 'assumption' && e.risk >= 4).length,
    empty: FILL_ORDER.filter((b) => byBlock[b].assumptions + byBlock[b].evidence === 0),
    byBlock,
  };
}

export function readCanvas(c: Canvas, labels: Record<BlockId, string>): { reading: string; implication: string } {
  const s = summarize(c);
  if (!s.entries) return { reading: 'The canvas is empty. Start with customer segments: who has the problem?', implication: '' };
  const top = riskiest(c, 1)[0];
  const parts = [`${s.entries} ${s.entries === 1 ? 'entry' : 'entries'}: ${s.assumptions} ${s.assumptions === 1 ? 'assumption' : 'assumptions'} and ${s.evidence} backed by evidence (${fmtNumber((s.evidence / s.entries) * 100, 0)}%).`];
  if (s.empty.length) parts.push(`Still empty: ${s.empty.map((b) => labels[b]).join(', ')}.`);
  const implication = top
    ? `Test first: "${top.text.trim()}" (${labels[top.block]}, risk ${top.risk} of 5). ${s.high > 1 ? `${s.high} assumptions are rated high or critical; a` : 'A'} cheap experiment that could prove it wrong is worth more than another week of building.`
    : 'Every entry is backed by evidence. Check that the evidence is strong: what people say in a survey is weaker than what they pay for.';
  return { reading: parts.join(' '), implication };
}

/* ---------- Saving and loading files ---------- */

export const CANVAS_FORMAT = 'the-business-brief/business-model-canvas';
export const CANVAS_VERSION = 1;

export function canvasToJson(c: Canvas, saved: string): string {
  return JSON.stringify(
    {
      format: CANVAS_FORMAT,
      version: CANVAS_VERSION,
      saved,
      name: c.name,
      entries: c.entries.map(({ id, block, text, kind, risk, note }) => ({ id, block, text, kind, risk, note })),
    },
    null,
    2,
  );
}

export type ParseResult = { ok: true; canvas: Canvas } | { ok: false; error: string };

/** Reads a canvas file, accepting only what this builder writes. */
export function parseCanvas(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  if (!data || typeof data !== 'object') return { ok: false, error: 'That file does not contain a canvas.' };
  const d = data as Record<string, unknown>;
  if (d.format !== CANVAS_FORMAT) return { ok: false, error: 'That file was not saved by this canvas builder.' };
  if (d.version !== CANVAS_VERSION) return { ok: false, error: `That file uses version ${String(d.version)} of the format; this builder reads version ${CANVAS_VERSION}.` };
  if (!Array.isArray(d.entries)) return { ok: false, error: 'That file has no list of entries.' };
  const entries: Entry[] = [];
  const counts = new Map<BlockId, number>();
  for (const [i, raw] of d.entries.entries()) {
    if (!raw || typeof raw !== 'object') return { ok: false, error: `Entry ${i + 1} is not an entry.` };
    const r = raw as Record<string, unknown>;
    if (typeof r.block !== 'string' || !(CANVAS_BLOCKS as readonly string[]).includes(r.block)) return { ok: false, error: `Entry ${i + 1} names a block that is not on the canvas.` };
    if (typeof r.text !== 'string') return { ok: false, error: `Entry ${i + 1} has no text.` };
    if (r.kind !== 'assumption' && r.kind !== 'evidence') return { ok: false, error: `Entry ${i + 1} is neither an assumption nor evidence.` };
    if (typeof r.risk !== 'number' || !Number.isInteger(r.risk) || r.risk < 1 || r.risk > 5) return { ok: false, error: `Entry ${i + 1} needs a risk from 1 to 5.` };
    const block = r.block as BlockId;
    counts.set(block, (counts.get(block) ?? 0) + 1);
    if ((counts.get(block) ?? 0) > MAX_ENTRIES_PER_BLOCK) return { ok: false, error: `A block holds at most ${MAX_ENTRIES_PER_BLOCK} entries.` };
    entries.push({
      id: typeof r.id === 'string' && /^[\w-]{1,40}$/.test(r.id) ? r.id : `e${i + 1}`,
      block,
      text: r.text.slice(0, MAX_TEXT),
      kind: r.kind,
      risk: r.risk,
      note: typeof r.note === 'string' ? r.note.slice(0, MAX_TEXT) : '',
    });
  }
  const ids = new Set<string>();
  for (const e of entries) {
    while (ids.has(e.id)) e.id = `${e.id}x`;
    ids.add(e.id);
  }
  return { ok: true, canvas: { name: typeof d.name === 'string' ? d.name.slice(0, 120) : '', entries } };
}
