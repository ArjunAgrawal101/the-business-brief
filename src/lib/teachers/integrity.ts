/**
 * The checks every classroom activity must pass before any Teacher resource
 * area page is built (and in the unit tests): its case or Decision Room
 * exists, every role is a stakeholder that the case names, every subtopic is
 * in the course, an activity on HL-only material is marked HL, and the lesson
 * fits a double period at most.
 */
import type { Corpus } from '../integrity';
import { activityMinutes, type Activity } from './schema';

export interface Problem {
  where: string;
  message: string;
}

/** The case an activity's roles come from: the case itself, or the Decision Room's case. */
export function activityCase(a: Activity, c: Corpus): string | undefined {
  return a.basis.kind === 'case' ? a.basis.id : c.decisions[a.basis.id]?.case;
}

/** The case's stakeholder a role names: the one whose name starts with the role's words, followed by the end, a comma, a space or a bracket. */
export function stakeholderFor(c: Corpus, caseId: string, name: string) {
  const list = c.cases[caseId]?.stakeholders ?? [];
  return list.filter((s) => s.name === name || (s.name.startsWith(name) && /^[ ,(]/.test(s.name.slice(name.length))));
}

export function checkActivities(list: Record<string, Activity>, c: Corpus): Problem[] {
  const out: Problem[] = [];
  const subs = new Map((c.curricula['ib-dp-bm']?.units ?? []).flatMap((u) => u.subtopics.map((s) => [s.code, s.level] as const)));
  const orders = new Map<number, string>();
  for (const [id, a] of Object.entries(list)) {
    const where = `activities/${id}`;
    const exists = a.basis.kind === 'case' ? Boolean(c.cases[a.basis.id]) : Boolean(c.decisions[a.basis.id]);
    if (!exists) out.push({ where, message: `${a.basis.kind} "${a.basis.id}" does not exist` });
    const caseId = activityCase(a, c);
    if (caseId) {
      if (c.cases[caseId]?.kind !== 'fictional') out.push({ where, message: `the case "${caseId}" is not fictional; activities are built on the platform's fictional cases` });
      for (const r of a.roles) {
        const found = stakeholderFor(c, caseId, r.stakeholder);
        if (found.length !== 1) out.push({ where, message: `role "${r.stakeholder}" must name exactly one stakeholder in ${caseId} (found ${found.length})` });
      }
    }
    for (const code of a.subtopics) if (!subs.has(code)) out.push({ where, message: `unknown subtopic ${code}` });
    const hlOnly = a.subtopics.some((code) => subs.get(code) === 'HL');
    if (hlOnly && a.level !== 'HL') out.push({ where, message: 'it teaches an HL-only subtopic, so it must be marked level: HL' });
    const minutes = activityMinutes(a);
    if (minutes < 30 || minutes > 120) out.push({ where, message: `the phases add up to ${minutes} minutes; a lesson takes 30 to 120` });
    const other = orders.get(a.order);
    if (other) out.push({ where, message: `order ${a.order} is also used by ${other}` });
    orders.set(a.order, id);
  }
  return out;
}
