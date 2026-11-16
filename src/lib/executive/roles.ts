/**
 * The executive simulation's fixed vocabularies: the seven roles a learner
 * can take, the nine stages of the work, and the levers of a year's plan.
 * Kept apart from the schema so that the browser can use them without
 * loading the validation library.
 */

/** The seven roles, in the order the pages list them. */
export const ROLE_IDS = ['ceo', 'cfo', 'cmo', 'coo', 'chro', 'strategy', 'consultant'] as const;
export type RoleId = (typeof ROLE_IDS)[number];

export const ROLE_TITLES: Record<RoleId, string> = {
  ceo: 'Chief executive (CEO)',
  cfo: 'Chief financial officer (CFO)',
  cmo: 'Chief marketing officer (CMO)',
  coo: 'Chief operating officer (COO)',
  chro: 'Chief human resources officer (CHRO)',
  strategy: 'Strategy director',
  consultant: 'Management consultant',
};

/** A role inside a sentence: "the chief financial officer". */
export const ROLE_IN_TEXT: Record<RoleId, string> = {
  ceo: 'chief executive',
  cfo: 'chief financial officer',
  cmo: 'chief marketing officer',
  coo: 'chief operating officer',
  chro: 'chief human resources officer',
  strategy: 'strategy director',
  consultant: 'management consultant',
};

export const isRole = (r: unknown): r is RoleId => typeof r === 'string' && (ROLE_IDS as readonly string[]).includes(r);

/** The nine stages, then the debrief. Stages 1 to 6 are analysis; 7 to 9 are the plan, its years and the evaluation. */
export const STAGE_IDS = ['finance', 'causes', 'market', 'operations', 'people', 'strategy', 'allocate', 'implement', 'evaluate'] as const;
export type StageId = (typeof STAGE_IDS)[number];

/** The stages whose questions are checked before the learner moves on. */
export const ANALYSIS_STAGES = ['finance', 'causes', 'market', 'operations', 'people', 'strategy'] as const;
export type AnalysisStage = (typeof ANALYSIS_STAGES)[number];

/** The six levers of a year's plan. The last four share the year's budget. */
export const LEVER_IDS = ['price', 'costCut', 'marketing', 'capacity', 'people', 'international'] as const;
export type LeverId = (typeof LEVER_IDS)[number];
export const BUDGET_LEVERS = ['marketing', 'capacity', 'people', 'international'] as const;
export type BudgetLever = (typeof BUDGET_LEVERS)[number];

export const LEVER_LABELS: Record<LeverId, string> = {
  price: 'Price change',
  costCut: 'Efficiency programme',
  marketing: 'Marketing',
  capacity: 'Capacity investment',
  people: 'People programme',
  international: 'International expansion',
};

/** What each lever is, in a line, for forms and tables. */
export const LEVER_HINTS: Record<LeverId, string> = {
  price: 'Per cent on last year’s prices, from −10 to +10. Demand responds through the price elasticity of demand.',
  costCut: 'Per cent of overheads cut this year, from 0 to 15. The saving lasts; so does the strain on quality and morale.',
  marketing: 'This year’s whole marketing spend. Half of its effect on the brand arrives this year and half next year.',
  capacity: 'Machinery that adds plant capacity and cuts the hours each piece needs. Paid now; in use next year.',
  people: 'Training, development and retention pay. Morale responds this year; productivity next year.',
  international: 'Entering the export market: set-up first, then building sales. Exports start the year after set-up.',
};
