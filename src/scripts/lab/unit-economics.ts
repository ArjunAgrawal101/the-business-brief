/** The unit economics calculator in the browser: recalculation, validation, scenarios and storage on this device. */
import { announce, each, escapeHtml, inputValue, parseNumber, readConfig, store } from '../ix';
import { readUnit, unitEconomics, unitNotes, unitWorkings, validateUnit, type UnitInputs } from '../../lib/lab/unit-economics';
import { paybackTableHtml, unitFiguresHtml } from '../../lib/lab/render';
import { paybackSvg } from '../../lib/lab/charts';
import { workingHtml } from '../../lib/render';
import { clearErrors, saveSummary, setError } from './kit';

interface Config {
  uid: string;
  currency: string;
  defaults: UnitInputs;
  scenarios: Array<{ id: string; label: string; note: string; changes: Partial<UnitInputs> }>;
}

const KEYS = ['spend', 'customers', 'revenue', 'variableCost', 'churn', 'cap'] as const;
const STEPS: Record<(typeof KEYS)[number], string> = { spend: '1', customers: '1', revenue: '0.01', variableCost: '0.01', churn: '0.1', cap: '1' };
const KEY = 'lab:unit-economics';

each('[data-ix="lab-unit"]', (root) => {
  const cfg = readConfig<Config>(root);
  const status = root.querySelector<HTMLElement>('[data-status]');
  const curInput = root.querySelector<HTMLInputElement>('[data-currency]');
  const input = (k: string) => root.querySelector<HTMLInputElement>(`[data-field="${k}"]`);
  const note = root.querySelector<HTMLElement>('[data-scenario-note]');
  const defaultNote = note?.textContent ?? '';
  const saved = store.get<{ currency?: string; values?: Record<string, string> } | null>(KEY, null);
  // Nothing is kept, and nothing is offered to the business plan, until the learner changes something.
  let touched = Boolean(saved?.values);
  let timer = 0;

  const currency = () => (curInput?.value.trim() || cfg.currency).slice(0, 4);

  const fill = (v: UnitInputs) => KEYS.forEach((k) => {
    const el = input(k);
    if (el) el.value = inputValue(v[k], STEPS[k]);
  });

  const press = (id: string | null) => root.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scenario === id)));

  const render = (say: boolean) => {
    const raw = Object.fromEntries(KEYS.map((k) => [k, parseNumber(input(k)?.value ?? '')])) as Record<(typeof KEYS)[number], number | null>;
    const problems = validateUnit(raw);
    clearErrors(root);
    problems.forEach((p) => setError(root, p.field, p.message));
    root.classList.toggle('is-invalid', problems.length > 0);
    const cur = currency();
    root.querySelectorAll<HTMLElement>('[data-cur-label]').forEach((e) => (e.textContent = cur));
    if (touched) store.set(KEY, { currency: cur, values: Object.fromEntries(KEYS.map((k) => [k, input(k)?.value ?? ''])) });
    if (problems.length) {
      if (say) announce(status, `Check the inputs: ${problems[0]?.message}`);
      return;
    }
    const u = unitEconomics(raw as UnitInputs);
    const figs = root.querySelector<HTMLElement>('[data-figures]');
    if (figs) figs.innerHTML = unitFiguresHtml(u, cur);
    const r = readUnit(u, cur);
    const interp = root.querySelector<HTMLElement>('[data-interp]');
    const impl = root.querySelector<HTMLElement>('[data-impl]');
    if (interp) interp.textContent = r.reading;
    if (impl) impl.textContent = r.implication;
    const chart = root.querySelector<HTMLElement>('[data-chart]');
    if (chart) chart.innerHTML = paybackSvg(u, { currency: cur, id: `${cfg.uid}-chart` });
    const table = root.querySelector<HTMLElement>('[data-table]');
    if (table) table.innerHTML = paybackTableHtml(u, cur);
    const w = unitWorkings(u, cur);
    const n = unitNotes(u, cur);
    (Object.keys(w) as Array<keyof typeof w>).forEach((k) => {
      const box = root.querySelector<HTMLElement>(`[data-working="${k}"]`);
      if (box) box.innerHTML = workingHtml(w[k], escapeHtml(n[k].interpretation), escapeHtml(n[k].implication));
    });
    if (touched) saveSummary('unit', { currency: cur, cac: u.cac, contribution: u.contribution, lifetime: u.lifetime, ltv: u.ltv, ratio: u.ratio, payback: u.payback });
    if (say) announce(status, r.reading);
  };

  if (saved?.values) {
    KEYS.forEach((k) => {
      const v = saved.values?.[k];
      const el = input(k);
      if (el && typeof v === 'string') el.value = v;
    });
    if (curInput && typeof saved.currency === 'string' && saved.currency) curInput.value = saved.currency.slice(0, 4);
  }
  render(false);

  root.addEventListener('input', () => {
    touched = true;
    press(null);
    if (note) note.textContent = defaultNote;
    render(false);
    window.clearTimeout(timer);
    timer = window.setTimeout(() => render(true), 700);
  });
  root.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach((b) =>
    b.addEventListener('click', () => {
      const s = cfg.scenarios.find((x) => x.id === b.dataset.scenario);
      if (!s) return;
      touched = true;
      fill({ ...cfg.defaults, ...s.changes } as UnitInputs);
      press(s.id);
      if (note) note.textContent = s.note;
      render(true);
    }),
  );
  root.querySelector('[data-reset]')?.addEventListener('click', () => {
    touched = true;
    fill(cfg.defaults);
    if (curInput) curInput.value = cfg.currency;
    press(null);
    if (note) note.textContent = defaultNote;
    render(true);
  });
});
