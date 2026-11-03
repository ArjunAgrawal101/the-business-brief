/**
 * Integrity checks for the audience pathways and the enrichment maps.
 *
 * Enrichment maps are management ideas beyond the IB course. They live in a
 * collection of their own, so the coverage figures, the IB map index and the
 * Resources Library never see them; these checks hold them to the same bar as
 * an IB map (enough nodes to revise from, an essential in every branch, real
 * glossary terms and sources) and stop them carrying an IB level.
 *
 * The pathways are checked against the honesty rules their pages promise: the
 * secondary route uses only SL material and claims no syllabus, only the IB DP
 * route maps to the IB syllabus, links marked HL are the ones that lead to HL
 * material, enrichment stays off the qualification routes, and every
 * practice answer can be worked by the platform's own calculation functions.
 */
import type { Corpus, Problem } from './integrity';
import type { Pathway } from './schemas';
import { walk } from './integrity-learning';
import { isHlTarget, partWorking, resolveTarget } from './pathways';
import { workings } from './finance';

const has = <T>(d: Record<string, T>, id: string) => Object.prototype.hasOwnProperty.call(d, id);

/** Every subtopic code in the IB curriculum. */
const ibCodes = (c: Corpus) => new Set((c.curricula['ib-dp-bm']?.units ?? []).flatMap((u) => u.subtopics.map((s) => s.code)));

export function checkEnrichmentMaps(c: Corpus): Problem[] {
  const out: Problem[] = [];
  const codes = ibCodes(c);
  for (const [id, m] of Object.entries(c.enrichmentMaps ?? {})) {
    const add = (message: string) => out.push({ where: `enrichment-maps/${id}`, message });
    if (has(c.mindmaps, id)) add('has the same id as an IB map; enrichment maps must stay apart from the IB maps');
    m.builds.forEach((b) => codes.has(b.code) || add(`builds on "${b.code}", which is not an IB subtopic`));
    m.related.forEach((r) => {
      if (r.map === id) add('lists itself as related');
      else if (!has(c.enrichmentMaps, r.map)) add(`related map "${r.map}" does not exist`);
    });
    m.basis.sources.forEach((s) => has(c.sources, s.source) || add(`basis source "${s.source}" is not in the sources register`));
    let count = 0;
    m.branches.forEach((b, i) => {
      const bw = `branch ${i + 1} ("${b.label}")`;
      if (b.level === 'HL') add(`${bw} is marked HL, but an enrichment map is not part of the IB course`);
      if (b.children.length < 2) add(`${bw} has fewer than two nodes`);
      if (!b.children.some((n) => n.core)) add(`${bw} has nothing in the revision view: mark its essentials core: true`);
      walk(b.children, (n) => {
        count += 1;
        if (n.level === 'HL') add(`${bw}: node "${n.label}" is marked HL, but an enrichment map is not part of the IB course`);
        if (n.term && !has(c.glossary, n.term)) add(`${bw}: node "${n.label}" names glossary term "${n.term}", which does not exist`);
        if (n.kind === 'formula' && !n.formula) add(`${bw}: formula node "${n.label}" has no formula`);
      });
    });
    if (count < 16) add(`only ${count} nodes: an enrichment map needs at least as much detail as an IB subtopic map (16)`);
  }
  return out;
}

/** Pathways that may show maps beyond the IB course. The qualification routes (IB DP, secondary) and the teachers' route may not. */
const ENRICHMENT_ALLOWED = new Set(['undergraduate', 'mba', 'entrepreneurs', 'independent']);

