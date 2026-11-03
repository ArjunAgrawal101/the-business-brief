/**
 * Integrity checks for the Case Vault: the classification every archived case
 * carries, and the fuller case structure (questions for analysis, the decision
 * exercise and its debrief, theories and frameworks, further reading). Every
 * reference must resolve, every question's command term must sit at the
 * guide's AO level, HL-only material must be marked HL, and a label must be
 * earned: a case offered to undergraduate or MBA readers carries seminar
 * prompts, and a fictional case carries simulated data.
 */
import type { Corpus, Problem } from './integrity';
import type { CaseEntry } from './schemas';
import { subtopicIndex } from './integrity-learning';

/** True when a case carries any of the vault's classification fields. */
export function isClassified(cs: CaseEntry): boolean {
  return (
    cs.industry !== undefined ||
    cs.difficulty !== undefined ||
    cs.caseType !== undefined ||
    cs.functions.length > 0 ||
    cs.qualifications.length > 0 ||
    cs.keyConcepts.length > 0 ||
    cs.syllabus.length > 0
  );
}

const dupes = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i);

export function checkCases(c: Corpus): Problem[] {
  const out: Problem[] = [];
  const subs = subtopicIndex(c);
  const has = <T>(d: Record<string, T>, id: string) => Object.prototype.hasOwnProperty.call(d, id);

  for (const [id, cs] of Object.entries(c.cases)) {
    const w = `cases/${id}`;
    const problem = (message: string, where = w) => out.push({ where, message });
    const exhibitIds = new Set(cs.exhibits.map((e) => e.id));
    const optionIds = new Set(cs.options.map((o) => o.id));

    /* ---------- Classification ---------- */
    if (isClassified(cs)) {
      if (!cs.industry) problem('a classified case needs an industry');
      if (!cs.difficulty) problem('a classified case needs a difficulty');
      if (!cs.caseType) problem('a classified case needs a case type');
      if (!cs.functions.length) problem('a classified case needs at least one business function');
      if (!cs.qualifications.length) problem('a classified case needs at least one qualification');
      if (!cs.keyConcepts.length) problem('a classified case needs one or two key concepts');
      if (!cs.syllabus.length) problem('a classified case needs the subtopics it serves');
    }
    for (const [field, list] of [
      ['functions', cs.functions],
      ['qualifications', cs.qualifications],
      ['keyConcepts', cs.keyConcepts],
      ['syllabus', cs.syllabus],
    ] as const) {
      for (const d of new Set(dupes([...list]))) problem(`${field} lists "${d}" twice`);
    }
    cs.syllabus.forEach((code) => {
      if (!subs.has(code)) problem(`subtopic ${code} is not in the curriculum`);
    });
    if (cs.syllabus.length) {
      for (const t of cs.topics) {
        const code = c.topics[t]?.code;
        if (code && !cs.syllabus.includes(code)) problem(`the case uses the ${code} brief but does not list ${code} in its syllabus`);
      }
    }
    if (cs.concepts.length) {
      for (const k of cs.keyConcepts) if (!cs.concepts.includes(k)) problem(`key concept "${k}" is not among the case's concepts`);
    }
    if (cs.qualifications.includes('ib-dp-sl') && !cs.qualifications.includes('ib-dp-hl')) problem('a case for IB DP SL is also for HL, because HL students study the SL course');
    if (cs.caseType === 'fictional' && (cs.kind !== 'fictional' || cs.dataStatus !== 'simulated')) problem('a fictional case must be a fictional organization with simulated data');
    if (cs.caseType === 'sourced') {
      if (cs.kind !== 'real') problem('a sourced case must be about a real organization');
      if (!cs.sources.some((s) => s !== 'method-simulated')) problem('a sourced case must cite its sources');
    }
    if ((cs.qualifications.includes('undergraduate') || cs.qualifications.includes('mba')) && cs.discussion.length < 3) {
      problem('a case offered to undergraduate or MBA readers needs at least three seminar prompts (discussion)');
    }

    /* ---------- The industry, in general terms ---------- */
    // The industry context describes how the industry works without statistics about real markets: no figures at all.
    cs.industryContext.forEach((p, i) => {
      if (/\d/.test(p)) problem(`industry context paragraph ${i + 1} contains a figure; describe the industry in general terms`);
    });

    /* ---------- Financial information ---------- */
    if (cs.financials) {
      for (const e of cs.financials.exhibits) if (!exhibitIds.has(e)) problem(`financial exhibit "${e}" is not in the case`);
      for (const d of new Set(dupes(cs.financials.exhibits))) problem(`financial exhibit "${d}" is listed twice`);
    }

    /* ---------- Questions for analysis ---------- */
    const qIds: string[] = [];
    for (const q of cs.analysisQuestions) {
      const qw = `${w} question ${q.id}`;
      qIds.push(q.id);
      const term = Object.values(c.commandTerms).find((ct) => ct.term === q.commandTerm);
      if (!term) problem(`command term "${q.commandTerm}" is not in the command term list`, qw);
      else if (term.ao !== q.ao) problem(`command term "${q.commandTerm}" is ${term.ao} in the guide, but the question says ${q.ao}`, qw);
      q.syllabus.forEach((code) => {
        const s = subs.get(code);
        if (!s) problem(`subtopic ${code} is not in the curriculum`, qw);
        else if (s.level === 'HL' && q.level !== 'HL') problem(`subtopic ${code} is HL only, so the question must be marked HL`, qw);
      });
      q.exhibits.forEach((e) => {
        if (!exhibitIds.has(e)) problem(`exhibit "${e}" is not in the case`, qw);
      });
      // Guide, p. 43: paper 1 excludes HL extension material; p. 47: paper 3 is HL only.
      if (q.paper === 'paper-1' && q.level === 'HL') problem('paper 1 excludes HL-only content, so an HL question cannot be in the style of paper 1', qw);
      if (q.paper === 'paper-3' && q.level !== 'HL') problem('paper 3 is HL only', qw);
      if (q.ao === 'AO4' && !q.answer) problem('a calculation needs its worked answer', qw);
    }
    for (const d of new Set(dupes(qIds))) problem(`question id "${d}" is repeated`);
    if (cs.qualifications.includes('ib-dp-sl') && cs.analysisQuestions.length && !cs.analysisQuestions.some((q) => q.level !== 'HL')) {
      problem('a case for IB DP SL needs at least one question that is not HL only');
    }

    /* ---------- The decision exercise and the debrief ---------- */
    if (cs.exercise && !cs.debrief) problem('a decision exercise needs a debrief');
    if (cs.debrief) {
      const judged = cs.debrief.byOption.map((b) => b.option);
      for (const o of judged) if (!optionIds.has(o)) problem(`the debrief judges "${o}", which is not one of the case's alternatives`);
      for (const o of optionIds) if (!judged.includes(o)) problem(`the debrief does not judge the alternative "${o}"`);
      for (const d of new Set(dupes(judged))) problem(`the debrief judges "${d}" twice`);
    }

    /* ---------- Theories and frameworks ---------- */
    for (const f of cs.frameworks) {
      const fw = `${w} framework "${f.name}"`;
      f.terms.forEach((t) => {
        if (!has(c.glossary, t)) problem(`glossary term "${t}" does not exist`, fw);
      });
      if (f.tool && !has(c.tools, f.tool)) problem(`tool "${f.tool}" does not exist`, fw);
      f.subtopics.forEach((code) => {
        const s = subs.get(code);
        if (!s) problem(`subtopic ${code} is not in the curriculum`, fw);
        else if (s.level === 'HL' && f.level !== 'HL') problem(`subtopic ${code} is HL only, so the framework must be marked HL`, fw);
      });
    }

    /* ---------- Further reading ---------- */
    for (const r of cs.furtherReading) {
      const rw = `${w} further reading "${r.title}"`;
      if (Boolean(r.href) === Boolean(r.source)) problem('give either a page on the platform (href) or a supplied source (source), not both or neither', rw);
      if (r.source) {
        if (!has(c.sources, r.source)) problem(`source "${r.source}" is not in the register`, rw);
        else if (c.sources[r.source]?.availability !== 'supplied') problem(`source "${r.source}" was not supplied, so it cannot be offered as reading`, rw);
        if (!r.location) problem('a supplied source needs its location (chapter or pages)', rw);
      }
    }
  }
  return out;
}
