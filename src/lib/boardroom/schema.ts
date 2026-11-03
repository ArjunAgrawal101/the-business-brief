/**
 * The Boardroom: the shape of a scenario file (src/content/boardroom/*.yaml).
 *
 * A scenario is a fictional business, the model coefficients and starting
 * position the engine runs from, the periods before the first decision (which
 * produce the board pack's exhibits), three or four rounds of three options
 * with an event between rounds, the roles a learner can take, the memo they
 * write at the end and the debrief. Every figure a learner sees is computed by
 * the engine from this file, so no exhibit or narrative number can drift from
 * the model. Like src/lib/schemas.ts, this module imports nothing from
 * astro:content, so the unit tests can use it.
 */
import { z } from 'astro/zod';
import { conceptId, level } from '../schemas';
import { CHALLENGES, ROLE_IDS } from './roles';

const md = z.string().trim().min(1);

/* ------------------------------------------------------------------ */
/* Vocabularies                                                        */
/* ------------------------------------------------------------------ */

export { ROLE_IDS, ROLE_TITLES, ROLE_IN_TEXT, FUNCTION_IDS, CHALLENGES, CHALLENGE_LABELS } from './roles';
export type { RoleId, FunctionId, Challenge } from './roles';

/* ------------------------------------------------------------------ */
/* Engine inputs                                                       */
/* ------------------------------------------------------------------ */

/** A change to a number: set it (to), add to it (by), or scale it by a percentage (pct). Applied in that order. */
export interface Change {
  to?: number;
  by?: number;
  pct?: number;
}

const change: z.ZodType<Change, unknown> = z
  .object({ to: z.number().optional(), by: z.number().optional(), pct: z.number().optional() })
  .strict()
  .refine((c) => c.to !== undefined || c.by !== undefined || c.pct !== undefined, 'a change needs to, by or pct') as unknown as z.ZodType<Change, unknown>;

/** A route to market: its own price, demand, payment terms and priority when capacity runs short. */
export const channelSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    label: z.string(),
    /** Price per unit to this channel's customers. */
    price: z.number().positive(),
    /** Units a period this channel would buy at the reference price, brand and market (for a contract, the contracted volume). */
    demand: z.number().nonnegative(),
    /** Price elasticity of demand for this channel; defaults to the model's. */
    elasticity: z.number().nonnegative().optional(),
    /** Share change in demand per brand point; defaults to the model's. */
    brandWeight: z.number().nonnegative().optional(),
    /** Share change in demand per point of the green score (per cent cut in emissions per unit); defaults to the model's. */
    greenWeight: z.number().nonnegative().optional(),
    /** Days the channel's customers take to pay. */
    debtorDays: z.number().nonnegative().default(0),
    /** A contract fixes the volume: price, brand and market size do not move it. */
    contracted: z.boolean().default(false),
    /** Served first when capacity is short: lower numbers first. Contracts default to 1, other channels to 2. */
    priority: z.number().int().optional(),
    /** Extra variable cost per unit for this channel (special ingredients, commission). */
    extraCost: z.number().nonnegative().default(0),
  })
  .strict();
export type ChannelDef = z.infer<typeof channelSchema>;

export interface CapexDef {
  id: string;
  label: string;
  /** Cash paid now. */
  cost: number;
  /** Useful life in periods, for straight-line depreciation once in use. */
  life: number;
  /** Periods until it comes into use (0 = this period). */
  after: number;
  /** What changes when it comes into use. */
  effects?: Effects;
}

/**
 * What a decision or an event does to the business. Every field is optional;
 * the engine applies them in a fixed order (see applyEffects in engine.ts).
 */
