/**
 * Integrity checks for the executive simulation (src/content/executive/*.yaml).
 *
 * References resolve (subtopic codes, glossary terms, command terms, sources,
 * KPIs), the structure holds (one right answer to each choice question, ids
 * unique, every strategy's plan as long as the plan and inside the rules), every
 * token in every text can be filled from the years that text may quote, and
 * the engine runs the history, the baseline and every strategy's plan with the
 * accounting identities holding in every year. The pages that show the
 * simulation call this and fail the build on any problem; so does
 * tests/unit/executive.test.ts.
 */
import { identityErrors } from './engine';
import { isKpi } from './kpis';
import { badTokens } from './narrate';
import { baselinePlan, checkLevers, derived, runHistory, runPlan } from './sim';
import type { Executive, QuestionDef } from './schema';
import { ROLE_IDS } from './roles';

export interface ExecutiveRefs {
  subtopics: Set<string>;
  glossary: Set<string>;
  commandTerms: Set<string>;
  sources: Set<string>;
}

export interface Problem {
  where: string;
  message: string;
}

/** The questions of the analysis stages and the evaluation, with where they are. */
export function questionsOf(sc: Executive): Array<{ stage: string; q: QuestionDef }> {
  const s = sc.stages;
  return [
    ...s.finance.questions.map((q) => ({ stage: 'finance', q })),
    ...s.market.questions.map((q) => ({ stage: 'market', q })),
    ...s.operations.questions.map((q) => ({ stage: 'operations', q })),
    ...s.people.questions.map((q) => ({ stage: 'people', q })),
    { stage: 'evaluate', q: s.evaluate.question },
  ];
}

/** Every text that quotes the history only, with where it is. */
function historyTexts(sc: Executive): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  sc.background.forEach((t, i) => out.push([`background ${i + 1}`, t]));
  out.push(['mandate', sc.mandate], ['assumptions', sc.assumptions], ['walkthrough intro', sc.walkthrough.intro]);
  sc.stakeholders.forEach((x) => out.push([`stakeholder ${x.name}`, `${x.interest} ${x.view}`]));
  for (const r of ROLE_IDS) {
    const role = sc.roles[r];
    out.push([`role ${r} brief`, role.brief], ...role.priorities.map((p, i) => [`role ${r} priority ${i + 1}`, p] as [string, string]));
    for (const [stage, t] of Object.entries(role.lens)) out.push([`role ${r} lens on ${stage}`, t]);
  }
  for (const [id, st] of Object.entries(sc.stages)) {
    out.push([`stage ${id} lead`, st.lead]);
    if (st.hlNote) out.push([`stage ${id} HL note`, st.hlNote]);
  }
  for (const { stage, q } of questionsOf(sc)) {
    if (stage === 'evaluate') continue;
    out.push([`question ${q.id} prompt`, q.prompt]);
    if (q.kind === 'choice') q.options.forEach((o) => out.push([`question ${q.id}, option ${o.id}`, `${o.text} ${o.feedback}`]));
    else out.push([`question ${q.id} working`, q.working]);
  }
  sc.stages.causes.evidence.forEach((e) => out.push([`evidence ${e.id}`, `${e.text} ${e.feedback}`]));
  sc.stages.market.competitors.forEach((c) => out.push([`competitor ${c.name}`, c.position]));
  out.push(['the export offer', sc.stages.market.opportunity]);
  for (const st of sc.strategies) out.push([`strategy ${st.id}`, [st.summary, ...st.involves, st.risks, st.feedback].join(' ')]);
  const d = sc.debrief;
  out.push(['debrief summary', d.summary]);
  d.tradeoffs.forEach((t) => out.push([`trade-off ${t.title}`, t.body]));
  d.ib.forEach((t) => out.push([`theory ${t.title}`, t.body]));
  d.beyond.forEach((t) => out.push([`beyond the course: ${t.title}`, t.body]));
  d.misconceptions.forEach((m, i) => out.push([`misconception ${i + 1}`, `${m.claim} ${m.correction}`]));
  d.practice.forEach((p, i) => out.push([`practice ${i + 1}`, p.prompt]));
  out.push(['method', sc.method]);
  return out;
}

