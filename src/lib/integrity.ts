/**
 * The relationship model and its integrity checks.
 *
 * Content refers to other content by id: a topic lists its cases, tools,
 * calculations and questions; a case lists its topics; a question names its
 * command term and the exhibit it uses. This module resolves those references
 * in both directions and reports every one that does not resolve. The build
 * fails on any problem (see src/lib/content.ts), and so do the unit tests.
 */
import type { AssessmentComponent, Block, Calculation, CaseEntry, Claim, CommandTerm, Concept, Curriculum, Decision, GlossaryEntry, Interactive, Question, Source, Topic, Tool } from './schemas';
import { topoOrder } from './plan';
import { buildWorking, workings } from './finance';
import { checkStudioInteractives } from './integrity-studio';
import { applyAdjustments, balances, derive, type Statement } from './ratios';

type Dict<T> = Record<string, T>;

export interface Corpus {
  topics: Dict<Topic>;
  cases: Dict<CaseEntry>;
  decisions: Dict<Decision>;
  tools: Dict<Tool>;
  questions: Dict<Question>;
  calculations: Dict<Calculation>;
  glossary: Dict<GlossaryEntry>;
  sources: Dict<Source>;
  claims: Dict<Claim>;
  curricula: Dict<Curriculum>;
  assessment: Dict<AssessmentComponent>;
  commandTerms: Dict<CommandTerm>;
  concepts: Dict<Concept>;
  interactives: Dict<Interactive>;
}

export interface Problem {
  where: string;
  message: string;
}

function blocksOf(topic: Topic): Block[] {
  return topic.sections.flatMap((s) => s.blocks);
}

/** Sum of the marks a points markscheme awards. */
export function pointsTotal(q: Question): number {
  return q.markscheme.points.reduce((s, p) => s + p.marks, 0);
}

/** Highest mark named in a levels markscheme, for example "7-8" gives 8. */
export function levelsTop(q: Question): number {
  const tops = q.markscheme.levels.map((l) => {
    const nums = l.marks.match(/\d+/g)?.map(Number) ?? [0];
    return Math.max(...nums);
  });
  return tops.length ? Math.max(...tops) : 0;
}

