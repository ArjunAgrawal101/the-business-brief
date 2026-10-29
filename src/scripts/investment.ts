/**
 * The investment appraisal desk in the browser: reads the two projects and
 * the rate, validates them, and redraws the methods table, readings, chart,
 * tables and workings from the same functions the server used.
 */
import { buildWorking } from '../lib/finance';
import { appraise, fmtPayback, isRate, projectInputs, readAppraisals, validateProject, type Project, type Rate } from '../lib/investment';
import { cashFlowRowsHtml, chartKeyHtml, cumulativeSvg, methodsRowsHtml, presentValueRowsHtml } from '../lib/investment-view';
import { fmtMoney } from '../lib/format';
import { workingHtml } from '../lib/render';
import { announce, each, escapeHtml, parseNumber, readConfig } from './ix';

interface Config {
  uid: string;
  currency: string;
  rate: Rate;
  projects: Project[];
}

const METHODS = ['payback-period', 'average-rate-of-return', 'net-present-value'] as const;

each('[data-ix="investment"]', (root) => {
  const cfg = readConfig<Config>(root);
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!form) return;
  let timer = 0;
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | null;
  const level = () => (document.documentElement.getAttribute('data-level') === 'SL' ? 'SL' : 'HL');

  const readRate = (): Rate => {
    const checked = form.querySelector<HTMLInputElement>('input[name="rate"]:checked');
    const r = Number(checked?.value);
    return isRate(r) ? r : cfg.rate;
  };

  const render = (announceChange: boolean) => {
    const raw = cfg.projects.map((p) => ({
      id: p.id,
      capitalCost: parseNumber(field(`${p.id}-cost`)?.value ?? ''),
      returns: p.returns.map((_, i) => parseNumber(field(`${p.id}-r${i + 1}`)?.value ?? '')),
    }));
    const problems = raw.flatMap((p) => validateProject(p));
    form.querySelectorAll<HTMLElement>('[data-err]').forEach((el) => {
      const p = problems.find((x) => x.field === el.dataset.err);
      el.textContent = p ? p.message : '';
      field(el.dataset.err ?? '')?.setAttribute('aria-invalid', p ? 'true' : 'false');
    });
    if (problems.length) {
      root.classList.add('is-invalid');
      announce(status, `Check the inputs: ${problems.map((p) => p.message).join(' ')}`);
      return;
    }
    root.classList.remove('is-invalid');
    const rate = readRate();
    const projects = cfg.projects.map((p, k) => ({ ...p, capitalCost: raw[k]?.capitalCost ?? p.capitalCost, returns: (raw[k]?.returns ?? p.returns) as number[] }));
    const [a, b] = projects.map((p) => appraise(p, rate)) as [ReturnType<typeof appraise>, ReturnType<typeof appraise>];
    if (!a || !b) return;
    const hl = level() === 'HL';
    const reading = readAppraisals(a, b, rate, cfg.currency, hl);
    const set = (sel: string, html: string) => {
      const el = root.querySelector<HTMLElement>(sel);
      if (el) el.innerHTML = html;
    };
    set('[data-methods]', methodsRowsHtml(a, b, rate, cfg.currency, reading.prefers));
    set('[data-read="payback"]', escapeHtml(reading.payback));
    set('[data-read="arr"]', escapeHtml(reading.arr));
    set('[data-read="npv"]', escapeHtml(reading.npv));
    set('[data-read="agreement"]', escapeHtml(reading.agreement));
    set('[data-chart]', cumulativeSvg(a, b, { currency: cfg.currency, id: `${cfg.uid}-chart` }));
    set('[data-key]', chartKeyHtml(a, b));
    set('[data-flows]', cashFlowRowsHtml(a, b, cfg.currency));
    set('[data-pv]', presentValueRowsHtml(a, b, rate, cfg.currency));
    set('[data-rate-label]', String(rate));
    const text = { 'payback-period': reading.payback, 'average-rate-of-return': reading.arr, 'net-present-value': reading.npv };
    for (const m of METHODS) {
      for (const p of projects) {
        const w = buildWorking(m, projectInputs(p, m === 'net-present-value' ? rate : undefined), cfg.currency);
        set(`[data-working="${m}:${p.id}"]`, workingHtml(w, escapeHtml(text[m]), escapeHtml(reading.agreement)));
      }
    }
    if (announceChange) {
      const npvText = hl ? ` NPV at ${rate}%: ${a.project.label} ${fmtMoney(Math.round(a.npv ?? 0), cfg.currency, 0)}, ${b.project.label} ${fmtMoney(Math.round(b.npv ?? 0), cfg.currency, 0)}.` : '';
      announce(status, `Payback: ${a.project.label} ${fmtPayback(a.payback)}, ${b.project.label} ${fmtPayback(b.payback)}.${npvText}`);
    }
  };

  form.addEventListener('input', (e) => {
    window.clearTimeout(timer);
    const immediate = (e.target as HTMLInputElement).name === 'rate';
    timer = window.setTimeout(() => render(true), immediate ? 0 : 350);
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  root.querySelector('[data-reset]')?.addEventListener('click', () => {
    cfg.projects.forEach((p) => {
      const c = field(`${p.id}-cost`);
      if (c) c.value = String(p.capitalCost);
      p.returns.forEach((r, i) => {
        const el = field(`${p.id}-r${i + 1}`);
        if (el) el.value = String(r);
      });
    });
    form.querySelectorAll<HTMLInputElement>('input[name="rate"]').forEach((r) => (r.checked = Number(r.value) === cfg.rate));
    render(true);
  });
  new MutationObserver(() => render(false)).observe(document.documentElement, { attributes: true, attributeFilter: ['data-level'] });
  render(false);
});
