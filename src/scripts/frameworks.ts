/**
 * The frameworks library's filters: purpose and level. They narrow the
 * overview matrix and the lists together, hide groups left empty, and
 * announce the count. Without JavaScript every framework is listed.
 */
import { each } from './ix';

each('[data-ix="frameworks"]', (root) => {
  const selects = [...root.querySelectorAll<HTMLSelectElement>('[data-filter]')];
  const items = [...root.querySelectorAll<HTMLElement>('.fwi-item[data-fw]')];
  const cells = [...root.querySelectorAll<HTMLElement>('.fwi-table [data-fw]')];
  const sections = [...root.querySelectorAll<HTMLElement>('[data-group-section]')];
  const count = root.querySelector<HTMLElement>('[data-count]');
  const none = root.querySelector<HTMLElement>('[data-none]');
  const get = (k: string) => selects.find((s) => s.dataset.filter === k)?.value ?? '';
  const match = (el: HTMLElement, group: string, level: string) => (!group || el.dataset.group === group) && (!level || el.dataset.level === level);

  const run = () => {
    const group = get('group');
    const level = get('level');
    let shown = 0;
    for (const el of items) {
      const ok = match(el, group, level);
      el.hidden = !ok;
      if (ok) shown += 1;
    }
    for (const el of cells) el.hidden = !match(el, group, level);
    for (const s of sections) s.hidden = ![...s.querySelectorAll<HTMLElement>('.fwi-item')].some((el) => !el.hidden);
    if (count) count.textContent = `${shown} ${shown === 1 ? 'framework' : 'frameworks'}`;
    if (none) none.hidden = shown > 0;
  };

  selects.forEach((s) => s.addEventListener('change', run));
  run();
});
