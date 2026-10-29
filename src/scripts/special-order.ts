import { buildWorking } from '../lib/finance';
import { fmtMoney } from '../lib/format';
import { capacityBarHtml, specialOrderFiguresHtml, workingHtml } from '../lib/render';
import { readSpecialOrder, specialOrderModel, validateSpecialOrder, type SpecialOrderInputs } from '../lib/special-order';
import { announce, each, escapeHtml, inputValue, parseNumber, readConfig } from './ix';

interface Config {
  uid: string;
  defaults: SpecialOrderInputs;
  scenarios: Array<{ id: string; label: string; note: string; set: Partial<SpecialOrderInputs> }>;
  currency: string;
  labels: { unit: string; units: string; period: string };
}

const KEYS: Array<keyof SpecialOrderInputs> = ['orderPrice', 'variableCost', 'quantity', 'extraFixedCosts', 'regularSales', 'capacity', 'regularContribution', 'fullCostPerUnit'];

each('[data-ix="special-order"]', (root) => {
  const cfg = readConfig<Config>(root);
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  const note = root.querySelector<HTMLElement>('[data-scenario-note]');
  if (!form) return;
  const input = (k: keyof SpecialOrderInputs) => form.elements.namedItem(k) as HTMLInputElement;
  const money = (v: number) => fmtMoney(v, cfg.currency, 2);
  let timer = 0;

  const set = (sel: string, html: string) => {
    const el = root.querySelector<HTMLElement>(sel);
    if (el) el.innerHTML = html;
  };

  const render = (say: boolean) => {
    const raw = Object.fromEntries(KEYS.map((k) => [k, parseNumber(input(k).value)])) as Record<keyof SpecialOrderInputs, number | null>;
    const problems = validateSpecialOrder(raw);
    KEYS.forEach((k) => {
      const p = problems.find((x) => x.field === k);
      input(k).setAttribute('aria-invalid', p ? 'true' : 'false');
      const err = root.querySelector<HTMLElement>(`[data-err="${k}"]`);
      if (err) err.textContent = p ? p.message : '';
    });
    if (problems.length) {
      if (say) announce(status, `Check the inputs: ${problems.map((p) => p.message).join(' ')}`);
      return;
    }
    const m = specialOrderModel(raw as SpecialOrderInputs);
    const reading = readSpecialOrder(m, money, cfg.labels);
    set('[data-figures]', specialOrderFiguresHtml(m, cfg.currency, cfg.labels));
    set('[data-capbar]', capacityBarHtml(m, cfg.labels));
    set('[data-interp]', escapeHtml(reading.interpretation));
    set('[data-impl]', escapeHtml(reading.implication));
    const i = m.inputs;
    const w = buildWorking(
      'special-order',
      { orderPrice: i.orderPrice, variableCost: i.variableCost, quantity: i.quantity, extraFixedCosts: i.extraFixedCosts, displaced: m.displaced, regularContribution: i.regularContribution },
      cfg.currency,
      cfg.labels,
    );
    set('[data-working]', workingHtml(w, escapeHtml(reading.interpretation), escapeHtml(reading.implication)));
    if (say) announce(status, `${m.change >= 0 ? 'Profit rises by' : 'Profit falls by'} ${money(Math.abs(m.change))}.`);
  };

  const fill = (v: SpecialOrderInputs) => KEYS.forEach((k) => (input(k).value = inputValue(v[k], input(k).step)));

  form.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => render(true), 350);
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  root.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach((btn) => {
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      const s = cfg.scenarios.find((x) => x.id === btn.dataset.scenario);
      if (!s) return;
      fill({ ...cfg.defaults, ...s.set });
      if (note) note.textContent = `${s.label}: ${s.note}`;
      root.querySelectorAll('[data-scenario]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      render(true);
    });
  });
  root.querySelector('[data-reset]')?.addEventListener('click', () => {
    fill(cfg.defaults);
    if (note) note.textContent = 'Back to the order as offered.';
    root.querySelectorAll('[data-scenario]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    render(true);
  });
});
