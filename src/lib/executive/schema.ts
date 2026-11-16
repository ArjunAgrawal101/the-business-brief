/**
 * The executive simulation: the shape of its content file
 * (src/content/executive/*.yaml).
 *
 * One fictional company whose profitability is declining. The file holds the
 * model's coefficients, the opening position and four years of history (the
 * levers the company pulled and the conditions it traded in), the three plan
 * years' conditions, the seven roles' briefings, the nine stages' evidence and
 * questions, the strategic alternatives with the plan each implies, and the
 * debrief. Every figure a learner sees is computed by the engine
 * (src/lib/executive/engine.ts) from this file; texts quote them through
 * tokens such as {{revenue@2026}}, never as typed numbers. Like
 * src/lib/schemas.ts, this module imports nothing from astro:content, so the
 * unit tests can use it.
 */
import { z } from 'astro/zod';
import { level } from '../schemas';
export { ROLE_IDS, ROLE_TITLES, ROLE_IN_TEXT, STAGE_IDS, LEVER_IDS, BUDGET_LEVERS } from './roles';
export type { RoleId, StageId, LeverId, BudgetLever } from './roles';

const md = z.string().trim().min(1);
const slug = z.string().regex(/^[a-z0-9-]+$/);

/* ------------------------------------------------------------------ */
/* Engine inputs                                                       */
/* ------------------------------------------------------------------ */

/** One year's decisions. Money is in the home currency's units, not thousands. */
export const leversSchema = z
  .object({
    /** Per cent change on last year's prices. */
    price: z.number(),
    /** Per cent of overheads cut this year by an efficiency programme. */
    costCut: z.number().nonnegative(),
    /** The year's whole marketing spend. */
    marketing: z.number().nonnegative(),
    /** Machinery bought this year: in use next year. */
    capacity: z.number().nonnegative(),
    /** Training, development and retention pay. */
    people: z.number().nonnegative(),
    /** Set-up and development of the export market. */
    international: z.number().nonnegative(),
  })
  .strict();
export type Levers = z.infer<typeof leversSchema>;

/** The world a year is traded in: nobody at the company chooses these. */
export const conditionsSchema = z
  .object({
    /** Per cent growth of the home market. */
    marketGrowth: z.number(),
    /** Per cent change in competitors' average price. */
    competitorPrice: z.number(),
    /** Per cent change in the cost of materials for each piece. */
    materialCost: z.number(),
    /** Per cent pay award. */
    wage: z.number(),
    /** Change in overheads (a new lease, say), in money. */
    overheads: z.number().default(0),
    /** Morale points from news nobody chose this year (a pay freeze, say). */
    morale: z.number().default(0),
    /** The exchange rate: units of the foreign currency for one unit of the home currency. */
    fx: z.number().positive(),
    /** Share (%) of export pieces damaged on the way this year, when something goes wrong (a port strike, say); otherwise the model's rate. */
    exportDamage: z.number().min(0).max(50).optional(),
    /** Dividends the owners decided to take: not a lever in this simulation. */
    dividends: z.number().nonnegative().default(0),
  })
  .strict();
export type Conditions = z.infer<typeof conditionsSchema>;

