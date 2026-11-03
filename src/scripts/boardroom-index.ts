/**
 * The Boardroom index: says, for each company, how far this browser has got.
 * It only reads bb:boardroom:<id>; nothing is written.
 */
import { store } from './ix';

interface Saved {
  role?: string;
  picks?: string[];
}

const root = document.querySelector<HTMLElement>('[data-bb-index]');
const cfgEl = root?.querySelector('script[data-bb-progress]');
if (root && cfgEl) {
  try {
    const cfg = JSON.parse(cfgEl.textContent ?? '{}') as { scenarios: Array<{ id: string; rounds: number }>; roles: Record<string, string> };
    for (const s of cfg.scenarios) {
      const el = root.querySelector<HTMLElement>(`[data-progress="${s.id}"]`);
      const saved = store.get<Saved | null>(`boardroom:${s.id}`, null);
      if (!el || !saved?.role) continue;
      const seat = cfg.roles[saved.role] ?? saved.role;
      const done = saved.picks?.length ?? 0;
      el.textContent = done >= s.rounds ? `Saved on this device: finished, as ${seat}.` : `Saved on this device: ${done} of ${s.rounds} rounds decided, as ${seat}.`;
      el.hidden = false;
    }
  } catch {
    /* progress is a convenience; the page works without it */
  }
}