export interface Effects {
  flags?: Record<string, string | number | boolean>;
  /* Marketing and the market */
  price?: Change;
  prices?: Record<string, Change>;
  demand?: Record<string, Change>;
  channelDays?: Record<string, Change>;
  channelCost?: Record<string, Change>;
  addChannels?: ChannelDef[];
  removeChannels?: string[];
  marketing?: Change;
  brand?: number;
  marketSize?: Change;
  marketGrowth?: Change;
  competitorPrice?: Change;
  /* Operations */
  plantCapacity?: Change;
  hoursPerUnit?: Change;
  materialCost?: Change;
  energyCost?: Change;
  otherCost?: Change;
  emissionsPerUnit?: Change;
  defectBase?: Change;
  overheads?: Change;
  maintenance?: Change;
  stockDays?: Change;
  capex?: CapexDef[];
  /* People */
  hire?: number;
  redundancies?: number;
  redundancyPay?: number;
  wage?: Change;
  replaceLeavers?: boolean;
  overtimeMax?: Change;
  training?: number;
  skill?: Change;
  morale?: number;
  /** Share of profit before interest and tax (before the bonus itself) paid to staff each period. */
  profitShare?: Change;
  /* Finance */
  borrow?: { amount: number; rate?: number; label?: string };
  /** Convert the overdraft at the start of the period, up to a maximum, into a loan. */
  refinance?: { max: number; rate?: number; label?: string };
  repay?: number;
  equity?: { amount: number; stake: number };
  dividend?: number;
  /** Share of each period's profit for the period paid out as dividends. */
  payout?: Change;
  factoring?: { channel: string; days: number; feeRate: number } | false;
  creditorDays?: Change;
  overdraftLimit?: Change;
  overdraftRate?: Change;
  loanRate?: Change;
  sellAsset?: { asset: string; proceeds: number; rent: number };
  writeOff?: { channel: string; share: number };
  costs?: Array<{ label: string; amount: number }>;
  income?: Array<{ label: string; amount: number }>;
  /* Time: effects that arrive later, for explicit lags */
  later?: Array<{ after: number; effects: Effects; note: string }>;
}

const changes = z.record(z.string(), change);

export const effectsSchema: z.ZodType<Effects, unknown> = z.lazy(() =>
  z
    .object({
      flags: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
      price: change.optional(),
      prices: changes.optional(),
      demand: changes.optional(),
      channelDays: changes.optional(),
      channelCost: changes.optional(),
      addChannels: z.array(channelSchema).optional(),
      removeChannels: z.array(z.string()).optional(),
      marketing: change.optional(),
      brand: z.number().optional(),
      marketSize: change.optional(),
      marketGrowth: change.optional(),
      competitorPrice: change.optional(),
      plantCapacity: change.optional(),
      hoursPerUnit: change.optional(),
      materialCost: change.optional(),
      energyCost: change.optional(),
      otherCost: change.optional(),
      emissionsPerUnit: change.optional(),
      defectBase: change.optional(),
      overheads: change.optional(),
      maintenance: change.optional(),
      stockDays: change.optional(),
      capex: z
        .array(
          z
            .object({
              id: z.string().regex(/^[a-z0-9-]+$/),
              label: z.string(),
              cost: z.number().positive(),
              life: z.number().int().positive(),
              after: z.number().int().nonnegative(),
              effects: effectsSchema.optional(),
            })
            .strict(),
        )
        .optional(),
      hire: z.number().int().positive().optional(),
      redundancies: z.number().int().positive().optional(),
      redundancyPay: z.number().nonnegative().optional(),
      wage: change.optional(),
      replaceLeavers: z.boolean().optional(),
      overtimeMax: change.optional(),
      training: z.number().positive().optional(),
      skill: change.optional(),
      morale: z.number().optional(),
      profitShare: change.optional(),
      borrow: z.object({ amount: z.number().positive(), rate: z.number().nonnegative().optional(), label: z.string().optional() }).strict().optional(),
      refinance: z.object({ max: z.number().positive(), rate: z.number().nonnegative().optional(), label: z.string().optional() }).strict().optional(),
      repay: z.number().positive().optional(),
      equity: z.object({ amount: z.number().positive(), stake: z.number().positive().max(100) }).strict().optional(),
      dividend: z.number().positive().optional(),
      payout: change.optional(),
      factoring: z.union([z.object({ channel: z.string(), days: z.number().nonnegative(), feeRate: z.number().min(0).max(0.2) }).strict(), z.literal(false)]).optional(),
      creditorDays: change.optional(),
      overdraftLimit: change.optional(),
      overdraftRate: change.optional(),
      loanRate: change.optional(),
      sellAsset: z.object({ asset: z.string(), proceeds: z.number().positive(), rent: z.number().nonnegative() }).strict().optional(),
      writeOff: z.object({ channel: z.string(), share: z.number().min(0).max(1) }).strict().optional(),
      costs: z.array(z.object({ label: z.string(), amount: z.number().positive() }).strict()).optional(),
      income: z.array(z.object({ label: z.string(), amount: z.number().positive() }).strict()).optional(),
      later: z.array(z.object({ after: z.number().int().positive(), effects: effectsSchema, note: md }).strict()).optional(),
    })
    .strict(),
) as unknown as z.ZodType<Effects, unknown>;

