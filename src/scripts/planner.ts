/**
 * The revision planner in the browser (/revision/planner/). The form's
 * values and the plan are kept in bb:planner; the plan itself comes from
 * makePlan() in src/lib/planner.ts. The reader's results, read from this
 * browser by src/lib/progress.ts, offer the weak subtopics to put first and
 * tell the planner which subtopics are already studied. Sessions are marked
 * done with a checkbox, the plan is made again keeping what is done,
 * printed, exported to a calendar file, and cleared after a confirmation.
 * When storage is blocked the plan works for the visit.
 */
import { announce, each, escapeHtml as h, readConfig } from './ix';
import { LEARNER_KEY, STUDIED_KEY, parseLog, parseStudied } from '../lib/learner';
import { localDay, resultsByCode, subtopicStates, weakAreas, type EvidenceConfig, type ProgressSubtopic } from '../lib/progress';
import {
  KIND_LABELS,
  PLANNER_KEY,
  RULES,
  SESSION_HOW,
  clearPlan,
  dayMonth,
  fmtMinutes,
  makePlan,
  parsePlanner,
  plannerIcs,
  plannerProgress,
  sessionHref,
  sessionTitle,
  sessionsFor,
  setDone,
  shortDay,
  longDay,
  topicsAt,
  weeksOf,
  type Field,
  type Level,
  type PlannerContext,
  type PlannerInput,
  type PlannerState,
  type Session,
} from '../lib/planner';
import { readItem, siteItems, storageWorks, writeItem } from './storage';

interface Config {
  ctx: PlannerContext;
  evidence: EvidenceConfig;
  subtopics: ProgressSubtopic[];
  units: Array<{ number: number; title: string }>;
}

const FIELDS: Field[] = ['exam', 'start', 'level', 'hours', 'days', 'topics'];