export function checkPathways(list: Array<[string, Pathway]>, c: Corpus): Problem[] {
  const out: Problem[] = [];
  const cur = c.curricula['ib-dp-bm'];
  const unitIds = new Set((cur?.units ?? []).map((u) => u.id));
  const codes = ibCodes(c);
  for (const [id, p] of list) {
    const add = (message: string) => out.push({ where: `pathways/${id}`, message });
    const stageIds = p.stages.map((s) => s.id).filter(Boolean);
    stageIds.filter((x, i) => stageIds.indexOf(x) !== i).forEach((x) => add(`stage id "${x}" appears twice`));
    p.stages.forEach((s, si) => {
      const sw = `stage ${si + 1} ("${s.title}")`;
      if (s.syllabus.length && id !== 'ib-dp') add(`${sw} names IB syllabus codes, but only the IB DP route is mapped to the IB syllabus`);
      s.syllabus.forEach((x) => unitIds.has(x) || codes.has(x) || add(`${sw}: "${x}" is not an IB unit or subtopic`));
      s.terms.forEach((t) => {
        const g = c.glossary[t];
        if (!g) add(`${sw}: glossary term "${t}" does not exist`);
        else if (id === 'secondary' && g.level === 'HL') add(`${sw}: "${t}" is an HL-only term, and the secondary route uses SL material only`);
      });
      if (!s.items.length && !s.syllabus.length) add(`${sw} has nothing to work through`);
      s.items.forEach((it) => {
        const iw = `${sw}: "${it.label}"`;
        if (!it.href.endsWith('/') && !it.href.includes('#')) add(`${iw}: internal links end with a slash`);
        const t = resolveTarget(it.href, c);
        if (t.kind === 'unknown-topic') add(`${iw}: /topics/${t.slug}/ is not a subtopic page`);
        if ('exists' in t && !t.exists) add(`${iw}: ${it.href} does not lead to existing content`);
        if (t.kind === 'subtopic' && it.href.includes('#') && !t.section) {
          const frag = it.href.split('#')[1] ?? '';
          if (!/^(ix-|calc-|nv-|sh-|map$|terms$|diagrams$)/.test(frag)) add(`${iw}: #${frag} is not a section of the notes for ${t.code}`);
        }
        const hl = isHlTarget(t);
        if (hl && it.level !== 'HL') add(`${iw} leads to HL-only material, so it must be marked level: HL`);
        if (!hl && it.level === 'HL' && t.kind !== 'page') add(`${iw} is marked HL, but what it leads to is not HL only`);
        if (id === 'secondary' && (hl || it.level === 'HL')) add(`${iw}: the secondary route uses SL material only`);
        if (t.kind === 'enrichment-map' && !ENRICHMENT_ALLOWED.has(id)) add(`${iw}: enrichment maps are kept off the ${id} route`);
        if (it.kind === 'Enrichment map' && t.kind !== 'enrichment-map') add(`${iw} is labelled an enrichment map but does not lead to one`);
        if (it.kind === 'Notes' && t.kind !== 'subtopic') add(`${iw} is labelled notes but does not lead to a subtopic page`);
        if (it.kind === 'Notes' && t.kind === 'subtopic' && !Object.values(c.notes).some((n) => n.code === t.code)) add(`${iw}: ${t.code} has no notes yet`);
      });
    });
    p.reading.forEach((r) => has(c.sources, r.source) || add(`reading source "${r.source}" is not in the sources register`));
    p.lessons.forEach((l) => {
      if (!codes.has(l.code)) add(`lesson prompts for "${l.code}", which is not a subtopic`);
      else if (!Object.values(c.notes).some((n) => n.code === l.code)) add(`lesson prompts for ${l.code}, which has no notes to build a lesson from`);
    });
    const lessonCodes = p.lessons.map((l) => l.code);
    lessonCodes.filter((x, i) => lessonCodes.indexOf(x) !== i).forEach((x) => add(`lesson prompts for ${x} appear twice`));
    const taskIds = p.practice.map((t) => t.id);
    taskIds.filter((x, i) => taskIds.indexOf(x) !== i).forEach((x) => add(`practice task id "${x}" appears twice`));
    p.practice.forEach((task) => {
      const tw = `practice "${task.id}"`;
      if (task.style === 'data-response' && !task.figures.length && !task.cash) add(`${tw} is a data-response task with no data`);
      task.parts.forEach((part, i) => {
        if (!part.calculation) return;
        if (!workings[part.calculation]) {
          add(`${tw} part ${i + 1}: calculation "${part.calculation}" has no function in src/lib/finance.ts`);
          return;
        }
        try {
          const w = partWorking(task, part);
          if (w?.error) add(`${tw} part ${i + 1}: the working reports: ${w.error}`);
        } catch (err) {
          add(`${tw} part ${i + 1}: the answer cannot be worked: ${(err as Error).message}`);
        }
      });
    });
  }
  return out;
}
