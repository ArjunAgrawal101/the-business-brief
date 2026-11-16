/**
 * Integrity checks for the Boardroom Briefings. The build fails, and so do
 * the unit tests, unless:
 *
 * - the briefings are numbered 1, 2, 3 and so on with no gap, each asks a
 *   question no other asks, and each file name is lower-case words joined by
 *   hyphens;
 * - the fictional flag matches the sourcing: a fictional company's exhibits
 *   are all labelled simulated data and its method note says the figures are
 *   simulated; a real company's exhibits are external evidence, its company
 *   evidence cites sources, and it cites at least one source that is the
 *   organization's own document or the press, with an address and the date it
 *   was read;
 * - every source exists in the register; every item of research evidence and
 *   every idea beyond the course cites at least one; every source the
 *   briefing lists is used;
 * - the strategic context, the market evidence and the research evidence carry
 *   no figures (they describe the world in general terms, so nothing reads as
 *   a statistic about a real market);
 * - every subtopic, glossary term, framework, toolkit guide, Strategy Studio
 *   tool, Financial Laboratory calculator, Lab page and command term exists;
 *   a connection to an HL-only subtopic is marked HL, a question on one is HL,
 *   and a question's command term is one the register knows;
 * - the options are lettered A, B, C in order, every option is judged once and
 *   scored on every criterion, the weights add up to 100, each stated weighted
 *   score is right, and the recommendation is the best-scored option unless it
 *   says why judgement departs from the scores;
 * - every exhibit an option, an evidence item or the financial information
 *   names exists, every exhibit's checks recompute its cells, every footer
 *   marked as a sum adds up, every declared figure works out, and every
 *   figure in the text is a cell, a figure or a score (./figures.ts);
 * - every link in the text is to a page on the platform (ending with a slash)
 *   or to an exhibit on the page.
 */
import type { Corpus, Problem } from '../integrity';
import { subtopicIndex } from '../integrity-learning';
import type { Framework } from '../framework-schema';
import { allExhibits, checkExhibitFigures, figuresInGeneralText, globalLookup, roundTo, unaccounted, weightedScores, workFigures } from './figures';
import type { BoardroomBriefing } from './schema';
import { toolHref, type ToolRegistry } from './series';

export interface BriefingContext {
  c: Pick<Corpus, 'curricula' | 'glossary' | 'tools' | 'sources' | 'commandTerms'>;
  frameworks: Record<string, Pick<Framework, 'name' | 'status' | 'level'>>;
  registry: ToolRegistry;
}

const dupes = (xs: string[]) => [...new Set(xs.filter((x, i) => xs.indexOf(x) !== i))];

/** Every link target written as [label](target). */
const linkTargets = (text: string) => [...text.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)].map((m) => m[1] ?? '');

