import { stockChartSvg } from '../lib/charts-studio';
import { fmtNumber } from '../lib/format';
import { bufferUse, maxStock, readStock, reorderLevel, simulateStock, validateStock, type BufferUse, type StockPlan, type StockScenario } from '../lib/operations';
import { stockFiguresHtml, stockTableHtml } from '../lib/render-studio';
import { announce, each, escapeHtml, parseNumber, readConfig } from './ix';

interface Scenario extends StockScenario {
  id: string;
  label: string;
  note: string;
}

interface Config {
  uid: string;
  defaults: Omit<StockPlan, 'weeks'>;
  weeks: number;
  scenarios: Scenario[];
  labels: { one: string; many: string };
  rushScenario: string;
}

const KEYS = ['usage', 'leadTime', 'buffer', 'reorderQty'] as const;
type Key = (typeof KEYS)[number];

each('[data-ix="stock-control"]', (root) => {
  const cfg = readConfig<Config>(root);
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  const note = root.querySelector<HTMLElement>('[data-scenario-note]');
  if (!form) return;
  const input = (k: Key) => form.elements.namedItem(k) as HTMLInputElement;
  const set = (sel: string, html: string) => {
    const el = root.querySelector<HTMLElement>(sel);
    if (el) el.innerHTML = html;
  };
  const u = (v: number) => `${fmtNumber(v, Number.isInteger(v) ? 0 : 1)} ${v === 1 ? cfg.labels.one : cfg.labels.many}`;
  let active: Scenario | null = null;
  let timer = 0;

  /** The plan on screen, or null when an input is invalid. */
  const current = (): StockPlan | null => {
    const raw = Object.fromEntries(KEYS.map((k) => [k, parseNumber(input(k).value)])) as Record<Key, number | null>;
    const problems = validateStock(raw);
    KEYS.forEach((k) => {
      const p = problems.find((x) => x.field === k);
      input(k).setAttribute('aria-invalid', p ? 'true' : 'false');
      const err = root.querySelector<HTMLElement>(`[data-err="${k}"]`);
      if (err) err.textContent = p ? p.message : '';
    });
    if (problems.length) {
      announce(status, `Check the plan: ${problems.map((p) => p.message).join(' ')}`);
      return null;
    }
    return { ...(raw as Record<Key, number>), weeks: cfg.weeks };
  };

  const render = (say: boolean) => {
    const plan = current();
    if (!plan) {
      root.classList.add('is-invalid');
      return;
    }
    root.classList.remove('is-invalid');
    const base = simulateStock(plan);
    const run = active ? simulateStock(plan, active) : base;
    const reading = readStock(base, active ? run : null, cfg.labels);
    set('[data-figures]', stockFiguresHtml(run, cfg.labels));
    set('[data-chart]', stockChartSvg(run, { id: `${cfg.uid}-chart`, unit: cfg.labels, plan: active ? base : null }));
    set('[data-table]', stockTableHtml(run));
    set('[data-interp]', escapeHtml(reading.reading));
    set('[data-impl]', escapeHtml(reading.implication));
    if (say) announce(status, `Reorder level ${u(base.reorderLevel)}. Maximum stock ${u(base.maxStock)}. Lowest stock ${u(run.minStock)}.`);
  };

  form.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => render(true), 350);
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  const choose = (id: string, say: boolean) => {
    active = cfg.scenarios.find((s) => s.id === id) ?? null;
    root.querySelectorAll<HTMLElement>('[data-scenario]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.scenario ?? '') === (active?.id ?? ''))));
    if (note) note.textContent = active ? `${active.label}: ${active.note}` : 'The plan as entered, with usage and lead time exactly as expected.';
    render(say);
  };
  root.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach((btn) => btn.addEventListener('click', () => choose(btn.dataset.scenario ?? '', true)));
  root.querySelector('[data-reset]')?.addEventListener('click', () => {
    KEYS.forEach((k) => (input(k).value = String(cfg.defaults[k])));
    render(true);
  });

  /* ---------- Questions, checked against the plan on screen ---------- */

  const feedback = (q: string, verdict: 'right' | 'wrong' | 'partial', head: string, text: string) => {
    const fb = root.querySelector<HTMLElement>(`[data-feedback="${q}"]`);
    if (!fb) return;
    fb.hidden = false;
    fb.className = `feedback feedback--${verdict}`;
    fb.innerHTML = '';
    const v = document.createElement('p');
    v.className = 'feedback__verdict';
    v.textContent = head;
    const t = document.createElement('p');
    t.textContent = text;
    fb.append(v, t);
    announce(status, `${head}. ${text}`);
  };

  const numeric = (q: 'rol' | 'max') => {
    const plan = current();
    const box = root.querySelector<HTMLInputElement>(`#${cfg.uid}-q-${q}`);
    if (!plan || !box) {
      feedback(q, 'partial', 'Check the plan', 'Fix the plan above first.');
      return;
    }
    const v = parseNumber(box.value);
    if (v === null) {
      feedback(q, 'partial', 'Enter a number', `Enter a number of ${cfg.labels.many}.`);
      return;
    }
    const answer = q === 'rol' ? reorderLevel(plan) : maxStock(plan);
    const how =
      q === 'rol'
        ? `Reorder level = buffer stock + usage × lead time = ${fmtNumber(plan.buffer)} + ${fmtNumber(plan.usage, 1).replace(/\.0$/, '')} × ${fmtNumber(plan.leadTime, 1).replace(/\.0$/, '')} = ${u(answer)}.`
        : `Maximum stock = buffer stock + reorder quantity = ${fmtNumber(plan.buffer)} + ${fmtNumber(plan.reorderQty)} = ${u(answer)}.`;
    const right = Math.abs(v - answer) < 1e-9;
    let text = how;
    if (!right && q === 'rol' && Math.abs(v - plan.usage * plan.leadTime) < 1e-9) text = `That is the usage during the lead time, but it leaves out the buffer. ${how}`;
    else if (!right && q === 'rol' && Math.abs(v - plan.buffer) < 1e-9) text = `That is the buffer stock. Ordering only when stock reaches the buffer means using the buffer every time. ${how}`;
    else if (!right && q === 'max' && Math.abs(v - plan.reorderQty) < 1e-9) text = `That is the reorder quantity. A delivery arrives on top of the buffer, so the most held is more. ${how}`;
    feedback(q, right ? 'right' : 'wrong', right ? 'Right' : 'Not yet', text);
  };
  root.querySelector('[data-check="rol"]')?.addEventListener('click', () => numeric('rol'));
  root.querySelector('[data-check="max"]')?.addEventListener('click', () => numeric('max'));

  root.querySelector('[data-check="buffer"]')?.addEventListener('click', () => {
    const plan = current();
    const rush = cfg.scenarios.find((s) => s.id === cfg.rushScenario);
    const chosen = root.querySelector<HTMLInputElement>(`input[name="${cfg.uid}-q-buffer"]:checked`)?.value as BufferUse | undefined;
    if (!plan || !rush) {
      feedback('buffer', 'partial', 'Check the plan', 'Fix the plan above first.');
      return;
    }
    if (!chosen) {
      feedback('buffer', 'partial', 'Choose an answer', 'Choose one of the three answers first.');
      return;
    }
    const run = simulateStock(plan, rush);
    const answer = bufferUse(run);
    root.querySelectorAll<HTMLElement>('[data-q="buffer"] .opt').forEach((o) => {
      o.classList.remove('is-right', 'is-wrong', 'is-answer');
      if (o.dataset.value === chosen) o.classList.add(chosen === answer ? 'is-right' : 'is-wrong');
      else if (o.dataset.value === answer) o.classList.add('is-answer');
    });
    const order = run.orders.find((o) => o.arrives > (rush.usage?.[0]?.from ?? 1) - 1) ?? run.orders[0];
    const why =
      answer === 'none'
        ? `The lowest point is ${u(run.minStock)}, so the buffer is never touched: the plan already covers the extra use.`
        : `The lowest point is ${u(run.minStock)}${order ? `, just before the order placed in week ${Math.floor(order.placed) + 1} arrives` : ''}. The reorder level allows for ${u(plan.usage * plan.leadTime)} used during the lead time; in the scenario more is used, and the difference comes out of the buffer.${answer === 'all' ? ` Stock runs out, and ${u(run.shortfall)} of usage cannot be met.` : ''}`;
    // Show the scenario on the chart, so the answer can be seen, then give the feedback.
    choose(rush.id, false);
    feedback('buffer', chosen === answer ? 'right' : 'wrong', chosen === answer ? 'Right' : 'Not this one', why);
  });
});
