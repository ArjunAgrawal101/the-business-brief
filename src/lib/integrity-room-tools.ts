/**
 * Integrity checks for the People and Culture and Operations Floor tools:
 * every tool lives at the address its guide gives, keeps its work under its
 * own room's storage prefix, names real subtopics, interactions, cases,
 * Decision Rooms and toolkit tools, and its worked example passes the same
 * checks as the reader's own input. Called from checkIntegrity.
 */
import type { Corpus, Problem } from './integrity';
import { delayerLevels, orgModel, validateOrg } from './org-chart';
import { validatePeriod } from './productivity';
import { validatePlan } from './stock-sim';
import { validateEoq } from './eoq';
import { validateTurnover, validateWorkforce } from './workforce';
import { validateMatrix } from './location-tool';
import { ROOM_INFO, isRoomTool, toolHref } from './room-tools';

export function checkRoomTools(c: Corpus): Problem[] {
  const out: Problem[] = [];
  const codes = new Set(Object.values(c.curricula).flatMap((cu) => cu.units.flatMap((u) => u.subtopics.map((s) => s.code))));
  const slugs = new Map<string, string>();
  const orders = new Map<string, string>();
  const keys = new Map<string, string>();
  for (const [id, it] of Object.entries(c.interactives)) {
    if (!isRoomTool(it)) continue;
    const w = `interactives/${id}`;
    const add = (message: string) => out.push({ where: w, message });
    const g = it.guide;
    const room = ROOM_INFO[g.room];
    if (it.page !== toolHref(it)) add(`page must be ${toolHref(it)}, the address its guide gives`);
    if (!g.storageKey.startsWith(`${room.prefix}:`)) add(`the storage key must start with "${room.prefix}:" for ${room.name}`);
    const slugKey = `${g.room}/${g.slug}`;
    if (slugs.has(slugKey)) add(`the address ${toolHref(it)} is also used by ${slugs.get(slugKey)}`);
    slugs.set(slugKey, id);
    const orderKey = `${g.room}/${g.order}`;
    if (orders.has(orderKey)) add(`order ${g.order} in ${room.name} is also used by ${orders.get(orderKey)}`);
    orders.set(orderKey, id);
    if (keys.has(g.storageKey)) add(`the storage key ${g.storageKey} is also used by ${keys.get(g.storageKey)}`);
    keys.set(g.storageKey, id);
    if (g.status !== 'enrichment' && it.syllabus.length === 0) add('a tool in the syllabus must name the subtopics it serves');
    g.related.subtopics.forEach((x) => codes.has(x) || add(`related subtopic ${x} is not in the curriculum`));
    g.related.interactives.forEach((x) => {
      const r = c.interactives[x];
      if (!r) add(`related interaction "${x}" does not exist`);
      else if (!r.page) add(`related interaction "${x}" has no page to link to`);
    });
    g.related.cases.forEach((x) => c.cases[x] || add(`related case "${x}" does not exist`));
    g.related.decisions.forEach((x) => c.decisions[x] || add(`related Decision Room "${x}" does not exist`));
    g.related.tools.forEach((x) => c.tools[x] || add(`related toolkit tool "${x}" does not exist`));

    if (it.component === 'org-chart-builder') {
      const posts = it.posts.map((p) => ({ id: p.id, title: p.title, reportsTo: p.reportsTo ?? null, count: p.count, grouping: p.grouping ?? null }));
      const problems = validateOrg(posts);
      problems.forEach((p) => add(`the chart${p.id ? `, post "${p.id}"` : ''}: ${p.message}`));
      if (!problems.length && it.delayer !== undefined) {
        const m = orgModel(posts);
        if (!delayerLevels(m).some((l) => l.level === it.delayer)) add(`level ${it.delayer} has no managers to remove`);
      }
    }

    if (it.component === 'capacity-calculator') {
      it.periods.forEach((p) => validatePeriod(p.values).forEach((x) => add(`${p.name}: ${x.field}: ${x.message}`)));
      if (it.periods[0]?.name === it.periods[1]?.name) add('the two periods need different names');
    }

    if (it.component === 'stock-simulator') {
      validatePlan({ ...it.plan, ...it.costs, demand: it.demand, late: it.late ?? null }).forEach((x) => add(`the plan: ${x.field}: ${x.message}`));
    }

    if (it.component === 'workforce-planner') {
      validateTurnover(it.lastYear).forEach((x) => add(`last year: ${x.field}: ${x.message}`));
      validateWorkforce({ ...it.plan, recruitLimit: it.plan.recruitLimit ?? 'none' }).forEach((x) => add(`the plan: ${x.field}${x.year !== undefined ? ` (year ${x.year + 1})` : ''}: ${x.message}`));
      if (it.plan.staffNow !== it.lastYear.end) add('staff now should equal the staff at the end of last year');
    }

    if (it.component === 'location-assessment') {
      const ids = it.factors.map((f) => f.id);
      if (new Set(ids).size !== ids.length) add('two factors share an id');
      if (new Set(it.sites.map((x) => x.id)).size !== it.sites.length) add('two sites share an id');
      it.sites.forEach((x) => Object.keys(x.scores).forEach((k) => ids.includes(k) || add(`${x.name} has a score for "${k}", which is not a factor`)));
      validateMatrix({ factors: it.factors, sites: it.sites, maxScore: it.maxScore, maxWeight: it.maxWeight, lowThreshold: it.lowThreshold }).forEach((x) => add(`${x.site ?? x.factor ?? 'the matrix'}: ${x.message}`));
    }

    if (it.component === 'eoq-calculator') {
      if (it.guide.status !== 'enrichment' || it.provenance !== 'enrichment') add('the economic order quantity is beyond the syllabus, so it must be labelled enrichment');
      validateEoq({ ...it.inputs, minQty: it.discount?.minQty ?? null, discountPrice: it.discount?.price ?? null }, Boolean(it.discount)).forEach((x) => add(`${x.field}: ${x.message}`));
    }
  }
  return out;
}