/** The model's coefficients: how strongly one part of the business moves another. */
export const modelSchema = z
  .object({
    taxRate: z.number().min(0).max(0.6),
    /* Demand */
    /** Price elasticity of demand at home (positive: demand falls by this many per cent for each 1% relative price rise). */
    elasticity: z.number().positive(),
    /** Share change in home demand per brand point away from the opening brand. */
    brandWeight: z.number().nonnegative(),
    /* The brand */
    /** Per cent of its strength the brand loses a year with no marketing at all. */
    brandDecay: z.number().min(0).max(100),
    /** Brand points a year's marketing builds: power × ln(1 + spend ÷ scale), half this year and half next. */
    marketingPower: z.number().nonnegative(),
    marketingScale: z.number().positive(),
    /** Brand points next year for every 10 points of service quality above the reference (reviews and referrals). */
    reviewWeight: z.number().nonnegative(),
    qualityRef: z.number().min(0).max(100),
    /* Operations */
    hoursPerWorker: z.number().positive(),
    /** Overtime allowed, as a share of normal hours. */
    overtimeMax: z.number().min(0).max(1),
    overtimePremium: z.number().nonnegative(),
    /** A new starter's output in the first year, as a share of an experienced worker's. */
    newStarterOutput: z.number().min(0).max(1),
    /* People */
    moraleNorm: z.number().min(0).max(100),
    /** Share of the gap to the norm that morale recovers each year. */
    moraleRecovery: z.number().min(0).max(1),
    /** Productivity change per morale point away from the norm, the same year. */
    moraleProductivity: z.number().nonnegative(),
    /** Morale points lost per 1% of paid hours worked as overtime. */
    overtimeStrain: z.number().nonnegative(),
    /** Labour turnover (% a year) with morale at the norm, its rise per point below, and its floor. */
    turnoverBase: z.number().nonnegative(),
    turnoverPerPoint: z.number().nonnegative(),
    turnoverMin: z.number().nonnegative(),
    /** Recruiting and inducting one replacement. */
    recruitCost: z.number().nonnegative(),
    /** Skill (the productivity index, 1 = the opening level) lost next year per point of turnover above the base. */
    skillLoss: z.number().nonnegative(),
    /** The people programme: morale this year = morale × ln(1 + spend ÷ scale); skill next year = skill × the same. */
    peopleMorale: z.number().nonnegative(),
    peopleSkill: z.number().nonnegative(),
    peopleScale: z.number().positive(),
    /* The efficiency programme */
    /** Morale points lost per 1% of overheads cut. */
    cutMorale: z.number().nonnegative(),
    /** Per cent of overheads that can be cut without touching the work: slack. */
    cutSlack: z.number().nonnegative(),
    /** Service quality points lost per 1% of overheads cut beyond the slack (fewer inspectors, cheaper finishes, thinner support). */
    cutQuality: z.number().nonnegative(),
    /** One-off cost of a cut (redundancy, ending leases) as a share of the year's saving. */
    cutCost: z.number().nonnegative(),
    /* Service quality */
    /** Service quality with no strain, no cuts, morale at the norm and skill at 1. */
    qualityBase: z.number().min(0).max(100),
    /** Quality points lost per point of normal-hours load above the threshold. */
    qualityStrain: z.number().nonnegative(),
    strainThreshold: z.number().min(0).max(200),
    /** Quality points lost per point of the year's opening morale below the norm. */
    qualityMorale: z.number().nonnegative(),
    /** Quality points per 1.0 of skill above 1. */
    qualitySkill: z.number().nonnegative(),
    /** Pieces returned or remade (%) at the reference quality, the rise per quality point below it, and the floor. */
    returnsBase: z.number().nonnegative(),
    returnsPerPoint: z.number().nonnegative(),
    returnsMin: z.number().nonnegative(),
    /* Capacity investment */
    /** Plant capacity added a year for each 1,000,000 spent, from the next year. */
    capacityPerMillion: z.number().nonnegative(),
    /** Share cut from the hours each piece needs for each 1,000,000 spent, from the next year. */
    capacityHours: z.number().min(0).max(0.5),
    /** Years over which machinery is depreciated, straight line. */
    capacityLife: z.number().int().positive(),
    /* International expansion */
    /** Spend that opens the export market (agents, certification, a trade fair); sales start the year after it is complete. */
    intlSetup: z.number().positive(),
    /** Pieces a year the export market would take at full development and the opening price. */
    intlPotential: z.number().nonnegative(),
    /** Development spend that reaches about two thirds of the potential: demand = potential × (1 − e^(−development ÷ scale)). */
    intlScale: z.number().positive(),
    /** Share of the development lost each year without new spend. */
    intlDecay: z.number().min(0).max(1),
    intlElasticity: z.number().nonnegative(),
    /** The price received abroad (after the distributor's margin) as a share of the home price, at the planning rate. */
    intlPriceRatio: z.number().positive(),
    /** The planning exchange rate at which the export price list is set. */
    fxRef: z.number().positive(),
    /** Freight, duty and insurance for each piece shipped. */
    intlFreight: z.number().nonnegative(),
    /** Share (%) of export pieces damaged on the way and replaced. */
    intlDamage: z.number().min(0).max(50),
    intlDebtorDays: z.number().nonnegative(),
    /* Working capital and finance */
    debtorDays: z.number().nonnegative(),
    stockDays: z.number().nonnegative(),
    creditorDays: z.number().nonnegative(),
    loanRate: z.number().nonnegative(),
    overdraftRate: z.number().nonnegative(),
    /** Extra annual interest on the part of an overdraft above its limit. */
    penaltyRate: z.number().nonnegative(),
  })
  .strict();
