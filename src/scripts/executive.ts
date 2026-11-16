/**
 * The executive simulation in the browser. The page already holds every stage
 * (the casebook), the role picker and the first dashboard; this script runs the
 * same engine and the same renderers as the server to play it: choose a role,
 * work through the analysis one stage at a time with feedback on every answer,
 * set and commit a plan for each year, read what happened and why, evaluate the
 * result and open a debrief that compares the plan with every strategy.
 * Progress is kept on this device only, under bb:executive (declared on the
 * privacy page), and the page works for the visit if storage is blocked.
 */
import type { ExecConfig } from '../lib/executive/config';
import type { KpiId } from '../lib/executive/engine';
import { fmtKpi, fmtMoneyCompact } from '../lib/executive/kpis';
import { fillTokens, headline } from '../lib/executive/narrate';
import {
  allocationFormHtml,
  attributionHtml,
  beforeAfterHtml,
  comparisonHtml,
  figuresTable,
  fromField,
  fxHtml,
  kpiTiles,
  planTableHtml,
  profitBarsHtml,
  scorecardHtml,
  yearResultHtml,
  type PlanRow,
} from '../lib/executive/render';
import { BUDGET_LEVERS, isRole, LEVER_IDS, ROLE_IDS, ROLE_IN_TEXT, ROLE_TITLES, STAGE_IDS, type LeverId, type RoleId, type StageId } from '../lib/executive/roles';
import type { Levers } from '../lib/executive/schema';
import { answerRight, attribution, checkLevers, figureValue, runPlan, scorecard, summarize, type LeverProblem, type Run } from '../lib/executive/sim';
import { fmtNumber } from '../lib/format';
import { esc, rich } from '../lib/markup';
import { announce, each, readConfig, store } from './ix';

const KEY = 'executive';
/** The stages in order; one past the last is the debrief. */
const FLOW: StageId[] = [...STAGE_IDS];
const DEBRIEF = FLOW.length;
const ANALYSIS: StageId[] = ['finance', 'causes', 'market', 'operations', 'people', 'strategy'];

interface Saved {
  v: 1;
  role?: RoleId;
  /** The stage being worked on, as an index into FLOW; FLOW.length means the debrief is open. */
  at: number;
  /** Answers by question id: an option, a typed figure, or the evidence chosen. */
  answers: Record<string, string | string[]>;
  checked: string[];
  strategy?: string;
  plan: Levers[];
  /** The allocation form's figures before they are committed. */
  draft?: Levers;
  reflections: Record<string, string>;
  /** For the dashboard's list of saved work. */
  title: string;
  href: string;
  summary: string;
  savedAt: string;
}

