/**
 * Advanced Management and Strategy: the six domains, the plan of modules in
 * each, and the helpers the pages share. The plan says which topics each
 * module carries, so that every topic of the brief has a home in a module of
 * real depth rather than a thin page of its own. Pages list only modules that
 * exist; nothing here is shown as a promise.
 */
import type { AdvancedDomain, AdvancedModule, Audience } from './advanced-schema';

export interface DomainInfo {
  id: AdvancedDomain;
  name: string;
  /** A short name for tight spaces. */
  short: string;
  order: number;
  /** The question the domain helps a manager answer. */
  question: string;
  intro: string;
}

export const DOMAINS: DomainInfo[] = [
  {
    id: 'strategy',
    name: 'Advanced strategy',
    short: 'Strategy',
    order: 1,
    question: 'Where should the business compete, and how will it win there?',
    intro:
      'Competitive and corporate strategy at university and business school depth: how industries shape profit, where advantage comes from and how long it lasts, when to grow by acquisition or alliance, how to go international, how disruption and digital change rewrite business models, and why most strategies fail in execution rather than design.',
  },
  {
    id: 'finance',
    name: 'Advanced financial management',
    short: 'Finance',
    order: 2,
    question: 'Does the decision create value, and can the business afford to make it?',
    intro:
      'The financial management that sits beyond the IB formula sheet: reading statements as an analyst, valuing investments with the time value of money and risk, the cost of capital and capital structure, working capital and cash flow models, valuation, and the sensitivity and scenario analysis that keep forecasts honest.',
  },
  {
    id: 'leadership',
    name: 'Leadership and organisational behaviour',
    short: 'Leadership',
    order: 3,
    question: 'How do people, structures and cultures turn a decision into results?',
    intro:
      'How organisations actually behave: leading when the facts are uncertain, designing structures, what culture is and whether it can be changed, incentives and their side effects, politics and conflict, managing talent, and the governance that holds executives to account.',
  },
  {
    id: 'marketing',
    name: 'Advanced marketing',
    short: 'Marketing',
    order: 4,
    question: 'Which customers create value, and what will they pay for?',
    intro:
      'Marketing as a discipline of evidence: brand strategy and positioning, the economics of acquiring and keeping customers, segmentation that predicts behaviour, pricing strategy, measuring what marketing really does, and taking a brand across borders.',
  },
  {
    id: 'operations',
    name: 'Operations and supply chain strategy',
    short: 'Operations',
    order: 5,
    question: 'Can the business deliver what it promises, reliably and at the right cost?',
    intro:
      'Operations as a source of advantage: aligning operations with strategy, process improvement and lean systems, capacity, quality and technology, resilient and responsible supply chains, and the trade-offs between cost, speed, flexibility and risk.',
  },
  {
    id: 'entrepreneurship',
    name: 'Entrepreneurship and innovation',
    short: 'Entrepreneurship',
    order: 6,
    question: 'Is there a business here, and how should it grow?',
    intro:
      'Building new ventures and new businesses inside established ones: validating a model before spending on it, unit economics and entrepreneurial finance, funding and venture capital, managing innovation, scaling, and what founders learn from failure.',
  },
];

export const DOMAIN_BY_ID = Object.fromEntries(DOMAINS.map((d) => [d.id, d])) as Record<AdvancedDomain, DomainInfo>;

export const AUDIENCE_LABELS: Record<Audience, string> = {
  undergraduate: 'Undergraduate',
  mba: 'MBA',
  professional: 'Professional',
};

/** The eight parts of every module, in order, with their anchors. */
export const MODULE_PARTS = [
  { id: 'foundation', title: 'Conceptual foundation' },
  { id: 'explanation', title: 'Advanced explanation' },
  { id: 'models', title: 'Models and frameworks' },
  { id: 'applications', title: 'Real business applications' },
  { id: 'cases', title: 'Case studies' },
  { id: 'evaluation', title: 'Critical evaluation' },
  { id: 'decision', title: 'Decision exercise' },
  { id: 'reading', title: 'Further reading' },
] as const;

/**
 * The plan: each domain's modules and the topics they carry. The ids are the
 * file names in src/content/advanced/. The integrity check holds the content
 * to this plan, so no topic is left without a home and no module drifts.
 */
