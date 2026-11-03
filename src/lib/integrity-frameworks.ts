/**
 * Integrity checks for the glossary's dictionary fields and the frameworks
 * library. A term beyond the IB course must say so and be complete; every
 * framework must name its standing honestly (a syllabus framework its
 * subtopic and the guide's page, a toolkit tool its guide, enrichment no IB
 * qualification), and every reference must resolve.
 *
 * The glossary checks that need no frameworks run with the main corpus
 * (src/lib/integrity-learning.ts); the rest run when the library loads
 * (src/lib/frameworks-content.ts) and in tests/unit/frameworks.test.ts.
 */
import type { Corpus, Problem } from './integrity';
import type { Framework } from './framework-schema';
import { DIAGRAMS } from './diagrams';
import { resolveRef } from './frameworks';

const has = <T>(d: Record<string, T>, id: string) => Object.prototype.hasOwnProperty.call(d, id);

function subtopicLevels(c: Corpus): Map<string, string> {
  const out = new Map<string, string>();
  for (const cur of Object.values(c.curricula)) for (const u of cur.units) for (const s of u.subtopics) out.set(s.code, s.level);
  return out;
}

/**
 * The glossary's dictionary fields. With `frameworks`, also checks that each
 * term's framework references resolve to a framework, a tool or a diagram.
 */
export function checkGlossaryDepth(c: Corpus, frameworks?: Record<string, Framework>): Problem[] {
  const out: Problem[] = [];
  for (const [id, g] of Object.entries(c.glossary)) {
    const add = (message: string) => out.push({ where: `glossary/${id}`, message });
    if (g.provenance === 'enrichment') {
      if (g.subtopics.length) add('an enrichment term is beyond the IB course, so it names no IB subtopic');
      if (!g.qualifications.length) add('an enrichment term must say who meets it (qualifications)');
      if (g.qualifications.includes('ib')) add('an enrichment term cannot carry the "ib" qualification');
      if (!g.simple) add('an enrichment term needs a plain-language explanation (simple)');
      if (!g.technical) add('an enrichment term needs a technical explanation');
      if (!g.example) add('an enrichment term needs an example');
      if (!g.misconceptions.length) add('an enrichment term needs at least one common misconception');
      if (g.related.length < 2) add('an enrichment term needs at least two related terms');
    } else if (g.qualifications.length && !g.qualifications.includes('ib')) {
      add('a term in the IB course must include the "ib" qualification when it lists qualifications');
    }
    if (g.misconceptions.some((m) => m.claim.trim() === m.correction.trim())) add('a misconception repeats its claim as its correction');
    const dupes = g.frameworks.filter((x, i) => g.frameworks.indexOf(x) !== i);
    dupes.forEach((x) => add(`framework reference "${x}" is listed twice`));
    if (frameworks) {
      for (const ref of g.frameworks) {
        if (!resolveRef(ref, { frameworks, tools: c.tools, diagrams: DIAGRAMS })) add(`framework reference "${ref}" is not a framework, a toolkit tool or a diagram`);
      }
    }
  }
  return out;
}

/** The frameworks library against the corpus. */
export function checkFrameworks(frameworks: Record<string, Framework>, c: Corpus): Problem[] {
  const out: Problem[] = [];
  const levels = subtopicLevels(c);
  const names = new Map<string, string>();
  for (const [id, f] of Object.entries(frameworks)) {
    const add = (message: string) => out.push({ where: `frameworks/${id}`, message });
    if (!DIAGRAMS[f.diagram]) add(`diagram "${f.diagram}" is not in the library`);
    f.subtopics.forEach((code) => levels.has(code) || add(`subtopic "${code}" is not in the IB course`));
    f.terms.forEach((t) => has(c.glossary, t) || add(`glossary term "${t}" does not exist`));
    f.related.forEach((r) => {
      if (r === id) add('lists itself as related');
      else if (!has(frameworks, r)) add(`related framework "${r}" does not exist`);
    });
    f.sources.forEach((s) => has(c.sources, s) || add(`source "${s}" is not in the sources register`));
    for (const n of [f.name, ...f.aliases]) {
      const k = n.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const prev = names.get(k);
      if (prev && prev !== id) add(`"${n}" is also the name of ${prev}`);
      names.set(k, id);
    }
    if (f.status === 'syllabus') {
      if (!f.guidePages) add('a syllabus framework gives the guide page that names it');
      if (!f.subtopics.length) add('a syllabus framework names the subtopic it belongs to');
      if (!f.qualifications.includes('ib')) add('a syllabus framework carries the "ib" qualification');
      if (!f.sources.includes('ib-bm-guide-2024')) add('a syllabus framework cites the guide (ib-bm-guide-2024)');
      const subLevels = f.subtopics.map((s) => levels.get(s));
      if (subLevels.length && subLevels.every((l) => l === 'HL') && f.level !== 'HL') add('every subtopic it belongs to is HL only, so it must be marked HL');
    }
    if (f.status === 'toolkit') {
      if (!f.tool) add('a toolkit framework names its tool, whose guide holds the full treatment');
      else {
        const t = c.tools[f.tool];
        if (!t) add(`tool "${f.tool}" does not exist`);
        else {
          if (t.ibStatus !== 'ib-toolkit') add(`tool "${f.tool}" is not in the IB toolkit`);
          if (t.level !== f.level) add(`level ${f.level} differs from the tool's level, ${t.level}`);
        }
      }
      if (!f.guidePages) add('a toolkit framework gives the guide page that lists the tool');
      if (!f.qualifications.includes('ib')) add('a toolkit framework carries the "ib" qualification');
      if (!f.sources.includes('ib-bm-guide-2024')) add('a toolkit framework cites the guide (ib-bm-guide-2024)');
    }
    if (f.status === 'enrichment') {
      if (f.qualifications.includes('ib')) add('an enrichment framework cannot carry the "ib" qualification');
      if (f.guidePages) add('an enrichment framework is not in the guide, so it gives no guide page');
      if (f.level !== 'SL/HL') add('an enrichment framework has no IB level: leave it SL/HL');
      if (f.tool) add('an enrichment framework is not a toolkit tool');
    }
  }
  return out;
}
