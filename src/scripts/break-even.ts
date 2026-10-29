import { breakEvenModel, readBreakEven, validateInputs, type BreakEvenInputs } from '../lib/breakeven';
import { breakEvenSvg } from '../lib/charts';
import { buildWorking } from '../lib/finance';
import { fmtNumber } from '../lib/format';
import { breakEvenFiguresHtml, breakEvenTableHtml, workingHtml } from '../lib/render';
import { announce, each, escapeHtml, inputValue, parseNumber, readConfig } from './ix';

interface Config {
  defaults: BreakEvenInputs;
  scenarios: Array<{ id: string; label: string; note: string; set: Partial<BreakEvenInputs> }>;
  currency: string;
  labels: { unit: string; units: string; period: string };
  uid: string;
}

const KEYS: Array<keyof BreakEvenInputs> = ['price', 'variableCost', 'priceShare', 'fixedCosts', 'quantity', 'targetProfit', 'capacity'];

each('[data-ix="break-even"]', (root) => {
  const cfg = readConfig<Config>(root);
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  const note = root.querySelector<HTMLElement>('[data-scenario-note]');
  if (!form) return;
  const input = (k: keyof BreakEvenInputs) => form.elements.namedItem(k) as HTMLInputElement;
  let timer = 0;

  const read = () => Object.fromEntries(KEYS.map((k) => [k, parseNumber(input(k).value)])) as Record<keyof BreakEvenInputs, number | null>;

  const render = (announceChange: boolean) => {
    const raw = read();
    const problems = validateInputs(raw);
    KEYS.forEach((k) => {
      const p = problems.find((x) => x.field === k);
      const el = input(k);
      const err = root.querySelector<HTMLElement>(`[data-err="${k}"]`);
      el.setAttribute('aria-invalid', p ? 'true' : 'false');
      if (err) err.textContent = p ? p.message : '';
    });
    if (problems.length) {
      announce(status, `Check the inputs: ${problems.map((p) => p.message).join(' ')}`);
      root.classList.add('is-invalid');
      return;
    }
    root.classList.remove('is-invalid');
    const m = breakEvenModel(raw as BreakEvenInputs);
    const L = cfg.labels;
    const reading = readBreakEven(m, cfg.currency, L);
    const set = (sel: string, html: string) => {
      const el = root.querySelector<HTMLElement>(sel);
      if (el) el.innerHTML = html;
    };
    set('[data-figures]', breakEvenFiguresHtml(m, cfg.currency, L.units, L.unit));
    set('[data-chart]', breakEvenSvg(m, { currency: cfg.currency, unitsLabel: L.units, periodLabel: L.period, id: `${cfg.uid}-chart` }));
    set('[data-table]', breakEvenTableHtml(m, cfg.currency, L.units));
    set('[data-interp]', escapeHtml(reading.interpretation));
    set('[data-impl]', escapeHtml(reading.implication));
    const w = buildWorking('break-even-quantity', { fixedCosts: m.inputs.fixedCosts, price: m.inputs.price, variableCost: m.unitVariableCost }, cfg.currency, L);
    set('[data-working]', workingHtml(w, escapeHtml(reading.interpretation), escapeHtml(reading.implication)));
    if (announceChange) {
      announce(
        status,
        m.beq === null
          ? 'No break-even point at these figures.'
          : `Break-even ${fmtNumber(m.beq)} ${L.units}. Margin of safety ${fmtNumber(m.mos ?? 0)} ${L.units}. ${m.profitAtForecast >= 0 ? 'Profit' : 'Loss'} ${cfg.currency}${fmtNumber(Math.abs(m.profitAtForecast), 2)}.`,
      );
    }
  };

  const fill = (values: BreakEvenInputs) => KEYS.forEach((k) => (input(k).value = inputValue(values[k], input(k).step)));

  form.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => render(true), 350);
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  root.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const s = cfg.scenarios.find((x) => x.id === btn.dataset.scenario);
      if (!s) return;
      fill({ ...cfg.defaults, ...s.set });
      if (note) note.textContent = `${s.label}: ${s.note}`;
      root.querySelectorAll('[data-scenario]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      render(true);
    }),
  );
  root.querySelector('[data-reset]')?.addEventListener('click', () => {
    fill(cfg.defaults);
    if (note) note.textContent = 'Back to the case figures.';
    root.querySelectorAll('[data-scenario]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    render(true);
  });
  root.querySelectorAll('[data-scenario]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
});