/** The model's coefficients: how strongly one part of the business moves another. Fixed for a scenario. */
export const modelSchema = z
  .object({
    period: z.object({ unit: z.enum(['quarter', 'year']), days: z.number().positive(), perYear: z.number().int().positive() }).strict(),
    taxRate: z.number().min(0).max(0.6),
    /** Default price elasticity of demand (positive: demand falls by this many per cent for each 1% price rise). */
    elasticity: z.number().nonnegative(),
    /** Default share change in demand per brand point away from the reference. */
    brandWeight: z.number().nonnegative(),
    /** Default share change in demand per point of the green score. */
    greenWeight: z.number().nonnegative().default(0),
    /** Marketing spend a period that holds the brand steady. */
    marketingNorm: z.number().positive(),
    /** Brand points a period from spending twice the norm (at a brand of 50), half arriving now and half next period. */
    marketingEffect: z.number().nonnegative(),
    /** Services: brand points a period per 10 morale points away from the norm. */
    serviceWeight: z.number().nonnegative().default(0),
    /** Brand points lost per 10% of demand that could not be met. */
    lostSalesPenalty: z.number().nonnegative().default(0),
    /** Standard paid hours per worker per period. */
    hoursPerWorker: z.number().positive(),
    overtimePremium: z.number().nonnegative(),
    /** A new starter's output in their first period, as a share of an experienced worker's. */
    newStarterOutput: z.number().min(0).max(1),
    /** Productivity change per morale point away from the norm, applied the same period. */
    moraleProductivity: z.number().nonnegative(),
    moraleNorm: z.number().min(0).max(100),
    /** Share of the gap to the norm that morale recovers each period without new pressure. */
    moraleRecovery: z.number().min(0).max(1),
    /** Morale points lost per 1% of paid hours worked as overtime. */
    overtimeStrain: z.number().nonnegative(),
    /** Morale points lost per 10% of paid hours left idle, below 85% use. */
    idleStrain: z.number().nonnegative().default(0),
    /** Morale points lost per 1% of the workforce made redundant. */
    layoffShock: z.number().nonnegative(),
    /** Morale points per 1% pay rise (a cut costs the same per 1%). */
    wageMorale: z.number().nonnegative(),
    /** Annual labour turnover (%) at the morale norm. */
    turnoverBase: z.number().nonnegative(),
    /** Extra annual labour turnover (percentage points) per morale point below the norm. */
    turnoverPerPoint: z.number().nonnegative(),
    turnoverMin: z.number().nonnegative(),
    /** Cost of recruiting and inducting one person. */
    recruitCost: z.number().nonnegative(),
    /** Extra annual interest rate on the part of an overdraft above its limit. */
    penaltyRate: z.number().nonnegative().default(0),
    /** Quality: defects rise with strain and low morale, and cost brand points. Omit for a scenario without a defect measure. */
    defects: z
      .object({
        /** Utilization (%) above which rushing adds defects. */
        threshold: z.number().min(0).max(100),
        /** Percentage points of defect rate per utilization point above the threshold. */
        strain: z.number().nonnegative(),
        /** Percentage points of defect rate per morale point below the norm. */
        morale: z.number().nonnegative(),
        /** Brand points lost per percentage point of defect rate above the base rate. */
        brand: z.number().nonnegative(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type ModelDef = z.infer<typeof modelSchema>;

/** The business at the start of the first history period. Working capital and retained earnings are computed from it. */
export const startSchema = z
  .object({
    label: z.string(),
    marketSize: z.number().positive(),
    /** Growth of the whole market per period, as a fraction. */
    marketGrowth: z.number().default(0),
    channels: z.array(channelSchema).min(1),
    marketing: z.number().nonnegative(),
    brand: z.number().min(0).max(100),
    materialCost: z.number().nonnegative(),
    energyCost: z.number().nonnegative().default(0),
    otherCost: z.number().nonnegative().default(0),
    overheads: z.number().nonnegative(),
    maintenance: z.number().nonnegative().default(0),
    plantCapacity: z.number().positive(),
    hoursPerUnit: z.number().positive(),
    overtimeMax: z.number().nonnegative(),
    /** Defect rate (%) with no strain and morale at the norm. */
    defectBase: z.number().min(0).max(40).default(0),
    emissionsPerUnit: z.number().nonnegative().default(0),
    headcount: z.number().int().positive(),
    wage: z.number().positive(),
    morale: z.number().min(0).max(100),
    replaceLeavers: z.boolean().default(true),
    /** Cash at the bank; a negative figure is an overdraft. */
    cash: z.number(),
    loans: z.array(z.object({ label: z.string(), principal: z.number().positive(), rate: z.number().nonnegative() }).strict()).default([]),
    assets: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z0-9-]+$/),
            label: z.string(),
            cost: z.number().positive(),
            nbv: z.number().nonnegative(),
            /** Periods of life left, over which the net book value is written off. */
            life: z.number().positive(),
          })
          .strict(),
      )
      .default([]),
    shareCapital: z.number().nonnegative(),
    /** The founders' or family's share of the company (%). */
    ownership: z.number().min(0).max(100).default(100),
    /** Share of each period's profit paid out as dividends. */
    payout: z.number().min(0).max(1).default(0),
    creditorDays: z.number().nonnegative(),
    stockDays: z.number().nonnegative(),
    overdraftLimit: z.number().nonnegative(),
    overdraftRate: z.number().nonnegative(),
    loanRate: z.number().nonnegative(),
  })
  .strict();
