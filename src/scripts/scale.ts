import { scaleSvg } from '../lib/charts';
import { scaleTableHtml } from '../lib/render';
import { lowestCost, scaleBreakdown, scaleCurve, scalePoint, scaleReading, type ScaleParams } from '../lib/scale';
import { announce, each, escapeHtml, parseNumber, readConfig } from './ix';

interface Config {
  uid: string;
  params: ScaleParams;
  marks: Array<{ outlets: number; label: string }>;
  currency: string;
  ref: number;
  refLabel: string;
}

each('[data-ix="scale"]', (root) => {
  const cfg = readConfig<Config>(root);
  const slider = root.querySelector<HTMLInputElement>('[data-n]');
  const out = root.querySelector<HTMLOutputElement>('[data-n-out]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  const curve = scaleCurve(cfg.params);
  const low = lowestCost(cfg.params);
  if (!slider) return;
  let timer = 0;

  const set = (sel: string, html: string) => {
    const el = root.querySelector<HTMLElement>(sel);
    if (el) el.innerHTML = html;
  };

  const render = (say: boolean) => {
    const n = Number(slider.value);
    if (out) out.value = String(n);
    slider.setAttribute('aria-valuetext', `${n} ${n === 1 ? 'restaurant' : 'restaurants'}`);
    set('[data-chart]', scaleSvg(curve, { currency: cfg.currency, id: `${cfg.uid}-chart`, current: n, marks: cfg.marks }));
    set('[data-table]', scaleTableHtml(scaleBreakdown(n, cfg.ref, cfg.params), cfg.currency));
    const head = root.querySelector<HTMLElement>('[data-now-head]');
    if (head) head.textContent = `${n} ${n === 1 ? 'restaurant' : 'restaurants'}`;
    const reading = scaleReading(n, cfg.params, cfg.currency);
    set('[data-reading]', escapeHtml(reading));
    if (say) announce(status, reading);
  };

  slider.addEventListener('input', () => {
    render(false);
    window.clearTimeout(timer);
    timer = window.setTimeout(() => render(true), 500);
  });

  root.querySelector('[data-check-guess]')?.addEventListener('click', () => {
    const input = root.querySelector<HTMLInputElement>(`#${cfg.uid}-guess`);
    const fb = root.querySelector<HTMLElement>('[data-guess-feedback]');
    if (!input || !fb) return;
    const g = parseNumber(input.value);
    fb.hidden = false;
    if (g === null || g < 1 || g > cfg.params.maxOutlets || !Number.isInteger(g)) {
      fb.className = 'feedback feedback--partial';
      fb.textContent = `Enter a whole number from 1 to ${cfg.params.maxOutlets}.`;
      input.setAttribute('aria-invalid', 'true');
      announce(status, fb.textContent);
      return;
    }
    input.setAttribute('aria-invalid', 'false');
    const money = (v: number) => `${cfg.currency}${v.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
    const close = Math.abs(g - low.outlets) <= 2;
    fb.className = `feedback feedback--${g === low.outlets ? 'right' : close ? 'partial' : 'wrong'}`;
    const guess = scalePoint(g, cfg.params);
    let text = `The lowest average cost is at ${low.outlets} restaurants, ${money(low.total)} a meal. At your size, ${g}, it is ${money(guess.total)}.`;
    if (g >= cfg.params.maxOutlets - 2) text += ' Bigger is not always cheaper: past a point, coordination costs grow faster than the savings.';
    else if (g < low.outlets - 2) text += ' The chain can grow further before the cost of coordinating it outweighs the savings from bulk buying and shared central costs.';
    fb.textContent = text;
    slider.value = String(g);
    render(false);
    announce(status, text);
  });
});
