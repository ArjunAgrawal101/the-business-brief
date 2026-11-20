/**
 * The checks a curated comparison must pass before any page is built (run by
 * src/lib/compare/content.ts and by tests/unit/framework-compare.test.ts):
 * its address names its sides; every framework, toolkit tool, subtopic,
 * glossary term and source it names exists; every syllabus statement it rests
 * on is found in the curriculum file; each side's level agrees with the
 * statements, the toolkit and the library; no two comparisons cover the same
 * ideas; and none repeats the library's own page on PESTLE against STEEPLE.
 */
import type { Framework } from '../framework-schema';
import type { Comparison, Side } from './schema';

export interface Statement {
  code: string;
  title: string;
  page: number;
  text: string;
  ao: string[];
  /** The statement is HL only: it is marked HL, or its subtopic is. */
  hl: boolean;
}

export interface CompareContext {
  statements: Statement[];
  subtopics: Map<string, { title: string; level: string; page: number }>;
  tools: Record<string, { name: string; level: string; status: string }>;
  frameworks: Record<string, Framework>;
  glossary: Set<string>;
  sources: Set<string>;
}

export interface Problem {
  where: string;
  message: string;
}

/** The library's own page that compares PESTLE with STEEPLE; a curated comparison must not repeat it. */
export const PESTLE_PAGE = 'pestle';

/** The statements a side rests on, matched by subtopic and words; undefined for a statement that matches none or more than one. */
export function statementsOf(side: Side, ctx: Pick<CompareContext, 'statements'>): Array<Statement | undefined> {
  return side.syllabus.map((s) => {
    const hits = ctx.statements.filter((x) => x.code === s.code && x.text.toLowerCase().includes(s.statement.toLowerCase()));
    return hits.length === 1 ? hits[0] : undefined;
  });
}

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*-vs-[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function checkComparisons(all: Record<string, Comparison>, ctx: CompareContext): Problem[] {
  const out: Problem[] = [];
  const seen = new Map<string, string>();
  for (const [slug, c] of Object.entries(all)) {
    const at = (m: string) => out.push({ where: `comparisons/${slug}`, message: m });
    if (!SLUG.test(slug)) at('the address must name the sides joined by "-vs-"');
    c.sources.forEach((s) => !ctx.sources.has(s) && at(`unknown source ${s}`));
    c.choose.forEach((x, i) => x.use >= c.sides.length && at(`choose[${i}] names a side that does not exist`));
    if (new Set(c.choose.map((x) => x.use)).size < 2) at('"which to use when" must call for more than one side');
    const key = c.sides.map((s) => s.framework ?? s.tool ?? s.name.toLowerCase()).sort().join('|');
    if (seen.has(key)) at(`covers the same ideas as ${seen.get(key)}`);
    seen.set(key, slug);
    const fws = c.sides.map((s) => s.framework).filter(Boolean);
    if (fws.includes(PESTLE_PAGE) && fws.includes('steeple-analysis')) at('the library already compares PESTLE with STEEPLE on its own page; link to it instead');
    if (new Set(c.sides.map((s) => s.name)).size !== c.sides.length) at('two sides have the same name');
    c.sides.forEach((s, i) => {
      const where = `side ${i + 1} (${s.name})`;
      const f = s.framework ? ctx.frameworks[s.framework] : undefined;
      if (s.framework && !f) at(`${where}: no framework ${s.framework} in the library`);
      const tool = s.tool ? ctx.tools[s.tool] : undefined;
      if (s.tool && !tool) at(`${where}: no toolkit tool ${s.tool}`);
      if (tool && tool.level !== s.level) at(`${where}: the toolkit gives ${s.tool} as ${tool.level}, not ${s.level}`);
      if (f && f.status !== 'enrichment' && f.level !== s.level) at(`${where}: the library gives ${s.framework} as ${f.level}, not ${s.level}`);
      if (f?.status === 'toolkit' && f.tool !== s.tool) at(`${where}: ${s.framework} is a toolkit tool, so the side must name it (tool: ${f.tool})`);
      const st = statementsOf(s, ctx);
      st.forEach((x, j) => !x && at(`${where}: no single statement in ${s.syllabus[j]!.code} reads "${s.syllabus[j]!.statement}"`));
      const found = st.filter((x): x is Statement => Boolean(x));
      if (found.length && !tool) {
        const hl = found.every((x) => x.hl);
        if ((s.level === 'HL') !== hl) at(`${where}: the statements make it ${hl ? 'HL only' : 'SL and HL'}, but the side says ${s.level}`);
      }
      if (!s.framework && !s.tool && !s.syllabus.length) at(`${where}: a side must be a framework, a toolkit tool or a syllabus statement`);
      s.subtopics.forEach((code) => !ctx.subtopics.has(code) && at(`${where}: unknown subtopic ${code}`));
      s.terms.forEach((t) => !ctx.glossary.has(t) && at(`${where}: unknown glossary term ${t}`));
      if (s.strengths.length < 2 || s.limitations.length < 2 || s.mistakes.length < 2) at(`${where}: incomplete`);
    });
  }
  return out;
}
