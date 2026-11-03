/**
 * The stock control simulator in the browser. The plan, the weeks of demand
 * and the late delivery are read from the form and run by
 * src/lib/stock-sim.ts; every fragment comes from src/lib/stock-sim-view.ts.
 */
import { fmtNumber } from '../lib/format';
import { MAX_WEEKS, MIN_WEEKS, planWarnings, readPlan, simulatePlan, stockCsvRows, validatePlan, type StockCosts, type StockSimInputs } from '../lib/stock-sim';
import { demandGridHtml, stockCostRowsHtml, stockSimFiguresHtml, stockSimRowsHtml, stockSimSvg } from '../lib/stock-sim-view';
import { announce, each, escapeHtml, parseNumber, readConfig } from './ix';
import { bindToolbar, loadSaved } from './tool-kit';

interface Plan {
  opening: number;
  leadTime: number;
  buffer: number;
  reorderLevel: number;
  reorderQty: number;
}

interface State {
  plan: Plan;
  demand: number[];
  lateOn: boolean;
  late: { order: number; extraWeeks: number };
  costs: StockCosts;
}

interface Config {
  uid: string;
  key: string;
  units: { one: string; many: string };
  currency: string;
  plan: Plan;
  demand: number[];
  late: { order: number; extraWeeks: number } | null;
  costs: StockCosts;
}

const PLAN_KEYS = ['opening', 'leadTime', 'buffer', 'reorderLevel', 'reorderQty'] as const;
const COST_KEYS = ['holding', 'ordering', 'shortage'] as const;

function parseState(d: unknown, f: State): State | null {
  if (!d || typeof d !== 'object') return null;
  const r = d as Partial<State>;
  if (!r.plan || !Array.isArray(r.demand)) return null;
  const numOr = (v: unknown, x: number) => (typeof v === 'number' && Number.isFinite(v) ? v : x);
  const demand = r.demand.slice(0, MAX_WEEKS).map((v) => Math.max(0, numOr(v, 0)));
  if (demand.length < MIN_WEEKS) return null;
  return {
    plan: Object.fromEntries(PLAN_KEYS.map((k) => [k, numOr((r.plan as Partial<Plan>)[k], f.plan[k])])) as unknown as Plan,
    demand,
    lateOn: typeof r.lateOn === 'boolean' ? r.lateOn : f.lateOn,
    late: { order: numOr(r.late?.order, f.late.order), extraWeeks: numOr(r.late?.extraWeeks, f.late.extraWeeks) },
    costs: Object.fromEntries(COST_KEYS.map((k) => [k, numOr((r.costs as Partial<StockCosts> | undefined)?.[k], f.costs[k])])) as unknown as StockCosts,
  };
}

