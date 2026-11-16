/**
 * Where each Boardroom Briefing's decision is taken further, beyond the IB
 * course, in Advanced Management and Strategy. One map serves both
 * directions: a briefing lists the modules that go deeper into its decision,
 * and a module lists the briefings that put its ideas to a board. Checked by
 * tests/unit/boardroom-briefings-links.test.ts against the briefings on disk
 * and the module plan, so a link can never point at nothing.
 */
import type { AdvancedDomain } from '../advanced-schema';

export type ModuleRef = readonly [domain: AdvancedDomain, id: string];

export const BRIEFING_MODULES: Readonly<Record<string, readonly ModuleRef[]>> = {
  'international-market-entry': [
    ['strategy', 'international-expansion'],
    ['marketing', 'international-marketing'],
  ],
  'acquiring-a-competitor': [
    ['strategy', 'mergers-acquisitions-and-alliances'],
    ['finance', 'valuation-fundamentals'],
  ],
  'declining-profitability': [
    ['strategy', 'competitive-advantage-and-industry-analysis'],
    ['strategy', 'strategy-execution-change-and-crisis'],
    ['finance', 'financial-statement-analysis'],
  ],
  'automating-operations': [
    ['operations', 'capacity-quality-and-technology'],
    ['operations', 'operations-strategy-and-process'],
    ['finance', 'capital-budgeting-and-investment-decisions'],
  ],
  'leading-through-a-crisis': [
    ['strategy', 'strategy-execution-change-and-crisis'],
    ['leadership', 'leadership-under-uncertainty'],
  ],
  'growth-or-profitability': [
    ['entrepreneurship', 'unit-economics-and-entrepreneurial-finance'],
    ['entrepreneurship', 'funding-and-venture-capital'],
    ['entrepreneurship', 'scaling-innovation-and-failure'],
    ['marketing', 'customer-economics'],
  ],
  'disruptive-competitor': [
    ['strategy', 'disruption-and-business-model-innovation'],
    ['strategy', 'competitive-advantage-and-industry-analysis'],
  ],
  'vertical-integration': [
    ['operations', 'supply-chain-resilience-and-sourcing'],
    ['operations', 'operations-strategy-and-process'],
  ],
  'shareholder-returns-or-investment': [
    ['finance', 'cost-of-capital-and-capital-structure'],
    ['finance', 'capital-budgeting-and-investment-decisions'],
    ['leadership', 'governance-and-accountability'],
    ['strategy', 'corporate-strategy-and-restructuring'],
  ],
  'reputational-damage': [
    ['strategy', 'strategy-execution-change-and-crisis'],
    ['marketing', 'brand-strategy-and-positioning'],
    ['operations', 'sustainable-operations'],
  ],
};

/** The briefings whose decision a module takes further, in the map's order. */
export function briefingsForModule(domain: AdvancedDomain, id: string): string[] {
  return Object.entries(BRIEFING_MODULES)
    .filter(([, refs]) => refs.some(([d, m]) => d === domain && m === id))
    .map(([briefing]) => briefing);
}
