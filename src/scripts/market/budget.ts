/** The budget allocation tool in the browser: channels to add and remove, the model re-run, the suggested split applied on request. */
import { fmtNumber } from '../../lib/format';
import { nextId } from '../../lib/market-kit';
import { budgetChecks, budgetCsvRows, budgetSummary, budgetView, normalizeBudget, roundSplit, validateBudget, type BudgetState } from '../../lib/market-budget';
import { budgetFiguresHtml, budgetResultRowsHtml, budgetRowHtml, diminishingHtml, responseChart } from '../../lib/market-budget-view';
import { checksHtml } from '../../lib/market-view';
import { announce, each, readConfig } from '../ix';
import { fieldNumber, fieldValue, fill, mountKit, showProblems } from './kit';

interface Config {
  uid: string;
  slug: string;
  defaults: BudgetState;
}

each('[data-ix="budget"]', (root) => {
  const cfg = readConfig<Config>(root);
  const { uid } = cfg;
  const d = cfg.defaults;
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const rows = root.querySelector<HTMLElement>('[data-rows]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!form || !rows) return;
  let timer = 0;

  const read = (): BudgetState => ({
    business: d.business,
    currency: d.currency,
    budget: fieldNumber(form, 'budget'),
    channels: [...rows.querySelectorAll<HTMLElement>('[data-row]')].map((el) => ({ id: el.dataset.row ?? '', name: fieldValue(el, 'name'), spend: fieldNumber(el, 'spend'), audience: fieldNumber(el, 'audience'), k: fieldNumber(el, 'k'), conversion: fieldNumber(el, 'conversion') })),
  });

  const where = (w: string): string | null => {
    if (w === 'budget') return `${uid}-budget`;
    const m = /^(.+)-(name|spend|audience|k|conversion)$/.exec(w);
    return m ? `${uid}-bc-${m[1]}-${m[2]}` : null;
  };

  const render = (say: boolean) => {
    const s = read();
    const problems = validateBudget(s);
    showProblems(root, problems, where);
    root.classList.toggle('is-invalid', problems.length > 0);
    if (problems.length) {
      if (say) announce(status, `Check the figures: ${problems[0]?.message ?? ''}`);
      return;
    }
    const v = budgetView(s);
    fill(root, '[data-figures]', budgetFiguresHtml(v, s));
    fill(root, '[data-dim]', diminishingHtml(v, s));
    fill(root, '[data-results]', budgetResultRowsHtml(v, s));
    fill(root, '[data-chart]', responseChart(s, `${uid}-chart`));
    fill(root, '[data-checks]', checksHtml(budgetChecks(s, v)));
    if (say) announce(status, `About ${fmtNumber(v.yours.customers, 0)} new customers for ${fmtNumber(v.yours.spend)}; the suggested split would win about ${fmtNumber(v.suggested.customers, 0)}.`);
  };

  const drawRows = (s: BudgetState) => {
    rows.innerHTML = s.channels.map((c, i) => budgetRowHtml(c, i, uid, s)).join('');
  };

  const apply = (s: BudgetState) => {
    const b = form.querySelector<HTMLInputElement>('[data-f="budget"]');
    if (b) b.value = String(s.budget);
    drawRows(s);
    render(false);
  };

  const kit = mountKit<BudgetState>({ root, slug: cfg.slug, name: 'Budget allocation', defaults: d, normalize: normalizeBudget, read, apply, csv: budgetCsvRows, text: budgetSummary });

  const onEdit = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => render(true), 300);
    kit.changed();
  };
  form.addEventListener('input', onEdit);
  form.addEventListener('change', onEdit);
  form.addEventListener('submit', (e) => e.preventDefault());

  root.querySelector('[data-add]')?.addEventListener('click', () => {
    const s = read();
    if (s.channels.length >= 10) return;
    const id = nextId('ch', s.channels.map((c) => c.id));
    s.channels.push({ id, name: '', spend: 0, audience: 1000, k: 200, conversion: 2 });
    drawRows(s);
    render(false);
    kit.changed();
    root.querySelector<HTMLInputElement>(`#${uid}-bc-${id}-name`)?.focus();
    announce(status, `Channel ${s.channels.length} added with example assumptions: change them to your own.`);
  });
  root.querySelector('[data-apply-suggested]')?.addEventListener('click', () => {
    const s = read();
    if (validateBudget(s).length) {
      announce(status, 'Fix the highlighted figures first.');
      return;
    }
    const whole = roundSplit(budgetView(s).suggestedSpends);
    s.channels = s.channels.map((c, i) => ({ ...c, spend: whole[i] ?? 0 }));
    drawRows(s);
    render(false);
    kit.changed();
    announce(status, `Suggested split applied, rounded to whole amounts: about ${fmtNumber(budgetView(read()).yours.customers, 0)} new customers.`);
  });
  rows.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-remove]');
    if (!btn) return;
    const id = btn.closest<HTMLElement>('[data-row]')?.dataset.row;
    const s = read();
    if (s.channels.length <= 1) {
      announce(status, 'The budget needs at least one channel, so this one stays.');
      return;
    }
    s.channels = s.channels.filter((c) => c.id !== id);
    drawRows(s);
    render(false);
    kit.changed();
    root.querySelector<HTMLButtonElement>('[data-add]')?.focus();
    announce(status, 'Channel removed.');
  });
});