export type StartDef = z.infer<typeof startSchema>;

/* ------------------------------------------------------------------ */
/* Conditions (for event variants and conditional option effects)      */
/* ------------------------------------------------------------------ */

export type Condition =
  | { kpi: string; op: '<' | '<=' | '>' | '>=' | '=='; value: number }
  | { flag: string; equals?: string | number | boolean }
  | { channel: string }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

export const conditionSchema: z.ZodType<Condition, unknown> = z.lazy(() =>
  z.union([
    z.object({ kpi: z.string(), op: z.enum(['<', '<=', '>', '>=', '==']), value: z.number() }).strict(),
    z.object({ flag: z.string(), equals: z.union([z.string(), z.number(), z.boolean()]).optional() }).strict(),
    z.object({ channel: z.string() }).strict(),
    z.object({ all: z.array(conditionSchema).min(1) }).strict(),
    z.object({ any: z.array(conditionSchema).min(1) }).strict(),
    z.object({ not: conditionSchema }).strict(),
  ]),
) as unknown as z.ZodType<Condition, unknown>;

/* ------------------------------------------------------------------ */
/* The scenario                                                        */
/* ------------------------------------------------------------------ */

const perspectives = z.object({ ceo: md, finance: md, marketing: md, operations: md, hr: md }).strict();

const stakeholderReaction = z.object({ name: z.string(), reaction: md, mood: z.enum(['positive', 'mixed', 'negative']) }).strict();

export const optionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    label: z.string(),
    /** The proposal in a sentence or two. The figures it involves are written from the effects, not typed here. */
    summary: md,
    effects: effectsSchema,
    /** Extra effects that apply only when a condition holds at the moment of decision. */
    when: z.array(z.object({ if: conditionSchema, effects: effectsSchema, note: md }).strict()).default([]),
    outcome: z
      .object({
        headline: z.string(),
        /** May use tokens such as {{cash}}, {{utilization.change}} or {{morale.prev}}, filled from the engine. */
        narrative: md,
        stakeholders: z.array(stakeholderReaction).min(2),
        theory: md,
      })
      .strict(),
  })
  .strict();
export type OptionDef = z.infer<typeof optionSchema>;

export const eventVariantSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    /** The first variant whose condition holds is the one that happens; a variant without a condition always applies. */
    if: conditionSchema.optional(),
    title: z.string(),
    text: md,
    effects: effectsSchema,
  })
  .strict();
export type EventVariant = z.infer<typeof eventVariantSchema>;

export const roundSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string(),
    /** The period the decision governs, for example "Q1 2027" or "2028". */
    period: z.string(),
    /** The function whose decision this is. */
    lead: z.enum(ROLE_IDS),
    situation: md,
    /** What changes this period whatever the board decides (a contract already signed, a known price change). */
    given: z.object({ note: md, effects: effectsSchema }).strict().optional(),
    question: z.string(),
    /** What each director argues around the table before the vote. */
    perspectives,
    options: z.array(optionSchema).length(3),
    /** What happens before the next round. Every round but the last has one. */
    event: z
      .object({
        variants: z.array(eventVariantSchema).min(1),
      })
      .strict()
      .optional(),
  })
  .strict();
export type RoundDef = z.infer<typeof roundSchema>;

