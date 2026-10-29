import { positionMapSvg } from '../lib/charts-studio';
import { judgeGap, mapModel, quadrantLabel, QUADRANTS, type GapNote, type MapAttribute, type MapBrand, type Quadrant } from '../lib/market';
import { mapTableHtml } from '../lib/render-studio';
import { announce, each, readConfig, store } from './ix';

interface Config {
  uid: string;
  attributes: MapAttribute[];
  brands: MapBrand[];
  scale: { min: number; max: number };
  focus: string;
  defaults: { x: string; y: string };
  gaps: GapNote[];
}

each('[data-ix="position-map"]', (root) => {
  const cfg = readConfig<Config>(root);
  const xSel = root.querySelector<HTMLSelectElement>('[data-axis="x"]');
  const ySel = root.querySelector<HTMLSelectElement>('[data-axis="y"]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  const fb = root.querySelector<HTMLElement>('[data-feedback]');
  const swap = root.querySelector<HTMLElement>('[data-swap]');
  const note = root.querySelector<HTMLTextAreaElement>('[data-note]');
  if (!xSel || !ySel) return;
  const key = `studio:${cfg.uid}`;
  const saved = store.get<{ x?: string; y?: string; note?: string }>(key, {});
  const attr = (id: string) => cfg.attributes.find((a) => a.id === id) ?? cfg.attributes[0];
  let prev = { x: xSel.value, y: ySel.value };
  let highlight: Quadrant | null = null;

  const persist = () => store.set(key, { x: xSel.value, y: ySel.value, note: note?.value ?? '' });

  const draw = () => {
    const xa = attr(xSel.value);
    const ya = attr(ySel.value);
    if (!xa || !ya) return;
    const m = mapModel(cfg.brands, xa.id, ya.id, cfg.scale);
    const chart = root.querySelector<HTMLElement>('[data-chart]');
    if (chart) chart.innerHTML = positionMapSvg(m, xa, ya, { id: `${cfg.uid}-chart`, focus: cfg.focus, scale: cfg.scale, highlight });
    const table = root.querySelector<HTMLElement>('[data-table]');
    if (table) table.innerHTML = mapTableHtml(m, xa, ya, cfg.focus);
    const hx = root.querySelector<HTMLElement>('[data-head-x]');
    const hy = root.querySelector<HTMLElement>('[data-head-y]');
    if (hx) hx.textContent = xa.label;
    if (hy) hy.textContent = ya.label;
    QUADRANTS.forEach((q) => {
      const el = root.querySelector<HTMLElement>(`[data-qlabel="${q}"]`);
      if (el) el.textContent = quadrantLabel(q, xa, ya);
    });
    return { m, xa, ya };
  };

  const resetAnswer = () => {
    highlight = null;
    root.querySelectorAll<HTMLInputElement>(`input[name="${cfg.uid}-gap"]`).forEach((r) => (r.checked = false));
    root.querySelectorAll('.opt').forEach((o) => o.classList.remove('is-right', 'is-wrong', 'is-answer'));
    if (fb) {
      fb.hidden = true;
      fb.textContent = '';
    }
  };

  const onAxis = (which: 'x' | 'y') => {
    // The two axes must differ: choosing the other axis's attribute swaps them.
    if (xSel.value === ySel.value) {
      if (which === 'x') ySel.value = prev.x;
      else xSel.value = prev.y;
      if (swap) swap.textContent = 'The two axes must show different attributes, so they have been swapped.';
    } else if (swap) swap.textContent = '';
    prev = { x: xSel.value, y: ySel.value };
    resetAnswer();
    const r = draw();
    persist();
    if (r) announce(status, `Map redrawn: ${r.xa.label} across, ${r.ya.label} up.`);
  };

  if (saved.x && saved.y && saved.x !== saved.y && cfg.attributes.some((a) => a.id === saved.x) && cfg.attributes.some((a) => a.id === saved.y)) {
    xSel.value = saved.x;
    ySel.value = saved.y;
    prev = { x: saved.x, y: saved.y };
    draw();
  }
  if (note && saved.note) note.value = saved.note;

  xSel.addEventListener('change', () => onAxis('x'));
  ySel.addEventListener('change', () => onAxis('y'));
  note?.addEventListener('input', persist);

  root.querySelector('[data-check]')?.addEventListener('click', () => {
    const chosen = root.querySelector<HTMLInputElement>(`input[name="${cfg.uid}-gap"]:checked`)?.value as Quadrant | 'none' | undefined;
    if (!fb) return;
    fb.hidden = false;
    if (!chosen) {
      fb.className = 'feedback feedback--partial';
      fb.textContent = 'Choose a part of the map first.';
      announce(status, fb.textContent);
      return;
    }
    const xa = attr(xSel.value);
    const ya = attr(ySel.value);
    if (!xa || !ya) return;
    const m = mapModel(cfg.brands, xa.id, ya.id, cfg.scale);
    const j = judgeGap(m, chosen, xa, ya, cfg.gaps);
    root.querySelectorAll<HTMLElement>('.opt').forEach((o) => {
      o.classList.remove('is-right', 'is-wrong', 'is-answer');
      const v = o.dataset.value as Quadrant | 'none';
      const isAnswer = v === 'none' ? m.empty.length === 0 : m.empty.includes(v);
      if (v === chosen) o.classList.add(j.verdict === 'right' ? 'is-right' : 'is-wrong');
      else if (isAnswer) o.classList.add('is-answer');
    });
    fb.className = `feedback feedback--${j.verdict}`;
    fb.innerHTML = '';
    const v = document.createElement('p');
    v.className = 'feedback__verdict';
    v.textContent = j.verdict === 'right' ? 'Right' : 'Not this one';
    const t = document.createElement('p');
    t.textContent = j.text;
    fb.append(v, t);
    highlight = chosen !== 'none' && m.empty.includes(chosen) ? chosen : (m.empty[0] ?? null);
    draw();
    announce(status, `${v.textContent}. ${j.text}`);
  });
});