export type ModelDef = z.infer<typeof modelSchema>;

/** The business at the opening position, before the first history year. */
export const startSchema = z
  .object({
    label: z.string(),
    /** The home market, in units a year. */
    marketSize: z.number().positive(),
    /** The company's share of it (a fraction) at the opening price and brand. */
    share: z.number().positive().max(1),
    price: z.number().positive(),
    competitorPrice: z.number().positive(),
    brand: z.number().min(0).max(100),
    /** Marketing spend in the opening year: half of its effect on the brand arrives in the first history year. */
    marketing: z.number().nonnegative(),
    quality: z.number().min(0).max(100),
    morale: z.number().min(0).max(100),
    headcount: z.number().int().positive(),
    wage: z.number().positive(),
    hoursPerPiece: z.number().positive(),
    plantCapacity: z.number().positive(),
    materialCost: z.number().nonnegative(),
    /** Delivery, packaging and other inputs for each piece. */
    otherCost: z.number().nonnegative(),
    overheads: z.number().nonnegative(),
    /** Cash at the bank; a negative figure is an overdraft. */
    cash: z.number(),
    loans: z.number().nonnegative(),
    /** The machinery and buildings in use: their cost, net book value and remaining life in years. */
    assets: z.object({ label: z.string(), cost: z.number().positive(), nbv: z.number().positive(), life: z.number().positive() }).strict(),
    shareCapital: z.number().nonnegative(),
    overdraftLimit: z.number().nonnegative(),
  })
  .strict();
export type StartDef = z.infer<typeof startSchema>;

/* ------------------------------------------------------------------ */
/* The rules of a year's plan                                          */
/* ------------------------------------------------------------------ */

const bound = z.object({ min: z.number(), max: z.number(), step: z.number().positive() }).strict();

export const rulesSchema = z
  .object({
    /** The most the board will fund a year across marketing, capacity, people and international. */
    budget: z.number().positive(),
    price: bound,
    costCut: bound,
    marketing: bound,
    capacity: bound,
    people: bound,
    international: bound,
    /** The plan the business would follow with no new decisions: the last history year's levers, with no price change. */
    baseline: leversSchema,
  })
  .strict();
export type Rules = z.infer<typeof rulesSchema>;

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

export const goalSchema = z
  .object({
    /** final:<kpi>, change:<kpi>, min:<kpi>, max:<kpi>, sum:<kpi> or avg:<kpi>, over the three plan years. */
    metric: z.string().regex(/^(final|change|min|max|sum|avg):[a-zA-Z]+$/),
    op: z.enum(['<', '<=', '>', '>=']),
    value: z.number(),
    label: z.string(),
  })
  .strict();
export type GoalDef = z.infer<typeof goalSchema>;

const lensSchema = z.object({ finance: md, causes: md, market: md, operations: md, people: md, strategy: md }).strict();

export const roleSchema = z
  .object({
    /** The company seen from this chair: two or three paragraphs, which may quote figures with tokens. */
    brief: md,
    /** What this role answers for, in a few lines. */
    priorities: z.array(md).min(3).max(5),
    /** The KPIs this role watches most closely; the dashboard marks them. */
    pinned: z.array(z.string()).min(3).max(4),
    goals: z.array(goalSchema).min(3).max(5),
    /** What this role looks for at each analysis stage. */
    lens: lensSchema,
  })
  .strict();
export type RoleDef = z.infer<typeof roleSchema>;

