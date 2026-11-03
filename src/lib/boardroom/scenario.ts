/**
 * Running a Boardroom scenario: the periods before the first decision, then
 * one period per round, with the event between rounds chosen by the state the
 * business is in. Pure and deterministic like the engine, so a path (one
 * option id per round) always produces the same run, and every path can be
 * enumerated and compared.
 */
import { originState, runPeriod, type EffectsIn, type Kpis, type KpiId, type PeriodResult, type State } from './engine';
import type { Condition, EventVariant, GoalDef, OptionDef, RoundDef, Scenario } from './schema';
import { ROLE_IDS, type RoleId } from './roles';

/** The parts of a scenario the runner needs; the browser receives exactly this. */
export type ScenarioCore = Pick<Scenario, 'model' | 'start' | 'history' | 'rounds' | 'roles'>;

export interface RoundRun {
  round: RoundDef;
  option: OptionDef;
  /** Notes of the conditional effects that applied. */
  conditional: string[];
  /** The event that happened before this round, if any. */
  before?: EventVariant;
  result: PeriodResult;
  /** The event that follows this round, chosen by the state it ends in. */
  event?: EventVariant;
}

export interface Run {
  history: PeriodResult[];
  rounds: RoundRun[];
  /** The state after the last completed period. */
  state: State;
}

/* ------------------------------------------------------------------ */
/* Conditions                                                          */
/* ------------------------------------------------------------------ */

export function holds(c: Condition | undefined, state: State, result: PeriodResult | undefined): boolean {
  if (!c) return true;
  if ('all' in c) return c.all.every((x) => holds(x, state, result));
  if ('any' in c) return c.any.some((x) => holds(x, state, result));
  if ('not' in c) return !holds(c.not, state, result);
  if ('channel' in c) return state.channels.some((ch) => ch.id === c.channel);
  if ('flag' in c) {
    const v = state.flags[c.flag];
    return c.equals === undefined ? Boolean(v) : v === c.equals;
  }
  const v = result?.kpis[c.kpi as KpiId];
  if (typeof v !== 'number') return false;
  switch (c.op) {
    case '<':
      return v < c.value;
    case '<=':
      return v <= c.value;
    case '>':
      return v > c.value;
    case '>=':
      return v >= c.value;
    default:
      return Math.abs(v - c.value) < 1e-9;
  }
}

/** The event variant that happens after a period: the first whose condition holds. */
export function pickEvent(round: RoundDef, state: State, result: PeriodResult): EventVariant | undefined {
  return round.event?.variants.find((v) => holds(v.if, state, result));
}

/* ------------------------------------------------------------------ */
/* Runs                                                                */
/* ------------------------------------------------------------------ */

/** The periods before the first decision, and the state they leave. */
export function runHistory(sc: ScenarioCore): { history: PeriodResult[]; state: State } {
  let state = originState(sc.model, sc.start);
  const history: PeriodResult[] = [];
  for (const h of sc.history) {
    const out = runPeriod(sc.model, state, [{ effects: h.effects }], h.label);
    state = out.state;
    history.push(out.result);
  }
  return { history, state };
}

const historyCache = new WeakMap<object, { history: PeriodResult[]; state: State }>();

function cachedHistory(sc: ScenarioCore) {
  let h = historyCache.get(sc);
  if (!h) {
    h = runHistory(sc);
    historyCache.set(sc, h);
  }
  return h;
}

/**
 * Run a path: one option id per round, as far as the path goes. Unknown ids
 * stop the run there, so a stale saved path can never crash the page.
 */
export function runPath(sc: ScenarioCore, picks: ReadonlyArray<string | undefined>): Run {
  const { history, state: afterHistory } = cachedHistory(sc);
  let state = afterHistory;
  let last: PeriodResult | undefined = history[history.length - 1];
  let pendingEvent: EventVariant | undefined;
  const rounds: RoundRun[] = [];
  for (let k = 0; k < sc.rounds.length; k++) {
    const round = sc.rounds[k];
    const option = round?.options.find((o) => o.id === picks[k]);
    if (!round || !option) break;
    const inputs: EffectsIn[] = [];
    if (pendingEvent) inputs.push({ effects: pendingEvent.effects });
    if (round.given) inputs.push({ effects: round.given.effects });
    inputs.push({ effects: option.effects });
    const conditional: string[] = [];
    for (const w of option.when) {
      if (holds(w.if, state, last)) {
        inputs.push({ effects: w.effects });
        conditional.push(w.note);
      }
    }
    const out = runPeriod(sc.model, state, inputs, round.period);
    const event = k < sc.rounds.length - 1 ? pickEvent(round, out.state, out.result) : undefined;
    rounds.push({ round, option, conditional, before: pendingEvent, result: out.result, event });
    state = out.state;
    last = out.result;
    pendingEvent = event;
  }
  return { history, rounds, state };
}

