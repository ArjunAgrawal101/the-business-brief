/**
 * The scenario generator's engine: a family and a seed make one scenario,
 * always the same for the same code ("growth-route-4821"); the choices are put
 * in an order of their own from the seed, so the best answer is not always in
 * the same place; and `problems()` lists anything that would make a scenario
 * unfit to publish, which the unit tests run on every family across many seeds.
 */
import { rng } from '../random';
import { TOOLKIT, shuffled, toolName } from './kit';
import { STEP_IDS, type Choice, type Exhibit, type Family, type Question, type Scenario } from './types';

export const MAX_SEED = 99999;

/** "growth-route-4821" as the family and the seed; null when it is not a code. */
export function parseCode(code: string, families: readonly Family[]): { family: Family; seed: number } | null {
  const m = /^([a-z][a-z0-9-]*?)-(\d{1,5})$/.exec(code.trim());
  if (!m) return null;
  const family = families.find((f) => f.id === m[1]);
  const seed = Number(m[2]);
  if (!family || !Number.isInteger(seed) || seed < 1 || seed > MAX_SEED) return null;
  return { family, seed };
}

const relabel = (cs: Choice[]): Choice[] => cs.map((c, i) => ({ ...c, id: String.fromCharCode(97 + i) }));

function ordered(r: ReturnType<typeof rng>, q: Question): Question {
  return { ...q, choices: relabel(shuffled(r, q.choices)) };
}

const and = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** One scenario from a family and a seed. */
export function build(f: Family, seed: number): Scenario {
  const made = f.make(rng(seed));
  // A second generator orders the choices and exhibits, so a family's template never has to.
  const r = rng((seed * 7919 + 104729) % 2147483647);
  const exhibits: Exhibit[] = shuffled(r, made.evidence.exhibits).map((e, i) => ({ ...e, id: `ex${i + 1}` }));
  const relevant = exhibits.map((e, i) => ({ e, n: i + 1 })).filter((x) => x.e.relevant);
  const tools = shuffled(r, made.tools).map((t) => ({ id: t.tool, tool: t.tool, text: toolName(t.tool), verdict: t.verdict, why: t.why }));
  const { tools: _tools, toolPrompt, ...rest } = made;
  return {
    ...rest,
    code: `${f.id}-${seed}`,
    family: f.id,
    seed,
    unit: f.unit,
    subtopics: f.subtopics,
    tool: f.tool,
    level: f.level,
    quantitative: f.quantitative,
    problem: ordered(r, made.problem),
    evidence: { prompt: made.evidence.prompt, exhibits },
    toolStep: { prompt: toolPrompt ?? 'Which tool from the IB business management toolkit would structure this decision best?', choices: tools },
    recommend: { ...ordered(r, made.recommend), justify: made.recommend.justify, criteria: made.recommend.criteria },
    evaluate: { stakeholders: ordered(r, made.evaluate.stakeholders), risk: ordered(r, made.evaluate.risk), change: ordered(r, made.evaluate.change) },
    model: {
      ...made.model,
      evidence: `${relevant.length === 1 ? 'Exhibit' : 'Exhibits'} ${and(relevant.map((x) => String(x.n)))} (${and(relevant.map((x) => x.e.title.charAt(0).toLowerCase() + x.e.title.slice(1)))}) ${relevant.length === 1 ? 'is' : 'are'} the evidence. ${made.model.evidence}`,
    },
  };
}

export function generate(code: string, families: readonly Family[]): Scenario | null {
  const p = parseCode(code, families);
  return p ? build(p.family, p.seed) : null;
}

/* ---------- What makes a scenario fit to publish ---------- */

const LEAK = /\bundefined\b|\bNaN\b|\[object Object\]|Infinity/;
const DASH = /[\u2013\u2014]/;

function texts(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => texts(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => texts(x, out));
  return out;
}

function oneBest(where: string, q: Question, out: string[]) {
  const best = q.choices.filter((c) => c.verdict === 'best').length;
  if (best !== 1) out.push(`${where}: ${best} best answers`);
  if (q.choices.length < 3) out.push(`${where}: fewer than three choices`);
  if (new Set(q.choices.map((c) => c.text)).size !== q.choices.length) out.push(`${where}: two choices say the same`);
  for (const c of q.choices) if (c.why.trim().length < 40) out.push(`${where}: choice "${c.text}" has no real feedback`);
}

