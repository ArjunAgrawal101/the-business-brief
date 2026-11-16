/**
 * The Boardroom's executive simulation: the engine against a small business
 * worked by hand, the accounting identities in every year of every plan in a
 * grid, the way each lever is meant to behave (more marketing never lowers
 * orders; a cut lifts the first year's margin and dents quality and morale;
 * machinery and training arrive a year late; a stronger pound lowers export
 * earnings), the answers the stages key against the engine's own figures,
 * every claim the debrief makes about the four strategies, and the integrity
 * check catching the mistakes it exists for.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { identityErrors, originState, runYear } from '../../src/lib/executive/engine';
import { checkExecutive, type ExecutiveRefs } from '../../src/lib/executive/integrity';
import { fmtKpi, kpiChange } from '../../src/lib/executive/kpis';
import { badTokens, fillTokens, narrateContext } from '../../src/lib/executive/narrate';
import { conditionsSchema, executiveSchema, leversSchema, modelSchema, startSchema, type Executive, type Levers } from '../../src/lib/executive/schema';
import { ROLE_IDS } from '../../src/lib/executive/roles';
import { answerRight, attribution, baselinePlan, checkLevers, derived, figureValue, goalsMet, runPlan, summarize } from '../../src/lib/executive/sim';
import { familyOf, workLink } from '../../src/lib/dashboard';
import { loadCorpus } from './helpers/corpus';

const ROOT = new URL('../../src/content/executive/', import.meta.url).pathname;
const sims: Record<string, Executive> = Object.fromEntries(
  readdirSync(ROOT)
    .filter((f) => f.endsWith('.yaml'))
    .sort()
    .map((f) => {
      const r = executiveSchema.safeParse(parse(readFileSync(join(ROOT, f), 'utf8')));
      if (!r.success) throw new Error(`${f}: ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
      return [f.replace(/\.yaml$/, ''), r.data];
    }),
);
const sc = Object.values(sims)[0] as Executive;
const L = (price: number, costCut: number, marketing: number, capacity: number, people: number, international: number): Levers => ({ price, costCut, marketing, capacity, people, international });

/* ------------------------------------------------------------------ */
/* A small business worked by hand                                     */
/* ------------------------------------------------------------------ */

// One product, no brand, quality, morale or turnover effects, so every figure can be checked with a calculator.
const model = modelSchema.parse({
  taxRate: 0.2,
  elasticity: 1,
  brandWeight: 0,
  brandDecay: 0,
  marketingPower: 0,
  marketingScale: 1,
  reviewWeight: 0,
  qualityRef: 75,
  hoursPerWorker: 1000,
  overtimeMax: 0.2,
  overtimePremium: 0.5,
  newStarterOutput: 0.5,
  moraleNorm: 60,
  moraleRecovery: 0,
  moraleProductivity: 0,
  overtimeStrain: 0,
  turnoverBase: 0,
  turnoverPerPoint: 0,
  turnoverMin: 0,
  recruitCost: 0,
  skillLoss: 0,
  peopleMorale: 0,
  peopleSkill: 0,
  peopleScale: 1,
  cutMorale: 0,
  cutSlack: 0,
  cutQuality: 0,
  cutCost: 0.5,
  qualityBase: 75,
  qualityStrain: 0,
  strainThreshold: 100,
  qualityMorale: 0,
  qualitySkill: 0,
  returnsBase: 0,
  returnsPerPoint: 0,
  returnsMin: 0,
  capacityPerMillion: 1000,
  capacityHours: 0.1,
  capacityLife: 10,
  intlSetup: 100000,
  intlPotential: 1000,
  intlScale: 100000,
  intlDecay: 0,
  intlElasticity: 0,
  intlPriceRatio: 0.9,
  fxRef: 1,
  intlFreight: 10,
  intlDamage: 0,
  intlDebtorDays: 73,
  debtorDays: 36.5,
  stockDays: 36.5,
  creditorDays: 73,
  loanRate: 0.05,
  overdraftRate: 0.1,
  penaltyRate: 0.05,
});
const start = startSchema.parse({
  label: 'Start',
  marketSize: 100000,
  share: 0.1,
  price: 50,
  competitorPrice: 50,
  brand: 50,
  marketing: 0,
  quality: 75,
  morale: 60,
  headcount: 10,
  wage: 20000,
  hoursPerPiece: 1,
  plantCapacity: 20000,
  materialCost: 20,
  otherCost: 0,
  overheads: 50000,
  cash: 10000,
  loans: 100000,
  assets: { label: 'Kit', cost: 200000, nbv: 150000, life: 10 },
  shareCapital: 50000,
  overdraftLimit: 50000,
});
const still = conditionsSchema.parse({ marketGrowth: 0, competitorPrice: 0, materialCost: 0, wage: 0, fx: 1 });
const none = L(0, 0, 0, 0, 0, 0);

