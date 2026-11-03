/**
 * Integrity checks for the enrichment maps: management ideas beyond the IB
 * course, for the undergraduate and MBA pathways. They live in a collection of
 * their own, so the coverage figures, the IB map index and the Resources
 * Library never see them; these checks hold them to the same bar as an IB map
 * (enough nodes to revise from, an essential in every branch, real glossary
 * terms and sources) and stop them carrying an IB level.
 */
import type { Corpus, Problem } from './integrity';
import { walk } from './integrity-learning';

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