function download(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.hidden = true;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

each('[data-ix="planner"]', (root) => {
  const cfg = readConfig<Config>(root);
  const { ctx } = cfg;
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const live = $('[data-live]');
  const say = (text: string) => announce(live, text);
  const form = $<HTMLFormElement>('[data-form]');
  const out = $('[data-out]');
  const actions = $('[data-actions]');
  const canStore = storageWorks();
  if (!canStore) {
    const note = $('[data-unavailable]');
    if (note) note.hidden = false;
  }
  if (!form || !out) return;

  const today = () => localDay(new Date());
  let state: PlannerState = parsePlanner(readItem(PLANNER_KEY));
  const save = () => (canStore ? writeItem(PLANNER_KEY, JSON.stringify(state)) : false);

  /* ---------- What this browser knows about the reader ---------- */

  const reading = () => {
    const items = siteItems() ?? {};
    const log = parseLog(items[LEARNER_KEY]);
    const results = resultsByCode(items, cfg.evidence, log);
    const states = subtopicStates(cfg.subtopics, log, parseStudied(items[STUDIED_KEY]), results);
    return { results, states };
  };
  let known = reading();

  /* ---------- The form ---------- */

  const field = <T extends HTMLElement>(name: string) => form.elements.namedItem(name) as T | null;
  const inputs = (name: string) => [...form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)];
  const levelOf = (): Level => (inputs('level').find((r) => r.checked)?.value === 'SL' ? 'SL' : 'HL');

  const fill = (i: PlannerInput) => {
    const exam = field<HTMLInputElement>('exam');
    const start = field<HTMLInputElement>('start');
    const hours = field<HTMLInputElement>('hours');
    if (exam) exam.value = i.exam;
    if (start) start.value = i.start || today();
    if (hours) hours.value = String(i.hours);
    for (const r of inputs('level')) r.checked = r.value === i.level;
    for (const c of inputs('days')) c.checked = i.days.includes(Number(c.value));
    for (const c of inputs('topics')) c.checked = i.topics.includes(c.value);
    for (const c of inputs('weak')) c.checked = i.weak.includes(c.value);
  };

  const read = (): PlannerInput => ({
    exam: field<HTMLInputElement>('exam')?.value ?? '',
    start: field<HTMLInputElement>('start')?.value || today(),
    level: levelOf(),
    hours: Number((field<HTMLInputElement>('hours')?.value ?? '').replace(',', '.')),
    days: inputs('days').filter((c) => c.checked).map((c) => Number(c.value)),
    topics: inputs('topics').filter((c) => c.checked && !c.closest<HTMLElement>('[data-topic]')?.hidden).map((c) => c.value),
    weak: inputs('weak').filter((c) => c.checked && !c.closest<HTMLElement>('[data-topic]')?.hidden).map((c) => c.value),
    studied: known.states.filter((s) => s.studied).map((s) => s.code),
  });

  /** The form's choices kept as they change, so they are there on return even before a plan is made. */
  const keepInput = () => {
    state = { ...state, input: read() };
    save();
  };

  const levelDefault = (): Level => (document.documentElement.getAttribute('data-level') === 'SL' ? 'SL' : 'HL');
  fill(
    state.input ?? {
      exam: '',
      start: today(),
      level: levelDefault(),
      hours: 6,
      days: [1, 2, 3, 4, 5],
      topics: topicsAt(ctx, levelDefault()).map((t) => t.code),
      weak: [],
      studied: [],
    },
  );

  /** What the dashboard knows about each subtopic, beside its box. */
  const paintTopics = () => {
    const level = levelOf();
    const states = new Map(known.states.map((s) => [s.code, s]));
    const weak = new Map(weakAreas(known.results, cfg.subtopics, level).map((w) => [w.code, w]));
    for (const li of root.querySelectorAll<HTMLElement>('[data-topic]')) {
      const code = li.dataset.topic ?? '';
      li.hidden = level === 'SL' && li.dataset.hl === 'true';
      const st = states.get(code);
      const w = weak.get(code);
      const words = [w ? `weak: ${Math.round(w.score * 100)}% over ${w.n} results` : '', st?.completed ? 'marked complete' : st?.studied ? 'studied' : 'not studied yet'].filter(Boolean).join(', ');
      const el = li.querySelector<HTMLElement>('[data-topic-state]');
      if (el) el.textContent = words;
      li.classList.toggle('is-weak', Boolean(w));
    }
    const count = $('[data-topics-count]');
    const shown = inputs('topics').filter((c) => !c.closest<HTMLElement>('[data-topic]')?.hidden);
    if (count) count.textContent = `${shown.filter((c) => c.checked).length} of ${shown.length} at ${level}`;
    // The offer to put the weak areas first.
    const offer = $('[data-weak-offer]');
    const text = $('[data-weak-text]');
    if (offer && text) {
      const list = [...weak.values()];
      offer.hidden = list.length === 0;
      text.textContent = list.length
        ? `Your results in this browser show ${list.length === 1 ? 'one weak area' : `${list.length} weak areas`}: ${list.map((x) => `${x.code} ${x.title}`).join('; ')}.`
        : '';
    }
    const daysHint = $('[data-days-hint]');
    const hours = Number(field<HTMLInputElement>('hours')?.value);
    const days = inputs('days').filter((c) => c.checked).length;
    if (daysHint)
      daysHint.textContent =
        days && hours >= RULES.hours.min && hours <= RULES.hours.max && (hours * 60) / days >= RULES.minSlot
          ? (() => {
              const s = sessionsFor((hours * 60) / days);
              return `${days} ${days === 1 ? 'day' : 'days'} a week: ${s.perDay} ${s.perDay === 1 ? 'session' : 'sessions'} of ${fmtMinutes(s.slot)} on each.`;
            })()
          : 'The hours are shared equally between the days you choose.';
  };

  root.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach((b) =>
    b.addEventListener('click', () => {
      const how = b.dataset.pick;
      const states = new Map(known.states.map((s) => [s.code, s]));
      for (const c of inputs('topics')) {
        if (c.closest<HTMLElement>('[data-topic]')?.hidden) continue;
        c.checked = how === 'all' ? true : how === 'fresh' ? !states.get(c.value)?.studied : false;
      }
      paintTopics();
      keepInput();
      const n = inputs('topics').filter((c) => c.checked && !c.closest<HTMLElement>('[data-topic]')?.hidden).length;
      say(`${n} ${n === 1 ? 'subtopic' : 'subtopics'} chosen.`);
    }),
  );
  $('[data-weak-use]')?.addEventListener('click', () => {
    const weak = weakAreas(known.results, cfg.subtopics, levelOf()).map((w) => w.code);
    for (const c of inputs('topics')) if (weak.includes(c.value)) c.checked = true;
    for (const c of inputs('weak')) c.checked = weak.includes(c.value);
    paintTopics();
    keepInput();
    say(`${weak.length} weak ${weak.length === 1 ? 'area is' : 'areas are'} chosen and put first.`);
  });
  form.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    // Putting a subtopic first chooses it too.
    if (t.name === 'weak' && t.checked) {
      const pick = inputs('topics').find((c) => c.value === t.value);
      if (pick) pick.checked = true;
    }
    paintTopics();
    keepInput();
  });

  /* ---------- Errors ---------- */

  const formErr = $('[data-form-err]');
  const clearErrors = () => {
    for (const f of FIELDS) {
      const el = root.querySelector<HTMLElement>(`[data-err="${f}"]`);
      if (el) {
        el.textContent = '';
        el.hidden = true;
      }
    }
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    if (formErr) formErr.hidden = true;
  };
  const showError = (f: Field, text: string) => {
    const el = root.querySelector<HTMLElement>(`[data-err="${f}"]`);
    if (el) {
      el.textContent = text;
      el.hidden = false;
    }
    const target =
      f === 'days' ? inputs('days')[0] : f === 'topics' ? inputs('topics').find((c) => !c.closest<HTMLElement>('[data-topic]')?.hidden) : f === 'level' ? inputs('level')[0] : field<HTMLInputElement>(f);
    if (f === 'topics') {
      const box = $<HTMLDetailsElement>('[data-topics-box]');
      if (box) box.open = true;
    }
    if (f !== 'days' && f !== 'topics' && f !== 'level') target?.setAttribute('aria-invalid', 'true');
    if (formErr) {
      formErr.textContent = `The plan could not be made: ${text}`;
      formErr.hidden = false;
    }
    target?.focus();
    say(text);
  };

  /* ---------- The plan ---------- */

  const sessionHtml = (s: Session, done: boolean) => {
    const title = sessionTitle(s, ctx);
    const id = `pl-s-${s.id}`;
    return `<li class="pl-s pl-s--${s.kind}${done ? ' is-done' : ''}" data-s="${h(s.id)}">
      <span class="pl-s__check"><input type="checkbox" id="${id}" data-done="${h(s.id)}"${done ? ' checked' : ''} /><label for="${id}"><span class="sr-only">Done: </span><span class="pl-s__kind">${h(KIND_LABELS[s.kind])}</span> <span class="pl-s__min">${h(fmtMinutes(s.minutes))}</span></label></span>
      <span class="pl-s__main"><a class="pl-s__t" href="${h(sessionHref(s, ctx))}">${h(title)}</a><span class="pl-s__how">${h(SESSION_HOW[s.kind])}</span></span>
      <span class="pl-s__state" aria-hidden="true">${done ? 'Done' : ''}</span>
    </li>`;
  };

  const dayGroups = (list: Session[]) => {
    const days = new Map<string, Session[]>();
    for (const s of list) days.set(s.date, [...(days.get(s.date) ?? []), s]);
    return [...days.entries()];
  };

  const summaryHtml = () => {
    const plan = state.plan!;
    const p = plannerProgress(state, today());
    const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
    const kinds = state.sessions.reduce<Record<string, number>>((a, s) => ({ ...a, [s.kind]: (a[s.kind] ?? 0) + 1 }), {});
    const practice = (kinds.case ?? 0) + (kinds.calc ?? 0) + (kinds.paper3 ?? 0);
    const missed = p.overdue.length;
    return `<p class="pl-sum__k">Your plan, made ${h(state.made ? dayMonth(state.made.slice(0, 10)) : '')}</p>
      <h3 class="pl-sum__h">Your ${h(state.input?.level ?? '')} plan, to the examination on ${h(longDay(plan.exam))}</h3>
      <p>${p.total} sessions of ${h(fmtMinutes(plan.slot))}, ${h(fmtMinutes(p.minutes))} in all, from ${h(shortDay(state.sessions[0]?.date ?? plan.from))} to ${h(shortDay(plan.last))}: ${state.input?.topics.length ?? 0} subtopics each met at least twice (${kinds.learn ?? 0} learnt, ${kinds.review ?? 0} reviewed, ${kinds.retrieve ?? 0} retrievals), ${practice} practice sessions and ${kinds.timed ?? 0} timed. ${
        plan.buffer ? `${plan.buffer === 1 ? 'The day' : `The ${plan.buffer} days`} before the examination ${plan.buffer === 1 ? 'is' : 'are'} left free.` : ''
      }</p>
      <div class="pl-progress">
        <p class="pl-progress__fig"><span class="pl-progress__n">${p.done}</span> of ${p.total} sessions done <span class="pl-progress__pct">(${pct}%)</span>, ${h(fmtMinutes(p.minutesDone))} of ${h(fmtMinutes(p.minutes))}; ${p.twice} of ${p.topics} subtopics met twice</p>
        <span class="pl-progress__bar" aria-hidden="true"><span style="width:${pct}%"></span></span>
      </div>
      <ul class="pl-now">
        ${p.today.length ? `<li><strong>Today:</strong> ${p.today.map((s) => h(sessionTitle(s, ctx))).join('; ')}.</li>` : p.next ? `<li><strong>Next:</strong> ${h(sessionTitle(p.next, ctx))}, ${h(shortDay(p.next.date))}.</li>` : '<li>Every session is done.</li>'}
        ${missed ? `<li><strong>${missed} ${missed === 1 ? 'session is' : 'sessions are'} past and not done.</strong> Do ${missed === 1 ? 'it' : 'them'} when you can and tick ${missed === 1 ? 'it' : 'them'}, or make the plan again: what is done is kept, and the rest is planned from today.</li>` : ''}
      </ul>
      ${plan.warnings.length ? `<ul class="pl-warn">${plan.warnings.map((w) => `<li>${h(w)}</li>`).join('')}</ul>` : ''}`;
  };

  const weeksHtml = () => {
    const now = today();
    return weeksOf(state)
      .map((w) => {
        const done = w.sessions.filter((s) => state.done[s.id]).length;
        const head = w.n
          ? `Week ${w.n}<span class="pl-week__dates">${h(dayMonth(w.from))} to ${h(dayMonth(w.to))}</span>`
          : `Done before this plan<span class="pl-week__dates">${h(dayMonth(w.from))} to ${h(dayMonth(w.to))}</span>`;
        const current = w.n > 0 && w.from <= now && now <= w.to;
        return `<section class="pl-week${current ? ' is-current' : ''}" aria-labelledby="pl-w${w.n}" id="week-${w.n}">
          <h4 class="pl-week__h" id="pl-w${w.n}">${head}${current ? '<span class="pl-week__now">This week</span>' : ''}</h4>
          <p class="pl-week__meta">${done} of ${w.sessions.length} done, ${h(fmtMinutes(w.minutes))}</p>
          ${dayGroups(w.sessions)
            .map(([day, list]) => `<div class="pl-day-group${day === now ? ' is-today' : ''}"><p class="pl-day-group__h">${h(shortDay(day))}${day === now ? ' <span class="pl-week__now">Today</span>' : ''}</p><ol class="pl-sessions" role="list">${list.map((s) => sessionHtml(s, Boolean(state.done[s.id]))).join('')}</ol></div>`)
            .join('')}
        </section>`;
      })
      .join('');
  };

  const render = () => {
    const sum = $('[data-sum]');
    const weeks = $('[data-weeks]');
    const make = $('[data-make]');
    const note = $('[data-make-note]');
    if (make) make.textContent = state.plan ? 'Make the plan again, keeping what is done' : 'Make my plan';
    if (note) note.textContent = state.plan ? 'Sessions you have marked done stay as they are; the rest is planned from today.' : 'Sessions you mark done are kept when you make the plan again.';
    if (!state.plan) {
      if (actions) actions.hidden = true;
      out.classList.remove('has-plan');
      return;
    }
    out.classList.add('has-plan');
    if (actions) actions.hidden = false;
    if (sum) sum.innerHTML = summaryHtml();
    if (weeks) {
      const plan = state.plan;
      weeks.innerHTML = `${weeksHtml()}${
        plan.buffer
          ? `<section class="pl-week pl-week--free" aria-labelledby="pl-free"><h4 class="pl-week__h" id="pl-free">Free before the examination<span class="pl-week__dates">${h(dayMonth(addDays(plan.last, 1)))} to ${h(dayMonth(addDays(plan.exam, -1)))}</span></h4><p class="pl-week__meta">Nothing is planned: catch up on anything missed, look over your weakest subtopics once more, and rest.</p></section>`
          : ''
      }`;
    }
  };

  const addDays = (day: string, n: number) => {
    const t = Date.parse(`${day}T00:00:00Z`) + n * 86_400_000;
    return new Date(t).toISOString().slice(0, 10);
  };

  /* ---------- Making the plan, and marking sessions done ---------- */

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();
    known = reading();
    const had = state.plan !== null;
    const r = makePlan(state, read(), ctx, today(), new Date());
    if (!r.ok) {
      showError(r.field, r.error);
      return;
    }
    state = r.state;
    save();
    render();
    const p = plannerProgress(state, today());
    const weeksN = weeksOf(state).filter((w) => w.n > 0).length;
    say(`${had ? 'Plan made again' : 'Plan made'}: ${p.total} sessions over ${weeksN} ${weeksN === 1 ? 'week' : 'weeks'}${p.done ? `, ${p.done} of them already done` : ''}.${state.plan?.notFitted.length ? ` ${state.plan.notFitted.length} subtopics did not fit.` : ''}`);
    $('[data-sum]')?.querySelector<HTMLElement>('.pl-sum__h')?.setAttribute('tabindex', '-1');
    $('[data-sum]')?.querySelector<HTMLElement>('.pl-sum__h')?.focus();
  });

  out.addEventListener('change', (e) => {
    const box = (e.target as HTMLElement).closest<HTMLInputElement>('input[data-done]');
    if (!box) return;
    const id = box.dataset.done ?? '';
    state = setDone(state, id, box.checked, new Date());
    if (canStore && !save()) say('This browser would not keep it: its storage is full or blocked.');
    const li = box.closest<HTMLElement>('[data-s]');
    li?.classList.toggle('is-done', box.checked);
    const mark = li?.querySelector<HTMLElement>('.pl-s__state');
    if (mark) mark.textContent = box.checked ? 'Done' : '';
    // The summary and the week's count change; the list stays, so focus stays on the box.
    const sum = $('[data-sum]');
    if (sum) sum.innerHTML = summaryHtml();
    const week = box.closest<HTMLElement>('.pl-week');
    const meta = week?.querySelector<HTMLElement>('.pl-week__meta');
    if (week && meta) {
      const ids = [...week.querySelectorAll<HTMLInputElement>('input[data-done]')];
      const minutes = ids.reduce((a, x) => a + (state.sessions.find((s) => s.id === x.dataset.done)?.minutes ?? 0), 0);
      meta.textContent = `${ids.filter((x) => x.checked).length} of ${ids.length} done, ${fmtMinutes(minutes)}`;
    }
    const p = plannerProgress(state, today());
    const s = state.sessions.find((x) => x.id === id);
    say(`${s ? sessionTitle(s, ctx) : 'Session'}: ${box.checked ? 'done' : 'not done'}. ${p.done} of ${p.total} sessions done.`);
  });

  /* ---------- Print, calendar and clearing ---------- */

  $('[data-print]')?.addEventListener('click', () => window.print());
  $('[data-ics]')?.addEventListener('click', () => {
    if (!state.plan) return;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    download('business-brief-revision-plan.ics', plannerIcs(state, ctx, { stamp, origin: location.origin, today: today() }), 'text/calendar;charset=utf-8');
    say('Calendar file downloaded. Open it to add each study day, with its sessions, to your calendar.');
  });
  const reset = $<HTMLButtonElement>('[data-reset]');
  const confirmBox = $('[data-reset-confirm]');
  const closeConfirm = () => {
    if (confirmBox) confirmBox.hidden = true;
    if (reset) {
      reset.hidden = false;
      reset.focus();
    }
  };
  reset?.addEventListener('click', () => {
    if (confirmBox) confirmBox.hidden = false;
    reset.hidden = true;
    $<HTMLButtonElement>('[data-reset-no]')?.focus();
  });
  $('[data-reset-no]')?.addEventListener('click', closeConfirm);
  $('[data-reset-yes]')?.addEventListener('click', () => {
    state = clearPlan({ ...state, input: read() });
    save();
    render();
    const weeks = $('[data-weeks]');
    const sum = $('[data-sum]');
    if (weeks) weeks.innerHTML = '';
    if (sum) sum.innerHTML = '<p class="pl-sum__k">No plan yet</p><p>Your choices are still in the form. Make a plan when you are ready.</p>';
    if (confirmBox) confirmBox.hidden = true;
    if (reset) reset.hidden = false;
    field<HTMLInputElement>('exam')?.focus();
    say('The plan is cleared. Your choices in the form are kept.');
  });

  // Another tab changed the plan or the reader's results.
  window.addEventListener('storage', (e) => {
    if (e.key === PLANNER_KEY || e.key === null) {
      state = parsePlanner(readItem(PLANNER_KEY));
      render();
    } else if (e.key?.startsWith('bb:')) {
      known = reading();
      paintTopics();
    }
  });

  paintTopics();
  render();
});
