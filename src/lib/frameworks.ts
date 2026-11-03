/**
 * The frameworks library's shared logic: how a framework is labelled, how
 * the index groups and filters it, and how a glossary term's `frameworks`
 * references resolve to a framework page, a toolkit guide or a diagram.
 * Pure functions, used at build time by the pages and by the unit tests.
 */
import { FRAMEWORK_GROUPS, FRAMEWORK_GROUP_INFO, type Framework, type FrameworkGroup } from './framework-schema';
import type { GlossaryEntry, Tool } from './schemas';

type Dict<T> = Record<string, T>;

/** The level filter's key: IB SL and HL, IB HL only, or beyond the IB course. */
export type FrameworkLevelKey = 'sl' | 'hl' | 'beyond';

export function levelKey(f: Framework): FrameworkLevelKey {
  if (f.status === 'enrichment') return 'beyond';
  return f.level === 'HL' ? 'hl' : 'sl';
}

export const LEVEL_KEY_LABELS: Record<FrameworkLevelKey, string> = {
  sl: 'IB, SL and HL',
  hl: 'IB, HL only',
  beyond: 'Beyond the IB course',
};

export const STATUS_LABELS: Record<Framework['status'], string> = {
  syllabus: 'IB syllabus',
  toolkit: 'IB toolkit',
  enrichment: 'Enrichment',
};

/** The standing of a framework in one line, with the guide's page where there is one. */
export function standing(f: Framework): string {
  const pages = f.guidePages ? `, guide ${f.guidePages.includes(' ') ? 'pp.' : 'p.'} ${f.guidePages}` : '';
  if (f.status === 'syllabus') return `Named in the IB syllabus${pages}`;
  if (f.status === 'toolkit') return `An IB toolkit tool${pages}`;
  return 'Enrichment: beyond the IB course';
}

export const frameworkHref = (id: string) => `/frameworks/${id}/`;

/** Frameworks in the order of the library: by group, then by `order`, then by name. */
export function inLibraryOrder(frameworks: Dict<Framework>): Array<[string, Framework]> {
  const g = (k: FrameworkGroup) => FRAMEWORK_GROUPS.indexOf(k);
  return Object.entries(frameworks).sort(
    (a, b) => g(a[1].group) - g(b[1].group) || a[1].order - b[1].order || a[1].name.localeCompare(b[1].name, 'en', { sensitivity: 'base' }),
  );
}

/** The library grouped by purpose, every group present even when empty. */
export function grouped(frameworks: Dict<Framework>): Array<{ id: FrameworkGroup; title: string; question: string; text: string; items: Array<[string, Framework]> }> {
  const all = inLibraryOrder(frameworks);
  return FRAMEWORK_GROUPS.map((id) => ({ id, ...FRAMEWORK_GROUP_INFO[id], items: all.filter(([, f]) => f.group === id) }));
}

/** How many frameworks of each standing sit in each group: the index's overview matrix. */
export function matrix(frameworks: Dict<Framework>): Record<Framework['status'], Record<FrameworkGroup, Array<[string, Framework]>>> {
  const empty = () => Object.fromEntries(FRAMEWORK_GROUPS.map((k) => [k, [] as Array<[string, Framework]>])) as Record<FrameworkGroup, Array<[string, Framework]>>;
  const out = { syllabus: empty(), toolkit: empty(), enrichment: empty() };
  for (const [id, f] of inLibraryOrder(frameworks)) out[f.status][f.group].push([id, f]);
  return out;
}

export interface RefLink {
  id: string;
  kind: 'framework' | 'tool' | 'diagram';
  title: string;
  href: string;
  /** A short label for the kind of destination. */
  label: string;
}

export interface RefContext {
  frameworks: Dict<Framework>;
  tools: Dict<Tool>;
  diagrams: Dict<{ title: string }>;
}

/**
 * A glossary term's `frameworks` reference: a framework page first, then a
 * toolkit guide (or the tool's entry in the toolkit while its guide is
 * planned), then a diagram in the library. Undefined when nothing matches,
 * which the integrity check reports.
 */
export function resolveRef(id: string, ctx: RefContext): RefLink | undefined {
  const f = ctx.frameworks[id];
  if (f) return { id, kind: 'framework', title: f.name, href: frameworkHref(id), label: STATUS_LABELS[f.status] };
  const t = ctx.tools[id];
  if (t) return { id, kind: 'tool', title: t.name, href: t.status === 'complete' ? `/toolkit/${id}/` : `/toolkit/#tool-${id}`, label: 'Toolkit guide' };
  const d = ctx.diagrams[id];
  if (d) return { id, kind: 'diagram', title: d.title, href: `/diagrams/#diagram-${id}`, label: 'Diagram' };
  return undefined;
}

/**
 * The frameworks to show on a term's page: those the term names, then those
 * that name the term among their own terms, without repeats.
 */
export function frameworksForTerm(termId: string, g: GlossaryEntry, ctx: RefContext): RefLink[] {
  const out: RefLink[] = [];
  const seen = new Set<string>();
  const push = (l: RefLink | undefined) => {
    if (!l || seen.has(`${l.kind}:${l.id}`)) return;
    seen.add(`${l.kind}:${l.id}`);
    out.push(l);
  };
  g.frameworks.forEach((x) => push(resolveRef(x, ctx)));
  for (const [id, f] of inLibraryOrder(ctx.frameworks)) if (f.terms.includes(termId)) push(resolveRef(id, ctx));
  return out;
}