/* ------------------------------------------------------------------ */
/* Questions                                                           */
/* ------------------------------------------------------------------ */

/** A figure the engine computes: a KPI in a year, or its change between two years. */
export const figureSchema = z
  .object({
    kpi: z.string(),
    /** A history or plan year's label, or "final" for the last year of the run being asked about. */
    year: z.string(),
    /** Subtract the same KPI in this year: the answer is the change from it. */
    from: z.string().optional(),
    /** Subtract another KPI in the same year: the answer is the gap between them. */
    less: z.string().optional(),
  })
  .strict()
  .refine((f) => !(f.from && f.less), 'a figure takes from or less, not both');
export type FigureDef = z.infer<typeof figureSchema>;

const optionSchema = z.object({ id: slug, text: md, correct: z.boolean().default(false), feedback: md }).strict();

export const questionSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('choice'),
      id: slug,
      prompt: md,
      options: z.array(optionSchema).min(3).max(5),
      level: level.default('SL/HL'),
    })
    .strict(),
  z
    .object({
      kind: z.literal('number'),
      id: slug,
      prompt: md,
      answer: figureSchema,
      /** How far from the engine's answer still counts as right, in the answer's own unit. */
      tolerance: z.number().positive(),
      unit: z.enum(['percent', 'money', 'units', 'points']),
      /** The working, shown after the answer is checked; tokens are filled from the run asked about. */
      working: md,
      level: level.default('SL/HL'),
    })
    .strict(),
]);
export type QuestionDef = z.infer<typeof questionSchema>;

/* ------------------------------------------------------------------ */
/* Stages                                                              */
/* ------------------------------------------------------------------ */

const stageBase = {
  title: z.string(),
  /** What the stage asks of the learner. */
  lead: md,
  /** IB subtopic codes the stage exercises. */
  ib: z.array(z.string()).min(1),
  /** A note for HL readers on the HL-only ideas in the stage, shown only in the HL view. */
  hlNote: md.optional(),
};

export const evidenceSchema = z
  .object({
    id: slug,
    title: z.string(),
    /** The evidence, quoting the engine's figures through tokens. */
    text: md,
    area: z.enum(['finance', 'marketing', 'operations', 'people', 'external']),
    verdict: z.enum(['cause', 'partial', 'not']),
    feedback: md,
  })
  .strict();
export type EvidenceDef = z.infer<typeof evidenceSchema>;

export const strategySchema = z
  .object({
    id: slug,
    label: z.string(),
    summary: md,
    /** What it would take, in words. */
    involves: z.array(md).min(2),
    risks: md,
    /** How well it fits the evidence: the feedback after the choice. */
    fit: z.enum(['strong', 'conditional', 'weak']),
    feedback: md,
    /** The plan it implies, one year's levers per plan year. The first year fills the allocation form; the whole plan is an alternative in the debrief. */
    plan: z.array(leversSchema).min(1),
    /** What the debrief says this path teaches. Claims about its figures are tested in tests/unit/executive.test.ts. */
    lesson: md,
  })
  .strict();
export type StrategyDef = z.infer<typeof strategySchema>;

export const stakeholderSchema = z
  .object({
    name: z.string(),
    interest: md,
    power: z.enum(['high', 'medium', 'low']),
    view: md,
  })
  .strict();

export const competitorSchema = z
  .object({
    name: z.string(),
    position: md,
    /** Its price against the market average, as a share: 0.85 is 15% below. */
    priceRatio: z.number().positive(),
    /** Its share of the home market, per cent. */
    share: z.number().min(0).max(100),
  })
  .strict();