export const MODULE_PLAN: Record<AdvancedDomain, Array<{ id: string; title: string; covers: string[] }>> = {
  strategy: [
    { id: 'competitive-advantage-and-industry-analysis', title: 'Competitive advantage and industry analysis', covers: ['Competitive strategy', 'Competitive advantage', 'Industry analysis'] },
    { id: 'corporate-strategy-and-restructuring', title: 'Corporate strategy and restructuring', covers: ['Corporate strategy', 'Corporate restructuring'] },
    { id: 'mergers-acquisitions-and-alliances', title: 'Mergers, acquisitions and strategic alliances', covers: ['Mergers and acquisitions', 'Strategic alliances'] },
    { id: 'disruption-and-business-model-innovation', title: 'Disruption, digital transformation and business model innovation', covers: ['Business model innovation', 'Disruptive innovation', 'Digital transformation'] },
    { id: 'international-expansion', title: 'International expansion', covers: ['International expansion'] },
    { id: 'strategy-execution-change-and-crisis', title: 'Strategy execution, change and crisis', covers: ['Strategic execution', 'Organisational change', 'Crisis management'] },
  ],
  finance: [
    { id: 'financial-statement-analysis', title: 'Financial statement analysis', covers: ['Financial statement analysis'] },
    { id: 'capital-budgeting-and-investment-decisions', title: 'Capital budgeting and investment decisions', covers: ['Capital budgeting', 'Investment decisions'] },
    { id: 'cost-of-capital-and-capital-structure', title: 'Risk, return, the cost of capital and capital structure', covers: ['Cost of capital', 'Capital structure', 'Risk and return'] },
    { id: 'working-capital-and-cash-flow-modelling', title: 'Working capital, forecasting and cash flow modelling', covers: ['Working capital management', 'Financial forecasting', 'Cash flow modelling'] },
    { id: 'valuation-fundamentals', title: 'Valuation fundamentals', covers: ['Valuation fundamentals'] },
    { id: 'sensitivity-and-scenario-planning', title: 'Sensitivity analysis and scenario planning', covers: ['Sensitivity analysis', 'Scenario planning'] },
  ],
  leadership: [
    { id: 'leadership-under-uncertainty', title: 'Leadership under uncertainty and executive decision-making', covers: ['Leadership under uncertainty', 'Executive decision-making'] },
    { id: 'organisational-design-and-culture', title: 'Organisational design and corporate culture', covers: ['Organisational design', 'Corporate culture'] },
    { id: 'motivation-incentives-and-talent', title: 'Motivation, incentives and talent', covers: ['Motivation and incentives', 'Talent management'] },
    { id: 'change-politics-and-conflict', title: 'Change, organisational politics and conflict', covers: ['Change management', 'Organisational politics', 'Conflict resolution'] },
    { id: 'governance-and-accountability', title: 'Governance and accountability', covers: ['Governance and accountability'] },
  ],
  marketing: [
    { id: 'brand-strategy-and-positioning', title: 'Brand strategy and competitive positioning', covers: ['Brand strategy', 'Competitive positioning'] },
    { id: 'customer-economics', title: 'Customer economics: segmentation, acquisition and lifetime value', covers: ['Customer segmentation', 'Customer acquisition', 'Customer lifetime value'] },
    { id: 'pricing-strategy', title: 'Pricing strategy', covers: ['Pricing strategy'] },
    { id: 'marketing-analytics-and-performance', title: 'Marketing analytics, performance measurement and digital transformation', covers: ['Marketing analytics', 'Marketing performance measurement', 'Digital transformation'] },
    { id: 'international-marketing', title: 'International marketing', covers: ['International marketing'] },
  ],
  operations: [
    { id: 'operations-strategy-and-process', title: 'Operations strategy, process optimisation and lean systems', covers: ['Operations strategy', 'Process optimisation', 'Lean systems'] },
    { id: 'capacity-quality-and-technology', title: 'Capacity planning, quality management and technology adoption', covers: ['Capacity planning', 'Quality management', 'Technology adoption'] },
    { id: 'supply-chain-resilience-and-sourcing', title: 'Supply chain resilience, global sourcing and risk', covers: ['Supply chain resilience', 'Global sourcing', 'Risk management'] },
    { id: 'sustainable-operations', title: 'Sustainable operations', covers: ['Sustainable operations'] },
  ],
  entrepreneurship: [
    { id: 'startup-strategy-and-validation', title: 'Startup strategy, business model validation and product-market fit', covers: ['Startup strategy', 'Business model validation', 'Product-market fit'] },
    { id: 'unit-economics-and-entrepreneurial-finance', title: 'Unit economics and entrepreneurial finance', covers: ['Unit economics', 'Entrepreneurial finance'] },
    { id: 'funding-and-venture-capital', title: 'Funding strategy and venture capital', covers: ['Funding strategy', 'Venture capital'] },
    { id: 'scaling-innovation-and-failure', title: 'Scaling, innovation management, failure and recovery', covers: ['Scaling', 'Innovation management', 'Startup failure and recovery'] },
  ],
};

export const advancedHref = (domain: AdvancedDomain, id?: string): string => (id ? `/advanced/${domain}/${id}/` : `/advanced/${domain}/`);

/** The words a reader meets in a module, for the reading time and the depth check. */
export function moduleWords(m: AdvancedModule): number {
  const texts = [
    m.dek,
    m.bridge.text,
    m.foundation,
    ...m.advanced.flatMap((s) => [s.title, s.body]),
    ...m.models.flatMap((x) => [x.summary, x.use, x.limits]),
    ...m.applications.flatMap((a) => [a.title, a.body]),
    ...m.cases.flatMap((c) => [c.situation, ...c.questions]),
    m.evaluation,
    m.decision.brief,
    ...m.decision.options.map((o) => o.text),
    m.decision.guidance,
  ];
  return texts.join(' ').split(/\s+/).filter(Boolean).length;
}

/** Modules in their domains' order, then their own. */
export function inOrder<T extends { data: AdvancedModule }>(list: T[]): T[] {
  return [...list].sort((a, b) => DOMAIN_BY_ID[a.data.domain].order - DOMAIN_BY_ID[b.data.domain].order || a.data.order - b.data.order);
}