export function checkIntegrity(c: Corpus): Problem[] {
  const problems: Problem[] = [];
  const has = <T>(dict: Dict<T>, id: string) => Object.prototype.hasOwnProperty.call(dict, id);
  const need = (dict: Dict<unknown>, id: string, where: string, kind: string) => {
    if (!has(dict, id)) problems.push({ where, message: `${kind} "${id}" does not exist` });
  };
  const exhibitIn = (caseId: string, exhibitId: string, where: string) => {
    const cs = c.cases[caseId];
    if (!cs) {
      problems.push({ where, message: `case "${caseId}" does not exist` });
      return;
    }
    if (!cs.exhibits.some((e) => e.id === exhibitId)) problems.push({ where, message: `exhibit "${exhibitId}" is not in case "${caseId}"` });
  };

  /* Topics */
  for (const [id, t] of Object.entries(c.topics)) {
    const w = `topics/${id}`;
    t.related.cases.forEach((x) => need(c.cases, x, w, 'case'));
    t.related.decisions.forEach((x) => need(c.decisions, x, w, 'decision room'));
    t.related.tools.forEach((x) => need(c.tools, x, w, 'tool'));
    t.related.calculations.forEach((x) => need(c.calculations, x, w, 'calculation'));
    t.related.questions.forEach((x) => need(c.questions, x, w, 'question'));
    t.related.topics.forEach((x) => need(c.topics, x, w, 'topic'));
    t.related.glossary.forEach((x) => need(c.glossary, x, w, 'glossary term'));
    t.sources.forEach((x) => need(c.sources, x, w, 'source'));
    const sectionIds = new Set<string>();
    for (const s of t.sections) {
      if (sectionIds.has(s.id)) problems.push({ where: w, message: `section id "${s.id}" is repeated` });
      sectionIds.add(s.id);
    }
    for (const b of blocksOf(t)) {
      b.sources.forEach((x) => need(c.sources, x, `${w} (${b.type} block)`, 'source'));
      if (b.type === 'worked') {
        need(c.calculations, b.calculation, w, 'calculation');
        if (!workings[b.calculation]) problems.push({ where: w, message: `calculation "${b.calculation}" has no function in src/lib/finance.ts` });
      }
      if (b.type === 'exhibit') exhibitIn(b.case, b.exhibit, w);
      if (b.type === 'interactive') {
        if (!b.ref) problems.push({ where: w, message: `interactive block "${b.title}" has no ref` });
        else if (!has(c.interactives, b.ref)) problems.push({ where: w, message: `interaction "${b.ref}" does not exist` });
        else if (c.interactives[b.ref]?.component !== b.component) problems.push({ where: w, message: `interaction "${b.ref}" is a ${c.interactives[b.ref]?.component}, not a ${b.component}` });
      }
    }
    // A topic must reference at least one case, one question and one tool.
    if (!t.related.cases.length) problems.push({ where: w, message: 'a topic must use at least one case' });
    if (!t.related.questions.length) problems.push({ where: w, message: 'a topic must have practice questions' });
    if (!blocksOf(t).some((b) => b.type === 'misconception')) problems.push({ where: w, message: 'a topic must diagnose at least one misconception' });
  }

  /* Cases */
  for (const [id, cs] of Object.entries(c.cases)) {
    const w = `cases/${id}`;
    cs.topics.forEach((x) => need(c.topics, x, w, 'topic'));
    cs.tools.forEach((x) => need(c.tools, x, w, 'tool'));
    cs.calculations.forEach((x) => need(c.calculations, x, w, 'calculation'));
    cs.questions.forEach((x) => need(c.questions, x, w, 'question'));
    cs.sources.forEach((x) => need(c.sources, x, w, 'source'));
    if (cs.decisionRoom) need(c.decisions, cs.decisionRoom, w, 'decision room');
    const exIds = new Set(cs.exhibits.map((e) => e.id));
    if (exIds.size !== cs.exhibits.length) problems.push({ where: w, message: 'exhibit ids are repeated' });
    for (const o of cs.options) o.evidence.forEach((x) => exhibitIn(id, x, `${w} option ${o.id}`));
    if (cs.dataStatus === 'simulated') {
      for (const e of cs.exhibits) {
        if (e.provenance !== 'simulated-data') problems.push({ where: `${w} ${e.id}`, message: 'an exhibit in a simulated case must be labelled simulated-data' });
      }
    }
    if (cs.kind === 'fictional' && cs.dataStatus === 'real') problems.push({ where: w, message: 'a fictional organization cannot carry real data' });
    for (const e of cs.exhibits) {
      if (e.kind === 'table') {
        const cols = e.columns?.length ?? 0;
        if (!cols || !e.rows?.length) problems.push({ where: `${w} ${e.id}`, message: 'a table exhibit needs columns and rows' });
        e.rows?.forEach((r, i) => {
          if (r.length !== cols) problems.push({ where: `${w} ${e.id}`, message: `row ${i + 1} has ${r.length} cells for ${cols} columns` });
        });
        if (e.footer && e.footer.length !== cols) problems.push({ where: `${w} ${e.id}`, message: 'the footer does not match the columns' });
      }
    }
  }

  /* Decision rooms */
  for (const [id, d] of Object.entries(c.decisions)) {
    const w = `decisions/${id}`;
    need(c.cases, d.case, w, 'case');
    d.evidence.forEach((x) => exhibitIn(d.case, x, w));
    d.topics.forEach((x) => need(c.topics, x, w, 'topic'));
    d.questions.forEach((x) => need(c.questions, x, w, 'question'));
    const metricIds = new Set(d.metrics.map((m) => m.id));
    for (const k of Object.keys(d.baseline)) if (!metricIds.has(k)) problems.push({ where: w, message: `baseline names unknown metric "${k}"` });
    for (const m of metricIds) if (!(m in d.baseline)) problems.push({ where: w, message: `metric "${m}" has no baseline` });
    const [first, ...rest] = d.rounds;
    if (!first) continue;
    const firstIds = new Set(first.choices.map((ch) => ch.id));
    for (const ch of first.choices) {
      if (ch.followsFrom) problems.push({ where: `${w} ${ch.id}`, message: 'a first-round choice cannot follow another' });
    }
    for (const r of d.rounds) {
      for (const ch of r.choices) {
        for (const k of Object.keys(ch.outcome.metrics)) {
          if (!metricIds.has(k)) problems.push({ where: `${w} ${ch.id}`, message: `outcome names unknown metric "${k}"` });
        }
      }
    }
    for (const r of rest) {
      for (const ch of r.choices) {
        if (ch.followsFrom && !firstIds.has(ch.followsFrom)) problems.push({ where: `${w} ${ch.id}`, message: `follows unknown first-round choice "${ch.followsFrom}"` });
      }
      for (const f of firstIds) {
        const n = r.choices.filter((ch) => !ch.followsFrom || ch.followsFrom === f).length;
        if (n < 2) problems.push({ where: `${w} ${r.id}`, message: `first-round choice "${f}" needs at least two follow-up choices, has ${n}` });
      }
    }
    // Within the first round every choice reports the same metrics, so the board
    // pack can compare them; every metric is reported in some round.
    const firstKeys = new Set(Object.keys(first.choices[0]?.outcome.metrics ?? {}));
    for (const ch of first.choices) {
      const keys = new Set(Object.keys(ch.outcome.metrics));
      for (const k of firstKeys) if (!keys.has(k)) problems.push({ where: `${w} ${ch.id}`, message: `outcome does not report metric "${k}", which other first-round outcomes report` });
      for (const k of keys) if (!firstKeys.has(k)) problems.push({ where: `${w} ${ch.id}`, message: `outcome reports metric "${k}", which other first-round outcomes do not` });
    }
    const reported = new Set(d.rounds.flatMap((r) => r.choices.flatMap((ch) => Object.keys(ch.outcome.metrics))));
    for (const m of metricIds) if (!reported.has(m)) problems.push({ where: w, message: `metric "${m}" is never reported` });
  }

  /* Tools */
  for (const [id, t] of Object.entries(c.tools)) {
    if (t.status !== 'complete') continue;
    const w = `tools/${id}`;
    need(c.cases, t.application.case, w, 'case');
    t.topics.forEach((x) => need(c.topics, x, w, 'topic'));
    t.cases.forEach((x) => need(c.cases, x, w, 'case'));
    t.sources.forEach((x) => need(c.sources, x, w, 'source'));
    if (t.interactive) need(c.interactives, t.interactive, w, 'interaction');
  }

  /* Questions */
  // Calculations: every complete calculation has a function and a worked example that runs.
  for (const [id, calc] of Object.entries(c.calculations)) {
    const w = `calculation ${id}`;
    if (calc.status === 'complete' && !workings[id]) problems.push({ where: w, message: 'a complete calculation needs a function in src/lib/finance.ts' });
    const ex = calc.example;
    if (!ex) {
      if (calc.status === 'complete') problems.push({ where: w, message: 'a complete calculation needs a worked example' });
      continue;
    }
    if (ex.case) need(c.cases, ex.case, w, 'case');
    if (ex.tree) {
      const ix = c.interactives[ex.tree.interactive];
      if (!ix || ix.component !== 'decision-tree-lab') problems.push({ where: w, message: `"${ex.tree.interactive}" is not a decision tree interaction` });
      else if (!ix.options.some((o) => o.id === ex.tree?.option)) problems.push({ where: w, message: `option "${ex.tree.option}" is not in "${ex.tree.interactive}"` });
    } else {
      try {
        const worked = buildWorking(id, ex.inputs, ex.currency, ex.labels);
        if (worked.error) problems.push({ where: w, message: `the example's working reports: ${worked.error}` });
      } catch (err) {
        problems.push({ where: w, message: `the example cannot be worked: ${(err as Error).message}` });
      }
    }
  }

  for (const [id, q] of Object.entries(c.questions)) {
    const w = `questions/${id}`;
    need(c.topics, q.topic, w, 'topic');
    // Guide, p. 43: paper 1 excludes HL extension material; p. 47: paper 3 is HL only.
    if (q.paperStyle === 'paper-1' && q.level === 'HL') problems.push({ where: w, message: 'paper 1 excludes HL-only content, so an HL question cannot be in the style of paper 1' });
    if (q.paperStyle === 'paper-3' && q.level !== 'HL') problems.push({ where: w, message: 'paper 3 is HL only' });
    const term = Object.values(c.commandTerms).find((ct) => ct.term === q.commandTerm);
    if (term && term.ao !== q.ao) problems.push({ where: w, message: `command term "${q.commandTerm}" is ${term.ao} in the guide, but the question says ${q.ao}` });
    if (q.case) {
      need(c.cases, q.case, w, 'case');
      q.exhibits.forEach((x) => exhibitIn(q.case as string, x, w));
    } else if (q.exhibits.length) {
      problems.push({ where: w, message: 'exhibits are named but no case is given' });
    }
    if (!Object.values(c.commandTerms).some((ct) => ct.term === q.commandTerm)) problems.push({ where: w, message: `command term "${q.commandTerm}" is not in the command term list` });
    const ms = q.markscheme;
    if (ms.kind === 'points' || ms.kind === 'calculation') {
      if (!ms.points.length) problems.push({ where: w, message: 'a points markscheme needs points' });
      else if (pointsTotal(q) !== q.marks) problems.push({ where: w, message: `markscheme points total ${pointsTotal(q)}, question is worth ${q.marks}` });
    }
    if (ms.kind === 'levels') {
      if (!ms.levels.length) problems.push({ where: w, message: 'a levels markscheme needs level descriptors' });
      else if (levelsTop(q) !== q.marks) problems.push({ where: w, message: `top level is ${levelsTop(q)}, question is worth ${q.marks}` });
    }
    if (q.requiresCalculation && ms.kind !== 'calculation' && !ms.answer) problems.push({ where: w, message: 'a calculation question needs an answer in its markscheme' });
  }

  /* Curriculum */
  for (const [id, cur] of Object.entries(c.curricula)) {
    const w = `curricula/${id}`;
    const codes = new Set<string>();
    for (const u of cur.units) {
      for (const s of u.subtopics) {
        if (codes.has(s.code)) problems.push({ where: w, message: `subtopic ${s.code} is repeated` });
        codes.add(s.code);
        if (s.topic) need(c.topics, s.topic, `${w} ${s.code}`, 'topic');
        s.tools.forEach((x) => need(c.tools, x, `${w} ${s.code}`, 'tool'));
        s.calculations.forEach((x) => need(c.calculations, x, `${w} ${s.code}`, 'calculation'));
      }
    }
    for (const [tid, t] of Object.entries(c.topics)) {
      if (!codes.has(t.code)) problems.push({ where: `topics/${tid}`, message: `topic code ${t.code} is not in the curriculum` });
    }
  }

  /* Interactions that work on a case */
  for (const [id, it] of Object.entries(c.interactives)) {
    if ('case' in it && it.case) need(c.cases, it.case, `interactives/${id}`, 'case');
    // Accounts must balance, link the two years, and stay balanced under every strategy.
    if (it.component === 'ratio-desk') {
      const w = `interactives/${id}`;
      const [s1, s2] = it.statements as [Statement, Statement];
      const links = (prev: Statement, s: Statement) => Math.abs(prev.retainedEarnings + derive(s).retainedProfit - s.retainedEarnings) < 1e-6;
      it.statements.forEach((s, k) => {
        if (!balances(s)) problems.push({ where: w, message: `the statement of financial position for ${it.years[k]?.short ?? k} does not balance` });
      });
      if (!links(s1, s2)) problems.push({ where: w, message: 'retained earnings do not equal last year’s plus this year’s retained profit' });
      for (const st of it.strategies) {
        const after = applyAdjustments(s2, st.adjust);
        if (!balances(after)) problems.push({ where: w, message: `strategy "${st.id}" leaves the statement of financial position unbalanced` });
        if (!links(s1, after)) problems.push({ where: w, message: `strategy "${st.id}" breaks the link between retained profit and retained earnings` });
      }
    }
  }
  problems.push(...checkStudioInteractives(c.interactives));

  /* Interactions name real subtopics */
  const codes = new Set(Object.values(c.curricula).flatMap((cu) => cu.units.flatMap((u) => u.subtopics.map((st) => st.code))));
  for (const [id, it] of Object.entries(c.interactives)) {
    it.syllabus.forEach((code) => {
      if (!codes.has(code)) problems.push({ where: `interactives/${id}`, message: `subtopic ${code} is not in the curriculum` });
    });
  }

  /* Case labs: evidence from the case, answers among the options, a plan without loops */
  for (const [id, it] of Object.entries(c.interactives)) {
    if (it.component !== 'case-lab') continue;
    const exhibits = new Set((c.cases[it.case]?.exhibits ?? []).map((e) => e.id));
    for (const st of it.stages) {
      const w = `interactives/${id}#${st.id}`;
      st.evidence.forEach((e) => {
        if (!exhibits.has(e)) problems.push({ where: w, message: `exhibit "${e}" is not in the case` });
      });
      for (const t of st.tasks) {
        if (t.kind === 'sort') {
          const cats = new Set(t.categories.map((k) => k.value));
          t.items.forEach((item) => {
            [...item.right, ...item.partial].forEach((v) => {
              if (!cats.has(v)) problems.push({ where: `${w}/${t.id}/${item.id}`, message: `"${v}" is not one of the categories` });
            });
            item.evidence.forEach((e) => {
              if (!exhibits.has(e)) problems.push({ where: `${w}/${t.id}/${item.id}`, message: `exhibit "${e}" is not in the case` });
            });
          });
        }
        if (t.kind === 'choose') {
          const opts = new Set(t.options.map((o) => o.value));
          [...t.right, ...t.partial].forEach((v) => {
            if (!opts.has(v)) problems.push({ where: `${w}/${t.id}`, message: `"${v}" is not one of the options` });
          });
        }
        if (t.kind === 'plan') {
          try {
            topoOrder(t.activities);
          } catch (err) {
            problems.push({ where: `${w}/${t.id}`, message: String((err as Error).message) });
          }
          if (!t.activities.some((a) => a.id === t.vary.activity)) problems.push({ where: `${w}/${t.id}`, message: `the activity to vary, "${t.vary.activity}", is not in the plan` });
        }
      }
    }
  }

  /* Assessment, claims, glossary */
  for (const [id, a] of Object.entries(c.assessment)) {
    a.questions.forEach((x) => need(c.questions, x, `assessment/${id}`, 'question'));
    a.facts.forEach((f) => f.sources.forEach((x) => need(c.sources, x, `assessment/${id}`, 'source')));
  }
  for (const [id, cl] of Object.entries(c.claims)) cl.sources.forEach((x) => need(c.sources, x, `claims/${id}`, 'source'));
  for (const [id, g] of Object.entries(c.glossary)) {
    g.topics.forEach((x) => need(c.topics, x, `glossary/${id}`, 'topic'));
    g.related.forEach((x) => need(c.glossary, x, `glossary/${id}`, 'glossary term'));
  }

  return problems;
}