export function problems(s: Scenario): string[] {
  const out: string[] = [];
  for (const t of texts(s)) {
    if (LEAK.test(t)) out.push(`leaked value in "${t.slice(0, 80)}"`);
    if (DASH.test(t)) out.push(`en or em dash in "${t.slice(0, 80)}"`);
  }
  oneBest('problem', s.problem, out);
  oneBest('recommendation', s.recommend, out);
  oneBest('stakeholders', s.evaluate.stakeholders, out);
  oneBest('risk', s.evaluate.risk, out);
  oneBest('change', s.evaluate.change, out);
  const ex = s.evidence.exhibits;
  if (ex.length < 4) out.push('fewer than four exhibits');
  if (!ex.some((e) => e.relevant)) out.push('no relevant exhibit');
  if (!ex.some((e) => !e.relevant)) out.push('no distractor');
  for (const e of ex) {
    if (!e.body && !(e.columns && e.rows)) out.push(`${e.title}: no content`);
    if (e.columns && e.rows) for (const row of e.rows) if (row.length !== e.columns.length) out.push(`${e.title}: a row of ${row.length} cells under ${e.columns.length} columns`);
    if (e.why.trim().length < 40) out.push(`${e.title}: no real reason given`);
  }
  const tools = s.toolStep.choices;
  if (tools.length !== 4) out.push(`${tools.length} tools offered, not 4`);
  if (new Set(tools.map((t) => t.tool)).size !== tools.length) out.push('a tool offered twice');
  if (tools.filter((t) => t.verdict === 'best').length !== 1) out.push('not exactly one best tool');
  if (tools.find((t) => t.verdict === 'best')?.tool !== s.tool) out.push('the best tool is not the family’s tool');
  for (const t of tools) {
    if (!TOOLKIT[t.tool]) out.push(`${t.tool} is not in the toolkit`);
    else if (s.level === 'SL/HL' && TOOLKIT[t.tool]!.level === 'HL') out.push(`${t.tool} is HL only, offered in an SL scenario`);
    if (t.why.trim().length < 40) out.push(`tool ${t.tool}: no real feedback`);
  }
  if (s.level === 'SL/HL' && TOOLKIT[s.tool]?.level === 'HL') out.push('an SL scenario whose tool is HL only');
  const a = s.analysis;
  if (!a.calc && !a.sort) out.push('the analysis has no task to check');
  if (s.quantitative !== Boolean(a.calc)) out.push('quantitative, but no calculation (or the reverse)');
  if (a.steps.length < 2) out.push('the structured prompt has fewer than two steps');
  if (a.model.length < 2) out.push('the model analysis has fewer than two points');
  if (a.calc) {
    const c = a.calc;
    if (!Number.isFinite(c.answer)) out.push('the answer is not a number');
    if (!(c.tolerance > 0)) out.push('no tolerance');
    if (c.working.length < 2) out.push('fewer than two lines of working');
    for (const sl of c.slips) {
      if (!Number.isFinite(sl.value)) out.push('a slip that is not a number');
      else if (Math.abs(sl.value - c.answer) <= c.tolerance) out.push(`a slip (${sl.value}) that would be marked right`);
    }
    if (new Set(c.slips.map((x) => x.value)).size !== c.slips.length) out.push('two slips with the same value');
  }
  if (a.sort) {
    const ids = new Set(a.sort.categories.map((c) => c.id));
    if (a.sort.items.length < 3) out.push('fewer than three items to sort');
    for (const it of a.sort.items) {
      if (!ids.has(it.answer)) out.push(`sort item ${it.id}: answer not a category`);
      if (it.why.trim().length < 30) out.push(`sort item ${it.id}: no real reason`);
    }
  }
  if (s.recommend.criteria.length < 2) out.push('fewer than two criteria for the justification');
  for (const k of ['problem', 'evidence', 'tool', 'analysis', 'recommendation', 'evaluation'] as const) if (s.model[k].trim().length < 40) out.push(`model answer: ${k} is thin`);
  if (STEP_IDS.length !== 6) out.push('the steps have changed');
  return out;
}
