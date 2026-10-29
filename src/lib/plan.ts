/**
 * A project plan scheduled by critical path analysis: a forward pass for the
 * earliest start and finish of each activity, a backward pass for the latest,
 * then total float (latest start minus earliest start) and free float (the
 * earliest start of the next activity minus this one's earliest finish).
 * Activities with no total float are on the critical path. Times are in whole
 * weeks from the start of the plan.
 */

export interface Activity {
  id: string;
  label: string;
  weeks: number;
  /** Activities that must finish before this one can start. */
  after: string[];
}

export interface Scheduled extends Activity {
  es: number;
  ef: number;
  ls: number;
  lf: number;
  totalFloat: number;
  freeFloat: number;
  critical: boolean;
}

export interface Schedule {
  items: Scheduled[];
  finish: number;
  /** The critical path, in order. */
  path: string[];
}

/** The activities in an order where every activity comes after its predecessors; throws on a cycle or an unknown id. */
export function topoOrder(acts: Activity[]): Activity[] {
  const byId = new Map(acts.map((a) => [a.id, a]));
  for (const a of acts) for (const p of a.after) if (!byId.has(p)) throw new Error(`Activity ${a.id} follows unknown activity ${p}`);
  const out: Activity[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (a: Activity) => {
    const s = state.get(a.id);
    if (s === 'done') return;
    if (s === 'visiting') throw new Error(`The plan has a loop through ${a.id}`);
    state.set(a.id, 'visiting');
    a.after.forEach((p) => visit(byId.get(p) as Activity));
    state.set(a.id, 'done');
    out.push(a);
  };
  acts.forEach(visit);
  return out;
}

export function schedule(acts: Activity[]): Schedule {
  const order = topoOrder(acts);
  const es = new Map<string, number>();
  const ef = new Map<string, number>();
  for (const a of order) {
    const start = Math.max(0, ...a.after.map((p) => ef.get(p) ?? 0));
    es.set(a.id, start);
    ef.set(a.id, start + a.weeks);
  }
  const finish = Math.max(0, ...[...ef.values()]);
  const successors = (id: string) => acts.filter((a) => a.after.includes(id));
  const ls = new Map<string, number>();
  const lf = new Map<string, number>();
  for (const a of [...order].reverse()) {
    const next = successors(a.id);
    const late = next.length ? Math.min(...next.map((n) => ls.get(n.id) ?? finish)) : finish;
    lf.set(a.id, late);
    ls.set(a.id, late - a.weeks);
  }
  const items: Scheduled[] = acts.map((a) => {
    const e = es.get(a.id) ?? 0;
    const f = ef.get(a.id) ?? 0;
    const l = ls.get(a.id) ?? 0;
    const next = successors(a.id);
    const freeFloat = (next.length ? Math.min(...next.map((n) => es.get(n.id) ?? finish)) : finish) - f;
    return { ...a, es: e, ef: f, ls: l, lf: lf.get(a.id) ?? 0, totalFloat: l - e, freeFloat, critical: l - e === 0 };
  });
  // Walk the critical path from a critical activity with no critical predecessor.
  const crit = items.filter((i) => i.critical);
  const path: string[] = [];
  let cur = crit.find((i) => i.es === 0 && !i.after.some((p) => crit.some((c) => c.id === p)));
  while (cur) {
    path.push(cur.id);
    const at: Scheduled = cur;
    cur = crit.find((i) => i.after.includes(at.id) && i.es === at.ef);
  }
  return { items, finish, path };
}

/** The same plan with one activity's duration changed. */
export function withDuration(acts: Activity[], id: string, weeks: number): Activity[] {
  return acts.map((a) => (a.id === id ? { ...a, weeks } : a));
}