/** Everything that points at an entity, for "used in" panels and related resources. */
export function backlinks(c: Corpus) {
  const usedBy = new Map<string, Set<string>>();
  const add = (target: string, from: string) => {
    if (!usedBy.has(target)) usedBy.set(target, new Set());
    usedBy.get(target)?.add(from);
  };
  for (const [id, t] of Object.entries(c.topics)) {
    const from = `topic:${id}`;
    t.related.cases.forEach((x) => add(`case:${x}`, from));
    t.related.tools.forEach((x) => add(`tool:${x}`, from));
    t.related.calculations.forEach((x) => add(`calculation:${x}`, from));
    t.related.questions.forEach((x) => add(`question:${x}`, from));
    t.related.decisions.forEach((x) => add(`decision:${x}`, from));
  }
  for (const [id, cs] of Object.entries(c.cases)) {
    const from = `case:${id}`;
    cs.topics.forEach((x) => add(`topic:${x}`, from));
    cs.tools.forEach((x) => add(`tool:${x}`, from));
    cs.calculations.forEach((x) => add(`calculation:${x}`, from));
  }
  for (const [id, t] of Object.entries(c.tools)) {
    if (t.status !== 'complete') continue;
    const from = `tool:${id}`;
    t.topics.forEach((x) => add(`topic:${x}`, from));
    t.cases.forEach((x) => add(`case:${x}`, from));
  }
  return usedBy;
}
