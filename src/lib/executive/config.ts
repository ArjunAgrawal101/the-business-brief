/**
 * What the simulation page hands to the browser: the engine's inputs, the
 * roles, the questions' keys and feedback (with their tokens already filled
 * from the history), the strategies' plans and the precomputed comparison.
 * Built once at build time; src/scripts/executive.ts reads exactly this.
 */
import type { KpiId } from './engine';
import { inline, rich } from '../markup';
import type { NarrateContext, Derived } from './narrate';
import type { PlanRow } from './render';
import type { Executive, FigureDef, GoalDef, Levers } from './schema';
import { ANALYSIS_STAGES, ROLE_IDS, ROLE_TITLES, STAGE_IDS, type AnalysisStage, type RoleId, type StageId } from './roles';
import { figureValue, type SimCore } from './sim';
import type { ExecView } from './view';
import { questionsOf } from './integrity';

export interface QuestionKey {
  stage: StageId;
  kind: 'choice' | 'number';
  /** Choice: the right option, and each option's feedback as HTML. */
  correct?: string;
  options?: Record<string, { text: string; feedback: string }>;
  /** Number: the engine's answer and the tolerance. */
  answer?: number;
  tolerance?: number;
  unit?: 'percent' | 'money' | 'units' | 'points';
}

export interface ExecConfig {
  id: string;
  title: string;
  href: string;
  company: string;
  core: Pick<SimCore, 'model' | 'start' | 'history' | 'plan' | 'rules'>;
  ctx: NarrateContext;
  dashboard: KpiId[];
  derived: Derived;
  roles: Record<RoleId, { title: string; brief: string; priorities: string[]; pinned: KpiId[]; goals: GoalDef[]; lens: Record<AnalysisStage, string> }>;
  stages: Array<{ id: StageId; title: string }>;
  questions: Record<string, QuestionKey>;
  evaluation: { id: string; prompt: string; working: string; answer: FigureDef; tolerance: number; unit: 'percent' | 'money' | 'units' | 'points' };
  evidence: { min: number; items: Array<{ id: string; title: string; verdict: 'cause' | 'partial' | 'not' }> };
  strategies: Array<{ id: string; label: string; fit: 'strong' | 'conditional' | 'weak'; plan: Levers[] }>;
  /** Each plan year's news, filled (the world is the same on every plan). */
  news: Record<string, { title: string; html: string }>;
  /** The strategies' plans and carrying on as in the last history year, summarized by the engine. */
  compare: PlanRow[];
  reflections: Array<{ id: string; label: string; hint: string }>;
}

export function buildConfig(id: string, sc: Executive, view: ExecView, href: string): ExecConfig {
  const questions: Record<string, QuestionKey> = {};
  for (const { stage, q } of questionsOf(sc)) {
    if (stage === 'evaluate') continue;
    if (q.kind === 'choice') {
      questions[q.id] = {
        stage: stage as StageId,
        kind: 'choice',
        correct: q.options.find((o) => o.correct)?.id,
        options: Object.fromEntries(q.options.map((o) => [o.id, { text: inline(view.fill(o.text)), feedback: inline(view.fill(o.feedback)) }])),
      };
    } else {
      const answer = figureValue(q.answer, view.history);
      if (answer === null) throw new Error(`Question ${q.id} has no answer in the history`);
      questions[q.id] = { stage: stage as StageId, kind: 'number', answer, tolerance: q.tolerance, unit: q.unit };
    }
  }
  const ev = sc.stages.evaluate.question;
  if (ev.kind !== 'number') throw new Error('The evaluation question must be a number question');
  return {
    id,
    title: `${sc.company.name}: the executive simulation`,
    href,
    company: sc.company.name,
    core: { model: sc.model, start: sc.start, history: sc.history, plan: sc.plan, rules: sc.rules },
    ctx: view.ctx,
    dashboard: sc.dashboard as KpiId[],
    derived: view.derived,
    roles: Object.fromEntries(
      ROLE_IDS.map((r) => {
        const role = sc.roles[r];
        return [
          r,
          {
            title: ROLE_TITLES[r],
            brief: rich(view.fill(role.brief)),
            priorities: role.priorities.map((p) => inline(view.fill(p))),
            pinned: role.pinned as KpiId[],
            goals: role.goals,
            lens: Object.fromEntries(ANALYSIS_STAGES.map((st) => [st, inline(view.fill(role.lens[st]))])) as Record<AnalysisStage, string>,
          },
        ];
      }),
    ) as ExecConfig['roles'],
    stages: STAGE_IDS.map((s) => ({ id: s, title: sc.stages[s].title })),
    questions,
    evaluation: { id: ev.id, prompt: ev.prompt, working: ev.working, answer: ev.answer, tolerance: ev.tolerance, unit: ev.unit },
    evidence: { min: sc.stages.causes.min, items: sc.stages.causes.evidence.map((e) => ({ id: e.id, title: e.title, verdict: e.verdict })) },
    strategies: sc.strategies.map((s) => ({ id: s.id, label: s.label, fit: s.fit, plan: s.plan })),
    news: Object.fromEntries(sc.plan.filter((p) => p.news).map((p) => [p.label, { title: p.news?.title ?? '', html: rich(view.fillNews(p.news?.text ?? '')) }])),
    compare: view.compareRows,
    reflections: sc.stages.evaluate.reflections,
  };
}
