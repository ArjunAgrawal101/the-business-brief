/**
 * What the executive simulation's pages show, worked out once at build time
 * from the engine: the history's statements, the derived figures, the worked
 * example, every strategy's plan run and summarized, and fillers for the
 * tokens in the content. Pure: no Astro, no page code.
 */
import { originState, type State, type YearResult } from './engine';
import { fillTokens, narrateContext, type Derived, type NarrateContext } from './narrate';
import { openingColumn, plColumn, positionColumn, cashColumn, type PlanRow, type StatementColumn } from './render';
import { attribution, baselinePlan, derived, runPlan, summarize, type Attribution, type PlanSummary, type Run } from './sim';
import type { Executive, Levers, StrategyDef } from './schema';

export interface StrategyRun {
  s: StrategyDef;
  run: Run;
  summary: PlanSummary;
  /** Fill a text's tokens from this strategy's run. */
  fill: (t: string) => string;
}

export interface ExecView {
  ctx: NarrateContext;
  opening: State;
  history: YearResult[];
  last: YearResult;
  derived: Derived;
  /** Fill a text's tokens from the history (a bare {{kpi}} is the last history year). */
  fill: (t: string) => string;
  /** Fill a plan year's news from any run: the world is the same on every plan. */
  fillNews: (t: string) => string;
  statements: { pl: StatementColumn[]; position: StatementColumn[]; cash: StatementColumn[] };
  strategies: StrategyRun[];
  baseline: { run: Run; summary: PlanSummary };
  walk: StrategyRun;
  walkAttribution: Attribution[];
  /** The rows of the debrief's comparison: the strategies and carrying on as before. */
  compareRows: PlanRow[];
}

export const BASELINE_LABEL = 'Carry on as in 2026';

export function executiveView(sc: Executive): ExecView {
  const ctx = narrateContext(sc);
  const base = runPlan(sc, baselinePlan(sc));
  const history = base.history;
  const last = history[history.length - 1];
  if (!last) throw new Error('The executive simulation needs history');
  const d = derived(sc);
  const fill = (t: string) => fillTokens(t, { years: history, focus: last, derived: d }, ctx);
  const runFill = (run: Run) => {
    const years = [...run.history, ...run.years];
    const focus = years[years.length - 1] ?? last;
    return (t: string) => fillTokens(t, { years, focus, derived: d }, ctx);
  };
  const strategies: StrategyRun[] = sc.strategies.map((s) => {
    const run = runPlan(sc, s.plan);
    return { s, run, summary: summarize(sc, run), fill: runFill(run) };
  });
  const walk = strategies.find((x) => x.s.id === sc.walkthrough.strategy);
  if (!walk) throw new Error(`No strategy ${sc.walkthrough.strategy} for the worked example`);
  const years = sc.plan.map((p) => p.label);
  const baseline = { run: base, summary: summarize(sc, base) };
  return {
    ctx,
    opening: originState(sc.model, sc.start),
    history,
    last,
    derived: d,
    fill,
    fillNews: runFill(base),
    statements: {
      pl: history.map(plColumn),
      position: [openingColumn(originState(sc.model, sc.start)), ...history.map((y) => positionColumn(y))],
      cash: history.map(cashColumn),
    },
    strategies,
    baseline,
    walk,
    walkAttribution: attribution(sc, walk.s.plan),
    compareRows: [...strategies.map((x) => ({ label: x.s.label, summary: x.summary, years })), { label: BASELINE_LABEL, summary: baseline.summary, years }],
  };
}

/** A plan's years with their labels, for the plan table. */
export const labelled = (sc: Pick<Executive, 'plan'>, plan: Levers[]) => plan.map((levers, k) => ({ label: sc.plan[k]?.label ?? String(k + 1), levers }));