describe('the executive engine, worked by hand', () => {
  it('sets working capital from its days and balances the opening position', () => {
    const s = originState(model, start);
    // 10,000 pieces at £50 = £500,000 of sales; 36.5 days of it owed = £50,000.
    expect(s.debtors).toBeCloseTo(50000, 6);
    // Inputs 10,000 × £20 = £200,000: 36.5 days of stock = £20,000; 73 days owed to suppliers = £40,000.
    expect(s.stock).toBeCloseTo(20000, 6);
    expect(s.creditors).toBeCloseTo(40000, 6);
    // Retained earnings balance it: 150,000 + 10,000 + 50,000 + 20,000 − 40,000 − 100,000 − 50,000 = 40,000.
    expect(s.retainedEarnings).toBeCloseTo(40000, 6);
  });

  it('works one year of trading', () => {
    const { result: r } = runYear(model, originState(model, start), none, still, 'Y1');
    const k = r.kpis;
    expect(k.demand).toBeCloseTo(10000, 6);
    expect(k.volume).toBeCloseTo(10000, 6);
    expect(k.revenue).toBeCloseTo(500000, 6);
    expect(k.costOfSales).toBeCloseTo(200000, 6);
    expect(k.grossProfit).toBeCloseTo(300000, 6);
    // Expenses: wages 10 × £20,000, overheads £50,000, depreciation £150,000 ÷ 10 = £15,000.
    expect(r.pl.depreciation).toBeCloseTo(15000, 6);
    expect(k.pbit).toBeCloseTo(35000, 6);
    // Interest on the opening loan 5% × £100,000 = £5,000; tax 20% of £30,000 = £6,000.
    expect(k.interest).toBeCloseTo(5000, 6);
    expect(k.tax).toBeCloseTo(6000, 6);
    expect(k.profit).toBeCloseTo(24000, 6);
    // Working capital unchanged; upkeep matches depreciation, so net cash rises by profit: 10,000 + 24,000.
    expect(r.cash.operating).toBeCloseTo(39000, 6);
    expect(r.cash.investing).toBeCloseTo(-15000, 6);
    expect(k.netCash).toBeCloseTo(34000, 6);
    expect(r.position.nonCurrentAssets).toBeCloseTo(150000, 6);
    // Equity 50,000 + 40,000 + 24,000 = 114,000; ROCE = 35,000 ÷ (100,000 + 114,000) × 100.
    expect(k.equity).toBeCloseTo(114000, 6);
    expect(k.roce).toBeCloseTo((35000 / 214000) * 100, 6);
    // Capacity: 10 × 1,000 hours ÷ 1 hour = 10,000 in normal hours, 12,000 with overtime; plant 20,000.
    expect(k.normalCapacity).toBeCloseTo(10000, 6);
    expect(k.capacity).toBeCloseTo(12000, 6);
    expect(k.utilization).toBeCloseTo((10000 / 12000) * 100, 6);
    expect(k.load).toBeCloseTo(100, 6);
    expect(identityErrors(r)).toEqual([]);
  });

  it('meets demand above normal hours with overtime at a premium, and loses what is beyond capacity', () => {
    const ot = runYear(model, originState(model, start), none, { ...still, marketGrowth: 10 }, 'Y1').result;
    // 11,000 ordered: 1,000 pieces in overtime, 1,000 hours at £20 an hour × 1.5 = £30,000.
    expect(ot.kpis.volume).toBeCloseTo(11000, 6);
    expect(ot.kpis.lostSales).toBeCloseTo(0, 6);
    expect(ot.kpis.overtimeHours).toBeCloseTo(1000, 6);
    expect(ot.pl.overtime).toBeCloseTo(30000, 6);
    const lost = runYear(model, originState(model, start), none, { ...still, marketGrowth: 30 }, 'Y1').result;
    // 13,000 ordered against 12,000 of capacity: 1,000 lost, 2,000 in overtime, £60,000.
    expect(lost.kpis.volume).toBeCloseTo(12000, 6);
    expect(lost.kpis.lostSales).toBeCloseTo(1000, 6);
    expect(lost.pl.overtime).toBeCloseTo(60000, 6);
    expect(lost.ops.binding).toBe('labour');
    expect(identityErrors(ot)).toEqual([]);
    expect(identityErrors(lost)).toEqual([]);
  });

  it('moves demand through the price elasticity of demand', () => {
    const r = runYear(model, originState(model, start), L(10, 0, 0, 0, 0, 0), still, 'Y1').result;
    // Price up 10% with elasticity 1: demand × 1.1^−1.
    expect(r.kpis.price).toBeCloseTo(55, 9);
    expect(r.kpis.demand).toBeCloseTo(10000 / 1.1, 6);
  });

  it('cuts overheads at once, with a one-off cost of half the saving', () => {
    const r = runYear(model, originState(model, start), L(0, 10, 0, 0, 0, 0), still, 'Y1').result;
    expect(r.pl.overheads).toBeCloseTo(45000, 6);
    expect(r.pl.restructuring).toBeCloseTo(2500, 6);
    expect(r.kpis.pbit).toBeCloseTo(35000 + 5000 - 2500, 6);
  });

  it('pays for machinery now and brings it into use, and into depreciation, the year after', () => {
    const y1 = runYear(model, originState(model, start), L(0, 0, 0, 1000000, 0, 0), still, 'Y1');
    expect(y1.result.kpis.plantCapacity).toBeCloseTo(20000, 6);
    expect(y1.result.pl.depreciation).toBeCloseTo(15000, 6);
    expect(y1.result.cash.capex).toBeCloseTo(-1000000, 6);
    expect(y1.result.kpis.netCash).toBeCloseTo(34000 - 1000000, 6);
    const y2 = runYear(model, y1.state, none, still, 'Y2').result;
    // £1m buys 1,000 pieces of plant capacity and cuts the hours a piece by 10%.
    expect(y2.kpis.plantCapacity).toBeCloseTo(21000, 6);
    expect(y2.ops.hoursPerPiece).toBeCloseTo(0.9, 9);
    expect(y2.kpis.normalCapacity).toBeCloseTo(10000 / 0.9, 6);
    // Depreciation: £15,000 on the old plant and £1,000,000 ÷ 10 on the new.
    expect(y2.pl.depreciation).toBeCloseTo(115000, 6);
    // The overdraft from year 1 now costs interest: 10% of £966,000, plus 5% on the £916,000 above the £50,000 limit.
    expect(y2.kpis.interest).toBeCloseTo(5000 + 96600 + 45800, 6);
    expect(identityErrors(y1.result)).toEqual([]);
    expect(identityErrors(y2)).toEqual([]);
  });

  it('opens an export market the year after its set-up, and converts its earnings at the year’s rate', () => {
    const y1 = runYear(model, originState(model, start), L(0, 0, 0, 0, 0, 150000), still, 'Y1');
    // £100,000 completes the set-up; the other £50,000 builds the market. Nothing is sold abroad yet.
    expect(y1.result.kpis.exportVolume).toBe(0);
    expect(y1.result.intl.opensNextYear).toBe(true);
    expect(y1.result.pl.international).toBeCloseTo(150000, 6);
    const y2 = runYear(model, y1.state, none, { ...still, fx: 1.25 }, 'Y2').result;
    // Demand abroad = 1,000 × (1 − e^(−50,000 ÷ 100,000)); each piece earns £50 × 0.9 × (1 ÷ 1.25) = £36.
    const pieces = 1000 * (1 - Math.exp(-0.5));
    expect(y2.kpis.exportVolume).toBeCloseTo(pieces, 6);
    expect(y2.intl.pricePerPiece).toBeCloseTo(36, 9);
    expect(y2.kpis.exportRevenue).toBeCloseTo(pieces * 36, 6);
    expect(y2.pl.freight).toBeCloseTo(pieces * 10, 6);
    expect(identityErrors(y2)).toEqual([]);
  });

  it('is deterministic: the same inputs always give the same year', () => {
    const a = runYear(model, originState(model, start), L(-5, 3, 0, 0, 0, 0), still, 'Y');
    const b = runYear(model, originState(model, start), L(-5, 3, 0, 0, 0, 0), still, 'Y');
    expect(JSON.stringify(a.result)).toBe(JSON.stringify(b.result));
  });
});

