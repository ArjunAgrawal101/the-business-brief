/**
 * Framework comparisons as HTML: a column per side, a row per question, laid
 * side by side on wide screens and stacked on phones, each cell labelled with
 * its side. The same grid serves the curated pages (built from their YAML)
 * and the comparison tool (from the library's own data, sent to the browser
 * as one JSON file per framework). Pure: no `astro:content`.
 */
import { esc, inline, rich } from '../markup';
import { STATUS_LABELS, frameworkHref, standing } from '../frameworks';
import type { Framework } from '../framework-schema';
import type { Side } from './schema';
import type { Column } from './grid';
import type { Statement } from './integrity';

export { gridHtml, type Column } from './grid';

export interface SubtopicLink {
  code: string;
  title: string;
  href: string;
  hl: boolean;
}

export interface RenderCtx {
  subtopic: (code: string) => SubtopicLink | undefined;
  /** A toolkit tool's name and the address of its guide or entry. */
  tool: (id: string) => { name: string; href: string } | undefined;
  term: (id: string) => { term: string; href: string } | undefined;
}

const list = (items: string[]) => `<ul class="cmp-list">${items.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>`;
const TAG_FICTIONAL = '<span class="tag tag--simulated">Fictional</span>';
const TAG_STRATEGY = '<span class="tag tag--framework">Recommended strategy</span>';

function subtopicLinks(codes: string[], ctx: RenderCtx): string {
  const links = [...new Set(codes)].map((c) => ctx.subtopic(c)).filter((x): x is SubtopicLink => Boolean(x));
  return links.length ? `<p class="cmp-links">${links.map((s) => `<a href="${esc(s.href)}">${esc(`${s.code} ${s.title}`)}</a>${s.hl ? ' <span class="cmp-hl">HL</span>' : ''}`).join(', ')}</p>` : '';
}

/** A curated side's standing in the course, worked out from the curriculum file, the toolkit and the library. */
export function sideStanding(side: Side, statements: Statement[], f: Framework | undefined, ctx: RenderCtx): string {
  const lines: string[] = [];
  const tool = side.tool ? ctx.tool(side.tool) : undefined;
  if (tool) lines.push(`<p><span class="tag tag--ib">IB toolkit</span> One of the tools of the business management toolkit, ${side.level === 'HL' ? 'HL only' : 'SL and HL'}; Business management guide, ${f?.guidePages ? `${f.guidePages.includes(' ') ? 'pp.' : 'p.'} ${esc(f.guidePages)}` : 'pp. 13 to 15'}. <a href="${esc(tool.href)}">The toolkit guide</a>.</p>`);
  for (const s of statements)
    lines.push(`<p><span class="tag tag--ib">IB syllabus</span> ${esc(s.code)} ${esc(s.title)}: ${esc(s.text)} (${esc(s.ao.join(', '))})${s.hl ? ', HL only' : ''}; Business management guide, p. ${s.page}.</p>`);
  if (f && f.status === 'syllabus' && !statements.length) lines.push(`<p><span class="tag tag--ib">IB syllabus</span> ${esc(standing(f))}.</p>`);
  if (f && f.status === 'enrichment') lines.push('<p><span class="tag tag--enrichment">Enrichment</span> Beyond the IB course.</p>');
  if (f) lines.push(`<p class="cmp-fw"><a href="${frameworkHref(side.framework!)}">${esc(f.name)} in the frameworks library</a></p>`);
  return lines.join('') + subtopicLinks([...side.syllabus.map((s) => s.code), ...side.subtopics], ctx);
}