/** A figure typed by a person: "4.2", "4.2%", "1,955", "£120k" is not accepted; a typographic minus is. */
function parseTyped(raw: string): number | null {
  const cleaned = raw.trim().replace(/[\s,%£€]/g, '').replace(/−/g, '-');
  if (!/^-?\d+(\.\d+)?$|^-?\.\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

each('[data-ix="executive"]', (root) => {
  const cfg = readConfig<ExecConfig>(root);
  const core = cfg.core;
  const ctx = cfg.ctx;
  const Y = core.plan.length;
  const roles = { roles: Object.fromEntries(ROLE_IDS.map((r) => [r, { goals: cfg.roles[r].goals }])) as Record<RoleId, { goals: ExecConfig['roles'][RoleId]['goals'] }> };
  const q = <T extends HTMLElement>(sel: string, within: ParentNode = root) => within.querySelector<T>(sel);
  const qa = <T extends HTMLElement>(sel: string, within: ParentNode = root) => [...within.querySelectorAll<T>(sel)];
  const status = q('[data-status]');
  let choosingRole = false;
  const reviewing = new Set<StageId>();

  /* ---------------- State: restored, then kept honest ---------------- */

  const raw = store.get<Partial<Saved>>(KEY, {});
  const validPlan: Levers[] = [];
  for (const l of Array.isArray(raw.plan) ? raw.plan : []) {
    if (validPlan.length >= Y || !l || checkLevers(core.rules, l).length) break;
    validPlan.push({ price: l.price, costCut: l.costCut, marketing: l.marketing, capacity: l.capacity, people: l.people, international: l.international });
  }
  const state: Saved = {
    v: 1,
    role: isRole(raw.role) ? raw.role : undefined,
    at: typeof raw.at === 'number' && raw.at >= 0 ? Math.min(Math.floor(raw.at), DEBRIEF) : 0,
    answers: raw.answers && typeof raw.answers === 'object' ? { ...raw.answers } : {},
    checked: Array.isArray(raw.checked) ? raw.checked.filter((x): x is string => typeof x === 'string') : [],
    strategy: cfg.strategies.some((s) => s.id === raw.strategy) ? raw.strategy : undefined,
    plan: validPlan,
    draft: raw.draft && checkLevers(core.rules, raw.draft).filter((p) => p.field !== 'budget').length === 0 ? { ...raw.draft } : undefined,
    reflections: raw.reflections && typeof raw.reflections === 'object' ? { ...raw.reflections } : {},
    title: cfg.title,
    href: cfg.href,
    summary: '',
    savedAt: new Date().toISOString(),
  };
  // A stage cannot be ahead of what it rests on.
  const questionIds = (stage: StageId) => [...Object.entries(cfg.questions).filter(([, k]) => k.stage === stage).map(([id]) => id), ...(stage === 'causes' ? ['causes'] : []), ...(stage === 'strategy' ? ['strategy'] : [])];
  const stageDone = (stage: StageId) => questionIds(stage).every((id) => state.checked.includes(id));
  for (let i = 0; i < Math.min(state.at, ANALYSIS.length); i++) {
    const st = ANALYSIS[i];
    if (st && !stageDone(st)) {
      state.at = i;
      break;
    }
  }
  if (state.at > 6 && state.plan.length === 0) state.at = 6;
  if (state.at > 7 && state.plan.length < Y) state.at = 7;
  if (state.at > 8 && !state.checked.includes(cfg.evaluation.id)) state.at = 8;
  if (state.at < 6) state.plan = [];

  let run: Run = runPlan(core, state.plan);
  const years = () => [...run.history, ...run.years];
  const lastHistory = () => run.history[run.history.length - 1];

  const summaryLine = (): string => {
    const who = state.role ? `as the ${ROLE_IN_TEXT[state.role]}` : 'no role chosen yet';
    if (state.at >= DEBRIEF) {
      const f = run.years[run.years.length - 1]?.kpis;
      return `Finished ${who}: a profit margin of ${f ? fmtKpi('profitMargin', f.profitMargin, ctx) : 'n/a'} in ${run.years[run.years.length - 1]?.label ?? ''}.`;
    }
    if (state.plan.length) return `${state.plan.length} of ${Y} years committed, ${who}.`;
    return `Stage ${Math.min(state.at + 1, FLOW.length)} of ${FLOW.length}, ${who}.`;
  };
  const save = () => {
    state.summary = summaryLine();
    state.savedAt = new Date().toISOString();
    store.set(KEY, state);
  };

  /* ---------------- Small renderers ---------------- */

  const unitWords = (unit: string | undefined, v: number) => (unit === 'percent' ? `${fmtNumber(v, 1)}%` : unit === 'money' ? fmtMoneyCompact(v, ctx.symbol) : `${fmtNumber(Math.round(v), 0)}${unit === 'units' ? ` ${ctx.units}` : ''}`);
  const boardIds = (role: RoleId): KpiId[] => [...cfg.dashboard, ...cfg.roles[role].pinned.filter((k) => !cfg.dashboard.includes(k))];

  const renderDashboard = (role: RoleId) => {
    const ys = years();
    const ids = boardIds(role);
    const tiles = q('[data-dash-tiles]');
    const table = q('[data-dash-table]');
    if (tiles) tiles.innerHTML = kpiTiles(ys, ids, cfg.roles[role].pinned, ctx, 'exd', run.history.length);
    if (table) table.innerHTML = figuresTable(ys, ids, ctx, 'Dashboard figures by year', run.history.length);
    const when = q('[data-dash-when]');
    if (when) when.textContent = run.years.length ? `after ${ys[ys.length - 1]?.label ?? ''}` : `end of ${ys[ys.length - 1]?.label ?? ''}, before the plan`;
    const seat = q('[data-dash-role]');
    if (seat) seat.textContent = `Your role: ${ROLE_TITLES[role]}. Your measures are marked.`;
  };

  const renderBriefing = (role: RoleId) => {
    const body = q('[data-briefing-body]');
    if (!body) return;
    const r = cfg.roles[role];
    body.innerHTML = `<details class="ex-briefing__box"${state.at === 0 && !state.checked.length ? ' open' : ''}><summary>${esc(ROLE_TITLES[role])}: the company from your chair</summary><div class="ex-briefing__inner"><div class="prose small">${r.brief}</div><div class="ex-briefing__grid"><section><p class="ex-role__label">Answers for</p><ul class="ex-role__list">${r.priorities
      .map((p) => `<li>${p}</li>`)
      .join('')}</ul></section><section><p class="ex-role__label">Judged on</p><ul class="ex-role__list">${r.goals.map((g) => `<li>${esc(g.label)}</li>`).join('')}</ul></section></div></div></details>`;
  };

  const renderRail = () => {
    const rail = q('[data-rail]');
    if (!rail) return;
    const items = FLOW.map((st, i) => {
      const done = i < state.at;
      const now = i === state.at;
      const title = cfg.stages.find((s) => s.id === st)?.title ?? st;
      const stateWord = done ? 'Done' : now ? 'Now' : 'To come';
      const inner = `<span class="ex-rail__no">${i + 1}</span><span class="ex-rail__name">${esc(title)}</span><span class="ex-rail__state">${stateWord}</span>`;
      return `<li class="ex-rail__step${done ? ' is-done' : ''}"${now ? ' aria-current="step"' : ''}>${done || now ? `<a href="#stage-${st}" data-goto="${st}">${inner}</a>` : `<span class="ex-rail__off">${inner}</span>`}</li>`;
    });
    const open = state.at >= DEBRIEF;
    items.push(
      `<li class="ex-rail__step"${open ? ' aria-current="step"' : ''}>${open ? '<a href="#debrief" data-goto="debrief">' : '<span class="ex-rail__off">'}<span class="ex-rail__no">${FLOW.length + 1}</span><span class="ex-rail__name">The debrief</span><span class="ex-rail__state">${open ? 'Open' : 'To come'}</span>${open ? '</a>' : '</span>'}</li>`,
    );
    rail.innerHTML = items.join('');
  };

  /* ---------------- Questions ---------------- */

  const reveal = (el: HTMLElement | null) => {
    const d = el?.querySelector<HTMLDetailsElement>('[data-answer]') ?? (el?.matches('[data-answer]') ? (el as HTMLDetailsElement) : null);
    if (d) {
      d.classList.add('is-revealed');
      d.open = true;
    }
  };

  const renderChoice = (id: string) => {
    const box = q(`.ex-q[data-q="${id}"]`);
    const key = cfg.questions[id];
    if (!box || !key) return;
    const chosen = typeof state.answers[id] === 'string' ? (state.answers[id] as string) : undefined;
    qa<HTMLInputElement>('input[type="radio"]', box).forEach((r) => (r.checked = r.value === chosen));
    const checked = state.checked.includes(id);
    qa<HTMLInputElement>('input[type="radio"]', box).forEach((r) => (r.disabled = checked));
    qa('[data-act="check"]', box).forEach((b) => (b.hidden = checked));
    const verdict = q('[data-verdict]', box);
    if (!checked || !chosen || !verdict) {
      if (verdict) verdict.hidden = true;
      return;
    }
    const right = chosen === key.correct;
    qa('.ex-opt', box).forEach((o) => {
      o.classList.toggle('is-chosen', o.dataset.opt === chosen);
      o.classList.toggle('is-right', checked && o.dataset.opt === key.correct);
    });
    const opt = key.options?.[chosen];
    verdict.hidden = false;
    verdict.className = `ex-verdict ex-verdict--${right ? 'right' : 'wrong'}`;
    verdict.setAttribute('tabindex', '-1');
    verdict.innerHTML = `<p class="ex-verdict__head">${right ? 'Right.' : 'Not quite.'} <span class="ex-verdict__yours">Your answer: ${opt?.text ?? ''}</span></p><p>${opt?.feedback ?? ''}</p>${
      right ? '' : `<p class="small">The full explanation of every option is below.</p>`
    }`;
    reveal(box);
  };

  const renderNumber = (id: string, answer: number | undefined, tolerance: number | undefined, unit: string | undefined) => {
    const box = q(`.ex-q[data-q="${id}"]`);
    if (!box) return;
    const input = q<HTMLInputElement>('[data-input]', box);
    const typed = typeof state.answers[id] === 'string' ? (state.answers[id] as string) : '';
    if (input && document.activeElement !== input) input.value = typed;
    const checked = state.checked.includes(id);
    if (input) input.readOnly = checked;
    qa('[data-act="check"]', box).forEach((b) => (b.hidden = checked));
    const verdict = q('[data-verdict]', box);
    if (!verdict) return;
    if (!checked || answer === undefined || tolerance === undefined) {
      verdict.hidden = true;
      return;
    }
    const v = parseTyped(typed);
    const right = v !== null && answerRight(v, answer, tolerance);
    verdict.hidden = false;
    verdict.className = `ex-verdict ex-verdict--${right ? 'right' : 'wrong'}`;
    verdict.setAttribute('tabindex', '-1');
    verdict.innerHTML = `<p class="ex-verdict__head">${right ? 'Right.' : 'Not quite.'} <span class="ex-verdict__yours">Your answer: ${esc(typed)}${unit === 'percent' && !/%/.test(typed) ? '%' : ''}. The engine's: ${esc(unitWords(unit, answer))}.</span></p><p class="small">The working is below.</p>`;
    reveal(box);
  };

  const renderCauses = () => {
    const box = q('.ex-q[data-q="causes"]');
    if (!box) return;
    const chosen = Array.isArray(state.answers.causes) ? (state.answers.causes as string[]) : [];
    const checked = state.checked.includes('causes');
    qa<HTMLInputElement>('input[type="checkbox"]', box).forEach((c) => {
      c.checked = chosen.includes(c.value);
      c.disabled = checked;
    });
    qa('[data-act="check"]', box).forEach((b) => (b.hidden = checked));
    const verdict = q('[data-verdict]', box);
    if (!checked || !verdict) {
      if (verdict) verdict.hidden = true;
      return;
    }
    let found = 0;
    let wrong = 0;
    const causes = cfg.evidence.items.filter((e) => e.verdict === 'cause').length;
    for (const e of cfg.evidence.items) {
      const card = q(`[data-ev="${e.id}"]`, box);
      const mark = card ? q('[data-mark]', card) : null;
      const picked = chosen.includes(e.id);
      if (e.verdict === 'cause' && picked) found++;
      if (e.verdict === 'not' && picked) wrong++;
      const words =
        e.verdict === 'cause'
          ? picked
            ? 'You chose it, and it is a cause.'
            : 'You left it out, but it is a cause.'
          : e.verdict === 'partial'
            ? picked
              ? 'You chose it: it is partly a cause.'
              : 'You left it out: it is partly a cause.'
            : picked
              ? 'You chose it, but the evidence does not support it.'
              : 'You rightly left it out.';
      const good = (e.verdict === 'cause' && picked) || (e.verdict === 'not' && !picked) || e.verdict === 'partial';
      if (card) {
        card.classList.toggle('is-good', good);
        card.classList.toggle('is-bad', !good);
      }
      if (mark) {
        mark.hidden = false;
        mark.textContent = words;
      }
      reveal(card);
    }
    verdict.hidden = false;
    verdict.className = `ex-verdict ex-verdict--${found === causes && wrong === 0 ? 'right' : 'mixed'}`;
    verdict.setAttribute('tabindex', '-1');
    verdict.innerHTML = `<p class="ex-verdict__head">You found ${found} of the ${causes} causes${wrong ? `, and chose ${wrong} the evidence does not support` : ', and chose nothing the evidence does not support'}.</p><p class="small">Each piece of evidence now says why.</p>`;
  };

  const renderStrategy = () => {
    const box = q('.ex-q[data-q="strategy"]');
    if (!box) return;
    qa<HTMLInputElement>('input[type="radio"]', box).forEach((r) => {
      r.checked = r.value === state.strategy;
      r.disabled = state.checked.includes('strategy');
    });
    qa('[data-act="check"]', box).forEach((b) => (b.hidden = state.checked.includes('strategy')));
    const verdict = q('[data-verdict]', box);
    const s = cfg.strategies.find((x) => x.id === state.strategy);
    if (!state.checked.includes('strategy') || !s || !verdict) {
      if (verdict) verdict.hidden = true;
      return;
    }
    const FIT = { strong: 'a strong fit with the evidence', conditional: 'a conditional fit with the evidence', weak: 'a weak fit with the evidence' } as const;
    qa('.ex-strat', box).forEach((el) => el.classList.toggle('is-chosen', el.dataset.strat === s.id));
    verdict.hidden = false;
    verdict.className = `ex-verdict ex-verdict--${s.fit === 'strong' ? 'right' : s.fit === 'weak' ? 'wrong' : 'mixed'}`;
    verdict.setAttribute('tabindex', '-1');
    verdict.innerHTML = `<p class="ex-verdict__head">You will lead with ${esc(s.label)}: ${FIT[s.fit]}.</p><p class="small">Each strategy now shows how well it fits. Your plan for ${esc(core.plan[0]?.label ?? '')} starts from this strategy's figures, and you can change every one of them.</p>`;
    qa('.ex-strat', box).forEach((el) => reveal(el));
  };

  const renderQuestions = () => {
    for (const [id, key] of Object.entries(cfg.questions)) {
      if (key.kind === 'choice') renderChoice(id);
      else renderNumber(id, key.answer, key.tolerance, key.unit);
    }
    renderCauses();
    renderStrategy();
    const after = q('[data-after]');
    if (after) after.classList.toggle('is-open', questionIds('finance').every((id) => state.checked.includes(id)));
  };

  /* ---------------- The plan ---------------- */

  /** The figures the form opens with: the draft, else last year's plan, else the strategy's, else the last history year's. */
  const formValues = (): Levers => {
    if (state.draft) return state.draft;
    const k = state.plan.length;
    const s = cfg.strategies.find((x) => x.id === state.strategy);
    const preset = s?.plan[k];
    if (k === 0 && preset) return { ...preset };
    const last = state.plan[k - 1];
    // A cut and a machine are one-off decisions whose effects last; the recurring levers carry on.
    if (last) return { ...last, costCut: 0, capacity: 0 };
    return { ...core.rules.baseline };
  };

  let problems: LeverProblem[] = [];
  const money = (v: number) => fmtMoneyCompact(v, ctx.symbol);

  const formHtml = (): string => {
    const k = state.plan.length;
    const label = core.plan[k]?.label ?? '';
    const s = cfg.strategies.find((x) => x.id === state.strategy);
    const from = state.draft
      ? ''
      : k === 0 && s
        ? `It opens with the figures of the strategy you chose, ${s.label}; change any of them.`
        : k > 0
          ? `It opens with last year's price change, marketing, people programme and spending abroad. The efficiency programme and machinery start at none: each is a one-off decision whose effect lasts.`
          : '';
    return `${from ? `<p class="small ex-form__from">${esc(from)}</p>` : ''}${allocationFormHtml(label, formValues(), core.rules, ctx, problems, k > 0 ? state.plan[k - 1] : undefined)}`;
  };

  const renderAllocate = () => {
    const slot = q('[data-form-slot]');
    if (!slot) return;
    if (state.at === 6) slot.innerHTML = formHtml();
    else if (state.plan[0]) slot.innerHTML = `<h3 class="ex-sub">Your plan for ${esc(core.plan[0]?.label ?? '')}</h3>${planTableHtml([{ label: core.plan[0]?.label ?? '', levers: state.plan[0] }], ctx, 'Your first year', core.rules.budget)}<p class="small">Its results are in the next stage.</p>`;
    else slot.innerHTML = '';
  };

  const renderYears = () => {
    const slot = q('[data-years]');
    if (!slot) return;
    if (state.at < 7) {
      slot.innerHTML = '';
      return;
    }
    const parts: string[] = [];
    run.years.forEach((r, k) => {
      const prev = k === 0 ? lastHistory() : run.years[k - 1];
      if (!prev) return;
      parts.push(yearResultHtml(r, prev, ctx, { level: 3, id: `ex-y${r.label}`, news: cfg.news[r.label], focusable: true }));
    });
    const k = state.plan.length;
    if (k < Y && state.at === 7) {
      parts.push(formHtml());
      parts.push(`<div class="bb-actions"><button type="button" class="btn btn--small" data-act="undo-year">Undo ${esc(core.plan[k - 1]?.label ?? '')}</button></div>`);
    } else if (state.at === 7) {
      parts.push(
        `<div class="bb-actions"><button type="button" class="btn btn--primary" data-act="to-evaluate">Continue to the evaluation</button><button type="button" class="btn btn--small" data-act="undo-year">Undo ${esc(core.plan[Y - 1]?.label ?? '')}</button></div>`,
      );
    }
    slot.innerHTML = parts.join('');
  };

  const renderEvaluate = () => {
    const slot = q('[data-eval]');
    const role = state.role;
    if (!slot) return;
    const end = run.years[run.years.length - 1];
    const start = lastHistory();
    if (state.at < 8 || !end || !start || !role) {
      slot.innerHTML = '';
      return;
    }
    const ev = cfg.evaluation;
    const all = years();
    const fill = (t: string) => fillTokens(t, { years: all, focus: end, derived: cfg.derived }, ctx);
    const answer = figureValue(ev.answer, all);
    const typed = typeof state.answers[ev.id] === 'string' ? (state.answers[ev.id] as string) : '';
    const checked = state.checked.includes(ev.id);
    const v = parseTyped(typed);
    const right = checked && v !== null && answer !== null && answerRight(v, answer, ev.tolerance);
    const ids: KpiId[] = ['revenue', 'pbit', 'profitMargin', 'roce', 'netCash', 'marketShare', 'brand', 'quality', 'morale', 'turnover'];
    slot.innerHTML = `<h3 class="ex-sub">Your plan, ${esc(start.label)} against ${esc(end.label)}</h3>
${beforeAfterHtml(start, end, ids, ctx, `Your plan: ${start.label} against ${end.label}`)}
<h4 class="label label--ink">Your goals as ${esc(ROLE_IN_TEXT[role])}</h4>
<div class="bb-scores">${scorecardHtml(role, scorecard(roles, run, role), ctx, 5, true)}</div>
<div class="ex-q" data-q="${esc(ev.id)}" data-kind="evaluate" role="group" aria-labelledby="ex-eval-p">
<p class="ex-q__prompt" id="ex-eval-p"><span class="ex-q__no">Question</span> ${esc(fill(ev.prompt))}</p>
<div class="field ex-q__field"><label for="ex-eval-in">Your answer, as a percentage</label><input class="input ex-q__input" type="text" inputmode="decimal" autocomplete="off" id="ex-eval-in" data-input value="${esc(typed)}"${checked ? ' readonly' : ''} aria-describedby="ex-eval-msg"><span class="field__error" id="ex-eval-msg" data-msg></span></div>
${checked ? '' : `<div class="ex-q__actions"><button type="button" class="btn btn--small" data-act="check" data-q="${esc(ev.id)}">Check my answer</button></div>`}
${
  checked && answer !== null
    ? `<div class="ex-verdict ex-verdict--${right ? 'right' : 'wrong'}" data-verdict tabindex="-1"><p class="ex-verdict__head">${right ? 'Right.' : 'Not quite.'} <span class="ex-verdict__yours">Your answer: ${esc(typed)}. The engine's: ${esc(unitWords(ev.unit, answer))}.</span></p><div class="prose small">${rich(fill(ev.working))}</div></div>`
    : ''
}
</div>
<div class="ex-reflect-form">${cfg.reflections
      .map(
        (r) =>
          `<div class="field"><label for="ex-r-${esc(r.id)}">${esc(r.label)}</label><span class="field__hint" id="ex-r-${esc(r.id)}-hint">${esc(r.hint)} Optional; it stays on this device.</span><textarea class="textarea" id="ex-r-${esc(r.id)}" rows="3" data-reflect="${esc(r.id)}" aria-describedby="ex-r-${esc(r.id)}-hint">${esc(state.reflections[r.id] ?? '')}</textarea></div>`,
      )
      .join('')}</div>
${state.at === 8 ? `<div class="bb-actions"><button type="button" class="btn btn--primary" data-act="to-debrief">Open the debrief</button><span class="field__error" data-debrief-msg></span></div>` : ''}`;
  };

  const renderDebrief = () => {
    const locked = q('[data-debrief-locked]');
    const yours = q('[data-yours]');
    const body = q('[data-debrief-body]');
    const open = state.at >= DEBRIEF && Boolean(state.role) && run.years.length === Y;
    if (locked) locked.hidden = open;
    if (body) body.hidden = !open;
    if (!yours) return;
    if (!open || !state.role) {
      yours.innerHTML = '';
      return;
    }
    const role = state.role;
    const labels = core.plan.map((p) => p.label);
    const mine: PlanRow = { label: 'Your plan', summary: summarize(roles, run), years: labels, mine: true };
    const rows: PlanRow[] = [mine, ...cfg.compare];
    const attr = attribution(core, state.plan);
    const exported = state.plan.some((l) => l.international > 0);
    const fx = exported ? fxHtml('Your plan', mine.summary, summarize(roles, runPlan(core, state.plan, { fxShift: 8 })), summarize(roles, runPlan(core, state.plan, { fxShift: -8 })), 8, ctx) : '';
    const cards = [role, ...ROLE_IDS.filter((r) => r !== role)].map((r) => scorecardHtml(r, scorecard(roles, run, r), ctx, 5, r === role)).join('');
    yours.innerHTML = `<section class="ex-yours" aria-labelledby="ex-yours-h">
<h3 class="bb-debrief__h" id="ex-yours-h">Your plan against the strategies</h3>
<p class="small muted">Your plan and each strategy's, played from the same start by the same engine.</p>
${planTableHtml(state.plan.map((l, k) => ({ label: labels[k] ?? '', levers: l })), ctx, 'Your plan, year by year', core.rules.budget)}
${comparisonHtml(rows, ctx, 'Your plan compared with every strategy')}
<figure class="ex-figure">${profitBarsHtml(rows, ctx, 'ex-bars-yours')}<figcaption class="bb-exhibit__source">Profit after tax over the three years; yours is marked. The figures are in the table above.</figcaption></figure>
<h4 class="label label--ink">Your plan, lever by lever</h4>
<p class="small">Each row runs your plan again with one lever kept at its ${esc(lastHistory()?.label ?? '')} level in every year, and shows what that lever added. The levers work on each other, so the rows need not add up.</p>
${attributionHtml(attr, ctx, 'What each of your levers did', labels[0] ?? '', labels[labels.length - 1] ?? '')}
${exported ? `<h4 class="label label--ink">Your exposure to the exchange rate</h4>${fx}` : ''}
<h4 class="label label--ink">How each role would judge your plan</h4>
<div class="bb-scores">${cards}</div>
</section>`;
  };

  /* ---------------- Stages ---------------- */

  const renderStages = () => {
    FLOW.forEach((st, i) => {
      const sec = q(`[data-stage="${st}"]`);
      if (!sec) return;
      const body = q('[data-body]', sec);
      const head = q('[data-state]', sec);
      const done = i < state.at;
      const now = i === state.at;
      sec.hidden = !(done || now);
      sec.classList.toggle('is-done', done);
      sec.classList.toggle('is-current', now);
      const open = now || reviewing.has(st);
      if (body) body.hidden = !open;
      if (head) {
        head.innerHTML = done
          ? `<span class="ex-done">Done</span> <button type="button" class="btn btn--small" data-act="toggle" data-stage="${st}" aria-expanded="${open}" aria-controls="stage-${st}-body">${open ? 'Hide this stage' : 'Review this stage'}</button>`
          : now
            ? '<span class="ex-now">Now</span>'
            : '';
      }
      if (body && !body.id) body.id = `stage-${st}-body`;
      const lens = q('[data-lens]', sec);
      if (lens && state.role && (ANALYSIS as string[]).includes(st)) {
        const text = cfg.roles[state.role].lens[st as keyof ExecConfig['roles'][RoleId]['lens']];
        lens.hidden = !text;
        lens.innerHTML = `<span class="ex-lens__who">As ${esc(ROLE_IN_TEXT[state.role])}</span> ${text ?? ''}`;
      }
      qa<HTMLButtonElement>('[data-act="next"]', sec).forEach((b) => (b.hidden = !now));
    });
    const deb = q('[data-stage="debrief"]');
    if (deb) deb.hidden = state.at < 8;
  };

  const focusLater = (sel?: string) => {
    if (!sel) return;
    window.requestAnimationFrame(() => {
      const el = root.querySelector<HTMLElement>(sel);
      if (!el) return;
      el.focus({ preventScroll: true });
      el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    });
  };

  const render = (focus?: string) => {
    const picking = !state.role || choosingRole;
    const roleBox = q('[data-roles]');
    const play = q('[data-play]');
    if (roleBox) roleBox.hidden = !picking;
    if (play) play.hidden = picking;
    if (picking) {
      const wanted = state.role ?? new URLSearchParams(window.location.search).get('role') ?? '';
      qa<HTMLInputElement>('[data-roles] input[type="radio"]').forEach((r) => (r.checked = r.value === wanted));
    }
    qa('.ex-stage').forEach((s) => (s.hidden = picking ? true : s.hidden));
    if (!picking && state.role) {
      renderDashboard(state.role);
      renderBriefing(state.role);
      renderRail();
      renderStages();
      renderQuestions();
      renderAllocate();
      renderYears();
      renderEvaluate();
      renderDebrief();
    }
    save();
    focusLater(focus);
  };

  /* ---------------- Behaviour ---------------- */

  const readForm = (form: HTMLElement): Partial<Record<LeverId, number>> => {
    const out: Partial<Record<LeverId, number>> = {};
    for (const id of LEVER_IDS) {
      const input = form.querySelector<HTMLInputElement>(`[data-lever="${id}"]`);
      const v = input ? parseTyped(input.value) : null;
      if (v !== null) out[id] = fromField(id, v);
    }
    return out;
  };

  const updateMeter = (form: HTMLElement) => {
    const vals = readForm(form);
    const spend = BUDGET_LEVERS.reduce((a, id) => a + (vals[id] ?? 0), 0);
    const over = spend > core.rules.budget;
    const meter = form.querySelector<HTMLElement>('[data-meter]');
    const text = form.querySelector<HTMLElement>('[data-meter-text]');
    const fill = form.querySelector<HTMLElement>('.ex-meter__fill');
    meter?.classList.toggle('is-over', over);
    if (text) text.innerHTML = `Budget allocated: <strong>${esc(money(spend))}</strong> of ${esc(money(core.rules.budget))}${over ? `, ${esc(money(spend - core.rules.budget))} too much` : `, ${esc(money(core.rules.budget - spend))} left in the bank`}.`;
    if (fill) fill.style.width = `${Math.min(100, (spend / core.rules.budget) * 100)}%`;
  };

  const commit = (form: HTMLElement) => {
    const vals = readForm(form);
    problems = checkLevers(core.rules, vals, money);
    // A field left empty or not a number is reported as such.
    for (const id of LEVER_IDS) {
      const input = form.querySelector<HTMLInputElement>(`[data-lever="${id}"]`);
      if (input && parseTyped(input.value) === null && !problems.some((p) => p.field === id)) problems.push({ field: id, message: 'Enter a number.' });
    }
    const k = state.plan.length;
    if (problems.length) {
      // Keep what was typed, so the corrections start from it.
      const kept: Levers = { ...formValues() };
      for (const id of LEVER_IDS) if (typeof vals[id] === 'number') kept[id] = vals[id] as number;
      state.draft = kept;
      render();
      const first = problems[0];
      const msg = q('[data-form-msg]');
      const n = problems.length;
      if (msg) msg.textContent = `${n === 1 ? 'One figure needs' : `${n} figures need`} changing before the plan can be committed.`;
      announce(status, `${n === 1 ? 'One figure needs' : `${n} figures need`} changing: ${problems.map((p) => p.message).join(' ')}`);
      if (first) root.querySelector<HTMLElement>(first.field === 'budget' ? '[data-lever="marketing"]' : `[data-lever="${first.field}"]`)?.focus();
      return;
    }
    const levers = Object.fromEntries(LEVER_IDS.map((id) => [id, vals[id] as number])) as Levers;
    state.plan.push(levers);
    state.draft = undefined;
    problems = [];
    if (state.at === 6) state.at = 7;
    run = runPlan(core, state.plan);
    const r = run.years[k];
    const prev = k === 0 ? lastHistory() : run.years[k - 1];
    render(r ? `#ex-y${r.label}-h` : undefined);
    if (r && prev) announce(status, `${r.label} committed. ${headline(r, prev, ctx)}.`);
  };

  const check = (id: string, button: HTMLElement) => {
    // The button carries data-q too, so look for the question itself.
    const box = button.closest<HTMLElement>('.ex-q');
    const msg = box ? q('[data-msg]', box) : null;
    const say = (m: string) => {
      if (msg) msg.textContent = m;
      announce(status, m);
    };
    if (id === 'causes') {
      const chosen = qa<HTMLInputElement>('[data-q="causes"] input[type="checkbox"]:checked').map((c) => c.value);
      if (chosen.length < cfg.evidence.min) return say(`Choose at least ${cfg.evidence.min} pieces of evidence first.`);
      state.answers.causes = chosen;
    } else if (id === 'strategy') {
      const picked = q<HTMLInputElement>('[data-q="strategy"] input[type="radio"]:checked');
      if (!picked) return say('Choose a strategy first.');
      state.strategy = picked.value;
      state.draft = undefined;
    } else {
      const key = cfg.questions[id];
      const isEval = id === cfg.evaluation.id;
      if (key?.kind === 'choice') {
        const picked = box ? q<HTMLInputElement>('input[type="radio"]:checked', box) : null;
        if (!picked) return say('Choose an answer first.');
        state.answers[id] = picked.value;
      } else if (key?.kind === 'number' || isEval) {
        const input = box ? q<HTMLInputElement>('[data-input]', box) : null;
        const v = input ? parseTyped(input.value) : null;
        if (v === null) {
          input?.setAttribute('aria-invalid', 'true');
          return say('Enter a number, such as 4.2.');
        }
        input?.removeAttribute('aria-invalid');
        state.answers[id] = input?.value.trim() ?? '';
      } else return;
    }
    if (msg) msg.textContent = '';
    if (!state.checked.includes(id)) state.checked.push(id);
    render(`.ex-q[data-q="${id}"] [data-verdict]`);
    const verdict = q(`.ex-q[data-q="${id}"] [data-verdict]`);
    announce(status, verdict?.textContent?.trim().split('. ').slice(0, 2).join('. ') ?? 'Checked.');
  };

  root.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const goto = target.closest<HTMLAnchorElement>('a[data-goto]');
    if (goto) {
      const st = goto.dataset.goto as StageId | 'debrief';
      if (st !== 'debrief') reviewing.add(st);
      e.preventDefault();
      render(st === 'debrief' ? '#debrief-h' : `#stage-${st}-h`);
      return;
    }
    const btn = target.closest<HTMLButtonElement>('button[data-act]');
    if (!btn || !root.contains(btn)) return;
    const act = btn.dataset.act;

    if (act === 'role') {
      const picked = q<HTMLInputElement>('[data-roles] input[type="radio"]:checked');
      const msg = q('[data-role-msg]');
      if (!picked || !isRole(picked.value)) {
        if (msg) msg.textContent = 'Choose a role first.';
        announce(status, 'Choose a role first.');
        return;
      }
      if (msg) msg.textContent = '';
      state.role = picked.value;
      choosingRole = false;
      const st = FLOW[Math.min(state.at, FLOW.length - 1)];
      render(state.at >= DEBRIEF ? '#debrief-h' : `#stage-${st}-h`);
      announce(status, `You are the ${ROLE_IN_TEXT[picked.value]}. ${state.at >= DEBRIEF ? 'The debrief is open.' : `Stage ${state.at + 1} is open.`}`);
      return;
    }
    if (!state.role) return;

    if (act === 'check') {
      check(btn.dataset.q ?? '', btn);
    } else if (act === 'next') {
      const st = btn.dataset.stage as StageId;
      const i = FLOW.indexOf(st);
      const sec = btn.closest<HTMLElement>('.ex-stage');
      const msg = sec ? q('[data-next-msg]', sec) : null;
      if (!stageDone(st)) {
        const m = st === 'strategy' ? 'Choose a strategy and confirm it first.' : 'Check your answer to every question in this stage first.';
        if (msg) msg.textContent = m;
        announce(status, m);
        return;
      }
      if (msg) msg.textContent = '';
      state.at = Math.max(state.at, i + 1);
      reviewing.delete(st);
      const next = FLOW[i + 1];
      render(next ? `#stage-${next}-h` : undefined);
      announce(status, `Stage ${i + 2} is open.`);
    } else if (act === 'toggle') {
      const st = btn.dataset.stage as StageId;
      if (reviewing.has(st)) reviewing.delete(st);
      else reviewing.add(st);
      render();
      root.querySelector<HTMLButtonElement>(`[data-stage="${st}"] [data-act="toggle"]`)?.focus();
    } else if (act === 'undo-year') {
      const popped = state.plan.pop();
      state.draft = popped;
      problems = [];
      if (state.plan.length === 0) state.at = 6;
      else state.at = 7;
      run = runPlan(core, state.plan);
      render('#ex-form-h');
      announce(status, `The last year was undone. Its figures are back in the form.`);
    } else if (act === 'to-evaluate') {
      state.at = 8;
      render('#stage-evaluate-h');
      announce(status, 'Stage 9 is open: the evaluation.');
    } else if (act === 'to-debrief') {
      if (!state.checked.includes(cfg.evaluation.id)) {
        const msg = q('[data-debrief-msg]');
        const m = 'Check your answer to the question first.';
        if (msg) msg.textContent = m;
        announce(status, m);
        return;
      }
      state.at = DEBRIEF;
      render('#debrief-h');
      announce(status, 'The debrief is open.');
    } else if (act === 'restart') {
      if (!window.confirm('Start again from the first stage? Your answers and your plan will be cleared; your role is kept.')) return;
      state.at = 0;
      state.answers = {};
      state.checked = [];
      state.strategy = undefined;
      state.plan = [];
      state.draft = undefined;
      state.reflections = {};
      problems = [];
      reviewing.clear();
      run = runPlan(core, state.plan);
      // Clear what the browser kept in the form controls.
      qa<HTMLInputElement>('.ex-stage input').forEach((i) => {
        if (i.type === 'radio' || i.type === 'checkbox') i.checked = false;
        else i.value = '';
      });
      render('#stage-finance-h');
      announce(status, 'Started again from the first stage. Your role is unchanged.');
    } else if (act === 'change-role') {
      choosingRole = true;
      render('#ex-roles-h');
      announce(status, 'Choose a role. Your work so far is kept.');
    }
  });

  root.addEventListener('submit', (e) => {
    const form = (e.target as HTMLElement).closest<HTMLElement>('[data-form]');
    if (!form) return;
    e.preventDefault();
    commit(form);
  });

  root.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement | HTMLTextAreaElement;
    const form = t.closest<HTMLElement>('[data-form]');
    if (form && t instanceof HTMLInputElement && t.dataset.lever) {
      const id = t.dataset.lever as LeverId;
      const v = parseTyped(t.value);
      const base = formValues();
      state.draft = { ...base, ...(v !== null ? { [id]: fromField(id, v) } : {}) };
      t.removeAttribute('aria-invalid');
      const err = form.querySelector<HTMLElement>(`[data-err="${id}"]`);
      if (err) err.textContent = '';
      problems = problems.filter((p) => p.field !== id && p.field !== 'budget');
      updateMeter(form);
      save();
      return;
    }
    if (t instanceof HTMLTextAreaElement && t.dataset.reflect) {
      state.reflections[t.dataset.reflect] = t.value;
      save();
      return;
    }
    if (t instanceof HTMLInputElement && t.matches('[data-input]')) {
      const box = t.closest<HTMLElement>('.ex-q');
      const id = box?.dataset.q;
      if (id && !state.checked.includes(id)) {
        state.answers[id] = t.value;
        // Clear an earlier message while typing, not on leaving the field: clearing it then would move the button being clicked.
        t.removeAttribute('aria-invalid');
        const msg = box ? q('[data-msg]', box) : null;
        if (msg) msg.textContent = '';
        save();
      }
    }
  });

  root.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    const box = t.closest<HTMLElement>('.ex-q');
    const id = box?.dataset.q;
    if (t.name === 'ex-role') {
      const msg = q('[data-role-msg]');
      if (msg) msg.textContent = '';
      return;
    }
    if (!id || state.checked.includes(id) || (t.type !== 'radio' && t.type !== 'checkbox')) return;
    if (id === 'causes') state.answers.causes = qa<HTMLInputElement>('[data-q="causes"] input[type="checkbox"]:checked').map((c) => c.value);
    else if (id === 'strategy') {
      if (t.type === 'radio') state.strategy = t.value;
    } else if (t.type === 'radio') state.answers[id] = t.value;
    const msg = box ? q('[data-msg]', box) : null;
    if (msg) msg.textContent = '';
    save();
  });

  render();
});

