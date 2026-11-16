/**
 * The Boardroom Briefings as a series: labels, addresses and the plan of each
 * edition. Pure, so the pages, the integrity check and the unit tests share
 * one set of words and one set of addresses.
 */
import { LAB, LAB_IDS, labHref as calculatorHref } from '../finance-lab/catalogue';
import type { BoardroomBriefing, DecisionType } from './schema';

export const SERIES_ROOT = '/boardroom-briefings/';
export const briefingHref = (id: string): string => `${SERIES_ROOT}${id}/`;
export const SERIES_NAME = 'The Boardroom Briefings';

export const DECISION_TYPE_LABELS: Record<DecisionType, { label: string; text: string }> = {
  'market-entry': { label: 'Market entry', text: 'Whether to enter a market abroad, and by which route.' },
  acquisition: { label: 'Acquisition', text: 'Whether to buy a business, at what price and with what money.' },
  'profit-recovery': { label: 'Profit recovery', text: 'How to restore margins that are falling year after year.' },
  automation: { label: 'Operations investment', text: 'Whether machines should take over work that people do.' },
  'crisis-leadership': { label: 'Crisis leadership', text: 'How to lead when the business is stopped by an event it did not choose.' },
  'growth-and-funding': { label: 'Growth and funding', text: 'How fast to grow, and who pays for it.' },
  'competitive-response': { label: 'Competitive response', text: 'How to answer a rival that changes the rules of the market.' },
  'vertical-integration': { label: 'Make or buy', text: 'Whether to own a stage of the supply chain or keep buying from it.' },
  'capital-allocation': { label: 'Capital allocation', text: 'How to divide cash between owners today and investment for tomorrow.' },
  'reputation-recovery': { label: 'Reputation recovery', text: 'How to rebuild trust after the business has lost it.' },
};

/** The Student edition's sections, in reading order, with their anchors. */
export const STUDENT_SECTIONS = [
  { id: 'summary', title: 'Executive summary' },
  { id: 'background', title: 'Business background' },
  { id: 'context', title: 'Strategic context' },
  { id: 'evidence', title: 'Relevant evidence' },
  { id: 'financials', title: 'Financial information' },
  { id: 'stakeholders', title: 'Stakeholder implications' },
  { id: 'options', title: 'The strategic options' },
  { id: 'criteria', title: 'Evaluation criteria' },
  { id: 'questions', title: 'Discussion questions' },
] as const;

/** The Analysis edition's sections, in reading order, with their anchors. */
export const ANALYSIS_SECTIONS = [
  { id: 'a-summary', title: 'Executive summary' },
  { id: 'a-evidence', title: 'What the evidence shows' },
  { id: 'a-assumptions', title: 'The assumptions' },
  { id: 'a-tradeoffs', title: 'The trade-offs' },
  { id: 'a-alternatives', title: 'The alternatives, judged' },
  { id: 'a-recommendation', title: 'The recommended course of action' },
  { id: 'a-implementation', title: 'Implementation' },
  { id: 'a-measures', title: 'Evaluation: how to tell if it is working' },
  { id: 'a-limitations', title: 'Limitations' },
  { id: 'a-questions', title: 'Notes on the discussion questions' },
] as const;

/** "No. 03". */
export const issueNo = (n: number): string => `No. ${String(n).padStart(2, '0')}`;

/** "£ thousand (£000)", "€ million (€m)", "US$ (whole dollars)". */
export function moneyUnit(currency: BoardroomBriefing['currency']): string {
  const { symbol, unit, code } = currency;
  if (unit === 'thousand') return `${code}, in thousands (${symbol}000)`;
  if (unit === 'million') return `${code}, in millions (${symbol}m)`;
  return code;
}

export const STAKE_LABELS = { high: 'High', medium: 'Medium', low: 'Low' } as const;

export const FIT_LABELS = {
  strong: 'Best supported by the evidence',
  conditional: 'Defensible if its conditions hold',
  weak: 'Weakly supported by the evidence',
} as const;

export const EVIDENCE_KIND_LABELS = {
  company: { label: 'The company’s own evidence', tag: 'Simulated data' },
  research: { label: 'Established research', tag: 'Cited research' },
  market: { label: 'How the market works', tag: 'General context' },
} as const;

export const TOOL_KIND_LABELS = {
  toolkit: 'IB toolkit guide',
  studio: 'Strategy Studio',
  calculator: 'Financial Laboratory',
  lab: 'Entrepreneurship and Innovation Lab',
} as const;

/** What a tool reference needs to resolve: the ids each kind may name. */
export interface ToolRegistry {
  toolkit: Record<string, { name: string; status: string; level?: string }>;
  studio: Array<{ slug: string; title: string }>;
  lab: Record<string, string>;
}

/** The address of a tool a briefing uses. A toolkit tool whose guide is planned links to its entry in the toolkit. */
export function toolHref(kind: BoardroomBriefing['tools'][number]['kind'], id: string, reg: ToolRegistry): string | null {
  switch (kind) {
    case 'toolkit': {
      const t = reg.toolkit[id];
      if (!t) return null;
      return t.status === 'complete' ? `/toolkit/${id}/` : `/toolkit/#tool-${id}`;
    }
    case 'studio':
      return reg.studio.some((s) => s.slug === id) ? `/strategy-studio/${id}/` : null;
    case 'calculator':
      return LAB_IDS.includes(id) ? calculatorHref(id) : null;
    case 'lab':
      return id in reg.lab ? `/entrepreneurship-lab/${id}/` : null;
  }
}

/** The name of a tool a briefing uses. */
export function toolName(kind: BoardroomBriefing['tools'][number]['kind'], id: string, reg: ToolRegistry): string {
  switch (kind) {
    case 'toolkit':
      return reg.toolkit[id]?.name ?? id;
    case 'studio':
      return reg.studio.find((s) => s.slug === id)?.title ?? id;
    case 'calculator':
      return LAB.find((e) => e.id === id)?.name ?? id;
    case 'lab':
      return reg.lab[id] ?? id;
  }
}

/** Words in the briefing's main prose, for a reading time. */
export function readingMinutes(texts: string[]): number {
  const words = texts.join(' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