/** Every complete path through the scenario: one option per round, in order. */
export function allPaths(sc: Pick<Scenario, 'rounds'>): string[][] {
  let paths: string[][] = [[]];
  for (const r of sc.rounds) paths = paths.flatMap((p) => r.options.map((o) => [...p, o.id]));
  return paths;
}

/** Every period of a run, history first. */
export function periods(run: Run): PeriodResult[] {
  return [...run.history, ...run.rounds.map((r) => r.result)];
}

/* ------------------------------------------------------------------ */
/* Measures over a run, and the scorecards                             */
/* ------------------------------------------------------------------ */

/** A goal's metric over the decision rounds: final, change (from the last period before the first round), min, max, sum or avg. */
export function metricValue(run: Run, metric: string): number | null {
  const [how, id] = metric.split(':') as [string, KpiId];
  const series = run.rounds.map((r) => r.result.kpis[id]);
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

export interface GoalResult {
  goal: GoalDef;
  value: number | null;
  met: boolean;
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

export function scorecard(sc: ScenarioCore, run: Run, role: RoleId): GoalResult[] {
  return sc.roles[role].goals.map((goal) => {
    const value = metricValue(run, goal.metric);
    return { goal, value, met: goalMet(value, goal) };
  });
}

/* ------------------------------------------------------------------ */
/* All paths compared                                                  */
/* ------------------------------------------------------------------ */

export interface PathSummary {
  picks: string[];
  /** Final-round KPIs. */
  final: Kpis;
  /** Profit for the period added over the rounds. */
  cumProfit: number;
  /** Goals met for each role. */
  goals: Record<RoleId, number>;
  /** The event variant ids along the path. */
  events: string[];
}

export interface PathEnvelope {
  count: number;
  summaries: PathSummary[];
  /** For each role, how many paths meet every one of its goals. */
  allGoals: Record<RoleId, number>;
  /** Paths that meet every goal of every role. */
  everyone: number;
}

/** Run every path and summarize it: the debrief compares the learner's path with all the others. */
export function envelope(sc: ScenarioCore): PathEnvelope {
  const summaries = allPaths(sc).map((picks) => {
    const run = runPath(sc, picks);
    const last = run.rounds[run.rounds.length - 1]?.result;
    if (!last) throw new Error('A complete path produced no final round');
    const goals = Object.fromEntries(ROLE_IDS.map((r) => [r, scorecard(sc, run, r).filter((g) => g.met).length])) as Record<RoleId, number>;
    return {
      picks,
      final: last.kpis,
      cumProfit: run.rounds.reduce((a, r) => a + r.result.kpis.profit, 0),
      goals,
      events: run.rounds.map((r) => r.event?.id).filter((x): x is string => Boolean(x)),
    };
  });
  const allGoals = Object.fromEntries(ROLE_IDS.map((r) => [r, summaries.filter((s) => s.goals[r] === sc.roles[r].goals.length).length])) as Record<RoleId, number>;
  const everyone = summaries.filter((s) => ROLE_IDS.every((r) => s.goals[r] === sc.roles[r].goals.length)).length;
  return { count: summaries.length, summaries, allGoals, everyone };
}

/** Where a value sits among all paths: its rank (1 = best) given which way is better. */
export function rankAmong(values: number[], value: number, better: 'higher' | 'lower'): number {
  const sorted = [...values].sort((a, b) => (better === 'higher' ? b - a : a - b));
  const at = sorted.findIndex((v) => (better === 'higher' ? v <= value + 1e-9 : v >= value - 1e-9));
  return at < 0 ? sorted.length : at + 1;
}

/* ------------------------------------------------------------------ */
/* The board pack: statements built from the history                   */
/* ------------------------------------------------------------------ */

/** Sum the flows of a statement of profit or loss over several periods (for a year built from quarters). */
export function sumPl(results: PeriodResult[]): PeriodResult['pl'] {
  const keys = ['revenue', 'materials', 'energy', 'other', 'channelExtras', 'costOfSales', 'grossProfit', 'wages', 'overtime', 'bonus', 'overheads', 'marketing', 'maintenance', 'depreciation', 'training', 'recruitment', 'redundancy', 'factoring', 'badDebts', 'otherIncome', 'gain', 'expenses', 'pbit', 'interest', 'pbt', 'tax', 'profit', 'dividends', 'retained'] as const;
  const out = Object.fromEntries(keys.map((k) => [k, results.reduce((a, r) => a + r.pl[k], 0)])) as Omit<PeriodResult['pl'], 'oneOffs'>;
  return { ...out, oneOffs: results.flatMap((r) => r.pl.oneOffs) };
}

/** The periods that make up each year of the history, most recent last (a year = model.period.perYear periods). */
export function historyYears(sc: Pick<Scenario, 'model'>, history: PeriodResult[]): PeriodResult[][] {
  const n = sc.model.period.perYear;
  const years: PeriodResult[][] = [];
  for (let end = history.length; end - n >= 0; end -= n) years.unshift(history.slice(end - n, end));
  return years;
}
