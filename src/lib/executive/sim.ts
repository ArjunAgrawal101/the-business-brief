/**
 * Running the executive simulation: the history before the plan, a plan of
 * levers year by year, the checks a plan must pass, the scorecards, and the
 * comparisons the debrief makes (the strategies' plans, lever by lever, and
 * the exchange rate moving the other way). Pure and deterministic like the
 * engine, so a plan always gives the same run.
 */
import { originState, runYear, type KpiId, type State, type YearResult } from './engine';
import type { Executive, GoalDef, Levers, Rules } from './schema';
import { BUDGET_LEVERS, LEVER_IDS, ROLE_IDS, type LeverId, type RoleId } from './roles';

/** The parts of the simulation the runner needs; the browser receives exactly this. */
export type SimCore = Pick<Executive, 'model' | 'start' | 'history' | 'plan' | 'rules' | 'roles'>;

export interface Run {
  history: YearResult[];
  /** The plan years run so far. */
  years: YearResult[];
  /** The state after the last year run. */
  state: State;
}

/* ------------------------------------------------------------------ */
/* Runs                                                                */
/* ------------------------------------------------------------------ */

export function runHistory(sc: Pick<SimCore, 'model' | 'start' | 'history'>): { history: YearResult[]; state: State } {
  let state = originState(sc.model, sc.start);
  const history: YearResult[] = [];
  for (const h of sc.history) {
    const out = runYear(sc.model, state, h.levers, h.conditions, h.label);
    state = out.state;
    history.push(out.result);
  }
  return { history, state };
}

const historyCache = new WeakMap<object, { history: YearResult[]; state: State }>();

function cachedHistory(sc: Pick<SimCore, 'model' | 'start' | 'history'>) {
  let h = historyCache.get(sc);
  if (!h) {
    h = runHistory(sc);
    historyCache.set(sc, h);
  }
  return h;
}

export interface RunOptions {
  /** Per cent by which the home currency is stronger than planned in every plan year (negative: weaker). */
  fxShift?: number;
}

/** Run a plan: one year's levers per plan year, as far as the plan goes. */
export function runPlan(sc: Pick<SimCore, 'model' | 'start' | 'history' | 'plan'>, plan: ReadonlyArray<Levers>, o: RunOptions = {}): Run {
  const { history, state: afterHistory } = cachedHistory(sc);
  let state = afterHistory;
  const years: YearResult[] = [];
  plan.slice(0, sc.plan.length).forEach((levers, k) => {
    const y = sc.plan[k];
    if (!y) return;
    const cond = o.fxShift ? { ...y.conditions, fx: y.conditions.fx * (1 + o.fxShift / 100) } : y.conditions;
    const out = runYear(sc.model, state, levers, cond, y.label);
    state = out.state;
    years.push(out.result);
  });
  return { history, years, state };
}

/** Every year of a run, history first. */
export const yearsOf = (run: Run): YearResult[] => [...run.history, ...run.years];

/** The last history year: the position the plan starts from. */
export function lastHistory(run: Pick<Run, 'history'>): YearResult {
  const last = run.history[run.history.length - 1];
  if (!last) throw new Error('The simulation needs history');
  return last;
}

/* ------------------------------------------------------------------ */
/* Checking a year's plan                                              */
/* ------------------------------------------------------------------ */

export interface LeverProblem {
  field: LeverId | 'budget';
  message: string;
}