/** A curated side as a column. */
export function curatedColumn(side: Side, index: number, statements: Statement[], f: Framework | undefined, ctx: RenderCtx): Column {
  const terms = side.terms.map((t) => ctx.term(t)).filter((x): x is { term: string; href: string } => Boolean(x));
  return {
    id: `s${index + 1}`,
    name: side.name,
    href: side.framework ? frameworkHref(side.framework) : undefined,
    cells: {
      standing: sideStanding(side, statements, f, ctx) + (terms.length ? `<p class="cmp-terms">Key terms: ${terms.map((t) => `<a href="${esc(t.href)}">${esc(t.term)}</a>`).join(', ')}</p>` : ''),
      purpose: rich(side.purpose),
      structure: rich(side.structure),
      context: rich(side.context),
      strengths: list(side.strengths),
      limitations: list(side.limitations),
      mistakes: list(side.mistakes),
      application: `<p class="cmp-tagline">${TAG_FICTIONAL} <strong>${esc(side.application.business)}</strong></p>${rich(side.application.body)}`,
      exam: `<p class="cmp-tagline">${TAG_STRATEGY}</p>${rich(side.exam)}`,
    },
  };
}

/** The exam advice the comparison tool gives for any framework, from its standing and its own data. */
export function examAdvice(f: Framework): string {
  const parts: string[] = [];
  if (f.status === 'syllabus') parts.push('It is syllabus content, so it can be examined in its own right: define it precisely, then apply it to the business in the case rather than describing it in general.');
  if (f.status === 'toolkit') parts.push('It is a toolkit tool, which the guide asks to be taught at AO2 and AO4 alongside the content (p. 13): build it from the case’s own evidence and say what it shows, not only what it is.');
  if (f.status === 'enrichment') parts.push('It is beyond the IB course: use it, if at all, to support a point made with the course’s own tools and terms, and say what it adds.');
  if (f.status !== 'enrichment' && f.level === 'HL') parts.push('It is HL only, so it will not be needed in Paper 1, which leaves out HL-only material (guide, p. 43).');
  if (f.implications.justifies[0]) parts.push(`Use it to justify a judgement such as: ${f.implications.justifies[0].replace(/\.$/, '')}.`);
  if (f.implications.doesNotJustify[0]) parts.push(`Do not let it decide on its own: ${f.implications.doesNotJustify[0].charAt(0).toLowerCase()}${f.implications.doesNotJustify[0].slice(1).replace(/\.$/, '')}.`);
  return `<p class="cmp-tagline">${TAG_STRATEGY}</p>${parts.map((p) => `<p>${inline(p)}</p>`).join('')}`;
}

/** Any framework in the library as a column, from its own data: the comparison tool's material. */
export function frameworkColumn(id: string, f: Framework, ctx: RenderCtx): Column {
  const tool = f.tool ? ctx.tool(f.tool) : undefined;
  return {
    id,
    name: f.name,
    href: frameworkHref(id),
    cells: {
      standing: `<p><span class="tag ${f.status === 'enrichment' ? 'tag--enrichment' : 'tag--ib'}">${esc(STATUS_LABELS[f.status])}</span> ${esc(standing(f))}${f.status !== 'enrichment' ? `, ${f.level === 'HL' ? 'HL only' : 'SL and HL'}` : ''}.${tool ? ` <a href="${esc(tool.href)}">The toolkit guide</a>.` : ''}</p>${subtopicLinks(f.subtopics, ctx)}`,
      purpose: rich(f.purpose),
      structure: `<ul class="cmp-list">${f.structure.map((s) => `<li><strong>${esc(s.name)}.</strong> ${inline(s.text)}</li>`).join('')}</ul>`,
      context: `<p class="cmp-sub">It suits</p>${list(f.situations.suits)}<p class="cmp-sub">Look elsewhere when</p>${list(f.situations.poorFit)}`,
      strengths: list(f.advantages),
      limitations: list(f.limitations),
      mistakes: `<ul class="cmp-list">${f.mistakes.map((m) => `<li>${inline(m.mistake)} <span class="cmp-fix"><strong>Instead:</strong> ${inline(m.fix)}</span></li>`).join('')}</ul>`,
      application: `<p class="cmp-tagline">${TAG_FICTIONAL} <strong>${esc(f.example.title)}</strong></p>${rich(f.example.body)}<p class="cmp-sub">What it showed</p>${rich(f.example.result)}`,
      exam: examAdvice(f),
    },
  };
}
