/**
 * Budget variances: revenue and cost lines the reader can add or remove, each
 * with a budgeted and an actual figure. The grid is re-rendered with the same
 * markup function the server uses.
 */
import { BUDGET_DEFAULTS, buildBudget, budgetState, MAX_BUDGET_LINES, validateBudget, type BudgetInput } from '../../lib/lab/budget';
import { budgetGridHtml, type BudgetModel } from '../../lib/lab/forms';
import { announce, each, parseNumber } from '../ix';
import { mount, type Read } from './engine';

each('[data-ix="lab"][data-family="budget"]', (root) => {
  const grid = root.querySelector<HTMLElement>('[data-grid]');
  const period = root.querySelector<HTMLInputElement>('input[name="period"]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!grid || !period) throw new Error('The budget form is incomplete.');
  const errId = grid.dataset.errId ?? '';
  let counter = 100;

  const model = (): BudgetModel => ({
    lines: [...grid.querySelectorAll<HTMLElement>('tr[data-line]')].map((tr) => {
      const id = tr.dataset.line ?? '';
      const v = (k: string) => tr.querySelector<HTMLInputElement>(`input[name="${CSS.escape(`${id}.${k}`)}"]`)?.value ?? '';
      return { id, label: v('label'), kind: tr.dataset.kind === 'revenue' ? 'revenue' : 'cost', budget: v('budget'), actual: v('actual') };
    }),
  });
  const render = (m: BudgetModel, focus?: string, select = false) => {
    grid.innerHTML = budgetGridHtml(m, errId);
    if (focus) {
      const el = grid.querySelector<HTMLInputElement | HTMLButtonElement>(focus);
      el?.focus();
      if (select && el instanceof HTMLInputElement) el.select();
    }
  };

  let input: BudgetInput = { period: '', lines: [] };
  const read = (): Read => {
    const m = model();
    input = { period: period.value, lines: m.lines.map((l) => ({ id: l.id, label: l.label, kind: l.kind, budget: parseNumber(l.budget), actual: parseNumber(l.actual) })) };
    const raw: Record<string, number | null> = {};
    const text: Record<string, string> = { period: period.value };
    input.lines.forEach((l) => {
      raw[`${l.id}.budget`] = l.budget;
      raw[`${l.id}.actual`] = l.actual;
      text[`${l.id}.label`] = `${l.kind}:${l.label}`;
    });
    return { raw, text };
  };

  root.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (!t.name?.endsWith('.label')) return;
    const tr = t.closest<HTMLElement>('tr[data-line]');
    const name = t.value || 'This line';
    tr?.querySelector(`input[name$=".budget"]`)?.setAttribute('aria-label', `${name}, budgeted`);
    tr?.querySelector(`input[name$=".actual"]`)?.setAttribute('aria-label', `${name}, actual`);
    tr?.querySelector('[data-act="remove-line"]')?.setAttribute('aria-label', `Remove ${t.value || 'this line'}`);
  });

  const api = mount(root, {
    read,
    validate: () => validateBudget(input),
    build: (_r, s) => buildBudget(budgetState(input), s),
    reset: () => {
      period.value = BUDGET_DEFAULTS.period;
      render({ lines: BUDGET_DEFAULTS.lines.map((l) => ({ id: l.id, label: l.label, kind: l.kind, budget: String(l.budget), actual: String(l.actual) })) });
    },
  });

  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'add-revenue' || act === 'add-cost') {
      const m = model();
      if (m.lines.length >= MAX_BUDGET_LINES) {
        announce(status, `The budget takes up to ${MAX_BUDGET_LINES} lines.`);
        return;
      }
      const kind = act === 'add-revenue' ? 'revenue' : 'cost';
      const id = `${kind === 'revenue' ? 'r' : 'c'}-${++counter}`;
      m.lines.push({ id, label: kind === 'revenue' ? 'New revenue' : 'New cost', kind, budget: '0', actual: '0' });
      render(m, `input[name="${id}.label"]`, true);
      api.refresh(`${kind === 'revenue' ? 'Revenue' : 'Cost'} line added. Name it, then enter its figures.`);
    } else if (act === 'remove-line') {
      const id = btn.dataset.line ?? '';
      const m = model();
      const at = m.lines.findIndex((l) => l.id === id);
      const gone = m.lines[at];
      m.lines = m.lines.filter((l) => l.id !== id);
      const next = m.lines[Math.min(at, m.lines.length - 1)];
      render(m, next ? `[data-act="remove-line"][data-line="${CSS.escape(next.id)}"]` : undefined);
      if (!next) root.querySelector<HTMLButtonElement>('[data-act="add-revenue"]')?.focus();
      api.refresh(`Removed ${gone?.label || 'the line'}.`);
    }
  });
});
