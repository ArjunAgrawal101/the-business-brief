/**
 * The research methodology planner in the browser: reads the plan, checks it
 * through src/lib/ia-method.ts, lists what to attach, and keeps the plan in
 * bb:ia-method. It never writes any part of the project.
 */
import { announce, each, escapeHtml, store } from '../ix';
import { PRIMARY_IDS, SECONDARY_IDS, attachments, checkMethod, emptyMethod, methodSummary, parseMethod, type MethodPlan, type SecondaryId } from '../../lib/ia-method';
import { checksHtml, download, twoStepReset } from './ia-common';

const KEY = 'ia-method';

each('[data-ix="ia-method"]', (root) => {
  const live = root.querySelector<HTMLElement>('[data-live]');
  const el = <T extends HTMLElement>(name: string) => root.querySelector<T>(`[name="${name}"]`);
  const checksEl = root.querySelector<HTMLElement>('[data-checks]');
  const attachEl = root.querySelector<HTMLElement>('[data-attach]');
  const eeOnly = root.querySelector<HTMLElement>('[data-ee-only]');

  const write = (p: MethodPlan) => {
    const form = el<HTMLSelectElement>('form');
    const mainly = el<HTMLSelectElement>('mainly');
    if (form) form.value = p.form;
    if (mainly) mainly.value = p.mainly;
    for (const id of PRIMARY_IDS) {
      const use = el<HTMLInputElement>(`use-${id}`);
      const who = el<HTMLInputElement>(`who-${id}`);
      const size = el<HTMLInputElement>(`size-${id}`);
      if (use) use.checked = p.primary[id].use;
      if (who) who.value = p.primary[id].who;
      if (size) size.value = p.primary[id].size === null ? '' : String(p.primary[id].size);
    }
    root.querySelectorAll<HTMLInputElement>('input[name="secondary"]').forEach((b) => (b.checked = p.secondary.includes(b.value as SecondaryId)));
    (['sameOrg', 'ee', 'eeSameOrg'] as const).forEach((k) => {
      const b = el<HTMLInputElement>(k);
      if (b) b.checked = p[k];
    });
    const intro = el<HTMLTextAreaElement>('intro');
    if (intro) intro.value = p.intro;
  };

  const read = (): MethodPlan => {
    const p = emptyMethod();
    const v = (name: string) => el<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(name)?.value ?? '';
    const form = v('form');
    const mainly = v('mainly');
    p.form = form === 'forward' || form === 'backward' ? form : '';
    p.mainly = mainly === 'primary' || mainly === 'secondary' || mainly === 'both' ? mainly : '';
    for (const id of PRIMARY_IDS) {
      const size = v(`size-${id}`).trim();
      const n = Number(size);
      p.primary[id] = { use: el<HTMLInputElement>(`use-${id}`)?.checked ?? false, who: v(`who-${id}`), size: size !== '' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : null };
    }
    p.secondary = [...root.querySelectorAll<HTMLInputElement>('input[name="secondary"]')].filter((b) => b.checked && (SECONDARY_IDS as string[]).includes(b.value)).map((b) => b.value as SecondaryId);
    p.sameOrg = el<HTMLInputElement>('sameOrg')?.checked ?? false;
    p.ee = el<HTMLInputElement>('ee')?.checked ?? false;
    p.eeSameOrg = p.ee && (el<HTMLInputElement>('eeSameOrg')?.checked ?? false);
    p.intro = v('intro');
    return p;
  };

  const render = () => {
    const p = read();
    if (eeOnly) eeOnly.hidden = !p.ee;
    if (checksEl) checksEl.innerHTML = checksHtml(checkMethod(p));
    if (attachEl) {
      const list = attachments(p);
      attachEl.innerHTML = list.length ? list.map((a) => `<li>${escapeHtml(a)}</li>`).join('') : '<li>Nothing beyond your supporting documents yet: choose primary research above to see what goes with it.</li>';
    }
    store.set(KEY, p);
  };

  write(parseMethod(store.get<unknown>(KEY, null)));

  let timer = 0;
  root.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(render, 200);
  });
  root.addEventListener('change', () => {
    render();
    const problems = checkMethod(read()).filter((c) => c.status === 'problem').length;
    announce(live, problems ? `Plan checked: ${problems} ${problems === 1 ? 'problem' : 'problems'} to resolve.` : 'Plan checked.');
  });

  root.querySelector<HTMLButtonElement>('[data-download]')?.addEventListener('click', () => {
    download('business-brief-ia-research-plan.txt', methodSummary(read()), 'text/plain;charset=utf-8');
    announce(live, 'Summary downloaded.');
  });
  root.querySelector<HTMLButtonElement>('[data-print]')?.addEventListener('click', () => window.print());
  twoStepReset(root, () => {
    store.remove(KEY);
    write(emptyMethod());
    render();
    announce(live, 'Cleared.');
  });

  render();
});
