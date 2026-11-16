/**
 * The executive simulation's front page: says how far this browser has got.
 * It only reads bb:executive; nothing is written.
 */
import { store } from './ix';

interface Saved {
  role?: string;
  summary?: string;
}

const root = document.querySelector<HTMLElement>('[data-ex-index]');
const out = document.querySelector<HTMLElement>('[data-ex-saved]');
const cfgEl = root?.querySelector('script[data-ex-config]');
if (out && cfgEl) {
  try {
    const cfg = JSON.parse(cfgEl.textContent ?? '{}') as { href: string };
    const saved = store.get<Saved | null>('executive', null);
    if (saved?.role && typeof saved.summary === 'string' && saved.summary) {
      out.textContent = `Saved on this device: ${saved.summary} `;
      const a = document.createElement('a');
      a.href = cfg.href;
      a.textContent = 'Carry on where you left off';
      out.append(a);
      out.hidden = false;
    }
  } catch {
    /* progress is a convenience; the page works without it */
  }
}
