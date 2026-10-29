import { readLocation, sensitivity, weightedScores, type LocFactor, type LocSite } from '../lib/operations';
import { locationTableHtml } from '../lib/render-studio';
import { announce, each, escapeHtml, readConfig, store } from './ix';

interface Config {
  uid: string;
  factors: LocFactor[];
  sites: LocSite[];
  maxScore: number;
  maxWeight: number;
  lowThreshold: number;
}

each('[data-ix="location"]', (root) => {
  const cfg = readConfig<Config>(root);
  const status = root.querySelector<HTMLElement>('[data-status]');
  const note = root.querySelector<HTMLTextAreaElement>('[data-note]');
  const sliders = Array.from(root.querySelectorAll<HTMLInputElement>('input[data-weight]'));
  const key = `studio:${cfg.uid}`;
  const saved = store.get<{ weights?: Record<string, number>; note?: string }>(key, {});
  let timer = 0;

  const weights = () => Object.fromEntries(sliders.map((s) => [s.dataset.weight ?? '', Number(s.value)]));
  const persist = () => store.set(key, { weights: weights(), note: note?.value ?? '' });

  const render = (say: boolean) => {
    const w = weights();
    sliders.forEach((s) => {
      const id = s.dataset.weight ?? '';
      const out = root.querySelector<HTMLOutputElement>(`[data-out="${id}"]`);
      if (out) out.value = s.value;
      const cell = root.querySelector<HTMLElement>(`[data-wcell="${id}"]`);
      if (cell) cell.textContent = s.value;
      s.setAttribute('aria-valuetext', `Weight ${s.value} of ${cfg.maxWeight}`);
    });
    const results = weightedScores(cfg.sites, cfg.factors, w, cfg.maxScore);
    const sens = sensitivity(cfg.sites, cfg.factors, w, cfg.maxScore, cfg.maxWeight);
    const reading = readLocation(results, sens, cfg.sites, cfg.factors, w);
    const maxTotal = cfg.factors.reduce((n, f) => n + (w[f.id] ?? 0) * cfg.maxScore, 0);
    const rank = root.querySelector<HTMLElement>('[data-ranking]');
    if (rank) rank.innerHTML = locationTableHtml(results, maxTotal);
    const interp = root.querySelector<HTMLElement>('[data-interp]');
    const impl = root.querySelector<HTMLElement>('[data-impl]');
    if (interp) interp.innerHTML = escapeHtml(reading.reading);
    if (impl) impl.innerHTML = escapeHtml(reading.implication);
    if (say) announce(status, reading.reading);
  };

  if (saved.weights) {
    sliders.forEach((s) => {
      const v = saved.weights?.[s.dataset.weight ?? ''];
      if (typeof v === 'number' && v >= 0 && v <= cfg.maxWeight) s.value = String(v);
    });
  }
  if (note && saved.note) note.value = saved.note;
  render(false);

  root.addEventListener('input', (e) => {
    const t = e.target as HTMLElement;
    if (t instanceof HTMLInputElement && t.type === 'range') {
      render(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => render(true), 500);
    }
    persist();
  });
  root.querySelector('[data-reset]')?.addEventListener('click', () => {
    sliders.forEach((s) => (s.value = String(cfg.factors.find((f) => f.id === s.dataset.weight)?.weight ?? 0)));
    render(true);
    persist();
  });
});
