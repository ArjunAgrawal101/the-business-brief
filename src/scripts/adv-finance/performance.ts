/**
 * The performance dashboard in the browser: a grid of accounts whose years
 * the reader can add and remove and rename, read, checked and redrawn with the
 * same functions the server uses.
 */
import { accountsGridHtml } from '../../lib/adv-finance/forms';
import { MAX_YEARS, MIN_YEARS } from '../../lib/adv-finance/performance';
import { buildPerformanceReport } from '../../lib/adv-finance/performance-view';
import { ACCOUNT_KEYS, PERFORMANCE_EXAMPLE_FORM, performanceFromForm, readPerformanceSaved, type PerformanceForm } from '../../lib/adv-finance/state';
import { announce, each } from '../ix';
import { applyCurrency, currencyValue, mountTool } from './kit';

each('[data-ix="adv-finance"][data-tool="performance"]', (root) => {
  const uid = root.dataset.uid ?? 'af-pd';
  const grid = root.querySelector<HTMLElement>('[data-grid]');
  const opening = root.querySelector<HTMLInputElement>('input[name="openingStock"]');
  const currency = root.querySelector<HTMLSelectElement>('[data-setting="currency"]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  const errId = `${uid}-grid-err`;
  if (!grid || !opening || !currency) throw new Error('The dashboard form is incomplete.');

  const labels = () => [...grid.querySelectorAll<HTMLInputElement>('input[name$=".label"]')].map((el) => el.value);
  const read = (): PerformanceForm => {
    const ls = labels();
    const fields: Record<string, string> = {};
    ls.forEach((_, i) => ACCOUNT_KEYS.forEach((k) => (fields[`y${i}.${k}`] = grid.querySelector<HTMLInputElement>(`input[name="y${i}.${k}"]`)?.value ?? '')));
    return { openingStock: opening.value, labels: ls, fields, currency: currencyValue(root, PERFORMANCE_EXAMPLE_FORM.currency) };
  };

  const draw = (f: PerformanceForm) => {
    grid.innerHTML = accountsGridHtml(f, uid, f.currency, errId);
    root.querySelector('[data-act="add-year"]')?.setAttribute('aria-disabled', String(f.labels.length >= MAX_YEARS));
    root.querySelector('[data-act="remove-year"]')?.setAttribute('aria-disabled', String(f.labels.length <= MIN_YEARS));
  };

  const write = (f: PerformanceForm) => {
    opening.value = f.openingStock;
    currency.value = f.currency;
    draw(f);
  };

  const api = mountTool<PerformanceForm>({
    root,
    key: root.dataset.key ?? 'finance:advanced:performance',
    title: root.dataset.name ?? 'Financial performance dashboard',
    example: PERFORMANCE_EXAMPLE_FORM,
    read,
    write,
    parse: readPerformanceSaved,
    csvName: 'performance-dashboard.csv',
    render: (f) => {
      applyCurrency(root, f.currency);
      const { problems, input } = performanceFromForm(f);
      if (!input) return { problems };
      const r = buildPerformanceReport(input, f.currency);
      return { problems: [], regions: r.regions, announce: r.announce, summary: r.summary, csv: r.csv };
    },
  });

  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-act]');
    if (!btn || !root.contains(btn)) return;
    const act = btn.dataset.act;
    if (act !== 'add-year' && act !== 'remove-year') return;
    const f = read();
    const n = f.labels.length;
    if (act === 'add-year') {
      if (n >= MAX_YEARS) {
        announce(status, `The dashboard takes up to ${MAX_YEARS} years.`);
        return;
      }
      const lastLabel = f.labels[n - 1] ?? '';
      const label = /^\d{4}$/.test(lastLabel.trim()) ? String(Number(lastLabel.trim()) + 1) : `Year ${n + 1}`;
      ACCOUNT_KEYS.forEach((k) => (f.fields[`y${n}.${k}`] = f.fields[`y${n - 1}.${k}`] ?? '0'));
      f.labels.push(label);
      draw(f);
      grid.querySelector<HTMLInputElement>(`input[name="y${n}.salesRevenue"]`)?.focus();
      api.refresh(`${label} added, as a copy of the year before.`);
    } else {
      if (n <= MIN_YEARS) {
        announce(status, `The dashboard needs at least ${MIN_YEARS} years.`);
        return;
      }
      const gone = f.labels.pop();
      ACCOUNT_KEYS.forEach((k) => delete f.fields[`y${n - 1}.${k}`]);
      draw(f);
      btn.focus();
      api.refresh(`${gone ?? 'The last year'} removed.`);
    }
  });
});
