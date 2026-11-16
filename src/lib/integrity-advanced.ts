/**
 * Integrity checks for Advanced Management and Strategy. The build fails if a
 * module strays from its plan, cites a source that is not in the register,
 * presents something as real without a source, links a framework that does
 * not exist, names an IB subtopic that does not exist, or is too thin to
 * teach from.
 */
import type { Problem } from './integrity';
import type { Source } from './schemas';
import type { AdvancedModule } from './advanced-schema';
import { MODULE_PLAN, moduleWords } from './advanced';

/** The fewest words a module may have: enough for eight parts of real depth. */
export const MIN_WORDS = 1500;

export interface AdvancedContext {
  sources: Record<string, Source>;
  /** Ids of the frameworks library. */
  frameworks: ReadonlySet<string>;
  /** IB subtopic codes. */
  subtopics: ReadonlySet<string>;
}

const IB_KINDS = new Set(['ib-official', 'ib-record']);

export function checkAdvanced(modules: Record<string, AdvancedModule>, ctx: AdvancedContext): Problem[] {
  const out: Problem[] = [];
  const seenOrder = new Map<string, string>();
  const seenTitle = new Map<string, string>();

  for (const [id, m] of Object.entries(modules)) {
    const where = `advanced/${id}`;
    const add = (message: string) => out.push({ where, message });
    const plan = MODULE_PLAN[m.domain].find((p) => p.id === id);
    if (!plan) {
      add(`is not in the plan for ${m.domain} (src/lib/advanced.ts MODULE_PLAN)`);
    } else {
      for (const topic of plan.covers) if (!m.covers.includes(topic)) add(`the plan gives it "${topic}", which its covers list leaves out`);
    }

    const orderKey = `${m.domain}:${m.order}`;
    if (seenOrder.has(orderKey)) add(`order ${m.order} is also used by ${seenOrder.get(orderKey)} in ${m.domain}`);
    seenOrder.set(orderKey, id);
    const titleKey = m.title.toLowerCase();
    if (seenTitle.has(titleKey)) add(`the title is also used by ${seenTitle.get(titleKey)}`);
    seenTitle.set(titleKey, id);

    const source = (sid: string, what: string) => {
      if (!Object.prototype.hasOwnProperty.call(ctx.sources, sid)) add(`${what} cites "${sid}", which is not in the source register`);
    };

    m.bridge.codes.forEach((code) => ctx.subtopics.has(code) || add(`bridge names IB subtopic "${code}", which does not exist`));

    const sectionIds = m.advanced.map((s) => s.id);
    sectionIds.filter((x, i) => sectionIds.indexOf(x) !== i).forEach((d) => add(`section id "${d}" appears twice`));

    m.models.forEach((x) => {
      x.sources.forEach((s) => source(s, `model "${x.name}"`));
      if (x.framework && !ctx.frameworks.has(x.framework)) add(`model "${x.name}" links framework "${x.framework}", which is not in the library`);
    });

    m.applications.forEach((a) => {
      a.sources.forEach((s) => source(s, `application "${a.title}"`));
      if (a.kind === 'real') {
        if (!a.sources.length) add(`application "${a.title}" is presented as real but cites no source`);
        if (!a.asOf) add(`application "${a.title}" is presented as real but does not say when its facts date from (asOf)`);
      }
    });

    m.cases.forEach((c) => {
      c.sources.forEach((s) => source(s, `case "${c.title}"`));
      if (!c.fictional && !c.sources.length) add(`case "${c.title}" is presented as real but cites no source`);
      if (c.exhibit) {
        const width = c.exhibit.columns.length;
        c.exhibit.rows.forEach((r, i) => r.length === width || add(`case "${c.title}": exhibit row ${i + 1} has ${r.length} cells for ${width} columns`));
      }
    });

    const labels = m.decision.options.map((o) => o.label.toLowerCase());
    labels.filter((x, i) => labels.indexOf(x) !== i).forEach((d) => add(`decision option "${d}" appears twice`));

    m.reading.forEach((r) => {
      source(r.source, 'further reading');
      const s = ctx.sources[r.source];
      if (s && IB_KINDS.has(s.kind)) add(`further reading lists "${r.source}", an IB document: advanced reading must lie beyond the IB course`);
    });
    m.basis.forEach((b) => source(b.source, 'basis'));

    const words = moduleWords(m);
    if (words < MIN_WORDS) add(`has ${words} words; a module needs at least ${MIN_WORDS} to teach from`);
  }
  return out;
}
