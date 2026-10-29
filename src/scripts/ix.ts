/**
 * Shared helpers for the interactive components. Everything here is
 * progressive enhancement: each component's markup is complete and readable
 * without JavaScript, and these helpers only add behaviour.
 */

/** Read a component's JSON configuration from its <script type="application/json" data-config>. */
export function readConfig<T>(root: HTMLElement): T {
  const el = root.querySelector('script[data-config]');
  return JSON.parse(el?.textContent ?? '{}') as T;
}

/** Initialise every instance of a component once. */
export function each(selector: string, init: (root: HTMLElement) => void): void {
  const run = () =>
    document.querySelectorAll<HTMLElement>(selector).forEach((root) => {
      if (root.dataset.ready === 'true') return;
      root.dataset.ready = 'true';
      root.classList.add('is-enhanced');
      try {
        init(root);
      } catch (err) {
        root.classList.add('is-broken');
        const msg = root.querySelector<HTMLElement>('[data-error]');
        if (msg) msg.hidden = false;
        console.error(err);
      }
    });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
}

/** Local storage that never throws (private windows, blocked storage). */
export const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(`bb:${key}`);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(`bb:${key}`, JSON.stringify(value));
    } catch {
      /* storage unavailable: the component still works for this visit */
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(`bb:${key}`);
    } catch {
      /* ignore */
    }
  },
};

/** Announce a message to screen readers through a polite live region. */
export function announce(region: HTMLElement | null, message: string): void {
  if (!region) return;
  region.textContent = '';
  window.setTimeout(() => {
    region.textContent = message;
  }, 60);
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

/** Parse a number typed by a person: accepts "1,200", " 22.5 " and a typographic minus. */
export function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[\s,]/g, '').replace(/−/g, '-');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** The value to show in a number input: money keeps two decimals (6.30, not 6.3). */
export function inputValue(v: number, step: string): string {
  return step === '0.01' && !Number.isInteger(v) ? v.toFixed(2) : String(v);
}
