/**
 * What the dashboard adds to the workspace's rules (src/lib/workspace.ts),
 * kept apart so the pages that carry a Save button, which load the
 * workspace's rules for "Add a note", do not load the progress and planner
 * rules too:
 * - the course's rows count a subtopic as practised when the question bank,
 *   Paper 2 calculation practice or the flashcards hold results on it;
 * - an imported copy cleans the revision plan (bb:planner) and study mode's
 *   settings (bb:study) through their own readers.
 */
import type { DashboardView } from './dashboard';
import type { ImportCheck } from './learner';
import { PLANNER_KEY, parsePlanner } from './planner';
import { resultsByCode } from './progress';
import { STUDY_KEY, parseStudy } from './study';
import { checkImport, workspaceView, type WorkspaceConfig, type WorkspaceView } from './workspace';

/**
 * A subtopic with results in the question bank, Paper 2 calculation practice
 * or the flashcards is practised too: those records are read by
 * src/lib/progress.ts, so the course's rows, its units and the counts are
 * brought into line with them.
 */
export function withResults<T extends DashboardView>(dash: T, items: Readonly<Record<string, string>>, cfg: WorkspaceConfig): T {
  const results = resultsByCode(items, { bank: cfg.bank, questions: cfg.questions, exercises: cfg.exercises, retrieval: cfg.retrieval, p2: cfg.p2 }, dash.log);
  if (!results.size) return dash;
  const rows = dash.course.rows.map((r) => (results.get(r.code)?.n && r.status !== 'practised' ? { ...r, status: 'practised' as const } : r));
  const status = new Map(rows.map((r) => [r.code, r.status]));
  const units = dash.course.units.map((u) => {
    const codes = cfg.subtopics.filter((s) => s.unit === u.number).map((s) => s.code);
    return { ...u, explored: codes.filter((c) => status.get(c) !== 'none').length, practised: codes.filter((c) => status.get(c) === 'practised').length };
  });
  const complete = new Set(cfg.subtopics.filter((s) => s.state === 'complete').map((s) => s.code));
  const explored = rows.filter((r) => r.status !== 'none');
  return {
    ...dash,
    course: { rows, units },
    figures: { ...dash.figures, explored: explored.length, practised: rows.filter((r) => r.status === 'practised').length, completeExplored: explored.filter((r) => complete.has(r.code)).length },
  };
}

/** The workspace's view, with the practice records counted. */
export function dashboardWorkspaceView(items: Readonly<Record<string, string>>, cfg: WorkspaceConfig): WorkspaceView {
  return withResults(workspaceView(items, cfg), items, cfg);
}

/** The workspace's import check, with the revision plan and study mode's settings cleaned too. */
export function checkDashboardImport(text: string): ImportCheck {
  const r = checkImport(text);
  if (!r.ok) return r;
  return {
    ...r,
    items: r.items.map(({ key, value }) => {
      if (key === PLANNER_KEY) return { key, value: JSON.stringify(parsePlanner(value)) };
      if (key === STUDY_KEY) return { key, value: JSON.stringify(parseStudy(value)) };
      return { key, value };
    }),
  };
}
