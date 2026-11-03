/**
 * Entrepreneurship and Innovation Lab: the business plan outline builder. The
 * business plan is one of the IB toolkit's tools (guide, p. 14); the outline,
 * its sections and its prompts are the platform's own. Pure functions for
 * word counts, progress, the figures the other Lab tools contribute, and the
 * Markdown export, shared by the builder, its script and the unit tests.
 */
import { fmtMoney, fmtNumber } from '../format';

export interface PlanSection {
  id: string;
  title: string;
  prompts: string[];
  /** Lab tools that help with the section, by id. */
  tools: string[];
  /** IB subtopics the section draws on. */
  ib: string[];
  /** Words at which a section counts as drafted. */
  words: number;
}

export interface PlanState {
  title: string;
  sections: Record<string, string>;
}

export const PLAN_FORMAT_NOTE = 'An outline for planning and learning, not financial or legal advice.';

export function words(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export type SectionStatus = 'empty' | 'started' | 'drafted';

export interface PlanProgress {
  sections: Record<string, { words: number; status: SectionStatus }>;
  drafted: number;
  started: number;
  empty: number;
  words: number;
}

export function planProgress(defs: PlanSection[], state: PlanState): PlanProgress {
  const sections: PlanProgress['sections'] = {};
  let total = 0;
  for (const d of defs) {
    const w = words(state.sections[d.id] ?? '');
    total += w;
    sections[d.id] = { words: w, status: w === 0 ? 'empty' : w < d.words ? 'started' : 'drafted' };
  }
  const count = (s: SectionStatus) => Object.values(sections).filter((x) => x.status === s).length;
  return { sections, drafted: count('drafted'), started: count('started'), empty: count('empty'), words: total };
}

/* ---------- Figures from the other Lab tools ---------- */

/** What each Lab tool saves about its latest valid result, for the plan to quote. */
export interface LabSummaries {
  feasibility?: { idea: string; share: number; rank: number; of: number; passes: boolean; verdict: string; threshold: number };
  canvas?: { name: string; entries: number; assumptions: number; evidence: number; segments: string[]; propositions: string[]; riskiest: Array<{ text: string; block: string; risk: number; note: string }> };
  unit?: { currency: string; cac: number | null; contribution: number; lifetime: number; ltv: number; ratio: number | null; payback: number | null };
  costs?: { currency: string; oneOff: number; monthly: number; funding: number; cashAtLaunch: number; runway: number; runOut: number | null; breakEven: number | null; gap: number; horizon: number; mix: string };
  revenue?: { currency: string; total: number; first: number; last: number; months: number; streams: Array<{ label: string; share: number }>; endSubscribers: number };
}

/** The plan sections the digest writes into: the plan's outline must contain each of them. */
export const DIGEST_SECTIONS = ['opportunity', 'market', 'model', 'finance', 'risks'] as const;
export type DigestSection = (typeof DIGEST_SECTIONS)[number];

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const numOrNull = (v: unknown) => v === null || isNum(v);
const strings = (v: unknown) => Array.isArray(v) && v.every(isStr);

/** Keeps only the summaries that have the expected shape, so a damaged or old saved value is ignored rather than shown. */
export function cleanSummaries(raw: Record<string, unknown>): LabSummaries {
  const out: LabSummaries = {};
  const f = raw.feasibility as Record<string, unknown> | undefined;
  if (f && isStr(f.idea) && isNum(f.share) && isNum(f.rank) && isNum(f.of) && typeof f.passes === 'boolean' && isStr(f.verdict) && isNum(f.threshold)) out.feasibility = f as LabSummaries['feasibility'];
  const c = raw.canvas as Record<string, unknown> | undefined;
  if (c && isStr(c.name) && isNum(c.entries) && isNum(c.assumptions) && isNum(c.evidence) && strings(c.segments) && strings(c.propositions) && Array.isArray(c.riskiest) && c.riskiest.every((r) => r && isStr((r as Record<string, unknown>).text) && isStr((r as Record<string, unknown>).block) && isNum((r as Record<string, unknown>).risk) && isStr((r as Record<string, unknown>).note))) out.canvas = c as LabSummaries['canvas'];
  const u = raw.unit as Record<string, unknown> | undefined;
  if (u && isStr(u.currency) && numOrNull(u.cac) && isNum(u.contribution) && isNum(u.lifetime) && isNum(u.ltv) && numOrNull(u.ratio) && numOrNull(u.payback)) out.unit = u as LabSummaries['unit'];
  const k = raw.costs as Record<string, unknown> | undefined;
  if (k && isStr(k.currency) && isNum(k.oneOff) && isNum(k.monthly) && isNum(k.funding) && isNum(k.cashAtLaunch) && isNum(k.runway) && numOrNull(k.runOut) && numOrNull(k.breakEven) && isNum(k.gap) && isNum(k.horizon) && isStr(k.mix)) out.costs = k as LabSummaries['costs'];
  const r = raw.revenue as Record<string, unknown> | undefined;
  if (r && isStr(r.currency) && isNum(r.total) && isNum(r.first) && isNum(r.last) && isNum(r.months) && isNum(r.endSubscribers) && Array.isArray(r.streams) && r.streams.every((s) => s && isStr((s as Record<string, unknown>).label) && isNum((s as Record<string, unknown>).share))) out.revenue = r as LabSummaries['revenue'];
  return out;
}

/** Lines for each plan section, written from the learner's own results in the other tools. Sections with nothing to quote are left out. */
export function digest(s: LabSummaries): Partial<Record<DigestSection, string[]>> {
  const out: Partial<Record<DigestSection, string[]>> = {};
  const add = (k: DigestSection, line: string) => (out[k] ??= []).push(line);
  if (s.feasibility) {
    const f = s.feasibility;
    add('opportunity', `Feasibility assessment: ${f.idea} scores ${fmtNumber(f.share, 0)}% of the maximum on the weighted criteria${f.of > 1 ? `, ranked ${f.rank} of ${f.of} ideas` : ''}, ${f.passes ? 'above' : 'below'} the pass mark of ${f.threshold}% (${f.verdict.toLowerCase()}).`);
  }
  if (s.canvas) {
    const c = s.canvas;
    if (c.segments.length) add('market', `Customer segments on the canvas: ${c.segments.join('; ')}.`);
    if (c.propositions.length) add('market', `Value propositions on the canvas: ${c.propositions.join('; ')}.`);
    add('model', `Business Model Canvas: ${c.entries} entries, of which ${c.assumptions} are assumptions and ${c.evidence} are backed by evidence.`);
    c.riskiest.forEach((r, i) => add('risks', `Riskiest assumption ${i + 1} (${r.block}, risk ${r.risk} of 5): ${r.text}${r.note ? `. Test: ${r.note}` : ''}`));
  }
  if (s.unit) {
    const u = s.unit;
    const m = (v: number) => fmtMoney(v, u.currency, 2);
    add('model', `Unit economics: each customer costs ${u.cac === null ? 'an unknown amount' : m(u.cac)} to win and contributes ${m(u.contribution)} a month for about ${fmtNumber(u.lifetime, 1)} months, a lifetime value of ${m(u.ltv)}${u.ratio === null ? '' : ` (LTV to CAC ${fmtNumber(u.ratio, 1)} to 1)`}${u.payback === null ? '; the acquisition cost is never earned back' : `; the acquisition cost is earned back in ${fmtNumber(u.payback, 1)} months`}.`);
  }
  if (s.costs) {
    const k = s.costs;
    const m = (v: number) => fmtMoney(v, k.currency, 0);
    add('finance', `Start-up costs: ${m(k.oneOff)} one-off and ${m(k.monthly)} a month, against funding of ${m(k.funding)}, leaving ${m(k.cashAtLaunch)} at launch.`);
    add('finance', k.runOut === null ? `Runway: the cash lasts all ${k.horizon} months projected.` : `Runway: the cash runs out in month ${k.runOut} on the expected sales, so the runway is ${k.runway} ${k.runway === 1 ? 'month' : 'months'}.`);
    add('finance', k.breakEven === null ? `Contribution does not cover the monthly outgoings within ${k.horizon} months.` : `Contribution first covers the monthly outgoings in month ${k.breakEven}.`);
    if (k.gap > 0) add('finance', `Funding gap: about ${m(k.gap)} more is needed for the cash to stay above zero.`);
    if (k.mix) add('finance', k.mix);
  }
  if (s.revenue) {
    const r = s.revenue;
    const m = (v: number) => fmtMoney(v, r.currency, 0);
    add('finance', `Revenue forecast: ${m(r.total)} over ${r.months} months, from ${m(r.first)} in month 1 to ${m(r.last)} in month ${r.months}; ${r.streams.map((x) => `${x.label} ${fmtNumber(x.share, 0)}%`).join(', ')}.${r.endSubscribers > 0 ? ` ${fmtNumber(r.endSubscribers)} subscribers at the end of the period.` : ''}`);
  }
  return out;
}

/* ---------- The Markdown export ---------- */

export function planMarkdown(defs: PlanSection[], state: PlanState, lines: Partial<Record<string, string[]>>, date: string): string {
  const title = state.title.trim() || 'Business plan outline';
  const out: string[] = [`# ${title}`, '', `Drafted in the Entrepreneurship and Innovation Lab, The Business Brief, on ${date}. ${PLAN_FORMAT_NOTE}`, ''];
  defs.forEach((d, i) => {
    out.push(`## ${i + 1}. ${d.title}`, '');
    const text = (state.sections[d.id] ?? '').trim();
    if (text) out.push(text, '');
    else {
      out.push('*Not written yet. Questions to answer:*', '');
      d.prompts.forEach((p) => out.push(`- ${p}`));
      out.push('');
    }
    const figs = lines[d.id];
    if (figs?.length) {
      out.push('**From the Lab tools**', '');
      figs.forEach((l) => out.push(`- ${l}`));
      out.push('');
    }
  });
  return `${out.join('\n').trimEnd()}\n`;
}
