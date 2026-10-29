/**
 * The case lab: opens the stages one at a time as each is completed, keeps
 * the learner's sentences and progress on this device, redraws the plan when
 * a duration changes, and compiles the memo.
 */
import { schedule, withDuration, type Activity } from '../lib/plan';
import { planSvg, planTableHtml } from '../lib/plan-chart';
import { announce, each, escapeHtml, readConfig, store } from './ix';

interface StageConfig {
  id: string;
  step: string;
  title: string;
  quizzes: string[];
  choose: Array<{ quiz: string; item: string; options: Array<{ value: string; label: string }> }>;
  reflection: string | null;
}

interface PlanConfig {
  id: string;
  deadline: { week: number; label: string };
  activities: Activity[];
  vary: { activity: string; label: string; weeks: number[] };
}

interface Config {
  uid: string;
  stages: StageConfig[];
  plans: PlanConfig[];
}

interface Saved {
  done: string[];
  open: string | null;
  reflections: Record<string, string>;
  vary: Record<string, number>;
}

each('[data-ix="case-lab"]', (root) => {
  const cfg = readConfig<Config>(root);
  const key = `case-lab:${cfg.uid}`;
  const status = root.querySelector<HTMLElement>('[data-lab-status]');
  const progressEl = root.querySelector<HTMLElement>('[data-progress]');
  const state: Saved = { done: [], open: null, reflections: {}, vary: {}, ...store.get<Partial<Saved>>(key, {}) };
  // Quiz progress this visit: quiz uid -> items checked, of total.
  const checked = new Map<string, { done: number; total: number }>();
  const save = () => store.set(key, state);
  const stageEl = (id: string) => root.querySelector<HTMLElement>(`[data-stage="${id}"]`);

  const unlocked = (i: number) => i === 0 || cfg.stages.slice(0, i).every((s) => state.done.includes(s.id));
  const complete = (st: StageConfig) => st.quizzes.every((q) => {
    const p = checked.get(q);
    return p !== undefined && p.done >= p.total;
  });

  const render = () => {
    const current = cfg.stages.findIndex((s) => !state.done.includes(s.id));
    cfg.stages.forEach((st, i) => {
      const el = stageEl(st.id);
      if (!el) return;
      const isDone = state.done.includes(st.id);
      const isOpen = !isDone && unlocked(i) ? true : state.open === st.id;
      const locked = !unlocked(i);
      el.classList.toggle('is-locked', locked);
      el.classList.toggle('is-done', isDone);
      el.classList.toggle('is-open', isOpen);
      el.classList.toggle('is-current', i === current);
      const body = el.querySelector<HTMLElement>('[data-body]');
      if (body) body.hidden = locked;
      const lockMsg = el.querySelector<HTMLElement>('[data-locked]');
      if (lockMsg) lockMsg.hidden = !locked;
      const doneTag = el.querySelector<HTMLElement>('[data-done]');
      if (doneTag) doneTag.hidden = !isDone;
      const toggle = el.querySelector<HTMLButtonElement>('[data-toggle]');
      if (toggle) {
        toggle.setAttribute('aria-expanded', String(isDone && isOpen));
        toggle.textContent = isDone && isOpen ? 'Close' : 'Review';
      }
      const next = el.querySelector<HTMLButtonElement>('[data-next]');
      const gate = el.querySelector<HTMLElement>('[data-gate]');
      const ready = isDone || complete(st);
      if (next) {
        next.disabled = !ready;
        next.hidden = isDone && i < cfg.stages.length - 1;
      }
      if (gate) gate.textContent = isDone ? '' : ready ? 'Ready. Write your sentence, then continue.' : 'Check every answer in this stage to continue.';
      const rail = root.querySelector<HTMLElement>(`[data-rail="${st.id}"]`);
      if (rail) {
        rail.classList.toggle('is-current', i === current);
        rail.classList.toggle('is-done', isDone);
        const word = rail.querySelector<HTMLElement>('[data-rail-state]');
        if (word) word.textContent = isDone ? 'Done' : i === current ? 'Now' : locked ? 'Locked' : 'Open';
        rail.querySelector('a')?.setAttribute('aria-current', i === current ? 'step' : 'false');
      }
    });
    const n = state.done.length;
    if (progressEl) progressEl.textContent = n >= cfg.stages.length ? `All ${cfg.stages.length} stages done. Your memo is below.` : `Stage ${n + 1} of ${cfg.stages.length}: ${cfg.stages[n]?.step ?? ''}.`;
    renderMemo();
  };

  const renderMemo = () => {
    cfg.stages.forEach((st) => {
      const li = root.querySelector<HTMLElement>(`[data-memo-stage="${st.id}"]`);
      if (!li) return;
      const text = (state.reflections[st.id] ?? '').trim();
      const yours = li.querySelector<HTMLElement>('[data-memo-yours]');
      if (yours) yours.innerHTML = text ? escapeHtml(text) : '<span class="muted">Not written yet.</span>';
      const choice = li.querySelector<HTMLElement>('[data-memo-choice]');
      if (choice) {
        const picks = st.choose
          .map((c) => {
            const v = root.querySelector<HTMLInputElement>(`input[name="${c.quiz}-${c.item}-a"]:checked`)?.value;
            return c.options.find((o) => o.value === v)?.label;
          })
          .filter(Boolean);
        choice.textContent = picks.length ? `You chose: ${picks.join(' ')}` : '';
      }
    });
  };

  const drawPlan = (p: PlanConfig) => {
    const box = root.querySelector<HTMLElement>(`[data-plan="${p.id}"]`);
    if (!box) return;
    const base = p.activities.find((a) => a.id === p.vary.activity)?.weeks ?? 1;
    const weeks = state.vary[p.id] ?? base;
    const s = schedule(withDuration(p.activities, p.vary.activity, weeks));
    const chart = box.querySelector<HTMLElement>('[data-plan-chart]');
    if (chart) chart.innerHTML = planSvg(s, { deadline: p.deadline.week, deadlineLabel: p.deadline.label, id: `${cfg.uid}-${p.id}-chart` });
    const table = box.querySelector<HTMLElement>('[data-plan-table]');
    if (table) table.innerHTML = planTableHtml(s);
    const read = box.querySelector<HTMLElement>('[data-plan-read]');
    const spare = p.deadline.week - s.finish;
    if (read) {
      read.textContent =
        spare > 0
          ? `The plan takes ${s.finish} weeks: ${spare} ${spare === 1 ? 'week' : 'weeks'} inside the deadline.`
          : spare === 0
            ? `The plan takes ${s.finish} weeks: it meets the deadline with no time to spare.`
            : `The plan takes ${s.finish} weeks: ${-spare} ${spare === -1 ? 'week' : 'weeks'} after the deadline.`;
      read.classList.toggle('is-late', spare < 0);
    }
    const select = box.querySelector<HTMLSelectElement>('[data-vary]');
    if (select) select.value = String(weeks);
    return s;
  };

  // Restore what was written.
  root.querySelectorAll<HTMLTextAreaElement>('[data-reflect]').forEach((ta) => {
    ta.value = state.reflections[ta.dataset.reflect ?? ''] ?? '';
  });
  cfg.plans.forEach(drawPlan);

  root.addEventListener('quiz:progress', (e) => {
    const d = (e as CustomEvent<{ uid: string; done: number; total: number }>).detail;
    checked.set(d.uid, { done: d.done, total: d.total });
    render();
  });

  let timer = 0;
  root.addEventListener('input', (e) => {
    const ta = e.target as HTMLElement;
    if (!(ta instanceof HTMLTextAreaElement) || !ta.dataset.reflect) return;
    state.reflections[ta.dataset.reflect] = ta.value;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      save();
      renderMemo();
    }, 300);
  });

  root.addEventListener('change', (e) => {
    const sel = e.target as HTMLElement;
    if (sel instanceof HTMLSelectElement && sel.dataset.vary !== undefined) {
      const box = sel.closest<HTMLElement>('[data-plan]');
      const p = cfg.plans.find((x) => x.id === box?.dataset.plan);
      if (!p) return;
      state.vary[p.id] = Number(sel.value);
      save();
      const s = drawPlan(p);
      if (s) announce(status, box?.querySelector('[data-plan-read]')?.textContent ?? '');
    }
    if (sel instanceof HTMLInputElement && sel.type === 'radio') renderMemo();
  });

  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const next = t.closest<HTMLButtonElement>('[data-next]');
    if (next) {
      const el = next.closest<HTMLElement>('[data-stage]');
      const i = cfg.stages.findIndex((s) => s.id === el?.dataset.stage);
      const st = cfg.stages[i];
      if (!st) return;
      if (!state.done.includes(st.id)) state.done.push(st.id);
      state.open = null;
      save();
      render();
      const following = cfg.stages[i + 1];
      const target = following ? stageEl(following.id) : root.querySelector<HTMLElement>('[data-memo]');
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      announce(status, following ? `Stage ${i + 2}: ${following.step}. ${following.title}` : 'All stages done. Your memo is ready.');
      return;
    }
    const toggle = t.closest<HTMLButtonElement>('[data-toggle]');
    if (toggle) {
      const id = toggle.closest<HTMLElement>('[data-stage]')?.dataset.stage ?? null;
      if (id && state.done.includes(id)) {
        state.open = state.open === id ? null : id;
        save();
        render();
      }
      return;
    }
    const ev = t.closest<HTMLAnchorElement>('[data-ev]');
    if (ev) {
      const pack = root.querySelector<HTMLDetailsElement>('[data-pack]');
      if (pack) pack.open = true;
      const target = root.querySelector<HTMLElement>(ev.getAttribute('href') ?? '');
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ block: 'start' });
        target.focus({ preventScroll: true });
      }
      return;
    }
    if (t.closest('[data-print]')) {
      window.print();
      return;
    }
    if (t.closest('[data-restart]')) {
      if (!window.confirm('Start the lab again? Your sentences and progress will be cleared.')) return;
      store.remove(key);
      state.done = [];
      state.open = null;
      state.reflections = {};
      state.vary = {};
      root.querySelectorAll<HTMLTextAreaElement>('[data-reflect]').forEach((ta) => (ta.value = ''));
      cfg.plans.forEach(drawPlan);
      render();
      stageEl(cfg.stages[0]?.id ?? '')?.scrollIntoView({ block: 'start' });
    }
  });

  render();
});
