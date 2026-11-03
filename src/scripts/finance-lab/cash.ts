/**
 * The cash flow forecast: a grid of inflow and outflow lines by month that
 * the reader can grow or shrink. The grid is re-rendered from what was typed
 * whenever its shape changes, with the same markup function the server uses.
 */
import { buildCash, CASH_DEFAULTS, cashState, MAX_LINES, MAX_MONTHS, validateCash, type CashInput } from '../../lib/finance-lab/cash';
import { cashGridHtml, type CashModel, type GridLine } from '../../lib/finance-lab/forms';
import { announce, each, parseNumber } from '../ix';
import { mount, type Read } from './engine';

each('[data-ix="finance-lab"][data-family="cash"]', (root) => {
  const grid = root.querySelector<HTMLElement>('[data-grid]');
  const startSel = root.querySelector<HTMLSelectElement>('select[name="startMonth"]');
  const monthsSel = root.querySelector<HTMLSelectElement>('select[name="months"]');
  const opening = root.querySelector<HTMLInputElement>('input[name="opening"]');
  const limit = root.querySelector<HTMLInputElement>('input[name="overdraftLimit"]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!grid || !startSel || !monthsSel || !opening || !limit) throw new Error('The forecast form is incomplete.');
  const errId = grid.dataset.errId ?? '';
  let counter = 100;

  const columns = () => grid.querySelectorAll('thead th.n').length;
  const lineOf = (tr: HTMLElement, n: number): GridLine => {
    const id = tr.dataset.line ?? '';
    return {
      id,
      label: tr.querySelector<HTMLInputElement>(`input[name="${CSS.escape(id)}.label"]`)?.value ?? '',
      values: Array.from({ length: n }, (_, i) => tr.querySelector<HTMLInputElement>(`input[name="${CSS.escape(`${id}.m${i}`)}"]`)?.value ?? '0'),
    };
  };
  const model = (): CashModel => {
    const n = columns();
    const lines = (kind: string) => [...grid.querySelectorAll<HTMLElement>(`tbody[data-lines="${kind}"] tr[data-line]`)].map((tr) => lineOf(tr, n));
    return { startMonth: Number(startSel.value), months: n, inflows: lines('inflows'), outflows: lines('outflows') };
  };
  const render = (m: CashModel, focus?: string, select = false) => {
    grid.innerHTML = cashGridHtml(m, errId);
    if (focus) {
      const el = grid.querySelector<HTMLInputElement | HTMLButtonElement>(focus);
      el?.focus();
      if (select && el instanceof HTMLInputElement) el.select();
    }
  };
  const fromDefaults = (): CashModel => ({
    startMonth: CASH_DEFAULTS.startMonth,
    months: CASH_DEFAULTS.months,
    inflows: CASH_DEFAULTS.inflows.map((l) => ({ id: l.id, label: l.label, values: l.values.map(String) })),
    outflows: CASH_DEFAULTS.outflows.map((l) => ({ id: l.id, label: l.label, values: l.values.map(String) })),
  });

  let input: CashInput = { startMonth: 0, months: 1, opening: 0, overdraftLimit: 0, inflows: [], outflows: [] };
  const read = (): Read => {
    const m = model();
    const months = Number(monthsSel.value);
    const parse = (l: GridLine) => ({ id: l.id, label: l.label, values: l.values.map((v) => parseNumber(v)) });
    input = { startMonth: Number(startSel.value), months, opening: parseNumber(opening.value), overdraftLimit: parseNumber(limit.value), inflows: m.inflows.map(parse), outflows: m.outflows.map(parse) };
    const raw: Record<string, number | null> = { startMonth: input.startMonth, months, opening: input.opening, overdraftLimit: input.overdraftLimit };
    const text: Record<string, string> = {};
    [...input.inflows, ...input.outflows].forEach((l) => {
      text[`${l.id}.label`] = l.label;
      l.values.forEach((v, i) => (raw[`${l.id}.m${i}`] = v));
    });
    return { raw, text };
  };

  // The shape of the grid changes before the engine reads it: this listener is added first.
  root.addEventListener('change', (e) => {
    const t = e.target as HTMLElement;
    if (t === monthsSel) {
      const m = model();
      const n = Math.min(MAX_MONTHS, Math.max(1, Number(monthsSel.value)));
      const fit = (l: GridLine) => ({ ...l, values: Array.from({ length: n }, (_, i) => l.values[i] ?? '0') });
      render({ ...m, months: n, inflows: m.inflows.map(fit), outflows: m.outflows.map(fit) });
    } else if (t === startSel) {
      render(model());
    }
  });
  // Keep each cell's name in step with its line's name.
  root.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (!t.name?.endsWith('.label')) return;
    const tr = t.closest<HTMLElement>('tr[data-line]');
    const months = [...grid.querySelectorAll('thead th.n')].map((th) => th.textContent ?? '');
    tr?.querySelectorAll<HTMLInputElement>('input[data-num]').forEach((cell, i) => cell.setAttribute('aria-label', `${t.value || 'This line'}, ${months[i] ?? ''}`));
    tr?.querySelector('[data-act="remove-line"]')?.setAttribute('aria-label', `Remove ${t.value || 'this line'}`);
  });

  const api = mount(root, {
    read,
    validate: () => validateCash(input),
    build: (_r, s) => buildCash(cashState(input), s),
    reset: () => {
      const d = fromDefaults();
      startSel.value = String(d.startMonth);
      monthsSel.value = String(d.months);
      opening.value = String(CASH_DEFAULTS.opening);
      limit.value = String(CASH_DEFAULTS.overdraftLimit);
      render(d);
    },
  });

  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'add-inflow' || act === 'add-outflow') {
      const m = model();
      const kind = act === 'add-inflow' ? 'inflows' : 'outflows';
      if (m[kind].length >= MAX_LINES) {
        announce(status, `The forecast takes up to ${MAX_LINES} ${kind === 'inflows' ? 'inflow' : 'outflow'} lines.`);
        return;
      }
      const id = `${kind === 'inflows' ? 'in' : 'out'}-${++counter}`;
      m[kind].push({ id, label: kind === 'inflows' ? 'New inflow' : 'New outflow', values: Array.from({ length: m.months }, () => '0') });
      render(m, `input[name="${id}.label"]`, true);
      api.refresh(`${kind === 'inflows' ? 'Inflow' : 'Outflow'} line added. Name it, then enter its figures.`);
    } else if (act === 'remove-line') {
      const id = btn.dataset.line ?? '';
      const m = model();
      const all = [...m.inflows, ...m.outflows];
      const at = all.findIndex((l) => l.id === id);
      const gone = all[at];
      m.inflows = m.inflows.filter((l) => l.id !== id);
      m.outflows = m.outflows.filter((l) => l.id !== id);
      const rest = [...m.inflows, ...m.outflows];
      const next = rest[Math.min(at, rest.length - 1)];
      render(m, next ? `[data-act="remove-line"][data-line="${CSS.escape(next.id)}"]` : undefined);
      if (!next) root.querySelector<HTMLButtonElement>('[data-act="add-inflow"]')?.focus();
      api.refresh(`Removed ${gone?.label || 'the line'}.`);
    }
  });
});
