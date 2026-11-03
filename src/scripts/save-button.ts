/**
 * The save button (src/components/ui/SaveButton.astro): keeps a page, a term,
 * a diagram or a question in this browser's saved items (bb:saved), listed on
 * the dashboard. A toggle: pressed when saved; pressing it again removes it.
 * Where the browser keeps nothing, the button never appears.
 */
import { announce, each } from './ix';
import { SAVED_KEY, isSaved, parseSaved, toggleSaved } from '../lib/learner';
import { readItem, storageWorks, writeItem } from './storage';

const buttons: Array<() => void> = [];

each('[data-ix="save"]', (root) => {
  const btn = root.querySelector<HTMLButtonElement>('[data-save]');
  const link = root.querySelector<HTMLElement>('[data-save-link]');
  const status = root.querySelector<HTMLElement>('[data-save-status]');
  const url = root.dataset.url ?? location.pathname;
  if (!btn || !storageWorks()) {
    root.hidden = true;
    return;
  }
  const paint = () => {
    const on = isSaved(parseSaved(readItem(SAVED_KEY)), url);
    btn.setAttribute('aria-pressed', String(on));
    if (link) link.hidden = !on;
  };
  btn.addEventListener('click', () => {
    const { list, saved } = toggleSaved(parseSaved(readItem(SAVED_KEY)), { url, title: root.dataset.title ?? document.title, kind: root.dataset.kind ?? 'page' }, new Date());
    if (!writeItem(SAVED_KEY, JSON.stringify(list))) {
      announce(status, 'This browser would not keep it: its storage is full or blocked.');
      return;
    }
    buttons.forEach((p) => p());
    announce(status, saved ? 'Saved. It is listed on your dashboard.' : 'Removed from your saved items.');
  });
  buttons.push(paint);
  paint();
});

// Saved or removed in another tab, or on the dashboard: show it here too.
window.addEventListener('storage', (e) => {
  if (e.key === SAVED_KEY || e.key === null) buttons.forEach((p) => p());
});