each('[data-ix="stock-simulator"]', (root) => {
  const cfg = readConfig<Config>(root);
  const uid = cfg.uid;
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  const grid = root.querySelector<HTMLElement>('[data-weeks]');
  if (!form || !grid) return;
  const el = (name: string) => form.elements.namedItem(name) as HTMLInputElement | null;
  const set = (sel: string, html: string) => {
    const e = root.querySelector<HTMLElement>(sel);
    if (e) e.innerHTML = html;
  };
  const defaults = (): State => ({
    plan: { ...cfg.plan },
    demand: [...cfg.demand],
    lateOn: Boolean(cfg.late && cfg.late.extraWeeks > 0),
    late: cfg.late ? { ...cfg.late } : { order: 2, extraWeeks: 1 },
    costs: { ...cfg.costs },
  });
  let state: State = parseState(loadSaved<unknown>(cfg.key), defaults()) ?? defaults();
  let timer = 0;
  const u = cfg.units;
  const cur = cfg.currency;

  const fill = () => {
    PLAN_KEYS.forEach((k) => {
      const e = el(k);
      if (e) e.value = String(state.plan[k]);
    });
    COST_KEYS.forEach((k) => {
      const e = el(k);
      if (e) e.value = String(state.costs[k]);
    });
    const on = el('lateOn');
    if (on) on.checked = state.lateOn;
    const lf = root.querySelector<HTMLElement>('[data-late-fields]');
    if (lf) lf.hidden = !state.lateOn;
    const lo = el('lateOrder');
    if (lo) lo.value = String(state.late.order);
    const lw = el('lateWeeks');
    if (lw) lw.value = String(state.late.extraWeeks);
    const wk = el('weeks');
    if (wk) wk.value = String(state.demand.length);
    grid.innerHTML = demandGridHtml(state.demand, uid);
  };

  const render = (say: boolean) => {
    const raw = {
      ...(Object.fromEntries(PLAN_KEYS.map((k) => [k, parseNumber(el(k)?.value ?? '')])) as Record<(typeof PLAN_KEYS)[number], number | null>),
      ...(Object.fromEntries(COST_KEYS.map((k) => [k, parseNumber(el(k)?.value ?? '')])) as Record<(typeof COST_KEYS)[number], number | null>),
      demand: Array.from(grid.querySelectorAll<HTMLInputElement>('input[data-week]')).map((i) => parseNumber(i.value)),
      late: el('lateOn')?.checked ? { order: parseNumber(el('lateOrder')?.value ?? ''), extraWeeks: parseNumber(el('lateWeeks')?.value ?? '') } : null,
    };
    const problems = validatePlan(raw);
    // Keep what is valid, so the state never holds a broken number.
    PLAN_KEYS.forEach((k) => {
      const v = raw[k];
      if (v !== null && Number.isFinite(v) && v >= 0) state.plan[k] = v;
    });
    COST_KEYS.forEach((k) => {
      const v = raw[k];
      if (v !== null && Number.isFinite(v) && v >= 0) state.costs[k] = v;
    });
    state.demand = raw.demand.map((v, k) => (v !== null && Number.isFinite(v) && v >= 0 ? v : (state.demand[k] ?? 0)));
    state.lateOn = Boolean(el('lateOn')?.checked);
    const lf = root.querySelector<HTMLElement>('[data-late-fields]');
    if (lf) lf.hidden = !state.lateOn;
    if (raw.late) {
      if (raw.late.order !== null && Number.isInteger(raw.late.order) && raw.late.order >= 1) state.late.order = raw.late.order;
      if (raw.late.extraWeeks !== null && Number.isFinite(raw.late.extraWeeks) && raw.late.extraWeeks >= 0) state.late.extraWeeks = raw.late.extraWeeks;
    }
    // Errors beside the fields; the demand grid has one message line and marks each week.
    const fields = [...PLAN_KEYS, ...COST_KEYS, 'lateOrder', 'lateWeeks', 'demand'] as const;
    fields.forEach((f) => {
      const msg = problems.filter((p) => p.field === f).map((p) => p.message).join(' ');
      const err = root.querySelector<HTMLElement>(`[data-err="${f}"]`);
      if (err) err.textContent = msg;
      if (f !== 'demand') {
        const e = el(f);
        if (e) {
          if (msg) e.setAttribute('aria-invalid', 'true');
          else e.removeAttribute('aria-invalid');
        }
      }
    });
    grid.querySelectorAll<HTMLInputElement>('input[data-week]').forEach((i) => {
      const bad = problems.some((p) => p.field === 'demand' && p.week === Number(i.dataset.week));
      if (bad) i.setAttribute('aria-invalid', 'true');
      else i.removeAttribute('aria-invalid');
    });
    const box = root.querySelector<HTMLElement>('[data-problems]');
    if (box) {
      box.hidden = problems.length === 0;
      box.innerHTML = problems.length ? `<strong>Check the plan.</strong> ${problems.length === 1 ? 'One figure needs' : `${problems.length} figures need`} fixing, marked beside ${problems.length === 1 ? 'it' : 'them'}.` : '';
    }
    if (problems.length) {
      root.classList.add('is-invalid');
      if (say) announce(status, `Check the plan: ${problems[0]?.message ?? ''}`);
      return;
    }
    root.classList.remove('is-invalid');
    const inputs: StockSimInputs = { ...state.plan, demand: state.demand, late: state.lateOn ? state.late : null, costs: state.costs };
    const r = simulatePlan(inputs);
    const reading = readPlan(r, u, cur);
    const warnings = planWarnings(inputs);
    set('[data-figures]', stockSimFiguresHtml(r, u));
    set('[data-chart]', stockSimSvg(r, { id: `${uid}-chart`, units: u }));
    set('[data-rows]', stockSimRowsHtml(r));
    set('[data-costs]', stockCostRowsHtml(r, cur));
    set('[data-interp]', escapeHtml(reading.reading));
    set('[data-impl]', escapeHtml(reading.implication));
    set('[data-rol-hint]', escapeHtml(`Suggested: ${fmtNumber(r.suggestedReorderLevel, Number.isInteger(r.suggestedReorderLevel) ? 0 : 1)}, the buffer plus average demand during the lead time.`));
    const warn = root.querySelector<HTMLElement>('[data-warnings]');
    if (warn) warn.hidden = warnings.length === 0;
    set('[data-warning-list]', warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join(''));
    if (say) announce(status, reading.reading);
  };

  const bar = bindToolbar({
    root,
    key: cfg.key,
    name: () => `stock plan ${cfg.units.many}`,
    state: () => ({ tool: 'stock-control-simulator', ...state }),
    csv: () => stockCsvRows(simulatePlan({ ...state.plan, demand: state.demand, late: state.lateOn ? state.late : null, costs: state.costs })),
    reset: () => {
      state = defaults();
      fill();
      render(true);
    },
    load: (data) => {
      const next = parseState(data, defaults());
      if (!next) return 'That file is not a plan saved by this simulator.';
      state = next;
      fill();
      render(true);
      return null;
    },
  });

  const changed = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      render(true);
      bar.changed();
    }, 350);
  };
  form.addEventListener('input', (e) => {
    if ((e.target as HTMLElement).id === `${uid}-weeks` || (e.target as HTMLElement).id === `${uid}-fill`) return;
    changed();
  });
  form.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === 'lateOn') {
      render(true);
      bar.changed();
    } else if (t.id === `${uid}-weeks`) {
      const want = parseNumber(t.value);
      if (want === null || !Number.isInteger(want) || want < MIN_WEEKS || want > MAX_WEEKS) {
        announce(status, `Choose ${MIN_WEEKS} to ${MAX_WEEKS} weeks.`);
        t.value = String(state.demand.length);
        return;
      }
      const last = state.demand[state.demand.length - 1] ?? 0;
      state.demand = want <= state.demand.length ? state.demand.slice(0, want) : [...state.demand, ...Array.from({ length: want - state.demand.length }, () => last)];
      grid.innerHTML = demandGridHtml(state.demand, uid);
      render(false);
      bar.changed(`The plan now covers ${want} weeks.`);
    }
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  root.querySelector('[data-fill]')?.addEventListener('click', () => {
    const v = parseNumber(el('fill')?.value ?? '');
    if (v === null || v < 0) {
      announce(status, 'Enter a number of units to set every week to.');
      return;
    }
    state.demand = state.demand.map(() => v);
    grid.innerHTML = demandGridHtml(state.demand, uid);
    render(true);
    bar.changed();
  });
  root.querySelector('[data-use-rol]')?.addEventListener('click', () => {
    const avg = state.demand.reduce((a, b) => a + b, 0) / Math.max(1, state.demand.length);
    const v = Math.round((state.plan.buffer + avg * state.plan.leadTime) * 10) / 10;
    const e = el('reorderLevel');
    if (e) e.value = String(v);
    render(true);
    bar.changed();
  });

  fill();
  render(false);
});