/** Whether a year's levers keep to the rules: every lever in its range and on its step, and the budget not exceeded. */
export function checkLevers(rules: Rules, l: Partial<Record<LeverId, unknown>>, fmtMoney: (v: number) => string = (v) => String(v)): LeverProblem[] {
  const out: LeverProblem[] = [];
  for (const id of LEVER_IDS) {
    const v = l[id];
    const b = rules[id];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      out.push({ field: id, message: 'Enter a number.' });
      continue;
    }
    const money = (BUDGET_LEVERS as readonly string[]).includes(id);
    const show = (x: number) => (money ? fmtMoney(x) : `${x < 0 ? '−' : ''}${Math.abs(x)}%`);
    if (v < b.min - 1e-9 || v > b.max + 1e-9) out.push({ field: id, message: `Enter a figure from ${show(b.min)} to ${show(b.max)}.` });
    else if (Math.abs(Math.round((v - b.min) / b.step) * b.step - (v - b.min)) > 1e-6) out.push({ field: id, message: `Use steps of ${show(b.step)}.` });
  }
  const spend = BUDGET_LEVERS.reduce((a, id) => a + (typeof l[id] === 'number' && Number.isFinite(l[id]) ? (l[id] as number) : 0), 0);
  if (spend > rules.budget + 1e-6) out.push({ field: 'budget', message: `The plan spends ${fmtMoney(spend)}, more than the budget of ${fmtMoney(rules.budget)}. Take ${fmtMoney(spend - rules.budget)} out of marketing, capacity, people or international.` });
  return out;
}

export const budgetSpend = (l: Levers): number => BUDGET_LEVERS.reduce((a, id) => a + l[id], 0);

/* ------------------------------------------------------------------ */
/* Measures over the plan, and the scorecards                          */
/* ------------------------------------------------------------------ */

/** A goal's metric over the plan years: final, change (from the last history year), min, max, sum or avg. */
export function metricValue(run: Run, metric: string): number | null {
  const [how, id] = metric.split(':') as [string, KpiId];
  const series = run.years.map((y) => y.kpis[id]);
  if (!series.length || series.some((v) => typeof v !== 'number')) return null;
  const startValue = run.history[run.history.length - 1]?.kpis[id];
  const final = series[series.length - 1] as number;
  switch (how) {
    case 'final':
      return final;
    case 'change':
      return typeof startValue === 'number' ? final - startValue : null;
    case 'min':
      return Math.min(...series);
    case 'max':
      return Math.max(...series);
    case 'sum':
      return series.reduce((a, b) => a + b, 0);
    case 'avg':
      return series.reduce((a, b) => a + b, 0) / series.length;
    default:
      return null;
  }
}

export function goalMet(value: number | null, g: Pick<GoalDef, 'op' | 'value'>): boolean {
  if (value === null) return false;
  const eps = 1e-9;
  switch (g.op) {
    case '<':
      return value < g.value - eps;
    case '<=':
      return value <= g.value + eps;
    case '>':
      return value > g.value + eps;
    default:
      return value >= g.value - eps;
  }
}

export interface GoalResult {
  goal: GoalDef;
  value: number | null;
  met: boolean;
}

/** What scoring needs to know about the roles: their goals. */
export type RoleGoals = Record<RoleId, { goals: GoalDef[] }>;

export function scorecard(sc: { roles: RoleGoals }, run: Run, role: RoleId): GoalResult[] {
  return sc.roles[role].goals.map((goal) => {
    const value = metricValue(run, goal.metric);
    return { goal, value, met: goalMet(value, goal) };
  });
}

/** Goals met by every role on a run. */
export function goalsMet(sc: { roles: RoleGoals }, run: Run): Record<RoleId, number> {
  return Object.fromEntries(ROLE_IDS.map((r) => [r, scorecard(sc, run, r).filter((g) => g.met).length])) as Record<RoleId, number>;
}

/* ------------------------------------------------------------------ */
/* Summaries for comparison                                            */
/* ------------------------------------------------------------------ */

export interface PlanSummary {
  /** Profit for the year, added over the plan. */
  cumProfit: number;
  /** Profit before interest and tax, year by year. */
  pbit: number[];
  final: Record<KpiId, number>;
  /** The lowest net cash at any year end, and whether the overdraft ever ended a year above its limit. */
  lowCash: number;
  breached: boolean;
  goals: Record<RoleId, number>;
}