export function checkExecutive(sims: Record<string, Executive>, refs: ExecutiveRefs): Problem[] {
  const problems: Problem[] = [];
  for (const [id, sc] of Object.entries(sims)) {
    const w = `executive/${id}`;
    const add = (message: string, where = w) => problems.push({ where, message });
    const historyLabels = sc.history.map((h) => h.label);
    const planLabels = sc.plan.map((p) => p.label);
    const allLabels = [...historyLabels, ...planLabels];
    allLabels.forEach((l, i) => allLabels.indexOf(l) !== i && add(`year ${l} appears twice`));
    for (let i = 1; i < allLabels.length; i++) if (Number(allLabels[i]) !== Number(allLabels[i - 1]) + 1) add(`year ${allLabels[i]} does not follow ${allLabels[i - 1]}`);

    /* References to the rest of the platform */
    for (const [stage, st] of Object.entries(sc.stages)) st.ib.forEach((code) => refs.subtopics.has(code) || add(`stage ${stage} names subtopic ${code}, which is not in the curriculum`));
    sc.debrief.ib.forEach((t) => t.syllabus.forEach((code) => refs.subtopics.has(code) || add(`theory "${t.title}" names subtopic ${code}, which is not in the curriculum`)));
    sc.debrief.terms.forEach((t) => refs.glossary.has(t) || add(`glossary term "${t}" does not exist`));
    sc.debrief.practice.forEach((p) => refs.commandTerms.has(p.command) || add(`practice prompt uses command term "${p.command}", which does not exist`));
    sc.debrief.beyond.forEach((b) => b.sources.forEach((s) => refs.sources.has(s) || add(`"${b.title}" cites source "${s}", which is not in the source register`)));

    /* Measures */
    sc.dashboard.forEach((k) => isKpi(k) || add(`dashboard measure "${k}" is not a KPI`));
    for (const r of ROLE_IDS) {
      sc.roles[r].pinned.forEach((k) => isKpi(k) || add(`role ${r} pins "${k}", which is not a KPI`));
      sc.roles[r].goals.forEach((g) => isKpi(g.metric.split(':')[1] ?? '') || add(`role ${r} has a goal on "${g.metric}", which is not a KPI`));
    }

    /* Questions */
    const qids = questionsOf(sc).map((x) => x.q.id);
    qids.forEach((q, i) => qids.indexOf(q) !== i && add(`question id "${q}" is used twice`));
    for (const { stage, q } of questionsOf(sc)) {
      const where = `${w}, question ${q.id}`;
      if (q.level === 'HL') add('questions in the stages must be answerable at SL; put HL material in the stage’s HL note', where);
      if (q.kind === 'choice') {
        const right = q.options.filter((o) => o.correct).length;
        if (right !== 1) add(`a choice question needs exactly one right answer, not ${right}`, where);
        const oids = q.options.map((o) => o.id);
        oids.forEach((o, i) => oids.indexOf(o) !== i && add(`option id "${o}" is used twice`, where));
      } else {
        const f = q.answer;
        if (!isKpi(f.kpi)) add(`the answer names "${f.kpi}", which is not a KPI`, where);
        if (f.less && !isKpi(f.less)) add(`the answer subtracts "${f.less}", which is not a KPI`, where);
        const years = stage === 'evaluate' ? ['final'] : historyLabels;
        for (const y of [f.year, f.from].filter((x): x is string => Boolean(x))) if (!years.includes(y)) add(`the answer is taken in "${y}", which this question cannot see`, where);
      }
    }

    /* Evidence */
    const ev = sc.stages.causes.evidence;
    const eids = ev.map((e) => e.id);
    eids.forEach((e, i) => eids.indexOf(e) !== i && add(`evidence id "${e}" is used twice`));
    if (!ev.some((e) => e.verdict === 'cause')) add('the evidence has no cause to find');
    if (!ev.some((e) => e.verdict === 'not')) add('the evidence has nothing to leave out');
    if (sc.stages.causes.min > ev.length) add('the stage asks for more choices than there is evidence');

    /* The rules and the strategies */
    checkLevers(sc.rules, sc.rules.baseline).forEach((p) => add(`the baseline: ${p.field}: ${p.message}`));
    const sids = sc.strategies.map((s) => s.id);
    sids.forEach((s, i) => sids.indexOf(s) !== i && add(`strategy id "${s}" is used twice`));
    if (!sids.includes(sc.walkthrough.strategy)) add(`the worked example follows "${sc.walkthrough.strategy}", which is not a strategy`);
    for (const st of sc.strategies) {
      if (st.plan.length !== sc.plan.length) add(`its plan has ${st.plan.length} years for ${sc.plan.length} plan years`, `${w}, strategy ${st.id}`);
      st.plan.forEach((l, k) => checkLevers(sc.rules, l).forEach((p) => add(`${planLabels[k] ?? k}: ${p.field}: ${p.message}`, `${w}, strategy ${st.id}`)));
    }

    /* Tokens */
    let names: string[] = [];
    try {
      names = Object.keys(derived(sc));
    } catch (err) {
      add(`the derived figures could not be worked: ${String(err)}`);
    }
    for (const [where, t] of historyTexts(sc)) badTokens(t, historyLabels, names, false).forEach((tok) => add(`token ${tok} cannot be filled from the history`, `${w}, ${where}`));
    for (const st of sc.strategies) badTokens(st.lesson, allLabels, names, true).forEach((tok) => add(`token ${tok} cannot be filled from the strategy's run`, `${w}, strategy ${st.id} lesson`));
    for (const y of sc.plan) {
      badTokens(y.note, allLabels, names, false).forEach((tok) => add(`token ${tok} cannot be filled`, `${w}, plan ${y.label} note`));
      if (y.news) badTokens(`${y.news.text}`, allLabels.slice(0, historyLabels.length + planLabels.indexOf(y.label) + 1), names, false).forEach((tok) => add(`token ${tok} quotes a year that has not happened yet`, `${w}, plan ${y.label} news`));
    }
    sc.history.forEach((h) => badTokens(h.note, historyLabels, names, false).forEach((tok) => add(`token ${tok} cannot be filled`, `${w}, history ${h.label} note`)));
    const ev9 = sc.stages.evaluate.question;
    const ev9Text = ev9.kind === 'number' ? `${ev9.prompt} ${ev9.working}` : `${ev9.prompt} ${ev9.options.map((o) => `${o.text} ${o.feedback}`).join(' ')}`;
    badTokens(ev9Text, allLabels, names, true).forEach((tok) => add(`token ${tok} cannot be filled from a run`, `${w}, the evaluation question`));

    /* The market: the company's share and its competitors' cannot exceed the whole */
    let ok = true;
    try {
      const { history } = runHistory(sc);
      history.forEach((r) => identityErrors(r).forEach((m) => add(`history ${r.label}: ${m}`)));
      const last = history[history.length - 1];
      if (last) {
        const total = last.kpis.marketShare + sc.stages.market.competitors.reduce((a, c) => a + c.share, 0);
        if (total > 100 + 1e-9) add(`the company's share and its competitors' add up to more than 100%`);
      }
    } catch (err) {
      add(`the history could not be run: ${String(err)}`);
      ok = false;
    }
    if (!ok) continue;

    /* Every plan the pages run */
    const plans: Array<[string, Executive['strategies'][number]['plan']]> = [['the baseline', baselinePlan(sc)], ...sc.strategies.map((s) => [`strategy ${s.id}`, s.plan] as [string, typeof s.plan])];
    for (const [name, plan] of plans) {
      for (const shift of [0, 8, -8]) {
        try {
          const run = runPlan(sc, plan, { fxShift: shift });
          if (run.years.length !== sc.plan.length) add(`${name} ran ${run.years.length} of ${sc.plan.length} years`);
          run.years.forEach((r) => identityErrors(r).forEach((m) => add(`${name}${shift ? ` with the exchange rate shifted ${shift}%` : ''}, ${r.label}: ${m}`)));
        } catch (err) {
          add(`${name} could not be run: ${String(err)}`);
        }
      }
    }
  }
  return problems;
}