export const goalSchema = z
  .object({
    /** final:<kpi>, change:<kpi>, min:<kpi>, max:<kpi>, sum:<kpi> or avg:<kpi>, over the decision rounds. */
    metric: z.string().regex(/^(final|change|min|max|sum|avg):[a-zA-Z]+$/),
    op: z.enum(['<', '<=', '>', '>=']),
    value: z.number(),
    label: z.string(),
  })
  .strict();
export type GoalDef = z.infer<typeof goalSchema>;

export const roleSchema = z
  .object({
    /** What this chair cares about in this company. */
    brief: md,
    /** KPIs this role watches most closely; the dashboard marks them. */
    pinned: z.array(z.string()).min(2).max(4),
    goals: z.array(goalSchema).min(2).max(5),
  })
  .strict();

export const memoFieldSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    label: z.string(),
    hint: z.string(),
    rows: z.number().int().min(2).max(10).default(4),
  })
  .strict();

export const scenarioSchema = z
  .object({
    title: z.string(),
    /** One line under the title. */
    dek: z.string(),
    /** The strategic question the board must answer. */
    question: z.string(),
    challenge: z.enum(CHALLENGES),
    company: z
      .object({
        name: z.string(),
        industry: z.string(),
        sector: z.enum(['primary', 'secondary', 'tertiary', 'quaternary']),
        location: z.string(),
        legalForm: z.string(),
        founded: z.string(),
        size: z.string(),
        owners: z.string(),
      })
      .strict(),
    currency: z.object({ code: z.string(), symbol: z.string(), name: z.string() }).strict(),
    units: z.object({ singular: z.string(), plural: z.string() }).strict(),
    /** The sustainability measure, where the scenario has one. */
    sustainability: z.object({ label: z.string(), unit: z.string(), note: md }).strict().optional(),
    /** IB subtopic codes the scenario exercises, from the curriculum spine. */
    syllabus: z.array(z.string()).min(3),
    concepts: z.array(conceptId).min(1),
    level: level.default('SL/HL'),
    /** Why the scenario's HL material is HL, when level is SL/HL and some of it is HL only. */
    hlNote: md.optional(),
    background: z.array(md).min(3),
    context: z.array(md).min(2),
    challenges: z.array(md).min(3),
    stakeholders: z
      .array(
        z
          .object({
            name: z.string(),
            group: z.string(),
            interest: md,
            influence: z.enum(['high', 'medium', 'low']),
            view: md,
          })
          .strict(),
      )
      .min(4),
    market: z
      .object({
        summary: md,
        competitors: z
          .array(z.object({ name: z.string(), share: z.number().min(0).max(100), price: z.number().positive(), position: z.string() }).strict())
          .min(2),
        trends: z.array(md).min(2),
      })
      .strict(),
    model: modelSchema,
    start: startSchema,
    /** The periods before the first decision; the board pack is built from them. */
    history: z
      .array(z.object({ label: z.string(), note: md, effects: effectsSchema.default({}) }).strict())
      .min(2),
    rounds: z.array(roundSchema).min(3).max(4),
    /** The KPIs on the dashboard, in order. */
    dashboard: z.array(z.string()).min(6).max(10),
    roles: z.object({ ceo: roleSchema, finance: roleSchema, marketing: roleSchema, operations: roleSchema, hr: roleSchema }).strict(),
    memo: z.object({ intro: md, fields: z.array(memoFieldSchema).min(4).max(7) }).strict(),
    walkthrough: z.object({ title: z.string(), picks: z.array(z.string()).min(3).max(4), intro: md, outro: md }).strict(),
    debrief: z
      .object({
        summary: md,
        theory: z.array(z.object({ title: z.string(), body: md, syllabus: z.array(z.string()).min(1), level: level.default('SL/HL') }).strict()).min(3),
        paths: z.array(z.object({ id: z.string().regex(/^[a-z0-9-]+$/), label: z.string(), picks: z.array(z.string()).min(3).max(4), lesson: md }).strict()).min(3),
        misconceptions: z.array(z.object({ claim: z.string(), correction: md }).strict()).min(2),
        examLink: md,
        practice: z
          .array(z.object({ prompt: md, command: z.string(), marks: z.number().int().positive(), level: level.default('SL/HL') }).strict())
          .min(2),
        terms: z.array(z.string()).min(4),
      })
      .strict(),
    method: md,
    /** Position in the Boardroom's list. */
    order: z.number().int(),
    updated: z.coerce.date(),
  })
  .strict();
export type Scenario = z.infer<typeof scenarioSchema>;