export function summarize(sc: { roles: RoleGoals }, run: Run): PlanSummary {
  const last = run.years[run.years.length - 1];
  if (!last) throw new Error('A plan with no years cannot be summarized');
  return {
    cumProfit: run.years.reduce((a, y) => a + y.kpis.profit, 0),
    pbit: run.years.map((y) => y.kpis.pbit),
    final: { ...last.kpis },
    lowCash: Math.min(...run.years.map((y) => y.kpis.netCash)),
    breached: run.years.some((y) => y.breached),
    goals: goalsMet(sc, run),
  };
}

/** A figure a question asks for: a KPI in a year (or "final"), less the same KPI in another year or another KPI in the same year. */
export function figureValue(f: { kpi: string; year: string; from?: string; less?: string }, years: YearResult[]): number | null {
  const at = (label: string) => (label === 'final' ? years[years.length - 1] : years.find((y) => y.label === label));
  const y = at(f.year);
  const k = f.kpi as KpiId;
  if (!y || typeof y.kpis[k] !== 'number') return null;
  if (f.less) return y.kpis[k] - (y.kpis[f.less as KpiId] ?? NaN);
  if (f.from) {
    const x = at(f.from);
    return x ? y.kpis[k] - x.kpis[k] : null;
  }
  return y.kpis[k];
}

/** Whether a typed answer is within the tolerance of the engine's. */
export const answerRight = (typed: number, answer: number, tolerance: number): boolean => Math.abs(typed - answer) <= tolerance + 1e-9;

/* ------------------------------------------------------------------ */
/* Lever by lever: what each choice did, holding the others            */
/* ------------------------------------------------------------------ */

export interface Attribution {
  lever: LeverId;
  /** Whether the plan moved this lever from the baseline in any year. */
  used: boolean;
  /** The plan's figures less the figures with this lever kept at the baseline every year. */
  cumProfit: number;
  firstPbit: number;
  finalPbit: number;
  finalNetCash: number;
  finalBrand: number;
  finalMorale: number;
  finalQuality: number;
  finalShare: number;
}

/**
 * For each lever, run the plan again with that lever at its baseline in every
 * year and report the difference. The parts interact, so they need not add up
 * to the difference between the plan and the baseline.
 */
export function attribution(sc: Pick<SimCore, 'model' | 'start' | 'history' | 'plan' | 'rules'>, plan: ReadonlyArray<Levers>): Attribution[] {
  const mine = runPlan(sc, plan);
  const f = (run: Run) => run.years[run.years.length - 1]?.kpis;
  const cum = (run: Run) => run.years.reduce((a, y) => a + y.kpis.profit, 0);
  const a = f(mine);
  if (!a) return [];
  return LEVER_IDS.map((lever) => {
    const base = sc.rules.baseline[lever];
    const used = plan.some((l) => Math.abs(l[lever] - base) > 1e-9);
    const without = runPlan(
      sc,
      plan.map((l) => ({ ...l, [lever]: base })),
    );
    const b = f(without);
    if (!b) throw new Error('The comparison run produced no years');
    return {
      lever,
      used,
      cumProfit: cum(mine) - cum(without),
      firstPbit: (mine.years[0]?.kpis.pbit ?? 0) - (without.years[0]?.kpis.pbit ?? 0),
      finalPbit: a.pbit - b.pbit,
      finalNetCash: a.netCash - b.netCash,
      finalBrand: a.brand - b.brand,
      finalMorale: a.morale - b.morale,
      finalQuality: a.quality - b.quality,
      finalShare: a.marketShare - b.marketShare,
    };
  });
}

/** The plan with no new decisions: the baseline levers in every year. */
export const baselinePlan = (sc: Pick<SimCore, 'rules' | 'plan'>): Levers[] => sc.plan.map(() => ({ ...sc.rules.baseline }));

/* ------------------------------------------------------------------ */
/* Figures the questions and texts quote                               */
/* ------------------------------------------------------------------ */