/* ------------------------------------------------------------------ */
/* The simulation: identities in every year of a grid of plans          */
/* ------------------------------------------------------------------ */

const levels = {
  price: [-6, 0, 4],
  costCut: [0, 6, 14],
  marketing: [0, 700000, 1600000],
  capacity: [0, 1200000],
  people: [0, 400000],
  international: [0, 900000],
};
/** Every combination of the levels above, the same levers in every year, kept within the budget. */
const grid: Levers[][] = [];
for (const price of levels.price)
  for (const costCut of levels.costCut)
    for (const marketing of levels.marketing)
      for (const capacity of levels.capacity)
        for (const people of levels.people)
          for (const international of levels.international) {
            const l = L(price, costCut, marketing, capacity, people, international);
            if (checkLevers(sc.rules, l).length === 0) grid.push(sc.plan.map(() => ({ ...l })));
          }

describe('the executive simulation', () => {
  it('passes the integrity check against the rest of the corpus', () => {
    const c = loadCorpus();
    const problems = checkExecutive(sims, refsFrom(c));
    expect(problems.map((p) => `${p.where}: ${p.message}`)).toEqual([]);
  }, 30_000);

  it('runs a large grid of plans with every accounting identity holding in every year', () => {
    expect(grid.length).toBeGreaterThan(100);
    const plans = [baselinePlan(sc), ...sc.strategies.map((s) => s.plan), ...grid];
    for (const plan of plans) {
      for (const fxShift of [0, 8]) {
        const run = runPlan(sc, plan, { fxShift });
        expect(run.years.length).toBe(sc.plan.length);
        for (const y of [...run.history, ...run.years]) expect(identityErrors(y), `${JSON.stringify(plan[0])} ${y.label}`).toEqual([]);
        // Cash reconciles year to year: each opening balance is the last closing one.
        const all = [...run.history, ...run.years];
        for (let i = 1; i < all.length; i++) expect(all[i]?.cash.open).toBeCloseTo(all[i - 1]?.cash.close ?? NaN, 6);
      }
    }
  });

  it('tells a story of decline in its history', () => {
    const { history } = runPlan(sc, []);
    const first = history[0]!.kpis;
    const last = history[history.length - 1]!.kpis;
    expect(first.profitMargin).toBeGreaterThan(8);
    expect(last.profitMargin).toBeLessThan(2);
    expect(last.profitMargin).toBeGreaterThan(0);
    for (let i = 1; i < history.length; i++) expect(history[i]!.kpis.profitMargin).toBeLessThan(history[i - 1]!.kpis.profitMargin);
    // The company never made a loss in its history, as the brief says.
    for (const y of history) expect(y.kpis.profit).toBeGreaterThan(0);
    // The market grew while Corvell's share fell; morale fell and turnover rose; the overdraft was never used.
    expect(last.marketSize).toBeGreaterThan(first.marketSize);
    expect(last.marketShare).toBeLessThan(first.marketShare);
    expect(last.morale).toBeLessThan(first.morale);
    expect(last.turnover).toBeGreaterThan(first.turnover);
    for (const y of history) expect(y.kpis.overdraft).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* Each lever behaves as the model says                                */
/* ------------------------------------------------------------------ */

describe('each lever behaves as the pages say it does', () => {
  const base = baselinePlan(sc);
  const first = (plan: Levers[]) => runPlan(sc, plan).years[0]!;
  const withYear1 = (patch: Partial<Levers>) => base.map((l, k) => (k === 0 ? { ...l, ...patch } : { ...l }));
  const everyYear = (patch: Partial<Levers>) => base.map((l) => ({ ...l, ...patch }));

  it('more marketing never lowers orders, and never lowers deliveries while capacity does not bind', () => {
    let prev: ReturnType<typeof first> | undefined;
    for (let m = 0; m <= sc.rules.marketing.max; m += 100000) {
      const y = first(withYear1({ marketing: m }));
      if (prev) {
        expect(y.kpis.demand).toBeGreaterThanOrEqual(prev.kpis.demand - 1e-9);
        if (y.kpis.lostSales === 0) expect(y.kpis.volume).toBeGreaterThanOrEqual(prev.kpis.volume - 1e-9);
      }
      prev = y;
    }
  });

  it('a price rise lowers orders, and with an elasticity above 1 lowers revenue while capacity does not bind', () => {
    const a = first(withYear1({ price: 0 }));
    const b = first(withYear1({ price: 5 }));
    expect(sc.model.elasticity).toBeGreaterThan(1);
    expect(b.kpis.price).toBeGreaterThan(a.kpis.price);
    expect(b.kpis.demand).toBeLessThan(a.kpis.demand);
    expect(b.kpis.revenue).toBeLessThan(a.kpis.revenue);
  });

  it('an efficiency programme lifts the first year’s operating profit and margin, and costs morale and, beyond the slack, quality', () => {
    const a = first(base);
    for (const cut of [2, 5, 8, 12, 15]) {
      const b = first(withYear1({ costCut: cut }));
      expect(b.kpis.pbit, `cut ${cut}`).toBeGreaterThan(a.kpis.pbit);
      expect(b.kpis.profitMargin, `cut ${cut}`).toBeGreaterThan(a.kpis.profitMargin);
      expect(b.kpis.morale, `cut ${cut}`).toBeLessThan(a.kpis.morale);
      if (cut > sc.model.cutSlack) expect(b.kpis.quality, `cut ${cut}`).toBeLessThan(a.kpis.quality);
    }
  });

  it('a deep cut costs more than it saves by the third year: lower operating profit, brand and quality', () => {
    const a = runPlan(sc, base).years;
    const b = runPlan(sc, withYear1({ costCut: 12 })).years;
    const last = sc.plan.length - 1;
    expect(b[0]!.kpis.pbit).toBeGreaterThan(a[0]!.kpis.pbit);
    expect(b[last]!.kpis.pbit).toBeLessThan(a[last]!.kpis.pbit);
    expect(b[last]!.kpis.brand).toBeLessThan(a[last]!.kpis.brand);
    expect(b[last]!.kpis.quality).toBeLessThan(a[last]!.kpis.quality);
  });

  it('demand above normal hours brings overtime and lower service quality', () => {
    const calm = first(base);
    const busy = first(withYear1({ price: -6, marketing: 1600000 }));
    expect(calm.kpis.overtimeHours).toBe(0);
    expect(busy.kpis.load).toBeGreaterThan(100);
    expect(busy.kpis.overtimeHours).toBeGreaterThan(0);
    expect(busy.kpis.quality).toBeLessThan(calm.kpis.quality);
  });

  it('machinery needs cash now and adds capacity only the year after', () => {
    const a = runPlan(sc, base).years;
    const b = runPlan(sc, withYear1({ capacity: 1000000 })).years;
    expect(b[0]!.kpis.plantCapacity).toBe(a[0]!.kpis.plantCapacity);
    expect(b[0]!.kpis.normalCapacity).toBeCloseTo(a[0]!.kpis.normalCapacity, 6);
    expect(b[0]!.kpis.pbit).toBeCloseTo(a[0]!.kpis.pbit, 6);
    expect(b[0]!.kpis.netCash).toBeCloseTo(a[0]!.kpis.netCash - 1000000, 0);
    expect(b[1]!.kpis.plantCapacity).toBeGreaterThan(a[1]!.kpis.plantCapacity);
    expect(b[1]!.ops.hoursPerPiece).toBeLessThan(a[1]!.ops.hoursPerPiece);
  });

  it('a people programme lifts morale at once and skill only the year after', () => {
    const a = runPlan(sc, base).years;
    const b = runPlan(sc, withYear1({ people: 400000 })).years;
    expect(b[0]!.kpis.morale).toBeGreaterThan(a[0]!.kpis.morale);
    expect(b[0]!.kpis.skill).toBeCloseTo(a[0]!.kpis.skill, 9);
    expect(b[1]!.kpis.skill).toBeGreaterThan(a[1]!.kpis.skill);
  });

  it('exports start the year after the set-up, and a stronger pound lowers what they earn', () => {
    const plan = everyYear({ international: 600000 });
    const run = runPlan(sc, plan);
    expect(run.years[0]!.kpis.exportVolume).toBe(0);
    expect(run.years[1]!.kpis.exportVolume).toBeGreaterThan(0);
    const strong = runPlan(sc, plan, { fxShift: 8 });
    expect(strong.years[1]!.kpis.exportRevenue).toBeLessThan(run.years[1]!.kpis.exportRevenue);
    expect(strong.years[1]!.kpis.exportVolume).toBeCloseTo(run.years[1]!.kpis.exportVolume, 6);
    // Spending less than the set-up opens nothing.
    const short = runPlan(sc, withYear1({ international: sc.model.intlSetup / 2 }));
    expect(short.years.every((y) => y.kpis.exportVolume === 0)).toBe(true);
  });

  it('separates a plan lever by lever', () => {
    const plan = sc.strategies.find((s) => s.id === sc.walkthrough.strategy)!.plan;
    const attr = attribution(sc, plan);
    expect(attr.map((a) => a.lever)).toEqual(['price', 'costCut', 'marketing', 'capacity', 'people', 'international']);
    for (const a of attr) if (!a.used) expect(a.cumProfit).toBe(0);
    // The worked example's marketing is what added most to its profit over the three years.
    const best = [...attr].sort((x, y) => y.cumProfit - x.cumProfit)[0];
    expect(best?.lever).toBe('marketing');
  });
});

/* ------------------------------------------------------------------ */
/* The rules of a year's plan                                          */
/* ------------------------------------------------------------------ */

describe('checking a year’s plan', () => {
  const fine = { ...sc.rules.baseline };

  it('accepts a plan inside the rules', () => {
    expect(checkLevers(sc.rules, fine)).toEqual([]);
    expect(leversSchema.safeParse(fine).success).toBe(true);
  });

  it('refuses a plan over the budget, and says by how much', () => {
    const p = checkLevers(sc.rules, { ...fine, people: 0, marketing: 2000000, capacity: 1000000 }, (v) => `£${v}`);
    expect(p.map((x) => x.field)).toEqual(['budget']);
    expect(p[0]?.message).toContain('£500000');
  });

  it('refuses figures out of range, off the step, or not numbers', () => {
    const p = checkLevers(sc.rules, { ...fine, price: 12, costCut: 2.5, people: Number.NaN, international: -10000 });
    expect(p.map((x) => x.field).sort()).toEqual(['costCut', 'international', 'people', 'price']);
    expect(p.find((x) => x.field === 'people')?.message).toBe('Enter a number.');
  });

  it('every strategy’s plan keeps to the rules', () => {
    for (const s of sc.strategies) for (const l of s.plan) expect(checkLevers(sc.rules, l), s.id).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* The stages' answers, against the engine's own figures               */
/* ------------------------------------------------------------------ */

describe('the stages key their answers on the engine’s figures', () => {
  const { history } = runPlan(sc, []);
  const d = derived(sc);
  const h = (label: string) => history.find((y) => y.label === label)!.kpis;
  const first = history[0]!.label;
  const last = history[history.length - 1]!.label;

  it('the profit margin to calculate is the one in the ratios, and a sensible answer is accepted', () => {
    const q = sc.stages.finance.questions.find((x) => x.id === 'margin-2026')!;
    if (q.kind !== 'number') throw new Error('expected a number question');
    const answer = figureValue(q.answer, history)!;
    expect(answer).toBeCloseTo(h(last).profitMargin, 9);
    expect(answerRight(Math.round(answer * 10) / 10, answer, q.tolerance)).toBe(true);
    expect(answerRight(h(first).profitMargin, answer, q.tolerance)).toBe(false);
  });

  it('the right account of the fall is true of the figures, and each wrong one is false', () => {
    const a = h(first);
    const b = h(last);
    expect(b.materialPerPiece / a.materialPerPiece).toBeGreaterThan(b.price / a.price);
    expect(b.volume).toBeLessThan(a.volume);
    expect(b.overheads).toBeGreaterThan(a.overheads);
    expect(b.gpm).toBeLessThan(a.gpm);
    // Not a collapse; interest and depreciation unchanged.
    expect((a.revenue - b.revenue) / a.revenue).toBeLessThan(0.15);
    expect(b.interest).toBeCloseTo(a.interest, 6);
    expect(b.depreciation).toBeCloseTo(a.depreciation, 6);
  });

  it('every piece of evidence’s verdict agrees with the figures it quotes', () => {
    const a = h(first);
    const b = h(last);
    const verdict = Object.fromEntries(sc.stages.causes.evidence.map((e) => [e.id, e.verdict]));
    expect(verdict).toMatchObject({ materials: 'cause', competitors: 'cause', marketing: 'cause', morale: 'cause', overheads: 'cause', returns: 'partial', market: 'not', interest: 'not', depreciation: 'not', dividends: 'not', exchange: 'not' });
    expect(b.relativePrice).toBeGreaterThan(a.relativePrice);
    expect(b.marketing).toBeLessThan(a.marketing);
    expect(b.brand).toBeLessThan(a.brand);
    expect(b.turnover).toBeGreaterThan(a.turnover);
    expect(b.productivity).toBeLessThan(a.productivity);
    expect(b.returnsRate).toBeGreaterThan(a.returnsRate);
    expect(b.marketSize).toBeGreaterThan(a.marketSize);
    expect(b.exportRevenue).toBe(0);
    // Holding the brand needs more marketing than 2026's.
    expect(d.marketingNorm!.value).toBeGreaterThan(b.marketing);
  });

  it('a 5% price rise lowers revenue and leaves gross profit roughly where it was', () => {
    expect(d.priceRise5Volume!.value).toBeLessThan(-5);
    expect(d.priceRise5Revenue!.value).toBeLessThan(0);
    expect(Math.abs(d.priceRise5Gross!.value)).toBeLessThan(2);
  });

  it('the export offer earns less a piece than the home market, and less still when the pound strengthens', () => {
    expect(d.exportMargin!.value).toBeLessThan(d.homeMargin!.value);
    expect(d.exportMargin!.value).toBeGreaterThan(0);
    expect(d.exportPriceStrong!.value).toBeLessThan(d.exportPrice!.value);
  });

  it('the workshop had spare normal hours in 2026, and 12% more orders would need overtime and strain quality', () => {
    const q = sc.stages.operations.questions.find((x) => x.id === 'spare-capacity')!;
    if (q.kind !== 'number') throw new Error('expected a number question');
    expect(figureValue(q.answer, history)).toBeCloseTo(d.spareNormal!.value, 6);
    expect(d.spareNormal!.value).toBeGreaterThan(0);
    expect(d.demand12!.value).toBeGreaterThan(d.labourNormal!.value);
    expect(d.lostAt12!.value).toBe(0);
    expect(d.loadAt12!.value).toBeGreaterThan(sc.model.strainThreshold);
    expect(h(last).plantCapacity).toBeGreaterThan(d.demand12!.value);
  });
});

/* ------------------------------------------------------------------ */
/* The debrief says what the engine shows                              */
/* ------------------------------------------------------------------ */

describe('the debrief’s claims about the strategies', () => {
  const runs = Object.fromEntries(sc.strategies.map((s) => [s.id, runPlan(sc, s.plan)]));
  const sum = Object.fromEntries(Object.entries(runs).map(([id, r]) => [id, summarize(sc, r)]));
  const ids = Object.keys(runs);
  const best = (f: (id: string) => number) => [...ids].sort((a, b) => f(b) - f(a))[0];
  const worst = (f: (id: string) => number) => [...ids].sort((a, b) => f(a) - f(b))[0];
  const y = (id: string, k: number) => runs[id]!.years[k]!.kpis;
  const lastK = sc.plan.length - 1;
  const limit = sc.start.overdraftLimit;

  it('Restore the core: the best profit over the plan, its own first year its worst, the board’s margin met, share lost, never over the limit', () => {
    expect(best((id) => sum[id]!.cumProfit)).toBe('restore');
    const pbit = runs.restore!.years.map((r) => r.kpis.pbit);
    expect(Math.min(...pbit)).toBe(pbit[0]);
    expect(y('restore', lastK).profitMargin).toBeGreaterThanOrEqual(5);
    expect(y('restore', lastK).marketShare).toBeLessThan(runs.restore!.history[runs.restore!.history.length - 1]!.kpis.marketShare);
    expect(sum.restore!.breached).toBe(false);
  });

  it('Cut back to profit: the best first year, then the worst third year and the weakest brand', () => {
    expect(best((id) => y(id, 0).pbit)).toBe('cut');
    expect(worst((id) => y(id, lastK).pbit)).toBe('cut');
    expect(worst((id) => y(id, lastK).brand)).toBe('cut');
  });

  it('Win volume: the most revenue and market share, overtime in its first year, the least profit, over the limit', () => {
    expect(best((id) => y(id, lastK).revenue)).toBe('volume');
    expect(best((id) => y(id, lastK).marketShare)).toBe('volume');
    expect(y('volume', 0).overtimeHours).toBeGreaterThan(0);
    expect(worst((id) => sum[id]!.cumProfit)).toBe('volume');
    expect(y('volume', lastK).netCash).toBeLessThan(-limit);
    expect(sum.volume!.breached).toBe(true);
  });

  it('Go international: exports by the last year, a loss first, its lowest cash in the middle year, and exposed to the pound', () => {
    expect(y('international', lastK).exportRevenue).toBeGreaterThan(0);
    expect(y('international', 0).pbit).toBeLessThan(0);
    const cash = runs.international!.years.map((r) => r.kpis.netCash);
    expect(Math.min(...cash)).toBe(cash[1]);
    expect(runs.international!.years[1]!.kpis.fx).toBeGreaterThan(sc.model.fxRef);
    const plan = sc.strategies.find((s) => s.id === 'international')!.plan;
    expect(summarize(sc, runPlan(sc, plan, { fxShift: 8 })).cumProfit).toBeLessThan(sum.international!.cumProfit);
    expect(summarize(sc, runPlan(sc, plan, { fxShift: -8 })).cumProfit).toBeGreaterThan(sum.international!.cumProfit);
  });

  it('carrying on as in 2026 leaves the margin below where it started', () => {
    const r = runPlan(sc, baselinePlan(sc));
    expect(r.years[lastK]!.kpis.profitMargin).toBeLessThan(r.history[r.history.length - 1]!.kpis.profitMargin);
  });

  it('no plan meets every goal of every role, and every role’s goals can be met by some plan', () => {
    const plans = [...sc.strategies.map((s) => s.plan), baselinePlan(sc), ...grid];
    const metAll = Object.fromEntries(ROLE_IDS.map((r) => [r, false])) as Record<(typeof ROLE_IDS)[number], boolean>;
    for (const plan of plans) {
      const met = goalsMet(sc, runPlan(sc, plan));
      const everyone = ROLE_IDS.every((r) => met[r] === sc.roles[r].goals.length);
      expect(everyone, JSON.stringify(plan[0])).toBe(false);
      for (const r of ROLE_IDS) if (met[r] === sc.roles[r].goals.length) metAll[r] = true;
    }
    expect(metAll).toEqual(Object.fromEntries(ROLE_IDS.map((r) => [r, true])));
  });
});

/* ------------------------------------------------------------------ */
/* Words from numbers                                                  */
/* ------------------------------------------------------------------ */

describe('tokens and formatting', () => {
  const ctx = narrateContext(sc);
  const { history } = runPlan(sc, []);
  const src = { years: history, focus: history[history.length - 1]!, derived: derived(sc) };

  it('fills tokens for a year, a change, a per cent change and a derived figure', () => {
    const k = history.find((y) => y.label === '2026')!.kpis;
    expect(fillTokens('{{revenue@2026}}', src, ctx)).toBe(fmtKpi('revenue', k.revenue, ctx));
    expect(fillTokens('{{revenue}}', src, ctx)).toBe(fmtKpi('revenue', k.revenue, ctx));
    expect(fillTokens('{{morale@2023>2026}}', src, ctx)).toBe(kpiChange('morale', history[0]!.kpis.morale, k.morale, ctx).text);
    expect(fillTokens('{{pct:marketSize@2023>2026}}', src, ctx)).toMatch(/^\+\u2060\d+\.\d%$/);
    // In a sentence that says which way, the change carries no sign: "revenue fell by 7.8%".
    const fall = ((history[0]!.kpis.revenue - k.revenue) / history[0]!.kpis.revenue) * 100;
    expect(fillTokens('fell by {{pc:revenue@2023>2026}}', src, ctx)).toBe(`fell by ${fall.toFixed(1)}%`);
    expect(fillTokens('{{d:elasticity}}', src, ctx)).toBe('2.0');
  });

  it('reports a token that cannot be filled', () => {
    const years = history.map((y) => y.label);
    expect(badTokens('{{revenue@2026}} {{d:spareNormal}}', years, Object.keys(src.derived), false)).toEqual([]);
    expect(badTokens('{{revenue@2031}}', years, [], false)).toEqual(['{{revenue@2031}}']);
    expect(badTokens('{{nonsense}} {{d:nothing}} {{pct:revenue}}', years, [], false)).toEqual(['{{nonsense}}', '{{d:nothing}}', '{{pct:revenue}}']);
    expect(badTokens('{{pbit@final}}', years, [], false)).toEqual(['{{pbit@final}}']);
    expect(badTokens('{{pbit@final}}', years, [], true)).toEqual([]);
    expect(badTokens('an open {{ brace', years, [], false)).toEqual(['{{']);
  });

  it('writes changes in whole pounds for prices, and points for percentages', () => {
    expect(kpiChange('price', 878.89, 914.05, ctx).text).toBe('+\u2060£35');
    expect(kpiChange('profitMargin', 1, 5.5, ctx)).toMatchObject({ verdict: 'better', text: '+\u20604.5 pts' });
    expect(kpiChange('turnover', 15, 8, ctx)).toMatchObject({ verdict: 'better', words: 'Down, better' });
  });
});

/* ------------------------------------------------------------------ */
/* The integrity check catches what it exists for                      */
/* ------------------------------------------------------------------ */

function refsFrom(c: ReturnType<typeof loadCorpus>): ExecutiveRefs {
  return {
    subtopics: new Set((c.curricula['ib-dp-bm']?.units ?? []).flatMap((u) => u.subtopics.map((s) => s.code))),
    glossary: new Set(Object.keys(c.glossary)),
    commandTerms: new Set(Object.keys(c.commandTerms)),
    sources: new Set(Object.keys(c.sources)),
  };
}

describe('the integrity check', () => {
  const c = loadCorpus();
  const refs = refsFrom(c);
  const mutate = (f: (x: Executive) => void) => {
    const copy = JSON.parse(JSON.stringify(sc), (k, v) => (k === 'updated' ? new Date(v) : v)) as Executive;
    f(copy);
    return checkExecutive({ copy }, refs).map((p) => p.message);
  };

  it('catches a question with two right answers', () => {
    const msgs = mutate((x) => {
      const q = x.stages.market.questions[0];
      if (q?.kind === 'choice') q.options.forEach((o) => (o.correct = true));
    });
    expect(msgs.some((m) => m.includes('exactly one right answer'))).toBe(true);
  }, 30_000);

  it('catches a token that cannot be filled, and a figure typed for a year that has not happened', () => {
    const msgs = mutate((x) => {
      x.mandate = `${x.mandate} {{revenu@2026}}`;
      x.stages.finance.lead = `${x.stages.finance.lead} {{pbit@2028}}`;
    });
    expect(msgs.filter((m) => m.startsWith('token'))).toHaveLength(2);
  }, 30_000);

  it('catches a strategy that spends more than the budget, and a source that is not in the register', () => {
    const msgs = mutate((x) => {
      const s = x.strategies[0];
      if (s?.plan[0]) s.plan[0].marketing = 2000000;
      if (s?.plan[0]) s.plan[0].capacity = 2000000;
      x.debrief.beyond[0]!.sources = ['no-such-source'];
    });
    expect(msgs.some((m) => m.includes('more than the budget'))).toBe(true);
    expect(msgs.some((m) => m.includes('not in the source register'))).toBe(true);
  }, 30_000);
});

/* ------------------------------------------------------------------ */
/* The learner's dashboard files the saved simulation under the Boardroom */
/* ------------------------------------------------------------------ */

describe('the saved simulation on the dashboard', () => {
  it('is room work, linked back to the simulation and filed under the Boardroom', () => {
    expect(familyOf('bb:executive')).toBe('work');
    expect(workLink('executive', '', [{ title: 'Boardroom', href: '/boardroom/' }], [])).toBe('/boardroom/');
  });
});