export function checkBoardroomBriefings(items: Record<string, BoardroomBriefing>, ctx: BriefingContext): Problem[] {
  const out: Problem[] = [];
  const { c } = ctx;
  const has = <T>(d: Record<string, T>, id: string) => Object.prototype.hasOwnProperty.call(d, id);
  const subs = subtopicIndex(c as Corpus);

  /* ---------- The series ---------- */
  const entries = Object.entries(items);
  const numbers = entries.map(([, b]) => b.number).sort((a, b) => a - b);
  numbers.forEach((n, i) => {
    if (n !== i + 1) out.push({ where: 'boardroom-briefings', message: `the briefings must be numbered 1 to ${numbers.length} with no gap or repeat; found ${numbers.join(', ')}` });
  });
  for (const q of dupes(entries.map(([, b]) => b.question.trim().toLowerCase()))) out.push({ where: 'boardroom-briefings', message: `the question "${q}" is asked by more than one briefing` });

  for (const [id, b] of entries) {
    const w = `boardroom-briefings/${id}`;
    const add = (message: string) => out.push({ where: w, message });
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) add('the file name must be lower-case words joined by hyphens');

    const exhibits = allExhibits(b);
    const exhibitIds = exhibits.map((e) => e.id);
    const studentIds = new Set(b.exhibits.map((e) => e.id));
    for (const d of dupes(exhibitIds)) add(`exhibit id "${d}" is used twice`);
    for (const e of b.exhibits) if (!/^ex-\d+$/.test(e.id)) add(`exhibit "${e.id}": the case's exhibits are numbered ex-1, ex-2 and so on`);
    for (const e of b.analysis.exhibits) if (!/^ex-A\d+$/.test(e.id)) add(`exhibit "${e.id}": the analysis's own exhibits are numbered ex-A1, ex-A2 and so on`);

    /* ---------- Fictional or real: the labels must match the sourcing ---------- */
    const sources = b.sources.map((s) => ({ id: s, src: c.sources[s] }));
    if (b.company.fictional) {
      for (const e of exhibits) if (e.provenance !== 'simulated-data') add(`exhibit ${e.id} must be labelled simulated-data: the company is fictional`);
      if (!/simulated/i.test(b.method) || !/fictional/i.test(b.method)) add('the method note must say that the company is fictional and its figures simulated');
      for (const s of sources) {
        if (s.src && (s.src.kind === 'organization' || s.src.kind === 'press')) add(`source "${s.id}" is about a real organization, but the company is fictional: real evidence cannot support a fictional company`);
      }
    } else {
      for (const e of exhibits) if (e.provenance !== 'external-evidence') add(`exhibit ${e.id} must be labelled external-evidence: the company is real`);
      const companySources = sources.filter((s) => s.src && (s.src.kind === 'organization' || s.src.kind === 'press'));
      if (!companySources.length) add('a briefing about a real company must cite at least one of its own documents or a press report');
      for (const s of companySources) {
        if (!s.src?.url?.startsWith('https://')) add(`source "${s.id}" needs an https address`);
        if (!s.src?.accessed) add(`source "${s.id}" needs the date it was read`);
      }
      b.evidence.forEach((ev, i) => {
        if (ev.kind === 'company' && !ev.sources.length) add(`evidence ${i + 1} ("${ev.title}") is about a real company, so it must cite its sources`);
      });
    }

    /* ---------- Sources ---------- */
    const listed = new Set(b.sources);
    for (const d of dupes(b.sources)) add(`source "${d}" is listed twice`);
    for (const s of b.sources) if (!has(c.sources, s)) add(`source "${s}" is not in the source register`);
    const cited = new Set<string>();
    const cite = (where: string, ids: string[]) =>
      ids.forEach((s) => {
        cited.add(s);
        if (!has(c.sources, s)) add(`${where} cites "${s}", which is not in the source register`);
        else if (!listed.has(s)) add(`${where} cites "${s}", which the briefing's sources do not list`);
      });
    b.evidence.forEach((ev, i) => {
      cite(`evidence ${i + 1}`, ev.sources);
      if (ev.kind === 'research' && !ev.sources.length) add(`evidence ${i + 1} ("${ev.title}") is research, so it must cite a source`);
      if (ev.kind !== 'company' && ev.exhibits.length) add(`evidence ${i + 1} ("${ev.title}") rests on exhibits, so it is the company's own evidence`);
    });
    b.beyond.forEach((x, i) => {
      cite(`idea beyond the course ${i + 1}`, x.sources);
      if (!x.sources.length) add(`idea beyond the course ${i + 1} ("${x.idea}") must cite a source`);
    });
    // The method behind the figures counts as used: the method note relies on it.
    for (const s of b.sources) if (c.sources[s]?.kind === 'method') cited.add(s);
    for (const s of b.sources) if (!cited.has(s)) add(`source "${s}" supports nothing in the briefing: cite it from evidence or an idea beyond the course, or remove it`);

    /* ---------- General context carries no figures ---------- */
    b.context.forEach((p, i) => {
      const f = figuresInGeneralText(p);
      if (f.length) add(`strategic context paragraph ${i + 1} contains figures (${f.join(', ')}); describe the industry in general terms`);
    });
    b.evidence.forEach((ev, i) => {
      if (ev.kind === 'company') return;
      const f = figuresInGeneralText(`${ev.title} ${ev.body}`);
      if (f.length) add(`evidence ${i + 1} ("${ev.title}") is ${ev.kind === 'research' ? 'research' : 'about the market'} and contains figures (${f.join(', ')}); state it in general terms`);
    });

    /* ---------- The course, the frameworks and the tools ---------- */
    const codes = b.course.subtopics.map((s) => s.code);
    for (const d of dupes(codes)) add(`subtopic ${d} is listed twice`);
    for (const s of b.course.subtopics) {
      const sub = subs.get(s.code);
      if (!sub) add(`subtopic ${s.code} is not in the IB course`);
      else if (sub.level === 'HL' && s.level !== 'HL') add(`subtopic ${s.code} is HL only, so its connection must be marked level: HL`);
      else if (sub.level === 'SL/HL' && s.level === 'HL') add(`subtopic ${s.code} has no HL-only content, so its connection cannot be marked HL`);
    }
    for (const d of dupes(b.course.terms)) add(`glossary term "${d}" is listed twice`);
    for (const t of b.course.terms) {
      const g = c.glossary[t];
      if (!g) add(`glossary term "${t}" does not exist`);
      else if (g.provenance === 'enrichment' || !g.subtopics.length) add(`glossary term "${t}" is beyond the IB course: name it under an idea beyond the course, not under the course`);
    }
    b.beyond.forEach((x, i) =>
      x.terms.forEach((t) => {
        const g = c.glossary[t];
        if (!g) add(`idea beyond the course ${i + 1} names glossary term "${t}", which does not exist`);
        else if (g.provenance !== 'enrichment' && g.subtopics.length) add(`idea beyond the course ${i + 1} names "${t}", which is a term of the IB course: list it under the course instead`);
      }),
    );
    for (const d of dupes(b.frameworks.map((f) => f.id))) add(`framework "${d}" is listed twice`);
    for (const f of b.frameworks) if (!has(ctx.frameworks, f.id)) add(`framework "${f.id}" is not in the frameworks library`);
    for (const d of dupes(b.tools.map((t) => `${t.kind}:${t.id}`))) add(`tool "${d}" is listed twice`);
    for (const t of b.tools) if (!toolHref(t.kind, t.id, ctx.registry)) add(`${t.kind} tool "${t.id}" does not exist`);

    /* ---------- Questions ---------- */
    const qids = [...b.questions.course.map((q) => q.id), ...b.questions.seminar.map((q) => q.id)];
    for (const d of dupes(qids)) add(`question id "${d}" is used twice`);
    for (const q of b.questions.course) {
      const qw = `question "${q.id}"`;
      if (!has(c.commandTerms, q.command)) add(`${qw}: command term "${q.command}" is not in the command term register`);
      for (const code of q.subtopics) {
        const sub = subs.get(code);
        if (!sub) add(`${qw}: subtopic ${code} is not in the IB course`);
        else if (sub.level === 'HL' && q.level !== 'HL') add(`${qw}: subtopic ${code} is HL only, so the question must be marked HL`);
      }
    }
    if (!b.questions.course.some((q) => q.level !== 'HL')) add('at least one course question must be open to SL students');

    /* ---------- Options, criteria, scores and the recommendation ---------- */
    const letters = b.options.map((o) => o.id);
    letters.forEach((l, i) => {
      if (l !== String.fromCharCode(65 + i)) add(`the options must be lettered A, B, C in order; option ${i + 1} is "${l}"`);
    });
    for (const o of b.options) for (const e of o.evidence) if (!exhibitIds.includes(e)) add(`option ${o.id} names exhibit "${e}", which is not in the briefing`);
    b.evidence.forEach((ev, i) => ev.exhibits.forEach((e) => studentIds.has(e) || add(`evidence ${i + 1} names exhibit "${e}", which is not in the case`)));
    for (const e of b.financials.exhibits) if (!studentIds.has(e)) add(`financial information names exhibit "${e}", which is not in the case`);

    const judged = b.analysis.alternatives.map((a) => a.option);
    for (const o of letters) if (!judged.includes(o)) add(`the analysis does not judge option ${o}`);
    for (const o of judged) if (!letters.includes(o)) add(`the analysis judges option ${o}, which is not one of the options`);
    for (const d of dupes(judged)) add(`the analysis judges option ${d} twice`);

    const critIds = b.criteria.map((k) => k.id);
    for (const d of dupes(critIds)) add(`criterion "${d}" is listed twice`);
    const weights = b.criteria.reduce((s, k) => s + k.weight, 0);
    if (weights !== 100) add(`the criteria's weights add up to ${weights}, not 100`);
    const scored = b.analysis.scores.map((s) => s.option);
    for (const o of letters) if (!scored.includes(o)) add(`option ${o} is not scored`);
    for (const d of dupes(scored)) add(`option ${d} is scored twice`);
    const totals = weightedScores(b);
    for (const s of b.analysis.scores) {
      if (!letters.includes(s.option)) add(`option ${s.option} is scored, but it is not one of the options`);
      for (const k of critIds) if (s.scores[k] === undefined) add(`option ${s.option} has no score for "${k}"`);
      for (const k of Object.keys(s.scores)) if (!critIds.includes(k)) add(`option ${s.option} is scored on "${k}", which is not a criterion`);
      const worked = totals.get(s.option) ?? NaN;
      if (Math.abs(roundTo(worked, 2) - s.total) > 1e-9) add(`option ${s.option}'s weighted score is stated as ${s.total}, but works out at ${roundTo(worked, 2)}`);
    }
    const rec = b.analysis.recommendation;
    if (!letters.includes(rec.option)) add(`the recommendation names option ${rec.option}, which is not one of the options`);
    const best = Math.max(...[...totals.values()].map((v) => roundTo(v, 2)));
    const recScore = roundTo(totals.get(rec.option) ?? NaN, 2);
    if (recScore < best && !rec.departsFromScores) add(`option ${rec.option} is recommended, but another option scores higher (${best} against ${recScore}): say why under departsFromScores`);
    if (recScore === best && rec.departsFromScores) add(`option ${rec.option} has the best score, so the recommendation does not depart from the scores`);

    /* ---------- Figures ---------- */
    const { values, problems } = workFigures(b);
    problems.forEach(add);
    const lookup = globalLookup(b, values);
    for (const e of exhibits) {
      for (const t of e.totals) if (!(e.rows ?? []).some((r) => String(r[0]) === t)) add(`exhibit ${e.id}: total row "${t}" is not a row of the table`);
      if (e.kind === 'table' && !(e.columns?.length && e.rows?.length)) add(`exhibit ${e.id} is a table, so it needs columns and rows`);
      checkExhibitFigures(e, lookup).forEach(add);
    }
    unaccounted(b, values).forEach(add);

    /* ---------- Links in the text ---------- */
    const texts: string[] = [];
    const collect = (node: unknown) => {
      if (typeof node === 'string') texts.push(node);
      else if (Array.isArray(node)) node.forEach(collect);
      else if (node && typeof node === 'object' && !(node instanceof Date)) Object.values(node).forEach(collect);
    };
    collect(b);
    for (const text of texts) {
      for (const target of linkTargets(text)) {
        if (target.startsWith('#')) {
          if (!exhibitIds.includes(target.slice(1))) add(`the link to ${target} names no exhibit on the page`);
        } else if (target.startsWith('/')) {
          if (!target.replace(/[?#].*$/, '').endsWith('/')) add(`the link to ${target} must end with a slash`);
        } else if (!target.startsWith('https://')) add(`the link target ${target} is neither a page on the platform, an exhibit on the page nor an https address`);
      }
    }
  }
  return out;
}