/**
 * Figures worked from the last history year and the model's coefficients,
 * for the analysis stages' questions and explanations. The content quotes
 * them as {{d:name}}; the unit tests check the answers keyed on them.
 */
export function derived(sc: Pick<SimCore, 'model' | 'start' | 'history' | 'plan' | 'rules'>): Record<string, { value: number; kind: 'percent' | 'wholePercent' | 'money' | 'units' | 'price' | 'signedPercent' | 'number' | 'decimal' }> {
  const { history } = cachedHistory(sc);
  const last = history[history.length - 1];
  const first = history[0];
  if (!last || !first) throw new Error('The simulation needs history');
  const m = sc.model;
  const k = last.kpis;
  const unitCost = k.volume > 0 ? k.costOfSales / k.volume : 0;
  const volumeFactor = Math.pow(1.05, -m.elasticity);
  const gpBefore = k.price - unitCost;
  const gpAfter = (k.price * 1.05 - unitCost) * volumeFactor;
  const demand12 = k.volume * 1.12;
  const exportPrice = k.price * m.intlPriceRatio;
  const inputs = unitCost;
  return {
    priceRise5Volume: { value: (volumeFactor - 1) * 100, kind: 'signedPercent' },
    priceRise5Lost: { value: (1 - volumeFactor) * 100, kind: 'percent' },
    priceRise5Revenue: { value: (1.05 * volumeFactor - 1) * 100, kind: 'signedPercent' },
    priceRise5Gross: { value: (gpAfter / gpBefore - 1) * 100, kind: 'signedPercent' },
    unitCost: { value: unitCost, kind: 'price' },
    unitGross: { value: gpBefore, kind: 'price' },
    spareNormal: { value: k.normalCapacity - k.volume, kind: 'units' },
    spareMax: { value: k.capacity - k.volume, kind: 'units' },
    demand12: { value: demand12, kind: 'units' },
    overtimeAt12: { value: Math.max(0, demand12 - last.ops.labourNormal), kind: 'units' },
    lostAt12: { value: Math.max(0, demand12 - k.capacity), kind: 'units' },
    loadAt12: { value: k.normalCapacity > 0 ? (demand12 / k.normalCapacity) * 100 : 0, kind: 'percent' },
    labourNormal: { value: last.ops.labourNormal, kind: 'units' },
    exportPrice: { value: exportPrice, kind: 'price' },
    exportPriceStrong: { value: exportPrice / 1.05, kind: 'price' },
    exportMargin: { value: exportPrice - inputs - m.intlFreight - (m.intlDamage / 100) * (k.materialPerPiece + m.intlFreight), kind: 'price' },
    homeMargin: { value: k.price - unitCost, kind: 'price' },
    materialRise: { value: (k.materialPerPiece / first.kpis.materialPerPiece - 1) * 100, kind: 'signedPercent' },
    priceRise: { value: (k.price / first.kpis.price - 1) * 100, kind: 'signedPercent' },
    budget: { value: sc.rules.budget, kind: 'money' },
    overdraftLimit: { value: sc.start.overdraftLimit, kind: 'money' },
    budgetAll: { value: sc.rules.budget * sc.plan.length, kind: 'money' },
    // The spend that holds the brand where it is: the year's build equals the year's decay.
    marketingNorm: { value: m.marketingScale * (Math.exp((m.brandDecay / 100) * k.brand / m.marketingPower) - 1), kind: 'money' },
    elasticity: { value: m.elasticity, kind: 'decimal' },
    fxRef: { value: m.fxRef, kind: 'number' },
    intlSetup: { value: m.intlSetup, kind: 'money' },
    intlPotential: { value: m.intlPotential, kind: 'units' },
    intlDebtorDays: { value: m.intlDebtorDays, kind: 'units' },
    intlFreight: { value: m.intlFreight, kind: 'money' },
    intlDamage: { value: m.intlDamage, kind: 'wholePercent' },
  };
}