export const stagesSchema = z
  .object({
    finance: z.object({ ...stageBase, questions: z.array(questionSchema).min(1).max(3) }).strict(),
    causes: z
      .object({
        ...stageBase,
        evidence: z.array(evidenceSchema).min(6).max(12),
        /** The fewest the learner must choose. */
        min: z.number().int().positive(),
      })
      .strict(),
    market: z.object({ ...stageBase, competitors: z.array(competitorSchema).min(2), opportunity: md, questions: z.array(questionSchema).min(1).max(3) }).strict(),
    operations: z.object({ ...stageBase, questions: z.array(questionSchema).min(1).max(3) }).strict(),
    people: z.object({ ...stageBase, questions: z.array(questionSchema).min(1).max(3) }).strict(),
    strategy: z.object({ ...stageBase }).strict(),
    allocate: z.object({ ...stageBase }).strict(),
    implement: z.object({ ...stageBase }).strict(),
    evaluate: z
      .object({
        ...stageBase,
        /** A question about the learner's own final year, answered from their statements. */
        question: questionSchema,
        reflections: z.array(z.object({ id: slug, label: z.string(), hint: z.string() }).strict()).min(2).max(4),
      })
      .strict(),
  })
  .strict();
export type Stages = z.infer<typeof stagesSchema>;

/* ------------------------------------------------------------------ */
/* The simulation                                                      */
/* ------------------------------------------------------------------ */

const yearSchema = z.object({ label: z.string().regex(/^\d{4}$/), conditions: conditionsSchema, note: md }).strict();

export const executiveSchema = z
  .object({
    title: z.string(),
    dek: z.string(),
    /** The question the learner must answer for the board. */
    question: z.string(),
    company: z
      .object({
        name: z.string(),
        industry: z.string(),
        location: z.string(),
        legalForm: z.string(),
        founded: z.string(),
        size: z.string(),
        owners: z.string(),
      })
      .strict(),
    currency: z.object({ code: z.string(), symbol: z.string(), name: z.string() }).strict(),
    /** The export market's currency. */
    foreign: z.object({ code: z.string(), symbol: z.string(), name: z.string(), market: z.string() }).strict(),
    units: z.object({ singular: z.string(), plural: z.string() }).strict(),
    background: z.array(md).min(3),
    /** The board's mandate: the time, the budget and what it expects. */
    mandate: md,
    stakeholders: z.array(stakeholderSchema).min(4),
    model: modelSchema,
    start: startSchema,
    /** The years before the plan, each with the levers the company pulled and the conditions it met. */
    history: z.array(yearSchema.extend({ levers: leversSchema })).min(3),
    /** The plan years: the conditions each will bring, which nobody at the company chooses. */
    plan: z.array(yearSchema.extend({ news: z.object({ title: z.string(), text: md }).strict().optional() })).min(2).max(4),
    /** What the board was told to plan on, shown before the plan begins. */
    assumptions: md,
    rules: rulesSchema,
    /** The KPIs on the dashboard, in order. */
    dashboard: z.array(z.string()).min(6).max(12),
    roles: z.object({ ceo: roleSchema, cfo: roleSchema, cmo: roleSchema, coo: roleSchema, chro: roleSchema, strategy: roleSchema, consultant: roleSchema }).strict(),
    stages: stagesSchema,
    strategies: z.array(strategySchema).min(3).max(5),
    /** The strategy whose plan is narrated as the worked example. */
    walkthrough: z.object({ strategy: slug, intro: md }).strict(),
    debrief: z
      .object({
        summary: md,
        /** The trade-offs, each in a paragraph or two. */
        tradeoffs: z.array(z.object({ title: z.string(), body: md }).strict()).min(3),
        /** Theory in the IB course, by subtopic. */
        ib: z.array(z.object({ title: z.string(), body: md, syllabus: z.array(z.string()).min(1), level: level.default('SL/HL') }).strict()).min(3),
        /** Ideas beyond the IB course, each with the sources it rests on. */
        beyond: z.array(z.object({ title: z.string(), body: md, sources: z.array(z.string()).min(1) }).strict()).min(2),
        misconceptions: z.array(z.object({ claim: z.string(), correction: md }).strict()).min(3),
        practice: z.array(z.object({ prompt: md, command: z.string(), marks: z.number().int().positive(), level: level.default('SL/HL') }).strict()).min(3),
        terms: z.array(z.string()).min(6),
      })
      .strict(),
    method: md,
    updated: z.coerce.date(),
  })
  .strict();
export type Executive = z.infer<typeof executiveSchema>;
