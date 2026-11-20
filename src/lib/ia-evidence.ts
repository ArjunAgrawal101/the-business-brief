/**
 * The evidence analysis guide for the internal assessment, as pure
 * functions. The reader logs each piece of evidence from the supporting
 * documents and what they did with it; each is read as quoted, used or
 * integrated, the distinction the IA research guide draws for criterion D
 * (p. 4), against the top level of criterion D in the guide (p. 58):
 * document data used effectively, with ideas integrated and the assumptions
 * and implications considered. Feedback only: it never marks the work.
 * Saved in bb:ia-evidence.
 */
import type { Check } from './ia-tools';

export interface EvidenceItem {
  /** The supporting document it comes from: "SD1" to "SD5", or "" if not traced. */
  sd: string;
  /** The figure or finding, in the reader's words. */
  finding: string;
  /** The business tool or theory applied to it, if any. */
  tool: string;
  /** What the tool showed: a new figure or result. */
  result: string;
  /** Another supporting document it is weighed against, if any. */
  against: string;
  /** An assumption or limitation the reader has noted. */
  assumption: string;
  /** What it means for the research question. */
  implication: string;
}

export type Level = 'empty' | 'quoted' | 'used' | 'integrated';

export const LEVEL_WORD: Record<Exclude<Level, 'empty'>, string> = { quoted: 'Quoted', used: 'Used', integrated: 'Integrated' };

export const blankItem = (): EvidenceItem => ({ sd: '', finding: '', tool: '', result: '', against: '', assumption: '', implication: '' });

const has = (s: string) => s.trim().length > 0;

/**
 * Quoted: a figure reported, nothing done with it. Used: a tool applied to it
 * with a result, or it weighed against another document. Integrated: used,
 * tested against an assumption or another document, and tied to the question.
 */
export function levelOf(e: EvidenceItem): Level {
  if (!has(e.finding)) return 'empty';
  const weighed = has(e.against) && e.against !== e.sd;
  const used = (has(e.tool) && has(e.result)) || weighed;
  if (!used) return 'quoted';
  return (has(e.assumption) || weighed) && has(e.implication) ? 'integrated' : 'used';
}

/** What to do next with one piece of evidence: the platform's prompts, each with its standing. */
export function itemAdvice(e: EvidenceItem): Check[] {
  const out: Check[] = [];
  const level = levelOf(e);
  if (level === 'empty') return out;
  if (!/^SD[1-5]$/.test(e.sd))
    out.push({ status: 'advice', text: 'Trace it to its document, SD1 to SD5: always show where a figure comes from.', standing: 'examiner', source: 'IA research guide, p. 4' });
  if (has(e.tool) && !has(e.result)) out.push({ status: 'advice', text: `Say what ${e.tool.trim()} showed: a tool named but not worked through earns little.`, standing: 'strategy' });
  if (level === 'quoted')
    out.push({ status: 'advice', text: 'Quoted: the evidence is reported, but nothing is done with it. Apply a tool to it, or weigh it against another document.', standing: 'examiner', source: 'IA research guide, p. 4' });
  else if (level === 'used')
    out.push({
      status: 'advice',
      text: has(e.implication)
        ? 'Used, and tied to your question. To integrate it, test it against an assumption it rests on or against another document.'
        : 'Used: the evidence is worked into something new. To integrate it, test it against an assumption or another document, and say what it means for your question.',
      standing: 'strategy',
    });
  else out.push({ status: 'ok', text: 'Integrated: tested against an assumption or another document, and tied to your question.', standing: 'strategy' });
  if (e.against.trim() && e.against === e.sd) out.push({ status: 'advice', text: 'It is weighed against its own document: choose a different one, or leave the comparison blank.', standing: 'strategy' });
  return out;
}

export interface EvidenceSummary {
  quoted: number;
  used: number;
  integrated: number;
  /** Documents, of those the reader has, that no piece of evidence comes from. */
  unused: string[];
  checks: Check[];
}

/** The whole log: how many pieces at each level, and documents no evidence comes from. `docs` is how many supporting documents the reader has. */
export function summarizeEvidence(items: EvidenceItem[], docs: number): EvidenceSummary {
  const levels = items.map(levelOf).filter((l) => l !== 'empty');
  const n = (l: Level) => levels.filter((x) => x === l).length;
  const labels = Array.from({ length: Math.max(0, Math.min(5, docs)) }, (_, i) => `SD${i + 1}`);
  const used = new Set(items.filter((e) => has(e.finding)).flatMap((e) => [e.sd, e.against]).filter(Boolean));
  const unused = labels.filter((l) => !used.has(l));
  const checks: Check[] = [];
  if (!levels.length) {
    checks.push({ status: 'advice', text: 'Log a piece of evidence from one of your documents to see how it is used.', standing: 'strategy' });
  } else {
    checks.push({
      status: n('integrated') > 0 ? 'ok' : 'advice',
      text: `${levels.length} ${levels.length === 1 ? 'piece' : 'pieces'} of evidence: ${n('quoted')} quoted, ${n('used')} used, ${n('integrated')} integrated.`,
      standing: 'strategy',
    });
    checks.push({
      status: n('integrated') > 0 ? 'ok' : 'advice',
      text: 'The top level of criterion D asks for document data used effectively in a thorough analysis and evaluation, with ideas integrated and the assumptions and implications of the arguments considered.',
      standing: 'ib',
      source: 'Guide, p. 58',
    });
  }
  if (unused.length && levels.length)
    checks.push({
      status: 'advice',
      text: `${unused.join(', ')} ${unused.length === 1 ? 'is' : 'are'} not used in any of your evidence yet. Most of the project's information should come from the supporting documents: use each one, or ask whether it belongs in the set.`,
      standing: 'ib',
      source: 'Guide, p. 53',
    });
  return { quoted: n('quoted'), used: n('used'), integrated: n('integrated'), unused, checks };
}

export interface EvidenceState {
  v: 1;
  /** How many supporting documents the reader has, three to five. */
  docs: number;
  items: EvidenceItem[];
}

export const MAX_ITEMS = 15;

export const emptyEvidence = (): EvidenceState => ({ v: 1, docs: 5, items: [blankItem(), blankItem(), blankItem()] });

/** Saved state, read defensively. */
export function parseEvidence(raw: unknown): EvidenceState {
  const out = emptyEvidence();
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;
  if (typeof r.docs === 'number' && Number.isInteger(r.docs) && r.docs >= 3 && r.docs <= 5) out.docs = r.docs;
  if (Array.isArray(r.items)) {
    const sdOk = (v: unknown) => (typeof v === 'string' && /^SD[1-5]$/.test(v) ? v : '');
    const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
    const items = r.items
      .slice(0, MAX_ITEMS)
      .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
      .map((x) => ({ sd: sdOk(x.sd), finding: str(x.finding, 600), tool: str(x.tool, 200), result: str(x.result, 600), against: sdOk(x.against), assumption: str(x.assumption, 600), implication: str(x.implication, 600) }));
    if (items.length) out.items = items;
  }
  return out;
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** The log as CSV, one row per piece of evidence, with its level. */
export function evidenceCsv(items: EvidenceItem[]): string {
  const head = ['Document', 'Evidence', 'Tool or theory', 'What it showed', 'Weighed against', 'Assumption or limitation', 'What it means for the question', 'Reading'];
  const rows = items.filter((e) => has(e.finding)).map((e) => [e.sd, e.finding, e.tool, e.result, e.against, e.assumption, e.implication, LEVEL_WORD[levelOf(e) as Exclude<Level, 'empty'>]]);
  return [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}
