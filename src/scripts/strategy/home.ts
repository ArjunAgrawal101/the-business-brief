/**
 * The Strategy Studio's home page: marks each tool with the work this browser
 * has kept for it (bb:strategy:<tool>). It only reads; nothing is written.
 */
import { store } from '../ix';

interface Saved {
  savedAt?: string;
  headline?: string;
}

const day = (iso?: string) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
};

let count = 0;
document.querySelectorAll<HTMLElement>('[data-saved-for]').forEach((el) => {
  const saved = store.get<Saved | null>(`strategy:${el.dataset.savedFor ?? ''}`, null);
  if (!saved) return;
  count += el.dataset.count === 'yes' ? 1 : 0;
  el.textContent = `Saved ${day(saved.savedAt)}`.trim();
  el.classList.add('is-saved');
  if (saved.headline) el.title = saved.headline;
});
const summary = document.querySelector<HTMLElement>('[data-saved-summary]');
if (summary)
  summary.textContent = count
    ? `This browser has kept your work in ${count} of the tools. Open a tool to carry on, or start the memo in the option appraisal.`
    : 'Nothing is kept from this studio in this browser yet. Each tool saves your work here as you type.';
