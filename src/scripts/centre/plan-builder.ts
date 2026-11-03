/** The Paper 3 plan builder in the browser: actions to add and remove, a live review, print, and storage on this device. */
import { each, escapeHtml, readConfig, store } from '../ix';
import { blankAction, reviewPlan, type Action, type Plan } from '../../lib/p3-plan';

const KEY = 'p3:plan';

each('[data-ix="plan-builder"]', (root) => {
  const { resources } = readConfig<{ resources: string[] }>(root);
  const list = root.querySelector<HTMLElement>('[data-actions]');
  const tpl = root.querySelector<HTMLTemplateElement>('[data-action-template]');
  const review = root.querySelector<HTMLElement>('[data-review]');
  const dir = root.querySelector<HTMLSelectElement>('[data-direction]');
  const why = root.querySelector<HTMLInputElement>('[data-why]');
  const addBtn = root.querySelector<HTMLButtonElement>('[data-add]');
  if (!list || !tpl || !review || !dir || !why) return;

  const saved = store.get<Plan | null>(KEY, null);
  let actions: Action[] = saved?.actions?.length ? saved.actions : [blankAction(), blankAction(), blankAction()];
  dir.value = saved?.direction ?? '';
  why.value = saved?.why ?? '';

  const read = (el: HTMLElement): Action => {
    const v = (k: string) => el.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-k="${k}"]`)?.value ?? '';
    return {
      text: v('text'),
      fn: v('fn') as Action['fn'],
      stage: v('stage') as Action['stage'],
      tool: v('tool') as Action['tool'],
      gain: v('gain'),
      tradeoff: v('tradeoff'),
      resources: [...el.querySelectorAll<HTMLInputElement>('[data-r]')].filter((c) => c.checked).map((c) => c.dataset.r ?? ''),
    };
  };

  const evaluate = () => {
    actions = [...list.querySelectorAll<HTMLElement>('[data-action]')].map(read);
    const plan: Plan = { direction: dir.value, why: why.value, actions };
    store.set(KEY, plan);
    review.innerHTML = reviewPlan(plan, resources)
      .map((p) => `<li class="is-${p.status}"><span class="pb__crit">${p.criterion === 'All' ? '&#9733;' : p.criterion}</span><span>${escapeHtml(p.text)}</span></li>`)
      .join('');
    if (addBtn) addBtn.disabled = actions.length >= 8;
  };

  const draw = () => {
    list.innerHTML = '';
    actions.forEach((a, i) => {
      const frag = tpl.content.cloneNode(true) as DocumentFragment;
      const el = frag.querySelector<HTMLElement>('[data-action]');
      if (!el) return;
      const legend = el.querySelector('legend');
      if (legend) legend.textContent = `Action ${i + 1}`;
      (['text', 'fn', 'stage', 'tool', 'gain', 'tradeoff'] as const).forEach((k) => {
        const f = el.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-k="${k}"]`);
        if (f) f.value = String(a[k]);
      });
      el.querySelectorAll<HTMLInputElement>('[data-r]').forEach((c) => (c.checked = a.resources.includes(c.dataset.r ?? '')));
      el.querySelector('[data-remove]')?.addEventListener('click', () => {
        actions = [...list.querySelectorAll<HTMLElement>('[data-action]')].map(read);
        actions.splice(i, 1);
        if (!actions.length) actions.push(blankAction());
        draw();
      });
      list.append(frag);
    });
    evaluate();
  };

  root.addEventListener('input', evaluate);
  root.addEventListener('change', evaluate);
  addBtn?.addEventListener('click', () => {
    actions = [...list.querySelectorAll<HTMLElement>('[data-action]')].map(read);
    actions.push(blankAction());
    draw();
  });
  root.querySelector('[data-print]')?.addEventListener('click', () => window.print());
  root.querySelector('[data-clear]')?.addEventListener('click', () => {
    if (!window.confirm('Clear your plan? This cannot be undone.')) return;
    store.remove(KEY);
    actions = [blankAction(), blankAction(), blankAction()];
    dir.value = '';
    why.value = '';
    draw();
  });
  draw();
});
