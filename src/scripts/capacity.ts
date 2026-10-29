import { fmtNumber } from '../lib/format';
import { capacityModel, capacityNotes, capacityWorkings, readCapacity, validateCapacity, type CapacityInputs } from '../lib/operations';
import { workingHtml } from '../lib/render';
import { capacityBarStudioHtml, capacityFiguresHtml } from '../lib/render-studio';
import { announce, each, escapeHtml, inputValue, parseNumber, readConfig } from './ix';

interface Config {
  uid: string;
  months: Array<{ id: string; label: string; note: string; values: CapacityInputs }>;
  currency: string;
  labels: { one: string; many: string; period: string };
}

const KEYS: Array<keyof CapacityInputs> = ['capacity', 'output', 'made', 'rejected', 'labourHours', 'outputValue', 'inputCost', 'fixedCosts'];

each('[data-ix="capacity"]', (root) => {
  const cfg = readConfig<Config>(root);
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  const note = root.querySelector<HTMLElement>('[data-month-note]');
  if (!form) return;
  const input = (k: keyof CapacityInputs) => form.elements.namedItem(k) as HTMLInputElement;
  const unit = { one: cfg.labels.one, many: cfg.labels.many };
  const set = (sel: string, html: string) => {
    const el = root.querySelector<HTMLElement>(sel);
    if (el) el.innerHTML = html;
  };
  let timer = 0;

  const render = (say: boolean) => {
    const raw = Object.fromEntries(KEYS.map((k) => [k, parseNumber(input(k).value)])) as Record<keyof CapacityInputs, number | null>;
    const problems = validateCapacity(raw);
    KEYS.forEach((k) => {
      const p = problems.find((x) => x.field === k);
      input(k).setAttribute('aria-invalid', p ? 'true' : 'false');
      const err = root.querySelector<HTMLElement>(`[data-err="${k}"]`);
      if (err) err.textContent = p ? p.message : '';
    });
    if (problems.length) {
      root.classList.add('is-invalid');
      announce(status, `Check the inputs: ${problems.map((p) => p.message).join(' ')}`);
      return;
    }
    root.classList.remove('is-invalid');
    const m = capacityModel(raw as CapacityInputs);
    const reading = readCapacity(m, cfg.currency, unit);
    const w = capacityWorkings(m, cfg.currency, cfg.labels);
    const notes = capacityNotes(m, cfg.currency, unit);
    set('[data-figures]', capacityFiguresHtml(m, cfg.currency, unit));
    set('[data-bar]', capacityBarStudioHtml(m, unit));
    set('[data-interp]', escapeHtml(reading.reading));
    set('[data-impl]', escapeHtml(reading.implication));
    set('[data-working="utilization"]', workingHtml(w.utilization, escapeHtml(reading.reading), escapeHtml(reading.implication)));
    (['productivity', 'defect', 'labour'] as const).forEach((k) => set(`[data-working="${k}"]`, workingHtml(w[k], escapeHtml(notes[k].interpretation), escapeHtml(notes[k].implication))));
    if (say) {
      announce(
        status,
        `Capacity utilization ${fmtNumber(m.utilization ?? 0, 1)}%. Defect rate ${fmtNumber(m.defectRate ?? 0, 2)}%. Productivity rate ${fmtNumber(m.productivityRate ?? 0, 1)}%.`,
      );
    }
  };

  const fill = (v: CapacityInputs) => KEYS.forEach((k) => (input(k).value = inputValue(v[k], input(k).step)));

  form.addEventListener('input', () => {
    root.querySelectorAll('[data-month]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    if (note) note.textContent = 'Your own figures.';
    window.clearTimeout(timer);
    timer = window.setTimeout(() => render(true), 350);
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  root.querySelectorAll<HTMLButtonElement>('[data-month]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const mo = cfg.months.find((x) => x.id === btn.dataset.month);
      if (!mo) return;
      fill(mo.values);
      if (note) note.textContent = `${mo.label}: ${mo.note}`;
      root.querySelectorAll('[data-month]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      render(true);
    }),
  );
});
