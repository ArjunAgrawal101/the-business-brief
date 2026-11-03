/**
 * The Market Studio's instruments: one page each at /market-studio/<slug>/,
 * in the order a marketing plan uses them. Each instrument's content (its
 * guide, its worked example) is an entry in src/content/interactives; this
 * list only fixes the order, the address and the stage of the plan it
 * belongs to. src/lib/integrity-market.ts checks the two agree.
 */

export type MarketStage = 'understand' | 'choose' | 'build' | 'launch';

export const MARKET_STAGES: Array<{ id: MarketStage; title: string; text: string }> = [
  { id: 'understand', title: 'Read the market', text: 'How big it is, who is in it, and what customers say when you ask them properly.' },
  { id: 'choose', title: 'Choose where to compete', text: 'Which customers to serve, and where to stand against the rivals they already know.' },
  { id: 'build', title: 'Build the offer', text: 'A marketing mix that fits the target and holds together, and what happens to it over the product’s life.' },
  { id: 'launch', title: 'Take it to market', text: 'A campaign with an objective you can measure, and a budget spent where the next dollar works hardest.' },
];

export interface MarketTool {
  slug: string;
  /** The entry in src/content/interactives that holds the instrument's guide and worked example. */
  ix: string;
  component: string;
  stage: MarketStage;
  /** Short name for lists and breadcrumbs. */
  name: string;
  /** One line for the studio's index. */
  short: string;
  /** Case interactions that also live on the instrument's page. */
  cases?: string[];
  /** The page holds HL-only material (marked data-level="HL"): the notice shown when the SL view hides it. The page then offers the SL and HL switch. */
  hlNotice?: string;
}

export const MARKET_TOOLS: MarketTool[] = [
  { slug: 'market-metrics', ix: 'market-metrics-corner-brew', component: 'market-metrics', stage: 'understand', name: 'Market metrics calculators', short: 'Market share, market growth and relative share for a market you define; customer lifetime value as enrichment.', cases: ['market-share-porto'], hlNotice: 'The case exercise’s closing question, on the importance of market share and market leadership, is HL-only material, hidden while you are viewing SL content. Switch to HL above to see it.' },
  { slug: 'research-questionnaire', ix: 'market-questionnaire-corner-brew', component: 'questionnaire-builder', stage: 'understand', name: 'Market research questionnaire builder', short: 'Write a survey question by question, with checks for leading and double-barrelled wording and notes on the sample.' },
  { slug: 'customer-persona', ix: 'market-persona-corner-brew', component: 'persona-creator', stage: 'understand', name: 'Customer persona creator', short: 'A portrait of one typical customer in a target segment: needs, pains, channels and the evidence behind it.' },
  { slug: 'stp-planner', ix: 'market-stp-corner-brew', component: 'stp-planner', stage: 'choose', name: 'STP planner', short: 'Segment by the bases you choose, weigh the segments, choose targets and write the positioning statement.' },
  { slug: 'positioning-map', ix: 'market-map-corner-brew', component: 'competitor-map', stage: 'choose', name: 'Competitor positioning map', short: 'Your own axes and rivals, with the open spaces outlined and a four-question test for any gap.', cases: ['market-position-map-porto'] },
  { slug: 'marketing-mix', ix: 'market-mix-corner-brew', component: 'mix-builder', stage: 'build', name: 'Marketing mix builder', short: 'Four Ps for a good or seven for a service, checked against the target, the position and each other.' },
  { slug: 'product-life-cycle', ix: 'market-plc-corner-brew', component: 'plc-simulator', stage: 'build', name: 'Product life cycle simulator', short: 'Sales, profit and cash flow through the stages, and what extension strategies add and cost.' },
  { slug: 'campaign-planner', ix: 'market-campaign-corner-brew', component: 'campaign-planner', stage: 'launch', name: 'Marketing campaign planner', short: 'Objective, audience, message, channels, timeline and KPIs, with a Gantt chart and a funnel estimate.' },
  { slug: 'budget-allocation', ix: 'market-budget-corner-brew', component: 'budget-allocator', stage: 'launch', name: 'Marketing budget allocation', short: 'Split a promotion budget across channels and see diminishing returns, on an illustrative model.' },
];

export const toolHref = (slug: string): string => `/market-studio/${slug}/`;

/** The localStorage key (after the platform's "bb:" prefix) where an instrument keeps the reader's work. */
export const toolKey = (slug: string): string => `market:${slug}`;

export function toolBySlug(slug: string): MarketTool | undefined {
  return MARKET_TOOLS.find((t) => t.slug === slug);
}

/** The instruments before and after one, for the page's own navigation. */
export function neighbours(slug: string): { prev?: MarketTool; next?: MarketTool } {
  const i = MARKET_TOOLS.findIndex((t) => t.slug === slug);
  return { prev: i > 0 ? MARKET_TOOLS[i - 1] : undefined, next: i >= 0 && i < MARKET_TOOLS.length - 1 ? MARKET_TOOLS[i + 1] : undefined };
}
