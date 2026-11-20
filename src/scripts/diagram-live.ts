/**
 * A live diagram: as the reader changes a figure, the drawing (wide and for
 * phones), the table and the reading are made again by the same functions
 * the build used (src/lib/figures/live.ts, on src/lib/figure-models.ts). A
 * figure that cannot be used is named beside its field, and the last good
 * drawing stays until it is fixed. Nothing is stored.
 */
import { announce, parseNumber, readConfig } from './ix';
import { LIVE, readingHtml, type Values } from '../lib/figures/live';
import type { LiveInput, LiveModelId } from '../lib/diagrams';

interface Config {
  uid: string;
  model: LiveModelId;
  inputs: LiveInput[];
}

export function setupLive(root: HTMLElement): void {
  const cfg = readConfig<Config>(root);
  const fig = LIVE[cfg.model];
  const form = root.querySelector<HTMLFormElement>('[data-live-form]');
  const wide = root.querySelector<HTMLElement>('[data-view="wide"]');
  const narrow = root.querySelector<HTMLElement>('[data-view="narrow"]');
  const read = root.querySelector<HTMLElement>('[data-read]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!fig || !form || !wide || !read) return;

  const field = (key: string) => form.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-dg-input="${CSS.escape(key)}"]`);
  const values = (): Values => Object.fromEntries(cfg.inputs.map((i) => [i.key, parseNumber(field(i.key)?.value ?? '') ?? NaN]));

  let timer = 0;
  const update = (say: boolean) => {
    const v = values();
    const r = fig.read(v);
    for (const i of cfg.inputs) {
      const el = field(i.key);
      const err = form.querySelector<HTMLElement>(`[data-err="${CSS.escape(i.key)}"]`);
      const problem = r.problems.find((p) => p.key === i.key);
      if (el) {
        if (problem) el.setAttribute('aria-invalid', 'true');
        else el.removeAttribute('aria-invalid');
      }
      if (err) {
        err.textContent = problem?.message ?? '';
        err.hidden = !problem;
      }
    }
    if (r.problems.length) {
      if (say) announce(status, `Check ${r.problems.length === 1 ? 'the figure' : `the ${r.problems.length} figures`} marked: the diagram shows the last figures that worked.`);
      return;
    }
    wide.innerHTML = fig.draw(cfg.uid, v, false);
    if (narrow) narrow.innerHTML = fig.draw(`${cfg.uid}-n`, v, true);
    read.innerHTML = readingHtml(r);
    if (say) announce(status, r.reading);
  };

  // Redraw as the reader types, and announce the result once they pause.
  form.addEventListener('input', () => {
    window.clearTimeout(timer);
    update(false);
    timer = window.setTimeout(() => update(true), 700);
  });
  form.addEventListener('change', () => {
    window.clearTimeout(timer);
    update(true);
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  form.querySelector('[data-reset]')?.addEventListener('click', () => {
    for (const i of cfg.inputs) {
      const el = field(i.key);
      if (el) el.value = String(i.value);
    }
    update(true);
  });
}
